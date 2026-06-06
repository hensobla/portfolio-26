# 0006 — Edit-from-approved snapshot + Sandbox Revert

**Date:** 2026-05-20
**Status:** accepted
**Context:** Loomling's status model has two values: `draft` (Sandbox) and `approved` (sanctioned for use). Until this ADR, the lifecycle of editing an already-approved element was undefined — CC would just edit the files in place, leaving no way to recover the previously-shipped version. The user articulated the lifecycle they wanted: *"Published elements can be edited. When they are edited, the published version should remain published in the backend. However, in the Loom, it goes back to the Sandbox. Add new option in the Sandbox at this point: 'Revert' — show the user the old version and include a copy/paste prompt for CC to ignore the changes made and put the element back to its original, published form."*

**Decision:** Introduce a filesystem-level snapshot convention and a Sandbox UI to use it.

### Snapshot convention

When CC is asked to edit an element whose current status is `approved`:

1. Copy every file in `src/<category>/<slug>/` to a new subfolder `src/<category>/<slug>/_approved/` before making any edit.
2. Flip the manifest entry's `status` from `approved` to `draft`. Append a one-line note to `notes`: `Reverted to draft from approved on <YYYY-MM-DD>; snapshot at _approved/.`
3. Make the requested edit to the files in the slug folder. `_approved/` remains untouched.
4. Inform the user the element regressed to Sandbox, the snapshot exists, and the Sandbox surfaces a Revert affordance.

Editing the `_approved/` folder directly is forbidden — it's the literal archive of the previously-published state.

### Sandbox UI

When the Sandbox loads an entry, it probes `_approved/preview.html` next to the entry's `previewPath`. If the probe succeeds:

- A **snapshot chip** appears in the Anatomy/meta row: *"● edited from approved · snapshot at `_approved/`"*.
- A **Version toolbar group** appears alongside State and Breakpoint: pills `[Draft]` and `[Approved]`. Draft loads the working preview.html (current files); Approved loads `_approved/preview.html` (the snapshot). State and Breakpoint pills continue to work in both versions.
- A **"Revert to approved…" button** sits next to the Version pills. Clicking it opens a modal containing a copy-pasteable CC prompt — the user pastes it into a fresh CC turn to actually perform the revert.

If the probe fails (404 or network error), all three affordances stay hidden — the Sandbox looks exactly as before.

### Revert (executed by CC)

When the user pastes the Sandbox-generated prompt into a CC turn, CC follows `CLAUDE.md §14`:

1. Copy files from `_approved/` back to the slug folder, overwriting.
2. Flip the manifest status back to `approved`; remove the "Reverted to draft..." note.
3. Delete `_approved/` — the working files ARE the approved state again.
4. Run the where-used scan from ADR 0005 / `CLAUDE.md §15` (a revert overwrites files; downstream consumers may need re-checking).
5. Report the file paths restored.

If the user **re-approves the edited element** (instead of reverting), the snapshot is also deleted as part of the standard approval flow (`CLAUDE.md §6` step 5) — the new state IS the new approved version.

**Consequences:**

- **Lifecycle is now explicit.** Editing an approved element has well-defined before/after states, with a recovery path.
- **Snapshot is filesystem-visible.** `ls src/<category>/<slug>/` shows `_approved/` when one exists. The user can inspect, copy, or even hand-revert without CC if they want.
- **Schema impact: zero.** Snapshot existence is signaled by the filesystem, not a manifest field. The Sandbox detects via a single fetch probe. This keeps the manifest schema small.
- **`_approved/` is treated as opaque** by the Sandbox's regular slot rendering — the global image-placeholder rule from `src/tokens.css` still applies inside the snapshot iframe because it reads from the same `<link rel="stylesheet" href="../../../src/tokens.css">` chain. The snapshot is a frozen self-contained replica.
- **Revert is CC-mediated, not in-browser.** Matches ADR 0003's principle — the Loom is read-only; CC is the only writer.
- **Approval implicitly discards the snapshot.** This makes intent clear: once the user is happy enough with the edits to re-approve, the previous version is no longer needed.
- **One snapshot per element, not many.** No history beyond the most recent approved version. Sufficient for the design-system-discipline use case; deeper history is what git is for (still pending `git init`).

**Alternatives considered:**

- **`.approved/` (dotfile prefix) instead of `_approved/`.** Rejected: some static servers and tooling filter dotfiles by default; `ls` requires `-a` to see them. The underscore prefix is universally visible and works with every static server.
- **Track snapshot existence in the manifest** (`hasApprovedSnapshot: true`). Rejected: introduces schema surface and a second source of truth that can drift from filesystem reality. The fetch probe is cheap (one request per Sandbox load) and authoritative.
- **Multiple snapshots / history folder** (`_approved/v1/`, `_approved/v2/`). Rejected for v1: speculative. Once `git init` happens, deeper history lives in commits, not in our snapshot folder.
- **Snapshot the entire project at approval time.** Rejected: enormous storage, irrelevant scope. The discipline is per-element.
- **In-browser revert without CC** (the Loom restores files directly). Rejected: the Loom doesn't write to disk (ADR 0003). Routing through CC preserves the audit trail and the system-rule application opportunities (where-used scan, etc.).
- **Diff view in the Sandbox** showing the approved-vs-draft delta inline. Rejected for v1 scope: the Version pill toggle already lets the user A/B between renderings, and a real diff view requires either DOM-diffing or file-content diffing. Worth revisiting if the user reports the pill toggle isn't enough.
- **Auto-revert when the user navigates away without re-approving.** Rejected: dangerous. The user might want to keep iterating across sessions.

**Follow-up work this enables:**

- **Approval-time visual confirmation** — could be added: "Approve" might first show the approved-vs-draft diff so the user knows what they're sanctioning.
- **Multi-version snapshot history** — once `git init` happens, the entire ADR could be re-thought in terms of git tags or branches per approval state.
- **Cross-element snapshots for composed templates** — when a composed template is edited (e.g., the user re-runs the Builder and overwrites), the same snapshot mechanism applies, with the additional consideration that `composition.json` and the rendering scripts both get snapshotted.
