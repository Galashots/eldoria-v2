import { afterEach, describe, expect, it, vi } from 'vitest';
import { LearningBonusSystem } from '../../src/systems/LearningBonusSystem';
import { QuestionEngine } from '../../src/systems/QuestionEngine';
import type { LearningPrompt } from '../../src/data/curriculumMap';
import type { LearningMastery } from '../../src/systems/MasterySystem';

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

describe('LearningBonusSystem.resolve', () => {
  it('reports correct with the reward-kind message when the selection matches the answer', () => {
    const system = new LearningBonusSystem('grade2-mage');
    const prompt = makePrompt({ answer: 4, rewardKind: 'bonus-harvest' });

    const result = system.resolve(prompt, 4);

    expect(result.correct).toBe(true);
    expect(result.rewardKind).toBe('bonus-harvest');
    expect(result.message).toBe('Bonus harvest earned!');
  });

  it.each([
    ['bonus-harvest', 'Bonus harvest earned!'],
    ['critical-hit', 'Critical hit bonus earned!'],
    ['bonus-gold', 'Bonus gold earned!'],
    ['bonus-xp', 'Bonus XP earned!']
  ] as const)('maps rewardKind %s to its own correct-answer message', (rewardKind, expectedMessage) => {
    const system = new LearningBonusSystem('grade2-mage');
    const prompt = makePrompt({ answer: 'fox', rewardKind });

    const result = system.resolve(prompt, 'fox');

    expect(result.message).toBe(expectedMessage);
  });

  it('reports wrong with a hint-suffixed message when the selection does not match and a hint exists', () => {
    const system = new LearningBonusSystem('grade2-mage');
    const prompt = makePrompt({ answer: 4, hint: 'Count on your fingers.' });

    const result = system.resolve(prompt, 3);

    expect(result.correct).toBe(false);
    expect(result.rewardKind).toBe(prompt.rewardKind);
    expect(result.message).toBe('No bonus this time. Hint: Count on your fingers.');
  });

  it('falls back to a generic message when wrong and no hint is present', () => {
    const system = new LearningBonusSystem('grade2-mage');
    const { hint: _hint, ...withoutHint } = makePrompt({ answer: 4 });

    const result = system.resolve(withoutHint as LearningPrompt, 3);

    expect(result.correct).toBe(false);
    expect(result.message).toBe('No bonus this time. Keep adventuring.');
  });

  // NOTE: LearningBonusSystem has no dedicated "skipped" outcome or message
  // path — resolve() only distinguishes correct vs. wrong by comparing the
  // selected answer. Skip handling lives entirely in the caller
  // (src/scenes/WorldScene.ts:700-708), which records a 'skipped' mastery
  // outcome and shows its own toast without ever calling resolve(). This is
  // documented here rather than tested as a LearningBonusSystem behavior,
  // since no such behavior exists on this class.
});

describe('LearningBonusSystem.makePromptById', () => {
  it('delegates to QuestionEngine.makePromptById for the configured profile', () => {
    const system = new LearningBonusSystem('grade2-mage');
    const prompt = system.makePromptById('grade2-farm-subtraction-berries');

    expect(prompt.band).toBe('grade2');
    expect(prompt.subject).toBe('math');
    expect(prompt.skill).toBe('subtraction');
  });
});

describe('LearningBonusSystem.makePrompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards the player mastery map to the adaptive question engine', () => {
    const system = new LearningBonusSystem('grade2-mage');
    const spy = vi.spyOn(QuestionEngine, 'makeAdaptivePrompt');
    const mastery: LearningMastery = {};

    system.makePrompt('farm', mastery);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ curriculumBand: 'grade2' }), 'farm', mastery);
  });

  it('defaults to baseline (empty mastery) when no mastery is provided', () => {
    const system = new LearningBonusSystem('grade2-mage');
    const spy = vi.spyOn(QuestionEngine, 'makeAdaptivePrompt');

    system.makePrompt('farm');

    expect(spy).toHaveBeenCalledWith(expect.anything(), 'farm', {});
  });
});

describe('LearningBonusSystem.setProfile', () => {
  it('switches which profile subsequent prompts are generated for', () => {
    const system = new LearningBonusSystem('grade2-mage');
    system.setProfile('grade5-adventurer');

    const prompt = system.makePromptById('grade5-farm-area-rectangle');
    expect(prompt.band).toBe('grade5');
  });
});
