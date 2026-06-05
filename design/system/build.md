# Build moves (shape, extract)

Two of impeccable's build commands are adopted into Loomling, adapted to the authoring contract (§4). The third — `craft` — is deliberately **not** adopted as-is: it assumes it owns the build, and §4 keeps that role. See ADR 0025.

## shape — plan before code

An optional **pre-step** to §4 authoring. For a non-trivial or ambiguous request, before writing files CC runs a short discovery — who/what it's for, the key states, any references — and confirms a one-paragraph brief with the user, then authors per §4.

- Use it when the request is large or underspecified; skip it for a simple atom.
- It produces a **confirmed brief, not files.** The build still follows §4 (category → files → manifest → report → the proactive pass, §24).
- Maps to impeccable `reference/shape.md`.

## extract — pull drift back into the system

When CC notices the same raw value or markup pattern recurring across elements (drift), it can **extract** it back into the system rather than let it spread:

- A repeated raw value → a new token in `src/tokens.css` (drift path B, §5) + a note in the relevant `system/*.md`.
- A repeated markup pattern → a new component, authored per §4 and **appended to the manifest** (§4c, §9).

Engagement is **flag** (§24): CC surfaces the drift and offers the extraction, one-tap, never silent. It writes **into** the manifest and tokens — never a parallel store. Maps to impeccable `reference/extract.md`.

## craft — not adopted as-is

impeccable's `craft` shapes, then builds a feature end-to-end on its own terms, around the manifest. **Loomling keeps its authoring contract (§4) as the build flow.** CC borrows craft's good ideas — shape-first (above) and visual iteration (screenshot the preview and refine before reporting) — but never its write-around-the-manifest behavior. Rationale + alternatives in ADR 0025.
