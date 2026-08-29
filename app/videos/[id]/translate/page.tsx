import Link from "next/link";
import { notFound } from "next/navigation";

import { getRecordByVideoId, hasCaption } from "@/lib/store";

export default async function TranslatePage(props: PageProps<"/videos/[id]/translate">) {
  const { id } = await props.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    notFound();
  }

  const captionReady = hasCaption(record);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← 새 영상 입력
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {record.title}
          </h1>
          {captionReady ? (
            <a
              href={`/videos/${record.videoId}/download`}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              자막 내려받기 (.txt)
            </a>
          ) : null}
        </div>

        <div className="flex w-3/4 flex-col gap-1 self-center">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${record.videoId}`}
              title={record.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <a
            href={record.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="self-end text-right text-sm break-all text-zinc-500 hover:underline dark:text-zinc-400"
          >
            {record.youtubeUrl}
          </a>
        </div>

        {captionReady ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                영어 자막
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                {record.englishText}
              </p>
            </section>
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                한국어 번역
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                {record.koreanText}
              </p>
            </section>
          </div>
        ) : (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              자막
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              이 영상에는 영어 자막이 없어 번역을 만들지 않았습니다.
            </p>
          </section>
        )}

        <div className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <Link
            href={`/videos/${record.videoId}/media`}
            className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            MEDIA 추출 →
          </Link>
        </div>
      </main>
    </div>
  );
}
