#!/usr/bin/env node
// Captures matched before/after screenshots for the world-actor depth
// (y-sort) change, at the declared supported viewport (1194x834, owner
// decision 2026-07-21 — see src/gameDimensions.ts REFERENCE_VIEWPORT_WIDTH/
// HEIGHT), for both the Mage and Ranger Explorer profiles.
//
// Each capture is clipped to a small window around the actor pair being
// judged: the whole point is which sprite wins a specific overlap, and a
// full-canvas screenshot buries a 64px overlap in 960x640 of farm.
//
// Usage:
//   node scripts/capture-world-depth-evidence.mjs before /tmp/world-depth
//   node scripts/capture-world-depth-evidence.mjs after  /tmp/world-depth
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  CROP,
  WORLD_DEPTH_EVIDENCE_PROFILES,
  WORLD_DEPTH_EVIDENCE_SPOTS
} from './world-depth-evidence-spots.mjs';

const PASS = process.argv[2];
const OUT_ROOT = process.argv[3] ?? '/tmp/world-depth-evidence';
if (PASS !== 'before' && PASS !== 'after') {
  console.error('Usage: node scripts/capture-world-depth-evidence.mjs <before|after> [outDir]');
  process.exit(1);
}

const VIEWPORT = { width: 1194, height: 834 };

// Mirrors src/gameDimensions.ts GAME_WIDTH/GAME_HEIGHT. Duplicated as plain
// constants rather than imported: this script runs under plain `node`, not
// Playwright's TS-aware runner (same reason as
// scripts/capture-farm-scatter-evidence.mjs).
const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

async function clickGameCoord(page, gameX, gameY) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Canvas was not visible.');
  await page.mouse.click(box.x + (gameX / GAME_WIDTH) * box.width, box.y + (gameY / GAME_HEIGHT) * box.height);
}

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
  const measured = [];

  for (const spot of WORLD_DEPTH_EVIDENCE_SPOTS) {
    // Every spot sets its own absolute position and zeroes velocity, so no
    // spot can inherit leftover state from the spot captured before it.
    const camera = await page.evaluate(([x, y]) => {
      const scene = window.__ELDORIA_GAME__.scene.getScene('WorldScene');
      scene.player.setPosition(x, y);
      scene.player.setVelocity(0, 0);
      scene.cameras.main.centerOn(x, y);
      return null;
    }, [spot.player.x, spot.player.y]);
    void camera;
    await page.waitForTimeout(500);

    // Read the settled camera scroll and the depths actually on the display
    // list, so the capture carries its own numeric proof rather than relying
    // on the reader's eye alone.
    const state = await page.evaluate(() => {
      const scene = window.__ELDORIA_GAME__.scene.getScene('WorldScene');
      const hero = scene.heroPresentation?.sprite ?? scene.player;
      return {
        scrollX: scene.cameras.main.scrollX,
        scrollY: scene.cameras.main.scrollY,
        heroDepth: hero.depth,
        slimeDepth: scene.practiceSlimeSprite?.depth ?? null
      };
    });

    const box = await page.locator('canvas').boundingBox();
    if (!box) throw new Error('Canvas was not visible.');
    const scaleX = box.width / GAME_WIDTH;
    const scaleY = box.height / GAME_HEIGHT;
    // Frame the midpoint of the two ground contacts, so both sprites sit in
    // the window regardless of which side the hero is standing on.
    const focusX = spot.anchor.x - state.scrollX;
    const focusY = (spot.anchor.y + spot.player.y + 32) / 2 - state.scrollY;

    const clip = {
      x: box.x + (focusX - CROP.width / 2) * scaleX,
      y: box.y + (focusY - CROP.height / 2) * scaleY,
      width: CROP.width * scaleX,
      height: CROP.height * scaleY
    };

    await page.screenshot({ path: path.join(outDir, `${spot.name}.png`), clip });
    measured.push({ spot: spot.name, ...state, expectation: spot.expectation });
    console.log(`[${profile.label}] captured ${spot.name}  heroDepth=${state.heroDepth}`);
  }

  writeFileSync(path.join(outDir, 'depths.json'), `${JSON.stringify(measured, null, 2)}\n`);
  await page.close();
  return errors;
}

const browser = await chromium.launch();
const allErrors = [];
for (const profile of WORLD_DEPTH_EVIDENCE_PROFILES) {
  allErrors.push(...(await captureProfile(browser, profile)));
}
await browser.close();
console.log(JSON.stringify({ pass: PASS, outDir: path.join(OUT_ROOT, PASS), errors: allErrors }));
process.exit(allErrors.length ? 1 : 0);
