import { VideoUrlForm } from "@/components/video-url-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            레퍼런스 영상 자막
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            영어 자막이 있는 유튜브 링크를 입력하면 영상과 함께 영어 원문·한국어 번역을 보고,
            자막을 .txt 파일로 내려받을 수 있습니다.
          </p>
        </div>

        <VideoUrlForm />
      </main>
    </div>
  );
}
