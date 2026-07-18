// Captures farm screenshots at fixed scenic spots for before/after evidence.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '/tmp/farm-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.addInitScript(() => { window.__ELDORIA_E2E__ = true; });
await page.goto('http://127.0.0.1:5173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('canvas');
await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
await page.mouse.click(640, 405); // grade5 adventurer button (sy ~368/640*720)
await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
await page.waitForTimeout(1200);

const spots = [
  ['spawn', null],
  ['pond', [320, 210]],
  ['dirt-path', [480, 420]]
];

for (const [name, pos] of spots) {
  if (pos) {
    await page.evaluate(([x, y]) => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene');
      scene.player.setPosition(x, y);
      scene.player.setVelocity(0, 0);
      scene.cameras.main.centerOn(x, y);
      scene.updateHint();
    }, pos);
    await page.waitForTimeout(400);
  }
  await page.locator('canvas').first().screenshot({ path: `${OUT}/${name}.png` });
  console.log(`captured ${name}`);
}

console.log(JSON.stringify({ errors }));
await browser.close();
process.exit(errors.length ? 1 : 0);
