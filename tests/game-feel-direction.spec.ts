import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

// E2e coverage for the 2026-07 game-feel milestone: permanent Practice Slime
// defeat, post-purpose flavor interactions with opt-in practice, and the
// objective direction marker/edge arrow.
//
// New specs here get generous timeouts (the CI/sandbox environment renders
// in software) and use browser-side state reads over fixed-delay polling
// against transient tweens, per the repo's flaky-test history.

type StarterQuestStep = 'talk-to-mira' | 'try-crop-bonus' | 'find-slime' | 'return-to-mira' | 'complete';

type SlimeWorldState = {
  slimeSpriteExists: boolean;
  slimeVisible: boolean;
  hasSlimeTarget: boolean;
  questStep: string;
};

async function boot(page: Page, profile: 'grade2-mage' | 'grade5-adventurer', clearStorage = true): Promise<void> {
  if (clearStorage) {
    await page.goto('/');
    await page.evaluate((profileId) => {
      localStorage.clear();
      localStorage.setItem(`eldoria_v2_opening_seen_${profileId}`, 'true');
    }, profile);
    await page.reload();
  } else {
    await page.reload();
  }
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, profile === 'grade2-mage' ? 232 : 368);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function setQuestStepAt(page: Page, step: StarterQuestStep, x: number, y: number): Promise<void> {
  await page.evaluate(([nextStep, nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      setFirstQuestStep: (step: string) => void;
      updateHint: () => void;
    };
    scene.setFirstQuestStep(nextStep as string);
    scene.player.setPosition(Number(nextX), Number(nextY));
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, [step, x, y] as const);
  await page.waitForTimeout(120);
}

async function slimeWorldState(page: Page): Promise<SlimeWorldState> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      firstQuestStep: string;
      practiceSlimeSprite?: { visible: boolean };
      targets: Array<{ id: string }>;
    };
    return {
      slimeSpriteExists: scene.practiceSlimeSprite !== undefined,
      slimeVisible: scene.practiceSlimeSprite?.visible === true,
      hasSlimeTarget: scene.targets.some((target) => target.id === 'practice-slime'),
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

test('defeating the Practice Slime removes it permanently, surviving a page reload', async ({ page }) => {
  test.setTimeout(180000);

  await boot(page, 'grade5-adventurer');
  await setQuestStepAt(page, 'find-slime', 1340, 640);

  await expect.poll(async () => slimeWorldState(page)).toMatchObject({
    slimeSpriteExists: true,
    slimeVisible: true,
    hasSlimeTarget: true
  });

  // Three deliberate ACTION strikes through the real canvas path.
  for (let hit = 1; hit <= 3; hit += 1) {
    await clickGame(page, 852, 536);
    await expect.poll(async () => page.evaluate(() => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
        getPracticeSlimeEncounterSnapshot: () => { hitCount: number; inputLocked: boolean };
      };
      return scene.getPracticeSlimeEncounterSnapshot().hitCount;
    })).toBe(hit);
    if (hit < 3) {
      await expect.poll(async () => page.evaluate(() => {
        const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
          getPracticeSlimeEncounterSnapshot: () => { inputLocked: boolean };
        };
        return scene.getPracticeSlimeEncounterSnapshot().inputLocked;
      })).toBe(false);
    }
  }

  // The first-defeat combat prompt still opens (quest-relevant interaction)…
  await expect.poll(async () => hasCanvasText(page, 'Practice Slime: optional learning bonus'), {
    timeout: 15000
  }).toBe(true);
  await page.screenshot({ path: 'test-results/slime-defeat-prompt.png', fullPage: true });

  // …and the defeat is already persisted before the prompt resolves.
  expect(await page.evaluate(() => {
    const raw = localStorage.getItem('eldoria_v2_save_grade5-adventurer');
    return raw ? (JSON.parse(raw) as { questFlags?: Record<string, boolean> }).questFlags?.practiceSlimeDefeated : undefined;
  })).toBe(true);

  // Skip the prompt: quest advances, slime is gone from the world.
  await clickGame(page, 480, 484);
  await expect.poll(async () => slimeWorldState(page)).toEqual({
    slimeSpriteExists: true,
    slimeVisible: false,
    hasSlimeTarget: false,
    questStep: 'return-to-mira'
  });
  await page.screenshot({ path: 'test-results/slime-defeat-clearing-empty.png', fullPage: true });

  // Full page reload: the slime never comes back.
  await boot(page, 'grade5-adventurer', false);
  await expect.poll(async () => slimeWorldState(page)).toEqual({
    slimeSpriteExists: false,
    slimeVisible: false,
    hasSlimeTarget: false,
    questStep: 'return-to-mira'
  });
  await page.screenshot({ path: 'test-results/slime-defeat-after-reload.png', fullPage: true });
});

