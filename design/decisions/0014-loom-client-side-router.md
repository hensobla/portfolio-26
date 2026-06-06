# ADR 0014 — Loom client-side router (content-swap SPA, vanilla)

**Date:** 2026-05-27
**Status:** accepted

## Context

The Loom is a multi-page app: Library / System / Components / Builder / Settings, each a separate HTML document in `library/`. Every tab click was a full document navigation. The user reported this felt **jittery**:

> "It's still very jittery when clicking. I like the UI, but maybe it's time to think differently about how to build this. It's important to me that it feels smooth and responsive."

Sources of the jitter:

1. Brief white flash between documents during navigation.
2. Every page-specific script restarts from zero — `tokens.js` re-renders all swatches, `primitives.js` re-fetches the manifest, `brand.js` re-resolves the logo.
3. Sidebar collapse state has to re-apply from `localStorage` via the head-injected sync script (works, but is one more thing happening during the load).
4. Stylesheets re-parse (cached but still).
5. The match-media listeners and scroll-spy observers in `tokens.js` and `library.js` all rebuild.

A first attempt at fixing this was rejected by the user (see *Attempt 1* below).

## Decision

**Vanilla JavaScript client-side router** at `library/loom-router.js`. The router intercepts `.lib-tab` clicks, fetches the destination HTML in the background, parses out just the `<main>` element, and swaps it into the current document. Header / brand / theme / sidebar collapse state / matchMedia listeners / scroll-spy observers all survive the navigation untouched.

Direction-aware horizontal slide transitions via the View Transitions API (`document.startViewTransition`). When clicking a tab to the right of the current page, old `<main>` slides out left and new slides in from right; reverse for leftward clicks. 180ms, ease-out, 8% translate — short and subtle. Browsers without View Transitions support (Firefox <130) get the swap without animation — no harm.

**Authoring contract (the rest of the page scripts):**

1. Each page script wraps its work in an `init()` function gated on `document.body.dataset.page`.
2. The init function is registered on `window.LoomPages[<page>]`. The router calls it after every successful swap; it also self-invokes on script load.
3. Document- and window-level listeners (resize, matchMedia, keydown, custom events) install behind closure flags so they install once per session, not per nav. Element-bound listeners inside `<main>` die naturally with the old DOM and CAN safely re-attach each nav.
4. The `loom:nav` event on `document` is the explicit re-init signal; each page script also listens for it as a fallback.

**Hard rules:**

- **Modals must live inside `<main>`.** Anything in `<body>` outside `<main>` stays attached to whichever page the user first loaded. The Tokens Import modal lives inside Settings's `<main>` for this reason.
- **All page scripts load on every page.** Each gates on `data-page` and no-ops elsewhere. This is the cost of SPA-style nav without server-side script loading.
- **`tokens.js`'s bootstrap IIFE is at end-of-file.** It references `const TokensImport = (() => {...})()` declared above. Moving the bootstrap to the top puts the const in the Temporal Dead Zone (this happened during development — see *Approaches that didn't work*).
- **`document.startViewTransition()` callback runs synchronously.** Don't pass an async function; the transition resolves immediately and skips the animation. The router fetches BEFORE calling `startViewTransition`, then runs the synchronous swap inside.

**Builder is special**: its global listeners reference `BuilderApp` instance state. Closure flags would prevent double-binding but not stale-instance handlers. Solution: each `BuilderApp` instance owns an `AbortController`. Its two global listeners bind with `{ signal: this.abortCtrl.signal }`. The router calls `currentBuilderApp.teardown()` (which aborts) before instantiating a new app on the new DOM. Sortable.js is lazy-loaded on first Builder entry to keep the ~50KB cost off the other pages' critical path.

## Consequences

**What survives navigation now:**

- Header (brand + nav tabs) — never reloads
- Theme application (light/dark)
- Sidebar collapse state (on `<html>`)
- Dev-tokens preview banner
- All matchMedia listeners, scroll-spy observers, document-level keydown handlers
- Any in-memory caches (manifest.json, project.json fetches)
- JS module state generally — variables declared once stay assigned

