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
            className="flex flex-col gap-2 rounded-lg border border-border p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">
                {index + 1}. {font.family}
              </span>
              <span className="text-xs text-muted-foreground">{font.category}</span>
            </div>
            <p
              className={font.className}
              style={{ fontSize: "2rem", lineHeight: 1.2 }}
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
