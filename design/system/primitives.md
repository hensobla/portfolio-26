# Starter primitives

> **Status:** Live since 2026-05-22. The starter set seeds every new Loomling project with ~35 placeholder UI primitives (buttons, inputs, cards, badges, tags, modals, etc.) so the System page reads as a complete design system on day one, not an empty shell waiting for the user to author every atom.

## What counts as a starter primitive

- A component in `src/components/<slug>/` whose manifest entry includes `"primitive"` in its `tags` array.
- Authored by Loomling, not by the user. Ships pre-approved.
- Renders against the project's semantic tokens (`--accent`, `--background`, `--text1`, etc.), so it auto-adapts when the user runs Tokens Import.

The current set covers 6 sub-categories, declared via a second tag on each entry:

| Sub-category tag | Components |
|---|---|
| `action` | button-primary, button-secondary, button-ghost, button-destructive, icon-button, toggle-button, segmented-control, dropdown-menu |
| `input` | input-text, textarea, select, checkbox, radio-group, switch, slider, date-picker, combobox |
| `data-display` | card, avatar, badge, tag, data-table, skeleton |
| `nav` | tabs, breadcrumb, pagination, nav-menu, link |
| `feedback` | alert, toast, progress, spinner, empty-state |
| `overlay` | modal, popover, tooltip, accordion |

## Where they're surfaced

- **System page** (`library/tokens.html`) — the primary surface. Each sub-category renders as a `<section class="ds-section">` populated by `library/primitives.js` (which reads the manifest, filters by the `primitive` tag, and injects each component inline).
- **Library page** (`library/index.html`) — **explicitly filtered out**. The Library page stays the user-authored element catalog. Primitives are part of the system reference, not the user's catalog. See `library/library.js` for the filter implementation.
- **Builder** — not currently surfaced. The Builder composes modules; whether primitives should appear there as draggable atoms is a separate decision (see the follow-up section of the original plan).

## Why tags, not a new category

`library/manifest.json` is governed by `.loomling/schema/manifest.schema.json`, which locks `category` to `components | modules | templates`. Adding a "primitives" category would ripple through every Loom view. Tags are flexible enough to discriminate (the `primitive` tag is what every Loom view filters on), don't require a schema change, and keep starters as first-class components — accessible to the same authoring contract every other component follows.

## Status semantics

Starter primitives ship with `status: "approved"`. This is a deliberate departure from `system/components.md`, which says approval comes from running the approval checklist. Starters are pre-approved because they ship with the system and have been visually QA'd by Loomling.

