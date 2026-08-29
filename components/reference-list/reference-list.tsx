"use client";

import { Captions, Film, Music } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteReference, updateReferenceMemo } from "@/app/actions";
import { Button } from "@/components/ui/button";

export type ReferenceItem = {
  videoId: string;
  title: string;
  hasCaption: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  memo: string;
};

function AssetIcons({ item }: { item: ReferenceItem }) {
  return (
    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
      {item.hasCaption ? <Captions className="size-4" aria-label="자막 번역" /> : null}
      {item.hasAudio ? <Music className="size-4" aria-label="배경음악" /> : null}
      {item.hasVideo ? <Film className="size-4" aria-label="영상" /> : null}
    </div>
  );
}

function ReferenceRow({ item }: { item: ReferenceItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const saveMemo = (memo: string) => {
    if (memo === item.memo) return;
    startTransition(async () => {
      await updateReferenceMemo(item.videoId, memo);
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deleteReference(item.videoId);
      router.refresh();
    });
  };

  return (
    <li className="flex gap-4 py-4">
      <Link
        href={`/videos/${item.videoId}`}
        className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800"
      >
        {/* 유튜브 공개 썸네일. 사용자가 올린 이미지가 아니라 외부 URL이라 일반 img를 쓴다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/videos/${item.videoId}`}
            className="line-clamp-2 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            {item.title}
          </Link>
          <AssetIcons item={item} />
        </div>

        <textarea
          defaultValue={item.memo}
          onBlur={(event) => saveMemo(event.target.value)}
          placeholder="메모"
          rows={2}
          className="w-full resize-y rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                레코드와 받아둔 파일을 지웁니다.
              </span>
              <Button
                type="button"
                size="xs"
                variant="destructive"
                disabled={pending}
                onClick={remove}
              >
                지우기
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                취소
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirming(true)}
            >
              삭제
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export function ReferenceList({ items }: { items: ReferenceItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        아직 참고한 영상이 없어요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
      {items.map((item) => (
        <ReferenceRow key={item.videoId} item={item} />
      ))}
    </ul>
  );
}
