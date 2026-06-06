# ADR 0025 — Adopt shape + extract as build moves; keep §4 as the build flow (craft not adopted)

**Date:** 2026-06-02
**Status:** accepted (implements Phase 5 of ADR 0020)

## Context

ADR 0020 Phase 5, the final roadmap phase: impeccable's build commands (`craft`, `shape`, `extract`). The user's verdicts: `shape` and `extract` **Love**; `craft` **Maybe** with the note *"we should keep Loomling's system but borrow any useful ideas from craft."* Loomling already has a strict authoring contract (§4: category → files → manifest → report) and a drift protocol (§5) — impeccable's `craft` would write features end-to-end around the manifest, which is exactly the discipline §4 exists to enforce.

## Decision

Adopt `shape` and `extract` as Loomling build moves, adapted to §4; do not adopt `craft` as-is. Documented in `system/build.md`, contracted in `CLAUDE.md §25`, with a pointer from §4.

1. **shape — optional plan-before-code pre-step to §4.** For a large or ambiguous request, CC runs a short discovery and confirms a one-paragraph brief before authoring. It produces a brief, not files; the build still follows §4 in full (including the §24 proactive pass). Skip it for simple atoms.

2. **extract — pull drift back into the system.** When a raw value or markup pattern recurs across elements, CC offers to extract it: a value → a new token (`src/tokens.css`, drift path B, §5) + a `system/*.md` note; a pattern → a new component appended to the manifest (§4c, §9). Engagement is **flag** (§24): surfaced, one-tap, never silent. It writes **into** the manifest and tokens, never a parallel store.

3. **craft — keep §4 as the build flow.** Loomling does not adopt `craft`. CC borrows its good ideas — shape-first and visual iteration (screenshot the preview, refine before reporting) — but never its write-around-the-manifest behavior.

## Consequences

**Positive:**
- `shape` formalizes a planning step for big/ambiguous work without changing how §4 builds.
- `extract` turns drift from a slow decay into a one-tap cleanup that stays inside the manifest+tokens model — it strengthens the system rather than routing around it.
- `craft`'s value (shaping, visual iteration) is captured without importing its manifest-bypassing behavior.

**Negative / costs:**
- `shape` and `extract` are CC behaviors, not enforced code; their value depends on CC actually offering them at the right time (same caveat as §24).
- `extract`'s "noticed drift" trigger is a judgment call; over-eager extraction would churn tokens. Mitigated by the §24 flag model (offered, not auto-applied) and the drift protocol (§5).

## Alternatives considered (rejected)

- **Adopt `craft` as-is** (impeccable builds the feature end-to-end). Rejected per the user and the architecture: it writes around the manifest, bypassing §4/§5/§9 — the exact discipline Loomling exists to keep. Borrow the ideas, not the flow.
- **Make `shape` mandatory** before every build. Rejected: overkill for a simple atom; §4's existing "ask if ambiguous" already covers the small case. `shape` is the optional heavier version for large/ambiguous work.
- **Let `extract` write to a separate patterns store.** Rejected: there is one source of truth (manifest + `src/tokens.css`); extraction writes there or not at all.
- **Drop `craft` entirely from the docs.** Rejected: recording *why* it's not adopted (and what is borrowed) is the valuable part, so future sessions don't re-propose it.

## Files touched

- **Created:** `system/build.md` (the build moves), `decisions/0025-build-moves-shape-extract.md` (this ADR).
- **Modified:** `CLAUDE.md` (new §25 + a `shape` pointer in §4).
- **Reused, not changed:** §4 authoring contract, §5 drift protocol, §9 manifest rules, §24 proactive model.

## Forward links

- This completes ADR 0020's phased roadmap (Phases 1–5). Remaining roadmap items are the **deferred em-dash sweep** and the **explicitly-skipped** pieces (PRODUCT/DESIGN ownership, `/document`, palette seeder, `/typeset`, `live` mode), to be revisited only against a concrete need (e.g. a declared stack, §10).
- If a stack is declared (§10), revisit whether a fuller `craft`-style end-to-end flow earns its place inside §4 (it does not today).