However: **editing a starter is no different from editing any other approved element**. The §14 snapshot/revert lifecycle in `CLAUDE.md` applies. When a user (or CC, at the user's direction) edits an approved starter:

1. The slug folder is snapshotted to `_approved/`.
2. The manifest entry flips from `approved` to `draft`.
3. After edits, re-approval re-runs the §6 checklist as it would for any element.

The only special case: the user can delete unwanted starters outright. If they do, follow `CLAUDE.md §11`'s "never delete entries" rule and flip the manifest entry to `draft` with a note explaining the deletion. The source files in `src/components/<slug>/` can be removed.

## Auto-adapt to user brand

The whole point of the placeholder palette (neutrals + `--accent` blue + status colors) is that it visibly reads as a placeholder. When the user runs Tokens Import:

- The accent ramp gets repointed to the user's brand color.
- The neutral ramp gets the user's gray temperature.
- Status colors stay reasonable (or get tuned if the user provides preferences).
- Every starter primitive picks up the new values automatically because they all reference semantic tokens.

The Tokens Import vocabulary migration (`system/tokens-import.md § Finalize step 3.5`) handles the case where the user imports a brand using different semantic token names (e.g., a Shadcn-style payload that names `--foreground` instead of `--text1`). The migration walks every component CSS — primitives included — and rewrites references in place.

## Authoring a new primitive

The path is the same as any component, with two extras:

1. Author normally per `CLAUDE.md §4b` (folder, html/css/preview.html, manifest entry).
2. **Set `tags`** to include `"primitive"` + one sub-category tag from the table above.
3. **Set `status`** to `"approved"` (starter convention).
4. Confirm it renders on the System page. If the sub-category section is `data-display` or anything wider, the demo card may need a custom `grid-column: span 2` rule in `library/library.css` (see `.ds-primitive-card[data-slug="…"]` blocks at the bottom).

## Interactive primitives

Six primitives ship with a `<slug>.js` companion that adds real interactivity. Each script auto-initializes any matching `[data-loom="<slug>"]` instance on `DOMContentLoaded` and exposes a `Loom<Pascal>.init()` function so the tokens-page renderer (and any dynamic-injection path) can re-run init on later-mounted instances.

Every interactive primitive ships with a `<slug>.js` companion. Below, grouped by sub-category:

### Actions

| Primitive | Behavior |
|---|---|
| `button-primary` / `-secondary` / `-ghost` / `-destructive` | Native `<button>` — hover / focus-visible / disabled handled by browser + the component CSS. No `.js` needed. |
| `icon-button` | Same — native `<button>` element. |
| `toggle-button` | Click or Space/Enter flips `aria-pressed`. Dispatches `loom:toggle` (`detail.pressed:boolean`). |
| `segmented-control` | Click any segment to switch `aria-selected`; only one segment selected at a time. Dispatches `loom:change` (`detail.index`, `detail.value`). |
| `dropdown-menu` | Static markup is the always-open visual demo. Runtime: `data-loom-dropdown-trigger="<id>"` on a trigger button opens the menu beneath it. Menu items dispatch `loom:menu-select` (`detail.label`, `detail.tone`). Arrow keys move focus; Escape / outside click / item click closes. |

### Inputs

| Primitive | Behavior |
|---|---|
| `input-text` / `textarea` / `select` | Native form controls — typing, focus, disabled all native. |
| `checkbox` | Click or Space/Enter toggles `data-checked` (false ↔ true; mixed → false). `aria-checked` synced. Dispatches `loom:change` (`detail.checked:boolean`). |
| `radio-group` | Click or Space/Enter selects; ArrowUp/Down/Left/Right move between options. Dispatches `loom:change` (`detail.index`, `detail.value`). |
| `switch` | Click or Space/Enter flips `data-on` and `aria-checked`. Dispatches `loom:change` (`detail.on:boolean`). |
| `slider` | Pointer drag on track or thumb; arrow keys (±1, shift = ±10); Home / End. Honors `data-state="disabled"`. Range read from `data-min` / `data-max` (default 0–100), `data-suffix` controls value label suffix. |
| `date-picker` | Prev / next month navigation; click any day to select. Today auto-detected. Dispatches `loom:date-select` (`detail.date`). Seed via `data-selected="YYYY-MM-DD"`. |
| `combobox` | Live filter; `<mark>` highlighting of matched substring; ArrowUp/Down to move highlight; Enter to pick; Escape to clear. Dispatches `loom:combobox-select` (`detail.text`). |

### Data Display

| Primitive | Behavior |
|---|---|
| `card` / `avatar` / `badge` / `skeleton` | Visual / stateless — no `.js`. |
| `tag` | Removable variant (tag with a child `i.ph-x`) deletes itself on close-icon click. Cancellable via `preventDefault` on `loom:tag-remove`. |
| `data-table` | Row click toggles `data-state="selected"` (`loom:row-select`); header click cycles the column sort asc → desc → none (`loom:sort-change`) and re-sorts the rendered rows. |

### Navigation

| Primitive | Behavior |
|---|---|
| `link` / `breadcrumb` | Native `<a>` — no `.js`. |
| `tabs` | Click switches `aria-selected`; ArrowLeft/Right/Home/End move focus. Dispatches `loom:tab-change` (`detail.index`, `detail.label`). |
| `pagination` | Click numbered button to switch `aria-current`; prev / next step ±1 within the available set; disabled boundary buttons honored. Dispatches `loom:page-change` (`detail.page:int`). |
| `nav-menu` | Click switches `aria-current`. Default-prevents navigation when `href="#"` (demo mode). Dispatches `loom:nav-change` (`detail.label`, `detail.href`). |

### Feedback

| Primitive | Behavior |
|---|---|
| `progress` / `spinner` / `empty-state` | Visual / stateless — no `.js`. |
| `alert` | Click `.alert__close` to dismiss with fade-out. Cancellable via `preventDefault` on `loom:alert-dismiss`. |
| `toast` | Dynamic API: `LoomToast.show({ text, action, timeout, icon })` returns the toast element; `LoomToast.hide(el)` removes with fade. `data-timeout="<ms>"` auto-dismisses static toasts. Action button click fires `loom:toast-action`. |

### Overlays

| Primitive | Behavior |
|---|---|
| `accordion` | Native `<details>` / `<summary>` — no `.js`. |
| `modal` | `LoomModal.open(panel)` / `LoomModal.close(panel)`; auto-creates backdrop; focus trap; Escape and backdrop-click close; restores focus. Declarative: `data-loom-modal-open="<id>"` on triggers, `data-loom-modal-close` inside panels. |
| `popover` | `LoomPopover.open(popoverEl, triggerEl)` / `close()`. Declarative: `data-loom-popover-trigger="<id>"` on the trigger; positions next to it. Side override via `data-loom-popover-side`. Click-outside + Escape close. |
| `tooltip` | Dynamic mode: any element with `data-loom-tooltip="text"` shows a tooltip on hover / focus and hides on leave / Escape. Side override via `data-loom-tooltip-side`. The static `[data-loom="tooltip"]` markup remains a visual demo and isn't touched by the script. |

Each `.js` file:
- Auto-initializes any matching `[data-loom="<slug>"]` instance on `DOMContentLoaded`.
- Exposes a `Loom<Pascal>.init()` function so dynamically-injected instances (e.g. the tokens-page renderer in `library/primitives.js`) can re-run init.
- Marks initialized elements with `data-loom-init="true"` to make `init()` idempotent.
- Dispatches `CustomEvent`s bubbling out from the component root, so consumers can react without coupling to internal selectors.

`library/primitives.js` probes for each primitive's `.js` via a HEAD request and lazy-loads it as a `<script defer>` tag once per slug. Misses are cached as absent so we don't re-probe.

## Future polish passes

Smaller deferred items:

- **Slider** — multi-thumb / range variant.
- **Date picker** — range selection, year picker, locale support.
- **Progress ring** — currently only the bar variant ships; ring/circle is a future pass.

Each is a candidate for a follow-up plan when the team needs the behavior.
