import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, MIN_TOUCH_TARGET_CSS_PX } from '../../src/gameDimensions';
import {
  isInJoystickZone,
  JOYSTICK_ZONE_CSS,
  JOYSTICK_ZONE_HEIGHT,
  JOYSTICK_ZONE_WIDTH
} from '../../src/presentation/joystickZone';

describe('joystick activation zone', () => {
  it('accepts touches inside the bottom-left corner box', () => {
    // Deep inside the zone.
    expect(isInJoystickZone(20, GAME_HEIGHT - 20)).toBe(true);
    // On the inner corner boundary.
    expect(isInJoystickZone(JOYSTICK_ZONE_WIDTH, GAME_HEIGHT - JOYSTICK_ZONE_HEIGHT)).toBe(true);
    // Bottom-left origin.
    expect(isInJoystickZone(0, GAME_HEIGHT)).toBe(true);
  });

  it('rejects touches outside the bounded zone that the old full-quadrant catchment would have taken', () => {
    // Center of the lower-left quadrant: inside the OLD catchment
    // (x <= GAME_WIDTH/2, y >= GAME_HEIGHT/2) but outside the new bounded zone,
    // so it stays free for world interaction.
    expect(isInJoystickZone(GAME_WIDTH / 2 - 1, GAME_HEIGHT / 2 + 1)).toBe(false);
    // Just past the zone's right edge.
    expect(isInJoystickZone(JOYSTICK_ZONE_WIDTH + 1, GAME_HEIGHT - 10)).toBe(false);
    // Just above the zone's top edge.
    expect(isInJoystickZone(10, GAME_HEIGHT - JOYSTICK_ZONE_HEIGHT - 1)).toBe(false);
    // Anywhere on the right half / upper half.
    expect(isInJoystickZone(GAME_WIDTH - 40, GAME_HEIGHT - 40)).toBe(false);
    expect(isInJoystickZone(20, 40)).toBe(false);
  });

  it('bounds a materially smaller footprint than the full lower-left quadrant', () => {
    const zoneArea = JOYSTICK_ZONE_WIDTH * JOYSTICK_ZONE_HEIGHT;
    const quadrantArea = (GAME_WIDTH / 2) * (GAME_HEIGHT / 2);
    // The new zone claims well under half the old quadrant's area.
    expect(zoneArea).toBeLessThan(quadrantArea * 0.5);
  });

  it('remains a comfortable target (>= 44 CSS px each side) at the supported viewport', () => {
    expect(JOYSTICK_ZONE_CSS.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_CSS_PX);
    expect(JOYSTICK_ZONE_CSS.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_CSS_PX);
  });
});
