# ADR 0030 — Container-query panel grid (follow `space.md` by panel width)

**Date:** 2026-06-07
**Status:** accepted

## Context

The Blueprint homepage's open folder shows one case-study **panel** per project
(`home`, still `status: draft`). Each panel carries a grid of "shot" tiles. The folder,
once expanded, is pinned out of the layout grid and **re-fits to the viewport on resize**
(this session) — so the panel can be a wide desktop band *or* a narrow column, and it
**changes width live**, independent of any fixed relationship to the viewport.

`system/space.md` defines the project grid as **4 / 8 / 12 columns** at the
`xs/sm → md → lg+` breakpoints (480 / 768 / 1024), with the active `--grid-cols` /
`--grid-gap` re-mapped per breakpoint by `@media` blocks on `:root` in `src/tokens.css`.
Those media queries key off the **viewport**. The first pass at the shot grid hard-coded
`repeat(2, …)` with a single `@media (max-width: 680px)` collapse to one column — a
viewport query standing in for the panel width.

The user asked for the grid to be "more dynamic with the number of columns… follow the
number of columns specified by `space.md`… treat the panel's width just like the regular
breakpoints." That last clause is the crux: the breakpoints must trigger on the **panel's**
own inline size, not the viewport's.

## Decision

1. **`.home__panels` becomes a query container:** `container: panel / inline-size`.

2. **The shot grid maps `space.md`'s column counts through `@container`**, reusing the
   *same system tokens and the same breakpoint thresholds*:
   ```css
   .home__panel-grid {
     --panel-cols: var(--grid-cols-xs);  /* 4 */
     --panel-gap:  var(--grid-gap-xs);
     --shot-span:  4;
     grid-template-columns: repeat(var(--panel-cols), minmax(0, 1fr));
     gap: var(--panel-gap);
   }
   .home__shot { grid-column: span var(--shot-span); }
   @container panel (min-width: 768px)  { … --panel-cols: var(--grid-cols-md); --shot-span: 4; } /* 8-col → 2-up */
   @container panel (min-width: 1024px) { … --panel-cols: var(--grid-cols-lg); --shot-span: 3; } /* 12-col → 4-up */
   ```
   The grid exposes the system's real column tracks (4/8/12); each tile **spans** a share
   of them so the four shots tile cleanly with no orphans at every breakpoint:
   **1-up → 2-up → 4-up** as the panel widens.

3. **The panel's own narrow-width adjustments** (compact padding, stepped-down title) moved
   from the viewport `@media (max-width: 680px)` to `@container panel (max-width: 767px)`, so
   everything in the panel keys off the folder's width consistently.

## Consequences

**Positive:**
- The panel responds to the **folder's** width, which is correct: it stays right as the
  expanded folder is resized, and would be right even if the folder were ever narrower than
  the viewport (split layouts, side-by-side).
- It **literally follows `space.md`** — it reads `--grid-cols-*` / `--grid-gap-*`, so editing
  the system grid tokens reshapes the panel grid too, same as every module/template.
- Establishes a reusable pattern: **any element whose width is decoupled from the viewport
  (overlays, drawers, the open folder) should drive its responsive layout from `@container`
  at the `space.md` breakpoints, not `@media`.**

**Negative / costs:**
- Requires CSS container queries (browser baseline since 2023). Fine for the Loom preview
  and the Next port; would need a fallback only for very old browsers (not a target).
- `container-type: inline-size` adds size containment on `.home__panels`; its width comes
  from `inset: 0`, so containment is safe here, but it's a constraint to remember if that
  element's sizing ever changes.

## Alternatives considered (rejected)

- **Keep the viewport `@media`.** Wrong abstraction: the open folder ≠ the viewport (it's
  inset by page padding and resizes), so a viewport query mis-predicts the panel width. It
  only *happened* to look right because the open folder ≈ viewport-wide.
- **`repeat(auto-fit, minmax(min(220px,100%), 1fr))`.** Self-collapsing, but can't honor
  `space.md`'s *specific* counts — on a wide desktop folder it would make 4 tiny columns
  (or N, uncapped), not the system's 12-track / 4-up. Doesn't "follow space.md."
- **JS width measurement + class toggle.** We already added a resize handler for the folder,
  so a JS path existed — but CSS `@container` is declarative, has no reflow cost, and needs
  no wiring. Reserved JS for the folder *geometry* re-fit, not the content grid.

## Files touched

- **Modified:** `design/src/templates/home/home.css` — `.home__panels` container; the
  `@container` column map on `.home__panel-grid`; `.home__shot { grid-column: span … }`;
  moved the narrow-panel padding/title to `@container`.
- **Created:** this ADR.

## Forward links

- When `home` ports to the Next app (ADR 0027), this stays as plain CSS (container queries
  are framework-agnostic) — no React grid library needed.
- If the desktop ceiling of **4-up** feels too dense once shots are real screenshots, change
  the `lg+` `--shot-span` to `6` (→ 2-up) — one token, no structural change.
- The "drive layout from `@container` at `space.md` breakpoints" pattern should be the
  default for any future overlay/drawer content; consider noting it in `system/space.md`
  if a second consumer appears.
