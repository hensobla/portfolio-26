# Templates

Page-level layouts. The outermost composition that defines how modules stack into a complete page. Examples: HomeTemplate, AboutTemplate, ArticleTemplate, ProductTemplate.

## What qualifies as a template

- **Page-shaped.** A template renders a full page: header → content → footer (or whatever the project's frame is).
- **Composes modules.** A template made of bare HTML and components — without modules — is a sign the project is missing module-level abstractions.
- **Owns the page-level grid.** Templates use the grid system (`system/space.md → Grid`) for any content not delegated to a module — most commonly the article body of a content-heavy page. Modules embedded in the template bring their own internal grid containers.

## Lifecycle hooks

When a template flips `draft → approved`, no downstream consumers exist in Loomling's model (templates are page-level, nothing references them). The approval flow still confirms but skips the where-used scan from `CLAUDE.md §15`.

When the user asks to edit an already-approved template, CC follows the snapshot/revert lifecycle in `CLAUDE.md §14`: the current files (including `composition.json` for composed templates) are copied to `src/templates/<slug>/_approved/`, status flips back to `draft`, and the Sandbox surfaces a **Revert to approved** affordance.

## Two flavors

Templates come in two shapes:

1. **Hand-written templates** — authored directly by CC (or the user), with their own body markup. Example: `blog-post`. File layout:
   ```
   src/templates/<slug>/
   ├── <slug>.html       # Page markup, wrapping element gets [data-loom-template="<slug>"]
   ├── <slug>.css        # Scoped via [data-loom-template="<slug>"]
   ├── <slug>.js         # Optional (rare pre-stack)
   └── preview.html      # Standalone page rendering the template with example content
   ```
   Manifest `filePath` points at `<slug>.html`.

2. **Composed templates** — built via the Page Builder (`library/builder.html`). They don't have their own body markup; instead, they declare which modules to compose. The renderer in `preview.html` assembles them at view time via iframes, so **module changes propagate automatically** (ADR 0004). Example: `test-page`. File layout:
   ```
   src/templates/<slug>/
   ├── composition.json   # Declarative module list + slot overrides + SEO. Canonical source.
   ├── <slug>.css         # Composition-only styles (background/color, rarely more)
   └── preview.html       # Renderer: fetches composition.json, stacks module iframes
   ```
   Manifest `filePath` points at `composition.json`. There is no `<slug>.html` body fragment — composed templates have no separable body markup because the body is "this list of modules, edited live".

The two flavors coexist. Hand-written templates remain the right tool when a page is mostly bespoke; composed templates are right when a page is "stack these modules and edit their text/images". The Page Builder always produces composed templates. Use `system/page-builder.md` for the Finalize protocol that produces flavor #2.

## States

Templates support layout-shape variations:

- `default`
- `no-hero` — pages that skip the opening module
- `narrow` — for content-dominant pages with a tighter measure
- `wide` — for dashboard / media-heavy pages

State complexity at the template level is usually a sign content is leaking in. Keep template states about layout, not content shape.

## Constraint: modules only

A template that introduces a one-off section of HTML should either:

1. Promote that section to a module, or
2. Use an existing module with a custom slot fill.

If the user requests a template, CC must verify that every section maps to an existing or newly-created module. **"Build a template that only uses existing modules"** is a first-class request — CC reads `manifest.json`, filters by `category: modules` + `status: approved`, and refuses to invent new ones.

## What templates do NOT do

- Define new visual styles. Templates orchestrate; modules style.
- Fetch data pre-stack. Post-stack, the template/page receives data from the framework's data layer.
- Replicate module logic inline.

## Grid usage

A template's template-level CSS may use a grid container for content that isn't delegated to a module — e.g. centering a blog article inside an 8-of-12 column span. The grid tokens (`--grid-cols`, `--grid-gap`, `--grid-margin`, `--container-max`) come from `src/tokens.css`; the template only chooses *where* its content sits within them. See `system/space.md → Grid` for the anatomy.

For prose-dominant templates (blog post, longform), the article body should still cap its measure with `max-width: var(--measure)` for reading comfort even when the grid span is wider — typography rhythm beats grid alignment for reading width.

## Approval checklist

Before flipping a template to `approved`, CC verifies:

1. Every section maps to a module with `status: approved`.
2. Template-level CSS handles only layout/container concerns, not module visuals.
3. Declared states all render correctly.
4. Page-level accessibility passes (one `<h1>`, landmark roles, skip link, document title).
5. Performance: no module appears more than once unless intentional (e.g., two CTABanners).
6. **SEO scaffold present** (`system/seo.md`):
   - Exactly one `<h1>`; heading hierarchy doesn't skip levels in document order.
   - `<head>` carries title (50–60 chars), description (~155 chars), canonical, Open Graph, Twitter Card.
   - Schema.org JSON-LD block matching the template's content type (`BlogPosting`, `WebSite`, `Product`, etc.).
   - `<html lang="...">` declared.
   - Every `<img>` has `alt`; hero/LCP image has `fetchpriority="high"`; below-fold images use `loading="lazy"`.
   - Aspect-ratio container around each image to prevent CLS.
