"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePlayer, type RegionSelection } from "./player-context";

type YTPlayer = { getCurrentTime: () => number; destroy: () => void };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: { videoId: string; events?: { onReady?: () => void } },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YT API가 로드되지 않았습니다."));
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = API_SRC;
      script.async = true;
      script.onerror = () => reject(new Error("YT API 스크립트를 불러오지 못했습니다."));
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

type Point = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };

export function YouTubePlayer({ videoId }: { videoId: string }) {
  const { registerTimeSource, getCurrentTime, armed, disarm, emitSelection } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ origin: Point; time: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    let player: YTPlayer | null = null;
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        player = new YT.Player(hostRef.current, {
          videoId,
          events: {
            onReady: () => {
              if (!cancelled && player) registerTimeSource(() => player!.getCurrentTime());
            },
          },
        });
      })
      .catch(() => setApiError(true));

    return () => {
      cancelled = true;
      registerTimeSource(null);
      try {
        player?.destroy();
      } catch {
        // 이미 파괴됨
      }
    };
  }, [videoId, registerTimeSource]);

  // 영역 선택을 켜면 플레이어를 화면 안으로 끌어온다. 버튼이 아래쪽 폰트 추천
  // 영역에 있어서, 켜자마자 위로 스크롤하지 않으면 드래그할 대상이 안 보인다.
  useEffect(() => {
    if (armed) containerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [armed]);

  const localPoint = useCallback((event: React.PointerEvent): Point => {
    const b = overlayRef.current!.getBoundingClientRect();
    return { x: event.clientX - b.left, y: event.clientY - b.top };
  }, []);

  const boxFrom = (a: Point, b: Point): Box => ({
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  });

  // 포인터 캡처를 잡아야 유튜브 iframe 위로 드래그해도 move/up 이벤트를 계속 받는다.
  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { origin: localPoint(event), time: getCurrentTime() ?? 0 };
    setBox(null);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    setBox(boxFrom(dragRef.current.origin, localPoint(event)));
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setBox(null);
    if (!drag) return;

    const bounds = overlayRef.current!.getBoundingClientRect();
    const selected = boxFrom(drag.origin, localPoint(event));
    if (selected.width < 8 || selected.height < 8 || bounds.width === 0 || bounds.height === 0) {
      disarm();
      return;
    }

    emitSelection({
      time: drag.time,
      x: selected.left / bounds.width,
      y: selected.top / bounds.height,
      w: selected.width / bounds.width,
      h: selected.height / bounds.height,
    } satisfies RegionSelection);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-black"
    >
      <div ref={hostRef} className="h-full w-full" />
      {apiError ? (
        <p className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-center text-xs text-white">
          플레이어를 불러오지 못했습니다.
        </p>
      ) : null}
      {armed ? (
        <div
          ref={overlayRef}
          data-testid="player-select-overlay"
          className="absolute inset-0 z-10 touch-none cursor-crosshair bg-primary/10"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {box && box.width > 0 && box.height > 0 ? (
            <div
              className="absolute border-2 border-primary bg-primary/10"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
