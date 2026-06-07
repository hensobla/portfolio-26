# ADR 0031 — Template-deferred per-project media with intent hydration

**Date:** 2026-06-07
**Status:** accepted

## Context

The Blueprint homepage's open folder holds one case-study **panel** per project (4 today:
Ledger / Crate / Atlas / Manifold). Each panel will eventually carry **heavy media** — a
2×2 (now 1/2/4-up, ADR 0030) grid of real screenshots plus an interactive **prototype**
embed (video or iframe) — and only **one** panel is shown at a time (the active tab).

Today the media is placeholder (CSS-drawn frames), so the page is light. But the user asked
to prepare the loading strategy "under the assumption that the content in each project will
get heavy," and floated "load more in the background immediately." With four heavy panels
in the DOM, loading them all eagerly would waste bandwidth and decode/layout work on three
projects the visitor may never open.

Measured baseline (Loom preview, localhost): FCP ~84ms; the only real structural cost is a
serialized font `@import` chain (`tokens.css → fonts.css → Google CSS → woff2`) and a 72KB
sync GSAP. The content itself is fetched-then-injected by `preview.html` (client-rendered),
which the Next port (ADR 0027) replaces with SSR. So the durable lever is **per-project
media loading**, not the preview harness.

## Decision

1. **Each panel's heavy media lives in an inert `<template class="home__panel-media">`** —
   the `.home__panel-grid` (shots) + the `.home__proto` frame. Browsers do **not** parse-load
   or render `<template>` content, so an unopened project costs **zero** network and render.
   The **light text** (meta, title, lead, spec row, body) stays in the live DOM — cheap, and
   good for first paint / future SEO.

2. **`home.js` `hydrateMedia(i)` clones the template into the panel on INTENT**, once
   (guarded by `panel.dataset.hydrated`):
   - **Activation** — `setActive(i)` (folder open or tab-switch) hydrates the project being shown.
   - **Prefetch** — `pointerenter` / `focus` on a project's **tab** (open state) or its
     **resting list item** (index) hydrates it ahead of the click. This is the
     "load in the background immediately" hook: hovering starts the fetch before you commit.

3. **When the frames become real assets**, the deferral is already correct: put
   `<img loading="lazy" decoding="async" width height>` inside the template (the `width/height`
   prevent layout shift), and make prototypes **click-to-load** (`preload="none"`, swap the
   embed in on click) so four videos never autoload.

## Consequences

**Positive:**
- Unopened projects are free; the visitor downloads/decodes only what they look at.
- Hover/focus prefetch makes switching feel instant without eager-loading everything.
- It's the right *foundation* — adding heavy assets later is a content edit inside the
  template, no mechanism change.
- Ports cleanly to React/Next as conditional rendering + `next/image` lazy loading.

**Negative / costs:**
- The media isn't in the static DOM, so it's invisible to no-JS clients and naive crawlers.
  **Acceptable here:** the panels are *only reachable through the JS-driven folder takeover*
  — a no-JS visitor never opens the folder, so templating the media regresses nothing they
  could have seen. (If SEO of case-study media ever matters, the Next port should
  server-render the active project, not rely on this client hydration.)
- Slight indirection: "where's the grid?" — it's in the panel's `<template>` until hydrated.
  Documented in the markup comment and the manifest note.

## Alternatives considered (rejected)

- **All media in the DOM + `<img loading="lazy">`.** `loading="lazy"` on images inside a
  `display:none` panel has inconsistent cross-browser deferral, you still pay parse + DOM
  weight for three hidden projects, and **prototype embeds (iframe/video) have no `lazy`
  equivalent** — they'd be in the DOM regardless. `<template>` is the only thing that
  guarantees *nothing* loads.
- **`content-visibility: auto` on the tiles.** Saves *render* work, not *network*, and it's
  a foot-gun stacked with the panel's internal scroll + the top/bottom mask + the container
  query (risk of scroll-jump from wrong `contain-intrinsic-size`). Deferred — revisit only
  if render cost (not bandwidth) becomes the bottleneck.
- **`<link rel="prefetch">` per asset on hover.** More plumbing, needs a known URL manifest,
  and doesn't handle the render/decode cost. Hydrate-on-intent covers both network and DOM
  in one mechanism.

## Files touched

- **Modified:** `design/src/templates/home/home.html` — wrapped each panel's grid + proto in
  `<template class="home__panel-media">`.
- **Modified:** `design/src/templates/home/home.js` — `hydrateMedia(i)`; called from
  `setActive` (activation) and from `pointerenter`/`focus` on tabs + resting list items
  (prefetch).
- **Modified:** `design/src/templates/home/preview.html` — `preconnect` to
  fonts.googleapis/gstatic (preview-only; parallelizes the serialized `@import` font chain —
  the Next port self-hosts via `next/font` and drops the chain).
- **Created:** this ADR.

## Forward links

- Real assets: `<img loading="lazy" decoding="async" width height>` in the templates;
  prototypes `preload="none"` / click-to-load. The hydrate path needs no change.
- The Next port (ADR 0027) should reframe this as conditional render of the active project +
  `next/image`; keep the hover-prefetch as a `router.prefetch`-style warm.
- Font chain (`fonts.css` `@import`) is a Loom-preview cost only; ADR 0027's port already
  plans `next/font`, so no ADR needed there — just don't carry the `@import` upward.
