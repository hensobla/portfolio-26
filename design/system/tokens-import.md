# Tokens import

A flexible **Import** affordance on the System page (`library/tokens.html`) that captures the user's design-system input — in whatever form they have it — and produces a CC paste that rewrites `src/tokens.css` and the relevant `system/*.md` docs.

Like the Page Builder, the Import flow is **CC-mediated**: the Loom proposes a payload, CC writes the file.

The System page surfaces only `src/tokens.css` (the user's design system), never `--lib-*` (Loomling's chrome). The two design systems share a repo but never mix in the user-facing view.

---

## Why CC-mediated

Same forces as the Page Builder (`system/page-builder.md` § Why CC-mediated):

1. **Loomling's design rules run through CC.** Contrast pairs, OKLCH ramp generation, semantic mappings, drift detection, `system/*.md` updates — all live in CC's authoring contract.
2. **No stack creep.** A direct write-API needs a server. `CLAUDE.md §11` forbids silent stack adoption.
3. **The Loom stays vanilla.** `library/` is framework-free.

One paste-into-CC step per import, in exchange for guaranteed system-rule compliance and zero infrastructure.

See ADR `decisions/0008-tokens-import-flow.md`.

---

## What the import produces

A **JSON payload** describing the user's input + how they want it applied, embedded in a CC prompt. The user copies the prompt, pastes it into Claude Code in the project directory. CC runs the **Finalize protocol** (below) to update tokens.

The System page itself never writes. The Import modal is the only interactive surface; it stages an in-memory live preview (Visual mode only) and emits a CC paste at the end.

---

## Payload schema

The payload's `schema` field is `loomling.tokens-import/v1`. CC should reject payloads with an unknown major version.

```json
{
  "schema": "loomling.tokens-import/v1",
  "mode": "visual" | "paste" | "url" | "image",
  "scope": "replace-all" | "merge" | { "type": "replace-target", "target": "<token-group>" },
  "input": { ...mode-specific fields... },
  "generatedAt": "2026-05-21T17:00:00.000Z"
}
```

### `mode` — what kind of input the user provided

One of:

- **`vibe`** — The user described their intent in free text, optionally with anchor hex colors, optional harmony choice (only meaningful with exactly one anchor), and a font direction (Google fonts / generic family / "choose for me"). When anchors are present, their 50–950 OKLCH ramps are pre-computed and authoritative. When no anchors are present, CC derives a palette from the prompt alone. **Vibe always uses Preview-and-commit** — CC writes to `.loomling/tokens.proposed.css` first; the user reviews on the Loom; a follow-up Commit prompt finalizes.
- **`paste`** — Raw text the user pasted: another project's `tokens.css`, a Tailwind config snippet, a Figma tokens JSON, a list of hex codes, or a free-text vibe sentence. CC interprets. Commits immediately (no preview step in v1).
- **`url`** — A brand site URL. CC `WebFetch`es it, extracts palette + typography from rendered styles and visible UI (logo color, accent buttons, body type), and proposes tokens. Commits immediately.
- **`image`** — A base64 data URL of an image (logo, screenshot, mood board, photo). CC reads the image natively (multimodal), extracts a palette, suggests harmonies and semantic mappings. Commits immediately.

### `scope` — how the change applies

One of:

- **`"replace-all"`** — Wipe the existing color primitives + semantic mappings (or the analog for typography) and re-seed from the input. Suitable for re-themes or initial setup. **Never** touches non-color/type tokens (spacing, grid, breakpoints) unless the input explicitly addresses them.
- **`"merge"`** — Keep current tokens. Add what the input provides alongside them — new hue families get appended; conflicting semantic-mapping changes are skipped with a note. Suitable for adding a secondary accent or alternate family.
- **`{ "type": "replace-target", "target": "<token-group>" }`** — Replace one named group only. `target` is one of: `color.accent`, `color.neutral`, `color.<hue>`, `color.semantic`, `typography.family`, `typography.scale`. Other tokens are untouched.

