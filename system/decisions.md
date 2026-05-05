# decisions.md

The archive of choices the design system has made. Each decision answers a question of the form "we considered X, Y, and Z; we picked one; here's why." This file exists to prevent re-litigation. When a future change wants to revisit a decision, the rationale is here.

This file is also the home for **design principles** — higher-altitude ideas that shape how individual decisions get made. Principles come first because they're the lens through which the rest is read.

For the rules, see `tokens.md`. For values, see the relevant domain file (`colors.md`, `typography.md`, etc.). This file says *why*.

---

## How to read this file

Two parts:

1. **Principles** — short, declarative, applicable across the whole system. About a dozen.
2. **Decisions log** — specific choices made about specific token systems, with light summaries up top and full narratives below.

The decisions log has two layers:

- **Index** — a table of every decision with a one-sentence summary. Skim this first. If a decision is relevant, jump to its section.
- **Entries** — the narrative deep-dives. Each one is 2–4 paragraphs explaining what was decided, what was rejected, and why.

The index is meant to be useful when you (or Claude Code) need to know if a decision exists without reading the whole file. The entries are for when you actually need to understand the reasoning.

---

# Part 1: Principles

The principles below are the lens. They answer the question *what is this system trying to be?* Every decision in Part 2 traces back to one or more of these.

## P1. Edit, don't accumulate.

The system is built by removing, not adding. Every token, every component, every rule earns its place by being used in three or more places, defended in writing, and not duplicating something that already exists. The bar for adding is high. The bar for cutting is lower.

This principle exists because the failure mode of design systems is bloat. A system with 200 tokens nobody uses is worse than one with 30 tokens everyone uses. The discipline is to resist the impulse to systematize prematurely.

## P2. The medium is the proof.

The portfolio is itself a designed product. The system documents are themselves an artifact of the practitioner's thinking. Each piece of the system holds itself to the same bar it imposes on the work it produces. This is non-negotiable: a design system that has documentation drift, inconsistent naming, or unused tokens demonstrates the opposite of what it claims to be teaching.

## P3. Components reference semantics. Semantics reference primitives.

Two-tier architecture is the load-bearing structural choice. Components never reference primitives directly. Semantics never embed raw values. This rule is what makes themes possible, what makes refactors safe, and what makes the system survive change.

When this rule is broken, the system stops being a system. It becomes a pile of CSS.

## P4. Role names describe what something does, not what it looks like.

Semantic tokens are named by role: `--paper`, `--ink`, `--primary`, `--data`. Primitive tokens are named by appearance because at the primitive layer there is no role yet — the color *is* its appearance. This split is intentional. The naming layer where role exists is the layer where role names belong.

This principle protects the system from the failure mode where every theme requires renaming all the components. If `--primary` becomes blue in a future theme, components don't change. They still reference `--primary`. The visual identity shifts; the architecture doesn't.

## P5. Spacing is observed, not prescribed.

Most systems tokenize spacing aggressively (`--space-1`, `--space-2`, etc.). This system documents spacing patterns descriptively in `grid.md` but does not tokenize them. The reason: spacing is structural, owned by the grid and individual components. A global spacing scale would either be too generic to be useful or too specific to allow design judgment.

If a future need pushes spacing into the token layer (e.g., a "compact" theme that ships shrunk padding everywhere), the addition is a system-level decision. Until then, spacing stays a per-component design call.

## P6. The system feels printed, not screen-default.

This is the visual identity principle. Pure black (`#000`) and pure white (`#FFF`) are not used. Hard 2px borders are part of the visual language. The neutral scale is warm-tinted, not cool. The display typeface is a geometric sans tuned for impact. The mono is used for labels and metadata, not for code.

These choices echo Massimo Vignelli's editorial design lineage. The system is about confidence, structure, and clarity. Not soft, not playful, not experimental.

## P7. Mobile-first is a default, not a workflow.

The CSS is written mobile-first. Every component renders correctly at the smallest breakpoint and adds complexity at larger widths. This is not because mobile is the primary use case (most portfolio readers are on desktop), but because mobile-first CSS is more constrained, harder to break, and easier to extend.

