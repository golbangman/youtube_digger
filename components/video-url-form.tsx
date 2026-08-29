"use client";

import { useActionState } from "react";

import { processVideoUrl, type ProcessState } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialState: ProcessState = { error: null };

export function VideoUrlForm() {
  const [state, formAction, pending] = useActionState(processVideoUrl, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <input
        name="url"
        type="url"
        required
        placeholder="https://www.youtube.com/watch?v=..."
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex gap-2">
        <Button type="submit" name="intent" value="translate" disabled={pending}>
          {pending ? "등록 중..." : "번역 페이지"}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="media"
          variant="outline"
          disabled={pending}
        >
          {pending ? "등록 중..." : "미디어 추출"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
