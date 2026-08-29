import { describe, expect, it } from "vitest";

import { measureCrop, rankFonts, scoreFont, type RankableFont } from "./ranking";

const CATALOG: RankableFont[] = [
  { family: "Thin Elegant", traits: { weight: 0.2, contrast: 0.9, width: 0.5 } },
  { family: "Neutral Sans", traits: { weight: 0.45, contrast: 0.15, width: 0.5 } },
  { family: "Heavy Display", traits: { weight: 0.95, contrast: 0.1, width: 0.5 } },
  { family: "Condensed Bold", traits: { weight: 0.7, contrast: 0.2, width: 0.2 } },
  { family: "Wide Round", traits: { weight: 0.5, contrast: 0.08, width: 0.9 } },
];

/** width × height 픽셀의 단색 RGBA 영역을 만든다. */
function solidRegion(width: number, height: number, gray: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = 255;
  }
  return { data, width, height };
}

describe("scoreFont", () => {
  it("같은 특징 벡터면 거리가 0이다", () => {
    const traits = { weight: 0.4, contrast: 0.3, width: 0.6 };
    expect(scoreFont(traits, traits)).toBe(0);
  });

  it("특징이 멀수록 점수가 커진다", () => {
    const measurement = { weight: 0.9, contrast: 0.1, width: 0.5 };
    const near = scoreFont(measurement, { weight: 0.85, contrast: 0.12, width: 0.5 });
    const far = scoreFont(measurement, { weight: 0.1, contrast: 0.9, width: 0.5 });
    expect(near).toBeLessThan(far);
  });
});

describe("rankFonts", () => {
  it("정확히 limit개를 점수 오름차순으로 돌려준다", () => {
    const measurement = { weight: 0.5, contrast: 0.4, width: 0.5 };
    const ranked = rankFonts(measurement, CATALOG, 3);

    expect(ranked).toHaveLength(3);
    const scores = ranked.map((font) => scoreFont(measurement, font.traits));
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });

  it("두껍고 대비 낮은 측정값은 Heavy Display를 1순위로 올린다", () => {
    const ranked = rankFonts({ weight: 0.95, contrast: 0.1, width: 0.5 }, CATALOG);
    expect(ranked[0].family).toBe("Heavy Display");
  });

  it("가늘고 대비 큰 측정값은 Thin Elegant를 1순위로 올린다", () => {
    const ranked = rankFonts({ weight: 0.2, contrast: 0.9, width: 0.5 }, CATALOG);
    expect(ranked[0].family).toBe("Thin Elegant");
  });
});

describe("measureCrop", () => {
  it("빈 영역은 중립값을 돌려준다", () => {
    const measurement = measureCrop({ data: [], width: 0, height: 0 }, 5);
    expect(measurement).toEqual({ weight: 0.5, contrast: 0.5, width: 0.5 });
  });

  it("획이 거의 없는 단색 영역은 두께 인상이 낮다", () => {
    const measurement = measureCrop(solidRegion(20, 10, 240), 6);
    expect(measurement.weight).toBeLessThan(0.2);
    expect(measurement.contrast).toBeLessThan(0.1);
  });

  it("어두운 획이 절반을 덮으면 두께 인상이 커진다", () => {
    const region = solidRegion(20, 10, 240);
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const i = (row * 20 + col) * 4;
        region.data[i] = 20;
        region.data[i + 1] = 20;
        region.data[i + 2] = 20;
      }
    }
    const measurement = measureCrop(region, 6);
    expect(measurement.weight).toBeGreaterThan(0.6);
  });

  it("전경·배경 명암차가 커도 획이 균일하면 대비는 낮게 나온다", () => {
    // 밝은 배경에 새까만 획만 있는 이단(bilevel) 스크린샷을 흉내 낸다.
    const region = solidRegion(30, 12, 245);
    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const i = (row * 30 + col) * 4;
        region.data[i] = 8;
        region.data[i + 1] = 8;
        region.data[i + 2] = 8;
      }
    }
    expect(measureCrop(region, 6).contrast).toBeLessThan(0.2);
  });

  it("같은 입력이면 같은 결과가 나온다", () => {
    const region = solidRegion(16, 12, 128);
    expect(measureCrop(region, 4)).toEqual(measureCrop(region, 4));
  });

  it("가로로 긴 크롭은 좁은 크롭보다 width가 크다", () => {
    const wide = measureCrop(solidRegion(200, 20, 128), 4);
    const narrow = measureCrop(solidRegion(40, 20, 128), 4);
    expect(wide.width).toBeGreaterThan(narrow.width);
  });
});
