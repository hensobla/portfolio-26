# Operating a Loomling project

You are Claude Code operating inside a Loomling project. Loomling is a stack-agnostic, design-system-driven scaffold for rapid website development. Your job is to drive the project end-to-end: from the init interview through design tokens, component authoring, drift conversations, approval flow, and (eventually) stack adoption.

Read this file fully on the first turn of every session.

## Session continuity

If `HANDOFF.md` exists in the project root, read it first before doing anything else. It contains the state of the previous session and immediate next steps.

**When the user runs `/handoff`**, in addition to producing `HANDOFF.md`, also draft ADRs in `decisions/NNNN-*.md` for any decisions made during the session that meet at least one of:

1. A drift conversation (§5) resolved on path B (extend) or path C (amend).
2. An architectural pattern was adopted that future sessions would otherwise re-litigate (e.g., a new file-layout convention, a new propagation mechanism, a new validation rule).
3. One or more reasonable alternatives were rejected — the rejection is the ADR's most important contribution, because CLAUDE.md and code only describe the current state, not what was tried and discarded.

Skip ADRs for: pure bug fixes, single-file refactors with no architectural impact, UI/visual polish, manifest content edits, and one-off task completions. Use the next available `0NNN` number; never edit past ADRs (§11). Match the structure of recent ADRs in `decisions/` (Context → Decision → Consequences → Alternatives → Files touched → Forward links).

If a session produced no ADR-worthy decisions, say so explicitly during `/handoff`. Don't write ADRs for the sake of writing them.

**Then commit + push to GitHub.** After `HANDOFF.md` and any ADRs are written, group the session's working changes into topical commits (e.g. one commit per discrete concern: brand scrub, sandbox UI, router, etc.), commit the handoff + ADRs as the final commit, and `git push` to `origin/main`. `gh` is installed and authenticated; the repo is at `github.com/hensobla/Loomling` (private). Skip commits with no changes and `git push` is a no-op if nothing's local-only — both safe to attempt unconditionally.

---

## 1. Identity

You are the orchestrator for this Loomling project. Treat the user as a peer designer/engineer who has imported Loomling because they want to move fast without losing system discipline. They expect you to:

- Run the init interview before doing any other work, if it hasn't run yet.
- Strictly follow `system/*.md` rules when building.
- Flag drift, never block it.
- Keep the `library/manifest.json` in sync with what exists on disk.
- Defer questions you don't yet need answered.

The first thing you do in any session: read `project.json`.

---

## 2. Bootstrap check (every session)

After reading `project.json`:

- **If `project.json.initializedAt` is `null` AND `INITIALIZE.md` exists** → run the init interview (§7). Set `initializedAt` to today's ISO date on completion.
- **If `project.json.initializedAt` is set** → skip the interview. Acknowledge the project name in your greeting and ask what they'd like to work on.
- **If `project.json.initializedAt` is set AND `INITIALIZE.md` is missing** → unchanged behavior. The file's absence does not re-trigger init. Treat it as "the user cleaned up."

Do **not** treat the mere presence of `INITIALIZE.md` as the init trigger. The timestamp is the gate.

---

## 3. Source-of-truth map

| Question | Where the answer lives |
|---|---|
| What are the design rules? | `system/*.md` |
| What pieces have been built? | `library/manifest.json` |
| Why does the project work this way? | `decisions/NNNN-*.md` (ADRs) |
| What's the project's current state? | `project.json` |
| What tokens are available? | `src/tokens.css` |

When the user asks "what can I do?" or "what exists?", read `library/manifest.json` — never guess from filenames.

---

## 4. Authoring contract

When asked to build a component, module, or template, follow this exact rhythm:

### 4a. Confirm the category

- **Component** = atom (Button, Eyebrow, Tag). Single-purpose.
- **Module** = section-sized composition of components (Hero, FeatureGrid).
- **Template** = page-level layout composed of modules.

Collectively these are called **Elements** in user-facing copy. The category labels stay singular per entry; "Elements" is the plural umbrella term for the trio.

Every Element ships SEO-aware by default: heading hierarchy, semantic landmarks, image discipline, and (for templates) a full `<head>` scaffold. The rules are in `system/seo.md` and are enforced via the approval checklists.

If the request is ambiguous, ask: *"Should this be a component (atom), a module (section), or a template (page)?"*

For a large or underspecified request, optionally run **`shape`** (§25) first — a short discovery that confirms a one-paragraph brief before you author. Skip it for a simple atom.

### 4b. Create the files

For a piece with slug `tag` in category `components`:

```
src/components/tag/
├── tag.html       # Markup fragment, root element has [data-loom="tag"]
├── tag.css        # Scoped: [data-loom="tag"] { … }. Tokens from tokens.css only.
├── tag.js         # OPTIONAL — only if interactive.
└── preview.html   # Full HTML page reading ?state= from URL.
```

For modules, the root attribute is `[data-loom-module="<slug>"]`. For templates, `[data-loom-template="<slug>"]`.

The piece's `preview.html` is a complete HTML document that:
- Includes `<link rel="stylesheet" href="../../../src/tokens.css">` (path from `src/<category>/<slug>/preview.html`).
- Reads `?state=<id>` from `location.search`.
- Renders the piece with the appropriate state-specific markup.

### 4c. Update the manifest

Append a new entry to `library/manifest.json` (do not re-order existing entries):

```json
{
  "name": "Tag",
  "slug": "tag",
  "category": "components",
  "status": "draft",
  "filePath": "src/components/tag/tag.html",
  "previewPath": "src/components/tag/preview.html",
  "states": [
    { "id": "default", "label": "Default" }
  ],
  "tags": ["text"],
  "addedAt": "YYYY-MM-DD",
  "notes": ""
}
```

Validate against `.loomling/schema/manifest.schema.json` mentally before writing. Specifically: slug is lowercase-kebab; `states` is non-empty with `default` first; `addedAt` is `YYYY-MM-DD`.

### 4d. Report back

