/**
 * 크롭한 텍스트 이미지에서 대충의 시각 특징을 뽑아, 후보 폰트를 비슷한 순으로
 * 정렬한다. 정교한 유사도 판별 기법은 스펙에서 미룬 상태이므로 여기서는
 * 결정적이고 크롭에 따라 결과가 달라지는 휴리스틱만 쓴다.
 */

export type FontTraits = {
  /** 0 = 아주 가벼운 인상, 1 = 아주 두꺼운 인상 */
  weight: number;
  /** 0 = 획 굵기가 일정함, 1 = 굵기 대비가 큼(세리프·디스플레이) */
  contrast: number;
  /** 0 = 좁은 폭(콘덴스트), 1 = 넓은 폭 */
  width: number;
};

export type CropMeasurement = FontTraits;

export type RankableFont = {
  family: string;
  traits: FontTraits;
};

/** ImageData와 호환되는 최소 형태. 테스트에서는 평범한 객체를 넘긴다. */
export type PixelRegion = {
  data: ArrayLike<number>;
  width: number;
  height: number;
};

// 두께 인상이 가장 또렷한 신호라 크게 잡는다. 대비와 폭은 근사치라 조금 낮춘다.
const DIMENSION_WEIGHT = { weight: 1, contrast: 0.6, width: 0.6 } as const;

const NEUTRAL: CropMeasurement = { weight: 0.5, contrast: 0.5, width: 0.5 };

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/** 특징 벡터 사이의 가중 거리. 낮을수록 비슷하다. */
export function scoreFont(measurement: CropMeasurement, traits: FontTraits): number {
  const dw = (measurement.weight - traits.weight) ** 2 * DIMENSION_WEIGHT.weight;
  const dc = (measurement.contrast - traits.contrast) ** 2 * DIMENSION_WEIGHT.contrast;
  const dx = (measurement.width - traits.width) ** 2 * DIMENSION_WEIGHT.width;
  return Math.sqrt(dw + dc + dx);
}

/** 후보 폰트를 비슷한 순으로 정렬해 상위 `limit`개를 돌려준다. */
export function rankFonts<T extends RankableFont>(
  measurement: CropMeasurement,
  fonts: readonly T[],
  limit = 5,
): T[] {
  return [...fonts]
    .map((font) => ({ font, score: scoreFont(measurement, font.traits) }))
    .sort((a, b) => a.score - b.score || a.font.family.localeCompare(b.font.family))
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.font);
}

/**
 * 크롭 영역의 픽셀에서 특징 벡터를 뽑는다.
 *
 * - weight: 텍스트 획이 차지하는 픽셀 비율(밝기 극단 중 소수 쪽)로 두께 인상을 잡는다.
 *   밝은 글자/어두운 글자 어느 쪽이든 배경이 다수이므로 소수 비율을 획으로 본다.
 * - contrast: 획으로 본 픽셀들 안에서의 밝기 흔들림을 전경·배경 명암차로 나눠
 *   획 굵기 대비를 근사한다.
 * - width: 글자 한 개당 평균 가로폭을 크롭 세로 길이로 정규화한다.
 */
export function measureCrop(region: PixelRegion, textLength: number): CropMeasurement {
  const { data, width, height } = region;
  const pixelCount = Math.floor(data.length / 4);
  if (pixelCount === 0 || width === 0 || height === 0) return { ...NEUTRAL };

  let min = 255;
  let max = 0;
  const lumas = new Float64Array(pixelCount);
  for (let p = 0; p < pixelCount; p += 1) {
    const i = p * 4;
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    lumas[p] = luma;
    if (luma < min) min = luma;
    if (luma > max) max = luma;
  }

  const mid = (min + max) / 2;

  let darkCount = 0;
  for (let p = 0; p < pixelCount; p += 1) {
    if (lumas[p] <= mid) darkCount += 1;
  }
  const darkFraction = darkCount / pixelCount;
  const inkFraction = Math.min(darkFraction, 1 - darkFraction);

  // 픽셀이 적은 쪽을 글자 획으로 본다. 밝은 글자든 어두운 글자든 배경이 다수다.
  const darkIsInk = darkFraction <= 0.5;
  let inkSum = 0;
  let inkCount = 0;
  let bgSum = 0;
  for (let p = 0; p < pixelCount; p += 1) {
    if ((lumas[p] <= mid) === darkIsInk) {
      inkSum += lumas[p];
      inkCount += 1;
    } else {
      bgSum += lumas[p];
    }
  }
  const bgCount = pixelCount - inkCount;
  const inkMean = inkCount > 0 ? inkSum / inkCount : mid;
  const bgMean = bgCount > 0 ? bgSum / bgCount : mid;

  // 획 안에서의 밝기 흔들림을 전경·배경 명암차로 정규화한다. 이단(bilevel)
  // 스크린샷은 획이 균일해 대비가 낮게, 획 굵기 변화가 큰 세리프는 높게 나온다.
  let inkVarSum = 0;
  for (let p = 0; p < pixelCount; p += 1) {
    if ((lumas[p] <= mid) === darkIsInk) inkVarSum += (lumas[p] - inkMean) ** 2;
  }
  const inkStdev = inkCount > 0 ? Math.sqrt(inkVarSum / inkCount) : 0;
  const foregroundGap = Math.max(Math.abs(bgMean - inkMean), 1);

  const perCharWidth = width / Math.max(textLength, 1);
  const widthRatio = perCharWidth / Math.max(height, 1);

  return {
    weight: clamp01(inkFraction * 3.2),
    contrast: clamp01((inkStdev / foregroundGap) * 2.2),
    width: clamp01(widthRatio),
  };
}
