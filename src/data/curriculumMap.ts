import type { PlayerProfile } from './profiles';

export type CurriculumBand = PlayerProfile['curriculumBand'];

export type Subject = 'math' | 'ela' | 'science' | 'social';

export type SkillTag =
  | 'addition'
  | 'subtraction'
  | 'place-value'
  | 'measurement'
  | 'time'
  | 'data'
  | 'multiplication'
  | 'fractions'
  | 'decimals'
  | 'area-perimeter'
  | 'algebra'
  | 'phonics'
  | 'reading-comprehension'
  | 'vocabulary'
  | 'grammar'
  | 'materials'
  | 'light-sound'
  | 'plants-animals'
  | 'land-water-sun'
  | 'instructions-investigation'
  | 'matter'
  | 'forces-fluid-air'
  | 'energy-resources'
  | 'weather-climate-agriculture'
  | 'biology-systems'
  | 'space-systems'
  | 'computational-thinking'
  | 'controlled-experiments'
  | 'canada-regions-resources'
  | 'leaders-government'
  | 'trade-transportation'
  | 'democratic-decision-making'
  | 'ancient-civilizations'
  | 'environment-civilization'
  | 'trade-economics'
  | 'systems-government'
  | 'legacy-citizenship';

export type BonusContext =
  | 'farm'
  | 'combat'
  | 'shop'
  | 'cooking'
  | 'quest'
  | 'crafting'
  | 'exploration'
  | 'dialogue';

export type RewardKind = 'bonus-harvest' | 'critical-hit' | 'bonus-gold' | 'bonus-xp';

export type AnswerValue = number | string | boolean;

export type LearningPrompt = {
  id: string;
  band: CurriculumBand;
  subject: Subject;
  skill: SkillTag;
  context: BonusContext;
  text: string;
  readAloudText?: string;
  answer: AnswerValue;
  choices: AnswerValue[];
  rewardKind: RewardKind;
  hint?: string;
  explanation?: string;
};

export type QuestionEngineState = {
  profile: PlayerProfile;
  context: BonusContext;
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export type QuestionTemplate = {
  id: string;
  band: CurriculumBand;
  subject: Subject;
  skill: SkillTag;
  contexts: BonusContext[];
  minDifficulty: 1 | 2 | 3 | 4 | 5;
  maxDifficulty: 1 | 2 | 3 | 4 | 5;
  makePrompt: (state: QuestionEngineState) => LearningPrompt;
};
