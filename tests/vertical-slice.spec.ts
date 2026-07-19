import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

type StarterQuestStep = 'talk-to-mira' | 'try-crop-bonus' | 'find-slime' | 'return-to-mira' | 'complete';
type SecondQuestStep = 'not-started' | 'find-whispering-scarecrow' | 'return-to-mira' | 'complete';
type ThirdQuestStep = 'not-started' | 'wake-sprouts' | 'return-to-mira' | 'complete';
type SlimeEncounterState = 'idle' | 'engaged' | 'victory-wait' | 'bonus-ready';

type StateSnapshot = {
  activeScene: string;
  gold: number;
  inventory: Record<string, number>;
  questStep: StarterQuestStep;
  secondQuestStep: SecondQuestStep;
  thirdQuestStep: ThirdQuestStep;
  sproutAwakened: boolean[];
  profileId: string;
  profileName: string;
  player: { x: number; y: number };
  objective: string;
  promptOpen: boolean;
  hint: string;
  hudWidth: number;
  joystickVisible: boolean;
  joystickAtMovementStart: boolean;
  actionButtonVisible: boolean;
  windowWidth: number;
  windowHeight: number;
  innerWidth: number;
  innerHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  displayWidth: number;
  displayHeight: number;
  styles: string;
};

type HeroPresentation = {
  animation: string | null;
  texture: string;
  frame: string;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  originX: number;
  originY: number;
};

type SlimePresentation = {
  animation: string | null;
  texture: string;
  frame: string;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  originX: number;
  originY: number;
  idleAnimationExists: boolean;
  hopAnimationExists: boolean;
  visible: boolean;
};

type PreviewPrompt = {
  answer: number | string | boolean;
  choices: Array<number | string | boolean>;
  explanation: string;
  hint?: string;
  prompt: string;
  promptId: string;
  readAloud?: string;
  rewardKind: 'bonus-harvest' | 'critical-hit' | 'bonus-gold' | 'bonus-xp';
  skill: string;
  subject: 'math' | 'ela' | 'science' | 'social-studies';
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
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('OpeningScene'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function state(page: Page): Promise<StateSnapshot> {
  return page.evaluate(() => {
    const game = window.__ELDORIA_GAME__!;
    const scene = game.scene.getScene('WorldScene') as unknown as {
      actionButton: { visible: boolean };
      currentHint?: string;
      learningPromptOpen?: boolean;
      orientationOverlay?: { visible: boolean };
      player: { x: number; y: number };
      playerProfile: { id: string; name: string };
      quest: {
        state: {
          gold: number;
          inventory: Record<string, number>;
          firstErrand: { step: StarterQuestStep };
          secondErrand: { step: SecondQuestStep };
          thirdErrand: { step: ThirdQuestStep; sproutAwakened: boolean[] };
        };
        currentObjective: () => string;
      };
      joystick?: { base?: { visible?: boolean }; stick?: { visible?: boolean } };
      joystickAtMovementStart?: boolean;
      hud?: { getBounds: () => { width: number } };
    };
    const canvas = game.canvas;
    const style = window.getComputedStyle(canvas);
    const worldScene = scene;
    return {
      activeScene: game.scene.getScenes(true)[0]?.scene.key ?? '',
      gold: worldScene.quest.state.gold,
      inventory: worldScene.quest.state.inventory,
      questStep: worldScene.quest.state.firstErrand.step,
      secondQuestStep: worldScene.quest.state.secondErrand.step,
      thirdQuestStep: worldScene.quest.state.thirdErrand.step,
      sproutAwakened: [...worldScene.quest.state.thirdErrand.sproutAwakened],
      profileId: worldScene.playerProfile.id,
      profileName: worldScene.playerProfile.name,
      player: { x: worldScene.player.x, y: worldScene.player.y },
      objective: worldScene.quest.currentObjective(),
      promptOpen: Boolean(worldScene.learningPromptOpen),
      hint: worldScene.currentHint ?? '',
      hudWidth: worldScene.hud?.getBounds().width ?? 0,
      joystickVisible: Boolean(worldScene.joystick?.base?.visible && worldScene.joystick?.stick?.visible),
      joystickAtMovementStart: Boolean(worldScene.joystickAtMovementStart),
      actionButtonVisible: worldScene.actionButton.visible,
      windowWidth: window.outerWidth,
      windowHeight: window.outerHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      displayWidth: Number.parseFloat(style.width),
      displayHeight: Number.parseFloat(style.height),
      styles: `${canvas.style.width}|${canvas.style.height}|${style.imageRendering}`
    };
  });
}

async function heroPresentation(page: Page): Promise<HeroPresentation> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      heroPresentation?: {
        animationKey: string | null;
        sprite: {
          frame: { name: string | number };
          texture: { key: string };
          x: number;
          y: number;
          displayWidth: number;
          displayHeight: number;
          originX: number;
          originY: number;
        };
      };
    };
    const presentation = scene.heroPresentation;
    if (!presentation) throw new Error('Hero presentation is unavailable.');
    return {
      animation: presentation.animationKey,
      texture: presentation.sprite.texture.key,
      frame: String(presentation.sprite.frame.name),
      x: presentation.sprite.x,
      y: presentation.sprite.y,
      displayWidth: presentation.sprite.displayWidth,
      displayHeight: presentation.sprite.displayHeight,
      originX: presentation.sprite.originX,
      originY: presentation.sprite.originY
    };
  });
}

