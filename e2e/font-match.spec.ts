import { promises as fs } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const FIXTURE = path.join(__dirname, "fixtures", "reference-title.png");
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "records.json");
const VIDEO_ID = "e2efontmatch";

// 폰트 추천 영역은 번역 페이지 위에 있으므로, 자막 레코드가 있는 영상에서만
// 나타난다. 실제 yt-dlp·번역을 돌리지 않도록 레코드를 직접 심는다.
let savedBefore: string | null = null;

test.beforeAll(async () => {
  try {
    savedBefore = await fs.readFile(DATA_FILE, "utf-8");
  } catch {
    savedBefore = null;
  }
  const existing = savedBefore ? JSON.parse(savedBefore) : [];
  const seeded = [
    ...existing.filter((r: { videoId: string }) => r.videoId !== VIDEO_ID),
    {
      id: VIDEO_ID,
      videoId: VIDEO_ID,
      youtubeUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      title: "폰트 추천 E2E 레퍼런스",
      englishText: "Seeded English transcript.",
      koreanText: "심어 둔 한국어 번역.",
      createdAt: new Date().toISOString(),
    },
  ];
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(seeded, null, 2), "utf-8");
});

test.afterAll(async () => {
  if (savedBefore === null) {
    await fs.rm(DATA_FILE, { force: true });
  } else {
    await fs.writeFile(DATA_FILE, savedBefore, "utf-8");
  }
});

test("번역 페이지에서 스크린샷을 올리고 영역을 지정하면 비슷한 무료 폰트 5개와 다운로드 링크가 나온다", async ({
  page,
}) => {
  await page.goto(`/videos/${VIDEO_ID}`);

  await expect(page.getByRole("heading", { level: 2, name: "폰트 추천" })).toBeVisible();

  await page.getByLabel("레퍼런스 스크린샷").setInputFiles(FIXTURE);

  const image = page.getByRole("img", { name: "업로드한 스크린샷" });
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();

  const recommend = page.getByRole("button", { name: "비슷한 무료 폰트 추천" });
  await expect(recommend).toBeDisabled();

  const box = await image.boundingBox();
  if (!box) throw new Error("스크린샷 이미지의 위치를 찾지 못했습니다");

  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.65, { steps: 10 });
  await page.mouse.up();

  await page.getByLabel("이미지 속 글자").fill("SUBSCRIBE");

  await expect(recommend).toBeEnabled();
  await recommend.click();

  const items = page.getByRole("listitem");
  await expect(items).toHaveCount(5);

  const downloadLinks = page.getByRole("link", { name: "다운로드" });
  await expect(downloadLinks).toHaveCount(5);
  await expect(downloadLinks.first()).toHaveAttribute(
    "href",
    /^https:\/\/fonts\.google\.com\/specimen\//,
  );
  await expect(downloadLinks.first()).toHaveAttribute("target", "_blank");

  await page.reload();
  await expect(page.getByRole("img", { name: "업로드한 스크린샷" })).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(0);
});
