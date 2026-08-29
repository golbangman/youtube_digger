import { getRecordByVideoId } from "@/lib/store";

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

function toAsciiFallback(title: string): string {
  const cleaned = title.replace(/[^\x20-\x7E]+/g, "").replace(/["\\]/g, "").trim();
  return cleaned.length > 0 ? cleaned : "caption";
}

// RFC 5987 ext-value: encodeURIComponent leaves !*'() unencoded, but those are
// not attr-chars. Percent-encode the leftovers so the header stays valid.
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*!]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
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

  const body = buildFileText(record);
  const asciiName = `${toAsciiFallback(record.title)}.txt`;
  const utf8Name = encodeRfc5987(`${record.title}.txt`);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
    },
  });
}
