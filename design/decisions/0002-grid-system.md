# 0002 — Responsive 12-column grid system

**Date:** 2026-05-20
**Status:** accepted
**Context:** As Loomling's library of modules and templates grows, every new Element risks inventing its own layout system — bespoke container widths, ad-hoc breakpoint behavior, off-scale gutters. Without a shared grid, modules visually compose poorly (their edges don't line up across a page), and any future "redesign the layout" request requires touching every module individually. The user asked for a 12-column grid that narrows at smaller breakpoints, applied uniformly across modules and templates, and customizable from a single place.

**Decision:** Add a responsive grid system to `src/tokens.css`, gated by media-query-driven custom properties. Three active tokens (`--grid-cols`, `--grid-gap`, `--grid-margin`) are consumed by modules and templates; six per-breakpoint variants of each (`--grid-cols-xs` through `--grid-cols-2xl`, etc.) are the user-facing customization surface. Defaults follow a Material-inspired narrowing: 4 columns at xs/sm, 8 at md, 12 at lg/xl/2xl.

Modules and templates use the system in one of two flavors:

- **Content layouts** (hero, footer, feature rows) — set their root inner container to `display: grid; grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr)); gap: var(--grid-gap); padding-inline: var(--grid-margin); max-width: var(--container-max); margin-inline: auto;`. Children declare per-breakpoint spans via per-module custom properties (`--hero-copy-cols: span 6`).
- **Chrome layouts** (nav bar, footer bottom row) — consume only the outer metrics (`--grid-margin`, `--container-max`, optionally `--grid-gap`) for alignment, but stay flex internally. Linear arrangements don't gain anything from column-based layout.

Components remain grid-free — they're the atoms that *populate* grid cells.

**Consequences:**

- A single source of truth for horizontal layout. Editing `--grid-cols-lg` in `src/tokens.css` reshapes every grid-driven module without further touch.
- Modules visually align across a page even when authored independently — their content sits on the same 12 (or 8 or 4) tracks.
- Per-module span declarations make each module's responsive behavior auditable at the top of its CSS file.
- Adoption is gradual: chrome modules opt in lightly (just `--grid-margin` and `--container-max`), content modules opt in fully. Existing modules without grid usage are not broken — they just lose the benefits.
- Customization is one-token-deep: changing column counts, gaps, or gutters per breakpoint reshapes the whole project. No per-module rewrite needed unless the user wants a span pattern to follow a *different* proportion under the new column count.

**Alternatives considered:**

- **Hardcoded column counts per module** — every module would declare its own grid. Customization would require touching every module. Rejected because it scales poorly.
- **Utility-class system (Tailwind-style)** — `.col-span-6` classes inside markup. Rejected: contradicts Loomling's token-only thesis; markup becomes the design system instead of CSS.
- **Bootstrap-style always-12** — same 12 columns at every breakpoint, components declare different spans per breakpoint. Considered but rejected as the default because individual columns on small phones become unusably thin (~20px). Users who want this can set every `--grid-cols-*` to `12` and the system supports it.
- **CSS subgrid for nested grids** — defer. Subgrid is useful for cards-in-grids and complex nested layouts, but browser support (especially older Safari) and the cognitive load aren't worth it for v1.
- **Container queries instead of media queries** — defer. Container queries are powerful when modules render inside variably-sized containers (e.g., a sidebar that's narrower than the main column). Loomling's modules currently render at viewport width, so media queries on the viewport are the right grain. Revisit if the project develops side-by-side module layouts.
