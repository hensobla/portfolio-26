# ADR 0012 — Dual-typed primitives + unified System primitive card

**Date:** 2026-05-25
**Status:** accepted

## Context

The project has a taxonomy (CLAUDE.md §4a): **components** are atoms, **modules** are section-level compositions, **templates** are page-level layouts. The original surface mapping was:

- **Library page** (`library/index.html`) — user-authored work catalog: every non-primitive component, module, and template.
- **System page** (`library/tokens.html`) — design-system reference: starter primitive components (tagged `"primitive"`), grouped by sub-category (action / input / data-display / nav / feedback / overlay).

This split worked for most things. But for the site's primary navigation and footer modules, the split felt wrong:

- They're authored content (you might edit your nav's link list), so they belong in Library.
- They're also the chrome-defining starter primitives a new project should be able to reach for from the System page — equivalent in role to "Tabs" or "Breadcrumb", just at a larger scale.

The taxonomy invited the question: *should some elements be both?* The user explicitly chose Option B (dual-typing) over Option A (keep separate) or Option C (collapse the distinction):

> "I think it should be dual typed. Let's reserve this just for the site's primary navigation and footer with a note that a user can change this if they like. Since it's both it will live on Library and System but be the exact same element."

The mechanical question that followed: *how should dual-typed entries render?* — went through three iterations:

1. **Separate "Site chrome" section** on System page with full-row chrome cards (`.ds-chrome-card`). User feedback: section description wasn't helpful; move into existing Navigation section.
2. **Mixed atomic + chrome cards in the Navigation section.** Chrome cards still had separate styling (chip, description, sandbox link); user feedback: too special, unify with atomic primitives.
3. **Unified `.ds-primitive-card` for everyone.** Module cards span the full row; atomic cards stay in the auto-fill grid. Every card foot is `[slug] · [Open ↗]`. ✅ landed here.

## Decision

### Dual-typing convention

A module entry can be "dual-typed" by adding `"primitive"` to its `tags`, plus a sub-category tag (`"nav"`, `"layout"`, etc.) matching the System-page section it should appear in. The Library page filter (`library.js`) is updated to hide only **component** primitives, not module primitives:

```js
const entries = allEntries.filter((e) => {
  if (e.status === "removed") return false;
  const isPrimitive = (e.tags || []).includes("primitive");
  return !(isPrimitive && e.category === "components");
});
```

One manifest entry → two rendered surfaces. Edits to the entry hit both. Removing the `"primitive"` tag from a module immediately drops it from the System page; adding the tag to a different module immediately surfaces it there. No code changes needed.

Currently dual-typed: **`navigation`** and **`footer`**. The convention is documented in CLAUDE.md §19 ("Dual-typed primitives (modules that ARE primitives)") with explicit instructions for users on how to add or remove dual-typing.

### Unified primitive card

Every entry surfaced on the System page — atom or module — renders inside a `.ds-primitive-card` element. The card has two regions:

- `.ds-primitive-card__demo` — the visual preview. For components, `mountPrimitive()` fetches the body fragment HTML and injects it inline. For modules, `mountModuleInCard()` creates an iframe pointing at the module's `preview.html`, height syncs to `body.scrollHeight`.
- `.ds-primitive-card__foot` — uniform layout: slug on the left (mono, ellipsized if long), "Open ↗" pill button on the right routing to `sandbox.html?entry=<slug>`. The button carries a `title` attribute with the readable component name.

Module cards differ from atomic cards in two CSS-level ways:

```css
.ds-primitive-card[data-category="modules"] { grid-column: 1 / -1; }
.ds-primitive-card .ds-primitive-card__demo--module { display: block; padding: 0; overflow: hidden; }
.ds-primitive-card .ds-primitive-card__demo--module iframe { width: 100%; ... }
```

The doubled-class selector for `__demo--module` is required because the base `.ds-primitive-card__demo` rule sets `display: flex; align-items: center` (which would vertically-center the iframe in a tall row-stretched cell). Same-specificity rules + source order can fail; doubling the class wins specificity regardless of source order.

## Consequences