The principle: design at the constraint, then expand. Designs that scale up from mobile to desktop almost always read as more disciplined than designs that scale down.

## P8. AI is amplification, not automation.

The portfolio is being built with significant AI assistance. The system embraces this — the cold start, the boilerplate, the first drafts of repetitive content. But the taste calls, the editorial judgment, the refusals, and the load-bearing decisions stay with the designer.

This principle shapes voice (the avoid-list catches AI-shaped clichés like "AI-powered"), it shapes process (CC reads the docs, doesn't author them), and it shapes positioning (the portfolio's stated thesis is that AI raises the floor and craft is the differentiator).

## P9. Brevity is a feature.

Long documentation gets ignored. Long case studies get skimmed. Long sentences hide weak thinking. Wherever possible, the system prefers concision over completeness. Tables over prose. One sharp opinion over three soft ones. A 6-minute case study with substance over a 14-minute one without.

This is why every domain file has its core values in a table near the top and narrative explanation below. The reader who needs the value gets it in two seconds. The reader who needs the reasoning reads further.

## P10. Drift is the failure mode.

Every rule in the system exists because of drift. Cross-file dependencies exist because changing breakpoints in one file breaks typography in another. Anti-pattern lists exist because without them, components reach for primitives directly. Maintenance procedures exist because spec and runtime drift apart fast otherwise.

The principle: if a rule isn't actively preventing drift, it's overhead. Cut it. If drift is happening anyway, the rule isn't strict enough or the propagation isn't documented.

## P11. The system holds, or it doesn't.

There is no "mostly using the system." Either components reference tokens, or they don't. Either the foreground pairing is canonical, or it's improvised. Either the breakpoint scale is canonical, or it has off-ramps.

This sounds rigid. It is. The alternative — a system with exceptions — is what produces design debt. Exceptions create precedent, precedent compounds, and within a year there's no system, just a folder of `.md` files that describe how things used to work.

The principle: enforce strictly, edit deliberately, evolve carefully.

---

# Part 2: Decisions log

Specific choices made about specific parts of the system. Index first, narratives below.

## Index

| ID | Decision | Status | Domain |
|---|---|---|---|
| D1 | Two-tier token architecture (primitives + semantics) | Locked | Cross-cutting |
| D2 | Hue-named primitives, role-named semantics | Locked | `tokens.md`, `colors.md` |
| D3 | Three primitive color scales (neutral, red, yellow) | Locked | `colors.md` |
| D4 | Eleven-step density (50–950) for all color scales | Locked | `colors.md` |
| D5 | Yellow scale anchored at step 400, not 500 | Locked | `colors.md` |
| D6 | No alpha primitives | Reversed (Stable) | `colors.md` |
| D7 | Pure black/white not used; near-black/near-white instead | Locked | `colors.md` |
| D8 | Spacing not tokenized | Locked | `grid.md` |
| D9 | Six breakpoints, mobile-first, named xs through 2xl | Locked | `grid.md` |
| D10 | Column counts: 4/4/8/12/12/12 across breakpoints | Locked | `grid.md` |
| D11 | Container stretches below xl, centers at xl and above | Locked | `grid.md` |
| D12 | Three font families (display / body / mono), triad closed | Locked | `typography.md` |
| D13 | Display sizes are stepped (8 sizes) or fluid (4 sizes); body and mono are fixed | Locked | `typography.md` |
| D14 | Past tense for case studies | Locked | `voice.md` |
| D15 | "I" for decisions, "we" for team outcomes, attribution by name for others | Locked | `voice.md` |
| D16 | Standard SEO posture, no keyword stuffing | Locked | `voice.md` |
| D17 | Vignelli-inspired visual direction | Locked | Cross-cutting |
| D18 | Borders not yet conventionalized | Pending | (future) |
| D19 | Build / preview / approve / promote workflow for all UI pieces | Locked | `sandbox.md` |
| D20 | Instruction docs and catalog files are separate concerns | Locked | Cross-cutting |
| D21 | Tailwind v4 with semantic CSS, no utility classes in library pieces | Locked | Cross-cutting (`tokens.md`, `decisions.md`) |
| D22 | `Project` content type uses modular Sanity schema, not flat rich-text | Locked | Sanity (`templates.md`) |

