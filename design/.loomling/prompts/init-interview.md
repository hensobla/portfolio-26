# Init interview script

Run when `project.json.initializedAt` is `null` AND `INITIALIZE.md` exists. Walk one question at a time. Do not batch.

## 1. Project name

> "What's the project called? Short and lowercase is fine."

Write to:
- `project.json.name`
- `library/manifest.json.project.name`

## 2. Purpose

> "In one sentence, what is this site for?"

Write to:
- `project.json.purpose`
- Replace the opening line of `README.md` with the project's name + purpose.

## 3. Brand source (optional)

> "Do you have a website that already represents this brand we should pull from? (Optional — if yes, paste the URL.)"

If yes → write URL to `project.json.brandSource`.

**Do NOT** scrape, fetch, or analyze the URL now. The user has more guidance to provide later about how they want brand extraction done. Just store the URL.

## 4. Brand color seeds

> "What's the primary accent color? Any preference for the neutral scale — warm, cool, or true?"

Action:
- Pick a hue family for the accent (e.g., the user says "deep teal" → use a teal hue).
- Generate a full 50–950 ramp for the accent and the neutral scale in `src/tokens.css`. Replace the placeholder neutrals + accent in the `:root` block.
- Update `system/color.md` "Palette" and "Surface map" sections with the chosen tokens.

If a brand source was provided in #3, mention you have it noted but will defer extraction until the user gives more guidance.

## 5. Typography intent

> "Serif, sans, or mono dominant? Any vibe references — modern, editorial, technical?"

Action:
- Update `--font-display` and `--font-body` (and `--font-mono` if needed) in `src/tokens.css`. Use a system-font stack by default unless the user specifies a webfont.
- Update `system/typography.md` "Families" section.

## 6. Voice

> "Three adjectives describing how this site should sound."

Action:
- Update `system/voice.md` "Three adjectives" section.

## Finalize

1. Set `project.json.initializedAt` to today's ISO date (YYYY-MM-DD).
2. Confirm with the user:

   > "Initialized. Run `npx http-server . -c-1` from the project root and open http://localhost:8080/library/ to see your tokens. Ready to start building when you are."

3. Suggest they delete `INITIALIZE.md` (it's purely a trigger marker — its absence does nothing).
