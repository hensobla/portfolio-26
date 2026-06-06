# ADR 0017 — Onboarding becomes the 5-screen full-screen init flow

**Date:** 2026-05-28
**Status:** accepted (supersedes 0016)

## Context

ADR 0016 shipped a 3-step welcome stepper (Welcome+tour → Initialize → Customize) as a centered `.bld-modal` popup. It oriented the user but did not *gather* anything — initialization still happened through the conversational §7 interview that CC ran after the user pasted a generic kickoff prompt.

The user provided wireframes (`library/onboarding wireframes/`, treated as layout/flow intent, not final visual) for a richer flow that **collects the project basics and a starting direction in the Loom, then hands CC one tailored prompt** — making the onboarding itself the init, replacing §7's interview as the entry point. Then, separately, the user asked for the surface to be a **full-screen experience, not a popup**.

The shaping constraint is unchanged from 0016: **the Loom cannot write to disk — only CC does** (CLAUDE.md §13). So the flow can't *perform* init; it gathers inputs and produces a paste-ready prompt, the same pattern as Tokens Import (§17) and the dark-mode editor (§18).

## Decision

A dismissible **5-screen, full-screen init flow** at `library/onboarding.js`, vanilla (§11), auto-opening once on first visit. It is the project init entry point.

**The five screens** (dynamic dot indicator):

1. **Welcome** — the CC ↔ Loom loop: you act in the Loom → it hands you a prompt → you paste into CC → CC writes disk → you refresh and the Loom reflects it. Four-beat list + the "CC flags drift, never blocks" line.
2. **Basics** — `PROJECT NAME` + `BASIC PROJECT DESCRIPTION`. **Both required** to advance.
3. **Fork** — single-select cards: **Import / Let's vibe / Start fresh**.
4. **Capture** — fork-specific inputs. **Fresh has no capture screen** (`hasCapture: false`), so the sequence and dots are dynamic (4 screens vs 5).
   - *Import*: a Website⇄Files segmented toggle. Website = URL field. Files = an editable drop zone (drag pre-fills the folder **name**, user can correct to a real path) + a path chip reading "Claude will confirm and copy these in." Plus an "additional context" textarea.
   - *Vibe*: describe-the-vibe (primary) + websites-you-like + additional context.
5. **Handoff** — the generated, read-only kickoff prompt in a `.bld-prompt` readout + a Copy button + "paste into CC, then refresh."

**Each fork emits a different prompt; all converge on the Handoff screen.** Every prompt sets `project.json` basics + `initializedAt`, mirrors the name into the manifest, rewrites README's opening line, then:
- **Import** — set `brandSource` + map the URL (`WebFetch`, treat as Tokens Import `mode: "url"`), or for files **confirm the folder location before copying anything in**, then map. Contrast gate before writing.
- **Vibe** — emit a `loomling.tokens-import/v1` `mode:"vibe"` payload that runs **preview-and-commit** (§17): write `.loomling/tokens.proposed.css` only; user commits via the banner. Basics + `initializedAt` are still set immediately (initialization ≠ tokens committed).
- **Fresh** — keep shipped primitives + default `src/tokens.css`; just basics + `initializedAt`.

**Full-screen takeover.** The surface is a fixed, opaque, full-viewport overlay (`z-index: 1000`, `background: var(--lib-bg)`) that covers the whole Loom including the header; background scroll is locked via an `.onb-open` class on `<html>`. Layout: `.onb-shell` flex column → top bar (Skip, top-right) → scrollable `.onb-stage` whose `.onb-stage__inner` is centered in a 640px column (`margin:auto` in a flex column — overflow-safe) → pinned `.onb-foot` (full-width border, content aligned to the same 640 column: dots left, Back/Next right). It no longer uses the `.bld-modal*` family — only `.bld-btn` and `.bld-prompt`.

