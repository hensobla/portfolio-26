import Eyebrow from "@/components/ui/Eyebrow";
import Tag from "@/components/ui/Tag";
import styles from "./BasicHero.module.css";

/* =============================================================================
 * BasicHero
 *
 * Vignelli-blocky hero: 2px ink border, paper surface, massive display-heavy
 * headline as the primary focus, optional eyebrow above, optional row of
 * chips below as the secondary focus. Hard edges, no radius, no shadow. The
 * block owns its outer padding per modules.md rule 2 (self-contained).
 *
 * Color: a single accent color (--primary) appears in two coordinated places
 * — the eyebrow label, and an optional trailing accent on the headline (e.g.
 * a version number). One accent color, repeated for discipline.
 *
 * Named "BasicHero" because it's the simplest hero shape in the system —
 * no metric cell, no context grid, no media. Future hero variants
 * (MetricHero, MediaHero, etc.) layer on top of this baseline.
 *
 * Composes:
 *   - Eyebrow (small mono label, wrapper tinted --primary)
 *   - Tag (default variant) for each chip
 *
 * Tokens used:
 *   - Surface: --paper, --ink (border + text)
 *   - Accent: --primary (eyebrow + headline accent span)
 *   - Headline: --font-display, --text-display-hero, --weight-display-heavy,
 *               --tracking-display-tightest, --leading-display-tight
 *   - Chips: Tag (default variant) tokens
 * ========================================================================== */

export interface BasicHeroData {
  _type?: "basicHero";
  _key?: string;
  eyebrow?: string;
  headline: string;
  /**
   * Optional trailing string appended after the headline, rendered in
   * --primary. Useful for version numbers, year tags, or a short accent
   * phrase that should pop from the otherwise-ink headline.
   */
  headlineAccent?: string;
  chips?: string[];
}

export interface BasicHeroProps {
  data: BasicHeroData;
}

export default function BasicHero({ data }: BasicHeroProps) {
  const { eyebrow, headline, headlineAccent, chips } = data;
  const hasChips = chips && chips.length > 0;

  return (
    <section className={styles.block}>
      {eyebrow ? (
        <div className={styles.eyebrowRow}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      ) : null}
      <h1 className={styles.headline}>
        {headline}
        {headlineAccent ? (
          <>
            {" "}
            <span className={styles.headlineAccent}>{headlineAccent}</span>
          </>
        ) : null}
      </h1>
      {hasChips ? (
        <ul className={styles.chips} aria-label="Topic tags">
          {chips.map((chip, i) => (
            <li key={`${chip}-${i}`} className={styles.chipItem}>
              <Tag variant="default">{chip}</Tag>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
