import { extractAudioToMp3, ToolNotInstalledError, type ExtractProgress } from "@/lib/audio";
import { getRecordByVideoId } from "@/lib/store";

export const dynamic = "force-dynamic";

function sse(event: ExtractProgress): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/videos/[id]/audio/extract">,
) {
  const { id } = await ctx.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    return new Response("자막 레코드를 찾을 수 없습니다.", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ExtractProgress) => {
        try {
          controller.enqueue(encoder.encode(sse(event)));
        } catch {
          // 클라이언트가 이미 끊었다.
        }
      };

      try {
        // 버튼을 눌러 이 스트림을 열었다는 것은 지금 추출(또는 재추출)하겠다는
        // 뜻이다. 이미 파일이 있어도 새로 뽑아 대체한다. 재방문 시 재추출 없이
        // 링크만 보이는 경로는 페이지의 initialReady가 담당한다.
        await extractAudioToMp3({
          youtubeUrl: record.youtubeUrl,
          videoId: record.videoId,
          onProgress: send,
          signal: request.signal,
        });
      } catch (err) {
        if (!request.signal.aborted) {
          const message =
            err instanceof ToolNotInstalledError
              ? err.message
              : "오디오 추출에 실패했습니다. 잠시 후 다시 시도해주세요.";
          send({ phase: "error", message });
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
