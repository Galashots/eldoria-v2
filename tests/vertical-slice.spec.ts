import { expect, test, type Page } from '@playwright/test';

type StarterQuestStep = 'talk-to-mira' | 'try-crop-bonus' | 'find-slime' | 'return-to-mira' | 'complete';

type MasteryRecord = {
  seen: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  currentCorrectStreak: number;
  bestCorrectStreak: number;
  lastPromptId: string;
  lastContext: string;
  lastOutcome: 'correct' | 'wrong' | 'skipped';
};

type GameState = {
  gold: number;
  hint: string;
  hud: string;
  hudWidth: number;
  inventory: Record<string, number>;
  mastery: Record<string, MasteryRecord>;
  objective: string;
  player: { x: number; y: number };
  questStep: StarterQuestStep;
};

type PreviewPrompt = {
  id: string;
  answer: number | string | boolean;
  context: string;
  skill: string;
  text: string;
};

type SlimePresentation = {
  animation: string | null;
  displayHeight: number;
  displayWidth: number;
  frame: string | number;
  idleAnimationExists: boolean;
  hopAnimationExists: boolean;
  originX: number;
  originY: number;
  texture: string;
  visible: boolean;
  x: number;
  y: number;
};

type HeroPresentation = {
  animation: string | null;
  displayHeight: number | null;
  displayWidth: number | null;
  frame: string | number | null;
  heroVisible: boolean;
  originX: number | null;
  originY: number | null;
  physicsTexture: string;
  physicsVisible: boolean;
  texture: string | null;
  x: number | null;
  y: number | null;
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
      hudText: { text: string; width: number };
      inventory: Record<string, number>;
      mastery: Record<string, MasteryRecord>;
      objectiveText: { text: string };
      player: { x: number; y: number };
      firstQuestStep: StarterQuestStep;
    };

    if (!scene?.player) throw new Error('WorldScene is not ready.');

    return {
      gold: scene.gold,
      hint: scene.hintText.text,
      hud: scene.hudText.text,
      hudWidth: scene.hudText.width,
      inventory: { ...scene.inventory },
      mastery: structuredClone(scene.mastery),
      objective: scene.objectiveText.text,
      player: { x: scene.player.x, y: scene.player.y },
      questStep: scene.firstQuestStep
    };
  });
}

async function masteryTotal(page: Page, field: 'seen' | 'attempted' | 'skipped'): Promise<number> {
  const records = Object.values((await state(page)).mastery);
  return records.reduce((total, record) => total + record[field], 0);
}

async function slimePresentation(page: Page): Promise<SlimePresentation> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      anims: { exists: (key: string) => boolean };
      practiceSlimeSprite?: {
        anims: { currentAnim?: { key: string } };
        displayHeight: number;
        displayWidth: number;
        frame: { name: string | number };
        originX: number;
        originY: number;
        texture: { key: string };
        visible: boolean;
        x: number;
        y: number;
      };
    };
    const sprite = scene.practiceSlimeSprite;
    if (!sprite) throw new Error('Practice Slime sprite was not created.');

    return {
      animation: sprite.anims.currentAnim?.key ?? null,
      displayHeight: sprite.displayHeight,
      displayWidth: sprite.displayWidth,
      frame: sprite.frame.name,
      idleAnimationExists: scene.anims.exists('practice-slime-idle'),
      hopAnimationExists: scene.anims.exists('practice-slime-hop'),
      originX: sprite.originX,
      originY: sprite.originY,
      texture: sprite.texture.key,
      visible: sprite.visible,
      x: sprite.x,
      y: sprite.y
    };
  });
}

async function heroPresentation(page: Page): Promise<HeroPresentation> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      grade2HeroSprite?: {
        anims: { currentAnim?: { key: string } };
        displayHeight: number;
        displayWidth: number;
        frame: { name: string | number };
        originX: number;
        originY: number;
        texture: { key: string };
        visible: boolean;
        x: number;
        y: number;
      };
      player: {
        texture: { key: string };
        visible: boolean;
      };
    };
    const hero = scene.grade2HeroSprite;

    return {
      animation: hero?.anims.currentAnim?.key ?? null,
      displayHeight: hero?.displayHeight ?? null,
      displayWidth: hero?.displayWidth ?? null,
      frame: hero?.frame.name ?? null,
      heroVisible: hero?.visible === true,
      originX: hero?.originX ?? null,
      originY: hero?.originY ?? null,
      physicsTexture: scene.player.texture.key,
      physicsVisible: scene.player.visible,
      texture: hero?.texture.key ?? null,
      x: hero?.x ?? null,
      y: hero?.y ?? null
    };
  });
}

