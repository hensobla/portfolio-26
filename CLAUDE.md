@AGENTS.md

# Portfolio Design System — Read Before Building

This project is a portfolio site built as a strict design system. Guardrails live in `/system/` as MD files. Code lives under `src/`. The MDs describe rules and intent; they do not contain implementations.

## Read first

Before making any change to look-and-feel, layout, typography, components, modules, or templates, read `/system/README.md`. It explains the system's contract, folder map, and the build flow. For specific work also read the relevant domain doc: `tokens.md`, `colors.md`, `typography.md`, `grid.md`, `voice.md`, `sandbox.md`, `components.md`, `modules.md`, `templates.md`.

## Where new code goes

- UI primitives (buttons, inputs, layout helpers): `src/components/ui/`
- Page modules (Sanity-driven section blocks): `src/components/modules/`
- Page templates (one per modular Sanity content type): `src/components/templates/`
- Sanity schemas for modules: `src/sanity/schemaTypes/modules/`
- Sandbox manifest (registers everything previewable): `src/lib/sandbox-manifest.tsx`
- Library/sandbox routes (dev-only preview gallery): `src/app/library/`

## Core rules

1. **Modules are the single source of truth.** Templates and pages compose modules by importing them via the module renderer. Never duplicate module markup, styles, or logic into a page or template.
2. **Components only consume tokens from the design system.** Tokens are registered in the `@theme {}` block in `src/app/globals.css` (Tailwind v4 token registration). Components reference them as CSS custom properties — `var(--paper)`, `var(--ink)`, etc. — never as raw values, and never via Tailwind utility classes. No hex, no rgb, no arbitrary px or rem in component CSS. If a needed token does not exist, stop and ask before adding (see *Building a new piece* below).
3. **Every new module requires three artifacts:** a React component in `src/components/modules/`, a Sanity schema in `src/sanity/schemaTypes/modules/` registered in `ModuleRenderer`, and a manifest entry in `src/lib/sandbox-manifest.tsx`. The catalog README entry follows on approval. A module is not finished until all artifacts exist and the catalog entry is written.
4. **Look-and-feel MDs in `/system/` are authored deliberately.** When the user asks for a piece that requires a new design rule, surface the gap before writing components — see *Building a new piece* below. Don't auto-generate or pre-fill aesthetic content.

---

## Building a new piece

When the user asks you to build a new component, module, or template, follow this workflow exactly.

### 1. Read before building

Read `/system/README.md`, the relevant instruction doc (`components.md`, `modules.md`, or `templates.md`), and any domain docs the piece will rely on (`colors.md` for surface choices, `typography.md` for type, `grid.md` for layout). Skim `decisions.md` for relevant locked decisions (especially D21 — no Tailwind utility classes in library pieces).

### 2. Surface design gaps before writing code

If the request requires anything that doesn't exist in the system today, **stop before writing components** and surface the gap. Examples:

- A new color role (e.g., a green for "success" states) → not in `colors.md`'s semantic palette.
- A new typography size or weight → not in `typography.md`'s ramps.
- A new breakpoint or grid configuration → not in `grid.md`.
- A new module category or template kind that doesn't fit the existing folders.

Don't reach for a primitive directly, don't pick "the closest token and call it good," and don't inline a raw value. Three options, in order of preference, per `tokens.md`:

1. **Reconsider.** Most "I need X" moments resolve to "the existing system already covers this." Check the relevant domain doc.
2. **Propose adding the rule.** State the role, why existing tokens don't cover it, and what would change. Wait for the user to approve.
3. **Flag the gap and stop.** If you can't justify a new rule but the existing tokens don't fit, the design itself may be inconsistent with the system. Surface the conflict for review.

If the user approves a system change, update **all** affected files in the same turn before continuing with the piece:
- The runtime CSS at `src/app/globals.css` (token registration in `@theme {}`).
- The relevant domain doc (`colors.md`, `typography.md`, etc.) — both the values table and any audit.
- A `decisions.md` entry capturing the rationale (what was added, what was rejected, why).

### 3. Build the piece as a draft

Once the rules are in place:

