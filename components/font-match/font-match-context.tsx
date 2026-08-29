"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePlayer } from "@/components/player";

import { CANDIDATE_FONTS, RESULT_LIMIT, SAMPLE_TEXT, type CandidateFont } from "./catalog";
import { measureCrop, rankFonts, type PixelRegion } from "./ranking";

type FrameStatus = "idle" | "loading" | "error";

type FontMatchContextValue = {
  imageSrc: string | null;
  region: PixelRegion | null;
  text: string;
  setText: (value: string) => void;
  results: CandidateFont[] | null;
  frameStatus: FrameStatus;
  previewText: string;
  captureFrame: () => void;
  handleRegionChange: (next: PixelRegion | null) => void;
  handleRecommend: () => void;
};

const FontMatchContext = createContext<FontMatchContextValue | null>(null);

export function FontMatchProvider({
  videoId,
  children,
}: {
  videoId: string;
  children: React.ReactNode;
}) {
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

  const putImage = useCallback((src: string | null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = src;
    setImageSrc(src);
    setRegion(null);
    setResults(null);
  }, []);

  const handleRegionChange = useCallback((next: PixelRegion | null) => {
    setRegion(next);
    if (!next) setResults(null);
  }, []);

  // 재생 중인 영상의 현재 시각 프레임을 서버에서 통째로 받아 아래에 띄운다.
  // 유튜브 iframe은 교차 출처라 브라우저에서 직접 캡쳐할 수 없어 서버가 뽑는다.
  const captureFrame = useCallback(async () => {
    const time = player.getCurrentTime();
    if (time == null) {
      setFrameStatus("error");
      return;
    }
    setFrameStatus("loading");
    try {
      const res = await fetch(`/videos/${videoId}/frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      putImage(URL.createObjectURL(blob));
      setFrameStatus("idle");
    } catch {
      setFrameStatus("error");
    }
  }, [player, putImage, videoId]);

  const handleRecommend = useCallback(() => {
    if (!region) return;
    const measurement = measureCrop(region, previewText.length);
    setResults(rankFonts(measurement, CANDIDATE_FONTS, RESULT_LIMIT));
  }, [region, previewText]);

  const value = useMemo<FontMatchContextValue>(
    () => ({
      imageSrc,
      region,
      text,
      setText,
      results,
      frameStatus,
      previewText,
      captureFrame,
      handleRegionChange,
      handleRecommend,
    }),
    [
      imageSrc,
      region,
      text,
      results,
      frameStatus,
      previewText,
      captureFrame,
      handleRegionChange,
      handleRecommend,
    ],
  );

  return <FontMatchContext.Provider value={value}>{children}</FontMatchContext.Provider>;
}

export function useFontMatch(): FontMatchContextValue {
  const ctx = useContext(FontMatchContext);
  if (!ctx) throw new Error("useFontMatch must be used within FontMatchProvider");
  return ctx;
}
