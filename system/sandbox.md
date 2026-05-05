# sandbox.md

The build-preview-approve-promote workflow for adding new pieces to a design system. Written to be **project-agnostic**: this file should be reusable across projects with minimal editing. References to specific token names, breakpoints, or directory structures are kept generic and bracketed where possible.

This file owns the *process*. The *what* (what makes a good component, module, or template) lives in the respective instruction files.

---

## Why this exists

A design system without an approval workflow drifts. Pieces get built ad-hoc, half-finished components ship to production, and the library quietly fills with code that almost-but-not-quite belongs.

The fix is mechanical: every piece of the system goes through the same stages.

1. **Build** the piece at its final path in `src/components/[ui|modules|templates]/`. Register it in the sandbox manifest with `status: "draft"`.
2. **Preview** at `/library/[category]/[slug]` across themes, breakpoints, states, surfaces, and counts.
3. **Approve** with Claude Code — CC verifies the checklist, flips the manifest status, writes the catalog README entry, and updates any related system docs in one turn. The user is the eyeball; CC handles the orchestration.

The build/approve split is editorial: the build is mechanical, the approval is judged. There is no separate "promote" step or file move — pieces live at their final path from day one. The distinction between "in flight" and "in the system" is the `status` field on the manifest entry.

Pieces that haven't gone through this workflow are not in the system. They're in someone's working tree.

---

## Project structure

This is the layout in this project (Next.js App Router with `src/`, plus Sanity).

```
portfolio-26/
├── system/                        ← instruction files (this file lives here)
│   ├── components.md
│   ├── modules.md
│   ├── templates.md
│   └── sandbox.md                 ← you are here
│
├── src/
│   ├── components/                ← the approved library
│   │   ├── ui/
│   │   │   ├── README.md          ← catalog of approved components
│   │   │   ├── ComponentName.tsx
│   │   │   ├── ComponentName.module.css
│   │   │   └── ...
│   │   ├── modules/
│   │   │   ├── README.md          ← catalog of approved modules
│   │   │   └── ...
│   │   └── templates/
│   │       ├── README.md          ← catalog of approved templates
│   │       └── ...
│   │
│   ├── sanity/
│   │   └── schemaTypes/
│   │       └── modules/           ← Sanity schemas paired with module React components
│   │           └── heroBlock.ts
│   │
│   └── app/
│       ├── globals.css            ← token registration via Tailwind v4 @theme {}
│       └── library/               ← the preview route (this project's name for `/sandbox/`)
│           ├── page.tsx           ← library index
│           ├── components/
│           │   └── [name]/page.tsx
│           ├── modules/
│           │   └── [name]/page.tsx
│           └── templates/
│               └── [name]/page.tsx
```

**Why `/library/` and not `/sandbox/`?** Naming preference for this project. The route serves the same role — the system's preview gallery — and the workflow is identical. Throughout this file, "the library" and "the sandbox" are interchangeable terms; the route happens to be `/library`.

**Why `src/components/` split into `ui/`, `modules/`, `templates/`?** The split mirrors the conceptual layers this system depends on: components are primitives, modules are sections, templates are page-shapes. Keeping them in sibling folders inside `src/components/` matches the Next.js App Router convention while preserving the mental model.

**Why a `README.md` in each library folder?** It's the canonical catalog. The instruction docs (`components.md`, etc.) say *how* to build; the README says *what exists*. They're different concerns and they shouldn't share a file.

---

## The four stages

### Stage 1: Build

A new piece starts life in the sandbox, not in the library.

**Where it lives.** Initial code goes into a working file inside `src/app/library/`. The piece doesn't get a final filename or import path until it's approved. A scratch path (e.g., `src/app/library/components/_drafts/MetricCard.tsx`) is fine.

