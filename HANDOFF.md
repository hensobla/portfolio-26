# Handoff — home template polish: mobile open-row identity, open-animation jump fixes, name typography

**Updated:** 2026-06-11
**Branch:** `main` (this session's work commits directly to `main` + pushes, per `design/CLAUDE.md` § Session continuity and the existing git history)
**Session length:** Long. A continuous polish pass on the `home` template's open/close takeover (desktop + mobile) plus the identity typography. Heavy back-and-forth refining one detail at a time.

> ⚠️ **`home` is still `status: draft` and PROVISIONAL** — copy, names, frames are placeholder. **ADRs are HELD** per the user's standing instruction (capture once finalized, not mid-iteration). See memory `feedback_no_adrs_until_finalized`. The untracked `design/decisions/0032-home-folder-close-animation.md` is now badly stale (predates everything below) — decide at finalize: rewrite or delete.

## Current goal

Make the `home` open/close takeover feel polished and correct on **all viewports**, and refine the identity block. This session was a long string of small, specific fixes the user drove one at a time (mobile open-row layout, animation jumpiness, name size/alignment). All verified in Claude Preview. The next thread is most likely **de-provisionalizing `home`** (real content, flip `draft`→approved, write the held ADRs).

## State right now

All working, verified in Claude Preview (`loomling-static`, port 8765, at **`/src/templates/home/preview.html`** — NOT `home.html`). No console errors. Logic lives in `design/src/templates/home/home.js` (`wireTakeover`) + `home.css`. The open/close animations are smooth on both desktop and mobile (the collapse/"jump" is gone), and the mobile open view has a redesigned top row.

- **Mobile open view top row:** `BH` initials (left) → tab (shifted right to clear them) → mono `CLOSE ✕` (right), all centered on the tab row. The folder panel itself does NOT move; only the tab is offset.
- **Name (identity):** one line at all breakpoints (forced break removed), sizes `m / l / xl` (mobile/≥768/≥1024 = 36/48/72px), optically left-aligned via `margin-left: -0.09em`.
- **Open animation:** grows continuously from the folder's true resting box — no collapse/squash frame — on **both** `openFolder` (desktop) and `openFolderMobile`.

## What was done this session

- **Mobile open-row redesign** (`home.js` `openFolderMobile`/`applyMobileOpenLayout`/`closeFolderMobile`, `home.css`, `home.html`): name → `BH` initials on the tab row; new `.home__close` button; `soloTabBox(activeIndex, leftOffset)` + `initialsRowShift()` slide the tab right to clear the initials; `mobileGeometry` navH `80 → --space-5 (24)` to kill dead top space; initials **fade** (no typewriter) on mobile while desktop keeps the typewriter.
- **`.home__close`** (`home.css` + `home.html`): viewport-`fixed`, `display:none` except `[data-home-view="mobile"]`, big touch target (`min-width/height: --space-7` + padding), GSAP fade in/out, level with the tab. Both the name (logo) and the close run the reverse animation on mobile.
- **TH (body-top baseline) fix** (`home.js` `buildFolder`): was always `tabs[0]`; in mobile solo mode that clipped every non-first project's tab shorter (and crowded the close). Now uses the **active** tab in solo mode → all projects render uniform.
- **"Open from the first tab's slot"** (`openFolderMobile`): every project opens from the front slot; the tab **grows in place** at its shifted open `x` (no horizontal slide — that slide was a source of jumpiness).
- **Pop-up close tabs** (`closeFolderMobile` + `buildFolder` sink branch): cascade tabs rise from **behind** the panel instead of fading (see-through). Added a sink clip — `if (topR >= TH) { paint nothing }` — so sunk tabs are occluded by the panel, not poking through.
- **Open-animation jump fix (the big one)** — applied to **BOTH** `openFolder` and `openFolderMobile`: (1) measure the folder's **resting box BEFORE** flipping `data-home-state="open"` (the open-state CSS sends the nav `position:absolute`, collapsing the folder); (2) pin/grow from that pre-collapse box; (3) call `buildFolder()` **synchronously after the pin** so the art doesn't flash the collapsed paint that `setActive` left.
- **Intro spacing** (`home.css` `.home__panel` padding-top + `.home__specs` margin-top, base + `@container` narrow): airier editorial space around meta/title/lead; specs still peek below.
- **List/title fade faster on open** (`home.js`, both open fns): `standard*0.5`, `power2.out`.
- **Name typography** (`home.css`): removed the forced `Blake`/`Henson` stack (deleted `1024px .home__name-first { display:block }`); optical alignment `margin-left: -0.09em` (em ⇒ size-invariant; chosen via a temporary preview slider, now removed); sizes ended at `m/l/xl` (user bumped up to `l/xl/2xl` then reverted one step). `--type-display-2xl` was added then removed → `tokens.css` net-unchanged.

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Grow open from the **pre-collapse** resting box + **sync repaint** | The open-state CSS collapses the folder (nav→absolute); measuring after pins the squashed box → visible jump | Measuring after the state flip (the bug) |
| TH baseline = **active tab** in solo mode | `tabs[0]` clips non-first projects shorter in solo | Always `tabs[0]` (the bug) |
| Tab **grows in place** (start at shifted open `x`) | An independent horizontal tab slide layered on the folder expand read as jumpy | Start at `x:0`, slide to shifted `x` |
| Close tabs **pop up from behind** (riseState + sink-clip) | Opacity fade looked see-through | Opacity fade |
| Optical align name via `margin-left: -0.09em` | Side-bearing is a constant fraction of em ⇒ one value works at any size | Per-size px tweaks; aligning to true margin (left name 1px proud) |
| Commit working changes to `main` + push | `design/CLAUDE.md` protocol + git history both commit `home` work straight to `main`; user passed `commit push` | Feature branch |

## Approaches that didn't work

- **Chasing the close button's position** (viewport-fixed ↔ in-folder, doubled offsets) to fix a "flush on non-first project" bug — the real cause was the **TH-from-tabs[0]** bug (tab + folder-border geometry), not the close position. Reverted the churn.
- **Assuming the open "jump" was horizontal** — it was the **vertical** nav-absolute collapse at frame 0. Confirmed by measuring folder height: resting 365 → frame-0 128 before the fix.

## Files touched

- **Modified:** `design/src/templates/home/home.js` — all the open/close/buildFolder logic above.
- **Modified:** `design/src/templates/home/home.css` — `.home__close`, mobile open-row logo/tab, intro spacing, name typography + optical margin.
- **Modified:** `design/src/templates/home/home.html` — added `.home__close` button; name spans now render inline (no forced break).
- **Net-unchanged (added then reverted):** `design/src/tokens.css` (`--type-display-2xl`), `design/src/templates/home/preview.html` (temporary optical-alignment slider).
- **Untracked, NOT committed (held):** `design/decisions/0032-home-folder-close-animation.md` — stale; decide at finalize.

## Git state

```
On branch main (up to date with origin/main before this session's commits)
 M design/src/templates/home/home.css
 M design/src/templates/home/home.html
 M design/src/templates/home/home.js
?? design/decisions/0032-home-folder-close-animation.md
```

`/handoff commit push` commits the three `home` files + this HANDOFF to `main` and pushes; `0032` stays untracked.

## Immediate next steps

1. **De-provisionalize `home`** — settle real copy + project names, real screenshots/prototype frames (lazy mechanism already wired, ADR 0031), flip `status: draft` → approved in `library/manifest.json`, and **write the held ADRs** (open/close animation, mobile takeover, the jump fix). Resolve `0032` (rewrite or delete).
2. **Earlier-queued (deferred):** tucked tabs behind the active tab + a mono `▾` project-picker dropdown on mobile — the user steered away from this toward the open/close + identity polish; revisit if still wanted.
3. **Fill `system/voice.md`** — audience + three voice adjectives still un-filled.

## Open questions / blockers

- **`home` is provisional** — don't ratify look/interaction/content without the user.
- **`0032` ADR** — keep (rewrite) or delete? Held.

## Gotchas for the next session

- **Open animation pattern (both `openFolder` + `openFolderMobile`):** capture `startRect` BEFORE `data-home-state="open"`, pin there, then `buildFolder()` synchronously. If you reorder or skip the sync repaint, the folder squashes flat on click. Don't pin from `mobileGeometry()/geometry()` start values — those are measured post-collapse (kept for the **targets** only).
- **`buildFolder` TH baseline uses the ACTIVE tab in solo mode** — if you touch tab sizing, keep this or non-first projects clip short.
- **Preview tab backgrounding freezes rAF → GSAP freezes** (`gsap.ticker.frame` stuck). Verify end-state logic by forcing `prefers-reduced-motion: reduce` (override `matchMedia`), or by `globalTimeline.pause()` + `time(t)` and **measuring** (seek does NOT repaint the SVG — paused screenshots come out blank; use `getBoundingClientRect`/`getBBox`).
- **Preview URL drifts to `home.html`** (the bare fragment — no tokens/fonts/GSAP). Always serve **`/src/templates/home/preview.html`**.
- **Optical alignment** on `.home__name` is `margin-left: -0.09em` (em ⇒ scales with size). The same one-liner fixes the same indent on any oversized display text (e.g. panel titles) if noticed.
- **Mobile vs desktop differ** — mobile (`openFolderMobile`, `[data-home-view="mobile"]`) uses the solo full-screen tab + `BH` initials row; desktop (`openFolder`) spreads all tabs and keeps the full "Blake Henson" typewriter. Don't unify blindly.
- **Dark mode** still duplicates the dark block in `tokens.css` (`@media prefers-color-scheme` + `[data-theme="dark"]`) — edit both (ADR 0029).
