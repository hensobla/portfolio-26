# ADR 0018 — SPA `<main>`-swap resilience: stylesheets, scripts, and chrome re-injection

**Date:** 2026-06-02
**Status:** accepted

## Context

The Loom's client-side router (ADR 0014) swaps **only the `<main>` element** on tab navigation: it fetches the destination HTML, parses out `<main>`, and `oldMain.replaceWith(newMain)`. The header, theme, sidebar-collapse state, and JS module state all survive. This is deliberate and good — but it has three blind spots, all rooted in the same fact: **anything a page keeps in its `<head>`, or any `<script>` inside its `<main>`, does not come along with a `<main>`-only swap.** This session surfaced all three as user-reported bugs:

1. **Color tiles read empty on the System page** when reached via SPA nav from Library. `library/tokens.html`'s `<head>` links `../src/tokens.css`; `library/index.html`'s did not. The router keeps the *landing* page's head, so arriving at System from Library left `tokens.css` unloaded → `getComputedStyle` returned empty for every `--color-*` token → "No primitive color tokens detected." A hard refresh on `tokens.html` worked (its own head loads the sheet), which made it look intermittent.

2. **Motion-section animations didn't play** when reached via SPA nav. The System page wires its motion demos (replay buttons, hover playback, reveal cards) from an **inline `<script>` inside `<main>`**, and loads `src/motion.js` from a `<script src>` also inside `<main>`. Per the HTML spec, **scripts inserted via DOMParser + `replaceWith()` never execute.** So the wiring ran on a hard load but never on tab-nav.

3. **The onboarding "?" button** had been injected once into `.lib-header__inner`. When the user asked to move it to the sidebar (a separate change this session — see below), `.lib-side` lives inside the swapped `<main>`, so a one-time injection is wiped on the first navigation.

These are not three bugs; they are one architectural gap (ADR 0014's `<main>`-only swap) expressed three ways. ADR 0014 already documented the "modals must live inside `<main>`" hard rule for the inverse case (things that must travel with the swap); this ADR covers the things that must be *re-created* after the swap.

## Decision

**The router actively reconciles the swapped-in `<main>` against the live document.** Two helpers in `library/loom-router.js`, both invoked from inside `swap()`:

1. **`adoptMissingStylesheets(doc, onNewSheetLoaded)`** — diff the destination document's `<link rel="stylesheet">` set against the live `<head>` (keyed by the `href` attribute; all Loom pages live in `/library/`, so attribute comparison is exact). Append any the live head lacks. If a newly-added sheet is still loading, re-run the page's `init()` once it loads, so renderers that read its tokens repopulate (init is idempotent).

2. **`executeMainScripts(container)`** — after `oldMain.replaceWith(newMain)`, walk `newMain` for `<script>` elements and replace each with a freshly-created, executable `<script>` node (copy attributes, copy `textContent`). Inline scripts run synchronously in document order; `src` scripts re-fetch (cached) and run on load. This makes a `<main>`-swap behave like a real navigation for script execution.

Plus a **belt-and-suspenders** fix for case 1 specifically: `library/index.html` now links `../src/tokens.css` in its own `<head>` (with a comment explaining the invariant). The router adopt-sheets path is the general fix; the index.html link makes the common Library→System path race-free with no flash.

**For chrome that lives inside `<main>` (case 3):** the owning script re-injects it on the `loom:nav` event. `onboarding.js`'s `injectHelp()` now targets `.lib-side` and is called both at init and from a `loom:nav` listener — re-inject only, **never** re-running auto-open (preserving the once-per-run gate from CLAUDE.md §21).

## Consequences

- Reaching any page via SPA nav now loads that page's `<head>` stylesheets and runs its `<main>` scripts — parity with a hard load.
- **In-`<main>` scripts must be idempotent.** They re-run on every navigation into the page. `motion.js` already guards via `dataset.loomMotionInit`; the inline motion wiring binds listeners to fresh (swapped-in) DOM each time, so no duplicate-listener accumulation. **New rule:** never put non-idempotent side effects in a script inside `<main>`.
- `src` scripts re-execute on each nav (cached fetch). For `motion.js` this is a cheap idempotent IIFE; acceptable. If a future in-`<main>` `src` script is expensive or non-idempotent, guard it or move it to the shared end-of-`<body>` bundle.
- The "?" button (and any future in-`<main>` chrome) follows a documented re-injection pattern rather than relying on one-time injection.
- Stays inside CLAUDE.md §11 — all vanilla, no dependencies.

## Approaches that didn't work (and why)

- **Diagnosing the animations bug as a regression from the color-tile work.** It reproduced identically on clean `HEAD`, so it was pre-existing (the router never executed `<main>` scripts; it only ever looked fine because users hard-loaded). Confirmed by manually re-running the inline wiring via `preview_eval` (replay worked) vs. checking it after a real tab-nav (replay dead) — isolating "logic is correct, script never ran."
- **Fixing case 1 by only adding the link to `index.html`.** That fixes the one observed path (Library→System) but leaves the general class unaddressed (any page-specific stylesheet, any future page). Kept the index.html link *and* added the router adopt-sheets path.

## Alternatives considered (not implemented)

- **Move the motion-demo wiring into a `LoomPages.tokens` init** (so it re-runs like the rest of `tokens.js`). Larger refactor; the inline-script-inside-`<main>` is an established page pattern and re-execution generalizes to any page, so the router-level fix was preferred.
- **Swap the whole `<head>` too, or diff/replace it.** Heavier and risks blowing away runtime-injected state (theme `data-theme`, dev-tokens `<style>`, the onboarding modal's needs). Adopting only *missing* stylesheets is the minimal, non-destructive move.
- **Static `<button>` for the "?" in all four page HTMLs + delegated click.** Four file edits and more surface to keep in sync; JS re-injection keeps onboarding.js the single owner.

## Files touched

- **Modified:** `library/loom-router.js` — added `adoptMissingStylesheets()` and `executeMainScripts()`; both called inside `swap()` (adopt before/around the swap with a re-init callback; execute scripts immediately after `replaceWith`).
- **Modified:** `library/index.html` — `<link rel="stylesheet" href="../src/tokens.css">` added to `<head>` with an explanatory comment.
- **Modified:** `library/onboarding.js` — `injectHelp()` targets `.lib-side`; `loom:nav` listener re-injects (re-inject only).
- **Modified:** `CLAUDE.md` — §21 updated for the "?" location + re-injection.

## Forward links

- **New-page checklist addition (joins ADR 0014's):** any stylesheet a new page needs in its `<head>` should also be linked by every other routable page's `<head>` *or* will be auto-adopted on first nav — but a hard-load on that page still needs it locally. Keep the shared base stylesheets identical across routable pages.
- If a new page adds an inline `<main>` script, make it idempotent (it will re-run on every nav into the page).
- If a future change makes `<head>` reconciliation need more than stylesheets (e.g. page-specific `<meta>` or preconnect), generalize `adoptMissingStylesheets` rather than swapping the whole head.
- Related: ADR 0014 (the router itself) and its "modals live inside `<main>`" hard rule — this ADR is the complementary "things that must be re-created after the swap" half.
