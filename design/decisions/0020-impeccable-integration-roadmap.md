# ADR 0020 — Impeccable integration roadmap: an advisory, proactively-invoked design layer

**Date:** 2026-06-02
**Status:** accepted (roadmap; each phase ratified by its own follow-on ADR when built)

## Context

The user evaluated **impeccable** — an open-source design toolkit (Paul Bakaus, Apache-2.0, installed user-level at `~/.claude/skills/impeccable/`) — for possible integration into Loomling. Impeccable is two distinct things sharing one name:

1. **`detect`** — a deterministic, no-AI CLI linter (~38 rules in two families: `slop` "looks AI-generated" and `quality` "objectively broken"). Runs over files or a rendered URL.
2. **24 `/commands`** — AI design *playbooks* (`critique`, `audit`, `typeset`, `colorize`, `bolder`, `polish`, `craft`, `live`, …) that Claude reads and executes, most of which write code.

We ran a hands-on evaluation (an interactive course under `impeccable-course/`, plus live runs of `detect`, `critique`, and `live` on real and demo elements) and the user produced a verdict shortlist — **30 Love / 6 Maybe / 5 Skip** — with detailed notes. The shortlist is preserved verbatim at `impeccable-course/my-progress-backup.json` and in readable form at `impeccable-course/MY-SHORTLIST.md`.

A consistent philosophy runs through the notes and **anchors every decision below**:

- **The user's taste is the highest authority.** Impeccable is an *advisor*, never an owner. "We can't have users' preferences being overwritten by this." "Leverage the user's taste as the highest authority." This already matches Loomling's "flag drift, never block" model (ADR 0005, CLAUDE.md §5).
- **No new command language.** "I usually just use the CC desktop app, I don't run commands." A capability the user has to *know the name of* will never get used. Value must surface inside Loomling's existing surfaces and fire on its own.
- **Keep Loomling's source of truth.** Skip impeccable's `PRODUCT.md`/`DESIGN.md` ownership model; "keep Loomling's but steal anything useful and adapt it."
- **Slop is a moving target.** "What looked like slop two years ago is not slop today… slop may be slop but if it works then it's not de-facto problematic." The rule set must be Loomling-owned and editable, not frozen in the npm package.
- **Specific rejections from the notes:** no OKLCH migration (Loomling tokens are HSL, and OKLCH is "not designer-friendly"); typography rules are "kinda strict"; motion is "already worked out"; the AI-slop-test is "mid."

The evaluation also surfaced a hard technical fact: running `detect` over Loomling **source** produces false positives that are intentional by design (empty `data-loom-slot src=""` image slots flagged as `broken-image`; CSS custom properties `--foo` counted as `--` em-dashes; `single-font` flagged on isolated preview harnesses). Run against the **rendered, slot-filled page** instead, those evaporate — which is exactly the altitude §16 cares about ("structurally correct by publish time").

This ADR records the integration **strategy and sequencing only**. Per the user's direction it builds nothing else yet; each phase is ratified by its own ADR when implemented.

## Decision

Adopt impeccable as an **advisory, proactively-invoked design layer** woven into Loomling's existing lifecycle — not as a parallel toolchain and not as 24 slash commands.

### Principles (the spine)

1. **Advisory, not authority.** Impeccable surfaces findings and suggestions; it never blocks and never silently overrides taste. The one exception is Loomling's pre-existing hard rules (accessibility, heading hierarchy), which stay hard.
2. **No new command language — surface through existing Loom surfaces.** Reuse the paste-prompt pattern (Tokens Import ADR 0008; Approve/Discard in `sandbox.js`) and the approval flow. The user never has to learn or type impeccable commands.
3. **Proactive by default.** Capabilities engage automatically at defined moments in Loomling's lifecycle (see *Trigger moments*). Correctness is applied or auto-flagged; taste moves are auto-*suggested* with one-tap consent; taste is never applied silently. Natural-language invocation ("make this bolder") is *also* supported but is never the only path.
4. **Keep Loomling's context model.** `project.json` + `system/*.md` + `manifest.json` remain the source of truth. No `PRODUCT.md`/`DESIGN.md`.
5. **Loomling-owned, editable rules.** The curated rule set lives under `.loomling/` (alongside `prompts/` and `schema/`) so it evolves with taste, not with the package.
6. **Moderate rule posture** (user-selected): enforce as advisories the `quality`/a11y rules that genuinely impact the user, **plus** a few near-universal slop tells; everything else off by default.

