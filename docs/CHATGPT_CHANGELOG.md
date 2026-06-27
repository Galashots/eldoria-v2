# ChatGPT Change Log

This file records repository changes made through ChatGPT so future work can see what changed, who made it, and when.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/mage-starter-equipment-targets`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/MAGE_STARTER_EQUIPMENT_TARGETS.md`
  - `docs/visual-targets/mage_starter_equipment_targets.json`
- Summary: Added Grade 2 Mage starter robe, hat, cape, and staff overlay target specifications.
- Implementation notes:
  - Declared four target-only cosmetic entries inheriting `char_mage_boy_base` canvas, pivot, directions, and clip timing.
  - Recorded palette, render-layer, slice/socket, atlas, and no-collision ownership rules for each overlay.
  - Added a future art PR alignment checklist without generating art or adding equipment gameplay.
- Reason: Lock overlay compatibility to the approved hero base before any starter equipment art is generated.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/hero-actor-target-spec`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/HERO_ACTOR_TARGETS.md`
  - `docs/visual-targets/hero_actor_targets.json`
- Summary: Added the first production hero actor target specification and machine-readable manifest entry.
- Implementation notes:
  - Defined `char_mage_boy_base` as a `32x48`, four-direction Grade 2 Mage target aligned to the visual asset contract.
  - Recorded required animation ranges, palette families, slices, collision/interaction boxes, atlas family, and deferred art scope.
  - Added a future art PR checklist without generating art or changing runtime behavior.
- Reason: Establish a reviewable production target before any hero sprite generation or replacement work begins.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/visual-asset-contract`
- Files changed:
  - `AGENTS.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/VISUAL_ASSET_CONTRACT.md`
  - `docs/research/visual-design/Executable_2D_RPG_Visual_Design_Guide_for_Eldoria_V2.pdf`
- Summary: Added a concise visual asset contract and stored its source research guide at the canonical repo path.
- Implementation notes:
  - Defined the production baseline for scale, pivots, palettes, lighting, naming, metadata, category rules, animation, layering, atlas direction, and validation.
  - Added a minimal `AGENTS.md` link so future asset work discovers the contract before generating or replacing art.
  - Preserved the supplied PDF unchanged; no images were extracted and no runtime asset pipeline was added.
- Reason: Give human and AI contributors an enforceable visual specification that prevents asset drift while the current Phaser vertical slice remains the priority.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/deterministic-prompt-preview`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `src/systems/LearningBonusSystem.ts`
  - `src/systems/QuestionEngine.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added a development/test-only utility that renders a chosen question template by ID in the existing prompt panel.
- Implementation notes:
  - Added strict template lookup that validates the active profile band and uses the template's first declared context and minimum difficulty.
  - Added a guarded `WorldScene.previewPrompt` entry point with no reward, mastery, quest, or save side effects.
  - Added smoke coverage for exact Grade 2 and Grade 5 template selection, profile-specific read-aloud behavior, and side-effect-free skip and answer paths.
- Reason: Make prompt visual QA deterministic and repeatable without changing player-facing behavior or relying on random template selection.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/four-contextual-question-templates`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/data/questionTemplates.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added exactly four contextual learning templates for the existing farm and combat bonus moments.
- Implementation notes:
  - Added two short Grade 2 math prompts with explicit read-aloud text: farm place value and combat addition.
  - Added two Grade 5 reader-mode prompts with richer reasoning: farm fraction simplification and combat energy transfer.
  - Reused existing reward kinds and adjusted Grade 2 mastery smoke assertions to allow valid random skill selection without weakening skip and progression coverage.
  - Added focused smoke coverage for template presence, answer choices, Grade 2 audio support, and context/reward/skill contracts.
