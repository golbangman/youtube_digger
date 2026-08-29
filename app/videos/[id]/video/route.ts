import { promises as fs } from "node:fs";

import { attachmentDisposition } from "@/lib/content-disposition";
import { mediaPath } from "@/lib/media-store";
import { getRecordByVideoId } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/videos/[id]/video">) {
  const { id } = await ctx.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    return new Response("자막 레코드를 찾을 수 없습니다.", { status: 404 });
  }

  let file: Buffer;
  try {
    file = await fs.readFile(mediaPath("video", record.videoId));
  } catch {
    return new Response("아직 받은 영상이 없습니다.", { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(file.byteLength),
      "Content-Disposition": attachmentDisposition(`${record.title}.mp4`, "video.mp4"),
    },
  });
}
