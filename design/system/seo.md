# SEO and page optimization

This file is the rulebook for the **structural** half of SEO — the parts that can be designed and scaffolded before content exists. Content-strategy SEO (keywords, internal linking, topical clustering, copy quality) belongs to the user when real content lands. Until then, Loomling commits to:

1. **Semantic HTML** with correct landmark structure.
2. **Proper heading hierarchy** in every template.
3. **A full `<head>` scaffold** on every template with placeholders the user fills in.
4. **Structured data (JSON-LD)** stub per template, matching its content type.
5. **Image discipline** — alt text, intrinsic dimensions, loading priority.
6. **A performance baseline** that protects Core Web Vitals out of the box.

Everything below is enforced via the approval checklists in `system/templates.md` and `system/modules.md`. Anything that requires routing, server rendering, or build tooling (sitemap, robots.txt, image conversion, head-injection wiring) is deferred to the stack-declaration runbook in `.loomling/prompts/stack-declaration.md`.

---

## 1. Heading hierarchy

A correct page has **exactly one `<h1>`** — the page's primary subject — followed by `<h2>` for major sections, `<h3>` for sub-sections, and so on without skipping levels. Screen readers, search engines, and AI crawlers all use this outline.

### Rules

- One `<h1>` per page. Never zero. Never two.
- Levels don't skip. After `<h1>` you may use `<h2>`. Not `<h3>`.
- Headings are for outline, not visual weight. If you want big text, use a typography token (`--type-display-xl`, etc.) on a non-heading element.
- A module's headline element should be chosen for its **role on the page**, not its appearance. The hero's headline is `<h1>` when the hero is the page's primary module (homepage); `<h2>` when the hero sits inside an article (intro to a section). When a module can be used in both roles, expose the level as a slot or a `data-heading-level` attribute.

### What lives at which level — typical patterns

| Page type | h1 | h2 | h3 |
|---|---|---|---|
| Homepage | Hero headline | Section block titles ("Features", "Pricing") | Subsection or card titles inside a section |
| Blog post | Post title | In-body section breaks | Sub-sections within a body section |
| Product page | Product name | "Specs", "Reviews", "Related" | Spec groups, review items |
| About page | About headline | "Mission", "Team", "Contact" | Team subgroups |

### Footer caveat

Footer column titles ("Product", "Company", "Resources") are heading-level content. They should be **`<h2>`** when there's no other h2 between the page's h1 and the footer, otherwise the page jumps from h1 → h3 and breaks the outline. In Loomling's current modules, the footer module uses `<h2>` for column titles for exactly this reason.

### Approval gate

A template's approval checklist (`system/templates.md`) requires:
- Exactly one `<h1>` in the rendered DOM.
- No level skips between any consecutive headings in document order.

Tooling check (post-stack): `axe-core` or `pa11y` catches this automatically.

### Auto-assigned heading levels (composed templates)

Modules can declare in their manifest that they emit a primary heading:

```json
"headings": [
  { "slot": "headline", "role": "primary" }
]
```

When that module is used in a **composed template** (Page Builder output, ADR 0004), the composing layer — both the live composed template's `preview.html` renderer and the Page Builder canvas — walks the composition in order and assigns each primary-heading module the next level (1, 2, 3, ...). The level is delivered to the module's iframe as the reserved key `_heading-level` in the standard `loom:content` postMessage. The module's renderer reads it and emits `<h1>` through `<h6>` accordingly.

The result: a designer adds a hero to a page and gets `<h1>`. They add a second hero below and the second one becomes `<h2>` automatically. They never have to pick or know. This implements the core principle in `CLAUDE.md §16`.

Modules whose heading is intrinsically subordinate (e.g., a "feature card" inside a "feature grid") declare `role: "secondary"` and receive `primaryCount + 1` so they always sit one level below the most recent primary.

