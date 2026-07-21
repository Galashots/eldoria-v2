import { describe, expect, it } from 'vitest';
import {
  MIN_TOUCH_TARGET_CSS_PX,
  REFERENCE_FIT_SCALE,
  REFERENCE_VIEWPORT_WIDTH
} from '../../src/gameDimensions';
import { GAME_WIDTH } from '../../src/gameDimensions';
import { HUD_CONTROL_SIZES } from '../../src/presentation/hudControls';

/**
 * Fixed HUD controls must clear the 44 CSS-px touch-target floor at the
 * reference iPad viewport. sy(16) = 32 internal px ≈ 39.8 CSS px there —
 * below the floor; sy(18) = 36 ≈ 44.8 clears it. This is the unit-level
 * backstop; the rendered per-control audit lives in the emulation harness.
 */
describe('HUD fixed-control touch targets', () => {
  it('reference fit is the assumed width-limited iPad scale', () => {
    expect(REFERENCE_FIT_SCALE).toBeCloseTo(REFERENCE_VIEWPORT_WIDTH / GAME_WIDTH, 6);
  });

  it.each(Object.entries(HUD_CONTROL_SIZES))(
    '%s control is at least 44 CSS px in both dimensions at the reference viewport',
    (_name, size) => {
      expect(size.height * REFERENCE_FIT_SCALE).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_CSS_PX);
      expect(size.width * REFERENCE_FIT_SCALE).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_CSS_PX);
    }
  );
});
