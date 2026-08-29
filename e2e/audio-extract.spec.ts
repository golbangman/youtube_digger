import { promises as fs } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { removeSeededRecord, seedRecord } from "./helpers/seed-record";

const DATA_DIR = path.join(process.cwd(), "data");
// "Me at the zoo" — 19초짜리 실제 영상. 실제 추출을 빠르게 돌리려고 쓴다.
const VIDEO_ID = "jNQXAC9IVRw";
const AUDIO_FILE = path.join(DATA_DIR, "audio", `${VIDEO_ID}.mp3`);

test.beforeAll(async () => {
  await seedRecord({ videoId: VIDEO_ID, title: "배경음악 E2E 레퍼런스" });
  await fs.rm(AUDIO_FILE, { force: true });
});

test.afterAll(async () => {
  await fs.rm(AUDIO_FILE, { force: true });
  await removeSeededRecord(VIDEO_ID);
});

test("배경음악을 MP3로 추출하면 진행률이 보이고 다운로드 링크가 나오며, 재방문 시 바로 받는다", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await page.goto(`/videos/${VIDEO_ID}`);
  await expect(page.getByRole("heading", { level: 2, name: "배경음악" })).toBeVisible();

  const extract = page.getByRole("button", { name: "MP3 추출" });
  await expect(extract).toBeEnabled();
  await extract.click();

  // 진행 상태(내려받기 퍼센트 또는 변환 중)가 눈에 보인다.
  await expect(page.getByText(/내려받는 중 [\d.]+%|MP3로 변환 중/)).toBeVisible({
    timeout: 60_000,
  });

  // 완료되면 다운로드 링크가 나온다.
  const link = page.getByRole("link", { name: "MP3 내려받기" });
  await expect(link).toBeVisible({ timeout: 150_000 });

  const res = await page.request.get(`/videos/${VIDEO_ID}/audio`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("audio/mpeg");
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const body = await res.body();
  expect(body.byteLength).toBeGreaterThan(10_000);

  // 재방문: 추출을 다시 실행하지 않아도 링크가 바로 보인다.
  await page.reload();
  await expect(page.getByRole("link", { name: "MP3 내려받기" })).toBeVisible();
  await expect(page.getByText(/내려받는 중|변환 중/)).toHaveCount(0);
});