Hand-written templates (e.g., `blog-post`) don't use this mechanism — the template author writes the correct heading tags directly because they have full context.

### Heading-level fallbacks

When a module runs **standalone** (Sandbox view, not embedded in a composition), no composing layer pushes a level. The module falls back to a sensible default for its named role — e.g., `homepage-hero` defaults to `<h1>` because "Homepage hero" implies primary placement. The default is wrong only in composition contexts where the system corrects it automatically.

---

## 2. Document head metadata

Every page in a Loomling project carries the same shape of `<head>`. The values are content-dependent; the **shape** is scaffold-able.

### Required minimum (pre-content stub)

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Page-specific. Title is ~50–60 characters; description ~150–160. -->
  <title>%TITLE% — %SITE_NAME%</title>
  <meta name="description" content="%DESCRIPTION%">
  <link rel="canonical" href="%CANONICAL_URL%">

  <!-- Open Graph (Facebook, LinkedIn, Slack, iMessage previews) -->
  <meta property="og:type" content="%OG_TYPE%">           <!-- website / article / product -->
  <meta property="og:title" content="%TITLE%">
  <meta property="og:description" content="%DESCRIPTION%">
  <meta property="og:url" content="%CANONICAL_URL%">
  <meta property="og:image" content="%OG_IMAGE_URL%">     <!-- 1200×630 ideal -->
  <meta property="og:site_name" content="%SITE_NAME%">

  <!-- Twitter Card (X) -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="%TITLE%">
  <meta name="twitter:description" content="%DESCRIPTION%">
  <meta name="twitter:image" content="%OG_IMAGE_URL%">

  <!-- Stylesheets, JSON-LD, etc. -->
</head>
```

### Don't forget

The `<html>` tag itself must declare a language:

```html
<html lang="en">
```

Without it, screen readers don't know how to pronounce the page, and search engines don't know which locale results to surface it for.

### Field sizing

- **`<title>`** — 50–60 visible characters. Google truncates around 580px width, which is ~60 chars in most fonts. The site name suffix counts.
- **`description`** — 150–160 chars. Google's snippet line truncates around there.
- **`og:image` / `twitter:image`** — at least 1200×630px (LinkedIn requires 1200×627+). Save as JPEG or PNG; under 5MB.

### Where head metadata lives

- **Pre-stack** — each template's `preview.html` carries the scaffold with placeholder values (the section below has a worked example). The user replaces `%TITLE%`-style placeholders manually.
- **Post-stack** — the framework's head-injection mechanism takes over (`<Head>` in Next.js, `<MetaTags>` or front-matter in Astro, `<svelte:head>` in SvelteKit). The stack-declaration runbook handles migrating placeholder values into the framework's metadata API.

---

## 3. Structured data (JSON-LD)

Schema.org markup gives search engines and AI crawlers explicit type information. It produces rich results (recipe cards, FAQ accordions, breadcrumbs in search) and improves machine understanding. JSON-LD is the recommended format — it sits in the head as a `<script type="application/ld+json">` block and doesn't touch markup.

### Pick a type per template

| Template intent | Schema.org type |
|---|---|
| Homepage | `WebSite` + sitewide `Organization` |
| Article / blog post | `BlogPosting` (or `NewsArticle` for news) |
| Product page | `Product` (+ `Offer`) |
| FAQ | `FAQPage` |
| How-to | `HowTo` |
| Recipe | `Recipe` |
| Event | `Event` |
| Person bio | `Person` |
| Local business | `LocalBusiness` |
| Nested route | `BreadcrumbList` (in addition to the primary type) |

### Example: `BlogPosting` (matches the blog-post template)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "%TITLE%",
  "description": "%DESCRIPTION%",
  "image": "%COVER_IMAGE_URL%",
  "datePublished": "%ISO_DATE%",
  "dateModified": "%ISO_DATE%",
  "author": {
    "@type": "Person",
    "name": "%AUTHOR_NAME%",
    "url": "%AUTHOR_URL%"
  },
  "publisher": {
    "@type": "Organization",
    "name": "%SITE_NAME%",
    "logo": {
      "@type": "ImageObject",
      "url": "%LOGO_URL%"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "%CANONICAL_URL%"
  }
}
</script>
```

