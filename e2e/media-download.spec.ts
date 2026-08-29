import { promises as fs } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { removeSeededRecord, seedRecord } from "./helpers/seed-record";

const DATA_DIR = path.join(process.cwd(), "data");
// "Me at the zoo" — 19초짜리 실제 영상. 실제 추출·다운로드를 빠르게 돌리려고 쓴다.
const VIDEO_ID = "jNQXAC9IVRw";
const AUDIO_FILE = path.join(DATA_DIR, "audio", `${VIDEO_ID}.mp3`);
const VIDEO_FILE = path.join(DATA_DIR, "video", `${VIDEO_ID}.mp4`);

// 두 테스트가 같은 영상 레코드를 공유하므로 한 파일에서 순차로 돈다.
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await seedRecord({ videoId: VIDEO_ID, title: "미디어 다운로드 E2E 레퍼런스" });
  await fs.rm(AUDIO_FILE, { force: true });
  await fs.rm(VIDEO_FILE, { force: true });
});

test.afterAll(async () => {
  await fs.rm(AUDIO_FILE, { force: true });
  await fs.rm(VIDEO_FILE, { force: true });
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

  await expect(page.getByText(/내려받는 중 [\d.]+%|MP3로 변환 중/)).toBeVisible({
    timeout: 60_000,
  });

  const link = page.getByRole("link", { name: "MP3 내려받기" });
  await expect(link).toBeVisible({ timeout: 150_000 });

  const res = await page.request.get(`/videos/${VIDEO_ID}/audio`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("audio/mpeg");
  expect(res.headers()["content-disposition"]).toContain("attachment");
  expect((await res.body()).byteLength).toBeGreaterThan(10_000);

  await page.reload();
  await expect(page.getByRole("link", { name: "MP3 내려받기" })).toBeVisible();
  await expect(page.getByText(/내려받는 중|변환 중/)).toHaveCount(0);
});

test("영상을 MP4로 받으면 진행률이 보이고 다운로드 링크가 나오며, 재방문 시 바로 받는다", async ({
  page,
}) => {
  test.setTimeout(240_000);

  await page.goto(`/videos/${VIDEO_ID}`);
  await expect(page.getByRole("heading", { level: 2, name: "영상 다운로드" })).toBeVisible();

  const grab = page.getByRole("button", { name: "영상 받기" });
  await expect(grab).toBeEnabled();
  await grab.click();

  await expect(page.getByText(/내려받는 중 [\d.]+%|MP4로 병합 중/)).toBeVisible({
    timeout: 60_000,
  });

  const link = page.getByRole("link", { name: "MP4 내려받기" });
  await expect(link).toBeVisible({ timeout: 210_000 });

  const res = await page.request.get(`/videos/${VIDEO_ID}/video`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("video/mp4");
  expect(res.headers()["content-disposition"]).toContain("attachment");
  expect((await res.body()).byteLength).toBeGreaterThan(50_000);

  await page.reload();
  await expect(page.getByRole("link", { name: "MP4 내려받기" })).toBeVisible();
  await expect(page.getByText(/내려받는 중|병합 중/)).toHaveCount(0);
});
