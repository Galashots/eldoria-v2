// Shared #rrggbb hex-color pattern for the asset/visual-target tooling
// scripts, so validate-visual-targets.mjs and normalize-asset-sheet.mjs
// can't silently drift on what counts as a valid hex color.
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
