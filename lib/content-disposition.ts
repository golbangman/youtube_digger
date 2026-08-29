// 파일명을 stem과 확장자로 나눈다. 확장자가 없으면 ext는 빈 문자열.
function splitExt(name: string): { stem: string; ext: string } {
  const match = name.match(/^(.*?)(\.[A-Za-z0-9]+)$/);
  return match ? { stem: match[1], ext: match[2] } : { stem: name, ext: "" };
}

// ASCII 대체 파일명. 비ASCII와 헤더에서 의미를 갖는 문자(따옴표, 역슬래시,
// 세미콜론, 쉼표, 개행)를 없앤다. 글자·숫자가 하나도 안 남으면 대체명을 쓴다.
function asciiStem(stem: string, fallbackStem: string): string {
  const cleaned = stem
    .replace(/[^\x20-\x7E]+/g, "")
    .replace(/["\\;,\r\n]+/g, "")
    .trim();
  return /[A-Za-z0-9]/.test(cleaned) ? cleaned : fallbackStem;
}

// RFC 5987 ext-value: encodeURIComponent leaves !*'() unencoded, but those are
// not attr-chars. Percent-encode the leftovers so the header stays valid.
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*!]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * `attachment` Content-Disposition 값을 만든다. 비ASCII 파일명은 ASCII 대체명과
 * RFC 5987 `filename*`를 함께 넣어 브라우저가 올바로 저장하게 한다.
 * `filename`과 `fallbackFilename`은 둘 다 확장자를 포함한다.
 */
export function attachmentDisposition(filename: string, fallbackFilename: string): string {
  const { stem, ext } = splitExt(filename);
  const fallback = splitExt(fallbackFilename);
  const ascii = `${asciiStem(stem, fallback.stem)}${ext || fallback.ext}`;
  const utf8 = encodeRfc5987(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