**What it imports.** The sandbox piece imports tokens from the same source the library uses — `src/app/globals.css` (CSS custom properties registered in Tailwind v4's `@theme {}` block). It does **not** import from `src/components/` because it's not part of the approved library yet. It can reference other approved pieces via `@/components/ui/...`, `@/components/modules/...`, etc.

**What's expected.** A working implementation, even if not perfect. Polish is the next stage. The build stage's job is to produce something testable — anything that can be rendered in the sandbox preview.

### Stage 2: Preview

The sandbox is a route in the project that renders pieces in isolation. The preview's job is to show the piece across the conditions it has to survive in production.

**Required preview conditions:**

- **Default state** — the piece as it'll most often appear.
- **All breakpoints** — render at each defined breakpoint width. Browser devtools resize is fine; an automated multi-viewport preview is better.
- **Theme variants** — if the system has light/dark themes (or other named themes), each theme.
- **Empty / loading / error states** — for any piece that consumes data.
- **Hover / focus / active** — for any interactive piece.
- **Long-content overflow** — the piece with absurdly long text inside it. This catches truncation, wrapping, and layout-collapse bugs.
- **Empty content** — the piece with no content. This catches "needs a placeholder" or "should not render" decisions.

**Optional but recommended:**

- **Side-by-side with related pieces** — a metric card next to an existing metric card, to check rhythm and consistency.
- **In context** — the piece dropped into a section of an existing module, to verify it integrates.

The sandbox should make these conditions easy to toggle. A simple controls panel (theme dropdown, breakpoint dropdown, state dropdown) is sufficient. Sophisticated tooling (Storybook, etc.) is optional.

### Stage 3: Approve (and promote)

In this project, approval and promotion happen together as a single Claude Code instruction. The user says *"approve [Name]"* and CC orchestrates every related file change in one turn — manifest status, catalog README, related system docs. There is no UI button. Approval-time changes are treated as a normal CC turn so the user reviews the diff before committing.

**There is no separate "draft" location for files.** Pieces always live at their final path in `src/components/[ui|modules|templates]/`. The distinction between "in flight" and "in the system" is the `status` field on the piece's `sandbox-manifest.tsx` entry: `"draft"` means it appears in the library's **Sandbox** section; `"approved"` means it appears under its category. A piece never lives in two places at once.

**The approval checklist** is documented in `Approval checklist` below. CC verifies the full checklist before approving. If anything fails, CC stops and surfaces what to fix; the piece stays a draft.

**The eyeball test** is the final decider. The user is the system's owner. CC verifies mechanics; the user accepts the piece's appearance, voice, and rhythm. Even a piece that passes every checklist item can be rejected if it doesn't feel right.

**What CC does on approval.** When the user says *"approve [Name]"*, in one turn:

1. **Read the source.** Component file + CSS Module + manifest entry. Verify against the approval checklist below.
2. **Flip the manifest status.** `status: "draft"` → `status: "approved"` in `src/lib/sandbox-manifest.tsx`.
3. **Write the catalog README entry.** Add to `src/components/[category]/README.md` per the catalog template below. Pull props from the component's TypeScript interface, tokens from the CSS Module, breakpoint behavior from any `@media` queries.
4. **Update related system docs if needed.** If a token was added during the build, confirm `decisions.md` has an entry and `tokens.md`'s cross-file table is current. If the piece introduces a pattern other pieces should follow, update the relevant instruction doc.
5. **Confirm to the user.** Summarize what changed; remind them to commit. Do not run `git commit` unless explicitly asked.

**Don't:**

- Approve without verifying the checklist.
- Leave a piece in `"draft"` after writing its catalog entry, or in `"approved"` without one. The two must move together.
- Skip system-doc updates because "I'll do it later." This is the rule that prevents drift; it doesn't have a "later" path.

---

## Approval checklist

The mechanical bar before approval. Each item is a yes/no. All must be yes.

### Token discipline

- [ ] All colors reference semantic tokens (e.g., `var(--primary)`), never primitives directly (e.g., `var(--color-red-500)`).
- [ ] All type properties (size, weight, tracking, line-height) reference tokens.
- [ ] No raw hex values, no raw rgba values, no raw font-size pixels in component CSS.
- [ ] Spacing values follow the patterns documented in the grid file (multiples of 4 by default).
- [ ] Borders, if used, use tokenized colors.

### Responsive behavior

- [ ] Renders correctly at every breakpoint defined in the grid file.
- [ ] Mobile-first: the default styles target the smallest breakpoint; larger breakpoints add complexity.
- [ ] No hard-coded breakpoint values. Media queries reference the breakpoint tokens through the build pipeline.
- [ ] Layout uses the grid's column system, not arbitrary pixel widths.

### Theme behavior

- [ ] Renders correctly in every theme defined in the system (typically light and any named alternates).
- [ ] No theme-specific raw values. Theme differences come from the token layer, not from per-theme CSS branches.

### State coverage

- [ ] If interactive: hover, focus, active, and disabled states are defined.
- [ ] If consumes data: empty, loading, error states are defined.
- [ ] If contains text: handles overflow gracefully (truncation, wrapping, or constraint).

### Accessibility

- [ ] All text pairings meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large). For inverse / dark surfaces, contrast verified per the audit in the colors file.
- [ ] Interactive pieces are keyboard accessible. Tab order is sensible.
- [ ] Focus indicators are visible (not the browser default if possible, but always present).
- [ ] Semantic HTML where applicable (`<button>` for buttons, `<a>` for links, etc.). Not all `<div>`.
- [ ] Images have meaningful alt text. Decorative images use `alt=""`.
- [ ] If animation is present: respects `prefers-reduced-motion`.

