# ADR 0016 — First-run onboarding welcome stepper

**Date:** 2026-05-28
**Status:** superseded by 0017

## Context

A brand-new Loomling user opens the Loom and gets no orientation. The Loom also ships **populated**, not empty: the manifest carries ~37 starter primitives (System page) plus example Elements on the Library page (Navigation, Homepage hero, Footer, Blog article, Blog post, test-page). So a first-timer lands in a full catalog with nothing explaining the core mental model — **you drive Loomling by talking to Claude Code; CC writes the files following your design system** — what the pre-built Elements are, or how to start making the project their own. The `.lib-empty` "Nothing here yet" card almost never shows.

The user asked for "a few steps to help a user get set up," with three hard constraints: *few steps*, *never force the user to do anything*, and *explain how Loomling works without over-explaining*.

The shaping architectural fact: **the Loom cannot write to disk — only CC does** (CLAUDE.md §13). So onboarding can't *perform* setup or deletion; it orients and hands off, the same way the Tokens Import modal (§17) and the dark-mode editor (§18) generate copy-paste CC prompts.

## Decision

A dismissible **3-step welcome stepper** at `library/onboarding.js`, vanilla (CLAUDE.md §11), auto-opening once on first visit.

**Steps** (dot indicator `● ○ ○`):

1. **Welcome + tour the Loom** — two sentences on the mental model + a one-liner per nav surface (Library / System / Builder / Settings) + the line that CC flags "drift" and offers choices, never blocks. Carries the secondary start-fresh row.
2. **Initialize your project** — a `<pre>` showing a kickoff prompt + a "Copy kickoff prompt" button. Pasting it into CC starts the init interview (§7; CC auto-runs it when `initializedAt` is null).
3. **Make the design system yours** — an "Open System →" button routing to `tokens.html` (home of Tokens Import). Footer primary becomes "Done".