Default in the UI is `merge` (safest). The Visual mode UI may bias the default toward `replace-target` (since the user is iterating one ramp) and the URL/Image modes toward `replace-all` (since those pull a full palette).

### `input` — mode-specific shape

#### `mode: "vibe"`

```json
{
  "input": {
    "prompt": "Warm earthy palette. Sage as the accent. Editorial, restrained.",
    "anchors": [
      {
        "name": "brand",
        "hex": "#0b6e4f",
        "baseOklch": "oklch(0.478 0.098 164.9)",
        "ramp": [
          { "step": 50, "value": "oklch(0.97 0.029 164.9)" },
          { "step": 100, "value": "oklch(0.94 0.044 164.9)" },
          ...
          { "step": 950, "value": "oklch(0.16 0.057 164.9)" }
        ]
      }
    ],
    "harmony": "mono",
    "companions": [],
    "font": {
      "mode": "google",
      "google": "Fraunces, Inter"
    }
  }
}
```

**Fields:**

- `prompt` — free-text user intent. May be empty if `anchors` is non-empty (and vice versa). CC uses this to guide palette decisions, font character, and semantic-token feel.
- `anchors` — optional array of user-supplied color anchors. Each carries a generated OKLCH ramp that's authoritative — CC writes the values verbatim. When empty/absent, CC derives a palette from the prompt alone (3–6 ramps).
- `harmony` — only emitted when exactly one anchor is supplied. Drives companion-ramp generation: `mono` (none), `analogous` (±30°), `complementary` (+180°), `triadic` (+120°, +240°).
- `companions` — already-computed companion ramps when harmony !== `mono`. Same OKLCH shape as `anchors[].ramp`. Use verbatim.
- `font.mode` — `google` / `generic` / `auto`:
  - `google`: `font.google` is a comma-separated list of Google Fonts family names. CC distributes across `--font-display` / `--font-body` and adds the `<link>` recipe to `system/typography.md`.
  - `generic`: `font.generic` is `serif` / `sans-serif` / `monospace`. CC uses system-stack fonts in that family. No Google Fonts dependency.
  - `auto`: CC picks fonts that match the prompt's character (distinctive Google Fonts if the vibe suggests it; restrained system stacks otherwise).

**Vibe always triggers Preview-and-commit** (below) — CC writes to `.loomling/tokens.proposed.css`, never to `src/tokens.css` directly.

#### `mode: "paste"`

```json
{
  "input": {
    "format": "auto" | "css" | "tailwind" | "figma-tokens" | "hex-list" | "vibe-text",
    "raw": "...the user's pasted text verbatim...",
    "semanticVocabulary": [
      { "name": "background", "replaces": "paper"   },
      { "name": "foreground", "replaces": "ink"     },
      { "name": "primary",    "replaces": "accent"  }
    ]
  }
}
```

`format` defaults to `auto`. CC sniffs and proceeds; if ambiguous, CC asks before writing.

`semanticVocabulary` is **optional**. Present only when the UI has signal that the user wants a different semantic-token vocabulary than Loomling's defaults — typically only the Paste / URL / Image modes can carry this (Visual mode never sets it). When absent, CC also scans the raw input itself for vocabulary signals (e.g., a Shadcn config that names `--background` / `--foreground`) and adopts them. See § Finalize protocol step 3.5.

#### `mode: "url"`

```json
{
  "input": {
    "url": "https://acme.example.com",
    "hint": "Pull palette and type from the homepage. Logo color is the brand primary." 
  }
}
```

`hint` is optional free-text guidance from the user. CC `WebFetch`es the URL, extracts what it can (rendered colors from inline styles, font-families from `<style>` tags or `<link href="fonts.googleapis.com/...">`), proposes a palette + typography, and writes them. Updates `project.json.brandSource` with the URL if not already set.

