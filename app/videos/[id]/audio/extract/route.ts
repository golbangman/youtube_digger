import { runYtDlp, sseResponse } from "@/lib/media-extract";
import { mediaPath } from "@/lib/media-store";
import { getRecordByVideoId } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: RouteContext<"/videos/[id]/audio/extract">,
) {
  const { id } = await ctx.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    return new Response("자막 레코드를 찾을 수 없습니다.", { status: 404 });
  }

  return sseResponse(
    async (send) => {
      // 버튼을 눌러 이 스트림을 열었다는 것은 지금 추출(또는 재추출)하겠다는
      // 뜻이다. 이미 파일이 있어도 새로 뽑아 대체한다. 재방문 시 재추출 없이
      // 링크만 보이는 경로는 페이지의 initialReady가 담당한다.
      await runYtDlp({
        ytdlpArgs: ["-x", "--audio-format", "mp3"],
        producedName: "media.mp3",
        youtubeUrl: record.youtubeUrl,
        targetPath: mediaPath("audio", record.videoId),
        processingLine: /\[(ExtractAudio|ffmpeg)\]/,
        processingToolLabel: "MP3 변환",
        onProgress: send,
        signal: request.signal,
      });
    },
    request.signal,
    "오디오 추출에 실패했습니다. 잠시 후 다시 시도해주세요.",
  );
}
