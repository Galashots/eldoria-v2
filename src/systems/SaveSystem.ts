import type { ProfileId } from '../data/profiles';
import { WORLD_COORDINATE_SCALE_V1_TO_V2 } from '../gameDimensions';
import type { LearningMastery } from './MasterySystem';

export type StarterQuestStep = 'talk-to-mira' | 'try-crop-bonus' | 'find-slime' | 'return-to-mira' | 'complete';

/**
 * The schema version every valid save must have after migration.
 * Bump this when SaveState's shape changes, and add a migration to
 * SAVE_MIGRATIONS keyed by the version it migrates FROM. See
 * docs/AUDIT_AND_GAME_PLAN_2026-07.md, Phase 1 item 1.
 */
export const CURRENT_SAVE_VERSION = 2 as const;

export type SaveState = {
  version: typeof CURRENT_SAVE_VERSION;
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

/** A parsed-but-not-yet-validated save payload, of unknown/prior shape. */
export type RawSave = Record<string, unknown>;

/** Transforms a raw save at `fromVersion` into the shape expected at `fromVersion + 1`. */
export type SaveMigration = (raw: RawSave) => RawSave;

/**
 * Ordered migration seam, keyed by the version each migration migrates FROM.
 * Applied sequentially (0 -> 1 -> 2 -> ...) to raw, parsed-but-unvalidated
 * save data, before structural validation. This is the seam a schema (or, as
 * with v1 -> v2 below, a world-coordinate-space) change should populate
 * instead of leaving the exact-version check below to silently discard every
 * existing save.
 */
const SAVE_MIGRATIONS: Record<number, SaveMigration> = {
  // The 960x640 canvas migration doubled every world coordinate (map tiles,
  // objects, physics). A v1 save's player position was recorded in the old,
  // half-scale world, so it must be doubled to land in the same relative spot
  // in the new one. The imported historical constant deliberately remains
  // independent from any future runtime renderer-scale changes.
  1: (raw) => {
    const player = isRecord(raw.player) ? raw.player : undefined;
    const x = isFiniteNumber(player?.x)
      ? player.x * WORLD_COORDINATE_SCALE_V1_TO_V2
      : player?.x;
    const y = isFiniteNumber(player?.y)
      ? player.y * WORLD_COORDINATE_SCALE_V1_TO_V2
      : player?.y;

    return {
      ...raw,
      version: 2,
      player: { ...player, x, y }
    };
  }
};

/**
 * Pure migration step. Walks `raw` forward through registered migrations
 * until it reaches CURRENT_SAVE_VERSION, or stops (leaving it unchanged) at
 * the first version with no registered migration, an unparsable version, or
 * a migration step that throws. Never throws. The result is NOT guaranteed
 * valid — it is still checked by `isSaveState` after this runs.
 *
 * Exported so tests can register a migration and exercise this seam
 * directly without going through localStorage.
 */
export function migrateRawSave(
  raw: RawSave,
  migrations: Record<number, SaveMigration> = SAVE_MIGRATIONS
): RawSave {
  let current: RawSave = raw;
  let version: unknown = current.version;

  while (isFiniteNumber(version) && version < CURRENT_SAVE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) break;

    let next: RawSave;
    try {
      next = migrate(current);
    } catch {
      break;
    }

    if (!isRecord(next)) break;

    const nextVersion = next.version;
    // A migration that doesn't strictly advance the version (e.g. forgets to
    // bump it) would otherwise spin this loop forever, since the same
    // version maps to the same migration on the next iteration. Bail out and
    // leave the data as-is for isSaveState to reject or accept.
    if (!isFiniteNumber(nextVersion) || nextVersion <= version) break;

    current = next;
    version = nextVersion;
  }

  return current;
}

function isSaveState(value: unknown, profileId: ProfileId): value is SaveState {
  if (!isRecord(value) || !isRecord(value.player)) return false;

  return value.version === CURRENT_SAVE_VERSION
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
  /**
   * @param migrations Overrides the registered migration table. Production
   * callers should never pass this — it exists so tests can register a
   * migration and verify the full parse -> migrate -> validate pipeline.
   */
  static load(
    profileId: ProfileId,
    migrations: Record<number, SaveMigration> = SAVE_MIGRATIONS
  ): SaveState | null {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + profileId);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      const candidate = isRecord(parsed) ? migrateRawSave(parsed, migrations) : parsed;
      return isSaveState(candidate, profileId) ? candidate : null;
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