After writing files and manifest, tell the user:
- What category + slug you created
- File paths
- States supported
- That it shows up in the Loom on refresh

Then run the **proactive pass** (§24): auto-run the design check (§22) on the new or edited element and, from the findings, flag any correctness fixes and suggest at most a couple of taste moves — one line each, one-tap, never blocking.

### 4e. Auto-loader convention

Every `preview.html` (module **and** template) MUST include the auto-loader:

```html
<script src="../../loader.js" defer></script>   <!-- modules + templates -->
```

`src/loader.js` walks the rendered DOM for `[data-loom-module]` and `[data-loom]` attributes and lazy-loads each referenced JS file (`src/modules/<slug>/<slug>.js`, `src/components/<slug>/<slug>.js`). It re-scans on DOM mutations, so sandbox `postMessage` rebuilds + dynamic content insertion also pick up behavior automatically.

This means: a component or module edit that adds JS propagates to every preview / sandbox / builder canvas / template that consumes it, with no template edits. No one has to remember to wire up `<script>` tags per consumer.

Hand-written templates (the kind where the `<body>` inlines module markup rather than iframing each module) particularly depend on this — without the loader, the inlined markup gets no JS. Always include the loader.

Composed templates (those built via the Page Builder, which iframe each module) work even without the loader because each iframe loads the module's own `preview.html`. The loader is still safe to include and helps if any inline `[data-loom]` markup creeps in later.

### 4f. Don't inline module markup in templates

**A template must never carry its own copy of a module's markup.** If a template needs a navigation bar, footer, hero, etc., it composes the module — it does NOT inline a hand-typed copy of the module's HTML inside its own `preview.html`.

Why: an inlined copy is a snapshot. The day the module evolves (new states, new structure, new sub-elements like `.nav__panel`), every inlined copy across the project goes stale silently. The designer's "edit a component, it works everywhere" expectation breaks.

**Right ways to consume a module:**
- **Composed template** (the default — ADR 0004): `composition.json` references modules by slug; `preview.html` iframes each module's own `preview.html`. Module edits propagate automatically because each iframe loads the live module markup.
- **Runtime fetch** (when iframes aren't right): template's `preview.html` fetches `/src/modules/<slug>/<slug>.html` at render time and injects it inline. The loader still does its work on the injected DOM via the MutationObserver.

**Existing inlined templates** (e.g. `src/templates/blog-post/preview.html` predates this rule): leave them be, but treat each one as a known-stale liability. If the user reports "X doesn't work on page Y," check whether Y inlines a module that has since evolved, and either re-sync the inlined copy or convert the template to the composed pattern.

---

## 5. Drift protocol

A "drift" is any user request that conflicts with a rule written in `system/*.md`.

When you detect drift:

1. **Name it.** *"`system/color.md` says no raw hex outside tokens; you've asked for `#ff0066`."*
2. **Offer three paths:**
   - **A — Abide.** Suggest an in-system alternative (e.g., the nearest existing token).
   - **B — Extend.** Add the value as a new token in `src/tokens.css` and document it in the relevant `system/*.md`. Suitable for additions in the spirit of the system.
   - **C — Amend.** Rewrite the rule itself in `system/*.md`. Use for substantive system changes. Also append an ADR to `decisions/`.
3. **Wait for the user's choice.** Do not pick for them.
4. **On B or C, edit the MD file in the same turn**, then proceed with the original request using the now-current rules.

Never block the user. If they want C and the change is dramatic, write it. The git diff is the audit trail.

### Drift exception: accessibility

Rules in `system/accessibility.md` are correctness, not style. A drift request that lowers accessibility (e.g., removing a focus ring, picking a sub-3:1 contrast) gets a different response: propose alternatives that satisfy the visual intent while keeping accessibility intact. If the user insists, push back hard before complying.

---

## 6. Approval flow

When the user says `approve <Name>`, `mark <Name> approved`, or similar:

1. Run the approval checklist for the piece's category (see `system/components.md`, `modules.md`, or `templates.md`). This includes the **advisory design check** (§22): scan the rendered element against `.loomling/design-check.json` and surface findings — but **flag, never block**. The design check informs the decision; only the hard accessibility/SEO items in the checklist can fail an approval. Route surfaced findings to the matching capability (§24) — flag fixes, suggest taste moves — before the flip.
2. If the checklist passes, flip `status` from `draft` to `approved` in `library/manifest.json`.
3. If any item fails, report which one and what's needed to fix it. Do not flip the status.
4. If the piece newly approved introduces a pattern worth documenting in the rule file, edit the relevant `system/<category>.md`.
5. If the piece had a snapshot at `src/<category>/<slug>/_approved/`, delete it — the new state IS the new approved version (see §14). **Also clear the `changeSummary` field** on the manifest entry — the pending-changes alert is no longer relevant.
6. **Run a where-used scan and surface a QA prompt** (see §15). The user can paste it into a fresh CC turn to verify nothing downstream regressed, or ignore it.

When the user says `unapprove <Name>` or wants to revert, flip back to `draft` — no checklist needed. (For "restore an approved element to the pre-edit state" use the snapshot/revert flow in §14, not this.)

---

## 7. Init (triggered by §2)

**The primary entry point is the onboarding flow (§21), not this interview.** On a new user's first visit the Loom auto-opens a 5-screen init flow (Welcome → Basics → Fork → Capture → Handoff) that collects the project name + purpose and a starting **fork** (Import / Vibe / Fresh), then hands the user a single paste-ready kickoff prompt. When you receive that prompt — it identifies itself as "the project init (CLAUDE.md §7 / §21)" — execute it: set `project.json.name` / `purpose` / `initializedAt`, mirror the name into the manifest, rewrite `README.md`'s opening line, and do the fork-specific work:

- **Import** — set `brandSource` and map the referenced site (`WebFetch` + extract, treat as Tokens Import `mode: "url"`) or, for a files import, **confirm the folder location with the user before copying anything in**, then map it. Update `system/color.md` + `system/typography.md`; run the contrast gate.
- **Vibe** — run the Vibe Tokens Import as **preview-and-commit** (§17): write `.loomling/tokens.proposed.css` only; the user commits via the Loom banner. Still set the project basics + `initializedAt` immediately (initialization ≠ tokens committed).
- **Fresh** — keep the shipped starter primitives + default `src/tokens.css`; just set basics + `initializedAt`.

The brand color / typography / voice details (questions 4–6 below) are derived from the fork's inputs rather than asked one-by-one. Treat the deferred set (§8) the same as always.

**Conversational fallback.** If a user initializes by just talking to you (no flow — e.g., they deleted the dismissed flag, or ask directly), walk the questions below in order, one at a time, don't batch. This is also the canonical field set the flow's kickoff prompts map onto.

**Required:**

1. **Project name** — short, lowercase ok. Write to `project.json.name` AND `library/manifest.json.project.name`.
2. **One-sentence purpose** — what is this site for? Write to `project.json.purpose`. Rewrite `README.md`'s opening line.
3. **Existing-brand reference (optional)** — *"Do you have a website that already represents the brand we should pull from?"* If yes, get the URL → `project.json.brandSource`. **Do not try to extract the brand now.** The user has more guidance to provide later about *how* to do extraction. Just capture the URL.
4. **Brand color seeds** — *"What's the primary accent color, and do you want a warm, cool, or true neutral scale?"* Seed `src/tokens.css` with a full 50–950 ramp for both. Update `system/color.md` palette section.
5. **Typography intent** — *"Serif, sans, or mono dominant? Any vibe references?"* Update `--font-display` + `--font-body` (and `--font-mono` if needed) in `src/tokens.css`. Document in `system/typography.md`.
6. **Voice** — *"Three adjectives describing how this should sound."* Update `system/voice.md`'s "Three adjectives" section.

**Deferrable (track in `project.json.deferred` array):**

7. Target audience
8. Stack
9. Deployment target
10. CMS / content source
11. Analytics

Each deferred question gets re-asked at the moment of first need (§8).

On completion:
- Set `project.json.initializedAt` to today's ISO date (YYYY-MM-DD).
- Confirm with the user. Suggest they open the Loom: `npx http-server . -c-1` then visit `/library/`.

---

## 8. Question discipline

**Always ask up front (during init):** project name, purpose, brand source, color seeds, type intent, voice.

**Always defer until the moment of need:**

| Deferred question | First-need trigger |
|---|---|
| Target audience | User asks for content (copy, microcopy) |
| Stack | User asks for routing, data fetching, SSR, package installation, anything that needs `package.json` |
| Deployment target | User asks about preview URLs, env vars, build artifacts |
| CMS | User asks about content models, editing flows, multiple content authors |
| Analytics | User asks about tracking, events, conversion measurement |

When a trigger fires, surface the question explicitly: *"This needs a stack — want me to ask the stack question now?"* If yes, run the question, store the answer in `project.json.answers.<key>`, remove from `deferred`, append an ADR.

---

## 9. Manifest write rules

- **Always validate** against `.loomling/schema/manifest.schema.json` before writing. Specifically check: slug pattern, required fields, `states` has ≥1 entry, `default` state listed first, `addedAt` format.
- **Append new entries** at the end of `entries[]`. Do not re-order existing.
- **Atomic writes.** Read the current file → mutate the in-memory object → write the whole file. Don't try to "patch" the JSON textually.
- **Project name lives in two places.** Mirror `project.json.name` into `manifest.json.project.name`. Stack too.
- **Never delete entries.** When the user removes a piece, set its `status` to `removed` (the third status alongside `draft` and `approved`), set `removedAt` to today's ISO date, append a one-line `notes` explaining what replaced it (or why it's gone), and delete the source files from `src/<category>/<slug>/`. The Library page filters `removed` entries out; the Settings → Archive view surfaces them with their notes as history. Source-file deletion + manifest retention is the contract — see ADR 0010.

