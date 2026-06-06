# ADR 0024 — Proactive capabilities: editing moves that fire on their own, balanced by taste-authority

**Date:** 2026-06-02
**Status:** accepted (implements Phase 4 of ADR 0020)

## Context

ADR 0020 Phase 4: impeccable's editing commands are useful only if they get *used*, and the user's clearest reservation was the learning curve — *"an entirely new language… a little steep,"* *"I usually just use the CC desktop app, I don't run commands."* A capability the user must name will never fire. The roadmap's answer was **proactive invocation**: CC brings the right move to bear on its own at lifecycle moments.

The hard constraint is the opposite principle, equally from the notes: *"we can't have users' preferences being overwritten,"* *"leverage the users' taste as the highest authority."* So proactivity must never become silent taste-override.

Phases 1–3 built the substrate: the design check (§22) is the deterministic signal and its `fix` field is a routing table; the critique (§23) is the UX signal; `voice.md` (Phase 3) governs copy. Phase 4 connects signals to moves.

User decisions for this build: **CC-behavior only** (no new Loom UI — the Loom is static and the value is CC volunteering in-session), and **full coverage** (document every one of the 13 editing capabilities).

## Decision

Encode a **proactive capability layer** as CC behavior — a model, a routing table, and a per-capability catalog — wired into the existing lifecycle. The 13 capabilities: bolder, quieter, distill, polish, harden, clarify, adapt, optimize, colorize, layout, animate, delight, overdrive (typeset skipped, onboard deferred — ADR 0020).

**1. Three engagement levels.**
- **flag** (correctness): CC raises it unprompted and fixes on one-tap consent — `harden`, `adapt`, `clarify`, plus §22 correctness findings (contrast, heading skips, overflow, tiny-text, broken-image, em-dash).
- **suggest** (taste): CC offers one line; declining is free — `polish`, `quieter`, `distill`, `layout`, `colorize`, `bolder`, `delight`, `animate`.
- **on-request** (never proactive): `overdrive` (high-risk), `optimize` (stack-dependent).

**2. Nothing visible is applied silently.** The only silent automation remains §16's invisible structural correctness (heading tag, `alt=""`, `rel`, landmarks), which predates this. Every flag fix and every suggestion needs consent; every edit to an `approved` element runs the §14 snapshot lifecycle, so it is one-step reversible.

**3. Trigger moments, not constant watching.** Authoring (§4) → run §22, flag/suggest from findings. Approval (§6) → §22 check + offered §23 critique + routed fixes before the flip. Publish/composition (§16) → `harden`/`adapt` run as part of "correct by publish time."

**4. Routing comes from the existing config.** The `fix` field in `.loomling/design-check.json` (Phase 1) is the finding→capability table; `system/capabilities.md` documents the moves and the contract, and does not duplicate the table.

**5. Anti-nag is a hard rule.** One line, ≤2 per element, never re-surface a declined suggestion in the same session, only at trigger moments. Nagging would itself violate taste-authority.

**6. Capabilities run impeccable's playbook when present, else the equivalent — always through Loomling's rules** (tokens-only, §5 drift, §14 snapshots). No capability gets a bypass.

`system/capabilities.md` is the catalog; `CLAUDE.md §24` is the operating contract; §4/§6/§16 carry pointers.

## Consequences

**Positive:**
- The capabilities now get used by default, addressing the learning-curve verdict head-on, without a single new command to learn.
- Taste-authority is preserved structurally: visible changes need consent, taste is only suggested, everything is reversible.
- Zero new dependency, zero new UI, zero new config — it composes Phases 1–3 and the existing lifecycle.

**Negative / costs:**
- This is the most behavior-heavy phase: its value depends on CC actually honoring the triggers and the anti-nag rules in practice. The rules are written to be unambiguous, but they are prose CC follows, not code that enforces.
- The flag/suggest classification is a judgment call per capability; a few (clarify, adapt) sit near the correctness/taste line. Recorded here so it can be revisited deliberately.
- `optimize`/`overdrive` are largely inert until a stack exists (§10) — documented as on-request rather than dropped, so the catalog is complete.

## Alternatives considered (rejected)

- **Silent auto-apply of taste moves.** Rejected outright: violates "taste is the highest authority." Only invisible structural correctness (§16) stays silent.
- **A Loom UI "suggested actions" panel.** Considered and rejected for this build (user chose CC-behavior only): the Loom is static, and the value is CC volunteering in-session, not another surface to maintain. Can revisit later.
- **Expose the capabilities as named slash commands.** Rejected: that is exactly the "new language" the user pushed back on. Proactive-by-default is the whole point; naming stays optional, never required.
- **No anti-nag limit.** Rejected: unbounded suggestions read as the system overriding the designer, the opposite of the goal.
- **Re-document the build/evaluate commands here.** Rejected: out of scope (ADR 0020 covers them); this catalog is editing capabilities only.

## Files touched

- **Created:** `system/capabilities.md` (catalog), `decisions/0024-proactive-capabilities.md` (this ADR).
- **Modified:** `CLAUDE.md` (new §24 + proactive pointers in §4, §6, §16); `.loomling/prompts/approval-checklist.md` (route findings to capabilities at approval).
- **Reused, not changed:** `.loomling/design-check.json` `fix` field (the routing table, Phase 1); `system/voice.md` (clarify's rules, Phase 3); `system/critique.md` (§23 signal, Phase 2).

## Forward links

- **Phase 5** (ADR 0020): the build commands (`shape`/`extract`) — `shape` as an optional plan-before-code pre-step to §4, where these capabilities already fire.
- If a Loom "suggested actions" surface is ever wanted, it would render the same routing this phase encodes — the model is UI-agnostic.
- The flag/suggest split and the anti-nag thresholds are the most likely things to tune once the proactive behavior is exercised on real elements.
- `optimize`/`overdrive`/`animate` gain real proactive relevance only if a stack (§10) or a richer motion need lands; revisit then.