**Cost paid:** Every page now loads ~150KB of page-specific JS (library.js + tokens.js + primitives.js + settings.js + builder.js) on initial load instead of just the script(s) it needs. For a dev tool, this is acceptable. Browsers cache aggressively across same-origin pages.

**Stays inside the rule** "the library viewer stays vanilla HTML/CSS/JS forever" (CLAUDE.md §11): the router is hand-written vanilla JS, no framework, no dependency, no package.json. Each page HTML file remains valid as a standalone document — disable JS and the tabs still work via regular navigation.

**Progressive enhancement preserved.** If the router script fails to load or `fetch()` errors out, the router falls back to `window.location.href = href` and the user gets a normal full-page navigation. They never get stranded.

**Builder's first nav-INTO is slightly slower** (network fetch of Sortable.js on first entry). After that, cached and instant. Worth `requestIdleCallback`-preloading from any page if it becomes a felt issue.

## Approaches that didn't work (and why)

### Attempt 1: Link prefetch on hover + cross-document View Transitions (no router)

`@view-transition { navigation: auto }` in CSS asks Chrome/Safari to crossfade between full document navigations. Combined with `<link rel="prefetch" as="document">` injected on tab hover, the destination HTML would be in cache by the time of the click.

User feedback:

> "It's still very jittery even when I move slow; let's remove the added code since it's not achieving the effect we want."

The fundamental problem: even with the prefetch and the crossfade, every script still ran from zero on the new document. The "smooth" was just the animation hiding the tear-down, not eliminating it. JS state didn't survive. Sidebar collapse re-applied from localStorage. The brand text flashed in late.

Reverted entirely: `nav-transition.js` deleted, CSS `@view-transition` + `view-transition-name` block removed, script tags removed from all five pages. None of it was load-bearing.

### Attempt 2: First router pass with the bootstrap IIFE still at the top of `tokens.js`

When `tokens.js` was first refactored to support re-init, the bootstrap IIFE stayed near the top (where it had been). It called `TokensImport.wire()` at the end. But `const TokensImport = (() => {...})()` was declared near line 685 — well below the IIFE. At IIFE-runtime, `TokensImport` was in the Temporal Dead Zone.

Symptom: clicking Settings's Import button on a router-loaded Settings page did nothing. The click listener was never attached because `TokensImport.wire()` threw a `ReferenceError: Cannot access 'TokensImport' before initialization` inside the IIFE, aborting before reaching the wire call.

