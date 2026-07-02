import { MIRA_FIRST_ERRAND } from './quests';

/**
 * Stable identifiers for world interaction targets.
 *
 * These are deliberately decoupled from the Tiled object "name" (which also
 * doubles as the on-screen marker label) so that changing display text can
 * never silently change which handler an interaction dispatches to. Any
 * target name not listed in `INTERACTION_ID_BY_TARGET_NAME` resolves to the
 * `'generic-bonus'` fallback, which is the same "open a bonus prompt" path
 * every unnamed/future interactable already gets today.
 */
export type InteractionId = 'mira' | 'crop-bonus' | 'practice-slime' | 'generic-bonus';

const DEFAULT_INTERACTION_ID: InteractionId = 'generic-bonus';

const INTERACTION_ID_BY_TARGET_NAME: Readonly<Record<string, InteractionId>> = {
  [MIRA_FIRST_ERRAND.targets.mira]: 'mira',
  [MIRA_FIRST_ERRAND.targets.cropBonus]: 'crop-bonus',
  [MIRA_FIRST_ERRAND.targets.practiceSlime]: 'practice-slime'
};

export function resolveInteractionId(targetName: string): InteractionId {
  return INTERACTION_ID_BY_TARGET_NAME[targetName] ?? DEFAULT_INTERACTION_ID;
}
