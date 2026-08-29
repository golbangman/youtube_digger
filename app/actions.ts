"use server";

import { redirect } from "next/navigation";

import { fetchEnglishTranscript, isYoutubeUrl, YtDlpNotInstalledError } from "@/lib/youtube";
import { translateToKorean } from "@/lib/translate";
import { getRecordByVideoId, saveRecord } from "@/lib/store";

export interface ProcessState {
  error: string | null;
}

export async function processVideoUrl(
  _prevState: ProcessState,
  formData: FormData,
): Promise<ProcessState> {
  const url = formData.get("url")?.toString().trim();
  if (!url) {
    return { error: "유튜브 링크를 입력해주세요." };
  }
  if (!isYoutubeUrl(url)) {
    return { error: "올바른 유튜브 링크가 아닙니다." };
  }

  let transcript: Awaited<ReturnType<typeof fetchEnglishTranscript>>;
  try {
    transcript = await fetchEnglishTranscript(url);
  } catch (err) {
    if (err instanceof YtDlpNotInstalledError) {
      return { error: err.message };
    }
    return { error: "영상 정보를 가져오지 못했습니다. 링크를 확인하고 다시 시도해주세요." };
  }

  if (!transcript) {
    return { error: "이 영상에는 영어 자막이 없어 처리할 수 없습니다." };
  }

  const existing = await getRecordByVideoId(transcript.videoId);
  if (existing) {
    redirect(`/videos/${transcript.videoId}`);
  }

  let koreanText: string;
  try {
    koreanText = await translateToKorean(transcript.text);
  } catch (err) {
    console.error("translateToKorean failed:", err);
    return { error: "번역에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  await saveRecord({
    id: transcript.videoId,
    videoId: transcript.videoId,
    youtubeUrl: url,
    title: transcript.title,
    englishText: transcript.text,
    koreanText,
    createdAt: new Date().toISOString(),
  });

  redirect(`/videos/${transcript.videoId}`);
}