### Phased roadmap (every verdict mapped)

- **Phase 1 — `detect` as an advisory approval gate.** *(Love: detect-core, detect-rules, detect-engines.)* A curated rule config in `.loomling/` — **Moderate**: `low-contrast`, `skipped-heading`, `broken-image`, `text-overflow`, `tiny-text`, `cramped-padding`, `line-length`, **plus** `gradient-text`, `side-tab` (side-stripe), `em-dash-overuse`; all other tells off. `detect` runs against the **rendered** preview (browser engine via the running `http-server` URL), never raw source, to avoid the proven false positives. Folds into the approval flow (§6, `.loomling/prompts/approval-checklist.md`) as an advisory step — flag, never block (precedent: ADR 0005). Triggered from the Sandbox via a "Run design check" paste-prompt. **Open decision for Phase 1's ADR:** depend on `npx impeccable detect` vs. vendor the Apache-2.0 detector into `.loomling/` — vendoring favors principle 5 (editable, no external-package drift) and removes a network/`npx` dependency.

- **Phase 2 — `critique`/`audit` as on-demand "second opinion."** *(Love: eval-critique, eval-audit, eval-group; user asked "can we run fixes right after?")* A Sandbox button emits a paste-prompt; CC runs the impeccable critique/audit playbook **read-only**, substituting `system/*.md` for the `PRODUCT.md` it normally demands (never writes one). Findings (P0–P3) route into the normal §14/§5 flow as optional follow-up fixes the user opts into.

- **Phase 3 — fold the loved rulebook into `system/*.md` (advisory).** *(Love: rulebook-copy, rulebook-craft; Maybe: rulebook-bans.)* Merge the copy rules into `system/voice.md` (it already bans clichés; add the buzzword list, link-text-needs-standalone-meaning, and the em-dash rule — **the repo-wide em-dash sweep is a deferred, separate task**). Adopt only additive craft thresholds as *guidance*. Per the notes, **explicitly do not**: migrate to OKLCH, tighten typography further, or touch motion. Absolute bans become advisory *defaults* the user overrides.

- **Phase 4 — editing commands as proactively-invoked CC capabilities.** *(Love: enhance/refine/fix groups + members; Maybe: onboard, craft; Skip: typeset.)* Adopt the *playbook knowledge* (bolder, quieter, distill, polish, harden, clarify, adapt, optimize, colorize, layout, animate, delight, overdrive) as capabilities CC brings to bear **at the trigger moments below** — not only when named — routed through §14 snapshot + §5 drift + tokens-only. Correctness-leaning ones (harden, adapt, clarify) run/flag automatically; taste-leaning ones (bolder, delight, colorize) are auto-*suggested* with one-tap consent. Skip `/typeset`. Revisit `/onboard` later (Loomling already has its own onboarding, §21).

- **Phase 5 — build commands, selective.** *(Love: shape, extract, build-group; Maybe: craft.)* `/shape` → an optional plan-before-code pre-step to the §4 authoring rhythm. `/extract` → migrate drifted CSS back to tokens, writing *into* the manifest. `/craft` → keep Loomling's authoring contract; borrow only its multi-round shaping ideas, never its write-around-the-manifest behavior.

### Trigger moments (how capabilities engage without being named)

The mechanism that makes "proactive" real. Adapt impeccable's own `context-signals` routing (a finding maps to the matching fix) as the engine:

- **On authoring (§4):** after CC builds or edits an element, it auto-runs the Phase-1 check and, from the findings, auto-*suggests* the matching capability (gradient-text → quieter, weak hierarchy → layout, buzzword copy → clarify). One tap to apply; declining costs nothing.
- **On approval (§6):** the Phase-1 gate runs automatically; a `critique`/`audit` second opinion is offered before the status flips. Never blocking.
- **At publish / composition time (§16):** correctness-leaning capabilities (harden, adapt, and the existing heading/landmark/alt derivations) run automatically as part of the "structurally correct by publish time" guarantee — no prompt.
- **Always reversible:** every proactive *taste* application goes through the §14 snapshot lifecycle, so one-step revert is guaranteed. Correctness fixes follow normal drift surfacing (§5).

## Consequences

