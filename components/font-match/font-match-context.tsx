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
  armed: boolean;
  grabFrameFromPlayer: () => void;
  handleFileSelected: (file: File | null) => void;
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

  const handleFileSelected = useCallback(
    (file: File | null) => {
      putImage(file ? URL.createObjectURL(file) : null);
    },
    [putImage],
  );

  const handleRegionChange = useCallback((next: PixelRegion | null) => {
    setRegion(next);
    if (!next) setResults(null);
  }, []);

  const grabFrameFromPlayer = useCallback(() => {
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
      armed: player.armed,
      grabFrameFromPlayer,
      handleFileSelected,
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
      player.armed,
      grabFrameFromPlayer,
      handleFileSelected,
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
