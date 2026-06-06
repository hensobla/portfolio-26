# ADR 0027 — Adopt the parent's Next stack; Loomling's design system overrides the app's

**Date:** 2026-06-05
**Status:** accepted (supersedes the deferral in ADR 0001)

## Context

ADR 0001 deferred the stack, and the Fresh init was explicit: keep `project.json.stack` null forever, never scaffold a framework inside `design/`, treat the parent app as off-limits — Loomling is a pure design-authoring tool and tokens would be hand-ported. That setup served the design phase well (brand seed, the homepage prototype).

The user has now changed direction with three goals:
1. What's built in Loomling should *become the website* when published to the domain.
2. When published, Loomling itself must never be reachable (zero exposure).
3. Approved Loomling elements should be readily publishable to the Next app.

Recon of the parent app (`../src/`) revealed it is already a **complete React design system** — `src/components/ui/` (`Eyebrow.tsx`+`.module.css`, `Tag`, `MetricCard`, `SectionNumber`, `AttributionRow`), page components (`Hero`, `Navbar`, `SelectedWork`, `Footer`, …), its own `/library` route, its own `sandbox-manifest.tsx`, Sanity studio, and a **red/yellow brand** with a **different token vocabulary** (`--paper`, `--primary`, `--text-mono-xs`, `--weight-mono-medium`, …) than Loomling's (`--background`, `--accent`, `--type-mono`, …). Two parallel systems, same concepts, divergent brand + tokens.

Given the choice of how the two relate, the user chose: **Loomling's design system overrides the app's.**

## Decision

1. **Adopt the stack** (`project.json.stack: "next"`; mirrored to `library/manifest.json.project.stack`): Next.js 16 · React 19 · Tailwind v4 — the existing parent app. This reverses ADR 0001's deferral.

2. **No framework scaffolding inside `design/`.** This adapts CLAUDE.md §10: the framework already exists in the parent. Loomling stays a vanilla HTML/CSS authoring tool; it does **not** get a `package.json`/Next build of its own. The Loom keeps working as the static authoring/preview surface (CLAUDE.md §11 still holds: `library/` stays vanilla).

3. **Loomling is the source of truth; the app adopts it.** Loomling's Blueprint tokens + vocabulary override the app's. The live site rebrands from red/yellow to Blueprint; the app's existing components migrate to Loomling's tokens.

4. **Publish bridge:** an approved Loomling element becomes a React component in the app — `.tsx` + co-located `.module.css`, following the app's existing conventions (tokens via `var(--…)`, CSS Modules, no Tailwind utility classes per the app's D21), registered in the app's catalog/`sandbox-manifest`. Loomling token names carry over because the app adopts Loomling's vocabulary (step 3).

5. **Deployment:** Vercel. `design/` is excluded from the deploy via `../.vercelignore` — and Next only serves app routes + `public/` anyway, so the Loom is doubly unreachable. (Satisfies goal #2.)

### Phased migration (execution plan, verified per phase)

- **P1 — Tokens.** Port Blueprint tokens into the app's `globals.css`. Add Loomling's tokens and *temporarily alias* the app's old semantic names to the new Blueprint values, so the live site re-skins to blue without breaking existing components mid-migration.
- **P2 — Fonts.** Archivo / Hanken Grotesk / Departure Mono via `next/font` (Departure Mono self-hosted), replacing the app's current families.
- **P3 — Homepage.** Port the Loomling `home` template into the app as the real React homepage.
- **P4 — Components + bridge.** Migrate the app's existing components to Blueprint; stand up the approval→export convention for new Loomling elements.
- **P5 — Cleanup.** Remove the old red/yellow tokens, the temporary aliases, and dead components.

## Consequences

**Positive:**
- Goals #1–#3 are met: Loomling work flows into the deployed app, the Loom can never be served, and approved elements have a defined React export path.
- One brand and one token vocabulary across design + production (no permanent dual-vocabulary translation layer).

**Negative / costs:**
- This is a **live-site migration** — it rebrands the production site and rewrites/replaces existing components. Done in phases with verification to keep `main` shippable.
- The parent app is no longer off-limits; edits there now happen under the app's own design-system rules (its `/system`, its D21, its sandbox/approval flow), in addition to Loomling's.
- Temporary token aliasing (P1) is intentional debt, removed in P5.
- The app's existing red/yellow design work (and any content tuned to it) is superseded.

## Alternatives considered (rejected)

- **Translate per element, keep the app's brand** — lighter, but leaves two divergent token vocabularies and two brands indefinitely; rejected by the user (Loomling should override).
- **Converge by building directly in the app, retire Loomling** — viable (the app already has a React design system + library), but the user wants to keep authoring in Loomling's workflow.
- **Scaffold Next inside `design/`** — rejected: duplicates the framework the parent already owns, and breaks the "Loom stays vanilla" contract (§11).
- **Keep stack deferred** (ADR 0001) — explicitly reversed; the publish goals require a declared target.

## Files touched

- **Modified:** `project.json` (`stack`, `deferred`, `answers`), `library/manifest.json` (`project.stack`), `../.vercelignore` (created — excludes `design/` from deploy).
- **Created:** this ADR.
- **Pending (phased, separate commits):** `../src/app/globals.css` (tokens), `../src/app/layout.tsx` (fonts), `../src/app/.../page` (homepage), `../src/components/**` (migration + exports).

## Forward links

- Per-phase work may warrant its own ADR if it makes a non-obvious call (e.g., the aliasing strategy in P1, or the export-component convention in P4).
- The app has its own design-system docs/rules (its `/system`, root `CLAUDE.md`); reconcile Loomling's `system/*.md` guidance with the app's as components migrate, so there's one source of rules rather than two.
