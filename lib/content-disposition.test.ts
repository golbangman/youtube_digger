import { describe, expect, it } from "vitest";

import { attachmentDisposition } from "./content-disposition";

describe("attachmentDisposition", () => {
  it("ASCII 제목은 그대로 filename에 쓴다", () => {
    const value = attachmentDisposition("My Reference.mp3", "audio.mp3");
    expect(value).toContain('filename="My Reference.mp3"');
    expect(value).toContain("filename*=UTF-8''My%20Reference.mp3");
  });

  it("전부 비ASCII인 제목이면 확장자를 지킨 대체명을 쓴다", () => {
    const value = attachmentDisposition("한국어 제목.mp3", "audio.mp3");
    expect(value).toContain('filename="audio.mp3"');
    // 실제 이름은 filename*에 UTF-8로 담긴다.
    expect(value).toContain("filename*=UTF-8''%ED%95%9C");
  });

  it("헤더 구분자가 든 제목은 ASCII 대체명에서 제거한다", () => {
    const value = attachmentDisposition('A; b, "c".txt', "caption.txt");
    expect(value).toContain('filename="A b c.txt"');
  });

  it("RFC 5987 비허용 문자를 filename*에서 인코딩한다", () => {
    const value = attachmentDisposition("It's (a) test.txt", "caption.txt");
    expect(value).toContain("%27");
    expect(value).toContain("%28");
    expect(value).toContain("%29");
  });
});
