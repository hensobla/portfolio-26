# Decisions

This file is an **index**. The actual decisions live as individual MDs in `decisions/`, one per decision, named `NNNN-slug.md` where `NNNN` is a zero-padded sequence.

## Why a folder of ADRs (not a single decisions.md)

- CC can append a new decision without re-reading the entire history.
- Each decision stays small and focused.
- Git diff per decision is meaningful.

## When to write an ADR

CC writes an ADR when:

- A drift conversation results in **(C) amend the rule** (a substantive system change).
- A stack is declared.
- A foundational choice is made that future-CC needs to know about (font choices, color scale strategy, scoping conventions).

Trivial token additions (extending a color step) **do not** need an ADR. The rule MD edit is sufficient audit trail.

## ADR template

```markdown
# NNNN — Short title

**Date:** YYYY-MM-DD
**Status:** accepted | superseded by NNNN
**Context:** what triggered this decision, in 1–3 sentences
**Decision:** the choice made, in 1 sentence
**Consequences:** what this enables, what it forecloses

Optional sections: alternatives considered, references.
```

## Superseding

Past ADRs are never edited (except to update `Status:` to `superseded by NNNN`). To change a past decision, write a new ADR that supersedes it.

## Current index

> CC appends entries here as ADRs are written.

- (none yet)
