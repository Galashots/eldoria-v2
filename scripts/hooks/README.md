# Protected-path guardrail hooks

Deterministic **guardrail** for two owner-gated path families from `AGENTS.md`
("Change control and multi-agent coordination", rule 4) and
`docs/MULTI_MODEL_OPERATING_GUIDE.md` (section 11). A guardrail against
accidental agent writes — not a security boundary and not comprehensive
enforcement of every owner-gated surface in rule 4 (profile IDs, privacy
systems, etc. remain covered by review and branch protection only).

## What is guarded

`.claude/settings.json` registers `protectedPaths.mjs` as a Claude Code
**PreToolUse** hook (documented portable exec form: `command: "node"` plus
`args`) on the core file-editing tools (`Edit`, `Write`, `NotebookEdit`).
Writes to these path families are blocked with exit code 2:

- `.github/workflows/**` — workflow configuration (owner-gated).
- `src/systems/SaveSystem*` — save schema, migration logic, and
  `CURRENT_SAVE_VERSION` (owner-gated).

Paths are canonicalized before matching (`.`/`..` resolved, slashes
normalized) and patterns match case-insensitively: required on Windows;
on case-sensitive filesystems this can only over-block odd spellings,
never under-block the protected files.

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
Note: the marker records local authorization; it does not authenticate who
created it. The authority boundary remains branch protection and owner review.

## Known limitations (by design, documented not hidden)

- Only the three core file-editing tools are intercepted. Shell commands
  (`Bash`, `PowerShell`) and any configured MCP filesystem tools can still
  write protected paths; the deterministic backstop for those remains branch
  protection, CI, and owner review — this hook is one layer per guide
  section 11, not the only one.
- Malformed or incomplete hook input is permitted to continue (the guardrail
  is not the merge authority), but a diagnostic is emitted to stderr so a
  protocol change cannot silently disable it.

## Tests

- `tests/unit/protectedPaths.test.ts` — pure decision logic, including
  dot-dot traversal and Windows case-variant regressions.
- `tests/unit/protectedPathsCli.test.ts` — spawned-process coverage of the
  stdin protocol, exit codes, marker file I/O, and the committed exec-form
  registration.

Run: `npx vitest run tests/unit/protectedPaths.test.ts tests/unit/protectedPathsCli.test.ts`.