Fix: moved the entire bootstrap IIFE to end-of-file. Same fix as the earlier `let hoveredGridBp` TDZ bug; same root cause (function declarations hoist, `let`/`const` don't).

### Attempt 3: Modals at body level (outside `<main>`)

The Tokens Import modal was initially placed in Settings between `</main>` and `<script>` tags. Router swapped `<main>`, modal stayed put on whichever page the user first loaded. Open the modal from Settings after a router nav — element not in DOM, button click was a no-op.

Fix: moved both modals inside `<main>`. They now travel with the swap.

## Alternatives considered (not implemented)

- **Framework-based SPA** (React Router, Vue Router, etc.) — would have explicitly violated CLAUDE.md §11's "static viewer stays vanilla forever" rule.
- **Turbo / htmx** — middle-ground libraries that do exactly what the router does. Rejected to avoid introducing a tooling dependency in `library/`; a hand-rolled ~150-line router is sized comparably to vendoring the library.
- **Full SPA refactor with route modules** — would have meant collapsing all five page HTMLs into one `index.html` with JS-rendered routes. Best feel, biggest refactor, and a riskier rewrite for a working scaffold. Could be considered if the current approach starts feeling fragile, but as of this ADR, the content-swap router covers the use case with much less churn.
- **`view-transition-name` on `.lib-side`** (so the sidebar morphs in place during nav) — rejected because sidebar content is genuinely different per page (System has 9 foundation icons, Components has 6 component icons). Sliding it with `<main>` is the right metaphor.

## Files touched in the originating session (2026-05-27)

- **Created:** `library/loom-router.js` — the router. Click intercept, fetch, parse, swap, history pushState, View Transitions wrapper, popstate handler.
- **Modified:** `library/tokens.js` — bootstrap IIFE moved to end-of-file. `initTokens` + `initImportTile` extracted and registered on `LoomPages.tokens` / `LoomPages.settings`. Global listeners (matchMedia, resize) guarded with `tokensGlobalListenersInstalled` flag. `TokensImport.wire()` guards its document listeners with `docListenersInstalled` flag + element-level `loomInit` dataset.
- **Modified:** `library/library.js` — `initLibrary` registered on `LoomPages.library`. `wireSideToggle()`'s document listeners refactored to module-level `closeIfOpenOutside` / `escapeIfOpen` functions that re-query `.lib-side` each fire (so they keep working after `<main>` is swapped), guarded with `sideToggleDocListenersInstalled`.
- **Modified:** `library/primitives.js` — `initComponents` registered on `LoomPages.components`. Existing closure sets (`cssLoaded`, `jsLoaded`, `jsAbsent`) already idempotent.
- **Modified:** `library/settings.js` — `initSettings` registered. Wraps `LoomPages.settings` (calls tokens.js's version first, then runs Brand / Dark mode / Archive wiring). `_docWired` flags on `LogoUpload` and `DarkModeSetting` modules.
- **Modified:** `library/builder.js` — IIFE → `initBuilder` function. Module-level `currentBuilderApp` reference. `BuilderApp` constructor adds `abortCtrl`; `teardown()` aborts it. The two global listeners (`window.message`, `document.keydown`) bind with `{ signal: this.abortCtrl.signal }`. `ensureSortableLoaded()` lazy-injects Sortable.js on first run.
- **Modified:** `library/sidebar-collapse.js` — `wireToggle()` re-attaches on each `loom:nav`. Uses `dataset.loomInit` on the toggle button to avoid double-wiring the same DOM element.
- **Modified:** `library/library.css` — added View Transitions block: 4 keyframes (`loom-enter-right/left`, `loom-exit-right/left`), `::view-transition-old/new(root)` rules selecting on `html[data-loom-nav-direction]`, `view-transition-name: lib-header` to anchor the header, `prefers-reduced-motion: reduce` collapses duration to 1ms. Also `.lib-side { z-index: 10 }` so its hover tooltips paint above the content column.
- **Modified:** All five page HTMLs — added shared script bundle (`library.js`, `tokens.js`, `primitives.js`, `settings.js`, `builder.js`, `sidebar-collapse.js`, `loom-router.js`). Added Components tab to nav (paired with the page split, ADR-worthy in its own right but bundled here).

## Forward links

- If a new page is added to the Loom (a sixth tab), it needs to: (1) add itself to `TAB_ORDER` in `loom-router.js` (preserves slide direction math), (2) add itself to `ROUTABLE_PAGES`, (3) get a unique `data-page` value on `<body>`, (4) load all the shared scripts in the same order, (5) register `LoomPages.<page>` from its own page script. Components page is a recent example to mirror.
- If a script script needs a global listener that the existing closure-flag pattern can't cleanly handle (e.g., its handler closes over per-init state), follow Builder's `AbortController` pattern instead.
- If a modal is needed in a new page, put it inside `<main>` — see *Hard rules* above.
- The minimum viable LoomPages registration is in `sidebar-collapse.js` — it doesn't gate on `data-page` because it's relevant on every page. New always-on shared scripts can follow that shape.
- Future smoothness improvements, if any: (a) preload Sortable.js on idle from any page so the first Builder entry has it cached; (b) use `view-transition-name` to morph specific elements that ARE shared (e.g., a banner that appears on multiple pages); (c) consider whether the 180ms duration should be a token in `tokens.css`.
- This ADR formally rejects the framework-SPA approach. If a future session is tempted to add React Router etc., re-read §11 first and confirm whether the content-swap router has actually hit a wall — as of writing, it covers every observed case.
