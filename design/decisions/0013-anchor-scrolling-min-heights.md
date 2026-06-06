# ADR 0013 — Layout-stable hash-anchor scrolling via CSS min-heights

**Date:** 2026-05-25
**Status:** accepted

## Context

When viewing a primitive in the Sandbox, the "← back" link routes primitives to `tokens.html#<section-id>` (see ADR 0012's wireBackLink). The expectation is that the browser scrolls to the matching section. Reality, before this ADR:

1. User loads `tokens.html#navigation`.
2. Browser parses HTML — every `<section id="...">` element exists in the DOM at this point.
3. Browser fires its native anchor scroll, targeting `#navigation` at whatever Y-coordinate the section currently sits.
4. **But the section is empty.** `tokens.js` renders foundation sections (Color, Typography, Radii, Elevation, Space, Grid, Breakpoints, Iconography, Motion) asynchronously — it awaits a `setProjectName()` call that fetches `manifest.json` before calling its synchronous render functions. `primitives.js` renders components sections (Actions, Inputs, etc.) async after fetching the manifest. At parse time, every dynamic section is collapsed.
5. So the browser scrolls to where Navigation *is right now* — much higher up the page than its final Y.
6. Async content fills in. Foundation sections grow from ~0 to their actual heights. Components sections do the same.
7. Navigation's actual Y moves **down** by several thousand pixels. The viewport stays at the original scroll position.
8. User sees what's at the original Y *now*, which corresponds to a section much earlier in the page (often the Space section, depending on how much content has filled in).

The user explicitly reported this: *"loading this url scrolls me to the Space section; then a few moments later it scrolls to the correct navigation section; two separate scrollings."*

## Decision

**Pure CSS solution.** Reserve each section's final height at HTML-parse time via `min-height`, so the browser's native anchor scroll fires against a layout that is already approximately the right shape. Async content fills into the pre-allocated space without shifting the page.

Specifically (in `library/library.css`):

```css
/* Foundation sections (rendered by tokens.js) */
.ds-section#color       { min-height: 1900px; }
.ds-section#typography  { min-height: 1180px; }
.ds-section#radii       { min-height: 290px; }
.ds-section#elevation   { min-height: 310px; }
.ds-section#space       { min-height: 520px; }
.ds-section#grid        { min-height: 740px; }
.ds-section#breakpoints { min-height: 295px; }
.ds-section#iconography { min-height: 290px; }
.ds-section#motion      { min-height: 1540px; }

/* Components sections (filled by primitives.js) */
.ds-primitives[data-cat="action"]       { min-height: 760px; }
.ds-primitives[data-cat="input"]        { min-height: 1160px; }
.ds-primitives[data-cat="data-display"] { min-height: 1080px; }
.ds-primitives[data-cat="nav"]          { min-height: 1200px; }
.ds-primitives[data-cat="feedback"]     { min-height: 800px; }
.ds-primitives[data-cat="overlay"]      { min-height: 960px; }
```

Values are calibrated to typical desktop content width (~880px, 4 atomic cards per row). Each value sits slightly above the section's natural rendered height — small overshoots cause a brief empty gap below the content while it loads (imperceptible); small undershoots cause a minor shift after load.

In addition: `scroll-margin-top: calc(var(--lib-header-h) + 16px)` is set on `.ds-section` and `.lib-section` so anchored sections clear the sticky 56px-tall `.lib-header`.

Two small companion changes:

- `tokens.js` calls `setProjectName()` **without** `await` — fire-and-forget. Foundation rendering no longer waits on the manifest fetch. Small extra optimization unrelated to the layout fix, kept because it cleanly removes a needless block.
- `primitives.js` `renderCategory` parallelizes primitive mounting within each category (was sequential `await` per entry). Speedup unrelated to anchor scrolling; kept because the previous JS-orchestrated scroll fix prompted the refactor and it's net-positive.

All JS orchestration removed: no `__loomPendingHash` inline early-script in `tokens.html`, no `history.scrollRestoration = "manual"`, no `scrollIntoView` calls in `primitives.js`, no sections-above-target gating, no user-scroll-cancel listeners. Native browser anchor scroll does all the work.

## Consequences

- Anchor links land correctly on the first paint. Verified at session end: `#navigation`'s Y position is **identical at t=immediate / 200ms / 1s / 3s** (11393px). Zero layout shift.
- ~80 lines of JS removed from `primitives.js`. ~16 lines of inline script removed from `tokens.html`. ~16 lines of CSS added. Net negative LOC.
- Maintenance burden: if a section gains or loses substantial content, its `min-height` value needs to be re-measured. The CSS block has a comment with the measurement script:
  ```js
  [...document.querySelectorAll('.ds-section[id]')].map(s => ({ id: s.id, h: Math.round(s.getBoundingClientRect().height) }))
  ```
- Worst case if `min-height` is wrong: layout shifts after content loads. Annoying but not broken (anchor still works, just visibly imperfect).
- At narrower viewport widths (< 880px), primitive grids wrap to more rows and sections grow taller. Min-heights then under-reserve, and shifts happen. Acceptable trade-off because typical use is desktop. Could be revisited with `clamp()` or viewport-width-conditional min-heights if mobile usage becomes important.

## Approaches that didn't work (and why)

Four JS-based attempts were tried before settling on CSS:

### Attempt 1: Re-scroll after `Promise.all` of primitive renders

`primitives.js` would call `scrollIntoView` on the target hash after all primitives finished rendering. Problem: the browser had already done its own (wrong) initial scroll, so the user saw a flash of the wrong section before the JS scroll corrected. Two visible scrolls.

### Attempt 2: Inline early-script + `__loomPendingHash` + post-render scrollIntoView

`tokens.html` had an inline script in `<head>` that ran at parse time: it stashed `location.hash` into `window.__loomPendingHash` and called `history.replaceState` to strip the hash from the URL. With no hash, the browser didn't auto-scroll. Then `primitives.js` re-applied the hash via `replaceState` and called `scrollIntoView` after `Promise.all` completed. Single scroll, correct spot. ✅ Worked, but…

The user reported: *"it technically works now, but it's super delayed — to the point where I scrolled myself and then the auto-scroll jumbled up my position."*

The delay was real: sequential `await mountPrimitive` per entry inside `renderCategory` × multiple categories took 1–3 seconds. The auto-scroll fired after everything finished. User could scroll in the meantime and have their position overridden.

### Attempt 3: Parallelize mounting + scroll as sections-above-target finish + user-scroll cancellation

`renderCategory` refactored to build all cards synchronously in manifest order, then `Promise.all` of all mount tasks (parallel within category, parallel across categories). Auto-scroll fires the moment all sections **above** the target are done — sections below don't affect the target's Y. Plus three `{ once: true }` event listeners (`wheel`, `touchstart`, `keydown` for scroll keys) that set a `userTookOver` flag — if any fires, the pending auto-scroll is abandoned.

Bug: `sectionsAboveTarget` was built by walking `target.previousElementSibling` for any `.ds-section`. But foundation sections (Color, etc.) don't have `.ds-primitives[data-cat]` containers — they're rendered by `tokens.js`, separate from `primitives.js`. `primitives.js`'s completion logic only removed sections that had a `[data-cat]` container, so foundation sections stayed in the set forever. `tryScroll()` never fired.

User reported: *"now it doesn't work at all."* The fix would have been a one-line filter, but the architecture was already five interacting moving parts (early-script + parallel + Promise.all + section-tracking + user-cancel). Each fix added complexity.

### Attempt 4: Same as 3, with the one-line fix + foundation-section min-heights added to keep `tokens.js`'s sync render path fast

Working but bloated. The user asked: *"would it be worth scrapping the feature and starting over?"* — which prompted the realization that **the layout instability itself is the root cause**, and CSS can eliminate it entirely without any JS. Hence the final decision above.

## Alternatives considered (not tried)

- **Native browser anchor scroll without min-heights, relying on `tokens.js` to render foundations synchronously.** Requires `tokens.js` to NOT await any fetch before rendering. Achievable (and partially done — `setProjectName` is fire-and-forget now), but `primitives.js` still MUST fetch the manifest before knowing what to render. Components sections would still collapse at parse time. Min-heights are needed at minimum for those.

- **`content-visibility: auto`** to make sections lay out at full final height before paint. Browser support is reasonable now but not universal; the behavior interacts subtly with `contain-intrinsic-size`. Felt riskier than explicit min-heights for the marginal cleanliness gain.

- **Server-side render the System page with content baked in.** Would require declaring a stack (ADR 0001's deferred decision). Out of scope.

- **Pre-fetch manifest in an inline `<script>` early in `<head>`** so `primitives.js` doesn't pay the fetch cost. Wouldn't help — the fetch is still async, and primitive rendering takes longer than the fetch itself (35+ entries, each with its own asset loads).

## Files touched in the originating session (2026-05-25)

- **Modified:** `library/library.css` — added 16 min-height rules (9 foundation + 6 component + scroll-margin-top on both `.ds-section` and `.lib-section`).
- **Modified:** `library/tokens.html` — removed the inline `__loomPendingHash` early-script entirely.
- **Modified:** `library/tokens.js` — `setProjectName()` called without `await`.
- **Modified:** `library/primitives.js` — removed the entire hash-orchestration block from `run()` (~80 lines). Parallelized mounting inside `renderCategory` (kept). Removed the user-scroll-cancel listeners + sections-above tracking.

## Forward links

- If a new primitive section is added (e.g., a "Charts" or "Forms" category), give its `<section>` a min-height and its `.ds-primitives[data-cat="X"]` a min-height in the same CSS block. The measurement script is in the CSS comment.
- If `tokens.js` ever adds a *new* awaited fetch before foundation rendering, the foundation section min-heights will still hold the layout — but the foundation sections will render visibly late (empty boxes then sudden fill). Avoid this by keeping `tokens.js`'s render path synchronous.
- The `scroll-margin-top` value is derived from `--lib-header-h: 56px`. If the header height changes (responsive nav, etc.), `scroll-margin-top` adjusts via the variable — no manual update needed.
- This ADR formally rejects the JS-orchestration approach. If a future session is tempted to re-add `scrollIntoView` orchestration in `primitives.js`, they should first read this ADR and confirm whether the underlying layout instability has re-emerged. If yes, CSS min-heights should be the first remedy.
