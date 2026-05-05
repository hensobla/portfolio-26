import type { ReactNode } from "react";
import styles from "./Tag.module.css";

/* =============================================================================
 * Tag
 *
 * Small bordered label. Used for variant markers (Winner / Baseline), road
 * status (Killed / Tabled), and any inline categorical signal that needs
 * mono uppercase emphasis without the gravity of a SectionNumber.
 *
 * Variants:
 *   - default: outlined in currentColor, transparent fill. Adapts to surface.
 *   - winner:  --primary fill, --primary-fg text. Identity / celebratory.
 *   - killed:  --ink fill, --panel text. Strong negative marker.
 *   - tabled:  --panel fill, --ink text, separator border. Soft "deferred".
 *
 * Tokens: --font-mono, --text-mono-2xs, --weight-mono-bold, --tracking-mono-widest,
 *         --leading-flat, plus surface tokens per variant.
 * ========================================================================== */

export type TagVariant = "default" | "winner" | "killed" | "tabled";

export interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
}

const variantClass: Record<TagVariant, string> = {
  default: "variantDefault",
  winner: "variantWinner",
  killed: "variantKilled",
  tabled: "variantTabled",
};

export default function Tag({ children, variant = "default" }: TagProps) {
  const className = `${styles.tag} ${styles[variantClass[variant]]}`;
  return <span className={className}>{children}</span>;
}
