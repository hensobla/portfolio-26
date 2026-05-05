# typography.md

Defines all type tokens for the system: font families, the size ramp, weights, tracking, line-heights, and the rules for combining them. Components reference these tokens. Raw `font-size`, `font-weight`, `letter-spacing`, or `line-height` values never appear inline.

For governance (theming, naming, adding tokens), see `tokens.md`. For the *why* behind the type choices, see `decisions.md`.

---

## Architecture

Type in this system has three families, each with a defined role: **display**, **body**, **mono**. The triad is closed by default. Adding a fourth requires a documented reason in `decisions.md`.

Each family has its own size ramp, weight set, and tracking conventions, because the families are doing different jobs:

- **Display** sets headlines, hero text, metrics, section titles. Sized large, weighted heavy, tracked tight, all-caps in most uses.
- **Body** sets paragraphs, leads, descriptions, anything readable in flow. Sized comfortably, weighted normal, tracked at zero.
- **Mono** sets labels, metadata, navigation, table cells, micro-copy. Sized small, weighted medium-to-bold, tracked wide, often uppercase.

Components don't mix family conventions. A "label that looks like a heading" or a "headline that looks like a paragraph" is a smell.

---

## Font families

Three primitive tokens, one per family.

| Token | Stack | Role |
|---|---|---|
| `--font-display` | `'Archivo', sans-serif` | Display: headlines, hero, section titles, large numbers. Geometric sans built for impact. |
| `--font-body` | `'IBM Plex Sans', sans-serif` | Body: all paragraph copy, descriptions, leads. |
| `--font-mono` | `'IBM Plex Mono', monospace` | Mono: labels, metadata, navigation, table cells, micro-copy. Signals "data" and "process." |

### Loading

Fonts are loaded from Google Fonts in the document head with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`.

- `Archivo`: weights `500, 700, 800` (and `900` if needed)
- `IBM Plex Sans`: weights `400, 500, 600, 700`
- `IBM Plex Mono`: weights `400, 500, 600, 700`

Self-hosting is preferable for production performance, but Google Fonts is acceptable while iterating.

### Family rules

- The triad is closed. Don't introduce a fourth family without justification in `decisions.md`.
- Mono is not decorative. It marks labels, metadata, and "process" content (test parameters, file IDs, timestamps). If a piece of mono copy could read fine in body, demote it to body.
- Display is for moments. If everything is display, nothing is.

---

## Size ramp

The system uses three separate size ramps, one per family. Sizes are tokenized so components reference roles, not values.

**Display sizes are breakpoint-responsive.** Type at headline scale benefits from snapping cleanly to canonical breakpoints rather than interpolating across them. Display tokens come in two forms:

- *Stepped* (the largest 8 display sizes) — discrete values at each breakpoint, defined inside media queries. These are the sizes most visible at viewport-edge alignment, where smooth interpolation produces awkward intermediate states.
- *Fluid* (the smallest 4 display sizes) — single `clamp()` value, viewport-interpolated. At these sizes the interpolation reads as natural rather than awkward, and the maintenance overhead of stepped values isn't worth it.

**Body and mono sizes are fixed.** They don't respond to breakpoints. Resizing body or label copy by breakpoint hurts readability more than it helps — at body sizes, even a 1px shift is jarring, and mono labels rely on consistent rhythm across the page. If a component needs body copy to feel different on mobile, that's a per-component decision (e.g., changing line-height or column width), not a token-level change.

Breakpoints referenced below are defined in `grid.md`.

### Display sizes — stepped (breakpoint-responsive)

These eight tokens take different values per breakpoint. The values listed are what the token resolves to at each breakpoint.

| Token | xs | sm | md | lg | xl | 2xl | Used for |
|---|---|---|---|---|---|---|---|
| `--text-display-hero` | 56px | 64px | 80px | 96px | 108px | 116px | Project name (hero h1). The largest type in the system. |
| `--text-display-metric` | 64px | 72px | 84px | 96px | 104px | 110px | Hero metric numbers (`+18%`). |
| `--text-display-2xl` | 48px | 52px | 60px | 64px | 68px | 72px | Inline metric numbers (metrics dashboard cards). |
| `--text-display-xl` | 32px | 36px | 44px | 48px | 52px | 56px | Section titles (h2), metrics-head h3, roads-head h3. |
| `--text-display-lg` | 30px | 32px | 38px | 42px | 44px | 48px | Pull-quote blockquote (next blockquote). |
| `--text-display-md` | 26px | 28px | 32px | 36px | 38px | 40px | Sub-section titles (ai-head h3). |
| `--text-display-sm` | 26px | 28px | 30px | 32px | 34px | 36px | Outcome `.when` badges. |
| `--text-display-xs` | 22px | 22px | 24px | 26px | 28px | 30px | Hero-role h2. |

**How to define them in CSS.** Each stepped token gets a default value (xs) and is reassigned at each subsequent breakpoint inside media queries. This is verbose but explicit. Pattern:

```css
:root {
  --text-display-hero: 56px;
}

