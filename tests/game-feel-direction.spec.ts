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
