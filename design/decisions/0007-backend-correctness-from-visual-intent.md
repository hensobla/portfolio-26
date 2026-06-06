# 0007 — Backend correctness from visual intent

**Date:** 2026-05-20
**Status:** accepted
**Context:** The user is a designer operating Loomling. They care about how the page looks and feels — composition, visual states, content, layout intent. They do not — and should not have to — think about technical correctness in the rendered backend: semantic HTML tags, heading hierarchy, ARIA attributes, alt-text fallbacks, link `rel` attributes, JSON-LD structure. Up to this ADR, several of those concerns leaked into the designer's mental load. Most concretely: a module like `homepage-hero` hardcoded `<h1>` regardless of where it sat in a composition, and the original Finalize protocol's response to "what if it's used as a secondary section?" was to expose a heading-level slot in the Page Builder inspector for the designer to set. That's a designer-facing knob for a backend correctness concern — the wrong direction.

The user articulated the principle: *"As long as I can visually control the Elements, you should control the backend. This means your job is to be as flexible as possible so that however I choose to use my Elements, they are coded correctly by the time it gets published."*

**Decision:** Adopt a system-wide principle (codified as `CLAUDE.md §16`): the designer controls visual + compositional choices; CC + the Loom runtime control structural correctness. Specifically:

1. **No new configurability for backend correctness is exposed to the designer.** No heading-level dropdown in the Page Builder inspector, no alt-text-required modal, no "is this the page's primary section?" toggle. These values are computed.
2. **Modules declare what they emit, not how to configure it.** A module that contains a primary heading declares `headings: [{ slot, role: "primary" }]` in its manifest entry — that's metadata for the composing layer, not a designer-facing input.
3. **Composing layers (composed template renderer, Page Builder canvas) do the computation.** They walk the composition in order, look up each module's declarations, and compute the right values per instance. The values are pushed to each module's iframe via the existing slot postMessage protocol, using reserved keys prefixed with `_` (e.g., `_heading-level`) so modules can distinguish system-set values from content slots.
4. **Modules accept the computed values and render accordingly.** No fallback prompt to the designer; if the system can't compute a value, the module uses a safe default (e.g., `<h1>` for a hero standalone) that won't actively break composition.

The first concrete instantiation is **auto-assigned heading levels**:

- `homepage-hero` manifest now declares `headings: [{ slot: "headline", role: "primary" }]`.
- The hero's `preview.html` renderer accepts a `_heading-level` value via `loom:content` and emits `<h${level}>` instead of hardcoded `<h1>`.
- `test-page/preview.html` (the composed template renderer) fetches the manifest at load, walks `composition.modules` in order, assigns levels 1/2/3... to each primary-heading instance, and pushes them to the iframes.
- `library/builder.js` (the Page Builder canvas) does the same, plus re-pushes on every reorder so the levels stay correct as the designer rearranges.
- Visual styling on `.hero__headline` is tag-agnostic (CSS targets the class), so the tag swap doesn't change appearance — the principle from `system/seo.md`.

**Consequences:**

- **The designer never thinks about heading levels.** They add a hero to a page → it's `<h1>`. They add a second hero → it's `<h2>`. They reorder so a different module is first → levels shift to match. Same for any other backend-correctness concern that fits this pattern.
- **Modules absorb a small responsibility increase.** Each module with a primary heading must declare it in the manifest and accept the `_heading-level` key in its renderer. ~10 lines of code per module, mechanical to add.
- **Composing layers absorb the bookkeeping.** Both the composed template renderer and the Page Builder canvas need to fetch the manifest, walk the composition, and push the computed values. ~30 lines per surface, also mechanical.
- **The principle generalizes to other concerns.** When the next backend-correctness need surfaces (a module that needs auto-`rel="noopener"` on external links, a button whose accessible name needs to fall back, an image whose alt text needs to derive from context), the same pattern applies: module declares what it emits, composing layer computes the value, value is pushed via a reserved underscore-prefixed key.
- **Modules with no `headings` declaration are unaffected.** Backward-compatible by default. The `headings` field is optional in the manifest schema.
- **The Page Builder inspector remains clean.** No new fields. Reserved keys starting with `_` are filtered from any future inspector field iteration.

**Alternatives considered:**

- **Expose `heading-level` as a designer-facing slot.** Originally proposed in the conversation that produced this ADR. Rejected: violates the principle. The designer would have to know when to set it (when adding a hero in a non-primary position), which is exactly the backend reasoning they want to avoid.
- **DOM-rewrite the iframe contents after load** to fix heading tags post-render. The composing layer walks the rendered DOM and swaps tag names where needed. Rejected: more invasive, harder to reason about, doesn't let modules participate in their own correctness, fragile if module rendering changes structure.
- **Bake heading levels into composition.json at finalize time** (instead of computing at render time). Rejected: composition.json then needs re-finalize on every reorder. Runtime computation makes the same data live; reorder updates levels on next render.
- **Split modules into "primary" and "secondary" variants** (e.g., `homepage-hero` and `section-hero`). Rejected: doubles the module count for what is a structural difference, not a visual one. The whole point of Loomling's class-based styling is that the same module can serve both roles structurally.
- **Pre-compute and inject at the template `<head>` level** (e.g., declarative `<style>` rules that swap heading semantics). Rejected: HTML doesn't permit changing element types via CSS; would require web-component shims.
- **Let modules emit semantic-neutral elements** (`<div role="heading" aria-level="2">`) instead of `<h1>`–`<h6>`. Considered. Rejected for v1: native heading elements have the broadest tooling and crawler support; div-based headings are a fallback for cases where the actual tag can't be controlled. Loomling can control the tag, so we should.

**Follow-up cases this principle will be applied to:**

- **External-link `rel` attributes** — module renderers detect off-site URLs in slot overrides and apply `rel="noopener noreferrer"` automatically.
- **Image alt-text fallbacks** — when an image slot ships empty but the module isn't in a "no-image" state, the alt should default to a context-derived description (or empty for decorative images per `system/seo.md` §5).
- **Button accessible names** — buttons with no slot label should derive an accessible name from the surrounding context or fail-loud rather than ship silently.
- **JSON-LD enrichment at finalize** — additional structured data fields could be auto-derived from composition.json (e.g., `Article.author` from a byline slot if present).

Each follows the same pattern: module declares what it emits → composing layer computes the right value → value pushed via reserved key → module renders accordingly. None show up in the Page Builder inspector.