**Status legend:** *Locked* = decision in force, change requires explicit revisit. *Pending* = open question, no decision yet. *Reversed* = decision was made and then reversed; documented for context.

---

## Entries

### D1. Two-tier token architecture

**Status:** Locked. **Domain:** Cross-cutting (`tokens.md`, all domain files).

The system separates **primitives** (raw palette values) from **semantic tokens** (role-named aliases). Components reference semantics. Semantics reference primitives. This was decided early and is the load-bearing structural choice of the system.

The alternative considered: a single layer where each token has both a role-name and a value (e.g., `--primary: #C8102E`). This is simpler and what the case study HTML originally shipped with. It was rejected because it doesn't scale. Themes become rewrites instead of remappings. Adding a new identity color means adding a new role for every theme rather than re-aliasing one variable. Refactors get expensive.

Two-tier is what Radix Colors, Tailwind, Material, and most production design systems do, for the same reason. The cost is more tokens; the benefit is the cost stays linear instead of exponential as the system grows.

### D2. Hue-named primitives, role-named semantics

**Status:** Locked. **Domain:** `tokens.md`, `colors.md`.

Color primitives are named by hue (`--color-neutral-100`, `--color-red-500`). Color semantics are named by role (`--paper`, `--primary`). This was originally written the wrong way — primitives were initially named with role-style names (`--color-base`, `--color-identity`, `--color-data`) — and reversed when it became clear that this conflated the layers.

The reasoning: at the primitive layer, a color *is* its appearance. There's no role yet because no component is using it. Calling a red "identity" presupposes that this red will play the identity role, which is a semantic-layer concern, not a primitive-layer concern. The two layers should describe themselves at their own level of abstraction.

This is also how every well-known design system (Tailwind, Radix, Material) does it. Primitives by hue, semantics by role.

The voice and typography systems use a slightly different rule for the same reason: type primitives use family-role naming (`--font-display`, `--font-body`, `--font-mono`) because at the primitive layer there is no useful "appearance" dimension below the family level. The naming convention adapts to what the primitive layer actually contains.

### D3. Three primitive color scales

**Status:** Locked. **Domain:** `colors.md`.

The system has three primitive color scales: `--color-neutral-*`, `--color-red-*`, `--color-yellow-*`. This is the smallest set that supports the visual identity (warm neutral foundation, identity accent, data accent) and leaves room to grow.

A four-scale option (adding `--color-green-*` or `--color-blue-*` for status states) was considered and deferred. The system doesn't currently need success/error/info colors — there are no forms, no validation states, no notifications. Adding a green scale before there's a use case for it would be premature.

When and if the system needs a fourth scale, the procedure is documented in `colors.md` *Adding a new primitive scale*. Until then, three is the count.

### D4. Eleven-step density (50–950)

**Status:** Locked. **Domain:** `colors.md`.

All color primitive scales use the same eleven-step density: `50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`. This matches Tailwind and Radix conventions. The reasoning: consistency across scales lets the system reason about steps interchangeably. `--color-neutral-700` and `--color-red-700` are roughly the same lightness across hues, which makes alias decisions predictable.

A nine-step density (50, 100, 200, ..., 800, 900) was considered. Rejected because the dark-end resolution is useful — `neutral-900` and `neutral-950` are distinguishable in real use (the system uses 950 for ink and 900 for unused-but-defined dark surfaces). The extra step at 50 is similarly useful — it's the canonical "near-white" surface for elevated panels.

### D5. Yellow scale anchored at step 400, not 500

**Status:** Locked. **Domain:** `colors.md`.

The brand yellow (`#F4C430`) sits at step 400 in the yellow scale, not step 500. This is mildly unusual — most scales anchor brand at 500.