- **Component file.** `src/components/[ui|modules|templates]/[Name].tsx`. Default-export the component. Props typed with a co-located interface.
- **Styles.** Co-located CSS Module, `[Name].module.css`. Every visible value references a `var(--token)`. No raw colors. No raw font sizes / weights / line-heights / letter-spacing — those are in `typography.md`. No Tailwind utility classes (D21).
- **For modules:** also add the Sanity schema at `src/sanity/schemaTypes/modules/[name].ts`, register it in `src/sanity/schemaTypes/index.ts`, register it as an allowed type in the relevant content-type schema (e.g., `project.ts` or `page.ts`), and add it to the dispatch table in `ModuleRenderer.tsx`.
- **Manifest entry.** Append to `sandboxManifest` in `src/lib/sandbox-manifest.tsx` with `status: "draft"`. Cover the default plus each meaningful state in the `render` function.

After this step, tell the user the preview URL: `/library/[category]/[slug]`. The piece appears in the Sandbox section of the library index.

### 4. Iterate

The user views the piece at the preview URL and gives feedback. You edit the source files; Next.js HMR refreshes the preview. Continue until the user is happy.

### 5. Wait for approval

The user approves by asking you to approve. Do not flip the manifest status, write a catalog entry, or commit on your own — approval is the user's call. See *Approving a piece* below for what to do when the user says "approve [Name]."

---

## Approving a piece

When the user asks you to approve a piece (e.g., *"approve MetricBar"*, *"approve the AttributionRow component"*), do the following in one turn:

### 1. Verify the piece against the approval checklist

Read the piece's source (`.tsx` + `.module.css`) and check it against `sandbox.md`'s approval checklist:

- **Token discipline.** All colors via semantic tokens. All type properties tokenized. No raw hex / rgba / px font sizes. No Tailwind utility classes inside library pieces.
- **Responsive.** Renders at every breakpoint. Mobile-first. No hard-coded breakpoint pixel values inside the component CSS (use the breakpoint pattern from `grid.md`).
- **Theme.** Uses semantic tokens, not theme-specific raw values.
- **States.** Interactive states defined where applicable. Long / empty content handled.
- **Accessibility.** WCAG AA contrast on all text pairings (check via `colors.md`'s audit). Keyboard accessible. Focus visible. Semantic HTML. Alt text where applicable. `prefers-reduced-motion` if animation.
- **Voice.** Default content follows `voice.md`. No placeholder text in the approved version.
- **Code quality.** No unused imports, no `console.log`, no commented-out code. Sensible defaults so the piece works without configuration.

If anything fails, **stop and surface to the user**. Don't approve. Tell them what to fix.

### 2. Update the manifest

Find the entry in `src/lib/sandbox-manifest.tsx` and flip `status: "draft"` → `status: "approved"`.

### 3. Write the catalog entry

Add an entry to `src/components/[category]/README.md` (creating the README if the category's first piece). Use the catalog template in `sandbox.md` exactly:

- One-line index row.
- Full entry below: role, import, props/API table, tokens used, theme support, breakpoint behavior, approved-on date, notes / known limitations.

Pull the props from the component's TypeScript interface, the tokens from the CSS Module, and the breakpoint behavior from any `@media` queries in the CSS.

### 4. Update related system docs if needed

If the approval introduces a new pattern that other pieces should follow, update the relevant doc:

- New token added during build → already updated in step 2 of *Building a new piece*. Confirm `decisions.md` entry exists.
- New cross-file dependency → update `tokens.md`'s *Cross-file dependencies* table.
- New module pattern worth documenting → update `modules.md`.

If nothing else needs updating, say so explicitly in your turn so the user knows you considered it.

### 5. Confirm to the user

Summarize what changed:
- Manifest status flipped.
- Catalog entry written (link the README).
- Any system docs updated (or noted as not needed).
- Reminder to commit.

Do not run `git commit` unless the user explicitly asks.

---

## Working in /library

The library at `/library` is a dev-only tool, gated by middleware. It's not reachable from production. The library chrome (page background, header, controls, footer) uses neutral system tokens (`--lib-*`) defined in `src/app/library/library-chrome.css`. The pieces inside the canvas render in the project's tokens — that's the testbed.

When you edit anything in `src/app/library/` itself (chrome, controls, manifest helpers), keep it project-agnostic so the directory can be lifted into other projects. The only project-specific code in the library lives in the canvas's `data-surface` block (which references `--paper` / `--panel` / `--ink`). Everything else uses `--lib-*`.
