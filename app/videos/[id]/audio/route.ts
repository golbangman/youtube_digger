import { promises as fs } from "node:fs";

import { audioPath } from "@/lib/audio-store";
import { attachmentDisposition } from "@/lib/content-disposition";
import { getRecordByVideoId } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/videos/[id]/audio">) {
  const { id } = await ctx.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    return new Response("자막 레코드를 찾을 수 없습니다.", { status: 404 });
  }

  let file: Buffer;
  try {
    file = await fs.readFile(audioPath(record.videoId));
  } catch {
    return new Response("아직 추출된 배경음악이 없습니다.", { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(file.byteLength),
      "Content-Disposition": attachmentDisposition(`${record.title}.mp3`, "audio.mp3"),
    },
  });
}