The reasoning: the canonical yellow hue is naturally lighter than a typical scale midpoint. If it were placed at 500, the scale below it (steps 50–400) would be too narrow to be useful, and the scale above (steps 600–950) would have an awkward transition. Placing it at 400 gives the scale balance: four steps lighter for highlights, six steps darker for shadows and text-on-yellow contrast.

This is documented explicitly in `colors.md` because it would otherwise be a footgun for anyone (or anything) extending the system. A future contributor adding a new brand color might reflexively anchor at 500 and produce an unbalanced scale.

### D6. No alpha primitives

**Status:** Reversed (now stable as solid-only). **Domain:** `colors.md`.

The system originally had alpha primitive scales (`--color-ink-alpha-{20,30,50,70}`, `--color-paper-alpha-{20,30,50,70}`) to support the case study HTML's use of transparent whites and blacks for muted text and subtle dividers on dark surfaces.

This was reversed in favor of solid neutral steps. `--muted-inverse` now aliases `--color-neutral-300` instead of `--color-paper-alpha-70`. `--separator` aliases `--color-neutral-300` instead of `--color-ink-alpha-20`.

The reasoning for the reversal: alpha primitives added architectural complexity (separate scales, different step density, special composite-against-surface rules) for marginal benefit. Solid-step alternatives produce visually similar results and integrate cleanly with the rest of the color system. The contrast audit actually *improved* (`--muted-inverse` on `--ink` went from 9.6:1 to 11.0:1).

The decision is documented as *Reversed* rather than removed because it's instructive: the alpha approach is architecturally legitimate (Radix uses it) but wasn't the right call for this system's scope. A future system at larger scale might revisit. This system, with eight semantic tokens total, doesn't need it.

### D7. Pure black/white not used

**Status:** Locked. **Domain:** `colors.md`.

The system uses `#0D0D0D` for ink and `#FFFEFA` for the lightest panel. Pure black (`#000`) and pure white (`#FFF`) are not used.

The reasoning: pure black/white feel screen-default, not designed. The Vignelli editorial lineage that informs this system uses warm near-blacks and slightly off-whites that read as printed. The contrast cost is minimal — `#0D0D0D` on `#FFFEFA` is 19.3:1, well above AAA.

This is one of the small choices that adds up. A system with `#000` and `#FFF` reads as a default Bootstrap site. A system with `#0D0D0D` and `#FFFEFA` reads as designed.

### D8. Spacing not tokenized

**Status:** Locked. **Domain:** `grid.md`.

Spacing inside components is documented but not tokenized. There is no global `--space-1`, `--space-2`, etc. Components own their spacing as design decisions, with `grid.md` documenting the observed clusters (tight: 4–20px, standard: 24–40px, loose: 48–88px) and rules (multiples of 4, scale with surface importance).

