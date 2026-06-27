import { expect, test, type Page } from '@playwright/test';

type StarterQuestStep = 'talk-to-mira' | 'try-crop-bonus' | 'find-slime' | 'return-to-mira' | 'complete';

type GameState = {
  gold: number;
  hint: string;
  inventory: Record<string, number>;
  objective: string;
  player: { x: number; y: number };
  questStep: StarterQuestStep;
};

const CANVAS = 'canvas';

async function boot(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
}

async function clickGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error('Canvas was not visible.');

  await page.mouse.click(
    box.x + (gameX / 480) * box.width,
    box.y + (gameY / 320) * box.height
  );
}

async function startProfile(page: Page, y: number): Promise<void> {
  await clickGame(page, 240, y);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function state(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      gold: number;
      hintText: { text: string };
      inventory: Record<string, number>;
      objectiveText: { text: string };
      player: { x: number; y: number };
      firstQuestStep: StarterQuestStep;
    };

    if (!scene?.player) throw new Error('WorldScene is not ready.');

    return {
      gold: scene.gold,
      hint: scene.hintText.text,
      inventory: { ...scene.inventory },
      objective: scene.objectiveText.text,
      player: { x: scene.player.x, y: scene.player.y },
      questStep: scene.firstQuestStep
    };
  });
}

async function holdKey(page: Page, key: string, ms = 300): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function setPlayer(page: Page, x: number, y: number): Promise<GameState> {
  const nextState = await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      gold: number;
      hintText: { text: string };
      inventory: Record<string, number>;
      objectiveText: { text: string };
      cursors: Record<string, { reset?: () => void }>;
      keys: Record<string, { reset?: () => void }>;
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      firstQuestStep: StarterQuestStep;
      updateHint: () => void;
    };

    Object.values(scene.cursors).forEach((key) => key.reset?.());
    Object.values(scene.keys).forEach((key) => key.reset?.());
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();

    return {
      gold: scene.gold,
      hint: scene.hintText.text,
      inventory: { ...scene.inventory },
      objective: scene.objectiveText.text,
      player: { x: nextX, y: nextY },
      questStep: scene.firstQuestStep
    };
  }, [x, y]);

  await page.waitForTimeout(100);
  return nextState;
}

async function setQuestStep(page: Page, step: StarterQuestStep): Promise<void> {
  await page.evaluate((nextStep) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      setFirstQuestStep: (step: StarterQuestStep) => void;
    };

    scene.setFirstQuestStep(nextStep);
  }, step);
}

async function interact(page: Page): Promise<void> {
  await clickGame(page, 426, 268);
  await page.waitForTimeout(200);
}

async function sceneInteract(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      tryInteract: () => void;
    };

    scene.tryInteract();
  });
  await page.waitForTimeout(200);
}

async function openQuestPrompt(
  page: Page,
  context: 'farm' | 'combat',
  label: 'CropBonus' | 'Practice Slime',
  nextStep: StarterQuestStep,
  message: string
): Promise<void> {
  await page.evaluate(({ promptContext, promptLabel, step, progressMessage }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      openBonusPrompt: (
        context: 'farm' | 'combat',
        label: string,
        onClose: () => string
      ) => void;
      setFirstQuestStep: (step: StarterQuestStep) => void;
    };

    scene.openBonusPrompt(promptContext, promptLabel, () => {
      scene.setFirstQuestStep(step);
      return progressMessage;
    });
  }, { promptContext: context, promptLabel: label, step: nextStep, progressMessage: message });

  await page.waitForTimeout(200);
}

async function skipOpenPrompt(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      busy: boolean;
      children: {
        list: Array<{ destroy?: () => void; list?: unknown[] }>;
      };
      stopPromptReadAloud: () => void;
    };

    const promptPanel = scene.children.list.find((child) => Array.isArray(child.list));
    scene.stopPromptReadAloud();
    promptPanel?.destroy?.();
    scene.busy = false;
  });

  await page.waitForTimeout(100);
}

async function hasCanvasText(page: Page, text: string): Promise<boolean> {
  return page.evaluate((expectedText) => {
    const hasText = (item: { active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }): boolean => {
      if (item.active === false || item.visible === false) return false;
      if (String(item.text ?? '').includes(expectedText)) return true;
      return Array.isArray(item.list) && item.list.some((child) => hasText(child as { text?: string; list?: unknown[] }));
    };

    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: {
        list: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }>;
      };
    };

    return scene.children.list.some(hasText);
  }, text);
}

test('Grade 2 vertical slice supports movement, bonuses, read-aloud, quest progress, and saving', async ({ page }) => {
  await boot(page);
  await startProfile(page, 120);

  await expect.poll(async () => (await state(page)).objective).toContain('Talk to Mira');

  const start = (await state(page)).player;
  await holdKey(page, 'KeyD');
  expect((await state(page)).player.x).toBeGreaterThan(start.x);
  await holdKey(page, 'KeyA');
  expect((await state(page)).player.x).toBeLessThan(start.x + 20);
  await holdKey(page, 'KeyS');
  expect((await state(page)).player.y).toBeGreaterThan(start.y);
  await holdKey(page, 'KeyW');
  expect((await state(page)).player.y).toBeLessThan(start.y + 20);

  await setPlayer(page, 416, 256);
  await expect.poll(async () => (await state(page)).hint).toContain('Mira');
  await interact(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('try-crop-bonus');
  await expect.poll(async () => (await state(page)).objective).toContain('crop patch');

  await openQuestPrompt(page, 'farm', 'CropBonus', 'find-slime', 'Objective updated: find the Practice Slime.');
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await skipOpenPrompt(page);
  await setQuestStep(page, 'find-slime');
  await expect.poll(async () => (await state(page)).questStep).toBe('find-slime');

  await openQuestPrompt(page, 'combat', 'Practice Slime', 'return-to-mira', 'Practice complete. Return to Mira.');
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await skipOpenPrompt(page);
  await setQuestStep(page, 'return-to-mira');
  await expect.poll(async () => (await state(page)).questStep).toBe('return-to-mira');
  await expect.poll(async () => (await state(page)).gold).toBe(0);

  expect((await setPlayer(page, 416, 256)).hint).toContain('Mira');
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => hasCanvasText(page, 'Received: Sunberry Charm')).toBe(true);

  await page.reload();
  await startProfile(page, 120);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);

  await setPlayer(page, 416, 256);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
});

test('Grade 5 prompts keep reader profile without the Grade 2 read-aloud control', async ({ page }) => {
  await boot(page);
  await startProfile(page, 190);

  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      applyReward: (prompt: { rewardKind: 'bonus-harvest' }) => void;
    };
    scene.applyReward({ rewardKind: 'bonus-harvest' });
  });
  await expect.poll(async () => (await state(page)).gold).toBe(3);
  await expect.poll(async () => hasCanvasText(page, '+3 Gold')).toBe(true);

  await setQuestStep(page, 'try-crop-bonus');
  await openQuestPrompt(page, 'farm', 'CropBonus', 'find-slime', 'Objective updated: find the Practice Slime.');

  await expect.poll(async () => hasCanvasText(page, 'optional learning bonus')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(false);
});