@media (min-width: 480px) {
  :root { --text-display-hero: 64px; }
}

@media (min-width: 768px) {
  :root { --text-display-hero: 80px; }
}

@media (min-width: 1024px) {
  :root { --text-display-hero: 96px; }
}

@media (min-width: 1280px) {
  :root { --text-display-hero: 108px; }
}

@media (min-width: 1536px) {
  :root { --text-display-hero: 116px; }
}
```

The media query values must come from `grid.md`'s breakpoint tokens (`--bp-sm`, `--bp-md`, etc.) via your build pipeline. See `grid.md` *Using breakpoints in CSS*.

### Display sizes — fluid

These four tokens use `clamp()` and interpolate smoothly with viewport width. They do not snap to breakpoints.

`clamp(min, preferred, max)` resolves to the preferred value (here, viewport-width-relative), but never below the min or above the max.

| Token | Value | Used for |
|---|---|---|
| `--text-display-2xs` | `26px` | Outcome value numbers. Fixed (used inside cards where viewport scaling would feel disconnected). |
| `--text-display-quote` | `clamp(20px, 1.7vw, 22px)` | Reframe text, hypothesis text, road h4 (large pull quotes within sections). |
| `--text-display-lede` | `clamp(18px, 1.5vw, 24px)` | Section lede paragraphs (the big readable intro). |
| `--text-display-lede-sm` | `clamp(15px, 1.2vw, 19px)` | Hero lede paragraph. |

`--text-display-2xs` is intentionally fixed despite living in this group. It's used inside cards where the surrounding container drives proportions, not the viewport.

### Body sizes (fixed, not breakpoint-responsive)

| Token | Value | Used for |
|---|---|---|
| `--text-body-lg` | `17px` | Default body copy. The reading size for prose. |
| `--text-body-md` | `16px` | Slightly compressed body (next-section paragraphs). |
| `--text-body-sm` | `15px` | Variant descriptions, ai-narrative, surprise callouts. |
| `--text-body-xs` | `14px` | Caption-grade body (variant `.v-desc`, road `p`, outcome `.desc`, footer meta). |
| `--text-body-2xs` | `13px` | The smallest body grade. Context value (ctx-val), inline code. |

### Mono sizes (fixed, not breakpoint-responsive)

| Token | Value | Used for |
|---|---|---|
| `--text-mono-lg` | `14px` | Section number badges (the large mono numerals). |
| `--text-mono-md` | `13px` | Variant result values. |
| `--text-mono-base` | `12px` | Mono table cells, definition lists, mid-density mono. |
| `--text-mono-sm` | `11px` | Top nav, role metadata, hero context labels, footer-nav labels. |
| `--text-mono-xs` | `10px` | Most labels (`.label`, `.lab`, metric labels, road numbers). The default label size. |
| `--text-mono-2xs` | `9px` | Smallest labels (variant tags, killed badges, hero context labels). |

---

## Weights

Weights are tokenized by role, not by numeric value. A component that needs a "display heavy" weight references `--weight-display-heavy`, not `800`. This lets the weight ramp shift if the typeface changes.

| Token | Value | Used for |
|---|---|---|
| `--weight-display-heavy` | `800` | Hero h1, metric numbers, section titles, all primary display headlines. |
| `--weight-display-bold` | `700` | Hero-role h2, road h4, footer titles, variant labels. The "secondary display" weight. |
| `--weight-display-medium` | `500` | Display ledes, hypothesis text, reframe text. The "soft display" weight used for large readable type. |
| `--weight-mono-bold` | `600` | Section number badges, footer-nav labels, killed-badge text, emphasized mono. |
| `--weight-mono-medium` | `500` | Default mono labels. The standard label weight. |
| `--weight-body-bold` | `700` | Bold inline emphasis in body copy. |
| `--weight-body-medium` | `500` | Medium-emphasis body (e.g., a label inside a paragraph). |
| `--weight-body-regular` | `400` | Default body copy. |

### Weight rules

- Display copy uses `--weight-display-heavy` by default. Drop to `bold` or `medium` only when the role calls for it (sub-headlines, ledes).
- Mono labels default to `--weight-mono-medium`. Bump to `bold` only for emphasis (section numbers, killed badges).
- Body copy defaults to `--weight-body-regular`. Bold and medium are inline emphasis only, not headline weight.
- Don't reach for raw numeric weights. If a component needs a weight not in this table, the addition is a real design decision and follows the *Adding a new weight* procedure below.

---

## Tracking (letter-spacing)

Tracking is tokenized by typographic intent, not by value. The pattern: tighter as type gets larger, wider as type gets smaller, zero in body.

| Token | Value | Used for |
|---|---|---|
| `--tracking-display-tightest` | `-0.04em` | Largest display (hero h1, metric-num). |
| `--tracking-display-tight` | `-0.025em` | Medium display (section-title, h2 sub-headlines). |
| `--tracking-display-snug` | `-0.01em` | Smaller display (display-quote, road h4, outcome val). |
| `--tracking-display-flat` | `-0.005em` | Display ledes (very subtle). |
| `--tracking-body` | `0` | Body copy. Body always tracks at zero. |
| `--tracking-mono-snug` | `0.04em` | Tightest mono (rarely used). |
| `--tracking-mono-base` | `0.06em` | Section numbers, footer-nav labels. |
| `--tracking-mono-wide` | `0.1em` | Standard mono labels (`.label`, `.lab`). |
| `--tracking-mono-wider` | `0.14em` | Smaller mono labels (variant tags, road numbers). |
| `--tracking-mono-widest` | `0.18em` | Very small / very-spaced labels (hero meta, killed badges). |

### Tracking rules

- Tracking and size move together. Bigger display = tighter tracking. Smaller mono = wider tracking.
- Body always tracks at `0`. Don't tighten or loosen body without a specific reason documented in `decisions.md`.
- Uppercase mono needs more tracking than lowercase mono. The mono ramp assumes uppercase use.

---

## Line-height

Line-height is tokenized by use. Display heads use sub-1 line-heights for tight stacking; body uses comfortable 1.45–1.55; mono labels use 1 to 1.7 depending on whether they wrap.

| Token | Value | Used for |
|---|---|---|
| `--leading-display-tightest` | `0.85` | Massive metric numbers (hero metric, dashboard metric). |
| `--leading-display-tight` | `0.88` | Hero h1. |
| `--leading-display-snug` | `0.92` | Outcome `.when` badges, very tight headlines. |
| `--leading-display` | `0.95` | Section titles, default display. |
| `--leading-display-loose` | `1.05` | Hero-role h2, pull-quote blockquote. Display that needs to breathe. |
| `--leading-display-readable` | `1.15` | Road h4 (display-as-paragraph hybrids). |
| `--leading-display-lede` | `1.3` | Reframe text, hypothesis. |
| `--leading-display-lede-loose` | `1.35` | Hero lede. |
| `--leading-body-tight` | `1.45` | Tight body (outcome descriptions, surprise callouts). |
| `--leading-body` | `1.55` | Default body. |
| `--leading-mono` | `1.5` | Default mono with wrapping. |
| `--leading-mono-loose` | `1.7` | Mono in tables/lists with multiple lines (role-meta). |
| `--leading-flat` | `1` | Single-line elements (badges, large numbers in cards where the size sets the rhythm). |

### Line-height rules

- Display headlines lead tight (under 1) so multi-line headlines stack visually.
- Body leads loose (1.45–1.55) for reading comfort.
- Mono labels in single-line use lead at `--leading-flat` (1); mono labels that wrap use `--leading-mono`.

---

## Text transform & font-feature-settings

Two patterns the system uses repeatedly. Tokenized as utility classes or rules in components, not as variables (since these don't shift across themes).

| Pattern | Where it applies |
|---|---|
| `text-transform: uppercase` | All mono labels by default. Display headlines that are all-caps (hero h1, section titles, metric labels). Body never. |
| `font-feature-settings: "tnum"` | Any element rendering a number (metric values, outcome values, hero metric). Tabular numerals prevent jitter when values change. |

---

## Composition tokens

A few combinations are used so often that they earn role names. These compose multiple primitives into a single semantic.

| Token | Composed of | Used for |
|---|---|---|
| `--type-section-num` | `font-mono` + `mono-lg` + `mono-bold` + `tracking-mono-base` | The big section number (`01`, `02`, etc. before each section title). |
| `--type-eyebrow` | `font-mono` + `mono-xs` + `mono-medium` + `tracking-mono-wide` + `uppercase` | The tiny mono label that introduces a section or block ("Hypothesis", "Result", "What I argued"). |
| `--type-metric-num` | `font-display` + `display-2xl` + `display-heavy` + `tracking-display-tightest` + `leading-flat` + `tnum` | The big number in a metric card. |
| `--type-section-title` | `font-display` + `display-xl` + `display-heavy` + `tracking-display-tight` + `leading-display` + `uppercase` | Section titles. |
| `--type-lede` | `font-display` + `display-lede` + `display-medium` + `tracking-display-flat` + `leading-display-lede` | Section ledes (the big readable intro paragraph). |
| `--type-body` | `font-body` + `body-lg` + `body-regular` + `tracking-body` + `leading-body` | Default body copy. |

These can be defined as CSS classes (`.type-section-num`, etc.) or as token bundles in a CSS-in-JS layer. Either way, components reference the composition, not the underlying primitives, when the use is canonical.

For one-off compositions (a body element with a non-default size, for instance), components reference the individual tokens directly.

---

## Type rules

- Components reference type tokens, never raw `font-size` / `font-weight` / `letter-spacing` / `line-height` values.
- The size, weight, tracking, and line-height ramps are coupled. A "display" size uses display weights, display tracking, and display line-height. Don't mix mono tracking onto a body size, or display weights onto mono.
- Family is fixed by role. Display headlines always use `--font-display`. Labels always use `--font-mono`. Don't substitute.
- Uppercase is part of the system's voice. Most mono labels and most display headlines are uppercase. Body is always sentence-case.
- Tabular numerals (`tnum`) are required wherever numbers appear at display sizes. Without it, numbers jitter.

---

## Anti-patterns

- Raw pixel values in components (`font-size: 14px`). Reference a token.
- Mixing family conventions (mono tracking on body, display weight on labels).
- Using display tokens for chrome / UI labels. Display is for headlines and numbers, not buttons.
- Using mono for paragraphs. Mono is labels, metadata, and process content.
- Custom `letter-spacing` not from the tracking ramp. The ramp covers everything.
- Body copy in uppercase. Reading destroyed.
- Display tokens at body weights. The ramps are coupled.
- Adding a new size token because "the closest one is 2px off." That's drift. Use the closest one or justify the addition properly.

---

## When no existing token fits

Per `tokens.md`, if no existing token maps to the role you need, three options:

1. **Reconsider the choice.** Most "I need a 13.5px size" moments resolve to "I should use 14px or the existing 13px." Off-ramp values create drift without adding meaning.
2. **Add a new token.** If the role is genuinely new (e.g., a new editorial format that needs its own scale step), follow the *Adding* procedures below.
3. **Flag the gap and stop.** If you can't justify the addition, the design may not fit the system. Surface the conflict.

Each path produces a system that holds together. Bypassing produces drift.

---

## Adding to the system

### Adding a new size token

1. Confirm the size isn't covered by an existing token. The size ramps are dense; most roles already exist.
2. Decide which family the size belongs to (display, body, or mono). The ramps don't share tokens.
3. Decide if it's stepped, fluid, or fixed:
   - **Stepped** (display only) — discrete value at each breakpoint. Use for headline-scale type that benefits from snapping cleanly to breakpoints.
   - **Fluid** (display only) — single `clamp()` value. Use for mid-scale display where smooth interpolation reads naturally.
   - **Fixed** (any family) — single integer. Required for body and mono. Optional for small display sizes used inside cards.
4. Name it by role within the family: `--text-{family}-{role}` (e.g., `--text-body-2xs`, `--text-display-md`). Match the existing naming convention.
5. Add it to the appropriate ramp table. For stepped sizes, define values at all six breakpoints and add the corresponding media query reassignments to the reference block.
6. Defend the addition in writing per `tokens.md`: state the role, why existing tokens don't cover it, what components will use it.

### Adding a new weight

Rare. The weight ramp is opinionated.

1. Confirm the weight isn't covered. The system uses 8 weight roles across 3 families.
2. Confirm the typeface actually ships the weight. Don't add a `300` token if Archivo doesn't ship a 300.
3. Name it by family + role: `--weight-{family}-{role}` (e.g., `--weight-display-light`).
4. Add it to the weights table.
5. Update the loading section if a new weight needs to be loaded from Google Fonts.

### Adding a new tracking value

Very rare. The tracking ramp covers the full range from tight display to wide mono.

1. Confirm the value isn't covered. Most "I need a different tracking" moments are the existing ramp at the wrong size.
2. Add only if the role is genuinely new (e.g., a new badge type with its own tracking convention).
3. Name by intent: `--tracking-{family}-{role}` (e.g., `--tracking-mono-narrow`).
4. Add it to the tracking table.

### Adding a new line-height

Rare. The leading ramp is dense.

1. Confirm the value isn't covered.
2. Name by intent: `--leading-{role}` (e.g., `--leading-display-airy`).
3. Add it to the leading table.

### Adding a new font family

Very rare. The triad is closed by default. A fourth family requires a documented reason in `decisions.md` (e.g., a serif for long-form essay pages).

1. Define the family token: `--font-{role}` (e.g., `--font-serif`).
2. Define a size ramp, weight ramp, tracking ramp, and line-height ramp for the family. Don't share tokens with existing families.
3. Update the loading section.
4. Update the architecture section to note the fourth role.

### Adding a new composition token

When a multi-token combination is used in three or more components, promote it to a composition token.

1. Confirm the combination is canonical (used identically in multiple places, not just similar).
2. Name by role: `--type-{role}` (e.g., `--type-caption`).
3. Define it in the compositions table with the underlying primitives.
4. Refactor existing components to reference the composition.

---

## Theming notes

Future themes can override type tokens under a `data-theme` selector. The role names stay the same.

- **Should change between themes**: font families (a "serif" theme), specific weight values (a typeface that ships different weights), specific size values (a "compact" theme can override the stepped display sizes per breakpoint).
- **Shouldn't change**: the family count (display/body/mono triad), the size-family coupling (display sizes only used with display family), the tracking ramp's directional logic (tight at large, wide at small), the stepped/fluid/fixed split (which sizes respond to breakpoints and which don't is structural).

---

## Reference: full type block

Copy into `globals.css` after the color block.

```css
:root {
  /* Font families */
  --font-display: 'Archivo', sans-serif;
  --font-body: 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* Display sizes — stepped (default values for xs; reassigned at breakpoints below) */
  --text-display-hero: 56px;
  --text-display-metric: 64px;
  --text-display-2xl: 48px;
  --text-display-xl: 32px;
  --text-display-lg: 30px;
  --text-display-md: 26px;
  --text-display-sm: 26px;
  --text-display-xs: 22px;

  /* Display sizes — fluid (do not respond to breakpoints) */
  --text-display-2xs: 26px;
  --text-display-quote: clamp(20px, 1.7vw, 22px);
  --text-display-lede: clamp(18px, 1.5vw, 24px);
  --text-display-lede-sm: clamp(15px, 1.2vw, 19px);

  /* Body sizes */
  --text-body-lg: 17px;
  --text-body-md: 16px;
  --text-body-sm: 15px;
  --text-body-xs: 14px;
  --text-body-2xs: 13px;

  /* Mono sizes */
  --text-mono-lg: 14px;
  --text-mono-md: 13px;
  --text-mono-base: 12px;
  --text-mono-sm: 11px;
  --text-mono-xs: 10px;
  --text-mono-2xs: 9px;

  /* Weights */
  --weight-display-heavy: 800;
  --weight-display-bold: 700;
  --weight-display-medium: 500;
  --weight-mono-bold: 600;
  --weight-mono-medium: 500;
  --weight-body-bold: 700;
  --weight-body-medium: 500;
  --weight-body-regular: 400;

  /* Tracking */
  --tracking-display-tightest: -0.04em;
  --tracking-display-tight: -0.025em;
  --tracking-display-snug: -0.01em;
  --tracking-display-flat: -0.005em;
  --tracking-body: 0;
  --tracking-mono-snug: 0.04em;
  --tracking-mono-base: 0.06em;
  --tracking-mono-wide: 0.1em;
  --tracking-mono-wider: 0.14em;
  --tracking-mono-widest: 0.18em;

  /* Line-heights */
  --leading-display-tightest: 0.85;
  --leading-display-tight: 0.88;
  --leading-display-snug: 0.92;
  --leading-display: 0.95;
  --leading-display-loose: 1.05;
  --leading-display-readable: 1.15;
  --leading-display-lede: 1.3;
  --leading-display-lede-loose: 1.35;
  --leading-body-tight: 1.45;
  --leading-body: 1.55;
  --leading-mono: 1.5;
  --leading-mono-loose: 1.7;
  --leading-flat: 1;
}