### Example: `WebSite` + `Organization` (for the homepage)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "%SITE_NAME%",
  "url": "%SITE_URL%",
  "publisher": {
    "@type": "Organization",
    "name": "%SITE_NAME%",
    "logo": {
      "@type": "ImageObject",
      "url": "%LOGO_URL%"
    }
  }
}
</script>
```

### Validation

The user can paste a rendered page into [Google's Rich Results Test](https://search.google.com/test/rich-results) or [Schema.org validator](https://validator.schema.org/) to confirm the JSON-LD parses cleanly. Both also report warnings (e.g. missing optional fields that unlock richer results).

---

## 4. Semantic HTML landmarks

Each page should declare:

- `<header>` — site or page header (logo, top nav).
- `<nav>` — primary nav with `aria-label="Primary"`.
- `<main>` — the page's main content (exactly one per page; some screen readers use it as a "skip to content" target).
- `<article>` — for self-contained pieces (a blog post, a product card, a comment).
- `<aside>` — for tangential content (sidebar, related posts).
- `<footer>` — site footer.

Loomling's existing modules already use these. Avoid `<div>` when a landmark element is correct.

### Skip-to-content link

Every template should ship with a skip link as the first focusable element in the page:

```html
<a href="#main-content" class="sr-only sr-only-focusable">Skip to content</a>
...
<main id="main-content">…</main>
```

It's invisible until focused, then appears for keyboard users to bypass the nav.

---

## 5. Image discipline

Every `<img>` in a Loomling Element must:

1. **Have `alt`.** Always present. Use a descriptive sentence for content images. Use `alt=""` only for purely decorative images that convey no information.
2. **Live inside an aspect-ratio container.** Use `aspect-ratio: w / h` on the wrapper to reserve layout space before the image loads. Prevents Cumulative Layout Shift (CLS). Loomling's hero and blog cover already do this.
3. **Set `loading="lazy"`** on images below the fold. Browsers defer the network request until the user scrolls near them.
4. **Set `fetchpriority="high"`** on the hero / LCP image so the browser pulls it first. There should be at most one per page.

### Alt text patterns

- **Content image** (depicts something meaningful) → describe what's depicted: `alt="Designer reviewing component variants on a whiteboard"`.
- **Decorative image** (background flourish, divider) → `alt=""`. Empty string. Not missing — explicitly empty.
- **Image-of-text** (logo, illustrated headline) → describe the text: `alt="Loomling"`.
- **Functional image** (icon inside a link or button without other text) → describe the action: `alt="Open menu"`.

### Empty / placeholder state

Image slots often render before the user has provided a real source (a freshly-built module, a `with-cover` state shown empty, a Page Builder export with `%LOCAL_IMAGE%`). The system replaces the browser's broken-image marker with a quiet "no image" placeholder: a panel-grey backdrop with a centered icon.

To opt a module's image into the placeholder, declare `data-loom-slot="<id>"` on the `<img>` tag. The CSS lives in `src/tokens.css` under "Image placeholder" and matches:

- `img[data-loom-slot][src=""]`
- `img[data-loom-slot][src^="%"]`
- `img[data-loom-slot]:not([src])`

When any of these match, `content: url(...)` swaps the rendered content to a small SVG icon, and `object-fit: scale-down` keeps the icon at intrinsic size regardless of the surrounding aspect-ratio container. Modules don't need any per-piece CSS for this — declaring the slot is enough.

Real images (a real URL or `data:` URL) render normally; the placeholder rule doesn't fire.

### Modern formats

Pre-stack: use whatever the user uploads. Post-stack: the stack-declaration runbook adds a step for an image optimization pipeline (Astro `<Image>`, Next.js `<Image>`, sharp/squoosh) to serve AVIF/WebP with fallbacks.

---

## 6. Performance baseline (Core Web Vitals)

Google ranks pages partly on three real-user metrics. Loomling's defaults target the "good" thresholds.

| Metric | What it measures | "Good" threshold |
|---|---|---|
| **LCP** (Largest Contentful Paint) | When the main hero element finishes painting | ≤ 2.5s |
| **CLS** (Cumulative Layout Shift) | Unexpected layout shifts during load | ≤ 0.1 |
| **INP** (Interaction to Next Paint) | Latency of user interactions | ≤ 200ms |

### What Loomling does to protect them

- **LCP** — hero images get `fetchpriority="high"`. Templates `<link rel="preload">` the hero image when its URL is known at build time (post-stack concern). Web fonts use `font-display: swap` to avoid invisible-text waiting.
- **CLS** — every image lives in an aspect-ratio container. The sandbox preview also pre-sizes its iframes via `ResizeObserver` to avoid layout jitter while content loads.
- **INP** — no module ships heavy JS by default. Interactive components (when needed) keep handlers minimal and avoid layout thrash.

### Font-loading default

When the init interview sets a project font, the `@font-face` declaration should include `font-display: swap` so text is visible immediately in a fallback font, then swaps to the project font when loaded:

```css
@font-face {
  font-family: "ProjectFont";
  src: url("...") format("woff2");
  font-display: swap;
}
```

### What's deferred to post-stack

- Asset bundling / minification — needs a build tool.
- Image format conversion (webp / avif) — needs a build pipeline.
- Resource hints beyond `<link rel="preload">` (preconnect, prefetch) — most useful with known routes.
- Server-side rendering / streaming — framework-specific.

---

## 7. Per-template head scaffolds (reference)

When CC builds a new template, the template's `preview.html` should include a full head matching the template's content type. Copy from one of the worked examples:

- **Article-style page** (blog post, essay, longform): see [src/templates/blog-post/preview.html](../src/templates/blog-post/preview.html) — uses `og:type="article"` and JSON-LD `BlogPosting`.
- **Homepage**: `og:type="website"`, JSON-LD `WebSite` + sitewide `Organization`.
- **Product page**: `og:type="product"` (yes, that's the correct value despite not being in the OG core spec — Facebook accepts it), JSON-LD `Product`.

Placeholder values use `%UPPER_SNAKE%` form (e.g. `%TITLE%`, `%CANONICAL_URL%`) so they're greppable and obvious to fill.

---

## 8. Post-stack additions (deferred until the user picks a stack)

The stack-declaration runbook will add:

1. **`robots.txt`** at site root, with `User-agent` rules and `Sitemap:` line.
2. **`sitemap.xml`** generated at build from the framework's routing.
3. **Head metadata pipeline** — converting the placeholder values from each template's preview.html into the framework's metadata API (e.g. `export const metadata = {…}` in Next.js, `<svelte:head>` in SvelteKit).
4. **Image optimization** — automated AVIF/WebP conversion + responsive `srcset` generation.
5. **Resource hints** — `preconnect` to known third-party origins (analytics, CDN), `prefetch` for likely-next pages.
6. **Lighthouse CI** (optional) — surface regressions in any of LCP/CLS/INP on PR.

These are tracked in `.loomling/prompts/stack-declaration.md` and CC will surface them when the user declares a stack.

---

## 9. Drift behavior

If the user requests a markup pattern that violates a rule here (e.g. "use h3 for the title because it looks right"), CC follows the standard drift protocol (CLAUDE.md §5): name the conflict, offer (A) abide / (B) extend / (C) amend. SEO rules are *not* a special case like accessibility — but reflexively explain the cost of violation (search ranking, screen reader confusion, social preview misrendering) before complying.
