import { QUESTION_TEMPLATES } from '../data/questionTemplates';
import type { BonusContext, LearningPrompt, QuestionEngineState, QuestionTemplate } from '../data/curriculumMap';
import type { PlayerProfile } from '../data/profiles';
import { pickRandom } from './random';

export class QuestionEngine {
  static makePrompt(profile: PlayerProfile, context: BonusContext, difficulty: QuestionEngineState['difficulty'] = 1): LearningPrompt {
    const candidates = this.templatesFor(profile, context, difficulty);
    const selected = pickRandom(candidates);

    return selected.makePrompt({ profile, context, difficulty });
  }

  static makePromptById(profile: PlayerProfile, templateId: string): LearningPrompt {
    const template = QUESTION_TEMPLATES.find((candidate) => candidate.id === templateId);
    if (!template) throw new Error(`Unknown question template: ${templateId}`);
    if (template.band !== profile.curriculumBand) {
      throw new Error(`Question template ${templateId} is not available for ${profile.curriculumBand}`);
    }

    const context = template.contexts[0];
    if (!context) throw new Error(`Question template ${templateId} has no context`);

    return template.makePrompt({ profile, context, difficulty: template.minDifficulty });
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
