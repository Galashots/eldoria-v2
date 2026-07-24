/**
 * ACTION control visual states (playtest audit: "ACTION has weak
 * inactive/available differentiation"). Extracted from WorldScene so the
 * state-decision logic can be unit-tested without Phaser
 * (tests/unit/actionButtonState.test.ts).
 *
 * 'pressed' is not resolved here: it is the momentary squash/scale feedback
 * (installButtonPressFeedback) that composes on top of whichever base state is
 * current, so only the three base states are modelled.
 */
export type ActionButtonState = 'available' | 'inactive' | 'disabled';

/**
 * Palette per base state. Fainter alphas on non-touch (mouse/keyboard)
 * sessions match the pre-existing "don't clutter the corner on desktop"
 * treatment; touch sessions show ACTION at full prominence.
 */
export const ACTION_BUTTON_PALETTE: Record<ActionButtonState, {
  fill: number;
  stroke: number;
  touchAlpha: number;
  mouseAlpha: number;
}> = {
  available: { fill: 0x5f3d12, stroke: 0xffd666, touchAlpha: 0.9, mouseAlpha: 0.3 },
  inactive: { fill: 0x3a2a18, stroke: 0x8a6d3a, touchAlpha: 0.55, mouseAlpha: 0.16 },
  disabled: { fill: 0x27231f, stroke: 0x6b6660, touchAlpha: 0.4, mouseAlpha: 0.12 }
};

/**
 * Resolve the ACTION control's base state from gameplay state:
 *  - disabled: a modal (learning prompt / Stats / map transition) holds focus
 *    and an ACTION press is currently inert. Dialogue is the exception: ACTION
 *    stays live there to advance the line, so it reads 'available'.
 *  - available: dialogue is open (advance), or a nearby interactable can be
 *    triggered right now.
 *  - inactive: nothing to do at the current position.
 */
export function resolveActionButtonState(input: {
  busy: boolean;
  dialogueOpen: boolean;
  hasNearbyTarget: boolean;
}): ActionButtonState {
  if (input.busy && !input.dialogueOpen) return 'disabled';
  if (input.dialogueOpen || input.hasNearbyTarget) return 'available';
  return 'inactive';
}
