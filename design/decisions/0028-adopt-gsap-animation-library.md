# ADR 0028 — Adopt GSAP as the animation library (app + design workspace)

**Date:** 2026-06-05
**Status:** accepted

## Context

`system/motion.md` and CLAUDE.md §20 establish "no external animation library by
default" — the motion foundation is intentionally small (duration/easing tokens,
three reveal utilities, one `pulse` loop), CSS-first, with JS only where CSS can't
reach. Adding a third-party library is explicitly called out as **both** a drift-C
(it rewrites that philosophy) **and** a stack-declaration-level decision (§10),
because such libraries carry bundle-size and framework-binding implications.

The user asked to add **GSAP** to the project, and chose to make it available in
**both** parts of the repo:

1. **The Next app (`src/`)** — the deployable site, React 19. GSAP is the animation
   engine for production motion as the Blueprint homepage and components are ported
   from Loomling (ADR 0027).
2. **`design/` (Loomling)** — so motion can be prototyped in the vanilla Loom before
   being ported to React, keeping design the source of truth for look *and* feel.

GSAP became fully free (all plugins included) after the Webflow acquisition, which
removes the historical licensing cost that previously argued against it.

## Decision

1. **Adopt GSAP `3.15.0` as the project's animation library.**

2. **Next app:** installed via npm — `gsap` + `@gsap/react` (the official React
   integration providing the `useGSAP()` hook for scoped, auto-cleaned animations).
   Recorded in the parent `package.json`.

3. **Design workspace:** a local copy of the UMD build lives at
   `design/src/vendor/gsap.min.js` (no bundler in the Loom; vanilla per §11). It is
   **opt-in, not auto-loaded** — a preview/template that wants GSAP adds
   `<script src="../../vendor/gsap.min.js"></script>` (path relative to
   `src/<category>/<slug>/preview.html`). The default motion path remains the
   token-driven CSS reveals; GSAP is reached for only when CSS/IntersectionObserver
   genuinely can't express the motion (timelines, scrub, complex sequencing).

4. **Tokens still govern.** GSAP animations reference the motion token scale
   (durations/easings from `tokens.css`) rather than hardcoding values, so the system
   stays coherent and `prefers-reduced-motion` handling stays centralized. GSAP code
   must guard reduced-motion explicitly (see §20 / `motion.md`), since GSAP bypasses
   the CSS `--motion-*`→1ms collapse.

5. **CSS-first remains the default.** GSAP does not replace the reveal/pulse
   utilities; it's an escape hatch for motion beyond their reach. Reach for tokens +
   CSS first; reach for GSAP when the effect requires it.

## Consequences

**Positive:**
- One animation engine across design and production — motion prototyped in Loomling
  ports to the React app without re-authoring in a different paradigm.
- `@gsap/react`'s `useGSAP()` gives correct cleanup/scoping in React 19, avoiding the
  usual `useEffect` + manual-revert boilerplate.
- All GSAP plugins are available at no cost.

**Negative / costs:**
- A ~73 KB (minified) dependency enters both surfaces. In the app it ships only to
  routes that import it; in the Loom it loads only in previews that opt in.
- The "no external library" purity of `motion.md` is gone — the bar for *new* motion
  is now "tokens + CSS first, GSAP when needed," not "CSS only."
- Two delivery mechanisms for one library (npm in the app, vendored file in the Loom)
  must be kept on the same major version by hand. The vendored copy is pinned to the
  npm version at adoption (3.15.0); bumping one means bumping the other.

## Alternatives considered (rejected)

- **Vanilla extension only** (keep the §20 stance, add more CSS keyframes) — the
  user's intended motion (timeline sequencing, scrub-linked effects) is beyond what
  CSS + IntersectionObserver express cleanly; rejected.
- **Motion One / Framer Motion** — Motion One is lighter but less capable for complex
  timelines; Framer Motion is React-only, so it couldn't serve the vanilla Loom
  (defeating the "prototype in design, port to app" goal). GSAP works in both.
- **App-only install** — simpler, but breaks the design-is-source-of-truth workflow
  (ADR 0027); the user explicitly chose "both."
- **CDN script in the Loom** — rejected for the workspace: the Loom is never public
  and is often worked on offline; a vendored local file keeps previews self-contained.

## Files touched

- **Modified:** `../package.json` (added `gsap`, `@gsap/react`), `system/motion.md`
  (amended — drift C: library now adopted), this is recorded here per §20.
- **Created:** `design/src/vendor/gsap.min.js` (vendored UMD build, 3.15.0),
  `design/src/vendor/README.md`, this ADR.

## Forward links

- When a Loomling element using GSAP is published to the app (ADR 0027 bridge), its
  motion is re-authored with `useGSAP()` rather than the vanilla `<script>` include;
  the timeline/easing intent carries over, the wiring changes.
- If GSAP plugins beyond core (ScrollTrigger, Flip, etc.) get used, vendor the
  matching `dist/*.min.js` into `design/src/vendor/` alongside core and note it here.
- Keep the vendored Loom copy and the npm version on the same major; bump together.
