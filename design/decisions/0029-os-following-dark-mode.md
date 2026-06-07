# ADR 0029 — OS-following dark mode (respect `prefers-color-scheme`)

**Date:** 2026-06-06
**Status:** accepted

## Context

`system/dark-mode.md` shipped (v1) with an explicit stance: **no `prefers-color-scheme`
gate.** Dark mode was driven only by `[data-theme="dark"]` — set by the Loom's sun/moon
toggle (`library/theme.js`) and, for the eventual site, a future on-page toggle. §1 said
*"The user's choice is explicit, not OS-driven,"* and §9 listed OS-following as an
explicitly **deferred** idea (*"Could add OS-following as a fourth `project.json.darkMode`
value (`'system'`) later"*).

The user asked that **the whole site — including the in-progress Blueprint homepage —
respect the system light/dark setting.** That conflicts with the §1 rule, so this went
through the drift protocol (CLAUDE.md §5) and resolved on **path C (amend)**: change the
rule and implement the deferred feature.

The groundwork was already in place: `src/tokens.css` carries a complete `[data-theme="dark"]`
semantic palette (ADR 0026), and every authored element references semantic tokens only,
so nothing downstream needs per-component work.

## Decision

1. **The dark palette now applies via two triggers**, both in `src/tokens.css`:
   - **OS-following (default):** `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }`.
     The deployed site and any standalone render follow the visitor's OS with **no JS**.
   - **Explicit toggle (override):** `[data-theme="dark"]` still wins over the OS preference;
     `[data-theme="light"]` forces light even on an OS-dark system.

2. **The two blocks duplicate the same ~21 semantic overrides** and must be kept in sync.
   Vanilla CSS can't share one declaration block across a media query *and* an attribute
   selector, and the Loom forbids a build step in `src/` (§11). The duplication is fenced
   with a "keep in sync" comment; a future build step could dedupe.

3. **`project.json.darkMode` is unchanged** (`null` = auto). It governs only the **Loom
   toggle's propagation** (`dark-mode.md` §4 matrix). OS-following lives in the tokens, not
   the flag — so no new `"system"` flag value was introduced. The two mechanisms are
   orthogonal: the flag is about the Loom authoring tool; `prefers-color-scheme` is about
   the rendered site.

4. **No component, module, or template changed.** The Blueprint homepage flips correctly in
   both states (resting cascade + expanded takeover) purely through its semantic-token
   references — verified by emulating `prefers-color-scheme: dark` and `light`.

## Consequences

**Positive:**
- The site respects the OS setting with zero JS and zero per-component work — the payoff of
  the "components reference semantic tokens only" discipline (ADR 0026, dark-mode.md §6).
- Ports cleanly to the Next app: the rule lives in `tokens.css`, which is the artifact that
  migrates to `src/app/globals.css` under ADR 0027 — dark mode carries over when published.
- The explicit toggle still works as an override, so a future on-site theme switch remains
  possible.

**Negative / costs:**
- The dark palette is now duplicated in two blocks; edits to dark values must touch both.
- **Loom-preview quirk:** `theme.js` toggles light by *removing* `[data-theme]` (it never
  writes `data-theme="light"`). Under an OS-dark system, toggling a Loom preview to light
  therefore leaves no attribute and the OS-following rule still renders it dark. Standalone
  previews (opening `preview.html` directly) are unaffected. Fixing it means making theme.js
  write `data-theme="light"` (amends dark-mode.md §2) — deferred until it bites.

## Alternatives considered (rejected)

- **Path A (abide) — keep explicit-toggle-only.** Doesn't satisfy "respect the SYSTEM
  setting"; the only in-system answer would be a manual toggle, which isn't OS-following.
- **A `"system"` value on `project.json.darkMode` + JS in theme.js to set `data-theme` from
  the media query.** Heavier, needs JS on the deployed site, and couples OS-following to the
  Loom's flag/runtime. The CSS-only media query is simpler and framework-agnostic.
- **`light-dark()` + `color-scheme`** — would avoid the duplicated block, but requires
  rewriting every color token as `light-dark(a, b)` and only covers color-valued tokens;
  too large a refactor for the payoff, and weaker browser support than the media query.
- **Inline `<script>` in `preview.html` that mirrors the media query into `data-theme`** —
  preview-only, wouldn't port to the app, and adds JS where CSS suffices.

## Files touched

- **Modified:** `design/src/tokens.css` (added the `@media (prefers-color-scheme: dark)`
  block; kept the `[data-theme="dark"]` block as the explicit override; updated the section
  comment), `design/system/dark-mode.md` (amended §1 + §9; added the theme.js caveat).
- **Created:** this ADR.

## Forward links

- When the homepage/tokens port to the Next app (ADR 0027), the `prefers-color-scheme` block
  ports with `tokens.css` into `src/app/globals.css`. The app's gate/placeholder pages
  (currently Tailwind, not token-driven) are NOT yet covered — they'd need the same treatment
  to make the *deployed* shell respect the OS before the real homepage lands.
- If the Loom-preview light-under-OS-dark quirk becomes annoying, fix `theme.js` to write
  `data-theme="light"` explicitly and amend dark-mode.md §2.
- If the dark-value duplication causes a sync bug, that's the trigger to add a small
  token build/dedupe step for `tokens.css`.
