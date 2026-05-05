# Components Catalog

Approved UI primitives in this folder. Each entry below is a piece you can import and use.

For how to build new pieces, see `system/components.md`.
For the approval workflow, see `system/sandbox.md`.

---

## Index

| Name | Definition | File | Preview |
|---|---|---|---|
| `Eyebrow` | Small uppercase mono label that introduces a section or block. | `./Eyebrow.tsx` | `/library/components/eyebrow` |
| `SectionNumber` | Mono numeral (e.g. `01`) that precedes a section title. | `./SectionNumber.tsx` | `/library/components/section-number` |
| `MetricCard` | Number + label + optional comparison. The system's data card. | `./MetricCard.tsx` | `/library/components/metric-card` |
| `Tag` | Small bordered label for variant / status markers. | `./Tag.tsx` | `/library/components/tag` |
| `AttributionRow` | One row in a cross-functional attribution table (function / who / what). | `./AttributionRow.tsx` | `/library/components/attribution-row` |

---

## Entries

### `Eyebrow`

**Role.** The system's tiniest typographic voice marker. A small uppercase mono label that introduces a section, a block, or a metric. Used above headlines, before metric labels, on cards. Use one per parent block — multiple eyebrows in proximity dilute the marker.

**Import.**
```tsx
import Eyebrow from "@/components/ui/Eyebrow";
```

**Props / API.**

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `children` | `ReactNode` | Yes | — | The label text. Should already be in sentence-case; the component uppercases via CSS. |

**Tokens used.** `--font-mono`, `--text-mono-xs`, `--weight-mono-medium`, `--tracking-mono-wide`, `--leading-flat`. Color is `currentColor` — adapts to any surface.

**Theme support.** Default theme. Surface-agnostic via `currentColor`.

**Breakpoint behavior.** Fixed-size (mono sizes don't respond to breakpoints per `typography.md`). Reads the same at every breakpoint.

**Approved on.** 2026-05-04.

**Notes / known limitations.** None. The simplest piece in the system.

---

### `SectionNumber`

**Role.** The mono numeral that precedes a section title (`01`, `02`, `03`…). Sized at `mono-lg` with bold weight; matches `typography.md`'s `--type-section-num` composition. Color signals which surface it sits on.

**Import.**
```tsx
import SectionNumber from "@/components/ui/SectionNumber";
```

**Props / API.**

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `number` | `string` | Yes | — | The numeral to display. String, not number, so leading zeros (`"01"`) are preserved. |
| `tone` | `"default" \| "inverse"` | No | `"default"` | `default` uses `--primary` (red) for light surfaces. `inverse` uses `--data` (yellow) for dark / `--ink` surfaces. |

**Tokens used.** `--font-mono`, `--text-mono-lg`, `--weight-mono-bold`, `--tracking-mono-base`, `--leading-flat`. Color: `--primary` (default tone) or `--data` (inverse tone).

**Theme support.** Default theme. Two tones cover light + dark surface usage.

**Breakpoint behavior.** Fixed-size. Reads the same at every breakpoint.

**Approved on.** 2026-05-04.

**Notes / known limitations.** Tone is the consumer's call — there's no automatic surface detection. If you put a `default`-toned section number on `--ink`, it'll read as red on near-black (still WCAG-passing but visually off). Pick the tone that matches your section's surface.

---

### `MetricCard`

**Role.** The system's data card. A big number, a mono label, and an optional comparison line beneath. Used in metric dashboards, hero metric blocks, outcome lists. The yellow `--data` surface marks the card as a metrics moment per `decisions.md` (data = yellow, identity = red — don't substitute).

**Import.**
```tsx
import MetricCard from "@/components/ui/MetricCard";
```

**Props / API.**

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `value` | `string` | Yes | — | The metric value (e.g. `"+18%"`, `"$24.5M"`, `"−22%"`). Rendered with `tnum` for tabular alignment. |
| `label` | `string` | Yes | — | The metric's label (e.g. `"CVR lift"`, `"Time on configurator"`). Rendered uppercase. |
| `comparison` | `string` | No | — | Optional comparison line (e.g. `"↑ Target +12%"`). When omitted, the comparison row doesn't render. |
| `comparisonState` | `"over" \| "neutral"` | No | `"neutral"` | `over` tints the comparison line in `--primary` (red) for "we exceeded the target." `neutral` keeps it in the card's default text color. |

**Tokens used.** Surface: `--data`, `--data-fg`, `--ink` (border). Value: `--font-display`, `--text-display-2xl`, `--weight-display-heavy`, `--tracking-display-tightest`, `--leading-flat`, `tnum`. Label: `--font-mono`, `--text-mono-xs`, `--weight-mono-medium`, `--tracking-mono-wider`, `--leading-flat`. Comparison: `--font-mono`, `--text-mono-xs`, `--weight-mono-medium`, `--tracking-mono-base`, `--leading-flat`. Comparison-over tint: `--primary`.

