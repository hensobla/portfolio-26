# ADR 0021 — Design check: an advisory, Loomling-owned adaptation of `detect`

**Date:** 2026-06-02
**Status:** accepted (implements Phase 1 of ADR 0020)

## Context

ADR 0020 set the roadmap for integrating impeccable into Loomling as an advisory, proactively-invoked design layer. **Phase 1** is the anchor: make impeccable's deterministic `detect` linter useful inside Loomling without violating the principles the user set — taste is the highest authority, no new command language, Loomling keeps its own source of truth, the rule set is Loomling-owned and editable, and the posture is "Moderate" (enforce only what genuinely affects a reader, plus a few near-universal slop tells).

Two facts from the evaluation constrain the design:

1. **`detect` on Loomling *source* produces false positives that are correct-by-design** — empty `data-loom-slot src=""` slots flagged `broken-image`, `--custom-property` declarations counted as `--` em-dashes, single-font preview harnesses flagged `single-font`. Run against the **rendered** preview, these vanish. This is also the altitude §16 cares about.
2. **Loomling is deliberately dependency-free** (no `package.json`, vanilla, CC-orchestrated, §11). Taking a hard runtime dependency on an external npm package would be the first such dependency and cuts against that grain.

ADR 0020 explicitly deferred one decision to this ADR: **depend on `npx impeccable detect` vs. vendor the detector into the repo.**

## Decision

Add a **design check**: an advisory pass, Loomling-owned, surfaced through existing surfaces, that flags a curated rule set on the **rendered** element and never blocks.

**1. Loomling owns the rules, not the engine.** The rule set lives in `.loomling/design-check.json` (Moderate allowlist: `low-contrast`, `skipped-heading`, `broken-image`, `text-overflow`, `cramped-padding`, `tiny-text`, `line-length`, `gradient-text`, `side-tab`, `em-dash-overuse`; everything else off). Editing that file is how the rule set evolves — no code change. This satisfies "Loomling-owned, editable, slop evolves."

**2. Executor decision (resolves the 0020 fork): CC-driven, no project dependency.** Neither a hard `npx` dependency nor a full vendor of impeccable's ~3k-line engine. Instead: when `impeccable` is present, CC runs `npx impeccable detect <rendered-url> --json` and filters to the enabled rules; when it isn't, CC inspects the rendered DOM against the same config. The config is the contract; impeccable is an executor CC happens to use, exactly like every other Loomling operation is CC-orchestrated. The project ships nothing new to depend on.

**3. Rendered altitude, always.** The check scans the served preview (`/{previewPath}?entry=<slug>&state=<id>`), per declared state — never the source file. Encoded as `"altitude": "rendered"` in the config and stated in `system/design-check.md`. Loomling-intentional patterns (unfilled slot placeholders, harness single-font) are discounted explicitly.

**4. Advisory, never blocking.** Findings are surfaced grouped by severity and inform the decision; they never stop an approval. Consistent with the drift protocol (§5) and where-used precedent (ADR 0005). The only design rules that block remain the pre-existing hard ones in `system/accessibility.md` / `system/seo.md`.

**5. Surfaced through existing surfaces (no new command language).** A **"Run design check"** button in the Sandbox emits a paste-ready prompt (cloning the Approve/Discard pattern, reusing `wirePromptModal()`), and the approval flow (`.loomling/prompts/approval-checklist.md`, `CLAUDE.md §6`) runs the check before status flips. Operating contract documented as `CLAUDE.md §22`.

## Consequences

**Positive:**
- The user gets impeccable's deterministic quality check at the right altitude, with the false positives engineered out, and with the rule set under their own control.
- Zero project dependency; Loomling stays vanilla and CC-orchestrated. If `impeccable` is uninstalled, the check degrades to CC self-inspection rather than breaking.
- Advisory framing means it can never fight the designer's taste — it only ever suggests.
- The `fix` field per rule pre-wires Phase 4's proactive routing (finding → matching capability) without doing anything yet.

**Negative / costs:**
- The check's determinism depends on whether `impeccable` is installed in the running CC environment; the self-inspection fallback is less reproducible. Acceptable: the config (the *contract*) is stable either way.
- One small new Loom UI surface (the Sandbox button + modal) — sanctioned by the user; consistent with the existing paste-prompt buttons.
- The rendered scan needs a running server (today's static `http-server`); fine now, re-verify if a stack is declared (§10).

## Alternatives considered (rejected)

- **Hard dependency on `npx impeccable`** as a required step. Rejected: first external runtime dependency in a deliberately dependency-free project; freezes the rule set in the package against the "slop evolves" principle; the URL/browser engine needs a Chromium download that's fragile in some environments.
- **Vendor impeccable's full detector** (`registry/` + `rules/` + engines, ~3k lines, Apache-2.0) into `.loomling/`. Rejected for now: heavy maintenance + licensing surface for a Moderate 10-rule set; CC can already evaluate these rules against the rendered DOM. Revisit only if a fully offline, deterministic check becomes a requirement.
- **Scan source instead of rendered output.** Rejected: proven to false-flag intentional Loomling patterns (slots, CSS vars, harnesses). Rendered altitude is non-negotiable.
- **Make the check block approval.** Rejected: violates "taste is the highest authority" and the flag-never-block drift model (§5, ADR 0005). Hard a11y/SEO rules already block where they must.
- **Enforce the full impeccable rule set** (all ~38). Rejected: most are taste, not correctness; the user's Moderate posture keeps only reader-impacting rules + a few universal tells on.

## Files touched

- **Created:** `.loomling/design-check.json` (rule config), `system/design-check.md` (system doc), `decisions/0021-design-check-advisory-gate.md` (this ADR).
- **Modified:** `library/sandbox.html` + `library/sandbox.js` (the "Run design check" button + modal, reusing `wirePromptModal()`); `.loomling/prompts/approval-checklist.md` (advisory design-check step); `CLAUDE.md` (new §22 + a one-line pointer in §6).

## Forward links

- **Phase 2** (ADR 0020): `critique`/`audit` as on-demand second-opinion paste-prompts — same Sandbox-button pattern established here.
- **Phase 4** (ADR 0020): the `fix` field in `design-check.json` becomes the proactive router (finding → suggested capability) at the §4/§6/§16 trigger moments.
- **Deferred:** the repo-wide em-dash sweep (separate task); per-rule tuning of the allowlist as real elements are checked.
- If the check ever needs to be fully offline/deterministic (e.g. CI once a stack is declared), revisit vendoring the detector (rejected above).
