import type { BonusContext, LearningPrompt } from '../data/curriculum';

export type LearningPromptOutcome = 'correct' | 'wrong' | 'skipped';

export type LearningMasteryRecord = {
  seen: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  currentCorrectStreak: number;
  bestCorrectStreak: number;
  lastPromptId: string;
  lastContext: BonusContext;
  lastOutcome: LearningPromptOutcome;
};

export type LearningMastery = Record<string, LearningMasteryRecord>;

export class MasterySystem {
  /** Mastery-record key from its parts — usable by callers (e.g. QuestionEngine) that hold a template's tags rather than a generated prompt. */
  static keyForParts(
    band: LearningPrompt['band'],
    subject: LearningPrompt['subject'],
    skill: LearningPrompt['skill']
  ): string {
    return `${band}:${subject}:${skill}`;
  }

  static keyFor(prompt: LearningPrompt): string {
    return this.keyForParts(prompt.band, prompt.subject, prompt.skill);
  }

  static recordOutcome(
    mastery: LearningMastery,
    prompt: LearningPrompt,
    outcome: LearningPromptOutcome
  ): LearningMastery {
    const key = this.keyFor(prompt);
    const previous = mastery[key] ?? {
      seen: 0,
      attempted: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      currentCorrectStreak: 0,
      bestCorrectStreak: 0,
      lastPromptId: prompt.id,
      lastContext: prompt.context,
      lastOutcome: outcome
    };
    const currentCorrectStreak = outcome === 'correct'
      ? previous.currentCorrectStreak + 1
      : outcome === 'wrong'
        ? 0
        : previous.currentCorrectStreak;

    return {
      ...mastery,
      [key]: {
        seen: previous.seen + 1,
        attempted: previous.attempted + (outcome === 'skipped' ? 0 : 1),
        correct: previous.correct + (outcome === 'correct' ? 1 : 0),
        wrong: previous.wrong + (outcome === 'wrong' ? 1 : 0),
        skipped: previous.skipped + (outcome === 'skipped' ? 1 : 0),
        currentCorrectStreak,
        bestCorrectStreak: Math.max(previous.bestCorrectStreak, currentCorrectStreak),
        lastPromptId: prompt.id,
        lastContext: prompt.context,
        lastOutcome: outcome
      }
    };
  }
}
