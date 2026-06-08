# Handoff — home folder close animation + mobile full-screen view + responsive polish

**Updated:** 2026-06-07 (rev 2 — added the close-height-jump fix)
**Branch:** `main` (this turn's fix lands directly via `commit push`; prior session work already merged + pushed)
**Session length:** Long. Built the desktop close/reverse animation, the mobile full-screen project view + responsive breakpoint mode-switch, then a chain of polish + bug fixes (animate-in timing, badge layout-shift, edge-to-edge, short-viewport overflow, and the close-height miscalc).

> ⚠️ **`home` is still `status: draft` and PROVISIONAL** — names, copy, case-study structure, shot/prototype frames are all placeholder. Don't ratify without the user. **ADRs are being HELD** per the user's standing instruction (capture once the design is finalized, not mid-iteration). See memory `feedback_no_adrs_until_finalized`.

## Current goal

Make the `home` template's open-folder takeover work across **all viewports**: a real **close/reverse** animation (desktop), a **mobile full-screen project view** (folder grows to fill the screen with one tab + Back), and a **responsive mode-switch** at `--bp-md` so resizing while open adapts cleanly. All built + verified. Next requested feature (user reasoned through it then **stopped** the work): **tucked tabs behind the active tab + a mono `▾` dropdown to switch projects** on mobile.

## State right now

All working, verified in Claude Preview (`loomling-static`, port 8765, `/src/templates/home/preview.html`). Also live-tested by the user on an **iPhone Safari** via the Mac's LAN IP (`http://192.168.68.140:8765/src/templates/home/preview.html` — same-Wi-Fi only; server binds `*:8765`). Logic lives entirely in `design/src/templates/home/home.js` (`HomeTemplate.init` → `wireTakeover`) + `home.css`.

- **Desktop close** collapses the folder back to the resting cascade, resets the woven tab to **idx0**.
- **Mobile (<768px)**: tap a project → folder grows **full-screen** (`position:fixed`, scroll-locked) with one tab + "‹ Back"; Back collapses it (resets to idx0-woven, fades the cascade in).
- **Responsive**: resize re-fits in-mode or **switches modes** at 768px.
- **Just fixed (this turn):** the iOS "close miscalculates height then jumps" bug — the close now measures the resting height correctly (verified target == settled, 365==365 on desktop + mobile, zero jump).
- **No console errors.**

## What was done this session

- **Desktop close animation** — `closeFolder()`, `settleResting()`, `restingMetrics()`, `typeOut()`; wired the logo click (was a `location.reload()` stub). Measures the resting target at close-time, crossfades the badge over the state flip, resets active to idx0 (left-top→right-bottom stacking).
- **Animate-IN timing** — identity exits on `power2.out` over `beat*0.45` (gone by the time the folder fills the width).
- **Mobile full-screen view** — `openFolderMobile/closeFolderMobile/settleMobile`, `mobileGeometry`, `soloTabBox`, `lockScroll/unlockScroll`, `isMobile()`; `buildFolder()` `mobileSolo` branch; `data-home-view="mobile"` drives CSS.
- **Responsive mode-switch** — `resize` handler: same-mode `fitOpenFolder()`/`refitMobile()`; crossed-breakpoint `applyDesktopOpenLayout()`/`applyMobileOpenLayout()` (also the reduced-motion targets).
- **Badge layout-shift fix** — badge kept in flow on mobile (`position:static`) + faded via `autoAlpha` (was `display:none` → popped content down on close).
- **Mobile close occlusion fix** — woven single-tab transfers to **idx0** on close (only the frontmost tab weaves cleanly; a middle-woven tab gets covered → broken cascade).
- **Spacing/edge** — mobile top nav strip `--space-8 + --space-4` (~80px); open folder edge-to-edge with a `--space-4` (16px) margin (`edge` const in `mobileGeometry`).
- **Short-viewport overflow fix** — `[data-home-state="open"] .home__folder-nav { position:absolute }` + `.home__folder-body { min-height:0 }`; `geometry()` clamps `targetH` to `Math.min(root.clientHeight, window.innerHeight)`.
- **Close-height-jump fix (this turn)** — the close was measuring the resting height *while still in the open state*, where the above short-viewport CSS collapses the body (nav out of flow) → measured ~136px → settle flipped to resting (nav in flow, ~365px) → **snap**. Fix: `restingMetrics()` and `closeFolderMobile()`'s inline measurement now temporarily set `data-home-state="resting"` during the read so the nav is in flow; also `openFolder()`'s reduced-motion branch now uses `autoAlpha:0` (not `display:none`) for `[list,title]` so the nav always has measurable resting space.
- Narrow-container `.home__panel` padding `--space-5` → `--space-4`.

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Mobile = folder **grows full-screen** (one tab + Back) | On-brand folder metaphor; reuses the takeover geometry | "Option A" panel overlay — built it, user preferred the folder growing |
| Resting cascade **always resets to idx0-woven** | Only the frontmost tab weaves without occlusion artifacts (middle-woven = broken hierarchy) | Keep last-viewed woven — looked broken |
| Close **measures against the resting layout** (`data-home-state` flipped to `resting` during the read) | The open-state CSS takes the nav out of flow, so measuring there gives a too-short height → jump at settle | Measure in the open state (the bug) |
| Mobile folder `position:fixed` + scroll-lock | Stacked mobile page is taller than the screen; size to the SCREEN, not the page | Absolute (root-relative) — overflowed |
| Edge-to-edge with a 16px XS margin | Flush clipped the centered 2px border; user wanted "XS amount of space" | True flush — user didn't love it |

## Approaches that didn't work

- **"Option A" mobile overlay** (panel `fixed` over resting view) — built + verified, then replaced by the folder-grows-full-screen approach.
- **Last-viewed tab woven at rest (mobile)** — broke cascade occlusion (crossing strokes); fixed via idx0-transfer.
- **`display:none` badge on mobile-open** — caused content-shift-down.
- **Spawning a background task to write the ADR mid-edit** — it ran in the main tree and `git reset` clobbered uncommitted `home.js`. See memory `feedback_no_spawn_task_mid_edit`.

## Files touched

- **Modified:** `design/src/templates/home/home.js` — all of the above; this turn: the close-height measurement state-flip + reduced-branch `autoAlpha`.
- **Modified (already committed `3123a72`/`9b8f315`):** `home.css`, `manifest.json` — open-state nav/body flow fixes, mobile chrome rules, narrow padding.
- **Untracked (NOT committed):** `design/decisions/0032-home-folder-close-animation.md` — written prematurely; now **partially stale** (predates the mobile work + idx0-transfer + height fix). Held per the no-ADRs instruction. Decide at finalize: update + commit, or remove.

## Git state

```
On branch main (up to date with origin/main before this turn's commit)
 M design/src/templates/home/home.js
?? design/decisions/0032-home-folder-close-animation.md
```

`/handoff commit push` commits `home.js` + this HANDOFF directly to `main` and pushes. `0032` stays untracked.

## Immediate next steps

1. **Tucked tabs behind the active tab** (mobile open) — user wants the other tabs "tightly tucked behind the active tab… the compact cascade but even more overlap." **Key constraint:** only the frontmost (leftmost) tab weaves cleanly, so to tuck others behind the *active* (any index), either (a) reorder the SVG paint so the active fill paints last (`insertBefore(art.fills[ai], art.outline)`), or (b) render the active as idx0 and relabel it. Currently mobile uses `mobileSolo` (paints only the active) — relax that flag.
2. **Mono `▾` dropdown** (mobile) — a down-arrow next to the tab opening a project picker (the real switcher; tucked tabs are decorative). Use `--font-mono` (Departure Mono).
3. **De-provisionalize `home`** — settle tab geometry, real copy + screenshots (lazy mechanism wired, ADR 0031), flip `draft`→approved, write the held ADRs.

## Open questions / blockers

- **`home` is provisional** — don't ratify look/interaction/content without the user.
- **`0032` ADR** — keep (update) or delete? Held for now.
- Audience + three voice adjectives (`system/voice.md`) still un-filled.

## Gotchas for the next session

- **The close measures the RESTING layout by briefly flipping `data-home-state` to `resting`** (in `restingMetrics()` + `closeFolderMobile()`). If you add open-state CSS that changes the folder's intrinsic size, the measurement already accounts for it — but if you add *resting*-state CSS that does, re-check. The animated open/close fades the nav with `autoAlpha` (visibility hidden, space kept) so it's measurable; don't switch the nav fade back to `display:none`.
- **Preview tab backgrounding freezes rAF → GSAP freezes mid-animation** (`document.hidden` pauses `requestAnimationFrame`; `gsap.ticker.frame` stops, `onComplete` never fires, `opening`/`open` stick). To verify logic anyway: override `window.matchMedia` to force `prefers-reduced-motion: reduce` → open/close run synchronously via `gsap.set` (no rAF); end-state + geometry are then measurable.
- **`preview_resize` doesn't reliably fire a `resize` into the iframe** — dispatch `window.dispatchEvent(new Event('resize'))` after resizing to test the responsive mode-switch.
- **Mobile vs desktop close differ:** desktop resets to idx0 at close *start*; mobile transfers the woven single-tab to idx0 + fades the cascade in. Don't unify blindly.
- **`buildFolder()` is shared** (resting/desktop/mobile), runs every `onUpdate` frame; `mobileSolo` gates the single-tab paint; the active tab's stroke is empty when woven (its outline = `art.outline`, painted last/frontmost).
- **Phone preview link** = the Mac's LAN IP on port 8765 (`http://192.168.68.140:8765/src/templates/home/preview.html`), same Wi-Fi only; dies if the `loomling-static` server stops. `http-server -c-1` = no cache, so phone refresh gets fresh JS.
- **Dark mode** duplicates the dark block in `tokens.css` (`@media prefers-color-scheme` + `[data-theme="dark"]`) — edit both (ADR 0029).
