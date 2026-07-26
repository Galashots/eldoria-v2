import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';
import {
  WORLD_ACTOR_DEPTH_MAX,
  WORLD_ACTOR_DEPTH_MIN,
  worldActorDepth
} from '../src/systems/worldDepth';

// Wiring-level regression for feet-based actor sorting (src/systems/worldDepth.ts).
//
// tests/unit/worldDepth.test.ts covers the pure helper; nothing there would
// notice if WorldScene / PolishedWorldScene / HeroPresentationController
// stopped calling it. These tests read depths off the live display list of the
// real running game instead, so a revert of the wiring fails here.
//
// The two orderings asserted below are the two that were actually wrong before
// this change: the Practice Slime was pinned under the hero (2 vs 3) so the
// hero drew over it even from up-map, and Mira was pinned over the hero
// (3.5 vs 3) so she drew over the hero even from down-map.

/** Farm Tiled coordinates at GAME_SCALE 2. */
const SLIME_GROUND_Y = 640;
const SLIME_X = 1408;
const MIRA_GROUND_Y = 522;
const MIRA_X = 832;
/** Hero centre y -> ground contact y (32x32 frame at GAME_SCALE 2, centre origin). */
const HERO_GROUND_DROP = 32;

const PROFILES = [
  { label: 'Mage', profileId: 'grade2-mage', clickAt: [480, 232] as const },
  { label: 'Ranger Explorer', profileId: 'grade5-adventurer', clickAt: [480, 368] as const }
];

async function boot(page: Page, profileId: string, clickAt: readonly [number, number]): Promise<void> {
  await page.goto('/');
  // Marks the Waking Gate opening as already seen, the same way the other
  // smoke specs do: a fresh profile otherwise plays it before WorldScene
  // exists, and this suite is about the world display list, not the opening.
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${id}`, 'true');
  }, profileId);
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, clickAt[0], clickAt[1]);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

/**
 * Depth of whichever object is actually drawn as the hero: the Mage renders as
 * a separate bottom-origin sprite, the Ranger as the physics sprite itself.
 */
async function heroDepth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { depth: number };
      heroPresentation?: { sprite?: { depth: number } };
    };
    return scene.heroPresentation?.sprite?.depth ?? scene.player.depth;
  });
}

/**
 * Ground contact and depth read in one page evaluation. They must be sampled
 * together: while the hero is walking, two separate reads land on different
 * frames and disagree by however far physics stepped in between.
 */
async function heroSample(page: Page): Promise<{ groundY: number; depth: number }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { y: number; depth: number; displayHeight: number; originY: number };
      heroPresentation?: { sprite?: { depth: number } };
    };
    const { player } = scene;
    return {
      groundY: player.y + player.displayHeight * (1 - player.originY),
      depth: scene.heroPresentation?.sprite?.depth ?? player.depth
    };
  });
}

async function heroGroundY(page: Page): Promise<number> {
  return (await heroSample(page)).groundY;
}

async function slimeDepth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      practiceSlimeSprite?: { depth: number };
    };
    if (!scene.practiceSlimeSprite) throw new Error('Practice Slime sprite is absent on the Farm.');
    return scene.practiceSlimeSprite.depth;
  });
}

async function miraDepth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { depth: number } | null };
    };
    const npc = scene.children.getByName('mira-silhouette');
    if (!npc) throw new Error("Mira's silhouette is absent from the display list.");
    return npc.depth;
  });
}

/**
 * Teleports the hero and waits a frame. Depth is never written by
 * setPosition — only by the per-frame syncDepth() — so an updated depth after
 * this call is itself proof that the sort runs in the frame loop.
 */
async function placeHeroAtGround(page: Page, x: number, groundY: number): Promise<void> {
  const centreY = groundY - HERO_GROUND_DROP;
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
  }, [x, centreY]);
  await expect.poll(() => heroGroundY(page), { timeout: 15000 }).toBeCloseTo(groundY, 0);
}

for (const profile of PROFILES) {
  test(`${profile.label}: the hero sorts behind the Practice Slime from up-map and in front from down-map`, async ({ page }) => {
    await boot(page, profile.profileId, profile.clickAt);
    const slime = await slimeDepth(page);

    await placeHeroAtGround(page, SLIME_X + 16, SLIME_GROUND_Y - 20);
    expect(await heroDepth(page)).toBeLessThan(slime);

    await placeHeroAtGround(page, SLIME_X + 16, SLIME_GROUND_Y + 20);
    expect(await heroDepth(page)).toBeGreaterThan(slime);
  });

  test(`${profile.label}: the hero sorts behind Mira from up-map and in front from down-map`, async ({ page }) => {
    await boot(page, profile.profileId, profile.clickAt);
    const mira = await miraDepth(page);

    await placeHeroAtGround(page, MIRA_X + 16, MIRA_GROUND_Y - 20);
    expect(await heroDepth(page)).toBeLessThan(mira);

    await placeHeroAtGround(page, MIRA_X + 16, MIRA_GROUND_Y + 20);
    expect(await heroDepth(page)).toBeGreaterThan(mira);
  });

  test(`${profile.label}: hero depth tracks its ground contact and stays inside the band`, async ({ page }) => {
    await boot(page, profile.profileId, profile.clickAt);

    // Sweeps the open dirt column the Practice Slime stands in, top to bottom.
    const groundYs = [220, 420, 640, 860, 1080];
    const observed: number[] = [];
    for (const groundY of groundYs) {
      await placeHeroAtGround(page, SLIME_X, groundY);
      const depth = await heroDepth(page);
      expect(depth).toBeGreaterThanOrEqual(WORLD_ACTOR_DEPTH_MIN);
      expect(depth).toBeLessThanOrEqual(WORLD_ACTOR_DEPTH_MAX);
      // The running game must agree with the shared helper exactly, not merely
      // trend the same way — a scene that reimplemented the maths would drift.
      expect(depth).toBeCloseTo(worldActorDepth(groundY), 6);
      observed.push(depth);
    }

    for (let index = 1; index < observed.length; index += 1) {
      expect(observed[index]).toBeGreaterThan(observed[index - 1]);
    }
  });
}

test('Mage: walking down-map raises the hero depth, without a teleport', async ({ page }) => {
  await boot(page, PROFILES[0].profileId, PROFILES[0].clickAt);

  // Open dirt around the Practice Slime, well clear of the Collision layer, so
  // a failure here means the depth stopped tracking movement — not that the
  // hero walked into a fence.
  await placeHeroAtGround(page, SLIME_X, SLIME_GROUND_Y - 120);
  const start = await heroSample(page);

  await page.keyboard.down('ArrowDown');
  await expect.poll(() => heroGroundY(page), { timeout: 15000 }).toBeGreaterThan(start.groundY + 60);
  await page.keyboard.up('ArrowDown');

  // Movement decelerates through velocity smoothing rather than stopping dead,
  // so poll for the exact agreement instead of sampling a single mid-glide
  // frame — depth is written at the top of update() and physics steps after it.
  await expect.poll(async () => {
    const sample = await heroSample(page);
    return Math.abs(sample.depth - worldActorDepth(sample.groundY));
  }, { timeout: 15000 }).toBeLessThan(1e-9);

  const end = await heroSample(page);
  expect(end.groundY).toBeGreaterThan(start.groundY + 60);
  expect(end.depth).toBeGreaterThan(start.depth);
});
