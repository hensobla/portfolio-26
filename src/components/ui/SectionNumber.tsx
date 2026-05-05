import styles from "./SectionNumber.module.css";

/* =============================================================================
 * SectionNumber
 *
 * The mono numeral that precedes a section title (01, 02, 03…). Sized at
 * mono-lg with bold weight and base tracking; matches typography.md's
 * `--type-section-num` composition. Color signals which surface it sits on:
 * `default` uses --primary (red) on light surfaces, `inverse` uses --data
 * (yellow) for use on dark/ink surfaces.
 *
 * Tokens: --font-mono, --text-mono-lg, --weight-mono-bold, --tracking-mono-base,
 *         --leading-flat, --primary (default), --data (inverse).
 * ========================================================================== */

export type SectionNumberTone = "default" | "inverse";

export interface SectionNumberProps {
  number: string;
  tone?: SectionNumberTone;
}

export default function SectionNumber({
  number,
  tone = "default",
}: SectionNumberProps) {
  const className =
    tone === "inverse"
      ? `${styles.sectionNumber} ${styles.toneInverse}`
      : `${styles.sectionNumber} ${styles.toneDefault}`;

  return (
    <span className={className} aria-hidden="false">
      {number}
    </span>
  );
}
