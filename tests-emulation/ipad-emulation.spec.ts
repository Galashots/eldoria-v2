import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from '../tests/support/canvas';
import {
  BUDGETS,
  auditTouchTargets,
  installFrameRecorder,
  markSteadyStateBaseline,
  readFrameStats,
  throttleCpu,
  throttleNetwork
} from './support/emulation';

// iPad Pro 11" emulation (Chromium) against the production preview build. This
// is EMULATION, not physical iPad Safari validation — see docs/IPAD_EMULATION.md.

async function useE2EHandle(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;
  });
}

async function waitForBoot(page: Page): Promise<void> {
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
}

async function startProfile(page: Page, y: number): Promise<void> {
  await clickGame(page, 480, y);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function walk(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function encounterSlimeAndAnswer(page: Page): Promise<void> {
  // Stand on the Practice Slime and interact — the encounter plays, then opens
  // the optional learning prompt.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
      tryInteract: () => void;
    };
    scene.player.setPosition(1408, 640);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
    scene.tryInteract();
  });
  await page.waitForTimeout(600);
  // Answer by selecting the first choice button (grade2 audio-first layout:
  // choicesY = sy(38) => world y 396; choice 0 x = 480 + sx(-110) => 260).
  await clickGame(page, 260, 396);
  await page.waitForTimeout(400);
}

