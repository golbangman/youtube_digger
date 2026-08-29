"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteMedia } from "@/lib/media-store";
import { deleteRecord, getRecordByVideoId, saveRecord, updateMemo } from "@/lib/store";
import { translateToKorean } from "@/lib/translate";
import { fetchReferenceVideo, isYoutubeUrl, YtDlpNotInstalledError } from "@/lib/youtube";

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

  let video: Awaited<ReturnType<typeof fetchReferenceVideo>>;
  try {
    video = await fetchReferenceVideo(url);
  } catch (err) {
    if (err instanceof YtDlpNotInstalledError) {
      return { error: err.message };
    }
    return { error: "영상 정보를 가져오지 못했습니다. 링크를 확인하고 다시 시도해주세요." };
  }

  const existing = await getRecordByVideoId(video.videoId);
  if (existing) {
    redirect(`/videos/${video.videoId}`);
  }

  // 영어 자막이 있으면 번역까지 시도한다. 번역이 실패해도 등록은 한다(자막 없음 상태).
  let englishText: string | undefined;
  let koreanText: string | undefined;
  if (video.text) {
    try {
      koreanText = await translateToKorean(video.text);
      englishText = video.text;
    } catch (err) {
      console.error("translateToKorean failed:", err);
    }
  }

  await saveRecord({
    id: video.videoId,
    videoId: video.videoId,
    youtubeUrl: url,
    title: video.title,
    englishText,
    koreanText,
    memo: "",
    createdAt: new Date().toISOString(),
  });

  redirect(`/videos/${video.videoId}`);
}

export async function updateReferenceMemo(videoId: string, memo: string): Promise<void> {
  await updateMemo(videoId, memo);
  revalidatePath("/");
}

export async function deleteReference(videoId: string): Promise<void> {
  await deleteRecord(videoId);
  await deleteMedia("audio", videoId);
  await deleteMedia("video", videoId);
  revalidatePath("/");
}
