import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

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

async function boot(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;

    // Continuously accumulate every visible canvas text into a window-level
    // Set. Floating reward toasts live ~1.2-1.5s (one tween), shorter than a
    // slow environment's evaluate round-trip, so one-shot polls can miss
    // them; this rAF sampler cannot. Assertions on transient toasts use
    // canvasTextSeen(); stable UI (HUD, panels, open prompts) keeps using
    // hasCanvasText() current-state checks.
    const w = window as unknown as { __canvasTextsSeen?: Set<string> };
    w.__canvasTextsSeen = new Set();
    const collect = () => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
        children: { list?: Array<{ active?: boolean; visible?: boolean; text?: unknown }> };
      } | undefined;
      for (const child of scene?.children.list ?? []) {
        if (child?.active && child?.visible && typeof child.text === 'string') {
          w.__canvasTextsSeen!.add(child.text);
        }
      }
      requestAnimationFrame(collect);
    };
    requestAnimationFrame(collect);
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
}

async function startProfile(page: Page, y: number): Promise<void> {
  await clickGame(page, 480, y);
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
      heroPresentation?: {
        sprite?: {
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
      player: {
        texture: { key: string };
        visible: boolean;
      };
    };
    const hero = scene.heroPresentation?.sprite;

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

/**
 * Browser-side watcher for the crop-bonus feedback pulse: the pulse lives
 * ~480ms (one tween), shorter than a slow environment's evaluate round-trip,
 * so polling cropFeedbackVisible for `true` can miss it entirely. A
 * requestAnimationFrame loop in the page samples every frame regardless of
 * round-trip latency. Arm BEFORE triggering the interaction, then assert
 * cropFeedbackSeen; the later `false` poll stays as-is (a destroyed pulse
 * is a stable end state, safe to poll for).
 */
async function armCropFeedbackWatcher(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __cropFeedbackSeen?: boolean; __cropFeedbackWatchId?: number };
    w.__cropFeedbackSeen = false;
    if (w.__cropFeedbackWatchId !== undefined) cancelAnimationFrame(w.__cropFeedbackWatchId);
    const watch = () => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
        children: { getByName: (name: string) => { active: boolean; visible: boolean } | null };
      };
      const pulse = scene?.children.getByName('crop-bonus-feedback');
      if (pulse?.active === true && pulse?.visible === true) {
        w.__cropFeedbackSeen = true;
        return;
      }
      w.__cropFeedbackWatchId = requestAnimationFrame(watch);
    };
    w.__cropFeedbackWatchId = requestAnimationFrame(watch);
  });
}

async function cropFeedbackSeen(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as { __cropFeedbackSeen?: boolean }).__cropFeedbackSeen === true
  );
}

async function holdKey(page: Page, key: string, ms = 300): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
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

/**
 * Browser-side hero-animation recorder for transient clips (cast/hurt run
 * ~500ms, shorter than a slow environment's evaluate round-trip, so polling
 * heroPresentation can miss them entirely). Arm before triggering the
 * action, poll recordedHeroAnimations, then disarm.
 */
async function armHeroAnimationRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      heroPresentation?: {
        sprite?: {
          on: (event: string, cb: (anim: { key: string }) => void) => void;
          off: (event: string, cb: (anim: { key: string }) => void) => void;
        };
      };
    };
    const recorderWindow = window as unknown as {
      __heroAnimRecorder: string[];
      __heroAnimRecorderCallback?: (anim: { key: string }) => void;
    };
    recorderWindow.__heroAnimRecorder = [];
    const callback = (anim: { key: string }) => recorderWindow.__heroAnimRecorder.push(anim.key);
    recorderWindow.__heroAnimRecorderCallback = callback;
    scene.heroPresentation?.sprite?.on('animationstart', callback);
  });
}

async function recordedHeroAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __heroAnimRecorder?: string[] }).__heroAnimRecorder ?? []);
}

