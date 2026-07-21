import { sx } from './gameDimensions';

/**
 * Centralized hero-movement and camera feel tuning. Every value here was a
 * magic number inside WorldScene before the 2026-07 game-feel milestone;
 * keeping them together (and Phaser-free, like gameDimensions) lets unit
 * tests assert the tuning stays inside its playtested bounds and makes the
 * next feel pass a one-file change.
 *
 * Play-feedback context ("character feels slow", "feels a bit laggy"):
 * the original 250 world px/sec crossed the 1920px world in ~7.7s, and the
 * 0.12 camera lerp let the world visibly trail behind input.
 */
export const MOVEMENT_TUNING = {
  /**
   * Max hero speed in world px/sec. sx() doubles the design-space value at
   * GAME_SCALE 2, so sx(175) = 350 world px/sec — world crossing ~5.5s.
   * Playtested band: 340-380 (snappy but still controllable with the
   * on-screen joystick).
   */
  maxSpeed: sx(175),

  /**
   * Per-frame lerp factor pulling current velocity toward input * maxSpeed.
   * Adds a light ease-in/ease-out so starts and stops aren't robotic while
   * keeping response inside ~10 frames. Playtested band: 0.25-0.35.
   */
  velocitySmoothing: 0.3,

  /**
   * Below this speed (world px/sec), a decelerating hero snaps to exactly 0
   * instead of asymptotically lerping forever. Must stay small enough to be
   * imperceptible (< one pixel per frame at 60fps).
   */
  velocitySnapThreshold: sx(4),

  /**
   * Camera follow lerp (both axes). 0.12 read as "lag"; 0.3 keeps the hero
   * near-centered without whipping. Playtested band: 0.25-0.4. roundPixels
   * stays on in WorldScene so the tighter follow doesn't shimmer.
   */
  cameraLerp: 0.3,

  /**
   * Footstep SFX interval while moving, retuned from 380ms for the faster
   * stride so steps still land roughly with the walk cycle.
   */
  footstepIntervalMs: 300
} as const;