The alternative considered: a Tailwind-style spacing scale with named tokens. Rejected because spacing in this system is structural (driven by the grid) and editorial (driven by the design's rhythm), not abstract. A global scale would either be too generic to be useful or too specific to allow design judgment.

This is also a calibrated bet: tokenizing prematurely would lock the system into rhythms before the components are designed. If a future theme needs to shrink padding everywhere, that's the signal to tokenize. Until then, spacing stays a per-component call.

### D9. Six breakpoints, mobile-first

**Status:** Locked. **Domain:** `grid.md`.

The system has six breakpoints: `xs, sm, md, lg, xl, 2xl` at `0, 480, 768, 1024, 1280, 1536px`. Mobile-first.

A five-breakpoint option (the user's initial proposal: 1440+, 1440, 1024, 768, 320) was reframed because 1440 appearing twice is really one canonical "desktop floor" with a distinction for ultrawide. The current scale matches Bootstrap, Tailwind, Material conventions, which means any engineer or AI agent already knows how to read it.

The case study HTML's original breakpoints (980, 820, 720, 580, 420) were ad-hoc — tuned to specific layouts rather than canonical. Replacing them with a canonical scale was deliberate: the case study can be refactored to align with the system, but the system shouldn't inherit the ad-hoc-ness.

### D10. Column counts 4/4/8/12/12/12

**Status:** Locked. **Domain:** `grid.md`.

The grid uses 4 columns at xs/sm, 8 columns at md, 12 columns at lg/xl/2xl. Standard pattern matching most production grids.

A 12-everywhere option was considered. Rejected because 12 columns at mobile widths produces unusably narrow column widths. A 4-column mobile grid is what makes "halves" and "quarters" meaningful at phone sizes.

A 16-column option at 2xl was considered. Rejected because the container caps at 1280px regardless. Adding columns wider than the container can use is decorative.

### D11. Container stretches below xl, centers at xl

**Status:** Locked. **Domain:** `grid.md`.

Below the xl breakpoint (1280px), the container fills the viewport edge to edge with margins providing the inset. At xl and above, the container caps at `--container-max` (1280px) and centers. Excess viewport width becomes empty space outside the container.

The alternative considered: stretch always (no max width). Rejected because at ultrawide viewports (1920+, 2560+), uncapped content becomes unreadable — line lengths exceed comfortable reading widths, and visual rhythm collapses. Capping at 1280px keeps the design intentional at any viewport.

A second alternative considered: cap earlier (at lg, 1024px). Rejected because 1024–1279px is a real reading window for laptop users, and capping there wastes screen real estate.

### D12. Three font families

**Status:** Locked. **Domain:** `typography.md`.

The system uses three font families: Archivo for display, IBM Plex Sans for body, IBM Plex Mono for mono. The triad is closed by default. Adding a fourth family requires a documented reason.

A two-family option (display + body, with mono being a body-italic or similar) was considered. Rejected because mono carries semantic weight in this system — it marks labels, metadata, and "process" content. Faking mono with another typeface would lose the visual signal.

A four-family option (adding a serif for long-form essays) was considered. Deferred because the portfolio doesn't yet have long-form essays. If essay pages are added, this decision is the place to revisit.

### D13. Display sizes stepped or fluid; body and mono fixed

**Status:** Locked. **Domain:** `typography.md`.

The display size ramp uses two patterns: 8 stepped sizes (discrete values per breakpoint, defined in media queries) and 4 fluid sizes (`clamp()` values that interpolate with viewport width). Body and mono sizes are fixed and don't respond to breakpoints.

The reasoning for the split: display type at headline scale benefits from snapping cleanly to canonical breakpoints. Smooth interpolation produces awkward intermediate sizes, especially at hero/metric scale. Smaller display sizes (ledes, pull-quotes) read fine with `clamp()` because the scale of imprecision is small.

Body and mono are fixed because at body sizes, even a 1px shift between breakpoints is jarring. Resizing body copy by viewport hurts readability more than it helps.

A pure-`clamp()` option was considered (matching the case study HTML's original approach). Rejected because it doesn't snap to breakpoints, and the breakpoint system is otherwise load-bearing across the design.

A pure-stepped option (every display size discrete per breakpoint) was considered. Rejected because the smaller display sizes don't benefit from stepping enough to justify the maintenance overhead. The hybrid is the calibrated answer.

### D14. Past tense for case studies

**Status:** Locked. **Domain:** `voice.md`.

Case studies are written in past tense. "I shipped, we tested, the result was."

A present-tense option ("I ship, we test") was considered. Rejected because present tense reads as bloggy and aspirational; past tense reads as accountable and shipped. The portfolio's positioning is "senior IC with shipped impact," and the tense should reinforce that.

Exceptions are explicit: principles use present tense ("the configurator is the product people experience before they own the product"); "what I'd do next" sections use conditional/future. Live demo sections use present.

### D15. "I" for decisions, "we" for team outcomes, attribution for others

**Status:** Locked. **Domain:** `voice.md`.

The portfolio uses first-person mixed: "I" for individual decisions, "we" for shipped outcomes that involved a team, and named attribution (function or name) for work others did.

The research is unambiguous on this. Matej Latin (March 2025) explicitly flags overuse of "we" as a senior-level mistake. Brian Lovin's portfolio guide weights individual decision-ownership heavily for senior+. Jess Eddy's synthesis notes that the strongest case studies "go deeper into failures and cut ideas" — depth that requires owning specific calls.

The opposite extreme — pure "I" everywhere — reads as ego-driven and erases the team. The mix (with leaning toward "I" for ownership and credit-by-name for teammates) is what reads senior.

The case study uploaded as the system's reference already demonstrates this: "I argued for" (owning a position), "we thought the framing alone would do the work" (joint hypothesis), "merch authored the eight use-case definitions" (credit where it's due).

### D16. Standard SEO posture

**Status:** Locked. **Domain:** `voice.md`.

The portfolio uses standard SEO: semantic HTML, decent meta tags, structured data where it helps, no keyword stuffing.

An aggressive SEO option (keyword-rich titles, alt text optimized for search, heavy internal linking) was considered. Rejected because aggressive SEO degrades human reading and the portfolio's primary audience is humans (hiring managers), not search algorithms.

A minimal SEO option ("SEO is a side effect of writing well, no special hygiene") was considered. Rejected because mechanical hygiene (semantic HTML, alt text, structured data) is cheap to do correctly and meaningful for accessibility regardless of SEO. The cost is low; the floor it sets is meaningful.

The standard posture is the calibrated middle: write well, then add the hygiene. Documented in `voice.md` *SEO* with concrete patterns.

### D17. Vignelli-inspired visual direction

**Status:** Locked. **Domain:** Cross-cutting.

The system's visual direction is Vignelli-inspired: warm-tinted neutrals, hard 2px borders as a structural element, geometric display sans, mono labels, identity red, data yellow, all-caps headlines.

The direction was selected after a multi-round exploration (Workshop / Quarterly / Schematic / Atelier directions, then Schematic permutations, then Vignelli). Vignelli won because it best supported the positioning ("commerce and ownership experiences for physical products") with editorial weight that matches the seriousness of the case studies, while staying distinctive in a 2026 portfolio landscape dominated by minimal-monospace-on-dark.

The full case study (Configurator v3) was built first as the canonical visual reference, then the system documents were derived from it. The HTML is the artifact; the docs are the rules. If the docs and the HTML disagree, the HTML wins until the disagreement is resolved deliberately.

### D18. Borders not yet conventionalized

**Status:** Pending. **Domain:** future.

Border conventions are intentionally not specified in `colors.md` or anywhere else yet. Border width tokens exist (the system uses `1px` and `2px` borders heavily) but the rules for *when* to use which width, when to use dotted vs solid, and when to use ink vs separator-color are deferred.

The reasoning: borders are deeply integrated with the visual identity and need to be specified once the components have been built. Specifying them prematurely would lock in patterns that the components might not need, or miss patterns the components will require. Better to extract the conventions from real components than to imagine them in advance.

When components are built (likely starting after `templates.md`), borders will get their own conventions — either as a section in `components.md` or as a dedicated `borders.md` if the rules are extensive enough. This pending decision is documented here so it's not forgotten.

### D19. Build / preview / approve / promote workflow for all UI pieces

**Status:** Locked. **Domain:** `sandbox.md` (with downstream impact on `components.md`, `modules.md`, `templates.md`).

Every component, module, and template in the system goes through a four-stage workflow: built in the sandbox, previewed across themes / breakpoints / states, approved against a checklist (with the human as final decider), then promoted to the library with a catalog entry. This is documented in detail in `sandbox.md`.

The alternatives considered:

- **Build directly into the library, no sandbox.** The default approach for most projects. Rejected because it produces drift fast — half-finished components ship to production, edge cases go untested, and the library quietly fills with code that almost-but-not-quite belongs.
- **Storybook or a similar third-party tool as the sandbox.** Considered but deferred. Storybook is mature and capable, but for a personal portfolio at this scale it's overkill — and importantly, building a custom sandbox route reads as a stronger design-engineer signal in the portfolio itself. The sandbox can be migrated to Storybook later if the project grows.
- **Approval as a checklist only, no human final decision.** Rejected because mechanical checklists can't catch tonal or compositional issues. The eyeball stays in the loop.
- **Approval as eyeball only, no checklist.** Rejected because the checklist is what catches the boring-but-load-bearing stuff (token discipline, accessibility, state coverage).

The hybrid (checklist + eyeball) is the calibrated answer. The checklist sets the floor; the human sets the ceiling.

The workflow is also designed to be project-agnostic. `sandbox.md` is structured so it can be lifted into other projects with minimal editing. This is deliberate — the workflow is a personal practice, not a one-project artifact.

### D20. Instruction docs and catalog files are separate concerns

**Status:** Locked. **Domain:** Cross-cutting (`components.md`, `modules.md`, `templates.md`, `src/components/[category]/README.md`).

The system separates *instructional* documentation from *cataloging* documentation:

- **Instruction files** (`components.md`, `modules.md`, `templates.md`) describe how to think about each kind of piece, what makes a good one, naming conventions, anti-patterns, and the build process. They do **not** list specific approved pieces.
- **Catalog files** (`src/components/ui/README.md`, `src/components/modules/README.md`, `src/components/templates/README.md`) list every approved piece with its definition, file path, props/API, tokens used, theme support, and approval date. They do **not** describe how to build new pieces.

The alternative considered: combine instruction and catalog into one document per category (e.g., `components.md` lists every component AND describes how to build new ones). Rejected because the two concerns scale differently. The instruction doc is roughly stable — the rules for how to build a component don't change much over time. The catalog grows constantly as new components are approved. Mixing them means the instructional content gets buried under entries, or the instructional content becomes static while the catalog is updated.

Separating them also reflects the system's principle that pieces are added to the library only after going through the approval workflow (D19). The catalog is a record of what has been approved. The instruction doc is the standing rules. Different lifecycles, different files.

This applies to all three UI piece types (components, modules, templates) and to any future category that might be added (e.g., a hypothetical `effects.md` for animation primitives would have a corresponding `src/components/effects/README.md`).

### D21. Tailwind v4 with semantic CSS, no utility classes in library pieces

**Status:** Locked. **Domain:** Cross-cutting (`tokens.md`, `decisions.md`).

The project uses Tailwind v4. Tailwind's role is constrained to two jobs: (a) preflight reset, and (b) token registration via the `@theme {}` directive in `src/app/globals.css`. Components, modules, and templates in `src/components/` reference design system tokens directly through CSS custom properties — `var(--paper)`, `var(--ink)`, `var(--primary)` — typically inside CSS Modules co-located with each piece. They do **not** use Tailwind utility classes like `bg-paper` or `text-ink`.

Tailwind utility classes are allowed in glue code at the page level (`src/app/page.tsx`, layouts, the library route's chrome) where the code is one-off and not destined for the catalog. They are forbidden inside any `src/components/ui/`, `src/components/modules/`, or `src/components/templates/` file. The library is the system; glue code is the consuming surface.

The alternatives considered:

- **Tailwind utility classes everywhere, including in library pieces.** The default Tailwind workflow. Rejected because it embeds appearance into class names (`bg-red-500`, `text-neutral-950`), which breaks the role-based naming principle (D2, P4). It also makes theme swaps require codebase-wide find-and-replace instead of token-layer overrides — defeating the load-bearing two-tier architecture (D1).
- **Tailwind v4 plus utility-aliased semantic classes** (e.g., generating `bg-paper` from the `@theme {}` block). Tailwind v4 *does* generate these aliases, and they're available in glue code. Rejected for library pieces because it still puts appearance-named tokens into class strings rather than role-named CSS variables. The intent here is clarity at the read site: a component that says `background: var(--paper)` reads as "this surface plays the paper role" without the reader needing to know what color paper currently resolves to.
- **Drop Tailwind entirely; use plain CSS plus a custom build for tokens.** Rejected because Tailwind v4's `@theme {}` is the cleanest CSS-first token registration we've seen in any toolchain, and we want preflight + container queries + viewport units sane defaults. The cost of keeping Tailwind constrained to two jobs is small; the benefit is real.

This decision is what makes the rest of the system hold together. P3 (components reference semantics, semantics reference primitives) is enforceable only if components reference variables at the CSS-property level. Once you let utility classes in, the layer separation degrades: `bg-red-500` references a primitive, `bg-paper` looks role-named but reads as appearance to anyone scanning the JSX. CSS variables at the property site keep the discipline visible.

### D22. `Project` content type uses modular Sanity schema, not flat rich-text

**Status:** Locked. **Domain:** Sanity (`templates.md`, `src/sanity/schemaTypes/project.ts`).

The `Project` content type — the case study — is being converted from a flat rich-text `body` field to a list of modules, mirroring the existing `Page` content type. Each case study becomes an ordered array of strongly-typed modules (hero, reframe, hypothesis, metrics dashboard, variants comparison, roads-not-taken, cross-functional, outcomes, next, AI counterfactual, etc.), and a single `CaseStudyTemplate` React component iterates the array and dispatches each module to its corresponding React component.

The Vignelli case study HTML is module-shaped from the ground up. Section breaks, surface shifts (paper ↔ ink), grid changes, and full-bleed brand surfaces all happen at section boundaries that map cleanly onto modules. A flat rich-text body would have to fight the design every time it tried to break out of a single content stream.

The alternatives considered:

- **Keep `body` as a flat rich-text Portable Text field.** The Sanity-default approach for long-form content. Rejected because it makes consistent strong-section layouts impossible. Each case study would either re-implement layout primitives inline (drift) or be limited to whatever Portable Text serializers can do (which is roughly: paragraphs, headings, lists, embedded images). The case studies in this portfolio need full-bleed metric dashboards, multi-column variant grids, dark inverted sections, and structured attribution tables. Portable Text plus serializers would technically work but would push complexity into the serializer layer instead of into modules.
- **Hybrid: keep `body` as rich text, add an optional `extraModules` array.** Rejected because it produces two parallel composition paths and forces a decision per section ("does this go in the body or in the modules array?"). Two paths drift.
- **Convert `body` to modules but preserve a single "long-form essay" module type that wraps Portable Text.** Acceptable — and likely what we'll do for sections that genuinely are paragraph-shaped (e.g., a "narrative" module). The decision is not anti-rich-text; it's anti-rich-text-as-the-container-for-the-whole-page.

The order of operations: build the module React components and Sanity schemas first, then update `Project` to swap `body` for `modules`, then build the `CaseStudyTemplate` that consumes the new shape. This is the cascading order documented in `templates.md`.

This decision also makes the system's own architecture consistent: `Page` and `Project` now share the same module-driven shape, served by their respective templates (`PageTemplate`, `CaseStudyTemplate`). Each modular content type gets one template. Clean.

---

## When to add a new entry

Add an entry when:

1. **A choice was made between alternatives.** "We picked X" alone isn't a decision; "we picked X over Y because Z" is.
2. **The choice is load-bearing.** It affects multiple components, multiple files, or the system's positioning.
3. **The choice will be questioned later.** Either by you, by a future collaborator, or by Claude Code working from incomplete context.

Don't add an entry for:

- Trivial preferences ("I picked blue over teal").
- Choices that have no alternatives ("we use HTML for the markup").
- Internal implementation details that don't affect the system's interface.

When in doubt, the test: *would I want my future self (or Claude Code) to understand why this was decided?* If yes, write the entry.

## When to revisit a decision

A locked decision is not unchangeable. It's documented so that if you change it, you do so deliberately, with the original reasoning visible.

To revisit a decision:

1. Mark the entry's status as **Under review** with a date.
2. Write a short paragraph at the top of the entry explaining what's being reconsidered and why.
3. Make the change.
4. Update the status to **Locked** (with the new reasoning) or **Reversed** (with what went back to the previous state).

Decisions that get reversed are kept in this file rather than deleted. The history is part of the value.
