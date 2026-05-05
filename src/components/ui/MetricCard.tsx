import styles from "./MetricCard.module.css";

/* =============================================================================
 * MetricCard
 *
 * The system's data card. A big number, a mono label, and (optionally) a
 * comparison line beneath. Used in metric dashboards, hero metric blocks,
 * outcome cards. The yellow `--data` surface marks the card as a metrics
 * moment per colors.md (D1: identity = primary, data = data).
 *
 * Tokens used:
 *   - Surface: --data (background), --data-fg (text), --ink (border)
 *   - Value: --font-display, --text-display-2xl, --weight-display-heavy,
 *            --tracking-display-tightest, --leading-flat, font-feature-settings: tnum
 *   - Label: --font-mono, --text-mono-xs, --weight-mono-medium,
 *            --tracking-mono-wider, --leading-flat
 *   - Comparison: --font-mono, --text-mono-xs, --weight-mono-medium,
 *                 --tracking-mono-base, --leading-flat
 *   - Comparison "over" tint: --primary (replaces --data-fg for emphasis)
 * ========================================================================== */

export type MetricComparisonState = "over" | "neutral";

export interface MetricCardProps {
  value: string;
  label: string;
  comparison?: string;
  comparisonState?: MetricComparisonState;
}

export default function MetricCard({
  value,
  label,
  comparison,
  comparisonState = "neutral",
}: MetricCardProps) {
  const comparisonClass =
    comparisonState === "over"
      ? `${styles.comparison} ${styles.comparisonOver}`
      : `${styles.comparison} ${styles.comparisonNeutral}`;

  return (
    <article className={styles.card}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {comparison ? <p className={comparisonClass}>{comparison}</p> : null}
    </article>
  );
}
