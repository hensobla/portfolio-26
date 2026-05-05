# colors.md

Defines all color tokens for the system. Values here are canonical. Components reference these tokens by name. Hex values never appear inline in components.

For governance (theming, naming, adding tokens), see `tokens.md`. For the *why* behind the palette, see `decisions.md`.

---

## Architecture

The color system has two tiers.

**Primitives** are the raw palette. Each color in the system is a step in a scale that spans light to dark, from `50` through `950`. All scales follow the same step density: `50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`. Eleven steps per scale, no exceptions.

**Semantic tokens** alias specific primitive steps. They name the role a color plays in the system. Components reference semantic tokens, never primitives directly.

When you change which primitive a semantic aliases, the visual identity shifts without touching components. When you change a primitive value, every semantic that aliases it shifts.

---

## Naming

Per `tokens.md`, primitive and semantic tokens follow different naming rules.

**Primitive scales** are named by hue. The three scales: `--color-neutral-{step}`, `--color-red-{step}`, `--color-yellow-{step}`. Naming primitives by hue is correct because at this layer there is no role yet. The color *is* its appearance.

**Semantic tokens** are named by role: `--paper`, `--ink`, `--primary`, `--data`, `--muted`, etc. Components reference these. The mapping from semantic to primitive is what defines the system's visual identity.

The three primitive scales at a glance:

| Scale | Hue character | Brand anchor |
|---|---|---|
| `--color-neutral-{step}` | Warm-tinted, near-white through near-black | n/a (not a brand color) |
| `--color-red-{step}` | Deep crimson reds | step `500` |
| `--color-yellow-{step}` | Saturated mustard yellows | step `400` |

---

## Primitive scales

### `--color-neutral-{50..950}`

The neutral foundation. Spans the warmest near-white through to the deepest near-black. All page surfaces, ink, and muted variants derive from this scale.

| Step | Value |
|---|---|
| 50 | `#FFFEFA` |
| 100 | `#F5F0E8` |
| 200 | `#E5DCC8` |
| 300 | `#CFC2A6` |
| 400 | `#A89B82` |
| 500 | `#7B7160` |
| 600 | `#574F42` |
| 700 | `#3D372E` |
| 800 | `#26221C` |
| 900 | `#161310` |
| 950 | `#0D0D0D` |

### `--color-red-{50..950}`

The red scale. Anchored at step `500` on the brand red.

| Step | Value |
|---|---|
| 50 | `#FCE9EC` |
| 100 | `#F7C7CD` |
| 200 | `#EE9AA6` |
| 300 | `#E1697A` |
| 400 | `#D43A53` |
| 500 | `#C8102E` |
| 600 | `#A50C26` |
| 700 | `#82081E` |
| 800 | `#5F0617` |
| 900 | `#3D040E` |
| 950 | `#1F0207` |

### `--color-yellow-{50..950}`

The yellow scale. Anchored at step `400` on the brand yellow. The brand sits at 400 (not 500) because the canonical hue is lighter than a typical scale midpoint.

| Step | Value |
|---|---|
| 50 | `#FEF6DA` |
| 100 | `#FCEAA0` |
| 200 | `#FADC68` |
| 300 | `#F8D14C` |
| 400 | `#F4C430` |
| 500 | `#DCAB1F` |
| 600 | `#B5871A` |
| 700 | `#8E6814` |
| 800 | `#674A0E` |
| 900 | `#402E08` |
| 950 | `#211803` |

---

## Semantic tokens

Components reference these. Each aliases a specific primitive step.

| Token | Aliases | Resolved value | Group | Role |
|---|---|---|---|---|
| `--paper` | `--color-neutral-100` | `#F5F0E8` | Surface | Primary background. The page lives on this. |
| `--panel` | `--color-neutral-50` | `#FFFEFA` | Surface | Elevated/contrast surface. The fill inside bordered panels, distinct from the page itself. Also serves as primary text color on `--ink` surfaces. |
| `--ink` | `--color-neutral-950` | `#0D0D0D` | Surface | Primary text on light surfaces. Also serves as a surface for dark-themed sections. |
| `--primary` | `--color-red-500` | `#C8102E` | Identity | Hero blocks, identity surfaces, the "highlighted" call in a sequence. |
| `--primary-fg` | `--color-neutral-50` | `#FFFEFA` | Identity | Text and icons on `--primary` surfaces. |
| `--data` | `--color-yellow-400` | `#F4C430` | Data | Metrics dashboards, KPI cards, "data moments." |
| `--data-fg` | `--color-neutral-950` | `#0D0D0D` | Data | Text on `--data` surfaces. |
| `--muted` | `--color-neutral-700` | `#3D372E` | Muted text | Secondary text, labels, captions on light surfaces (`--paper`, `--panel`). |
| `--muted-inverse` | `--color-neutral-300` | `#CFC2A6` | Muted text | Secondary text, labels, captions on dark surfaces (`--ink`). |
| `--separator` | `--color-neutral-300` | `#CFC2A6` | Separator | Subtle dividers inside cards and panels on light surfaces. |
| `--separator-inverse` | `--color-neutral-700` | `#3D372E` | Separator | Subtle dividers on dark surfaces (`--ink`). |

