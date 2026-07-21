import { MAP_REGISTRY, type MapId } from './maps';
import type { InteractionId } from './interactions';
import { MIRA_FIRST_ERRAND, MIRA_SECOND_ERRAND, MIRA_THIRD_ERRAND } from './quests';

export type DialogueLine = {
  speaker: string;
  text: string;
  /** Optional spoken form for read-aloud (symbol replacements etc.). */
  readAloudText?: string;
};

export type QuestObjectiveTarget = {
  map: MapId;
  target: InteractionId;
};

export type QuestDefinition = {
  id: string;
  name: string;
  /** 'registry' = generic QuestSystem state machine; 'farm-legacy' = FarmQuestSystem owns state (descriptor only). */
  engine: 'registry' | 'farm-legacy';
  giver: InteractionId;
  /** Ordered step ids; first is always 'not-started', last is always 'complete'. */
  steps: readonly string[];
  /** Objective banner text per step (functions receive derived progress). */
  objectives: Record<string, string | ((progress: number) => string)>;
  /** Where the objective marker should point per step; null = no marker. */
  objectiveTargets: Record<string, QuestObjectiveTarget | null>;
  /** Dialogue beats for registry-engine quests (e.g. 'offer' | 'reminder' | 'return'). */
  dialogue?: Record<string, DialogueLine[]>;
  rewards: { gold: number; item?: { key: string; name: string } };
};

export const QUEST_REGISTRY: Record<string, QuestDefinition> = {
  'pell-berry-order': {
    id: 'pell-berry-order',
    name: 'The Berry Order',
    engine: 'registry',
    giver: 'baker-pell',
    steps: ['not-started', 'gathering', 'return-ready', 'complete'],
    objectives: {
      'not-started': 'Optional: Visit Baker Pell in Eldoria Village.',
      gathering: (n: number) => `Pick sunberries at the farm crop patch (${n}/3).`,
      'return-ready': 'Bring the sunberries back to Baker Pell.',
      complete: 'The Berry Order complete. The village smells like pie.'
    },
    objectiveTargets: {
      'not-started': { map: 'eldoria-village', target: 'baker-pell' },
      gathering: { map: 'farm', target: 'crop-bonus' },
      'return-ready': { map: 'eldoria-village', target: 'baker-pell' },
      complete: null
    },
    dialogue: {
      offer: [
        { speaker: 'Baker Pell', text: "You must be the farm helper! I'm Baker Pell." },
        { speaker: 'Baker Pell', text: "I'm baking a pie, but my sunberries are all gone." },
        { speaker: 'Baker Pell', text: 'Could you pick 3 sunberries from your crop patch?' }
      ],
      reminder: [
        { speaker: 'Baker Pell', text: "Three sunberries from your farm's crop patch, please!" }
      ],
      return: [
        { speaker: 'Baker Pell', text: 'Oh my whiskers — perfect sunberries!' },
        { speaker: 'Baker Pell', text: 'Here: a slice of my famous pie. And gold for your trouble!' }
      ]
    },
    rewards: { gold: 20, item: { key: 'berryPie', name: "Pell's Berry Pie" } }
  },
  'mira-first-errand': {
    id: 'mira-first-errand',
    name: MIRA_FIRST_ERRAND.name,
    engine: 'farm-legacy',
    giver: 'mira',
    steps: ['not-started', 'talk-to-mira', 'try-crop-bonus', 'find-slime', 'return-to-mira', 'complete'],
    objectives: {
      'not-started': MIRA_FIRST_ERRAND.objectives['talk-to-mira'],
      ...MIRA_FIRST_ERRAND.objectives
    },
    objectiveTargets: {
      'not-started': { map: 'farm', target: 'mira' },
      'talk-to-mira': { map: 'farm', target: 'mira' },
      'try-crop-bonus': { map: 'farm', target: 'crop-bonus' },
      'find-slime': { map: 'farm', target: 'practice-slime' },
      'return-to-mira': { map: 'farm', target: 'mira' },
      complete: null
    },
    rewards: {
      gold: MIRA_FIRST_ERRAND.rewards.gold,
      item: MIRA_FIRST_ERRAND.rewards.charm
    }
  },
  'mira-second-errand': {
    id: 'mira-second-errand',
    name: MIRA_SECOND_ERRAND.name,
    engine: 'farm-legacy',
    giver: 'mira',
    steps: ['not-started', 'investigate', 'return-to-mira', 'complete'],
    objectives: {
      'not-started': MIRA_SECOND_ERRAND.objectives.available,
      investigate: MIRA_SECOND_ERRAND.objectives.investigate,
      'return-to-mira': MIRA_SECOND_ERRAND.objectives.returnToMira,
      complete: MIRA_SECOND_ERRAND.objectives.complete
    },
    objectiveTargets: {
      'not-started': { map: 'farm', target: 'mira' },
      investigate: { map: 'farm', target: 'crop-bonus' },
      'return-to-mira': { map: 'farm', target: 'mira' },
      complete: null
    },
    rewards: { gold: MIRA_SECOND_ERRAND.rewards.gold }
  },
  'mira-third-errand': {
    id: 'mira-third-errand',
    name: MIRA_THIRD_ERRAND.name,
    engine: 'farm-legacy',
    giver: 'mira',
    steps: ['not-started', 'gathering', 'return-ready', 'complete'],
    objectives: {
      'not-started': MIRA_THIRD_ERRAND.objectives.available,
      gathering: MIRA_THIRD_ERRAND.objectives.inProgress,
      'return-ready': MIRA_THIRD_ERRAND.objectives.returnToMira,
      complete: MIRA_THIRD_ERRAND.objectives.complete
    },
    objectiveTargets: {
      'not-started': { map: 'farm', target: 'mira' },
      gathering: { map: 'farm', target: 'sprout-1' },
      'return-ready': { map: 'farm', target: 'mira' },
      complete: null
    },
    rewards: {
      gold: MIRA_THIRD_ERRAND.rewards.gold,
      item: MIRA_THIRD_ERRAND.rewards.charm
    }
  }
};

