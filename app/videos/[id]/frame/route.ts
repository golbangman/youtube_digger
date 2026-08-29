import { extractFrameCrop } from "@/lib/frame";
import { ToolNotInstalledError } from "@/lib/media-extract";
import { getRecordByVideoId } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: RouteContext<"/videos/[id]/frame">,
) {
  const { id } = await ctx.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    return new Response("자막 레코드를 찾을 수 없습니다.", { status: 404 });
  }

  let body: { time?: number; x?: number; y?: number; w?: number; h?: number };
  try {
    body = await request.json();
  } catch {
    return new Response("잘못된 요청입니다.", { status: 400 });
  }

  const time = Number(body.time);
  if (!Number.isFinite(time)) {
    return new Response("재생 시간이 없습니다.", { status: 400 });
  }

  try {
    const image = await extractFrameCrop({
      youtubeUrl: record.youtubeUrl,
      time,
      rect: { x: Number(body.x), y: Number(body.y), w: Number(body.w), h: Number(body.h) },
      signal: request.signal,
    });
    return new Response(new Uint8Array(image), {
      status: 200,
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const message = err instanceof ToolNotInstalledError ? err.message : "프레임을 가져오지 못했습니다.";
    return new Response(message, { status: 502 });
  }
}
