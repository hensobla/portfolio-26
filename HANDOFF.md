# Handoff — Live site gated; Blueprint design system built in Loomling (`design/`)

**Updated:** 2026-06-05
**Branch:** `main` (clean; everything committed + pushed)
**Session length:** Long. Big architectural pivot + a multi-iteration homepage build.

> Supersedes the previous handoff ("Design system foundation shipped", 2026-05-17). That session's content is in git history. The design system it described was **deleted this session.**

## Current goal

Build the personal portfolio's look & feel in the **Loomling** workspace (`design/`) under the new **"Blueprint"** brand, while the **live site stays a password gate** ("coming soon") until ready. Loomling's design system is the source of truth and will **override**/replace the app's old one (ADR 0027). Active build thread: the **homepage** (`design/src/templates/home`).

## State right now

- **Live site = password gate.** `src/proxy.ts` redirects all routes → `/enter` unless authed. `/enter` is now a plain neutral password page (old "Teamollo" branding removed). Homepage `src/app/page.tsx` = "Under construction" placeholder behind the gate. **Production build passes** (`npm run build` ✓). Merged to `main` and pushed (commit `ca485fc`) → Vercel is deploying production.
- **Old parent design system fully deleted** (`src/components/*`, `src/app/library/`, `src/app/p/`, `src/lib/sandbox-manifest.tsx`). Sanity studio (`/studio`, `src/sanity/`) kept, gated.
- **Loomling homepage (resting state) is well-developed and looks good** — `design/src/templates/home/{home.html,home.css,preview.html}`, status `draft` in `design/library/manifest.json`. Has 3 layout states: `default` (Centered — chosen), `top`, `bottom` (kept for pivots).
- **Not yet done:** the homepage **open state** (folder takeover) + its animation; publishing anything from Loomling into `src/` (no migration phases executed yet beyond the stack decision).

## What was done this session

