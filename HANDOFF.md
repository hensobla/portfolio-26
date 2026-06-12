# Handoff — text-selection highlight token + home folder tab-click race fix

**Updated:** 2026-06-12
**Branch:** main
**Session length:** medium (one sitting)

## Current goal

Two small, finished pieces of work on the **Loomling design workspace** (`design/`), the source of truth for the Blueprint homepage:

1. Add a bright complementary-yellow **text-selection highlight** as a real token + global `::selection` rule.
2. Fix a **tab-click race** in the open "My Projects" folder on the home template, where clicking a tab quickly (mid hover-animation) failed to start the click animation or navigate to the project.

Both are complete and verified in the live Loom preview. This session also (earlier) committed a stray untracked ADR (`0032`) that was showing as a phantom diff.

## State right now

- All work **verified working** in the served Loom preview (`http://localhost:8765/src/templates/home/preview.html`).
- Two files modified, uncommitted at session start; this `/handoff commit push` run commits + pushes them.
- No open bugs from this session. The home tab interaction now navigates correctly under every click-timing tested.
- `home` is still `status: draft` and provisional (placeholder copy/names/frames). **ADRs remain HELD** per the user's standing instruction — these changes are bug fixes + a minor token add anyway (design/CLAUDE.md §handoff skip list), so no ADR written.

## What was done this session

- **Text-selection highlight** — `design/src/tokens.css`:
  - Added semantic tokens `--highlight: #FFE600;` and `--highlight-fg: var(--color-neutral-950);` in the light `:root` accent block (~line 126). Mode-independent (vivid yellow + near-black text read on both cream and dark grounds), so defined once and inherits into dark mode.
  - Added a global `::selection` + `::-moz-selection` rule at the bottom of the file (alongside the existing image-placeholder global rules) using those tokens.
  - `#FFE600` chosen as the direct complement of the electric-blue accent `#2E4BFF`. User reviewed 4 options (`#FFE600` acid bright, `#FFE34D` softer, `#FFD60A` slightly gold, `#FFEB00` pure lemon) via a temporary tryout page and picked the original `#FFE600`.

