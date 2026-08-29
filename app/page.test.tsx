import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("홈 화면은 자막 제목과 URL 입력란을 보여준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: /레퍼런스 영상 자막/ })
  ).toBeInTheDocument();
  expect(
    screen.getByPlaceholderText(/youtube\.com\/watch/i)
  ).toBeInTheDocument();
});
