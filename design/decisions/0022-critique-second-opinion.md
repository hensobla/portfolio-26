# ADR 0022 — Critique: a read-only second opinion that reuses Loomling's context and the design check

**Date:** 2026-06-02
**Status:** accepted (implements Phase 2 of ADR 0020)

## Context

ADR 0020 Phase 2: surface impeccable's `critique`/`audit` evaluate commands as on-demand "second opinions." The user loved both in evaluation, and noted: *"Helpful even on a test-element. I would imagine we can run those updates to the element immediately afterward?"* Phase 1 (ADR 0021) already shipped the deterministic design check and established the Sandbox paste-prompt pattern, which Phase 2 reuses.

Two facts shape the design:

- impeccable's `critique` is a *playbook*, not a deterministic tool: it runs a subjective design review (heuristics, personas, cognitive load) woven with a deterministic detector pass, and normally demands `PRODUCT.md`/`DESIGN.md` for context and persists a snapshot under `.impeccable/`.
- impeccable's `audit` (technical a11y/perf/responsive) overlaps heavily with what Loomling already has: the Phase 1 design check + the approval accessibility checklist (`system/accessibility.md`).

## Decision

Ship a single, advisory, read-only **critique** — surfaced through the Sandbox, reusing Loomling's context and the Phase 1 design check.

1. **One button, not two (no separate `audit`).** The critique folds the technical pass in, and `audit`'s unique scope (contrast/headings/overflow) is already covered by the design check (§22) + the approval a11y checklist. Adding a second button would crowd the Sandbox header and duplicate coverage. A dedicated audit pass can be added later if a declared stack (§10) introduces perf/bundle/i18n concerns the static project lacks.

2. **Loomling context, never `PRODUCT.md`/`DESIGN.md`.** CC reads `system/voice.md`, the `system/*.md` rules, and `project.json` as the brief, and must not create impeccable's context files. Keeps Loomling's single source of truth (ADR 0020 principle 4).

3. **Reuse the design check as the deterministic pass.** The critique's deterministic half is the Phase 1 design check (`.loomling/design-check.json`, Moderate, rendered altitude), not a separate impeccable detector run. One rule set, two depths.

4. **Read-only, no writes, no snapshot.** The report goes to chat (heuristic table, on-brand/AI-slop verdict, P0–P3 issues, persona red flags). Nothing is written — not files, not the `.impeccable/critique/` archive impeccable normally persists. Advisory, never blocking (§5, ADR 0005).

5. **Acting on findings is a separate, explicit step** (answers the user's "run fixes right after?"): any fix runs through the normal edit lifecycle — §14 snapshot + §5 drift + tokens-only. The critique never edits.

6. **Surfaced via the established pattern:** a Sandbox **"Critique"** button emits a paste-prompt (`buildCritiquePrompt` in `sandbox.js`, reusing `wirePromptModal()`), available on any open element. Operating contract: `CLAUDE.md §23`.

## Consequences

**Positive:**
- High-value, non-redundant: critique adds the genuinely new UX/design dimension while leaning on Phase 1 for correctness.
- Zero new dependency or config; it composes Phase 1 + the existing system docs.
- Read-only keeps it safe and squarely advisory; acting on it is opt-in and routes through the existing, reversible lifecycle.

**Negative / costs:**
- One more Sandbox header button (now four: design check, critique, discard, approve) — still within reason; revisit grouping if more are added.
- A critique is an LLM judgment, not deterministic — its value varies with model and context. The design check remains the deterministic floor.

## Alternatives considered (rejected)

- **Separate `critique` + `audit` buttons.** Rejected: audit duplicates the design check + approval a11y checklist; two buttons crowd the header for little marginal coverage. Critique subsumes the technical pass.
- **Let critique create `PRODUCT.md`/`DESIGN.md`** (impeccable's default). Rejected: Loomling keeps its own context model (ADR 0020); the brief already lives in `system/*.md` + `project.json`.
- **Run impeccable's own detector inside the critique.** Rejected: it would re-introduce the source-scan false positives and a second, non-Loomling rule set. Reuse the Phase 1 design check instead.
- **Persist a critique snapshot** (impeccable writes `.impeccable/critique/`). Rejected: Loomling adds no writes for a read-only review; the chat report is the deliverable.
- **Auto-apply fixes from the critique.** Rejected: violates advisory-not-authority; fixes are an explicit, separate, reversible step (§14/§5).

## Files touched

- **Created:** `system/critique.md` (contract), `decisions/0022-critique-second-opinion.md` (this ADR).
- **Modified:** `library/sandbox.html` + `library/sandbox.js` ("Critique" button + modal, reusing `wirePromptModal()`); `CLAUDE.md` (new §23).

## Forward links

- **Phase 3** (ADR 0020): fold the loved copy rules into `system/voice.md`; the critique already evaluates copy against `voice.md`, so Phase 3 sharpens what the critique can flag.
- **Phase 4** (ADR 0020): the proactive trigger moments — a critique offered automatically before approval (§6), and its P0–P3 issues routed to the matching capability via the `fix` field (§22 config).
- A dedicated `audit` button if a stack (§10) later introduces perf/bundle/i18n concerns.
