# Handoff — Interactive grid background for homepage

**Updated:** 2026-06-14
**Branch:** `play/interactive-bg`
**Session length:** ~one long session (exploration → extraction)

## Current goal

Build a tasteful, lightweight interactive background for the homepage WIP. The session shipped a reusable module — [`design/src/interactive-grid.js`](design/src/interactive-grid.js) — that mounts a fixed-position canvas, draws a 32px grid wash aligned to `--space-6` (the same token the homepage `::before` wash already uses), and shades cells under the cursor with an eased follow. Defaults are token-driven so it Just Works on the homepage with no configuration.

The next step is wiring the module into `design/src/templates/home/` and removing the static `::before` grid wash. That's intentionally a separate session — this branch is the source artifact.

## State right now

Everything works. The two lab files render correctly, the module loads via `<script>` and exposes `window.InteractiveGrid.mount(opts)`, and homepage integration is documented but not done.

- **Interactive lab** (default): http://localhost:8765/lab-bg-dots.html — uses the module, panel tunes `radiusSize`, `radiusShape`, `hoverColor`, `delay` (smoothing tau), `bgColor`. Toggle "Show content overlay" to preview the bg under the real homepage markup (fetched + rendered with `gsap` + `home.js`).
- **Image-mode archive**: http://localhost:8765/lab-bg-dots-image.html — earlier dot-image grid (mountains rendered as dots, density/three-radius weights, morph between images). Self-contained, no shared deps with the interactive module. Kept for future projects that want image-as-dot bgs.
- **Module**: [`design/src/interactive-grid.js`](design/src/interactive-grid.js) — vanilla, ~252 lines, no deps. Mounts canvas, returns `{ update, destroy, config }`.

Verified:
- Idle CPU is literal zero (rAF only fires when cursor moves or smoothing is converging — see dirty-flag pattern in `interactive-grid.js` `markDirty`/`tick`).
- Grid cell size = `--space-6` = 32px CSS (probed empirically via 1px stroke detection).
- No black flicker on viewport resize (paints synchronously inside `resizeGrid` instead of going through `markDirty`).
- Shading persists when cursor leaves the viewport; eases to new position on re-entry. `mouse.seen` is sticky-true after the first mousemove.

## What was done this session

- Created [`design/lab-bg-dots.html`](design/lab-bg-dots.html) — interactive lab. Thin shell around `interactive-grid.js`.
- Created [`design/lab-bg-dots-image.html`](design/lab-bg-dots-image.html) — image-as-dots archive (mountains source + procedural shapes, density/light/medium/heavy radii, morph between images, color/bg pickers, invert).
- Created [`design/src/interactive-grid.js`](design/src/interactive-grid.js) — the extracted module. Token-driven defaults (`--space-6`, `--background`, `--border`), dirty-flag rendering, ResizeObserver, eased cursor follow with sticky-on-leave behavior, offscreen grid-cache, public `update`/`destroy`/`config` API.
- Added [`design/lab-assets/two-tone-mountains-wide.png`](design/lab-assets/two-tone-mountains-wide.png) — source image for the archive's dot rendering.

