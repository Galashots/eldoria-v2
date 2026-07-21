import { describe, expect, it } from 'vitest';
import {
  scatterDecor,
  type DecorPlacement,
  type DecorScatterConfig,
} from '../../src/systems/decorScatter';

const baseConfig: DecorScatterConfig = {
  width: 20,
  height: 15,
  seed: 'farm-v1',
  density: 0.1,
  excluded: new Set<string>(),
  decals: ['tuft_a', 'tuft_b', 'pebble_a', 'flower_a'],
};

function cellKey(p: DecorPlacement): string {
  return `${p.x},${p.y}`;
}

describe('scatterDecor determinism', () => {
  it('produces identical output for identical config (pure and repeatable)', () => {
    const a = scatterDecor(baseConfig);
    const b = scatterDecor(baseConfig);
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // fresh array, no shared mutable state
  });

  it('produces a different placement set for a different seed', () => {
    const a = scatterDecor(baseConfig);
    const b = scatterDecor({ ...baseConfig, seed: 'farm-v2' });
    expect(a).not.toEqual(b);
  });

  it('returns placements sorted by row then column for stable diffs', () => {
    const placements = scatterDecor(baseConfig);
    const sorted = [...placements].sort((p, q) => p.y - q.y || p.x - q.x);
    expect(placements).toEqual(sorted);
  });
});

describe('scatterDecor placement rules', () => {
  it('never places on excluded cells', () => {
    const excluded = new Set<string>();
    for (let x = 0; x < 20; x += 1) {
      for (let y = 5; y < 10; y += 1) {
        excluded.add(`${x},${y}`);
      }
    }
    const placements = scatterDecor({ ...baseConfig, excluded, density: 0.5 });
    for (const p of placements) {
      expect(excluded.has(cellKey(p)), `placed on excluded ${cellKey(p)}`).toBe(false);
    }
    expect(placements.length).toBeGreaterThan(0);
  });

  it('keeps every placement inside the grid', () => {
    const placements = scatterDecor({ ...baseConfig, density: 0.9 });
    for (const p of placements) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(baseConfig.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(baseConfig.height);
    }
  });

  it('never places two decals on the same cell', () => {
    const placements = scatterDecor({ ...baseConfig, density: 0.9 });
    const keys = placements.map(cellKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('places exactly round(density * eligibleCellCount) decals', () => {
    const excluded = new Set(['0,0', '1,0', '2,0']);
    const eligible = 20 * 15 - 3;
    const placements = scatterDecor({ ...baseConfig, excluded, density: 0.1 });
    expect(placements.length).toBe(Math.round(eligible * 0.1));
  });

  it('only assigns decals from the configured list, deterministically', () => {
    const a = scatterDecor(baseConfig);
    const b = scatterDecor(baseConfig);
    for (const [i, p] of a.entries()) {
      expect(baseConfig.decals).toContain(p.decal);
      expect(p.decal).toBe(b[i].decal);
    }
  });

  it('respects minSpacing as Chebyshev distance between placements', () => {
    const placements = scatterDecor({ ...baseConfig, density: 0.5, minSpacing: 2 });
    for (const p of placements) {
      for (const q of placements) {
        if (p === q) continue;
        const chebyshev = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
        expect(chebyshev).toBeGreaterThanOrEqual(2);
      }
    }
    expect(placements.length).toBeGreaterThan(0);
  });
});

describe('scatterDecor edge cases', () => {
  it('returns empty for zero density', () => {
    expect(scatterDecor({ ...baseConfig, density: 0 })).toEqual([]);
  });

  it('returns empty when every cell is excluded', () => {
    const excluded = new Set<string>();
    for (let x = 0; x < 20; x += 1) {
      for (let y = 0; y < 15; y += 1) {
        excluded.add(`${x},${y}`);
      }
    }
    expect(scatterDecor({ ...baseConfig, excluded, density: 0.5 })).toEqual([]);
  });

  it('throws on an empty decal list when density is positive', () => {
    expect(() => scatterDecor({ ...baseConfig, decals: [] })).toThrow();
  });
});
