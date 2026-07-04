import { describe, expect, it } from 'vitest';
import { QUESTION_TEMPLATES } from '../../src/data/questionTemplates';
import { PROFILES } from '../../src/data/profiles';
import type { QuestionEngineState } from '../../src/data/curriculumMap';

const VALID_REWARD_KINDS = new Set(['bonus-harvest', 'critical-hit', 'bonus-gold', 'bonus-xp']);

// Iteration count per template: high enough to shake out RNG-dependent bugs
// (this closes the "every template has exactly one correct answer among
// unique choices" invariant left open in
// docs/CURRICULUM_QUESTION_ENGINE.md's Future OFIs list) without making the
// suite slow.
const RUNS_PER_TEMPLATE = 50;

// These bounds are not a documented content contract (no such limit exists
// in docs/CURRICULUM_QUESTION_ENGINE.md); they are sanity bounds derived
// from how WorldScene actually renders prompts: the prompt panel wraps at
// 324px and shrinks its font past 55 characters (src/scenes/WorldScene.ts:618),
// and each choice button wraps at 92px and shrinks past 12 characters
// (src/scenes/WorldScene.ts:664). A prompt/choice far outside these bounds
// would render illegibly for a Grade 2/5 player, so we guard against that
// regressing silently.
const MAX_PROMPT_TEXT_LENGTH = 120;
const MAX_CHOICE_TEXT_LENGTH = 40;

function profileFor(band: QuestionEngineState['profile']['curriculumBand']) {
  const profile = Object.values(PROFILES).find((candidate) => candidate.curriculumBand === band);
  if (!profile) throw new Error(`No fixture profile for band ${band}`);
  return profile;
}

describe('QUESTION_TEMPLATES content invariants', () => {
  for (const template of QUESTION_TEMPLATES) {
    describe(`${template.id}`, () => {
      const profile = profileFor(template.band);

      it(`produces valid prompts across ${RUNS_PER_TEMPLATE} random generations`, () => {
        for (let i = 0; i < RUNS_PER_TEMPLATE; i += 1) {
          const context = template.contexts[i % template.contexts.length];
          const prompt = template.makePrompt({ profile, context, difficulty: template.minDifficulty });

          // Exactly one choice equals the correct answer.
          const matchingChoices = prompt.choices.filter((choice) => choice === prompt.answer);
          expect(matchingChoices, `choices ${JSON.stringify(prompt.choices)} for answer ${String(prompt.answer)}`).toHaveLength(1);

          // All choices are unique.
          expect(new Set(prompt.choices).size).toBe(prompt.choices.length);

          // At least two choices (a single-choice prompt is not a real question).
          expect(prompt.choices.length).toBeGreaterThanOrEqual(2);

          // Prompt fields are non-empty.
          expect(prompt.id.length).toBeGreaterThan(0);
          expect(prompt.text.length).toBeGreaterThan(0);
          if (prompt.readAloudText !== undefined) {
            expect(prompt.readAloudText.length).toBeGreaterThan(0);
          }

          // Text length sanity bounds (see comment above).
          expect(prompt.text.length).toBeLessThanOrEqual(MAX_PROMPT_TEXT_LENGTH);
          for (const choice of prompt.choices) {
            expect(String(choice).length).toBeLessThanOrEqual(MAX_CHOICE_TEXT_LENGTH);
          }

          // Reward kind is one of the declared RewardKind values.
          expect(VALID_REWARD_KINDS.has(prompt.rewardKind)).toBe(true);

          // Structural/tag fields match the template's own declaration.
          expect(prompt.band).toBe(template.band);
          expect(prompt.subject).toBe(template.subject);
          expect(prompt.skill).toBe(template.skill);
          expect(prompt.context).toBe(context);
        }
      });
    });
  }

  it('covers every declared band with at least one template', () => {
    const bands = new Set(QUESTION_TEMPLATES.map((template) => template.band));
    expect(bands).toEqual(new Set(['grade2', 'grade5']));
  });
});
