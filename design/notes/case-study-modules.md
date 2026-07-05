# Case-study modules — planning surface

Companion to `library/manifest.json`. The manifest is the source of truth
for **what's built**; this file tracks **what's planned, how modules
compose, and the layout research behind the roadmap**. Anything that
belongs in the manifest (slots, states, file paths) doesn't belong here.

## What's built (quick reference)

For the canonical list — slots, states, headings, previewPaths — read
`library/manifest.json`. This section is just a scannable index so a
reader knows what tools exist without opening the JSON.

| Slug | Category | One-liner |
|---|---|---|
| `case-study-hero` | text | Opens a case study — meta / title / lead / chips |
| `prose-section` | text | Narrative body at 62ch measure, mono eyebrow |
| `pull-quote` | text | Attributed blockquote in display type |
| `full-bleed-figure` | image | Single 4:3 image with FIG. NN caption |
| `figure-grid` | image | 2×2 or 3-up mosaic of 4:3 figures |
| `prototype-frame` | prototype | Click-to-load 16:9 iframe/video |
| `spec-sheet` | data | Up to 6 label/value spec rows |
| `stat-row` | data | Up to 4 big display values with unit labels |

## Composition guidance

A typical case-study page reads top-to-bottom:

1. `case-study-hero` — always first
2. `spec-sheet` — role / timeline / team / platform
3. `prose-section` — problem / context (`01 · PROBLEM`)
4. `full-bleed-figure` or `figure-grid` — supporting media
5. `prose-section` — approach / process (`02 · APPROACH`)
6. `prototype-frame` — the interactive artifact
7. `stat-row` — impact
8. `pull-quote` — stakeholder voice
9. `prose-section` — takeaways / what's next

Modules are stateless — the composer picks one state per instance. Content
is injected via `postMessage({type: "loom:content", values: {...}})` at
runtime; see `system/page-builder.md`.

## Planned modules

Not yet built. Sourced from the layout analysis of `module-inspo/` (§ Layout
patterns below). To promote a planned module to built: author it per
`system/modules.md`, register in `library/manifest.json`, delete its entry
from this section.

### feature-card-grid
- **Shape**: 3–4 uniform feature cards. Every card has the same internal geometry.
- **Composition options**: `index + title + body` | `illustration + title + body` | `icon + big value + label + description`
- **Refs**: Flowgent Discover/Plan/Build/Scale, Handshake customized solutions, Precedent highlights.
- **Why**: The single most common layout in `module-inspo/` (~9 of 33 shots) and nothing in the current kit covers it.

### corner-labeled-field
- **Shape**: Rectangular content field defined by mono labels at all four corners + a bottom band with numbered sub-sections.
- **Refs**: Framer "Website" services page.
- **Why**: The most Blueprint-native pattern in the inspo folder — technical-drawing DNA baked in.

### horizontal-timeline
- **Shape**: Horizontal rule with equally-spaced dots; a card sits below each dot with `title / body / date`.
- **Refs**: Linear changelog.
- **Why**: Fits chronological content — process, milestones, changelog blocks.

### metric-list
- **Shape**: Vertical stat list with hairline rules between items. Each row: big number left, short label right.
- **Refs**: Legora legal industry stats (68% / 4.3hrs / $6.9m).
- **Why**: Narrow-context alternative to `stat-row` — works when column space is tight (e.g. inside a split-panel right rail).

## Layout patterns (from `./module-inspo/`, 33 shots surveyed 2026-07-04)

The 12 recurring structural shapes. Style ignored. Kept here so future
planning has a reference; don't need to re-do the analysis.

1. **Marginalia sidebar** — narrow left rail + wide content. Refs: Legora steps, Resonant Link benefits, Framer corners.
2. **Asymmetric 2-column split** — text one side + visual/stat/card cluster the other. ~12 of 33.
3. **Full-width stat row** — 3–4 uniform cells; with or without vertical dividers. ~6 of 33.
4. **Feature card grid** — 3–4 uniform cells, every card same internal geometry. ~9 of 33. → planned as `feature-card-grid`.
5. **Big index number as compositional device** — small mono / medium anchor / massive bleed. `01 02 03` at every scale.
6. **Corner-labeled rectangle** — Framer-style four-corner labels + bottom band. → planned as `corner-labeled-field`.
7. **Horizontal timeline** — dots on a line + card below each. → planned as `horizontal-timeline`.
8. **Full-bleed image + marginalia below** — full-bleed hero, then narrow-label + wide body.
9. **Vertical stat list with rules between** — big number left / short label right per row. → planned as `metric-list`.
10. **Overlapping decoration breaking the frame** — a paperclip/dollar bleeds over the section boundary (template-level, not module).
11. **Nested compositions** — one section containing multiple sub-layouts (template-level).
12. **Symmetric bookend layout** — visual left + centered text + visual right. Rare (1 of 33).

## Absent from `module-inspo/`

Interesting negative signals — no inspo shot used:

- Pull quotes / blockquote layouts
- Long-form prose sections (all copy is short)
- Prototype/video embed treatments
- Before/after comparisons
- Broken image mosaics (every image grid is uniform)
- Definition-list / specs layouts

Three of these six are covered by current modules (`pull-quote`,
`prose-section`, `spec-sheet`). Worth deciding whether those are still
load-bearing for the case studies as envisioned, or whether the case
studies will be more visual-forward.

## Open questions

- Should `figure-grid` stay uniform (aligns with all 9 inspo image-grid examples) or become a broken editorial mosaic (aligns with magazine layouts but not this inspo folder)?
- Are `pull-quote`, `prose-section`, and `spec-sheet` still load-bearing given they're absent from inspo?
- Which "planned" module to build first? `feature-card-grid` has the most repeat evidence; `corner-labeled-field` has the strongest brand fit.

## Log

- 2026-07-04 — 8 core modules built on `feat/case-study-modules`. Layout analysis of `module-inspo/` sourced 4 planned modules. First compositional-pass draft reverted.
