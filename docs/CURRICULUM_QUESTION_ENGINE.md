# Curriculum Question Engine

## Purpose

Eldoria's learning system should generate short, contextual challenges that feel like RPG actions rather than quizzes. The engine must preserve the core design rule: learning never gates adventure; it only creates bonuses.

This first implementation creates the foundation for curriculum-aware prompts across Grade 2 and Grade 5. It intentionally starts with a small, reusable template set so the vertical slice can become playable before the project expands into many subjects, zones, and systems.

## Design synthesis

The deep research guide points to four implementation rules:

1. Build one excellent vertical slice before expanding scope.
2. Make learning part of playable quest arcs, not a detached worksheet layer.
3. Split presentation assumptions between the Grade 2 audio-first player and the Grade 5 reader-mode player.
4. Make every 10-15 minute session produce permanent progress.

The question engine supports those rules by tagging each prompt with grade band, subject, skill, game context, hint, explanation, and reward kind.

## Alberta curriculum anchors for V1

### Grade 2 focus

- Math: addition and subtraction within 100, measurement, time, data, shape sorting.
- English language arts: letter-sound connections, fluency, reading strategies, asking and answering questions, story elements, vocabulary, grammar, punctuation.
- Science: material suitability and sustainability, light and sound, landforms and water, plant/animal growth, instructions, investigation procedures.
- Social studies: Canada's regions and resources, Canadian leaders, traditions and heritage, trade and transportation, democratic discussion.

### Grade 5 focus

- Math: large-number operations, decimals, 3-digit by 2-digit multiplication, common-denominator fractions, algebraic expressions, symmetry, area and perimeter.
- English language arts: collaborative dialogue, evaluation of ideas and information, audience and purpose, grammar and punctuation, genre/form/structure.
- Science: states of matter, buoyancy/lift/drag, energy resources, weather/climate/agriculture, biological systems, space processes, code, controlled experiments.
- Social studies: ancient civilizations, environmental influence, trade networks and taxes, government/social systems, legacies, informed citizenship.

## Engine architecture

```text
Player profile + game context + difficulty
-> select matching question template
-> generate prompt
-> resolve answer
-> award bonus or give hint
```

Core files:

- `src/data/curriculumMap.ts`: shared types for subjects, skills, prompts, contexts, and rewards.
- `src/data/questionTemplates.ts`: starter prompt templates for Grade 2 and Grade 5.
- `src/systems/QuestionEngine.ts`: context-aware template selection and prompt generation.
- `src/data/curriculum.ts`: compatibility facade for existing systems.
- `src/systems/LearningBonusSystem.ts`: resolves numeric and non-numeric answers.

## Subject-to-mechanic mapping

- Math -> harvest boosts, gold, shop discounts, combat damage.
- ELA -> clues, dialogue, quest hints, persuasion, codex entries.
- Science -> crafting, machines, potions, elemental effects, environmental puzzles.
- Social studies -> maps, trade routes, diplomacy, factions, civilization lore.

## Starter template set

Grade 2:

- Farm subtraction with berries.
- Combat subtraction with slime shields.
- Shop/quest addition with supplies.
- Story detail comprehension.
- Material suitability for simple construction.

Grade 5:

- Farm area of rectangles.
- Shop decimal estimation.
- Combat/quest buoyancy and forces.
- Ancient civilizations and river settlement.
- Evidence-based reading comprehension.

## Future OFIs

1. Add mastery tracking per skill instead of using a fixed difficulty value.
2. Add Tiled object properties to request specific subject/skill/context prompts.
3. Add quest arcs that gather stealth assessment from actions, not only answer buttons.
4. Add parent-facing learning summaries from local save data.
5. Add prompt UI support for longer answer choices and explanations.
6. Add read-aloud text generation for all Grade 2 prompt types.
7. Add content validation tests so templates always produce answer choices with exactly one correct answer.
