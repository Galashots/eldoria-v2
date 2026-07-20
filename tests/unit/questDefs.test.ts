import { describe, expect, it } from 'vitest';
import type { MapId } from '../../src/data/maps';
import {
  getQuestDefinition,
  QUEST_REGISTRY,
  type QuestDefinition,
  validateQuestRegistry
} from '../../src/data/questDefs';

const validQuest = (overrides: Partial<QuestDefinition> = {}): QuestDefinition => ({
  id: 'test-quest',
  name: 'Test Quest',
  engine: 'registry',
  giver: 'mira',
  steps: ['not-started', 'active', 'complete'],
  objectives: {
    'not-started': 'Start.',
    active: 'Continue.',
    complete: 'Done.'
  },
  objectiveTargets: {
    'not-started': { map: 'farm', target: 'mira' },
    active: { map: 'farm', target: 'crop-bonus' },
    complete: null
  },
  dialogue: {
    offer: [{ speaker: 'Mira', text: 'Will you help?' }],
    return: [{ speaker: 'Mira', text: 'Thank you!' }]
  },
  rewards: { gold: 1 },
  ...overrides
});

describe('quest registry', () => {
  it('validates the committed registry', () => {
    expect(() => validateQuestRegistry()).not.toThrow();
  });

  it('defines the complete Berry Order step sequence', () => {
    expect(getQuestDefinition('pell-berry-order').steps).toEqual([
      'not-started',
      'gathering',
      'return-ready',
      'complete'
    ]);
  });

  it('rejects missing ids and names', () => {
    expect(() => validateQuestRegistry({ bad: validQuest({ id: '' }) })).toThrow(/empty id/);
    expect(() => validateQuestRegistry({
      bad: validQuest({ id: undefined as unknown as string })
    })).toThrow(/empty id/);
    expect(() => validateQuestRegistry({ bad: validQuest({ name: '  ' }) })).toThrow(/empty name/);
    expect(() => validateQuestRegistry({
      bad: validQuest({ name: undefined as unknown as string })
    })).toThrow(/empty name/);
  });

  it('rejects step lists with invalid boundaries', () => {
    expect(() => validateQuestRegistry({ bad: validQuest({ steps: ['active', 'complete'] }) }))
      .toThrow(/start with not-started/);
    expect(() => validateQuestRegistry({ bad: validQuest({ steps: ['not-started', 'active'] }) }))
      .toThrow(/end with complete/);
  });

  it('rejects objective and objective-target keys that are not steps', () => {
    expect(() => validateQuestRegistry({
      bad: validQuest({ objectives: { missing: 'No such step.' } })
    })).toThrow(/objective names unknown step missing/);
    expect(() => validateQuestRegistry({
      bad: validQuest({ objectiveTargets: { missing: { map: 'farm', target: 'mira' } } })
    })).toThrow(/objectiveTarget names unknown step missing/);
  });

  it('rejects objective targets on unregistered maps', () => {
    expect(() => validateQuestRegistry({
      bad: validQuest({
        objectiveTargets: {
          active: { map: 'missing-map' as MapId, target: 'mira' }
        }
      })
    })).toThrow(/unknown map missing-map/);
  });

  it('rejects negative fixed gold rewards', () => {
    expect(() => validateQuestRegistry({
      bad: validQuest({ rewards: { gold: -1 } })
    })).toThrow(/cannot be negative/);
  });

  it('requires offer and return dialogue for registry-engine quests', () => {
    expect(() => validateQuestRegistry({
      bad: validQuest({ dialogue: { return: [{ speaker: 'Mira', text: 'Done.' }] } })
    })).toThrow(/requires offer and return dialogue/);
    expect(() => validateQuestRegistry({
      bad: validQuest({ dialogue: { offer: [{ speaker: 'Mira', text: 'Start.' }] } })
    })).toThrow(/requires offer and return dialogue/);
  });

  it('exposes all four expected milestone definitions', () => {
    expect(Object.keys(QUEST_REGISTRY).sort()).toEqual([
      'mira-first-errand',
      'mira-second-errand',
      'mira-third-errand',
      'pell-berry-order'
    ]);
    expect(() => getQuestDefinition('toString')).toThrow(/Unknown quest/);
  });
});
