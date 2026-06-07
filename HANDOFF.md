# Handoff — home open-folder case studies + responsiveness + perf scaffolding

**Updated:** 2026-06-07
**Branch:** `main` (this session's work lands via `home/panel-content-and-perf` → merge → push)
**Session length:** Long. Built the open-folder case-study panels, then iterated on edge-fades, clipping, responsiveness, a container-query grid, and lazy media loading.

> ⚠️ **`home` is still `status: draft` and PROVISIONAL.** Project names, all copy, the
> case-study structure, and the shot/prototype frames are **placeholder**. Don't ratify
> without the user. The `home` manifest entry `notes` is the authoritative running log.
> Supersedes the prior handoff (folder tabs + dark mode, committed in `f5dcb0e`) — its open
> items that are still open are carried into "Immediate next steps" below.

## Current goal

Fill the open folder body with real case-study content per project and make the expanded
folder behave: never clip, fade at the edges, stay responsive after expansion, and load
project media lazily so it scales when the content gets heavy (real images + prototype
embeds). All four were done this session as **placeholder + scaffolding**; next is real
content, the close/reverse animation, and the mobile-takeover pass.

## State right now

Verified live in Claude Preview (`loomling-static`, port **8765**) at
`http://localhost:8765/src/templates/home/preview.html`, light + dark, no console errors.

- **Per-project case-study panels exist** (`design/src/templates/home/home.html`). Projects
  renamed P1–P4 → **Ledger / Crate / Atlas / Manifold** (tab labels + resting list + panels
  in sync). Each panel: mono meta line (accent figure no · role · year) → display title →
  lead → dimensioned spec row (Role/Team/Timeline/Surface `<dl>`) → 2 body paragraphs (capped
  at `--measure`) → a shot grid → a prototype frame.
- **Tab → panel switching works.** `home.js` `setActive(i)` toggles `.home__panel.is-active`
  + the `hidden` attr + resets `scrollTop`; `revealPanel(i)` fades the active panel in
  (scheduled into the open timeline at `beat·1.1` and on every tab-switch).
- **Edge fades:** `.home__panel` has a `mask-image` top+bottom linear-gradient
  (`--panel-fade = --space-5`) so content dissolves at the folder edges as it scrolls.
- **Clip fix:** the open tab strip grows to the open tab height (`gsap.set(tabsWrap, {height: tabH})`)
  so the folder body starts exactly at the woven folder-top line (was ~8px too high → content
  rode over the tabs).
- **Responsive after expansion:** `home.js` `fitOpenFolder()` + a rAF-throttled `window`
  `resize` listener re-fit the pinned-open folder to the current viewport (an `opening` flag
  guards against fighting the open timeline). The nav availability badge now pins top-right in
  the open state at **all** widths (was colliding with the typed-in logo below 1024px).
- **Shot grid follows `space.md` by PANEL width (ADR 0030):** `.home__panels` is a CSS
  container (`container: panel / inline-size`); `.home__panel-grid` re-maps `--panel-cols` /
  `--panel-gap` from the system `--grid-cols-*` / `--grid-gap-*` tokens via `@container` at
  480/768/1024; `.home__shot` spans tracks → **1-up → 2-up → 4-up**.
- **Lazy media (ADR 0031):** each panel's heavy media (`.home__panel-grid` + `.home__proto`)
  lives in an inert `<template class="home__panel-media">`; `home.js` `hydrateMedia(i)` clones
  it in on **intent** — activation OR `pointerenter`/`focus` on the project's tab or resting
  list item. Verified: **0 live grids at rest**, hover hydrates only that project, others stay
  inert.

## What was done this session

- **`home.html`** — added the 4 case-study panels; renamed projects; wrapped each panel's
  media in `<template class="home__panel-media">`; added `id`/`aria-controls`/`role=tabpanel`/
  `aria-labelledby` wiring between tabs and panels.
- **`home.css`** — panel typography/layout (meta, title, lead, `.home__specs`, body, shot
  frames with blueprint grid-wash, accent-bordered prototype frame); top/bottom `mask-image`
  fade; the `@container` column system + narrow-panel padding/title; open-state badge
  top-right rule + `.home__identity` static when open.
- **`home.js`** — `panelEls`; `setActive` panel toggle + `scrollTop` reset + `hydrateMedia`;
  `revealPanel`; open-timeline panel reveal; tab-switch reveal (immediate + plunge-commit
  paths); `fitOpenFolder` + resize listener + `opening` flag; tab-strip grow-to-`tabH` on open
  (clip fix); `hydrateMedia` + intent-prefetch listeners on tabs and list items.
- **`preview.html`** — `preconnect` to fonts.googleapis/gstatic.
- **`manifest.json`** — brought the `home` `notes` running-log current; **fixed a pre-existing
  invalid-JSON bug** (an unescaped `"presses into"` → `'presses into'`; the file now parses —
  it had been breaking the Loom's Library/Sandbox `fetch().json()`).
- **ADRs 0030 + 0031** written (`design/decisions/`).

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Shot grid via CSS `@container` keyed to `space.md` breakpoints (ADR 0030) | Open folder ≠ viewport and resizes live; must respond to the *panel's* width. Reuses system grid tokens so it literally follows `space.md` | Viewport `@media` (mis-predicts panel width); `auto-fit minmax` (can't honor the specific 4/8/12 counts); JS measurement (CSS is declarative, zero reflow) |
| Each panel's media in an inert `<template>`, hydrated on intent (ADR 0031) | Content will get heavy (4 imgs + prototype × 4 projects); `<template>` guarantees *nothing* loads until cloned; hover/focus prefetch makes clicks feel instant | All-in-DOM + `loading=lazy` (inconsistent for hidden imgs, no `lazy` for embeds); `content-visibility` (render-only, foot-gun with scroll+mask+container query) |
| Tab strip grows to `tabH` on open | Folder body then begins exactly at the woven folder-top line → no content clipping into tabs | Per-panel top inset (fragile, hard-codes the 8px) |
| Badge pinned top-right in open state at all widths | Below 1024px it was an eyebrow in the identity flow → collided with the typed-in logo after takeover | Hiding the badge on narrow (drops content); leaving it (visible collision) |

## Approaches that didn't work / consciously deferred

- **`content-visibility: auto` on shot tiles** — render-only win, and a foot-gun stacked with
  the panel's internal scroll + the edge mask + the container query (scroll-jump risk).
  Deferred; revisit only if render (not bandwidth) becomes the bottleneck.
- **Panel auto-scroll glitch** — the `tabindex="0"` panel auto-scrolled itself (became the
  active scroll container), pushing meta/title out of view. Fixed by `scrollTop = 0` in
  `setActive`.

## Files touched

- **Created:** `design/decisions/0030-container-query-panel-grid.md`, `design/decisions/0031-template-deferred-panel-media.md`, `HANDOFF.md` (this file).
- **Modified:** `design/src/templates/home/home.html`, `home.css`, `home.js`, `preview.html`; `design/library/manifest.json`.

## Git state (before the handoff commits)

```
On branch main (up to date with origin/main)
 M design/library/manifest.json
 M design/src/templates/home/home.css
 M design/src/templates/home/home.html
 M design/src/templates/home/home.js
 M design/src/templates/home/preview.html
```

Per the user's `commit push merge` instruction, this session lands via a topic branch →
topical commits → ADRs + handoff commit → merge to `main` → `git push` (remote:
`github.com/hensobla/portfolio-26`).

## Immediate next steps

1. **Real case-study content** — replace placeholder copy + the FIG/prototype frames with real
   screenshots (`<img loading="lazy" decoding="async" width height>` inside the `<template>`)
   and real prototype embeds (click-to-load, `preload="none"`). The lazy-load mechanism is
   already wired (ADR 0031).
2. **Close / reverse animation** — the nav-logo click is still a `location.reload()` stub
   (`home.js`, bottom of `wireTakeover`). Build a real close that animates the open folder back
   to the resting cascade.
3. **Mobile / medium takeover pass** — the panel content is responsive now, but the **tab
   strip geometry** (4 tabs laid left-to-right) is still desktop-tuned and crowds below ~480px.
   The takeover geometry (root padding + `navH` strip) also wants a small-screen pass.
4. **De-provisionalize `home`** — settle tab angle (26.6°), stagger/spread, hidden numbers,
   name weight 400, the 4-up desktop grid ceiling; then flip to approved + write the remaining
   ADRs (tab look/interaction still has none).

## Open questions / blockers

- **`home` is provisional** — don't ratify the look/interaction/content without the user.
- **Audience** (hiring managers, said verbally) still not written to `project.json.answers`;
  the three **voice adjectives** in `system/voice.md` are still un-filled. Offer to capture when
  resuming copy work (the placeholder copy I wrote is my voice, not a ratified one).
- **Desktop grid ceiling = 4-up.** Easy dial to 2-up (`lg+` `--shot-span: 6`) if 4 across feels
  too dense once shots are real screenshots.

## Gotchas for the next session

- **Serve the Loom from `design/`** — preview config `.claude/launch.json` → `loomling-static`
  (http-server on `design`, port 8765), serving `/src/templates/home/preview.html`. If the
  preview shows `chrome-error://`, just `preview_start` `loomling-static` again. `launch.json`
  is gitignored.
- **`manifest.json` is loose JSON.** It previously contained an **unescaped double quote** that
  broke `JSON.parse` (fixed this session). When editing the `notes` field, use **single quotes**
  for inline quotes (the file's convention) and validate with
  `node -e "JSON.parse(require('fs').readFileSync('design/library/manifest.json','utf8'))"`.
- **Panel media is in `<template>`** — `panel.querySelector('.home__panel-grid')` returns `null`
  until `hydrateMedia(i)` runs. That's by design (ADR 0031), not a bug.
- **Container queries** drive the shot grid — to change tiles-per-row, edit the `@container`
  blocks in `home.css`, not a viewport `@media`. The container is `.home__panels`.
- **The folder is 100% JS-rendered** (carried from prior session) — `home.js buildFolder()`
  paints the SVG tab/folder art from `offset*` geometry. To change tab visuals, edit the path
  building in `buildFolder`, not CSS.
- **Verifying spring/timeline animations** from static screenshots is hard — drive via
  `preview_eval` (`.click()` then a `setTimeout` promise), or read state directly.
- **Dark mode duplicates the dark block** in `tokens.css` (`@media prefers-color-scheme` +
  `[data-theme="dark"]`) — edit both (ADR 0029).
