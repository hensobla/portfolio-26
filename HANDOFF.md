# Handoff — Interactive grid bg wired into the home template

**Updated:** 2026-06-14
**Branch:** `main` (up-to-date with `origin/main`)
**Session length:** one focused session, continuing from the prior interactive-grid-bg session

## Current goal

Close the loop opened in the prior handoff: take the standalone `interactive-grid.js` module (merged at `9f80af4`) and wire it into the home template so the bg appears on the home WIP by default, with the hover wash bound to the home's open/close state. Reduced-motion users get the original paper-wash fallback instead.

## State right now

Done and verified in [preview.html](design/src/templates/home/preview.html) at `http://localhost:8765/src/templates/home/preview.html`.

- **Default load (no params):** `.home--bg-canvas` is applied to the root, the original `::before` paper-wash is hidden, the InteractiveGrid canvas is mounted (`position:fixed; z-index:0`), the hover wash follows the cursor.
- **Opening a project** (`data-home-state="open"`): the hover wash fades to 0 over `--motion-fast` (~120ms), then the rAF loop pauses. Paused frames cost only the bg + grid blit (cells loop short-circuits when `hoverOpacity <= 0`).
- **Closing a project** (`data-home-state="resting"`): the rAF loop resumes, the smoothed cursor position snaps to the current cursor (no swing through the pre-pause spot), and the wash fades back in over `--motion-standard` (~300ms).
- **Reduced motion (`prefers-reduced-motion: reduce`):** `mountBgCanvas()` bails before adding any class or loading the script. The original `::before` paper-wash + solid `var(--background)` remain visible — the home looks exactly like it did before this feature was added.

No console errors. The `restingMetrics()` synchronous flip-and-restore mid-takeover is correctly coalesced by the `lastSeen` guard in the observer.

## What was done this session

