# Space, grid, breakpoints

## Spacing scale

A single stepped scale powers gaps, padding, and margin. No off-scale values.

| Token | Default |
|---|---|
| `--space-0` | 0 |
| `--space-1` | 0.25rem |
| `--space-2` | 0.5rem |
| `--space-3` | 0.75rem |
| `--space-4` | 1rem |
| `--space-5` | 1.5rem |
| `--space-6` | 2rem |
| `--space-7` | 3rem |
| `--space-8` | 4rem |
| `--space-9` | 6rem |
| `--space-10` | 8rem |

## Grid

- **Columns:** 12 by default. Pages may opt into asymmetric grids per template.
- **Gutter:** `--space-5` (1.5rem) at the default breakpoint; scales down at narrower viewports.
- **Container:** capped at `--container-max` (default `80rem`).

## Breakpoints

Named, mobile-first. Components and modules declare which breakpoints they care about; templates apply the full set.

| Name | Min width | Use |
|---|---|---|
| `--bp-xs` | 320px | Smallest supported |
| `--bp-sm` | 480px | Large phones |
| `--bp-md` | 768px | Tablets |
| `--bp-lg` | 1024px | Small laptops |
| `--bp-xl` | 1280px | Standard desktop |
| `--bp-2xl` | 1536px | Wide desktop |

## Radius

Corner rounding tokens — used by Elements that need a defined shape. Like spacing, off-scale values are forbidden in component CSS.

| Token | Default | Use |
|---|---|---|
| `--radius-button` | 0.5rem | Buttons and other tappable controls. |
| `--radius-card` | 0.75rem | Cards, hero images, blog covers — anything that reads as a surface block. |

## Grid

A responsive 12-column grid governs the horizontal rhythm of every module and template. Components don't use the grid — they're the atoms that *populate* grid cells. Modules and templates lay out their content inside grid containers that consume three active tokens (`--grid-cols`, `--grid-gap`, `--grid-margin`); those active tokens are re-mapped per breakpoint in `src/tokens.css`.

### Anatomy

A grid container is the canonical wrapper for any content-bearing module or template:

```css
[data-loom-module="x"] .x__inner {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
  gap: var(--grid-gap);
  padding-inline: var(--grid-margin);
  max-width: var(--container-max);
  margin-inline: auto;
}
```

This is the *only* place the active grid tokens appear. The four moving parts:

- **`--grid-cols`** — number of columns at the current breakpoint.
- **`--grid-gap`** — gap between columns. Scales up with viewport.
- **`--grid-margin`** — outer padding inside the container (the "gutter").
- **`--container-max`** — overall ceiling (default `80rem`). The grid lives inside this.

### Children declare their span

Each child of a grid container declares which columns it occupies. The convention is per-module CSS custom properties so the assignments are visible at the top of the file:

```css
[data-loom-module="x"] {
  --x-foo-cols: 1 / -1;        /* default: full width on mobile */
}
@media (min-width: 1024px) {
  [data-loom-module="x"] { --x-foo-cols: span 6; }   /* half width on desktop */
}
[data-loom-module="x"] .x__foo { grid-column: var(--x-foo-cols); }
```

`1 / -1` means "from line 1 to the last line" — i.e., span all columns regardless of the current column count. This is the right default for mobile-first stacking.

### Per-breakpoint defaults (Material-inspired)

| Breakpoint | Min width | Columns | Gap | Margin |
|---|---|---|---|---|
| `xs` | 0px | 4 | `--space-3` | `--space-4` |
| `sm` | 480px | 4 | `--space-3` | `--space-5` |
| `md` | 768px | 8 | `--space-4` | `--space-6` |
| `lg` | 1024px | 12 | `--space-5` | `--space-7` |
| `xl` | 1280px | 12 | `--space-5` | `--space-7` |
| `2xl` | 1536px | 12 | `--space-5` | `--space-7` |

Mobile gets fewer, wider columns; desktop gets the full 12. The narrowing keeps individual columns from collapsing into unusably thin strips on phones.

### Customization

The defaults are tokens. To change the system project-wide:

1. Open `src/tokens.css` and edit any of `--grid-cols-{xs..2xl}`, `--grid-gap-{xs..2xl}`, `--grid-margin-{xs..2xl}`.
2. Save. Every module and template that uses the grid re-flows automatically — the active vars (`--grid-cols`, etc.) re-resolve through the media-query map at the bottom of `tokens.css`.

Common customizations:

- **More columns at desktop** — set `--grid-cols-lg: 16`. Modules with `grid-column: span 6` now occupy 6 of 16 instead of 6 of 12; they'll still look right, just narrower. Adjust per-element spans if you want them to stay the same proportion.
- **Tighter gutters** — drop `--grid-margin-lg` to `--space-5`. The whole site loses 2rem of side padding at desktop.
- **Disable column narrowing** — set every `--grid-cols-*` to `12`. Bootstrap-style behavior; small phones get tighter columns.
- **Add a new column count for a new breakpoint** — adding a 3xl breakpoint requires three additions: a `--bp-3xl` value, a `--grid-cols-3xl` (and gap/margin) token, and a new `@media (min-width: <px>)` block that re-points the active vars.

### Chrome modules vs content modules

Not every module needs grid columns. Nav and footer bars are "chrome" — they're linear arrangements of brand, links, and actions. They consume the grid's outer metrics (`--grid-margin`, `--container-max`) for consistent edge alignment with content modules, but their internal layout stays flex. Content modules (heroes, feature rows, blog articles) use the full grid for column-based layouts.

The pattern is documented per category in `system/modules.md` and `system/templates.md`.

## Rules

- Padding and gap use spacing tokens. Custom px values are forbidden outside `tokens.css`.
- Components should be breakpoint-agnostic where possible — let parent containers control width, and let modules / templates set the responsive behavior.
- Templates own page-level layout, including grid container widths.

## Drift behavior

- Off-scale value requested → propose the nearest step. If unacceptable, extend the scale (renumbering is forbidden; new values must fit the existing order).
- New breakpoint → requires an ADR.
