# Critique (advisory second opinion)

A **critique** is a read-only design review of a single element — a second pair of eyes that scores hierarchy, information architecture, cognitive load, copy/voice, states, and edge cases, and surfaces prioritized issues. It is the Loomling-native adaptation of impeccable's `critique` playbook (ADR 0020 → 0022), and it is the deeper companion to the deterministic design check (`system/design-check.md`, §22).

Like the design check, it is **advisory**. It produces a report; it never edits files and never blocks. The designer's taste is the highest authority.

## Two rules that keep it Loomling-native

1. **Use Loomling's own context — never write `PRODUCT.md` / `DESIGN.md`.** impeccable's critique normally demands those files. In Loomling, the brief already exists: `system/voice.md` (voice + audience), the `system/*.md` design rules, and `project.json` (name, purpose). CC reads those instead. It must **not** create a `PRODUCT.md` or `DESIGN.md` — Loomling keeps its own source of truth (ADR 0020).

2. **Reuse the design check as the deterministic pass — don't run a second linter.** A critique weaves a subjective design review with a deterministic pass. That deterministic pass IS the Phase 1 design check (`.loomling/design-check.json`, Moderate, rendered altitude, §22), not a separate impeccable detector run. One rule set, two depths.

## What it covers (and why there's no separate "audit")

The critique folds in the technical dimension, so Loomling does not ship a separate `audit` button:

- **Correctness** (contrast, heading order, overflow, image discipline) is already covered by the design check + the approval accessibility checklist (`system/accessibility.md`).
- **Design/UX** (hierarchy, IA, cognitive load, emotional fit, copy against `system/voice.md`, persona red flags) is the genuinely new value the critique adds.

A dedicated audit pass can be added later if a declared stack (§10) introduces performance / bundle / i18n concerns the static project doesn't have yet.

## Output

A report **in chat** — never a file. Roughly:

- A short Nielsen-heuristics table, scoring only what applies (a single element legitimately leaves many `n/a`).
- An "is this on-brand / could someone tell AI made it" verdict.
- 3–5 priority issues tagged **P0–P3**, each with *what / why it matters / a concrete fix*.
- Persona red flags where relevant.

No snapshot is persisted (impeccable writes a `.impeccable/critique/` archive; Loomling does not — no writes at all).

## Acting on a critique

The report is the deliverable. If the designer wants to act on a finding, that is a separate, explicit step: the fix runs through the normal edit lifecycle — snapshot the approved state (`CLAUDE.md §14`), apply via the drift protocol (`§5`), tokens-only. The critique itself never edits.

## When it runs

On demand from the Sandbox: the **"Critique"** button produces a paste-ready prompt (same pattern as the design check / Approve / Discard), available on any open element. See `CLAUDE.md §23` for the operating contract and ADR 0022 for the rationale.
