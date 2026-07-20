import { describe, expect, it } from 'vitest';
import { QuestSystem } from '../../src/systems/QuestSystem';
import { CURRENT_SAVE_VERSION, type SaveState } from '../../src/systems/SaveSystem';

const baseSave = (overrides: Partial<SaveState> = {}): SaveState => ({
  version: CURRENT_SAVE_VERSION,
  profileId: 'grade2-mage',
  gold: 0,
  lastArea: 'farm',
  player: { x: 320, y: 512 },
  ...overrides
});

describe('QuestSystem', () => {
  it('defaults registry quests for a null save and an old v2 save', () => {
    expect(QuestSystem.fromSave(null).step('pell-berry-order')).toBe('not-started');
    expect(QuestSystem.fromSave(baseSave()).step('pell-berry-order')).toBe('not-started');
  });

  it('walks accept, gathering, return-ready, and completion states', () => {
    const quests = QuestSystem.fromSave(null);
    quests.setStep('pell-berry-order', 'gathering');
    expect(quests.isActive('pell-berry-order')).toBe(true);

    expect(quests.collectNextBerry()).toBe(1);
    expect(quests.collectNextBerry()).toBe(2);
    expect(quests.collectNextBerry()).toBe(3);
    quests.setStep('pell-berry-order', 'return-ready');
    expect(quests.step('pell-berry-order')).toBe('return-ready');

    quests.setStep('pell-berry-order', 'complete');
    expect(quests.isComplete('pell-berry-order')).toBe(true);
    expect(quests.isActive('pell-berry-order')).toBe(false);
  });

  it('derives berry progress from persisted booleans', () => {
    const quests = QuestSystem.fromSave(baseSave({
      questFlags: {
        pellBerryOrderBerry1: true,
        pellBerryOrderBerry2: false,
        pellBerryOrderBerry3: true,
        unrelatedFlag: true
      }
    }));
    expect(quests.berriesCollected()).toBe(2);
  });

  it('collectNextBerry is idempotent once all three are collected', () => {
    const quests = QuestSystem.fromSave(null);
    quests.collectNextBerry();
    quests.collectNextBerry();
    quests.collectNextBerry();
    expect(quests.collectNextBerry()).toBe(3);
    expect(quests.toSaveFields().questFlags).toEqual({
      pellBerryOrderBerry1: true,
      pellBerryOrderBerry2: true,
      pellBerryOrderBerry3: true
    });
  });

  it('round-trips quest steps and berry flags while omitting defaults', () => {
    const fresh = QuestSystem.fromSave(null);
    expect(fresh.toSaveFields()).toEqual({ questSteps: {}, questFlags: {} });

    fresh.setStep('pell-berry-order', 'gathering');
    fresh.collectNextBerry();
    fresh.collectNextBerry();
    const fields = fresh.toSaveFields();
    const loaded = QuestSystem.fromSave(baseSave(fields));

    expect(loaded.step('pell-berry-order')).toBe('gathering');
    expect(loaded.berriesCollected()).toBe(2);
    expect(loaded.toSaveFields()).toEqual(fields);
  });

  it('ignores unknown quests, invalid steps, and farm-legacy entries on load', () => {
    const quests = QuestSystem.fromSave(baseSave({
      questSteps: {
        unknown: 'active',
        'pell-berry-order': 'not-a-step',
        'mira-first-errand': 'try-crop-bonus'
      }
    }));
    expect(quests.step('pell-berry-order')).toBe('not-started');
    expect(quests.toSaveFields().questSteps).toEqual({});
  });

  it('throws for unknown quests, invalid steps, and legacy-owned quests', () => {
    const quests = QuestSystem.fromSave(null);
    expect(() => quests.step('unknown')).toThrow(/Unknown quest/);
    expect(() => quests.setStep('unknown', 'active')).toThrow(/Unknown quest/);
    expect(() => quests.setStep('pell-berry-order', 'not-a-step')).toThrow(/Unknown step/);
    expect(() => quests.setStep('mira-first-errand', 'try-crop-bonus')).toThrow(/farm-legacy/);
  });
});
