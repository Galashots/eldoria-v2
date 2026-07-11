import { expect, test } from '@playwright/test';
import {
  CURRENT_SAVE_VERSION,
  migrateRawSave,
  SaveSystem,
  type SaveState
} from '../src/systems/SaveSystem';
import { WORLD_COORDINATE_SCALE_V1_TO_V2 } from '../src/gameDimensions';
import { MemoryStorage } from './support/memoryStorage';

const SAVE_KEY = 'eldoria_v2_save_grade2-mage';

let storage: MemoryStorage;
let originalWarn: typeof console.warn;

test.beforeEach(() => {
  storage = new MemoryStorage();
  originalWarn = console.warn;
  console.warn = () => undefined;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage
  });
});

test.afterEach(() => {
  console.warn = originalWarn;
});

const currentSave = (): SaveState => ({
  version: CURRENT_SAVE_VERSION,
  profileId: 'grade2-mage',
  gold: 7,
  lastArea: 'farm',
  player: { x: 320, y: 360 }
});

test.describe('v1 to v2 world-coordinate migration', () => {
  test('doubles valid v1 coordinates exactly once and returns a v2 save', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({
      version: 1,
      profileId: 'grade2-mage',
      gold: 7,
      lastArea: 'farm',
      player: { x: 160, y: 180 }
    }));

    const migrated = SaveSystem.load('grade2-mage');

    expect(migrated).toEqual({
      version: CURRENT_SAVE_VERSION,
      profileId: 'grade2-mage',
      gold: 7,
      lastArea: 'farm',
      player: {
        x: 160 * WORLD_COORDINATE_SCALE_V1_TO_V2,
        y: 180 * WORLD_COORDINATE_SCALE_V1_TO_V2
      }
    });
  });

  test('saving and reloading a migrated v2 save does not scale coordinates again', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({
      version: 1,
      profileId: 'grade2-mage',
      gold: 7,
      lastArea: 'farm',
      player: { x: 160, y: 180 }
    }));

    const migrated = SaveSystem.load('grade2-mage');
    expect(migrated).not.toBeNull();
    SaveSystem.save(migrated!);

    expect(SaveSystem.load('grade2-mage')).toEqual({
      version: CURRENT_SAVE_VERSION,
      profileId: 'grade2-mage',
      gold: 7,
      lastArea: 'farm',
      player: { x: 320, y: 360 }
    });
  });

  test('leaves newly created v2 saves unchanged', () => {
    const save = currentSave();
    SaveSystem.save(save);

    expect(SaveSystem.load('grade2-mage')).toEqual(save);
    expect(migrateRawSave(save)).toEqual(save);
  });

  test('rejects v1 saves with missing or invalid player coordinates safely', () => {
    const invalidPlayers = [
      undefined,
      {},
      { x: 160 },
      { x: '160', y: 180 },
      { x: Number.POSITIVE_INFINITY, y: 180 }
    ];

    for (const player of invalidPlayers) {
      storage.setItem(SAVE_KEY, JSON.stringify({
        version: 1,
        profileId: 'grade2-mage',
        gold: 7,
        lastArea: 'farm',
        player
      }));

      expect(() => SaveSystem.load('grade2-mage')).not.toThrow();
      expect(SaveSystem.load('grade2-mage')).toBeNull();
    }
  });
});
