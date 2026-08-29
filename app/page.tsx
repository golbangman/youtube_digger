import { ReferenceList, type ReferenceItem } from "@/components/reference-list";
import { VideoUrlForm } from "@/components/video-url-form";
import { mediaExists } from "@/lib/media-store";
import { getAllRecords, hasCaption } from "@/lib/store";

export default async function Home() {
  const records = await getAllRecords();
  const items: ReferenceItem[] = await Promise.all(
    records.map(async (record) => ({
      videoId: record.videoId,
      title: record.title,
      youtubeUrl: record.youtubeUrl,
      hasCaption: hasCaption(record),
      hasAudio: await mediaExists("audio", record.videoId),
      hasVideo: await mediaExists("video", record.videoId),
      memo: record.memo,
    })),
  );

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          YouTube Digger
        </h1>

        <VideoUrlForm />

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            참고한 영상
          </h2>
          <ReferenceList items={items} />
        </div>
      </main>
    </div>
  );
}
