import { sx, sy } from '../gameDimensions';

/**
 * Wildbloom Sprig secret-spot definitions (fixed farm world positions).
 *
 * Extracted from `presentation/WildbloomDiscoveryController.ts` for the
 * decor-scatter exclusion derivation (issue #120, audit Q7): the decor
 * tooling runs under Node, where importing the Phaser-dependent controller
 * crashes (`window is not defined`). This module is deliberately Phaser-free
 * — same convention as `gameDimensions.ts` — so unit tests and deterministic
 * tooling can read the spot positions straight from the source of truth.
 *
 * The positions are static code constants (not map data); only spot
 * *visibility* is save-dependent (the controller gates indicators/reveals on
 * the `wildbloomSprig` inventory flag).
 */

export type WildbloomSpotId = 'root-star' | 'moonwell-echo' | 'foxfire-seed';

export type WildbloomSpotDefinition = {
  id: WildbloomSpotId;
  name: string;
  inventoryKey: string;
  x: number;
  y: number;
  accent: number;
  secondary: number;
  lore: string;
  rune: 'star' | 'waves' | 'flame';
};

export const WILDBLOOM_SPOTS: readonly WildbloomSpotDefinition[] = [
  {
    id: 'root-star',
    name: 'Root-Star Sigil',
    inventoryKey: 'wildbloomSecretRootStar',
    x: sx(560),
    y: sy(144),
    accent: 0xffd666,
    secondary: 0x8fd14f,
    lore: 'A tiny star was carved beneath the oldest roots.',
    rune: 'star'
  },
  {
    id: 'moonwell-echo',
    name: 'Moonwell Echo',
    inventoryKey: 'wildbloomSecretMoonwellEcho',
    x: sx(336),
    y: sy(480),
    accent: 0x9fd7ff,
    secondary: 0x8f63ff,
    lore: 'Silver ripples answer the Sprig from below the soil.',
    rune: 'waves'
  },
  {
    id: 'foxfire-seed',
    name: 'Foxfire Seed',
    inventoryKey: 'wildbloomSecretFoxfireSeed',
    x: sx(800),
    y: sy(464),
    accent: 0xa9e783,
    secondary: 0x72b95c,
    lore: 'A sleeping green flame remembers the first garden.',
    rune: 'flame'
  }
] as const;
