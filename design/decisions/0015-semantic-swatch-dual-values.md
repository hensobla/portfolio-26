# ADR 0015 — System-page semantic swatches: dual light/dark values + `theme-ready` propagation

**Date:** 2026-05-27
**Status:** accepted

## Context

The System page (`library/tokens.html`) renders the user's color tokens in two sections: SEMANTIC (`--background`, `--text1`, `--accent`, …) and PRIMITIVES (`--color-neutral-500`, …). Semantic tokens re-point at different primitives between light and dark themes via the `[data-theme="dark"]` block in `src/tokens.css`; primitives are theme-invariant.

Originally each semantic swatch showed only the *active* theme's hex. To see a token's dark value while in light mode, the user had to flip the Loom theme toggle and look again. The user asked to surface both values at once:

> "are the semantic tokens showing the dark mode versions of things? … can we make it so [I can see both]"

This compounded into a small cluster of related decisions about how the swatch renders, how it reads the opposite value, how it stays the same height as primitive tiles, and how the copy interactions work.

## Decision

### 1. Dual-value layout, gated on `userDsHasDark`

When the user's design system declares a `[data-theme="dark"]` block, each semantic swatch renders a `.ds-swatch--dual` variant: the body shows the token name, then two rows — `LIGHT #hex` and `DARK #hex` — with the **active** theme's row emphasized (`--lib-ink`, weight 600) and the opposite muted (`--lib-muted`, weight 400). Labels are uppercase `LIGHT` / `DARK` always in that order regardless of active theme; emphasis (not order) signals which is live.

