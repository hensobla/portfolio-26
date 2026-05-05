# grid.md

Defines the layout grid: breakpoints, column counts, margins, gutters, and container behavior. Also documents (without tokenizing) the spacing patterns the system uses inside components.

For governance (theming, naming, adding tokens), see `tokens.md`. For typography sizes that respond to breakpoints, see `typography.md`. For the *why*, see `decisions.md`.

---

## Architecture

The layout system has two layers.

**Breakpoints** define when the layout shifts. They are tokenized so other domain files (typography, components) can reference the same canonical values. The system uses six mobile-first breakpoints: `xs, sm, md, lg, xl, 2xl`.

**Grid configuration** at each breakpoint defines the column count, page margins, gutter widths, and container behavior (stretch vs centered). Each property is independently tokenized so the grid can be tuned per breakpoint without changing component code.

Components reference grid tokens, never raw breakpoint values or column counts. A component that says "two columns on tablet, four on desktop" expresses that against the grid's column tokens, not against `min-width: 768px`.

---

## Breakpoints

Six breakpoints, mobile-first. Min-width media queries.

| Token | Value | Role |
|---|---|---|
| `--bp-xs` | `0px` | Default. Mobile portrait. Phones held in one hand. |
| `--bp-sm` | `480px` | Mobile landscape, large phones. |
| `--bp-md` | `768px` | Tablet portrait. The classic iPad-vertical breakpoint. |
| `--bp-lg` | `1024px` | Tablet landscape, small laptops. |
| `--bp-xl` | `1280px` | Standard desktop. The page contents cap here (matches `--measure`). |
| `--bp-2xl` | `1536px` | Large desktop / ultrawide. Contents stay capped; margins absorb extra space. |

### Breakpoint rules

- **Mobile-first.** All component styles assume mobile defaults; breakpoints add complexity at larger widths via `@media (min-width: ...)`. Don't write `max-width` queries unless absolutely necessary.
- **Six is the count.** Don't introduce a seventh breakpoint without documented reason. Adding one off-ramp value (e.g., `min-width: 920px`) creates drift that ripples through every component.
- **Reference tokens, not values.** A media query is `@media (min-width: var(--bp-md))`, not `@media (min-width: 768px)`. CSS custom properties don't natively work in media queries (yet), so in practice this means using a CSS preprocessor variable, a build-time replacement, or a JS-driven approach like `useMediaQuery`. Whichever method, the source of truth is this file.

### Using breakpoints in CSS

Until container queries cover all use cases, the canonical pattern is to use a Sass / build-tool variable that mirrors these tokens. Example:

```scss
// _breakpoints.scss
$bp-xs: 0px;
$bp-sm: 480px;
$bp-md: 768px;
$bp-lg: 1024px;
$bp-xl: 1280px;
$bp-2xl: 1536px;

// Usage
@media (min-width: $bp-md) { ... }
```

Or, in plain CSS with a build step (PostCSS Custom Media):

```css
@custom-media --bp-md (min-width: 768px);

@media (--bp-md) { ... }
```

Either pattern is acceptable. What's not acceptable is a hard-coded `768px` in component CSS.

---

## Column count per breakpoint

The number of columns the grid divides into at each breakpoint.

| Breakpoint | Columns | Token |
|---|---|---|
| xs (0+) | 4 | `--grid-cols-xs` |
| sm (480+) | 4 | `--grid-cols-sm` |
| md (768+) | 8 | `--grid-cols-md` |
| lg (1024+) | 12 | `--grid-cols-lg` |
| xl (1280+) | 12 | `--grid-cols-xl` |
| 2xl (1536+) | 12 | `--grid-cols-2xl` |

### Column rules

