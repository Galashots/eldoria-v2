import { expect, test, type Page } from '@playwright/test';
import { MIRA_FIRST_ERRAND, MIRA_SECOND_ERRAND } from '../src/data/quests';
import { FarmQuestSystem } from '../src/systems/FarmQuestSystem';
import { SaveSystem, type SaveState } from '../src/systems/SaveSystem';

const SAVE_KEY = 'eldoria_v2_save_grade2-mage';
const CANVAS = 'canvas';

async function clickGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error('Canvas was not visible.');

  await page.mouse.click(
    box.x + (gameX / 480) * box.width,
    box.y + (gameY / 320) * box.height
  );
}

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
  version: 1,
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
  test('round-trips valid minimal and complete version-1 saves', () => {
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
        miraFirstErrandComplete: true,
        miraSecondErrandComplete: true
      }
    };
    SaveSystem.save(complete);
    expect(SaveSystem.load('grade2-mage')).toEqual(complete);
  });

  test('rejects malformed JSON and wrong version or profile', () => {
    storage.setItem(SAVE_KEY, '{broken');
    expect(SaveSystem.load('grade2-mage')).toBeNull();

    storage.setItem(SAVE_KEY, JSON.stringify({ ...minimalSave(), version: 2 }));
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

    await clickGame(page, 240, 116);
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
    expect(freshState.player).toEqual({ x: 160, y: 256 });
    expect(pageErrors).toEqual([]);
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
        miraFirstErrandComplete: true,
        miraSecondErrandAccepted: false,
        miraSecondErrandCharmFound: false,
        miraSecondErrandComplete: false
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
    expect(quest.currentObjective()).toBe(MIRA_SECOND_ERRAND.objectives.complete);
    expect(quest.completeCropInteraction().stateChanged).toBe(false);
    expect(quest.interactWithMira().reward).toBeUndefined();
    expect(quest.toSaveFields().questFlags).toEqual({
      miraFirstErrandComplete: true,
      miraSecondErrandAccepted: false,
      miraSecondErrandCharmFound: false,
      miraSecondErrandComplete: true
    });
  });
});
