import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';
import type { SaveState } from '../src/systems/SaveSystem';

type ProfileId = 'grade2-mage' | 'grade5-adventurer';

async function boot(
  page: Page,
  clearStorage = true,
  profileId: ProfileId = 'grade5-adventurer'
): Promise<void> {
  if (clearStorage) {
    await page.goto('/');
    await page.evaluate((profile) => {
      localStorage.clear();
      localStorage.setItem(`eldoria_v2_opening_seen_${profile}`, 'true');
    }, profileId);
  }
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, profileId === 'grade2-mage' ? 232 : 368);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function seedSave(
  page: Page,
  profileId: ProfileId,
  overrides: Partial<SaveState> = {}
): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ profile, saveOverrides }) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${profile}`, 'true');
    const save: SaveState = {
      version: 2,
      profileId: profile,
      gold: 0,
      lastArea: 'farm',
      firstQuestStep: 'find-slime',
      player: { x: 320, y: 512 },
      ...saveOverrides
    };
    localStorage.setItem(`eldoria_v2_save_${profile}`, JSON.stringify(save));
  }, { profile: profileId, saveOverrides: overrides });
}

async function currentMapId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { mapId: string };
    return scene.mapId;
  });
}

async function playerPosition(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { x: number; y: number };
    };
    return { x: scene.player.x, y: scene.player.y };
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
  await expect.poll(() => playerPosition(page), { timeout: 15000 }).toEqual({ x, y });
}

async function travelVia(page: Page, x: number, y: number, destination: string): Promise<void> {
  // Entering an exit can restart the scene before a poll observes the
  // teleported coordinate. The destination map/spawn is the durable state
  // this helper is proving, so poll that directly instead of racing the
  // intentionally transient exit-zone position.
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, [x, y]);
  await page.waitForFunction((expected) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      mapId: string;
      transitioning: boolean;
      player?: { x: number };
    };
    return scene.mapId === expected && scene.transitioning === false && Boolean(scene.player);
  }, destination, { timeout: 30000 });
}

async function sceneInteract(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { tryInteract: () => void };
    scene.tryInteract();
  });
}

async function berryQuestState(page: Page): Promise<{ step: string; berries: number }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      questSystem: { step: (id: string) => string; berriesCollected: () => number };
    };
    return {
      step: scene.questSystem.step('pell-berry-order'),
      berries: scene.questSystem.berriesCollected()
    };
  });
}

async function dialogueState(page: Page): Promise<{ open: boolean; speaker: string; body: string }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      dialogueBox?: { isOpen: () => boolean };
      children: {
        getByName: (name: string) => {
          getByName?: (childName: string) => { text?: string } | null;
        } | null;
      };
    };
    const panel = scene.children.getByName('dialogue-box');
    return {
      open: scene.dialogueBox?.isOpen() ?? false,
      speaker: panel?.getByName?.('dialogue-speaker')?.text ?? '',
      body: panel?.getByName?.('dialogue-body')?.text ?? ''
    };
  });
}

async function startCanvasTextRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    type RecorderWindow = Window & {
      __ELDORIA_TEXT_LOG__?: string[];
      __ELDORIA_TEXT_WATCHER__?: number;
    };
    const recorderWindow = window as RecorderWindow;
    if (recorderWindow.__ELDORIA_TEXT_WATCHER__ !== undefined) {
      cancelAnimationFrame(recorderWindow.__ELDORIA_TEXT_WATCHER__);
    }
    recorderWindow.__ELDORIA_TEXT_LOG__ = [];
    const record = (): void => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
        children?: { list: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }> };
      } | undefined;
      const visit = (item: { active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }): void => {
        if (item.active === false || item.visible === false) return;
        if (typeof item.text === 'string') recorderWindow.__ELDORIA_TEXT_LOG__?.push(item.text);
        if (Array.isArray(item.list)) item.list.forEach((child) => visit(child as typeof item));
      };
      scene?.children?.list.forEach(visit);
      recorderWindow.__ELDORIA_TEXT_WATCHER__ = requestAnimationFrame(record);
    };
    record();
  });
}

async function recordedCanvasText(page: Page, expected: string): Promise<boolean> {
  return page.evaluate((text) => {
    const recorderWindow = window as Window & { __ELDORIA_TEXT_LOG__?: string[] };
    return recorderWindow.__ELDORIA_TEXT_LOG__?.some((entry) => entry.includes(text)) ?? false;
  }, expected);
}

async function installSpeechStub(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type SpeechWindow = Window & { __SPEECH_LOG__?: string[] };
    class StubUtterance {
      readonly text: string;
      rate = 1;
      pitch = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    const speechWindow = window as SpeechWindow;
    speechWindow.__SPEECH_LOG__ = [];
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: StubUtterance
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: (utterance: StubUtterance) => speechWindow.__SPEECH_LOG__?.push(utterance.text),
        cancel: () => undefined
      }
    });
  });
}

async function speechLog(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const speechWindow = window as Window & { __SPEECH_LOG__?: string[] };
    return [...(speechWindow.__SPEECH_LOG__ ?? [])];
  });
}

async function hasCanvasText(page: Page, expectedText: string): Promise<boolean> {
  return page.evaluate((text) => {
    const hasText = (item: { active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }): boolean => {
      if (item.active === false || item.visible === false) return false;
      if (String(item.text ?? '').includes(text)) return true;
      return Array.isArray(item.list)
        && item.list.some((child) => hasText(child as { text?: string; list?: unknown[] }));
    };
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { list: Array<{ active?: boolean; visible?: boolean; text?: unknown; list?: unknown[] }> };
    };
    return scene.children.list.some(hasText);
  }, expectedText);
}

async function bannerText(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { text?: string } | null };
    };
    return scene.children.getByName('map-entry-banner')?.text ?? null;
  });
}

async function objectiveGuidanceState(page: Page): Promise<{
  text: string;
  marker: { visible: boolean; x: number } | null;
  arrow: { visible: boolean; rotation: number } | null;
}> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      objectiveText: { text: string };
      children: {
        getByName: (name: string) => { visible: boolean; x: number; rotation: number } | null;
      };
    };
    const marker = scene.children.getByName('objective-marker');
    const arrow = scene.children.getByName('objective-edge-arrow');
    return {
      text: scene.objectiveText.text,
      marker: marker ? { visible: marker.visible, x: marker.x } : null,
      arrow: arrow ? { visible: arrow.visible, rotation: arrow.rotation } : null
    };
  });
}

const FARM_VILLAGE_EXIT = { x: 40, y: 640 };
const VILLAGE_FARM_EXIT = { x: 1240, y: 448 };
const VILLAGE_ARRIVAL = { x: 1120, y: 448 };
const FARM_ARRIVAL = { x: 160, y: 640 };
const BAKER_PELL = { x: 576, y: 384 };
const FARM_CROP = { x: 480, y: 832 };

test('farm and village round trip preserves quest state, spawns, banners, and markers', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page);

  const questBefore = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { firstQuestStep: string };
    return scene.firstQuestStep;
  });

  await travelVia(page, FARM_VILLAGE_EXIT.x, FARM_VILLAGE_EXIT.y, 'eldoria-village');
  await expect.poll(() => bannerText(page), { timeout: 15000 }).toBe('Eldoria Village');
  expect(await playerPosition(page)).toEqual(VILLAGE_ARRIVAL);
  await movePlayerTo(page, 640, 560);
  await page.screenshot({ path: 'test-results/village-plaza-pell.png', fullPage: true });

  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { visible: boolean; x: number } | null };
    };
    const marker = scene.children.getByName('objective-marker');
    return marker ? { visible: marker.visible, x: marker.x } : null;
  }), { timeout: 15000 }).toEqual({ visible: true, x: 1248 });

  await travelVia(page, VILLAGE_FARM_EXIT.x, VILLAGE_FARM_EXIT.y, 'farm');
  await expect.poll(() => bannerText(page), { timeout: 15000 }).toBe('The Farm');
  expect(await playerPosition(page)).toEqual(FARM_ARRIVAL);
  await page.screenshot({ path: 'test-results/farm-west-gate.png', fullPage: true });

  expect(await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { firstQuestStep: string };
    return scene.firstQuestStep;
  })).toBe(questBefore);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { visible: boolean; x: number } | null };
    };
    const marker = scene.children.getByName('objective-marker');
    return marker ? { visible: marker.visible, x: marker.x } : null;
  }), { timeout: 15000 }).toEqual({ visible: true, x: 832 });
});

test('village map persists across reload and has a solid border', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page);
  await travelVia(page, FARM_VILLAGE_EXIT.x, FARM_VILLAGE_EXIT.y, 'eldoria-village');

  await boot(page, false);
  expect(await currentMapId(page)).toBe('eldoria-village');
  await expect.poll(() => bannerText(page), { timeout: 15000 }).toBe('Eldoria Village');

  await movePlayerTo(page, 640, 180);
  await page.keyboard.down('KeyW');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { body: { blocked: { up: boolean } } };
    };
    return scene.player.body.blocked.up;
  }), { timeout: 20000 }).toBe(true);
  await page.keyboard.up('KeyW');
});

test('notice board and well are flavor-only interactions', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page);
  await travelVia(page, FARM_VILLAGE_EXIT.x, FARM_VILLAGE_EXIT.y, 'eldoria-village');

  await movePlayerTo(page, 448, 576);
  await sceneInteract(page);
  await expect.poll(() => hasCanvasText(page, 'odd jobs for helpers'), { timeout: 15000 }).toBe(true);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);

  await movePlayerTo(page, 768, 640);
  await sceneInteract(page);
  await expect.poll(() => hasCanvasText(page, 'well water glitters'), { timeout: 15000 }).toBe(true);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
});

test('Ranger dialogue advances once per input and scene restart cannot accept the quest', async ({ page }) => {
  test.setTimeout(180000);
  await installSpeechStub(page);
  await boot(page);
  await travelVia(page, FARM_VILLAGE_EXIT.x, FARM_VILLAGE_EXIT.y, 'eldoria-village');
  await movePlayerTo(page, BAKER_PELL.x, BAKER_PELL.y);
  await sceneInteract(page);

  await expect.poll(() => dialogueState(page), { timeout: 15000 }).toMatchObject({
    open: true,
    speaker: 'Baker Pell',
    body: "You must be the farm helper! I'm Baker Pell."
  });
  expect(await speechLog(page)).toEqual([]);
  await clickGame(page, 900, 474);
  await expect.poll(() => speechLog(page), { timeout: 15000 })
    .toContain("You must be the farm helper! I'm Baker Pell.");
  await expect.poll(() => dialogueState(page), { timeout: 15000 }).toMatchObject({
    open: true,
    body: "You must be the farm helper! I'm Baker Pell."
  });
  await page.screenshot({
    path: 'docs/playtests/2026-07-21-living-world/village-dialogue-ranger.png',
    fullPage: true
  });

  // Restarting while the offer is open disposes presentation only. It must
  // never run the acceptance callback, and the replacement scene must own
  // exactly one Space/E listener.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      scene: { restart: (data: unknown) => void };
    };
    scene.scene.restart({
      profileId: 'grade5-adventurer',
      mapId: 'eldoria-village',
      spawnId: 'from-farm'
    });
  });
  await page.waitForFunction(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      mapId?: string;
      dialogueBox?: { isOpen: () => boolean };
      questSystem?: { step: (id: string) => string };
    } | undefined;
    return scene?.mapId === 'eldoria-village'
      && scene.dialogueBox?.isOpen() === false
      && scene.questSystem?.step('pell-berry-order') === 'not-started';
  }, undefined, { timeout: 20000 });

  await movePlayerTo(page, BAKER_PELL.x, BAKER_PELL.y);
  await sceneInteract(page);
  // The panel itself is an ACTION surface. This also proves its scroll-fixed
  // hit area remains aligned after the village camera has moved.
  await clickGame(page, 480, 512);
  await expect.poll(() => dialogueState(page), { timeout: 15000 }).toMatchObject({
    open: true,
    body: "I'm baking a pie, but my sunberries are all gone."
  });
  await page.keyboard.press('Space');
  await expect.poll(() => dialogueState(page), { timeout: 15000 }).toMatchObject({
    open: true,
    body: 'Could you pick 3 sunberries from your crop patch?'
  });
  // Hold the final keydown across render frames. Dialogue consumes this edge;
  // WorldScene must not replay it after busy clears and reopen Pell's reminder.
  await page.keyboard.down('Space');
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.keyboard.up('Space');
  await expect.poll(() => berryQuestState(page), { timeout: 15000 })
    .toEqual({ step: 'gathering', berries: 0 });
  await expect.poll(() => dialogueState(page), { timeout: 15000 }).toMatchObject({ open: false });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      children: { getByName: (name: string) => { visible: boolean; x: number } | null };
    };
    const marker = scene.children.getByName('objective-marker');
    return marker ? { visible: marker.visible, x: marker.x } : null;
  }), { timeout: 15000 }).toEqual({ visible: true, x: 1248 });
  expect(await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      objectiveText: { text: string };
    };
    return scene.objectiveText.text;
  })).toContain('Pick sunberries at the farm crop patch (0/3).');
});

test('Mage dialogue reads automatically while Ranger requires the speaker control', async ({ page }) => {
  test.setTimeout(180000);
  await installSpeechStub(page);
  await boot(page, true, 'grade2-mage');
  await travelVia(page, FARM_VILLAGE_EXIT.x, FARM_VILLAGE_EXIT.y, 'eldoria-village');
  await movePlayerTo(page, BAKER_PELL.x, BAKER_PELL.y);
  await sceneInteract(page);

  await expect.poll(() => speechLog(page), { timeout: 15000 })
    .toContain("You must be the farm helper! I'm Baker Pell.");
  await expect.poll(() => dialogueState(page), { timeout: 15000 }).toMatchObject({
    open: true,
    speaker: 'Baker Pell'
  });
  await page.screenshot({
    path: 'docs/playtests/2026-07-21-living-world/village-dialogue-mage.png',
    fullPage: true
  });
});

test('Berry gathering bypasses learning, persists progress, and preserves Mira flags', async ({ page }) => {
  test.setTimeout(180000);
  await seedSave(page, 'grade5-adventurer', {
    questSteps: { 'pell-berry-order': 'gathering' },
    questFlags: { miraThirdErrandSprout1Awakened: true }
  });
  await boot(page, false);
  await movePlayerTo(page, FARM_CROP.x, FARM_CROP.y);

  for (const count of [1, 2]) {
    await startCanvasTextRecorder(page);
    await sceneInteract(page);
    await expect.poll(() => berryQuestState(page), { timeout: 15000 })
      .toEqual({ step: 'gathering', berries: count });
    await expect.poll(() => recordedCanvasText(page, `Sunberry ${count}/3`), { timeout: 15000 })
      .toBe(true);
    expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
  }
  await expect.poll(() => hasCanvasText(page, 'Sunberry 2/3'), { timeout: 15000 }).toBe(true);
  await page.screenshot({
    path: 'docs/playtests/2026-07-21-living-world/village-sunberry-2-of-3.png',
    fullPage: true
  });

  const savedAfterTwo = await page.evaluate(() => {
    const raw = localStorage.getItem('eldoria_v2_save_grade5-adventurer');
    return raw ? JSON.parse(raw) as SaveState : null;
  });
  expect(savedAfterTwo?.version).toBe(2);
  expect(savedAfterTwo?.questSteps?.['pell-berry-order']).toBe('gathering');
  expect(savedAfterTwo?.questFlags).toMatchObject({
    pellBerryOrderBerry1: true,
    pellBerryOrderBerry2: true,
    miraThirdErrandSprout1Awakened: true
  });

  await boot(page, false);
  await expect.poll(() => berryQuestState(page), { timeout: 15000 })
    .toEqual({ step: 'gathering', berries: 2 });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      objectiveText: { text: string };
    };
    return scene.objectiveText.text;
  }), { timeout: 15000 }).toContain('(2/3)');

  await movePlayerTo(page, FARM_CROP.x, FARM_CROP.y);
  await startCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(() => berryQuestState(page), { timeout: 15000 })
    .toEqual({ step: 'return-ready', berries: 3 });
  await expect.poll(() => recordedCanvasText(page, 'Sunberry 3/3'), { timeout: 15000 }).toBe(true);
  expect(await hasCanvasText(page, 'optional learning bonus')).toBe(false);
});

test('Berry Order guidance routes through the village gate and survives reload', async ({ page }) => {
  test.setTimeout(180000);
  await seedSave(page, 'grade5-adventurer', {
    lastArea: 'eldoria-village',
    player: { x: 320, y: 448 },
    questSteps: { 'pell-berry-order': 'gathering' }
  });
  await boot(page, false);

  const assertVillageGuidance = async (): Promise<void> => {
    await expect.poll(() => objectiveGuidanceState(page), { timeout: 20000 }).toMatchObject({
      text: 'Objective: Pick sunberries at the farm crop patch (0/3).',
      marker: { visible: true, x: 1248 },
      arrow: { visible: true }
    });
    const rotation = (await objectiveGuidanceState(page)).arrow?.rotation;
    expect(rotation).toBeDefined();
    expect(Math.abs(rotation ?? Math.PI)).toBeLessThan(0.25);
  };

  await assertVillageGuidance();
  await page.screenshot({
    path: 'docs/playtests/2026-07-21-living-world/village-berry-order-exit-guidance.png',
    fullPage: true
  });

  // The quest and its route are derived again from the v2 save after reload.
  await boot(page, false);
  await assertVillageGuidance();
  await expect.poll(() => berryQuestState(page), { timeout: 15000 })
    .toEqual({ step: 'gathering', berries: 0 });

  await travelVia(page, VILLAGE_FARM_EXIT.x, VILLAGE_FARM_EXIT.y, 'farm');
  await expect.poll(() => objectiveGuidanceState(page), { timeout: 20000 }).toMatchObject({
    text: 'Objective: Pick sunberries at the farm crop patch (0/3).',
    marker: { visible: true, x: FARM_CROP.x },
    arrow: { visible: false }
  });
});

test('Berry Order return grants the fixed reward once and never during shutdown', async ({ page }) => {
  test.setTimeout(180000);
  await seedSave(page, 'grade5-adventurer', {
    gold: 7,
    inventory: { existingItem: 1 },
    lastArea: 'eldoria-village',
    player: BAKER_PELL,
    questSteps: { 'pell-berry-order': 'return-ready' },
    questFlags: {
      pellBerryOrderBerry1: true,
      pellBerryOrderBerry2: true,
      pellBerryOrderBerry3: true
    }
  });
  await boot(page, false);
  await movePlayerTo(page, BAKER_PELL.x, BAKER_PELL.y);
  await sceneInteract(page);
  await expect.poll(() => dialogueState(page), { timeout: 15000 }).toMatchObject({
    open: true,
    body: 'Oh my whiskers — perfect sunberries!'
  });

  // Disposal of an open return dialogue must not grant its reward.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      scene: { restart: (data: unknown) => void };
    };
    scene.scene.restart({
      profileId: 'grade5-adventurer',
      mapId: 'eldoria-village',
      spawnId: 'from-farm'
    });
  });
  await page.waitForFunction(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      gold?: number;
      questSystem?: { step: (id: string) => string };
    } | undefined;
    return scene?.gold === 7 && scene.questSystem?.step('pell-berry-order') === 'return-ready';
  }, undefined, { timeout: 20000 });

  await movePlayerTo(page, BAKER_PELL.x, BAKER_PELL.y);
  await sceneInteract(page);
  await startCanvasTextRecorder(page);
  // Two deliberately rapid ACTION dispatches advance and close/reward.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      handleActionInput: () => void;
    };
    scene.handleActionInput();
    scene.handleActionInput();
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      gold: number;
      inventory: Record<string, number>;
      questSystem: { step: (id: string) => string };
    };
    return {
      step: scene.questSystem.step('pell-berry-order'),
      gold: scene.gold,
      berryPie: scene.inventory.berryPie ?? 0
    };
  }), { timeout: 15000 }).toEqual({ step: 'complete', gold: 27, berryPie: 1 });
  await expect.poll(() => recordedCanvasText(page, 'Quest Complete: The Berry Order'), { timeout: 15000 })
    .toBe(true);
  await expect.poll(() => hasCanvasText(page, 'Quest Complete: The Berry Order'), { timeout: 15000 })
    .toBe(true);
  await page.screenshot({
    path: 'docs/playtests/2026-07-21-living-world/village-berry-order-complete.png',
    fullPage: true
  });

  // More rapid ACTION presses now enter only the complete-state flavor path.
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      handleActionInput: () => void;
    };
    scene.handleActionInput();
    scene.handleActionInput();
    scene.handleActionInput();
  });
  expect(await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      gold: number;
      inventory: Record<string, number>;
    };
    return { gold: scene.gold, berryPie: scene.inventory.berryPie ?? 0 };
  })).toEqual({ gold: 27, berryPie: 1 });

  await boot(page, false);
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      gold: number;
      inventory: Record<string, number>;
      questSystem: { step: (id: string) => string };
    };
    return {
      step: scene.questSystem.step('pell-berry-order'),
      gold: scene.gold,
      berryPie: scene.inventory.berryPie ?? 0
    };
  }), { timeout: 15000 }).toEqual({ step: 'complete', gold: 27, berryPie: 1 });
});
