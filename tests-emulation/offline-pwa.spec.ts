import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from '../tests/support/canvas';

// These specs run against the production build served by `vite preview`
// (see playwright.emulation.config.ts). The service worker only registers when
// import.meta.env.PROD is true, which is exactly the shipped bundle — never the
// dev server the default suite uses.

/** Expose the game handle in the production bundle, same hook the suite uses. */
async function useE2EHandle(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;
  });
}

async function waitForBoot(page: Page): Promise<void> {
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
}

/** Wait until the worker has finished install+activate (precache complete) and controls the page. */
async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller !== null;
  });
}

async function startProfile(page: Page, y: number): Promise<void> {
  await clickGame(page, 480, y);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function questStep(page: Page): Promise<string> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      firstQuestStep: string;
    };
    return scene.firstQuestStep;
  });
}

async function talkToMira(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
      tryInteract: () => void;
    };
    scene.player.setPosition(832, 512);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
    scene.tryInteract();
  });
  await page.waitForTimeout(200);
}

test('service worker registers, controls the page, and precaches the app shell', async ({ page }) => {
  await useE2EHandle(page);
  await page.goto('/');
  await waitForBoot(page);
  await waitForServiceWorker(page);

  const controllerUrl = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '');
  expect(controllerUrl.endsWith('/sw.js')).toBe(true);

  // Exactly one Eldoria precache exists, named for this build, and it holds the shell.
  const cacheReport = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith('eldoria-v2-precache-'));
    const cache = await caches.open(names[0]);
    const keys = await cache.keys();
    return { names, entryCount: keys.length, urls: keys.map((request) => request.url) };
  });
  expect(cacheReport.names).toHaveLength(1);
  expect(cacheReport.names[0]).toMatch(/^eldoria-v2-precache-v\d+\.\d+\.\d+-[0-9a-f]{12}$/);
  expect(cacheReport.entryCount).toBeGreaterThan(5);
  expect(cacheReport.urls.some((url) => url.endsWith('/index.html'))).toBe(true);
  expect(cacheReport.urls.some((url) => url.endsWith('/manifest.webmanifest'))).toBe(true);
  expect(cacheReport.urls.some((url) => url.endsWith('/maps/farm.json'))).toBe(true);
});

test('a second load offline boots fully with zero console errors and reaches the farm', async ({ page, context }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await useE2EHandle(page);
  await page.goto('/');
  await waitForBoot(page);
  await waitForServiceWorker(page);

  // Go offline and reload — everything must come from the precache.
  await context.setOffline(true);
  await page.reload();
  await waitForBoot(page);

  // Title -> farm must be reachable with no network.
  await startProfile(page, 240);
  expect(await page.evaluate(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'))).toBe(true);
  await testInfo.attach('offline-farm-boot.png', { body: await page.screenshot(), contentType: 'image/png' });

  await context.setOffline(false);
  expect(consoleErrors, `console errors during offline boot:\n${consoleErrors.join('\n')}`).toEqual([]);
  expect(pageErrors, `page errors during offline boot:\n${pageErrors.join('\n')}`).toEqual([]);
});

test('a save written offline round-trips across an offline reload', async ({ page, context }) => {
  await useE2EHandle(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForBoot(page);
  await waitForServiceWorker(page);

  await context.setOffline(true);

  await startProfile(page, 240);
  expect(await questStep(page)).toBe('talk-to-mira');

  // Advance the quest offline; this writes to localStorage.
  await talkToMira(page);
  expect(await questStep(page)).toBe('try-crop-bonus');
  const savedOffline = await page.evaluate(() => localStorage.getItem('eldoria_v2_save_grade2-mage'));
  expect(savedOffline).not.toBeNull();

  // Reload while still offline; the offline-written save must restore.
  await page.reload();
  await waitForBoot(page);
  await startProfile(page, 240);
  expect(await questStep(page)).toBe('try-crop-bonus');

  await context.setOffline(false);
});

test('activate cleanup deletes a previous build cache while keeping the current one', async ({ page }) => {
  await useE2EHandle(page);
  await page.goto('/');
  await waitForBoot(page);
  await waitForServiceWorker(page);

  const currentName = await page.evaluate(async () =>
    (await caches.keys()).find((name) => name.startsWith('eldoria-v2-precache-'))
  );
  expect(currentName).toBeTruthy();

  // Seed a stale previous-build cache, as an older deploy would have left behind.
  const staleName = 'eldoria-v2-precache-v0.0.1-000000000000';
  await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    await cache.put(new Request('./stale-marker'), new Response('stale'));
  }, staleName);
  expect(await page.evaluate(() => caches.keys())).toContain(staleName);

  // Force a fresh activation: unregister, then reload so main.ts re-registers a
  // new worker whose activate handler runs the old-cache cleanup.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.unregister();
  });
  await page.reload();
  await waitForBoot(page);
  await waitForServiceWorker(page);

  const finalNames = await page.evaluate(() =>
    caches.keys().then((names) => names.filter((name) => name.startsWith('eldoria-v2-precache-')))
  );
  expect(finalNames).not.toContain(staleName);
  expect(finalNames).toContain(currentName);
});
