import { describe, expect, it } from 'vitest';
import {
  CASTABLE_TARGET_IDS,
  CAST_HALF_WIDTH,
  CAST_RANGE,
  castDirection,
  castImpactPoint,
  isCastable,
  resolveCastHit,
  type CastCandidate
} from '../../src/systems/castTargeting';

const HERO = { x: 500, y: 500 };

const at = (id: string, x: number, y: number): CastCandidate => ({ id, x, y });

describe('castDirection', () => {
  it('points along the screen axes, with back as negative y', () => {
    expect(castDirection('right')).toEqual({ x: 1, y: 0 });
    expect(castDirection('left')).toEqual({ x: -1, y: 0 });
    expect(castDirection('back')).toEqual({ x: 0, y: -1 });
    expect(castDirection('front')).toEqual({ x: 0, y: 1 });
  });
});

describe('what a cast is allowed to reach', () => {
  it('reaches things you would hit', () => {
    for (const id of ['practice-slime', 'sprout-1', 'sprout-2', 'sprout-3', 'mossy-stone']) {
      expect(isCastable(id), id).toBe(true);
    }
  });

  it('does not reach anyone you would talk to, or a bonus you harvest by hand', () => {
    // Not a style preference: a spark that opens Mira's dialogue from three
    // tiles away would let a player skip the walk the objective is asking for,
    // and every dialogue/quest handoff assumes the hero is standing there.
    for (const id of ['mira', 'baker-pell', 'notice-board', 'village-well', 'crop-bonus', 'whispering-flower']) {
      expect(isCastable(id), id).toBe(false);
    }
  });

  it('keeps the castable set explicit rather than open-ended', () => {
    expect([...CASTABLE_TARGET_IDS]).toHaveLength(5);
  });
});

describe('resolveCastHit', () => {
  it('hits a castable target straight ahead', () => {
    const hit = resolveCastHit(HERO, 'right', [at('practice-slime', HERO.x + 120, HERO.y)]);
    expect(hit?.id).toBe('practice-slime');
  });

  it('ignores a target behind the hero', () => {
    expect(resolveCastHit(HERO, 'right', [at('practice-slime', HERO.x - 120, HERO.y)])).toBeNull();
    expect(resolveCastHit(HERO, 'back', [at('sprout-1', HERO.x, HERO.y + 120)])).toBeNull();
  });

  it('ignores a target past the range', () => {
    expect(resolveCastHit(HERO, 'right', [at('sprout-1', HERO.x + CAST_RANGE + 1, HERO.y)])).toBeNull();
    expect(resolveCastHit(HERO, 'right', [at('sprout-1', HERO.x + CAST_RANGE - 1, HERO.y)])).not.toBeNull();
  });

  it('ignores a target outside the corridor width', () => {
    expect(resolveCastHit(HERO, 'right', [at('sprout-1', HERO.x + 100, HERO.y + CAST_HALF_WIDTH + 1)])).toBeNull();
    expect(resolveCastHit(HERO, 'right', [at('sprout-1', HERO.x + 100, HERO.y + CAST_HALF_WIDTH - 1)])).not.toBeNull();
  });

  it('takes the nearest of several targets in the corridor', () => {
    const hit = resolveCastHit(HERO, 'right', [
      at('sprout-2', HERO.x + 150, HERO.y),
      at('sprout-1', HERO.x + 60, HERO.y),
      at('sprout-3', HERO.x + 110, HERO.y)
    ]);
    expect(hit?.id).toBe('sprout-1');
  });

  it('flies past a non-castable target to reach a castable one behind it', () => {
    // Mira standing between the hero and a sprout must not block the cast, or
    // she would act as invisible cover the player cannot explain.
    const hit = resolveCastHit(HERO, 'right', [
      at('mira', HERO.x + 50, HERO.y),
      at('sprout-1', HERO.x + 140, HERO.y)
    ]);
    expect(hit?.id).toBe('sprout-1');
  });

  it('returns null when the cast flies into empty ground', () => {
    expect(resolveCastHit(HERO, 'front', [])).toBeNull();
  });

  it('works in every direction', () => {
    expect(resolveCastHit(HERO, 'left', [at('sprout-1', HERO.x - 100, HERO.y)])?.id).toBe('sprout-1');
    expect(resolveCastHit(HERO, 'back', [at('sprout-1', HERO.x, HERO.y - 100)])?.id).toBe('sprout-1');
    expect(resolveCastHit(HERO, 'front', [at('sprout-1', HERO.x, HERO.y + 100)])?.id).toBe('sprout-1');
  });
});

describe('castImpactPoint', () => {
  it('lands on the target it hit', () => {
    const target = at('practice-slime', HERO.x + 120, HERO.y + 10);
    expect(castImpactPoint(HERO, 'right', target)).toEqual({ x: target.x, y: target.y });
  });

  it('lands at the far end of the corridor when nothing was hit', () => {
    expect(castImpactPoint(HERO, 'right', null)).toEqual({ x: HERO.x + CAST_RANGE, y: HERO.y });
    expect(castImpactPoint(HERO, 'back', null)).toEqual({ x: HERO.x, y: HERO.y - CAST_RANGE });
  });
});

describe('the range this extends', () => {
  it('reaches meaningfully further than the walk-up interaction range', () => {
    // nearestTarget() in WorldScene uses sx(42) = 84 world px. The cast has to
    // be clearly longer than that to be worth having, without being so long it
    // trivialises crossing a 1920px map.
    expect(CAST_RANGE).toBeGreaterThan(84 * 2);
    expect(CAST_RANGE).toBeLessThan(1920 / 4);
  });
});
