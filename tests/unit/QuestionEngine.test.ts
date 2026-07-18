import { describe, expect, it } from 'vitest';
import { CORRECT_STREAK_PER_DIFFICULTY_STEP, QuestionEngine } from '../../src/systems/QuestionEngine';
import { QUESTION_TEMPLATES } from '../../src/data/questionTemplates';
import { PROFILES } from '../../src/data/profiles';
import type { PlayerProfile } from '../../src/data/profiles';
import { MasterySystem, type LearningMastery, type LearningMasteryRecord } from '../../src/systems/MasterySystem';

const grade2Profile = PROFILES['grade2-mage'];
const grade5Profile = PROFILES['grade5-adventurer'];

describe('QuestionEngine.makePrompt', () => {
  it('only ever selects templates matching the profile band and requested context', () => {
    for (let i = 0; i < 50; i += 1) {
      const prompt = QuestionEngine.makePrompt(grade2Profile, 'farm');
      expect(prompt.band).toBe('grade2');
      expect(prompt.context).toBe('farm');
    }
  });

  it('respects the difficulty range declared on each template', () => {
    // grade5-shop-decimal-estimate is the only 'shop' template for grade5,
    // and it declares minDifficulty: 2. At difficulty 1 it must be excluded
    // from the context-matching set.
    const template = QUESTION_TEMPLATES.find((t) => t.id === 'grade5-shop-decimal-estimate');
    expect(template?.minDifficulty).toBe(2);

    for (let i = 0; i < 20; i += 1) {
      const prompt = QuestionEngine.makePrompt(grade5Profile, 'shop', 2);
      // At a difficulty that satisfies the template's range, the returned
      // subject/skill should be the decimal-estimate template's, since it is
      // the only 'shop' template for grade5.
      expect(prompt.subject).toBe('math');
      expect(prompt.skill).toBe('decimals');
    }
  });

  it('falls back to any band template when difficulty excludes every context match', () => {
    // At difficulty 1, no 'shop' template qualifies (min difficulty is 2),
    // so templatesFor's context-filtered set is empty and the engine falls
    // back to the full-band set instead of throwing or narrowing by context
    // alone. Note this means the returned prompt.context field is stamped
    // with the *requested* context ('shop') even when a non-shop template
    // (e.g. a combat/farm one) is chosen by the fallback — the prompt does
    // not necessarily describe a shop scenario. This is current, documented
    // (via this test) behavior, not something this test suite changes.
    const seenSkills = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const prompt = QuestionEngine.makePrompt(grade5Profile, 'shop', 1);
      expect(prompt.band).toBe('grade5');
      expect(prompt.context).toBe('shop');
      seenSkills.add(prompt.skill);
    }
    // With 50 draws from the full grade5 template set (7 templates), we
    // should see more than just 'decimals' turn up.
    expect(seenSkills.size).toBeGreaterThan(1);
  });

  it('falls back to the full band when the requested context has no templates at all', () => {
    // No grade5 template declares 'cooking' as a context.
    for (const template of QUESTION_TEMPLATES) {
      if (template.band === 'grade5') {
        expect(template.contexts).not.toContain('cooking');
      }
    }

    const prompt = QuestionEngine.makePrompt(grade5Profile, 'cooking');
    expect(prompt.band).toBe('grade5');
  });

  it('throws when no templates exist for the profile band', () => {
    const unknownBandProfile = {
      ...grade5Profile,
      curriculumBand: 'grade9'
    } as unknown as PlayerProfile;

    expect(() => QuestionEngine.makePrompt(unknownBandProfile, 'farm')).toThrow(
      /No question templates available for grade9/
    );
  });

  it('defaults difficulty to 1 when not provided', () => {
    // grade2 templates all declare minDifficulty: 1, so an unspecified
    // difficulty should behave the same as passing 1 explicitly.
    const withDefault = QuestionEngine.makePrompt(grade2Profile, 'combat');
    const withExplicit = QuestionEngine.makePrompt(grade2Profile, 'combat', 1);
    expect(withDefault.band).toBe(withExplicit.band);
    expect(withDefault.context).toBe(withExplicit.context);
  });
});

describe('QuestionEngine.difficultyForRecord', () => {
  const recordWithStreak = (currentCorrectStreak: number): LearningMasteryRecord => ({
    seen: currentCorrectStreak,
    attempted: currentCorrectStreak,
    correct: currentCorrectStreak,
    wrong: 0,
    skipped: 0,
    currentCorrectStreak,
    bestCorrectStreak: currentCorrectStreak,
    lastPromptId: 'test',
    lastContext: 'farm',
    lastOutcome: 'correct'
  });

  it('returns 1 for a missing record (skill never attempted)', () => {
    expect(QuestionEngine.difficultyForRecord(undefined)).toBe(1);
  });

  it('returns 1 below the first full streak step', () => {
    for (let streak = 0; streak < CORRECT_STREAK_PER_DIFFICULTY_STEP; streak += 1) {
      expect(QuestionEngine.difficultyForRecord(recordWithStreak(streak))).toBe(1);
    }
  });

  it('climbs one difficulty step per full correct-streak step', () => {
    expect(QuestionEngine.difficultyForRecord(recordWithStreak(3))).toBe(2);
    expect(QuestionEngine.difficultyForRecord(recordWithStreak(5))).toBe(2);
    expect(QuestionEngine.difficultyForRecord(recordWithStreak(6))).toBe(3);
    expect(QuestionEngine.difficultyForRecord(recordWithStreak(9))).toBe(4);
  });

  it('caps at the templates\' maximum difficulty of 5', () => {
    expect(QuestionEngine.difficultyForRecord(recordWithStreak(12))).toBe(5);
    expect(QuestionEngine.difficultyForRecord(recordWithStreak(999))).toBe(5);
  });

  it('eases back to 1 after a wrong answer (streak reset)', () => {
    // MasterySystem.recordOutcome resets currentCorrectStreak on 'wrong', so
    // the derived difficulty must drop to baseline on the next prompt.
    expect(QuestionEngine.difficultyForRecord(recordWithStreak(0))).toBe(1);
  });
});