- Reason: Expand curriculum variety in a small, testable PR while keeping learning optional and embedded in existing gameplay actions.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/sunberry-charm-hud-keepsake`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Made the earned Sunberry Charm persistently visible as a compact keepsake in the existing top HUD.
- Implementation notes:
  - Appends `Keepsake: Sunberry Charm` only when the saved inventory contains the one-time charm reward.
  - Reuses the typed charm key and name from the Mira quest definition rather than adding item metadata or a new inventory surface.
  - Extended smoke coverage for pre-reward absence, immediate visibility, HUD fit, reload persistence, and single rendering after repeated Mira interaction.
- Reason: The starter quest's permanent reward should remain visible after its completion toast without expanding into an inventory or equipment system.

## 2026-06-26 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/title-profile-layout-polish`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/TitleScene.ts`
- Summary: Adjusted the title and profile-selection vertical spacing so all text and panels remain readable without overlap.
- Implementation notes:
  - Moved the title and North Star subtitle upward and added clear space above and between the Grade 2 Mage and Grade 5 Adventurer panels.
  - Kept both existing profile hit areas compatible with the current smoke-test interaction points.
- Reason: Live browser inspection found the subtitle partially hidden behind the Mage panel on the current title screen.

## 2026-06-26 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/mastery-tracking-foundation`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `src/systems/MasterySystem.ts`
  - `src/systems/SaveSystem.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added invisible, save-backed mastery tracking for optional learning prompt outcomes.
- Implementation notes:
  - Records seen, attempted, correct, wrong, skipped, current streak, best streak, and last prompt metadata under stable curriculum keys.
  - Keeps mastery optional in version-1 saves so existing saves load without migration.
  - Treats skips as non-punitive: they advance existing quest callbacks, award no learning bonus, and do not reset a correct streak.
  - Extended smoke coverage to exercise the real Grade 2 skip action, deterministic Grade 5 correct and wrong answers, old-save loading, and mastery persistence after reload.
- Reason: Reliable local learning telemetry is the next foundation for later adaptive content and summaries, without surfacing UI or changing player-facing gameplay.

## 2026-06-26 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/data-driven-mira-quest`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/data/quests.ts`
  - `src/scenes/WorldScene.ts`
- Summary: Extracted the existing Mira first-errand content into a small typed quest definition without changing gameplay.
- Implementation notes:
  - Centralized the quest id and name, existing save-compatible step ids, objective text, target labels, Mira dialogue, progress messages, completion toast, and completion rewards.
  - Updated `WorldScene` to use the typed definition while retaining quest orchestration and all learning, control, save, and rendering behavior.
  - Left the Playwright tests unchanged so the existing vertical-slice suite continues to lock the player-visible behavior.
- Reason: The starter quest content needs a small data boundary before later content expansion, without introducing a generalized quest engine or feature scope.

## 2026-06-26 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/mira-reward-juice-sunberry-charm`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `src/systems/SaveSystem.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added lightweight reward feedback and a persistent Sunberry Charm reward to Mira's first errand.
- Implementation notes:
  - Preserved the existing 10 gold quest reward and added a one-time `inventory.sunberryCharm` reward when the errand transitions to complete.
  - Added floating gold/item text and a small Phaser primitive sparkle burst for quest completion and correct optional-learning bonuses.
  - Kept inventory optional in version 1 save data so existing saves continue to load without migration.
  - Extended the vertical-slice smoke test to verify charm feedback, save/reload persistence, and protection against duplicate rewards after completion.
- Reason: The starter quest needs immediate feedback and permanent progress so its completion feels like an RPG reward loop without making learning mandatory.

## 2026-06-26 — Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/agent-reference-docs`
- Files changed:
  - `AGENTS.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/reference/Design-Guide-for-a-Beautiful-Deep-Addictive-Immersive-Curriculum-Aligned-2D-RPG.pdf`
- Summary: Added the deep design guide PDF to repo references and expanded project agent instructions.
- Implementation notes:
  - Created `docs/reference/` for durable project reference materials.
  - Copied the attached design guide PDF into the reference folder with a descriptive filename.
  - Replaced the shorter `AGENTS.md` with full Eldoria-V2 operating instructions covering product rules, current baseline, target player assumptions, roadmap, Codex/ChatGPT split, workflow, changelog requirements, testing expectations, and response format.
  - Audited the instructions against current `main` and added the merged Playwright smoke suite to the baseline, stabilization workflow, and pre-merge checks.
- Reason: Future Codex work needs durable project context, a local design reference, and explicit rules that preserve the current vertical slice and bonus-only learning model.

