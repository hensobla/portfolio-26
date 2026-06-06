# Drift dialog template

Use when a user request conflicts with a rule in `system/*.md`.

```
The request conflicts with a rule:

  "<rule excerpt>" — system/<file>.md

Three paths:

  A. Abide. Use <in-system alternative> instead.
  B. Extend. Add <proposed extension> as a new token / entry in
     system/<file>.md. Stays in the spirit of the system.
  C. Amend. Rewrite the rule itself. This is a system change
     and gets recorded as an ADR.

Which do you want?
```

Then wait for the user. On (B): edit the relevant system file + `src/tokens.css` if applicable. On (C): edit the system file AND append `decisions/NNNN-<slug>.md`.

If the drift touches accessibility (`system/accessibility.md`), use the accessibility-specific dialog:

```
That change would lower accessibility — specifically <which rule>.

Before I do that, here are alternatives that preserve accessibility:

  1. <alt 1>
  2. <alt 2>

If you still want the lower-accessibility version, say so explicitly
and I'll proceed.
```
