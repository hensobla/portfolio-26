# templates.md

Defines what a template is, when to build one, how to build it, and how to know it's done. This file is **instructional, not cataloging**. The catalog of approved templates lives in `src/components/templates/README.md`. The build workflow lives in `sandbox.md`.

Read this file before authoring or modifying a template.

---

## What a template is

A **template** is a page-level pattern that consumes a Sanity document and renders the full page by iterating over the document's `modules` array, dispatching each module to its corresponding React module component.

Each Sanity content type that is *modular* gets one template:

- `Page` (one-off pages: about, services, landing pages) → `PageTemplate`
- `Project` (case studies) → `CaseStudyTemplate`
- Future modular content types follow the same pattern: one template per content type.

A template's job is two things, in this order:

1. **Render the page chrome.** Document head metadata (title, description, Open Graph, structured data), outer container, top-level layout, footer / prev-next navigation.
2. **Dispatch the modules.** Walk the document's `modules` array and render each module by its `_type`, passing the module's data through.

A template is **not**:

- A specific page (a specific case study consumes `CaseStudyTemplate`; the template is the page-shape, not the dish).
- A module (modules are the section-level units the template iterates).
- A small UI piece (that's a component).
- A wrapper that picks which modules to render based on hard-coded logic. The order and presence of modules is decided in Sanity, not in code. The template *renders what's there*.

The test: a template is what you reach for when a new content type is being introduced or when a content type's page-shape needs an end-to-end React presence. If you're adding a section to a single page, you're adding a module to the document in Sanity, not building a template.

---

## What makes a good template

Six properties.

### 1. One template per modular content type

The template represents the page-shape of one content type. `CaseStudyTemplate` is for `Project` documents. `PageTemplate` is for `Page` documents. They are not interchangeable.

If you find yourself adding case-study-specific behavior to `PageTemplate`, or vice versa, that's two templates, not one with conditional logic.

### 2. Renders the document, doesn't decide its shape

A template iterates the document's `modules` array in order. The order, presence, and configuration of modules is editorial — set in Sanity Studio. The template does not hard-code which modules appear or in what sequence.

The corollary: the template doesn't need conditional rendering for "optional" modules. If a module isn't in the array, it doesn't render. The Sanity editor decides what's there.

What the template *does* hard-code: the page chrome that lives outside the modules array — head metadata, top-level container, prev/next nav, footer.

### 3. Dispatches modules, doesn't recreate them

The template uses a **module renderer** (or "module dispatcher") — typically a single `<ModuleRenderer modules={doc.modules} />` component — that maps each `_type` value in the modules array to the corresponding React module from `src/components/modules/`. The dispatch table lives in one place and is the only place that knows about every module.

If a template needs a `HeroBlock`, it doesn't import `HeroBlock` directly. It iterates modules, hands each module to the renderer, and the renderer picks the right React component.

The exception is **template-internal layout markup** — the page-level wrapper, the `<main>` tag, page-level rhythm between modules. That's specific to the template and stays in the template.

### 4. Owns page-level concerns

Templates are where page-level concerns live. Modules and components don't handle these; templates do.

Specifically, a template owns:

- **The `<head>` content** — `<title>`, meta description, Open Graph tags, Twitter cards, structured data (JSON-LD). Computed from document fields per `voice.md`'s SEO section.
- **The `<main>` and other landmark elements** — the semantic page structure that screen readers and search engines rely on.
- **The outer container.** Per `grid.md`, the container stretches below xl and centers at xl+. The template applies that wrapper; modules render inside it (or break out of it explicitly via full-bleed techniques documented per-module).
- **Page-level navigation.** Prev/next links between case studies, breadcrumbs, in-page anchors / sticky table-of-contents — all template concerns.
- **Active theme.** If the template applies `[data-theme="..."]` to the page wrapper, that decision lives at the template level. Modules and components inherit.
- **Per-page-kind defaults.** A `CaseStudyTemplate` might default to past tense in `<title>` patterns (`"Configurator v3 — Hardware Commerce Case Study"`); a `PageTemplate` might use a generic `"{title} — Portfolio"` pattern. These defaults live in the template.

### 5. Receives data, doesn't fetch it

The template accepts the Sanity document (or the relevant subset of it) as a typed prop. The data fetching happens upstream — in the route file (`src/app/work/[slug]/page.tsx` for case studies, `src/app/p/[slug]/page.tsx` for pages).

```tsx
// src/app/work/[slug]/page.tsx
const project = await sanityClient.fetch(projectBySlugQuery, { slug });
return <CaseStudyTemplate doc={project} />;
```

This separation means:

- The template is testable in the library/sandbox with mock data.
- Multiple data sources (Sanity, MDX fallback, hard-coded JSON for previewing) can feed the same template.
- The template never crashes from a network or fetch error — those are handled upstream.

### 6. Survives the preview matrix at the page level

The preview matrix from `sandbox.md` applies to templates, but the conditions are page-shaped:

- **Every breakpoint.** Render the full template, not just one module at a time.
- **Every theme.** Light theme and any future themes should both render correctly end-to-end.
- **Variable module sets.** A template that supports any combination of modules should be tested with a minimal set, a maximal set, and missing-but-likely modules (e.g., a case study without an AI counterfactual section).
- **Unknown module type.** If the modules array contains a `_type` the dispatcher doesn't know about, the template should render the rest gracefully and not crash. (Typically: skip the unknown module and log in development.)
- **Long content.** A case study with extremely long text in every module. Tests cumulative layout breakage.
- **Short content.** A case study with minimal content. Tests that empty modules don't leave gaps.

Template testing is more expensive than component or module testing because the full page must render. But the page-level interactions (cumulative spacing, sticky elements, scroll behavior, head-tag correctness) only manifest at this scale.

---

## When to build a new template

Templates are the rarest pieces in the system. Build a template when:

- **A new modular content type is being introduced in Sanity.** Each modular content type gets exactly one template. The first instance defines it.
- **An existing content type is becoming modular.** When `Project` was converted to a modules array (D22), `CaseStudyTemplate` became necessary.
- **Two existing content types have diverged enough that they should be separate types.** This is rare. It's a content-modeling decision in Sanity first; the new template follows.

Don't build a template:

- **Speculatively.** A template is the most expensive piece in the system to refactor. Build only when there's a real content type that needs one.
- **For a one-off section variation.** If the variation is "this case study has a different layout for its hero," that's a new module (e.g., `HeroBlockWide` alongside `HeroBlock`), not a new template.
- **By forking.** Don't copy `CaseStudyTemplate` to make `EssayTemplate` and tweak. If essays become a content type, `EssayTemplate` is designed from first principles for what an essay is. Forking guarantees drift.

---

## Naming templates

Template names follow a clear convention:

1. **Content-type-named.** `CaseStudyTemplate`, `PageTemplate`, `EssayTemplate` (future). The name describes the Sanity content type the template consumes.
2. **The `Template` suffix is preserved.** Unlike components and modules, templates explicitly use the suffix. This is because templates are imported and used at the page-route level, where their role as *templates* is what makes them useful. `HeroBlock` doesn't need "Component" or "Module" in its name; `CaseStudyTemplate` does.
3. **PascalCase for the export, kebab-case for the file or route.** `<CaseStudyTemplate>` lives at `src/components/templates/CaseStudyTemplate.tsx`. Its preview lives at `/library/templates/case-study`.
4. **Avoid generic names.** `PageTemplate` is acceptable because `Page` is already the name of a Sanity content type — the template is named for the content type, not "every page." `MainTemplate`, `LayoutTemplate`, etc. are not.

---

## Template structure

A template file is bigger and has more concerns than a module file, but the principles are similar.

### File structure

A template file contains:

1. **Imports** — the module renderer (`ModuleRenderer`), framework primitives (`Metadata` types, `next/head` equivalents), document-head utilities. Direct module imports are rare here — the renderer holds the dispatch table.
2. **The template definition** — function that receives the Sanity document and returns the full page structure.
3. **Document head metadata** — title, meta description, Open Graph tags, JSON-LD. Either inline or via Next.js's `generateMetadata` export. Computed from the document's fields.
4. **The page layout** — `<main>`, the outer container, the modules dispatch (`<ModuleRenderer modules={doc.modules} />`), page chrome (footer nav, prev/next).
5. **Styles** — minimal at the template level. CSS Module file co-located (`CaseStudyTemplate.module.css`) for outer container, between-module spacing, page-level layout. Modules own their internal styling.
6. **A default export** — the template, named.

### Props / API surface

Templates accept the **Sanity document** as their primary input. The shape of the document is defined by the Sanity schema for the content type.

For the `Project` content type after D22:

```tsx
// Sanity types (generated from the schema or hand-written)
interface ProjectDoc {
  _id: string;
  _type: 'project';
  title: string;
  slug: { current: string };
  thumbnail?: SanityImage;
  description?: string;
  tags?: string[];
  modules: ModuleData[]; // ordered array; types defined in the modules' Sanity schemas
}

interface CaseStudyTemplateProps {
  doc: ProjectDoc;
  prevSlug?: string;
  nextSlug?: string;
}

export default function CaseStudyTemplate({ doc, prevSlug, nextSlug }: CaseStudyTemplateProps) {
  return (
    <main>
      <ModuleRenderer modules={doc.modules} />
      <PrevNextNav prev={prevSlug} next={nextSlug} />
    </main>
  );
}
```

Page-level data the template needs that *isn't* in the modules array (prev/next slugs, related-projects list, etc.) is passed as additional props. The route file fetches everything and hands it over.

The data shape is documented in the catalog README so consumers know what to provide. TypeScript types make it enforceable.

### The module renderer

The dispatch table lives in one file — typically `src/components/modules/ModuleRenderer.tsx` — and maps each Sanity `_type` to its React module:

```tsx
// src/components/modules/ModuleRenderer.tsx
import HeroBlock from './HeroBlock';
import MetricsDashboard from './MetricsDashboard';
// ...

const moduleMap: Record<string, React.ComponentType<{ data: unknown }>> = {
  heroBlock: HeroBlock,
  metricsDashboard: MetricsDashboard,
  // ...
};

export default function ModuleRenderer({ modules }: { modules: ModuleData[] }) {
  return (
    <>
      {modules.map((mod) => {
        const Component = moduleMap[mod._type];
        if (!Component) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Unknown module _type: ${mod._type}`);
          }
          return null;
        }
        return <Component key={mod._key} data={mod} />;
      })}
    </>
  );
}
```

Every module is registered here. Adding a new module to the system means: build the React component, define its Sanity schema, register it in the renderer's `moduleMap`. The catalog README entry follows.

This is also the file the template's preview in `/library/templates/case-study` uses to render mock module arrays. Same dispatch, mock data.

### Page-level metadata

Every template renders the document head. Per `voice.md`'s SEO section, this includes:

- `<title>` matching the case-study or page-kind title pattern.
- `<meta name="description">` from the document's description / SEO field.
- Open Graph tags (`og:title`, `og:description`, `og:image`).
- Twitter card tags.
- Structured data (JSON-LD) appropriate to the page kind. Case studies use `Article`. Pages use the appropriate type per content.

In Next.js App Router, this is typically done via the `generateMetadata` export on the route file, fed from the same Sanity fetch. The template doesn't render `<head>` directly, but it *owns the contract* — the route's `generateMetadata` is shaped by what the template expects.

If a document field is missing, sensible fallbacks are defined (e.g., a default OG image if the document has none). The catalog README documents what's required and what has fallbacks.

---

## Order of operations for a new template

Cascading: build the smallest pieces first, assemble upward.

1. **Sketch the page-shape.** Paper, Figma, or written outline of the modules in order, for the canonical instance of the content type.
2. **Identify the modules.** Each section of the page-shape corresponds to a module.
3. **Check the module catalog** (`src/components/modules/README.md`) for what already exists.
4. **For modules that don't exist:**
   a. Build the React component at `src/components/modules/[Name].tsx`.
   b. Define the Sanity schema at `src/sanity/schemaTypes/modules/[name].ts`.
   c. Register the schema in `src/sanity/schemaTypes/index.ts` and as an allowed module type in the relevant content type schema (e.g., `project.ts`'s `modules` array's `of: []`).
   d. Add the module to the dispatch table in `ModuleRenderer.tsx`.
   e. Approve the module per `modules.md` and `sandbox.md`. (Inside this step, components those modules need are built first — recursive but bounded.)
5. **Update or create the Sanity content type schema.** For `Project`'s modular conversion (D22), this means swapping the `body` field for a `modules` array.
6. **Build the template** at `src/components/templates/[Name]Template.tsx` using the module renderer.
7. **Wire the route.** Update or create `src/app/[route]/page.tsx` to fetch the document and render the template.
8. **Approve the template** per `sandbox.md`. Catalog entry goes in `src/components/templates/README.md`.

The order cascades: components first, then modules + Sanity schemas, then the dispatch table, then the template, then the route. This is slow but correct.

---

## Theme behavior at the template level

Templates inherit theming the same way modules and components do. They reference semantic tokens; values shift with the active theme.

The template-specific concern: **the active theme is set at the page level**, not at the module level. The template applies `[data-theme="..."]` to the page wrapper (or relies on a parent layout to do so), and every nested module and component inherits.

A template doesn't define its own theme. The theme is part of the page's identity, not the template's. A case study and an essay can both use the default theme — the template doesn't dictate it.

If a template needs to support a *theme switcher* (a UI control that lets the visitor change theme), that's a feature of the page chrome (typically the footer or a corner control), not part of the template's structural definition.

---

## Responsive behavior at the template level

Modules handle their own responsive behavior. Templates layer page-level responsive concerns on top:

- **Spacing between modules.** The vertical rhythm between modules might compress on mobile. Templates own this spacing in their CSS Module.
- **Outer container behavior.** The shift from stretch to centered at the xl breakpoint (per `grid.md`) is applied at the template level, since it's the template's outer container that holds all modules.
- **Page chrome.** Top nav, footer, sticky table-of-contents — these are template concerns and respond at the template level.
- **Module ordering on mobile.** In rare cases, the template might want to reorder modules on mobile. This is structurally awkward (the modules array is editorial) and should be avoided. If a module needs different responsive behavior, that's the module's concern; if the *order* needs to change, talk it out before doing it.

Most templates don't need much responsive logic at the template level — the modules do most of the work. But page-level rhythm and chrome are template concerns.

---

## State coverage at the template level

Templates have fewer states than modules and components, but the states they have are page-shaped:

- **Default** — fully populated document.
- **Loading** — what the page shows while data is fetching, if applicable. In Next.js App Router, this is typically `loading.tsx` at the route level rather than the template's concern.
- **Variable module sets** — documents with different module arrays. The template handles whatever the array contains.
- **Unknown module type** — graceful skip + dev-mode warning.
- **404 / not found** — when the document lookup fails. Handled at the route level via `notFound()`, not the template.
- **Print** — many pages benefit from a print stylesheet. Templates own the print layout, since the page-level structure is what changes for print.

Hover, focus, and active states don't apply at the template level (templates aren't directly interactive). But the template hosts navigation elements (prev/next, anchors) that have their own interactive states.

---

## Composition with modules

The template-module relationship is mediated by the module renderer.

### 1. Templates dispatch modules; they don't import them directly

The dispatch table in `ModuleRenderer.tsx` is the only file that imports from `src/components/modules/`. Templates import the renderer.

This produces a useful constraint: adding a module to the system happens in exactly one place that the template needs to know about (the dispatch table). The template doesn't change when modules are added or removed.

### 2. New modules + Sanity schemas are built before templates that need them

When designing a template, the modules it composes are identified first. Any module not yet in the catalog is built and approved before the template is approved.

This produces the same benefit as the module-component rule: modules built in service of one template tend to be misshapen for general use. Modules built first generalize.

### 3. The dispatch table is the integration point

The dispatch table is also where the system enforces the "every module has a Sanity schema and a React component" three-artifact rule. Adding a module to the table requires both pieces to exist. If they don't, the table won't compile.

---

## Anti-patterns

- Templates that recreate module-shaped markup inline. Use the renderer.
- Templates that import module components directly instead of going through the dispatcher.
- Templates that hard-code module ordering or hard-code which modules appear. Order and presence are editorial — set in Sanity.
- Templates that handle data fetching. Pass data in.
- Templates that include business logic (analytics, validation, complex state). Extract.
- Templates with names that describe layout (`TwoColumnTemplate`) instead of content type (`CaseStudyTemplate`).
- Forking a template to make a "new" template. Either share the template or design from scratch.
- Speculative templates. The first content type instance defines the template; build when there's a real content type that needs it.
- Approving a template without a catalog entry per `sandbox.md`.
- Templates that own theme decisions for the rest of the page. Theme is set at the page wrapper level.
- Templates that crash on unknown `_type` in the modules array. Gracefully skip.
- Templates with no fallbacks for missing optional document fields. Missing fields shouldn't break the page.

---

## When to refactor or split a template

Templates are the most expensive piece in the system to refactor, because every consuming page is affected. Refactor only when necessary:

- **A module's contract changed and the template's dispatch needs updating.** Update the renderer, not the template. The template is mostly insulated from individual module changes.
- **The template's page-shape has shifted significantly.** A case study template that's been gradually accreting page-chrome features might need a cleanup pass.
- **Two consumers (content types) use the template for genuinely different page-shapes.** Split into two templates. (This shouldn't happen if each content type has its own template — it's a sign someone reused a template across types.)
- **A token change breaks the template.** Refactor or unapprove.

Don't refactor:

- "Because it could be cleaner." Cosmetic refactors at the template level mean cosmetic changes to every page that consumes it.
- For a single new use case. Adapt the use case (add a new module, edit Sanity), or build a new template if it's a new content type. Don't bend an existing template.
- Without auditing every page that consumes the template. Refactor + regression-check is the workflow.

### Splitting signals

Splitting a template is rare because there's one template per content type. The signal that splitting is appropriate: a content type itself should be split into two content types. Once that decision is made in Sanity, the new template follows.

---

## How this file relates to others

| File | Relationship |
|---|---|
| `tokens.md` | Templates reference tokens through the modules they dispatch. Direct token use is rare at the template level. |
| `colors.md` | Templates apply theme at the page level; modules choose surfaces; semantic colors flow through. |
| `typography.md` | Templates rarely override type. Modules and components handle typography. |
| `grid.md` | Templates own the outer container and page-level spacing. Inner layout is handled by modules. |
| `voice.md` | Templates own document head metadata, including SEO copy. The voice rules apply to title, description, and structured data. |
| `decisions.md` | Architectural decisions about templates live here. D22 covers the move to modular `Project`. |
| `sandbox.md` | The build / preview / approve / promote workflow. Every template goes through it. |
| `components.md` | Templates rarely consume components directly; modules are the typical consumption layer. |
| `modules.md` | Templates dispatch modules via the renderer. Modules are the section-level unit. |
| `src/components/templates/README.md` | The catalog of approved templates. The "what exists" reference. |

The instruction in this file says *how to think about templates*. The README in `src/components/templates/` says *what templates exist*. They're different concerns.
