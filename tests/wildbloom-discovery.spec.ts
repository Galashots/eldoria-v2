import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

type ProfileId = 'grade2-mage' | 'grade5-adventurer';
type SpotId = 'root-star' | 'moonwell-echo' | 'foxfire-seed';

type DiscoverySnapshot = {
  activeSpotId: SpotId | null;
  discoveredSpotIds: SpotId[];
  inputLocked: boolean;
  profileId: ProfileId;
  totalSpots: number;
  unlocked: boolean;
};

const SPOT_APPROACH: Record<SpotId, { x: number; y: number }> = {
  'root-star': { x: 1052, y: 288 },
  'moonwell-echo': { x: 604, y: 960 },
  'foxfire-seed': { x: 1532, y: 928 }
};

async function seedAndStart(
  page: Page,
  profileId: ProfileId,
  extraInventory: Record<string, number> = {},
  includeSprig = true
): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;

    const recorderWindow = window as unknown as { __wildbloomCanvasTextsSeen?: Set<string> };
    recorderWindow.__wildbloomCanvasTextsSeen = new Set();

    const recordVisibleText = (item: {
      active?: boolean;
      visible?: boolean;
      text?: unknown;
      list?: unknown[];
    }): void => {
      if (item.active === false || item.visible === false) return;
      if (typeof item.text === 'string') recorderWindow.__wildbloomCanvasTextsSeen!.add(item.text);
      if (Array.isArray(item.list)) {
        item.list.forEach((child) => recordVisibleText(child as { text?: unknown; list?: unknown[] }));
      }
    };

    const collect = () => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
        children?: { list?: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }> };
      } | undefined;
      scene?.children?.list?.forEach(recordVisibleText);
      requestAnimationFrame(collect);
    };
    requestAnimationFrame(collect);
  });

  await page.goto('/');
  await page.evaluate(({ profileId: id, inventory, withSprig }) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${id}`, 'true');
    localStorage.setItem(`eldoria_v2_save_${id}`, JSON.stringify({
      version: 1,
      profileId: id,
      gold: 20,
      inventory: {
        ...(withSprig ? { wildbloomSprig: 1 } : {}),
        ...inventory
      },
      mastery: {},
      lastArea: 'farm',
      firstQuestStep: 'complete',
      questFlags: {
        miraSecondErrandAccepted: false,
        miraSecondErrandCharmFound: false,
        miraSecondErrandComplete: true,
        miraThirdErrandAccepted: true,
        miraThirdErrandSprout1Awakened: true,
        miraThirdErrandSprout2Awakened: true,
        miraThirdErrandSprout3Awakened: true,
        miraThirdErrandComplete: true
      },
      player: { x: 416, y: 256 }
    }));
  }, { profileId, inventory: extraInventory, withSprig: includeSprig });
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, profileId === 'grade2-mage' ? 232 : 368);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function moveToSpot(page: Page, spotId: SpotId): Promise<void> {
  const position = SPOT_APPROACH[spotId];
  await page.evaluate(({ x, y }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (nextX: number, nextY: number) => void; setVelocity: (x: number, y: number) => void };
      heroPresentation: { syncPosition: () => void };
      wildbloomDiscovery: { update: () => void };
    };
    scene.player.setPosition(x, y);
    scene.player.setVelocity(0, 0);
    scene.heroPresentation.syncPosition();
    scene.wildbloomDiscovery.update();
  }, position);
}

async function snapshot(page: Page): Promise<DiscoverySnapshot> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      getWildbloomDiscoverySnapshot: () => DiscoverySnapshot;
    };
    return scene.getWildbloomDiscoverySnapshot();
  });
}

async function hasCanvasText(page: Page, text: string): Promise<boolean> {
  return page.evaluate((expectedText) => {
    const hasText = (item: { active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }): boolean => {
      if (item.active === false || item.visible === false) return false;
      if (String(item.text ?? '').includes(expectedText)) return true;
      return Array.isArray(item.list) && item.list.some((child) => hasText(child as { text?: string; list?: unknown[] }));
    };
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { list: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }> };
    };
    return scene.children.list.some(hasText);
  }, text);
}

async function canvasTextSeen(page: Page, text: string): Promise<boolean> {
  return page.evaluate((expectedText) => {
    const seen = (window as unknown as { __wildbloomCanvasTextsSeen?: Set<string> }).__wildbloomCanvasTextsSeen;
    return [...(seen ?? [])].some((entry) => entry.includes(expectedText));
  }, text);
}

async function resetCanvasTextRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __wildbloomCanvasTextsSeen?: Set<string> }).__wildbloomCanvasTextsSeen?.clear();
  });
}

async function savedInventory(page: Page, profileId: ProfileId): Promise<Record<string, number>> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem(`eldoria_v2_save_${id}`);
    return raw ? (JSON.parse(raw).inventory ?? {}) : {};
  }, profileId);
}

async function revealSpot(page: Page, spotId: SpotId): Promise<void> {
  await moveToSpot(page, spotId);
  await expect.poll(async () => (await snapshot(page)).activeSpotId).toBe(spotId);
  await resetCanvasTextRecorder(page);
  await clickGame(page, 852, 536);
  await expect.poll(async () => (await snapshot(page)).inputLocked).toBe(true);
  await expect.poll(async () => (await snapshot(page)).discoveredSpotIds).toContain(spotId);
  await expect.poll(async () => (await snapshot(page)).inputLocked).toBe(false);
}

test('Mage magic reveals all three persistent Wildbloom secrets without changing quests or curriculum', async ({ page }) => {
  // Walks all three Wildbloom spots with reveal animations between them:
  // ~20s on CI runners, but crosses the global 30s under software rendering
  // (no GPU), so give it explicit slow-environment headroom.
  test.setTimeout(60000);
  await seedAndStart(page, 'grade2-mage');

  await expect.poll(async () => snapshot(page)).toEqual({
    activeSpotId: null,
    discoveredSpotIds: [],
    inputLocked: false,
    profileId: 'grade2-mage',
    totalSpots: 3,
    unlocked: true
  });

  await moveToSpot(page, 'root-star');
  await expect.poll(async () => (await snapshot(page)).activeSpotId).toBe('root-star');
  await expect.poll(async () => hasCanvasText(page, 'WILDBLOOM')).toBe(true);
  await page.screenshot({ path: 'test-results/discovery-mage-hum.png', fullPage: true });

  await clickGame(page, 852, 536);
  await expect.poll(async () => (await snapshot(page)).inputLocked).toBe(true);
  await page.screenshot({ path: 'test-results/discovery-mage-ability.png', fullPage: true });
  await expect.poll(async () => (await snapshot(page)).discoveredSpotIds).toContain('root-star');
  await expect.poll(async () => canvasTextSeen(page, 'SECRET FOUND')).toBe(true);
  await page.screenshot({ path: 'test-results/discovery-mage-reveal.png', fullPage: true });

  expect((await savedInventory(page, 'grade2-mage')).wildbloomSecretRootStar).toBe(1);
  await expect.poll(async () => (await snapshot(page)).inputLocked).toBe(false);

  await revealSpot(page, 'moonwell-echo');
  await moveToSpot(page, 'foxfire-seed');
  await expect.poll(async () => (await snapshot(page)).activeSpotId).toBe('foxfire-seed');
  await resetCanvasTextRecorder(page);
  await clickGame(page, 852, 536);
  await expect.poll(async () => (await snapshot(page)).discoveredSpotIds).toHaveLength(3);
  await expect.poll(async () => canvasTextSeen(page, 'WILDBLOOM SONG COMPLETE')).toBe(true);
  await page.screenshot({ path: 'test-results/discovery-mage-complete.png', fullPage: true });

  const saved = await savedInventory(page, 'grade2-mage');
  expect(saved).toMatchObject({
    wildbloomSprig: 1,
    wildbloomSecretRootStar: 1,
    wildbloomSecretMoonwellEcho: 1,
    wildbloomSecretFoxfireSeed: 1
  });
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);

  await page.reload();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, 232);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  await expect.poll(async () => (await snapshot(page)).discoveredSpotIds).toEqual([
    'root-star',
    'moonwell-echo',
    'foxfire-seed'
  ]);
});

test('Ranger tracking reveals the same secret loop with a distinct readable ability path', async ({ page }) => {
  await seedAndStart(page, 'grade5-adventurer');
  await moveToSpot(page, 'moonwell-echo');

  await expect.poll(async () => snapshot(page)).toMatchObject({
    activeSpotId: 'moonwell-echo',
    discoveredSpotIds: [],
    profileId: 'grade5-adventurer',
    unlocked: true
  });
  await page.screenshot({ path: 'test-results/discovery-ranger-hum.png', fullPage: true });

  await resetCanvasTextRecorder(page);
  await clickGame(page, 852, 536);
  await expect.poll(async () => (await snapshot(page)).inputLocked).toBe(true);
  await page.screenshot({ path: 'test-results/discovery-ranger-ability.png', fullPage: true });
  await expect.poll(async () => (await snapshot(page)).discoveredSpotIds).toContain('moonwell-echo');
  await expect.poll(async () => canvasTextSeen(page, 'Moonwell Echo')).toBe(true);
  await page.screenshot({ path: 'test-results/discovery-ranger-reveal.png', fullPage: true });

  expect((await savedInventory(page, 'grade5-adventurer')).wildbloomSecretMoonwellEcho).toBe(1);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
});

test('hidden spots stay dormant until the Wildbloom Sprig has been earned', async ({ page }) => {
  await seedAndStart(page, 'grade2-mage', {}, false);
  await moveToSpot(page, 'root-star');

  await expect.poll(async () => snapshot(page)).toMatchObject({
    activeSpotId: null,
    discoveredSpotIds: [],
    unlocked: false
  });
  await clickGame(page, 852, 536);
  await page.waitForTimeout(420);
  expect((await savedInventory(page, 'grade2-mage')).wildbloomSecretRootStar).toBeUndefined();
});
