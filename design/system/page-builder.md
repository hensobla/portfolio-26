# Page Builder

A visual page composer in the Loom (`library/builder.html`). The user stacks existing modules into a page, edits text and images inline, then hits **Finalize** to receive a Claude Code prompt that includes a JSON payload. CC reads the payload and writes a new template under `src/templates/<slug>/`.

The builder is the only writer in the Loom. Library, System, and Sandbox are read-only browsers; the builder produces a payload but does not touch disk. CC writes; the Loom proposes.

---

## Why CC-mediated

Three forces shape this:

1. **Loomling's design rules run through CC.** SEO scaffolding, heading audits, drift detection, manifest validation — these all live in CC's authoring contract. A direct write-API in the Loom would route around them.
2. **No stack creep.** A backend write-API needs a server (Node, Deno, anything). That's an undeclared stack adoption, which `CLAUDE.md §11` forbids. The browser File System Access API avoids the server but is Chromium-only.
3. **The Loom stays vanilla.** `library/` must remain framework-free per `CLAUDE.md §11`. A composer that writes to disk crosses that line.

Tradeoff accepted: one paste-into-CC step per save, in exchange for guaranteed system-rule compliance and zero infrastructure.

See ADR `decisions/0003-page-builder.md` for alternatives considered.

---

## What the builder produces

A **JSON payload** describing the composition + SEO metadata, embedded in a CC prompt. The user copies the prompt and pastes it into a Claude Code conversation in the project directory. CC then runs the **Finalize protocol** (below) to materialize the template.

Pages are always saved as **templates** (`category: templates`, `status: draft`). There is no separate "standalone Element" category — status drives intent (draft = iterating, approved = ready). The user can flip drafts to approved at any time via the normal approval flow (`system/templates.md`).

---

## Payload schema

The payload's `schema` field is `loomling.page-builder/v1`. Higher versions may evolve the shape; CC should reject payloads with an unknown major version.

```json
{
  "schema": "loomling.page-builder/v1",
  "seo": {
    "name": "About",
    "slug": "about",
    "pageType": "WebPage",
    "title": "About — Acme",
    "description": "What Acme does and who it's for.",
    "canonical": "https://example.com/about",
    "ogImage": "https://example.com/og/about.png"
  },
  "modules": [
    {
      "moduleSlug": "navigation",
      "moduleName": "Navigation",
      "stateId": "default",
      "locked": "top",
      "overrides": {}
    },
    {
      "moduleSlug": "homepage-hero",
      "moduleName": "Homepage hero",
      "stateId": "default",
      "locked": null,
      "overrides": {
        "headline": "What Acme does",
        "body": "Two sentences of positioning."
      }
    },
    {
      "moduleSlug": "footer",
      "moduleName": "Footer",
      "stateId": "default",
      "locked": "bottom",
      "overrides": {}
    }
  ],
  "generatedAt": "2026-05-20T20:00:00.000Z"
}
```

**Field notes:**

- `seo.slug` — kebab-case, validated against `^[a-z0-9]+(-[a-z0-9]+)*$`. Becomes the template's slug and folder name.
- `seo.pageType` — one of `WebPage` / `Article` / `AboutPage` / `ContactPage` / `FAQPage`. Drives the JSON-LD `@type` in `preview.html`.
- `seo.canonical` / `seo.ogImage` — may be `null`; CC writes `%CANONICAL_URL%` / `%OG_IMAGE_URL%` placeholders when null.
- `modules[].locked` — `"top"` (navigation), `"bottom"` (footer), or `null` (regular middle module). The Builder enforces exactly one of each locked position; CC may assume this invariant but should flag it if violated.
- `modules[].stateId` — must match a state declared in the module's manifest entry.
- `modules[].overrides` — key/value map matching slot IDs declared in the module's manifest entry. Values are strings (for `text` slots) or image source strings (for `image` slots). Missing slots fall back to the state's natural default.
- `modules[].dataUrlSlots` (optional) — slot IDs whose original override was a base64 `data:` URL (an uploaded local file). Replaced in `overrides` with a `%LOCAL_<SLOT>%` placeholder. CC should surface this to the user so they can provide a real URL or asset path.

---

## Finalize protocol

Composed templates use **declarative composition** (ADR 0004): the template stores its module list + slot overrides in `composition.json`, and a small renderer in `preview.html` assembles the page at view time via module iframes. Module updates propagate automatically — no inlined HTML to go stale.

When CC receives a Page Builder paste, it runs these steps in order:

1. **Parse + validate.** Reject if `schema` doesn't match `loomling.page-builder/v1`. Verify every `moduleSlug` exists in `library/manifest.json` with `category: modules`. Verify every `stateId` exists on its module. Verify `seo.slug` matches the kebab pattern and that `src/templates/<slug>/` doesn't already exist (if it does, refuse — never overwrite an existing template without explicit user confirmation).
2. **Generate the template folder.** Exactly three files:
   ```
   src/templates/<slug>/
   ├── composition.json   # Declarative module list + slot overrides + SEO. The canonical source.
   ├── <slug>.css         # Composition-only styles (usually just background/color).
   └── preview.html       # Renderer: fetches composition.json, stacks module iframes.
   ```
   Do NOT create a `<slug>.html` body fragment — composed templates have no separate body file.
