import type { ReactNode } from "react";
import styles from "./Eyebrow.module.css";

/* =============================================================================
 * Eyebrow
 *
 * Small uppercase mono label that introduces a section or block. Used above
 * headlines, before metric labels, on cards. The system's tiniest typographic
 * voice marker.
 *
 * Tokens: --font-mono, --text-mono-xs, --weight-mono-medium,
 *         --tracking-mono-wide, --leading-flat. Inherits color via
 *         currentColor so it reads correctly on any surface.
 * ========================================================================== */

export interface EyebrowProps {
  children: ReactNode;
}

export default function Eyebrow({ children }: EyebrowProps) {
  return <span className={styles.eyebrow}>{children}</span>;
}