Lab iterations along the way (the journey, in order):
1. Dot-grid that samples brightness from a procedural image → renders three dot weights (light/medium/heavy).
2. Added the user's two-tone mountains PNG; resized the offscreen sample canvas to match viewport aspect (was squishing wide images).
3. Added a second "interactive" mode in the same lab: hover ring + click-wave on a uniform dot field. Wave used eased ring expansion + per-cell falloff blend.
4. Switched the interactive variation to the homepage grid wash style — square grid lines on a 32px grid, **binary** cell shading (no gradient), three radius shapes (circle / square / diamond). Click ripple dropped.
5. Added eased cursor follow with `smoothTau` ms time-constant. Snap on first move / re-entry.
6. Tweaked defaults to reference values shared by the user (image mode density 72, interactive density 32, soft dot color `#B1B8E2`, morph 1400ms, soft hover `#F0EBE5` → later `#F2EFE8`).
7. Locked cell size to `--space-6` (32px), dropped the density slider in interactive mode, added a hint that the grid matches the site grid.
8. Added a "Show content overlay" toggle in the panel that fetches `home.html` + boots `HomeTemplate.init(root)` over the bg, so the user can preview the bg under real homepage chrome.
9. Split the two modes into two files: image stuff into `lab-bg-dots-image.html`, interactive-only in `lab-bg-dots.html`. Added dirty-flag rendering and offscreen grid cache for perf.
10. Fixed black-flicker on viewport resize by painting synchronously inside `resizeGrid` (canvas was `alpha:false`, so `canvas.width = X` cleared to opaque black until next rAF).
11. Switched cursor-leave behavior from "shading vanishes" to "shading persists at last position, eases to new spot on re-entry" — sticky `mouse.seen` instead of toggling `inside`.
12. Extracted everything generic into `design/src/interactive-grid.js`. Lab now mounts the module and forwards panel changes through `grid.update(patch)`.

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Bg is an extractable module (`src/interactive-grid.js`), not a vendored copy inside the homepage template | Lets the homepage import it via plain `<script>` and pass overrides; future projects can pull the same module; lab + homepage share one source of truth | Inlining the canvas code into `home.js` (would couple bg to template, harder to reuse); class-based wrapper (overkill for a 250-line module) |
| Grid cell size locked to `--space-6` (32px) | Same token the homepage `::before` wash already uses; ensures pixel-perfect alignment between the lab bg, the homepage grid wash, and any content laid out on that rhythm | A density slider (was in the lab earlier; dropped once the user asked for grid alignment); reading from a custom token (no need — `--space-6` already conveys this meaning) |
| Binary cell shading (no gradient falloff at the radius edge) | User explicitly asked for "choose cells to shade entirely; don't use a gradient." Reads cleanly as a Blueprint-style halftone, not as a glow | Smoothstep blend toward edge (earlier wave version had this — abandoned with the "binary" pivot) |
| Cursor-leave behavior: shading persists at last position, eases to new spot on re-entry. `mouse.seen` flips true on first mousemove and stays true | Felt unphysical to have the panel "vanish" when cursor crosses into the panel chrome or off-screen; persistence + eased re-entry gives the bg a sense of inertia | Snap on re-entry (was in earlier version); shading invisible while `!inside` (the first iteration) |
| Dirty-flag rAF loop, not continuous | Lab + homepage will have this bg sitting passively most of the time. 60Hz idle redraw is wasteful and battery-unfriendly. Zero CPU when idle, verified empirically (0 rAFs in 1s of no input). | Continuous rAF (works but burns cycles); IntersectionObserver-gated rendering (more complex than needed) |
| Paint synchronously inside `resizeGrid()` after canvas reset, in addition to scheduling rAF | `canvas.width = X` + `getContext('2d', {alpha:false})` clears the backing store to opaque black; without a sync paint, there's one frame of black during resize drag | Skip `alpha:false` (worse compositing perf); skip canvas resize on every event and rely on stretching (introduces blur during drag) |
| Image-mode kept in a separate archive file rather than deleted | User explicitly wanted to "file it away" for other projects; image-as-dots is a distinct primitive that doesn't belong in the interactive bg artifact | Delete it (loses the work); merge both into one file (conflates two unrelated bg concepts) |
| Lab file (`lab-bg-dots.html`) loads `gsap.min.js` + `home.js` for the content overlay preview | The content overlay's purpose is showing the bg under the REAL homepage chrome; without `home.js` + GSAP, the folder art doesn't paint and the visual is misleading | Lazy-loading these only when overlay is enabled (more complex; deferred scripts already cost ~0 if the overlay never fires) |

## Files touched

- **Created:** `design/lab-bg-dots.html` — interactive grid lab; thin wrapper around `src/interactive-grid.js`. 347 lines.
- **Created:** `design/lab-bg-dots-image.html` — image-as-dots archive (mountains + 5 procedural shapes, density/light/medium/heavy radii, color pickers, invert, morph between images). 768 lines. Self-contained, no `interactive-grid.js` dependency.
- **Created:** `design/src/interactive-grid.js` — the extractable bg module. Vanilla, ~252 lines. `window.InteractiveGrid.mount(opts) → { update, destroy, config }`. Token-driven defaults from `--space-6` / `--background` / `--border`.
- **Created:** `design/lab-assets/two-tone-mountains-wide.png` — source image for `lab-bg-dots-image.html`. ~2.7 MB.
- **Referenced (not modified):** `design/src/templates/home/home.css` — its `::before` grid wash on `[data-loom-template="home"]` (lines ~23–37) is the alignment target the module matches. The homepage integration will delete this rule once it adopts the canvas.
- **Referenced (not modified):** `design/src/tokens.css` — `--space-6`, `--background`, `--border` are the tokens the module reads at mount time.
- **Referenced (not modified):** `design/src/templates/home/home.js`, `design/src/vendor/gsap.min.js` — loaded by `lab-bg-dots.html` for the "Show content overlay" preview; not consumed by the interactive bg itself.

