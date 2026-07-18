import type { AnswerValue, BonusContext, LearningPrompt } from '../data/curriculum';
import { PROFILES, type ProfileId } from '../data/profiles';
import type { LearningMastery } from './MasterySystem';
import { QuestionEngine } from './QuestionEngine';

export type BonusResult = {
  correct: boolean;
  message: string;
  rewardKind: LearningPrompt['rewardKind'];
};

export class LearningBonusSystem {
  private profileId: ProfileId;

  constructor(profileId: ProfileId) {
    this.profileId = profileId;
  }

  setProfile(profileId: ProfileId): void {
    this.profileId = profileId;
  }

  /**
   * Builds the prompt for an optional learning bonus. Pass the player's
   * current mastery so the engine can adapt per-skill difficulty to recent
   * streaks (see QuestionEngine.makeAdaptivePrompt); omitting it generates
   * everything at baseline difficulty 1, exactly as before.
   */
  makePrompt(context: BonusContext, mastery: LearningMastery = {}): LearningPrompt {
    return QuestionEngine.makeAdaptivePrompt(PROFILES[this.profileId], context, mastery);
  }

  makePromptById(templateId: string): LearningPrompt {
    return QuestionEngine.makePromptById(PROFILES[this.profileId], templateId);
  }

  resolve(prompt: LearningPrompt, selected: AnswerValue): BonusResult {
    const correct = selected === prompt.answer;

    if (correct) {
      return {
        correct,
        rewardKind: prompt.rewardKind,
        message: this.rewardMessage(prompt.rewardKind)
      };
    }

    return {
      correct,
      rewardKind: prompt.rewardKind,
      message: prompt.hint ? `No bonus this time. Hint: ${prompt.hint}` : 'No bonus this time. Keep adventuring.'
    };
  }

  private rewardMessage(kind: LearningPrompt['rewardKind']): string {
    switch (kind) {
      case 'bonus-harvest':
        return 'Bonus harvest earned!';
      case 'critical-hit':
        return 'Critical hit bonus earned!';
      case 'bonus-gold':
        return 'Bonus gold earned!';
      case 'bonus-xp':
        return 'Bonus XP earned!';
    }
  }
}
