import { expect, test } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';
import { MIRA_FIRST_ERRAND, MIRA_SECOND_ERRAND, MIRA_THIRD_ERRAND } from '../src/data/quests';
import { FarmQuestSystem } from '../src/systems/FarmQuestSystem';
import { loadAudioMuted, saveAudioMuted } from '../src/systems/AudioPreference';
import {
  CURRENT_SAVE_VERSION,
  migrateRawSave,
  SaveSystem,
  type RawSave,
  type SaveMigration,
  type SaveState
} from '../src/systems/SaveSystem';

const SAVE_KEY = 'eldoria_v2_save_grade2-mage';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const minimalSave = (): SaveState => ({
  version: CURRENT_SAVE_VERSION,
  profileId: 'grade2-mage',
  gold: 7,
  lastArea: 'farm',
  player: { x: 160, y: 180 }
});

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

test.describe('SaveSystem runtime validation', () => {
  test('round-trips valid minimal and complete saves', () => {
    const minimal = minimalSave();
    SaveSystem.save(minimal);
    expect(SaveSystem.load('grade2-mage')).toEqual(minimal);

    const complete: SaveState = {
      ...minimal,
      gold: 21,
      inventory: { sunberryCharm: 1 },
      mastery: {
        'grade2:math:addition': {
          seen: 2,
          attempted: 1,
          correct: 1,
          wrong: 0,
          skipped: 1,
          currentCorrectStreak: 1,
          bestCorrectStreak: 1,
          lastPromptId: 'addition-test',
          lastContext: 'farm',
          lastOutcome: 'correct'
        }
      },
      firstQuestStep: 'complete',
      questFlags: {
        miraSecondErrandComplete: true
      }
    };
    SaveSystem.save(complete);
    expect(SaveSystem.load('grade2-mage')).toEqual(complete);
  });

  test('rejects malformed JSON and wrong version or profile', () => {
    storage.setItem(SAVE_KEY, '{broken');
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(SAVE_KEY, JSON.stringify({ ...minimalSave(), version: 99 }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(SAVE_KEY, JSON.stringify({ ...minimalSave(), profileId: 'grade5-adventurer' }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();
  });

  test('rejects missing required data, invalid quest steps, and non-finite values', () => {
    const { player: _player, ...withoutPlayer } = minimalSave();
    storage.setItem(SAVE_KEY, JSON.stringify(withoutPlayer));
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(SAVE_KEY, JSON.stringify({ ...minimalSave(), firstQuestStep: 'unknown-step' }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(
      SAVE_KEY,
      '{"version":1,"profileId":"grade2-mage","gold":7,"lastArea":"farm","player":{"x":1e999,"y":10}}'
    );
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(SAVE_KEY, JSON.stringify({ ...minimalSave(), gold: 'lots' }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();
  });

  test('rejects malformed optional records', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({ ...minimalSave(), inventory: { charm: 'one' } }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(SAVE_KEY, JSON.stringify({ ...minimalSave(), questFlags: { complete: 1 } }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(SAVE_KEY, JSON.stringify({
      ...minimalSave(),
      mastery: { addition: { seen: 1 } }
    }));
    expect(SaveSystem.load('grade2-mage')).toBeNull();
  });

  test('contains storage read and write failures', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => { throw new Error('read failed'); },
        setItem: () => { throw new Error('write failed'); }
      }
    });

    expect(SaveSystem.load('grade2-mage')).toBeNull();
    expect(() => SaveSystem.save(minimalSave())).not.toThrow();
  });

  test('boots a fresh world without page errors when the stored profile save is invalid', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await page.addInitScript(() => {
      window.__ELDORIA_E2E__ = true;
    });
    await page.goto('/');
    await page.evaluate((key) => {
      localStorage.setItem(key, '{"version":1,"profileId":"grade2-mage","gold":99}');
    }, SAVE_KEY);
    await expect(page.locator(CANVAS)).toBeVisible();
    await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));

    await clickGame(page, 480, 232);
    await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
    const freshState = await page.evaluate(() => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
        gold: number;
        objectiveText: { text: string };
        player: { x: number; y: number };
      };
      return {
        gold: scene.gold,
        objective: scene.objectiveText.text,
        player: { x: scene.player.x, y: scene.player.y }
      };
    });

    expect(freshState.gold).toBe(0);
    expect(freshState.objective).toContain('Talk to Mira');
    expect(freshState.player).toEqual({ x: 320, y: 512 });
    expect(pageErrors).toEqual([]);
  });
});

test.describe('SaveSystem migration seam', () => {
  // A synthetic pre-v1 shape used only to exercise the migration seam: an
  // older save that stored gold under "money" and had no "version" field
  // fast-forwarded to 0 for this test.
  const legacyV0Save = (): RawSave => ({
    version: 0,
    profileId: 'grade2-mage',
    money: 42,
    lastArea: 'farm',
    player: { x: 160, y: 180 }
  });

  const rebaseMoneyToGold: SaveMigration = (raw) => {
    const { money, ...rest } = raw;
    return { ...rest, version: CURRENT_SAVE_VERSION, gold: money };
  };

  test('migrateRawSave is a no-op for data already at CURRENT_SAVE_VERSION', () => {
    const current = minimalSave() as unknown as RawSave;
    expect(migrateRawSave(current, { 0: rebaseMoneyToGold })).toEqual(current);
  });

  test('migrateRawSave applies a registered migration and reaches CURRENT_SAVE_VERSION', () => {
    const migrated = migrateRawSave(legacyV0Save(), { 0: rebaseMoneyToGold });
    expect(migrated).toEqual({
      version: CURRENT_SAVE_VERSION,
      profileId: 'grade2-mage',
      lastArea: 'farm',
      player: { x: 160, y: 180 },
      gold: 42
    });
  });

  test('migrateRawSave leaves data unchanged when no migration is registered for its version', () => {
    const legacy = legacyV0Save();
    expect(migrateRawSave(legacy, {})).toEqual(legacy);
  });

  test('a registered migration lets a synthetic older-version save load successfully', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(legacyV0Save()));

    expect(SaveSystem.load('grade2-mage')).toBeNull();

    const loaded = SaveSystem.load('grade2-mage', { 0: rebaseMoneyToGold });
    expect(loaded).toEqual({
      version: CURRENT_SAVE_VERSION,
      profileId: 'grade2-mage',
      lastArea: 'farm',
      player: { x: 160, y: 180 },
      gold: 42
    });
  });

  test('a version higher than CURRENT_SAVE_VERSION still returns null even with migrations registered', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({ ...minimalSave(), version: 99 }));

    expect(SaveSystem.load('grade2-mage', { 0: rebaseMoneyToGold })).toBeNull();
  });

  test('a migration that produces invalid data returns null instead of throwing', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(legacyV0Save()));

    const dropPlayer: SaveMigration = (raw) => {
      const { player: _player, money: _money, ...rest } = raw;
      return { ...rest, version: 1, gold: 42 };
    };

    expect(() => SaveSystem.load('grade2-mage', { 0: dropPlayer })).not.toThrow();
    expect(SaveSystem.load('grade2-mage', { 0: dropPlayer })).toBeNull();
  });

  test('a migration that throws is treated as unavailable and returns null', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(legacyV0Save()));

    const throwingMigration: SaveMigration = () => {
      throw new Error('migration exploded');
    };

    expect(() => SaveSystem.load('grade2-mage', { 0: throwingMigration })).not.toThrow();
    expect(SaveSystem.load('grade2-mage', { 0: throwingMigration })).toBeNull();
  });

  test('a migration that does not bump the version terminates instead of looping forever', () => {
    // A migration keyed at version 0 that forgets to advance `version` would,
    // without the strictly-greater guard, spin migrateRawSave's while loop
    // forever: same version in -> same migration selected -> same version
    // out. This proves the seam breaks out instead of hanging, leaving the
    // stalled data for isSaveState to reject.
    const stalledMigration: SaveMigration = (raw) => ({ ...raw, gold: 1 });

    const migrated = migrateRawSave(legacyV0Save(), { 0: stalledMigration });
    expect(migrated.version).toBe(0);

    storage.setItem(SAVE_KEY, JSON.stringify(legacyV0Save()));
    expect(() => SaveSystem.load('grade2-mage', { 0: stalledMigration })).not.toThrow();
    expect(SaveSystem.load('grade2-mage', { 0: stalledMigration })).toBeNull();
  });

  test('existing valid saves round-trip unaffected by a migrations table', () => {
    const valid = minimalSave();
    SaveSystem.save(valid);

    // A migration registered "from" the current version must never fire,
    // because CURRENT_SAVE_VERSION is not < CURRENT_SAVE_VERSION. If it did
    // fire it would corrupt this save.
    const corruptingMigration: SaveMigration = () => ({ version: CURRENT_SAVE_VERSION, corrupted: true });

    expect(SaveSystem.load('grade2-mage', { [CURRENT_SAVE_VERSION]: corruptingMigration })).toEqual(valid);
  });

  test('a real v1 save is migrated to v2 with its player position doubled to match the 960x640 world scale', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({
      version: 1,
      profileId: 'grade2-mage',
      gold: 7,
      lastArea: 'farm',
      player: { x: 160, y: 180 }
    }));

    expect(SaveSystem.load('grade2-mage')).toEqual({
      version: CURRENT_SAVE_VERSION,
      profileId: 'grade2-mage',
      gold: 7,
      lastArea: 'farm',
      player: { x: 320, y: 360 }
    });
  });
});

