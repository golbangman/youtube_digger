import { promises as fs } from "node:fs";
import path from "node:path";

const AUDIO_DIR = path.join(process.cwd(), "data", "audio");

/** videoId를 파일명으로 안전하게 만든다. 유튜브 id는 원래 [A-Za-z0-9_-]다. */
function safeId(videoId: string): string {
  const cleaned = videoId.replace(/[^A-Za-z0-9_-]/g, "");
  if (!cleaned) throw new Error("videoId가 비어 있습니다.");
  return cleaned;
}

export function audioDir(): string {
  return AUDIO_DIR;
}

export function audioPath(videoId: string): string {
  return path.join(AUDIO_DIR, `${safeId(videoId)}.mp3`);
}

export async function audioExists(videoId: string): Promise<boolean> {
  try {
    const stat = await fs.stat(audioPath(videoId));
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

export async function ensureAudioDir(): Promise<void> {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
}