async function slimePresentation(page: Page): Promise<SlimePresentation> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      practiceSlimeSprite?: {
        anims: { currentAnim?: { key?: string }; currentFrame?: { index?: number }; isPlaying?: boolean };
        displayHeight: number;
        displayWidth: number;
        originX: number;
        originY: number;
        texture: { key: string };
        frame: { name: string | number };
        visible: boolean;
        x: number;
        y: number;
      };
      anims: { exists: (key: string) => boolean };
    };
    const sprite = scene.practiceSlimeSprite;
    if (!sprite) throw new Error('Practice Slime presentation is unavailable.');
    return {
      animation: sprite.anims.currentAnim?.key ?? null,
      texture: sprite.texture.key,
      frame: String(sprite.frame.name),
      x: sprite.x,
      y: sprite.y,
      displayWidth: sprite.displayWidth,
      displayHeight: sprite.displayHeight,
      originX: sprite.originX,
      originY: sprite.originY,
      idleAnimationExists: scene.anims.exists('practice-slime-idle'),
      hopAnimationExists: scene.anims.exists('practice-slime-hop'),
      visible: sprite.visible
    };
  });
}

async function triggerGrade2Hurt(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      triggerGrade2Hurt: () => boolean;
    };
    return scene.triggerGrade2Hurt();
  });
}

async function sceneInteract(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { interact: () => void };
    scene.interact();
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
  await page.waitForTimeout(120);
}

async function moveGrade2Hero(
  page: Page,
  key: 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD',
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
  moveKey?: 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD'
): Promise<void> {
  if (moveKey) {
    await page.keyboard.down(moveKey);
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
  }).toEqual([`grade2-mage-idle-${facing}`, 'grade2-mage-idle-v001']);

  if (moveKey) {
    await page.keyboard.up(moveKey);
  }
}

async function actionAt(page: Page, x: number, y: number): Promise<string> {
  return page.evaluate(({ x, y }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      actionButton: { emit: (event: string) => void };
      player: { setPosition: (x: number, y: number) => void };
      interactionPrompt?: { text?: string };
    };
    scene.player.setPosition(x, y);
    scene.actionButton.emit('pointerdown');
    return scene.interactionPrompt?.text ?? '';
  }, { x, y });
}