async function cropFeedbackVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { active: boolean; visible: boolean } | null };
    };

    const feedback = scene.children.getByName('crop-bonus-feedback');
    return feedback?.active === true && feedback.visible === true;
  });
}

async function moveGrade2Hero(
  page: Page,
  key: string,
  facing: 'front' | 'back' | 'left' | 'right',
  ms = 300
): Promise<void> {
  await page.keyboard.down(key);
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual([`grade2-mage-walk-${facing}`, 'grade2-mage-walk-v001']);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual([`grade2-mage-idle-${facing}`, 'grade2-mage-idle-v001']);
}

async function castGrade2Hero(
  page: Page,
  facing: 'front' | 'back' | 'left' | 'right',
  movingKey?: string
): Promise<void> {
  if (movingKey) {
    await page.keyboard.down(movingKey);
    await expect.poll(async () => (await heroPresentation(page)).animation)
      .toBe(`grade2-mage-walk-${facing}`);
  }

  await page.keyboard.down('Space');
  await page.waitForTimeout(50);
  await page.keyboard.up('Space');
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual([`grade2-mage-cast-${facing}`, 'grade2-mage-cast-v001']);

  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual([
    `grade2-mage-${movingKey ? 'walk' : 'idle'}-${facing}`,
    `grade2-mage-${movingKey ? 'walk' : 'idle'}-v001`
  ]);

  if (movingKey) {
    await page.keyboard.up(movingKey);
    await expect.poll(async () => (await heroPresentation(page)).animation)
      .toBe(`grade2-mage-idle-${facing}`);
  }
}

async function triggerGrade2Hurt(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      triggerGrade2HurtForTest: () => boolean;
    };

    return scene.triggerGrade2HurtForTest();
  });
}

async function setPlayer(page: Page, x: number, y: number): Promise<GameState> {
  const nextState = await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      gold: number;
      hintText: { text: string };
      hudText: { text: string; width: number };
      inventory: Record<string, number>;
      mastery: Record<string, MasteryRecord>;
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
      hud: scene.hudText.text,
      hudWidth: scene.hudText.width,
      inventory: { ...scene.inventory },
      mastery: structuredClone(scene.mastery),
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

async function interactAt(page: Page, x: number, y: number): Promise<string> {
  const hint = await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      hintText: { text: string };
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      tryInteract: () => void;
      updateHint: () => void;
    };

    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
    const currentHint = scene.hintText.text;
    scene.tryInteract();
    return currentHint;
  }, [x, y]);

  await page.waitForTimeout(200);
  return hint;
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
  const profileId = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      profileId: 'grade2-mage' | 'grade5-adventurer';
    };
    return scene.profileId;
  });

  await clickGame(page, 240, profileId === 'grade2-mage' ? 254 : 242);
  await page.waitForTimeout(200);
}

async function useDeterministicCorrectPrompt(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      learning: {
        makePrompt: () => unknown;
      };
    };

    scene.learning.makePrompt = () => ({
      id: 'e2e-grade5-area',
      band: 'grade5',
      subject: 'math',
      skill: 'area-perimeter',
      context: 'farm',
      text: 'What is the area of a 3 by 4 garden?',
      answer: 12,
      choices: [12, 10, 14],
      rewardKind: 'bonus-harvest'
    });
  });
}

async function previewPrompt(page: Page, templateId: string): Promise<PreviewPrompt> {
  return page.evaluate((id) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      previewPrompt: (templateId: string) => PreviewPrompt;
    };

    return scene.previewPrompt(id);
  }, templateId);
}