**Step actions are a mix** (the user's choice): copy-prompt where CC must act (initialize, start-fresh), page-link where a Loom page already serves (tokens). The user dropped a "Build first Element" step — the Library empty state already nudges that.

**Start-fresh** (secondary, on step 1): a subdued "Prefer a blank slate?" row with two ghost buttons — *Clear examples (keep primitives)* and *Clear everything* — letting the user pick scope at copy-time. Both copy paste-ready CC prompts that defer to the removal contract (§9: set `status: "removed"`, delete source files, add a note). The keep-primitives rule = "remove every Element not tagged `primitive`" (which conveniently keeps the dual-typed Navigation & Footer). Copying does not close the stepper.

**Gating.** Auto-open fires only when `loomling:onboarding:dismissed:v1` is unset **AND** `project.json.initializedAt` is null (fetched via `../project.json`, mirroring `brand.js`; on fetch failure, fall back to the dismissed-flag check alone). This is the first Loom JS to read `initializedAt`. Dismiss via Skip / × / backdrop / Esc / Done all set the flag. The "?" header button reopens regardless of the flag — the flag gates *auto*-open only.

**Reopen affordance.** A "?" help button injected into `.lib-header__inner` (idempotent guard, mirroring the `theme.js` toggle-injection precedent), inserted before `.lib-theme-toggle` for a consistent `[?][theme]` order. JS injection avoids editing 5 duplicated headers and survives both SPA nav and full reloads.

**Accessibility** (correctness gate, §5): the reused `.bld-modal` markup has no dialog semantics, so the panel gets `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `tabindex="-1"`; focus moves into the panel on open and is restored to the opener on close; a Tab/Shift+Tab focus trap cycles the visible controls (hidden steps' buttons are excluded via the `hidden` attribute + `offsetParent` filter); Esc closes; a visually-hidden `aria-live` region announces "Step N of 3"; the decorative dots are `aria-hidden`. `prefers-reduced-motion` collapses the only two transitions; step swaps are instant by construction (a `hidden` toggle, no animation).

## Consequences

- A new **persistent, page-agnostic Loom surface** exists. It is built once and lives in `<body>` (see the deliberate divergence below).
- A new localStorage key joins the `loomling:<feature>:v1` family: `loomling:onboarding:dismissed:v1`.
- `library/onboarding.js` is wired into the 5 routable pages' shared script block. Any new Loom page must include it (now also in CLAUDE.md §21 and ADR 0014's forward links).
- Reuses `.bld-modal*` / `.bld-btn*` and inherits the dark-mode `.bld-btn--primary` remap for free; the new chrome uses `--lib-*` tokens only, so dark mode flips with no companion overrides.
- Stays inside §11 — hand-written vanilla, no deps, no `package.json`.

### Deliberate divergence from ADR 0014's "modals live inside `<main>`" rule

ADR 0014 mandates that modals live inside `<main>` so they travel with the router's content swap. **The onboarding modal intentionally lives in `<body>`, outside `<main>`.** It is *global chrome* (like the header), not page-specific content — it must persist unchanged across every navigation, and rebuilding it per-nav would be wrong. Verified: exactly one modal + one "?" button after SPA nav (Library ↔ System) and after a full reload (into Builder). The ADR 0014 rule remains correct for *page-specific* modals (e.g. Tokens Import in Settings); this is the documented exception for global chrome.

## Approaches that didn't work (and why)

- **Backdrop-dismiss looked broken — was a test artifact.** `document.querySelector(".bld-modal__backdrop")` matched the Tokens Import modal's backdrop (earlier in the DOM on the System page), not the onboarding one. Scoping to `#loom-onboard-modal .bld-modal__backdrop` confirmed dismiss works + sets the flag. The `.bld-modal*` classes are shared across modals — verification selectors must be scoped to `#loom-onboard-modal`.
- **Default amber focus ring on the panel.** Programmatically focusing the `tabindex="-1"` panel surfaced the UA `outline: auto` ring. Fixed with `.onb-panel:focus { outline: none }` — the panel is focused only to anchor the dialog for SR; keyboard users tab to the buttons, which keep their `:focus-visible` rings.

## Alternatives considered (not implemented)

- **On-page "Get started" checklist** (ambient, on the Library landing page, progress-tracked) — a strong fit for "never force," but the user chose the modal stepper directly when asked.
- **Hybrid** (one-screen welcome modal + persistent checklist) — most coverage, two surfaces to maintain; rejected for simplicity.
- **Copy-prompts-only / orientation-links-only** step actions — rejected in favor of the mix (prompt where CC must act, link where a page serves).
- **A 4th "Build your first Element" step** — dropped; the Library empty state already nudges it.
- **Fixed start-fresh scope** (examples-only OR wipe-everything) — rejected; the user chose "let the user pick" at copy-time.
- **Static-markup "?" button** in each header — rejected (5-file duplication churn); JS injection is the established `theme.js` pattern.
- **Library-only mount** — rejected; auto-open must work on whatever page the user first lands on (deep-link to tokens.html etc.), so the script loads on all 5 routable pages.
- **Coupling auto-open to `loom:nav`** — rejected; it would re-pop the modal mid-navigation. onboarding.js is deliberately not in `window.LoomPages` and ignores `loom:nav`; auto-open runs once per script execution.

## Files touched in the originating session (2026-05-28)

- **Created:** `library/onboarding.js` — gate, modal DOM factory with dialog semantics, step nav, copy-prompt (init + two start-fresh), "Open System →" navigation, focus trap + Esc, "?" header-button injection, auto-open at DOMContentLoaded. Exposes `window.LoomOnboarding = { open, close }`.
- **Modified:** `library/library.css` — `/* Onboarding stepper */` block (`.onb-lead/-tour/-note/-fresh*/-prompt/-foot/-dots/-dot/-step`), `.onb-panel:focus { outline:none }`, `.lib-onboard-help` (32px footprint mirroring `.lib-theme-toggle`), two `prefers-reduced-motion` guards. Tokens-only; inserted after the `.bld-prompt` rule in the modal section.
- **Modified:** `library/{index,tokens,components,builder,settings}.html` — added `<script src="onboarding.js" defer></script>` after `loom-router.js`.
- **Touched then reverted:** `project.json` — `initializedAt` temporarily set to a date to verify the already-initialized gate, then restored to `null`.

## Forward links

- **New Loom page checklist** now also requires loading `onboarding.js` (alongside ADR 0014's 5-point router checklist). The "?" button + modal will appear automatically once the script loads, because both inject idempotently.
- If onboarding gains more than 3 steps, revisit the "few steps" constraint with the user before adding — the dot indicator and the "never force" principle both assume a short flow.
- If a future need arises to *track progress* (auto-checking completed steps), the on-page checklist alternative (rejected here) is the natural evolution; it can derive completion from `project.json` (name/brandSource) + the manifest (user-authored entries).
- The start-fresh prompts encode the keep-primitives rule as prose; if the primitive-tagging convention (§19) changes, re-check that "remove every Element not tagged `primitive`" still means what it should.
- Documents the §21 onboarding surface in CLAUDE.md; that section is the operational summary, this ADR is the rationale of record.