#### `mode: "image"`

```json
{
  "input": {
    "mimeType": "image/png",
    "dataUrl": "data:image/png;base64,iVBORw0KG...",
    "filename": "brand-mood.png",
    "hint": "Pull two accents and a neutral from this."
  }
}
```

CC reads the image natively, extracts a palette (3–6 dominant colors, deduplicated by perceptual distance), proposes semantic mappings, and writes them. `hint` lets the user steer ("just the accent" / "use the warmest tone as paper" / etc.).

---

## Vibe extraction heuristics

Vibe is the mode where interpretation matters most — the user has handed Loomling intent, not values. The goal is to translate brand DNA into a working design system that *feels right*, not just one that *parses*. These heuristics give CC the structure to do that work well. They run before the Finalize protocol's mapping step.

### A. Signal hierarchy per input type

The quality of brand analysis is gated on signal quality. Spend more analysis effort when signal is rich; flag confidence when it's thin.

**`mode: "vibe"` with anchors only (no prompt):**
- The OKLCH ramps are authoritative. CC's job is to derive role assignments, typography intent, and the rest of the design DNA from the colors themselves. Mood follows from saturation/lightness/hue: muted desaturated → editorial; high-chroma + warm → playful; cool + low-chroma + blue-anchored → corporate.

**`mode: "vibe"` with prompt only (no anchors):**
- CC derives the palette from the prompt. The prompt is the *intent*; CC's job is to choose colors that match the stated feel. Use the feel axes in section D below to ground the choices.

**`mode: "vibe"` with both:**
- Anchors fix the palette; the prompt refines role assignment, typography character, and tone. Most prompts contradict at least one anchor decision — when so, prompt wins for *meaning*, anchor wins for *value*.

**`mode: "url"`:**
- Prefer sources of design truth in this order: explicit tokens (look for `--color-*` / `--ds-*` / Tailwind config in inline `<style>` or linked CSS) → computed styles via WebFetch + visible rendering (button colors, link colors, body font-family, body color) → marketing copy + visible UI styling → fallback to vibe interpretation.
- **Sample multiple pages.** Homepages are marketing surfaces — they often skip secondary accents and condensed type used in app/docs sections. Fetch the homepage + 2 subpages (product, docs, blog, or any non-marketing route). Note which signals come from which page.
- Flag confidence in the response: "high" (explicit tokens found), "medium" (computed styles from multiple pages), "low" (only homepage available, only marketing copy parsed).

**`mode: "image"`:**
- Treat the image as a set of pixel-level facts: dominant colors, type family hints (look for the rendered specimen), corner treatment, spacing rhythm, presence/absence of gradients/shadows.
- If multiple images: cross-compare. Different colors across screenshots = intentional secondary accent or inconsistency? If unsure, flag it in the response rather than guessing.
- Logos compress brand decisions; pull more signal from full-screen captures or moodboards.

**`mode: "paste"`:**
- The pasted content IS the signal — parse for explicit tokens, fall through to vibe-text interpretation if no structured data found.

### B. Color hierarchy + role assignment

Every color CC writes must have a functional role. A color that wouldn't be referenced anywhere is a signal to drop it.

