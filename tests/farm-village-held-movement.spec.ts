import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

// Regression coverage for the Farm<->Village gate transitions using ordinary
// continuous held movement.
//
// No teleport into the exit zone: arranging the player on the registered
// approach road (below) still uses a direct position set, the same
// "arrange" convention every other spec in this suite uses to reach a named
// scenario without re-walking the whole map — but the actual gate crossing,
// and the post-arrival control proof, are always driven by continuous held
// keyboard input. Every existing multi-map spec (multi-map.spec.ts,
// village.spec.ts) instead teleports the player directly into the exit
// zone's rect via setPosition(), which bypasses collision entirely and
// never exercised the held-movement crossing at all — so neither defect
// below was ever caught.
//
// Root cause (full evidence in the PR body/changelog): the player's Arcade
// physics body (72x72 world px) sits well below its y-anchor — measured
// live, body top is player.y+16 and body bottom is player.y+88 — so at the
// documented approach height (the vertical centre of each gate's 2-tile-tall
// Collision opening, which is also where the registered
// 'from-village'/'from-farm' spawns place the player), the body's lower edge
// caught on the solid Collision tile immediately south of the opening,
// blocking the player from ever reducing their x far enough to enter the
// exit zone. Separately, Eldoria Village's east-edge GateToFarm exit zone
// started exactly at the world boundary with a width matched to the body's
// *symmetric* footprint; the body's actual offset is asymmetric (4px short
// of the anchor on the left, 68px on the right), so world-bounds collision
// stopped the player 4 world px short of the zone on that side too.
//
// A live reproduction of the same vertical-clipping mechanism against
// Farm's own east gate (GateToWoods, the Farm<->Woods pair's Farm-side
// exit) got stuck identically — same 2-tile opening, same body geometry.
// That pair is out of scope for this PR (see the PR body's Remaining risk),
// and its reciprocal Woods-side gate and the separate horizontal-shortfall
// mechanism were not reproduced, so this is a geometry-based suspicion for
// that pair, not a confirmed-and-fixed defect.

type ProfileId = 'grade2-mage' | 'grade5-adventurer';

async function boot(page: Page, profileId: ProfileId = 'grade5-adventurer'): Promise<void> {
  await page.goto('/');
  await page.evaluate((profile) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${profile}`, 'true');
  }, profileId);
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, profileId === 'grade2-mage' ? 232 : 368);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function currentMapId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { mapId: string };
    return scene.mapId;
  });
}

async function playerX(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { x: number };
    };
    return scene.player.x;
  });
}

async function alignOnRoad(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, [x, y]);
}

/**
 * Holds a single movement key down — real continuous input, not a fixed
 * sleep — until the scene reports a different mapId with the transition
 * fade already complete, or the timeout proves the gate never opened.
 */
async function holdKeyUntilMapChanges(
  page: Page,
  key: string,
  fromMapId: string,
  timeoutMs = 20000
): Promise<void> {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      (expectedFrom) => {
        const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
          mapId: string;
          transitioning: boolean;
        };
        return scene.mapId !== expectedFrom && scene.transitioning === false;
      },
      fromMapId,
      { timeout: timeoutMs }
    );
  } finally {
    await page.keyboard.up(key);
  }
}

/**
 * Proves the player actually regains ordinary movement control after
 * arrival — not just that the scene reports the new map. Holds a single
 * key in a direction away from the reciprocal gate (so this can never
 * accidentally re-trigger a transition) and condition-waits on the
 * player's own x coordinate moving past a real threshold, rather than a
 * fixed sleep.
 */
const POST_TRANSITION_MIN_TRAVEL_PX = 60;

async function assertPostTransitionControl(
  page: Page,
  key: string,
  direction: 'increase' | 'decrease',
  timeoutMs = 15000
): Promise<void> {
  const startX = await playerX(page);
  await page.keyboard.down(key);
  try {
    await expect
      .poll(
        async () => {
          const x = await playerX(page);
          return direction === 'increase'
            ? x > startX + POST_TRANSITION_MIN_TRAVEL_PX
            : x < startX - POST_TRANSITION_MIN_TRAVEL_PX;
        },
        { timeout: timeoutMs }
      )
      .toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
}

// Farm's west road, two tiles east of GateToVillage — src/data/maps.ts'
// registered 'from-village' spawn, the documented natural approach line.
const FARM_ROAD_TOWARD_VILLAGE = { x: 160, y: 640 };
// Village's east road, two tiles west of GateToFarm — the registered
// 'from-farm' spawn.
const VILLAGE_ROAD_TOWARD_FARM = { x: 1120, y: 448 };

const PROFILES: { id: ProfileId; label: string }[] = [
  { id: 'grade5-adventurer', label: 'Ranger' },
  { id: 'grade2-mage', label: 'Mage' }
];

for (const profile of PROFILES) {
  test(`${profile.label}: walking west along the farm road transitions into the village (held movement)`, async ({ page }) => {
    test.setTimeout(60000);
    await boot(page, profile.id);
    expect(await currentMapId(page)).toBe('farm');

    await alignOnRoad(page, FARM_ROAD_TOWARD_VILLAGE.x, FARM_ROAD_TOWARD_VILLAGE.y);
    await holdKeyUntilMapChanges(page, 'KeyA', 'farm');
    expect(await currentMapId(page)).toBe('eldoria-village');

    // Village's GateToFarm (the reciprocal gate) is to the east, so moving
    // further west proves real post-transition control without risking an
    // immediate re-transition.
    await assertPostTransitionControl(page, 'KeyA', 'decrease');

    await page.screenshot({
      path: `test-results/held-movement-farm-to-village-${profile.id}.png`,
      fullPage: true
    });
  });

  test(`${profile.label}: walking east along the village road transitions into the farm (held movement)`, async ({ page }) => {
    test.setTimeout(60000);
    await boot(page, profile.id);

    // Arrange: jump straight to the village side via an explicit scene
    // restart (the same mechanism WorldScene itself uses for a real gate
    // transition), so this test isolates the Village -> Farm crossing
    // without re-proving the Farm -> Village direction already covered
    // above.
    await page.evaluate((profileId) => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
        scene: { restart: (data: unknown) => void };
      };
      scene.scene.restart({ profileId, mapId: 'eldoria-village', spawnId: 'from-farm' });
    }, profile.id);
    await page.waitForFunction(() => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { mapId?: string };
      return scene?.mapId === 'eldoria-village';
    });

    await alignOnRoad(page, VILLAGE_ROAD_TOWARD_FARM.x, VILLAGE_ROAD_TOWARD_FARM.y);
    await holdKeyUntilMapChanges(page, 'KeyD', 'eldoria-village');
    expect(await currentMapId(page)).toBe('farm');

    // Farm's GateToVillage (the reciprocal gate) is to the west, so moving
    // further east proves real post-transition control without risking an
    // immediate re-transition.
    await assertPostTransitionControl(page, 'KeyD', 'increase');

    await page.screenshot({
      path: `test-results/held-movement-village-to-farm-${profile.id}.png`,
      fullPage: true
    });
  });
}