## Git state (at handoff time)

```
On branch play/interactive-bg
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	design/lab-assets/
	design/lab-bg-dots-image.html
	design/lab-bg-dots.html
	design/src/interactive-grid.js

nothing added to commit but untracked files present (use "git add" to track)
```

The `/handoff commit push merge` invocation stages, commits, pushes, and merges to `main` after this file is written.

## Immediate next steps

1. **Wire `InteractiveGrid` into the homepage template.** Add `<script src="../../interactive-grid.js" defer></script>` to `design/src/templates/home/preview.html`; call `window.InteractiveGrid.mount({ container: root })` inside `home.js`' `init()`; remove the `::before` rule from `home.css`. The mounted canvas defaults to `z-index: 0`; `.home__identity` / `.home__explorer` already sit at `z-index: 1`, so no further CSS changes needed.
2. **Decide whether the hover-color override sticks.** `#F2EFE8` is the current default in the module; visually it's a very-pale warm gray, almost invisible against `--background` `#F7F4EE`. The user picked this on purpose for a quiet, technical-drawing-on-paper feel. If it reads as "the bg is broken" once mounted on the homepage, bump the contrast slightly (try `#EDE7DD` or similar warm gray).
3. **Test the bg on the homepage's open-folder state**, where the right side fills with project panels. The dim shading should slide under the folder art without fighting it. If it does fight: lower hover-color contrast further or drop `hoverRadius` to ~120.
4. **Then consider an ADR**: this is a meaningful architectural addition (a canvas-backed bg module that the homepage adopts). Pattern is similar to ADR 0027 (Loomling overriding the app). Write `design/decisions/0033-interactive-grid-bg.md` covering: chose extractable module over inlining, locked to `--space-6` for grid alignment, dirty-flag rAF for idle-zero CPU, sticky cursor-leave behavior.

## Open questions / blockers

- The hover color `#F2EFE8` is a personal-taste call. It's barely visible — that may be exactly right, or it may not survive contact with real content. The homepage integration session will be the judge.
- No decision yet on whether the homepage uses `position: fixed` (current module default — bg stays put, content scrolls) or `position: absolute` inside the template (bg scrolls with content). The homepage hits `min-height: 100svh`; if content rarely scrolls past one viewport, this doesn't matter. If it does, `fixed` will feel more like a backdrop.
- The lab's "Show content overlay" toggle loads the home template via `fetch`. That works locally because everything's served from `design/` by the `loomling-static` server, but a future port to the Next.js app side would need a different path. Not blocking this branch.

## Gotchas for the next session

- **Headless preview rAF pauses.** When verifying via the Claude Preview MCP, `requestAnimationFrame` callbacks can be paused while the tab isn't being interacted with. If you mount the module and the canvas appears blank, dispatch a `mousemove` on `document` to wake the loop. (The lab does this implicitly via the panel controls.)
- **Don't trust pre-screenshot panel state.** The Preview MCP's screenshot tool sometimes fires synthetic key events that toggle the H-key panel-hide handler. The lab's keydown handler now guards on `e.isTrusted` for that reason. If you add new keyboard handlers in future, do the same.
- **`canvas.getContext('2d', { alpha: false })` clears to opaque black on `canvas.width =` assignment.** The module already paints synchronously after a resize to mask this; keep that ordering if you refactor.
- **Module assumes one mount per page.** It attaches a `document.addEventListener('mousemove', ...)` and a `ResizeObserver` on `documentElement`. Calling `mount()` twice gives you two listeners + two canvases. If the homepage ever wants multiple grids, the module's listener attachment needs to scope to the container.
- **`readSpaceToken` works by appending a probe `<div>` to the container.** If you mount inside a container that's `display: none` at mount time, `offsetWidth` returns 0 and the module falls back to `32`. Mount AFTER the container is visible.
- **Image archive lab is self-contained.** Don't try to share code between `lab-bg-dots-image.html` and `lab-bg-dots.html` — they're different bg concepts, and the archive's whole purpose is being a copy-paste-able reference for future image-as-dots projects.
- **The grid wash's color comes from `--border`.** If you ever override `--border` for accessibility (e.g., higher-contrast borders), the grid lines will get louder too. That's probably desirable, but worth knowing.
