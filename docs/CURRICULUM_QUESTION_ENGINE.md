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
Player profile + game context + per-skill difficulty (derived from mastery streaks)
-> select matching question template
-> generate prompt
-> resolve answer
-> award bonus or give hint
```

### Adaptive difficulty (implemented 2026-07-18)

`QuestionEngine.makeAdaptivePrompt(profile, context, mastery)` derives each
candidate template's generation difficulty from *its own skill's* mastery
record: `1 + floor(currentCorrectStreak / 3)`, clamped to the templates'
1-5 scale (`QuestionEngine.difficultyForRecord`). A template becomes
eligible once the derived difficulty reaches its `minDifficulty` and then
generates at the derived difficulty capped by its own `maxDifficulty`, so
long streaks unlock gated templates (e.g. `grade5-shop-decimal-estimate`)
without ever outrunning what a template offers.

Child-safety properties, by construction:

- Difficulty only changes which numbers get generated; it never gates
  content, rewards, or quest progress (the product invariant that wrong
  answers never block the game is untouched).
- A wrong answer resets the streak (existing `MasterySystem` behavior), so
  difficulty eases back down after mistakes; a skip never moves it.
- A missing record (skill never attempted) derives difficulty 1, and every
  math template's difficulty-1 ranges are byte-identical to the pre-adaptive
  ranges — new and returning players see no change until they build a
  streak. Unit tests pin both the ladder and the baseline ranges.

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
- Farm place value with baskets.
- Combat addition with wand sparks.
- Shop/quest addition with supplies.
- Story detail comprehension.
- Material suitability for simple construction.
- Trade and transportation (closes the previously-empty Grade 2 social-studies slot).

Grade 5:

- Farm area of rectangles.
- Shop decimal estimation.
- Farm fractions with sunberry rows.
- Combat/quest energy transfer and buoyancy/drag/lift forces.
- Ancient civilizations and environment (rivers, coastlines, mountains).
- Evidence-based reading comprehension.

The ELA, science, and social-studies templates above each pick randomly among
2-3 hand-authored text/answer variants per play (`pickVariantPrompt` in
`src/data/questionTemplates.ts`) instead of showing one fixed sentence, so a
replay doesn't repeat the exact same question. Math templates remain
procedurally generated from random numbers as before.

## Future OFIs

1. ~~Add mastery tracking per skill instead of using a fixed difficulty value.~~ Done (2026-07-18): mastery-streak-derived per-skill difficulty via `QuestionEngine.makeAdaptivePrompt` — see "Adaptive difficulty" above. Remaining headroom: Tiled-object difficulty overrides and richer difficulty-aware template content.
2. Add Tiled object properties to request specific subject/skill/context prompts.
3. Add quest arcs that gather stealth assessment from actions, not only answer buttons.
4. Add parent-facing learning summaries from local save data.
5. Add prompt UI support for longer answer choices and explanations.
6. Add read-aloud text generation for all Grade 2 prompt types.
7. Add content validation tests so templates always produce answer choices with exactly one correct answer.
