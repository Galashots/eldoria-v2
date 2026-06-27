# Eldoria-V2 Agent Instructions

## Project

This repository is `Galashots/eldoria-v2`, a private/offline fantasy-learning 2D RPG for two boys preparing for Grade 2 and Grade 5 in Calgary, Alberta.

The game should feel like a beautiful, fun, low-friction fantasy RPG first. Learning should be embedded into play as optional bonuses, not presented as worksheets or blocking quizzes.

## Non-negotiable product rule

Learning must never gate adventure.

Correct answers may grant bonuses such as gold, harvest boosts, critical hits, clues, cosmetics, crafting help, better loot, pets, mounts, or convenience rewards.

Wrong answers or skipped prompts must not block quest progress.

## Current implementation baseline

Current `main` includes:

- Phaser + Vite + TypeScript + Tiled architecture.
- Grade 2 audio-first profile.
- Grade 5 reader-mode profile.
- Grade 2 read-aloud support for prompts.
- Curriculum-aware question engine foundation.
- Starter Mira quest/objective loop.
- Objective HUD.
- Persistent `firstQuestStep` save data.
- Dynamic lower-left virtual joystick.
- Lower-right ACTION button.
- Playwright vertical-slice smoke-test coverage.
- Data-driven Mira first-errand quest content.
- Floating reward text, sparkle feedback, and the persistent Sunberry Charm keepsake.
- Per-skill mastery tracking for seen, attempted, correct, wrong, skipped, and streak outcomes.
- Contextual Grade 2 and Grade 5 prompt templates plus a development/test-only deterministic preview.
- A validated visual asset contract, production target specs, and generated-art normalization tooling.
- The normalized Practice Slime v001 asset, not yet loaded into the world.

Before adding new features, preserve all of the above unless the task explicitly says otherwise.

Read [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) for the active milestone and current next step. Keep volatile roadmap status there instead of duplicating it in this file.

## Target player assumptions

### Grade 2 profile

- Audio-first.
- Minimal reading burden.
- Short prompts.
- Clear visual direction.
- Simple choices.
- Encouraging feedback.
- No punishment for wrong answers.

### Grade 5 profile

- Reader-mode.
- Can handle richer text.
- Can handle multi-step reasoning.
- Can use evidence, estimation, area/perimeter, decimals, science concepts, and social-studies reasoning.
- Still should feel like RPG play, not homework.

## Design pillars

Use the deep-research findings as direction:

1. Build one excellent vertical slice before expanding scope.
2. Prioritize cohesive feel over feature volume.
3. Use readable premium pixel art and clear silhouettes.
4. Make every 10-15 minute session create permanent progress.
5. Design quests as playable learning arcs, not quizzes in disguise.
6. Keep early systems small, polished, and easy to understand.
7. Preserve child-friendly safety and accessibility defaults.
8. Prefer visible curiosity, clear objectives, and low-friction traversal.

Visual asset work must follow [`docs/VISUAL_ASSET_CONTRACT.md`](docs/VISUAL_ASSET_CONTRACT.md).

## ChatGPT vs Codex split

Use Codex for:

- Reading and editing repo files.
- Running `npm install`, `npm run check`, `npm run build`, and `npm run dev`.
- Running `npm run smoke` for repeatable browser-game regression coverage.
- Debugging TypeScript/runtime issues.
- Implementing scoped PRs.
- Inspecting changed files and command output.
- Refactoring code.
- Validating game behavior locally.
- Planning and self-merging routine, previously agreed, narrowly scoped PRs after full verification.

Tell the user to switch back to ChatGPT when the task needs:

- Product direction or prioritization.
- Curriculum design decisions.
- Alberta curriculum mapping.
- 2D RPG design synthesis.
- Kid UX/accessibility judgment.
- Milestone audit after a related run of routine PRs.
- Sprite/image prompt design.
- Story, quest, dialogue, naming, or worldbuilding.
- Larger architectural tradeoff decisions.
- Any question where the right answer is not mainly in the codebase.

Routine PRs may be squash-merged by Codex without a separate ChatGPT audit when they remain within an agreed objective, all targeted and standard checks pass, gameplay/UI changes receive browser inspection, and the final diff contains no unrelated work. Stop for user or ChatGPT review if scope expands or the work changes curriculum direction, kid UX, story, asset-generation direction, save compatibility, economy, quest design, major dependencies, or architecture.

## Required workflow

For each task:

1. Start from latest `main` unless told otherwise.
2. Inspect relevant files before editing.
3. Run checks before and after meaningful code changes when possible.
4. Keep PRs small and focused.
5. Do not silently rewrite unrelated systems.
6. Preserve the bonus-only learning rule.
7. Preserve Grade 2 audio-first support.
8. Preserve current save compatibility unless explicitly migrating saves.
9. Record meaningful repository changes in `docs/CHATGPT_CHANGELOG.md`.
10. Update `docs/CURRENT_STATE.md` when a merge changes the active milestone, current capabilities, or next planned step.

## Changelog rule

Every meaningful repo change must include an entry in:

`docs/CHATGPT_CHANGELOG.md`

Include:

- Date.
- Agent identity.
- Branch name.
- Files changed.
- Summary.
- Implementation notes.
- Reason for change.

Use this identity unless the user says otherwise:

`Codex via OpenAI, coordinated with GPT-5.5 Thinking`

## Testing expectation

Before opening or merging a PR, attempt:

```bash
npm install
npm run check
npm run build
npm run smoke
```

For gameplay/UI changes, also run:

```bash
npm run dev
```

Then manually inspect the browser game when possible.

For generated asset changes, also run the relevant manifest normalization/validation command and `npm run test:asset-pipeline`.

Report clearly:

- What passed.
- What failed.
- What was not run.
- What changed.
- What remains risky.
- Whether the user should switch back to ChatGPT for design/audit.

## Default response format to user

When done with a task, report:

1. Branch or PR number.
2. Files changed.
3. Checks run and results.
4. Gameplay behavior verified.
5. Risks or unknowns.
6. Whether the next step should stay in Codex or switch back to ChatGPT.
