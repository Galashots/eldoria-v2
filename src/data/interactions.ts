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
export const INTERACTION_IDS = [
  'mira',
  'crop-bonus',
  'practice-slime',
  'sprout-1',
  'sprout-2',
  'sprout-3',
  // Wildbloom Woods (quest-free flavor interactables; see data/maps.ts).
  'whispering-flower',
  'mossy-stone',
  // Eldoria Village.
  'baker-pell',
  'village-notice-board',
  'village-well',
  'generic-bonus'
] as const;

export type InteractionId = (typeof INTERACTION_IDS)[number];

const INTERACTION_ID_SET: ReadonlySet<string> = new Set(INTERACTION_IDS);

/**
 * Runtime guard for untrusted id candidates — a Tiled `interactionId`
 * custom property is an arbitrary string until checked. The committed-map
 * unit validator rejects invalid ids at authoring time (see maps.ts); this
 * guard is the runtime backstop so a hand-authored mistake degrades to the
 * name-based fallback instead of crashing interaction dispatch on tap.
 */
export function isInteractionId(candidate: unknown): candidate is InteractionId {
  return typeof candidate === 'string' && INTERACTION_ID_SET.has(candidate);
}

const DEFAULT_INTERACTION_ID: InteractionId = 'generic-bonus';

const INTERACTION_ID_BY_TARGET_NAME: Readonly<Record<string, InteractionId>> = {
  [MIRA_FIRST_ERRAND.targets.mira]: 'mira',
  [MIRA_FIRST_ERRAND.targets.cropBonus]: 'crop-bonus',
  [MIRA_FIRST_ERRAND.targets.practiceSlime]: 'practice-slime'
};

export function resolveInteractionId(targetName: string): InteractionId {
  return INTERACTION_ID_BY_TARGET_NAME[targetName] ?? DEFAULT_INTERACTION_ID;
}

/**
 * Kid-friendly display names for interaction targets, keyed by the stable
 * InteractionId so the raw Tiled object names (which double as save/quest
 * keys) never have to change. Dev-style Tiled names like "CropBonus" stay
 * out of the player's view; undefined falls back to the target's own label
 * (today only the 'generic-bonus' fallback, which has no canonical target).
 */
const INTERACTION_DISPLAY_NAME: Readonly<Record<InteractionId, string | undefined>> = {
  mira: 'Mira',
  'crop-bonus': 'Crop Patch',
  'practice-slime': 'Practice Slime',
  'sprout-1': 'Sleepy Sprout',
  'sprout-2': 'Sleepy Sprout',
  'sprout-3': 'Sleepy Sprout',
  'whispering-flower': 'Whispering Flower',
  'mossy-stone': 'Mossy Stone',
  'baker-pell': 'Baker Pell',
  'village-notice-board': 'Notice Board',
  'village-well': 'Village Well',
  'generic-bonus': undefined
};

export function interactionDisplayName(id: InteractionId, fallback: string): string {
  return INTERACTION_DISPLAY_NAME[id] ?? fallback;
}

// Tiled's exported "custom properties" shape is genuinely polymorphic
// (Phaser's own TiledObject.properties is typed `any` for this reason): an
// array of {name, value} entries in most Tiled JSON exports, or a plain
// object map in some older/alternate exports. This narrows both accepted
// shapes instead of trusting the caller with `any`.
type TiledPropertyEntry = { name: string; value: unknown };
type TiledPropertyBag = TiledPropertyEntry[] | Record<string, unknown>;

export function getTiledProperty(obj: { properties?: TiledPropertyBag }, name: string): unknown {
  if (!obj.properties) return undefined;
  if (Array.isArray(obj.properties)) {
    const prop = obj.properties.find((p) => p.name === name);
    return prop ? prop.value : undefined;
  }
  return obj.properties[name];
}
