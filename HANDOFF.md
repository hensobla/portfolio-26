# Handoff — home folder close animation + mobile full-screen view + responsive polish

**Updated:** 2026-06-07
**Branch:** lands via `home/mobile-view-and-close-anim` → merge → `main` → push (origin: `github.com/hensobla/portfolio-26`)
**Session length:** Long. Built the desktop close/reverse animation, then the entire mobile full-screen project view + responsive breakpoint mode-switch, then a chain of polish fixes (animate-in timing, badge layout-shift, edge-to-edge, short-viewport overflow).

> ⚠️ **`home` is still `status: draft` and PROVISIONAL** — names, copy, case-study structure, shot/prototype frames are all placeholder. Don't ratify without the user. **ADRs are being HELD** per the user's standing instruction (capture once the design is finalized, not mid-iteration). See memory `feedback_no_adrs_until_finalized`.

## Current goal

Make the `home` template's open-folder takeover work across **all viewports**: a real **close/reverse** animation (desktop), a **mobile full-screen project view** (the folder grows to fill the screen with one tab + Back), and a **responsive mode-switch** at `--bp-md` so resizing while open adapts cleanly. All built + verified this session. Next requested feature (started reasoning, then user stopped): **tucked tabs behind the active tab + a mono dropdown arrow to switch projects** on mobile.

## State right now

All working, verified in Claude Preview (`loomling-static`, port 8765, `/src/templates/home/preview.html`). Logic lives entirely in `design/src/templates/home/home.js` (`HomeTemplate.init` → `wireTakeover`) + `home.css`.

- **Desktop close** works: click the typed-in "Blake Henson" logo → folder collapses back to the resting cascade, identity returns, logo un-types. Resets the woven tab to **idx0** (left-stacking).
- **Mobile (<`--bp-md`/768px)**: tapping a project grows the folder to **full-screen** (pinned `position:fixed`), painting only the active project's tab + a "‹ Back" logo; Back collapses it. Resets to idx0-woven on rest (smooth, fades the cascade back in).
- **Responsive**: resizing while open re-fits in-mode, or **switches modes** at 768px (desktop spread ↔ mobile full-screen).
- **No console errors** at 375 / 1300×400 / 1300×820 / 390 widths.

## What was done this session

- **Desktop close animation** — `closeFolder()`, `settleResting()`, `restingMetrics()`, `typeOut()` in `home.js`; wired the logo click (was a `location.reload()` stub). Measures the resting target at close-time (clear inline pin → read reflowed layout → restore), reverses the open beats, crossfades the availability badge across the state flip. Resets active tab to idx0 so the resting cascade stacks left-top→right-bottom.
- **Animate-IN timing fix** — identity (name+bio) now exits on `power2.out` over `beat*0.45` so it's gone by the time the folder fills the width (was lingering).
- **Mobile full-screen view** — `openFolderMobile()`, `closeFolderMobile()`, `settleMobile()`, `mobileGeometry()`, `soloTabBox()`, `lockScroll/unlockScroll`, `isMobile()` (`root.clientWidth < --bp-md`, container-aware). Folder pinned `fixed` to the viewport (the stacked mobile page is taller than the screen), scroll locked while open. `buildFolder()` got a `mobileSolo` branch (paints only the active tab); `data-home-view="mobile"` attr drives CSS.
- **Responsive mode-switch** — rewrote the `resize` handler: same-mode → `fitOpenFolder()`/`refitMobile()`; crossed breakpoint → `applyDesktopOpenLayout()` / `applyMobileOpenLayout()` (instant snap, reused as the reduced-motion targets too).
- **Badge layout-shift fix** — the availability badge was `display:none` on mobile-open → popped into flow at close and shoved content down. Now `[data-home-view="mobile"] .home__status { position:static }` keeps it in flow (space always reserved) and JS fades it via `autoAlpha`.
- **Mobile close occlusion fix** — keeping the *last-viewed* tab woven at rest broke the cascade (only the **frontmost/leftmost** tab can be woven without the tabs in front covering its opening). Now the close hands the woven single-tab to **idx0** and fades the rest of the cascade in.
- **Spacing/edge** — bumped mobile top nav strip to `--space-8 + --space-4` (~80px, Back clears the tab); open folder is **edge-to-edge with a `--space-4` (16px) XS margin** on L/R/B (`edge` const in `mobileGeometry`).
- **Short-viewport overflow fix** — the faded resting nav (`visibility:hidden`, still in flow) forced a min-content height on the folder body, so on short viewports the folder overflowed and the panel spilled past the tabs. Fixed: `[data-home-state="open"] .home__folder-nav { position:absolute }` + `.home__folder-body { min-height:0 }`, and `geometry()` clamps `targetH` to `Math.min(root.clientHeight, window.innerHeight)`.
- Reduced narrow-container `.home__panel` padding `--space-5` → `--space-4`.

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Mobile = folder **grows full-screen** (one tab + Back), not an overlay | On-brand (the folder metaphor), reuses the takeover geometry | "Option A" panel-overlay drill-down — built it first, user preferred the folder growing |
| Resting cascade **always resets to idx0-woven** (desktop + mobile close) | Only the frontmost tab can be woven without occlusion artifacts (a middle-woven tab gets covered → broken hierarchy) | Keep last-viewed tab woven — looked broken (see screenshot the user flagged) |
| Mobile folder pinned `position:fixed` + scroll-locked | The stacked mobile page is taller than the viewport; must size to the SCREEN, not the page | Absolute (root-relative) like desktop — overflowed |
| Badge stays in flow on mobile, fades via opacity | `display:none` toggling caused a layout shift at close | — |
| Open folder edge-to-edge with a 16px XS margin (not flush) | Flush clipped the centered 2px border; user wanted "XS amount of space" | True edge-to-edge (2px hairline) — user didn't love it |

