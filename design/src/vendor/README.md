# vendor/

Third-party libraries vendored for the Loom (vanilla, no bundler — CLAUDE.md §11).

## gsap.min.js — GSAP 3.15.0

Adopted in ADR 0028. **Opt-in, not auto-loaded.** A preview or template that needs
GSAP includes it explicitly:

```html
<!-- from src/<category>/<slug>/preview.html -->
<script src="../../vendor/gsap.min.js"></script>
```

`window.gsap` is then available. Reach for tokens + CSS reveals first (see
`system/motion.md`); use GSAP only for motion beyond CSS's reach (timelines, scrub,
complex sequencing).

**Rules (`system/motion.md` / CLAUDE.md §20):**
- Reference the motion token scale (`--motion-*`, `--ease-*`) for durations/easings —
  don't hardcode.
- Guard `prefers-reduced-motion` **explicitly** — GSAP bypasses the CSS
  `--motion-*`→1ms collapse, e.g.:
  ```js
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.to('.x', { /* ... */ });
  }
  ```

**Pinned to the npm version.** The Next app uses `gsap` 3.15.0 via npm; this file is
the matching UMD build. Keep both on the same major — bump together. Adding a GSAP
plugin (ScrollTrigger, Flip, …) means vendoring its `dist/*.min.js` here too and
noting it in ADR 0028.