- **Components express layout in spans, not in pixels.** A component takes "6 of 12 columns" or "half the grid." It doesn't take "640px." This way the grid scales without rewriting component code.
- **The column count is the design unit at each breakpoint.** Half a row on desktop is 6 columns; half a row on tablet is 4. Don't think in fixed widths.
- **Going below 4 columns is an anti-pattern.** Mobile portrait at 4 already gives quarter-width as the smallest meaningful unit. Don't introduce a 2-column mobile grid.
- **12 covers everything from lg up.** Don't escalate to 16 columns at 2xl. The container caps; the column count holds.

---

## Margins and gutters per breakpoint

**Margins** are the inset between the viewport edge (or the container edge) and the first column. **Gutters** are the gaps between columns.

| Breakpoint | Margin | Gutter | Tokens |
|---|---|---|---|
| xs (0+) | 16px | 16px | `--grid-margin-xs`, `--grid-gutter-xs` |
| sm (480+) | 20px | 20px | `--grid-margin-sm`, `--grid-gutter-sm` |
| md (768+) | 32px | 24px | `--grid-margin-md`, `--grid-gutter-md` |
| lg (1024+) | 32px | 24px | `--grid-margin-lg`, `--grid-gutter-lg` |
| xl (1280+) | 48px | 32px | `--grid-margin-xl`, `--grid-gutter-xl` |
| 2xl (1536+) | auto | 32px | `--grid-margin-2xl` (= auto), `--grid-gutter-2xl` |

### Margin and gutter rules

- **Margins grow with viewport.** Tighter on mobile (where pixels are precious), looser on desktop (where breathing room signals quality).
- **Gutters grow more slowly.** They're the relationship between columns, not the relationship between content and chrome.
- **At 2xl, margins go `auto`.** The container caps at `--measure` (1280px) and centers in wider viewports. The "margin" at this breakpoint is whatever space the viewport has left over.
- **Don't use margin tokens for content padding.** These tokens describe the grid's relationship to the viewport. Padding inside a component is its own decision (see *Spacing patterns* below).

---

## Container behavior

The container is the wrapper that holds page content. Its behavior shifts at the xl breakpoint: below xl, it stretches; at xl and above, it centers within a maximum width.

| Breakpoint | Behavior | Max width |
|---|---|---|
| xs through lg | Stretch (full viewport, with margins) | none |
| xl and 2xl | Centered with max-width | `--container-max` (= `--measure`) |

### Container tokens

| Token | Value | Role |
|---|---|---|
| `--container-max` | `1280px` | The maximum width the container reaches. Same as `--measure` (alias preserved for legacy reference). |
| `--container-behavior-below-xl` | `stretch` | Documentation token. The container fills the viewport. |
| `--container-behavior-xl-up` | `centered` | Documentation token. The container centers and caps at `--container-max`. |

### Container rules

- **Below xl: stretch.** The grid fills the viewport edge to edge. Margins (`--grid-margin-{bp}`) provide the inset to content.
- **xl and above: centered.** Once the viewport exceeds 1280px, the container stops growing. The grid stays at 12 columns within `--container-max`. The empty space outside the container is the "margin" at these widths.
- **Sections that break out of the container** (e.g., the metrics dashboard, the dark roads section, the brand-color blocks) extend to the viewport edges by negative-margin techniques. These are explicit exceptions, documented per-component. The default for all content is to stay inside the container.
- **Don't change `--container-max` casually.** It's coupled to the column layout, the typography ramp, and the photographic / layout proportions. Changing it is a system-level decision documented in `decisions.md`.

---

## Putting it together: the grid as CSS

A canonical `.grid` class at each breakpoint:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols-xs), 1fr);
  column-gap: var(--grid-gutter-xs);
  padding-inline: var(--grid-margin-xs);
}

@media (min-width: 480px) {
  .grid {
    grid-template-columns: repeat(var(--grid-cols-sm), 1fr);
    column-gap: var(--grid-gutter-sm);
    padding-inline: var(--grid-margin-sm);
  }
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(var(--grid-cols-md), 1fr);
    column-gap: var(--grid-gutter-md);
    padding-inline: var(--grid-margin-md);
  }
}

