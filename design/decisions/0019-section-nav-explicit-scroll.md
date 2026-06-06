# ADR 0019 — System-page section nav drives scroll explicitly, not via native fragment navigation

**Date:** 2026-06-02
**Status:** accepted

## Context

The System page sidebar (`.lib-side`) is an in-page section nav: each link is `<a href="#color">`, `<a href="#motion">`, etc., pointing at a `.ds-section` on the same page. Scrolling was left to the **browser's native fragment navigation** (the default action of an in-page anchor) plus CSS `scroll-behavior: smooth`. ADR 0013 added per-section `min-height` reservations so the page is roughly its final shape at parse time and the native anchor scroll "lands correctly the first time and no JS orchestration is needed."

The user repeatedly reported sidebar navigation "doesn't work" / "stopped working again." It was hard to pin down because:

- The Claude Preview headless browser does **not** perform native fragment scrolling reliably — it failed identically on clean `HEAD`, which initially read as a preview artifact rather than a real bug.
- `wireScrollSpy()`'s click handler (which sets the `.is-active` highlight) ran fine, so the *JS* looked healthy; only the *scroll* failed.

Isolation finally showed the real behavior: clicking a section link set the URL hash but scrolled the page only ~63px down instead of to the target section (~4750px). Critically, **programmatic `scrollIntoView` worked** (smooth or instant, landing dead-on at the target minus `scroll-margin-top`), while the **native anchor path** did not. So the scroll *mechanics* are fine — the browser's native fragment-scroll gets **canceled mid-flight**, most plausibly by the SPA's history manipulation (`history.pushState` on tab-nav) combined with async section fills / View Transitions. ADR 0013's min-height reservations assume the *native* scroll is the executor; that assumption no longer holds under the SPA router (ADR 0014).

## Decision

**The section-nav click handler drives the scroll itself instead of relying on native fragment navigation.** In `wireScrollSpy()` (`library/tokens.js`), each link's click handler now:

1. Resolves the target by id from the link's `href`.
2. `e.preventDefault()` — suppresses the (broken) native fragment scroll.
3. `target.scrollIntoView({ behavior, block: 'start' })` — deterministic; `scrollIntoView` honors each section's `scroll-margin-top` (sections land at viewport-top + 72px). `behavior` is `'smooth'`, or `'auto'` when `prefers-reduced-motion: reduce` matches.
4. `history.replaceState(null, '', hash)` — keeps the URL shareable/bookmarkable without re-triggering the native jump, and without polluting history (back returns to the previous real page, not through every section).

The existing `.is-active` highlight + IntersectionObserver-suspend logic is unchanged.

## Consequences

- Section nav is now **deterministic** on hard load and after SPA navigation, independent of layout-shift timing or history state.
- ADR 0013's `min-height` reservations are **no longer load-bearing for click navigation** — clicks scroll explicitly to live element positions. The reservations still matter for **direct hash loads** (`tokens.html#motion` typed/opened cold, before JS runs) and for general layout stability, so they stay. This ADR augments ADR 0013 rather than superseding it; only the "native anchor scroll is the executor for sidebar clicks" part is replaced.
- Using `replaceState` (not the native `pushState`-per-fragment) means section jumps don't stack in history. Deliberate — avoids the back button cycling through sections under the SPA router. If "back returns to previous section" is ever wanted, switch to `pushState` and handle it in the router's `popstate`.
- Vanilla, no dependencies (CLAUDE.md §11).

## Approaches that didn't work (and why)

- **Trusting the preview / synthetic `link.click()` to test fragment scroll.** Synthetic clicks don't reliably trigger native fragment scrolling in the headless browser, and native fragment scroll fails there even on clean code — so the preview could not distinguish "broken" from "working." Resolution: test with `preview_click` (trusted click) + poll `window.scrollY`, and compare against programmatic `scrollIntoView` as the known-good baseline.
- **Assuming the `.lib-side` height/flex change (the "?" relocation, same session) caused it.** Disabling that rule via an injected override still reproduced the failure — ruling it out and pointing at the native fragment mechanism itself.
- **Leaving it to native scroll + bigger/better `min-height` reservations.** The reservations make the page the right *shape*, but the cancellation is in the native fragment-scroll *execution*, not the layout — no reservation tuning fixes it.

## Alternatives considered (not implemented)

- **`pushState` per section** (native-like history) — rejected to avoid back-button cycling through sections under the SPA router; `replaceState` is cleaner.
- **A scroll-margin/`:target` CSS-only fix** — doesn't address execution-time cancellation of the native smooth scroll.
- **Smooth-scroll polyfill / library** — unnecessary; native `Element.scrollIntoview({behavior:'smooth'})` works fine here, and a dependency would violate §11.

## Files touched

- **Modified:** `library/tokens.js` — `wireScrollSpy()` click handler: `preventDefault` + `scrollIntoView` + `history.replaceState`; `prefers-reduced-motion` honored via `matchMedia`.

## Forward links

- If another in-page section nav is added (e.g. the Components page grows its own sidebar links), use the same explicit-scroll pattern, not native `#anchor` reliance.
- ADR 0013's `min-height` reservations remain for **cold direct-hash loads** and layout stability. If those are ever made dynamic/conditional (e.g. to kill the empty-section whitespace below Motion), confirm direct-hash-load scrolling still lands correctly.
- If the SPA router later changes how it manipulates history (ADR 0014), re-verify that this explicit-scroll path and the `replaceState` choice still behave (they're independent of native fragment nav, so they should).
