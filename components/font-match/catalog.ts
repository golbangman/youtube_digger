import {
  Anton,
  Archivo_Black,
  Bebas_Neue,
  Lato,
  Merriweather,
  Montserrat,
  Open_Sans,
  Oswald,
  Pacifico,
  Playfair_Display,
  Poppins,
  Roboto,
} from "next/font/google";

import type { FontTraits } from "./ranking";

/** 입력을 비워 두면 미리보기에 쓰는 기본 문구. */
export const SAMPLE_TEXT = "Handgloves";

/** 후보 폰트 개수 상한. */
export const RESULT_LIMIT = 5;

export type CandidateFont = {
  family: string;
  category: string;
  className: string;
  traits: FontTraits;
  /** Google Fonts 지정 페이지. 무료로 내려받을 수 있다. */
  specimenUrl: string;
};

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "600"], display: "swap" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", display: "swap" });
const anton = Anton({ subsets: ["latin"], weight: "400", display: "swap" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", display: "swap" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", display: "swap" });

/**
 * 무료(Google Fonts) 후보 폰트와 대략의 시각 특징. 특징 값은 사람이 눈대중으로
 * 매긴 근사치이며, 유사도 정렬용 기준점일 뿐이다.
 */
export const CANDIDATE_FONTS: readonly CandidateFont[] = [
  {
    family: "Roboto",
    category: "산세리프",
    className: roboto.className,
    traits: { weight: 0.45, contrast: 0.15, width: 0.5 },
    specimenUrl: "https://fonts.google.com/specimen/Roboto",
  },
  {
    family: "Open Sans",
    category: "산세리프",
    className: openSans.className,
    traits: { weight: 0.45, contrast: 0.2, width: 0.52 },
    specimenUrl: "https://fonts.google.com/specimen/Open+Sans",
  },
  {
    family: "Lato",
    category: "산세리프",
    className: lato.className,
    traits: { weight: 0.42, contrast: 0.25, width: 0.5 },
    specimenUrl: "https://fonts.google.com/specimen/Lato",
  },
  {
    family: "Montserrat",
    category: "지오메트릭 산세리프",
    className: montserrat.className,
    traits: { weight: 0.5, contrast: 0.1, width: 0.62 },
    specimenUrl: "https://fonts.google.com/specimen/Montserrat",
  },
  {
    family: "Poppins",
    category: "지오메트릭 산세리프",
    className: poppins.className,
    traits: { weight: 0.48, contrast: 0.08, width: 0.6 },
    specimenUrl: "https://fonts.google.com/specimen/Poppins",
  },
  {
    family: "Oswald",
    category: "콘덴스트 산세리프",
    className: oswald.className,
    traits: { weight: 0.55, contrast: 0.2, width: 0.28 },
    specimenUrl: "https://fonts.google.com/specimen/Oswald",
  },
  {
    family: "Bebas Neue",
    category: "디스플레이",
    className: bebasNeue.className,
    traits: { weight: 0.6, contrast: 0.1, width: 0.3 },
    specimenUrl: "https://fonts.google.com/specimen/Bebas+Neue",
  },
  {
    family: "Anton",
    category: "디스플레이",
    className: anton.className,
    traits: { weight: 0.9, contrast: 0.15, width: 0.45 },
    specimenUrl: "https://fonts.google.com/specimen/Anton",
  },
  {
    family: "Archivo Black",
    category: "디스플레이",
    className: archivoBlack.className,
    traits: { weight: 0.92, contrast: 0.12, width: 0.58 },
    specimenUrl: "https://fonts.google.com/specimen/Archivo+Black",
  },
  {
    family: "Playfair Display",
    category: "세리프",
    className: playfairDisplay.className,
    traits: { weight: 0.5, contrast: 0.95, width: 0.55 },
    specimenUrl: "https://fonts.google.com/specimen/Playfair+Display",
  },
  {
    family: "Merriweather",
    category: "세리프",
    className: merriweather.className,
    traits: { weight: 0.55, contrast: 0.45, width: 0.55 },
    specimenUrl: "https://fonts.google.com/specimen/Merriweather",
  },
  {
    family: "Pacifico",
    category: "손글씨",
    className: pacifico.className,
    traits: { weight: 0.5, contrast: 0.6, width: 0.8 },
    specimenUrl: "https://fonts.google.com/specimen/Pacifico",
  },
];
