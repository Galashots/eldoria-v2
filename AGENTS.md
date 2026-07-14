# Eldoria-V2 Agent Instructions

## Purpose

This repository is `Galashots/eldoria-v2`, a public, family-friendly fantasy-learning 2D RPG for Grade 2 and Grade 5 players.

The game must feel like a polished fantasy RPG first. Learning is embedded as optional help and bonuses, never as a barrier to play.

Because the repository is public:

- never commit credentials, secrets, private conversations, photos, recordings, or additional identifying information;
- refer to playtesters by profile only;
- keep any existing personal context general and do not expand it.

## Non-negotiable product rules

1. **Learning never gates adventure.** Wrong answers and skipped prompts must not block movement, exploration, quest progress, baseline rewards, retries, or story progression.
2. Preserve the Grade 2 audio-first path and Grade 5 reader-mode path.
3. Preserve stable internal profile IDs, especially `grade2-mage` and `grade5-adventurer`, unless an explicit migration is approved and tested.
4. Do not add random loot, variable-reward pressure, countdown pressure, daily/streak pressure, manipulative retention loops, or punishment for disengaging.
5. Preserve save compatibility unless a migration is explicitly approved, implemented, and tested.
6. Do not destructively rewrite curriculum, quests, mastery, rewards, or interaction IDs.
7. Keep gameplay authority out of visual-only controllers.
8. Do not copy protected game assets or UI. Reference art defines quality, hierarchy, mood, and technique only.
9. Generated concept or style-reference art is not automatically production-ready source art.
10. Do not claim physical-iPad or child validation unless it actually occurred.

## Player assumptions

### Grade 2 Mage

- Audio-first and usable without independent reading.
- Short prompts, simple choices, clear visual direction, large touch targets, and read-aloud support.
- Encouraging feedback with no punishment for wrong answers.

### Grade 5 Ranger Explorer

- Reader-mode with richer text and multi-step reasoning.
- May use evidence, estimation, fractions/decimals, area/perimeter, science, and social-studies reasoning.
- Must still feel like capable RPG play rather than schoolwork.
- The player-facing identity is **Ranger Explorer**; the stable internal ID remains `grade5-adventurer`.

## Design priorities

1. Build and polish one strong vertical slice before expanding scope.
2. Prioritize cohesive feel over feature volume.
3. Use readable silhouettes, consistent perspective, and premium pixel-art presentation.
4. Make short sessions create understandable permanent progress.
5. Design quests as playable learning arcs, not quizzes in disguise.
6. Prefer visible curiosity, clear objectives, low-friction traversal, and child-safe feedback.
7. Keep systems small, isolated, testable, and easy to understand.

## Documentation source of truth

Start with [`docs/README.md`](docs/README.md), which identifies the canonical document for each topic.

Key rules:

- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) owns volatile implementation status, the active milestone, known risks, and the next checkpoint.
- [`docs/VISUAL_ASSET_CONTRACT.md`](docs/VISUAL_ASSET_CONTRACT.md) owns durable visual rules.
- Machine-readable files under `docs/visual-targets/` are authoritative for target geometry, variants, pivots, palettes, and metadata.
- [`docs/art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`](docs/art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md) owns the current farm-art generation order while that milestone is active.
- [`docs/art-pipeline/CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md`](docs/art-pipeline/CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md) owns the minimal-touch ChatGPT generate → audit → correct → approve protocol and the boundary between visual approval and deterministic repo ingestion.
- Completed milestone plans are historical records. Do not re-execute them without a new approved scope.
- Keep volatile status out of this file.

## Agent responsibilities

Engineering agents such as Claude Code or Codex are appropriate for:

- reading and editing repository files;
- implementing agreed, scoped changes;
- debugging TypeScript, Phaser, tests, maps, and build tooling;
- running automated checks and browser playtests;
- preparing focused pull requests;
- documenting exact changes, evidence, and remaining risks.

Return to ChatGPT or the user for:

- product direction and prioritization;
- curriculum or Alberta-alignment decisions;
- kid UX and accessibility judgment;
- story, dialogue, naming, worldbuilding, reward/economy direction, or quest design;
- sprite/image generation and source-art approval;
- visual quality judgment against reference art;
- save-schema, architecture, major-dependency, or broad-scope tradeoffs;
- milestone audits after a run of implementation work.

