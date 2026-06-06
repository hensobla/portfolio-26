# Typography

> **Status:** Seeded 2026-06-05 from the **Blueprint** brand kit. *Confident display, quiet body, pixel-mono labels.* Display = Archivo (heavy, tight), body = Hanken Grotesk, mono = Departure Mono (a pixel font used as a deliberate accent, not connective tissue). See § Families.

## Type scale

Stepped, named, and bounded — no ad-hoc font sizes in components.

| Role | Token | Default | Use |
|---|---|---|---|
| Display XL | `--type-display-xl` | 4.5rem | Hero headlines (one per page) |
| Display L | `--type-display-l` | 3rem | Section openers |
| Display M | `--type-display-m` | 2.25rem | Sub-section heads |
| Display S | `--type-display-s` | 1.75rem | Card titles, prominent labels |
| Body L | `--type-body-l` | 1.25rem | Lead paragraphs |
| Body | `--type-body` | 1rem | Default body copy |
| Body S | `--type-body-s` | 0.875rem | Captions, helper text |
| Mono | `--type-mono` | 0.875rem | Code, technical inline |

## Eyebrow

A composed text role for small, uppercase, letter-spaced labels above headlines and section openers. Was previously a standalone component; demoted to a typography role on 2026-05-22 because it's a text style, not a UI control.

| Sub-token | Default | Use |
|---|---|---|
| `--eyebrow-family` | `var(--font-mono)` | Departure Mono — the blueprint's technical-label voice |
| `--eyebrow-size` | `0.6875rem` | 11px — the pixel font's crisp size |
| `--eyebrow-weight` | `400` | Departure Mono ships a single weight |
| `--eyebrow-tracking` | `0.16em` | Generous letter-spacing |
| `--eyebrow-transform` | `uppercase` | Caps-only — never sentence-case |
| `--eyebrow-color` | `var(--text3)` | Muted; never accent by default |

> Retuned 2026-06-05 from the body-font eyebrow to the blueprint's pixel-mono kicker/figure-label style. Auto-flips in dark via `--text3`.

Apply the role in a module/template's scoped CSS:

```css
.module__eyebrow {
  display: inline-block;
  font-family:    var(--eyebrow-family);
  font-size:      var(--eyebrow-size);
  font-weight:    var(--eyebrow-weight);
  letter-spacing: var(--eyebrow-tracking);
  text-transform: var(--eyebrow-transform);
  color:          var(--eyebrow-color);
  line-height: 1.2;
}
```

The pattern: the consuming module owns the class name and the layout (display, line-height, spacing); the tokens carry the text characteristics so every eyebrow stays consistent project-wide.

## Families

Three families (the max). Seeded from the Blueprint brand kit:

| Role | Token | Family | Why |
|---|---|---|---|
| Display | `--font-display` | **Archivo** 700–900, tight tracking (−0.02 to −0.03em), line-height ~0.95–1.05 | Geometric, confident headline voice; carries impact at hero scale. |
| Body | `--font-body` | **Hanken Grotesk** 400–600 | Humanist grotesque; quiet, highly readable for long-form + UI. |
| Mono | `--font-mono` | **Departure Mono** → `Spline Sans Mono` → `ui-monospace` | Pixel font as a *deliberate accent* — figure numbers, eyebrows, tags. Precision character. |

*Pairing rationale:* geometric sans display + humanist sans body = unified modernism with everyday readability; the pixel mono adds the "technical drawing / blueprint" character without a third tone fighting the other two.

### Mono discipline (important)

Departure Mono is a **pixel font**: crisp only at multiples of **11px**, and it reads as a costume if spread across body-length runs. Use it **only** for short labels — eyebrows, figure numbers (`FIG.001`), tags, single metrics. Anything that is a real phrase or a long string (paths, descriptions, code blocks) should fall back to `--font-body`, not `--font-mono`. The fallback chain degrades to `Spline Sans Mono` for any longer mono need.

### Load recipe

Loom previews load the families via `src/fonts.css` (`@import`-ed by `tokens.css`):

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap');
/* + a self-hosted @font-face for Departure Mono (SIL OFL, woff2 base64) */
```

The **parent Next app** loads these via `next/font` instead — so when hand-porting `tokens.css` upward, drop the `@import url('./fonts.css')` line and wire Archivo / Hanken Grotesk / Departure Mono through `next/font` (Departure Mono as a local font). Archivo already ships in the parent.

A project can collapse display + body into one family. It cannot exceed three families without an ADR. Departure Mono + Spline Sans Mono share the single mono *role* (primary + fallback), not a fourth family.

## Letter-spacing

Tokenized (never raw in component CSS), seeded from the blueprint's tight-display / wide-mono character. Added 2026-06-05 (drift-B) when building the home template's wordmark.

| Token | Value | Use |
|---|---|---|
| `--tracking-display` | −0.03em | Archivo display (names, headlines) — runs tight |
| `--tracking-normal` | 0 | Body default |
| `--tracking-wide` | 0.04em | Mono meta / file-path labels |
| `--eyebrow-tracking` | 0.16em | Eyebrow caps (see § Eyebrow) |

## Line height

- Display sizes: 1.05–1.15.
- Body sizes: 1.5–1.65.
- Mono: 1.5.

## Measure

`--measure` caps reading line length. Default `65ch`. Body copy at full width is forbidden — wrap it in something that respects measure.

## Weight discipline

- Don't use more than 3 weights from any one family.
- Italic counts as a weight variant, not a separate decision.

## Drift behavior

- New size needed → either fit to an existing step or add a step (extend). Bare px values are not acceptable.
- New family → requires an ADR (max-three rule).