---

## Foreground pairing

Fill tokens that hold text are paired with foreground tokens. Always use the pair.

### Light surfaces

| Fill | Primary text | Muted text |
|---|---|---|
| `--paper` | `--ink` | `--muted` |
| `--panel` | `--ink` | `--muted` |

### Dark surface

| Fill | Primary text | Muted text |
|---|---|---|
| `--ink` | `--panel` | `--muted-inverse` |

### Brand surfaces

| Fill | Primary text |
|---|---|
| `--primary` | `--primary-fg` |
| `--data` | `--data-fg` |

For brand surfaces, additional softening (e.g., a "lede" paragraph at slightly reduced contrast) is achieved by applying `opacity: 0.85` or similar to the foreground, not by introducing a new token. Brand surfaces don't get muted-fg pairs because the contrast headroom is too narrow.

Don't improvise. If you find yourself wanting an unpaired combination, revisit the surface choice, not the pairing.

---

## Accessibility & contrast

The system targets WCAG 2.1 AA as a floor for all text. Most text pairings exceed AAA. This section documents the ratios, the standards being applied, and the rules for maintaining compliance when values change.

### Standards

| Element | AA | AAA |
|---|---|---|
| Normal text (under 18pt or 14pt bold) | 4.5 : 1 | 7 : 1 |
| Large text (18pt+ or 14pt+ bold) | 3 : 1 | 4.5 : 1 |
| Essential UI components, focus indicators | 3 : 1 | n/a |
| Decorative elements | no minimum | no minimum |

### Audit: text pairings

All current text pairings meet AA. Most meet AAA.

| Pairing | Ratio | Passes |
|---|---|---|
| `--ink` on `--paper` | 17.1 : 1 | AAA |
| `--ink` on `--panel` | 19.3 : 1 | AAA |
| `--panel` on `--ink` | 19.3 : 1 | AAA |
| `--muted` on `--paper` | 10.4 : 1 | AAA |
| `--muted` on `--panel` | 11.7 : 1 | AAA |
| `--muted-inverse` on `--ink` | 11.0 : 1 | AAA |
| `--primary` on `--paper` | 5.2 : 1 | AA |
| `--primary-fg` on `--primary` | 5.8 : 1 | AA (AAA at large sizes) |
| `--data-fg` on `--data` | 11.8 : 1 | AAA |

The closest to the AA floor is now `--primary` on `--paper` at 5.2 : 1, with about 0.7 points of headroom over the 4.5 : 1 minimum. This pairing is used for the eyebrow and headline-accent text in `BasicHero` (and any future module that uses `--primary` text on `--paper` surfaces). It passes AA at all text sizes but fails AAA for normal text — fine for the small mono labels and large display headlines that use it. If `--primary` shifts toward a lighter red, this pairing is the first to watch.

The next-closest is `--primary-fg` on `--primary` at 5.8 : 1 — used for `Tag` (winner variant) and any future fill-with-text on `--primary`.

### Audit: decorative elements

Separators in this system are decorative. Content remains understandable without them. Per WCAG 2.1 SC 1.4.11, purely decorative elements have no minimum contrast.

| Pairing | Ratio | Note |
|---|---|---|
| `--separator` on `--paper` | 1.6 : 1 | Decorative, intentionally subtle |
| `--separator` on `--panel` | 1.8 : 1 | Decorative, intentionally subtle |
| `--separator-inverse` on `--ink` | 1.7 : 1 | Decorative, intentionally subtle |

If a divider becomes load-bearing — meaning the user must perceive it to navigate or comprehend the content — these tokens are wrong. Use `--ink` directly on light surfaces (17 : 1) or `--panel` directly on dark surfaces (19 : 1) for AAA-grade structural lines.

### Rules

**When modifying a primitive value:**

- Identify every semantic token that aliases the changed primitive.
- Recompute contrast for every affected text pairing, both directions.
- Use a contrast checker. Browser devtools, WebAIM Contrast Checker, and Stark all work.

**When adding a new semantic token for text use:**

- Compute the contrast ratio against the intended surface.
- If the ratio is under 4.5 : 1, restrict the token to large-text contexts only and document that restriction in the token's row.
- If the ratio is under 3 : 1, the token must not be used for text. Use it for decorative or non-essential UI only.

**When adding a new theme:**

- Role-based naming means components don't change, but primitive values do.
- Re-run the entire text-pairing audit before shipping the theme.
- Update the audit table in this section with the new theme's ratios.

**When in doubt:** use `--ink` on light surfaces or `--panel` on dark surfaces. Both produce AAA contrast against every surface they pair with.

---

## Color rules

- `--primary` and `--data` carry semantic meaning. Don't decorate with them. Identity = primary. Data = data.
- Pure black (`#000`) and pure white (`#FFF`) are not used. The system's near-black (`neutral-950`) and near-white (`neutral-50`) are off-versions intentionally. The system feels printed.
- The semantic palette is closed. Adding a new color requires a new role, not just a new value or scale step.
- **Components reference semantics, not primitives.** A component using `var(--color-red-500)` directly is a bug. Use `var(--primary)`.