**Roles to assign (extends Loomling's semantic vocabulary):**
- **Primary accent** — the brand's signature color, used on CTAs and emphasis. Saturated, distinctive. Maps to `--accent`.
- **Secondary accent (optional)** — some brands hold the primary muted and put vibrancy elsewhere (e.g., link color brighter than button color). If detected, propose it as a new semantic role (`--accent-2` or similar) rather than forcing it into the primary slot. Document the role in `system/color.md` § Surface map at commit time.
- **Neutral ramp** — **temperature-matched to the brand.** Warm brands get neutrals with a slight warm tint (rose-leaning grays); cool brands get cool-tinted neutrals. Avoid pure HSL grays unless the brand is genuinely temperature-neutral (rare). The full 50–950 ramp uses the same hue as the brand accent, just with very low chroma — usually `C ≈ 0.005`–`0.015` across the ramp.
- **Semantic statuses** — `--success`, `--warning`, `--error`. Loomling's v1 doesn't have these yet; if the brand signals their need, propose adding them (3 values each is sufficient: light tint, mid, dark tint — no need for a full 50–950 ramp per status).

**Anti-pattern guardrails:**
- Don't propose a color that won't be referenced by any component.
- Don't make `--background` and `--surface1` identical or so close that the elevation feels collapsed — keep at least 4–6 lightness units of distance.
- Don't pick `--accent` so light that it can't carry text — verify against `--text1`/white at the contrast step.

### C. Typography — three roles + pairing rationale

Loomling tokens cover three families: `--font-display`, `--font-body`, `--font-mono`. CC's job is to choose with reason, not by reflex.

**Role definitions:**
- **Display** — headlines, hero, marketing impact. Carries character. May be heavier or more expressive than body.
- **Body** — long-form reading, UI text, default. Carries clarity. Almost always lower-character than display.
- **Mono** — code, technical metadata, tabular numerals. Carries precision.

**Pairing rationale.** When CC picks fonts (either from `font.google`, `font.generic`, or `font.mode: "auto"`), it should name *why* the pairing works in its response. Examples:
- *Geometric sans display + clean sans body* → unified modernism; safe for product brands.
- *Editorial serif display + humanist sans body* → magazine character with everyday readability; good for editorial/news/restraint brands.
- *Slab serif display + grotesque sans body* → mechanical confidence; good for industrial/tech brands.
- *Single-family across roles* → discipline / minimalism. Use when the brand visibly relies on weight/size rather than typeface variation.

**Fallback stacks.** Always build a CSS fallback that degrades gracefully. If the brand uses a proprietary or paid font, name it in `system/typography.md` § Observed but set the actual `--font-*` value to a free alternative (Google Fonts or system stack) and document the substitution.

**Locked-weight detection.** Some brands lock everything at one weight (e.g., all 400, no bold). Most don't. If observed, note it explicitly so future authoring doesn't silently introduce 600/700.

### D. Feel classification — type + tension axes

Brand identity sits at the intersection of multiple axes. CC's response should locate the brand on each, then state the resulting philosophy in one or two sentences.

**Brand type:**
- **UI-rich** — identity lives in components, color, and density (e.g., dashboard products, dev tools). More accent surface area; tighter spacing; more visible interactive states.
- **Content-rich** — identity lives in typography and restraint (e.g., editorial, photography portfolios, agency sites). Less accent; more whitespace; type doing the heavy lifting.

**Tension axes** (CC picks a position on each; the intersection is the philosophy):
- Industrial ↔ Warm
- Minimal ↔ Dense
- Precision ↔ Playful
- Monochrome ↔ Colorful
- Flat ↔ Dimensional

**What's *absent* is signal too.** No gradients = the brand chose flatness. No shadows = depth rejected. No animation hints in the source = static precision. Note these absences in the response — they shape token choices (no `--shadow-*` ramp for a flat-stance brand; no rounded radii for a precision-stance brand).

**Philosophy statement.** CC's response includes one or two sentences capturing the philosophy. Example: *"Restrained editorial — type-led identity, monochrome with a single muted accent, flat surfaces, no decoration. The product reads as a magazine, not an app."* This becomes the steering principle for downstream authoring; it gets written to `system/color.md` § Status line at commit time.

### E. Dark mode

Loomling supports an optional dark mode via the `[data-theme="dark"]` selector on `:root`. The Loom's sun/moon nav toggle reads `src/tokens.css` to detect whether dark tokens are declared and gates the content-flip behind that detection (see `system/dark-mode.md` for the full nav/runtime spec).

**When to emit dark tokens in a Vibe import.** Emit when the brand signals support — either explicitly (prompt mentions "dark mode", "supports dark", "works on dark backgrounds") or strongly (type-led editorial, photography-led, dev tooling, moody / nocturnal feel). When the signal is mixed or weak, default to NOT emitting and call it out in the Notes section. The user can always re-run with a sharper prompt.

**Derivation rules.**

- **Derive from light, don't accept separately.** Light mode is the source of truth.
- **Transpose, don't invert.** A warm light gray becomes a warm dark gray. A cool light blue becomes a cool dark blue. Hue + temperature preserved; lightness inverted.
- **Slight chroma bump on accents in dark.** Brand-500 in light might become brand-400 in dark to preserve perceived saturation against the darker surround.
- **Override semantics, not primitives.** Primitives (`--color-*-{50..950}`) stay constant. Only the semantic mappings (`--background / --surface1 / --text1 / --text2 / --accent / --border`) get repointed inside `[data-theme="dark"]`.
- **Re-run contrast for dark.** Body-on-paper ≥ 4.5:1, accent-on-paper ≥ 3:1 against the dark semantics.
- **Status colors** (`--success / --warning / --error`, if present) get paired light/dark definitions rather than reuse.

**Shape of the emitted block.** A single `[data-theme="dark"]` selector at the bottom of the proposal file, semantic mappings only:

```css
[data-theme="dark"] {
  --background:  var(--color-neutral-950);
  --surface1:  var(--color-neutral-900);
  --text1:    var(--color-neutral-50);
  --text2:  var(--color-neutral-400);
  --accent: var(--color-accent-400); /* chroma bump from light's 500 */
  --border:   var(--color-neutral-800);
}
```

When this block lands in `src/tokens.css` (at commit time), Loomling auto-detects support and the nav toggle gains content-flip behavior. The user can override the auto-detection per-project via `project.json.darkMode` (`"auto"` / `"always"` / `"never"`).

### F. Confidence flagging

When signal is thin, CC should say so before the user commits.

| Mode | High confidence | Medium | Low |
|---|---|---|---|
| `vibe` (anchors + prompt) | Both rich | Anchors only | Prompt only |
| `vibe` (anchors only) | 2+ anchors with clear hierarchy | 1 anchor | — |
| `url` | Explicit tokens found in source | Computed styles from 2+ pages | Only homepage; marketing copy only |
| `image` | Multiple consistent screenshots | One full screenshot | Logo only |

CC's response prepends a confidence line: `**Signal confidence: high**` / `medium` / `low`. Low-confidence responses should explicitly invite the user to refine (add anchors, add a subpage URL, add a screenshot) before committing.

### G. Traceability + squint test

Every output decision should be traceable to an observed input fact or a stated heuristic. When CC's response surfaces the proposed palette/type/philosophy, each non-obvious choice gets a one-line reason. Examples:

- `--accent: oklch(0.55 0.18 25)` — *matched the "Sign in" button hex on the homepage*
- `--font-display: Fraunces` — *editorial brand cue from the prompt + 1.4 measure (long-form reading) in the body*
- *no gradients in `--shadow-*`* — *brand is flat-stance per the homepage's stripped surfaces*

The **squint test**: after committing the proposal CSS, mentally squint at how the staged tokens render across the Library. If hierarchy is invisible (everything blurs equally), the contrast or accent strategy needs work. CC can flag this in the response before commit if the proposed palette feels at risk.

---

## Preview-and-commit protocol (Vibe mode only)

Vibe imports are inherently interpretive — the user can't predict CC's output the way they can with a Visual ramp pick. So Vibe runs in **two paste cycles**:

1. **Propose.** User submits the Vibe payload. CC writes the proposed tokens to `.loomling/tokens.proposed.css`. **CC does NOT touch `src/tokens.css`, `system/color.md`, `system/typography.md`, or `project.json` in this step.** CC's reply summarizes the proposed palette + font choices and reminds the user that the proposal is now live on the Loom.
2. **Commit (or Discard).** The Loom auto-detects `.loomling/tokens.proposed.css` on every page load and shows a "Proposed tokens" banner with two buttons:
   - **Commit** copies a follow-up CC prompt to the clipboard. The user pastes it; CC reads `tokens.proposed.css`, applies its contents to `tokens.css` per the original scope, deletes the proposal file, updates `system/*.md` docs, runs contrast checks, and (if vocabulary changed) walks module CSS per Finalize step 3.5.
   - **Discard** copies a much shorter CC prompt; user pastes; CC deletes `tokens.proposed.css` and confirms.

While the proposal file exists, every Loom view (Library, System, Builder, Sandbox) shows the proposed palette applied via [library/dev-tokens.js](../library/dev-tokens.js)'s injection mechanism. Module preview iframes pick it up too, so the user sees real components in the proposed style before committing.

**File contract for the proposal file:**

- Path: `.loomling/tokens.proposed.css` (sibling of `.loomling/tokens.original.css` — both are project metadata, not site content, so they never accidentally ship).
- Shape: full `:root { ... }` block with all the proposed primitives + semantic mappings. The Loom injects its contents wholesale — they cascade over the on-disk `src/tokens.css` values.
- The proposal file is **never** referenced from any `<link>` tag. It's loaded only by `dev-tokens.js` at runtime via `fetch`.
- If the proposal would require font-family changes that need `<link rel="stylesheet">` (Google Fonts), CC may also write a `system/typography.proposed.md` note describing the planned typography setup — but should NOT modify any HTML `<head>` tags during the propose step.
- One proposal at a time. If a proposal file already exists when a new Vibe payload arrives, CC should overwrite it (after surfacing a one-line warning that the prior proposal is being replaced).

## Finalize protocol

When CC receives a Tokens Import paste, it runs these steps in order:

1. **Parse + validate.** Reject if `schema` doesn't match `loomling.tokens-import/v1`. Validate `mode` and `scope`. For `replace-target`, validate that `target` names a recognized group.
2. **Ingest the input** per `mode`:
   - `visual` — Treat the supplied ramp as authoritative.
   - `paste` — Detect or honor `format`; parse hex/HSL/OKLCH values; for vibe-text, generate a candidate palette and surface it for confirmation before writing.
   - `url` — Run `WebFetch` on `input.url`; extract palette and typography signals.
   - `image` — Read the image; extract dominant colors via a perceptual-distance pass; cluster into a palette.
3. **Map onto Loomling token structure.**
   - Colors: every primitive lives on a 50–950 scale in OKLCH (`system/color.md`). If the input gives a single hex, CC generates the full ramp (perceptually-uniform lightness steps from L≈0.97 to L≈0.18; chroma tapered at the extremes).
   - Semantic mappings (`--background`, `--surface1`, `--text1`, `--text2`, `--accent`, `--border`) reference primitives, never raw values.
   - Typography: split into `--font-display`, `--font-body`, `--font-mono`. Fallback stacks per `system/typography.md`. If the input names a Google Font, add the `<link>` recipe to `system/typography.md` rather than wiring it implicitly.
3.5. **Resolve semantic vocabulary** (rename existing roles if the input proposes a different set).
   - **Inference order:**
     1. If `input.semanticVocabulary` is present, use it.
     2. Else, scan the raw input for token-name signals (Tailwind / Shadcn shapes, CSS custom property names in pasted CSS, Figma token path conventions). If a coherent foreign vocabulary surfaces, propose it.
     3. Else, keep Loomling's existing vocabulary.
   - **If the resolved vocabulary differs** from what's currently in `src/tokens.css`:
     a. Rewrite the semantic block of `src/tokens.css` to use the new names. Old names disappear; no aliasing (components stay self-consistent — see CLAUDE.md §17).
     b. Walk every `src/{components,modules,templates}/**/*.css` and rewrite `var(--<old>)` → `var(--<new>)` for each replaced role. This is the migration responsibility — components must keep rendering after the swap.
     c. Update `system/color.md` § Surface map to document the new vocabulary (role name + meaning + which primitive backs it).
     d. In the final report (step 8), list the file count migrated and the rename pairs.
   - **Sweeping changes** (10+ files touched, or any role with `replaces` unset which would add a brand-new role rather than rename): surface a one-line confirmation prompt before writing. Avoid sweeping rewrites by surprise.
   - **Starter primitive scale.** Loomling ships ~35 starter primitives in `src/components/` (see `system/primitives.md`). That means a vocabulary migration typically touches 40+ component CSS files. The work is bounded — every primitive references a small set of semantic tokens — but the report from step 8 grows accordingly. Summarize: "Migrated N component CSS files: rename pairs A→B, C→D, …" rather than enumerating each file path.
   - Visual mode never proposes a new vocabulary — its payload uses Loomling's defaults. This step is effectively a no-op for Visual.
4. **Apply the `scope` policy** when writing `src/tokens.css`:
   - `replace-all` — Replace the entire `:root` block of the affected category (colors, typography), preserving the rest verbatim. Don't touch grid/spacing/breakpoints unless the input addresses them.
   - `merge` — Append new primitives. Preserve existing semantic mappings unless the input explicitly remaps them. Conflicts that can't be merged cleanly become a drift round (per `CLAUDE.md §5`).
   - `replace-target` — Replace only the named group. Other groups untouched.
5. **Check contrast.** Before committing semantic mappings, verify body-text-on-paper meets WCAG AA (4.5:1) and accent-on-paper meets 3:1. If not, surface the failure and propose adjusted steps before writing — don't ship an inaccessible mapping (`system/accessibility.md` is the gate; this is a §5 accessibility-drift exception, not a regular drift).
6. **Update `system/*.md` docs.**
   - `system/color.md` — fill or update the Palette section (each new hue) and Surface map.
   - `system/typography.md` — fill or update the family declarations.
7. **Update `project.json` where relevant.** For `mode: "url"`, set `brandSource` to the URL if unset. For any successful write, note the import in a project changelog if one exists (not required in v1).
8. **Report back.** Summarize: which tokens were written, which were skipped (and why), what `system/*.md` updates were made, any drift detected, any accessibility issues surfaced.

If any step fails, CC reports which step and stops. Don't half-rewrite `src/tokens.css` — back out partial changes before exiting.

---

## OKLCH ramp generation (Visual mode in-Loom)

The Visual mode editor in `library/tokens.js` generates 50–950 ramps client-side from a base color using OKLCH math. The standard step lightness values are:

```
50:  0.97
100: 0.94
200: 0.88
300: 0.80
400: 0.70
500: 0.58  (base — exact L matched to user's pick when reasonable)
600: 0.50
700: 0.42
800: 0.32
900: 0.22
950: 0.16
```

Chroma is tapered at the extremes (50/100 use ~30% of base chroma; 950 uses ~60%) so the lightest tints don't read as muddy and the darkest don't oversaturate. Hue stays constant across a single ramp.

Companion ramps for harmony modes shift hue by:
- `analogous`: ±30°
- `complementary`: +180°
- `triadic`: +120°, +240°

The Visual mode's emitted ramp is authoritative — CC writes the values verbatim instead of re-deriving.

---

## Drift behavior

Imports can introduce drift in two ways:

1. **Foreign token format that doesn't fit the system.** E.g., a Tailwind config that uses HSL primitives without 50–950 stops, or a Figma tokens JSON that uses different naming. CC runs the drift protocol (`CLAUDE.md §5`): (A) Abide by remapping to the nearest in-system structure; (B) Extend by adding new primitives that fit; (C) Amend `system/color.md` to accept the new convention (rare).
2. **Accessibility failure** in the proposed semantic mappings. This is the §5 accessibility exception: don't ship a contrast failure even if the user requests it. Surface alternatives that preserve the visual intent and re-check.

---

## Live preview

The Visual mode injects a `<style id="ds-pending-override">` element into the System page that overrides the relevant `:root` values with the staged ramp. The System page renders from `getComputedStyle(document.documentElement)`, so all swatches re-skin automatically. Toggle off to compare; cancel removes the override; submit emits the CC paste (the override remains in place until the page reloads with the real new values).

Other modes (Paste / URL / Image) skip the live overlay — their inputs aren't manipulation-style.

---

## Dev mode (preview-only, no CC paste)

The Import modal carries a **Try it (dev preview)** button alongside **Build CC prompt**. It applies the staged tokens in-memory across every Loom view and module preview iframe, persisted via `localStorage` under `loomling:dev-tokens:v1`. The on-disk `src/tokens.css` is never touched.

This is the iteration surface for the Import flow itself — adjust the Visual editor, click Try it, see how the proposed tokens actually look on the Library cards, the Builder canvas, the Sandbox preview of a real module. No CC round-trip per attempt.

**Scope of dev mode:**

- **Loom views** (Library, System, Builder, Sandbox) — re-skinned via a `<style id="loomling-dev-tokens">` injected by `library/dev-tokens.js`.
- **Module previews in iframes** — the dev-tokens script reaches into every same-origin iframe and injects the same style, so the Sandbox preview, Builder canvas modules, and composed-template renderers all pick up the override.
- **Module previews opened directly** (outside the Loom) — *not* covered. Those load `src/tokens.css` and skip dev mode entirely. By design — dev mode is a Loom-internal preview surface.

**Persistent banner.** When dev tokens are active, a pinned banner appears on every Loom page reading *"Dev tokens active — preview only, not written to `src/tokens.css`"* with a one-click **Clear** button. The banner is intentionally hard to miss — the dev override has to look obviously *not real* so the user doesn't ship preview tokens.

**Supported input modes in dev:**

- **Visual** — full parity (uses the same `buildOverrideCss` builder as the in-modal live overlay, including companion ramps from harmony).
- **Paste** — hex-list parsing only. Regex pulls up to six unique `#rrggbb` values, generates ramps for each, and remaps the semantic tokens to the first. Other paste formats fall back to "use Build CC prompt."
- **URL / Image** — not supported in dev mode. These require CC's `WebFetch` / image reasoning. The dev button surfaces a hint and a pointer at the Build CC prompt path.

**State semantics:**

- Dev tokens are an *override*, not a write. `src/tokens.css` stays canonical. Reload + Clear restores the on-disk values.
- `scope` doesn't affect dev mode — the override always sits on top of the cascade, so "replace all" vs "merge" vs "replace target" look identical in preview. (The scope setting still matters for the CC paste path.)
- Closing the System page does not clear dev tokens. They survive navigation and reload. Only the Clear button (or manually clearing localStorage) ends a dev session.

**When to use which button:**

- **Try it (dev preview)** — iterating on the Import flow itself, exploring color/ramp choices, demoing the import UX. Cheap, reversible, doesn't touch disk.
- **Build CC prompt** — committing the proposed tokens to the project. CC writes `src/tokens.css` + `system/*.md` per the Finalize protocol.

## v1 scope

**Included:**

- One Import button on the System page.
- Four input modes (Visual, Paste, URL, Image).
- Three scope policies (Replace all, Merge, Replace target).
- OKLCH ramp generation client-side in Visual mode.
- Live overlay (Visual mode only).
- Payload + CC prompt with copy-to-clipboard.

**Deferred:**

- Font-pairing visual picker (Visual mode currently focuses on color; type stays text-input).
- Multi-source merge (importing from a URL *and* image in one shot).
- Re-opening an existing palette back into the Visual editor for tweaks.
- Theme variants (dark mode primitives) — separate flow.
- A history of past imports.