async function interactAt(page: Page, x: number, y: number): Promise<string> {
  return page.evaluate(({ x, y }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      interact: () => void;
      player: { setPosition: (x: number, y: number) => void };
      interactionPrompt?: { text?: string };
    };
    scene.player.setPosition(x, y);
    const text = scene.interactionPrompt?.text ?? '';
    scene.interact();
    return text;
  }, { x, y });
}

async function setPlayer(page: Page, x: number, y: number): Promise<{ hint: string; promptOpen: boolean }> {
  return page.evaluate(({ x, y }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      currentHint?: string;
      learningPromptOpen?: boolean;
      player: { setPosition: (x: number, y: number) => void };
    };
    scene.player.setPosition(x, y);
    return {
      hint: scene.currentHint ?? '',
      promptOpen: Boolean(scene.learningPromptOpen)
    };
  }, { x, y });
}

async function scenePrompt(page: Page): Promise<PreviewPrompt> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      currentLearningPrompt?: PreviewPrompt;
    };
    if (!scene.currentLearningPrompt) throw new Error('No learning prompt is open.');
    return scene.currentLearningPrompt;
  });
}

async function masteryTotal(page: Page, field: 'seen' | 'attempted' | 'correct' | 'wrong' | 'skipped'): Promise<number> {
  return page.evaluate((requestedField) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      mastery: Record<string, Record<string, number>>;
    };
    return Object.values(scene.mastery).reduce((total, record) => total + (record[requestedField] ?? 0), 0);
  }, field);
}

async function skipOpenPrompt(page: Page): Promise<void> {
  await clickGame(page, 480, 520);
  await expect.poll(async () => (await state(page)).promptOpen).toBe(false);
  await page.waitForTimeout(200);
}

