import { spawn } from "node:child_process";

import { ToolNotInstalledError } from "./media-extract";

export type FrameRect = { x: number; y: number; w: number; h: number };

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** 0~1 비율 사각형을 화면 안쪽으로 정리한다. 너무 작으면 null. */
export function normalizeRect(rect: FrameRect): FrameRect | null {
  const x = clamp01(rect.x);
  const y = clamp01(rect.y);
  const w = Math.min(clamp01(rect.w), 1 - x);
  const h = Math.min(clamp01(rect.h), 1 - y);
  if (w < 0.01 || h < 0.01) return null;
  return { x, y, w, h };
}

function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/**
 * 유튜브 영상의 `time`초 지점 프레임을 뽑아 `rect`(0~1 비율)만큼 잘라 JPEG로
 * 돌려준다. yt-dlp가 받은 짧은 구간을 ffmpeg에 파이프해 한 장만 뽑는다.
 */
export async function extractFrameCrop(opts: {
  youtubeUrl: string;
  time: number;
  rect: FrameRect;
  signal?: AbortSignal;
}): Promise<Buffer> {
  const rect = normalizeRect(opts.rect);
  if (!rect) throw new Error("선택 영역이 너무 작습니다.");

  const start = Math.max(0, Math.floor(opts.time));
  const section = `*${start}-${start + 2}`;

  const ytdlp = spawn(
    "yt-dlp",
    [
      "-f",
      "bv*[height<=1080]/b[height<=1080]/b",
      "--no-playlist",
      "--no-warnings",
      "--download-sections",
      section,
      "--force-keyframes-at-cuts",
      "-o",
      "-",
      opts.youtubeUrl,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const crop = `crop=iw*${rect.w.toFixed(5)}:ih*${rect.h.toFixed(5)}:iw*${rect.x.toFixed(5)}:ih*${rect.y.toFixed(5)}`;
  const ffmpeg = spawn(
    "ffmpeg",
    ["-nostdin", "-i", "pipe:0", "-frames:v", "1", "-vf", crop, "-f", "mjpeg", "-q:v", "3", "pipe:1"],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  let missingTool = false;
  let timedOut = false;
  const kill = () => {
    ytdlp.kill("SIGKILL");
    ffmpeg.kill("SIGKILL");
  };
  opts.signal?.addEventListener("abort", kill, { once: true });

  // 네트워크가 멈춰도 요청이 영원히 열려 있지 않도록 상한을 둔다.
  const timer = setTimeout(() => {
    timedOut = true;
    kill();
  }, 45_000);

  for (const child of [ytdlp, ffmpeg]) {
    child.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") missingTool = true;
      kill();
    });
  }

  ytdlp.stdout.pipe(ffmpeg.stdin);
  // yt-dlp가 먼저 끝나면 파이프에서 EPIPE가 날 수 있다. 무시한다.
  ytdlp.stdout.on("error", () => {});
  ffmpeg.stdin.on("error", () => {});

  let stderrTail = "";
  const drain = (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  };
  // 두 프로세스의 stderr를 모두 비운다. 안 그러면 파이프 버퍼가 차서 멈출 수 있다.
  ytdlp.stderr.on("data", drain);
  ffmpeg.stderr.on("data", drain);

  const [image, code] = await Promise.all([
    collect(ffmpeg.stdout),
    new Promise<number | null>((resolve) => ffmpeg.on("close", resolve)),
  ]);
  clearTimeout(timer);
  opts.signal?.removeEventListener("abort", kill);

  if (opts.signal?.aborted) throw new Error("취소되었습니다.");
  if (timedOut) throw new Error("프레임 추출이 시간을 초과했습니다.");
  if (missingTool || /executable not found|No such file/i.test(stderrTail)) {
    throw new ToolNotInstalledError("yt-dlp 또는 ffmpeg가 설치되어 있지 않습니다.");
  }
  if (code === 0 && image.byteLength > 0) return image;
  throw new Error("프레임을 가져오지 못했습니다.");
}