**Positive:**
- The integration rides Loomling's existing rails (drift §5, approval §6, paste-prompts, §14 snapshots, §16 correctness) — minimal new surface area, maximal consistency.
- Directly answers the user's two biggest reservations: the learning curve ("don't run commands" → proactive + paste-prompts) and authority ("don't overwrite taste" → advisory + reversible).
- A Loomling-owned rule config keeps "slop evolves" tractable and keeps Loomling vanilla/self-determining.

**Negative / costs:**
- Phase 1 introduces an external dependency (`npx impeccable` or a vendored detector) — the first genuine third-party code in a deliberately dependency-free project. The vendor-vs-`npx` decision is deferred to Phase 1's ADR but must be made consciously (§11 spirit).
- "Proactive suggestion" adds a new interaction surface that must be tuned to avoid nagging; the auto-suggest must stay one-tap-dismissable and quiet, or it violates principle 1.
- Running `detect` at the rendered altitude requires a running server (today's static `http-server`); fine now, but the mechanism must be re-checked if a stack is later declared.

## Alternatives considered (rejected)

The rejections are the most load-bearing part of this ADR — they record what was tried and deliberately discarded, so future sessions don't re-litigate.

- **Install impeccable as-is (24 slash commands).** Rejected: it's a second opinionated design brain that assumes it owns the project, writes around the manifest, and demands `PRODUCT.md`/`DESIGN.md`. It would fight Loomling's drift/approval/tokens discipline and the "no new command language" verdict.
- **Adopt impeccable's `init` + `PRODUCT.md`/`DESIGN.md` context model.** *(Skip: ctx-init.)* Rejected: Loomling already has `project.json` + `system/*.md` + the manifest as source of truth, plus its own init (§7/§21). Keep Loomling's; steal ideas only.
- **Adopt `/document`, the palette seeder, `/typeset`.** *(Skip: ctx-document, ctx-palette, enh-typeset.)* Rejected/deferred: the design knowledge already lives in `system/*.md`; brand seeding is already covered by Tokens Import (§17). `/document` may later *export* a DESIGN.md for tool interop, but Loomling does not adopt its model.
- **Migrate tokens to OKLCH** to match impeccable's color discipline. Rejected per the user: Loomling is HSL, OKLCH is "not designer-friendly," and the contrast guarantees already hold in HSL.
- **Tighten typography / treat the AI-slop-test as gospel.** Rejected: typography rules are "too strict" already, and "simple ≠ bad" — the slop-test is advisory at most.
- **Adopt `live` mode.** *(Skip: live-mode.)* Rejected as "overkill for our current setup": it needs an HMR dev server Loomling doesn't run, is human-in-the-loop (CC can only be the backend), and writes to disk with a non-trivial carbonize-cleanup per accept. Revisit only if a stack with HMR is declared (§10).
- **Make any of this blocking.** Rejected: contradicts principle 1 and ADR 0005. Only Loomling's pre-existing hard a11y rules block.
- **Freeze the rule set inside the npm package.** Rejected: "slop is a moving target"; the curated rules must be Loomling-owned and editable (principle 5).

## Files touched

- **Created:** `decisions/0020-impeccable-integration-roadmap.md` (this file). No other changes — this is a roadmap; implementation is deferred to per-phase ADRs.
- **Referenced (not modified):** `impeccable-course/MY-SHORTLIST.md`, `impeccable-course/my-progress-backup.json` (the source verdicts); `decisions/0005-where-used-on-approval.md` (flag-not-block precedent); `decisions/0008-tokens-import-flow.md` (paste-prompt precedent).

## Forward links

- **Phase 1 ADR** must resolve the `npx`-vs-vendor decision, define the exact `.loomling/` rule-config format, and specify the rendered-URL detect invocation + the Sandbox "Run design check" paste-prompt + the §6 approval-checklist hook.
- **Deferred separate task:** the repo-wide em-dash sweep (CLAUDE.md, `system/*.md`, `tokens.css` comments) — keep only the ~1% truly value-adding, per the user's note. Big blast radius across core docs; scope it on its own.
- **Deferred:** per-rule curation of the Phase-1 allowlist (this ADR fixes the Moderate posture; the exact final rule list is tuned when Phase 1 is built).
- If a stack is later declared (§10), re-evaluate `live` mode (Phase-5+) and re-verify the rendered-`detect` mechanism against the new build.
- Each phase, when built, runs the §14/§6 lifecycle and gets its own ADR; this roadmap is the umbrella they link back to.
