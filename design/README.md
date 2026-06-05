# Loomling

Design system + look/feel for a personal portfolio site; tokens/components authored here flow into the parent Next app via src/tokens.css.

Loomling is stack-agnostic until you say otherwise. Only HTML, CSS, and JavaScript are assumed. Everything else — framework, deployment target, CMS, analytics — stays deferred until the moment you actually need it.

## Quickstart

1. Use this template (or `degit` it) to create a new project folder.
2. Point Claude Code at the folder. CC will detect `INITIALIZE.md` and run a short interview.
3. Open the Loom to watch the catalog fill as you build. Serve **from the project root** (not from `library/`) so the previews can reach `src/`:

   ```sh
   npx http-server . -c-1
   ```

   Then open `http://localhost:8080/library/` (or whatever port `http-server` prints). The Loom has two pages:
   - **Library** — every Element you've built, grouped by status.
   - **Tokens** — visual view of your design tokens (colors, type, spacing).

## What lives where

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Orchestrator instructions — CC reads this first every session |
| `INITIALIZE.md` | Trigger for the init interview (delete after init if you want) |
| `project.json` | Project state — name, stack, initialization timestamp, deferred questions |
| `system/` | The design-system source of truth (MD files) |
| `library/` | The static viewer (works without a build) |
| `src/components/` | Atoms |
| `src/modules/` | Compositions |
| `src/templates/` | Page-level layouts |
| `src/tokens.css` | CSS custom properties — single token surface |
| `decisions/` | Append-only ADRs (one MD per decision) |

## How to work with CC

- Ask CC to build pieces by category: *"Build a Button component with primary, secondary, and disabled states."*
- Reference what exists: *"Build a template that uses only the existing modules."*
- Push back on the system: if CC flags a drift, pick (A) abide, (B) extend with a new token, or (C) amend the rule. CC will update the relevant `system/*.md` and proceed.
- Declare your stack whenever you're ready (or wait — CC will ask the first time it matters).

## The Loom is empty?

That's correct on day one. As CC builds Elements, it appends entries to `library/manifest.json`, and the Library page renders them. The Tokens page shows your design tokens from `src/tokens.css` even before any Elements exist.

> The template ships with **one seed example**: an `Eyebrow` component under `src/components/eyebrow/`. It's there to confirm the Loom renders correctly. Delete the folder + its manifest entry whenever you want.

## Serving fallback

If you don't have `npx` available, run from the project root:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080/library/`. Avoid opening `library/index.html` via `file://` — `fetch('manifest.json')` won't work without a server.
