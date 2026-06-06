# Voice

> **Status:** Awaiting init. The three adjectives you provided in the interview will anchor the principles below. Until then, the framework rules apply.

## Three adjectives

> Filled by the init interview.

These three words define the project's tone. Every piece of copy CC writes should pass the test: *"Does this sound [adjective 1], [adjective 2], and [adjective 3]?"* If not, rewrite.

## Universal rules

- **Active voice over passive.** "We ship on Friday." not "Releases are shipped on Friday."
- **Specific over abstract.** "Drops Friday at 10am PT." not "Coming soon."
- **One idea per sentence** unless conjunction is doing real work.
- **No filler** ("Please note that", "It is important to mention").

## Label conventions

- Button labels: verb + object. ("Save changes", not "Save".)
- Link text: standalone meaning. ("View pricing plans", not "Click here" — screen readers announce links out of context.)
- Form labels: noun phrases. ("Email address", not "Enter your email".)
- Error messages: state what went wrong + what to do. ("Email address required. Add one to continue.")
- Empty states: tell the user what they're looking at + how to populate it. ("No components yet. Ask CC to build one.")

## Do not

- Use marketing buzzwords: the streamline / empower / supercharge / leverage / unleash / transform / seamless / world-class / enterprise-grade / next-generation / cutting-edge / game-changer / mission-critical family, or interface clichés like "delight" and "magical." Name a specific noun and a verb that says what the thing actually does.
- Use em-dashes in user-facing copy. Reach for commas, colons, periods, or parentheses instead. Keep only the rare em-dash that genuinely earns its place (roughly one in a hundred). The design check flags em-dash overuse (§22). *Scope: this governs user-facing copy only — Loomling's own internal docs still use em-dashes; cleaning those up is a separate, deferred task.*
- Fall into aphoristic cadence — "serious statement, then a short rebuttal" ("Not a feature. A platform.") as the recurring voice. Once is fine; if three or more copy blocks land on that shape, rewrite. Be specific, not aphoristic.
- Apologize for system limitations the user can't act on.
- Use exclamation points outside genuine celebration.
- Write more than two sentences for tooltip copy.

## Drift behavior

- Voice changes start as ADRs. A change in tone is a design decision, not a token swap.
