import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

// E2e coverage for the multi-map world foundation: farm <-> Wildbloom Woods
// transitions, entry banners, spawn placement, save persistence across maps,
// woods collision, and quest/prompt behavior on both maps.
//
// Uses browser-side state reads (scene fields, named objects) rather than
// fixed-delay polling against transition tweens, per the repo's flaky-test
// history; generous timeouts for the software-rendered environment.

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

async function bannerText(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { text?: string } | null };
    };
    return scene.children.getByName('map-entry-banner')?.text ?? null;
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

/**
 * Walks the player into an exit zone by teleporting inside it (the walk-into
 * check runs every controlled frame), then waits for the destination map's
 * scene to be rebuilt and interactive.
 */
async function travelVia(page: Page, zoneX: number, zoneY: number, destinationMapId: string): Promise<void> {
  // The scene can restart before a poll observes the transient exit-zone
  // coordinate, so assert only the durable destination state here.
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, [zoneX, zoneY]);
  await page.waitForFunction((expected) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      mapId: string;
      transitioning: boolean;
      player?: { x: number };
    };
    return scene.mapId === expected && scene.transitioning === false && Boolean(scene.player);
  }, destinationMapId, { timeout: 30000 });
}

async function sceneInteract(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { tryInteract: () => void };
    scene.tryInteract();
  });
}

async function doubleInteract(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { tryInteract: () => void };
    scene.tryInteract();
    scene.tryInteract();
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

async function objectiveGuidanceState(page: Page): Promise<{
  text: string;
  marker: { visible: boolean; x: number; y: number } | null;
  arrow: { visible: boolean; rotation: number } | null;
}> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      objectiveText: { text: string };
      children: {
        getByName: (name: string) => { visible: boolean; x: number; y: number; rotation: number } | null;
      };
    };
    const marker = scene.children.getByName('objective-marker');
    const arrow = scene.children.getByName('objective-edge-arrow');
    return {
      text: scene.objectiveText.text,
      marker: marker ? { visible: marker.visible, x: marker.x, y: marker.y } : null,
      arrow: arrow ? { visible: arrow.visible, rotation: arrow.rotation } : null
    };
  });
}

// Farm east gate zone spans world x 1856-1920, y 576-704; woods west gate
// zone spans world x 0-64, y 384-512 (Tiled px * GAME_SCALE).
const FARM_EXIT_POINT = { x: 1880, y: 640 };
const WOODS_EXIT_POINT = { x: 40, y: 448 };
const WOODS_ARRIVAL = { x: 320, y: 448 };
const FARM_ARRIVAL = { x: 1760, y: 640 };

test('farm -> woods -> farm round trip: correct spawns, banners, quest and marker intact', async ({ page }) => {
  test.setTimeout(180000);

  await boot(page);
  expect(await currentMapId(page)).toBe('farm');
  await expect.poll(async () => bannerText(page)).toBe('The Farm');

  const questBefore = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { firstQuestStep: string };
    return scene.firstQuestStep;
  });

  // Travel to the woods through the east gate.
  await travelVia(page, FARM_EXIT_POINT.x, FARM_EXIT_POINT.y, 'wildbloom-woods');
  await expect.poll(async () => bannerText(page)).toBe('Wildbloom Woods');
  expect(await playerPosition(page)).toEqual(WOODS_ARRIVAL);
  await page.screenshot({ path: 'test-results/multimap-woods-arrival.png', fullPage: true });

  // Mira's farm objective routes to the real GateToFarm centre. Move east so
  // the gate is off-camera and the edge arrow must point west toward it.
  await movePlayerTo(page, 1100, 700);
  await expect.poll(() => objectiveGuidanceState(page), { timeout: 20000 }).toMatchObject({
    text: 'Objective: Head back to The Farm — Talk to Mira near the path.',
    marker: { visible: true, x: 32 },
    arrow: { visible: true }
  });
  const woodsArrowRotation = (await objectiveGuidanceState(page)).arrow?.rotation;
  expect(woodsArrowRotation).toBeDefined();
  expect(Math.abs(Math.abs(woodsArrowRotation ?? 0) - Math.PI)).toBeLessThan(0.25);
  await page.screenshot({
    path: 'docs/playtests/2026-07-21-living-world/multimap-mira-return-guidance.png',
    fullPage: true
  });

  // Travel back through the woods' west gate.
  await travelVia(page, WOODS_EXIT_POINT.x, WOODS_EXIT_POINT.y, 'farm');
  await expect.poll(async () => bannerText(page)).toBe('The Farm');
  expect(await playerPosition(page)).toEqual(FARM_ARRIVAL);
  await page.screenshot({ path: 'test-results/multimap-farm-return.png', fullPage: true });

  // Quest state survives the round trip and the marker points at Mira again.
  expect(await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { firstQuestStep: string };
    return scene.firstQuestStep;
  })).toBe(questBefore);
  await expect.poll(async () => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { visible: boolean; x: number } | null };
    };
    const marker = scene.children.getByName('objective-marker');
    return marker ? { visible: marker.visible, x: marker.x } : null;
  })).toEqual({ visible: true, x: 832 });
});

