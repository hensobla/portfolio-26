# Handoff — home folder tabs (rebuilt) + OS-following dark mode

**Updated:** 2026-06-06
**Branch:** `main`
**Session length:** Long. Tab-rendering rebuilt ~5 times → hover-lift → click-plunge interaction; plus OS-following dark mode (ADR 0029).

> ⚠️ **The `home` template is still `status: draft` and its design is PROVISIONAL / not ratified** (continuing the prior session's constraint). The full tab/interaction design is LOGGED in the `home` manifest note + this handoff, but **no ADR was written for it** — only the dark-mode change (a drift-C, system-level decision) got ADR 0029. Don't treat the tab choices as settled doctrine; revisit + formalize when `home` is approved.
>
> Supersedes the prior handoff (folder-takeover WIP, 2026-06-05, committed in `b7172a0`) — that content is in git history. The takeover choreography it described still exists and works; this session reworked the **tab rendering + tab interactions** on top of it.

## Current goal

Polish the portfolio homepage's "My Projects" folder (in `design/src/templates/home/`) — specifically the manila tab visuals and the open-folder tab interactions — and make the whole design system respect the OS light/dark setting. The folder + takeover animation already existed; this stretch was about making the tabs look right and feel satisfying to interact with.

## State right now

Everything below is **uncommitted on `main`** (see Git state). Verified live in the Claude Preview (loomling-static server, port 8765) at `http://localhost:8765/src/templates/home/preview.html`, in both light and dark, no console errors.

- **Tab rendering is now a single JS-painted SVG "art layer"** (`home.js` `buildFolder()` → `<svg class="home__folder-art">`). It paints, in z-order: body fill → per-tab fill+stroke (back-to-front so a front tab's fill masks the one behind → correct overlap occlusion) → the woven body-perimeter + active-tab outline on top. One SVG, no `viewBox` (1 unit = 1px), so stroke is always exactly 2px — no distortion, every corner a real miter join. The tab `<button>`s are now just transparent click targets + labels.
- **Compact (resting):** overlapping manila cascade — tabs step right by `--space-7`, stagger vertically (high on the left → low on the right; active/primary tab tallest), active tab fill = body color (no tint), opens into the body.
- **Open (expanded):** tabs sized to their label (label-width, not full-width spread), a touch bigger (~40px tall), labels centered + clear of the caps, 01/02/03 numbers hidden (`display:none`, kept in markup). The "nav" band (availability badge + typed-in "Blake Henson" logo) reserves `--space-8` so the folder doesn't butt against it.
- **Hover-lift (open, inactive tabs):** hovering lifts the tab ~6px as a rigid translation, and **vertical "folder body" sides grow down to the folder edge** so it reads as a folder peeking from behind the open one (not a floating trapezoid). `power2.out`, `--motion-fast`.
- **Click (open):** a 2-phase GSAP timeline — **plunge DOWN past rest** (to `-OVER` = `--space-2` below the line, `power2.in`; the tab clips at the folder edge and narrows into the slot, undistorted), **the page commits at the LOWEST point** (`setActive`), then **springs back up** (`back.out(1.7)`, `--motion-standard`) and snaps open. Throughout the plunge+spring the woven outline leaves a **flat gap under the active tab** so the newly-selected tab has **no bottom border** (reads as opening into the body) while the others keep theirs.
- **Dark mode:** the whole site now follows `prefers-color-scheme` (OS) with the explicit `[data-theme]` toggle as an override. The homepage flips correctly because it references semantic tokens only.

## What was done this session

- **Rebuilt the folder tabs ~5 times** (lineage, all in `design/src/templates/home/`):
  1. Diagnosed the original tab distortion = one fixed `viewBox="0 0 100 40"` SVG stretched with `preserveAspectRatio="none"` (uneven stroke + width-dependent slant angle).
  2. Flex trapezoid: fixed-aspect SVG corner caps + CSS-bordered rail. Fixed distortion but had corner **notches** where SVG strokes met CSS borders at non-90°.
  3. Single continuous SVG outline path (`buildOutline`): clean joints, but couldn't occlude overlapping tabs → had to make resting non-overlapping.
  4. **Ordered fill+stroke art layer (current):** overlap occludes correctly AND joints stay clean. Brought the overlapping cascade back.
  5. Fixed a partial-foot bug (inactive feet peeking under the active fill) by splitting per-tab fill (extends below baseline) from stroke (open, no foot).
- **Tab tweaks:** wider compact spread (`--space-7` step), bigger open tabs (~40px), vertical stagger flipped to high-left→low-right, active fill = body (no tint), nav padding (`navH` → `--space-8`), open label kept at 11px (`--eyebrow-size`).
- **Hover-lift** with the folder-behind illusion (vertical sides down to the folder edge).
- **Click interaction**, iterated to the final spec: plunge down → page commits at lowest point → spring back up; gap under the active tab so it has no bottom border during the bounce.
- **OS-following dark mode (drift-C):** added `@media (prefers-color-scheme: dark)` to `design/src/tokens.css` (duplicating the existing `[data-theme="dark"]` block), amended `system/dark-mode.md` §1/§9, wrote **ADR 0029**.

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Tabs painted by a JS SVG **art layer** (`buildFolder`), not CSS/per-tab SVG | Only way to get BOTH overlap-occlusion (front fill masks back) AND clean mitered joints (incl. the active tab welded into the body perimeter) | Stretched single SVG (distorts); flex caps + CSS borders (corner notches); single global outline (can't occlude overlap) |
| Hover-lift grows **vertical sides to the folder edge** | Sells the "folder behind the open one" illusion; a bare lifted trapezoid read as floating | Rigid float (user rejected: "clearly just a trapezoid") |
| Click = plunge-down, **page commits at the lowest point**, spring up | User's explicit spec for a satisfying click | Immediate `setActive` on click (earlier ask, then revised); spring-then-`setActive`-on-complete |
| Woven outline leaves a **gap under the active tab** while mid-click | So the newly-selected tab has no bottom border (reads as opening in) during the bounce | Straight woven line (gave every tab a bottom border at the lowest point — user flagged) |
| OS-following dark mode via **`prefers-color-scheme` (drift-C, ADR 0029)** | User wants the site to follow the OS; tokens already had a full dark palette | Path A explicit-toggle-only (doesn't follow OS); `light-dark()` rewrite (too large); JS mirroring (needs JS, won't port) |

## Approaches that didn't work

- **`preserveAspectRatio="none"` stretched SVG tabs** — uneven stroke + slant angle varies with width. Root cause of the original complaint.
- **Flex caps + CSS rail/body borders** — joints notch wherever an SVG stroke meets a CSS border at a non-90° angle (can't miter across elements). Chased 3 corners before abandoning.
- **Single global outline path** — clean joints but a single stroked path can't occlude an overlapping hidden tab → forced a non-overlapping resting layout the user didn't want.
- **Rigid floating lifted tab** — reads as a detached trapezoid, not a folder.

## Files touched

- **Modified:** `design/src/templates/home/home.js` — the big one. `buildFolder()` art-layer renderer (fill/stroke per tab incl. lift/sink geometry + woven outline with active-tab gap), `riseState`/`RISE`/`activeSettled`, hover-lift handlers, 2-phase click timeline.
- **Modified:** `design/src/templates/home/home.css` — tab buttons now transparent; `.home__folder-art` + `.home__art-*` classes; compact cascade (overlap + stagger); open label/padding; hid `.home__tab-num`.
- **Modified:** `design/src/templates/home/home.html` — tabs simplified to label-only buttons; `<svg class="home__folder-art">` replaces the old outline svg.
- **Modified:** `design/src/tokens.css` — added the `@media (prefers-color-scheme: dark)` block (mirrors `[data-theme="dark"]`; **keep the two in sync**).
- **Modified:** `design/system/dark-mode.md` — §1 (OS-following now on) + §9 (deferred item implemented) + the theme.js caveat.
- **Modified:** `design/library/manifest.json` — `home` entry `notes` updated through every tab/interaction iteration (the authoritative running record of the design).
- **Created:** `design/decisions/0029-os-following-dark-mode.md` — ADR.

## Git state

```
On branch main  (up to date with origin/main)
 M design/library/manifest.json
 M design/src/templates/home/home.css
 M design/src/templates/home/home.html
 M design/src/templates/home/home.js
 M design/src/tokens.css
 M design/system/dark-mode.md
?? design/decisions/0029-os-following-dark-mode.md
```

This handoff is being committed (branch → topical commits → merge to main → push) at the user's request this session.

## Immediate next steps

1. **Open-folder content** — the folder body is still an empty placeholder. Manifest plan: per-project "title + body + 2×2 image grid". This is the biggest remaining piece.
2. **Reverse / close** — the nav logo click is still a `location.reload()` stub; build a real close that animates the open folder back to the resting cascade.
3. **Mobile / medium takeover** — geometry is desktop-tuned (root padding + the `navH` strip); small screens need their own pass. (Resting layouts at all breakpoints are fine.)
4. **Decide the provisional calls when finalizing `home`** — tab slant angle (26.6°), stagger/spread steps, hidden numbers, name weight 400 (still a drift vs `typography.md` 700–900), the takeover motion category (ADR). Then de-provisionalize + write ADRs.
5. **(Optional) Deployed-shell dark mode** — the Next.js gate/placeholder pages (`src/app/`) are Tailwind, not token-driven, so they don't follow the OS yet. The `tokens.css` rule ports to the app when `home` is published (ADR 0027).

## Open questions / blockers

- **`home` design is provisional** — don't ratify the tab look/interaction without the user. Manifest note is the running log.
- **Audience** (hiring managers) given verbally earlier but still **not** written to `project.json.answers`; the three **voice adjectives** in `system/voice.md` are still un-filled. Offer to capture when resuming copy work.
- **Spring feel** is tuned to my taste (plunge `OVER`=`--space-2`, `back.out(1.7)`, `--motion-standard`). Easy dials if the user wants more/less.

## Gotchas for the next session

- **Serve the Loom from `design/`** — preview config `.claude/launch.json` → `loomling-static` (http-server on `design`, port 8765). It serves `/src/templates/home/preview.html`. The static server **dropped once mid-session** (a stray Next dev server appeared); if the preview shows `chrome-error://`, just `preview_start` `loomling-static` again. `.claude/launch.json` is gitignored.
- **The tabs are 100% JS-rendered** — `home.js` `buildFolder()` paints the SVG from `offset*` geometry (transform-immune) on init (ResizeObserver + rAF), every takeover/animation frame (`onUpdate`), on `setActive`, and on hover/click. To change tab visuals you edit the path-building in `buildFolder`, not CSS. The `.home__art-*` CSS only sets fill/stroke colors + widths.
- **Lift/sink geometry:** rise `> 0` = lifted (vertical sides up + folder-behind look); rise `< 0` = sunk (clips at the body line `TH`, base narrows by `|r|/2` because slant = height/2; nothing drawn below `TH`). Constant slant angle either way.
- **`activeSettled`** (closure flag in `wireTakeover`) gates whether the active tab is drawn OPEN (woven into the body) vs mid-click (own stroke + a gap under it in the woven outline). It's `true` except during a click spring.
- **GSAP bypasses the CSS reduced-motion collapse** — every GSAP path guards `prefers-reduced-motion` itself (the click/hover handlers check `reduce()`).
- **Verifying spring animations** is hard from static screenshots — temporarily bump a phase `duration` (e.g. to 2–3s), capture, then restore. Or read the SVG path `d` / active-index via `preview_eval`.
- **Dark mode duplicates the dark block** in `tokens.css` (`@media prefers-color-scheme` + `[data-theme="dark"]`) — vanilla CSS can't share one declaration across a media query + attribute selector. **Edit both** when changing dark values (commented in the file).
- **`home` is `status: draft`** so edits don't need the §14 snapshot ceremony yet. Once approved, they will.
