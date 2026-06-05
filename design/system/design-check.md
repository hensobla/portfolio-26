# Design check (advisory)

The design check is an **advisory** pass that scans a rendered element for a curated set of design problems — low contrast, skipped headings, overflow, a few "AI-generated-looking" tells — and surfaces them as suggestions. It is the Loomling-native adaptation of the `impeccable` linter (see ADR 0020 → 0021).

It is **never a gate**. It flags, it never blocks. The designer's taste is the highest authority; the check is a second pair of eyes, not a veto. The only design rules that actually block approval are the pre-existing hard rules in `system/accessibility.md` and `system/seo.md`.

## What it checks

The rule set lives in **`.loomling/design-check.json`** — that file is the source of truth. Editing it is how the rule set evolves; no code change is needed. Posture is **Moderate**: enforce as advisories the quality/accessibility rules that genuinely affect a reader, plus a few near-universal "slop" tells. Everything else is off by default.

| Rule | Severity | Why it's on |
|---|---|---|
| `low-contrast` | high | Readability / WCAG AA (mirrors `accessibility.md`) |
| `skipped-heading` | high | Outline integrity (mirrors `seo.md`) |
| `broken-image` | med | A genuinely broken image in the rendered output |
| `text-overflow` | med | Content spilling its container |
| `gradient-text` | med | `background-clip:text` gradient |
| `side-tab` | med | Side-stripe accent border |
| `cramped-padding` | low | Text flush against an edge |
| `tiny-text` | low | Body text below ~12px |
| `line-length` | low | Lines wider than ~80ch |
| `em-dash-overuse` | low | >2 em-dashes in rendered body copy |

Deliberately **off** (taste, not correctness): font choice, single-font, flat hierarchy, cream/beige palettes, eyebrows and numbered section markers, buzzword copy, bounce easing, nested cards, and the rest. Turn any of them on by adding them to `rules` in the config; they become advisories too, never blocks.

## Two rules that keep it honest

1. **Scan the rendered element, never the source.** Loomling source contains intentional patterns a source linter misreads: empty `data-loom-slot src=""` image slots (which render a placeholder by design, `seo.md`), per-element preview harnesses that legitimately use one font, and `--custom-property` declarations that a naive em-dash counter reads as `--` dashes. Running against the **served, slot-filled preview** makes those false positives disappear. The config's `"altitude": "rendered"` encodes this.

2. **Discount Loomling-intentional patterns explicitly.** Even on the rendered output, an unfilled slot placeholder is not a "broken image." The check reports problems a designer would actually want fixed, not artifacts of the system.

## How CC runs it

The check is CC-driven; Loomling adds no package dependency. When `impeccable` is available, CC runs `npx impeccable detect <rendered-url> --json` and filters the output to the `enabled` rules in `.loomling/design-check.json`. When it isn't, CC inspects the rendered DOM (computed styles, heading order, image `src`, rendered text) against the same rules. Either way the config is the contract and the output is the same shape: findings grouped by severity, each naming the rule, the element, and a one-line fix.

## When it runs

- **On demand** from the Sandbox: the **"Run design check"** button produces a paste-ready prompt (like Approve / Discard / Tokens Import). Available on any open element, draft or approved — it only reads.
- **At approval**: the approval flow (`CLAUDE.md §6`, `.loomling/prompts/approval-checklist.md`) runs the check and surfaces findings before the status flips. They inform the decision; they do not block it.

See `CLAUDE.md §22` for the operating contract and ADR 0021 for the rationale.