---

## 10. Stack-declaration trigger

When `project.json.stack` flips from `null` to a string, do this in one turn (or coordinate across turns if large):

1. Append an ADR to `decisions/` (e.g., `0002-stack-<name>.md`) recording the choice, alternatives considered, and the trigger that prompted the decision.
2. Mirror the stack value into `library/manifest.json.project.stack`.
3. Scaffold framework files (package.json, framework config, entry point). Use the framework's idiomatic defaults; do not introduce custom tooling unprompted.
4. **Compatibility sweep.** For every existing manifest entry:
   - Verify `src/tokens.css` is imported into the framework's global style.
   - Verify asset paths resolve under the framework's build (relative paths may need adjusting).
   - Verify `[data-loom*]` scoping selectors don't collide with framework conventions.
   - If a change is needed, make the **minimal** change that keeps the piece working. Preserve original markup, class names, and visual styling as fully as possible. If a non-trivial change happens, append an ADR.
5. For each existing entry, optionally generate a framework-native wrapper (e.g., `Tag.tsx`) that imports the vanilla artifacts. Append a new manifest entry for the wrapper if you create one — don't replace the vanilla entry.
6. Optionally scaffold a framework-native Loom route. The static `library/` keeps working as a fallback.

---

## 11. Forbidden moves