- **Loomling Fresh init** — `design/project.json` name=`portfolio-26`, purpose set, `initializedAt`=2026-06-05.
- **Brand seed (ADR 0026)** — ported the "Blueprint" brand kit into `design/src/tokens.css`: warm-neutral + electric-blue ramps (exact hand-picked hexes preserved), light-default + `[data-theme="dark"]`, **accent split** into `--accent` (stable #2E4BFF fill) / `--accent-text` (#1B33C7 light, #5C78FF dark) / `--accent-fg` (cream on fills) + `--line`; fonts Archivo / Hanken Grotesk / Departure Mono via `design/src/fonts.css`; a letter-spacing scale. Migrated ~20 component CSS files to the new accent roles. Updated `design/system/color.md` + `typography.md`. (`brand-kit-blueprint.html` is gitignored.)
- **Library cleanup** — removed all Loomling starter modules/templates except `navigation` + `footer` (manifest `status: removed`, source deleted).
- **Homepage build (`design/src/templates/home`)** — iterated heavily to a Figma wireframe ("June 2026", BLOCK A, file `fqfwIkPzFHLw4FcEePUeiW`, nodes `2021:3` resting / `2021:78` open; PNG refs in `design/.figma-ref/`, gitignored): name + bio as one centered identity block (left), a **tabbed "My Projects" folder** on the right drawn as **SVG line-work** (trapezoid tabs, blueprint-blue `--line`, cascading down-right, lighter `--surface1` fill), faint **blueprint grid wash** background, refined typography (mono `MY PROJECTS` label + Hanken list), and a **mono "AVAILABLE FOR WORK" status with a pulsing green dot** (top-right). 3 layout states for comparison.
- **Motion** — added a looping `.loom-pulse` utility (keyframe + reduced-motion off-switch) to `design/src/motion.css`; documented in `design/system/motion.md` (a new continuous-animation category).
- **Architecture pivot** — declared the stack (`design/project.json` `stack:"next"`; mirrored to manifest) and wrote **ADR 0027**: Loomling overrides the app, publish-bridge defined (approved element → React `.tsx` + `.module.css` in `src/components`), phased migration. Added `.vercelignore` (excludes `design/` from deploy).
- **Live-site gate + scrap** — recovered the forgotten password, made `/enter` plain, deleted the old site, replaced homepage with placeholder. Verified gate + auth in-browser (correct pw → 200, wrong → 401) and the prod build.

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Keep Loomling's usage-based token vocab (`--background`/`--text1`/`--accent`), not the brand kit's `--paper`/`--text` | User: "paper isn't informative enough." Zero component renaming. | Adopt brand-kit names; align to the app's old `--paper`/`--ink`. |
| Split accent into fill / accent-text / accent-fg | `#2E4BFF` fails AA as text in dark mode; the split keeps the vibrant fill stable AND text AA in both modes. | Single mode-variant accent (borderline 4.52:1, drops the stable-fill brand principle). |
| Loomling **overrides** the app's design system (ADR 0027) | User chose it; one brand + one token vocab across design + prod. | Translate per element; converge by building in the app; keep two systems. |
| Live site = password gate, scrap old site | User wants a "coming soon" facade, not ready for anyone. | Migrate Blueprint to the live homepage now (deferred — publish behind the gate later). |
| Folder tabs as inline SVG, not CSS | CSS `clip-path` can't stroke the angled sides of a trapezoid cleanly; SVG gives crisp geometric line-work + animates well. | CSS skew/clip-path (borderless angled sides / messy overlap). |
| Homepage canvas uses `aspect-ratio: 16/9` in the Sandbox, `100svh` only standalone | The Loom Sandbox auto-sizes the iframe to content; `100svh` there caused a measure→grow loop. `.home--standalone` (added by preview.html when top-level) gates the `svh`. | Plain `100svh` (infinite-growth bug). |

## Approaches that didn't work

- `min-height: 100svh` on the home root → **infinite height growth** in the Loom Sandbox (iframe auto-sizes to content). Fixed via the standalone-class gate above.
- Body `margin-top` to reserve the folder's tab band → **margin-collapse** dropped the tabs onto the body. Fixed with `padding-top` on the folder.
- Semi-transparent ("ghost") back tabs → crossing strokes looked messy; switched to opaque fills with full strokes, layered behind the body.

## Files touched (highlights)

- **Live app — Modified:** `src/app/enter/page.tsx` (plain gate), `src/app/page.tsx` (placeholder), `CLAUDE.md` (rewritten to current architecture), `HANDOFF.md` (this).
- **Live app — Created:** `.vercelignore` (excludes `design/`).
- **Live app — Deleted:** `src/components/` (all), `src/app/library/`, `src/app/p/`, `src/lib/sandbox-manifest.tsx`.
- **Design — Created/Modified:** `design/src/tokens.css`, `design/src/fonts.css`, `design/src/motion.css`, `design/src/templates/home/*`, `design/project.json`, `design/library/manifest.json`, `design/system/{color,typography,motion}.md`, `design/decisions/0026-*.md`, `design/decisions/0027-*.md`.
- **Referenced (not modified):** `src/proxy.ts`, `src/app/api/auth/route.ts` (the gate logic), `design/CLAUDE.md` (Loomling operating contract — still valid).
- **Stale (not yet cleaned):** root `system/*.md` (10 docs describing the deleted parent design system).

## Git state

`main` is clean and pushed (`origin/main` = `ca485fc`). Three commits this session: `db77e98` (Loomling workspace), `85308cb` (gate + scrap old site), `d807a09` (stack adoption + `.vercelignore`), merged via `ca485fc`. Branch `feat/loomling-design-workspace` also on origin.

> Note: this `HANDOFF.md` rewrite + the `CLAUDE.md` rewrite are **uncommitted** working-tree changes (the handoff step doesn't commit). `design/HANDOFF.md` is gitignored.

## Immediate next steps

1. **Verify Vercel production env vars** `AUTH_SECRET` + `SITE_PASSWORD` are set for Production (if `AUTH_SECRET` is missing, the gate is bypassed → site open). Then load the domain → should show the plain `PRIVATE` gate.
2. **Resume the homepage in Loomling:** build the **open state** (folder grows to fill, name → top-left nav-logo, P1–P4 tabs spread, project detail = title + body + 2×2 image grid) as `data-home-state="open"` on the same DOM, then the **takeover animation** between resting↔open (a new motion category — drift-C). Serve with `cd design && npx http-server . -c-1`, preview at `…/src/templates/home/preview.html`.
3. (Later) Execute the ADR 0027 migration to publish Blueprint into `src/` (tokens → fonts → homepage → components), behind the gate.

## Open questions / blockers

- Remove Sanity (`/studio` + `src/sanity/`) for a true clean slate, or keep it for a future CMS? (Left in, gated.)
- Clean up / delete the stale root `system/*.md` legacy docs?
- When to flip the live site from gate → real Blueprint homepage.

## Gotchas for the next session

- **Two design systems' vocabularies differ.** Loomling = `--background`/`--text1`/`--accent`; the app's old `globals.css` = `--paper`/`--ink`/`--primary` + `--text-mono-xs` etc. The migration (ADR 0027) ports Loomling's into the app; don't mix them.
- **The Loom Sandbox auto-sizes its iframe to content — never use raw `vh`/`svh` in a previewed piece** (infinite-growth loop). Gate viewport height behind a standalone class like `home` does.
- **Loom previews must be served from `design/`** (not `design/library/`), over `http://` (not `file://`) — they fetch `../src/tokens.css` + `manifest.json`.
- **The preview MCP is bound to the Next app (port 3000).** It can verify `src/` changes (e.g., `/enter`), but **cannot** reach the Loom on `:8765` (it re-pins to its origin). Verify Loomling visually via the served URL by hand / screenshots from the user.
- **Production gate fails open** if `AUTH_SECRET` is unset in Vercel (see step 1).
- **Departure Mono is a pixel font** — only for short mono labels at ~11px; long strings fall back to Hanken (see `design/system/typography.md`).
- Root `CLAUDE.md` now points to `design/`; the root `system/*.md` docs are legacy (removed system).