3. **Write composition.json.** Copy the payload's `seo` and `modules` arrays verbatim. Add `schema: "loomling.template-composition/v1"`, `templateSlug: "<slug>"`, `composedAt` (now, ISO), `lastUpdatedAt` (now, ISO). Preserve `dataUrlSlots[]` arrays where present.
4. **Write preview.html as a renderer.** Reference: [src/templates/test-page/preview.html](../src/templates/test-page/preview.html). The structure is:
   - **`<head>`** carries the full static SEO scaffold (title, description, canonical, OG, Twitter, JSON-LD) per `system/seo.md`, filled from `composition.seo`. Blank canonical/ogImage become `%UPPER_SNAKE%` placeholders. SEO is hardcoded because social card crawlers don't run JS; the same values live in composition.json for re-finalize.
   - **`<head>`** also links `../../../src/tokens.css` and `<slug>.css`. Does NOT link individual module CSS files — each module's iframe loads its own.
   - **`<body>`** contains a single `<div data-loom-template="<slug>" id="composition-root">` and a renderer script. The script: fetches `composition.json`, creates one `<iframe>` per module entry pointing at `../../modules/<moduleSlug>/preview.html?state=<stateId>&iid=<unique>`, listens for `loom:ready` from each, postMessages the entry's `overrides` as `{ type: "loom:content", values: {...} }`, and uses `ResizeObserver` on each iframe's body to sync iframe heights to content. **Copy the test-page renderer script verbatim**; the only change per-template is the `data-loom-template` slug and the SEO head.
5. **Write `<slug>.css`.** Composition-only: typically just `background: var(--background); color: var(--text1);` on the `[data-loom-template="<slug>"]` root. Modules carry their own layout/visual CSS. Reference: [src/templates/test-page/test-page.css](../src/templates/test-page/test-page.css).
6. **Heading audit.** Walk each referenced module's preview.html (default state, unless the composition specifies otherwise) and verify the composed page yields exactly one `<h1>` and no skipped levels. If a module's heading level conflicts, surface it before fixing — modules may be used on other pages where the current heading level is correct.
7. **Append a manifest entry.** Category `templates`, status `draft`, one `default` state, slots `[]`, **`filePath` points at `composition.json`** (not a body fragment). Append, never insert; never re-order existing entries.
8. **Report back.** List the files created, the manifest entry appended, and any `dataUrlSlots` the user still needs to provide real URLs for.

If any step fails, CC reports which step and stops. Do not produce a partial template folder — clean up any partial files before exiting.

### Auto-assigned heading levels

The composed template's `preview.html` renderer walks `composition.modules` in order, consults each module's manifest `headings` declaration, and pushes the computed level to every iframe via the reserved `_heading-level` key in the `loom:content` message. The Page Builder canvas does the same. The designer never picks heading levels — the system derives them from position. See `CLAUDE.md §16` and `system/seo.md` for the full rationale and rules.

### Why iframes instead of inlining

The renderer's iframe-per-module approach is the structural change that makes module updates propagate. Each module's `preview.html` is the canonical source for that module's markup; the composed template loads it live. Edit `navigation.html` → every composed page that uses it picks up the change on next reload. CSS already propagates via shared `<link>` tags; this extends the same principle to HTML.

The cost is one extra fetch per module per page load (modest), and slightly more complex layout reasoning (each module is a self-contained iframe with its own document). Both acceptable for the propagation guarantee.

---

## Slot protocol (recap)

The Page Builder reuses the slot postMessage protocol that powers the Sandbox. Every module's `preview.html` listens for:

```js
window.addEventListener("message", (e) => {
  if (e.data?.type !== "loom:content") return;
  const values = e.data.values || {};
  // Apply each override to the matching [data-loom-slot="<id>"] node.
});
```

And announces readiness:

```js
parent.postMessage({ type: "loom:ready", slug: "<module-slug>" }, "*");
```

A module is **builder-ready** if (a) its `data-loom-slot="..."` attributes match the slot IDs declared in its manifest entry, and (b) it implements both message types. New modules ship builder-ready by default (see `system/modules.md`). When a module is missing slot support, the builder shows the iframe but the inspector shows no fields.

---

## Persistence

The Builder maintains a single draft in `localStorage` under `loomling:builder:current` with shape:

```json
{
  "version": 1,
  "modules": [ /* same shape as the payload */ ]
}
```

Saved on every state change. Restored on page load. If the persisted state references modules no longer in the manifest, the Builder resets to seed (nav + footer only). v1 supports a single draft; multi-draft support is a future addition.

---

## Drift behavior

A composed page should never produce drift in the system rules — the builder only stacks modules that already pass the rules. Two exceptions worth knowing:

1. **Heading-level conflicts.** A module's heading levels are correct in isolation but can produce a skip when composed (a hero with `<h1>` placed below a section with `<h2>`). CC's heading audit catches this. If the user wants to ship the conflict, run drift round (B) — extend the system — by adjusting the module's heading levels and documenting the new constraint.
2. **Slot overrides that smuggle in raw HTML.** Image URLs are vetted as strings; text slot overrides are escaped before insertion. If a user wants to put markup into a slot, run drift round (C) — amend the rule — to introduce a `richtext` slot type with explicit sanitization. Not in v1.

---

## v1 scope

**Included:**

- Click-to-add modules to the canvas.
- Drag-reorder middle modules (SortableJS, via CDN). Nav/footer locked.
- Inline edit text and image slots per instance.
- Per-instance state picker.
- Single-draft localStorage.
- Finalize modal with SEO fields.
- CC prompt + payload generation with copy-to-clipboard.

**Deferred to later versions:**

- Multiple drafts / draft management.
- Drag-from-palette-to-canvas (current: click-to-add only).
- Visual reorder feedback at a specific drop indicator.
- Image upload to a real backend (currently base64 in localStorage, surfaced as `%LOCAL_<SLOT>%` placeholders in the payload).
- Re-opening an already-saved template back into the Builder.
- Multi-template per-page composition (templates that include other templates).