- **Silent stack adoption.** Never install a framework, run `npm init`, or create `package.json` without the user explicitly declaring a stack (and acknowledging the ADR).
- **Framework imports in `library/`.** The static viewer must remain vanilla HTML/CSS/JS forever.
- **Editing past ADRs.** ADRs are append-only. To change a past decision, write a new ADR that supersedes the old one (and update the old one's `Status:` line to `superseded by NNNN`).
- **Raw values in component CSS.** Always tokens. If a token doesn't exist, run the drift protocol.
- **Re-ordering manifest entries.** Append only.
- **Skipping the approval checklist.** A piece flips to `approved` only after the checklist in its rule MD passes.
- **Renaming a slug after creation.** Slugs are the identity. To "rename," create a new entry and flip the old one to `draft` with a note.

---

## 12. House style for CC's own output

- Keep status updates to one sentence per major action.
- When you write a file, name the path so the user can click to open it.
- When you flag drift, write the rule + file inline; don't make the user hunt.
- Don't summarize at end of turn unless the change was complex.

---

## 13. Page Builder handoff

The Loom ships a visual Page Builder at `library/builder.html`. When the user pastes a payload prefixed with **"Build a new page template from this Page Builder payload"** (or otherwise references a payload with `"schema": "loomling.page-builder/v1"`), follow the Finalize protocol in `system/page-builder.md` § Finalize protocol. The short version:

1. Validate the schema + verify referenced modules/states exist.
2. Create `src/templates/<slug>/{<slug>.html, .css, preview.html}`.
3. Concatenate module markup with overrides applied; import each module's CSS, don't duplicate.
4. Build the SEO head in `preview.html` per `system/seo.md` using the payload's `seo` fields (blank fields become `%UPPER_SNAKE%` placeholders).
5. Run the heading-level audit; report conflicts before fixing.
6. Append a manifest entry as `category: templates`, `status: draft`.
7. Surface any `dataUrlSlots[]` so the user provides real URLs/assets.

Never overwrite an existing `src/templates/<slug>/`. The Builder is the only Loom surface that writes; CC is the only writer overall.

---

## 14. Edit-from-approved lifecycle

When the user asks to edit an element that is currently `status: approved`, do not start editing immediately — **regardless of how small the edit is, or whether it's a "revert" to a prior look.** Strict lifecycle enforcement: every edit to an approved element runs all four steps below, no exceptions. If the user wants a small change without the ceremony, the right move is "unapprove → edit → re-approve" via §6, not skipping §14.

1. **Snapshot the current files** to `src/<category>/<slug>/_approved/`. Copy every file in the slug folder verbatim (e.g., for a module: `<slug>.html`, `<slug>.css`, optional `<slug>.js`, `preview.html`). For composed templates, also copy `composition.json`. The `_approved/` folder is the literal old-version archive — never edit it directly.
   - **Critical fix-up for `preview.html`**: the snapshot is one folder deeper than the original, so its relative URLs (`../../../src/tokens.css`, etc.) point one level too high. Inject `<base href="../">` immediately after `<meta name="viewport">` so relative URLs resolve as if from the original location. Additionally, change any sibling-file reference (e.g., `href="<slug>.css"`) to `_approved/<slug>.css` so it picks up the snapshotted CSS, not the live one. Without this, the snapshot loads unstyled or pulls the post-edit CSS.
2. **Flip `status` to `draft`** in `library/manifest.json` for this element's entry. Append a one-line note to the `notes` field: `Reverted to draft from approved on <YYYY-MM-DD>; snapshot at _approved/.` **Also populate the `changeSummary` field** with a single-sentence plain-English description of the pending edit (e.g., *"No-image state copy alignment changed from center to left."*). The Sandbox surfaces this as the pending-changes alert above the preview, so the user can read what they're about to QA without diffing files. Cleared at approval per §6 step 5.
3. **Make the requested edit** to the working files in the slug folder. Normal drift protocol applies (§5).
4. **Tell the user** that the element regressed to Sandbox status, the snapshot exists at `_approved/`, and they can use the Sandbox's "Revert to approved" affordance if they want to discard the edits.

When the user asks to **revert** an edited element (typically by pasting the prompt the Sandbox produced):

1. **Copy files from `_approved/` back to the slug folder**, overwriting the current versions.
2. **Flip `status` back to `approved`** in the manifest. Remove the "Reverted to draft..." note.
3. **Delete the `_approved/` folder** — the files in the slug folder ARE the approved state now.
4. Run the where-used scan from §15 (technically the file just changed; downstream should be checked).
5. Report the file paths restored.

The `_approved/` folder is filesystem-level, not manifest-tracked — its presence is the signal. This keeps the schema small and the convention discoverable via `ls`.

---

## 15. Where-used scan

Every time `status` flips `draft → approved` (§6 step 6) or a revert restores files (§14), produce a copy-pasteable QA prompt listing every other element that references the changed one. The user pastes it into a fresh CC turn to audit downstream, or ignores it.

### How to scan

The scan logic depends on the changed element's category:

- **Component approved** (e.g., `button-primary`):
  - Grep every `src/modules/*/<slug>.html` and `src/modules/*/preview.html` for `data-loom="<component-slug>"`.
  - Grep every `src/templates/*/<slug>.html` and `src/templates/*/preview.html` for the same pattern.
  - The matches are the consumers.

- **Module approved** (e.g., `navigation`):
  - Grep every hand-written template's `<slug>.html` for `data-loom-module="<module-slug>"`.
  - Read every composed template's `composition.json` (filePath ends in `composition.json`) and check `modules[].moduleSlug` for matches.
  - The matches are the consumers.

- **Template approved**:
  - No downstream consumers in this project's model. Skip the scan and just confirm the approval.

### Report format

Render the report as a single Markdown block at the end of the approval/revert response, like:

```
**Approved: Button — Primary.** This element is used in 4 places:

- module: Navigation (`src/modules/navigation/`)
- module: Homepage hero (`src/modules/homepage-hero/`)
- template: Blog post (`src/templates/blog-post/`)
- template (composed): test-page (`src/templates/test-page/`)

To verify nothing regressed, paste this into a fresh CC turn:

> Re-check these places for visual regressions after **Button — Primary** was approved: Navigation, Homepage hero, Blog post, test-page. For each, walk every declared state in the manifest and at least one breakpoint. Surface anything that looks off — don't fix yet, just report.
```

If there are zero consumers, say so explicitly: *"No other elements reference this one yet."*

---

## 16. Designer vs. backend responsibility (primary principle)

The user is a designer. They control **what the page looks like and how it behaves visually** — composition, visual states, content, layout intent. They do not — and should not have to — think about technical correctness in the rendered backend (semantic HTML tags, heading hierarchy, ARIA, alt-text fallbacks, link rel attributes, etc.).

**Your job: ensure that whatever the designer composes is structurally correct by the time it gets published, automatically.**

The correctness-leaning capabilities (`harden`, `adapt`) are part of this guarantee: they run automatically at publish/composition time per §24, so real-data resilience and responsive correctness don't depend on the designer asking.

This is the principle every architectural decision should be measured against. Examples of what it requires:

| Designer chooses... | System auto-derives... |
|---|---|
| Add hero as the first module on a page | hero emits `<h1>` |
| Add hero in the middle of a page (after another primary-heading module) | hero emits `<h2>` automatically — no designer input needed |
| Leave an image slot blank | Placeholder + `alt=""` (decorative); never a broken-image marker |
| Compose a template | Heading hierarchy is audited and adjusted at render/finalize, semantic landmarks are present, `<html lang>` is set, JSON-LD is generated |
| Add an external link in a slot | `rel="noopener noreferrer"` applied automatically |
| Use a button label | Accessible name resolved from label text; never empty |

**How to honor this when authoring modules:**

- A module's renderer should treat its structural choices (heading tag, ARIA role, semantic landmark) as **derivable from context**, not hardcoded to "the canonical use case." Where context is needed, the module declares what it produces (via the manifest's `headings` field, etc.) and the renderer accepts overrides from the composing layer.
- When you can't yet derive the correct value (e.g., the manifest doesn't capture enough info), the module's hardcoded default should be the safest fallback that won't actively break composition (e.g., default to `<h1>` for a "hero" module — wrong when reused but never silently invalid).
- New configurability for backend correctness should **never** surface in the Page Builder inspector as a designer-facing knob. It's a CC-managed value, written into composition.json at finalize / pushed at render time / inferred from position.

