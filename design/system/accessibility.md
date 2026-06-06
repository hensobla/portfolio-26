# Accessibility

Accessibility is a system-level rule, not a per-component afterthought. Every piece authored under Loomling must pass these defaults before its status can flip from `draft` to `approved`.

## Contrast

- Body text: **WCAG AA** minimum (4.5:1 for normal text, 3:1 for ≥18pt or ≥14pt bold).
- Interactive states: change visibly between rest/hover/active/focus, at least 3:1 against surrounding context.
- Non-text indicators (icons, focus rings, status dots): 3:1 against adjacent colors.

When CC adds a new color pair, it runs the contrast check before writing the manifest entry. Failures are flagged inline.

## Focus

- Every interactive element has a **visible focus state**. Removing the browser default without replacement is forbidden.
- Focus rings use `--focus-ring` (token). Default is a 2px outline at the accent color with 2px offset.
- Focus state must be distinguishable from hover state — they are not the same thing.
- Tab order matches DOM order. No `tabindex > 0`.

## Semantic HTML

- Use the right element for the job. Buttons are `<button>`, not `<div onclick>`. Links are `<a href>`, not `<button>` that navigates.
- Headings nest correctly (no skipped levels in a single document scope).
- Lists are `<ul>`/`<ol>`/`<dl>`. Tabular data is `<table>` with `<th>` and `scope`.
- Form inputs always have an associated `<label>` (either wrapping or via `for`/`id`).

## ARIA discipline

> **First rule of ARIA: don't.** Native HTML beats ARIA every time.

Acceptable ARIA usage:

- `aria-label` on icon-only controls (e.g., a close button with only an "X").
- `aria-expanded` / `aria-controls` on disclosure widgets.
- `aria-live` on regions that update asynchronously (status messages, toasts).
- `role="region"` + `aria-labelledby` on landmark sections that don't map to a native landmark element.

Forbidden:

- `role="button"` on anything that isn't a `<button>` (just use a `<button>`).
- `aria-hidden="true"` on focusable elements.
- Custom widgets without keyboard support — if you add `role="tab"`, you ship arrow-key navigation.

## Keyboard

- Every interactive element reachable by tab.
- Custom widgets handle Enter / Space / Esc / arrow keys per [APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/).
- No keyboard traps. Esc closes overlays.

## Motion

- Components respect `prefers-reduced-motion`. Any animation longer than 100ms or involving parallax/translate must have a reduced-motion variant (default: no transform, instant state change).
- Auto-playing motion (carousels, video) must have a pause control.
- Flashing content under 3Hz triggers a reconsider.

## Approval checklist

Before flipping a piece to `approved`, CC verifies:

1. Contrast passes for every documented state.
2. Focus is visible on every interactive element.
3. Markup is semantic (no `<div>`-as-button).
4. ARIA usage matches the rules above.
5. Keyboard navigation works for every state.
6. Motion respects `prefers-reduced-motion`.

A piece that fails any of these stays `draft`. CC reports which item failed.

## Drift behavior

These are not negotiable design choices — they're correctness rules. A "drift" request that lowers accessibility (e.g., removing a focus ring) is rejected. CC offers alternatives that preserve accessibility while addressing the visual intent.