test.describe('FarmQuestSystem transitions', () => {
  test('completes the first errand once and serializes its state', () => {
    const quest = new FarmQuestSystem();

    expect(quest.currentObjective()).toBe(MIRA_FIRST_ERRAND.objectives['talk-to-mira']);
    expect(quest.completeCropInteraction().stateChanged).toBe(false);
    expect(quest.completeSlimeInteraction().stateChanged).toBe(false);

    expect(quest.interactWithMira().toast).toBe(MIRA_FIRST_ERRAND.dialogue.start);
    expect(quest.completeCropInteraction().message).toBe(MIRA_FIRST_ERRAND.progress.cropComplete);
    expect(quest.completeSlimeInteraction().message).toBe(MIRA_FIRST_ERRAND.progress.slimeComplete);

    const completion = quest.interactWithMira();
    expect(completion.reward).toEqual({
      gold: MIRA_FIRST_ERRAND.rewards.gold,
      item: MIRA_FIRST_ERRAND.rewards.charm
    });
    expect(quest.firstQuestStep).toBe(MIRA_FIRST_ERRAND.steps.complete);
    expect(quest.toSaveFields()).toEqual({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.complete,
      questFlags: {
        miraSecondErrandAccepted: false,
        miraSecondErrandCharmFound: false,
        miraSecondErrandComplete: false,
        miraThirdErrandAccepted: false,
        miraThirdErrandSprout1Awakened: false,
        miraThirdErrandSprout2Awakened: false,
        miraThirdErrandSprout3Awakened: false,
        miraThirdErrandComplete: false
      }
    });

    expect(quest.interactWithMira().reward).toBeUndefined();
  });

  test('completes the second errand once with contextual objective and hint changes', () => {
    const quest = FarmQuestSystem.fromSave({
      ...minimalSave(),
      firstQuestStep: MIRA_FIRST_ERRAND.steps.complete
    });

    expect(quest.currentObjective()).toBe(MIRA_SECOND_ERRAND.objectives.available);
    expect(quest.hintLabel(MIRA_FIRST_ERRAND.targets.cropBonus)).toBe(MIRA_FIRST_ERRAND.targets.cropBonus);

    expect(quest.interactWithMira().toast).toBe(MIRA_SECOND_ERRAND.dialogue.start);
    expect(quest.currentObjective()).toBe(MIRA_SECOND_ERRAND.objectives.investigate);
    expect(quest.hintLabel(MIRA_FIRST_ERRAND.targets.cropBonus)).toBe('Check Scarecrow');

    const discovery = quest.completeCropInteraction();
    expect(discovery.foundItem).toBe(MIRA_SECOND_ERRAND.storyItem.name);
    expect(quest.currentObjective()).toBe(MIRA_SECOND_ERRAND.objectives.returnToMira);

    const completion = quest.interactWithMira();
    expect(completion.reward).toEqual({ gold: MIRA_SECOND_ERRAND.rewards.gold });
    // Once the second errand completes, Mira immediately offers the third
    // errand rather than showing a terminal "second errand complete" state
    // (mirroring how the first errand's own "complete" objective text is
    // never shown once the second errand becomes available).
    expect(quest.currentObjective()).toBe(MIRA_THIRD_ERRAND.objectives.available);
    expect(quest.completeCropInteraction().stateChanged).toBe(false);
    expect(quest.interactWithMira().toast).toBe(MIRA_THIRD_ERRAND.dialogue.start);
    expect(quest.toSaveFields().questFlags).toEqual({
      miraSecondErrandAccepted: false,
      miraSecondErrandCharmFound: false,
      miraSecondErrandComplete: true,
      miraThirdErrandAccepted: true,
      miraThirdErrandSprout1Awakened: false,
      miraThirdErrandSprout2Awakened: false,
      miraThirdErrandSprout3Awakened: false,
      miraThirdErrandComplete: false
    });
  });

  test('completes the third errand once, tracking sprout-by-sprout progress', () => {
    const quest = FarmQuestSystem.fromSave({
      ...minimalSave(),
      firstQuestStep: MIRA_FIRST_ERRAND.steps.complete,
      questFlags: { miraSecondErrandComplete: true }
    });

    expect(quest.currentObjective()).toBe(MIRA_THIRD_ERRAND.objectives.available);
    expect(quest.completeSproutInteraction('sprout-1').stateChanged).toBe(false);

    expect(quest.interactWithMira().toast).toBe(MIRA_THIRD_ERRAND.dialogue.start);
    expect(quest.currentObjective()).toBe(MIRA_THIRD_ERRAND.objectives.inProgress(0));
    expect(quest.interactWithMira().toast).toBe(MIRA_THIRD_ERRAND.dialogue.reminder);

    expect(quest.completeSproutInteraction('sprout-1').message).toBe(MIRA_THIRD_ERRAND.progress.sproutAwakened);
    expect(quest.completeSproutInteraction('sprout-1').stateChanged).toBe(false);
    expect(quest.currentObjective()).toBe(MIRA_THIRD_ERRAND.objectives.inProgress(1));

    expect(quest.completeSproutInteraction('sprout-2').message).toBe(MIRA_THIRD_ERRAND.progress.sproutAwakened);
    expect(quest.completeSproutInteraction('sprout-3').message).toBe(MIRA_THIRD_ERRAND.progress.sproutAwakened);
    expect(quest.currentObjective()).toBe(MIRA_THIRD_ERRAND.objectives.returnToMira);

    const completion = quest.interactWithMira();
    expect(completion.reward).toEqual({
      gold: MIRA_THIRD_ERRAND.rewards.gold,
      item: MIRA_THIRD_ERRAND.rewards.charm
    });
    expect(quest.currentObjective()).toBe(MIRA_THIRD_ERRAND.objectives.complete);
    expect(quest.completeSproutInteraction('sprout-1').stateChanged).toBe(false);
    expect(quest.interactWithMira().reward).toBeUndefined();
    expect(quest.toSaveFields().questFlags).toEqual({
      miraSecondErrandAccepted: false,
      miraSecondErrandCharmFound: false,
      miraSecondErrandComplete: true,
      miraThirdErrandAccepted: true,
      miraThirdErrandSprout1Awakened: true,
      miraThirdErrandSprout2Awakened: true,
      miraThirdErrandSprout3Awakened: true,
      miraThirdErrandComplete: true
    });
  });

  test('a malformed save with awakened sprouts but no third-errand acceptance cannot auto-complete', () => {
    const quest = FarmQuestSystem.fromSave({
      ...minimalSave(),
      firstQuestStep: MIRA_FIRST_ERRAND.steps.complete,
      questFlags: {
        miraSecondErrandComplete: true,
        miraThirdErrandAccepted: false,
        miraThirdErrandSprout1Awakened: true,
        miraThirdErrandSprout2Awakened: true,
        miraThirdErrandSprout3Awakened: true
      }
    });

    expect(quest.currentObjective()).toBe(MIRA_THIRD_ERRAND.objectives.available);

    const interaction = quest.interactWithMira();
    expect(interaction.toast).toBe(MIRA_THIRD_ERRAND.dialogue.start);
    expect(interaction.reward).toBeUndefined();
    expect(quest.toSaveFields().questFlags.miraThirdErrandComplete).toBe(false);
    expect(quest.toSaveFields().questFlags.miraThirdErrandAccepted).toBe(true);
  });
});

test.describe('AudioPreference persistence', () => {
  test('defaults to unmuted when nothing is stored', () => {
    expect(loadAudioMuted()).toBe(false);
  });

  test('round-trips a saved mute preference', () => {
    saveAudioMuted(true);
    expect(loadAudioMuted()).toBe(true);

    saveAudioMuted(false);
    expect(loadAudioMuted()).toBe(false);
  });

  test('treats any stored value other than the string "true" as unmuted', () => {
    localStorage.setItem('eldoria_v2_audio_muted', 'yes');
    expect(loadAudioMuted()).toBe(false);
  });

  test('storage failures fail safe to unmuted and do not throw', () => {
    const original = globalThis.localStorage.getItem;
    globalThis.localStorage.getItem = () => {
      throw new Error('storage unavailable');
    };

    expect(() => loadAudioMuted()).not.toThrow();
    expect(loadAudioMuted()).toBe(false);

    globalThis.localStorage.getItem = original;
  });
});
