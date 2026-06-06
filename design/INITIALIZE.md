# Initialize this Loomling project

The presence of this file signals to Claude Code that this project has not been initialized yet. On the first turn, CC will read this file and walk you through a short interview.

CC determines whether to run the interview by checking `project.json` — if `initializedAt` is `null`, the interview runs. Once you finish, CC sets `initializedAt` to the current ISO timestamp. This file is then yours to delete (or keep as a reference).

## What the interview asks

**Required (asked up front):**

1. **Project name** — short, lowercase ok. Used in `project.json` and `library/manifest.json`.
2. **One-sentence purpose** — what is this site for? Goes into `README.md`.
3. **Existing-brand reference (optional)** — *"Do you have a website that already represents the brand we should pull from?"* If yes, share the URL. CC stores it in `project.json.brandSource`. **The how of extracting brand attributes is intentionally deferred** — you can tell CC later how you want it done (manual transcription, screenshots, etc.).
4. **Brand color seeds** — at least one accent color and a neutral-scale preference (warm / cool / true). If you provided a brand source above, CC will offer extracted defaults to accept or edit. Seeds `src/tokens.css` + `system/color.md`.
5. **Typography intent** — serif / sans / mono mix, vibe references. Seeds `system/typography.md`.
6. **Voice** — three adjectives describing how the site should *sound*. Seeds `system/voice.md`.

**Deferred (asked only at the moment you need them):**

7. Target audience
8. Stack (default `null` — CC asks the first time you request routing, data fetching, or non-trivial JS)
9. Deployment target
10. CMS / content source
11. Analytics

## What happens after the interview

- `project.json` gets a real `initializedAt` timestamp + your answers.
- `src/tokens.css` and the relevant `system/*.md` files (`color.md`, `typography.md`, `voice.md`) are populated.
- `README.md` is rewritten with your project's purpose.
- CC is now ready to build. Serve the project from the root (`npx http-server . -c-1`) and open `http://localhost:8080/library/` to watch the Loom fill.

## How to re-run

If you want to redo init, set `project.json.initializedAt` back to `null`. CC will walk through the interview again on the next turn.
