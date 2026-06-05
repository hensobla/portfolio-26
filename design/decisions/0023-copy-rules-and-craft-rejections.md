# ADR 0023 — Fold impeccable's copy rules into voice.md; record the craft rejections

**Date:** 2026-06-02
**Status:** accepted (implements Phase 3 of ADR 0020)

## Context

ADR 0020 Phase 3: fold the parts of impeccable's rulebook the user loved into `system/*.md` as advisory guidance, and record the parts they explicitly rejected. From the evaluation notes:

- **rulebook-copy (Love):** *"love the copy rules"* — but the AI-slop-test is *"mid"* (simple ≠ bad), and Loomling's own em-dashes *"need to be removed… only em-dashes that are truly value-adding should stay (1%)."*
- **rulebook-craft (Love, with carve-outs):** *"don't move to OKLCH; while it might be 'better' it's not widely used and not designer friendly… motion [is] already worked out without this… typography is fine as guidelines but seems kinda strict."*
- **rulebook-bans (Maybe):** *"okay as default bans, but we must leverage the users' taste as the highest authority."*

`system/voice.md` already encodes much of impeccable's copy discipline (active voice, specific-over-abstract, verb+object buttons, no "seamless/delight/magical"). The gap was the buzzword family, link text, em-dashes, and aphoristic cadence.

The recurring constraint: the rejections are as important as the additions, and everything stays advisory (the drift protocol, §5, already makes `system/*.md` rules overridable).

## Decision

**1. Merge the loved copy rules into `system/voice.md`** (advisory by default, like every voice rule):
- **Marketing buzzwords** banned (the streamline / supercharge / world-class / next-generation / enterprise-grade family), folded into the existing cliché line.
- **Link text needs standalone meaning** ("View pricing plans", not "Click here"), added to label conventions next to the verb+object button rule.
- **No em-dashes in user-facing copy** — commas/colons/periods/parentheses instead; keep only the rare (~1%) that earns its place. Cross-referenced to the design check's `em-dash-overuse` rule (§22).
- **No aphoristic cadence** ("Not a feature. A platform." repeated as voice).

**2. Scope the em-dash rule to user-facing copy, and defer the internal sweep.** `voice.md` governs the product's voice (copy in components/modules/templates), not Loomling's own documentation. The rule applies there now. The repo-wide sweep of em-dashes in `CLAUDE.md`, `system/*.md`, and `tokens.css` comments remains a **separate, deferred task** (per the user and ADR 0020), not part of this change.

**3. Record the craft rejections by NOT changing those files.** Leaving `system/color.md`, `system/typography.md`, and `system/motion.md` untouched IS the decision:
- **No OKLCH migration.** Loomling stays HSL (color.md); OKLCH is "better" in theory but not designer-friendly. impeccable's OKLCH discipline is not adopted.
- **Typography not tightened.** The existing type scale / measure / weight rules stay as guidelines; impeccable's stricter thresholds are not imported.
- **Motion unchanged.** Loomling's motion system (motion.md, §20) is considered solved; impeccable's motion rules add nothing here.

**4. The AI-slop-test is advisory only, not a gate.** It already lives that way: the design check (§22) enforces a Moderate, reader-impact subset; the broader "could someone tell AI made this" judgment informs critique (§23) but never blocks. No new rule added.

**5. Absolute bans are advisory defaults, not hard rules.** They live as the enabled tells in `.loomling/design-check.json` (§22), overridable by editing that file — not as new hard rules in `voice.md` or elsewhere. "User taste is the highest authority" (ADR 0020).

## Consequences

**Positive:**
- The copy rules the user valued are now part of the voice CC writes by default, and the critique (§23) can flag them against `voice.md`.
- The rejections are on the record, so future sessions don't re-propose OKLCH, tighter typography, or motion changes.
- Minimal footprint: one doc edit + this ADR. No code, no config, no UI.

**Negative / costs:**
- `voice.md` now contains a rule (no em-dashes) that Loomling's own internal docs visibly violate. Called out inline as a scoped, deferred cleanup so the contradiction is explicit, not silent.

## Alternatives considered (rejected)

- **Adopt impeccable's color/typography/motion rules too.** Rejected per the user: no OKLCH (not designer-friendly), typography already "fine" and impeccable's is "too strict," motion already solved. Importing them would churn the system for no gain.
- **Apply the em-dash rule repo-wide now** (including internal docs). Rejected: large blast radius across `CLAUDE.md` and every `system/*.md`; kept as a separate deferred task so this phase stays a clean voice merge.
- **Encode the absolute bans as hard rules.** Rejected: they're advisory defaults in the design-check config; making them hard would violate taste-is-authority.
- **Make the AI-slop-test a gate.** Rejected: "mid" per the user, and gating contradicts the advisory model (§5).

## Files touched

- **Modified:** `system/voice.md` — added link-text rule; expanded the "Do not" section with the buzzword family, the em-dash rule (scoped + deferred-sweep note), and the aphoristic-cadence rule.
- **Created:** `decisions/0023-copy-rules-and-craft-rejections.md` (this ADR).
- **Deliberately unchanged (the rejection is the decision):** `system/color.md`, `system/typography.md`, `system/motion.md`.

## Forward links

- **Deferred separate task:** the repo-wide em-dash sweep (internal docs + `tokens.css` comments), keeping only the ~1% value-adding, per the user.
- **Phase 4** (ADR 0020): proactive routing — a `marketing-buzzword` / `em-dash-overuse` finding from the design check (§22) suggests the `clarify` capability at the §4/§6 trigger moments.
- If a stack is later declared (§10) and brings a real need, revisit OKLCH / typography strictness — but only against a concrete requirement, not theory.
