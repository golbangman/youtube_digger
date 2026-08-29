import { promises as fs } from "node:fs";
import path from "node:path";

export type MediaKind = "audio" | "video";

const EXTENSION: Record<MediaKind, string> = { audio: "mp3", video: "mp4" };

function mediaDir(kind: MediaKind): string {
  return path.join(process.cwd(), "data", kind);
}

/** videoId를 파일명으로 안전하게 만든다. 유튜브 id는 원래 [A-Za-z0-9_-]다. */
function safeId(videoId: string): string {
  const cleaned = videoId.replace(/[^A-Za-z0-9_-]/g, "");
  if (!cleaned) throw new Error("videoId가 비어 있습니다.");
  return cleaned;
}

export function mediaPath(kind: MediaKind, videoId: string): string {
  return path.join(mediaDir(kind), `${safeId(videoId)}.${EXTENSION[kind]}`);
}

export function mediaExtension(kind: MediaKind): string {
  return EXTENSION[kind];
}

export async function mediaExists(kind: MediaKind, videoId: string): Promise<boolean> {
  try {
    const stat = await fs.stat(mediaPath(kind, videoId));
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

export async function deleteMedia(kind: MediaKind, videoId: string): Promise<void> {
  await fs.rm(mediaPath(kind, videoId), { force: true });
}
