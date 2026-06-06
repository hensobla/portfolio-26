# Approval checklist runner

When the user says `approve <Name>`, run the checklist for the piece's category.

## Components

1. Every documented state renders correctly in `preview.html`.
2. All visual properties come from tokens — no raw hex, no px values except in `tokens.css`.
3. `[data-loom="<slug>"]` scoping is correct; no leakage to siblings.
4. Accessibility checklist (see below) passes.
5. Markup is semantic.
6. JS (if any) cleans up listeners and is idempotent.

## Modules

1. Every component used has `status: approved` in the manifest (or the user has accepted draft dependencies).
2. Module-level CSS doesn't override component visual tokens.
3. All declared states render correctly.
4. Responsive behavior matches breakpoints in `system/space.md`.
5. Accessibility passes at the module level (heading hierarchy, landmarks).

## Templates

1. Every section maps to a module with `status: approved`.
2. Template-level CSS handles only layout/container concerns.
3. All declared states render correctly.
4. Page-level accessibility passes (one `<h1>`, landmark roles, skip link, document title).
5. No module appears more than once unintentionally.

## Accessibility checklist (applies to all)

1. Contrast: body text ≥ 4.5:1, interactive states ≥ 3:1 against rest.
2. Visible focus state on every interactive element.
3. Semantic HTML — buttons are `<button>`, links are `<a>`.
4. ARIA usage matches the rules in `system/accessibility.md`.
5. Keyboard navigation works for every documented state.
6. `prefers-reduced-motion` respected.

## Design check (advisory)

After the category + accessibility checklists, run the advisory design check (`CLAUDE.md §22`, `system/design-check.md`): scan the **rendered** preview against `.loomling/design-check.json` and surface findings grouped by severity. This **flags, never blocks** — it informs the approval; only the hard items above can fail it. Discount Loomling-intentional patterns (unfilled `data-loom-slot` placeholders, CSS `--custom-properties`).

Then route each finding to its capability (`CLAUDE.md §24`, `system/capabilities.md`): **flag** correctness fixes (offer to apply, one-tap) and **suggest** taste moves (one line each). One-tap, never block. Also offer a `critique` (§23) as a deeper second opinion if the element is substantial.

## On pass

Update `library/manifest.json`: flip `status` from `draft` to `approved`. If the piece's pattern is worth documenting, update `system/<category>.md`.

## On fail

Report which item failed and what's needed. Keep `status: draft`.
