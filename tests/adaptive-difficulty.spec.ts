import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

/**
 * Browser proof that adaptive difficulty is wired end-to-end: WorldScene
 * passes its live mastery map into LearningBonusSystem.makePrompt, so a
 * context template is reachable at its declared floor and the same skill's
 * correct streak raises later prompts. The depth of the difficulty ladder is
 * covered statistically by tests/unit/QuestionEngine.test.ts; this spec pins
 * the deterministic contracts in a real browser: reachable baseline content,
 * elevation after mastery, and elevated-but-valid answers.
 */

type PromptSnapshot = {
  answer: number | string | boolean;
  choices: Array<number | string | boolean>;
  skill: string;
  subject: string;
};

type WorldSceneLearning = {
  learning: {
    makePrompt: (context: string, mastery?: Record<string, unknown>) => PromptSnapshot;
  };
  mastery: Record<string, unknown>;
};

async function samplePrompts(page: Page, context: string, runs: number): Promise<PromptSnapshot[]> {
  return page.evaluate(({ requestedContext, runCount }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as WorldSceneLearning;
    if (!scene?.learning) throw new Error('WorldScene learning system is not ready.');
    return Array.from({ length: runCount }, () => scene.learning.makePrompt(requestedContext, scene.mastery));
  }, { requestedContext: context, runCount: runs });
}

async function seedMastery(page: Page, key: string, currentCorrectStreak: number): Promise<void> {
  await page.evaluate(({ masteryKey, streak }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as WorldSceneLearning;
    if (!scene) throw new Error('WorldScene is not ready.');
    scene.mastery[masteryKey] = {
      seen: streak,
      attempted: streak,
      correct: streak,
      wrong: 0,
      skipped: 0,
      currentCorrectStreak: streak,
      bestCorrectStreak: streak,
      lastPromptId: 'e2e-seed',
      lastContext: 'shop',
      lastOutcome: 'correct'
    };
  }, { masteryKey: key, streak: currentCorrectStreak });
}

async function bootGrade5(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
  await clickGame(page, 480, 380);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

test('adaptive difficulty serves a context template at its floor and raises it after a streak', async ({ page }) => {
  await bootGrade5(page);

  // Decimal estimate is the only grade5 shop template and declares
  // minDifficulty 2. It must be reachable immediately at that floor; requiring
  // decimals mastery before serving the only decimals prompt would create an
  // impossible self-unlock loop.
  const baseline = await samplePrompts(page, 'shop', 100);
  expect(baseline).toHaveLength(100);
  for (const prompt of baseline) {
    expect(prompt.skill).toBe('decimals');
    expect(prompt.subject).toBe('math');
    expect(prompt.choices.filter((choice) => choice === prompt.answer)).toHaveLength(1);
    expect(Number(prompt.answer)).toBeLessThanOrEqual(115);
  }

  // A maxed decimals streak raises generation to difficulty 5. The prompt
  // stays in the shop/decimals context and remains answerable, while at least
  // one sample exceeds the difficulty-2 ceiling of 115.
  await seedMastery(page, 'grade5:math:decimals', 12);
  const elevated = await samplePrompts(page, 'shop', 200);
  let sawElevatedAnswer = false;
  for (const prompt of elevated) {
    expect(prompt.skill).toBe('decimals');
    expect(prompt.subject).toBe('math');
    expect(prompt.choices.filter((choice) => choice === prompt.answer)).toHaveLength(1);
    expect(Number(prompt.answer)).toBeLessThanOrEqual(280);
    if (Number(prompt.answer) > 115) sawElevatedAnswer = true;
  }
  expect(sawElevatedAnswer).toBe(true);
});

test('adaptive difficulty elevates content at a maxed streak while keeping prompts answerable', async ({ page }) => {
  await bootGrade5(page);

  // Maxed area-perimeter streak -> difficulty 5 for that template, which can
  // exceed the baseline 24x12 bounds. Whatever the engine serves must stay
  // a real question: answer present, exactly one matching choice.
  await seedMastery(page, 'grade5:math:area-perimeter', 12);
  const prompts = await samplePrompts(page, 'farm', 200);
  const areaPrompts = prompts.filter((prompt) => prompt.skill === 'area-perimeter');
  expect(areaPrompts.length).toBeGreaterThan(0);

  let sawElevatedArea = false;
  for (const prompt of areaPrompts) {
    expect(prompt.choices.filter((choice) => choice === prompt.answer)).toHaveLength(1);
    expect(Number(prompt.answer)).toBeLessThanOrEqual(32 * 20);
    if (Number(prompt.answer) > 24 * 12) sawElevatedArea = true;
  }
  expect(sawElevatedArea).toBe(true);
});
