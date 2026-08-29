import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface YtDlpSubtitleFormat {
  ext: string;
  url: string;
}

interface YtDlpInfo {
  id: string;
  title?: string;
  subtitles?: Record<string, YtDlpSubtitleFormat[]>;
  automatic_captions?: Record<string, YtDlpSubtitleFormat[]>;
}

interface CaptionEvent {
  segs?: Array<{ utf8: string }>;
}

export class YtDlpNotInstalledError extends Error {}

export function isYoutubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "youtu.be" ||
      parsed.hostname.endsWith("youtube.com")
    );
  } catch {
    return false;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchVideoInfo(youtubeUrl: string): Promise<YtDlpInfo> {
  try {
    const { stdout } = await execFileAsync(
      "yt-dlp",
      ["--skip-download", "--dump-json", "--no-warnings", youtubeUrl],
      { maxBuffer: 1024 * 1024 * 20, timeout: 30_000 },
    );
    return JSON.parse(stdout) as YtDlpInfo;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new YtDlpNotInstalledError(
        "yt-dlp가 설치되어 있지 않습니다. 'pip install yt-dlp'로 설치해주세요.",
      );
    }
    throw new Error("영상 정보를 가져오지 못했습니다.");
  }
}

function pickJson3Url(formats: YtDlpSubtitleFormat[] | undefined): string | null {
  return formats?.find((f) => f.ext === "json3")?.url ?? null;
}

function findEnglishFormats(
  captions: Record<string, YtDlpSubtitleFormat[]> | undefined,
): YtDlpSubtitleFormat[] | undefined {
  if (!captions) return undefined;
  if (captions.en) return captions.en;
  const variantKey = Object.keys(captions).find((key) => key.startsWith("en-"));
  return variantKey ? captions[variantKey] : undefined;
}

/**
 * 영상의 id·제목을 얻고, 영어 자막이 있으면 원문 텍스트까지 가져온다.
 * 영상 정보를 못 가져오면 throw. 영어 자막이 없거나 비어 있으면 text는 null.
 */
export async function fetchReferenceVideo(
  youtubeUrl: string,
): Promise<{ videoId: string; title: string; text: string | null }> {
  const info = await fetchVideoInfo(youtubeUrl);
  const meta = {
    videoId: info.id,
    title: info.title?.trim() || info.id,
  };

  const captionUrl =
    pickJson3Url(findEnglishFormats(info.subtitles)) ??
    pickJson3Url(findEnglishFormats(info.automatic_captions));
  if (!captionUrl) return { ...meta, text: null };

  const captionRes = await fetch(captionUrl);
  if (!captionRes.ok) return { ...meta, text: null };
  const captionData = (await captionRes.json()) as { events?: CaptionEvent[] };

  const text = (captionData.events ?? [])
    .map((event) => (event.segs ?? []).map((seg) => seg.utf8 ?? "").join(""))
    .join(" ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { ...meta, text: text ? decodeEntities(text) : null };
}
