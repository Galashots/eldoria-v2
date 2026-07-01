import type { ProfileId } from '../data/profiles';
import type { LearningMastery } from './MasterySystem';

export type StarterQuestStep = 'talk-to-mira' | 'try-crop-bonus' | 'find-slime' | 'return-to-mira' | 'complete';

export type SaveState = {
  version: 1;
  profileId: ProfileId;
  gold: number;
  inventory?: Record<string, number>;
  mastery?: LearningMastery;
  lastArea: string;
  firstQuestStep?: StarterQuestStep;
  questFlags?: Record<string, boolean>;
  player: {
    x: number;
    y: number;
  };
};

const SAVE_PREFIX = 'eldoria_v2_save_';

const STARTER_QUEST_STEPS: StarterQuestStep[] = [
  'talk-to-mira',
  'try-crop-bonus',
  'find-slime',
  'return-to-mira',
  'complete'
];

const MASTERY_CONTEXTS = [
  'farm',
  'combat',
  'shop',
  'cooking',
  'quest',
  'crafting',
  'exploration',
  'dialogue'
] as const;

const MASTERY_OUTCOMES = ['correct', 'wrong', 'skipped'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value)
    && Object.values(value).every(isFiniteNumber);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return isRecord(value)
    && Object.values(value).every((entry) => typeof entry === 'boolean');
}

function isMasteryRecord(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return isNonNegativeInteger(value.seen)
    && isNonNegativeInteger(value.attempted)
    && isNonNegativeInteger(value.correct)
    && isNonNegativeInteger(value.wrong)
    && isNonNegativeInteger(value.skipped)
    && isNonNegativeInteger(value.currentCorrectStreak)
    && isNonNegativeInteger(value.bestCorrectStreak)
    && typeof value.lastPromptId === 'string'
    && MASTERY_CONTEXTS.includes(value.lastContext as typeof MASTERY_CONTEXTS[number])
    && MASTERY_OUTCOMES.includes(value.lastOutcome as typeof MASTERY_OUTCOMES[number]);
}

function isMastery(value: unknown): value is LearningMastery {
  return isRecord(value) && Object.values(value).every(isMasteryRecord);
}

function isSaveState(value: unknown, profileId: ProfileId): value is SaveState {
  if (!isRecord(value) || !isRecord(value.player)) return false;

  return value.version === 1
    && value.profileId === profileId
    && isFiniteNumber(value.gold)
    && typeof value.lastArea === 'string'
    && isFiniteNumber(value.player.x)
    && isFiniteNumber(value.player.y)
    && (value.inventory === undefined || isNumberRecord(value.inventory))
    && (value.mastery === undefined || isMastery(value.mastery))
    && (value.firstQuestStep === undefined
      || STARTER_QUEST_STEPS.includes(value.firstQuestStep as StarterQuestStep))
    && (value.questFlags === undefined || isBooleanRecord(value.questFlags));
}

export class SaveSystem {
  static load(profileId: ProfileId): SaveState | null {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + profileId);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isSaveState(parsed, profileId) ? parsed : null;
    } catch (error) {
      console.warn('Failed to load game state:', error);
      return null;
    }
  }

  static save(state: SaveState): void {
    try {
      localStorage.setItem(SAVE_PREFIX + state.profileId, JSON.stringify(state));
    } catch (error) {
      // Save failure should never interrupt gameplay.
      console.warn('Failed to save game state:', error);
    }
  }
}
