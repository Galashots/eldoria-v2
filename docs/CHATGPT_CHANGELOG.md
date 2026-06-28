# ChatGPT Change Log

This file records repository changes made through ChatGPT so future work can see what changed, who made it, and when.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/display-grade2-mage-hero-walk`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added directional Grade 2 Mage walk animation during existing movement input.
- Implementation notes:
  - Preloaded the committed walk sheet and registered guarded six-frame front, back, left, and right loops.
  - Switched the existing presentation sprite to walk while keyboard or joystick movement is active and back to the matching idle loop on release or busy state.
  - Preserved the invisible physics actor, speed, collision, camera, interaction distance, save coordinates, and Grade 5 presentation.
  - Added smoke coverage for walk-sheet transitions in all four directions and verified mid-stride desktop/mobile captures.
- Reason: Replace the Grade 2 hero's sliding idle presentation with readable movement animation without changing gameplay mechanics.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/grade2-mage-hero-walk-asset`
- Files changed:
  - `assets/manifests/char_mage_boy_base_walk_v001.manifest.json`
  - `assets/source/generated/char_mage_boy_base_walk_v001/source_sheet.png`
  - `assets/sprites/char_mage_boy_base_walk_v001.png`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
- Summary: Added a matching four-direction, six-frame Grade 2 Mage walk asset without runtime wiring.
- Implementation notes:
  - Used the approved idle source as the identity reference for one strict `6x4` walk source sheet.
  - Converted the flat chroma background to true alpha locally, then normalized the sheet to an exact `192x192` PNG with `32x48` bottom-centered cells.
  - Kept the runtime, movement, controls, collisions, saves, quests, learning, and Grade 5 profile unchanged.
- Reason: Establish production movement art as a separately reviewable asset before changing the live player animation state machine.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/display-grade2-mage-hero-idle`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Displayed the four-direction Grade 2 Mage idle asset without changing player physics or Grade 5 presentation.
- Implementation notes:
  - Preloaded the committed `32x48` runtime sheet and registered guarded front, back, left, and right idle loops.
  - Added a bottom-centered presentation sprite that follows the unchanged Grade 2 physics actor, preserving collision, camera follow, interaction distance, controls, and save coordinates.
  - Kept the Grade 5 adventurer placeholder visible and behaviorally unchanged.
  - Extended browser smoke coverage for texture, dimensions, pivot, profile isolation, and directional transitions.
- Reason: Put the first production hero art into the playable vertical slice while keeping the visual change isolated from gameplay systems.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/grade2-mage-hero-idle-asset`
- Files changed:
  - `assets/manifests/char_mage_boy_base_idle_v001.manifest.json`
  - `assets/source/generated/char_mage_boy_base_idle_v001/source_sheet.png`
  - `assets/sprites/char_mage_boy_base_idle_v001.png`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
- Summary: Added the first asset-only Grade 2 Mage hero idle sheet for all four production directions.
- Implementation notes:
  - Generated one strict `4x4` source sheet with front, back, left, and right rows and four subtle idle phases per direction, then converted its flat chroma field to true alpha with local soft-matte cleanup.
  - Normalized the source through the existing manifest pipeline into an exact `128x192` RGBA runtime PNG with `32x48` cells and bottom-center anchoring.
  - Kept the asset out of Phaser so player presentation, controls, collision, saves, quests, learning, and gameplay remain unchanged.
  - This is the idle foundation only; walk, cast, hurt, equipment overlays, and runtime integration remain separate work.
- Reason: Establish a consistent, Grade 2-readable hero identity and directional baseline before producing synchronized animation and equipment layers.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/crop-bonus-interaction-feedback`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added lightweight Crop Bonus interaction feedback before its existing optional prompt.
- Implementation notes:
  - Added a short primitive pulse and four leaf-like motes at the unchanged Crop Bonus target coordinate.
  - Held input only for the visual beat, then opened the existing prompt and preserved its original quest callback.
  - Updated the Grade 2 smoke flow to exercise the real crop interaction and verify feedback appears, clears, and leaves read-aloud and quest progression intact.
  - Added no assets, maps, farming systems, inventory, timers, curriculum, mastery, save, combat, AI, or reward changes.
- Reason: Give both interactions in Mira's starter errand a responsive RPG presentation without expanding gameplay scope.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/practice-slime-animation-feedback`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added short Practice Slime hop feedback to its existing optional-prompt interaction.
- Implementation notes:
  - Added a guarded six-frame hop animation using the committed runtime sheet and a one-shot completion listener that restores idle.
  - Triggered feedback only from the existing Practice Slime interaction path and opened the unchanged prompt after the hop so the creature remains visible during feedback.
  - Extended smoke coverage to verify the texture, idle and hop registrations, interaction transition, and return to idle.
  - Preserved prompt behavior, quest progression, mastery, saves, rewards, controls, combat state, and AI behavior.
- Reason: Give the first production creature a more responsive RPG interaction moment without expanding gameplay scope.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/display-practice-slime`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`
  - `docs/visual-targets/PRACTICE_SLIME_TARGET.md`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Displayed the production Practice Slime v001 sprite in the existing farm world.
- Implementation notes:
  - Imported the committed runtime sheet through Vite, preloaded it as a `32x32` spritesheet, and added a four-frame idle loop.
  - Replaced only the Practice Slime circle/text marker with a bottom-centered sprite at the unchanged Tiled interaction coordinates.
  - Strengthened smoke coverage to verify sprite geometry/animation and exercise the real Practice Slime interaction path.
  - Preserved optional learning, quest progression, saves, mastery, controls, rewards, combat state, and AI behavior.
