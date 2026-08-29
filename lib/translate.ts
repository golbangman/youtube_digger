import { chromium } from "playwright";

// 무료 번역 HTTP API(googleapis, MyMemory)는 조금만 몰아 써도 429로 막힌다.
// 그래서 youtube_caption 과 같은 방식으로, 실제 브라우저에서 translate.google.com 을
// 조작해 번역 결과를 읽어 온다.
const MAX_CHUNK_LENGTH = 4500;
const TRANSLATE_TIMEOUT_MS = 20_000;

function splitLongSentence(sentence: string, maxLength: number): string[] {
  const words = sentence.split(" ");
  const pieces: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength && current) {
      pieces.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);

  return pieces;
}

function splitIntoChunks(text: string, maxLength: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const rawSentence of sentences) {
    const sentencePieces =
      rawSentence.length > maxLength
        ? splitLongSentence(rawSentence, maxLength)
        : [rawSentence];

    for (const sentence of sentencePieces) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (candidate.length > maxLength && current) {
        chunks.push(current);
        current = sentence;
      } else {
        current = candidate;
      }
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

export async function translateToKorean(text: string): Promise<string> {
  const chunks = splitIntoChunks(text, MAX_CHUNK_LENGTH);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const translated: string[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.google.com/?sl=en&tl=ko&text=${encodeURIComponent(chunk)}&op=translate`;
      await page.goto(url, { waitUntil: "networkidle", timeout: TRANSLATE_TIMEOUT_MS });
      await page.waitForFunction(
        () => {
          const el = document.querySelector<HTMLTextAreaElement>('textarea[lang="ko"]');
          return !!el && el.value.trim().length > 0;
        },
        { timeout: TRANSLATE_TIMEOUT_MS },
      );
      const value = await page.locator('textarea[lang="ko"]').inputValue();
      translated.push(value.trim());
    }

    return translated.join(" ");
  } finally {
    await browser.close();
  }
}
