# Handoff — home template: folder-takeover animation (WIP)

**Updated:** 2026-06-05
**Branch:** `main`
**Session length:** Long. GSAP adoption → entrance animation → critique + fixes → folder-takeover v1 → tab-outline polish.

> ⚠️ **WIP — design choices are LOGGED, NOT FINALIZED.** The user explicitly asked that this session's design decisions on the `home` page be recorded but **not** ratified into the system. So: **no new ADRs were written** for the takeover/tab/typography choices, and the `system/motion.md` "State transitions" section was marked **PROVISIONAL / WIP (not ratified)**. When `home` is eventually approved, revisit and formalize (ADR + de-provisionalize motion.md). Don't treat any of tonight's home-page design as settled doctrine.
>
> Supersedes the prior handoff (Loomling pivot, 2026-06-05, committed in `f932a84`) — that content is in git history.

## Current goal

Build the portfolio homepage's **folder takeover**: clicking a project in the resting "My Projects" folder animates the page into a full-screen folder view. This is the long-planned drift-C "takeover animation" the manifest pointed at. v1 choreography + tab visuals are working; content/reverse/mobile remain.

## State right now

Everything is **uncommitted** on `main` (see Git state). The Loom serves the work; verified live in the Claude Preview at desktop, tablet, and a mid-width.

