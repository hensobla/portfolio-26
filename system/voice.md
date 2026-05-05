# voice.md

Defines the editorial voice for the portfolio: how case studies are written, how the system speaks across surfaces, and the SEO patterns that ride alongside the writing. This file is consulted before drafting any user-facing copy, including case studies, section ledes, eyebrows, error states, footer text, and metadata.

For governance, see `tokens.md`. For the *why* behind specific voice choices, see `decisions.md`.

---

## Audience

The portfolio is read by three groups and the voice has to land for all of them simultaneously:

1. **Hiring managers at SMBs and startups (60–500 ppl).** Scanning for scope, ownership, and shipped impact. They have 6–10 seconds for the first filter.
2. **Hiring managers at FAANG / Big Tech.** Looking for craft, business impact, and cross-functional influence. Slower to commit but deeper in evaluation.
3. **Design leaders evaluating staff-bleed signal.** Reading for reframed briefs, decision logs, alignment artifacts, and roads-not-taken.

The voice cannot pander to any one group. The bar: a senior IC reads the work as senior, a staff designer reads it as staff-bleed, and a hiring manager at any size company reads it as shipped.

---

## Voice character

The blend: **plainspoken and analytical with sharp, occasional opinion.** Closer in feel to Karri Saarinen at his sharpest than to either Lee Robinson (too dry) or Jordan Singer (too viral) on their own.

What this means in practice:

- **Analytical surface.** Most sentences describe what happened, what was measured, and what the data showed. The default register is "I shipped this, this is what happened." Not "I am passionate about this."
- **Sharp opinions, rate-limited.** Strong takes are welcome but rare — about one per case study, not one per paragraph. They earn their weight by scarcity. A case study with three opinionated takes per page reads as posturing; one per page reads as conviction.
- **Plain language for structural sentences, surgical jargon for technical ones.** A reframe statement should be readable at a glance; a hypothesis statement can include MDE and confidence intervals because that's where they live naturally.
- **No motivational copy.** No "passion," no "I'm excited about," no "I love." Excitement is conveyed through specificity, not adjectives.
- **No corporate softeners.** "Leverage" as a verb, "unlock," "delight" as a transitive verb, "synergy" — all out. Active verbs do the work.

### Reference voices

When in doubt about register, ask: *would Karri write this?* Then check against:

- **Karri Saarinen** — analytical, opinionated in select moments, never motivational. Floor for clarity.
- **Lee Robinson** — structural and dry. Useful for technical sections.
- **Jordan Singer** — sharp, punchy, viral-shaped. Useful for the one-take-per-piece moment.
- **Brian Lovin** — confident and personable. Useful for "how I work" sections.

Not reference voices: any source that uses "passionate," "thought leader," "rockstar," or "ninja." If a sentence could appear on LinkedIn unironically, rewrite it.

### Wit and humor

Sharp, dry, and infrequent. The pattern that lands:

- One sharp line per case study, usually as a closer to a section or as a section title.
- Wit is structural, not decorative. A funny line that doesn't carry meaning is cut.
- No emoji except where they functionally signal status (e.g., a checkmark in a results table). Not as personality.
- Self-deprecation is fine when it's specific. "We thought the framing alone would do the work" works; "I'm just a designer" doesn't.

A good wit-line surfaces a tension or makes a frame visible. From the existing case study: *"The use-case selector is the real product. The variant grid is just where the transaction completes."* That's the rate-limited sharp opinion. Earn it.

---

## Person and tense

### Person

Default to **"I"** for decisions and personal calls. Use **"we"** for shipped outcomes that involved a team. Attribute by **name or function** for work others did.

| Use | When |
|---|---|
| `I` | Decisions made, pushback initiated, frames I reframed, calls I made (including bad ones), things I advocated for. |
| `we` | Shipped outcomes that involved a real team, decisions made jointly with PM/eng, working sessions where I was one voice among several. |
| `the team` / `merch` / `the PM` / `eng` | Work other people did that I'm contextualizing. Credit where it's due. |

The research is clear that overuse of "we" hides individual contribution and reads as junior. The opposite extreme — pure "I" everywhere — reads as ego-driven and erases the team. The mix is what reads senior.

**Examples that work** (drawn from the existing case study):

- "I argued for" → owning a position.
- "We thought the framing alone would do the work" → joint hypothesis the whole team held.
- "Merch authored the eight use-case definitions" → credit where it's due.

**Examples that don't work:**

- "We shipped a redesigned configurator that lifted CVR 18%" — vague. *Who* shipped it? *Who* designed it?
- "I single-handedly drove the entire cross-functional alignment" — ego-shaped. The seven other people in the room would disagree.

### Tense

