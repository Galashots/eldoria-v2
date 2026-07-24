import { describe, expect, it } from 'vitest';
import {
  ACTION_BUTTON_PALETTE,
  resolveActionButtonState,
  type ActionButtonState
} from '../../src/presentation/actionButtonState';

describe('resolveActionButtonState', () => {
  it('is disabled while a non-dialogue modal (prompt/Stats/transition) holds focus', () => {
    expect(resolveActionButtonState({ busy: true, dialogueOpen: false, hasNearbyTarget: false })).toBe('disabled');
    // Even with a target underneath, a modal makes an ACTION press inert.
    expect(resolveActionButtonState({ busy: true, dialogueOpen: false, hasNearbyTarget: true })).toBe('disabled');
  });

  it('stays available during dialogue because ACTION advances the line', () => {
    expect(resolveActionButtonState({ busy: true, dialogueOpen: true, hasNearbyTarget: false })).toBe('available');
  });

  it('is available when a nearby interactable can be triggered', () => {
    expect(resolveActionButtonState({ busy: false, dialogueOpen: false, hasNearbyTarget: true })).toBe('available');
  });

  it('is inactive with nothing to do at the current position', () => {
    expect(resolveActionButtonState({ busy: false, dialogueOpen: false, hasNearbyTarget: false })).toBe('inactive');
  });

  it('gives every base state a distinct fill so the four states are visually separable', () => {
    const states: ActionButtonState[] = ['available', 'inactive', 'disabled'];
    const fills = states.map((s) => ACTION_BUTTON_PALETTE[s].fill);
    expect(new Set(fills).size).toBe(states.length);
    // Available reads brightest (highest touch alpha); disabled the dimmest.
    expect(ACTION_BUTTON_PALETTE.available.touchAlpha).toBeGreaterThan(ACTION_BUTTON_PALETTE.inactive.touchAlpha);
    expect(ACTION_BUTTON_PALETTE.inactive.touchAlpha).toBeGreaterThan(ACTION_BUTTON_PALETTE.disabled.touchAlpha);
  });
});
