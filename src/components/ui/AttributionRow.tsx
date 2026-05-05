import styles from "./AttributionRow.module.css";

/* =============================================================================
 * AttributionRow
 *
 * One row in a cross-functional attribution table: a function (the team or
 * discipline), the people on it, and what they did. Three columns on md+,
 * stacked on mobile.
 *
 * This is one row. Multiple rows compose into a CrossFunctionalTable module
 * (built later in /src/components/modules/). The row is the reusable unit.
 *
 * Tokens used:
 *   - Function:  --font-display, --text-display-xs, --weight-display-bold,
 *                --tracking-display-snug, --leading-display
 *   - Who:       --font-mono, --text-mono-base, --weight-mono-medium,
 *                --tracking-mono-snug, --leading-mono
 *   - What:      --font-body, --text-body-xs, --weight-body-regular,
 *                --tracking-body, --leading-body
 *   - Borders:   --separator (column dividers + row bottom)
 *
 * Note: the prop is named `function_` because `function` is a reserved word.
 * ========================================================================== */

export interface AttributionRowProps {
  function_: string;
  who: string;
  what: string;
}

export default function AttributionRow({
  function_,
  who,
  what,
}: AttributionRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.functionCell}>{function_}</div>
      <div className={styles.whoCell}>{who}</div>
      <div className={styles.whatCell}>{what}</div>
    </div>
  );
}
