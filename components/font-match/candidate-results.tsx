import type { CandidateFont } from "./catalog";

type Props = {
  fonts: readonly CandidateFont[];
  previewText: string;
};

export function CandidateResults({ fonts, previewText }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">비슷한 무료 폰트</h2>
      <ol className="flex flex-col gap-3">
        {fonts.map((font, index) => (
          <li
            key={font.family}
            className="flex flex-col gap-2 overflow-hidden rounded-lg border border-border p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium">
                {index + 1}. {font.family}
              </span>
              <span className="text-xs text-muted-foreground">{font.category}</span>
            </div>
            <p
              className={`${font.className} break-words`}
              style={{ fontSize: "clamp(1.25rem, 5vw, 2rem)", lineHeight: 1.2 }}
            >
              {previewText}
            </p>
            <a
              href={font.specimenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              다운로드
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
