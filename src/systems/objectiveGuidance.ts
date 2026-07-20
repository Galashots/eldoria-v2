import { MAP_REGISTRY, type MapId } from '../data/maps';
import type { QuestObjectiveTarget } from '../data/questDefs';

export type ObjectiveGuidance =
  | { kind: 'local'; target: QuestObjectiveTarget['target'] }
  | { kind: 'exit'; exitTo: MapId }
  | { kind: 'none' };

/** Resolves quest intent into one map-local presentation target. */
export function resolveObjectiveGuidance(
  currentMap: MapId,
  objective: QuestObjectiveTarget | null
): ObjectiveGuidance {
  if (!objective) return { kind: 'none' };
  if (objective.map === currentMap) return { kind: 'local', target: objective.target };

  const exitTo = MAP_REGISTRY[currentMap].nextHop[objective.map];
  return exitTo ? { kind: 'exit', exitTo } : { kind: 'none' };
}
