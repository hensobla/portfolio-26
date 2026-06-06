# Capabilities (proactive design moves)

Loomling has a set of **capabilities** — focused design moves CC can apply to an element (tighten the layout, calm a loud surface, fix weak copy, harden for real data). They are the Loomling adaptation of impeccable's editing commands (ADR 0020 → 0024), but **you never invoke them by name** — CC brings the right one to bear on its own, at the right moment. A capability the user has to remember never gets used.

This is balanced against the first rule of the whole system: **your taste is the highest authority.** So:

- **Nothing visible is ever applied silently.** (The only silent automation is the invisible structural correctness in §16 — heading tag, `alt=""`, `rel`, landmarks — which predates this and is unchanged.)
- Capabilities surface at **trigger moments**, never mid-edit, and route from real signals (the design check §22, the critique §23, the copy rules in `voice.md`).

## Three engagement levels

- **flag** — a correctness problem. CC raises it on its own and applies the fix on one-tap consent. (`harden`, `adapt`, `clarify`, and the correctness findings from §22.)
- **suggest** — a taste improvement. CC offers it in one line; declining costs nothing. (`polish`, `quieter`, `distill`, `layout`, `colorize`, `bolder`, `delight`, `animate`.)
- **on-request** — never proactive; only when you explicitly ask. (`overdrive`, `optimize`.)

## Anti-nag rules (mandatory)

One line each. At most a couple per element. **Never re-surface a suggestion you declined in the same session.** Only at the trigger moments below — never while you're still composing. A capability that nags violates "taste is the highest authority."

## Trigger moments

- **Authoring (§4):** after CC builds or edits an element, it auto-runs the §22 design check and, from the findings, flags fixes / suggests moves.
- **Approval (§6):** the §22 check runs, a §23 critique is offered, and findings route to capabilities before the status flips. Never blocking.
- **Publish / composition (§16):** correctness-leaning capabilities (`harden`, `adapt`) run automatically as part of "structurally correct by publish time."

## How CC runs a capability (global contract)

Reuse impeccable's `reference/<capability>.md` playbook when the skill is installed; otherwise do the equivalent. **Every** capability operates through Loomling's rules: tokens-only (no raw values), the drift protocol (§5) for any rule conflict, and the §14 snapshot lifecycle whenever it edits an `approved` element (so every proactive change is one-step reversible). Capabilities report what they did and where.

Routing source is the `fix` field in `.loomling/design-check.json` — that file is the table; this doc explains the moves.

---

## The catalog

### polish
- *Does:* final quality pass — alignment, spacing, consistency, micro-detail.
- *Engagement:* **suggest** · *Fires:* after authoring (§4) and before approval (§6), as a general "want a polish pass?".
- *In Loomling:* tokens-only; §14 snapshot if approved. *Playbook:* `reference/polish.md`.

### bolder
- *Does:* amplify a safe/bland design — stronger hierarchy, committed scale, decisive type.
- *Engagement:* **suggest** · *Fires:* on a visibly timid element (low hierarchy contrast).
- *In Loomling:* must stay on-brand (semantic tokens only); §14 snapshot if approved. *Playbook:* `reference/bolder.md`.

### quieter
- *Does:* tone down a loud / overstimulating surface.
- *Engagement:* **suggest** · *Fires:* routed from `gradient-text` and `side-tab` findings (§22).
- *In Loomling:* tokens-only; §14 snapshot if approved. *Playbook:* `reference/quieter.md`.

### distill
- *Does:* strip to essence, remove unnecessary complexity.
- *Engagement:* **suggest** · *Fires:* on cluttered elements (many competing children); aligns with Loomling restraint.
- *In Loomling:* tokens-only; §14 snapshot if approved. *Playbook:* `reference/distill.md`.

### harden
- *Does:* make production-ready — error/empty states, text overflow, i18n, edge cases under real data.
- *Engagement:* **flag** · *Fires:* at publish/composition (§16); also routed from `text-overflow`.
- *In Loomling:* correctness-leaning; structural fixes applied on consent; §14 snapshot if approved. *Playbook:* `reference/harden.md`.

### clarify
- *Does:* fix UX copy — labels, error messages, microcopy.
- *Engagement:* **flag** · *Fires:* routed from `em-dash-overuse` (and buzzword/aphoristic-cadence checks) against `system/voice.md`.
- *In Loomling:* governed by `voice.md`; the audience question (§8) informs tone. *Playbook:* `reference/clarify.md`.

### adapt
- *Does:* make a design work across screen sizes/devices — breakpoints, fluid layout, touch targets.
- *Engagement:* **flag** · *Fires:* at publish (§16) and routed from `text-overflow`.
- *In Loomling:* breakpoints from `system/space.md`; §14 snapshot if approved. *Playbook:* `reference/adapt.md`.

### optimize
- *Does:* diagnose + fix UI performance — loading, rendering, images, bundle.
- *Engagement:* **on-request** · *Fires:* not proactive; mostly stack-dependent (deferred until a stack is declared, §10).
- *In Loomling:* most of its scope arrives with a stack. *Playbook:* `reference/optimize.md`.

### colorize
- *Does:* add strategic color to a monochromatic UI.
- *Engagement:* **suggest** · *Fires:* the contrast fix path (`low-contrast` → darken toward ink, or add accent); broader "flat palette" tells are off by default (§22).
- *In Loomling:* via semantic tokens / Tokens Import (§17), never raw hex; §14 snapshot if approved. *Playbook:* `reference/colorize.md`.

### layout
- *Does:* improve layout, spacing, rhythm, visual hierarchy.
- *Engagement:* **suggest** · *Fires:* routed from `cramped-padding` and `line-length`.
- *In Loomling:* spacing/grid tokens from `system/space.md`; §14 snapshot if approved. *Playbook:* `reference/layout.md`.

### animate
- *Does:* add purposeful motion + micro-interactions.
- *Engagement:* **suggest** (low-frequency) · *Fires:* rarely, and only within `system/motion.md` (motion is already a solved system, §20).
- *In Loomling:* motion tokens + `prefers-reduced-motion` only; §14 snapshot if approved. *Playbook:* `reference/animate.md`.

### delight
- *Does:* add personality, memorable touches.
- *Engagement:* **suggest** (opt-in) · *Fires:* sparingly; pure taste, easy to decline.
- *In Loomling:* tokens-only; must not fight restraint; §14 snapshot if approved. *Playbook:* `reference/delight.md`.

### overdrive
- *Does:* push past conventional limits — ambitious, technically extraordinary effects.
- *Engagement:* **on-request** · *Fires:* never proactive — high-risk vs Loomling discipline; explicit ask only.
- *In Loomling:* still tokens + drift + §14; likely a stack-level conversation first. *Playbook:* `reference/overdrive.md`.

---

## Correctness findings without a taste capability

Some §22 findings are pure correctness and are flagged + fixed directly, not via a taste capability: `skipped-heading` (fix per `system/seo.md`), `broken-image` (supply a real asset or confirm the slot is intentionally empty), `tiny-text` (raise to a body token; `typeset` is not adopted — handle directly).

## Not here

`typeset` (skipped, ADR 0020), `onboard` (Loomling has its own onboarding, §21 — revisit later), and the build/evaluate commands (`craft`/`shape`/`extract`, `critique`/`audit`) are documented elsewhere or deferred — see ADR 0020. This catalog is editing capabilities only.
