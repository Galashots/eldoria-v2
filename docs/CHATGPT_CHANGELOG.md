# ChatGPT Change Log

This file records repository changes made through ChatGPT so future work can see what changed, who made it, and when.

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
