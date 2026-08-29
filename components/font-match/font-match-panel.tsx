"use client";

import { Button } from "@/components/ui/button";

import { CandidateResults } from "./candidate-results";
import { SAMPLE_TEXT } from "./catalog";
import { useFontMatch } from "./font-match-context";
import { ScreenshotCropper } from "./screenshot-cropper";

export function FontMatchPanel() {
  const {
    imageSrc,
    region,
    text,
    setText,
    results,
    frameStatus,
    previewText,
    handleFileSelected,
    handleRegionChange,
    handleRecommend,
  } = useFontMatch();

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-lg font-semibold tracking-tight">폰트 추천</h2>

      {frameStatus === "error" ? (
        <p className="text-sm text-destructive">
          프레임을 가져오지 못했습니다. 스크린샷 파일을 올려 진행해주세요.
        </p>
      ) : null}

      <ScreenshotCropper
        imageSrc={imageSrc}
        onFileSelected={handleFileSelected}
        onRegionChange={handleRegionChange}
        disabled={frameStatus === "loading"}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="crop-text" className="text-sm font-medium">
          이미지 속 글자
        </label>
        <input
          id="crop-text"
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={`비워 두면 "${SAMPLE_TEXT}"로 미리보기`}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        />
      </div>

      <Button type="button" disabled={!region} onClick={handleRecommend} className="self-start">
        비슷한 무료 폰트 추천
      </Button>

      {results ? <CandidateResults fonts={results} previewText={previewText} /> : null}
    </div>
  );
}
