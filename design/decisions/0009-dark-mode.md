# 0009 — Dark mode (two-surface model)

**Status:** Accepted
**Date:** 2026-05-21

## Context

The user requested a dark mode feature with these constraints:

- Loomling's own chrome (Library / Tokens / Builder / Sandbox) should have a sun/moon toggle in the nav that always works.
- The user's design system should *optionally* follow the toggle — only when the user has set up dark tokens in `src/tokens.css`.
- The user should have a way to opt in / opt out of propagation independent of detection.

The decision space had three dimensions:

1. **How to declare dark support in the user's DS.** Auto-detect from `tokens.css`, an explicit `project.json` flag, or both.
2. **Toggle behavior when user's DS has no dark mode.** Chrome-only, hide the toggle, or apply a CSS-filter fallback.
3. **Where the toggle lives in the Loom UI.** Persistent header, settings flyout, or floating button.

## Decision

**Two independent surfaces with a propagation matrix:**

1. Loomling chrome — always reflects the toggle, via `:root[data-theme="dark"]` overrides on the `--lib-*` tokens in `library/library.css`.
2. User's design system — reflects the toggle only when propagation is enabled, by setting `data-theme="dark"` on the iframe `<html>` and matching it with the user's own `[data-theme="dark"]` block in `src/tokens.css`.

**Propagation is "flag wins, detection fills in":**

- `project.json.darkMode` is the source of truth. Values: `"auto"` / `"always"` / `"never"` (or `null`, defaulting to `"auto"`).
- In `"auto"` mode, runtime detection scans `src/tokens.css` for a `[data-theme="dark"]` selector and enables propagation when found.
- `"always"` forces propagation even without detected tokens (useful while drafting).
- `"never"` forces chrome-only.

**When propagation is off, the toggle affects Loomling chrome only.** Iframes stay light. A muted dot on the toggle + a tooltip explain why. No CSS-filter fallback — honest about the state of the user's DS.

**The toggle lives in the top-right of the persistent `.lib-header__inner`** across all four Loom views. State persists across navigation via `localStorage["loomling:theme:v1"]`.

**Implementation owner:** `library/theme.js` — applies `data-theme` on the Loom document and on every iframe's `<html>`, hooks new iframes via `MutationObserver`, dispatches `loomling:theme-changed` for the Tokens page to listen.

**Authoring contract:** designers (and CC) only override semantic tokens inside the dark block (`--paper / --ink / --accent / ...`). Primitives stay constant. Components, modules, and templates need no dark-mode awareness — they reference semantics.

**Tokens Import (Vibe) gains auto-emission:** when the brand signals dark-mode appropriateness (explicit prompt or strong implicit signal: type-led, dev tooling, moody), CC emits a `[data-theme="dark"]` block as part of the proposal. When the signal is mixed or weak, CC skips and surfaces the skip in Notes.

## Alternatives rejected

- **Auto-detect only, no flag.** Forced propagation matched detection 1:1. Rejected because the user wanted explicit override — e.g., to force propagation while still drafting dark tokens, or to suppress propagation even when tokens exist.
- **Explicit flag only, no detection.** Required users to manually flip the flag once they added dark tokens. Rejected because forgetting it is the obvious failure mode — and CLAUDE.md §16 says designers shouldn't have to think about wiring decisions like this.
- **Hide the nav toggle until user adds dark tokens.** Rejected because Loomling-chrome dark mode is a legitimate feature on its own — the user might want a dark Loom even if their site is light-only.
- **CSS-filter fallback for iframes when no dark tokens.** Rejected because `invert(1) hue-rotate(180deg)` ages a brand visually and lies about the system's capability — better to honestly say "your design system has no dark tokens yet."
- **`prefers-color-scheme` as the default.** Rejected for v1 because it makes the initial-load state implicit and OS-coupled. Explicit user choice is the v1 surface. Could add `"system"` as a fourth flag value later.

## Consequences

**Positive:**

- Composable: the two surfaces flip independently when appropriate, together when intended.
- Forward-compatible: components reference semantic tokens; adding dark tokens later automatically gives them dark variants without any component edits.
- Honest about state: the muted dot + tooltip prevent confusion about why iframes don't flip.
- Matches CLAUDE.md §16: designers compose tokens; the system handles the structural correctness of when to propagate.

**Negative / costs:**

- The Tokens page now has a fifth section (Dark mode) and a sidebar entry — a small navigation surface increase.
- Every Loom HTML now loads `theme.js` ahead of `dev-tokens.js`. Adds one more network request (small, defer'd, cacheable).
- `library/library.css` ~200 lines bigger from the dark overrides + toggle styles + setting panel.
- The propagation matrix has a "vacuous" cell (`"always"` + no dark tokens = toggle works but nothing visible flips). Documented as intentional; could surprise a user who set `"always"` and forgot to add tokens.
- A handful of `:root[data-theme="dark"]` overrides exist for elements that hardcoded `color: white` against `var(--lib-ink)` backgrounds (e.g., `.bld-btn--primary`). Future chrome additions that follow that pattern will need a matching dark override. Better long-term fix: use `var(--lib-bg)` instead of `white` in those rules, but the refactor is out of scope for this ADR.

## Related

- `system/dark-mode.md` — the canonical spec (runtime, selector convention, authoring rules).
- `system/tokens-import.md § E` — updated from "v2 scaffold" to "live spec" for the Vibe import flow.
- CLAUDE.md §16 — backend correctness from visual intent. This decision is an instance: designers say "I want dark mode for my brand"; the system figures out detection, propagation, toggle wiring, and component compatibility.
- ADR 0008 (Tokens Import flow) — the propose/commit cycle that now emits dark blocks.
