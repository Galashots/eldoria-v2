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

/**
 * Historical coordinate conversion for save schema v1 -> v2.
 * Keep this explicit and immutable even if the runtime renderer scale changes
 * again in a later release; old saves must always migrate exactly once from
 * the original 480x320 world coordinate space into the 960x640 space.
 */
export const WORLD_COORDINATE_SCALE_V1_TO_V2 = 2;

/** Scales a screen-space pixel offset/size (not a GAME_WIDTH/HEIGHT-relative fraction) by GAME_SCALE. */
export const sx = (value: number): number => value * GAME_SCALE;
/** Scales a screen-space pixel offset/size (not a GAME_WIDTH/HEIGHT-relative fraction) by GAME_SCALE. */
export const sy = (value: number): number => value * GAME_SCALE;

/**
 * Scales a relative Phaser object-scale factor (e.g. a `.setScale()`/tween
 * `scale` value) onto the GAME_SCALE baseline, the same way `sx`/`sy` scale
 * a pixel offset. Use this instead of hand-multiplying by GAME_SCALE
 * wherever a scale factor (not a position/size) needs to sit on that
 * baseline, e.g. `sscale(0.2)` instead of `0.2 * GAME_SCALE`.
 */
export const sscale = (factor: number): number => factor * GAME_SCALE;

/**
 * Scales a legacy-design-space font size by GAME_SCALE and returns a
 * Phaser-ready px string, e.g. `fpx(12)` -> `'24px'`. Use this instead of
 * hand-doubling and writing out a literal px string, the same way `sx`/`sy`
 * cover pixel offsets — a future GAME_SCALE change only has to touch this
 * one function instead of every hardcoded font-size string.
 */
export const fpx = (legacySize: number): string => `${legacySize * GAME_SCALE}px`;
