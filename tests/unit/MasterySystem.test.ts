import { describe, expect, it } from 'vitest';
import { MasterySystem, type LearningMastery } from '../../src/systems/MasterySystem';
import type { LearningPrompt } from '../../src/data/curriculumMap';

function makePrompt(overrides: Partial<LearningPrompt> = {}): LearningPrompt {
  return {
    id: 'test-prompt',
    band: 'grade2',
    subject: 'math',
    skill: 'addition',
    context: 'farm',
    text: 'What is 2 + 2?',
    answer: 4,
    choices: [4, 3, 5],
    rewardKind: 'bonus-harvest',
    ...overrides
  };
}

describe('MasterySystem.keyFor', () => {
  it('builds a band:subject:skill composite key', () => {
    const prompt = makePrompt({ band: 'grade5', subject: 'science', skill: 'matter' });
    expect(MasterySystem.keyFor(prompt)).toBe('grade5:science:matter');
  });
});

describe('MasterySystem.recordOutcome', () => {
  it('creates a fresh record on first sight (empty-history default path)', () => {
    const prompt = makePrompt();
    const mastery = MasterySystem.recordOutcome({}, prompt, 'correct');
    const key = MasterySystem.keyFor(prompt);

    expect(mastery[key]).toEqual({
      seen: 1,
      attempted: 1,
      correct: 1,
      wrong: 0,
      skipped: 0,
      currentCorrectStreak: 1,
      bestCorrectStreak: 1,
      lastPromptId: prompt.id,
      lastContext: prompt.context,
      lastOutcome: 'correct'
    });
  });

  it('does not mutate the mastery record passed in', () => {
    const prompt = makePrompt();
    const original: LearningMastery = {};
    MasterySystem.recordOutcome(original, prompt, 'correct');
    expect(original).toEqual({});
  });

  it('increments the correct streak on consecutive correct answers', () => {
    const prompt = makePrompt();
    let mastery: LearningMastery = {};
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'correct');
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'correct');
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'correct');

    const key = MasterySystem.keyFor(prompt);
    expect(mastery[key].currentCorrectStreak).toBe(3);
    expect(mastery[key].bestCorrectStreak).toBe(3);
    expect(mastery[key].seen).toBe(3);
    expect(mastery[key].attempted).toBe(3);
    expect(mastery[key].correct).toBe(3);
  });

  it('resets the current streak to 0 on a wrong answer but preserves the best streak', () => {
    const prompt = makePrompt();
    let mastery: LearningMastery = {};
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'correct');
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'correct');
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'wrong');

    const key = MasterySystem.keyFor(prompt);
    expect(mastery[key].currentCorrectStreak).toBe(0);
    expect(mastery[key].bestCorrectStreak).toBe(2);
    expect(mastery[key].wrong).toBe(1);
    expect(mastery[key].attempted).toBe(3);
  });

  it('keeps bestCorrectStreak monotonically non-decreasing across a mixed sequence', () => {
    const prompt = makePrompt();
    let mastery: LearningMastery = {};
    const outcomes: Array<'correct' | 'wrong' | 'skipped'> = [
      'correct', 'correct', 'wrong', 'correct', 'correct', 'correct', 'wrong', 'correct'
    ];
    let previousBest = 0;
    for (const outcome of outcomes) {
      mastery = MasterySystem.recordOutcome(mastery, prompt, outcome);
      const key = MasterySystem.keyFor(prompt);
      expect(mastery[key].bestCorrectStreak).toBeGreaterThanOrEqual(previousBest);
      previousBest = mastery[key].bestCorrectStreak;
    }
    const key = MasterySystem.keyFor(prompt);
    // streaks: 1,2,0,1,2,3,0,1 -> best should land on 3
    expect(mastery[key].bestCorrectStreak).toBe(3);
  });

  it('counts skipped outcomes without counting them as attempted, and preserves the current streak', () => {
    const prompt = makePrompt();
    let mastery: LearningMastery = {};
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'correct');
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'skipped');
    mastery = MasterySystem.recordOutcome(mastery, prompt, 'skipped');

    const key = MasterySystem.keyFor(prompt);
    expect(mastery[key].seen).toBe(3);
    expect(mastery[key].attempted).toBe(1);
    expect(mastery[key].skipped).toBe(2);
    // Skipped does not reset or extend the correct streak.
    expect(mastery[key].currentCorrectStreak).toBe(1);
    expect(mastery[key].lastOutcome).toBe('skipped');
  });

  it('tracks separate keys independently for different band:subject:skill combinations', () => {
    const promptA = makePrompt({ skill: 'addition' });
    const promptB = makePrompt({ skill: 'subtraction' });
    let mastery: LearningMastery = {};
    mastery = MasterySystem.recordOutcome(mastery, promptA, 'correct');
    mastery = MasterySystem.recordOutcome(mastery, promptB, 'wrong');

    expect(mastery[MasterySystem.keyFor(promptA)].correct).toBe(1);
    expect(mastery[MasterySystem.keyFor(promptB)].wrong).toBe(1);
  });
});