**Past tense** for case studies. "I shipped, we tested, the result was." Past tense reads as accountable and shipped; present tense reads as aspirational and bloggy.

Exceptions:
- **Principles and standing claims** can use present tense ("the configurator is the product people experience before they own the product").
- **"What I'd do next"** sections use conditional / future ("v4 should rebuild," "I'd add the AI-generated paragraph next").
- **Live demo sections** of the portfolio (if any) use present.

---

## Jargon

Use design and business jargon **freely** — readers are senior — but never at the cost of a beginner's ability to follow the argument.

The rule: **define by context, not by parenthetical**. A reader who doesn't know what AOV is should be able to figure it out from the surrounding paragraph. A reader who does know shouldn't have flow broken by "(average order value, the average dollar value of a purchase)."

Examples that work:

- "We were forcing a variant choice before the buyer had earned the context for it." → no jargon, but a senior reader recognizes the conversion-path implication.
- "MDE +5% on primary." → MDE undefined, but a reader doing experimentation already knows. A reader who doesn't can infer "minimum detectable effect" from surrounding context.
- "Use-case framing anchored buyers on higher-value variants." → "anchoring" used technically without being labeled. Senior readers parse it; juniors get the meaning from the sentence.

Examples that don't work:

- "We applied the principle of self-persuasion (Aronson, 1965)" → reads as defensive citation. Use the principle without footnoting it.
- "We optimized the conversion rate optimization metric (CVR)" → defining the acronym mid-sentence breaks rhythm. Just say "we lifted CVR 18%."

### Jargon SEO note

Specific terms (CVR, AOV, A/B test, configurator, MDE, HITL, hardware commerce, design system, post-purchase) carry SEO value because they're searched by hiring managers and recruiters. Use them naturally where they fit. Don't stuff. The keyword "designed and shipped a configurator with a +18% CVR lift" is naturally searchable; "I am passionate about CVR optimization and conversion rate optimization for ecommerce" is keyword-stuffed and reads worse to humans, too.

---

## Length

**Variable. Length matches project complexity.** A simple growth experiment is a 5-minute read; a configurator restructure is a 12-minute read. The system rejects the "one-size-fits-all 8-minute case study" template.

Calibration:

| Project type | Target read time |
|---|---|
| Single experiment / focused intervention | 5–7 min |
| Standard product feature / redesign | 8–10 min |
| Multi-quarter / cross-functional / staff-altitude reframe | 10–14 min |
| Strategic vision / 0-to-1 / system-level | 12–18 min, often split |

If a case study runs longer than 12 minutes, split it. The pattern: a public summary at the front (3–5 min), then a "go deeper" link to the full piece. Hiring managers who want only the summary get out fast. Those who want the depth click through.

The case study earns its length the same way a paragraph earns its sentences: every section justifies its presence by introducing new information or a new tension. A section that restates what an earlier section said is cut.

---

## Headlines and titles

**Hybrid pattern: short project name + outcome-led subtitle.**

Pattern:

```
Configurator v3
A 40-minute buying ritual, restructured around the decision instead of the variant grid.
+18% CVR · target was +12%
```

Three layers in priority order:

1. **Title** — the project name, short and unambiguous. Optimized for skim. ("Configurator v3", "Buyer Onboarding", "PDP Content Engine")
2. **Subtitle / lede** — the outcome or reframing in one readable sentence. Optimized for hook. ("A 40-minute buying ritual, restructured around the decision instead of the variant grid.")
3. **Metric badge** — the measurable result, large and immediate. Optimized for scan and SEO meta. ("+18% CVR · target was +12%")

This stack lets the 6-second skim find the metric, the 30-second skim find the reframe, and the deeper read find the project. SEO benefits because the metric and outcome are surfaced in `<meta>` tags and structured data without fighting the design.

### Section titles

Section titles in case studies should describe the *role of the section*, not the *content of the section*. Compare:

- "The brief, then the reframe" ✓ — describes the section's argumentative move.
- "What I was asked to do and what I did instead" ✓ — same idea, more direct.
- "Configurator design overview" ✗ — describes content, no movement, low information.
- "The reframe" ✓ alone is fine but flatter than "the brief, then the reframe."

Keep section titles to about 3–7 words. Active where possible.

### Eyebrows and labels

Mono labels that introduce a section ("HYPOTHESIS", "WHAT I ARGUED FOR", "SECOND-ORDER SURPRISE") are part of the editorial voice. They:

- Are uppercase always.
- Stay short (1–4 words).
- Describe the *role* of the content that follows ("Hypothesis," "Result," not "Section 02").
- Avoid corporate labels ("Overview," "Background," "Summary"). Be specific.

---

## Sentence patterns that land

A few specific patterns that show up in strong portfolio writing and are worth reaching for:

### The reframe sentence

"I was asked to X. I argued for Y instead." Or its more compressed form: "The brief was X. The actual problem was Y."

This pattern is the highest-leverage move in a senior case study. It demonstrates judgment, ownership, and willingness to push back — three signals hiring managers explicitly look for.

### The compressed counterfactual

"Pre-AI estimate: X. Actual: Y." Or "Traditionally a 4-week project; shipped in 6 days."

Demonstrates AI-amplified leverage without listing tools. The math does the work.

### The credit sentence

"Merch authored the eight use-case definitions." Or "Data caught the AOV regression in V2 four days into the test."

Active credit to a named function. Reads as senior because it shows the writer noticed and named the contribution. Erasing teammates reads as junior.

### The "what I'd do next" close

"v4 should rebuild around use case as the navigation primitive across the entire site." Or "v5 should layer in the AI-generated personal recommendation."

Forward-looking close demonstrates that the writer is still thinking about the work, hasn't shipped-and-forgotten, and has roadmap-level judgment. Almost every strong case study has one of these.

---

## Sentence patterns to avoid

- **Process narration.** "First I did research, then I made wireframes, then I prototyped." Reads as junior. Senior writing organizes around argument, not chronology.
- **The undefended adjective.** "A beautiful redesign," "an elegant solution," "a delightful experience." Adjectives in self-evaluation are pretentious. Let the work be the proof.
- **The undefended claim.** "This was a hard problem." Compared to what? With what dimensions of difficulty? Either back the claim or cut it.
- **The hedged opinion.** "I think this might be the case that perhaps..." Either say it or don't.
- **The fake agency.** "We were tasked with..." If you accepted the task, you weren't tasked, you took it on. Active voice.

---

## Word lists

### Avoid

These words signal a register the system rejects. Some are LinkedIn-isms; some are design-writing clichés; some are plain weak.

| Word/phrase | Use instead |
|---|---|
| `passionate about` | (cut entirely; show passion through specificity) |
| `excited to share` | (cut entirely) |
| `unlock` (as verb) | enable, open, allow |
| `leverage` (as verb) | use |
| `delight` (as verb) | (often: cut. otherwise: be specific about what changed) |
| `synergy` | (cut entirely; unsalvageable) |
| `thought leader` | (cut entirely) |
| `journey` (in product context) | flow, experience, sequence, or just describe the steps |
| `seamless` | smooth, uninterrupted, or describe what's missing (friction, modal, wait) |
| `disrupt` | change, restructure, replace |
| `ideate` | think, draft, propose |
| `learnings` | lessons, what I learned, takeaways |
| `at the end of the day` | (cut; almost always filler) |
| `holistic` | full, end-to-end |
| `obsessed with` | (cut; dramatic) |
| `beautifully designed` (about own work) | (cut; let the work prove it) |

### Keep central

These words and concepts are load-bearing for the positioning. Use them deliberately.

| Word/concept | Why |
|---|---|
| `commerce` | Core positioning. "Commerce experiences for physical products." |
| `ownership` | Both literal (the post-purchase / device-companion surfaces) and meta (taking responsibility for outcomes). |
| `configurator` | Specific surface that hardware-company designers own. SEO and positioning both. |
| `shipped` | Active verb. Always preferable to "delivered" or "launched." |
| `reframed` | Signal of staff-altitude judgment. Use when accurate. |
| `decided to` / `chose to` / `argued for` | Active decision verbs. Show agency. |
| `funnel` / `flow` / `step` | Specific commerce vocabulary. |
| `hardware` | Differentiator. Don't be apologetic about it. |
| `hypothesis` / `mechanism` | Signal experimental rigor. |
| `reframe` / `roads not taken` | Specific to the staff-altitude moves the system documents. |

### Specific to AI fluency

Use these to signal authentic AI fluency without sounding gimmicky. They show up in technical contexts naturally.

| Word/concept | Use case |
|---|---|
| `counterfactual` | "Pre-AI estimate: 4 weeks. Actual: 6 days." |
| `streaming` / `latency` / `eval loop` / `HITL` | When discussing AI-feature design |
| `prompt design as UX` | Specific framing that signals having actually built with AI |
| `cold start` (for content) | "AI does the cold start; human does the taste." |

Avoid: "AI-powered," "AI-driven," "next-generation," any phrase that could appear in a product launch press release.

---

## SEO

The portfolio uses **standard SEO**: semantic HTML, decent meta tags, structured data where it helps, no keyword stuffing. SEO is a side effect of writing well, augmented with mechanical hygiene.

### What this looks like

**Page-level metadata** — every page has:

