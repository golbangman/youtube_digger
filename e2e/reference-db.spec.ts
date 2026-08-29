import { promises as fs } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { removeSeededRecord, seedRecord } from "./helpers/seed-record";

const DATA_DIR = path.join(process.cwd(), "data");
const CAP_ID = "refdbcapXX";
const NOCAP_ID = "refdbnocapX";
// 영어 자막이 있는 실제 영상. media-download 스펙이 쓰는 영상과 겹치지 않게 고른다.
const REAL_ID = "dQw4w9WgXcQ";
const CAP_AUDIO = path.join(DATA_DIR, "audio", `${CAP_ID}.mp3`);

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await seedRecord({ videoId: CAP_ID, title: "자막 있는 레퍼런스" });
  await seedRecord({ videoId: NOCAP_ID, title: "자막 없는 레퍼런스", caption: false });
  await fs.mkdir(path.join(DATA_DIR, "audio"), { recursive: true });
  await fs.writeFile(CAP_AUDIO, Buffer.alloc(2048, 1));
});

test.afterAll(async () => {
  await fs.rm(CAP_AUDIO, { force: true });
  for (const id of [CAP_ID, NOCAP_ID, REAL_ID]) {
    await removeSeededRecord(id);
    await fs.rm(path.join(DATA_DIR, "audio", `${id}.mp3`), { force: true });
    await fs.rm(path.join(DATA_DIR, "video", `${id}.mp4`), { force: true });
  }
});

test("홈 목록이 썸네일과 자산 아이콘과 함께 보인다", async ({ page }) => {
  await page.goto("/");

  const capRow = page.getByRole("listitem").filter({ hasText: "자막 있는 레퍼런스" });
  const nocapRow = page.getByRole("listitem").filter({ hasText: "자막 없는 레퍼런스" });
  await expect(capRow).toBeVisible();
  await expect(nocapRow).toBeVisible();

  await expect(capRow.locator(`img[src*="${CAP_ID}"]`)).toBeVisible();

  // 자막 레코드 + mp3 파일 → 자막·배경음악 아이콘. 영상 아이콘은 없음.
  await expect(capRow.getByLabel("자막 번역")).toBeVisible();
  await expect(capRow.getByLabel("배경음악")).toBeVisible();
  await expect(capRow.getByLabel("영상")).toHaveCount(0);

  // 자막 없는 레코드 → 아이콘 없음.
  await expect(nocapRow.getByLabel("자막 번역")).toHaveCount(0);
  await expect(nocapRow.getByLabel("배경음악")).toHaveCount(0);
});

test("메모를 적으면 저장되고 새로고침해도 남아 있다", async ({ page }) => {
  await page.goto("/");
  const capRow = page.getByRole("listitem").filter({ hasText: "자막 있는 레퍼런스" });

  const memo = capRow.getByPlaceholder("메모");
  await memo.fill("인트로 편집 참고");
  await memo.blur();
  await expect(async () => {
    await page.reload();
    await expect(
      page.getByRole("listitem").filter({ hasText: "자막 있는 레퍼런스" }).getByPlaceholder("메모"),
    ).toHaveValue("인트로 편집 참고");
  }).toPass({ timeout: 10_000 });
});

test("자막 없는 레퍼런스의 작업 페이지는 자막 없음을 알린다", async ({ page }) => {
  await page.goto(`/videos/${NOCAP_ID}`);

  await expect(page.getByText("이 영상에는 영어 자막이 없어 번역을 만들지 않았습니다.")).toBeVisible();
  await expect(page.getByRole("link", { name: /자막 내려받기/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "폰트 추천" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "배경음악" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "영상 다운로드" })).toBeVisible();

  const res = await page.request.get(`/videos/${NOCAP_ID}/download`);
  expect(res.status()).toBe(404);
});

test("삭제하면 항목과 받아둔 파일이 사라진다", async ({ page }) => {
  await page.goto("/");
  const capRow = page.getByRole("listitem").filter({ hasText: "자막 있는 레퍼런스" });

  await capRow.getByRole("button", { name: "삭제" }).click();
  await capRow.getByRole("button", { name: "지우기" }).click();

  await expect(
    page.getByRole("listitem").filter({ hasText: "자막 있는 레퍼런스" }),
  ).toHaveCount(0);

  await expect(async () => {
    expect(await fs.access(CAP_AUDIO).then(() => true, () => false)).toBe(false);
  }).toPass({ timeout: 5_000 });
});

test("URL을 제출하면 참고 목록에 등록된다", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/");

  await page
    .getByPlaceholder("https://www.youtube.com/watch?v=...")
    .fill(`https://www.youtube.com/watch?v=${REAL_ID}`);
  await page.getByRole("button", { name: "레퍼런스 추가" }).click();

  await page.waitForURL(new RegExp(`/videos/${REAL_ID}`), { timeout: 150_000 });

  await page.goto("/");
  await expect(
    page
      .getByRole("listitem")
      .filter({ has: page.locator(`img[src*="${REAL_ID}"]`) }),
  ).toBeVisible();
});