test('iPad journey holds frame pacing, heap stability, and a clean console under 4x CPU throttle', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await installFrameRecorder(page);
  await useE2EHandle(page);

  // Boot -> title.
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForBoot(page);

  // Farm entry, then mark the steady-state baseline so budgets measure gameplay
  // pacing rather than one-time boot/asset decode.
  await startProfile(page, 240);
  await markSteadyStateBaseline(page);

  // Apply the mobile CPU envelope for the gameplay portion.
  const client = await page.context().newCDPSession(page);
  await throttleCpu(client);

  // Walk a loop.
  for (let lap = 0; lap < 7; lap += 1) {
    await walk(page, 'KeyD', 1400);
    await walk(page, 'KeyS', 1400);
    await walk(page, 'KeyA', 1400);
    await walk(page, 'KeyW', 1400);
  }
  // Practice-slime encounter + answer a learning prompt.
  await encounterSlimeAndAnswer(page);
  // A little more traversal after the encounter.
  for (let lap = 0; lap < 2; lap += 1) {
    await walk(page, 'KeyW', 1400);
    await walk(page, 'KeyD', 1400);
  }

  const stats = await readFrameStats(page);
  await testInfo.attach('ipad-journey-end.png', { body: await page.screenshot(), contentType: 'image/png' });
  await testInfo.attach('ipad-journey-report.json', {
    body: JSON.stringify({ budgets: BUDGETS, stats, consoleErrors, pageErrors }, null, 2),
    contentType: 'application/json'
  });
  // eslint-disable-next-line no-console
  console.log('iPad journey stats:', JSON.stringify(stats));

  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  expect(pageErrors, `page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(stats.steadyFrames, 'journey recorded too few frames to judge').toBeGreaterThan(300);
  // Stable primary gate on the median (catches sustained slowdown) + lenient p95
  // backstop for severe stutter (tolerant of CI noise). See BUDGETS calibration.
  expect(stats.p50FrameMs, `p50 frame time ${stats.p50FrameMs}ms > budget`).toBeLessThanOrEqual(BUDGETS.p50FrameMs);
  expect(stats.p95FrameMs, `p95 frame time ${stats.p95FrameMs}ms > budget`).toBeLessThanOrEqual(BUDGETS.p95FrameMs);
  expect(stats.heapGrowthMb, `heap grew ${stats.heapGrowthMb}MB > budget`).toBeLessThanOrEqual(BUDGETS.heapGrowthMb);
});

test('cold load to interactive stays within budget under CPU + network throttle', async ({ page }, testInfo) => {
  await useE2EHandle(page);
  const client = await page.context().newCDPSession(page);
  await throttleCpu(client);
  await throttleNetwork(client);

  const start = Date.now();
  await page.goto('/');
  await waitForBoot(page);
  const coldLoadMs = Date.now() - start;

  await testInfo.attach('ipad-cold-load.json', {
    body: JSON.stringify({ coldLoadMs, budgetMs: BUDGETS.coldLoadMs }, null, 2),
    contentType: 'application/json'
  });
  // eslint-disable-next-line no-console
  console.log(`iPad cold load to interactive: ${coldLoadMs}ms (budget ${BUDGETS.coldLoadMs}ms)`);
  expect(coldLoadMs, `cold load ${coldLoadMs}ms > budget`).toBeLessThanOrEqual(BUDGETS.coldLoadMs);
});

test('every interactive canvas target is at least 44x44 CSS px at iPad scale', async ({ page }) => {
  await useE2EHandle(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForBoot(page);
  await startProfile(page, 240);

  const collected = new Map<string, { label: string; cssWidth: number; cssHeight: number }>();
  const collect = async (): Promise<void> => {
    for (const target of await auditTouchTargets(page)) {
      collected.set(`${target.label}:${target.cssWidth}x${target.cssHeight}`, target);
    }
  };

  // HUD controls (ACTION button, etc).
  await collect();

  // Prompt controls: read-aloud + choice buttons.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      openBonusPrompt: (context: string, label: string, onClose: () => string) => void;
    };
    scene.openBonusPrompt('combat', 'Practice Slime', () => 'done');
  });
  await page.waitForTimeout(200);
  await collect();
  // Close the prompt (grade2 skip button: world (480, 508)).
  await clickGame(page, 480, 508);
  await page.waitForTimeout(200);

  // Stats & Mastery panel (its close button).
  await page.keyboard.down('KeyI');
  await page.keyboard.up('KeyI');
  await page.waitForTimeout(200);
  await collect();

  const targets = [...collected.values()];
  expect(targets.length, 'no interactive targets were audited').toBeGreaterThan(0);
  const tooSmall = targets.filter((t) => t.cssWidth < 44 || t.cssHeight < 44);
  expect(
    tooSmall,
    `interactive targets below 44x44 CSS px:\n${tooSmall.map((t) => `  ${t.label}: ${t.cssWidth}x${t.cssHeight}`).join('\n')}`
  ).toEqual([]);
});

test('the served manifest advertises an installable standalone/landscape PWA and portrait shows the orientation lock', async ({ page }, testInfo) => {
  await useE2EHandle(page);
  await page.goto('/');
  await waitForBoot(page);

  // An installed PWA launches standalone (no browser chrome) and landscape
  // because the manifest the app serves says so. Headless Chromium under
  // Playwright cannot emulate the installed display-mode media state at runtime
  // (CDP setEmulatedMedia doesn't cover display-mode; headless --app reports
  // 'browser'), so standalone launch is verified at the manifest level here —
  // see docs/IPAD_EMULATION.md. Real standalone chrome/safe-area behavior stays
  // part of the still-owed physical-device validation.
  const manifest = await page.evaluate(async () => {
    const res = await fetch('./manifest.webmanifest');
    return res.json() as Promise<{ display?: string; orientation?: string; icons?: unknown[] }>;
  });
  expect(manifest.display).toBe('standalone');
  expect(manifest.orientation).toBe('landscape');
  expect(Array.isArray(manifest.icons) ? manifest.icons.length : 0).toBeGreaterThanOrEqual(2);

  // The current (browser) display-mode is not standalone — a sanity check that
  // the media query itself resolves.
  expect(await page.evaluate(() => window.matchMedia('(display-mode: standalone)').matches)).toBe(false);

  // Rotating to portrait must surface the orientation-lock guidance overlay.
  await page.setViewportSize({ width: 834, height: 1194 });
  const orientationLock = page.locator('#orientation-lock');
  await expect(orientationLock).toBeVisible();
  await expect(orientationLock).toContainText('landscape');
  await testInfo.attach('ipad-portrait-orientation-lock.png', { body: await page.screenshot(), contentType: 'image/png' });

  // Back to landscape hides it and keeps the canvas.
  await page.setViewportSize({ width: 1194, height: 834 });
  await expect(orientationLock).toBeHidden();
  await expect(page.locator(CANVAS)).toBeVisible();
});
