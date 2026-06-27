import { makeLearningPrompt, type AnswerValue, type BonusContext, type LearningPrompt } from '../data/curriculum';
import { PROFILES, type ProfileId } from '../data/profiles';
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

  makePrompt(context: BonusContext): LearningPrompt {
    return makeLearningPrompt(PROFILES[this.profileId], context);
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
