#!/usr/bin/env node
// Captures the Eldoria Village shop structure at the declared supported
// viewport (1194x834, owner decision 2026-07-21) for both the Mage and Ranger
// Explorer profiles, and proves the two things a reviewer has to judge:
//
//   1. the structure reads as a building the hero stands in front of, is
//      blocked by, and can be hidden behind;
//   2. what it would have looked like as a terrain-layer structure instead —
//      the alternative the owner rejected on 2026-07-26 when settling that
//      structures are actors, not terrain (docs/VISUAL_ASSET_CONTRACT.md,
//      "Buildings and props"). Kept as the record of the rejected option.
//
// The terrain-layer frame is produced by forcing the structure's cell depth to
// 0 in the live scene and re-shooting the identical framing. That is not a
// mock-up: `renderLayer: "terrain"` differs from this composition by exactly
// that one depth value, so the frame is what the alternative actually renders.
//
// Usage:
//   ELDORIA_BASE_URL=http://127.0.0.1:5201/ node scripts/capture-village-shop-evidence.mjs /tmp/village-shop
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT_ROOT = process.argv[2] ?? '/tmp/village-shop-evidence';
const BASE_URL = process.env.ELDORIA_BASE_URL ?? 'http://127.0.0.1:5173/';
const VIEWPORT = { width: 1194, height: 834 };
const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

const PROFILES = [
  { id: 'grade2-mage', label: 'mage', clickAt: [480, 232] },
  { id: 'grade5-adventurer', label: 'ranger', clickAt: [480, 368] }
];

// Shop occupies Village tiles (8..11, 1..4) -> world x 512..768, y 64..320,
// with the solid block at y 192..320 and the roof overhanging y 64..192.
const SHOP = { left: 512, right: 768, top: 64, groundY: 320, solidTop: 192 };

const SPOTS = [
  {
    name: 'approach-from-the-road',
    // On the road in front of the door, where Baker Pell stands.
    hero: [608, 400],
    note: 'hero down-map of the shop, so the hero draws in front'
  },
  {
    name: 'partly-behind-the-wall',
    // Straddling the shop's left edge so part of the hero is occluded and part
    // is not — a fully-hidden hero proves nothing a reader can see.
    hero: [520, 150],
    note: 'hero up-map of the shop and overlapping its left edge, so the structure draws over it'
  },
  {
    name: 'blocked-by-the-front-wall',
    // Driven into the wall from below; the capture asserts it was stopped.
    hero: [608, 430],
    walkUpUntilBlocked: true,
    note: 'hero walks north into the solid rows and is stopped short of them'
  }
];

async function clickGameCoord(page, gameX, gameY) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Canvas was not visible.');
  await page.mouse.click(box.x + (gameX / GAME_WIDTH) * box.width, box.y + (gameY / GAME_HEIGHT) * box.height);
}

async function placeHero(page, [x, y]) {
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__.scene.getScene('WorldScene');
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.cameras.main.centerOn(nextX, nextY);
  }, [x, y]);
  await page.waitForTimeout(420);
}

async function readState(page) {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__.scene.getScene('WorldScene');
    const cells = scene.children.list.filter((child) => child.name?.startsWith('village-shop-cell-'));
    const hero = scene.heroPresentation?.sprite ?? scene.player;
    return {
      cellCount: cells.length,
      shopDepth: cells.length ? cells[0].depth : null,
      heroDepth: hero.depth,
      heroX: scene.player.x,
      heroY: scene.player.y,
      heroBodyTop: scene.player.body ? scene.player.body.top : null
    };
  });
}

async function captureProfile(browser, profile) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE_URL);
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${id}`, 'true');
  }, profile.id);
  await page.reload();
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
  await clickGameCoord(page, ...profile.clickAt);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  await page.waitForTimeout(900);

  // Travel to the Village through the scene's own restart path, the same way a
  // gate transition does, rather than mutating map state in place.
  await page.evaluate((id) => {
    window.__ELDORIA_GAME__.scene.getScene('WorldScene').scene.restart({
      profileId: id, mapId: 'eldoria-village', spawnId: 'default'
    });
  }, profile.id);
  await page.waitForFunction(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene');
    return scene?.scene.isActive() && scene.mapId === 'eldoria-village';
  });
  await page.waitForTimeout(1100);

  const outDir = path.join(OUT_ROOT, profile.label);
  mkdirSync(outDir, { recursive: true });
  const measured = [];

  for (const spot of SPOTS) {
    await placeHero(page, spot.hero);

    if (spot.walkUpUntilBlocked) {
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(1600);
      await page.keyboard.up('ArrowUp');
      await page.waitForTimeout(300);
    }

    const state = await readState(page);
    await page.locator('canvas').first().screenshot({ path: path.join(outDir, `${spot.name}.png`) });

    const record = { spot: spot.name, note: spot.note, ...state };
    if (spot.walkUpUntilBlocked) {
      record.stoppedShortOfSolidRows = state.heroBodyTop !== null && state.heroBodyTop >= SHOP.solidTop;
      if (!record.stoppedShortOfSolidRows) {
        errors.push(
          `${profile.label}/${spot.name}: hero body top ${state.heroBodyTop} entered the solid rows `
            + `(y >= ${SHOP.solidTop} expected) — the structure did not block it`
        );
      }
    }
    measured.push(record);
    console.log(`[${profile.label}] ${spot.name}  shopDepth=${state.shopDepth} heroDepth=${state.heroDepth}`);
  }

  // The terrain-layer alternative, at the one framing where it differs.
  await placeHero(page, SPOTS[1].hero);
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__.scene.getScene('WorldScene');
    for (const child of scene.children.list) {
      if (child.name?.startsWith('village-shop-cell-')) child.setDepth(0);
    }
  });
  await page.waitForTimeout(300);
  const terrainState = await readState(page);
  await page.locator('canvas').first().screenshot({
    path: path.join(outDir, 'partly-behind-the-wall--as-terrain-layer.png')
  });
  measured.push({
    spot: 'partly-behind-the-wall--as-terrain-layer',
    note: 'identical framing with the structure depth forced to 0, i.e. renderLayer: terrain',
    ...terrainState
  });
  console.log(`[${profile.label}] terrain-layer comparison  shopDepth=${terrainState.shopDepth}`);

  writeFileSync(path.join(outDir, 'measurements.json'), `${JSON.stringify(measured, null, 2)}\n`);
  await page.close();
  return errors;
}

const browser = await chromium.launch();
const allErrors = [];
for (const profile of PROFILES) {
  allErrors.push(...(await captureProfile(browser, profile)));
}
await browser.close();
console.log(JSON.stringify({ outDir: OUT_ROOT, errors: allErrors }, null, 2));
process.exit(allErrors.length ? 1 : 0);
