import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

async function boot(page: Page, clearStorage = true): Promise<void> {
  if (clearStorage) {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('eldoria_v2_opening_seen_grade5-adventurer', 'true');
    });
  }
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, 368);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function currentMapId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { mapId: string };
    return scene.mapId;
  });
}

async function playerPosition(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { x: number; y: number };
    };
    return { x: scene.player.x, y: scene.player.y };
  });
}

async function movePlayerTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, [x, y]);
  await expect.poll(() => playerPosition(page), { timeout: 15000 }).toEqual({ x, y });
}

async function travelVia(page: Page, x: number, y: number, destination: string): Promise<void> {
  // Entering an exit can restart the scene before a poll observes the
  // teleported coordinate. The destination map/spawn is the durable state
  // this helper is proving, so poll that directly instead of racing the
  // intentionally transient exit-zone position.
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, [x, y]);
  await page.waitForFunction((expected) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      mapId: string;
      transitioning: boolean;
      player?: { x: number };
    };
    return scene.mapId === expected && scene.transitioning === false && Boolean(scene.player);
  }, destination, { timeout: 30000 });
}

async function sceneInteract(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { tryInteract: () => void };
    scene.tryInteract();
  });
}

async function hasCanvasText(page: Page, expectedText: string): Promise<boolean> {
  return page.evaluate((text) => {
    const hasText = (item: { active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }): boolean => {
      if (item.active === false || item.visible === false) return false;
      if (String(item.text ?? '').includes(text)) return true;
      return Array.isArray(item.list)
        && item.list.some((child) => hasText(child as { text?: string; list?: unknown[] }));
    };
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { list: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }> };
    };
    return scene.children.list.some(hasText);
  }, expectedText);
}

async function bannerText(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { text?: string } | null };
    };
    return scene.children.getByName('map-entry-banner')?.text ?? null;
  });
}

const FARM_VILLAGE_EXIT = { x: 40, y: 640 };
const VILLAGE_FARM_EXIT = { x: 1240, y: 448 };
const VILLAGE_ARRIVAL = { x: 1120, y: 448 };
const FARM_ARRIVAL = { x: 160, y: 640 };

test('farm and village round trip preserves quest state, spawns, banners, and markers', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page);

  const questBefore = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { firstQuestStep: string };
    return scene.firstQuestStep;
  });

  await travelVia(page, FARM_VILLAGE_EXIT.x, FARM_VILLAGE_EXIT.y, 'eldoria-village');
  await expect.poll(() => bannerText(page), { timeout: 15000 }).toBe('Eldoria Village');
  expect(await playerPosition(page)).toEqual(VILLAGE_ARRIVAL);
  await movePlayerTo(page, 640, 560);
  await page.screenshot({ path: 'test-results/village-plaza-pell.png', fullPage: true });

  expect(await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { visible: boolean } | null };
    };
    return scene.children.getByName('objective-marker')?.visible ?? false;
  })).toBe(false);

  await travelVia(page, VILLAGE_FARM_EXIT.x, VILLAGE_FARM_EXIT.y, 'farm');
  await expect.poll(() => bannerText(page), { timeout: 15000 }).toBe('The Farm');
  expect(await playerPosition(page)).toEqual(FARM_ARRIVAL);
  await page.screenshot({ path: 'test-results/farm-west-gate.png', fullPage: true });

  expect(await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { firstQuestStep: string };
    return scene.firstQuestStep;
  })).toBe(questBefore);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { visible: boolean; x: number } | null };
    };
    const marker = scene.children.getByName('objective-marker');
    return marker ? { visible: marker.visible, x: marker.x } : null;
  }), { timeout: 15000 }).toEqual({ visible: true, x: 832 });
});

test('village map persists across reload and has a solid border', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page);
  await travelVia(page, FARM_VILLAGE_EXIT.x, FARM_VILLAGE_EXIT.y, 'eldoria-village');

  await boot(page, false);
  expect(await currentMapId(page)).toBe('eldoria-village');
  await expect.poll(() => bannerText(page), { timeout: 15000 }).toBe('Eldoria Village');

  await movePlayerTo(page, 640, 180);
  await page.keyboard.down('KeyW');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { body: { blocked: { up: boolean } } };
    };
    return scene.player.body.blocked.up;
  }), { timeout: 20000 }).toBe(true);
  await page.keyboard.up('KeyW');
});

test('notice board and well are flavor-only interactions', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page);
  await travelVia(page, FARM_VILLAGE_EXIT.x, FARM_VILLAGE_EXIT.y, 'eldoria-village');

  await movePlayerTo(page, 448, 576);
  await sceneInteract(page);
  await expect.poll(() => hasCanvasText(page, 'odd jobs for helpers'), { timeout: 15000 }).toBe(true);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);

  await movePlayerTo(page, 768, 640);
  await sceneInteract(page);
  await expect.poll(() => hasCanvasText(page, 'well water glitters'), { timeout: 15000 }).toBe(true);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
});
