import { runYtDlp, sseResponse } from "@/lib/media-extract";
import { mediaPath } from "@/lib/media-store";
import { getRecordByVideoId } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: RouteContext<"/videos/[id]/video/extract">,
) {
  const { id } = await ctx.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    return new Response("자막 레코드를 찾을 수 없습니다.", { status: 404 });
  }

  return sseResponse(
    async (send) => {
      await runYtDlp({
        ytdlpArgs: [
          "-f",
          "bv*[height<=1080]+ba/b[height<=1080]/b",
          "--merge-output-format",
          "mp4",
          "--remux-video",
          "mp4",
        ],
        producedName: "media.mp4",
        youtubeUrl: record.youtubeUrl,
        targetPath: mediaPath("video", record.videoId),
        processingLine: /\[(Merger|VideoRemuxer|ffmpeg)\]/,
        processingToolLabel: "트랙 병합",
        onProgress: send,
        signal: request.signal,
      });
    },
    request.signal,
    "영상 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.",
  );
}
