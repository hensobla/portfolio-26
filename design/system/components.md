# Components

The smallest reusable units. Atoms. Examples: Button, Tag, Avatar, IconButton, Input, Checkbox.

## Starter primitives

Loomling ships with ~35 starter primitive components covering Actions, Inputs, Data Display, Navigation, Feedback, and Overlays. They render on the System page as the project's living component reference, styled against the placeholder neutral + blue palette so they visibly read as "your brand goes here" until the user runs Tokens Import.

See `system/primitives.md` for the full convention: what counts as a starter, where they're surfaced, how status semantics differ from user-authored components, and how to author new ones. The rest of this file applies to all components — starter or user-authored.

## What qualifies as a component

- **Self-contained.** Renders independently with only the inputs documented in its manifest entry.
- **Single purpose.** A Button is a button. A Card-with-Button is a module.
- **Token-driven.** All design values come from `src/tokens.css`. No hard-coded colors, sizes, spacing.
- **Predictable surface.** The states a component supports are explicit, named, and exercisable via `preview.html?state=<id>`.

## Lifecycle hooks

When a component flips `draft → approved`, CC runs the where-used scan defined in `CLAUDE.md §15` — grepping every module and template HTML for `data-loom="<slug>"` references and producing a copy-pasteable QA prompt listing the consumers. The user can paste that into a fresh CC turn to verify nothing visually regressed.

When the user asks to edit an already-approved component, CC follows the snapshot/revert lifecycle in `CLAUDE.md §14`: the current files are copied to `src/components/<slug>/_approved/`, status flips back to `draft`, and the Sandbox surfaces a **Revert to approved** affordance.

When the user asks to remove a component, CC follows `CLAUDE.md §11`: delete the source folder from disk, set the manifest entry's `status` to `"removed"`, populate `removedAt`, and refresh `notes` with a one-line explanation (replacement, migration, deprecation). The Library page filters `removed` entries out; the Settings → Archive view lists them as catalog history. See ADR 0010.

## File layout

```
src/components/<slug>/
├── <slug>.html       # Markup fragment (no <html>/<body>), wrapping element gets [data-loom="<slug>"]
├── <slug>.css        # Scoped: [data-loom="<slug>"] { … }. Uses tokens.css variables.
├── <slug>.js         # Optional. Only if interactive.
├── preview.html      # Standalone page reading ?state=, importing the component
└── _approved/        # OPTIONAL. Only present when this component has been edited from approved status — holds the snapshot. See CLAUDE.md §14.
```

The `[data-loom="<slug>"]` attribute is the scoping mechanism — CSS targets that attribute, never bare class names. This survives stack migration: in any framework wrapper, the root element keeps the attribute.

## States

Every component declares its supported states in the manifest. Typical states:

- `default` — required, listed first.
- Interaction states represented visually: `hover`, `focus`, `active`, `disabled`.
- Content variations: `long-content`, `empty`, `loading`, `error`.

`preview.html` switches on `?state=<id>` to render any state on demand.

## Props discipline

Components accept a small, named set of inputs. Pre-stack, "props" are HTML attributes or content slots. Post-stack, props become framework props but the *set* doesn't grow.

- **Visual variants** (size, tone) belong on the component if they're truly within its purpose.
- **Layout decisions** (margins, position) belong on the parent (module/template), not the component.

## What components do NOT do

- Fetch data.
- Read URL state or routing.
- Apply outer margin (use spacing tokens on the parent).
- Reach into other components' DOM.

## Button anatomy

Buttons share a small set of shape tokens so primary/secondary/icon variants all read as one family.

| Token | Default | Role |
|---|---|---|
| `--radius-button` | 0.5rem | Corner radius for all button-like controls. |
| `--button-padding-y` | `var(--space-3)` | Vertical padding. |
| `--button-padding-x` | `var(--space-5)` | Horizontal padding. |
| `--accent-hover` | derived from `--accent` | Hover/focus fill for primary buttons. |
| `--accent-disabled` | desaturated accent | Disabled fill for primary buttons. |

A new button variant uses these tokens by default; introduce a new token only when the variant truly diverges in shape (e.g. a pill or icon-only square). Color overrides for secondary/ghost buttons reference the existing semantic colors (`--text1`, `--surface1`, `--border`).

## Approval checklist

Before flipping a component to `approved`, CC verifies:

1. Every documented state renders correctly in `preview.html`.
2. All visual properties come from tokens.
3. `[data-loom]` scoping is correct (no leakage to sibling elements).
4. Accessibility rules from `system/accessibility.md` pass.
5. Markup is semantic.
6. JS (if any) is idempotent and cleans up listeners.
