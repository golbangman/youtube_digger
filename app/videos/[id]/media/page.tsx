import Link from "next/link";
import { notFound } from "next/navigation";

import { FontMatchPanel, FontMatchProvider, FontMatchTrigger } from "@/components/font-match";
import { MediaDownload } from "@/components/media-download";
import { PlayerProvider, YouTubePlayer } from "@/components/player";
import { mediaExists } from "@/lib/media-store";
import { getRecordByVideoId } from "@/lib/store";

export default async function MediaPage(props: PageProps<"/videos/[id]/media">) {
  const { id } = await props.params;
  const record = await getRecordByVideoId(id);

  if (!record) {
    notFound();
  }

  const [audioReady, videoReady] = await Promise.all([
    mediaExists("audio", record.videoId),
    mediaExists("video", record.videoId),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← 새 영상 입력
        </Link>

        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {record.title}
        </h1>

        <PlayerProvider>
          <FontMatchProvider videoId={record.videoId}>
            <div className="flex flex-col gap-6">
              <div className="flex w-3/4 flex-col gap-1 self-center">
                <div className="relative">
                  <YouTubePlayer videoId={record.videoId} />
                  <FontMatchTrigger className="absolute top-3 right-3 z-20" />
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
              <FontMatchPanel />
            </div>
          </FontMatchProvider>
        </PlayerProvider>

        <section className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <MediaDownload kind="audio" videoId={record.videoId} initialReady={audioReady} />
        </section>

        <section className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <MediaDownload kind="video" videoId={record.videoId} initialReady={videoReady} />
        </section>

        <div className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <Link
            href={`/videos/${record.videoId}/translate`}
            className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            번역 보기 →
          </Link>
        </div>
      </main>
    </div>
  );
}