- **Resting view** (`home`, still `status: draft`): name (big, stacked on ≥1024, weight 400), bio, availability badge, and a "My Projects" folder whose tabs are a **stacked manila cascade** (4 SVG trapezoids, each inactive tab stepping down from its left neighbour; tab 1 default-active, opens into the body).
- **Takeover** (click any project → `data-home-state="open"`): GSAP timeline runs —
  1. name + bio fade out left (**availability badge stays** — it's nav now);
  2. folder pins out of the grid and stretches to full **width**; the 4 trapezoid tabs animate from cascade → even spread, labels fade in;
  3. folder grows to full **height** just after (two-beat: `expo.out` width → `power3.inOut` height);
  4. "Blake Henson" types into a top-left **nav logo** (with the badge = the open nav).
- **Works:** the full choreography, the SVG tab outlines (uniform 2px `non-scaling-stroke`, active tab drops its bottom edge to open in), reduced-motion path (jumps to end state), entrance animation on load.
- **Open-folder body is empty** (placeholder). No real project content yet.

## What was done this session

- **Adopted GSAP** (already committed, `c969935` + ADR 0028): `gsap` + `@gsap/react` in the Next app; vendored `design/src/vendor/gsap.min.js` for the Loom; entrance animation.
- **Critique of `home`** (read-only) → applied fixes: status badge stacks above name ≤medium / corner ≥1024; name bigger + weight 400 + first/last stacked ≥1024; removed the bio em-dash (now `:`); audience captured verbally (hiring managers — NOT yet written to `project.json`).
- **Built folder takeover v1** — new `design/src/templates/home/home.js` (`window.HomeTemplate.init`), loaded by `preview.html`. Entrance moved into home.js.
- **Tabs reworked twice:** SVG manila cascade → (interim) flat flex tabs → **SVG trapezoids** (current) after outline feedback.
- **Marked `system/motion.md` "State transitions" PROVISIONAL** per the WIP constraint.

## Key decisions and why (ALL PROVISIONAL — not ratified)

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Hand-built GSAP timeline, **no Flip plugin** | User wants width-*then*-height as two distinct beats; Flip animates the whole delta at once | GSAP Flip |
| **Manual flip**: pin folder `position:absolute`, tween left/top/width/height | Full control over the two beats | Tweening grid-template-columns (not cleanly tweenable) |
| Neutralize `.home__explorer` positioning during takeover | Folder's absolute coords must resolve against the **root**, not the explorer column (caused an overshoot bug) | — |
| **SVG trapezoid tabs** w/ `non-scaling-stroke` | Uniform 2px outline, no taper, per-edge control (active drops bottom). clip-path + inset `::before` gave a thick, tapering, non-removable rim | clip-path/`::before` rim (rejected after user feedback) |
| Availability badge **stays as nav** | User: treat it as nav with the small logo; only name+bio leave | Fading the whole identity (hid the badge) |
| Reserve a top nav strip (`--space-6`) above the open folder | Logo was colliding with tab 01 | — |
| Name weight **400** | User's taste call | — (this is a DRIFT vs `typography.md` 700–900; **not** documented/ratified — only a code comment) |

## Approaches that didn't work

- **clip-path trapezoid + inset `::before` for the rim** — can't make a uniform stroke (angled edges read thick, "tapers"), can't drop the bottom edge per-tab. Replaced with SVG.
- **Folder pinned while `.home__explorer` stayed `position:relative`** — folder's `left/top` resolved against the explorer column → overshot off-screen right. Fixed by setting explorer `position:static` during takeover.
- **Flat flex tabs (interim)** — lost the manila aesthetic; user wanted trapezoid + stacked back.

## Files touched

- **Created:** `design/src/templates/home/home.js` — entrance + takeover (`HomeTemplate.init(root)`), tokens-driven, reduced-motion-guarded.
- **Modified:** `design/src/templates/home/home.html` — added nav logo `<a class="home__logo">`; status moved inside `.home__identity`; SVG trapezoid tabs (4, tab 1 `is-active`).
- **Modified:** `design/src/templates/home/home.css` — status as eyebrow (corner ≥1024); name sizes/weight/stacking; logo; SVG tab styles + stepped cascade; folder flex; open-state.
- **Modified:** `design/src/templates/home/preview.html` — loads `home.js`, calls `HomeTemplate.init`; entrance moved out.
- **Modified:** `design/system/motion.md` — "State transitions" section (marked **PROVISIONAL**).
- **Modified:** `design/library/manifest.json` — `home` notes updated (takeover v1, tab approach). Still `status: draft`.
- **Referenced:** `design/decisions/0028-adopt-gsap-animation-library.md` (GSAP adoption, already committed); `design/CLAUDE.md` §5/§14/§20 (drift + lifecycle rules).

## Git state

```
 M design/library/manifest.json
 M design/src/templates/home/home.css
 M design/src/templates/home/home.html
 M design/src/templates/home/preview.html
 M design/system/motion.md
?? design/src/templates/home/home.js
```

All uncommitted. NOT committed this session (handoff documents state; the user committed the GSAP work earlier in `c969935`).

## Immediate next steps

1. **Open-folder content** — body is an empty placeholder; the manifest plan is "title + body + 2×2 image grid" per active project.
2. **Reverse / close** — the logo click is a `location.reload()` stub; build a real close that animates back to resting.
3. **Mobile / medium takeover** — geometry is desktop-tuned (uses root padding + a fixed nav strip); small screens need their own pass. (Resting layouts at all breakpoints are fine.)
4. **Decide the provisional calls** when ready to finalize: name weight 400 (drift vs `typography.md`), the takeover motion category (ADR), active-tab fill tint, slant-scales-with-width.

## Open questions / blockers

- **Name-weight drift** unresolved: `typography.md` says Archivo display 700–900; code uses 400 (comment only). Needs path B (amend doc) or revert — deferred.
- **Audience** (hiring managers) given verbally but **not** written to `project.json.answers` / removed from `deferred`, and the three **voice adjectives** in `system/voice.md` are still un-filled. Offer to capture when resuming copy work.
- Active-tab fill is `--background` (a hair lighter than the body `--surface1`) — confirm if that subtle tint is wanted.

## Gotchas for the next session

- **Serve the Loom from `design/`** (server root must be `design/`), else `loader.js`'s absolute `/src/...` fetches 404. Preview config: `.claude/launch.json` → `loomling-static` (http-server on `design`, port 8765). `.claude/launch.json` is gitignored.
- **`home` is hand-written** and `preview.html` runtime-fetches `home.html`; `loader.js` does NOT auto-load template JS, so `home.js` is loaded explicitly via a `<script>` in `preview.html`.
- **GSAP bypasses the CSS `--motion-*`→1ms reduced-motion collapse** — every GSAP path must guard `prefers-reduced-motion` itself (home.js does).
- **Takeover anchoring:** the folder is pinned `position:absolute` relative to the ROOT; this only works because the takeover sets `.home__explorer` to `position:static`. Keep that.
- `home` is `status: draft`, so edits do **not** need the §14 snapshot ceremony (yet). Once approved, they will.
- Don't finalize tonight's design choices without the user — that was an explicit instruction this session.
