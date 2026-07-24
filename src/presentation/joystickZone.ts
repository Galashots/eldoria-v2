import { GAME_HEIGHT, REFERENCE_FIT_SCALE, sx, sy } from '../gameDimensions';

/**
 * Bounded lower-left activation region for the dynamic joystick, extracted
 * from WorldScene so its geometry can be unit-tested without loading Phaser
 * (tests/unit/joystickZone.test.ts) and so the measured bounds are documented
 * in one place.
 *
 * Replaces the previous "entire lower-left quadrant" catchment (the playtest
 * audit's "joystick occupies a large lower-left region"): a touch-down now
 * engages the joystick only inside this corner box, leaving the rest of the
 * lower-left playfield free for world touches. The box is sized to comfortably
 * contain the joystick's own visible footprint (base radius sx(42) = 84 game
 * px, so a 168 game-px circle) with margin.
 *
 * Measured at the supported 1194x834 viewport (REFERENCE_FIT_SCALE ~= 1.244):
 *   width  sx(130) = 260 game px  ~= 323 CSS px
 *   height sy(110) = 220 game px  ~= 274 CSS px
 * anchored to the bottom-left corner (x in [0, 260], y in [420, 640] game px).
 */
export const JOYSTICK_ZONE_WIDTH = sx(130);
export const JOYSTICK_ZONE_HEIGHT = sy(110);

/** True when a game-space point falls inside the bounded lower-left zone. */
export function isInJoystickZone(gameX: number, gameY: number): boolean {
  return gameX <= JOYSTICK_ZONE_WIDTH && gameY >= GAME_HEIGHT - JOYSTICK_ZONE_HEIGHT;
}

/** The zone's on-screen size in CSS px at the supported reference viewport. */
export const JOYSTICK_ZONE_CSS = {
  width: JOYSTICK_ZONE_WIDTH * REFERENCE_FIT_SCALE,
  height: JOYSTICK_ZONE_HEIGHT * REFERENCE_FIT_SCALE
} as const;
