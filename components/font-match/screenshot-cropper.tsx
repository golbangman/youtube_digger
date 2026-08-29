"use client";

import { useCallback, useRef, useState } from "react";

import type { PixelRegion } from "./ranking";

type Point = { x: number; y: number };
type Rect = { left: number; top: number; width: number; height: number };

type Props = {
  /** 표시할 이미지. 없으면 크로퍼가 안 보인다. */
  imageSrc: string | null;
  /** 파일을 고르면 그 File을 넘긴다(비우면 null). 부모가 objectURL을 관리한다. */
  onFileSelected: (file: File | null) => void;
  /** 선택 영역이 확정되면 그 픽셀을, 취소되면 null을 넘긴다. */
  onRegionChange: (region: PixelRegion | null) => void;
  /** 프레임을 가져오는 중이면 파일 선택을 막는다. */
  disabled?: boolean;
};

const MIN_SELECTION_PX = 4;

function rectFromPoints(a: Point, b: Point): Rect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function ScreenshotCropper({ imageSrc, onFileSelected, onRegionChange, disabled }: Props) {
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const movedRef = useRef(false);

  const pointFromEvent = useCallback((event: React.MouseEvent<HTMLDivElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!imageSrc) return;
      movedRef.current = false;
      setDragStart(pointFromEvent(event));
    },
    [imageSrc, pointFromEvent],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!dragStart) return;
      movedRef.current = true;
      setRect(rectFromPoints(dragStart, pointFromEvent(event)));
    },
    [dragStart, pointFromEvent],
  );

  const finishSelection = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!dragStart) return;
      const moved = movedRef.current;
      setDragStart(null);
      if (!moved) return;

      const selection = rectFromPoints(dragStart, pointFromEvent(event));
      setRect(selection);

      const img = imgRef.current;
      if (!img || img.clientWidth === 0 || img.clientHeight === 0) {
        setRect(null);
        onRegionChange(null);
        return;
      }

      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;
      const sx = Math.round(selection.left * scaleX);
      const sy = Math.round(selection.top * scaleY);
      const sw = Math.round(selection.width * scaleX);
      const sh = Math.round(selection.height * scaleY);

      if (sw < MIN_SELECTION_PX || sh < MIN_SELECTION_PX) {
        setRect(null);
        onRegionChange(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onRegionChange(null);
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      onRegionChange(ctx.getImageData(0, 0, sw, sh));
    },
    [dragStart, onRegionChange, pointFromEvent],
  );

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="screenshot-file" className="text-sm font-medium">
        스크린샷 파일로 찾기
      </label>
      <input
        id="screenshot-file"
        type="file"
        accept="image/png,image/jpeg"
        disabled={disabled}
        onChange={(event) => {
          setRect(null);
          setDragStart(null);
          onRegionChange(null);
          onFileSelected(event.target.files?.[0] ?? null);
        }}
        className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
      />

      {imageSrc ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            이미지 위에서 드래그해 폰트를 찾을 텍스트 한 덩어리를 감싸세요. 다시
            드래그하면 새 영역으로 바뀝니다.
          </p>
          <div className="relative inline-block max-w-full select-none border border-border">
            {/* 프레임/업로드 blob 이미지라 next/image 대신 일반 img를 쓴다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="폰트를 찾을 이미지"
              draggable={false}
              className="block h-auto max-w-full"
            />
            <div
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={finishSelection}
              onMouseLeave={finishSelection}
            >
              {rect && rect.width > 0 && rect.height > 0 ? (
                <div
                  className="absolute border-2 border-primary bg-primary/10"
                  style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
