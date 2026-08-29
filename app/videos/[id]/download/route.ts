import { attachmentDisposition } from "@/lib/content-disposition";
import { getRecordByVideoId, hasCaption } from "@/lib/store";

function buildFileText(record: {
  title: string;
  youtubeUrl: string;
  englishText: string;
  koreanText: string;
}): string {
  return [
    record.title,
    record.youtubeUrl,
    "",
    "=== 영어 원문 ===",
    record.englishText,
    "",
    "=== 한국어 번역 ===",
    record.koreanText,
    "",
  ].join("\n");
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/videos/[id]/download">,
) {
  const { id } = await ctx.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    return new Response("자막 레코드를 찾을 수 없습니다.", { status: 404 });
  }

  if (!hasCaption(record)) {
    return new Response("이 영상에는 자막이 없습니다.", { status: 404 });
  }

  return new Response(
    buildFileText({
      title: record.title,
      youtubeUrl: record.youtubeUrl,
      englishText: record.englishText ?? "",
      koreanText: record.koreanText ?? "",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": attachmentDisposition(`${record.title}.txt`, "caption.txt"),
      },
    },
  );
}
