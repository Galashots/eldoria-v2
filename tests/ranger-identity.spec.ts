import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

type RangerPresentationState = {
  facing: string;
  frontAccentsVisible: boolean;
  backAccentsVisible: boolean;
  motion: string;
  physicsVisible: boolean;
  spriteTexture: string;
};

async function readRangerPresentation(page: Page): Promise<RangerPresentationState> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      heroPresentation: {
        facing: string;
        motion: string;
        physicsSprite: { visible: boolean };
        rangerBackAccents?: { visible: boolean };
        rangerFrontAccents?: { visible: boolean };
        sprite?: { texture: { key: string } };
      };
    };
    const presentation = scene.heroPresentation;
    return {
      facing: presentation.facing,
      frontAccentsVisible: presentation.rangerFrontAccents?.visible === true,
      backAccentsVisible: presentation.rangerBackAccents?.visible === true,
      motion: presentation.motion,
      physicsVisible: presentation.physicsSprite.visible,
      spriteTexture: presentation.sprite?.texture.key ?? ''
    };
  });
}

async function enterReturningRangerFarm(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('eldoria_v2_opening_seen_grade5-adventurer', 'true');
  });
  await page.reload();

  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, 368);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

test('the Grade 5 farm hero reads as Ranger Explorer and keeps ACTION feedback', async ({ page }) => {
  await enterReturningRangerFarm(page);

  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void };
      heroPresentation: { syncPosition: () => void };
    };
    scene.player.setPosition(320, 320);
    scene.heroPresentation.syncPosition();
  });

  await expect.poll(async () => readRangerPresentation(page)).toEqual({
    facing: 'front',
    frontAccentsVisible: true,
    backAccentsVisible: true,
    motion: 'idle',
    physicsVisible: true,
    spriteTexture: ''
  });
  await page.screenshot({ path: 'test-results/ranger-identity-front.png', fullPage: true });

  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      heroPresentation: { setMovement: (facing: 'right', moving: boolean) => void };
    };
    scene.heroPresentation.setMovement('right', true);
  });
  await expect.poll(async () => (await readRangerPresentation(page)).facing).toBe('right');
  await page.screenshot({ path: 'test-results/ranger-identity-right.png', fullPage: true });

  const actionStarted = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      heroPresentation: { playAction: (busy: boolean) => boolean };
    };
    return scene.heroPresentation.playAction(false);
  });
  expect(actionStarted).toBe(true);
  await expect.poll(async () => (await readRangerPresentation(page)).motion).toBe('action');
  await page.waitForTimeout(60);
  await page.screenshot({ path: 'test-results/ranger-identity-action.png', fullPage: true });

  await expect.poll(async () => (await readRangerPresentation(page)).motion).toBe('idle');
  await expect.poll(async () => (await readRangerPresentation(page)).facing).toBe('right');
});
