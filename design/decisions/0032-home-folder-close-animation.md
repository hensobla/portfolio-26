# ADR 0032 — Home folder CLOSE animation (reverse takeover)

**Date:** 2026-06-07
**Status:** accepted

## Context

The Blueprint homepage's `openFolder()` (ADR 0028 GSAP; motion.md "State
transitions", drift-C) animates the **resting** tabbed folder into a **full-screen
takeover**: identity (name + bio) fades left, the folder pins out of the grid and
stretches to full width as the tabs spread to label-width, then it grows to full
height and "Blake Henson" types into a top-left nav-logo. While open, the active
project's case-study panel is shown (ADR 0031 template-deferred media).

There was no way **back**. The typed-in logo's click handler was a
`location.reload()` stub — a hard, jarring page reload that threw away scroll
position, re-ran the entrance, and re-fetched everything. The takeover needed a
real **reverse**: click the logo → the folder collapses back into the resting
manila cascade, the identity returns from the left, the logo un-types.

Three problems made "just reverse the open timeline" insufficient:

1. **The open-time geometry is stale.** `openFolder()` snapshots the resting box +
   target box via `geometry()` at open-time. The open folder is then kept fitted to
   the viewport by `fitOpenFolder()` on resize (ADR 0031). So after **any window
   resize while open**, the resting positions captured at open-time no longer
   describe where the folder, tabs, and tab-strip should land. Reversing onto the
   stale snapshot would settle the folder at the wrong size/place for the current
   viewport.

2. **The availability badge repositions across the state flip.** The badge is
   pinned top-right while `[data-home-state=open]`; at resting it sits as an eyebrow
   in the identity column, and at narrow widths that's a real corner→eyebrow
   **reposition**. Flipping `data-home-state` back to `resting` mid-collapse snaps
   the badge across the layout in one frame.

3. **Inline open-state styles must be fully relinquished.** Open pins the folder,
   explorer, tabs, and tab-strip with inline `gsap.set` styles (`position`, `left`,
   `top`, `width`, `height`, `margin`, `zIndex`, opacity/visibility/transform on the
   identity). For the resting CSS (grid item, normal flow) to own layout again, every
   one of those inline declarations has to be removed — not just visually reversed.

## Decision

Add a dedicated CLOSE path to `home.js` — `closeFolder()` plus three helpers
(`restingMetrics`, `settleResting`, `typeOut`) — wired to the logo's click
(replacing the reload stub).

### 1. Measure the resting target at CLOSE-time, not reuse the open snapshot

`restingMetrics()` reads where the folder/tabs/strip belong **right now** by briefly
neutralizing the open inline pin and letting the grid re-flow:

- Save the current inline `cssText` of `folder`, `explorer`, `tabsWrap`, and each
  tab.
- Clear the open-state inline props (`position/left/top/width/height/margin/
  transform/zIndex` on the folder; `position` on the explorer; `height` on the
  strip; `left/top/width/height` on each tab) so the resting CSS reflows the layout.
- Read the reflowed geometry: the folder's box relative to the root, each tab's
  `offset*` box, and the strip height.
- **Restore the saved `cssText` verbatim** so the open layout is exactly as it was.

This is **synchronous** — one forced reflow, no paint between clear and restore — so
nothing flashes; the close then animates *back to* those just-measured numbers. This
is correct at the **current** viewport, which the open-time `geometry()` snapshot is
not after a resize.

### 2. Mask the `data-home-state` flip with a badge crossfade

The open→resting state flip is **deferred to the end** of the close and wrapped in a
short crossfade on the availability badge: fade the badge out (`standard * 0.4`),
flip `data-home-state` to `resting` at that zero point, fade it back in. The
corner→eyebrow reposition happens while the badge is invisible, so it reads as a
fade, never a snap.

### 3. `settleResting()` clears ALL open inline styles via `clearProps`

The shared end-state of both the animated and reduced-motion close. It
`gsap.set(..., { clearProps })`s every open-state inline style off the folder,
explorer, tab-strip, tabs, identity (name/bio), folder-nav (list/title), tab labels,
status badge, and the active panel — so the **resting CSS fully re-owns layout**.
Then it flips `data-home-state` to `resting`, clears the typed logo, resets the
`open`/`opening` flags, and calls `setActive(0)` to reconcile the selection back to
the first project (§4) — which also rebuilds the folder art at the resting geometry.
Reaching for `clearProps` rather than animating values back to a known number is what
guarantees no stale pin survives a resize-during-open.

### 4. Re-stack the cascade left-top → right-bottom (reset selection to the first project)

In the open state, the **active** tab is the one woven into the body (it "opens
into" the folder, no separating line) — that's what reads as the *front* of the pile.
If the user opened, say, **Manifold** (the rightmost tab), a naïve reverse would
collapse with Manifold still woven/front, so the resting cascade would stack
right-tab-on-top — backwards from the resting design, where the manila cascade runs
**left-top → right-bottom** (leftmost tab on top, each stepping down-and-right behind
its left neighbour; `home.css` `.home__tab:nth-child` z-indices 4→1).

So `closeFolder()` **returns the woven/front tab to the first project** for the
collapse: it captures the currently-visible panel (to fade it out), then
`toggle("is-active", j === 0)` across the tabs *before* the timeline runs, so
`buildFolder()` weaves the **leftmost** tab through the whole collapse and the pile
re-stacks in the correct order. The outgoing panel keeps its own `is-active` class so
it can still fade; `settleResting()`'s `setActive(0)` reconciles the panels (aria +
`hidden`) to the first project at the end.