- `<title>` tag matching the case study title pattern. Pattern: `{Project Name} — {Outcome} — {Your Name}` (e.g., "Configurator v3 — +18% CVR Lift — Your Name"). The outcome in the title doubles SEO value and click-through from search.
- `<meta name="description">` of 140–160 characters. The subtitle / lede is a good source.
- Open Graph tags (`og:title`, `og:description`, `og:image`) so links in Slack, LinkedIn, and email previews look intentional.
- Twitter card tags for the same reason.

**Semantic HTML** — every page uses:

- One `<h1>` per page (the project name).
- `<h2>` for top-level sections, `<h3>` for sub-sections. No skipping levels for visual reasons.
- `<article>` wrapping case studies, `<section>` for major segments.
- `<figure>` and `<figcaption>` for diagrams and screenshots.
- `<time datetime="...">` for dates.
- Real `<table>` markup for tabular data, not divs.

**Structured data (JSON-LD)** — case studies use the `Article` schema with `author`, `datePublished`, `headline`, and `keywords`. Optional but worth doing for hiring-related searches.

**Image alt text** — every meaningful image has descriptive alt text. Decorative images use `alt=""`. The pattern:

- Bad: `alt="screenshot"`
- Bad: `alt="configurator design"` (too vague)
- Good: `alt="Configurator v3 use-case selector, showing three card options before the variant grid"`
- Good: `alt="Bar chart of CVR lift across three test variants: V1 baseline 0%, V2 +14%, V3 +18%"`

Alt text is for accessibility first, SEO second. If it's right for screen readers, it's right for search.

**Internal linking** — case studies link to each other where the work overlaps thematically. The previous/next nav at the bottom of the case study is canonical; in-line links inside prose are fine when they're useful, never as anchor-text bait.

### What this doesn't look like

- Keyword-stuffed paragraphs ("CVR conversion rate ecommerce hardware design product designer senior staff portfolio 2026"). Reads worse to humans and Google penalizes it.
- Hidden text or off-screen keyword blocks. Same.
- Paid backlink schemes or link farms. The portfolio is a destination, not a node in an SEO graph.
- Generated meta descriptions that don't match the page. Always write the meta description by hand from the lede.

### SEO maintenance

When a case study is published or significantly edited:

1. Verify the `<title>` follows the pattern.
2. Verify the `<meta name="description">` is rewritten to match the actual content.
3. Verify Open Graph tags (especially `og:image`) point at a real image, not a placeholder.
4. Verify all images have alt text that describes the image's content.
5. Run the page through Lighthouse or PageSpeed Insights once. SEO score under 90 is a red flag.

These checks are also part of the approval checklist in `sandbox.md` for any template that publishes new pages. When approving a new case study template (or revising an existing one), the SEO checks run as part of the standard approval pass.

---

## When in doubt

If a sentence feels off, run it through these checks in order:

1. **Would Karri write this?** If no, what would they change?
2. **Is there an undefended adjective?** ("beautiful," "elegant," "delightful," "passionate.") Cut or replace with specifics.
3. **Is there hedging?** ("I think," "perhaps," "it might be.") Either own the claim or cut it.
4. **Is there process narration?** ("First I did, then I did.") Reorganize around argument.
5. **Does the section earn its length?** If a paragraph restates an earlier paragraph, cut.
6. **Does it pass the LinkedIn test?** If it could appear on LinkedIn unironically, rewrite.

If the sentence still feels off, ask whether the underlying *thought* is actually formed. Often it isn't, and no editing fixes that — the fix is more thinking.

---

## Anti-patterns

- Process-led case studies (Research → Wireframes → Prototypes → Test → Ship). Reorganize around argument.
- Adjective-heavy self-evaluation. Let the work be the proof.
- Citation-heavy academic register. This isn't a paper.
- Emoji as personality. Cut.
- "We" everywhere. Hides individual contribution.
- "I" everywhere with no team credit. Reads as ego.
- Length without substance. A 12-minute read with 4 minutes of content is a 4-minute case study with 8 minutes of padding.
- Headlines that describe content instead of role ("Project Overview," "Design Process," "Final Solution"). Be specific.
- Keyword stuffing. Hurts both readers and SEO.

---

## Adding to the system

### When the voice needs to evolve

Voice is opinionated by design. It will need to evolve as the portfolio grows and your positioning sharpens. When a voice rule changes:

1. Update this file.
2. Audit existing case studies for the old pattern. They're public artifacts; consistency matters.
3. Note the shift in `decisions.md` if it represents a meaningful change in positioning (e.g., shifting from "I" defaults to "we" defaults would be a real change).

### When adding a new word to the lists

If you find yourself reaching for a word that's not in either list and feel uncertain, add it. The lists are living documents.

For *avoid*: write the word and 2–4 better alternatives.
For *keep central*: write the word and what positioning role it plays.
