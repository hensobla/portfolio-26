@AGENTS.md

## Session continuity

If `HANDOFF.md` exists in the project root, read it first before doing anything else. It contains the state of the previous session and immediate next steps.

# portfolio-26 — current architecture

> **Big change on 2026-06-05:** the old parent design system (React `src/components/ui` + `modules` + `templates`, Sanity-driven, `src/lib/sandbox-manifest.tsx`, the `src/app/library` route) was **deleted**, and the live site was stripped to a password gate. The design system now lives in **`design/`** (the "Loomling" workspace) and *overrides* the app. The section at the bottom marked **LEGACY** describes the removed system — don't follow it; it's noted only until `system/` is cleaned up. See ADR `design/decisions/0027-stack-adoption-loomling-overrides-app.md`.

This repo has two parts:

1. **The Next.js app (`src/`)** — the deployable website. Right now it's a **password gate** over an "under construction" placeholder.
2. **`design/`** — the **Loomling** design workspace (vanilla HTML/CSS/JS, tokens-only). This is the **source of truth for the site's look & feel** (the "Blueprint" brand). It is **excluded from deploy** (`.vercelignore`) and never public. Operating contract: **`design/CLAUDE.md`** (read it before doing design work).

## The live site (`src/`)

- **Gate:** `src/proxy.ts` (Next 16 renamed middleware → proxy) redirects every route to `/enter` unless the `portfolio_auth` cookie equals `AUTH_SECRET`. Public-only paths: `/enter`, `/api/auth`. `/studio` (Sanity) is kept but gated. `/library` and the old design system are gone.
- **Gate page:** `src/app/enter/page.tsx` — a plain neutral password page. `/api/auth/route.ts` checks the input against `SITE_PASSWORD` and sets the cookie.
- **Homepage:** `src/app/page.tsx` is a minimal "Under construction" placeholder (behind the gate). It gets replaced by the real Blueprint homepage when ported from `design/`.
- **⚠️ Production gate depends on Vercel env vars** `AUTH_SECRET` + `SITE_PASSWORD`. **If `AUTH_SECRET` is unset in Vercel, the gate is bypassed and the site is OPEN** (`undefined !== undefined` is false → no redirect). Confirm both are set for Production in Vercel → Settings → Environment Variables. Local dev password (`.env.local`): `kashisking`.
- **Deploy:** Vercel, from `main`. `design/` is excluded via `.vercelignore`; Next also only serves app routes + `public/`, so the Loom is doubly unreachable.
- **Stack:** Next.js 16 (Turbopack) · React 19 · Tailwind v4. Build: `npm run build` (verified green after the deletions). Dev: `npm run dev` (port 3000).

## The design system (`design/` — Loomling)

- **Brand "Blueprint":** warm cream / warm near-black grounds + one electric-blue accent; line-work-on-paper / technical-drawing feel. Fonts: Archivo (display), Hanken Grotesk (body), Departure Mono (pixel mono, short labels only). Tokens live in `design/src/tokens.css` (Loomling vocabulary — `--background`, `--surface1`, `--text1/2/3/4`, `--accent`, `--accent-text`, `--accent-fg`, `--line`, …). Rules + rationale in `design/system/*.md` and `design/decisions/*.md` (esp. ADR 0026 brand seed, ADR 0027 stack adoption).
- **Build look & feel HERE,** in Loomling (vanilla, tokens-only, previewed via a static Loom). Don't build new design directly in `src/` — author in `design/`, then publish.
- **Publish bridge (ADR 0027):** Loomling's design system **overrides** the app's. When publishing, an approved Loomling element becomes a React component in `src/components` (`.tsx` + co-located `.module.css`, tokens via `var(--…)`, **no Tailwind utility classes** in design-system pieces), and Loomling's tokens port into `src/app/globals.css`. Phased migration (tokens → fonts → homepage → components → cleanup) is in ADR 0027.

## How to serve the Loom (design workspace)

From `design/` (not `design/library/`):

```sh
cd design && npx http-server . -c-1
```

Open the printed URL + `/library/`. (Serve from `design/` so previews can reach `../src/`.) See `design/CLAUDE.md` + `design/README.md`.

---

## LEGACY — removed parent design system (do not follow)

The content that used to be here described the **old** parent design system that was deleted 2026-06-05. The root `system/*.md` docs (`README.md`, `colors.md`, `components.md`, `grid.md`, `modules.md`, `sandbox.md`, `templates.md`, `tokens.md`, `typography.md`, `decisions.md`) document that removed system and are **stale**. They can be deleted in a future cleanup. The active design system is `design/`. (The full prior workflow text is recoverable from git history before commit `ca485fc`.)
