import { expect, test, type Page } from '@playwright/test';

const CANVAS = 'canvas';

type EncounterSnapshot = {
  completed: boolean;
  hitCount: number;
  inputLocked: boolean;
  profileId: 'grade2-mage' | 'grade5-adventurer';
  remainingHits: number;
};

type WorldState = {
  gold: number;
  inventory: Record<string, number>;
  mastery: Record<string, unknown>;
  questStep: string;
};

async function clickGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error('Canvas was not visible.');

  await page.mouse.click(
    box.x + (gameX / 480) * box.width,
    box.y + (gameY / 320) * box.height
  );
}

async function startAtSlime(page: Page, profile: 'grade2-mage' | 'grade5-adventurer'): Promise<void> {
  await page.goto('/');
  await page.evaluate((profileId) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${profileId}`, 'true');
  }, profile);
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 240, profile === 'grade2-mage' ? 116 : 184);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));

  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      setFirstQuestStep: (step: 'find-slime') => void;
      updateHint: () => void;
    };
    scene.setFirstQuestStep('find-slime');
    scene.player.setPosition(704, 320);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  });
  await page.waitForTimeout(120);
}

async function snapshot(page: Page): Promise<EncounterSnapshot> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      getPracticeSlimeEncounterSnapshot: () => EncounterSnapshot;
    };
    return scene.getPracticeSlimeEncounterSnapshot();
  });
}

async function worldState(page: Page): Promise<WorldState> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      firstQuestStep: string;
      gold: number;
      inventory: Record<string, number>;
      mastery: Record<string, unknown>;
    };
    return {
      gold: scene.gold,
      inventory: structuredClone(scene.inventory),
      mastery: structuredClone(scene.mastery),
      questStep: scene.firstQuestStep
    };
  });
}

async function hasCanvasText(page: Page, text: string): Promise<boolean> {
  return page.evaluate((expectedText) => {
    const hasText = (item: { active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }): boolean => {
      if (item.active === false || item.visible === false) return false;
      if (String(item.text ?? '').includes(expectedText)) return true;
      return Array.isArray(item.list) && item.list.some((child) => hasText(child as { text?: string; list?: unknown[] }));
    };
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { list: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }> };
    };
    return scene.children.list.some(hasText);
  }, text);
}

async function strike(page: Page): Promise<void> {
  await clickGame(page, 426, 268);
}

test('Mage completes three deliberate Practice Slime hits before the optional prompt', async ({ page }) => {
  await startAtSlime(page, 'grade2-mage');
  const before = await worldState(page);

  await expect.poll(async () => snapshot(page)).toEqual({
    completed: false,
    hitCount: 0,
    inputLocked: false,
    profileId: 'grade2-mage',
    remainingHits: 3
  });
  await page.screenshot({ path: 'test-results/slime-mage-before.png', fullPage: true });

  // Two near-simultaneous taps still count as one deliberate hit.
  await strike(page);
  await strike(page);
  await expect.poll(async () => (await snapshot(page)).hitCount).toBe(1);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
  expect(await worldState(page)).toEqual(before);
  await page.waitForTimeout(190);
  await page.screenshot({ path: 'test-results/slime-mage-first-hit.png', fullPage: true });

  await page.waitForTimeout(260);
  await strike(page);
  await expect.poll(async () => (await snapshot(page)).hitCount).toBe(2);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
  expect(await worldState(page)).toEqual(before);

  await page.waitForTimeout(440);
  await strike(page);
  await expect.poll(async () => snapshot(page)).toMatchObject({
    completed: true,
    hitCount: 3,
    remainingHits: 0
  });
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
  expect(await worldState(page)).toEqual(before);
  await page.waitForTimeout(210);
  await page.screenshot({ path: 'test-results/slime-mage-complete.png', fullPage: true });

  await expect.poll(async () => hasCanvasText(page, 'Practice Slime: optional learning bonus')).toBe(true);
  await page.screenshot({ path: 'test-results/slime-mage-prompt.png', fullPage: true });

  // Grade 2 remains audio-first and skipping still advances the existing quest.
  expect(await hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await clickGame(page, 240, 254);
  await expect.poll(async () => (await worldState(page)).questStep).toBe('return-to-mira');
  await expect.poll(async () => snapshot(page)).toMatchObject({
    completed: false,
    hitCount: 0,
    remainingHits: 3
  });
});

test('Ranger tracking shots remain reader-mode and preserve state before prompt resolution', async ({ page }) => {
  await startAtSlime(page, 'grade5-adventurer');
  const before = await worldState(page);
  await page.screenshot({ path: 'test-results/slime-ranger-before.png', fullPage: true });

  for (let hit = 1; hit <= 3; hit += 1) {
    await strike(page);
    await expect.poll(async () => (await snapshot(page)).hitCount).toBe(hit);
    if (hit === 1) {
      await page.waitForTimeout(170);
      await page.screenshot({ path: 'test-results/slime-ranger-first-hit.png', fullPage: true });
    }
    if (hit < 3) await page.waitForTimeout(440);
  }

  expect(await worldState(page)).toEqual(before);
  await page.waitForTimeout(210);
  await page.screenshot({ path: 'test-results/slime-ranger-complete.png', fullPage: true });
  await expect.poll(async () => hasCanvasText(page, 'Practice Slime: optional learning bonus')).toBe(true);
  expect(await hasCanvasText(page, 'READ ALOUD')).toBe(false);
  await page.screenshot({ path: 'test-results/slime-ranger-prompt.png', fullPage: true });
});
