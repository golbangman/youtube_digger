"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Kind = "audio" | "video";

type Status = "idle" | "downloading" | "processing" | "ready" | "error";

type ProgressEvent =
  | { phase: "downloading"; percent: number }
  | { phase: "processing" }
  | { phase: "done" }
  | { phase: "error"; message: string };

const CONFIG: Record<
  Kind,
  {
    heading: string;
    description: string;
    action: string;
    busy: string;
    redo: string;
    download: string;
    processing: string;
  }
> = {
  audio: {
    heading: "배경음악",
    description: "영상의 오디오를 통째로 MP3로 뽑습니다. 말소리와 음악을 분리하지 않습니다.",
    action: "MP3 추출",
    busy: "추출 중...",
    redo: "다시 추출",
    download: "MP3 내려받기",
    processing: "MP3로 변환 중...",
  },
  video: {
    heading: "영상 다운로드",
    description: "1080p 이하에서 가장 좋은 화질을 골라 MP4 파일로 받습니다.",
    action: "영상 받기",
    busy: "받는 중...",
    redo: "다시 받기",
    download: "MP4 내려받기",
    processing: "MP4로 병합 중...",
  },
};

type Props = {
  kind: Kind;
  videoId: string;
  initialReady: boolean;
};

export function MediaDownload({ kind, videoId, initialReady }: Props) {
  const config = CONFIG[kind];
  const [status, setStatus] = useState<Status>(initialReady ? "ready" : "idle");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
    };
  }, []);

  const start = () => {
    sourceRef.current?.close();
    setError(null);
    setPercent(0);
    setStatus("downloading");

    const source = new EventSource(`/videos/${videoId}/${kind}/extract`);
    sourceRef.current = source;

    source.onmessage = (event) => {
      let data: ProgressEvent;
      try {
        data = JSON.parse(event.data) as ProgressEvent;
      } catch {
        return;
      }
      if (data.phase === "downloading") {
        setStatus("downloading");
        setPercent(data.percent);
      } else if (data.phase === "processing") {
        setStatus("processing");
      } else if (data.phase === "done") {
        setStatus("ready");
        source.close();
      } else {
        setError(data.message);
        setStatus("error");
        source.close();
      }
    };

    source.onerror = () => {
      // 스트림이 정상 종료되면 EventSource가 재연결을 시도하며 error를 던진다.
      // 아직 진행 중일 때만 연결 끊김으로 본다. done/error를 이미 받았으면 둔다.
      source.close();
      setStatus((current) => {
        if (current !== "downloading" && current !== "processing") return current;
        setError("연결이 끊겼습니다. 다시 시도해주세요.");
        return "error";
      });
    };
  };

  const busy = status === "downloading" || status === "processing";

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{config.heading}</h2>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={start} disabled={busy}>
          {status === "ready" ? config.redo : busy ? config.busy : config.action}
        </Button>
        {status === "ready" ? (
          <a
            href={`/videos/${videoId}/${kind}`}
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            {config.download}
          </a>
        ) : null}
      </div>

      {busy ? (
        <div className="flex flex-col gap-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${status === "processing" ? 100 : percent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {status === "processing"
              ? config.processing
              : `내려받는 중 ${percent.toFixed(1)}%`}
          </span>
        </div>
      ) : null}

      {status === "error" && error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
