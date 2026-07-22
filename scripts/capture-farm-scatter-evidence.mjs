#!/usr/bin/env node
// Captures matched Farm screenshots for D3 grass-scatter wiring before/after
// evidence, at the declared supported viewport (1194x834, owner decision
// 2026-07-21 — see src/gameDimensions.ts REFERENCE_VIEWPORT_WIDTH/HEIGHT),
// for both the Mage and Ranger Explorer profiles. Pass `before` or `after`
// as the pass name; screenshots land under <outDir>/<pass>/<profile>/<spot>.png.
//
// Usage:
//   node scripts/capture-farm-scatter-evidence.mjs before /tmp/farm-scatter-evidence
//   node scripts/capture-farm-scatter-evidence.mjs after /tmp/farm-scatter-evidence
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const PASS = process.argv[2];
const OUT_ROOT = process.argv[3] ?? '/tmp/farm-scatter-evidence';
if (PASS !== 'before' && PASS !== 'after') {
  console.error('Usage: node scripts/capture-farm-scatter-evidence.mjs <before|after> [outDir]');
  process.exit(1);
}

// Declared supported evidence viewport (owner decision 2026-07-21).
const VIEWPORT = { width: 1194, height: 834 };

// Mirrors src/gameDimensions.ts GAME_WIDTH/GAME_HEIGHT (960x640, the internal
// Phaser canvas resolution). Duplicated as plain constants instead of
// importing the .ts module directly: this script runs under plain `node`
// (not Playwright's TS-aware runner, unlike tests/support/canvas.ts), and CI
// pins Node 22 where unflagged native TS type-stripping isn't guaranteed.
const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

const PROFILES = [
  { id: 'grade2-mage', label: 'mage', clickAt: [480, 232] },
  { id: 'grade5-adventurer', label: 'ranger', clickAt: [480, 368] }
];

// Maps a game-logical coordinate (0..GAME_WIDTH, 0..GAME_HEIGHT) to a CSS
// pixel point on the actual canvas element, accounting for Phaser's
// Scale.FIT + CENTER_BOTH letterboxing inside the declared VIEWPORT — same
// approach as tests/support/canvas.ts's gameToCanvasPoint(). At VIEWPORT
// (1194x834) vs. the 960x640/1.5-aspect canvas, the canvas is scaled up
// (~1.244x) and centered with vertical letterbox bars, so a raw
// page.mouse.click() at game-logical values misses the on-canvas target.
async function clickGameCoord(page, gameX, gameY) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Canvas was not visible.');
  const x = box.x + (gameX / GAME_WIDTH) * box.width;
  const y = box.y + (gameY / GAME_HEIGHT) * box.height;
  await page.mouse.click(x, y);
}

// World-px camera-centre spots covering the required evidence set: arrival,
// routes/gate mouths, Mira, crop area, Practice Slime, Wildbloom discovery
// locations, and a wide Farm overview. HUD/objective/ACTION readability is
// screen-space and appears in every shot, so it needs no dedicated spot.
const SPOTS = [
  ['wide-farm-overview', [960, 640]],
  ['farm-spawn-arrival', null],
  ['route-west-gate-village', [220, 640]],
  ['route-east-gate-woods', [1700, 640]],
  ['mira-interaction', [864, 544]],
  ['crop-area', [480, 864]],
  ['practice-slime-area', [1440, 672]],
  ['wildbloom-root-star', [1120, 288]],
  ['wildbloom-moonwell-echo', [672, 960]],
  ['wildbloom-foxfire-seed', [1600, 928]]
];

async function captureProfile(browser, profile) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.addInitScript(() => { window.__ELDORIA_E2E__ = true; });
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
  await clickGameCoord(page, ...profile.clickAt);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  await page.waitForTimeout(1200);

  const outDir = path.join(OUT_ROOT, PASS, profile.label);
  mkdirSync(outDir, { recursive: true });

  for (const [name, pos] of SPOTS) {
    if (pos) {
      await page.evaluate(([x, y]) => {
        const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene');
        scene.player.setPosition(x, y);
        scene.player.setVelocity(0, 0);
        scene.cameras.main.centerOn(x, y);
      }, pos);
      await page.waitForTimeout(400);
    }
    await page.locator('canvas').first().screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`[${profile.label}] captured ${name}`);
  }

  await page.close();
  return errors;
}

const browser = await chromium.launch();
const allErrors = [];
for (const profile of PROFILES) {
  allErrors.push(...(await captureProfile(browser, profile)));
}
await browser.close();
console.log(JSON.stringify({ pass: PASS, outDir: path.join(OUT_ROOT, PASS), errors: allErrors }));
process.exit(allErrors.length ? 1 : 0);