- **Home folder tab-click fix** — `design/src/templates/home/home.js`, the open-folder tab `click`/`mouseenter`/`mouseleave` handlers (~lines 886–945):
  - **Fix 1 (early click):** the old handler had an immediate-snap branch (`riseState[i].v < 0.5`) that left the hover (`mouseenter`) tween alive — it kept running and re-lifted the now-active tab, leaving it stuck floating. Replaced with: detect a hover-lift even at `v≈0` via `gsap.isTweening(riseState[i]) || riseState[i].v > 0`, **kill the hover tween unconditionally**, then run one timeline that **finishes the remaining rise → plunges → springs** (the user's requested "complete the hover, then play the click animation"). Immediate-snap kept only for touch/keyboard/reduced-motion.
  - **Fix 2 (quick click = enter→click→leave):** the real reported bug. The `mouseleave` that follows a fast click fired a `overwrite: true` tween on the same `riseState[i]`, **killing the in-flight click timeline before its plunge `onComplete → setActive` ran** → no navigation. Added a `committing` Set: when a click commits, the tab is added; `liftable()` (used by both hover handlers) now also checks `!committing.has(i)`, so hover in/out can't abort a committed click. Cleared on the timeline's `onComplete`.

- **Phantom-diff cleanup (earlier in session):** committed + pushed the previously-untracked `design/decisions/0032-home-folder-close-animation.md` (commit `31a606f`) — it had never been `git add`ed, so it survived prior commits and showed as a persistent "diff."

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| `--highlight = #FFE600` as a token (not inline) | Tokens-only discipline (Loomling rule); complement of the blue accent; one definition inherits to dark mode | Softer `#FFE34D` / gold `#FFD60A` / lemon `#FFEB00` — user picked the bright original |
| Detect hover-lift via `gsap.isTweening`, not a `v` threshold | A real early click can land before the rise tween's first tick (v still 0); a `v < 0.5` test misroutes a hover user into the dead-snap path | Keeping the `v < 0.5` threshold — too fragile |
| `committing` Set guarding `liftable()` | Smallest change that makes a committed click un-abortable while preserving "commit at the plunge's lowest point" visual timing | Calling `setActive` synchronously at click time — would lose the intended commit-at-bottom timing |

## Approaches that didn't work

- **Verifying the race with `flush()`** (force-completing all GSAP tweens via `getChildren(...).progress(1)`) **masked the bug** — it force-finished the click timeline before the `mouseleave` overwrite could abort it, so tests falsely passed. Had to drive GSAP frame-by-frame with `gsap.updateRoot(time)` + `gsap.ticker.lagSmoothing(0)` to reproduce deterministically.
- An early `getChildren(true, true, false)` flush silently **excluded timelines** (3rd arg = include-timelines), so the click's plunge timeline never advanced and a measurement read `8` instead of `0`. Use `getChildren(true, true, true)`.

## Files touched

- **Modified:** `design/src/tokens.css` — added `--highlight` / `--highlight-fg` tokens + global `::selection` rule.
- **Modified:** `design/src/templates/home/home.js` — open-folder tab click handler: finish-rise→plunge→spring unification + `committing` guard against hover-abort.
- **Created (this handoff):** `HANDOFF.md` (overwrote the 2026-06-11 handoff).
- **Committed earlier:** `design/decisions/0032-home-folder-close-animation.md` (commit `31a606f`) — note: this ADR is stale/provisional per the prior handoff; decide at `home` finalize whether to rewrite or delete.

## Git state

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
	modified:   design/src/templates/home/home.js
	modified:   design/src/tokens.css

 design/src/templates/home/home.js | 36 +++++++++++++++++++++++++++---------
 design/src/tokens.css             | 25 +++++++++++++++++++++++++
```

(This `/handoff commit push` run commits + pushes the above, then commits this handoff.)

## Immediate next steps

1. Nothing blocking. Continue polishing other home states, or move toward de-provisionalizing `home` (real content, flip `draft`→approved, write the held ADRs).
2. If/when porting tokens to the live app (ADR-0027 publish bridge): carry `--highlight` / `--highlight-fg` + the `::selection` rule into `src/app/globals.css` (currently still the legacy Vignelli tokens).
3. Optional: audit other GSAP `overwrite: true` hover/click pairs in `home.js` (open/close flows) for the same abort-race shape — not observed broken, but same pattern.

## Gotchas for the next session

- **Two preview servers run:** `8765` = loomling-static (the design Loom, server root is `design/`); `3000` = the gated Next.js app (redirects every route to `/enter`). The home WIP standalone preview is `http://localhost:8765/src/templates/home/preview.html` — NOT the sandbox chrome, NOT `home.html`. The preview browser occasionally drifts onto the `:3000` `/enter` gate; re-navigate explicitly with `location.assign(...)`.
- **Background-tab rAF throttling:** the headless preview throttles `requestAnimationFrame`/timers, so GSAP timelines don't advance in real time and timing-based verification is unreliable. Drive animations deterministically with `gsap.updateRoot(absoluteSeconds)` after `gsap.ticker.lagSmoothing(0)`; or force-settle with `gsap.globalTimeline.getChildren(true,true,true).forEach(c=>c.progress(1))` — but remember `flush()` hides overwrite/abort races (see "didn't work" above).
- **Home tab mechanics:** the folder OPENS from the resting **project list** (`.home__item`), not the tabs. Tabs only switch projects once `data-home-state="open"`. Desktop hover-lift path needs viewport ≥ `--bp-md` (768px); below that, open goes to the mobile full-screen view (no hover-lift). `riseState[i].v`: `+` = lifted up, `−` = pressed down; the SVG art (`.home__folder-art` paths) is painted by `buildFolder()`, the `.home__tab` buttons are fixed transparent click targets.
- The `design/_highlight-tryout.html` scratch page was created and **deleted** this session — don't expect it to exist.
