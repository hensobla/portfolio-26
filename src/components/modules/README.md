# Modules Catalog

Approved modules in this folder. Each entry below is a piece you can compose into a template via `ModuleRenderer`.

For how to build new pieces, see `system/modules.md`.
For the approval workflow, see `system/sandbox.md`.

---

## Index

| Name | Definition | File | Preview |
|---|---|---|---|
| `BasicHero` | Vignelli-blocky hero with a massive headline (primary focus) and a row of chips (secondary focus). The simplest hero shape in the system. | `./BasicHero.tsx` | `/library/modules/basic-hero` |

---

## Entries

### `BasicHero`

**Role.** The simplest hero shape in the system: a 2px-ink-bordered block on `--paper`, with a massive display-heavy headline as the primary focus and a row of mono-uppercase chips as the secondary focus. An optional eyebrow above the headline marks the section type. Named "Basic" because it has no metric cell, no context grid, no media — future hero variants (a `MetricHero`, a `MediaHero`) layer on top of this baseline.

Use this when you need the topmost block of a page to introduce the work without the visual weight of a metric or a featured image. The single-color accent moments (eyebrow + optional headline accent, both in `--primary`) keep the hero on-system without making it shouty.

**Import.**
```tsx
import BasicHero from "@/components/modules/BasicHero";
```

**Sanity type.** `basicHero` — registered in `src/sanity/schemaTypes/index.ts` and dispatched via `ModuleRenderer`. The `Page` content type's `modules` array allows `basicHero` as a member.

**Props / API.**

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `data.eyebrow` | `string` | No | — | Small uppercase mono label above the headline, rendered in `--primary`. Use sparingly — one per block. |
| `data.headline` | `string` | Yes | — | The primary focus. Display heavy uppercase. Ink color. Capped at 18ch so multi-line headlines stack visually. |
| `data.headlineAccent` | `string` | No | — | Trailing string appended after the headline, rendered in `--primary`. Use for version numbers, year tags, or a short accent phrase that should pop from the otherwise-ink headline. Max 40 chars at the schema level. |
| `data.chips` | `string[]` | No | — | Secondary focus — a handful of topic tags rendered as `Tag` (default variant). 2–6 reads best; the schema caps at 8. |

**Composes.** `Eyebrow` (when `eyebrow` is provided), `Tag` (default variant, one per chip).

**Tokens used.**

- Surface: `--paper` (background), `--ink` (border + headline text)
- Accent: `--primary` (eyebrow color, headline-accent color)
- Headline: `--font-display`, `--text-display-hero`, `--weight-display-heavy`, `--tracking-display-tightest`, `--leading-display-tight`
- Eyebrow inherits `Eyebrow`'s tokens (`--font-mono`, `--text-mono-xs`, `--weight-mono-medium`, `--tracking-mono-wide`, `--leading-flat`); the wrapper sets `color: var(--primary)`
- Chips inherit `Tag`'s default-variant tokens (`--font-mono`, `--text-mono-2xs`, `--weight-mono-bold`, `--tracking-mono-widest`, `--leading-flat`)

**Theme support.** Default theme. Surface-locked to `--paper` (the block doesn't accept a tone variant). The two `--primary` accent moments will re-color under any future theme that re-aliases `--primary`.

**Breakpoint behavior.**

- Padding scales 32 → 40 → 56 → 72 → 88 px from `xs` through `xl`.
- Gap between eyebrow / headline / chips scales 24 → 28 → 32 → 40 → 48 px across the same breakpoints.
- Headline size steps automatically via `--text-display-hero` (56 → 64 → 80 → 96 → 108 → 116 px).
- Chips wrap freely on narrow viewports.

**Approved on.** 2026-05-04.

**Notes / known limitations.**

- *Single coordinated accent.* The block uses `--primary` in two places (eyebrow + headline accent). Two accent moments per block is the ceiling — adding a third (e.g., a `winner`-variant chip) crowds the visual hierarchy. Future hero variants that need a different accent mix should be a new module, not a new prop on this one.
- *No surface variants.* This module does not support `--ink` or `--data` surfaces. A dark-inverted hero or a metric-fill hero is its own module.
- *18ch headline cap.* The `max-width: 18ch` on the headline is intentional — it forces multi-line wrapping for long titles, which gives the headline visual mass. If a project needs a one-line-only hero, that's a different module.
- *Closest-to-AA contrast.* The `--primary` on `--paper` pairing this module introduces sits at ~5.2:1 — the new closest-to-AA-floor in the system (replacing `--primary-fg` on `--primary` at 5.8:1). Documented in `colors.md` audit. Watch this if `--primary` or `--paper` shifts.
