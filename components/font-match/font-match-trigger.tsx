"use client";

import { Button } from "@/components/ui/button";

import { useFontMatch } from "./font-match-context";

export function FontMatchTrigger({ className }: { className?: string }) {
  const { armed, frameStatus, grabFrameFromPlayer } = useFontMatch();

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={armed || frameStatus === "loading"}
      onClick={grabFrameFromPlayer}
    >
      {armed
        ? "위 영상에서 영역을 드래그하세요"
        : frameStatus === "loading"
          ? "프레임 가져오는 중..."
          : "이 장면에서 폰트 찾기"}
    </Button>
  );
}
