import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { audioPath, ensureAudioDir } from "./audio-store";

export type ExtractProgress =
  | { phase: "downloading"; percent: number }
  | { phase: "converting" }
  | { phase: "done" }
  | { phase: "error"; message: string };

const DOWNLOAD_LINE = /\[download\]\s+([\d.]+)%/;
const EXTRACT_LINE = /\[(ExtractAudio|ffmpeg)\]/;

export class ToolNotInstalledError extends Error {}

/**
 * 유튜브 오디오를 통째로 받아 MP3로 변환하고 data/audio/<videoId>.mp3 에 둔다.
 * 진행 상황은 onProgress로 흘려보낸다. signal로 취소하면 임시 파일까지 정리한다.
 * 성공했을 때만 최종 경로에 파일을 남긴다.
 */
export async function extractAudioToMp3(opts: {
  youtubeUrl: string;
  videoId: string;
  onProgress: (p: ExtractProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { youtubeUrl, videoId, onProgress, signal } = opts;

  await ensureAudioDir();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "yt-digger-audio-"));
  const outputTemplate = path.join(workDir, "audio.%(ext)s");

  const cleanup = async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "yt-dlp",
        [
          "-x",
          "--audio-format",
          "mp3",
          "--no-playlist",
          "--newline",
          "--no-warnings",
          "-o",
          outputTemplate,
          youtubeUrl,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      let converting = false;
      let stderrTail = "";

      const onAbort = () => {
        child.kill("SIGKILL");
        reject(new Error("추출이 취소되었습니다."));
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }

      const handleLine = (line: string) => {
        const download = line.match(DOWNLOAD_LINE);
        if (download) {
          onProgress({ phase: "downloading", percent: Number(download[1]) });
          return;
        }
        if (!converting && EXTRACT_LINE.test(line)) {
          converting = true;
          onProgress({ phase: "converting" });
        }
      };

      const wire = (stream: NodeJS.ReadableStream, keepTail: boolean) => {
        let buffer = "";
        stream.setEncoding("utf-8");
        stream.on("data", (chunk: string) => {
          if (keepTail) stderrTail = (stderrTail + chunk).slice(-2000);
          buffer += chunk;
          const parts = buffer.split(/\r|\n/);
          buffer = parts.pop() ?? "";
          for (const part of parts) if (part.trim()) handleLine(part);
        });
      };
      wire(child.stdout, false);
      wire(child.stderr, true);

      child.on("error", (err) => {
        signal?.removeEventListener("abort", onAbort);
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          reject(
            new ToolNotInstalledError(
              "yt-dlp가 설치되어 있지 않습니다. 'pip install yt-dlp'로 설치해주세요.",
            ),
          );
          return;
        }
        reject(err);
      });

      child.on("close", (code) => {
        signal?.removeEventListener("abort", onAbort);
        if (code === 0) {
          resolve();
          return;
        }
        if (/ffmpeg|ffprobe/i.test(stderrTail) && /not found|not installed/i.test(stderrTail)) {
          reject(
            new ToolNotInstalledError(
              "ffmpeg가 설치되어 있지 않습니다. MP3 변환에는 ffmpeg가 필요합니다.",
            ),
          );
          return;
        }
        reject(new Error(stderrTail.trim().split("\n").pop() || "오디오 추출에 실패했습니다."));
      });
    });

    const producedMp3 = path.join(workDir, "audio.mp3");
    await fs.rename(producedMp3, audioPath(videoId)).catch(async (err) => {
      // 다른 파일시스템 경계면 rename이 실패한다. 복사로 대체한다.
      if ((err as NodeJS.ErrnoException).code === "EXDEV") {
        await fs.copyFile(producedMp3, audioPath(videoId));
        return;
      }
      throw err;
    });

    onProgress({ phase: "done" });
  } finally {
    await cleanup();
  }
}