## Approaches that didn't work

- **"Option A" mobile overlay** (panel pinned `fixed` over the resting view) — fully built + verified, then replaced when the user chose the folder-grows-full-screen approach.
- **Last-viewed tab woven at rest on mobile** — broke the cascade occlusion (crossing strokes). Fixed by transferring the woven tab to idx0 on close.
- **`display:none` badge on mobile-open** — caused the content-shift-down bug.
- **Spawning a background task to write the ADR mid-edit** — it ran in the main tree and `git reset` clobbered uncommitted `home.js` edits (had to redo). See memory `feedback_no_spawn_task_mid_edit`.

## Files touched

- **Modified:** `design/src/templates/home/home.js` (+413 lines) — close animation, mobile mode, responsive switch, all fixes above.
- **Modified:** `design/src/templates/home/home.css` — open-state nav/body flow fixes, mobile chrome (`[data-home-view="mobile"]` rules: badge in-flow, back chevron, inactive-tab pointer-events), narrow panel padding.
- **Modified:** `design/library/manifest.json` — home running-log note (close animation).
- **Untracked (NOT committed):** `design/decisions/0032-home-folder-close-animation.md` — written prematurely during the clobbering incident; now **partially stale** (predates the mobile work + idx0-transfer). Left untracked per the hold-ADRs instruction. Decide at finalize: update + commit, or remove.

## Git state

```
On branch main (up to date with origin/main)
 M design/library/manifest.json
 M design/src/templates/home/home.css
 M design/src/templates/home/home.js
?? design/decisions/0032-home-folder-close-animation.md
```

`/handoff commit push merge` will: branch `home/mobile-view-and-close-anim`, commit the 3 modified files + this HANDOFF, merge `--no-ff` to `main`, push. `0032` stays untracked.

## Immediate next steps

1. **Tucked tabs behind the active tab** (mobile open) — the user wants the other tabs "tightly tucked behind the active tab… the compact cascade but even more overlap." **Key constraint discovered:** only the frontmost (leftmost) tab can be woven cleanly, so to tuck others behind the *active* (which can be any index), either (a) reorder the SVG paint so the active fill paints last (`insertBefore` the active fill before `art.outline`), or (b) render the active as idx0 and relabel it. Currently mobile uses `mobileSolo` (paints only the active) — that flag would need to relax.
2. **Mono down-arrow dropdown** (mobile) — a `▾` next to the tab that opens a project picker (the real switcher; tucked tabs are decorative). Use `--font-mono` (Departure Mono).
3. **De-provisionalize `home`** — settle tab angle/stagger, real copy + screenshots (lazy mechanism wired, ADR 0031), then flip `draft`→approved and write the held ADRs.

## Open questions / blockers

- **`home` is provisional** — don't ratify look/interaction/content without the user.
- **`0032` ADR** — keep (update) or delete? Held for now.
- Audience + the three voice adjectives (`system/voice.md`) still un-filled (placeholder copy is my voice).

## Gotchas for the next session

- **Preview tab backgrounding freezes rAF → GSAP freezes mid-animation** (`document.hidden` pauses `requestAnimationFrame`; `gsap.ticker.frame` stops advancing, `onComplete` never fires, `opening`/`open` flags get stuck). Symptoms: animations stuck mid-progress, state stuck "open." **To verify logic anyway:** override `window.matchMedia` to force `prefers-reduced-motion: reduce` → open/close run synchronously via `gsap.set` (no rAF). End-state + geometry are then measurable. After a real `cc` restart the tab is visible and animations complete normally.
- **`preview_resize` doesn't reliably fire a `resize` event into the iframe** — to test the responsive mode-switch, dispatch `window.dispatchEvent(new Event('resize'))` manually after resizing.
- **Mobile vs desktop close differ:** desktop resets to idx0 at close *start*; mobile transfers the woven single-tab to idx0 and fades the cascade in. Don't unify them blindly.
- **`buildFolder()` is shared** across resting/desktop/mobile and runs every animation frame (`onUpdate`). The `mobileSolo` flag gates the single-tab paint. The active tab's stroke is empty when woven (its outline comes from `art.outline`, painted last/frontmost).
- **Dark mode** still duplicates the dark block in `tokens.css` (`@media prefers-color-scheme` + `[data-theme="dark"]`) — edit both (ADR 0029).
- Serve the Loom from `design/` (`.claude/launch.json` → `loomling-static`, port 8765). If the preview shows a non-home URL, navigate to `http://localhost:8765/src/templates/home/preview.html`.