async function disarmHeroAnimationRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      heroPresentation?: {
        sprite?: { off: (event: string, cb: (anim: { key: string }) => void) => void };
      };
    };
    const recorderWindow = window as unknown as {
      __heroAnimRecorderCallback?: (anim: { key: string }) => void;
    };
    const callback = recorderWindow.__heroAnimRecorderCallback;
    if (callback) scene.heroPresentation?.sprite?.off('animationstart', callback);
    delete recorderWindow.__heroAnimRecorderCallback;
  });
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

  // Record animation starts browser-side BEFORE casting: the cast clip is a
  // ~500ms transient, and under software rendering an expect.poll round-trip
  // can miss it entirely (this flaked in slow environments). The encounter
  // suite's strikeBurst helper sets the same observe-in-page precedent.
  await armHeroAnimationRecorder(page);

  await page.keyboard.down('Space');
  await page.waitForTimeout(50);
  await page.keyboard.up('Space');

  await expect.poll(async () => recordedHeroAnimations(page)).toContain(`grade2-mage-cast-${facing}`);

  await disarmHeroAnimationRecorder(page);

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
  await clickGame(page, 852, 536);
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

  await clickGame(page, 480, profileId === 'grade2-mage' ? 508 : 484);
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

/** True once canvas text containing `text` has been seen since the recorder was last reset. For transient floating toasts. */
async function canvasTextSeen(page: Page, text: string): Promise<boolean> {
  return page.evaluate((expected) => {
    const seen = (window as unknown as { __canvasTextsSeen?: Set<string> }).__canvasTextsSeen;
    if (!seen) return false;
    for (const entry of seen) {
      if (entry.includes(expected)) return true;
    }
    return false;
  }, text);
}

async function resetCanvasTextRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __canvasTextsSeen?: Set<string> }).__canvasTextsSeen?.clear();
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
      children: {
        list: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }>;
      };
    };

    return scene.children.list.some(hasText);
  }, text);
}

