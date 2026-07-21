# Protected-path enforcement hooks

Deterministic enforcement of the owner-gated surfaces from `AGENTS.md`
("Change control and multi-agent coordination", rule 4) and
`docs/MULTI_MODEL_OPERATING_GUIDE.md` (section 11).

## What is enforced

`.claude/settings.json` registers `protectedPaths.mjs` as a Claude Code
**PreToolUse** hook on the file-editing tools (`Edit`, `Write`, `NotebookEdit`).
Writes to these surfaces are blocked with exit code 2:

- `.github/workflows/**` — workflow configuration (owner-gated).
- `src/systems/SaveSystem*` — save schema, migration logic, and
  `CURRENT_SAVE_VERSION` (owner-gated).

## Owner-approval marker

To authorize a specific, owner-approved change, create a `.owner-approval`
file at the repository root listing the unlocked pattern(s), one per line
(`#` comments allowed):

```
# owner approval 2026-07-21: CI cache-key fix, PR #NNN
.github/workflows/**
```

The file is gitignored: approval is per-clone and deliberate, never inherited
through the repository. Delete the file when the approved change lands.

## Known limitations (by design, documented not hidden)

- Only file-editing tools are intercepted. Shell commands (`Bash`,
  `PowerShell`) can still write protected paths; the deterministic backstop
  for those remains branch protection, CI, and owner review — this hook is
  one enforcement layer, not the only one (guide section 11).
- The hook fails open on malformed input so a hook bug can never brick a
  session; failing open is acceptable because merge-time gates still hold.

## Tests

`tests/unit/protectedPaths.test.ts` covers the decision logic (pure function,
no I/O). Run: `npx vitest run tests/unit/protectedPaths.test.ts`.