- **[design/src/interactive-grid.js](design/src/interactive-grid.js)** — added `hoverOpacity` config (default 1) multiplied into `globalAlpha` around the cells loop, with a `<=0` short-circuit. Added `pause()` / `resume()` — paused state stops the rAF tick but mousemove still tracks the cursor, so `resume()` can snap the smoothed position to the current spot. Exposed a `paused` getter.
- **[design/src/templates/home/home.css](design/src/templates/home/home.css)** — added `.home--bg-canvas` modifier: nullifies the solid `background` and `display:none`s the `::before` paper-wash. The home root keeps `position: relative; z-index` semantics so `.home__identity` / `.home__explorer` (already `z-index: 1`) stay above the canvas at `z-index: 0`.
- **[design/src/templates/home/home.js](design/src/templates/home/home.js)** — added `mountBgCanvas(root)` and `wireGridToHomeState(grid, root)`. `init()` now calls `mountBgCanvas` first. Captures `document.currentScript.src` at module-eval time into `SCRIPT_URL` so the dynamic-load path resolves relative to home.js's own URL (portable across preview.html, sandbox iframes, future consumers).
- **[design/src/templates/home/preview.html](design/src/templates/home/preview.html)** — removed the temporary `?bg=canvas` opt-in (and the `mountInteractiveGridBg` / `wireGridToHomeState` helpers I'd put there). The bg is now default-on via `HomeTemplate.init`.

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Mount the bg from `home.js`, not from each consumer | The bg is part of the home's behavior, not the preview's. Anywhere the home template is rendered (preview, sandbox iframe, future Next port) should get the bg automatically. | Keep mounting in `preview.html` — would have meant every future consumer re-implements the wiring. |
| `MutationObserver` on `data-home-state` rather than per-callsite event hooks | `home.js` flips the attribute at 7+ call sites (open paths + close paths + transient `restingMetrics` flips). One observer covers them all. | Instrument every `setAttribute("data-home-state", …)` call with explicit `bgOpen()` / `bgClose()` hooks — invasive, easy to miss new sites. |
| `lastSeen` guard discards same-value writes | `restingMetrics()` does a synchronous `open → resting → open` flip-and-restore mid-animation for measurement. MutationObserver callbacks are microtasks, so by callback time the attribute has its final value; comparing to `lastSeen` collapses the no-op. | Time-debounce or rAF-debounce — flakier and slower. |
| Mousemove keeps tracking while paused | So `resume()` can snap the smoothed cursor to the **current** position. If we gated mousemove too, the wash would swing back through the pre-pause spot on un-pause. | Pause mousemove entirely — visually wrong on close. |
| Reduced-motion bails *before* applying `.home--bg-canvas` | Falling back to the original `::before` paper-wash means reduced-motion users see the home as it was before this feature, no flat empty bg. | Apply the modifier + skip only the canvas — would have left the home with a flat solid bg and nothing else. |
| Resolve `interactive-grid.js` path against `SCRIPT_URL` (home.js's own URL) | `document.currentScript` captured at module-eval gives a portable base URL; works no matter where home.js is loaded from. | Hardcode `../../interactive-grid.js` — breaks if home.js is ever loaded from a different document URL. |

## Files touched

- **Modified:** [design/src/interactive-grid.js](design/src/interactive-grid.js) — `hoverOpacity` config, `pause()` / `resume()`, alpha gating in render, mousemove tracking unconditional.
- **Modified:** [design/src/templates/home/home.css](design/src/templates/home/home.css) — `.home--bg-canvas` modifier (transparent bg + `::before` `display:none`).
- **Modified:** [design/src/templates/home/home.js](design/src/templates/home/home.js) — `SCRIPT_URL` capture, `mountBgCanvas()`, `wireGridToHomeState()`, `init()` calls `mountBgCanvas` first.
- **Modified:** [design/src/templates/home/preview.html](design/src/templates/home/preview.html) — removed the `?bg=canvas` opt-in helpers; preview is back to vanilla (just renders the template).
- **Referenced (not modified):** [design/HANDOFF.md](design/HANDOFF.md) — older Loomling-side handoff; the home WIP itself hasn't changed structure since.

## Git state

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
	modified:   design/src/interactive-grid.js
	modified:   design/src/templates/home/home.css
	modified:   design/src/templates/home/home.js
	modified:   design/src/templates/home/preview.html
```

```
 design/src/interactive-grid.js         | 41 ++++++++++++++++-
 design/src/templates/home/home.css     |  7 +++
 design/src/templates/home/home.js      | 82 +++++++++++++++++++++++++++++++++-
 design/src/templates/home/preview.html |  3 ++
 4 files changed, 130 insertions(+), 3 deletions(-)
```

After this handoff, the user is committing + pushing (per their explicit request this session).

## Immediate next steps

1. **Smoke-test in the Loom sandbox.** Only verified in standalone preview.html. Open the home via the Loom library viewer (`/library/`) and confirm the bg renders inside the iframe context — sandbox.html sizes the iframe to content, and the canvas is `position: fixed; inset: 0` (full viewport). May behave unexpectedly inside an auto-sizing iframe.
2. **Real interaction pass.** Click a project tab in the standalone preview and confirm the fade-out + pause feels right against the actual GSAP takeover timing. The 120ms fade was a token-scale guess (`--motion-fast`); the user may want the fade to track the takeover's lead-in more tightly.
3. **Carry over to the Next port.** When the home is ported per [ADR 0027](design/decisions/0027-stack-adoption-loomling-overrides-app.md), bring `interactive-grid.js` + the `.home--bg-canvas` CSS rules + `mountBgCanvas`/`wireGridToHomeState` into the React component. The MutationObserver pattern still works there.

## Open questions / blockers

- None. The user asked for this and approved each step ("love it"); nothing waiting on a decision.

## Gotchas for the next session

- **Init order matters.** `mountBgCanvas` runs FIRST in `init()`; if it ever throws, `playEntrance` + `wireTakeover` won't run. Currently it's no-throw on normal paths (script load failures degrade gracefully — no canvas appears, original CSS bg shows).
- **Don't refactor the `lastSeen` guard away.** It's specifically there to absorb `restingMetrics()`'s sync flip-and-restore noise. Without it, the bg would fade out + back in every time `restingMetrics()` runs mid-animation.
- **`prefers-reduced-motion` is read once at init.** Toggling the pref mid-session won't tear down or mount the bg; needs a reload.
- **Cursor position is tracked even while paused** (line ~135 of `interactive-grid.js`). If you ever change `onMouseMove` to skip when paused, `resume()` will snap to a stale cursor and the wash will reappear in the wrong spot.
- **`SCRIPT_URL` is captured at module-eval time** via `document.currentScript`. Changing how home.js is loaded (e.g., via `import()` or `eval`) breaks that — fall back to the literal `../../interactive-grid.js` is hardcoded as a safety net but it assumes preview.html-relative paths.
- **The interactive-grid module is `alpha: false`** (opaque canvas, set in `getContext`). The bg is always the full `bgColor` rectangle even when paused — never transparent. Good for perf, but means the canvas WILL occlude anything behind it; the home's `.home--bg-canvas` modifier handles this by going transparent itself.