test('Grade 2 vertical slice supports movement, bonuses, read-aloud, quest progress, and saving', async ({ page }) => {
  // Set a test-specific timeout of 180s: this test walks all three Mira
  // errands (including three sprout interactions) plus several reloads.
  // 60s was enough for slower CI VMs, but software-rendered environments
  // (no GPU) run the same wall-clock journey measurably slower — every
  // poll round-trip costs more (~115-130s observed in a throttled no-GPU
  // sandbox). The assertions themselves are unchanged.
  test.setTimeout(180000);

  await boot(page);
  await startProfile(page, 240);

  await expect.poll(async () => (await state(page)).objective).toContain('Talk to Mira');
  await expect.poll(async () => (await state(page)).hud).not.toContain('Sunberry Charm');
  expect(await heroPresentation(page)).toMatchObject({
    animation: 'grade2-mage-idle-front',
    displayHeight: 96,
    displayWidth: 64,
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
    displayHeight: 64,
    displayWidth: 64,
    hopAnimationExists: true,
    idleAnimationExists: true,
    originX: 0.5,
    originY: 1,
    texture: 'practice-slime-v001',
    visible: true,
    x: 1408,
    y: 640
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
  // Canvas and WebGL can land one frame apart under CI. Keep the round-trip
  // check within one 32px map tile while still proving the second move
  // substantially reverses the first.
  expect((await state(page)).player.y).toBeLessThan(start.y + 32);

  await moveGrade2Hero(page, 'KeyS', 'front', 700);
  expect((await state(page)).player.y).toBeGreaterThan(320);
  await moveGrade2Hero(page, 'KeyW', 'back', 700);
  expect((await state(page)).player.y).toBeLessThan(start.y + 20);

  await setPlayer(page, 320, 320);
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
  await armHeroAnimationRecorder(page);
  expect(await triggerGrade2Hurt(page)).toBe(true);
  await expect.poll(async () => recordedHeroAnimations(page)).toContain('grade2-mage-hurt-back');
  await disarmHeroAnimationRecorder(page);
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
  await armHeroAnimationRecorder(page);
  await page.keyboard.down('Space');
  await page.waitForTimeout(50);
  await page.keyboard.up('Space');
  await expect.poll(async () => recordedHeroAnimations(page)).toContain('grade2-mage-cast-right');
  expect(await triggerGrade2Hurt(page)).toBe(true);
  await expect.poll(async () => recordedHeroAnimations(page)).toContain('grade2-mage-hurt-right');
  await disarmHeroAnimationRecorder(page);
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual(['grade2-mage-walk-right', 'grade2-mage-walk-v001']);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => (await heroPresentation(page)).animation).toBe('grade2-mage-idle-right');
  await castGrade2Hero(page, 'right');

  await setPlayer(page, 832, 512);
  await expect.poll(async () => (await state(page)).hint).toContain('Mira');
  await interact(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('try-crop-bonus');
  await expect.poll(async () => (await state(page)).objective).toContain('crop patch');

  await armCropFeedbackWatcher(page);
  expect(await interactAt(page, 480, 832)).toContain('CropBonus');
  await expect.poll(async () => cropFeedbackSeen(page)).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(false);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('find-slime');
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(1);

  // The hop is a short one-shot: record slime animation starts browser-side
  // (same transient-observation pattern as the hero recorder above) rather
  // than racing a poll round-trip against the clip length.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      practiceSlimeSprite?: {
        on: (event: string, cb: (anim: { key: string }) => void) => void;
        off: (event: string) => void;
      };
    };
    const recorderWindow = window as unknown as {
      __slimeAnimRecorder: string[];
      __slimeAnimRecorderCallback?: (anim: { key: string }) => void;
    };
    recorderWindow.__slimeAnimRecorder = [];
    const callback = (anim: { key: string }) => recorderWindow.__slimeAnimRecorder.push(anim.key);
    recorderWindow.__slimeAnimRecorderCallback = callback;
    scene.practiceSlimeSprite?.on('animationstart', callback);
  });
  expect(await interactAt(page, 1408, 640)).toContain('Practice Slime');
  await expect.poll(async () => page.evaluate(
    () => (window as unknown as { __slimeAnimRecorder?: string[] }).__slimeAnimRecorder ?? []
  )).toContain('practice-slime-hop');
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      practiceSlimeSprite?: {
        off: (event: string, cb: (anim: { key: string }) => void) => void;
      };
    };
    const recorderWindow = window as unknown as {
      __slimeAnimRecorderCallback?: (anim: { key: string }) => void;
    };
    const callback = recorderWindow.__slimeAnimRecorderCallback;
    if (callback) scene.practiceSlimeSprite?.off('animationstart', callback);
    delete recorderWindow.__slimeAnimRecorderCallback;
  });
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await slimePresentation(page)).animation).toBe('practice-slime-idle');
  await expect.poll(async () => (await state(page)).questStep).toBe('return-to-mira');
  await expect.poll(async () => (await state(page)).gold).toBe(0);
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(2);

  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).hud).toContain('Keepsake: Sunberry Charm');
  await expect.poll(async () => (await state(page)).hudWidth).toBeLessThanOrEqual(896);
  await expect.poll(async () => masteryTotal(page, 'seen')).toBe(2);
  await expect.poll(async () => masteryTotal(page, 'attempted')).toBe(0);
  await expect.poll(async () => canvasTextSeen(page, 'Received: Sunberry Charm')).toBe(true);

  await page.reload();
  await startProfile(page, 240);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).hud).toContain('Keepsake: Sunberry Charm');
  await expect.poll(async () => (await state(page)).objective).toContain('whispering scarecrow');

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).objective).toContain('Check the scarecrow by the crop patch');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);

  await armCropFeedbackWatcher(page);
  await resetCanvasTextRecorder(page);
  expect(await interactAt(page, 480, 832)).toContain('Check Scarecrow');
  await expect.poll(async () => cropFeedbackSeen(page)).toBe(true);
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(false);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('Bring the Moonseed Charm back to Mira');
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(3);
  await expect.poll(async () => canvasTextSeen(page, 'Found: Moonseed Charm')).toBe(true);

  await page.reload();
  await startProfile(page, 240);
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('Bring the Moonseed Charm back to Mira');

  await setPlayer(page, 832, 512);
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(14);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('sleepy sprouts');
  await expect.poll(async () => canvasTextSeen(page, 'Moonseed Charm')).toBe(true);
  await expect.poll(async () => canvasTextSeen(page, '+4 Gold')).toBe(true);

  await page.reload();
  await startProfile(page, 240);
  await expect.poll(async () => (await state(page)).gold).toBe(14);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('Talk to Mira about the sleepy sprouts');

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).objective).toContain('Wake the sleepy sprouts (0/3)');

  await armCropFeedbackWatcher(page);
  expect(await interactAt(page, 992, 160)).toContain('Sleepy Sprout');
  await expect.poll(async () => cropFeedbackSeen(page)).toBe(true);
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(false);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).objective).toContain('Wake the sleepy sprouts (1/3)');

  await armCropFeedbackWatcher(page);
  expect(await interactAt(page, 352, 1056)).toContain('Sleepy Sprout');
  await expect.poll(async () => cropFeedbackSeen(page)).toBe(true);
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(false);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).objective).toContain('Wake the sleepy sprouts (2/3)');

  await armCropFeedbackWatcher(page);
  expect(await interactAt(page, 1696, 1056)).toContain('Sleepy Sprout');
  await expect.poll(async () => cropFeedbackSeen(page)).toBe(true);
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(false);
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).objective).toContain('Tell Mira the sprouts are awake');
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(6);

  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(20);
  await expect.poll(async () => (await state(page)).inventory.wildbloomSprig).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('The Sleepy Sprouts');
  await expect.poll(async () => canvasTextSeen(page, 'Wildbloom Sprig')).toBe(true);
  await expect.poll(async () => canvasTextSeen(page, '+6 Gold')).toBe(true);

  await page.reload();
  await startProfile(page, 240);
  await expect.poll(async () => (await state(page)).gold).toBe(20);
  await expect.poll(async () => (await state(page)).inventory.wildbloomSprig).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('The Sleepy Sprouts');

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(20);
  await expect.poll(async () => (await state(page)).inventory.sunberryCharm).toBe(1);
  expect((await state(page)).hud.split('Sunberry Charm')).toHaveLength(2);
});

