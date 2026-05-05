import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* =============================================================================
 * Font loading
 *
 * Three families per typography.md:
 *   - Archivo — display (headlines, hero, section titles, large numbers)
 *   - IBM Plex Sans — body (paragraphs, descriptions, ledes)
 *   - IBM Plex Mono — labels, metadata, navigation, table cells
 *
 * Each font's `variable` config writes the CSS custom property the system
 * tokens reference. globals.css does not redeclare these three variables —
 * next/font is the canonical source. fallback adjustments are computed by
 * next/font from Adobe font metrics.
 * ========================================================================== */

const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Strategic design portfolio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