**Theme support.** Default theme. The yellow surface is the same in any future theme that keeps `--data` mapped to yellow.

**Breakpoint behavior.** Value uses the stepped `--text-display-2xl` ramp (48 → 52 → 60 → 64 → 68 → 72px across xs → 2xl). Card maintains its 200px min-height across breakpoints. Internal padding is fixed (`28px 24px`).

**Approved on.** 2026-05-04.

**Notes / known limitations.** The card always uses the `--data` surface — by design. If a layout needs a non-yellow card with similar shape, that's a different component (likely `OutcomeCard` or similar), not a configurable variant of this one.

---

### `Tag`

**Role.** Small bordered label. Used for variant markers, road status, and any inline categorical signal that needs mono uppercase emphasis without the gravity of a `SectionNumber`. Always inline, always uppercase, always small.

**Import.**
```tsx
import Tag from "@/components/ui/Tag";
```

**Props / API.**

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `children` | `ReactNode` | Yes | — | The tag's content. Usually a short word (`"Winner"`, `"Killed"`, `"Tabled"`, `"Beta"`). |
| `variant` | `"default" \| "winner" \| "killed" \| "tabled"` | No | `"default"` | See variants below. |

**Variants.**

| Variant | Surface | Text | Border | Use for |
|---|---|---|---|---|
| `default` | transparent | `currentColor` | `currentColor` | Neutral inline marker. Adapts to any surface. |
| `winner` | `--primary` | `--primary-fg` | `--primary` | Identity / celebratory. The shipped variant in an experiment. |
| `killed` | `--ink` | `--panel` | `--ink` | Strong negative. A road that was killed. |
| `tabled` | `--panel` | `--ink` | `--separator` | Soft "deferred." A road that's tabled for later. |

**Tokens used.** `--font-mono`, `--text-mono-2xs`, `--weight-mono-bold`, `--tracking-mono-widest`, `--leading-flat`, plus surface tokens per variant.

**Theme support.** Default theme. The `default` variant is surface-agnostic; named variants tie to specific semantic tokens that re-alias under future themes.

**Breakpoint behavior.** Fixed-size. Reads the same at every breakpoint.

**Approved on.** 2026-05-04.

**Notes / known limitations.** Tags are inline; they don't wrap their own text. For long content, the tag will visually bulge against its row — keep tag content to one or two short words.

---

### `AttributionRow`

**Role.** One row in a cross-functional attribution table: a function (the team or discipline), the people on it, and what they did. Three columns on `md+`, stacked on mobile. This component is the row primitive; multiple rows compose into a `CrossFunctionalTable` module (built later).

**Import.**
```tsx
import AttributionRow from "@/components/ui/AttributionRow";
```

**Props / API.**

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `function_` | `string` | Yes | — | The discipline / team name (e.g. `"Engineering"`, `"Product"`). Underscore-suffixed because `function` is a JS reserved word. Rendered uppercase. |
| `who` | `string` | Yes | — | The people, written conversationally (e.g. `"2 ICs · 1 EM"`, `"1 PM"`, `"1 Lead · 2 contributors"`). |
| `what` | `string` | Yes | — | What they did. One or two sentences in past tense per `voice.md` D14. |

**Tokens used.** Function cell: `--font-display`, `--text-display-xs`, `--weight-display-bold`, `--tracking-display-snug`, `--leading-display`. Who cell: `--font-mono`, `--text-mono-base`, `--weight-mono-medium`, `--tracking-mono-snug`, `--leading-mono`. What cell: `--font-body`, `--text-body-xs`, `--weight-body-regular`, `--tracking-body`, `--leading-body`. Borders: `currentColor` at 20% (derived) — surface-adaptive.

**Theme support.** Default theme. Surface-agnostic via `currentColor` — pairs correctly on `--paper`, `--panel`, and `--ink` with no per-surface variants.

**Breakpoint behavior.** Below `md` (768px): single column, cells stack vertically with horizontal dividers. At `md+`: three columns (`130px / 1fr / 2fr`) with vertical dividers. The function-column display size shifts with the stepped `--text-display-xs` ramp (22 → 22 → 24 → 26 → 28 → 30px).

**Approved on.** 2026-05-04.

**Notes / known limitations.** This is one row. It does not render a header row or wrap multiple rows — that's the table module's job. Used standalone in the library for preview purposes; in production, expect it inside a `<CrossFunctionalTable>` (or equivalent module) that supplies the header and the `<table>` semantics.
