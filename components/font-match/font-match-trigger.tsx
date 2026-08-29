"use client";

import { Button } from "@/components/ui/button";

import { useFontMatch } from "./font-match-context";

export function FontMatchTrigger({ className }: { className?: string }) {
  const { frameStatus, captureFrame } = useFontMatch();

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={frameStatus === "loading"}
      onClick={captureFrame}
    >
      {frameStatus === "loading" ? "캡쳐하는 중..." : "화면 캡쳐"}
    </Button>
  );
}
