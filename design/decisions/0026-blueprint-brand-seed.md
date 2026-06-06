# ADR 0026 — Seed tokens from the Blueprint brand kit; keep Loomling vocabulary; split the accent three ways

**Date:** 2026-06-05
**Status:** accepted

## Context

The Fresh init (ADR 0001 / CLAUDE.md §7) shipped the generic placeholder palette. The user then supplied a hand-authored brand kit — `design/brand-kit-blueprint.html`, "Blueprint" — to seed real tokens. It is a deliberate, internally-consistent dual-mode system: one electric-blue accent (`#2E4BFF`) against two **warm** grounds (near-black `#1F1C19` + cream `#F7F4EE`), with Archivo / Hanken Grotesk / Departure Mono typography. It is authored dark-first and uses its own semantic names (`--paper`, `--surface`, `--text`, `--primary`, `--primary-text`, `--line`).

Three forces had to be reconciled:

1. **Three competing vocabularies.** The blueprint's names, Loomling's usage-based defaults (`--background` / `--text1` / `--accent`, which all ~40 component CSS files already reference), and the **parent Next app**'s names (`--paper` / `--panel` / `--ink` / `--primary`), into which `tokens.css` is hand-ported.
2. **A contrast-driven accent split.** The blueprint deliberately separates the accent *fill* (stable `#2E4BFF`) from the accent *text* (mode-specific), because `#2E4BFF` fails WCAG AA at body size on cream (and is borderline on near-black). Verified against the components: 18 referenced `color: var(--accent)` and `button-primary` put `--background` on the accent fill — both would fail AA in dark mode if `--accent` stayed a single stable value.
3. **Default mode.** Blueprint is dark-first; the parent app and Loomling's `theme.js` toggle are light-first.

## Decision

Run this as a Tokens Import (CLAUDE.md §17, `mode: paste` / `scope: replace-all` for color + typography), preserving every blueprint value exactly, with three decisions confirmed with the user:

1. **Keep Loomling's usage-based vocabulary** (user's call: *"paper isn't informative enough"*). The blueprint's `--paper`/`--text`/`--primary` names are **not** adopted; their *values* map onto `--background` / `--surface1` / `--text1` / `--accent` / etc. Because the vocabulary is unchanged, the §17 step-3.5 vocabulary migration is a no-op — no `var(--old)` → `var(--new)` rename across components.

