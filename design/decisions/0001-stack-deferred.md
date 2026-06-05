# 0001 — Stack deferred at project init

**Date:** seeded at template creation; replaced with init date by CC
**Status:** accepted
**Context:** Loomling is stack-agnostic by default. The init interview captures brand fundamentals (color, type, voice) but does not force a stack choice. A stack pick is binding — it shapes the file layout, build pipeline, and authoring contract — so it should be deferred until the project actually needs one.
**Decision:** `project.json.stack` defaults to `null`. CC re-asks the question the first time the user requests something that requires a framework (routing, data fetching, server-side rendering, package installation).
**Consequences:**
- Pre-stack work (Elements, tokens, design system docs) is fully usable without a stack pick.
- When the user finally picks a stack, CC scaffolds framework files alongside the existing vanilla pieces and runs a compatibility sweep to ensure prior work still renders correctly.
- Trade-off: framework-native conveniences (file-based routing, server components, hot reload) aren't available until the pick happens.

**Alternatives considered:**
- *Force a stack choice at init.* Rejected: pollutes the interview with a decision the user often hasn't made yet.
- *Auto-pick a default stack (e.g., Astro).* Rejected: silently embedding a stack contradicts the white-label thesis.
