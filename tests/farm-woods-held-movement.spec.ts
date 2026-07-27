import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

// Regression coverage for the Farm<->Woods gate transitions using ordinary
// continuous held movement — the reciprocal of the Farm<->Village coverage in
// farm-village-held-movement.spec.ts.
//
// PR #133 fixed the Farm<->Village pair and flagged (in its Remaining risk)
// that the same collision-geometry mechanism was *suspected but unverified*
// for the Farm<->Woods pair. This spec verifies it. As in #133, arranging the
// player on the registered approach road uses a direct position set (the same
// "arrange" convention every multi-map spec uses), but the actual gate
// crossing and the post-arrival control proof are driven entirely by
// continuous held keyboard input. The existing multi-map specs teleport
// straight into the exit-zone rect via setPosition(), bypassing collision, so
// they never exercised the held-movement crossing and never caught this.
//
// Root cause (identical mechanism to #133): the player's Arcade physics body
// (72x72 world px) sits well below its y-anchor — body top is player.y+16 and
// bottom player.y+88, so the body's vertical centre is at anchor.y+52. Both
// Farm<->Woods gate mouths are 2 tiles tall (128 world px) and centred on the
// road, but the registered 'from-woods'/'from-farm' spawns place the *anchor*
// on the road centreline, so the body's lower edge overhangs 24 px past the
// mouth's south edge into the solid Collision tile immediately below it:
//   * Farm east  (GateToWoods): mouth = col 29 rows 9-10; blocker = col 29 row 11
//   * Woods west (GateToFarm):  mouth = col 0  rows 6-7;  blocker = col 0  row 8
// The blocking tile catches the body and the player can never reduce/increase
// x far enough to enter the exit zone. Fixed by opening exactly those two
// Collision cells (one per map), mirroring #133's farm.json row 11/col 0 fix.

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
 * sleep — until the scene reports a different mapId with the transition fade
 * already complete, or the timeout proves the gate never opened.
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
 * Proves the player actually regains ordinary movement control after arrival
 * — holds a key away from the reciprocal gate (so this can never accidentally
 * re-trigger a transition) and condition-waits on the player's own x moving
 * past a real threshold, rather than a fixed sleep.
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

// Farm's east road, two tiles west of GateToWoods — src/data/maps.ts'
// registered 'from-woods' spawn, the documented natural approach line.
const FARM_ROAD_TOWARD_WOODS = { x: 1760, y: 640 };
// Woods' west road, two tiles east of GateToFarm — the registered
// 'from-farm' spawn.
const WOODS_ROAD_TOWARD_FARM = { x: 320, y: 448 };

const PROFILES: { id: ProfileId; label: string }[] = [
  { id: 'grade5-adventurer', label: 'Ranger' },
  { id: 'grade2-mage', label: 'Mage' }
];

for (const profile of PROFILES) {
  test(`${profile.label}: walking east along the farm road transitions into the woods (held movement)`, async ({ page }) => {
    test.setTimeout(60000);
    await boot(page, profile.id);
    expect(await currentMapId(page)).toBe('farm');

    await alignOnRoad(page, FARM_ROAD_TOWARD_WOODS.x, FARM_ROAD_TOWARD_WOODS.y);
    await holdKeyUntilMapChanges(page, 'KeyD', 'farm');
    expect(await currentMapId(page)).toBe('wildbloom-woods');

    // Woods' GateToFarm (the reciprocal gate) is to the west, so moving
    // further east proves real post-transition control without risking an
    // immediate re-transition.
    await assertPostTransitionControl(page, 'KeyD', 'increase');

    await page.screenshot({
      path: `test-results/held-movement-farm-to-woods-${profile.id}.png`,
      fullPage: true
    });
  });

  test(`${profile.label}: walking west along the woods road transitions into the farm (held movement)`, async ({ page }) => {
    test.setTimeout(60000);
    await boot(page, profile.id);

    // Arrange: jump straight to the woods side via an explicit scene restart
    // (the same mechanism WorldScene itself uses for a real gate transition),
    // so this test isolates the Woods -> Farm crossing without re-proving the
    // Farm -> Woods direction already covered above.
    await page.evaluate((profileId) => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
        scene: { restart: (data: unknown) => void };
      };
      scene.scene.restart({ profileId, mapId: 'wildbloom-woods', spawnId: 'from-farm' });
    }, profile.id);
    await page.waitForFunction(() => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as { mapId?: string };
      return scene?.mapId === 'wildbloom-woods';
    });

    await alignOnRoad(page, WOODS_ROAD_TOWARD_FARM.x, WOODS_ROAD_TOWARD_FARM.y);
    await holdKeyUntilMapChanges(page, 'KeyA', 'wildbloom-woods');
    expect(await currentMapId(page)).toBe('farm');

    // Farm's GateToWoods (the reciprocal gate) is to the east, so moving
    // further west proves real post-transition control without risking an
    // immediate re-transition.
    await assertPostTransitionControl(page, 'KeyA', 'decrease');

    await page.screenshot({
      path: `test-results/held-movement-woods-to-farm-${profile.id}.png`,
      fullPage: true
    });
  });
}
