# Modules

Compositions of components into reusable section-sized blocks. Examples: Hero, FeatureGrid, Testimonial, PricingTable, CTABanner.

## What qualifies as a module

- **Composes existing components.** A module made entirely of new markup is a sign the missing pieces should be extracted into components first.
- **Section-sized.** Renders as a section/area of a page, not a full page (that's a template) and not an atom (that's a component).
- **Slot-friendly.** Modules accept content slots (title, body, media, actions) that templates fill in.
- **Owns its responsive behavior.** A module knows how it adapts across breakpoints; templates don't override that.

## Lifecycle hooks

When a module flips `draft → approved`, CC runs the where-used scan defined in `CLAUDE.md §15` — checking every hand-written template's HTML for `data-loom-module="<slug>"` and every composed template's `composition.json` for `modules[].moduleSlug` matches, then producing a copy-pasteable QA prompt listing the consumer templates.

When the user asks to edit an already-approved module, CC follows the snapshot/revert lifecycle in `CLAUDE.md §14`: the current files are copied to `src/modules/<slug>/_approved/`, status flips back to `draft`, and the Sandbox surfaces a **Revert to approved** affordance.

## File layout

```
src/modules/<slug>/
├── <slug>.html       # Markup, wrapping element gets [data-loom-module="<slug>"]
├── <slug>.css        # Scoped via [data-loom-module="<slug>"]
├── <slug>.js         # Optional
├── preview.html      # Standalone page with example content per state
└── _approved/        # OPTIONAL. Only present when this module has been edited from approved status. See CLAUDE.md §14.
```

Module scoping uses `[data-loom-module="..."]` to keep it distinct from component scoping. A module's CSS can target its child components by their `[data-loom]` attribute, but should only override layout-adjacent properties (margin, position), never visual ones.

## Heading declarations (backend correctness)

Modules with a primary heading element should declare it in their manifest entry:

```json
"headings": [
  { "slot": "headline", "role": "primary" }
]
```

The composing layer (composed template renderer, Page Builder canvas) walks the composition in order and assigns each primary heading a level — first instance gets `<h1>`, second gets `<h2>`, and so on. The level is delivered to the module via the reserved `_heading-level` key in the `loom:content` postMessage. See `CLAUDE.md §16` for the principle and `system/seo.md` for the heading-hierarchy rules.

Module renderers must:

1. Accept the `_heading-level` key from `loom:content` and store it.
2. Render the headline element as `<h${level}>` where `level` is the assigned value (clamped to 1–6), falling back to a sensible default (typically `1` for hero-style modules) when no level is provided.
3. Pin visual styling to the element's class (`.hero__headline`), not its tag — so the tag can swap without visual change. (System/seo.md already enforces this.)

## Slots (builder-ready by default)

Every module must declare its editable content surfaces as **slots** so the Sandbox and Page Builder can override them at runtime. This is a hard requirement — a module without slots is dead-on-arrival in the Builder's inspector.

Two changes are required per slot:

1. **Markup.** Mark the editable node with `data-loom-slot="<id>"`. Use this on text nodes (a `<span>` or heading whose `textContent` is replaced) and on `<img>` tags (whose `src` is replaced).
2. **Manifest entry.** Add a `slots: [...]` array with `{ id, type, label, default?, hint? }`. Types are `"text"` or `"image"`. The `id` matches the markup attribute. `label` is what shows on the inspector field.

The module's `preview.html` must implement the `loom:content` / `loom:ready` postMessage protocol so live edits apply. Concretely:

```js
window.addEventListener("message", (e) => {
  if (e.data?.type !== "loom:content") return;
  // Apply e.data.values to each [data-loom-slot] node.
});
// After initial render:
parent.postMessage({ type: "loom:ready", slug: "<module-slug>" }, "*");
```

See `system/page-builder.md` for the full protocol. Existing modules (navigation, homepage-hero, footer) are reference implementations.

## States

Modules support content-shape variations more than interaction states. Typical states:

- `default`
- `no-media` — text-only version
- `long-content` — pushed beyond comfortable length
- `single-item` — when the module accepts a list
- `loaded-state` — for modules that render async data (post-stack)

## When to extract a new component

If module markup includes a UI pattern that:

1. Appears (or could appear) in another module, or
2. Has its own meaningful states (hover, disabled, etc.), or
3. Could be tested in isolation,

→ extract it into `src/components/` first, then compose.

## What modules do NOT do

- Live without at least one component (a module of pure HTML is usually mis-categorized as a component).
- Position themselves on the page (templates do that).
- Fetch data pre-stack. (Post-stack, modules may receive data as props but the fetching belongs in the template/page.)

## Grid

Every module must live inside the project's grid system (defined in `system/space.md → Grid`). Two flavors:

- **Content modules** (Hero, FeatureGrid, Pricing, Testimonial) lay out children across `--grid-cols`. Their root container uses `display: grid; grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr)); gap: var(--grid-gap); padding-inline: var(--grid-margin); max-width: var(--container-max); margin-inline: auto;`. Children declare per-breakpoint spans via per-module custom properties (`--hero-copy-cols: span 6`).
- **Chrome modules** (Nav, Footer bar) only consume the grid's outer metrics — `padding-inline: var(--grid-margin)`, `max-width: var(--container-max)`, and `gap: var(--grid-gap)` for the flex layout. They stay flex internally because they're linear arrangements, not column-based content.

Bespoke widths (hardcoded `48px`, `1024px`, etc.) are forbidden in module CSS for the same reason raw hex is forbidden in color — the system can't customize what it can't see.

## Approval checklist

Before flipping a module to `approved`, CC verifies:

1. Every used component exists in the manifest with `status: approved` (or the user has explicitly accepted the draft dependency).
2. Module-level CSS doesn't override component visual tokens.
3. All declared states render correctly.
4. Responsive behavior matches the breakpoints in `system/space.md`.
5. Accessibility rules pass at the module level (heading hierarchy, landmark roles).
6. **SEO scaffold** (`system/seo.md`):
   - Heading elements (`h1`–`h6`) are used for outline, not visual weight. The module's heading level is appropriate to its typical placement (a hero used as primary page module gets `<h1>`; a card title nested inside a section gets `<h2>` or `<h3>`).
   - Modules with multiple heading-level pieces (a footer with column titles) don't introduce skips against the host page's hierarchy.
   - Images carry `alt`; aspect-ratio container reserves layout space; below-fold images use `loading="lazy"`.
