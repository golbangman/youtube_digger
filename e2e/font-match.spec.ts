import path from "node:path";

import { expect, test } from "@playwright/test";

import { removeSeededRecord, seedRecord } from "./helpers/seed-record";

const FIXTURE = path.join(__dirname, "fixtures", "reference-title.png");
const VIDEO_ID = "e2efontmatch";
// 플레이어 드래그 → 프레임 추출 테스트는 실제 영상이 필요하다. 다른 스펙과 안 겹친다.
const PLAYER_VIDEO_ID = "aqz-KE-bpKQ";

test.beforeAll(async () => {
  await seedRecord({ videoId: VIDEO_ID, title: "폰트 추천 E2E 레퍼런스" });
  await seedRecord({ videoId: PLAYER_VIDEO_ID, title: "플레이어 프레임 레퍼런스", caption: false });
});

test.afterAll(async () => {
  await removeSeededRecord(VIDEO_ID);
  await removeSeededRecord(PLAYER_VIDEO_ID);
});

test("스크린샷 파일을 올리고 영역을 지정하면 비슷한 무료 폰트 5개와 다운로드 링크가 나온다", async ({
  page,
}) => {
  await page.goto(`/videos/${VIDEO_ID}`);

  await expect(page.getByRole("heading", { level: 2, name: "폰트 추천" })).toBeVisible();
  await expect(page.getByRole("button", { name: "이 장면에서 폰트 찾기" })).toBeVisible();

  await page.getByLabel("스크린샷 파일로 찾기").setInputFiles(FIXTURE);

  const image = page.getByRole("img", { name: "폰트를 찾을 이미지" });
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();

  const recommend = page.getByRole("button", { name: "비슷한 무료 폰트 추천" });
  await expect(recommend).toBeDisabled();

  const box = await image.boundingBox();
  if (!box) throw new Error("이미지 위치를 찾지 못했습니다");

  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.65, { steps: 10 });
  await page.mouse.up();

  await page.getByLabel("이미지 속 글자").fill("SUBSCRIBE");

  await expect(recommend).toBeEnabled();
  await recommend.click();

  await expect(page.getByRole("listitem")).toHaveCount(5);
  const downloadLinks = page.getByRole("link", { name: "다운로드" });
  await expect(downloadLinks).toHaveCount(5);
  await expect(downloadLinks.first()).toHaveAttribute(
    "href",
    /^https:\/\/fonts\.google\.com\/specimen\//,
  );
  await expect(downloadLinks.first()).toHaveAttribute("target", "_blank");

  await page.reload();
  await expect(page.getByRole("img", { name: "폰트를 찾을 이미지" })).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("영상에서 영역을 드래그하면 그 장면의 프레임이 잘려 크로퍼에 올라온다", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto(`/videos/${PLAYER_VIDEO_ID}`);

  await page.getByRole("button", { name: "이 장면에서 폰트 찾기" }).click();

  const overlay = page.getByTestId("player-select-overlay");
  await expect(overlay).toBeVisible();
  await page.waitForTimeout(1000); // 플레이어가 화면 안으로 스크롤될 시간을 준다

  const box = await overlay.boundingBox();
  if (!box) throw new Error("오버레이 위치를 찾지 못했습니다");
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.6, { steps: 12 });
  await page.mouse.up();

  // 서버가 프레임을 잘라 돌려주면 크로퍼 이미지가 뜬다.
  await expect(page.getByRole("img", { name: "폰트를 찾을 이미지" })).toBeVisible({
    timeout: 120_000,
  });
});
