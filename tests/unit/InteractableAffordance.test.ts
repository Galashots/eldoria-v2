import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import {
  InteractableAffordanceController,
  type AffordanceVisual
} from '../../src/presentation/InteractableAffordance';

/**
 * Proximity pop-guard regression coverage. The Practice Slime declines pops
 * while its strike animation owns the sprite transform (canPop() === false).
 * Entering range mid-strike must DEFER the pop until the guard clears — not
 * drop it for the rest of the visit. The controller is driven with a
 * structural scene stub; only tween creation is observed.
 */

type TweenConfig = { targets: unknown; scaleX?: number; scale?: number; y?: number };

function makeSceneStub() {
  const tweensAdd = vi.fn((_config: TweenConfig) => ({ remove: vi.fn() }));
  const killTweensOf = vi.fn();
  const graphicsStub = {
    setPosition: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillTriangle: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };
  const scene = {
    tweens: { add: tweensAdd, killTweensOf },
    add: { graphics: vi.fn(() => graphicsStub) }
  } as unknown as Phaser.Scene;
  return { scene, tweensAdd };
}

function makeMarker(): AffordanceVisual {
  return { x: 100, y: 100, scaleX: 1, scaleY: 1, active: true, visible: true } as AffordanceVisual;
}

/** Pop tweens carry scaleX/scaleY; the idle-bob tween carries y; the sparkle carries scale. */
function popCalls(tweensAdd: ReturnType<typeof vi.fn>): TweenConfig[] {
  return tweensAdd.mock.calls.map((call) => call[0] as TweenConfig).filter((config) => config.scaleX !== undefined);
}

describe('InteractableAffordanceController pop guard', () => {
  it('defers the pop while canPop declines and fires it when the guard clears — without the player leaving range', () => {
    const { scene, tweensAdd } = makeSceneStub();
    const player = { x: 0, y: 0 };
    const controller = new InteractableAffordanceController(scene, player);
    let guardAllows = false;
    // idleBob: false so registration itself creates no tween; only pops count.
    controller.register({ id: 'practice-slime', x: 10, y: 0, marker: makeMarker(), idleBob: false, canPop: () => guardAllows });

    controller.update(); // enters range mid-strike: guard declines
    expect(popCalls(tweensAdd)).toHaveLength(0);

    guardAllows = true; // strike ends; player never moved
    controller.update();
    expect(popCalls(tweensAdd)).toHaveLength(1);
    expect(popCalls(tweensAdd)[0].scaleX).toBeCloseTo(1.15, 5);
  });

  it('never pops out a target whose pop was declined before the player left', () => {
    const { scene, tweensAdd } = makeSceneStub();
    const player = { x: 0, y: 0 };
    const controller = new InteractableAffordanceController(scene, player);
    controller.register({ id: 'practice-slime', x: 10, y: 0, marker: makeMarker(), idleBob: false, canPop: () => false });

    controller.update(); // guard declines the pop
    player.x = 500; // player leaves before the strike ended
    controller.update();
    // Nothing was ever popped, so there is nothing to un-pop: no tweens at all.
    expect(popCalls(tweensAdd)).toHaveLength(0);
  });

  it('eases back to rest when the player leaves range after a successful pop', () => {
    const { scene, tweensAdd } = makeSceneStub();
    const player = { x: 0, y: 0 };
    const controller = new InteractableAffordanceController(scene, player);
    controller.register({ id: 'mira', x: 10, y: 0, marker: makeMarker(), idleBob: false });

    controller.update();
    expect(popCalls(tweensAdd)).toHaveLength(1);

    player.x = 500;
    controller.update();
    expect(popCalls(tweensAdd)).toHaveLength(2);
    expect(popCalls(tweensAdd)[1].scaleX).toBe(1); // back to base scale
  });

  it('does not pop a hidden marker, and re-pops when it becomes visible again', () => {
    const { scene, tweensAdd } = makeSceneStub();
    const player = { x: 0, y: 0 };
    const controller = new InteractableAffordanceController(scene, player);
    const marker = makeMarker();
    marker.visible = false;
    controller.register({ id: 'sprout-1', x: 10, y: 0, marker, idleBob: false });

    controller.update();
    expect(popCalls(tweensAdd)).toHaveLength(0);

    marker.visible = true;
    controller.update();
    expect(popCalls(tweensAdd)).toHaveLength(1);
  });
});
