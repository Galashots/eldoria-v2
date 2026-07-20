import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../support/memoryStorage';
import { CURRENT_SAVE_VERSION, SaveSystem, type SaveState } from '../../src/systems/SaveSystem';

const SAVE_KEY = 'eldoria_v2_save_grade2-mage';
const minimalSave = (): SaveState => ({
  version: CURRENT_SAVE_VERSION,
  profileId: 'grade2-mage',
  gold: 7,
  lastArea: 'farm',
  player: { x: 320, y: 512 }
});

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SaveSystem questSteps compatibility', () => {
  it('loads a v2 save without questSteps unchanged', () => {
    const save = minimalSave();
    SaveSystem.save(save);
    expect(SaveSystem.load('grade2-mage')).toEqual(save);
  });

  it('round-trips a string questSteps record', () => {
    const save: SaveState = {
      ...minimalSave(),
      questSteps: { 'pell-berry-order': 'gathering' }
    };
    SaveSystem.save(save);
    expect(SaveSystem.load('grade2-mage')).toEqual(save);
  });

  it('rejects malformed questSteps data', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({
      ...minimalSave(),
      questSteps: ['gathering']
    }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(SAVE_KEY, JSON.stringify({
      ...minimalSave(),
      questSteps: { 'pell-berry-order': 1 }
    }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();
  });
});