/* Display sizes — stepped reassignments per breakpoint */
/* Breakpoint values come from grid.md */

@media (min-width: 480px) { /* sm */
  :root {
    --text-display-hero: 64px;
    --text-display-metric: 72px;
    --text-display-2xl: 52px;
    --text-display-xl: 36px;
    --text-display-lg: 32px;
    --text-display-md: 28px;
    --text-display-sm: 28px;
    --text-display-xs: 22px;
  }
}

@media (min-width: 768px) { /* md */
  :root {
    --text-display-hero: 80px;
    --text-display-metric: 84px;
    --text-display-2xl: 60px;
    --text-display-xl: 44px;
    --text-display-lg: 38px;
    --text-display-md: 32px;
    --text-display-sm: 30px;
    --text-display-xs: 24px;
  }
}

@media (min-width: 1024px) { /* lg */
  :root {
    --text-display-hero: 96px;
    --text-display-metric: 96px;
    --text-display-2xl: 64px;
    --text-display-xl: 48px;
    --text-display-lg: 42px;
    --text-display-md: 36px;
    --text-display-sm: 32px;
    --text-display-xs: 26px;
  }
}

@media (min-width: 1280px) { /* xl */
  :root {
    --text-display-hero: 108px;
    --text-display-metric: 104px;
    --text-display-2xl: 68px;
    --text-display-xl: 52px;
    --text-display-lg: 44px;
    --text-display-md: 38px;
    --text-display-sm: 34px;
    --text-display-xs: 28px;
  }
}

@media (min-width: 1536px) { /* 2xl */
  :root {
    --text-display-hero: 116px;
    --text-display-metric: 110px;
    --text-display-2xl: 72px;
    --text-display-xl: 56px;
    --text-display-lg: 48px;
    --text-display-md: 40px;
    --text-display-sm: 36px;
    --text-display-xs: 30px;
  }
}
```
