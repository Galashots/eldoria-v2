import Phaser from 'phaser';
import { QUESTION_TEMPLATES } from '../data/questionTemplates';
import type { BonusContext, LearningPrompt, QuestionEngineState, QuestionTemplate } from '../data/curriculumMap';
import type { PlayerProfile } from '../data/profiles';

export class QuestionEngine {
  static makePrompt(profile: PlayerProfile, context: BonusContext, difficulty: QuestionEngineState['difficulty'] = 1): LearningPrompt {
    const candidates = this.templatesFor(profile, context, difficulty);
    const selected = Phaser.Utils.Array.GetRandom(candidates);

    return selected.makePrompt({ profile, context, difficulty });
  }

  private static templatesFor(
    profile: PlayerProfile,
    context: BonusContext,
    difficulty: QuestionEngineState['difficulty']
  ): QuestionTemplate[] {
    const matchingContext = QUESTION_TEMPLATES.filter((template) => (
      template.band === profile.curriculumBand
      && template.contexts.includes(context)
      && difficulty >= template.minDifficulty
      && difficulty <= template.maxDifficulty
    ));

    if (matchingContext.length > 0) return matchingContext;

    const matchingBand = QUESTION_TEMPLATES.filter((template) => template.band === profile.curriculumBand);
    if (matchingBand.length > 0) return matchingBand;

    throw new Error(`No question templates available for ${profile.curriculumBand}`);
  }
}