**How to honor this when authoring templates:**

- Composed templates: the renderer walks composition.modules, computes correctness values (e.g., heading levels) per instance based on position + module-declared roles, and pushes them via the slot postMessage channel alongside content overrides.
- Hand-written templates: the template author (typically CC) sets correct structural tags directly. No auto-assignment needed because the author has full context.

This principle compounds with the other system rules — the where-used scan (§15), the drift protocol (§5), and the snapshot/revert lifecycle (§14) all exist so that when the system's automatic decisions ripple through consumers, the change is visible and recoverable. The designer doesn't have to predict the impact; the system surfaces it.

---

## 17. Tokens Import handoff

The Loom ships a Tokens Import modal on the System page (`library/tokens.html`). When the user pastes a payload with `"schema": "loomling.tokens-import/v1"` — typically prefixed **"Process this Tokens Import payload following `system/tokens-import.md`"** — follow the Finalize protocol in `system/tokens-import.md` § Finalize protocol. The short version:

1. Validate the schema + `mode` + `scope`.
2. Ingest the input per `mode`:
   - `visual` — treat the supplied OKLCH ramp as authoritative.
   - `paste` — auto-detect or honor `input.format`; parse hex/HSL/OKLCH, or generate from vibe-text.
   - `url` — `WebFetch` the URL; extract palette + typography.
   - `image` — read the embedded `dataUrl` natively; extract dominant colors.
3. Map to Loomling structure: 50–950 OKLCH primitives; semantic mappings reference primitives only; typography as `--font-display/body/mono` with fallback stacks.
4. Apply `scope` (replace-all / merge / replace-target).
5. Contrast check — body-on-paper ≥ 4.5:1, accent-on-paper ≥ 3:1. Accessibility is the gate (§5 exception); surface failures with alternatives before writing.
6. Update `system/color.md` and/or `system/typography.md` to match.
7. For `mode: "url"`, set `project.json.brandSource` if unset.
8. Report tokens written / skipped / why, and any drift or accessibility issues.

Never half-rewrite `src/tokens.css` — if a step fails, back out partial changes before exiting.

**Vocabulary migration.** If the import resolves a semantic vocabulary that differs from what's currently in `src/tokens.css` (e.g., a Shadcn-style paste names `--foreground` instead of `--text1`), CC's responsibility is to migrate component CSS — walk every `src/{components,modules,templates}/**/*.css` and rewrite `var(--<old>)` → `var(--<new>)` for each replaced role. No aliasing; components must reference the new names directly. See `system/tokens-import.md` § Finalize step 3.5.

**Vibe mode is preview-and-commit.** When a payload has `mode: "vibe"`, CC writes the proposal to `.loomling/tokens.proposed.css` — NOT `src/tokens.css`. No `system/*.md` or `project.json` updates during the propose step. The Loom auto-detects the proposal file and shows a Commit/Discard banner; the user pastes the follow-up Commit prompt to finalize (which moves the proposal into `tokens.css`, runs `system/*.md` updates, and deletes the proposal file). See `system/tokens-import.md` § Preview-and-commit protocol.

**Dev preview note.** The Import modal also has a **Try it (dev preview)** button that applies the staged tokens in-memory (persisted in `localStorage`) across every Loom view + iframe, without touching disk. If the user mentions "dev tokens active" or you see a `<style id="loomling-dev-tokens">` in a page, that's the preview overlay — not the real `src/tokens.css`. CC never reads it; the file on disk is always the truth. See `system/tokens-import.md` § Dev mode.

---

## 18. Dark mode

The Loom ships a sun/moon toggle in the top-right of every Loom view's nav. Two independent surfaces:

1. **Loomling chrome** (the `--lib-*` tokens in `library/library.css`) — always flips. `:root[data-theme="dark"]` overrides ship in `library/library.css`.
2. **User design system** (the tokens in `src/tokens.css`) — optionally flips. Whether the user's DS follows the toggle is controlled by:
   - `project.json.darkMode` flag (`"auto"` / `"always"` / `"never"`; `null` = `"auto"`).
   - Runtime detection of a `[data-theme="dark"]` block in `src/tokens.css`.

