const MAX_CHUNK_LENGTH = 450;

interface MyMemoryResponse {
  responseData?: { translatedText?: string };
  responseStatus?: number | string;
}

type GoogleTranslateResponse = [Array<[string, string, ...unknown[]]>, ...unknown[]];

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

async function translateWithGoogle(chunk: string): Promise<string> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: "ko",
    dt: "t",
    q: chunk,
  });
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Google 번역 요청 실패 (${res.status})`);
  }
  const data = (await res.json()) as GoogleTranslateResponse;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Google 번역 응답 형식이 올바르지 않습니다.");
  }
  return data[0].map((segment) => segment[0]).join("");
}

async function translateWithMyMemory(chunk: string): Promise<string> {
  const params = new URLSearchParams({
    q: chunk,
    langpair: "en|ko",
  });
  const res = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`MyMemory 번역 요청 실패 (${res.status})`);
  }
  const data = (await res.json()) as MyMemoryResponse;
  if (Number(data.responseStatus) !== 200 || !data.responseData?.translatedText) {
    throw new Error("MyMemory 번역 응답 형식이 올바르지 않습니다.");
  }
  return data.responseData.translatedText;
}

const TRANSLATION_PROVIDERS = [translateWithGoogle, translateWithMyMemory];

async function translateChunk(chunk: string): Promise<string> {
  let lastError: unknown;

  for (const provider of TRANSLATION_PROVIDERS) {
    try {
      return await provider(chunk);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("모든 무료 번역 제공자 요청이 실패했습니다.");
}

export async function translateToKorean(text: string): Promise<string> {
  const chunks = splitIntoChunks(text, MAX_CHUNK_LENGTH);
  const translated: string[] = [];
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk));
  }
  return translated.join(" ");
}
