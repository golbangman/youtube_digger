import { serveMedia } from "@/lib/media-serve";
import { getRecordByVideoId } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/videos/[id]/video">) {
  const { id } = await ctx.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    return new Response("자막 레코드를 찾을 수 없습니다.", { status: 404 });
  }

  return serveMedia("video", record.videoId, record.title);
}
