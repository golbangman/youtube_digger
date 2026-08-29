"use client";

import { useActionState } from "react";

import { processVideoUrl, type ProcessState } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initialState: ProcessState = { error: null };

export function VideoUrlForm() {
  const [state, formAction, pending] = useActionState(processVideoUrl, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="url"
          type="url"
          required
          placeholder="https://www.youtube.com/watch?v=..."
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "처리 중..." : "자막 보기"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