## 2026-06-26 — Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/playwright-smoke-infra`
- Files changed:
  - `.gitignore`
  - `docs/CHATGPT_CHANGELOG.md`
  - `package-lock.json`
  - `package.json`
  - `playwright.config.ts`
  - `src/main.ts`
  - `src/vite-env.d.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added Playwright smoke-test coverage for the current vertical slice.
- Implementation notes:
  - Added `@playwright/test`, a `npm run smoke` script, and a Chromium Playwright config that starts or reuses the local Vite server.
  - Exposed the Phaser game instance in dev/e2e mode so tests can inspect canvas-only scene state without adding player-visible UI.
  - Added Grade 2 smoke coverage for movement in all four directions, ACTION with Mira, objective progress, Grade 2 read-aloud prompt visibility, Mira reward completion, and save reload.
  - Added Grade 5 smoke coverage that verifies reader-mode prompts do not show the Grade 2 `READ ALOUD` control.
- Reason: Browser-game QA needs repeatable Playwright checks for the canvas vertical slice before adding new gameplay features.

## 2026-06-26 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/dynamic-joystick-current`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
- Summary: Rebuilt the dynamic lower-left virtual joystick on the current `main` after the curriculum engine and starter quest loop were merged.
- Implementation notes:
  - Closed stale PR #2 as superseded because it was based on an older `WorldScene.ts` and was no longer mergeable.
  - Replaced the fixed lower-left D-pad with an all-direction joystick that appears under the thumb when a touch starts in the lower-left quadrant.
  - Preserved the objective HUD, Mira starter quest loop, curriculum prompt layout, and read-aloud support.
  - The joystick resets on release, when a learning prompt opens, and when the scene shuts down.
- Reason: Tablet/mobile movement should feel natural before adding more gameplay complexity.

## 2026-06-26 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/starter-quest-objectives`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `src/systems/SaveSystem.ts`
- Summary: Added the first playable quest/objective loop using Mira, the crop bonus, and the Practice Slime.
- Implementation notes:
  - Added a persistent `firstQuestStep` save field and a `miraFirstErrandComplete` quest flag.
  - Added an objective HUD below the main gold/profile HUD.
  - Added Mira interaction states that direct the player through the first errand.
  - Progress advances after the player checks the crop bonus and interacts with the Practice Slime, regardless of whether the optional learning bonus is answered correctly or skipped.
  - Updated prompt layout to better support longer answer choices from the curriculum-aware question engine.
  - Incorporated PR audit findings by consolidating result/objective toasts into one message and avoiding prototype wording that implied the slime marker disappears visually.
- Reason: The deep design research recommends one excellent vertical slice with a clear 10-15 minute progress loop before expanding systems or content.

## 2026-06-26 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/curriculum-question-engine`
- Files changed:
  - `docs/CURRICULUM_QUESTION_ENGINE.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/data/curriculum.ts`
  - `src/data/curriculumMap.ts`
  - `src/data/questionTemplates.ts`
  - `src/systems/LearningBonusSystem.ts`
  - `src/systems/QuestionEngine.ts`
- Summary: Added a curriculum-aware question engine foundation for Grade 2 and Grade 5 prompts.
- Implementation notes:
  - Added typed curriculum metadata for subject, skill, game context, answer value, hints, explanations, and reward type.
  - Added starter Grade 2 and Grade 5 templates across math, ELA, science, and social studies.
  - Routed the existing learning prompt facade through the new `QuestionEngine` so current gameplay can keep calling `makeLearningPrompt`.
  - Updated answer resolution to support numeric and non-numeric choices.
  - Documented the curriculum/game-design synthesis before broader quest integration.
- Reason: The game needs a curriculum-aware engine that can make learning feel like RPG mechanics rather than detached quizzes.

## 2026-06-25 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/grade2-read-aloud`
- Files changed:
  - `src/scenes/WorldScene.ts`
  - `docs/CHATGPT_CHANGELOG.md`
- Summary: Added a Grade 2 audio-first `READ ALOUD` button to optional learning prompts using the browser `speechSynthesis` API.
- Implementation notes:
  - Kept read-aloud behind an explicit tap/click instead of auto-playing speech.
  - Limited the button to profiles with `readingMode: 'audio-first'`.
  - Cancels active speech when the prompt is answered, skipped, or the scene shuts down.
  - Added no new dependencies.
- Reason: The Grade 2 Mage profile is defined as audio-first, but the prompt UI previously required reading the question and choices.
