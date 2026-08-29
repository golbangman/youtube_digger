import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export type MediaProgress =
  | { phase: "downloading"; percent: number }
  | { phase: "processing" }
  | { phase: "done" }
  | { phase: "error"; message: string };

const DOWNLOAD_LINE = /\[download\]\s+([\d.]+)%/;

export class ToolNotInstalledError extends Error {}

/**
 * `handler`가 부르는 send로 진행 이벤트를 흘려보내는 SSE 응답을 만든다.
 * handler가 던지면(취소 제외) error 이벤트를 보내고, 어떤 경우든 스트림을 닫는다.
 */
export function sseResponse(
  handler: (send: (event: MediaProgress) => void) => Promise<void>,
  signal: AbortSignal,
  failureMessage: string,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: MediaProgress) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // 클라이언트가 이미 끊었다.
        }
      };

      try {
        await handler(send);
      } catch (err) {
        if (!signal.aborted) {
          send({
            phase: "error",
            message: err instanceof ToolNotInstalledError ? err.message : failureMessage,
          });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // 이미 닫혔다.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * yt-dlp를 돌려 유튜브 미디어를 받고 targetPath에 둔다. `[download] NN%` 줄을
 * 파싱해 진행률을, processingLine에 맞는 줄이 처음 나오면 후처리(변환·병합)
 * 단계를 onProgress로 알린다. signal로 취소하면 프로세스와 임시 파일까지
 * 정리한다. 성공했을 때만 targetPath에 파일을 남긴다.
 */
export async function runYtDlp(opts: {
  /** 포맷·후처리 관련 인자. -o / url / --newline 은 여기서 붙인다. */
  ytdlpArgs: string[];
  /** 임시 디렉터리에 만들어질 최종 파일 이름. 예: "media.mp3", "media.mp4". */
  producedName: string;
  youtubeUrl: string;
  targetPath: string;
  processingLine: RegExp;
  processingToolLabel: string;
  onProgress: (p: MediaProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const {
    ytdlpArgs,
    producedName,
    youtubeUrl,
    targetPath,
    processingLine,
    processingToolLabel,
    onProgress,
    signal,
  } = opts;

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "yt-digger-"));
  const outputTemplate = path.join(workDir, "media.%(ext)s");

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "yt-dlp",
        [...ytdlpArgs, "--no-playlist", "--newline", "--no-warnings", "-o", outputTemplate, youtubeUrl],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      let processing = false;
      let stderrTail = "";

      const onAbort = () => {
        child.kill("SIGKILL");
        reject(new Error("작업이 취소되었습니다."));
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
        if (!processing && processingLine.test(line)) {
          processing = true;
          onProgress({ phase: "processing" });
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
              `ffmpeg가 설치되어 있지 않습니다. ${processingToolLabel}에는 ffmpeg가 필요합니다.`,
            ),
          );
          return;
        }
        reject(new Error(stderrTail.trim().split("\n").pop() || "작업에 실패했습니다."));
      });
    });

    const produced = path.join(workDir, producedName);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.rename(produced, targetPath).catch(async (err) => {
      // 다른 파일시스템 경계면 rename이 실패한다. 복사로 대체한다.
      if ((err as NodeJS.ErrnoException).code === "EXDEV") {
        await fs.copyFile(produced, targetPath);
        return;
      }
      throw err;
    });

    onProgress({ phase: "done" });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
