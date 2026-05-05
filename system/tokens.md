# tokens.md

The governance file for the design system. Owns the theming architecture, the naming conventions, and the rules for adding or changing tokens. Does not define any token values. Values live in their domain files.

---

## Where to find what

| Looking for... | Lives in |
|---|---|
| Governance, naming conventions, theme architecture, rules for adding tokens | this file |
| Color values and color usage rules | `colors.md` |
| Type sizes, weights, tracking, line-height, font primitives | `typography.md` |
| Spacing rhythm, breakpoints, container widths, `--measure` | `grid.md` |
| Editorial voice, copy patterns, label conventions | `voice.md` |
| Why the system looks and behaves the way it does | `decisions.md` |
| Reusable building blocks (metric card, variant card, etc.) | `components.md` |
| Section-level patterns (hero, metrics dashboard, roads, etc.) | `modules.md` |
| Full page templates | `templates.md` |

If a doc references a token, the domain file for that token is where the value is defined. This file only sets the rules.

---

## Theme architecture

Tokens are CSS custom properties registered in `src/app/globals.css`. The default theme is **Classic Vignelli**. Additional themes are added by overriding the same variable names under a `data-theme` selector. Components never reference raw values. They always reference the semantic token via `var(--token-name)`.

This stack is Tailwind v4. Token registration uses Tailwind v4's CSS-first config — the `@theme {}` directive — not a JS config file. There is no `tailwind.config.ts` and we don't want one.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Classic Vignelli (default). All primitive + semantic tokens live here. */
}

[data-theme="mono"] { /* future: black & white only — overrides @theme variables */ }
[data-theme="cool"] { /* future: blue/grey alternate */ }
```

### `@theme {}` vs bare `:root` — when to use which

The token registration above lives in `@theme {}`. There is **one exception**: tokens that need to be reassigned inside `@media` queries (specifically the stepped display sizes in `typography.md`) use bare `:root` blocks. Tailwind v4's `@theme` directive does not support `@media`-scoped reassignments, so the breakpoint-responsive type sizes are declared first inside `@theme {}` (with their xs default values) and then reassigned inside `@media (min-width: ...)` queries that target `:root`.

```css
@theme {
  --text-display-hero: 56px; /* xs default */
}