The feature is **gated on `window.Theme.userDsHasDark`** (from `library/theme.js`). When the user DS has no dark block, semantic swatches fall back to the original single-value layout — no misleading "DARK" rows that just repeat the light value. Primitives always use the single-value layout (they don't change between themes).

### 2. `loomling:theme-ready` event — new propagation mechanism

`renderSemantic()` reads `Theme.userDsHasDark` synchronously, but `Theme.init()` detects dark support **asynchronously** (it `fetch`es `src/tokens.css` and regex-scans for a dark block). On first paint, `initTokens()` runs before that fetch resolves, so the flag is still `false` and the first render misses the dual layout.

Fix: `theme.js` now dispatches a **`loomling:theme-ready`** CustomEvent on `document` after its async detection completes (in both `Theme.init()` and `Theme.refreshDetection()`). `tokens.js` listens for it and re-runs `renderSemantic()`. This is the initial-render companion to the existing `loomling:theme-changed` event (which fires on every toggle and was already wired to re-render).

### 3. Reading the opposite-mode value

`renderSemantic()` captures both values by **temporarily flipping `data-theme` on `<html>`**, sampling `getComputedStyle` for every semantic token, then restoring the attribute. The flip + restore is fully synchronous JavaScript — no paint occurs between the mutations, so it is invisible to the user. No CSS parsing or stylesheet walking required.

### 4. Height parity with primitive tiles

The user requires semantic and primitive tiles to be the same height. They naturally differ: primitive names (`--color-neutral-500`) wrap to 2 lines while semantic names are short, and the dual body has 3 rows. Parity is achieved by **trimming the dual chip's flex-basis** (`.ds-swatch--dual .ds-swatch__chip { flex: 1 0 68px }`) to absorb the taller body, landing both card types at exactly **148px**. The body's bottom padding was moved onto the opposite row (see #5), but total height is preserved. When font sizes or padding change, this basis is the knob to re-tune — verify with both card types measuring equal.

### 5. Two-zone copy on a single button

The card is one `<button>`. It is split into two click zones by `e.target`:

- **Top zone** (chip + token + active row) → copies the active-mode hex (chip flashes a check).
- **Bottom zone** (the opposite `.ds-swatch__mode-row--opposite`, which bleeds full-width via `margin: 0 -10px` and carries the bottom padding so its hit area reaches the card's bottom edge) → copies the opposite-mode hex.

A small copy icon sits in the opposite row as the affordance (reveals on row hover, flashes a check on copy). The click handler detects `e.target.closest('.ds-swatch__mode-row--opposite')` and branches; no nested `<button>` (which would be invalid HTML).

`:has()` coordinates the two affordances: `.ds-swatch--dual:has(.ds-swatch__mode-row--opposite:hover) .ds-swatch__copy { opacity: 0 }` hides the chip's active-copy icon while the cursor is over the bottom zone, so only one copy target shows at a time.

### 6. `--lib-brand` token (related, minor)

The Loom nav wordmark (`library/loomling-logo.svg`) is colored via a new `--lib-brand: #2554f7` token in `library.css`, **not** `--lib-accent`. Rationale: the brand color should be independent of the focus-ring accent (which could drift) and **locked across light/dark** (no dark-mode override) for brand consistency. The SVG uses `fill="currentColor"` so the token drives it.

## Consequences

- **Backend-correctness principle (CLAUDE.md §16) holds**: the designer just looks; the dual values, gating, and theme-tracking are all derived automatically. Nothing about this surfaces as a designer-facing knob.
- **`theme-ready` is now the canonical "detection done" signal.** Any future System-page (or other) UI that depends on `userDsHasDark` should listen for `loomling:theme-ready` rather than reading the flag once at init. Reading it synchronously during `initTokens` is a race.
- **Copy is mouse-only for the opposite value.** Because the card is a single button, the bottom zone can't be a real focusable element (nested interactive content is invalid). Enter/Space on the card copies the active value; there is no keyboard path to the opposite value. Accepted for an internal dev tool; flagged if keyboard parity ever matters.
- **The 148px parity is content-coupled.** It depends on current font sizes and the wrapped-name height of primitives. Font-size changes (this session bumped the rows to 12px / labels to 10px) require re-trimming the dual chip basis. There is no `min-height` lock — chosen to keep "as little height as possible" per the user's request rather than forcing all cards to the tallest natural height.

## Alternatives considered

- **Gate on `Theme.propagatesToUser` instead of `userDsHasDark`** — rejected. `propagatesToUser` is true under `darkMode: "always"` even with no dark tokens (the dual rows would repeat the same value). `userDsHasDark` ("the CSS actually defines dark values") is the correct condition. A project with `darkMode: "never"` but real dark tokens still shows the dual rows as informative reference, which is desirable.
- **Hover-reveal or tooltip for the opposite value** (mocked live as options B/C) — rejected by the user in favor of always-visible dual values (option A). The hover-swap variant also caused transient layout shift.
- **`min-height` lock for height parity** — rejected. It either inflates semantic cards by ~15px (to match the tallest primitive) or causes a chip-height mismatch via flex-grow. Trimming the chip basis keeps the height addition minimal, which the user explicitly prioritized.
- **Reuse `--lib-accent` for the wordmark** — rejected so the brand color can't drift with the focus-ring accent and stays theme-locked.
- **A separate hover tint on the bottom copy zone** — built, then removed at the user's request; they found it too heavy. The copy icon alone is the affordance now.

## Files touched in the originating session (2026-05-27)

- **Created:** `library/loomling-logo.svg` (wordmark, `currentColor`), `library/loomling-lettermark.svg` (single-glyph "L", favicon, `currentColor`).
- **Modified:** `library/theme.js` — dispatch `loomling:theme-ready` after async dark detection in `Theme.init()` and `Theme.refreshDetection()`.
- **Modified:** `library/tokens.js` — `renderSemantic()` captures light+dark via temp `data-theme` flip, gates on `userDsHasDark`; `swatch(token, value, opts)` renders the dual body + opposite-row copy icon and branches its click handler by zone; extracted `writeClipboard()` helper; added `copyModeValue()`; listens for `loomling:theme-ready` and `loomling:theme-changed` to re-render.
- **Modified:** `library/library.css` — `--lib-brand` token; `.lib-brand__mark` is now a `mask-image` of the wordmark sized 94×23; `.ds-swatch--dual` chip/body, `.ds-swatch__mode-row` (active/opposite), `.ds-swatch__mode-tag`, `.ds-swatch__mode-copy`; `:has()` rule hiding the chip copy icon on bottom-zone hover; removed the brand "Loomling" text span styles.
- **Modified:** All Loom HTMLs (`index/tokens/components/builder/settings/sandbox/preview`) — `<link rel="icon">` favicon; removed the visible "Loomling" text span (wordmark replaces it) on the six pages with a nav.

## Forward links

- Bumping `.ds-swatch__mode-row` / `.ds-swatch__mode-tag` font sizes again → re-trim `.ds-swatch--dual .ds-swatch__chip` flex-basis and re-verify semantic vs primitive tiles measure equal (148px today).
- New System-page UI depending on `userDsHasDark` → listen for `loomling:theme-ready`, don't read the flag once at init.
- If keyboard access to the opposite-value copy becomes a requirement, the card can no longer be a single `<button>` — it would need to become a non-button container with two real focusable copy buttons, which is a larger refactor touching primitives too.
- The Tokens Import (Vibe) flow that emits dark blocks (ADR 0009) is what makes `userDsHasDark` true for a project; the dual swatches are the System-page surface that benefits.
