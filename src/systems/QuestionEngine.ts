import { QUESTION_TEMPLATES } from '../data/questionTemplates';
import type { BonusContext, LearningPrompt, QuestionEngineState, QuestionTemplate } from '../data/curriculumMap';
import type { PlayerProfile } from '../data/profiles';
import { MasterySystem, type LearningMastery, type LearningMasteryRecord } from './MasterySystem';
import { pickRandom } from './random';

type Difficulty = QuestionEngineState['difficulty'];

/**
 * Consecutive correct answers on a skill that raise its next prompt's
 * difficulty by one step. Three is deliberate for young players: long enough
 * that one lucky guess can't promote, short enough that a confident kid
 * feels the game keeping up with them within a single session.
 */
export const CORRECT_STREAK_PER_DIFFICULTY_STEP = 3;

export class QuestionEngine {
  static makePrompt(profile: PlayerProfile, context: BonusContext, difficulty: QuestionEngineState['difficulty'] = 1): LearningPrompt {
    const candidates = this.templatesFor(profile, context, difficulty);
    const selected = pickRandom(candidates);

    return selected.makePrompt({ profile, context, difficulty });
  }

  /**
   * Maps a skill's mastery record to the difficulty its next prompt should
   * run at: 1 plus one step per full streak of
   * CORRECT_STREAK_PER_DIFFICULTY_STEP, clamped to the templates' 1..5 scale.
   * A missing record (skill never seen) yields 1, and since MasterySystem
   * resets currentCorrectStreak on 'wrong' (and only on 'wrong'), the rule
   * can ease back down after mistakes but never punishes a skip. Difficulty
   * only changes which numbers get generated — it never gates content,
   * rewards, or progress (the product invariant).
   */
  static difficultyForRecord(record?: LearningMasteryRecord): Difficulty {
    const streak = record?.currentCorrectStreak ?? 0;
    const level = 1 + Math.floor(streak / CORRECT_STREAK_PER_DIFFICULTY_STEP);
    return Math.min(5, Math.max(1, level)) as Difficulty;
  }

  /**
   * Mastery-aware prompt selection. Each candidate template's generation
   * difficulty is derived from *its own skill's* mastery record: a template
   * becomes eligible once the derived difficulty reaches its minDifficulty,
   * and then generates at the derived difficulty capped by its maxDifficulty
   * (so long streaks can't outrun what a template actually offers).
   *
   * With an empty/partial mastery map every unseen skill derives difficulty
   * 1, which reproduces makePrompt(profile, context, 1) eligibility for
   * already-unlocked templates — new and returning players see no change
   * until they build a streak.
   */
  static makeAdaptivePrompt(
    profile: PlayerProfile,
    context: BonusContext,
    mastery: LearningMastery = {}
  ): LearningPrompt {
    const candidates = this.adaptiveCandidatesFor(profile, context, mastery);
    const selected = pickRandom(candidates);

    return selected.template.makePrompt({ profile, context, difficulty: selected.difficulty });
  }

  private static adaptiveCandidatesFor(
    profile: PlayerProfile,
    context: BonusContext,
    mastery: LearningMastery
  ): { template: QuestionTemplate; difficulty: Difficulty }[] {
    const bandTemplates = QUESTION_TEMPLATES.filter((template) => template.band === profile.curriculumBand);
    if (bandTemplates.length === 0) {
      throw new Error(`No question templates available for ${profile.curriculumBand}`);
    }

    const eligibleAtDerivedDifficulty = (
      templates: QuestionTemplate[]
    ): { template: QuestionTemplate; difficulty: Difficulty }[] => templates.flatMap((template) => {
      const record = mastery[MasterySystem.keyForParts(template.band, template.subject, template.skill)];
      const derived = this.difficultyForRecord(record);
      if (derived < template.minDifficulty) return [];
      return [{ template, difficulty: Math.min(derived, template.maxDifficulty) as Difficulty }];
    });

    const contextMatches = bandTemplates.filter((template) => template.contexts.includes(context));
    const eligibleContext = eligibleAtDerivedDifficulty(contextMatches);
    if (eligibleContext.length > 0) return eligibleContext;

    const eligibleBand = eligibleAtDerivedDifficulty(bandTemplates);
    if (eligibleBand.length > 0) return eligibleBand;

    // Reachable only if every template in the band declares minDifficulty >= 2
    // and no skill has a streak yet — mirror templatesFor's full-band fallback
    // (generate at difficulty 1) rather than ever returning empty-handed.
    return bandTemplates.map((template) => ({
      template,
      difficulty: Math.min(1, template.maxDifficulty) as Difficulty
    }));
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