test('Grade 5 prompts keep reader profile without the Grade 2 read-aloud control', async ({ page }) => {
  // Two boots plus a mid-test reload: comfortably inside 30s on CI runners,
  // marginal under software rendering (no GPU), so give it the same
  // slow-environment headroom as the vertical-slice walks above.
  test.setTimeout(60000);
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
  await startProfile(page, 380);

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
  await resetCanvasTextRecorder(page);
  await clickGame(page, 260, 388);

  await expect.poll(async () => (await state(page)).gold).toBe(3);
  await expect.poll(async () => canvasTextSeen(page, '+3 Gold')).toBe(true);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.correct).toBe(1);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.attempted).toBe(1);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.currentCorrectStreak).toBe(1);

  await setQuestStep(page, 'try-crop-bonus');
  await openQuestPrompt(page, 'farm', 'CropBonus', 'find-slime', 'Objective updated: find the Practice Slime.');
  await clickGame(page, 480, 388);

  await expect.poll(async () => (await state(page)).questStep).toBe('find-slime');
  await expect.poll(async () => (await state(page)).gold).toBe(3);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.wrong).toBe(1);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.attempted).toBe(2);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.currentCorrectStreak).toBe(0);
  await expect.poll(async () => (await state(page)).mastery['grade5:math:area-perimeter']?.bestCorrectStreak).toBe(1);

  await page.reload();
  await startProfile(page, 380);
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
  await startProfile(page, 240);

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
  await startProfile(page, 380);

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

test('interactive Stats & Mastery UI panel toggles open/closed and shows correct stats', async ({ page }) => {
  // Set a test-specific timeout of 60s because slow CI VM environments can take longer to boot and register keyboard sequences.
  test.setTimeout(60000);

  await boot(page);
  await startProfile(page, 380);

  await holdKey(page, 'KeyI', 100);
  await expect.poll(async () => hasCanvasText(page, 'STATS & MASTERY')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'CURRICULUM MASTERY')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'Grade 5 Ranger Explorer')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'KEEPSAKES')).toBe(true);

  await clickGame(page, 480, 520);
  await expect.poll(async () => hasCanvasText(page, 'STATS & MASTERY')).toBe(false);

  await page.waitForTimeout(200);

  await clickGame(page, 860, 28);
  await expect.poll(async () => hasCanvasText(page, 'STATS & MASTERY')).toBe(true);

  await page.waitForTimeout(200);

  await holdKey(page, 'Tab', 100);
  await expect.poll(async () => hasCanvasText(page, 'STATS & MASTERY')).toBe(false);
});