describe('QuestionEngine.makeAdaptivePrompt', () => {
  const masteryWithStreak = (band: 'grade2' | 'grade5', subject: string, skill: string, streak: number): LearningMastery => ({
    [MasterySystem.keyForParts(band, subject as never, skill as never)]: {
      seen: streak,
      attempted: streak,
      correct: streak,
      wrong: 0,
      skipped: 0,
      currentCorrectStreak: streak,
      bestCorrectStreak: streak,
      lastPromptId: 'test',
      lastContext: 'farm',
      lastOutcome: 'correct'
    }
  });

  it('stays inside the profile band and requested context when matches exist', () => {
    for (let i = 0; i < 50; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade2Profile, 'farm');
      expect(prompt.band).toBe('grade2');
      expect(prompt.context).toBe('farm');
    }
  });

  it('serves a context-only higher-minimum template at its declared floor for an unseen skill', () => {
    // Decimal estimate is the only grade5 shop template and declares
    // minDifficulty 2. It must be reachable immediately at that floor;
    // requiring decimals mastery first would create an impossible self-unlock.
    for (let i = 0; i < 100; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade5Profile, 'shop', {});
      expect(prompt.skill).toBe('decimals');
      expect(prompt.subject).toBe('math');
      expect(Number(prompt.answer)).toBeLessThanOrEqual(115);
      expect(prompt.choices.filter((choice) => choice === prompt.answer)).toHaveLength(1);
    }
  });

  it('raises that reachable template after its own skill builds a streak', () => {
    // A maxed decimals streak derives difficulty 5. The prompt remains in the
    // shop/decimals context and stays answerable, while samples can exceed the
    // difficulty-2 ceiling of 115 without exceeding the difficulty-5 maximum.
    const mastery = masteryWithStreak('grade5', 'math', 'decimals', 12);
    let sawElevatedAnswer = false;
    for (let i = 0; i < 200; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade5Profile, 'shop', mastery);
      expect(prompt.skill).toBe('decimals');
      expect(prompt.subject).toBe('math');
      expect(Number(prompt.answer)).toBeLessThanOrEqual(280);
      expect(prompt.choices.filter((choice) => choice === prompt.answer)).toHaveLength(1);
      if (Number(prompt.answer) > 115) sawElevatedAnswer = true;
    }
    expect(sawElevatedAnswer).toBe(true);
  });

  it('generates elevated content for a strong streak and caps at the template max', () => {
    // Area-perimeter streak of 12+ derives difficulty 5 (the template's max),
    // so length/width can exceed the baseline 24x12 bounds — but never the
    // difficulty-5 bounds (32x20).
    const mastery = masteryWithStreak('grade5', 'math', 'area-perimeter', 12);
    let sawElevatedArea = false;
    for (let i = 0; i < 500; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade5Profile, 'farm', mastery);
      if (prompt.skill !== 'area-perimeter') continue;
      const answer = Number(prompt.answer);
      expect(answer).toBeLessThanOrEqual(32 * 20);
      if (answer > 24 * 12) sawElevatedArea = true;
    }
    expect(sawElevatedArea).toBe(true);
  });

  it('keeps grade2 content capped at grade2 template maxima even with huge streaks', () => {
    // Subtraction streak of 999 derives difficulty 5, capped to the grade2
    // template's maxDifficulty 3: picked <= 14 + 4*3 = 26, so the answer can
    // never exceed 25.
    const mastery = masteryWithStreak('grade2', 'math', 'subtraction', 999);
    for (let i = 0; i < 200; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade2Profile, 'farm', mastery);
      if (prompt.skill !== 'subtraction') continue;
      expect(Number(prompt.answer)).toBeLessThanOrEqual(25);
    }
  });

  it('throws when no templates exist for the profile band', () => {
    const unknownBandProfile = {
      ...grade5Profile,
      curriculumBand: 'grade9'
    } as unknown as PlayerProfile;

    expect(() => QuestionEngine.makeAdaptivePrompt(unknownBandProfile, 'farm')).toThrow(
      /No question templates available for grade9/
    );
  });
});

describe('QuestionEngine.makePromptById', () => {
  it('generates a prompt for a known template id using its first declared context', () => {
    const template = QUESTION_TEMPLATES.find((t) => t.id === 'grade2-farm-subtraction-berries');
    expect(template).toBeDefined();

    const prompt = QuestionEngine.makePromptById(grade2Profile, 'grade2-farm-subtraction-berries');
    expect(prompt.band).toBe('grade2');
    expect(prompt.context).toBe(template!.contexts[0]);
    expect(prompt.subject).toBe('math');
    expect(prompt.skill).toBe('subtraction');
  });

  it('throws for an unknown template id', () => {
    expect(() => QuestionEngine.makePromptById(grade2Profile, 'does-not-exist')).toThrow(
      /Unknown question template: does-not-exist/
    );
  });

  it('throws when the template band does not match the profile band', () => {
    expect(() => QuestionEngine.makePromptById(grade2Profile, 'grade5-farm-area-rectangle')).toThrow(
      /is not available for grade2/
    );
  });
});
