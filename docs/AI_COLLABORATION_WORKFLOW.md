# AI Collaboration Workflow

Eldoria uses three distinct roles so additional automation increases throughput without weakening scope control.

## Roles

- **Codex** owns task definition, repository integration, local verification, review triage, and merge decisions.
- **Jules** implements one approved, narrowly scoped task on a branch based on current `main`.
- **Gemini** independently reviews pull requests. Its findings are advisory and never authorize a merge.

## Jules Task Lifecycle

1. Codex confirms the next task is already approved and writes a prompt with the goal, allowed systems or files, hard exclusions, acceptance criteria, required checks, and PR instructions.
2. Jules starts from latest `main`. Review its proposed plan before execution and reject any extra features, dependencies, files, or systems.
3. Jules implements the task, runs the requested checks, records meaningful changes in `docs/CHATGPT_CHANGELOG.md`, and publishes one draft PR. Jules does not merge.
4. CI and Gemini review the PR. Codex inspects the complete diff, reruns relevant checks, verifies gameplay when applicable, and resolves or rebuts valid findings.
5. Codex squash-merges only when the branch remains cleanly scoped. Close and recreate mixed branches instead of piling corrective work onto them.

Use this identity for Jules changelog entries:

`Jules via Google, coordinated by Codex`

## Jules Prompt Template

Every Jules prompt should state:

- **Goal:** one concrete outcome.
- **Base:** latest clean `main`.
- **Allowed scope:** the exact systems or files the task may change.
- **Hard exclusions:** gameplay, data, dependencies, or adjacent cleanup that must remain untouched.
- **Acceptance criteria:** observable behavior and compatibility requirements.
- **Checks:** targeted tests plus `npm run check`, `npm run build`, and `npm run smoke` when applicable.
- **Delivery:** one draft PR, a changelog entry, an exact file list, check results, and remaining risks.

For the first three clean Jules PRs, run only one task at a time. After that probation period, at most two tasks may run concurrently, and only when their files and systems are disjoint. Do not enable scheduled design, optimization, or maintenance tasks during probation.

## Gemini Review Policy

Gemini reviews same-repository PRs automatically when they are opened or reopened. It does not rerun on every push. After substantive fixes, an owner, member, or collaborator can request another review with:

```text
@gemini-cli /review
```

Optional focus follows the command, such as `@gemini-cli /review focus on save compatibility`.

- Critical and high findings must be fixed or explicitly rejected with evidence before merge.
- Medium findings are fixed when valid and in scope; otherwise defer them to a separate task.
- Low and stylistic findings normally remain deferred.
- CI failures always block merge.
- Gemini cannot push, approve, request changes, or merge. Codex remains the merge gate.

## Security Boundaries

- Store the Gemini key only in the GitHub Actions secret `GEMINI_API_KEY`.
- Never put API keys in prompts, source files, logs, screenshots, or PR comments.
- Gemini reviews same-repository branches only; fork pull requests do not receive the secret-backed review.
- The review workflow has read-only repository access and permission to write PR review comments. It has no content-write or merge permission.
- Do not use `pull_request_target` for this workflow.