For image-generation work, ChatGPT owns corrective prompting and visual QA. The user should not be asked to diagnose technical failures such as seam behavior, palette drift, key-colour contamination, runtime occupancy, modular connection logic, or pivot fit. Follow the closed-loop workflow and bring the user a passing approval package or a material target-size/art-direction decision.

## Required workflow

For every task:

1. Start from current `main` unless an explicit branch or stacked-PR base is provided.
2. Confirm the repository, branch, base, and exact head before editing.
3. Read the relevant source-of-truth documents and inspect the affected code/assets first.
4. State any material ambiguity or risk before implementation.
5. Keep the change narrowly scoped; do not modify unrelated files or systems.
6. Preserve the product rules, profile IDs, save compatibility, curriculum, quests, and interaction semantics unless the task explicitly changes them.
7. Add or update tests when behavior changes.
8. Add reviewable browser evidence for gameplay, UI, map, or visual changes.
9. Record meaningful repository changes in `docs/CHATGPT_CHANGELOG.md`.
10. Update `docs/CURRENT_STATE.md` only when capabilities, active milestone, known risks, or next steps materially change.
11. Open a focused PR. Do not merge a draft, red CI, unreviewed visual change, or branch with unrelated history.

For generated asset tasks specifically:

1. Resolve the authoritative target geometry, palette, variant, footprint, pivot, and batch order before generation.
2. Audit the high-resolution source and the exact runtime pixels.
3. Use only the formal verdict vocabulary in the asset guides.
4. Prefer a deterministic Approved Runtime Master correction only when the runtime composition is already correct and the remaining fixes are narrow and auditable.
5. Preserve user approval as the final art-direction gate before repo ingestion.
6. Do not create fake-complete packed sheets or start runtime/map integration for incomplete families.

## Verification

Use reproducible installation for CI-equivalent checks:

```bash
npm ci
npm run check
npm run test:visual-targets
npm run test:asset-pipeline
npm run test:unit
npm run smoke
```

`npm run check` validates the actual committed visual-target documents (`docs/visual-targets/*.json`) against the schema, type checks, and builds. `npm run test:visual-targets` is a separate regression suite that exercises the validator itself with positive and negative in-memory cases (a well-formed future swatch group, an invalid hex, a malformed non-array swatch, etc.) — it does not touch the committed documents. Use `npm install` only when intentionally changing dependencies or the lockfile.

Additional expectations:

- Gameplay/UI/map changes: run the game, interact with the changed flow in a browser, and inspect screenshots.
- Runtime-integrated visual PRs: include before/after evidence, Mage and Ranger evidence when relevant, an iPad-like landscape viewport, and a contact sheet or clearly named image set.
- Source-only asset PRs: full-game screenshots are not required before the asset is loaded; use exact runtime output, enlarged nearest-neighbour inspection, and the type-specific evidence required by the closed-loop workflow.
- Generated assets: normalize and validate every relevant manifest, inspect exact 1× and enlarged nearest-neighbour previews, record provenance, and include type-specific evidence from the closed-loop workflow.
- Save migrations: add focused tests proving old saves migrate exactly once and current saves do not remigrate.
- Real-device claims: distinguish browser emulation from physical iPad Safari testing.

If a check cannot be run, report why. Never describe an unrun check as passing.

## Changelog rule

Every meaningful change should add a concise entry to `docs/CHATGPT_CHANGELOG.md` containing:

- date;
- actual agent or author;
- branch and PR when known;
- concise scope;
- principal files or systems changed;
- verification results;
- compatibility or migration notes;
- remaining risk.

Do not use a hard-coded model identity. Historical entries may retain the identity recorded when they were created.

## Merge policy

A routine PR may be squash-merged without another product-design review only when:

- it remains inside a previously approved objective;
- the exact final head is green;
- gameplay/UI/visual changes have reviewable browser evidence;
- no save, curriculum, quest, economy, kid-UX, story, asset-direction, dependency, or architecture decision expanded the scope;
- the final diff contains no unrelated work.

Stop for user or ChatGPT review when those conditions are not met. Preserve draft status while evidence or design approval is incomplete.

## Completion report

Report:

1. branch and PR number;
2. exact final head;
3. files or systems changed;
4. checks run and results;
5. gameplay or visual evidence reviewed;
6. compatibility and migration impact;
7. remaining risks and unverified device behavior;
8. the correct next owner: engineering agent, ChatGPT, or user playtest.
