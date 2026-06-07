# Dark mode

Loomling supports an optional dark mode that operates on two independent surfaces:

1. **Loomling's own UI** (the Loom chrome — Library, System, Builder, Sandbox). Always toggleable via the sun/moon button in the top-right of the nav.
2. **The user's design system** (the tokens in `src/tokens.css`). Optionally toggleable. Whether the toggle propagates to user content depends on (a) whether `src/tokens.css` declares a `[data-theme="dark"]` block and (b) `project.json.darkMode`.

The contract:

| Loomling toggle | Loomling chrome | User's design system |
|---|---|---|
| Flips to dark | Always flips | Flips ONLY when propagation is enabled |

---

## 1. Selector convention

The user's design system dark palette applies in **two** ways (ADR 0029):

1. **OS-following** — `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }`. The deployed site (and any standalone render of an element) respects the visitor's system light/dark setting with no JS. This is the default behavior.
2. **Explicit toggle** — `[data-theme="dark"]` set on `<html>` (the Loom's sun/moon, or a future on-site toggle) **wins over** the OS preference. `[data-theme="light"]` forces light even under an OS-dark system.

The two blocks in `src/tokens.css` carry identical values and **must be kept in sync** (vanilla CSS can't share one declaration across a media query + an attribute selector; a build step could dedupe later).

Loomling chrome dark overrides still live in `library/library.css` under `:root[data-theme="dark"]` (toggle-only — the chrome is a tool, not OS-driven).

> **Loom-preview caveat:** `library/theme.js` toggles dark by ADDING `[data-theme="dark"]` and "light" by REMOVING the attribute (it never writes `data-theme="light"`). Under an **OS-dark** system, toggling a Loom preview to *light* therefore leaves no attribute, so the `prefers-color-scheme` rule still renders it dark. Standalone previews (e.g. opening a template's `preview.html` directly) are unaffected. To make the Loom toggle fully authoritative under OS-dark, `theme.js` would need to write `data-theme="light"` explicitly (amends §2) — deferred until it bites.

## 2. Runtime architecture

[library/theme.js](../library/theme.js) is the single owner of theme state. It runs on every Loom page (loaded by `index.html`, `tokens.html`, `builder.html`, `sandbox.html`).

**Responsibilities:**

- Read persisted theme from `localStorage["loomling:theme:v1"]` (values: `"light"` / `"dark"`).
- Apply / remove `data-theme="dark"` on `document.documentElement`. (Absence == light. We never write `data-theme="light"`.)
- Read `project.json.darkMode` to learn the propagation flag.
- Detect whether `src/tokens.css` declares any `[data-theme="dark"]` selector (cheap text scan — no CSS AST parse).
- Push `data-theme="dark"` into every same-origin iframe's `<html>` when propagation is enabled. Re-apply on iframe load + via MutationObserver for iframes added post-init.
- Render the sun/moon toggle into `.lib-header__inner` and wire its click.
- Dispatch `loomling:theme-changed` event on changes (the System page listens to re-render the dark-mode setting panel).
- Listen for `loomling:tokens-changed` (from dev-tokens.js or a Tokens Import commit) to re-detect dark support.

**Propagation decision matrix:**

| `project.json.darkMode` | `tokens.css` has `[data-theme="dark"]`? | Toggle affects user content? |
|---|---|---|
| `"auto"` (or `null`) | yes | **yes** |
| `"auto"` | no | no — chrome only |
| `"always"` | yes | yes |
| `"always"` | no | yes (but no visible change in user content) |
| `"never"` | (either) | no — chrome only |

"Always with no dark tokens" is allowed because the user might be mid-build — the toggle still works, the user's visuals just won't flip until they add dark tokens.

## 3. The nav toggle

A single button in the top-right of `.lib-header__inner`. Inline sun and moon SVGs cross-fade based on `aria-pressed`. A `data-propagates="false"` flag adds a small muted dot in the corner to signal "chrome-only" — the tooltip explains why ("your design system has no dark tokens yet").

The toggle is present on all four Loom views. Theme state persists across navigation via localStorage.

Accessibility: the button has an `aria-label`, an `aria-pressed` state, and tooltip text via `title` that names the next action ("Switch to dark mode" / "Switch to light mode") and the propagation scope.

## 4. The `project.json.darkMode` flag

Schema:

```json
{
  "darkMode": null  // or "auto" | "always" | "never"
}
```

- `null` (default) → same as `"auto"`.
- Changes are committed by CC, not the Loom (the Loom can't write `project.json` directly). The System page surfaces a small editor that copies a CC paste prompt when the value changes.

The flag is read once at `theme.js` init. If the user changes it via CC and reloads the Loom, the new value takes effect.

## 5. Authoring dark tokens (for designers / CC)

Override SEMANTIC tokens only. Primitives stay constant — they're values, not roles.

```css
:root {
  --background:  var(--color-neutral-50);
  --text1:    var(--color-neutral-900);
  --accent: var(--color-accent-500);
}

[data-theme="dark"] {
  --background:  var(--color-neutral-950);
  --text1:    var(--color-neutral-50);
  --accent: var(--color-accent-400);  /* chroma bump for dark surround */
}
```

**Rules** (from `system/tokens-import.md § E`):

- **Transpose, don't invert.** Preserve hue + temperature; invert lightness.
- **Chroma bump on accents** (typically one step lighter in dark, e.g. 500 → 400).
- **Override semantics only.** Don't redefine primitives inside the dark block.
- **Re-run contrast.** Body-on-paper ≥ 4.5:1, accent-on-paper ≥ 3:1 against the dark mappings.
- **Status colors** (`--success / --warning / --error`) get paired light/dark definitions, not reuse.

## 6. Components: do nothing

Components, modules, and templates **do not need to know about dark mode**. They reference semantic tokens (`var(--background)`, `var(--text1)`, etc.). Those tokens re-point inside `[data-theme="dark"]`. Everything downstream re-flows automatically.

The corollary: a component that hardcodes a hex value or a primitive (`var(--color-neutral-50)`) breaks dark mode. The drift protocol (CLAUDE.md §5) already forbids this — dark mode is one more reason the rule matters.

## 7. Accessibility

Dark mode is accessibility, not aesthetic. The drift exception in CLAUDE.md §5 applies:

- A dark palette that drops body-on-paper below 4.5:1 is a hard fail. CC should refuse to commit and propose adjustments.
- Focus rings must remain visible in both themes — `--lib-accent` is dark-mode-bumped specifically so the focus ring stays legible on `--lib-paper`.

## 8. Tokens Import (Vibe) auto-emission

The Vibe import flow (`system/tokens-import.md § E`) instructs CC to emit a `[data-theme="dark"]` block when the brand signals dark-mode appropriateness. Signal sources:

- Explicit prompt mention ("dark mode", "supports dark", "works on dark backgrounds").
- Strong implicit signal: type-led editorial, photography-led, dev tooling, moody / nocturnal feel.

When signal is mixed or weak, CC skips dark emission and surfaces the skip in the Notes section of its response. The user can re-run Vibe with a sharper prompt.

## 9. Open / deferred

- **OS-following is now ON** (implemented 2026-06-06, ADR 0029). The site respects `prefers-color-scheme`; the explicit toggle overrides it (§1). The earlier "no media query / explicit-only" stance is superseded.
- **`theme.js` light-under-OS-dark.** Not yet fixed — see the §1 caveat. The Loom's light toggle doesn't force light when the OS is dark, because theme.js never writes `data-theme="light"`. Fix when it bites.
- **`project.json.darkMode` unchanged.** It still governs the **Loom toggle's** propagation (§4 matrix), independent of the new CSS-level OS-following. No `"system"` flag value was needed — OS-following lives in the tokens, not the flag.
- **No per-element dark variants.** Components are expected to work in both themes via their token references. If a component needs theme-aware logic beyond tokens (e.g. swap an asset), that's a forward problem.
- **Builder canvas frames** inherit propagation via the same iframe-injection path as Sandbox. Tested via theme.js's MutationObserver hook.
