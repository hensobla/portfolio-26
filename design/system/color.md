# Color

> **Status:** Seeded 2026-06-05 from the **Blueprint** brand kit (`design/brand-kit-blueprint.html`). Philosophy: *line-work-on-paper* — one electric-blue accent reading as emitted light against two warm-neutral grounds (warm near-black + warm cream), never cold-on-cold. Dual-mode, light-default. Vocabulary stays usage-based (Loomling defaults); the blueprint's own names (`--paper`, `--text`, `--primary`) were **not** adopted — see ADR 0026.

## Surface model

Every surface in the system is one of:

- **`--background`** — the dominant background (cream in light, ground in dark).
- **`--surface1`** — secondary surface for cards/sections. In this brand it is *lighter* than `--background` in light mode (raised cream `#FDFBF8`).
- **`--surface2` / `--surface3`** — progressively recessed surfaces (wells, headers, rules).
- **`--text1`** — primary text. **`--text2`** — de-emphasized ink (captions, helper). **`--text3`** — tertiary (timestamps, meta). **`--text4`** — disabled.
- **`--border`** / **`--border-visible`** — subtle and stronger separators (the blueprint's rule colors).

Modes (light/dark) re-map these semantic tokens to different primitives. Components never reference primitives directly.

### Accent (splits three ways)

The blueprint keeps the accent *fill* constant but swaps the accent used as *text* per mode, because saturated `#2E4BFF` fails AA at body size on cream and is borderline on near-black. So the accent is three roles, not one (ADR 0026):

- **`--accent`** — the single most-distinctive color, a **stable** vibrant fill (`#2E4BFF` in both modes). Buttons, focus rings, selected borders, graphical marks. Never used as body text.
- **`--accent-text`** — accent used as **text / links**. Mode-specific for contrast: `#1B33C7` on cream (8.2:1), `#5C78FF` on ground (4.5:1). This is what `color: …` should reference when ink needs to read as accent.
- **`--accent-fg`** — the light foreground (cream) that rides **on** an accent fill (button labels, the checked-box checkmark). Stable across modes so labels stay legible on the constant fill.
- **`--line`** — blueprint line-work (grid washes, technical rules): `#1B33C7` light / `#3A5BFF` dark.

## Interactive states

Color shifts that pair with the surface model for interactive Elements.

- **`--accent-hover`** — hover/focus tint for accent-filled buttons and links. Deepens to `#1B33C7` (accent-600) in light; *lightens* to `#8A9BFF` (accent-300) in dark, since darker-on-dark would recede.
- **`--accent-disabled`** — desaturated accent for disabled fills. Reads as inert without changing the silhouette.
- **`--accent-subtle`** — tinted accent background (badges, selected, focus rings). Light tint (`#EAEDFF`) in light; deep low-chroma tint (`#18204A`) in dark — never a light tint on dark.

Buttons reference these directly. New interactive tokens go here as the system grows.

## Surfaces (elevation)

Card-like surfaces use a small shared vocabulary so the system reads as one family.

- **`--shadow-card`** — subtle two-layer drop shadow for elevated media (hero image, blog cover). Not for buttons.

Pair shadow with `--radius-card` from `space.md` for the canonical card look.

## Palette structure

Primitives sit on numeric scales 50–950 per hue:

```
--color-{hue}-{step}    e.g. --color-blue-500
```

Each hue must include the full 50–950 range to support contrast pairing.

## Contrast rules

- Body text against its background: **WCAG AA at minimum** (4.5:1 for normal, 3:1 for large).
- Interactive states (hover/active): visible contrast change at minimum 3:1 against the rest state.
- Focus rings: 3:1 against adjacent colors.

CC checks contrast before approving a color pair. If a pair fails, CC proposes an in-system alternative before falling back to drift.

## Drift behavior

If a request introduces a color that doesn't exist as a token:

- **(A) Abide** — CC suggests the nearest token.
- **(B) Extend** — CC adds it to `src/tokens.css` under the appropriate hue/step. This file gets an entry under "Palette" below.
- **(C) Amend** — CC rewrites a rule in this file (e.g., dropping the 50–950 requirement). Appends an ADR.

## Default placeholder palette

> **Superseded 2026-06-05** by the Blueprint seed (see § Palette / § Surface map below). Kept for reference: this is the generic palette Loomling ships before a brand is imported. The blank baseline still lives at `.loomling/tokens.original.css` for the "Reset tokens" dev tool.

Loomling ships with a deliberately-generic placeholder palette before import. The intent is: neutrals + a single blue accent + minimal status colors, distinctive enough to read clearly but bland enough that the user knows it isn't their brand yet.

| Token | Hex | Role |
|---|---|---|
| `--color-neutral-50` … `--color-neutral-950` | hsl(0 0% 6–98%) | Pure grayscale ramp |
| `--color-accent-50` … `--color-accent-900` | hsl(220 65–100% 22–97%) | Placeholder brand blue |
| `--color-success-500` | hsl(140 60% 40%) | Positive states (green) |
| `--color-warning-500` | hsl(38 90% 50%)  | Caution states (amber) |
| `--color-error-500`   | hsl(0 70% 50%)   | Destructive states (red) |
| `--color-success-bg`, `-warning-bg`, `-error-bg` | derived | Tinted backgrounds for alerts/badges |

The placeholder palette is what the starter primitives (`system/primitives.md`) render against. When Tokens Import runs, the import flow replaces the primitives in place — every starter component picks up the new values automatically because they all reference semantic tokens (`var(--accent)`, `var(--background)`, etc.), never raw hex.

The 50–950 ramp scaffolding for accent + the status colors were added 2026-05-22 as part of the primitive-library work.

## Palette

Two ramps (50–950) plus carried-over status hues. Bold rows are the blueprint's exact hand-picked values; the rest are interpolated on-hue to complete the ramp.

### Warm neutral (cream → ground)

| Step | Hex | Blueprint role |
|---|---|---|
| `--color-neutral-50` | **#FDFBF8** | cream-raised |
| `--color-neutral-100` | **#F7F4EE** | cream (≈ dark ink #F4F1EA) |
| `--color-neutral-200` | **#E8E2D9** | rule-light |
| `--color-neutral-300` | **#BDB6AB** | ink-soft |
| `--color-neutral-400` | #A0968A | interpolated |
| `--color-neutral-500` | **#857D71** | ink-mute |
| `--color-neutral-600` | **#6F665B** | text-dark-mute |
| `--color-neutral-700` | **#574E44** | text-dark-soft |
| `--color-neutral-800` | **#3B3733** | rule-dark |
| `--color-neutral-900` | **#2C2925** | raised |
| `--color-neutral-950` | **#1F1C19** | ground (≈ text-dark #1C1813) |

### Electric blue accent

| Step | Hex | Blueprint role |
|---|---|---|
| `--color-accent-50` | #EAEDFF | — |
| `--color-accent-100` | #D5DBFF | — |
| `--color-accent-200` | #B3BDFF | — |
| `--color-accent-300` | #8A9BFF | accent-hover (dark) |
| `--color-accent-400` | **#5C78FF** | blue-bright → accent text (dark) |
| `--color-accent-500` | **#2E4BFF** | blue → the stable brand fill |
| `--color-accent-600` | **#1B33C7** | blue-deep → accent text (light) |
| `--color-accent-700` | #14279B | pressed fill |
| `--color-accent-800` | #0E1C72 | — |
| `--color-accent-900` | #0A1450 | — |
| `--color-accent-950` | #060D33 | — |
| `--color-accent-line` | **#3A5BFF** | ink-line → `--line` (dark) |

### Status (carried over — not brand-specified)

`--color-success-500` `hsl(140 60% 40%)` · `--color-warning-500` `hsl(38 90% 50%)` · `--color-error-500` `hsl(0 70% 50%)`, each with 50/900/-bg variants. Retune if the brand later defines status colors.

## Surface map

Semantic → primitive, per mode. Components reference only the left column.

| Semantic | Light → primitive | Dark → primitive |
|---|---|---|
| `--background` | neutral-100 (cream) | neutral-950 (ground) |
| `--surface1` | neutral-50 (cream-raised) | neutral-900 (raised) |
| `--surface2` | neutral-200 | neutral-800 (rule-dark) |
| `--surface3` | neutral-300 | neutral-700 |
| `--text1` | neutral-950 | neutral-100 (ink) |
| `--text2` | neutral-700 | neutral-300 (ink-soft) |
| `--text3` | neutral-600 | neutral-500 (ink-mute) |
| `--text4` | neutral-500 | neutral-600 |
| `--border` | neutral-200 (rule-light) | neutral-800 (rule-dark) |
| `--border-visible` | neutral-300 | neutral-700 |
| `--accent` *(stable)* | accent-500 #2E4BFF | accent-500 #2E4BFF |
| `--accent-text` | accent-600 #1B33C7 | accent-400 #5C78FF |
| `--accent-fg` | neutral-50 (cream) | neutral-50 (cream) |
| `--line` | accent-600 #1B33C7 | accent-line #3A5BFF |

### Contrast audit (WCAG AA)

| Pair | Light | Dark |
|---|---|---|
| `--text1` on `--background` | ~15:1 ✓ | ~15:1 ✓ |
| `--text2` on `--background` | 7.6:1 ✓ | 8.7:1 ✓ |
| `--text3` on `--background` | 5.3:1 ✓ | 4.2:1 (muted meta only — matches blueprint intent) |
| `--accent-text` on `--background` | 8.2:1 ✓ | 4.5:1 ✓ |
| `--accent-fg` on `--accent` fill | 5.4:1 ✓ | 5.4:1 ✓ |

`--text4` (disabled) and subtle separators are not AA-text-gated. The body/accent gate (≥4.5:1 body, ≥3:1 accent) passes in both modes.
