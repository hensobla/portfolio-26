# ADR 0010 — `removed` status + Settings → Archive view

**Date:** 2026-05-25
**Status:** accepted

## Context

CLAUDE.md §11 originally said: *"Never delete entries. If the user removes a piece, flip its status to `draft` and add a note; deletion of catalog history loses too much."*

The intent — preserve catalog history — was correct, but the implementation conflicted with the §16 principle (the designer shouldn't have to think about backend mechanics). A "removed" element kept showing up as a `draft` tile in the Library page, mixed in with active in-progress work. The designer had no way to distinguish a piece that's *being built* from a piece that *used to exist*. The Eyebrow component (migrated to a typography role on 2026-05-22) was the trigger: its source files were deleted, but its `draft` tile lingered in the catalog with no visual cue.

## Decision

Introduce a third manifest status, `"removed"`, alongside `"draft"` and `"approved"`. When the user removes a piece:

1. The source folder (`src/<category>/<slug>/`) is deleted from disk.
2. The manifest entry's `status` is set to `"removed"`.
3. A new optional field `removedAt` (ISO date) is populated.
4. The `notes` field is updated to explain why (replacement, migration, deprecation).

The Library page filters `removed` entries out entirely. The Settings page gets a new **Archive** section that lists every removed entry with its name, slug, category, removal date, and notes — read-only, the catalog memory of what once was.

The Sandbox page rejects URLs for `removed` entries with a friendly message pointing at the Archive view.

## Consequences

- The designer's Library page is clean. Active drafts and approved elements; nothing else.
- Catalog history is fully preserved — the manifest is still the project's memory.
- Restoring a removed element means asking Claude Code to recreate the source files and flip the status back to `draft`. The Archive view doesn't have a one-click restore button; restoration is an authoring act and goes through the normal CC flow.
- One schema migration: existing manifests with `status: "draft"` entries that should have been `"removed"` (e.g. Eyebrow) need a one-time fix. ADR is forward-only; pre-existing data is fixed in the same commit.
- Future "where-used" scans (CLAUDE.md §15) should also skip `removed` entries — they have no source files to grep.

## Alternatives considered

- **Abide.** Leave §11 untouched, badge removed-but-still-draft entries with a label like "Removed (history)". Rejected: the catalog stays cluttered with dead tiles and the rule reads as a special-case workaround rather than a structural choice.
- **Amend (allow deletion).** Rewrite §11 so removed entries are deleted outright. Rejected: history loss is real and §11's original instinct was correct. The Eyebrow entry's `notes` field already captures useful migration context that a future contributor will want.
- **A new `archived` boolean field instead of a third status.** Rejected as redundant — `status` is the existing axis on which we sort entries, and the Library page already keys off it. A boolean would force every consumer to check two fields.

## Files touched in the same commit

- `.loomling/schema/manifest.schema.json` — add `"removed"` to status enum, add optional `removedAt`.
- `library/manifest.json` — Eyebrow entry: `status: "draft"` → `"removed"`, add `removedAt: "2026-05-22"`.
- `library/library.js` — filter `removed` from all sections.
- `library/sandbox.js` — special-case `removed` with a friendly error.
- `library/settings.html` + `library/settings.js` + `library/library.css` — Archive section.
- `CLAUDE.md` §11 — update the rule.
- `system/components.md` — document `removed`.
- `src/modules/homepage-hero/preview.html`, `src/templates/blog-post/preview.html` — drop the stale `<link>` to `eyebrow.css`.

## Forward links

- Approval flow (CLAUDE.md §6) is unaffected — `removed` entries can't be approved or unapproved; they're terminal until restored.
- Edit-from-approved lifecycle (§14) is unaffected — `removed` entries have no working files to edit.
- Future "restore from archive" UX (a CC-prompt button next to each archive row) is plausible but deliberately deferred until the need shows up.