- Two surfaces, one source of truth. `navigation` and `footer` cannot drift between Library and System views — they share the same manifest entry, the same iframe-rendered preview, the same slot data.
- Designer-facing UX is consistent: every primitive card looks the same; you click "Open ↗" on any of them and land in the Sandbox.
- The Library page lost the `description` field rendering that briefly existed during the chrome-card iteration. The field remains in the schema (optional) for future surface hooks (Sandbox header, Open button tooltip).
- Sandbox's "← back" link routes context-aware (ADR-worthy on its own scale but small enough to live as ~30 lines in `sandbox.js → wireBackLink()`): primitives → `tokens.html#<section>` ("System"), non-primitives → `index.html` ("Library").
- The Navigation section's atomic primitives (Tabs, Breadcrumb, Pagination, Nav-menu) sit below the two full-row module cards. Visually distinct rows, same card class.

## Alternatives considered

- **Option A (no dual-typing — keep separate).** Adds a `composes` field on module entries listing which components they compose; Library card shows "uses: nav-menu, button-primary"; System card shows "used by: navigation" back-pointer. Clean taxonomy, no surface duplication. Reject reason: user wanted the dual-surface experience explicitly — picking up navigation from System as a starter felt like the right primitive-catalog pattern.

- **Option C (collapse component/module distinction).** Make everything a "component" with a `composes` field. Reject reason: loses the section-ready vs atomic mental model that makes templates compose cleanly. Modules ARE different in kind from components (emergent layout, JS state machines, responsive behavior); collapsing the taxonomy loses signal.

- **Separate `.ds-chrome-card` style for module primitives.** Tried for a while. Reject reason: visual divergence without enough benefit — once both card types live in the same section, the difference felt arbitrary. Unifying onto `.ds-primitive-card` keeps the System page visually coherent.

- **"Site chrome" sub-category** with its own section on the System page. Reject reason: too special; the section description we wrote wasn't useful on the page; user said "remove the specialized treatment." Folded into the existing Navigation section.

- **Boolean `dualType` field on manifest entries** instead of using the `"primitive"` tag. Reject reason: redundant with `tags` and `category`. Tags already drive the System page filter (via `"primitive"` membership); adding a second axis would mean two places to update for the same intent.

- **Render module preview at design width with scale-to-fit** (Library card pattern). Tried; nav at 1280px scaled to 240px = ~17% scale = unreadable thumbnail. Footer same. Reject reason: scale-to-fit only works for cards wider than ~600px; the 220px-min primitive grid cells are too small. Full-row cards at real layout width is the only sensible call.

## Files touched in the originating session (2026-05-25)

- **Modified:** `library/manifest.json` — navigation tags `["primitive", "nav", "layout"]`, footer tags `["primitive", "nav", "layout"]`. Both have `description` field.
- **Modified:** `library/library.js` — filter logic refined to skip only component primitives.
- **Modified:** `library/primitives.js` — `renderCategory` branches on `entry.category`. New `mountModuleInCard()` for module previews via iframe + height sync. Card structure unified: slug + Open button.
- **Modified:** `library/library.css` — `.ds-primitive-card[data-category="modules"] { grid-column: 1 / -1 }`. Doubled-class selector for `__demo--module`. Open-button styles. `.ds-chrome-card` block removed entirely.
- **Modified:** `library/tokens.html` — no separate "Site chrome" section; modules render inside the existing Navigation section.
- **Modified:** `library/sandbox.html` + `library/sandbox.js` — back link `id="sb-back"` + `id="sb-back-label"`; `wireBackLink()` routes by tag.
- **Modified:** `CLAUDE.md` §19 — Dual-typed primitives sub-section added.
- **Modified:** `.loomling/schema/manifest.schema.json` — optional `description` field.

## Forward links

- The `composes` / "used by" cross-referencing idea (Option A's enhancement) is **not** implemented but remains a future improvement worth surfacing if the catalog grows large. Could appear on the Library card meta line.
- If a user wants to dual-type a third module (e.g., a sidebar), the existing convention covers it — add `"primitive"` + appropriate sub-category tag; surface picks it up on next reload. No code changes needed.
- The `description` field is currently set only on `navigation` and `footer` but not rendered anywhere. A future System-page surface (e.g., tooltip on Open button, info chip on the card) can read it without further schema work.
