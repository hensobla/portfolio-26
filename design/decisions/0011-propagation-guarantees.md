# ADR 0011 — Propagation guarantees: auto-loader + no-inline-module-markup

**Date:** 2026-05-25
**Status:** accepted

## Context

CLAUDE.md §16 frames the project's primary principle: *"Designer chooses what the page looks like; the system ensures structural correctness automatically. Edits to a module ripple through every consumer."*

By mid-session the contract was breaking in two distinct ways:

1. **Module behavior didn't reach all consumers.** When the navigation module gained a hamburger drawer + `navigation.js`, every template that consumed `navigation` needed to remember to `<script src=".../navigation.js">`. Hand-written templates like `blog-post` didn't, so the hamburger button rendered but didn't do anything. The designer had no way to know this without inspecting the template's HEAD.

2. **Module markup didn't reach all consumers.** Some templates (again `blog-post`) carried their own copy of the navigation HTML as a hand-typed string inside their `preview.html`. When `navigation.html` got a new `.nav__panel` element for the mobile drawer, the inlined copy stayed frozen at its 2026-05-20 shape. Visually the template still rendered, but the new structure was missing — the hamburger button had nothing to toggle.

Both gaps put structural correctness on the designer's shoulders, violating §16. The designer's expectation ("if I edit the navigation, it should work in every page that uses it") was being silently broken by per-template coupling.

## Decision

Adopt two complementary patterns enforced at the project level:

### 1. Auto-loader (`src/loader.js`)

A small (~70-line) helper that scans the rendered DOM for `[data-loom-module="<slug>"]` and `[data-loom="<slug>"]` attributes, then lazy-loads `src/modules/<slug>/<slug>.js` / `src/components/<slug>/<slug>.js` if a JS file exists at that path. 404s are cached so missing JS files don't keep retrying. A `MutationObserver` re-scans added subtrees, so sandbox `postMessage` rebuilds + dynamically injected content also pick up behavior.

Every preview.html includes `<script src="../../loader.js" defer>` (modules) or `<script src="../../../loader.js" defer>` (templates) in its head. This is documented in CLAUDE.md §4e as the authoring contract.

Net effect: a module gaining or losing a JS file is invisible to consumers. The script gets loaded automatically based on what's in the DOM.

### 2. No-inline-module-markup rule (CLAUDE.md §4f)

Templates **must not** carry their own copy of a module's markup. They must instead compose modules via:

- **Iframes** (the test-page pattern, ADR 0004 — *declarative composition*) — each module's `preview.html` is loaded in its own iframe. Composition is declared in `composition.json`. This is the default going forward.
- **Runtime fetch** — for cases where iframes aren't right, template's `preview.html` fetches `/src/modules/<slug>/<slug>.html` at render time and injects it inline. The loader's MutationObserver picks up the injected DOM.

Hand-typed copies of module markup are forbidden by §4f. Existing inlined templates are treated as known-stale liabilities to refactor (see `blog-post` conversion below).

The `blog-post` template was converted from hand-written-inlined to fully composed (`composition.json` listing `[navigation, blog-article, footer]`). The `blog-article` module was extracted to own the article-body markup that previously lived inside the template's `preview.html`.

## Consequences

- Every `preview.html` in the project includes the auto-loader. A module gaining a JS file is invisible to its consumers.
- `blog-post` is now composed (filePath → `composition.json`); module edits propagate to it automatically.
- A new `blog-article` manifest entry exists at the end of `entries[]`. The article body is reusable in other templates.
- The convention is forward-only: existing inlined templates (none currently besides the deleted `blog-post.html` body fragment) would each need conversion if they appear.
- CLAUDE.md §4e + §4f are the canonical statements of the contract. Future CC sessions must read them.

## Alternatives considered

- **Per-template explicit script tags.** Reject reason: it's exactly the pattern that failed. Every consumer has to remember which scripts to load; one forgotten `<script src>` and the module silently doesn't work. Violates §16 (designer responsibility for backend correctness).

- **Bundling / build step that statically links module JS into a single bundle.** Reject reason: Loomling is stack-agnostic (CLAUDE.md §10 — stack adoption is opt-in). Introducing a bundler would conflict with the "no build by default" posture. The loader achieves the same propagation via runtime DOM scanning, which works in any stack the user later adopts.

- **Server-side rendering / SSR includes.** Reject reason: Loomling currently runs as a static file server (`npx http-server`). SSR would require declaring a stack. Same issue as the bundler.

- **Runtime fetch for module markup in *every* preview** (no iframes). Reject reason: iframes provide layout isolation (each module's preview.html owns its own document scope, including `@media` queries, JS state machines). Runtime fetch into the parent document would force every module's CSS/JS to be carefully scoped. Iframes work today via ADR 0004; runtime-fetch is offered in §4f as the fallback when iframes don't fit.

- **Manifest field listing required scripts** (e.g., `"requires": ["navigation.js"]`). Reject reason: redundant with `[data-loom-module]` markup attributes already in the DOM. Adding a manifest field would mean every author has to update *two* places (manifest + the markup). The loader reads the markup, so the markup is the single source of truth.

## Files touched in the originating session (2026-05-25)

- **Created:** `src/loader.js` — the DOM-scan auto-loader.
- **Created:** `src/modules/blog-article/{blog-article.html, blog-article.css, preview.html}` — extracted from blog-post.
- **Created:** `src/templates/blog-post/composition.json` — declarative composition referencing `[navigation, blog-article, footer]`.
- **Modified:** every `src/{templates,modules}/<slug>/preview.html` — `<script src=".../loader.js" defer>` included.
- **Rewritten:** `src/templates/blog-post/preview.html` — composed renderer (test-page pattern).
- **Slimmed:** `src/templates/blog-post/blog-post.css` — composition-level styles only; article styles moved to `blog-article.css`.
- **Deleted:** `src/templates/blog-post/blog-post.html` — body fragment replaced by composition.json.
- **Modified:** `library/manifest.json` — blog-post filePath → composition.json; blog-article entry appended; navigation/footer notes updated.
- **Modified:** `CLAUDE.md` — new §4e (auto-loader), new §4f (no-inline-module-markup).

## Forward links

- ADR 0004 (declarative composition) is the foundation; this ADR formalizes its mandate over hand-written-inlining.
- The same propagation principle is reinforced in CLAUDE.md §16 (designer-vs-backend responsibility).
- Future stack adoption (ADR 0001's deferred decision) may add a build step that statically bundles module JS — at that point the loader can be removed for the bundled output, but should stay for the static-fallback in `library/`.