async function chooseOpenPrompt(page: Page, choice: PreviewPrompt['answer']): Promise<void> {
  const prompt = await scenePrompt(page);
  const index = prompt.choices.findIndex((candidate) => candidate === choice);
  if (index < 0) throw new Error(`Choice ${String(choice)} not found in prompt.`);
  await clickGame(page, 480, 333 + index * 58);
  await expect.poll(async () => (await state(page)).promptOpen).toBe(false);
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
      if (item.active !== false && item.visible !== false && typeof item.text === 'string' && item.text.includes(expectedText)) {
        return true;
      }
      if (!Array.isArray(item.list)) return false;
      return item.list.some((child) => hasText(child as { active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }));
    };
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { list?: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }> };
    };
    return (scene.children.list ?? []).some((child) => hasText(child));
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

  expect(await state(page)).toMatchObject({
    activeScene: 'WorldScene',
    profileId: 'grade2-mage',
    profileName: 'Mage',
    questStep: 'talk-to-mira',
    secondQuestStep: 'not-started',
    thirdQuestStep: 'not-started',
    sproutAwakened: [false, false, false],
    objective: 'Talk to Mira',
    promptOpen: false,
    actionButtonVisible: true,
    canvasWidth: 960,
    canvasHeight: 640
  });

  const presentation = await heroPresentation(page);
  expect(presentation).toMatchObject({
    animation: 'grade2-mage-idle-front',
    displayHeight: 72,
    displayWidth: 64,
    originX: 0.5,
    originY: 1,
    texture: 'grade2-mage-idle-v001'
  });
  expect(Number(presentation.frame)).toBeGreaterThanOrEqual(0);
  expect(Number(presentation.frame)).toBeLessThanOrEqual(3);
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
    questStep: beforeCast.questStep,
    secondQuestStep: beforeCast.secondQuestStep,
    thirdQuestStep: beforeCast.thirdQuestStep,
    player: beforeCast.player,
    promptOpen: false
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
    questStep: beforeHurt.questStep,
    secondQuestStep: beforeHurt.secondQuestStep,
    thirdQuestStep: beforeHurt.thirdQuestStep,
    player: beforeHurt.player,
    promptOpen: false
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
  await expect.poll(async () => {
    const hero = await heroPresentation(page);
    return [hero.animation, hero.texture];
  }).toEqual(['grade2-mage-idle-right', 'grade2-mage-idle-v001']);

  expect(await actionAt(page, 832, 512)).toContain('Mira');
  expect((await state(page)).questStep).toBe('try-crop-bonus');
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
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(2);

  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => (await state(page)).inventory['Sunberry Charm']).toBe(1);
  await expect.poll(async () => (await state(page)).objective).toContain('Whispering Scarecrow');
  await expect.poll(async () => (await state(page)).secondQuestStep).toBe('find-whispering-scarecrow');
  await expect.poll(async () => (await state(page)).hudWidth).toBeLessThanOrEqual(896);
  await expect.poll(async () => masteryTotal(page, 'seen')).toBe(2);
  await expect.poll(async () => masteryTotal(page, 'attempted')).toBe(0);
  await expect.poll(async () => canvasTextSeen(page, 'Received: Sunberry Charm')).toBe(true);
  await expect.poll(async () => canvasTextSeen(page, 'Received: +10 gold')).toBe(true);

  await armCropFeedbackWatcher(page);
  await resetCanvasTextRecorder(page);
  expect(await interactAt(page, 480, 832)).toContain('Check Scarecrow');
  await expect.poll(async () => cropFeedbackSeen(page)).toBe(true);
  await expect.poll(async () => (await state(page)).secondQuestStep).toBe('return-to-mira');
  await expect.poll(async () => (await state(page)).objective).toContain('Tell Mira');
  await expect.poll(async () => canvasTextSeen(page, 'You found the Whispering Scarecrow!')).toBe(true);
  await expect.poll(async () => cropFeedbackVisible(page)).toBe(false);
  await setPlayer(page, 832, 512);
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(14);
  await expect.poll(async () => (await state(page)).inventory['Whispering Scarecrow Keepsake']).toBe(1);
  await expect.poll(async () => (await state(page)).secondQuestStep).toBe('complete');
  await expect.poll(async () => (await state(page)).thirdQuestStep).toBe('wake-sprouts');
  await expect.poll(async () => (await state(page)).objective).toContain('sprouts');
  await expect.poll(async () => canvasTextSeen(page, 'Received: Whispering Scarecrow Keepsake')).toBe(true);
  await expect.poll(async () => canvasTextSeen(page, 'Received: +4 gold')).toBe(true);

  for (const [x, y] of [[576, 416], [448, 416], [512, 288]] as const) {
    expect((await setPlayer(page, x, y)).hint).toContain('Wake Sprout');
    await sceneInteract(page);
  }
  await expect.poll(async () => (await state(page)).sproutAwakened).toEqual([true, true, true]);
  await expect.poll(async () => (await state(page)).thirdQuestStep).toBe('return-to-mira');
  await expect.poll(async () => (await state(page)).objective).toContain('Return to Mira');
  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(20);
  await expect.poll(async () => (await state(page)).inventory['Moonseed Charm']).toBe(1);
  await expect.poll(async () => (await state(page)).thirdQuestStep).toBe('complete');
  await expect.poll(async () => canvasTextSeen(page, 'Received: Moonseed Charm')).toBe(true);
  await expect.poll(async () => canvasTextSeen(page, 'Received: +6 gold')).toBe(true);

  await page.reload();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  expect(await state(page)).toMatchObject({
    activeScene: 'WorldScene',
    profileId: 'grade2-mage',
    questStep: 'complete',
    secondQuestStep: 'complete',
    thirdQuestStep: 'complete',
    sproutAwakened: [true, true, true],
    gold: 20,
    inventory: {
      'Sunberry Charm': 1,
      'Whispering Scarecrow Keepsake': 1,
      'Moonseed Charm': 1
    },
    promptOpen: false
  });
  await expect.poll(async () => masteryTotal(page, 'skipped')).toBe(2);
  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(20);

  await moveGrade2Hero(page, 'KeyW', 'back');
  const beforeReload = (await state(page)).player;
  await page.reload();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  expect((await state(page)).player).toEqual(beforeReload);

  await setPlayer(page, 480, 832);
  await sceneInteract(page);
  expect(await scenePrompt(page)).toMatchObject({ subject: 'math', rewardKind: 'bonus-harvest' });
  const correctCrop = (await scenePrompt(page)).answer;
  await chooseOpenPrompt(page, correctCrop);
  await expect.poll(async () => (await state(page)).gold).toBe(20);
  await expect.poll(async () => masteryTotal(page, 'attempted')).toBe(1);
  await expect.poll(async () => masteryTotal(page, 'correct')).toBe(1);

  await setPlayer(page, 1408, 640);
  for (let hit = 0; hit < 3; hit += 1) {
    await sceneInteract(page);
    await page.waitForTimeout(700);
  }
  await expect.poll(async () => (await state(page)).promptOpen).toBe(true);
  expect(await scenePrompt(page)).toMatchObject({ subject: 'math', rewardKind: 'critical-hit' });
  const slimePrompt = await scenePrompt(page);
  const wrongChoice = slimePrompt.choices.find((choice) => choice !== slimePrompt.answer);
  if (wrongChoice === undefined) throw new Error('Expected a wrong slime choice.');
  await chooseOpenPrompt(page, wrongChoice);
  await expect.poll(async () => masteryTotal(page, 'attempted')).toBe(2);
  await expect.poll(async () => masteryTotal(page, 'wrong')).toBe(1);

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  const miraPrompt = await scenePrompt(page);
  const firstChoice = miraPrompt.choices[0];
  if (firstChoice === undefined) throw new Error('Expected at least one Mira choice.');
  await chooseOpenPrompt(page, firstChoice);

  await page.reload();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  await expect.poll(async () => masteryTotal(page, 'attempted')).toBe(3);
  await expect.poll(async () => masteryTotal(page, 'correct') + masteryTotal(page, 'wrong')).toBe(3);
});

