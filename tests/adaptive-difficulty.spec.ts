import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

/**
 * Browser proof that adaptive difficulty is wired end-to-end: WorldScene
 * passes its live mastery map into LearningBonusSystem.makePrompt, so a
 * skill's correct streak unlocks/elevates that skill's next prompt. The
 * depth of the difficulty ladder itself is covered statistically by
 * tests/unit/QuestionEngine.test.ts; this spec pins the deterministic
 * contracts in a real browser: baseline lock, unlock at streak 3, and
 * elevated-but-valid content at a maxed streak.
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
      lastContext: 'farm',
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

test('adaptive difficulty keeps higher-min templates locked at baseline and unlocks them after a streak', async ({ page }) => {
  await bootGrade5(page);

  // Baseline (no mastery): decimal-estimate declares minDifficulty 2 and is
  // the only grade5 'shop' template, so shop prompts must never be decimals
  // until the decimals skill proves itself.
  const baseline = await samplePrompts(page, 'shop', 100);
  expect(baseline.every((prompt) => prompt.skill !== 'decimals')).toBe(true);

  // Three correct decimals answers in a row -> difficulty 2 -> the shop
  // template unlocks through the live scene wiring.
  await seedMastery(page, 'grade5:math:decimals', 3);
  const elevated = await samplePrompts(page, 'shop', 50);
  expect(elevated.length).toBe(50);
  expect(elevated.every((prompt) => prompt.skill === 'decimals')).toBe(true);
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
