import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 자막 입력 안내가 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("레퍼런스 영상 자막");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "레퍼런스 영상 자막"
  );
  await expect(
    page.getByPlaceholder("https://www.youtube.com/watch?v=...")
  ).toBeVisible();
});
