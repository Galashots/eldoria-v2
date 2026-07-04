import type { PlayerProfile } from './profiles';
import { QuestionEngine } from '../systems/QuestionEngine';
import type { BonusContext, LearningPrompt } from './curriculumMap';

export { REWARD_KIND_GOLD_VALUE } from './curriculumMap';

export type {
  AnswerValue,
  BonusContext,
  CurriculumBand,
  LearningPrompt,
  QuestionEngineState,
  QuestionTemplate,
  RewardKind,
  SkillTag,
  Subject
} from './curriculumMap';

export function makeLearningPrompt(profile: PlayerProfile, context: BonusContext): LearningPrompt {
  return QuestionEngine.makePrompt(profile, context);
}
