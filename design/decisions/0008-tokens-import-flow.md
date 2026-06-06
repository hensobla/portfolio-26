# 0008 — Tokens import flow

**Date:** 2026-05-21
**Status:** accepted
**Context:** After init, the user has no in-Loom way to extend or replace their design tokens. The init interview seeds `src/tokens.css` (color seeds + typography intent) and then nothing — every subsequent token change requires the user to either edit `src/tokens.css` directly or describe the change in natural language to CC and hope the right values land. The Tokens page is read-only. There is no surface where the user can "play with colors" the way hueapp lets them, or feed in foreign tokens (a Tailwind config, a Figma export, a brand URL, a screenshot) and have Loomling translate.

The user articulated two requirements:

1. **"The design system for Loomling is separate from the design system for the website I'm building. I don't need to see Loomling's; I only need to see mine."** The Tokens page already honors this at the read layer (it surfaces `--color-*` / `--paper` / `--ink` from `src/tokens.css`, never `--lib-*`), but write affordances need to honor it too — any new UI must shape the user's tokens, not Loomling's chrome.
2. **"Help me think through a UI that accommodates flexible input — as much or as little as the user wants. Consider something like hueapp."** The right surface isn't a form with prescribed fields; it's a single button that absorbs whatever input the user has — a hex code, a vibe sentence, a brand URL, a screenshot, or hands-on visual play with a color editor — and ships it to CC for translation.

**Decision:** Add a single **Import** button on the Tokens page that opens a tabbed modal with four input modes, plus a scope picker, and emits a CC-paste payload analogous to the Page Builder's Finalize flow.

### Shape

- **One Import button**, mounted in a `.ds-actions` row at the top of the Tokens content area.
- **Four input modes (tabs):**
  - **Visual** — interactive color editor: base-color picker, live-generated 50–950 OKLCH ramp, harmony helpers (mono / analogous / complementary / triadic), per-step semantic-mapping picks. **Live overlay** on the Tokens page behind the modal so the user sees the staged tokens applied to the swatches in real time.
  - **Paste** — free-form textarea + format hint (auto / CSS / Tailwind / Figma JSON / hex list / vibe text).
  - **URL** — pre-filled from `project.json.brandSource` when set. CC `WebFetch`es and extracts.
  - **Image** — drag-drop with base64 embedding in the payload. CC reads the image natively.
- **Scope picker (Stage 2):** Replace all / Merge / Replace target. Default = Merge (safest).
- **Output:** a JSON payload (`schema: "loomling.tokens-import/v1"`) + a CC prompt copied to the clipboard. CC reads `system/tokens-import.md` and runs the Finalize protocol.

### Why CC-mediated

Same forces as the Page Builder (ADR 0003):

1. Loomling's design rules — OKLCH ramp discipline, contrast pairs, semantic-mapping correctness, drift handling, `system/*.md` updates — all live in CC's authoring contract. A direct write-API would route around them.
2. A backend write-API needs a server. `CLAUDE.md §11` forbids silent stack adoption.
3. `library/` is and must remain framework-free vanilla HTML/CSS/JS.

One paste per import is the tradeoff. The Visual mode's live overlay softens it: the user sees the proposed change applied before committing, so the paste isn't a leap of faith.

### Why OKLCH for ramps

Perceptual uniformity. Linear lightness steps in OKLCH produce ramps that *look* evenly spaced; the same in HSL produces ramps where mid-tones bunch and extremes drift. hueapp uses OKLCH (and similar perceptual color spaces) for the same reason — it's what makes generated ramps feel hand-tuned. The Visual mode computes ramps in OKLCH client-side and emits them verbatim in the payload; CC writes the values without re-deriving.

### Why a single button with tabs (not separate "Customize colors" / "Import…")

The user's framing: *"As much or as little as the user wants."* The right unit isn't the *category* of token (color vs typography) — it's the *form* of input the user has. A single button that absorbs any input form, plus an internal mode picker, matches that better than splitting by category. The CC side handles the category dispatch on receipt.

### Alternatives considered

- **Two top-level buttons (Customize colors + Import…).** Cleaner conceptual split, but the user explicitly steered away from prescribing the input *category* up front.
- **Inline edit per token (no modal).** Closer to direct manipulation but doesn't address the exploration intent — no harmony helpers, no full-palette generation from one seed.
- **Pure paste-modal (no Visual mode).** Cheapest to build. Loses the differentiator. The visual + immediate quality is what makes this UI worth having vs. just typing into the CC conversation directly.
- **Node sidecar that writes `src/tokens.css` directly.** Stack creep; rejected per `CLAUDE.md §11`.

### Consequences

- New system doc: `system/tokens-import.md` (payload schema + Finalize protocol).
- New code: `library/tokens.html` (button + modal markup), `library/tokens.js` (OKLCH math, ramp generation, harmony helpers, live overlay, payload/prompt builders), `library/library.css` (modal + editor styles, reusing `.bld-modal*` chrome).
- New rule reference: `CLAUDE.md §17` points at the Tokens Import flow and `system/tokens-import.md`.
- Reuses the Page Builder's modal patterns (`.bld-modal*`, `bld-modal__panel--wide`, `.bld-prompt`) so the two CC-paste surfaces look and feel like the same surface.
- `project.json.brandSource` (captured at init but previously unused) is now load-bearing for the URL input mode.

### Out of scope for v1

- Font-pairing visual picker (the Visual mode is color-only; typography is text-input in the Paste tab).
- Multi-source merge (importing from URL + image in one shot).
- Re-opening an existing palette back into the Visual editor for tweaks.
- Theme variants (dark mode primitives) — separate flow.
- Import history.