**Carried over from 0016 unchanged:** global-chrome architecture (built once, appended to `<body>`, persists across SPA nav, deliberately outside ADR 0014's "modals live inside `<main>`" rule); the gate (`loomling:onboarding:dismissed:v1` unset AND `project.json.initializedAt` null; fetch-failure → dismissed-flag only); the idempotent "?" reopen button injected into `.lib-header__inner`; dialog a11y (`role="dialog"`, `aria-modal`, focus trap, Esc, `aria-live` step announcements, suppressed panel focus ring); `prefers-reduced-motion` guards; not in `window.LoomPages`, ignores `loom:nav`.

**Extensibility (the user will iterate continuously).** Config-driven: `FORKS` map (`label`/`blurb`/`hasCapture`/`captureMeta`/`validate`) + `SCREENS` array + `META`. Add a fork → `FORKS` entry + a card + a `buildPrompt` branch. Add a capture field → markup + the fork's prompt builder (`state.fields` is a free-form bag; `hydrateFields()` keeps visible inputs synced across nav). Add a screen → `SCREENS` key + `<section data-screen>` + `META` entry + a `validate()` branch if it gates.

## Consequences

- Onboarding is now the init entry point (CLAUDE.md §7 amended; the conversational interview is the documented fallback when a user initializes by talking to CC directly).
- §21 rewritten to describe the full-screen flow + the extensibility contract.
- No new dependency, no localStorage key beyond the existing `loomling:onboarding:dismissed:v1`, no `package.json` (stays inside §11).
- No tech-stack question anywhere — stack stays deferred to first-need (§8).
- The header theme toggle is unreachable while the takeover is open (covered). Acceptable for v1; a theme toggle inside the flow is a possible future addition.

## Approaches that didn't work (and why)

- **`Boolean(X || "").trim()`** in the fork validators — `.trim()` on a boolean throws a `TypeError`. Because the validators run from `refreshNav`, which `setImportMode` calls *before* `goToScreen` reaches `renderMeta`/`renderDots`, the throw left the capture section visible but froze the title/dots on the prior (fork) screen — a confusing symptom with no visible error. Caught by attaching `window.addEventListener('error', …)` and re-triggering (the preview tool's console capture didn't surface the uncaught throw). Validators now reference `state` directly and return a plain boolean.
- **`var(--lib-fs-6)`** in `.onb-loop__arrow` / `.onb-chip__note` — the type scale stops at `--lib-fs-5`; the undefined custom property silently fell back to inherited size. Corrected to `--lib-fs-5`.

## Alternatives considered (not implemented)

- **Keep the §7 interview as the primary init**, flow optional — rejected; the user explicitly wanted the flow to *be* the init.
- **Below-the-header surface** (`top: var(--lib-header-h)`, nav still visible) — offered; user chose the full-window takeover to match the wireframes' clean-canvas look. One-line change if they reverse.
- **Fake file upload** (read bytes in the browser) — rejected; dishonest and unnecessary. Browsers can't expose an absolute path from drag-drop anyway, so the flow captures the folder *name* and CC confirms the real location before copying.
- **One generic kickoff prompt for all forks** — rejected; the three paths need materially different CC instructions (URL mapping vs confirm-before-copy vs vibe preview-and-commit vs defaults).
- **Loom writes `project.json` directly** — impossible (§13); CC sets `initializedAt` on paste, which doubles as the auto-open gate.
- **Per-fork "additional context" state keys** — not needed yet; both context boxes share `state.fields.context` and `hydrateFields()` keeps the visible one synced. Revisit if the contexts must diverge.

## Files touched in the originating session (2026-05-28)

- **Modified:** `library/onboarding.js` — full rewrite to the 5-screen full-screen state machine. `FORKS`/`SCREENS`/`META` config, per-fork prompt builders, `hydrateFields()`, folder-name drop capture, dynamic sequence/dots, full-screen shell DOM, scroll-lock on open/close. `window.LoomOnboarding = { open, close }` unchanged.
- **Modified:** `library/library.css` — `.onb-*` block reworked for the full-screen shell (`.onb-modal`/`.onb-shell`/`.onb-topbar`/`.onb-skiplink`/`.onb-stage`/`.onb-stage__inner`), big centered `.onb-title`, screen/card/field/toggle/drop/chip styles, full-width `.onb-foot` + `.onb-foot__inner`, `.onb-open` scroll lock, extended `prefers-reduced-motion` guard; fixed two `--lib-fs-6` → `--lib-fs-5`.
- **Modified:** `CLAUDE.md` — §7 amended (onboarding is the init entry point + the fork-specific work CC performs; interview is the fallback); §21 rewritten (full-screen flow, gating, extensibility, no longer `.bld-modal*`).
- **Untracked:** `library/onboarding wireframes/` — the user's reference PNGs.

## Forward links

- ADR 0016 is **superseded** by this ADR; its 3-step stepper no longer exists. Its global-chrome / gating / a11y rationale remains the historical record for those still-current invariants.
- The New-Loom-page checklist (ADR 0014 + §21) is unchanged: load `onboarding.js`; the takeover + "?" button inject idempotently.
- If a screen-transition animation is added, route it through `motion.css` tokens and keep the `prefers-reduced-motion` no-op (§20), rather than ad-hoc transitions in the `.onb-*` block.
- §21 is the operational summary; this ADR is the rationale of record.