### When no existing semantic fits

If you're building a component and none of the existing semantics maps to the role you need, stop. Don't reach for a primitive directly, don't pick "the closest one and call it good," and don't inline a hex value.

Three options, in order of preference:

1. **Reconsider the design choice.** Most of the time, the role you're reaching for already exists under a different name. A grey background you want for a "subtle card" is probably `--panel`. A medium-contrast text you want for a "tertiary label" is probably `--muted`. Check the semantic table first.

2. **Add a new semantic token.** If the role is genuinely new (e.g., a "warning" surface, a "highlight" background that isn't `--primary` or `--data`), follow the *Adding a new semantic token* checklist below. Update this file in the same change. The new token must be defended in writing: what role does it play, why don't existing tokens cover it, what surface does it pair with.

3. **Flag the gap and stop.** If you can't justify a new semantic but the existing ones don't fit, the design itself may be inconsistent with the system. Surface the conflict for review rather than papering over it with a one-off value. This is an editorial check on whether the new design belongs in this system at all.

Each path produces a system that holds together. Bypassing produces drift.

---

## Anti-patterns

- A button or CTA in `--data`. That's metrics-only.
- Body copy in `--primary`. Identity is for moments, not paragraphs.
- Hex values inline in components. Reference tokens.
- Components referencing primitives directly (`--color-red-500`) instead of semantics (`--primary`).
- A new color variable when an existing one fits. Resist.
- `--paper` and `--panel` used interchangeably. They're not synonyms. Paper is the page; panel is the surface inside borders.

---

## Adding to the system

### Adding a new primitive scale

Rare. The bar is high per `tokens.md`. If genuinely needed (e.g., a green for success states):

1. Define an 11-step scale (`50` through `950`). All scales follow this structure.
2. Name by hue: `--color-{hue}-{step}`. Examples: `--color-green-500`, `--color-blue-300`.
3. Anchor the brand value at the step that matches its lightness.
4. Add semantic tokens that alias the steps you actually use. Most scales only need 2 to 4 steps mapped.

### Adding a new semantic token

1. Confirm it has a clear role and isn't covered by an existing semantic.
2. Alias an existing primitive step.
3. If it's a fill that holds text, define its `-fg` partner.
4. Verify contrast against the intended surface per the Accessibility section.
5. Add it to the semantic table in this file.

---

## Theming notes

Future themes override semantic and primitive tokens under a `data-theme` selector. The role names stay the same.

- **Should change between themes**: hex values within scales, the warmth/coolness of the palette, the saturation of brand scales, which primitive step a semantic aliases.
- **Shouldn't change**: the three-scale structure, the `50` through `950` step density, the semantic role count, the foreground-pairing rule.

A "monochrome" theme, for example, would set `--color-red-*` and `--color-yellow-*` to greyscale values. The roles `--primary` and `--data` would still exist; the visual identity would shift.

---

## Reference: full color block

Copy into `globals.css` (or wherever your token layer lives).

```css
:root {
  /* Primitives — neutral */
  --color-neutral-50: #FFFEFA;
  --color-neutral-100: #F5F0E8;
  --color-neutral-200: #E5DCC8;
  --color-neutral-300: #CFC2A6;
  --color-neutral-400: #A89B82;
  --color-neutral-500: #7B7160;
  --color-neutral-600: #574F42;
  --color-neutral-700: #3D372E;
  --color-neutral-800: #26221C;
  --color-neutral-900: #161310;
  --color-neutral-950: #0D0D0D;

  /* Primitives — red */
  --color-red-50: #FCE9EC;
  --color-red-100: #F7C7CD;
  --color-red-200: #EE9AA6;
  --color-red-300: #E1697A;
  --color-red-400: #D43A53;
  --color-red-500: #C8102E;
  --color-red-600: #A50C26;
  --color-red-700: #82081E;
  --color-red-800: #5F0617;
  --color-red-900: #3D040E;
  --color-red-950: #1F0207;

  /* Primitives — yellow */
  --color-yellow-50: #FEF6DA;
  --color-yellow-100: #FCEAA0;
  --color-yellow-200: #FADC68;
  --color-yellow-300: #F8D14C;
  --color-yellow-400: #F4C430;
  --color-yellow-500: #DCAB1F;
  --color-yellow-600: #B5871A;
  --color-yellow-700: #8E6814;
  --color-yellow-800: #674A0E;
  --color-yellow-900: #402E08;
  --color-yellow-950: #211803;

  /* Semantic — surface */
  --paper: var(--color-neutral-100);
  --panel: var(--color-neutral-50);
  --ink: var(--color-neutral-950);

  /* Semantic — identity */
  --primary: var(--color-red-500);
  --primary-fg: var(--color-neutral-50);

  /* Semantic — data */
  --data: var(--color-yellow-400);
  --data-fg: var(--color-neutral-950);

  /* Semantic — muted text */
  --muted: var(--color-neutral-700);
  --muted-inverse: var(--color-neutral-300);

  /* Semantic — separators */
  --separator: var(--color-neutral-300);
  --separator-inverse: var(--color-neutral-700);
}
```