test('Grade 5 profile supports shop and combat bonuses without gating exploration', async ({ page }) => {
  await boot(page);
  await startProfile(page, 380);

  expect(await state(page)).toMatchObject({
    profileId: 'grade5-adventurer',
    profileName: 'Ranger Explorer',
    questStep: 'talk-to-mira',
    promptOpen: false,
    actionButtonVisible: true
  });

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('try-crop-bonus');
  await setPlayer(page, 480, 832);
  await sceneInteract(page);
  const cropPrompt = await scenePrompt(page);
  expect(cropPrompt.subject).toBe('math');
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('find-slime');

  await setPlayer(page, 1408, 640);
  for (let hit = 0; hit < 3; hit += 1) {
    await sceneInteract(page);
    await page.waitForTimeout(700);
  }
  await expect.poll(async () => (await state(page)).promptOpen).toBe(true);
  expect((await scenePrompt(page)).rewardKind).toBe('critical-hit');
  await skipOpenPrompt(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('return-to-mira');

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
  await expect.poll(async () => (await state(page)).gold).toBe(10);

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  const shopPrompt = await scenePrompt(page);
  expect(shopPrompt.rewardKind).toBe('bonus-gold');
  const wrong = shopPrompt.choices.find((choice) => choice !== shopPrompt.answer);
  if (wrong === undefined) throw new Error('Expected an incorrect choice.');
  await chooseOpenPrompt(page, wrong);
  await expect.poll(async () => (await state(page)).gold).toBe(10);
  await expect.poll(async () => masteryTotal(page, 'wrong')).toBe(1);
});

test('Grade 2 prompt exposes read-aloud and can be closed by tapping outside', async ({ page }) => {
  await boot(page);
  await startProfile(page, 240);

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await setPlayer(page, 480, 832);
  await sceneInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(true);
  await resetCanvasTextRecorder(page);
  await clickGame(page, 260, 388);
  await expect.poll(async () => canvasTextSeen(page, 'Reading the question aloud.')).toBe(true);
  await clickGame(page, 64, 64);
  await expect.poll(async () => (await state(page)).promptOpen).toBe(false);
});

test('STATS panel reports mastery and closes without changing game state', async ({ page }) => {
  await boot(page);
  await startProfile(page, 240);

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await setPlayer(page, 480, 832);
  await sceneInteract(page);
  const prompt = await scenePrompt(page);
  await chooseOpenPrompt(page, prompt.answer);

  const before = await state(page);
  await clickGame(page, 908, 27);
  await expect.poll(async () => hasCanvasText(page, 'STATS & MASTERY')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'ATTEMPTED')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'CORRECT')).toBe(true);
  await expect.poll(async () => hasCanvasText(page, 'SKIPPED')).toBe(true);
  await clickGame(page, 725, 155);
  await expect.poll(async () => hasCanvasText(page, 'STATS & MASTERY')).toBe(false);
  expect(await state(page)).toMatchObject({
    gold: before.gold,
    inventory: before.inventory,
    questStep: before.questStep,
    secondQuestStep: before.secondQuestStep,
    thirdQuestStep: before.thirdQuestStep,
    player: before.player
  });
});