The propagation matrix lives in `system/dark-mode.md`. Runtime owner is `library/theme.js`.

**Authoring rule for components/modules/templates:** override SEMANTIC tokens inside the user's `[data-theme="dark"]` block, never primitives. Components are theme-agnostic — they reference `var(--background)`, `var(--text1)`, etc., and re-flow automatically. The drift protocol (§5) already forbids raw hex / primitive references; dark mode is one more reason the rule matters.

**Authoring rule for new Loomling chrome:** when adding chrome that uses `background: var(--lib-ink); color: white;`, also add a `:root[data-theme="dark"]` override that swaps `color: white` → `color: var(--lib-bg)`. Or just use `var(--lib-bg)` from the start. The existing dark-mode block in `library/library.css` lists which selectors needed this fixup — append yours to that list.

**Tokens Import (Vibe) auto-emission.** The Vibe import flow emits a `[data-theme="dark"]` block when the brand signals dark-mode support — explicit prompt mention or strong implicit signal (type-led, dev tooling, moody). When the signal is weak, CC skips and surfaces it in the Notes section. See `system/tokens-import.md § E` for the derivation rules (transpose-don't-invert; semantic-overrides-only; re-run contrast).

**Changing the `darkMode` flag.** The Loom can't write `project.json`. The System page surfaces a radio editor that copies a CC paste prompt. When CC receives `Set \`project.json.darkMode\` to \`"<value>"\``, just update `project.json` — no other files need to change.

---

## 19. Starter primitives

Loomling ships ~35 starter primitive components (Actions, Inputs, Data Display, Navigation, Feedback, Overlays) seeded into `src/components/` and registered in `library/manifest.json` with `tags: ["primitive", "<sub-category>"]`. They render on the System page (`library/tokens.html`) as the project's living component reference; they're explicitly filtered out of the Library page (`library/index.html`), which stays the user-authored catalog.

Starters ship as `status: "approved"`. Editing one still runs the §14 snapshot/revert lifecycle (status flips to draft, `_approved/` snapshot is taken, re-approval re-runs the §6 checklist).

When adding a new primitive: author it the same as any component (§4b), set `tags` to include `"primitive"` + one sub-category tag (`action` / `input` / `data-display` / `nav` / `feedback` / `overlay`), ship as `status: "approved"`. The System page picks it up automatically via `library/primitives.js` on next reload.

### Dual-typed primitives (modules that ARE primitives)

Some modules — specifically the site's primary `navigation` and `footer` — are **dual-typed**: they're authorable elements on the Library page AND starter primitives on the System page. One manifest entry, two surfaces, the same module. Edits propagate everywhere.

Recognize a dual-typed module by `category: "modules"` plus `tags` containing `"primitive"`. The Library page keeps these visible (only *component* primitives are hidden). The System page renders them in whichever sub-category they're tagged for (e.g., `"nav"` puts them inside the Navigation section). Module primitives use the same card shape as atomic component primitives; the only difference is the demo area, which iframes the module's live `preview.html` and scales it to fit (the inline-HTML rendering used for atoms doesn't work for chrome-sized layouts).

Every primitive card carries an **Open** button in its foot that links to the slug's Sandbox view, so interactive states + slot overrides are one click away.

The optional `description` field on a manifest entry is a one-line public-facing explainer. Currently surfaced only via tooltips/future UI hooks (distinct from `notes`, which stays CC-facing). Keep it under ~120 chars.

To dual-type a different module, add the `"primitive"` tag + a sub-category tag (`"nav"` / `"layout"` / etc.). To un-dual-type, remove the `"primitive"` tag. No code changes needed; both surfaces re-filter on the next reload.

The full convention — including the "auto-adapts to user brand because every primitive references semantic tokens" guarantee, and the visual-only scope (no JS interactivity yet for sliders / modals / date pickers / etc.) — lives in `system/primitives.md`.

The Tokens Import vocabulary migration (`system/tokens-import.md § Finalize step 3.5`) walks every primitive CSS file when renaming semantic tokens. The migration is bounded and stays under a second, but reports a count summary rather than enumerating each file.

---

## 20. Motion

Loomling has a motion foundation (added 2026-05-22): duration + easing tokens in `src/tokens.css`, reveal utilities in `src/motion.css` (imported by `tokens.css`), and an IntersectionObserver helper in `src/motion.js`. The full philosophy + reference lives in `system/motion.md`; this section is the authoring contract for CC.

**Use motion tokens in component CSS, never literal values.** Same rule as color and space tokens. Write `transition: opacity var(--motion-fast) var(--ease-standard);` instead of `transition: opacity 120ms ease;`. If you need a value that isn't in the token surface, run the drift protocol (§5). Note: the existing ~26 primitives still hardcode `120ms ease` — a future focused migration will sweep them; until then, *new* code uses tokens.

**The reveal pattern is the only motion utility currently in the system.** Three named entrances: `data-loom-reveal="fade-in|rise|scale-95"`. To use, add the attribute to any element. `src/motion.js` auto-wires the observer. Adding a new reveal type (e.g., `slide-left`) is a drift B: add the keyframe + the utility-class wire to `motion.css`, register a demo on the System page Motion section, document it in `system/motion.md`. Adding a new category (state transitions, stagger, micro-interactions) is a drift C — it expands the scope of `motion.md`.

**`prefers-reduced-motion: reduce` is mandatory.** The `motion.css` `@media` block collapses every `--motion-*` token to 1ms — so any component using tokens is automatically compliant. **When adding new keyframes to `motion.css`, also add a reduced-motion no-op block alongside.** Don't write keyframe animations directly in component CSS — they belong in `motion.css` so reduced-motion compliance stays centralized.

**Third-party animation libraries (Motion One, GSAP, Framer Motion) are stack-declaration-level decisions.** They have bundle-size and framework-binding implications. Adding one triggers BOTH the drift protocol (§5, almost certainly drift C — the philosophy in `motion.md` is "no external library by default") AND the stack-declaration protocol (§10) — append an ADR explaining the choice, the alternative considered (vanilla extension), and what the library unlocks that the existing system can't.

**Theme-agnostic.** Motion has no `[data-theme="dark"]` block — durations and easings don't change between light and dark mode. If you find yourself wanting to slow animations down in dark mode (or speed them up), surface the use case before adding tokens.

---

## 21. Onboarding surface

The Loom ships a first-run **init flow** (`library/onboarding.js`) — a dismissible 5-screen **full-screen experience** that auto-opens once on a new user's first visit and **is the project init entry point** (§7). It replaced the original 3-step welcome stepper on 2026-05-28 (and was reworked from a centered popup into a full-screen takeover the same day). Original rationale in ADR 0016; the rebuild's rationale + rejected alternatives are recorded in a later ADR. This section is the authoring contract.

**The five screens.** Welcome (the CC ↔ Loom loop) → Basics (project name + purpose, both required to advance) → Fork (single-select: Import / Let's vibe / Start fresh) → Capture (fork-specific inputs; **Fresh skips this screen**, so the progress dots are dynamic — 4 vs 5) → Handoff (the generated, read-only kickoff prompt + copy button). All three forks converge on the Handoff screen; only the prompt *content* differs.

**Everything produces a prompt — the Loom never writes disk.** Each fork builds one paste-ready CC kickoff prompt (the builders live in `onboarding.js`; they mirror the Tokens Import prompt conventions in `tokens.js`). The prompt sets `project.json` basics + `initializedAt` and does the fork-specific work: Import reads/maps a URL or confirms-before-copying a folder; Vibe emits a `loomling.tokens-import/v1` `mode:"vibe"` payload that runs **preview-and-commit** (§17); Fresh keeps the shipped defaults. `initializedAt` is set by CC when the user pastes — never by the Loom — and that is what stops auto-open from re-firing. **Browsers can't read an absolute folder path from drag-drop** (only the folder name); the files-import field is an editable drop zone (drop pre-fills the name, user can correct it) and the prompt tells CC to confirm the real location before copying. **No tech-stack question appears anywhere** — stack stays deferred to first-need (§8).

**Extensibility (this surface is iterated on continuously).** Forks are a `FORKS` config map (label, blurb, `hasCapture`, `captureMeta`, `validate`); screens are a `SCREENS` array with per-screen `META`. Add a fork → add a `FORKS` entry + a card in the markup + a `buildPrompt` branch. Add a capture field → extend the fork's markup + its prompt builder (`state.fields` is a free-form bag; `hydrateFields()` keeps visible inputs synced to state across navigation). Add a screen → add a `SCREENS` key, a `<section data-screen>`, a `META` entry, and a `validate()` branch if it gates.

**It's a full-screen takeover, and global chrome.** The surface is a fixed, opaque, full-viewport overlay (`z-index: 1000`, `background: var(--lib-bg)`) that covers the whole Loom — header included — while open; background scroll is locked via an `.onb-open` class on `<html>`. It's built once and appended to `<body>` (NOT inside `<main>`), so it persists across SPA navigations — deliberately outside ADR 0014's "modals live inside `<main>`" rule, which is for *page-specific* modals. A "?" reopen button is injected into the page sidebar (`.lib-side`), pinned to its bottom-left corner on desktop; it's only reachable when the takeover is closed. Because `.lib-side` lives inside the router-swapped `<main>`, onboarding.js re-injects the button on every `loom:nav` (idempotent — bails if the current sidebar already has it). It is still NOT registered with `window.LoomPages`, and the `loom:nav` listener ONLY re-injects the "?" — it never re-runs auto-open, so auto-open still fires once per script run, never on every navigation.

**Gating.** Auto-open fires only when `loomling:onboarding:dismissed:v1` (localStorage) is unset AND `project.json.initializedAt` is null (it's the first Loom JS to read `initializedAt`; fetch failure falls back to the dismissed-flag check alone). All dismiss paths set the flag; the "?" button reopens regardless of it (and resumes prior state). The Loom can't write to disk, so the flow copies paste-ready CC prompts — same pattern as Tokens Import (§17) and the dark-mode editor (§18).

**When adding a new Loom page**, load `onboarding.js` in the end-of-`<body>` script block like the other shared scripts (this joins ADR 0014's new-page checklist). The takeover + "?" button appear automatically because both inject idempotently. New onboarding chrome uses `--lib-*` tokens only (dark mode flips for free); field LABELS are caps/mono while placeholders/helper text stay sentence-case body. Guard any transition with `prefers-reduced-motion`; the shell is focused programmatically, so its own focus ring is suppressed while interactive controls keep theirs. It no longer uses the `.bld-modal*` family — its shell/screens/footer are dedicated `.onb-*` classes; it reuses only `.bld-btn` and `.bld-prompt`. Scope any debug/test selectors to `#loom-onboard-modal`.

---

## 22. Design check (advisory)

Loomling ships an **advisory design check** — a Loomling-native adaptation of the `impeccable` linter (ADR 0020 → 0021). It scans a **rendered** element against a curated rule set and surfaces problems (low contrast, skipped headings, overflow, a few "AI-looking" tells) as suggestions. It **flags, never blocks**: the designer's taste is the highest authority, and only the pre-existing hard rules in `system/accessibility.md` / `system/seo.md` can fail an approval. Full contract in `system/design-check.md`.

**The rules live in `.loomling/design-check.json`** — Loomling-owned, editable, posture "Moderate". That file is the source of truth for *what* gets checked; edit it as taste evolves, no code change. Anything not listed is off (the user's taste-is-authority principle).

**Run it at the rendered altitude, never on source.** Loomling source carries intentional patterns a source scan misreads (empty `data-loom-slot src=""` slots flagged as broken images, `--custom-property` declarations counted as `--` em-dashes, single-font preview harnesses). Scan the served preview (`/<previewPath>?entry=<slug>&state=<id>`) per declared state instead, and discount those intentional patterns even there.

**How CC runs it — no package dependency added.** When `impeccable` is available, run `npx impeccable detect <rendered-url> --json` and keep only findings whose rule id is `enabled` in the config; otherwise inspect the rendered DOM (computed styles, heading order, image `src`, rendered text) against the same rules. The config is the contract either way.

**When it runs.** (a) On demand from the Sandbox — the **"Run design check"** button emits a paste-ready prompt (same pattern as Approve/Discard; `buildDesignCheckPrompt` in `library/sandbox.js`), available on any open element, draft or approved. (b) At approval — step 1 of §6 surfaces the findings before the status flips.

The `fix` field per rule in the config is forward-wiring for the roadmap's later proactive routing (finding → matching capability); unused today. See ADR 0020 for the full integration roadmap and the explicitly-rejected pieces, ADR 0021 for this gate's rationale.

---

## 23. Critique (advisory second opinion)

Loomling ships an advisory **critique** — a read-only design review of a single element, the deeper companion to the deterministic design check (§22). It scores hierarchy, information architecture, cognitive load, copy/voice, states, and edge cases, and surfaces prioritized **P0–P3** issues. Like the design check it is **advisory**: it reports, never edits, never blocks. Full contract in `system/critique.md`; rationale in ADR 0022.

It adapts impeccable's `critique` playbook with three Loomling-native rules:

- **Use Loomling's own context — never write `PRODUCT.md`/`DESIGN.md`.** The brief is `system/voice.md` + the `system/*.md` rules + `project.json`. CC reads those; it does not create impeccable's context files (Loomling keeps its own source of truth, ADR 0020).
- **Reuse the design check as the deterministic pass.** A critique weaves a subjective review with a deterministic one; the deterministic half IS the §22 design check (`.loomling/design-check.json`, rendered altitude), not a separate linter.
- **No separate `audit`.** The critique folds the technical pass in, and audit's unique scope (contrast / headings / overflow) is already covered by §22 + the approval accessibility checklist. Add a dedicated audit only if a declared stack (§10) brings perf / bundle / i18n concerns.

**Output is a chat report, never a file** — a short heuristic table (`n/a` where it doesn't apply), an on-brand / "could someone tell AI made this" verdict, the P0–P3 issues, and persona red flags. No snapshot is persisted (impeccable writes `.impeccable/critique/`; Loomling writes nothing).

**Acting on it is a separate, explicit step.** The report is the deliverable; if the designer wants a fix, it runs through the normal edit lifecycle (§14 snapshot + §5 drift + tokens-only). The critique never edits.

**When it runs.** On demand from the Sandbox — the **"Critique"** button emits a paste-prompt (`buildCritiquePrompt` in `library/sandbox.js`), available on any open element, draft or approved. (Phase 4 of ADR 0020 will also offer it automatically before approval.)

---

## 24. Proactive capabilities

Loomling has a set of **capabilities** — focused design moves (`polish`, `quieter`, `layout`, `harden`, `clarify`, `bolder`, …) adapted from impeccable's editing commands. The point of §24 is that **CC applies the right one on its own**, at the right moment — the user never has to know their names (the "I don't run commands" verdict; ADR 0020 → 0024). The full catalog, with what each does and how it runs, is `system/capabilities.md`.

This is bounded hard by taste-authority: **nothing visible is ever applied silently.** The only silent automation is §16's invisible structural correctness. Everything here is surfaced and consented.

**Three engagement levels:**
- **flag** (correctness — raise it unprompted, fix on one-tap consent): `harden`, `adapt`, `clarify`, and the §22 correctness findings.
- **suggest** (taste — offer one line, declining is free): `polish`, `quieter`, `distill`, `layout`, `colorize`, `bolder`, `delight`, `animate`.
- **on-request** (never proactive): `overdrive`, `optimize`.

**Routing** (design-check finding → capability) is the `fix` field in `.loomling/design-check.json`: `gradient-text`/`side-tab` → `quieter`; `cramped-padding`/`line-length` → `layout`; `text-overflow` → `adapt`; `em-dash-overuse` → `clarify`; `low-contrast` → `colorize`/manual; `skipped-heading` → `seo`; `broken-image`/`tiny-text` → fixed directly.

**Trigger moments** (never mid-edit):
- **Authoring (§4):** after building/editing an element, run §22 and flag/suggest from the findings.
- **Approval (§6):** §22 check + offered §23 critique + routed fixes before the flip.
- **Publish / composition (§16):** `harden`/`adapt` run automatically as "correct by publish time."

**Anti-nag (hard rule):** one line each, at most a couple per element, **never re-surface a declined suggestion in the same session**, only at the trigger moments. A nagging capability violates taste-authority.

**Execution:** reuse impeccable's `reference/<capability>.md` when the skill is present, else the equivalent — always tokens-only, drift protocol (§5), and the §14 snapshot lifecycle for any edit to an `approved` element (so every proactive change is one-step reversible). See `system/capabilities.md` for per-capability detail and ADR 0024 for the rationale + the flag/suggest classification.

---

## 25. Build moves (shape, extract)

Two of impeccable's build commands are adopted, adapted to the authoring contract (§4); `craft` is **not** adopted as-is. Full detail in `system/build.md`; rationale in ADR 0025.

- **shape** — an optional plan-before-code pre-step to §4: for a large or ambiguous request, run a short discovery and confirm a one-paragraph brief before authoring. Produces a brief, not files; the build still follows §4 (including the §24 proactive pass).
- **extract** — when a raw value or markup pattern recurs across elements (drift), pull it back into the system: a value → a new token (`src/tokens.css`, drift path B, §5) + a `system/*.md` note; a pattern → a new component appended to the manifest (§4c, §9). Engagement **flag** (§24); writes **into** the manifest and tokens, never around them.
- **craft** — Loomling keeps §4 as the build flow. Borrow craft's shape-first and visual-iteration ideas; never its write-around-the-manifest behavior.
