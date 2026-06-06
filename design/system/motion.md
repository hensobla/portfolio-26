# Motion

Loomling's motion foundation is small and opinionated: a token scale for durations and easings, three reveal utilities (`fade-in`, `rise`, `scale-95`), and one looping utility (`pulse`, for live-status dots) — all working harmoniously with any brand. Animation should elevate content, never compete with it.

## Why motion

Three principles, in this order:

1. **Subtle, not signature.** Motion tokens are universal — they don't carry brand personality. A spring easing on a hero is the same spring whether the site is a law firm or a music app.
2. **Performance-first.** CSS animations where possible. JS only where CSS can't reach (reveal-on-scroll needs `IntersectionObserver`). **GSAP is the adopted animation library** (ADR 0028) for motion beyond CSS's reach — it is an escape hatch, not the default. Reach for tokens + CSS first; reach for GSAP only when the effect genuinely requires it (timelines, scrub, complex sequencing).
3. **Accessibility is non-negotiable.** `prefers-reduced-motion: reduce` collapses every duration token to 1ms and forces reveal utilities to their final state. Token-driven, so any component using `var(--motion-*)` is automatically compliant.

## Token surface

Defined in `src/tokens.css`. Reference these — never hardcode durations or easings in component CSS.

### Durations

| Token | Value | Use |
|---|---|---|
| `--motion-instant` | 100ms | Haptic-feel feedback (toggle flip, button press). Should feel like a confirmation, not an animation. |
| `--motion-fast` | 180ms | Hover and focus transitions; micro-interactions. |
| `--motion-standard` | 300ms | Default for most reveals and state changes. The reveal utilities use this. |
| `--motion-slow` | 500ms | Deliberate entrances — modals, drawers. |
| `--motion-slower` | 800ms | Full-screen / page-level transitions. Use sparingly. |

### Easings

| Token | Value | Use |
|---|---|---|
| `--ease-linear` | `linear` | Mechanical, infinite loops (spinner, progress bar). |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default for symmetric enter + leave. Material's "standard" curve. |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Deceleration. Defaults for reveals — content settles into view. |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Acceleration. Use for exits (element leaving the viewport / closing). |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Symmetric S-curve. Use when start and end matter equally. |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Slight overshoot. Use sparingly — adds personality. |

## The reveal pattern

The one motion utility currently in the system. Three named entrances live in `src/motion.css`; `src/motion.js` wires them via `IntersectionObserver`.

### How to mark an element

```html
<div data-loom-reveal="rise">
  <h2>Some content</h2>
</div>
```

Valid values: `fade-in`, `rise`, `scale-95`.

- **`fade-in`** — opacity 0 → 1. Most subtle. Use when the entrance shouldn't draw attention.
- **`rise`** — fades + translates from 16px below. Default choice for content blocks entering the viewport.
- **`scale-95`** — fades + scales from 95%. Use for cards and tiles that should feel like they "settle" into place.

All three use `--motion-standard` (200ms) and `--ease-out`. To customize duration/easing for one element, override on the element directly:

```css
[data-loom-reveal="rise"].my-hero {
  animation-duration: var(--motion-slow);
  animation-timing-function: var(--ease-spring);
}
```

### How it activates

`src/motion.js` auto-runs on `DOMContentLoaded`, scans for `[data-loom-reveal]`, and observes each element. When 10% of the element enters the viewport (with a 10% bottom-margin buffer), it adds `loom-revealed`, which fires the matching keyframe. The observer then unobserves the element — reveals are once-per-page-load.

### Replay button

The System page's Motion section has a refresh-icon button on each reveal demo card. The pattern:

```html
<div class="ds-reveal-card">
  <button class="ds-reveal-card__replay" aria-label="Replay animation">↻</button>
  <div data-loom-reveal="rise">
    <!-- sample content -->
  </div>
</div>
<script>
  document.querySelector('.ds-reveal-card__replay').addEventListener('click', (e) => {
    LoomMotion.replay(e.currentTarget.parentElement);
  });
</script>
```

`LoomMotion.replay(scope)` strips `loom-revealed` from all matching elements in the scope, forces a reflow, and re-observes them. The user can click as many times as they want — each click is a fresh animation cycle.

### Stagger (future)

Not yet in the system. When added, the pattern will be `data-loom-reveal-stagger` on a parent, with children animating sequentially via a CSS custom property (`--loom-stagger-i`). Tracked in [HANDOFF.md].

## Pulse (status indicator)

Added 2026-06-05. The first **continuous / looping** utility — a category beyond the one-shot reveals, so its introduction is a drift-C (this section + an ADR at next `/handoff`, per CLAUDE.md §20). Kept deliberately narrow: a radar-style ping for "live" status dots (e.g. an *available for work* indicator).

```html
<span class="status-dot">
  <span class="status-ping loom-pulse"></span>
</span>
```

