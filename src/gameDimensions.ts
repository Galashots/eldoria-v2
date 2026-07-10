// Pure canvas-scale constants, deliberately kept free of any 'phaser' import.
// gameConfig.ts re-exports these for scene code; this module also lets
// Node-side tooling (Playwright test helpers) read the real GAME_WIDTH/
// GAME_HEIGHT without pulling in the Phaser package, which throws
// (`window is not defined`) outside a browser.

// Legacy 480x320 design space. A handful of scenes/VFX compositions are
// built once relative to these values and then rendered inside a container
// scaled by GAME_SCALE (see WorldScene/OpeningScene) instead of having every
// internal coordinate doubled by hand — using these constants (instead of
// the real GAME_WIDTH/GAME_HEIGHT below) for math that lives *inside* one of
// those scaled containers reproduces the exact original composition at 2x
// pixel density. Do not use these for anything rendered directly in real
// screen space; use GAME_WIDTH/GAME_HEIGHT for that.
export const LEGACY_GAME_WIDTH = 480;
export const LEGACY_GAME_HEIGHT = 320;

export const GAME_SCALE = 2;
export const GAME_WIDTH = LEGACY_GAME_WIDTH * GAME_SCALE;
export const GAME_HEIGHT = LEGACY_GAME_HEIGHT * GAME_SCALE;

/** Scales a screen-space pixel offset/size (not a GAME_WIDTH/HEIGHT-relative fraction) by GAME_SCALE. */
export const sx = (value: number): number => value * GAME_SCALE;
/** Scales a screen-space pixel offset/size (not a GAME_WIDTH/HEIGHT-relative fraction) by GAME_SCALE. */
export const sy = (value: number): number => value * GAME_SCALE;