/** Marks every Mira errand complete directly on the live quest system (test-only state drive). */
async function completeAllErrands(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      farmQuest: { state: Record<string, unknown> };
      setFirstQuestStep: (step: string) => void;
      updateHint: () => void;
    };
    scene.setFirstQuestStep('complete');
    // TypeScript-private, JS-reachable: same seam style the suite already
    // uses for learning.makePrompt overrides.
    scene.farmQuest.state.secondErrandComplete = true;
    scene.farmQuest.state.thirdErrandAccepted = true;
    scene.farmQuest.state.sprout1Awakened = true;
    scene.farmQuest.state.sprout2Awakened = true;
    scene.farmQuest.state.sprout3Awakened = true;
    scene.farmQuest.state.thirdErrandComplete = true;
    scene.updateHint();
  });
}

async function movePlayerTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, [x, y]);
  await page.waitForTimeout(120);
}

async function sceneInteract(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { tryInteract: () => void };
    scene.tryInteract();
  });
  await page.waitForTimeout(200);
}

/**
 * Presses ACTION twice back-to-back via the scene seam: the first press
 * shows the flavor toast and arms the practice offer; the second (issued
 * ~milliseconds later, well inside the offer window regardless of how slow
 * the environment renders) consumes the opt-in and opens the prompt.
 */
async function doubleInteract(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { tryInteract: () => void };
    scene.tryInteract();
    scene.tryInteract();
  });
  await page.waitForTimeout(200);
}

test('post-purpose interactions show flavor instead of prompts; a second ACTION opt-in opens practice', async ({ page }) => {
  test.setTimeout(180000);

  await boot(page, 'grade5-adventurer');
  await completeAllErrands(page);

  // Crop patch: a single ACTION shows a flavor toast with the practice
  // offer — and no prompt.
  await movePlayerTo(page, 480, 832);
  await sceneInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'ACTION again to practice!')).toBe(true);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
  await page.screenshot({ path: 'test-results/post-purpose-crop-flavor.png', fullPage: true });

  // Wait out the first offer window, then take the opt-in path: two rapid
  // ACTION presses (flavor + consume) open the optional prompt.
  await page.waitForTimeout(2200);
  await doubleInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'CropBonus: optional learning bonus')).toBe(true);
  await page.screenshot({ path: 'test-results/post-purpose-crop-optin-prompt.png', fullPage: true });
  await clickGame(page, 480, 484); // skip
  await expect.poll(async () => hasCanvasText(page, 'optional learning bonus')).toBe(false);

  // Mira: rotating flavor with practice offer, no forced dialogue/prompt.
  await movePlayerTo(page, 832, 512);
  await sceneInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'ACTION again to practice!')).toBe(true);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);

  // Mira's opt-in opens a practice prompt too.
  await page.waitForTimeout(2200);
  await doubleInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'Mira: optional learning bonus')).toBe(true);
  await page.screenshot({ path: 'test-results/post-purpose-mira-optin-prompt.png', fullPage: true });
  await clickGame(page, 480, 484); // skip
  await expect.poll(async () => hasCanvasText(page, 'optional learning bonus')).toBe(false);

  // Sprouts: pure flavor, no prompt and no offer — even on rapid presses.
  // First let the Mira double-press's own flavor toast finish fading, so the
  // absence assertions below observe only the sprout interaction's output.
  await movePlayerTo(page, 992, 160);
  await expect.poll(async () => hasCanvasText(page, 'ACTION again to practice!')).toBe(false);
  await doubleInteract(page);
  await page.waitForTimeout(300);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
  expect(await hasCanvasText(page, 'ACTION again to practice!')).toBe(false);
});

