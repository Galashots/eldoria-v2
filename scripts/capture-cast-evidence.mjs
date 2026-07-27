#!/usr/bin/env node
// Captures the ranged cast for both profiles at the declared supported viewport
// (1194x834) and assembles one contact sheet.
//
// Two framings per profile, both aimed at the Practice Slime from 150 world px
// away — beyond nearestTarget()'s ~84px walk-up reach, so the hit is only
// possible because of the cast:
//
//   mid-flight  the projectile between hero and target
//   landed      the impact pop, and the slime's health pips showing a hit
//
// Usage:
//   ELDORIA_BASE_URL=http://127.0.0.1:5203/ node scripts/capture-cast-evidence.mjs docs/playtests/<dir>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

const OUT_DIR = process.argv[2] ?? '/tmp/cast-evidence';
const BASE_URL = process.env.ELDORIA_BASE_URL ?? 'http://127.0.0.1:5173/';
const VIEWPORT = { width: 1194, height: 834 };
const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;
const SLIME = { x: 1408, y: 640 };
const STANDOFF = 150;

const PROFILES = [
  { id: 'grade2-mage', label: 'mage', clickAt: [480, 232] },
  { id: 'grade5-adventurer', label: 'ranger', clickAt: [480, 368] }
];

fs.mkdirSync(OUT_DIR, { recursive: true });
const tmp = fs.mkdtempSync(path.join(process.env.TEMP ?? '/tmp', 'cast-'));
const browser = await chromium.launch();
const errors = [];
const measured = [];

for (const profile of PROFILES) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.on('pageerror', (e) => errors.push(`${profile.label}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${profile.label}: ${m.text()}`); });

  await page.goto(BASE_URL);
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${id}`, 'true');
  }, profile.id);
  await page.reload();
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(
    box.x + (profile.clickAt[0] / GAME_WIDTH) * box.width,
    box.y + (profile.clickAt[1] / GAME_HEIGHT) * box.height
  );
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  await page.waitForTimeout(1100);

  await page.evaluate(([x, y, cx, cy]) => {
    const scene = window.__ELDORIA_GAME__.scene.getScene('WorldScene');
    scene.player.setPosition(x, y);
    scene.player.setVelocity(0, 0);
    scene.cameras.main.centerOn(cx, cy);
  }, [SLIME.x - STANDOFF, SLIME.y - 32, SLIME.x - STANDOFF / 2, SLIME.y - 40]);
  await page.waitForTimeout(300);
  // Face the slime with a real key press, the way play does.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(220);

  const before = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__.scene.getScene('WorldScene');
    return {
      facing: scene.heroPresentation.currentFacing(),
      hits: scene.getPracticeSlimeEncounterSnapshot?.().hitCount ?? null
    };
  });

  await page.keyboard.press('Space');
  await page.waitForTimeout(55);
  await page.locator('canvas').first().screenshot({ path: path.join(tmp, `${profile.label}-mid-flight.png`) });
  await page.waitForTimeout(180);
  await page.locator('canvas').first().screenshot({ path: path.join(tmp, `${profile.label}-landed.png`) });

  const after = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__.scene.getScene('WorldScene');
    return { hits: scene.getPracticeSlimeEncounterSnapshot?.().hitCount ?? null };
  });
  if (after.hits !== 1) {
    errors.push(`${profile.label}: cast did not register a hit (hitCount ${before.hits} -> ${after.hits})`);
  }
  measured.push({ profile: profile.label, standoffPx: STANDOFF, ...before, hitsAfter: after.hits });
  console.log(`[${profile.label}] facing=${before.facing} hits ${before.hits} -> ${after.hits}`);
  await page.close();
}
await browser.close();

// Two columns (mid-flight, landed) by two rows (mage, ranger), point-sampled
// down by 2 to keep one reviewable file a sane size.
const down = (img, f) => {
  const width = Math.floor(img.width / f);
  const height = Math.floor(img.height / f);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = ((y * f) * img.width + x * f) * 4;
      data.set(img.data.slice(s, s + 4), (y * width + x) * 4);
    }
  }
  return { width, height, colorType: 6, data };
};

const cells = PROFILES.flatMap((p) => ['mid-flight', 'landed']
  .map((framing) => down(readPng(path.join(tmp, `${p.label}-${framing}.png`)), 2)));
const cw = cells[0].width;
const ch = cells[0].height;
const GAP = 10;
const W = cw * 2 + GAP * 1;
const H = ch * 2 + GAP * 1;
const data = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i += 1) data.set([18, 20, 26, 255], i * 4);
const sheet = { width: W, height: H, colorType: 6, data };
cells.forEach((cell, index) => {
  const ox = (index % 2) * (cw + GAP);
  const oy = Math.floor(index / 2) * (ch + GAP);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const s = (y * cw + x) * 4;
      sheet.data.set(cell.data.slice(s, s + 4), ((oy + y) * W + ox + x) * 4);
    }
  }
});
const dest = path.join(OUT_DIR, 'cast-contact-sheet.png');
writePng(dest, sheet);
fs.writeFileSync(path.join(OUT_DIR, 'measurements.json'), `${JSON.stringify(measured, null, 2)}\n`);
console.log(JSON.stringify({ dest, sheet: `${W}x${H}`, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
