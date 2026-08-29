import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";

import { attachmentDisposition } from "./content-disposition";
import { mediaExtension, mediaPath, type MediaKind } from "./media-store";

const CONTENT_TYPE: Record<MediaKind, string> = {
  audio: "audio/mpeg",
  video: "video/mp4",
};

const NOT_READY: Record<MediaKind, string> = {
  audio: "아직 추출된 배경음악이 없습니다.",
  video: "아직 받은 영상이 없습니다.",
};

/**
 * 보관한 미디어 파일을 첨부로 내려준다. 파일을 통째로 메모리에 올리지 않고
 * 스트림으로 흘려보낸다(수백 MB짜리 영상도 안전하게).
 */
export async function serveMedia(
  kind: MediaKind,
  videoId: string,
  title: string,
): Promise<Response> {
  const filePath = mediaPath(kind, videoId);

  let size: number;
  try {
    size = (await fs.stat(filePath)).size;
  } catch {
    return new Response(NOT_READY[kind], { status: 404 });
  }

  const webStream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE[kind],
      "Content-Length": String(size),
      "Content-Disposition": attachmentDisposition(
        `${title}.${mediaExtension(kind)}`,
        `${kind}.${mediaExtension(kind)}`,
      ),
    },
  });
}