async function chooseOpenPrompt(page: Page, choice: PreviewPrompt['answer']): Promise<void> {
  await page.evaluate((selectedChoice) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: {
        list: Array<{
          list?: Array<{ text?: string; emit?: (event: string) => void }>;
        }>;
      };
    };
    const promptPanel = scene.children.list.find((child) => Array.isArray(child.list));
    const selected = promptPanel?.list?.find((child) => child.text === String(selectedChoice));

    if (!selected?.emit) throw new Error(`Prompt choice was not found: ${selectedChoice}`);
    selected.emit('pointerdown');
  }, choice);
  await page.waitForTimeout(200);
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
  await expect.poll(async () => (await state(page)).hud).not.toContain('Sunberry Charm');
  expect(await heroPresentation(page)).toMatchObject({
    animation: 'grade2-mage-idle-front',
    displayHeight: 48,
    displayWidth: 32,
    heroVisible: true,
    originX: 0.5,
    originY: 1,
    physicsTexture: 'adventurer',
    physicsVisible: false,
    texture: 'grade2-mage-idle-v001'
  });
  const slime = await slimePresentation(page);
  expect(slime).toMatchObject({
    animation: 'practice-slime-idle',
    displayHeight: 32,
    displayWidth: 32,
    hopAnimationExists: true,
    idleAnimationExists: true,
    originX: 0.5,
    originY: 1,
    texture: 'practice-slime-v001',
    visible: true,
    x: 704,
    y: 320
  });
  expect(Number(slime.frame)).toBeGreaterThanOrEqual(0);
  expect(Number(slime.frame)).toBeLessThanOrEqual(3);

  const start = (await state(page)).player;
  await moveGrade2Hero(page, 'KeyD', 'right');
  expect((await state(page)).player.x).toBeGreaterThan(start.x);
  await moveGrade2Hero(page, 'KeyA', 'left');
  expect((await state(page)).player.x).toBeLessThan(start.x + 20);
  await moveGrade2Hero(page, 'KeyS', 'front');
  expect((await state(page)).player.y).toBeGreaterThan(start.y);
  await moveGrade2Hero(page, 'KeyW', 'back');
  expect((await state(page)).player.y).toBeLessThan(start.y + 20);

  await moveGrade2Hero(page, 'KeyS', 'front', 700);
  expect((await state(page)).player.y).toBeGreaterThan(320);
  await moveGrade2Hero(page, 'KeyW', 'back', 700);
  expect((await state(page)).player.y).toBeLessThan(start.y + 20);

  await setPlayer(page, 160, 160);
  const beforeCast = await state(page);
  await castGrade2Hero(page, 'back');
  await castGrade2Hero(page, 'right', 'KeyD');
  expect(await state(page)).toMatchObject({
    gold: beforeCast.gold,
    inventory: beforeCast.inventory,
    mastery: beforeCast.mastery,
    questStep: beforeCast.questStep
  });

  await moveGrade2Hero(page, 'KeyW', 'back');
  const beforeHurt = await state(page);
  const beforeHurtSave = await page.evaluate(() => localStorage.getItem('eldoria_v2_save_grade2-mage'));
  expect(await triggerGrade2Hurt(page)).toBe(true);
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual(['grade2-mage-hurt-back', 'grade2-mage-hurt-v001']);
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual(['grade2-mage-idle-back', 'grade2-mage-idle-v001']);
  expect(await state(page)).toMatchObject({
    gold: beforeHurt.gold,
    inventory: beforeHurt.inventory,
    mastery: beforeHurt.mastery,
    questStep: beforeHurt.questStep
  });
  expect(await page.evaluate(() => localStorage.getItem('eldoria_v2_save_grade2-mage'))).toBe(beforeHurtSave);

  await page.keyboard.down('KeyD');
  await expect.poll(async () => (await heroPresentation(page)).animation).toBe('grade2-mage-walk-right');
  await page.keyboard.down('Space');
  await page.waitForTimeout(50);
  await page.keyboard.up('Space');
  await expect.poll(async () => (await heroPresentation(page)).animation).toBe('grade2-mage-cast-right');
  expect(await triggerGrade2Hurt(page)).toBe(true);
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual(['grade2-mage-hurt-right', 'grade2-mage-hurt-v001']);
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual(['grade2-mage-walk-right', 'grade2-mage-walk-v001']);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => (await heroPresentation(page)).animation).toBe('grade2-mage-idle-right');
  await castGrade2Hero(page, 'right');

  await setPlayer(page, 416, 256);
  await expect.poll(async () => (await state(page)).hint).toContain('Mira');
  await interact(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('try-crop-bonus');
  await expect.poll(async () => (await state(page)).objective).toContain('crop patch');

  expect(await interactAt(page, 240, 416)).toContain('CropBonus');
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(false);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('find-slime');
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(1);

  expect(await interactAt(page, 704, 320)).toContain('Practice Slime');
  await expect.poll(async () => (await slimePresentation(page)).animation).toBe('practice-slime-hop');
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await slimePresentation(page)).animation).toBe('practice-slime-idle');
  await expect.poll(async () => (await state(page)).questStep).toBe('return-to-mira');
  await expect.poll(async () => (await state(page)).gold).toBe(0);
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(2);

  expect((await setPlayer(page, 416, 256)).hint).toContain('Mira');
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).hud).toContain('Keepsake: Sunberry Charm');
  await expect.poll(async () => (await state(page)).hudWidth).toBeLessThanOrEqual(448);
  await expect.poll(async () => masteryTotal(page, 'seen')).toBe(2);
  await expect.poll(async () => masteryTotal(page, 'attempted')).toBe(0);
  await expect.poll(async () => hasCanvasText(page, 'Received: Sunberry Charm')).toBe(true);

  await page.reload();
  await startProfile(page, 120);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).hud).toContain('Keepsake: Sunberry Charm');
  await expect.poll(async () => (await state(page)).objective).toContain('whispering scarecrow');

  await setPlayer(page, 416, 256);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).objective).toContain('Check the scarecrow by the crop patch');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);

  expect(await interactAt(page, 240, 416)).toContain('Check Scarecrow');
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(true);
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(false);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('Bring the Moonseed Charm back to Mira');
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(3);
  await expect.poll(async () => hasCanvasText(page, 'Found: Moonseed Charm')).toBe(true);

  await page.reload();
  await startProfile(page, 120);
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('Bring the Moonseed Charm back to Mira');

  await setPlayer(page, 416, 256);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(14);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('The Whispering Scarecrow');
  await expect.poll(async () => hasCanvasText(page, 'Moonseed Charm')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, '+4 Gold')).toBe(true);

  await page.reload();
  await startProfile(page, 120);
  await expect.poll(async () => (await state(page)).gold).toBe(14);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('The Whispering Scarecrow');

  await setPlayer(page, 416, 256);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(14);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  expect((await state(page)).hud.split('Sunberry Charm')).toHaveLength(2);
});

