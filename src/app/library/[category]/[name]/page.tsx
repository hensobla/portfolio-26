"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useState, type CSSProperties } from "react";
import {
  getEntry,
  isSandboxCategory,
  type SandboxEntry,
} from "@/lib/sandbox-manifest";
import styles from "./page.module.css";

/* =============================================================================
 * Per-piece preview route — /library/[category]/[name]
 *
 * Renders one entry from the sandbox manifest with a controls panel for
 * toggling theme, state, surface, breakpoint width, and instance count
 * (per sandbox.md's required + optional preview controls).
 *
 * Per decisions.md D21, semantic CSS only. Tailwind utility classes are not
 * used here. The controls panel is a system surface; it holds itself to the
 * same bar as library pieces.
 *
 * This is a Client Component because all the controls require interactive
 * state. The manifest entries it consumes are server-or-client-safe; render()
 * functions return JSX that's mounted on the client.
 * ========================================================================== */

const SURFACES = [
  { id: "paper", label: "Paper" },
  { id: "panel", label: "Panel" },
  { id: "ink", label: "Ink" },
] as const;

type SurfaceId = (typeof SURFACES)[number]["id"];

const BREAKPOINTS = [
  { id: "fluid", label: "Fluid", width: null },
  { id: "xs", label: "XS", width: 320 },
  { id: "sm", label: "SM", width: 480 },
  { id: "md", label: "MD", width: 768 },
  { id: "lg", label: "LG", width: 1024 },
  { id: "xl", label: "XL", width: 1280 },
  { id: "2xl", label: "2XL", width: 1536 },
] as const;

type BreakpointId = (typeof BREAKPOINTS)[number]["id"];

const INSTANCE_COUNTS = [1, 2, 3] as const;
type InstanceCount = (typeof INSTANCE_COUNTS)[number];

const THEMES = [{ id: "default", label: "Default" }] as const;
type ThemeId = (typeof THEMES)[number]["id"];

export default function PiecePreviewPage({
  params,
}: {
  params: Promise<{ category: string; name: string }>;
}) {
  const { category, name } = use(params);

  if (!isSandboxCategory(category)) {
    notFound();
  }

  const entry = getEntry(category, name);
  if (!entry) {
    notFound();
  }

  return <PreviewView entry={entry} />;
}

function PreviewView({ entry }: { entry: SandboxEntry }) {
  const [theme, setTheme] = useState<ThemeId>("default");
  const [state, setState] = useState<string>("default");
  const [surface, setSurface] = useState<SurfaceId>("paper");
  const [breakpoint, setBreakpoint] = useState<BreakpointId>("fluid");
  const [count, setCount] = useState<InstanceCount>(1);

  const allStates = ["default", ...entry.states];
  const breakpointConfig = BREAKPOINTS.find((b) => b.id === breakpoint);
  const previewWidth = breakpointConfig?.width
    ? `${breakpointConfig.width}px`
    : "100%";

  const canvasStyle = {
    "--preview-width": previewWidth,
  } as CSSProperties;

  const categoryLabel = capitalize(entry.category);

  return (
    <div className={styles.page} data-theme={theme}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{entry.name}</h1>
          <span
            className={`${styles.statusPill} ${
              entry.status === "approved"
                ? styles.statusPillApproved
                : styles.statusPillDraft
            }`}
          >
            {entry.status === "approved" ? "Approved" : "Draft"}
          </span>
          <CopyUrlButton />
        </div>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/library" className={styles.breadcrumbLink}>
            Library
          </Link>
          <span className={styles.breadcrumbDivider} aria-hidden="true">
            /
          </span>
          <Link
            href="/library"
            className={`${styles.breadcrumbLink} ${styles.breadcrumbCategory}`}
          >
            {categoryLabel}
          </Link>
          <span className={styles.breadcrumbDivider} aria-hidden="true">
            /
          </span>
          <span className={styles.breadcrumbName}>{entry.name}</span>
        </nav>
      </header>

      <section className={styles.controls} aria-label="Preview controls">
        <ControlGroup label="Theme">
          <select
            className={styles.select}
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId)}
            aria-label="Theme"
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </ControlGroup>

        <ControlGroup label="State">
          <select
            className={styles.select}
            value={state}
            onChange={(e) => setState(e.target.value)}
            aria-label="State"
          >
            {allStates.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </ControlGroup>

        <ControlGroup label="Surface">
          <ButtonGroup
            value={surface}
            onChange={(v) => setSurface(v as SurfaceId)}
            options={SURFACES.map((s) => ({ id: s.id, label: s.label }))}
            ariaLabel="Surface"
          />
        </ControlGroup>

        <ControlGroup label="Breakpoint">
          <ButtonGroup
            value={breakpoint}
            onChange={(v) => setBreakpoint(v as BreakpointId)}
            options={BREAKPOINTS.map((b) => ({ id: b.id, label: b.label }))}
            ariaLabel="Breakpoint"
          />
        </ControlGroup>

        <ControlGroup label="Count">
          <ButtonGroup
            value={String(count)}
            onChange={(v) => setCount(Number(v) as InstanceCount)}
            options={INSTANCE_COUNTS.map((n) => ({
              id: String(n),
              label: String(n),
            }))}
            ariaLabel="Instance count"
          />
        </ControlGroup>
      </section>

      <section
        className={styles.canvas}
        data-surface={surface}
        aria-label="Preview canvas"
      >
        <div className={styles.canvasInner} style={canvasStyle}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className={styles.previewSlot}>
              {entry.render(state)}
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerLabel}>File</span>
        <span className={styles.footerValue}>{entry.filePath}</span>
        <span className={styles.footerLabel}>Slug</span>
        <span className={styles.footerValue}>
          {entry.category}/{entry.slug}
        </span>
        {entry.status === "draft" && (
          <>
            <span className={styles.footerLabel}>Approve</span>
            <span className={styles.footerValue}>
              Ask Claude Code: <code>approve {entry.name}</code>
            </span>
          </>
        )}
      </footer>
    </div>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.controlGroup}>
      <span className={styles.controlLabel}>{label}</span>
      {children}
    </div>
  );
}

function ButtonGroup({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { id: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className={styles.buttonGroup} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`${styles.buttonGroupItem} ${
              isActive ? styles.buttonGroupItemActive : ""
            }`}
            aria-pressed={isActive}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CopyUrlButton() {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (rare in dev). Fail silently — the user
      // can copy from the address bar if needed.
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={styles.copyButton}
      aria-label={copied ? "URL copied" : "Copy URL"}
      title={copied ? "Copied" : "Copy URL"}
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </button>
  );
}

function LinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanize(s: string): string {
  return s
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