2. **Light-default** (user's call). `:root` = cream/light; `[data-theme="dark"]` = warm near-black. Matches the parent app + Loomling's toggle out of the box; full dark support retained. The blueprint's "dark-first" authoring is treated as presentation, not a constraint.

3. **Split the accent into three usage-based roles** (extend, drift path B, §5 — accessibility-mandated):
   - `--accent` — stable vibrant **fill** `#2E4BFF` (both modes). Buttons, focus rings, selected borders, marks.
   - `--accent-text` — accent as **text/links**, mode-specific: `#1B33C7` light (8.2:1), `#5C78FF` dark (4.5:1).
   - `--accent-fg` — light cream **foreground on** accent fills (button labels, checkmark), stable.
   - plus `--line` — blueprint line-work motif (`#1B33C7` light / `#3A5BFF` dark), for future grid-wash/technical-rule modules.

   Components were migrated mechanically: `color: var(--accent)` → `var(--accent-text)` (text only, never `*-color:` borders/outlines/fills); on-accent `var(--background)` → `var(--accent-fg)` (only where it rides an accent fill — inverted surfaces toast/tooltip, the error button, and component bg fills were left alone).

Both ramps are full 50–950 (per `system/color.md`); the blueprint's 8 neutral + 3 accent hand-picked values are preserved verbatim as exact ramp steps, the rest interpolated on-hue. Typography seeds the three families and **retunes the eyebrow role** to the blueprint's pixel-mono kicker style (Departure Mono, 11px, `--text3`). Status colors are carried over from the starter (not brand-specified).

## Consequences

**Positive:**
- Every blueprint value is preserved; the brand reads exactly as designed, in both modes.
- Zero vocabulary churn — components kept their token names; the migration was values-only plus the accent-text/fg swap.
- The accent split is more robust *and* more faithful than a single mode-variant accent: 8.2:1 light accent text, 5.4:1 fills, and the vibrant `#2E4BFF` stays the constant brand fill.
- `tokens.css` stays port-clean for the parent app (fonts isolated in `fonts.css`, which the port drops in favor of `next/font`).

**Negative / costs:**
- Three new semantic roles (`--accent-text`, `--accent-fg`, `--line`) authors must now choose between — mitigated by the §Accent guidance in `color.md` (fill vs text vs on-fill).
- `--text3` on the dark ground is 4.2:1 — below body AA. Accepted: it is tertiary/muted meta only (matches the blueprint's own `.meta` usage), not body text; the body/accent gate passes.
- The eyebrow retune changes every existing eyebrow's look (now pixel-mono). Intentional and on-brand, but visible across homepage-hero / blog-article.
- The parent app currently runs a *different* brand (red/yellow); porting these tokens is a real rebrand the user performs by hand, not a drop-in.

## Alternatives considered (rejected)

- **Adopt the blueprint's vocabulary** (`--paper`/`--text`/`--primary`) verbatim — truest to the sheet, and `--paper`/`--primary` even match the parent app. Rejected by the user: usage-based names are more informative, and it would force a ~40-file rename for no functional gain.
- **Align to the parent app's vocabulary** (`--paper`/`--panel`/`--ink`) for the cleanest hand-port. Rejected for the same reason; the user ports by hand and can map names then.
- **Single mode-variant `--accent`** (Loomling's existing pattern: `#2E4BFF` light / `#5C78FF` dark, no split) — zero component migration, fully AA. Rejected by the user: contrast is borderline (4.52:1 in dark) and it drops the blueprint's stated "stable fill" principle (dark buttons would shift lighter). The split is the more robust and faithful path.
- **Dark-default** to honor the blueprint's authoring. Rejected: fights the parent app + Loomling's light-`:root`/`[data-theme="dark"]` toggle machinery and would need custom toggle wiring for no real benefit; dark support is fully present as the override.
- **Force the hand-picked palette into algorithmic 50–950 OKLCH ramps.** Rejected: would nudge the designer's exact, contrast-tuned values. Instead the exact hexes are pinned as ramp steps and only the gaps interpolated.
- **Drop status colors** (not in the brand kit). Rejected: Badge/Alert/Toast/Data Table depend on them; carried the starter values forward with a note to retune later.

## Files touched

- **Created:** `src/fonts.css` (Archivo/Hanken/Spline via Google + self-hosted Departure Mono woff2), `decisions/0026-blueprint-brand-seed.md` (this ADR).
- **Rewrote:** `src/tokens.css` (warm-neutral + blue-accent ramps, light/dark semantics, three accent roles + `--line`, typography families, eyebrow retune; spacing/grid/motion/breakpoints/image-placeholder preserved verbatim).
- **Migrated (values-only):** 11 component CSS files (`color: var(--accent)` → `--accent-text`); 6 component CSS files (on-accent `var(--background)` → `--accent-fg`); `modules/footer`, `modules/navigation` (accent text); `templates/blog-post/preview.html` (on-accent label).
- **Modified docs:** `system/color.md` (status, accent split, Palette, Surface map, contrast audit), `system/typography.md` (status, families, mono discipline, load recipe, eyebrow).
- **Unchanged:** `.loomling/tokens.original.css` (blank "Reset tokens" baseline kept); component *markup* and class names; `project.json` (`brandSource` stays null — the seed is a local file, not a URL).

## Forward links

- When the stack is declared / tokens are ported (the parent app rebrand), wire the three families through `next/font` (Departure Mono as a local font) and drop the `fonts.css` `@import` per `system/typography.md § Load recipe`. Map the Loomling vocabulary onto the parent's `--paper`/`--panel`/`--ink`/`--primary` at that time.
- If the brand later defines real status colors, retune the carried-over `--color-{success,warning,error}-*` and re-run the contrast audit.
- `:visited` links still reference `--color-accent-700` directly (a primitive) — fine on cream, dark on the ground; revisit if visited-link contrast in dark mode matters.