- Reason: Complete the first production-asset runtime presentation without expanding gameplay scope.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/project-memory-refresh`
- Files changed:
  - `AGENTS.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md`
  - `docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`
  - `docs/visual-targets/PRACTICE_SLIME_TARGET.md`
- Summary: Refreshed project memory and established the milestone-checkpoint collaboration workflow.
- Implementation notes:
  - Updated the merged implementation baseline and moved volatile roadmap status into a concise current-state document.
  - Recorded the normalized Practice Slime asset as complete while keeping runtime display explicitly pending.
  - Defined routine Codex self-merge gates and the product/design decisions that still require a user or ChatGPT checkpoint.
- Reason: Reduce repetitive cross-chat context transfer while preserving small PRs, verification discipline, and strategic design review.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/practice-slime-v001-asset`
- Files changed:
  - `assets/source/generated/mob_slime_practice_v001/source_sheet.png`
  - `assets/manifests/mob_slime_practice_v001.manifest.json`
  - `assets/sprites/mob_slime_practice_v001.png`
  - `docs/CHATGPT_CHANGELOG.md`
- Summary: Added the approved Practice Slime v001 source art and deterministic runtime spritesheet.
- Implementation notes:
  - Preserved the original lossless `1536x1024` PNG as a `6x4` source sheet with `256x256` source cells.
  - Used the asset manifest and normalizer to generate the exact `192x128` RGBA runtime sheet with `32x32` cells.
  - Tuned edge-flood color-key tolerance for this source after enlarged inspection exposed anti-aliased magenta fringe; enclosed poof colors remain protected.
  - Validated transparent unused cells, color-key cleanup, sprite readability, and poof-particle preservation without loading the asset in Phaser.
- Reason: Establish the first production-ready Practice Slime art asset while keeping runtime integration in a separate PR.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `manual/asset-sheet-normalizer`
- Files changed:
  - `.gitignore`
  - `assets/manifests/mob_slime_practice_v001.manifest.json`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md`
  - `docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`
  - `docs/art-pipeline/examples/practice_slime_v001.manifest.example.json`
  - `package.json`
  - `scripts/normalize-asset-sheet.mjs`
  - `scripts/test-asset-pipeline.mjs`
  - `scripts/validate-asset-sheet.mjs`
- Summary: Added and stabilized a dependency-free asset-sheet normalization pipeline for generated source art.
- Implementation notes:
  - Added manifest-driven PNG normalization with exact target dimensions, nearest-neighbor scaling, uniform-grid and source-rectangle extraction, alpha trimming, configurable anchoring, and transparent unused cells.
  - Added alpha, full color-key, and per-frame edge-flood color-key cleanup; the edge-flood mode preserves matching colors enclosed inside a sprite.
  - Added aggregated manifest/output validation and synthetic coverage for alpha sheets, color-key sheets, edge-flood behavior, source rectangles, expected empty cells, malformed manifests, and variable cell sizes.
  - Added pipeline and prompting guidance plus an illustrative manifest and a dormant real Practice Slime manifest for the later source-asset PR.
  - Folded the temporary connector-authored pipeline note into this canonical changelog and removed the temporary note.
- Reason: Convert approved AI-generated source art into deterministic, reviewable Phaser-ready PNG sheets without changing runtime or gameplay behavior.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/visual-target-validation-check`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `package.json`
- Summary: Wired visual target validation into the existing `npm run check` path.
- Implementation notes:
  - Prepends `npm run validate:visual-targets` before the unchanged typecheck and build chain.
  - Uses the validator's aggregated errors and nonzero exit code without custom failure handling.
- Reason: Make visual target drift fail automatically anywhere the standard project check runs.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/visual-target-validator`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/README.md`
  - `package.json`
  - `scripts/validate-visual-targets.mjs`
- Summary: Added dependency-free validation for all checked-in visual target JSON files.
- Implementation notes:
  - Validates shared fields, canonical unique IDs, contract references, target-only/no-runtime intent, geometry shapes, clip shapes, and inheritance references.
  - Aggregates all errors with file/target context and builds only an in-memory target index.
  - Added `npm run validate:visual-targets` and documented its use without changing existing scripts.
- Reason: Keep visual target manifests enforceable before future art generation or runtime integration.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/farm-village-tile-targets`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/FARM_VILLAGE_TILE_TARGETS.md`
  - `docs/visual-targets/farm_village_tile_targets.json`
- Summary: Added the first eight Farm/Village production tile target specifications.
- Implementation notes:
  - Defined grass, path, soil, crop, shop, door, and interaction-marker targets using the `16x16` tile grammar.
  - Recorded variants, palettes, layers, collision/interaction metadata, and `environment_farm` atlas ownership.
  - Kept crop, door, sign, farming, map, and collision behavior explicitly unimplemented.
- Reason: Establish reviewable tile targets before generating art or changing the current map/runtime pipeline.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/practice-slime-target-spec`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/PRACTICE_SLIME_TARGET.md`
  - `docs/visual-targets/practice_slime_target.json`
- Summary: Added the production target specification for the friendly Practice Slime.
- Implementation notes:
  - Defined `mob_slime_practice_base` as a front-view `32x32` visual target with idle, hop, hurt, and poof clips.
  - Recorded palette, silhouette, collision, interaction, atlas, layer, and child-friendly readability requirements.
  - Explicitly left combat stats, AI, hitboxes, and runtime defeat behavior undefined.
- Reason: Establish a reviewable Practice Slime target before generating or replacing art.

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
