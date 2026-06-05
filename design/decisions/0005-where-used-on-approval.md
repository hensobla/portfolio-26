# 0005 — Where-used scan on approval

**Date:** 2026-05-20
**Status:** accepted
**Context:** Loomling's premise is that reusable elements (components, modules) propagate their changes to every consumer. ADR 0004 made HTML propagation work for composed templates by switching to declarative composition; CSS already propagated via shared `<link>` tags. With propagation working, a new question emerges: when the user approves a change to a reusable element, **how do they know what else to QA?** Today, nothing surfaces the downstream impact. A button restyle could affect a dozen modules and templates with no signal that they need re-checking.

The user articulated the principle: *"When a change is approved (draft → approved), the system should flag everywhere that the element is used. The user can copy/paste this into CC to help QA the changes (or they can ignore and hope it's all fine if they like)."*

**Decision:** On every `draft → approved` transition (and on every revert that overwrites files — see ADR 0006), CC runs a where-used scan and surfaces a copy-pasteable QA prompt naming every other element that references the changed one. The user is free to paste it into a fresh CC turn or to ignore it; the report is informational, not blocking.

The scan procedure lives in `CLAUDE.md §15`. The category-by-category logic:

- **Component approved** → grep modules and templates for `data-loom="<slug>"`.
- **Module approved** → grep hand-written templates for `data-loom-module="<slug>"`; read every composed template's `composition.json` for matching `modules[].moduleSlug`.
- **Template approved** → no downstream; skip.

Output is a single Markdown block at the end of the approval response, listing each consumer with its path and including a ready-to-paste prompt for the user.

**Consequences:**

- **Zero schema impact.** The scan is a procedural step CC runs; the manifest gains nothing new. Composed templates already record their module references in `composition.json` (ADR 0004), which is what made template-side scanning a one-line filter instead of a content-parsing exercise.
- **Zero Loom-UI surface change.** The report appears in CC's chat output, not in the Loom. (A future improvement could be a "Where used" panel on each Sandbox entry — out of scope here.)
- **Best-effort scope.** The scan covers the current project state; it doesn't know about post-stack framework wrappers or future consumers. Post-stack, this scan should evolve to read the framework's import graph.
- **User chooses whether to act.** The report is a QA aid, not an enforced gate. Matches the rest of Loomling's "system surfaces, user decides" philosophy.
- **Revert events also trigger the scan.** A revert literally changes files; downstream may be affected. The same procedure runs.

**Alternatives considered:**

- **Manifest-stored explicit consumer lists per element.** Each manifest entry could carry a `usedBy: [...]` array, updated whenever something starts/stops referencing it. Rejected: requires bookkeeping discipline (every edit to a consumer must update its target's `usedBy` list), and the source of truth is already the code — grepping is more honest.
- **Real-time Loom UI badges showing usage.** Every Sandbox view would have a "Where used" count. Rejected for v1 because it adds a Loom code change for what is fundamentally a CC-procedure improvement. Could be added later as a non-breaking enhancement.
- **Auto-run the QA prompt instead of just outputting it.** CC could immediately follow the approval by checking every consumer. Rejected: the user explicitly wanted the option to ignore. Auto-running spends tokens and time on something the user may not care about for a given change. The opt-in model respects their attention.
- **Run the scan continuously (e.g., on every save).** Rejected: noisy. Approval is the natural checkpoint — that's when the user has decided "this is the new shape" and downstream verification matters.

**Follow-up work this enables:**

- **Loom-side "Where used" panel.** Sandbox could pre-compute the consumer list on page load and show it as a sidebar. Non-trivial JS but conceptually small.
- **Stable approval-time impact reports.** Future tooling could diff the element's pre-approval and post-approval state and include a delta summary alongside the consumer list.
- **Post-stack reuse.** Once the project declares a stack, the scan procedure should also walk the framework's import graph (e.g., grep for `<ButtonPrimary` in JSX files).
