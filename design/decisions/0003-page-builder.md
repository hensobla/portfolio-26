# 0003 — Page Builder, CC-mediated paste

**Date:** 2026-05-20
**Status:** accepted (Finalize protocol step 3 superseded by 0004 — composed templates now use declarative composition, not inlined HTML)
**Context:** The Loom has been a read-only viewer since project init — it loads `library/manifest.json` and renders the catalog, sandbox, and tokens. The user requested a visual Page Builder: stack modules into a page, edit inline, save as a template with SEO scaffolding applied automatically. The persistence question was the architectural fork — does the user save directly from the Loom UI (requiring a backend or a browser write-API), or does Claude Code remain the writer?

**Decision:** Build the Page Builder as a new top-level Loom page (`library/builder.html`). Persist drafts in `localStorage`. On **Finalize**, the Loom generates a JSON payload + a Claude Code prompt, which the user copies and pastes into a CC conversation. CC reads the payload and writes the template files + manifest entry per `system/page-builder.md` (the Finalize protocol).

The Loom stays read-only; CC remains the only writer.

**Sub-decisions made in the same turn:**

1. **Save target is always a template.** No separate "standalone Element" category. Status (`draft` vs `approved`) drives intent. A user iterating on a page leaves it as `draft`; running through the template approval checklist flips it to `approved`. This keeps the schema flat (categories stay at `components | modules | templates`) and the mental model simple.
2. **Builder is its own page**, not a mode of the Library page. Rationale: the Library is a read-only gallery; the Builder is a writer with three columns of UI. Mixing them would crowd both surfaces. Adds a third primary-nav item.
3. **SortableJS via CDN for drag-reorder.** Native HTML5 DnD is notoriously fiddly (event bubbling, ghost rendering, drop indicators). SortableJS (~50KB, 8+ years stable) gives smooth UX with minimal wiring. A `<script src="cdn.jsdelivr.net/...">` is a dependency on the network at preview time, but it's not a stack — no build, no install, no `package.json`. The Loom continues to serve as pure static files.
4. **Single-draft v1, multi-draft later.** `localStorage` key `loomling:builder:current` holds one in-progress page. Adding a draft list and switcher is a reasonable v2 once we see how users actually work with the builder.
5. **Pre-existing slot infrastructure is reused.** The `loom:content` / `loom:ready` postMessage protocol already exists (the Sandbox uses it to support live content overrides). Every existing module already declares `slots: [...]` in its manifest entry with `data-loom-slot` attributes in markup. The Builder is a second consumer of that protocol — no retrofit was needed.
6. **`%LOCAL_<SLOT>%` placeholder for uploaded images.** Image slot overrides come in as base64 `data:` URLs (file picker → FileReader). CC cannot write binary blobs back via a paste, so the payload swaps these for `%LOCAL_<SLOT>%` placeholders and lists the affected slots in `dataUrlSlots[]`. CC tells the user which slots still need real URLs/asset paths.

**Consequences:**

- The Builder works without any backend, in any browser. Loomling's "stack-agnostic until declared" principle survives intact.
- The SEO scaffolding step runs in CC, which means every saved page passes `system/seo.md` rules by default — head metadata, JSON-LD, heading audit, lang attribute.
- The user pays one paste-into-CC per save. This is the only friction added vs. a "direct save" UX.
- The Builder UI lives next to the Sandbox UI in `library/`, sharing chrome (`.lib-*` classes), form styles (`.sb-field*`), and viewport-collapse patterns (`.lib-side__toggle`). Reduces drift between Loom surfaces.
- Adding a new module makes it instantly available in the Builder (palette renders from manifest). No registration step.
- A future stack adoption (per ADR `0001-stack-deferred.md`) does not affect the Builder — it would generate framework-native template files instead of vanilla, but the Loom-side composition flow is unchanged.

**Alternatives considered:**

- **Node sidecar API.** A tiny companion server (Node, Deno) exposing `POST /api/save-page`. The Builder writes directly to disk via fetch — no paste, no CC turn. Rejected: introduces a runtime dependency before the user has declared a stack, which is "stack adoption by stealth" per `CLAUDE.md §11`. Also requires the user to run a second process alongside `http-server`.
- **Browser File System Access API.** `showDirectoryPicker()` grants the Loom write access to the project folder. The Builder writes files directly to disk, no server, no paste. Rejected: Chromium-only (Firefox and Safari don't support it), permission UX is awkward each session, and the directory grant doesn't survive page reloads cleanly. Loomling targets every modern browser.
- **Download + manual placement.** Loom packages the composed page into a ZIP, user downloads, extracts into the project. Manifest update still requires CC. Rejected: most portable, but the worst friction (download → extract → drag into place → run CC anyway). The paste flow is one step shorter.
- **Hybrid (localStorage drafts + sidecar finalize).** Drafts in the browser, sidecar writes only when finalizing. Rejected for the same stack-creep reason as the pure sidecar option.
- **Page Builder as a mode of the Library page.** Same outcome via UI toggle. Rejected: the Builder needs three columns of dense controls; the Library page is a gallery. Mixing them dilutes both.
- **Two distinct save categories ("standalone Element" vs "template").** Rejected: a composed page IS a template by every existing definition in `system/templates.md`. Adding a new category would force a schema enum update, a new `system/<category>.md`, and ongoing reasoning about which kind a page is. Status (`draft | approved`) carries the intent at zero schema cost.
- **Inline contenteditable in the iframe** for slot editing. Rejected for v1: cross-origin iframe contenteditable is fiddly, the sandbox's existing inspector-driven flow already works, and the round-trip via inspector is no slower than typing in place. A future v2 could add contenteditable on top of the existing postMessage protocol.