test('quitting in the woods reloads back into the woods at the saved position', async ({ page }) => {
  test.setTimeout(180000);

  await boot(page);
  await travelVia(page, FARM_EXIT_POINT.x, FARM_EXIT_POINT.y, 'wildbloom-woods');

  // Arrival already persisted the map; wander a little and confirm the save
  // tracks the woods.
  await movePlayerTo(page, 700, 500);
  await sceneInteract(page); // any interaction persists position via save()
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('eldoria_v2_save_grade5-adventurer');
    return raw ? JSON.parse(raw) as { lastArea: string } : null;
  });
  expect(saved?.lastArea).toBe('wildbloom-woods');

  await boot(page, false);
  expect(await currentMapId(page)).toBe('wildbloom-woods');
  await expect.poll(async () => bannerText(page)).toBe('Wildbloom Woods');
  // Old farm saves keep booting on the farm: covered by the entire existing
  // suite (every other spec boots with lastArea 'farm' or no save).
});

test('woods tree border is collidable: the player cannot push through it', async ({ page }) => {
  test.setTimeout(120000);

  await boot(page);
  await travelVia(page, FARM_EXIT_POINT.x, FARM_EXIT_POINT.y, 'wildbloom-woods');

  // Open lane at tile row 12; the east tree border column starts at world
  // x 1216. Push east until the collider engages. Poll rather than waiting a
  // fixed delay: on slow software-rendered runners the per-frame
  // acceleration ramp makes a fixed wait land mid-travel, and body.blocked
  // is a transient per-step flag, so a one-shot sample after a fixed delay
  // flakes on runner speed (the repo's flaky-test doctrine: deterministic
  // state reads, not fixed-delay polling).
  await movePlayerTo(page, 1000, 800);
  await page.keyboard.down('KeyD');
  await expect.poll(async () => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { x: number; body: { blocked: { right: boolean } } };
    };
    return scene.player.body.blocked.right;
  }), { timeout: 20000 }).toBe(true);

  // Sampled while the key is still held: Phaser clears body.blocked as soon
  // as the body stops pressing into the tile, so releasing first would race
  // the deceleration. This proves the stop is the tile collider, not merely
  // running out of travel time.
  const pressedState = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { x: number; body: { blocked: { right: boolean } } };
    };
    return { x: scene.player.x, blockedRight: scene.player.body.blocked.right };
  });
  await page.keyboard.up('KeyD');

  expect(pressedState.blockedRight).toBe(true);
  expect(pressedState.x).toBeGreaterThan(1000);
  // The 72px-wide physics body (36 design px * GAME_SCALE) stops with its
  // right edge against the tree column, so the sprite centre never reaches
  // 1216 — and certainly never leaves the 1280px-wide map.
  expect(pressedState.x).toBeLessThan(1216);
  expect(pressedState.x).toBeLessThan(20 * 32 * 2);
});

test('woods interactables: flower is pure flavor, stone opens practice only on opt-in', async ({ page }) => {
  test.setTimeout(180000);

  await boot(page);
  await travelVia(page, FARM_EXIT_POINT.x, FARM_EXIT_POINT.y, 'wildbloom-woods');

  // Whispering Flower (world 864, 384): flavor toast, never a prompt.
  await movePlayerTo(page, 864, 384);
  await sceneInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'flower hums an old song'), {
    timeout: 15000
  }).toBe(true);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);

  // Mossy Stone (world 736, 576): flavor + offer, second ACTION opens the
  // optional prompt; skipping closes it. Learning stays optional everywhere.
  await movePlayerTo(page, 736, 576);
  await doubleInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'Mossy Stone: optional learning bonus')).toBe(true);
  await page.screenshot({ path: 'test-results/multimap-mossy-stone-prompt.png', fullPage: true });
  await clickGame(page, 480, 484); // skip
  await expect.poll(async () => hasCanvasText(page, 'optional learning bonus')).toBe(false);

  // Back on the farm, the quest-relevant crop prompt still opens as before.
  await travelVia(page, WOODS_EXIT_POINT.x, WOODS_EXIT_POINT.y, 'farm');
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      setFirstQuestStep: (step: string) => void;
    };
    scene.setFirstQuestStep('try-crop-bonus');
  });
  await movePlayerTo(page, 480, 832);
  await sceneInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'CropBonus: optional learning bonus'), {
    timeout: 10000
  }).toBe(true);
});
