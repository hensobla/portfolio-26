# modules.md

Defines what a module is, when to build one, how to build it, and how to know it's done. This file is **instructional, not cataloging**. The catalog of approved modules lives in `src/components/modules/README.md`. The build workflow lives in `sandbox.md`.

Read this file before authoring or modifying a module.

---

## What a module is

A **module** is a section-level pattern. It composes components and layout into a self-contained block of meaning. Examples of the shape:

- A hero block at the top of a case study.
- A metrics dashboard with a head and a row of metric cards.
- A variants comparison grid with three variant cards side by side.
- A roads-not-taken section with a head and three alternative entries.
- A cross-functional partners table.
- A pull-quote callout section.

A module is the unit a page or a template **assembles**. If a case study were a sentence, components would be words and modules would be clauses.

A module is **not**:

- A small reusable piece (that's a component).
- A whole page (that's a template).
- A one-off section that exists in exactly one place (that's not a module yet — see *When to promote a section to a module* below).
- A wrapper around a single component (if a section is "just a metric card with a heading," promote the heading into the component or compose them inline).

The test: a module is something you'd reach for by name when assembling a template. If you wouldn't, it's probably not a module.

---

## What makes a good module

Seven properties. A module that meets all seven is a good module.

### 1. Single section role

The module represents one section of meaning. A hero introduces the work. A metrics dashboard summarizes outcomes. A roads-not-taken section captures alternatives.

If a module is doing two things ("hero + first content section"), split it. The boundary between modules is the boundary between sections.

### 2. Self-contained

The module renders correctly without context. Drop it into an empty page and it should work. Spacing, padding, internal layout, and breakpoint behavior are defined by the module itself, not by the parent.

This means:

- The module owns its outer padding (typically section-level: `48–88px` vertical at desktop per `grid.md`'s spacing patterns, scaling down at smaller breakpoints).
- The module owns its background color choice (paper, panel, ink, primary, data, depending on the module's role).
- The module owns its internal grid behavior, including any breakouts to viewport edges if the module is full-bleed.

### 3. Composes components, doesn't recreate them

A module is built from components, not from raw markup. If the module needs a metric card, it imports `MetricCard`, not redefining one inline. If a needed component doesn't exist yet, build the component first per `components.md`, then assemble it into the module.

The exception is **module-internal layout markup** (the section's grid, its head/body structure, its dividers). That layout doesn't need to be its own component because it's specific to this module.

The test: if the same kind of card appears in two modules, that's a component. If a layout pattern (head + body + footer with a specific border treatment) appears in only one module, that's part of the module.

### 4. Token-driven and grid-aware

Like components, modules reference tokens for everything visible. But modules also reference the **grid system** for layout: column counts at each breakpoint, gutter widths, container behavior.

- Use the project's `.grid` class (or equivalent) for the column system.
- Express internal layouts in column spans, not pixel widths.
- Respect the container's stretch / center transition at the xl breakpoint.
- Full-bleed modules (those that break out of the container, like the metrics dashboard or the dark roads section) do so explicitly via negative-margin or full-width techniques, documented in the module's catalog entry.

### 5. Has clear top and bottom edges

Modules stack vertically on a page. Each module has a clear visual boundary above and below — usually a 2px ink border, a color shift (dark module on light page), or generous whitespace.

The module owns its top and bottom edges. It doesn't depend on the next module to "draw the line between us."

When two modules abut, the top border of one and the bottom border of the other should not double-up into a 4px line. Check this in the sandbox by previewing modules with their immediate neighbors.

### 6. Responsive at the section level, not just the component level

Components handle their own responsive behavior. Modules layer additional responsive logic on top, governing how the section's structure shifts:

- A two-column module on desktop becomes single-column on mobile.
- A four-card grid becomes a two-card grid then a one-card stack.
- Vertical padding compresses at smaller breakpoints.
- Section-level decorative elements (large background numerals, asymmetric layouts) collapse or simplify on mobile.

A module that "doesn't respond" — that just shrinks proportionally — is usually wrong on mobile. Real responsive design at the section level often requires structural shifts, not just scaling.

### 7. Survives the preview matrix

Same rule as components, with the same conditions documented in `sandbox.md` *Preview*: every breakpoint, every theme, every state, with long content, with empty content. Modules tend to fail at scale: a hero with an absurdly long project name, a metrics dashboard with seven metric cards instead of four, a variants grid with two variants instead of three.

The preview matrix forces these failure modes visible. A module that only works with the canonical content it was designed for is incomplete.

---

## When to promote a section to a module

The rule of three from `components.md` applies, with one adjustment: **modules generalize less easily than components**. A pattern that looks like a module across three case studies might actually be three different modules with similar visual rhythm.

The promotion process:

1. Build the section inline the first time. Don't generalize.
2. The second time a similar section appears, copy the markup to the new case study. Note what's different.
3. The third time, before extracting, ask three questions:
   - **Is the structural pattern the same?** (head + body + footer; or head + grid; or full-bleed brand surface with centered content.)
   - **Is the role the same?** (Both are introducing the case study, both are summarizing outcomes, both are walking alternatives.)
   - **Are the components the same?** (All three use the metric card, or all three use the attribution row.)
4. If all three answers are yes, extract the module. If any one is no, the three uses might be three different modules.

**The exception:** some modules are obviously systemic from the first use (a hero block, a footer, a section divider). Build them as modules immediately. Use judgment.

**The reverse exception:** some patterns look reusable but resist a clean API. A module with conditional rendering branches for "with metrics" vs "without metrics" vs "with quote pull-out" is doing too much. Three smaller modules are usually cleaner than one configurable module.

---

## Naming modules

Module names follow a slightly different convention from components, because modules describe sections rather than primitives.

1. **Section-role-named.** The name describes the section's role. `HeroBlock`, `MetricsDashboard`, `RoadsNotTaken`, `CrossFunctionalTable`, `PullQuoteCallout`.
2. **Often two-word compound names.** Components are often single words (`Eyebrow`, `Tag`, `Button`); modules are usually compounds because they describe a more complex role.
3. **PascalCase for the export, kebab-case for the file or route.** `<HeroBlock>` lives at `src/components/modules/HeroBlock.tsx`, previews at `/library/modules/hero-block`. The module's Sanity schema lives alongside at `src/sanity/schemaTypes/modules/heroBlock.ts` (camelCase, matching Sanity convention).
4. **Avoid generic names.** `Section` is too generic. Even `HeroSection` is weaker than `HeroBlock` (every page has hero-shaped content; the question is what kind of hero).
5. **Avoid layout-shape names.** `ThreeColumnGrid` describes the layout, not the role. `VariantsComparison` describes what's being shown.

---

## Module structure

A module file follows a consistent shape. As with components, specifics depend on stack; principles below are stack-agnostic.

### File structure

A module file contains:

1. **Imports** — design tokens, components from `src/components/ui/`, framework primitives.
2. **The module definition** — function or class that receives props (often minimal) and returns the rendered section.
3. **Styles** — co-located, scoped to the module.
4. **A default export** — the module itself, named.

### Props / API surface

Modules typically have **smaller** API surfaces than components, because they're meant to be assembled into a specific narrative. A hero block doesn't need 12 configurable variants — it has one job per case study.

Most modules accept:

- **Content props** — the actual text, numbers, and references the module displays. (A hero block takes a `projectName`, `lede`, `metricValue`, `metricLabel`, etc.)
- **Slot props** — for places where a consumer needs to pass in a child component (e.g., a "metric badge" slot in a hero block that accepts any `MetricCard`-shaped content).
- **Almost no variant props.** Modules typically have one canonical layout. If you find yourself adding variants, ask whether you're conflating two different modules.

The component-level principle (composition over configuration) applies even more strongly at the module level. A module with a 15-prop API is almost always two or three modules in a trench coat.

### Slot patterns

Modules often need to accept arbitrary content in defined places. Two patterns:

**Children prop** — when the slot is the module's main content area:

```tsx
<HeroBlock projectName="Configurator v3">
  <MetricCard value="+18%" label="CVR" />
</HeroBlock>
```

**Named slots** — when the module has multiple independently-controlled regions:

```tsx
<MetricsDashboard
  head={<SectionHead num="03" title="Headline numbers" />}
  metrics={[
    <MetricCard ... />,
    <MetricCard ... />,
    ...
  ]}
/>
```

Choose based on how much structure the module imposes. A hero block has a defined main slot, so children works. A metrics dashboard has a head, a body grid, and an optional footer, so named slots are clearer.

### What modules should NOT contain

- **Page-level concerns.** Routing, page transitions, document-head metadata. Those belong in templates or pages.
- **Cross-section state.** A module doesn't know what's above or below it. If two modules need to coordinate, that's a template's job.
- **Data fetching.** Modules receive data via props. The fetching happens at the page or template level.
- **Heavy business logic.** A module's logic is typically just rendering. Calculations, validations, analytics calls — extract.

---

## Light/dark and theme behavior

Modules inherit theming from the token system, same as components. They do not implement theme switching internally.

The wrinkle for modules: **modules often choose their surface color** (paper, panel, ink, primary, data) as part of their design. A "dark roads" module is intentionally on `--ink`. A "metrics dashboard" is intentionally on `--data`. These are design decisions, not theme decisions.

When the system's theme changes (light to dark, for instance), the **token values** shift. The module's surface choice (e.g., `--ink`) stays the same. Whatever `--ink` resolves to in the active theme is what gets rendered.

This means a module rendered in a "monochrome" theme might look dramatically different from the same module in the default theme — which is correct. Theme is the system's voice; the module follows.

---

## Responsive behavior

Per `grid.md`, the grid system has six breakpoints with column counts of 4 / 4 / 8 / 12 / 12 / 12. Modules respond at the section level. The patterns:

- **Layout collapse.** A three-column variants grid at lg becomes single-column at xs. The module defines this transition, not the components inside it.
- **Padding compression.** Vertical padding that's `64px` at desktop drops to `40px` at mobile.
- **Decorative simplification.** A module's decorative elements (large numbers, asymmetric layouts) often need to be removed or simplified at mobile, not just scaled.
- **Content reordering.** Sometimes the order content appears at mobile differs from desktop. CSS grid's `order` and `grid-area` are the right tools.
- **Full-bleed adjustments.** If a module is full-bleed (extends to viewport edges), the negative margin or width technique it uses needs to work at every breakpoint.

The sandbox preview at every breakpoint is non-negotiable. Modules tend to fail responsive testing harder than components do, because they have more structure to break.

---

## State coverage

Modules have fewer interactive states than components but more **content states**. The states a module might have:

- **Default** — canonical content, fully populated.
- **Empty** — what the module shows when its data is incomplete (e.g., a metrics dashboard with no metrics yet).
- **Long content** — absurdly long titles, descriptions, or values. Tests truncation, wrapping, layout-collapse.
- **Short content** — minimal text. Tests whether the module looks intentional with little to render.
- **Variable content count** — a metrics dashboard with 1, 2, 4, or 7 metric cards. Tests the layout's flexibility.

Most modules don't have hover/focus/active states (they're not interactive surfaces). But modules that contain interactive elements (a "next module" footer with prev/next links, an expandable section) inherit those concerns.

---

## Composition with components

The relationship between modules and components is the load-bearing structural choice for the system's UI. Two rules:

### 1. Modules use components by import, never by recreation

If a module needs a metric card, it imports `MetricCard`. It does not write its own metric-card-shaped markup inline. If `MetricCard` doesn't exist yet, build it first.

The cost of re-creation isn't visible immediately. It shows up when the metric card design changes — suddenly there are eight versions in eight modules and they've all drifted.

### 2. New components are built before new modules need them

When designing a module, the components it uses are identified first. Any component that doesn't exist yet gets built and approved before the module is approved.

This sounds rigid but it's mechanically simpler than the alternative. If you build a module first and "extract" the components later, you end up with components shaped weirdly to fit the one module they were extracted from. Building the components first produces components that generalize.

The order of operations:

1. Sketch the module (paper, Figma, or a rough sandbox draft).
2. Identify the components needed.
3. Check the component catalog (`src/components/ui/README.md`) for what already exists.
4. For components that don't exist: build and approve them per `components.md` and `sandbox.md`.
5. Build the module using the now-existing components.
6. Approve the module per `sandbox.md`.

---

## Anti-patterns

- Modules that recreate component-shaped markup inline. Use components.
- Modules with 12-prop APIs. Compose smaller pieces or split into multiple modules.
- Modules that depend on a specific parent (e.g., "this only works as the third module in a case study").
- Modules with hard-coded colors, breakpoints, or font sizes. Use tokens.
- Modules that only work with their canonical content. Test edge content.
- Modules that fight the grid (e.g., custom column systems that diverge from the system's 4/8/12). Use the grid system.
- Modules that handle data fetching, routing, or cross-section state. Out of scope.
- Modules with names that describe layout (`ThreeColumnSection`) instead of role (`VariantsComparison`).
- "Configurable" modules that branch into wildly different layouts via props. Those are different modules.
- Approving a module without a catalog entry per `sandbox.md`.

---

## When to refactor or split a module

Modules age and grow. When refactoring becomes worthwhile:

- **The module has accumulated variants until it's no longer one thing.** Split into two or three smaller modules.
- **A new component supersedes one the module uses.** Migrate the consumption.
- **The module's role has shifted.** A "metrics dashboard" that's now being used to display non-metric content might need renaming or splitting.
- **Token changes break it.** Refactor or unapprove per `sandbox.md`.

Don't refactor:

- "Because it could be cleaner." Cosmetic refactors compound.
- To match a pattern that just one other module uses. Wait for the pattern to establish.
- Without checking which templates consume the module. Refactoring without consumer audit is regression risk.

### Splitting signals

A module is probably ready to split when:

- Its API has more than ~6 props.
- It has more than two structural variants (e.g., "with-quote" / "without-quote" / "with-image-instead-of-quote").
- Different consumers use it for different roles (one template uses it as a hero, another as a divider — those are not the same module).
- Its responsive behavior has multiple branching cases.

When splitting, the new modules are named for their actual roles (not as "Module-A" and "Module-B"). Avoid generic split names; the new names should make the original module's overload visible in retrospect.

---

## How this file relates to others

| File | Relationship |
|---|---|
| `tokens.md` | Modules reference the tokens defined here, follow naming conventions. |
| `colors.md` | Modules choose their surface from semantic color tokens. WCAG verification per the audit. |
| `typography.md` | Modules reference type tokens. Display sizes that step at breakpoints do so automatically. |
| `grid.md` | Modules use the grid system for internal layout. Full-bleed breakouts are explicit. |
| `voice.md` | Visible text follows voice rules. Default copy is realistic. |
| `decisions.md` | Architectural decisions about the module system live here. Changes go through revisit. |
| `sandbox.md` | The build / preview / approve / promote workflow. Every module goes through it. |
| `components.md` | Modules compose components. Components are the smaller unit. |
| `templates.md` | Templates compose modules. Modules are the section-level unit assembled into pages. |
| `src/components/modules/README.md` | The catalog of approved modules. The "what exists" reference. |

The instruction in this file says *how to think about modules*. The README in `src/components/modules/` says *what modules exist*. They're different concerns.