test('orientation guidance appears in portrait and clears in landscape', async ({ page }) => {
  await boot(page);
  await startProfile(page, 240);

  await page.setViewportSize({ width: 640, height: 900 });
  await expect.poll(async () => hasCanvasText(page, 'ROTATE YOUR DEVICE')).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(async () => hasCanvasText(page, 'ROTATE YOUR DEVICE')).toBe(false);
});

test('joystick appears at the pointer-down location and hides after release', async ({ page }) => {
  await boot(page);
  await startProfile(page, 240);

  const before = await state(page);
  const canvasBox = await page.locator(CANVAS).boundingBox();
  if (!canvasBox) throw new Error('Canvas has no bounding box.');
  const startX = canvasBox.x + 120;
  const startY = canvasBox.y + canvasBox.height - 120;
  const endX = startX + 100;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await expect.poll(async () => (await state(page)).joystickVisible).toBe(true);
  await page.mouse.move(endX, startY, { steps: 4 });
  await expect.poll(async () => (await state(page)).joystickAtMovementStart).toBe(true);
  await expect.poll(async () => (await state(page)).player.x).toBeGreaterThan(before.player.x);
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).joystickVisible).toBe(false);
});

test('keyboard and ACTION controls remain usable after prompt close', async ({ page }) => {
  await boot(page);
  await startProfile(page, 240);

  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await setPlayer(page, 480, 832);
  await sceneInteract(page);
  await skipOpenPrompt(page);

  const before = (await state(page)).player;
  await holdKey(page, 'ArrowRight');
  expect((await state(page)).player.x).toBeGreaterThan(before.x);
  expect(await actionAt(page, 832, 512)).toContain('Mira');
});

test('each profile keeps an independent save slot', async ({ page }) => {
  await boot(page);
  await startProfile(page, 240);
  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await setPlayer(page, 480, 832);
  await sceneInteract(page);
  await skipOpenPrompt(page);
  await setPlayer(page, 1408, 640);
  for (let hit = 0; hit < 3; hit += 1) {
    await sceneInteract(page);
    await page.waitForTimeout(700);
  }
  await skipOpenPrompt(page);
  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(10);

  await page.evaluate(() => localStorage.removeItem('eldoria_v2_last_profile'));
  await page.reload();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.getScene('TitleScene'));
  await clickGame(page, 480, 380);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('OpeningScene'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  expect(await state(page)).toMatchObject({
    profileId: 'grade5-adventurer',
    gold: 0,
    questStep: 'talk-to-mira'
  });

  await page.evaluate(() => {
    localStorage.setItem('eldoria_v2_last_profile', 'grade2-mage');
  });
  await page.reload();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  expect(await state(page)).toMatchObject({
    profileId: 'grade2-mage',
    gold: 10,
    questStep: 'complete'
  });
});