test('Grade 5 prompts keep reader profile without the Grade 2 read-aloud control', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem('eldoria_v2_save_grade5-adventurer', JSON.stringify({
      version: 1,
      profileId: 'grade5-adventurer',
      gold: 0,
      lastArea: 'farm',
      player: { x: 240, y: 160 }
    }));
  });
  await page.reload();
  await startProfile(page, 190);

  expect((await state(page)).mastery).toEqual({});
  expect(await heroPresentation(page)).toMatchObject({
    animation: null,
    heroVisible: false,
    physicsTexture: 'adventurer',
    physicsVisible: true,
    texture: null
  });
  expect(await triggerGrade2Hurt(page)).toBe(false);

  await setQuestStep(page, 'try-crop-bonus');
  await useDeterministicCorrectPrompt(page);
  await openQuestPrompt(page, 'farm', 'CropBonus', 'find-slime', 'Objective updated: find the Practice Slime.');

  await expect.poll(async () => hasCanvasText(page, 'optional learning bonus')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(false);
  await clickGame(page, 130, 194);

  await expect.poll(async () => (await state(page)).gold).toBe(3);
  await expect.poll(async () => hasCanvasText(page, '+3 Gold')).toBe(true);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.correct).toBe(1);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.attempted).toBe(1);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.currentCorrectStreak).toBe(1);

  await setQuestStep(page, 'try-crop-bonus');
  await openQuestPrompt(page, 'farm', 'CropBonus', 'find-slime', 'Objective updated: find the Practice Slime.');
  await clickGame(page, 240, 194);

  await expect.poll(async () => (await state(page)).questStep).toBe('find-slime');
  await expect.poll(async () => (await state(page)).gold).toBe(3);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.wrong).toBe(1);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.attempted).toBe(2);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.currentCorrectStreak).toBe(0);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.bestCorrectStreak).toBe(1);

  await page.reload();
  await startProfile(page, 190);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.correct).toBe(1);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.wrong).toBe(1);
  await expect.poll(async () => (await state(page)).gold).toBe(3);
});

