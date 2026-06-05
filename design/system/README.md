# Design System

This folder is the **source of truth for design rules**. Claude Code reads these files before every authoring decision. The `library/manifest.json` is the catalog of what's been built; this folder is the rulebook for *how* things should be built.

## Status model

Every piece in the Library has a `status`:

- **`draft`** — Newly authored. Visible in the Loom under a "Sandbox" header. Not yet sanctioned for production use.
- **`approved`** — Reviewed and sanctioned. Lives in the appropriate category section of the Library.

Status is set in `library/manifest.json` per entry. CC flips draft → approved only when the user says `approve <Name>`.

## How drift works

If a request from the user conflicts with a rule in one of these files, CC will:

1. Name the rule + the file it lives in.
2. Offer three paths: (A) abide, (B) extend the system with a new token, (C) amend the rule.
3. On (B) or (C), edit the relevant MD inline before proceeding. (C) also appends an ADR to `decisions/`.

There is **no separate drift log**. Git history on `system/*.md` plus ADRs is the audit trail.

## File index

- `tokens.md` — token naming, semantics, mapping to `src/tokens.css`
- `color.md` — palette, contrast, surface model
- `typography.md` — type scale, families, line-height, measure
- `space.md` — spacing scale, grid, breakpoints
- `voice.md` — tone, vocabulary, do/don't
- `accessibility.md` — contrast targets, focus states, semantic HTML, ARIA, motion
- `seo.md` — heading hierarchy, document head, JSON-LD, image discipline, Core Web Vitals baseline
- `components.md` — rules for atoms
- `modules.md` — rules for compositions
- `templates.md` — rules for page-level layouts
- `page-builder.md` — Page Builder concepts, payload schema, and Finalize protocol CC runs when given a paste
- `tokens-import.md` — Tokens Import modal concepts, payload schema, and Finalize protocol CC runs to update `src/tokens.css`
- `dark-mode.md` — dark-mode runtime (nav toggle + `[data-theme="dark"]` selector + propagation rules)
- `decisions.md` — index pointing to the `decisions/` ADR folder
