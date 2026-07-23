#!/usr/bin/env node
// Single source of truth for the Farm scatter before/after evidence capture
// set — shared between scripts/capture-farm-scatter-evidence.mjs (produces
// these captures) and scripts/build-farm-scatter-contact-sheet.mjs (validates
// and assembles them), so the required capture name set cannot silently
// drift between the two scripts.
export const FARM_SCATTER_EVIDENCE_PROFILES = ['mage', 'ranger'];

// World-px camera-centre spots covering the required evidence set: arrival,
// routes/gate mouths, Mira, crop area, Practice Slime, Wildbloom discovery
// locations, and a wide Farm overview. HUD/objective/ACTION readability is
// screen-space and appears in every shot, so it needs no dedicated spot.
export const FARM_SCATTER_EVIDENCE_SPOTS = [
  // The real arrival position (mirrors MAP_REGISTRY.farm.spawns.default in
  // src/data/maps.ts, duplicated as a plain constant here for the same
  // reason GAME_WIDTH/GAME_HEIGHT are duplicated in the capture script: it
  // runs under plain node, not Playwright's TS-aware runner). Giving this
  // spot its own explicit reset — like every other named spot below — means
  // it can never inherit camera/position state left over from a prior spot.
  ['farm-spawn-arrival', [320, 512]],
  ['wide-farm-overview', [960, 640]],
  ['route-west-gate-village', [220, 640]],
  ['route-east-gate-woods', [1700, 640]],
  ['mira-interaction', [864, 544]],
  ['crop-area', [480, 864]],
  ['practice-slime-area', [1440, 672]],
  ['wildbloom-root-star', [1120, 288]],
  ['wildbloom-moonwell-echo', [672, 960]],
  ['wildbloom-foxfire-seed', [1600, 928]]
];

export const FARM_SCATTER_EVIDENCE_SPOT_NAMES = FARM_SCATTER_EVIDENCE_SPOTS.map(([name]) => name);
