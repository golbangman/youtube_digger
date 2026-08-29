"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePlayer } from "@/components/player";

import { CandidateResults } from "./candidate-results";
import { CANDIDATE_FONTS, RESULT_LIMIT, SAMPLE_TEXT, type CandidateFont } from "./catalog";
import { measureCrop, rankFonts, type PixelRegion } from "./ranking";
import { ScreenshotCropper } from "./screenshot-cropper";

type FrameStatus = "idle" | "loading" | "error";

export function FontMatch({ videoId }: { videoId: string }) {
  const player = usePlayer();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [region, setRegion] = useState<PixelRegion | null>(null);
  const [text, setText] = useState("");
  const [results, setResults] = useState<CandidateFont[] | null>(null);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>("idle");
  const objectUrlRef = useRef<string | null>(null);

  const previewText = text.trim() || SAMPLE_TEXT;

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const putImage = (src: string | null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = src;
    setImageSrc(src);
    setRegion(null);
    setResults(null);
  };

  const handleFileSelected = (file: File | null) => {
    putImage(file ? URL.createObjectURL(file) : null);
  };

  const handleRegionChange = (next: PixelRegion | null) => {
    setRegion(next);
    if (!next) setResults(null);
  };

  const grabFrameFromPlayer = () => {
    setFrameStatus("idle");
    player.arm(async (selection) => {
      setFrameStatus("loading");
      try {
        const res = await fetch(`/videos/${videoId}/frame`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selection),
        });
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        putImage(URL.createObjectURL(blob));
        setFrameStatus("idle");
      } catch {
        setFrameStatus("error");
      }
    });
  };

  const handleRecommend = () => {
    if (!region) return;
    const measurement = measureCrop(region, previewText.length);
    setResults(rankFonts(measurement, CANDIDATE_FONTS, RESULT_LIMIT));
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">폰트 추천</h2>
        <p className="text-sm text-muted-foreground">
          재생 중인 영상에서 원하는 장면의 텍스트 영역을 골라 그 프레임을 가져오거나,
          스크린샷 파일을 올려 비슷한 무료 폰트를 찾습니다.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={player.armed || frameStatus === "loading"}
          onClick={grabFrameFromPlayer}
        >
          {player.armed
            ? "위 영상에서 영역을 드래그하세요"
            : frameStatus === "loading"
              ? "프레임 가져오는 중..."
              : "이 장면에서 폰트 찾기"}
        </Button>
        {frameStatus === "error" ? (
          <p className="text-sm text-destructive">
            프레임을 가져오지 못했습니다. 스크린샷 파일을 올려 진행해주세요.
          </p>
        ) : null}
      </div>

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