### Voice and copy

- [ ] All visible text follows the rules in the voice file (jargon, tense, register).
- [ ] No placeholder text in the approved version (no "Lorem ipsum," no "TODO," no "Click me").
- [ ] If text is configurable via props, the default values are realistic and well-written.

### Code quality

- [ ] No unused imports, no dead code.
- [ ] Component is exported with a clear default or named export.
- [ ] Props (or equivalent) have sensible defaults. The piece works without configuration.
- [ ] No `console.log`, no debug styles, no commented-out code.
- [ ] File is reasonably formatted (consistent with the project's conventions).

### Documentation

- [ ] Catalog README entry is drafted (will be added during promotion).
- [ ] If the piece introduces a new pattern not covered by the instruction docs, the relevant doc is updated in the same change.

---

## Catalog README template

Each library folder (`src/components/ui/`, `src/components/modules/`, `src/components/templates/`) has a `README.md` that is the canonical catalog of what's been approved. Use this template.

````markdown
# [Components|Modules|Templates] Catalog

Approved pieces in this folder. Each entry below is a piece you can import and use.

For how to build new pieces, see `system/[components|modules|templates].md`.
For the approval workflow, see `system/sandbox.md`.

---

## Index

| Name | Definition | File | Preview |
|---|---|---|---|
| `ComponentName` | One-line description of the role. | `./ComponentName.tsx` | `/library/components/component-name` |
| ... | ... | ... | ... |

---

## Entries

### `ComponentName`

**Role.** One-paragraph description of what the piece does and when to use it.

**Import.**
```tsx
import { ComponentName } from '@/components/ui/ComponentName';
```

**Props / API.** A short table or list of the piece's API surface. Required vs optional. Defaults.

**Tokens used.** Which design system tokens the piece references. Useful for impact analysis when tokens change.

**Theme support.** Which themes the piece is verified against.

**Breakpoint behavior.** How the piece responds at each breakpoint, if behavior differs.

**Approved on.** [Date]. By [name, if multi-person team].

**Notes / known limitations.** Optional. Anything a future user should know.

---

### `NextComponentName`

[same structure]
````

**Why so many fields?** Because the README replaces the instruction file's catalog function. It's the *only* place that records what exists, what each piece does, and what conditions it survives. If a field feels redundant for a particular piece, leave it as "n/a" rather than dropping it. Consistency makes the catalog scannable.

**One README per category.** Don't merge components, modules, and templates into a single catalog. Each lives in its own folder, has its own catalog, and is consumed differently.

---

## The sandbox route

The sandbox is the project's preview infrastructure. Implementation is up to the project's stack, but the contract is consistent.

### Library index page

A page at `/library` that lists every previewable piece, grouped by category.

```
/library
├── Components
│   ├── Eyebrow                  → /library/components/eyebrow
│   ├── MetricCard               → /library/components/metric-card
│   └── ...
├── Modules
│   ├── HeroBlock                → /library/modules/hero-block
│   └── ...
└── Templates
    └── CaseStudyTemplate        → /library/templates/case-study
```

Pieces in draft (Stage 1–3) and approved pieces both appear, with a status indicator. Drafts are useful for in-progress preview; approved pieces stay accessible because the library is the system's gallery.

### Per-piece preview page

Each piece has a route at `/library/[category]/[piece-name]`. The page renders the piece with a controls panel for toggling preview conditions.

**Required controls:**

- Theme selector (light / dark / any named themes).
- Breakpoint selector — render the piece at each defined breakpoint. Either a viewport-resize control or a fixed-width container with breakpoint presets.
- State selector (default / hover / focus / loading / error / empty, as applicable).

**Optional controls:**

- Long-content toggle (renders the piece with maximum-length text).
- Side-by-side toggle (renders multiple instances for rhythm comparison).
- Background swap (renders against `--paper`, `--panel`, `--ink` to verify pairing).

**Implementation note.** The simplest sandbox is a static page with a few state toggles. A sophisticated sandbox might use a tool like Storybook. Either is fine. The contract above is what matters; the implementation is replaceable.

### Keeping the sandbox honest

The sandbox is only useful if it actually reflects production behavior. Two rules:

- **Sandbox pieces import the same tokens production uses.** No mock tokens, no inline overrides.
- **Sandbox styles are not a "preview-only" branch of the component's CSS.** If a style only works in the sandbox, the component is wrong.

If the sandbox preview looks different from how the piece appears in a real page, the bug is in the piece, not in the sandbox.

---

## When pieces get unapproved

Approval is not permanent. A piece can be unapproved if:

- A token change breaks it and the breakage isn't worth fixing in place.
- A new piece supersedes it (e.g., a refactored MetricCard makes the old one redundant).
- The piece's role no longer exists in the design (e.g., a feature it served was removed).

**To unapprove:**

1. Remove the entry from the catalog README.
2. Move the file to `src/components/[category]/_archive/` (or delete, if it's truly dead).
3. Update any consumers of the piece. Don't leave dangling imports.
4. Note the unapproval in `decisions.md` if the piece was load-bearing.

The bar for unapproval is lower than the bar for approval — it's easier to remove than to add — but it should still be deliberate. A piece that gets unapproved and re-approved repeatedly is a sign of unstable requirements, not a sign of healthy iteration.

---

## Anti-patterns

- Pieces built directly in `src/components/` without going through the library.
- Pieces approved without a catalog entry.
- Catalog entries written *after* approval, by a different person, or with placeholder fields.
- Sandbox previews that don't reflect production behavior.
- Skipping approval because "it's a quick fix."
- Treating the approval checklist as advisory.
- "Approve and ship" without a promotion step (the move from sandbox to library + catalog update).
- One-piece-fits-all components that try to be three pieces with conditional logic. Smaller, named pieces are usually better.

---

## Adapting this file to other projects

This file is project-agnostic by design. To adapt it to a new project:

1. **Update the project structure section** to match the new project's directory conventions. Many projects use `src/`, `app/`, or `packages/` instead of `lib/`.
2. **Update the approval checklist's references** to match the project's design system files. The structure (token discipline / responsive / theme / state / a11y / voice / code / docs) is portable; the specifics aren't.
3. **Update the sandbox route paths** to match the new project's routing conventions.
4. **Adjust the catalog README template** if the project has different conventions for prop/API documentation.

The four-stage workflow (build / preview / approve / promote) does not change. That's the load-bearing concept and it works the same regardless of project.
