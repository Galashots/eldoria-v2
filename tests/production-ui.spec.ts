import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';
import type { SaveState } from '../src/systems/SaveSystem';

/**
 * Production-animation UI coverage: this spec deliberately does NOT set
 * window.__ELDORIA_E2E__, so the typewriter (~24ms/char) and panel pop-ins
 * run for real. The fast suites assert state with animations bypassed;
 * these tests assert the interactive behavior DURING the motion that kids
 * actually see:
 *
 *  1. A mid-typewriter ACTION press completes the current line (never
 *     advances past it), and the continue cue appears only after the full
 *     reveal — the Pokemon/Zelda convention DialogueBox documents — verified
 *     on Baker Pell's multi-line Berry Order offer in Eldoria Village.
 *  2. The stats panel's CLOSE button stays hittable when tapped immediately
 *     after open (mid pop-in settle window) and after the panel settles.
 */

type DialogueProbe = {
  open: boolean;
  speaker: string;
  body: string;
  hintVisible: boolean;
  lineIndex: number;
  currentLine: string;
  lineCount: number;
};

async function bootInVillage(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('eldoria_v2_opening_seen_grade5-adventurer', 'true');
    const save: SaveState = {
      version: 2,
      profileId: 'grade5-adventurer',
      gold: 0,
      lastArea: 'eldoria-village',
      firstQuestStep: 'find-slime',
      // Just south of Baker Pell (576, 384) — inside interaction range.
      player: { x: 576, y: 448 }
    };
    localStorage.setItem('eldoria_v2_save_grade5-adventurer', JSON.stringify(save));
  });
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, 368);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  await page.waitForFunction(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { mapId: string };
    return scene.mapId === 'eldoria-village';
  });
}

async function bootOnFarm(page: Page): Promise<void> {
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

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function probeDialogue(page: Page): Promise<DialogueProbe> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      dialogueBox?: {
        isOpen: () => boolean;
        lines: readonly { speaker: string; text: string }[];
        lineIndex: number;
      };
      children: {
        getByName: (name: string) => {
          getByName?: (childName: string) => { text?: string; visible?: boolean } | null;
        } | null;
      };
    };
    const panel = scene.children.getByName('dialogue-box');
    const box = scene.dialogueBox;
    const lines = box?.lines ?? [];
    const lineIndex = box?.lineIndex ?? -1;
    return {
      open: box?.isOpen() ?? false,
      speaker: panel?.getByName?.('dialogue-speaker')?.text ?? '',
      body: panel?.getByName?.('dialogue-body')?.text ?? '',
      hintVisible: panel?.getByName?.('dialogue-continue-hint')?.visible ?? false,
      lineIndex,
      currentLine: lines[lineIndex]?.text ?? '',
      lineCount: lines.length
    };
  });
}

async function statsPanelState(page: Page): Promise<{ open: boolean; settled: boolean }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      statsPanelOpen: boolean;
      statsContainer?: { scaleX: number };
    };
    return {
      open: scene.statsPanelOpen,
      settled: scene.statsContainer?.scaleX === 2 // resting scale is GAME_SCALE
    };
  });
}

test('mid-typewriter ACTION completes the line instead of advancing, and the cue follows the full reveal', async ({ page }) => {
  const errors = watchConsole(page);
  await bootInVillage(page);

  // Talk to Baker Pell: the Berry Order offer is real typed dialogue.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      tryInteract: () => void;
    };
    scene.tryInteract();
  });

  // Mid-reveal on line 1: the text is partial and the cue is still hidden.
  await expect.poll(() => probeDialogue(page), { timeout: 15000 }).toMatchObject({ open: true, lineIndex: 0 });
  const mid = await probeDialogue(page);
  expect(mid.lineCount).toBeGreaterThanOrEqual(3); // offer is a 3-line dialogue
  expect(mid.currentLine.length).toBeGreaterThan(0);
  expect(mid.body.length).toBeLessThan(mid.currentLine.length);
  expect(mid.hintVisible).toBe(false);

  // First ACTION completes line 1; it must NOT advance to line 2.
  await page.keyboard.press('Space');
  await expect
    .poll(() => probeDialogue(page), { timeout: 15000 })
    .toMatchObject({ open: true, lineIndex: 0, hintVisible: true });
  const completedFirst = await probeDialogue(page);
  expect(completedFirst.body).toBe(completedFirst.currentLine);
  expect(completedFirst.speaker).toBe(mid.speaker);

  // Next press advances to line 2, which again starts mid-reveal, cue hidden.
  await page.keyboard.press('Space');
  await expect
    .poll(() => probeDialogue(page), { timeout: 15000 })
    .toMatchObject({ open: true, lineIndex: 1, hintVisible: false });
  const midSecond = await probeDialogue(page);
  expect(midSecond.body.length).toBeLessThan(midSecond.currentLine.length);

  // The complete-instead-of-advance convention holds on later lines too.
  await page.keyboard.press('Space');
  await expect
    .poll(() => probeDialogue(page), { timeout: 15000 })
    .toMatchObject({ open: true, lineIndex: 1, hintVisible: true });
  const completedSecond = await probeDialogue(page);
  expect(completedSecond.body).toBe(completedSecond.currentLine);

  // Advance through the rest; accepting the quest is the onClose effect.
  await page.keyboard.press('Space'); // -> line 3
  await expect.poll(() => probeDialogue(page), { timeout: 15000 }).toMatchObject({ open: true, lineIndex: 2 });
  await page.keyboard.press('Space'); // complete line 3 (or close if already revealed)
  await page.keyboard.press('Space'); // close
  await expect.poll(() => probeDialogue(page), { timeout: 15000 }).toMatchObject({ open: false });
  const questStep = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      questSystem: { step: (id: string) => string };
    };
    return scene.questSystem.step('pell-berry-order');
  });
  expect(questStep).toBe('gathering');

  expect(errors).toEqual([]);
});

test('stats CLOSE stays hittable tapped immediately after open and after the panel settles', async ({ page }) => {
  const errors = watchConsole(page);
  await bootOnFarm(page);

  // Open via the HUD STATS button itself (also exercises the enlarged touch
  // target), then tap CLOSE inside the pop-in settle window.
  await clickGame(page, 860, 28);
  // Precondition: the panel is open but NOT yet settled, so the CLOSE tap below
  // provably lands inside the pop-in window (an `{ open: true }`-only wait could
  // let the panel finish settling first, making the mid-settle claim vacuous).
  await expect.poll(() => statsPanelState(page), { timeout: 15000 }).toMatchObject({ open: true, settled: false });
  await clickGame(page, 480, 520);
  await expect.poll(() => statsPanelState(page), { timeout: 15000 }).toMatchObject({ open: false });

  // Reopen, wait for the panel to fully settle at resting scale, tap again.
  await clickGame(page, 860, 28);
  await expect.poll(() => statsPanelState(page), { timeout: 15000 }).toMatchObject({ open: true, settled: true });
  await clickGame(page, 480, 520);
  await expect.poll(() => statsPanelState(page), { timeout: 15000 }).toMatchObject({ open: false });

  expect(errors).toEqual([]);
});
