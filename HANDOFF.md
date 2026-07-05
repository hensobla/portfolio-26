# Handoff — Case-study module kit (draft, unshipped)

**Updated:** 2026-07-05
**Branch:** `feat/case-study-modules` (cut from `main` this session, unpushed)
**Session length:** one long session — plan → build → verify → compositional pass → revert → layout analysis → docs cleanup

> Prior handoff content (folder-hover engulf + name-star morph, 2026-07-04) has been replaced. That work is durable — landed on `main` at commit `50a4a6e`. This session cut a new branch off `main` and worked on a separate concern: case-study section modules.

## Current goal

Build a set of reusable case-study section modules in the Loomling design workspace (`design/`) so that a future case-study template can compose them into scrollable pages. This session drafted **8 core modules** and lined up **4 more** as planned. No case-study template yet — that's a next phase.

## State right now

Working tree has 8 new module directories under `design/src/modules/` + 8 entries appended to `design/library/manifest.json` + 1 planning file + the moved `module-inspo/` folder. **Nothing committed.**

The Loom preview server (`http://localhost:8765/library/`) shows all 8 modules on the Drafts page with their state pills; every declared state renders without console errors; dark mode flips cleanly.

**Visual polish is the open thread.** The 8 modules ship as "basic" grid layouts — centered content, symmetric column spans, safe compositions. The user's exact feedback was: **"great basics but they aren't very visually interesting."** A bolder compositional pass was attempted (asymmetric splits, marginalia labels, broken figure-grid mosaic, giant accent quote glyph, overlay FIG chips on frames, huge stat-row values with vertical accent rules, spec-sheet as a 3-col card block) and **reverted at user request**. The current state on disk is the pre-pass basics. Don't reapply that pass automatically — see § Approaches that didn't work.

## What was done this session

- **Cut branch** `feat/case-study-modules` from `main`.
- **Authored 8 modules** under `design/src/modules/`, each with `<slug>.html`, `<slug>.css`, and `preview.html` (plus `prototype-frame.js` for click-to-load):
  - Text: `prose-section`, `case-study-hero`, `pull-quote`
  - Image: `full-bleed-figure`, `figure-grid` (2×2 default, 3-up variant)
  - Prototype: `prototype-frame` (16:9, click-to-load iframe/video, sandbox-hardened)
  - Data: `spec-sheet` (up to 6 rows), `stat-row` (up to 4 cells)
- **Registered all 8** in `design/library/manifest.json` (appended, no reorders — per `design/CLAUDE.md §9`). Each entry has slots, states, headings where applicable, and tags.
- **Verified in Loom** — clicked through each state on each module card. Checked figure-grid `three-up` (fig-4 hides), spec-sheet `minimal` (rows 4–6 collapse via `:has(:empty)`), stat-row `two-up`, prototype-frame `loaded` (iframe swap + click-to-load flow both work). Dark mode flip verified.
- **Attempted compositional pass** (asymmetric grids, marginalia labels, mosaic figure-grid, accent glyph decorations, corner FIG overlays, huge stat values, 3-col spec-sheet card grid). User asked to undo. **All files restored to the pre-pass basics.**
- **Layout research** — analyzed 33 screenshots the user added to `module-inspo/`. Extracted 12 recurring structural patterns. Identified 4 planned modules (feature-card-grid, corner-labeled-field, horizontal-timeline, metric-list) grounded in that analysis.
- **Established a planning file** at [design/notes/case-study-modules.md](design/notes/case-study-modules.md). Iterated on file location: made top-level `design/MODULES.md`, then `design/src/modules/README.md`, both deleted after realizing they duplicated the manifest. Consolidated to the single `notes/` file, which covers only what manifest can't (planned modules, composition order, layout research, open questions).
- **Moved `module-inspo/`** from project root to `design/notes/module-inspo/` — colocating the source screenshots with the notes file that analyzes them.

