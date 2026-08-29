"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteMedia } from "@/lib/media-store";
import {
  deleteRecord,
  getRecordByVideoId,
  hasCaption,
  saveRecord,
  updateMemo,
} from "@/lib/store";
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
  // 홈 폼의 "번역 페이지" / "미디어 추출" 버튼이 어느 하위 페이지로 보낼지 정한다.
  const target = formData.get("intent")?.toString() === "media" ? "media" : "translate";
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
  // 자막 번역까지 끝난 레코드면 그대로 이동한다.
  if (existing && hasCaption(existing)) {
    redirect(`/videos/${video.videoId}/${target}`);
  }

  // 새 레코드거나, 예전에 자막 없이 저장된 레코드를 다시 채우는 경우다.
  // 영어 자막이 있으면 번역까지 시도한다. 실패해도 등록/이동은 한다(자막 없음 상태).
  let englishText = existing?.englishText;
  let koreanText = existing?.koreanText;
  if (video.text && !(englishText && koreanText)) {
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
    memo: existing?.memo ?? "",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });

  redirect(`/videos/${video.videoId}/${target}`);
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
