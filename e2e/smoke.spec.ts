import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 URL 입력과 참고 영상 목록이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("레퍼런스 영상");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("레퍼런스 영상");
  await expect(
    page.getByPlaceholder("https://www.youtube.com/watch?v=..."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "참고한 영상" })).toBeVisible();
});