## Key decisions and why

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Branch name `feat/case-study-modules` | Feature branch, mainline-shipping intent; matches earlier `feat/*` prefix. | `play/*` (matches recent `play/stretch-physics` but this ships), `design/*` (would signal design-only, but the goal is publish-to-src later). |
| Ship as `draft`, not `approved` | Approval requires the full checklist in `design/system/modules.md`, including where-used scan. No case-study template exists yet, so where-used would be empty. Approval is the *next* pass once a template consumes them. | Approving now would be ceremony without value. |
| Design fresh, don't touch `design/src/templates/home/*` | Home template has inline case-study panel markup (bespoke, tuned). User explicitly asked to leave it alone in this pass. Modules were designed standalone. | Extracting from home directly (rejected — user wants the freedom to refactor home later, on its own timeline). |
| Zero new components | 45 approved primitives already cover the reuse surface. Chips in `case-study-hero` styled inline (not via `data-loom="tag"`) to keep modules self-contained. | Extracting a `figure-caption` atom (the FIG. NN glyph appears in 3 modules — full-bleed-figure, figure-grid, prototype-frame — but the user's `feedback: no ADRs until finalized` rule says wait). Flag when a 4th consumer needs it. |
| Bounded-count slots (not dynamic lists) | Page Builder inspector limitations (per `design/CLAUDE.md §5`) — dynamic-count is a real drift. Matches how `footer` handles its 3 columns. | Dynamic-count `<figure>` list in `figure-grid` (rejected — Builder friction). |
| Planning file lives at `design/notes/`, not top-level | Top-level `design/` already has 5 markdown files and 3 HTML files. User raised bloat concern. `notes/` is a lightweight subdir that fits the existing convention (system/ = rules, decisions/ = ADRs, notes/ = iteration thinking). | Top-level `design/MODULES.md` (bloat), `design/src/modules/README.md` (duplicated manifest, drift risk). |
| Notes file references manifest as source of truth | `design/CLAUDE.md §3` already directs AIs to `library/manifest.json` for "what exists". Duplicating the built-modules list in a MD would create drift risk with zero information gain. | Full modules index in MD (rejected as drift-prone). |
| `module-inspo/` moved into `design/notes/` | Colocates the source screenshots with the notes file analyzing them. Cleans project root. | Leaving at project root (rejected — the notes file references it repeatedly). |

## Approaches that didn't work

- **Compositional pass on all 8 modules** — asymmetric hero split, marginalia eyebrow in prose-section, broken figure-grid mosaic (`grid-template-areas: "a a b" / "c d b"`), giant accent-blue quote glyph, corner FIG chip overlays on image frames, huge stat-row values with vertical accent rules, spec-sheet as a 3-column card block with header on left rail. User's exact response: **"undo those changes."** All CSS/HTML/preview files were restored to the pre-pass basics. The manifest entries were also reverted (num slots on figure modules, eyebrow slot on spec-sheet were removed). Do NOT re-apply this pass automatically. If the user asks for "more visual interest" again, ask what direction they want first.
- **Top-level `design/MODULES.md`** — created it, user flagged file bloat at design root. Deleted.
- **`design/src/modules/README.md`** — created it as a replacement, then realized it duplicated `library/manifest.json` (the canonical source of truth per `design/CLAUDE.md §3`). Deleted.

## Files touched

- **Created:** 8 module directories under `design/src/modules/` — `case-study-hero/`, `prose-section/`, `pull-quote/`, `full-bleed-figure/`, `figure-grid/`, `spec-sheet/`, `stat-row/`, `prototype-frame/`. Each has `<slug>.html`, `<slug>.css`, `preview.html`. `prototype-frame/` also has `prototype-frame.js`.
- **Created:** [design/notes/case-study-modules.md](design/notes/case-study-modules.md) — planning surface (planned modules, composition order, layout patterns, open questions).
- **Modified:** [design/library/manifest.json](design/library/manifest.json) — appended 8 new module entries at end of `entries[]`. JSON validates.
- **Moved:** `module-inspo/` (project root) → `design/notes/module-inspo/` — 33 reference screenshots.
- **Referenced (not modified):** [design/src/modules/navigation/](design/src/modules/navigation/) and [design/src/modules/footer/](design/src/modules/footer/) — pattern references for HTML/CSS/preview.html conventions. [design/src/templates/home/home.html](design/src/templates/home/home.html) and [home.css](design/src/templates/home/home.css) — visual-vocabulary reference (FIG. glyph, blueprint wash, play disc, dl.home__specs) — **intentionally not touched**.

## Git state

```
On branch feat/case-study-modules
Changes not staged for commit:
	modified:   HANDOFF.md
	modified:   design/library/manifest.json

Untracked files:
	design/notes/
	design/src/modules/case-study-hero/
	design/src/modules/figure-grid/
	design/src/modules/full-bleed-figure/
	design/src/modules/prose-section/
	design/src/modules/prototype-frame/
	design/src/modules/pull-quote/
	design/src/modules/spec-sheet/
	design/src/modules/stat-row/
```

`git diff --stat`: manifest.json +216 lines. HANDOFF.md is being written now.

The branch is unpushed. `feat/case-study-modules` doesn't exist on `origin` yet.

## Immediate next steps

1. **Confirm direction on visual polish before committing.** The 8 modules are the "safe" basics. User's feedback was that they aren't visually interesting enough. My compositional pass was rejected. Ask the user what direction they actually want (specific patterns from `design/notes/module-inspo/`? Softer polish only? Ship as-is and increase interest via a case-study template's composition instead of at the module level?) before making more edits.
2. **Group commits topically.** When commits are wanted: one commit per module wave (or one per module), the manifest append as its own commit, the notes+inspo move as its own commit. See `design/CLAUDE.md § Session continuity` — it dictates a commit-then-push flow.
3. **Decide which planned module to build first.** Per `design/notes/case-study-modules.md § Open questions`: `feature-card-grid` has the strongest inspo evidence (9 of 33 shots), `corner-labeled-field` has the strongest brand fit.
4. **Case-study template.** Once modules are polished + committed, compose them into a case-study template so real content can go in. Template goes at `design/src/templates/case-study/`. Per `design/CLAUDE.md §4f`, composed templates iframe each module's `preview.html` — don't inline markup.

## Open questions / blockers

- **What direction for visual polish?** User called the basics "great" but "not visually interesting." My compositional pass was rejected. Need a clearer read on what they actually want before iterating further.
- **Are `pull-quote`, `prose-section`, `spec-sheet` still load-bearing?** Layout analysis (`design/notes/case-study-modules.md § Absent from module-inspo/`) shows these three shapes don't appear in any of the 33 inspo shots. Worth confirming they'll be used in actual case studies before polishing them further.
- **Which planned module first?** No signal yet. Both `feature-card-grid` and `corner-labeled-field` are strong candidates.

## Gotchas for the next session

- **The Loom static server** must be served from `design/`, not `design/library/`. Command: `cd design && npx http-server . -c-1`. Library URL: `/library/`. A preview server is already running from this session on port 8765 — the `.claude/launch.json` `loomling-static` config starts it.
- **User's memory rules apply** — see the auto-memory entries. Two that matter here: (a) `feedback: no ADRs until finalized` — don't draft ADRs mid-iteration; capture decisions later once things settle. (b) `feedback: no spawn_task mid-edit` — don't run background tasks in the main worktree; they can `git reset` and clobber uncommitted changes.
- **Manifest append rule** (`design/CLAUDE.md §9`) — new entries go at end of `entries[]`. Never re-order. Validate JSON before writing.
- **Slot default state must be `id: "default"` and listed first.** Fixed a stat-row slip this session (was `4-up`, corrected to `default`).
- **`figure-grid` uses container queries** — a wrapper element (`.fig-grid__wrap`) sets `container-type: inline-size`; the grid queries the wrapper. Same pattern in `stat-row`. Don't put `container-type` on the grid itself — the grid can't query its own size (I hit this bug in the compositional pass; the fix is to add a wrapper).
- **`prototype-frame` load timing** — the inline `preview.html` script runs BEFORE the deferred `loader.js` injects `prototype-frame.js`. If a state renders in `loaded=true`, poll for `window.LoomPrototypeFrame` before calling `load()`. The current preview.html has a 20-retry poll baked in.
- **`:has(:empty)` collapse pattern** — spec-sheet uses `.specs__row:has(.specs__label:empty):has(.specs__value:empty) { display: none; }` to hide rows with both slots empty. Modern browsers only; graceful fallback is the empty row rendering (safe).
- **The compositional pass is preserved in git reflog / conversation history** but not on disk. If the user changes their mind and wants to revisit any of those grid moves (marginalia eyebrow, mosaic figure-grid, giant quote glyph, etc.), the ideas are documented in `design/notes/case-study-modules.md § Layout patterns` and can be reconstructed from that reference.
