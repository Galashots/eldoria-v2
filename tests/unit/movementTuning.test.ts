import { describe, expect, it } from 'vitest';
import { MOVEMENT_TUNING } from '../../src/movementTuning';
import { sx } from '../../src/gameDimensions';

// Guards the playtested feel bounds from the 2026-07 game-feel milestone
// ("character feels slow", "feels a bit laggy"). A future retune should move
// these bounds deliberately, not drift past them by accident.
describe('MOVEMENT_TUNING', () => {
  it('keeps max speed inside the playtested 340-380 world px/sec band', () => {
    expect(MOVEMENT_TUNING.maxSpeed).toBeGreaterThanOrEqual(340);
    expect(MOVEMENT_TUNING.maxSpeed).toBeLessThanOrEqual(380);
  });

  it('keeps velocity smoothing inside the 0.25-0.35 lerp band', () => {
    expect(MOVEMENT_TUNING.velocitySmoothing).toBeGreaterThanOrEqual(0.25);
    expect(MOVEMENT_TUNING.velocitySmoothing).toBeLessThanOrEqual(0.35);
  });

  it('keeps the stop-snap threshold imperceptible (under one world px per 60fps frame)', () => {
    expect(MOVEMENT_TUNING.velocitySnapThreshold).toBeGreaterThan(0);
    // < 60 world px/sec == < 1 world px per frame at 60fps.
    expect(MOVEMENT_TUNING.velocitySnapThreshold).toBeLessThan(60);
  });

  it('keeps camera lerp inside the 0.25-0.4 responsive-without-whipping band', () => {
    expect(MOVEMENT_TUNING.cameraLerp).toBeGreaterThanOrEqual(0.25);
    expect(MOVEMENT_TUNING.cameraLerp).toBeLessThanOrEqual(0.4);
  });

  it('keeps the footstep interval retuned for the faster stride', () => {
    expect(MOVEMENT_TUNING.footstepIntervalMs).toBeGreaterThanOrEqual(250);
    expect(MOVEMENT_TUNING.footstepIntervalMs).toBeLessThanOrEqual(350);
  });

  it('derives max speed through sx() so a GAME_SCALE change carries through', () => {
    expect(MOVEMENT_TUNING.maxSpeed).toBe(sx(175));
  });
});
