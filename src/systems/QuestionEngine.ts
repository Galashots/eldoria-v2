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
   * only changes which numbers get generated — it never gates rewards or
   * progress (the product invariant).
   */
  static difficultyForRecord(record?: LearningMasteryRecord): Difficulty {
    const streak = record?.currentCorrectStreak ?? 0;
    const level = 1 + Math.floor(streak / CORRECT_STREAK_PER_DIFFICULTY_STEP);
    return Math.min(5, Math.max(1, level)) as Difficulty;
  }

  /**
   * Mastery-aware prompt selection. Context remains authoritative: when the
   * requested context has templates for the profile band, the engine always
   * chooses among those templates rather than silently serving an unrelated
   * scenario. A template whose declared floor is above the skill's derived
   * mastery difficulty remains reachable at that floor; otherwise a
   * higher-minimum template could never create the mastery record needed to
   * improve its own difficulty.
   *
   * Mastery raises generation difficulty above the template floor, capped by
   * maxDifficulty. If the context has no templates, the engine falls back to
   * the profile band using the same floor-and-cap rule.
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

    const withAdaptiveDifficulty = (
      templates: QuestionTemplate[]
    ): { template: QuestionTemplate; difficulty: Difficulty }[] => templates.map((template) => {
      const record = mastery[MasterySystem.keyForParts(template.band, template.subject, template.skill)];
      const derived = this.difficultyForRecord(record);
      const difficulty = Math.min(
        template.maxDifficulty,
        Math.max(template.minDifficulty, derived)
      ) as Difficulty;
      return { template, difficulty };
    });

    const contextMatches = bandTemplates.filter((template) => template.contexts.includes(context));
    if (contextMatches.length > 0) return withAdaptiveDifficulty(contextMatches);

    return withAdaptiveDifficulty(bandTemplates);
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
