import { sx, sy } from '../gameDimensions';

/**
 * Fixed top-right HUD control geometry, extracted from WorldScene so the
 * ≥44 CSS-px touch-target floor can be unit-tested without loading Phaser
 * (tests/unit/hudControls.test.ts). Any new fixed HUD control belongs in
 * this map so the gate covers it automatically. The full rendered audit of
 * every interactive target (ACTION, prompt choices, dialogue controls,
 * stats CLOSE) remains with the iPad-emulation harness.
 */
export const HUD_CONTROL_SIZES = {
  // Height sy(18) (not sy(16)): 36 internal px ≈ 44.8 CSS px at the
  // reference iPad viewport — the ≥44 floor is gated by hudControls.test.ts.
  stats: { width: sx(56), height: sy(18) },
  mute: { width: sx(24), height: sy(18) }
} as const;
