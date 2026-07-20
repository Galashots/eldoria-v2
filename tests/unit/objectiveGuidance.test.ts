import { describe, expect, it } from 'vitest';
import type { MapId } from '../../src/data/maps';
import { resolveObjectiveGuidance } from '../../src/systems/objectiveGuidance';

describe('resolveObjectiveGuidance', () => {
  it('returns the interaction target for an objective on the current map', () => {
    expect(resolveObjectiveGuidance('farm', { map: 'farm', target: 'crop-bonus' }))
      .toEqual({ kind: 'local', target: 'crop-bonus' });
  });

  it('routes a village objective back to the farm exit', () => {
    expect(resolveObjectiveGuidance('eldoria-village', { map: 'farm', target: 'crop-bonus' }))
      .toEqual({ kind: 'exit', exitTo: 'farm' });
  });

  it('uses the farm as the first leg from the village to the woods', () => {
    expect(resolveObjectiveGuidance('eldoria-village', { map: 'wildbloom-woods', target: 'mossy-stone' }))
      .toEqual({ kind: 'exit', exitTo: 'farm' });
  });

  it('returns none without an objective', () => {
    expect(resolveObjectiveGuidance('farm', null)).toEqual({ kind: 'none' });
  });

  it('returns none when no route is declared', () => {
    expect(resolveObjectiveGuidance(
      'eldoria-village',
      { map: 'mossheart-ruins' as MapId, target: 'mossy-stone' }
    )).toEqual({ kind: 'none' });
  });
});
