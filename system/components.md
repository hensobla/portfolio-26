# components.md

Defines what a component is, when to build one, how to build it, and how to know it's done. This file is **instructional, not cataloging**. The catalog of approved components lives in `src/components/ui/README.md`. The build workflow lives in `sandbox.md`.

Read this file before authoring or modifying a component.

---

## What a component is

A **component** is a small, reusable, role-defined building block of the UI. It has a clear job, a clear API, and survives in isolation. Examples of the shape:

- An eyebrow label that introduces a section.
- A metric card that displays a number, a label, and an optional comparison.
- A button. A tag. An attribution row.

A component is **not**:

- A full section of a page (that's a module).
- A whole page (that's a template).
- A one-off bit of styled markup that exists in exactly one place (that's not a component yet — see *When to promote a pattern* below).
- A wrapper around another component with a different name. If the wrapper's API is the same as the wrapped component, it's the same component.

The test: a component is something you'd reach for by name in a future module or template. If you wouldn't, it's probably not a component.

---

## What makes a good component

Six properties. A component that meets all six is a good component.

### 1. Single role

The component does one thing. Naming it should be effortless. If naming requires a compound noun stitched together with "and" or "with" (`HeaderWithMetricAndButton`), the component is doing too much. Split it.

The role is named in the role-based naming convention used elsewhere in the system. A "metric card" is not "yellow card" or "stats display" — it's a card that displays a metric.

### 2. Self-contained

The component renders correctly without context. Drop it into an empty page and it should work. Its size, padding, and behavior are defined by its own props or its own internal logic, not by the parent.

This means:

- No assumed parent. Components don't say "this only works inside a flex container with `gap: 24px`."
- No external CSS overrides expected. Components ship their own styles.
- No "if you use this, you also need to import that other thing." Dependencies are explicit imports inside the component file.

If a component genuinely needs to coordinate with another component (e.g., a tab and a tab-panel), the dependency is documented in both components' catalog entries.

### 3. Configurable but opinionated

A good component is configurable enough to be reusable but opinionated enough to be useful out of the box.

- **Defaults are intentional.** Calling the component without props should produce a sensible, on-brand piece of UI.
- **Variants are role-named.** A button has `variant="primary" | "secondary" | "ghost"`, not `color="red" | "grey" | "transparent"`. The variant describes role; the styling implements role.
- **Configuration has a ceiling.** A component with 15 props is doing too much. Five or six is the soft limit. If you find yourself adding more, ask whether the new prop creates a real new variant or just lets the consumer override what should be a system decision.

### 4. Token-driven

The component references design system tokens for everything visible: colors, type, spacing rhythm, breakpoints. Raw values in component CSS are bugs.

- Colors via semantic tokens (`var(--primary)`, `var(--ink)`).
- Type via the typography token system.
- Breakpoints via the build pipeline pattern documented in `grid.md`.
- Spacing is per-component judgment (per `decisions.md` D8) but follows the patterns in `grid.md`.

A component that hard-codes a color or a font-size is unmaintainable. Token discipline is non-negotiable.

### 5. Accessibility built in, not bolted on

Accessibility is a property of the component, not a checklist item completed at the end.

- Interactive components are keyboard-accessible by default.
- Semantic HTML is used (`<button>` for buttons, `<a>` for links, etc.).
- Focus states are visible.
- Text pairings meet WCAG AA contrast (verified per `colors.md`).
- Animation respects `prefers-reduced-motion`.

A component that needs accessibility "added" later is a component that was built wrong. Build it accessible, or don't ship it.

### 6. Survives the preview matrix

The component renders correctly across the conditions documented in `sandbox.md` *Preview*: every breakpoint, every theme, every state, with long content, with empty content. If it breaks under any of these, it's not done.

This is the strongest filter. Most "good-looking" components fail at edge content (an absurdly long title, a very short label, a missing optional field). The preview matrix forces those bugs visible.

---

## When to promote a pattern to a component

Don't build a component speculatively. The bar is **rule of three**: a pattern earns the right to become a component when it's used in three or more places, not before.

The reason is per `decisions.md` P1 (Edit, don't accumulate). A pattern used in one place might not generalize. A pattern used in two places might be a coincidence. A pattern used in three places is signal.

**The promotion process:**

1. Build the pattern inline the first time it's needed. Don't generalize it yet.
2. The second time it shows up, copy-paste. Don't extract yet.
3. The third time, look at all three uses and ask: *what's the same, what's different, and what's the underlying role?* The answer to "what's the role" becomes the component's name.
4. Build the component in the sandbox per `sandbox.md`. Refactor the three existing uses to consume it.

**The exception:** if a pattern is obviously generalizable from the first use (a button, a basic input, a label that follows a system-wide convention), build the component immediately. Use judgment. The rule of three is a default, not a law.

**The reverse exception:** if a pattern looks like it should be a component but the three uses turn out to be subtly different in ways that resist a clean API, don't force it. Three slightly-different uses might be three different components with similar appearance, not one component with three configurations.

---

## Naming components

Component names follow a few conventions, in priority order:

1. **Role-named.** The name describes what the component does. `MetricCard`, `Eyebrow`, `AttributionRow`.
2. **Singular, not plural.** `MetricCard`, not `MetricCards`. Plurals describe collections, not components.
3. **PascalCase for the export, kebab-case for the file or route.** The component is `<MetricCard>` in JSX, lives at `src/components/ui/MetricCard.tsx`, and previews at `/library/components/metric-card`.
4. **Avoid type-suffix bloat.** A `MetricCard` is not `MetricCardComponent`. The "Component" suffix is redundant.
5. **Avoid generic names.** `Card` is too generic. `MetricCard`, `VariantCard`, `AttributionCard` are specific. If the system genuinely needs a generic Card primitive that other cards compose, name it `CardBase` or `CardShell` — but verify it earns its name first.

Renaming a component is expensive (every consumer has to update). Choose the name carefully on first promotion.

---

## Component structure

A component file follows a consistent shape. Specifics depend on the project's stack; the principles below are stack-agnostic.

### File structure

A typical component file in this system contains:

1. **Imports** — design system tokens (via CSS custom properties referenced in styles, never via Tailwind utility classes), child components from `src/components/ui/` or `src/components/modules/`, framework primitives.
2. **The component definition** — the function or class that receives props and returns the rendered output.
3. **Styles** — co-located with the component (CSS Modules, styled-components, scoped Vue styles, etc., depending on stack).
4. **A default export** — the component itself, named.

What does **not** belong in a component file:

- Business logic that doesn't relate to rendering. A component that fetches data, validates input, or runs analytics is doing too much. Extract that logic.
- Multiple unrelated components. One file per component, by convention.
- Helper functions used by other components. Extract to `src/lib/` or similar.

### Props / API surface

Components expose their configurability through a clear API. The principles:

- **Required props are minimal.** A component should work with the smallest reasonable set of inputs.
- **Optional props have defaults.** The defaults represent the canonical use case.
- **Variant props use union types or enum-style values.** `variant: 'primary' | 'secondary' | 'ghost'`, not `isPrimary: boolean`.
- **Boolean props describe behavior, not implementation.** `disabled` is good; `addGreyBackground` is bad.
- **Children prop is for content composition.** Components that wrap arbitrary content accept children. Components that own their content (e.g., a metric card whose layout is fixed) don't expose a children prop.

### Composition over configuration

When a component starts accepting many props for many states, it's a sign that composition would be cleaner.

Example:

```tsx
// Configuration-heavy: many props
<Card 
  title="..." 
  subtitle="..." 
  metric="+18%" 
  metricLabel="CVR lift" 
  showBadge={true}
  badgeText="Winner"
  ... 
/>

// Composition-clean: smaller pieces, more readable
<Card>
  <Card.Header>
    <Card.Title>...</Card.Title>
    <Card.Subtitle>...</Card.Subtitle>
  </Card.Header>
  <MetricCard value="+18%" label="CVR lift" />
  <Tag>Winner</Tag>
</Card>
```

The composition version uses smaller components that each have a single role. It's more verbose, but it's also more flexible and more readable.

When in doubt, prefer composition. A component with seven props is harder to use than three composable components with two props each.

---

## Light/dark and theme behavior

Components inherit theming from the token system. They do not implement their own theme switching.

- **Components reference semantic tokens.** When the theme changes (via `[data-theme="..."]` on `<html>`), the tokens change values, and the component visually updates without any per-component logic.
- **Components do not contain theme conditional logic.** A component does not say "if dark theme, render this; if light, render that." If two themes need different rendering at the structural level (not just the color level), that's two different components.

The only acceptable per-component theme logic is **theme-aware imagery**. If a component renders an image or icon that needs to be different per theme (e.g., a logo that has light and dark variants), the component can switch the image source based on the active theme. Even then, prefer CSS-driven solutions (filters, masks, currentColor) when possible.

---

## Responsive behavior

Per `grid.md`, components express layout in column spans, not pixel widths. Per `typography.md`, type sizes that respond to breakpoints do so via the breakpoint-stepped token system, not via per-component media queries.

A component's responsive behavior typically covers:

1. **Layout shifts at breakpoints.** A grid that's 3-wide at lg becomes 2-wide at md and 1-wide at xs. Express this with grid-column spans referencing the breakpoint tokens.
2. **Spacing adjustments at breakpoints.** Padding that's 32px at lg might shrink to 16px at xs. Define inline within the component, since spacing is per-component judgment.
3. **Type adjustments handled by the token layer.** If a component uses `--text-display-xl`, that token changes value at each breakpoint automatically. The component doesn't need to know.

Components that don't respond to breakpoints are fine — many small components (eyebrow, tag, button) look identical at every viewport. Don't add breakpoint logic that doesn't earn its weight.

---

## State coverage

Per `sandbox.md` *Preview*, components must define every state they expose. The states a component might have:

- **Default** — the canonical rendering.
- **Hover, focus, active** — for interactive components.
- **Disabled** — for interactive components that can be turned off.
- **Loading** — for components that consume data.
- **Empty** — for components that consume data and might receive nothing.
- **Error** — for components that can fail.
- **Selected, expanded, collapsed** — for stateful components like tabs, accordions, dropdowns.

Every state needs visual definition. A button without a hover state is incomplete. A data display without an empty state is incomplete. The sandbox preview is where this becomes visible.

---

## Anti-patterns

- Building components speculatively. The rule of three exists for a reason.
- Components that take 12 props. Compose smaller pieces instead.
- Components that hard-code colors, font sizes, or breakpoints. Use tokens.
- Components that depend on a specific parent context. Self-contained.
- Components with names that describe appearance instead of role (`YellowCard`, `BigButton`).
- Components that include business logic (data fetching, analytics, validation). Extract.
- Components without state coverage. Default-only is incomplete.
- Components that work in the sandbox but not in real pages. Sandbox imports must mirror production.
- Renaming components casually. The rename touches every consumer.
- Approving a component without a catalog entry per `sandbox.md`.

---

## When to refactor a component

Components age. The role they were built for might shift, or a token change might require updates, or you might find a cleaner API. When to refactor:

- **A token change breaks the component.** Refactor or unapprove (per `sandbox.md`).
- **The component's API has accumulated cruft** (deprecated props still hanging around, unused variants, fields nobody uses). Clean up.
- **The component is being used in ways its API doesn't elegantly support.** Time to either add a clean variant or split into two components.
- **A new component supersedes it.** Migrate consumers, then unapprove the old one.
- **The original use case is gone.** If nothing in the system uses the component anymore, retire it.

Don't refactor:

- "Because it could be cleaner." Unless the current code is causing real problems, leave it. Cosmetic refactors compound into churn.
- To match a new pattern that just one other component uses. Wait for the pattern to be established.
- Without checking consumers. A refactor that breaks three pages without warning is a regression.

---

## How this file relates to others

| File | Relationship |
|---|---|
| `tokens.md` | Components reference the tokens defined here, follow the naming conventions. |
| `colors.md` | Components reference semantic color tokens. WCAG verification is per the audit. |
| `typography.md` | Components reference type tokens. Display sizes that step at breakpoints do so automatically. |
| `grid.md` | Components express layout in the column system. Breakpoint references go through the build pipeline. |
| `voice.md` | Visible text in components follows the voice rules. Default copy is realistic and well-written. |
| `decisions.md` | Architectural decisions about the component system live here. Changes to those decisions go through the revisit process. |
| `sandbox.md` | The build / preview / approve / promote workflow. Every component goes through it. |
| `modules.md` | Modules compose components. The component is the smaller unit. |
| `templates.md` | Templates compose modules and components. |
| `src/components/ui/README.md` | The catalog of approved components. The "what exists" reference. |

The instruction in this file says *how to think about components*. The README in `src/components/ui/` says *what components exist*. They're different concerns.
