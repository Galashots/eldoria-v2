import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';
import { GAME_SCALE } from '../src/gameDimensions';
import { BAKER_PELL_SHOP, buildVillageShopPlan } from '../src/data/villageShopBuilding';

// Wiring-level regression for the Eldoria Village shop structure.
//
// tests/unit/villageShopBuilding.test.ts validates the layout data against the
// committed map; nothing there would notice if WorldScene stopped rendering the
// structure, stopped installing its collider, or sorted it out of the actor
// band. These tests read the real running scene.

const VILLAGE_WORLD_TILE_PX = 32 * GAME_SCALE;
const PLAN = buildVillageShopPlan(BAKER_PELL_SHOP, VILLAGE_WORLD_TILE_PX);

const PROFILES = [
  { label: 'Mage', profileId: 'grade2-mage', clickAt: [480, 232] as const },
  { label: 'Ranger Explorer', profileId: 'grade5-adventurer', clickAt: [480, 368] as const }
];

async function bootIntoVillage(page: Page, profileId: string, clickAt: readonly [number, number]): Promise<void> {
  await page.goto('/');
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${id}`, 'true');
  }, profileId);
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, clickAt[0], clickAt[1]);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));

  // Rebuilt through the scene's own restart path, the same way a gate does.
  await page.evaluate((id) => {
    window.__ELDORIA_GAME__?.scene.getScene('WorldScene').scene.restart({
      profileId: id, mapId: 'eldoria-village', spawnId: 'default'
    });
  }, profileId);
  await page.waitForFunction(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      mapId: string;
      scene: { isActive: () => boolean };
    } | undefined;
    return scene?.scene.isActive() === true && scene.mapId === 'eldoria-village';
  });
}

async function shopState(page: Page): Promise<{ cellCount: number; depths: number[]; hasBlockerBody: boolean }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: {
        list: { name?: string; depth: number }[];
        getByName: (name: string) => { body?: unknown } | null;
      };
    };
    const cells = scene.children.list.filter((child) => child.name?.startsWith('village-shop-cell-'));
    return {
      cellCount: cells.length,
      depths: [...new Set(cells.map((cell) => cell.depth))],
      hasBlockerBody: Boolean(scene.children.getByName('village-shop-blocker')?.body)
    };
  });
}

async function heroState(page: Page): Promise<{ depth: number; x: number; y: number; bodyTop: number }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { x: number; y: number; depth: number; body: { top: number } | null };
      heroPresentation?: { sprite?: { depth: number } };
    };
    return {
      depth: scene.heroPresentation?.sprite?.depth ?? scene.player.depth,
      x: scene.player.x,
      y: scene.player.y,
      bodyTop: scene.player.body?.top ?? Number.NaN
    };
  });
}

async function placeHero(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
  }, [x, y]);
  await expect.poll(async () => (await heroState(page)).y, { timeout: 15000 }).toBeCloseTo(y, 0);
}

for (const profile of PROFILES) {
  test(`${profile.label}: the Village renders every shop cell as one y-sorted structure`, async ({ page }) => {
    await bootIntoVillage(page, profile.profileId, profile.clickAt);
    const state = await shopState(page);

    expect(state.cellCount).toBe(PLAN.placements.length);
    // One shared depth: the cells never overlap each other, and the structure
    // has to win or lose an overlap with the hero as a single object.
    expect(state.depths).toHaveLength(1);
    expect(state.depths[0]).toBeGreaterThan(2);
    expect(state.depths[0]).toBeLessThan(3.5);
    expect(state.hasBlockerBody).toBe(true);
  });

  test(`${profile.label}: the shop draws over a hero up-map of it and under one down-map`, async ({ page }) => {
    await bootIntoVillage(page, profile.profileId, profile.clickAt);
    const shopDepth = (await shopState(page)).depths[0];

    // Behind the structure, overlapping its left edge.
    await placeHero(page, PLAN.solid.x + 8, PLAN.overhang!.y + 86);
    expect((await heroState(page)).depth).toBeLessThan(shopDepth);

    // On the road in front of it.
    await placeHero(page, PLAN.solid.x + 96, PLAN.groundY + 80);
    expect((await heroState(page)).depth).toBeGreaterThan(shopDepth);
  });

  test(`${profile.label}: the shop's solid rows block the hero, its overhang does not`, async ({ page }) => {
    await bootIntoVillage(page, profile.profileId, profile.clickAt);

    // Walk north into the front wall from the road.
    await placeHero(page, PLAN.solid.x + 96, PLAN.groundY + 110);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1600);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(250);

    const blocked = await heroState(page);
    expect(
      blocked.bodyTop,
      `hero body top ${blocked.bodyTop} entered the solid rows (expected >= ${PLAN.solid.y})`
    ).toBeGreaterThanOrEqual(PLAN.solid.y);

    // The overhanging rows are walkable — that is what makes being hidden by
    // the roof possible at all. Teleporting there must not eject the hero.
    const behindX = PLAN.overhang!.x + PLAN.overhang!.width / 2;
    const behindY = PLAN.overhang!.y + 40;
    await placeHero(page, behindX, behindY);
    await page.waitForTimeout(400);
    const behind = await heroState(page);
    expect(Math.abs(behind.x - behindX)).toBeLessThan(8);
    expect(Math.abs(behind.y - behindY)).toBeLessThan(8);
  });
}
