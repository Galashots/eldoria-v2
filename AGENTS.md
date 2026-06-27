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

Before adding new features, preserve all of the above unless the task explicitly says otherwise.

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

## Current best near-term roadmap

Work in this order unless the user gives a different priority:

1. Stabilize the current vertical slice.
   - Run install/check/build/smoke/dev.
   - Fix TypeScript/runtime errors.
   - Confirm title screen, profile select, movement, joystick, ACTION, Mira quest loop, prompt choices, read-aloud, and save/load.
2. Add reward juice.
   - Floating +Gold.
   - Sparkle burst on correct bonus.
   - Better crop/combat feedback.
   - Clearer Practice Slime completion feedback.
3. Improve quest/content data structure.
   - Move hardcoded Mira quest/dialogue toward data-driven structures.
   - Keep implementation small.
4. Add mastery tracking.
   - Track attempts/correct/streak/difficulty per skill.
   - Do not add parent dashboards yet until local data is reliable.
5. Expand curriculum templates.
   - Add only a few high-quality templates per PR.
   - Keep prompts contextual to game mechanics.

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

Tell the user to switch back to ChatGPT when the task needs:

- Product direction or prioritization.
- Curriculum design decisions.
- Alberta curriculum mapping.
- 2D RPG design synthesis.
- Kid UX/accessibility judgment.
- PR audit before merge.
- Sprite/image prompt design.
- Story, quest, dialogue, naming, or worldbuilding.
- Larger architectural tradeoff decisions.
- Any question where the right answer is not mainly in the codebase.

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
