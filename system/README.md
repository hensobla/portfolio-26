# Design System

This folder is the design system's source of truth for **rules and intent**. The code under `src/` is the source of truth for **implementations**. Neither side replaces the other: MDs describe how decisions are made and what the system promises; code is the artifact that delivers on those promises.

## Contract

- MDs in `/system/` describe principles, constraints, and decisions. They do not contain code.
- Code lives under `src/` in the appropriate folder. It does not contain the rationale that belongs in MDs.
- `src/app/globals.css` is the canonical home for token values, registered inside the Tailwind v4 `@theme {}` block. MDs describe the token system; the runtime values live there. There is no `tailwind.config.ts` in this stack — Tailwind v4 uses CSS-first configuration.
- Look-and-feel MDs are authored by the user, one at a time. They are not auto-generated.

## Folder map

- `/system/` — design system MDs (this folder)
- `src/components/ui/` — UI primitives (buttons, inputs, layout helpers)
- `src/components/modules/` — page modules (section-level, Sanity-driven blocks)
- `src/components/templates/` — page-shape templates, one per modular Sanity content type
- `src/sanity/schemaTypes/modules/` — Sanity schemas paired one-to-one with module components
- `src/app/library/` — hidden visual reference route at `/library` that renders every piece in isolation
- `src/app/globals.css` — canonical token definitions inside the Tailwind v4 `@theme {}` block

## Build flow for any new piece

Every component, module, and template passes through the build / preview / approve / promote workflow defined in `sandbox.md`. The five-phase shape:

1. **Initiate** — name the piece, state its role in one sentence, and confirm it does not duplicate an existing piece.
2. **Design** — sketch the look-and-feel against the relevant `/system/` MDs (`tokens.md`, `colors.md`, `typography.md`, `grid.md`). Surface conflicts before writing code.
3. **Implement** — build inside the library route (`src/app/library/`) as a draft. Reference tokens via `var(--token-name)`, never raw values, never Tailwind utility classes. For modules, define the Sanity schema alongside and register it in `ModuleRenderer`.
4. **Preview** — render at `/library/[category]/[name]` across breakpoints, themes, surfaces, and states per `sandbox.md`'s preview matrix.
5. **Approve & promote** — the user signs off. The piece moves from `src/app/library/` to `src/components/[ui|modules|templates]/`, gets a catalog entry in the relevant `README.md`, and is registered in the manifest as approved.

## Three-artifact rule for modules

A module is not "done" until all three exist:

1. React component in `src/components/modules/`
2. Sanity schema in `src/sanity/schemaTypes/modules/`, registered in `src/sanity/schemaTypes/index.ts` and in `ModuleRenderer`
3. Catalog entry in `src/components/modules/README.md` and a manifest registration so it appears at `/library`

If any one is missing, the module is incomplete.

## Look-and-feel MDs

These files are authored individually by the user. Until a file is authored, it carries a placeholder stating the content is pending. Do not infer or pre-fill content for any of these files.

- `tokens.md` — token governance: structure, naming, theming, how to add tokens (references `src/app/globals.css`)
- `colors.md` — color primitives, semantic color tokens, foreground pairing, contrast audit
- `typography.md` — typeface choices, type scale, line-heights, letter-spacing
- `grid.md` — layout grid, container widths, breakpoints, gutters
- `voice.md` — written tone, microcopy patterns, capitalization, punctuation
- `decisions.md` — ongoing log of design decisions with the reasoning behind each
- `sandbox.md` — build / preview / approve / promote workflow for every piece
- `components.md` — instruction file for UI primitives in `src/components/ui/`
- `modules.md` — instruction file for modules in `src/components/modules/`
- `templates.md` — instruction file for templates in `src/components/templates/`
