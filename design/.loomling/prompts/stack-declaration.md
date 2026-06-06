# Stack declaration runbook

Triggered when `project.json.stack` flips from `null` to a string value (either because the user asked for something stack-dependent, or declared a stack directly).

## Step 1: Capture the choice

Confirm the stack name and the trigger:

- What stack: e.g. `next-app-router`, `astro`, `sveltekit`, `vite-react`, `vite-vue`, `nuxt`, plain `vite`, etc.
- Why now: what request prompted this (routing, data fetching, package install, deployment).

Write the value into both:
- `project.json.stack`
- `library/manifest.json.project.stack`

## Step 2: ADR

Append `decisions/NNNN-stack-<slug>.md`:

```markdown
# NNNN — Stack: <name>

**Date:** YYYY-MM-DD
**Status:** accepted
**Context:** <what prompted the choice — the trigger request>
**Decision:** Use <stack> for this project.
**Consequences:** <what this enables, what it forecloses, where existing pieces live>

**Alternatives considered:**
- <alt 1>
- <alt 2>
```

## Step 3: Scaffold framework files

Use the framework's idiomatic defaults. Don't introduce custom tooling, plugins, or CI without asking.

Standard touch points:
- `package.json` with framework deps
- Framework config (e.g., `next.config.mjs`, `astro.config.mjs`)
- Entry point (e.g., `app/layout.tsx`, `src/layouts/Default.astro`)
- Global stylesheet import of `src/tokens.css`

Do NOT move existing vanilla Elements out of `src/components|modules|templates/`.

## Step 4: Compatibility sweep

For each entry in `library/manifest.json.entries`:

1. **Tokens import.** Make sure `src/tokens.css` is imported once in the framework's global style entry.
2. **Asset paths.** Verify relative paths in `preview.html` still resolve under the framework's static-serving rules. Common fix: move `preview.html` files to `public/previews/<slug>.html` if the framework's dev server doesn't serve from `src/`.
3. **Selector collisions.** Confirm `[data-loom*="..."]` attributes aren't being stripped by the framework's optimizer.
4. **Minimum changes only.** Preserve original markup, class names, and styling to the highest degree possible. The piece should look identical post-stack.

For any non-trivial change made during the sweep, append an ADR.

## Step 5: Framework wrappers (optional)

For each existing manifest entry, optionally generate a thin framework wrapper:

- React: `src/components/<slug>/<Name>.tsx` returning the same JSX as the HTML markup, with the same `[data-loom]` root attribute.
- Vue/Svelte/etc.: idiomatic equivalent.

Append a **new** manifest entry for the wrapper (don't replace the vanilla entry). The vanilla entry stays; the wrapper entry has `filePath` pointing to the framework file and `previewPath` pointing to a framework-rendered preview.

## Step 6: Framework-native Loom (optional)

Scaffold a framework route (e.g., `/library`) that reads the same `library/manifest.json`. The static `library/index.html` keeps working — it's a fallback.

## Step 7: Report back

Tell the user:
- Stack written + ADR path
- Files scaffolded
- Compatibility sweep results (passed / changes made)
- Whether wrappers + framework-native Loom were created
- What to run next (e.g., `npm install && npm run dev`)
