# ChatGPT Change Log

This file keeps recent, high-value change summaries. Detailed historical entries through 2026-07-11 remain in [`docs/changelog/legacy-through-2026-07-11.md`](changelog/legacy-through-2026-07-11.md); later superseded detail remains available in Git history and the relevant PRs.

Each entry should state the actual author, branch or PR, concise scope, verification, compatibility, and remaining risk. Implementation narratives belong in PR descriptions, commits, and audit records.

## 2026-07-21 — Product master plan, guidance compaction, and character perspective lock

- Author/branch: ChatGPT, `chatgpt/eldoria-master-plan-v2`, PR #123.
- Scope: adds `docs/ELDORIA_MASTER_PLAN.md` as the stable product/world authority; adds the binding elevated-three-quarter `CHARACTER_PERSPECTIVE_LOCK_V1.md`; rewrites the visual-transformation plan; updates hero, armor, visual, merge, review, and cross-provider guidance; routes agents through smaller task-specific reading sets; compacts `CURRENT_STATE.md`; refreshes the public README; and removes stale asset-production status from durable workflow documents.
- Verification: documentation source-of-truth, link, contradiction, stale-status, merge-policy, and obsolete-command audit; exact-head `build` and `emulation` CI plus independent Kimi review remain required after the final documentation commit.
- Compatibility: documentation and target metadata only. No runtime, map, save, curriculum, quest, dependency, workflow, or asset-pixel change.
- Remaining risk: the proposed `32×48` character proof canvas and prompt strategy still require a bounded four-direction runtime trial; physical-iPad and child validation remain outstanding.

## 2026-07-21 — Decor-scatter placement primitive

- Author/branch: Claude Code and Kimi K3 under explicit ownership transfer, `claude/d6-decor-scatter`, PR #122.
- Scope: pure seeded Decor placement, static map/registry-derived exclusions, Phaser-free Wildbloom spot constants, and a complete 38-placement Farm diff gate. The primitive is not scene-integrated.
- Verification: ChatGPT's independent review amendments pin the full placement output and clear every Tiled transformation flag; final exact-head `build` and `emulation` CI passed before merge.
- Compatibility: additive only; no map, save, quest, curriculum, profile-ID, dependency, workflow, or runtime-visual change.
- Remaining risk: density, weighting, invalid-config handling, and real in-game appearance remain for the approved scatter-art integration PR.

## 2026-07-21 — Protected-path Claude file-tool guardrail

- Author/branch: Claude Code, `claude/protected-path-hooks`, PR #121.
- Scope: portable PreToolUse guardrail for core Claude file tools writing `.github/workflows/**` or `src/systems/SaveSystem*`, with an ignored owner-approval marker and documented shell/MCP limitations.
- Verification: traversal, Windows-case, stdin/exit-code, marker-I/O, and committed-settings regressions passed; exact-head `build` and `emulation` CI passed before owner merge.
- Compatibility: no runtime, save, curriculum, quest, asset, dependency, or workflow-file change.
- Remaining risk: this is an accidental-write guardrail, not a security boundary.

## 2026-07-21 — Multi-model operating guide adopted and streamlined

- Initial implementation: Claude Code; independent reviews and adjudication by Kimi and ChatGPT. Current v1.2 compaction is part of PR #123.
- Scope: one accountable implementation owner per branch, visible coordination surfaces, different-provider review, exact-head evidence, merge-commit-only history, delegated non-self merging, and reserved owner gates.
- Verification: repository guidance cross-checked against `AGENTS.md`; PR #123 requires fresh exact-head CI and independent Kimi review.
- Compatibility: governance/documentation only.
- Remaining risk: process quality still depends on agents verifying evidence rather than trusting completion summaries.