The `.loom-pulse` class (in `motion.css`) animates an expanding, fading ring (`loom-pulse` keyframe: `scale(1)`→`scale(2.8)`, opacity `0.55`→`0`, 2s, `--ease-out`, infinite). The element it's applied to should be an absolutely-positioned ring inside a solid dot; both typically use a semantic color (`--success` for "available"). First used in `src/templates/home`.

Because it loops, it is **not** token-duration-driven — so the reduced-motion block disables `.loom-pulse` explicitly (`animation: none !important`) rather than relying on the 1ms collapse.

## State transitions — the folder takeover (GSAP)

> **Status: PROVISIONAL / WIP (not ratified).** The `home` template is still a work in progress. This section logs the approach taken so far so it isn't lost, but it is **not** a finalized system rule and **no ADR has been ratified** for it yet. Treat it as a description of current experimentation; revisit and formalize (or revise) once `home` is approved. Do not propagate this pattern to other elements as settled doctrine until then.

Added 2026-06-05. The first **state-transition** motion — a category beyond the one-shot reveals and the pulse loop — so its introduction is a drift-C (this section + an ADR once finalized, per CLAUDE.md §20). It is GSAP-driven (ADR 0028), lives in `src/templates/home/home.js`, and runs only on an explicit user action, never on load.

The pattern (home "folder takeover"): clicking a project animates the homepage from its resting two-column layout into a full-screen folder —

1. the name + bio fade out to the left (the availability badge stays — it becomes nav);
2. the folder is pinned out of the grid and stretches to full **width**; the trapezoidal tabs animate from their compact cascade to an even spread, labels fading in;
3. immediately after, the folder grows to fill the **height** (a deliberate two-beat width-then-height expansion);
4. the name types into a top-left nav logo (which, with the badge, forms the open-state nav).

Rules for state-transition motion:

- **Tokens for timing.** Durations come from the `--motion-*` scale (`slow`, `slower`); eases use GSAP's advanced built-ins (`expo.out`, `power3.inOut`, `back.out`) mapped to the token intent. No CustomEase plugin (it would need vendoring per ADR 0028).
- **Reduced motion is explicit.** GSAP bypasses the CSS 1ms collapse, so the handler checks `prefers-reduced-motion` and jumps straight to the end state.
- **Triggered, never automatic.** State transitions fire on user action only.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` in `motion.css` does two things:

1. Sets every `--motion-*` duration token to `1ms`. Every transition or animation in the system that references those tokens collapses to imperceptible. **This is the canonical accessibility trick** — components don't need their own reduced-motion blocks if they use tokens.
2. Forces `[data-loom-reveal]` elements to their final visible state with `!important` and removes the animation. Content is never permanently hidden.

To test: Chrome DevTools → Rendering panel → "Emulate CSS prefers-reduced-motion" → "reduce". Reload the Motion section on the System page; the duration-row dots stop animating, easing curves snap to end, and reveal demos render in their final state. Replay buttons still re-trigger the JS but the CSS no-op makes the animation invisible.

When adding a new keyframe to `motion.css`, also add a reduced-motion no-op block alongside it. This is one of the rules in CLAUDE.md §20.

## Adding new animations

Follows the drift protocol (CLAUDE.md §5):

- **B — Extend.** Add a new keyframe + utility class to `motion.css`, register a demo card in the System page Motion section, document the new utility in this file. Suitable when the new animation is in the spirit of the existing set (subtle, brand-agnostic, performance-friendly).
- **C — Amend.** Rewrite the philosophy or scope of this doc itself (e.g., introducing a state-transition category, or formalizing micro-interactions). Append an ADR to `decisions/` per CLAUDE.md §10.

Adding a third-party animation library is **not** a drift B — it's a stack-declaration-level decision with bundle-size + framework-binding implications, requiring its own ADR. **GSAP `3.15.0` has been adopted** on these terms (ADR 0028): npm `gsap` + `@gsap/react` (`useGSAP()` hook) in the Next app; a vendored `src/vendor/gsap.min.js` in the Loom, **opt-in per preview** via `<script src="../../vendor/gsap.min.js"></script>` (path from `src/<category>/<slug>/preview.html`). GSAP code still references the motion token scale for durations/easings, and must guard `prefers-reduced-motion` **explicitly** — GSAP bypasses the CSS `--motion-*`→1ms collapse, so the centralized reduced-motion trick does not cover it. Adopting a different library (Motion One, Framer Motion, …) would still require a fresh ADR.

## Out of scope (intentional)

This pass ships reveals only. The following are deferred follow-ups:

- **Micro-interactions** — hover lifts, focus pulses, button press depressions. Twenty-six primitives currently hardcode `transition: <prop> 120ms ease`; a focused migration would replace those with `var(--motion-fast) var(--ease-standard)`.
- **State transitions** — accordion expand, modal/toast enter/exit, tab indicator slide. Partially implemented in current primitives but not tokenized.
- **Stagger** — children of a container animating in sequence.
- **Per-primitive replay hooks** — individual primitive previews don't have replay buttons. The Motion section on the System page is the single playground.
- **Motion-related dark-mode overrides** — none exist; motion is theme-agnostic.

Each of these can come back in a future feature pass with its own plan.