export function getQuestDefinition(id: string): QuestDefinition {
  const definition = Object.prototype.hasOwnProperty.call(QUEST_REGISTRY, id)
    ? QUEST_REGISTRY[id]
    : undefined;
  if (!definition) throw new Error(`Unknown quest: ${id}`);
  return definition;
}

export function validateQuestRegistry(
  registry: Record<string, QuestDefinition> = QUEST_REGISTRY
): void {
  for (const [key, definition] of Object.entries(registry)) {
    if (typeof definition.id !== 'string' || !definition.id.trim()) {
      throw new Error(`Quest ${key} has a missing or empty id`);
    }
    if (typeof definition.name !== 'string' || !definition.name.trim()) {
      throw new Error(`Quest ${definition.id} has a missing or empty name`);
    }
    if (definition.steps[0] !== 'not-started') {
      throw new Error(`Quest ${definition.id} steps must start with not-started`);
    }
    if (definition.steps.at(-1) !== 'complete') {
      throw new Error(`Quest ${definition.id} steps must end with complete`);
    }

    const steps = new Set(definition.steps);
    for (const objectiveStep of Object.keys(definition.objectives)) {
      if (!steps.has(objectiveStep)) {
        throw new Error(`Quest ${definition.id} objective names unknown step ${objectiveStep}`);
      }
    }
    for (const [objectiveStep, target] of Object.entries(definition.objectiveTargets)) {
      if (!steps.has(objectiveStep)) {
        throw new Error(`Quest ${definition.id} objectiveTarget names unknown step ${objectiveStep}`);
      }
      if (target && !(target.map in MAP_REGISTRY)) {
        throw new Error(`Quest ${definition.id} objectiveTarget uses unknown map ${target.map}`);
      }
    }
    if (definition.rewards.gold < 0) {
      throw new Error(`Quest ${definition.id} reward gold cannot be negative`);
    }
    if (definition.engine === 'registry'
      && (!definition.dialogue?.offer || !definition.dialogue.return)) {
      throw new Error(`Registry quest ${definition.id} requires offer and return dialogue`);
    }
  }
}