type MarkerState = {
  markerExists: boolean;
  markerVisible: boolean;
  markerX: number | null;
  markerY: number | null;
  arrowVisible: boolean;
};

async function markerState(page: Page): Promise<MarkerState> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { visible: boolean; x: number; y: number } | null };
    };
    const marker = scene.children.getByName('objective-marker');
    const arrow = scene.children.getByName('objective-edge-arrow');
    return {
      markerExists: marker !== null,
      markerVisible: marker?.visible === true,
      markerX: marker?.x ?? null,
      markerY: marker?.y ?? null,
      arrowVisible: arrow?.visible === true
    };
  });
}

test('objective marker tracks the current quest target and disappears at completion', async ({ page }) => {
  test.setTimeout(180000);

  await boot(page, 'grade5-adventurer');

  // Step 1 (talk-to-mira): chevron above Mira (832, 512).
  await expect.poll(async () => markerState(page)).toMatchObject({
    markerExists: true,
    markerVisible: true,
    markerX: 832
  });
  // The bounce tween moves y between base (target.y - 104) and base - 12.
  const atMira = await markerState(page);
  expect(atMira.markerY).toBeGreaterThanOrEqual(512 - 104 - 12 - 1);
  expect(atMira.markerY).toBeLessThanOrEqual(512 - 104 + 1);

  // Step 2 (try-crop-bonus): chevron retargets to the crop patch (480, 832).
  await setQuestStepAt(page, 'try-crop-bonus', 832, 512);
  await expect.poll(async () => markerState(page)).toMatchObject({
    markerVisible: true,
    markerX: 480
  });

  // Step 3 (find-slime): chevron retargets to the Practice Slime (1408, 640).
  await setQuestStepAt(page, 'find-slime', 832, 512);
  await expect.poll(async () => markerState(page)).toMatchObject({
    markerVisible: true,
    markerX: 1408
  });
  await page.screenshot({ path: 'test-results/objective-marker-slime.png', fullPage: true });

  // All errands complete: no marker, no arrow.
  await completeAllErrands(page);
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      refreshObjective: () => void;
    };
    scene.refreshObjective();
  });
  await expect.poll(async () => markerState(page)).toMatchObject({
    markerVisible: false,
    arrowVisible: false
  });
});

test('edge arrow appears only while the objective target is off-screen', async ({ page }) => {
  test.setTimeout(120000);

  await boot(page, 'grade5-adventurer');

  // find-slime objective with the player (and camera) far west of the slime:
  // the slime (1408, 640) is outside the 960-wide view centred near x=200.
  await setQuestStepAt(page, 'find-slime', 200, 640);
  await expect.poll(async () => markerState(page)).toMatchObject({ arrowVisible: true });
  await page.screenshot({ path: 'test-results/objective-edge-arrow.png', fullPage: true });

  // Walk into view of the slime: the arrow hides again.
  await setQuestStepAt(page, 'find-slime', 1340, 640);
  await expect.poll(async () => markerState(page)).toMatchObject({ arrowVisible: false });
  await page.screenshot({ path: 'test-results/objective-marker-onscreen.png', fullPage: true });
});

test('quest-relevant interactions still open prompts as before', async ({ page }) => {
  test.setTimeout(120000);

  await boot(page, 'grade5-adventurer');

  // At the try-crop-bonus step, the crop patch is quest-relevant: the prompt
  // opens as part of the interaction, exactly as today.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      setFirstQuestStep: (step: string) => void;
    };
    scene.setFirstQuestStep('try-crop-bonus');
  });
  await movePlayerTo(page, 480, 832);
  await sceneInteract(page);
  await expect.poll(async () => hasCanvasText(page, 'CropBonus: optional learning bonus'), {
    timeout: 10000
  }).toBe(true);
});
