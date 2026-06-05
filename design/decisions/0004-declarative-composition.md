# 0004 — Declarative composition for Builder-produced templates

**Date:** 2026-05-20
**Status:** accepted
**Supersedes:** the inlining step of ADR 0003 (Finalize protocol, original step 3)
**Context:** ADR 0003 established CC-mediated paste as the way the Page Builder writes pages to disk. The original Finalize protocol had CC concatenate each module's HTML into a `<slug>.html` body fragment + inline the same markup into `preview.html`. The result was a frozen snapshot: edit `navigation.html` afterwards and CSS changes flow through (because preview.html links to `navigation.css`), but markup changes are stranded — the composed template ships the old structure forever, even though the rest of the project has moved on.

The user articulated the principle that drove this revisit: *"Whenever changes to a reusable element happen, they should propagate everywhere. That's kind of the point of having a design system."* Inlining violates this.

**Decision:** Composed templates produced by the Page Builder no longer inline module HTML. Instead:

1. A new file `composition.json` carries the declarative composition: which modules, in what order, in which state, with which slot overrides, plus the SEO metadata.
2. `preview.html` becomes a **runtime renderer**: it fetches `composition.json` on load, creates one `<iframe>` per module entry pointing at the module's canonical `preview.html`, syncs each iframe's height to its content, and postMessages the recorded slot overrides via the existing `loom:content` / `loom:ready` protocol.
3. Composed templates have no `<slug>.html` body fragment. The manifest's `filePath` points at `composition.json`.
4. Module markup is now loaded **live** from each module's own files on every page load. Edit `src/modules/navigation/navigation.html` (and its sibling `preview.html` postMessage handler) and every composed template that references navigation re-renders with the new markup on next visit.

Hand-written templates (e.g., `blog-post`) are unchanged — they continue to carry their own `<slug>.html` body fragment because their markup is genuinely bespoke. `system/templates.md` documents the two flavors.

**Consequences:**

- **The design-system propagation guarantee now extends to HTML, not just CSS.** This is the architectural correction the user asked for.
- **One fewer source of drift to track.** Without inlining, there's no "what was the composed page's markup at finalize time" to compare against the module's current state. The page IS the module, every load.
- **Each module loads in its own iframe with its own document and viewport.** Each module's media queries fire based on the iframe's width — which, when nested inside the Sandbox's own iframe, matches the parent's viewport (the iframes are 100% width). Layout behaves correctly through the chain.
- **Each module on a page costs one extra HTTP fetch + one extra document context.** Modest pre-stack; post-stack adoption can replace iframes with framework-native module components.
- **SEO head is still hardcoded in preview.html** (mirrored from composition.json). Crawlers and social-card bots don't run JS, so meta tags must be static HTML at request time. Editing SEO requires re-running the Finalize protocol so CC regenerates both files — accepted friction.
- **The Page Builder's existing payload format becomes the source-of-truth shape.** `composition.json` is the payload's `seo` + `modules` fields plus a schema version and timestamps. The Builder can be extended later to re-open an existing composition.json into the canvas (round-trip editing), since the format is its own input.
- **ADR 0003's persistence story still holds.** CC-mediated paste, no sidecar, Loom stays read-only. This ADR only changes what CC writes, not how the writing is triggered.

**Alternatives considered:**

- **Keep inlining, add an explicit "rebuild composed templates" command** that re-runs the Finalize protocol against every composition. Rejected: requires the user to remember to run it, and silent drift accumulates between rebuilds. The propagation should be automatic, not opt-in.
- **Compose at build time via a static-site generator** that reads composition.json + module files and emits inlined HTML. Rejected for v1: introduces a build dependency before the user has declared a stack, which violates `CLAUDE.md §11` (no silent stack adoption). Post-stack, the framework's own component composition replaces this.
- **Web Components / Custom Elements** instead of iframes. Each module becomes a custom element that loads its own shadow DOM. Rejected: web components don't isolate styles cleanly without manual shadow-DOM authoring per module, and our existing modules aren't authored as custom elements. The iframe approach reuses the postMessage protocol already in place.
- **`<object>` or `<embed>`** instead of `<iframe>`. Functionally similar but worse cross-origin behavior and less consistent height-sizing APIs. No upside.
- **Server-side includes / fetch + innerHTML** at runtime to inline the module HTML on demand. Rejected: bypasses each module's own preview.html (which carries the slot postMessage handler), so slot overrides would need a parallel rendering path. The iframe approach reuses the module's own renderer end-to-end.
- **Generate composed templates as static HTML but tag the lineage** (the ADR 0003 + Phase 3 hybrid earlier discussed). Rejected as the primary mechanism because it still requires explicit re-finalize. Lineage tagging may still be useful for Phase 2 (where-used reports on approval), but that's a separable concern.

**Migration:** The single existing composed template (`test-page`) was rewritten in the same turn this ADR was authored — `test-page.html` deleted, `composition.json` written, `preview.html` rewritten as a renderer, manifest entry's `filePath` updated. No other migrations needed (only one composed template existed).

**Follow-up work this enables:**

- **Phase 2 (where-used on approval).** With `composition.json` storing explicit module references, scanning "which templates use module X" is a one-line filter. The original ADR 0003 lacked this affordance.
- **Phase 3 (edit-from-approved snapshot + revert).** Independent of this ADR; the snapshot lifecycle applies equally to modules and components regardless of how templates compose them.
- **Round-trip Builder editing.** A future Builder action "open this template" can read `composition.json` directly into the canvas state. The format is already aligned.
