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

  describe('difficulty scaling (adaptive difficulty)', () => {
    // The same content invariants must hold at every difficulty a template
    // can legally be generated at, not just minDifficulty — adaptive
    // difficulty (QuestionEngine.makeAdaptivePrompt) sweeps this whole range.
    for (const template of QUESTION_TEMPLATES) {
      it(`${template.id} stays valid at every declared difficulty`, () => {
        const profile = profileFor(template.band);
        for (let difficulty = template.minDifficulty; difficulty <= template.maxDifficulty; difficulty += 1) {
          for (let i = 0; i < RUNS_PER_TEMPLATE; i += 1) {
            const context = template.contexts[i % template.contexts.length];
            const prompt = template.makePrompt({ profile, context, difficulty: difficulty as QuestionEngineState['difficulty'] });

            const matchingChoices = prompt.choices.filter((choice) => choice === prompt.answer);
            expect(matchingChoices).toHaveLength(1);
            expect(new Set(prompt.choices).size).toBe(prompt.choices.length);
            expect(prompt.choices.length).toBeGreaterThanOrEqual(2);
            expect(prompt.text.length).toBeLessThanOrEqual(MAX_PROMPT_TEXT_LENGTH);
            if (typeof prompt.answer === 'number') {
              expect(Number.isFinite(prompt.answer)).toBe(true);
              expect(prompt.answer).toBeGreaterThanOrEqual(0);
            }
          }
        }
      });
    }

    // Difficulty 1 must reproduce the exact number ranges the templates
    // shipped with before adaptive difficulty: new players (no streaks)
    // always derive difficulty 1, so any drift here would silently change
    // the baseline experience. Bounds are the original literal ranges.
    const BASELINE_NUMERIC_BOUNDS: Record<string, { min: number; max: number }> = {
      'grade2-farm-subtraction-berries': { min: 0, max: 17 },   // picked 6-18, used 1-9
      'grade2-combat-subtraction-shield': { min: 0, max: 18 },  // shield 7-20, spell 2-10
      'grade2-farm-place-value-basket': { min: 2, max: 8 },     // answer is the tens digit
      'grade2-combat-addition-sparks': { min: 6, max: 19 },     // sparks 4-10 + gained 2-9
      'grade2-shop-addition-supplies': { min: 5, max: 26 },     // apples 3-14 + carrots 2-12
      'grade5-farm-area-rectangle': { min: 32, max: 288 },      // length 8-24 x width 4-12
      'grade5-shop-decimal-estimate': { min: 14, max: 76 }      // round(6.75-18.75) x 2-4
    };

    for (const [templateId, bounds] of Object.entries(BASELINE_NUMERIC_BOUNDS)) {
      it(`${templateId} keeps its pre-adaptive baseline ranges at difficulty 1`, () => {
        const template = QUESTION_TEMPLATES.find((candidate) => candidate.id === templateId);
        if (!template) throw new Error(`Missing question template: ${templateId}`);
        const profile = profileFor(template.band);

        for (let i = 0; i < 200; i += 1) {
          const context = template.contexts[i % template.contexts.length];
          const prompt = template.makePrompt({ profile, context, difficulty: 1 });
          expect(typeof prompt.answer).toBe('number');
          expect(Number(prompt.answer)).toBeGreaterThanOrEqual(bounds.min);
          expect(Number(prompt.answer)).toBeLessThanOrEqual(bounds.max);
        }
      });
    }

    it('grade5-farm-fractions-sunberry-rows keeps the original tenths/hundredths mix at difficulty 1', () => {
      const template = QUESTION_TEMPLATES.find((candidate) => candidate.id === 'grade5-farm-fractions-sunberry-rows');
      if (!template) throw new Error('Missing fractions template');
      const profile = profileFor(template.band);

      let tenths = 0;
      let hundredths = 0;
      for (let i = 0; i < 200; i += 1) {
        const prompt = template.makePrompt({ profile, context: 'farm', difficulty: 1 });
        const decimals = String(prompt.answer).split('.')[1]?.length ?? 0;
        if (decimals === 1) tenths += 1;
        else if (decimals === 2) hundredths += 1;
        else throw new Error(`Unexpected decimal format: ${String(prompt.answer)}`);
      }
      // Original split was 50/50 via randomInt(0,1); with 200 samples a
      // binomial tail beyond 70/130 is ~0.5% — treat that as broken.
      expect(tenths).toBeGreaterThan(70);
      expect(hundredths).toBeGreaterThan(70);
    });
  });
});
