# Tokens

Design tokens are the **only** way components reference design values. No raw hex, no magic numbers, no inline pixel values. Components use CSS custom properties defined in `src/tokens.css`.

## Two layers

1. **Primitive tokens** — the raw values. Named for what they are.
   - `--color-blue-500`, `--font-family-display`, `--space-4`
2. **Semantic tokens** — what primitive to use in context. Named for their role.
   - `--background` (background), `--text1` (text), `--accent`, `--measure` (max line length)

Components reference **semantic tokens** wherever possible. Primitives are for the system layer (theme definitions, mode swaps).

## Naming conventions

- Kebab-case throughout.
- Numeric scales use 50–950 (with 500 as the perceptual midpoint).
- Semantic names describe role, not value: `--background`, not `--white`.

## How CC adds a token

1. Decide if it's primitive or semantic.
2. Add to `src/tokens.css` under the appropriate section comment.
3. Update the relevant rule MD (`color.md`, `typography.md`, `space.md`) to document the new token.
4. If the token introduces a new *category* (not just a value), append an ADR to `decisions/`.

## Forbidden

- Raw values in component CSS (`color: #ff0066`, `padding: 12px`). Use tokens.
- Inline styles in component HTML for design properties. Layout-only inline styles in templates are fine.
- Naming a token after a component (`--button-bg`). Tokens are project-wide. Component-scoped CSS variables can be derived from tokens locally, but the source is always the token.