@media (min-width: 768px) {
  :root {
    --text-display-hero: 80px; /* md reassignment */
  }
}
```

This split is mechanical, not philosophical: `@theme` is the registration layer, `:root` reassignments are the breakpoint layer. Both target the same custom properties.

Rule: new themes override existing variables. They do not add new variable names. If a new theme needs a concept the default theme doesn't have, that concept gets added to the default first as a no-op, then themed.

---

## Naming conventions

The system has two tiers of tokens. Naming differs between tiers, and the difference is intentional.

### Primitive tokens describe what the value IS

Primitives are the raw palette. They are not referenced by components directly.

**Color primitives** use hue + step naming: `--color-{hue}-{step}`. Hue is the color family (neutral, red, yellow). Steps span `50` through `950`. Example: `--color-red-500`. Hue is named by appearance because at the primitive layer the color *is* its appearance. No role exists yet at this tier.

**Type primitives** use family-role naming: `--font-{role}`, with modifier tokens like `--font-{role}-weight` and `--font-{role}-tracking`. Example: `--font-display`. Type uses role names because there is no useful "appearance" dimension below the family level.

### Semantic tokens describe what the value DOES

Semantic tokens alias primitives. They describe role, not appearance. Components reference these.

Three semantic patterns:

1. **Surface roles**: short names for backgrounds and structural neutrals (e.g., `--paper`, `--ink`).
2. **Semantic roles**: names describe meaning, not appearance (e.g., `--primary`, `--data`, `--muted`).
3. **Foreground pairs**: any fill token that holds text has a `-fg` partner (e.g., `--primary-fg`). The pair is canonical. Don't improvise contrast.

### Anti-patterns

For **semantic tokens**:

- Names by appearance (`--red`, `--yellow`, `--blue`). Components reference role (`--primary`), not appearance.
- Tailwind-style scales at the semantic layer (`--brand-red-500`). Semantics are single values per role.
- Generic names (`--text-color`). Be specific about role.

For **primitive tokens**:

- Inconsistent scale density. All color primitive scales use the same eleven-step density (`50` through `950`).
- Skipping the primitive layer. Semantics must alias a primitive, not embed a raw value.
- Components referencing primitives directly. Always go through a semantic.

---

## Rules for adding tokens

The bar for adding a new token to any domain file is high. Most "I need a new token" moments are actually "I need a new component-local value." Apply this checklist before adding anything:

1. **Is it used in more than one component?** If only one component uses it, keep it inline. A token earns its name by appearing in three or more places.
2. **Does it have a clear role (semantic) or fit a scale (primitive)?** A semantic needs a role. If you can't name it without describing appearance, it doesn't belong at the semantic layer yet. A primitive needs a place in a scale. An isolated value with no scale around it is not a primitive.
3. **Does it pair with another token?** Fill tokens that hold text get `-fg` partners. If a new fill doesn't have a partner, add both.
4. **Does the existing system already handle it?** Most of the time, yes. Resist adding.
5. **Can you defend the addition in writing?** State the role, why existing tokens don't cover it, and what surface or context it pairs with. If you can't articulate the role in a sentence, the token doesn't belong yet. Most "I need a new token" impulses don't survive being written down.

When extending:

- **New theme**: add a `[data-theme="..."]` block in the relevant domain file. Override existing variables. Don't add new names.
- **New primitive scale** (rare): when a genuinely new color family is needed (e.g., a green for success states). Define an 11-step scale (`50` through `950`) in `colors.md`. Name by hue.
- **New semantic token** (rare): name by role, not appearance. Alias an existing primitive step. Define in `colors.md`.
- **New font role** (very rare): the display/body/mono triad is closed by default. A fourth requires a specific reason (e.g., a serif for long-form essay pages) documented in `decisions.md`.

---

## What's NOT a token (intentionally)

These exist as inline values in components, deliberately. They are not globals.

- **Border widths** (1px, 2px). Per-component decisions.
- **Border-radius**. There is no rounded corner in this system. Don't add `--radius`.
- **Shadows**. There are no shadows in this system. Don't add `--shadow`.
- **Spacing scale**. Spacing is structural, owned by `grid.md`. There is no global `--space-1`, `--space-2`.
- **Type sizes**. Owned by `typography.md`. There is no global `--text-lg`.
- **Section padding**. Per-module decisions.

If you find yourself reaching for one of these as a global, the answer is usually that the system isn't supposed to have it. Confirm in `decisions.md` before adding.

---

## When no existing token fits

A workflow rule for whoever's authoring components (you, or Claude Code). Applies to every domain (color, typography, spacing, etc.).

If you're building a component and no existing token maps to the role you need, stop. Don't reach for a primitive directly, don't pick "the closest one and call it good," and don't inline a raw value.

Three options, in order of preference:

1. **Reconsider the design choice.** Most of the time, the role you're reaching for already exists under a different name. Check the relevant domain file's semantic table first. A new token that duplicates an existing role is drift, not extension.

2. **Add a new semantic token.** If the role is genuinely new, follow the *Rules for adding tokens* checklist above and the domain-specific procedure in the relevant file (e.g., colors.md's *Adding a new semantic token*). Update the domain file in the same change. The new token must pass the "defend in writing" step.

3. **Flag the gap and stop.** If you can't justify a new token but the existing ones don't fit, the design itself may be inconsistent with the system. Surface the conflict for review rather than papering over it. This is an editorial check on whether the new design belongs in this system at all.

Each path produces a system that holds together. Bypassing produces drift.

---

## Cross-file dependencies

Some domain files depend on tokens defined in other domain files. Changes in the source file must propagate to the dependent files, or the system drifts.

This table maps the dependencies. Read it as: *"if you change X, also update Y."*

| If you change... | You must also update... | Why |
|---|---|---|
| Breakpoints in `grid.md` | `typography.md` (stepped display sizes), and any other file with breakpoint-tied media queries | Display type sizes step at each breakpoint. Adding, removing, or renaming a breakpoint requires reassigning the type ramp at the new structure. |
| Column counts or grid configuration in `grid.md` | `components.md`, `modules.md`, `templates.md` (whichever exist) | Components express layouts in column spans. A grid that shifts from 12 to 10 columns at a breakpoint changes how every component renders at that width. |
| Color primitives in `colors.md` | The accessibility audit in `colors.md` itself | Contrast ratios change when primitives shift. Re-run the audit. |
| Color semantic aliases in `colors.md` | Any component whose role mapping changes | If `--primary` re-aliases from `--color-red-500` to `--color-red-600`, all components using `--primary` shift. Visual regression check. |
| Font families in `typography.md` | The font-loading section in `typography.md`, and the `<head>` of the site | The `<link>` tag pulling fonts from Google Fonts (or the self-hosting setup) must match what `typography.md` declares. |
| Any token value referenced by approved pieces in `src/components/` | The affected components, modules, or templates must be re-previewed in the library | Per `sandbox.md`, approval is verified against specific token values. A token change that affects a piece's appearance triggers a re-approval pass against the checklist. |

### Process when a source file changes

1. **Before making the change**, scan this table for downstream dependencies.
2. **Make the change in the source file.**
3. **Update each dependent file** in the same commit. Don't split into "I'll fix typography later" — that's how drift compounds.
4. **Visual regression check.** Open the site at the affected breakpoints / surfaces and confirm nothing broke.
5. **Add a `decisions.md` entry** if the change is significant enough to need a *why* on record.

### When adding a new domain file

If a future domain file (e.g., `motion.md` for animation tokens) depends on tokens defined elsewhere, add a row to this table when the file is created. The dependency exists as soon as the file does; the table should reflect that immediately.

---

## Maintenance

When a token value changes, the change must propagate everywhere consistently.

**The places a token change touches:**

1. **The domain `.md` file** that defines the token (e.g., `colors.md`, `typography.md`).
2. **The runtime CSS** at `src/app/globals.css`. The browser reads this file, not the docs.
3. **The accessibility audit** in `colors.md`, if the change affects a text pairing's contrast ratio. Re-run the audit and update the table.

**Process:**

- Make all three updates in the same change. Spec, runtime, and audit drift apart fast otherwise.
- Search the codebase for the literal old value (e.g., a hex code being retired) before declaring the migration complete. Inline literals are bugs and they hide.
- For multi-token changes (e.g., a theme swap), re-run the contrast audit before shipping.

If a token is only referenced through `var(--name)` and never as a literal, the runtime change is the only place the old value can persist. That's the design intent. Treat literals in components as the bug they are.