Consequence: **closing always returns to the first project** (Ledger), matching the
resting design's canonical look (leftmost open). The takeover does not "remember"
which project you were viewing. This is a deliberate trade — the resting cascade has
one correct stacking, and a woven middle/right tab at rest looks wrong against the
left-over-right occlusion.

### The timeline (animated path)

`closeFolder()` flips `open=false` immediately (closing the resize listener's
window) and `opening=true` (the close timeline owns the box), kills any in-flight
hover-lift/plunge so the collapse geometry is clean, then:

1. case-study panel fades out, logo **un-types** (`typeOut`, the reverse of
   `typeIn` — text deletes back to empty), tab labels drop;
2. **beat 1** — folder collapses height back toward the resting box
   (`power3.inOut`);
3. **beat 2** — width shrinks and tabs gather back into the manila cascade
   (`expo.inOut`), strip height returns;
4. identity (name + bio) returns from the left;
5. the badge crossfade masks the deferred state flip (above).

`onComplete` calls `settleResting()`. Reduced motion skips the timeline and calls
`settleResting()` directly.

## Consequences

**Positive:**
- The takeover is now fully reversible with motion that mirrors the open — no page
  reload, scroll/entrance state preserved.
- Close is correct at **any** viewport, including after a resize-while-open, because
  the resting target is measured at close-time.
- The badge reposition is invisible (crossfade), so narrow widths don't snap.
- `clearProps` makes the resting state a clean hand-back to CSS — no inline residue
  to drift out of sync on the next open/resize.

**Negative / costs:**
- `restingMetrics()` forces a **synchronous reflow** (clear → read → restore) on
  every close. One layout pass, no paint, negligible for a click-triggered
  transition — but it is a deliberate forced reflow, noted so a future "why is close
  reflowing?" doesn't read as a bug.
- The close duplicates the open's beat structure by hand (no single shared
  timeline-factory), so a change to the open choreography must be mirrored in close.
  Accepted: the two are *not* exact inverses (close measures fresh, masks the flip,
  clears props) — a shared factory would be more coupling than it saves.
- `settleResting()` enumerates every element + prop it clears; adding a new
  open-state inline style means remembering to clear it here too.

## Alternatives considered (rejected)

- **`location.reload()` (the stub).** Hard reload — loses scroll + entrance state,
  re-fetches, jarring. Never intended to ship.
- **Reverse the open timeline onto the open-time `geometry()` snapshot.** Stale after
  any resize-while-open (problem 1) — the folder would settle at the wrong
  size/place for the current viewport. Measuring at close-time is the fix.
- **Flip `data-home-state` to `resting` at the start of the close.** Snaps the badge
  corner→eyebrow in one frame at narrow widths (problem 2). Deferring the flip behind
  a crossfade hides it.
- **Animate each open inline style back to its resting value instead of
  `clearProps`.** Leaves the inline declarations in place (just set to the resting
  number), so the next resize fights CSS and the layout can drift. `clearProps` hands
  layout fully back to CSS (problem 3).
- **Snapshot the resting box once on init and reuse it.** Wrong after responsive
  reflow (container queries, the badge reposition, the compact cascade re-staggering)
  — the resting layout is itself viewport-dependent, so it must be read at
  close-time.
- **Keep the last-opened tab woven/front through the collapse (preserve selection).**
  Reads as "remember where you were," but leaves the cascade stacked
  right-/middle-on-top — backwards from the resting design's left-top → right-bottom
  occlusion, so a non-leftmost woven tab looks wrong at rest. Resetting the woven tab
  to the first project (§4) keeps one correct resting stack. Revisit only if the
  resting cascade is redesigned to highlight an arbitrary project.

## Files touched

- **Modified:** `design/src/templates/home/home.js` — added `closeFolder()`,
  `restingMetrics()`, `settleResting()`, `typeOut()`; reset the woven/front tab to the
  first project on close (§4, reusing `setActive(0)`); wired the logo click to
  `closeFolder()` (replacing the `location.reload()` stub).
- **Modified:** `design/library/manifest.json` — appended the close animation to the
  Home entry's running-log note.
- **Created:** this ADR.

## Forward links

- The Next port (ADR 0027) re-authors this with `useGSAP()`; the close choreography
  (measure-at-close, deferred state flip, clearProps hand-back) carries over, the
  wiring changes. In React the "measure resting" step is a layout read against the
  resting render rather than a clear/restore of inline styles.
- Mobile takeover (still unbuilt) will need its own close geometry — `restingMetrics`
  already reads the *current* layout, so it should adapt without a second snapshot
  mechanism.
- If the open choreography changes, mirror it in `closeFolder()` (the two are
  hand-kept in sync by design, not a shared factory).