/* etc. */

@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(var(--grid-cols-xl), 1fr);
    column-gap: var(--grid-gutter-xl);
    padding-inline: 0;
    max-width: var(--container-max);
    margin-inline: auto;
  }
}
```

A column-spanning component:

```css
.hero-name {
  /* On mobile (4 cols), span all 4 */
  grid-column: span 4;
}

@media (min-width: 768px) {
  /* On md (8 cols), span 5 */
  .hero-name { grid-column: span 5; }
}

@media (min-width: 1024px) {
  /* On lg+ (12 cols), span 7 */
  .hero-name { grid-column: span 7; }
}
```

The component expresses what fraction of the grid it occupies at each breakpoint. The grid system handles the math.

---

## Spacing patterns (not tokenized)

Spacing inside components — section padding, gap between blocks, padding inside cards — is **not tokenized** in this system. Each component owns its own spacing as design decisions. Documented here as observed patterns so future components feel coherent without the rigidity of a global scale.

### Observed values from the case study

The Vignelli case study uses these spacing values in roughly these contexts:

**Tight (within a card or block):**
- `4px, 6px, 8px` — spacing between tightly related text (label and value, eyebrow and headline)
- `10px, 12px, 14px` — spacing inside lists, between paragraphs in tight blocks
- `16px, 18px, 20px` — spacing between sub-blocks within a card

**Standard (between blocks within a section):**
- `24px, 28px, 32px` — gap between paragraphs in a section, padding inside cards on light surfaces
- `36px, 40px` — section-head bottom margin, padding for content blocks at desktop

**Loose (between sections, or padding on dark/colored surfaces):**
- `48px, 56px, 64px` — vertical padding for full-width sections
- `72px, 80px, 88px` — vertical padding for hero blocks, brand-color sections, "next" pull-quote sections

### Spacing rules

- **Use multiples of 4 by default.** The case study mostly does (4, 8, 12, 16, 20, 24, 28, 32, etc.). Off-grid values (15, 18, 22) are rare and intentional. Match the rhythm.
- **Padding scales with surface importance.** A small card uses 16–24px padding. A hero block uses 32–48px. A full-width brand section uses 64–80px. Bigger surfaces breathe more.
- **Padding scales with viewport.** A section padded `40px` on desktop should drop to `24px` on mobile. The case study does this with `padding: 56px 32px 64px` (desktop) shifting to `padding: 40px 20px 48px` (mobile).
- **Don't tokenize on impulse.** If you see a value repeated three times, that's a coincidence. Tokenize spacing only if a specific role (e.g., "section padding") needs to shift across themes. So far, no role qualifies.

If a future need pushes spacing into the token layer (a "compact" theme that ships shrunk padding everywhere), the addition is a system-level decision documented in `decisions.md`. Until then, spacing stays a per-component design call.

---

## Anti-patterns

- Hard-coded breakpoint values in component CSS (`@media (min-width: 768px)`). Reference the breakpoint token through your build pipeline.
- Components that express layout in pixel widths instead of column spans. The grid handles widths; components express fractions.
- Off-ramp breakpoints (`min-width: 920px` for one component). The six canonical breakpoints cover every case.
- A 2-column mobile grid. The minimum is 4. If a layout needs "halves" on mobile, that's `span 2` of the 4-column grid.
- Escalating column count at 2xl. Twelve columns at 2xl, period. The container caps.
- Using `--grid-margin-*` as content padding. Margin tokens describe the grid's relationship to the viewport, not internal component padding.
- Inline `max-width: 1280px` in components. Use `--container-max`.
- Tokenizing spacing because "I used `24px` three times." Spacing isn't tokenized. Patterns are documented, not prescribed.

---

## When no existing token fits

Per `tokens.md`, if no existing grid token maps to the role you need, three options:

1. **Reconsider.** Most "I need a different breakpoint" or "I need 10 columns at md" moments resolve to the existing system once you check it. The 6-breakpoint, 4/8/12 column structure covers the cases the system was designed for.
2. **Add a new token.** If a real new role exists (e.g., a `3xl` breakpoint for a future ultrawide use case), follow the *Adding* procedures below.
3. **Flag the gap and stop.** If you can't justify the addition but the existing tokens don't fit, the layout itself may be inconsistent with the system. Surface the conflict.

Each path produces a system that holds together. Bypassing produces drift.

---

## Adding to the system

### Adding a new breakpoint

Rare. The six existing breakpoints cover the standard responsive range from phone to ultrawide.

1. Confirm the breakpoint isn't covered. The existing range spans `0` to `1536+`, with sensible jumps.
2. Decide where it fits in the mobile-first sequence and pick a name (`3xl`, `xxs`, etc.).
3. Add it to the breakpoints table.
4. Define `--grid-cols-{name}`, `--grid-margin-{name}`, and `--grid-gutter-{name}` for the new breakpoint. The grid must be configured at every breakpoint.
5. Update the canonical `.grid` CSS pattern to include the new breakpoint.
6. Notify `typography.md`. Type sizes that respond to breakpoints will need new values at the new breakpoint. (See *TODO* below.)
7. Defend the addition in writing per `tokens.md`.

### Adding a column count change

If a breakpoint should shift to a different column count (e.g., bumping `md` from 8 to 10):

1. Confirm the change is system-wide, not component-specific. A specific component wanting "10 columns of feel" can do it with grid-template-columns inside its own scope; the global grid stays at 8.
2. Audit every component that references the changed breakpoint's grid. Many will break.
3. Update the column count table.
4. Re-test the full layout at the changed breakpoint.

### Adjusting margins or gutters

Easier than adding a breakpoint, but still touches every section of the layout.

1. Update the relevant token value in the margins/gutters table.
2. Re-test responsive layouts at the affected breakpoint.

### Changing container behavior

The current model (stretch below xl, centered xl+) is a fundamental layout decision. Changing it is a system-level change documented in `decisions.md`, not a casual edit.

---

## Theming notes

Future themes can override grid tokens under a `data-theme` selector. Most themes won't change the grid (it's structural); but specific use cases warrant it.

- **Should change between themes**: column counts (a "compact" theme with 6 columns at lg), margin/gutter values (a "dense" theme with tighter margins), container max width (a "wide" theme that caps at 1440 instead of 1280).
- **Shouldn't change**: the breakpoint count, the breakpoint values themselves (those are device-driven, not theme-driven), the mobile-first model, the container's stretch/centered transition behavior.

A "print" theme would override `--container-max` to a print-sheet width and disable breakpoints entirely. The role names stay; the values shift.

---

## Reference: full grid block

Copy into `globals.css` after the typography block.

```css
:root {
  /* Breakpoints */
  --bp-xs: 0px;
  --bp-sm: 480px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
  --bp-2xl: 1536px;

  /* Column counts */
  --grid-cols-xs: 4;
  --grid-cols-sm: 4;
  --grid-cols-md: 8;
  --grid-cols-lg: 12;
  --grid-cols-xl: 12;
  --grid-cols-2xl: 12;

  /* Margins (viewport edge to first column) */
  --grid-margin-xs: 16px;
  --grid-margin-sm: 20px;
  --grid-margin-md: 32px;
  --grid-margin-lg: 32px;
  --grid-margin-xl: 48px;
  --grid-margin-2xl: auto;

  /* Gutters (between columns) */
  --grid-gutter-xs: 16px;
  --grid-gutter-sm: 20px;
  --grid-gutter-md: 24px;
  --grid-gutter-lg: 24px;
  --grid-gutter-xl: 32px;
  --grid-gutter-2xl: 32px;

  /* Container */
  --container-max: 1280px;
}
```