test('new contextual templates preserve grade-specific prompt contracts', async ({ page }) => {
  await boot(page);

  const prompts = await page.evaluate(async () => {
    const { QUESTION_TEMPLATES } = await import('/src/data/questionTemplates.ts');
    const targets = [
      { id: 'grade2-farm-place-value-basket', context: 'farm', difficulty: 1, band: 'grade2' },
      { id: 'grade2-combat-addition-sparks', context: 'combat', difficulty: 1, band: 'grade2' },
      { id: 'grade5-farm-fractions-sunberry-rows', context: 'farm', difficulty: 1, band: 'grade5' },
      { id: 'grade5-combat-science-energy-transfer', context: 'combat', difficulty: 1, band: 'grade5' }
    ] as const;

    return targets.map(({ id, context, difficulty, band }) => {
      const template = QUESTION_TEMPLATES.find((candidate) => candidate.id === id);
      if (!template) throw new Error(`Missing question template: ${id}`);

      const prompt = template.makePrompt({
        profile: {
          id: band === 'grade2' ? 'grade2-mage' : 'grade5-adventurer',
          label: band === 'grade2' ? 'Mage' : 'Adventurer',
          subtitle: '',
          readingMode: band === 'grade2' ? 'audio-first' : 'reader',
          curriculumBand: band
        },
        context,
        difficulty
      });

      return { templateId: id, minDifficulty: template.minDifficulty, ...prompt };
    });
  });

  expect(prompts.map((prompt) => prompt.templateId)).toEqual([
    'grade2-farm-place-value-basket',
    'grade2-combat-addition-sparks',
    'grade5-farm-fractions-sunberry-rows',
    'grade5-combat-science-energy-transfer'
  ]);

  for (const prompt of prompts) {
    expect(prompt.minDifficulty).toBe(1);
    expect(prompt.choices).toContain(prompt.answer);
    expect(new Set(prompt.choices).size).toBe(prompt.choices.length);
    expect(prompt.choices.length).toBeGreaterThanOrEqual(2);
    expect(prompt.choices.length).toBeLessThanOrEqual(3);
  }

  const grade2Prompts = prompts.filter((prompt) => prompt.band === 'grade2');
  expect(grade2Prompts).toHaveLength(2);
  for (const prompt of grade2Prompts) {
    expect(prompt.readAloudText).toBeTruthy();
    expect(prompt.text.length).toBeLessThanOrEqual(55);
  }

  const grade5Prompts = prompts.filter((prompt) => prompt.band === 'grade5');
  expect(grade5Prompts).toHaveLength(2);
  for (const prompt of grade5Prompts) {
    expect(prompt.readAloudText).toBeUndefined();
  }

  expect(prompts.map(({ context, rewardKind, skill }) => ({ context, rewardKind, skill }))).toEqual([
    { context: 'farm', rewardKind: 'bonus-harvest', skill: 'place-value' },
    { context: 'combat', rewardKind: 'critical-hit', skill: 'addition' },
    { context: 'farm', rewardKind: 'bonus-harvest', skill: 'fractions' },
    { context: 'combat', rewardKind: 'critical-hit', skill: 'energy-resources' }
  ]);
});

test('prompt preview renders a chosen template without gameplay or save effects', async ({ page }) => {
  await boot(page);
  await startProfile(page, 120);

  const grade2Before = await state(page);
  const grade2SaveBefore = await page.evaluate(() => localStorage.getItem('eldoria_v2_save_grade2-mage'));
  const grade2Prompt = await previewPrompt(page, 'grade2-farm-place-value-basket');

  expect(grade2Prompt.id).toBe('farm-grade2-place-value-basket');
  expect(grade2Prompt.context).toBe('farm');
  expect(grade2Prompt.skill).toBe('place-value');
  await expect.poll(async () => hasCanvasText(page, grade2Prompt.text)).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await skipOpenPrompt(page);

  const grade2After = await state(page);
  expect(grade2After.gold).toBe(grade2Before.gold);
  expect(grade2After.mastery).toEqual(grade2Before.mastery);
  expect(grade2After.questStep).toBe(grade2Before.questStep);
  expect(await page.evaluate(() => localStorage.getItem('eldoria_v2_save_grade2-mage'))).toBe(grade2SaveBefore);

  await page.reload();
  await startProfile(page, 190);

  const grade5Before = await state(page);
  const grade5SaveBefore = await page.evaluate(() => localStorage.getItem('eldoria_v2_save_grade5-adventurer'));
  const grade5Prompt = await previewPrompt(page, 'grade5-combat-science-energy-transfer');

  expect(grade5Prompt.id).toBe('combat-grade5-energy-transfer-rune');
  expect(grade5Prompt.context).toBe('combat');
  expect(grade5Prompt.skill).toBe('energy-resources');
  await expect.poll(async () => hasCanvasText(page, grade5Prompt.text)).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(false);
  await chooseOpenPrompt(page, grade5Prompt.answer);

  const grade5After = await state(page);
  expect(grade5After.gold).toBe(grade5Before.gold);
  expect(grade5After.mastery).toEqual(grade5Before.mastery);
  expect(grade5After.questStep).toBe(grade5Before.questStep);
  expect(await page.evaluate(() => localStorage.getItem('eldoria_v2_save_grade5-adventurer'))).toBe(grade5SaveBefore);
});

test('portrait devices ask the player to rotate while landscape keeps the game available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const orientationLock = page.locator('#orientation-lock');
  await expect(orientationLock).toBeVisible();
  await expect(orientationLock).toContainText('Turn your device sideways');
  await expect(orientationLock).toContainText('landscape');

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(orientationLock).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
});
