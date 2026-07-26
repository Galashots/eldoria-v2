// Shared spot table for the world-actor depth (y-sort) before/after evidence,
// used by capture-world-depth-evidence.mjs and
// build-world-depth-contact-sheet.mjs so the capture set and the sheet can
// never drift apart.
//
// Every spot stands the hero a fixed distance up-map or down-map of a Farm
// actor that used to have a fixed render depth, at the same x offset, so the
// only thing that differs between the before and after passes is which sprite
// wins the overlap.
//
// Ground contact is what sorts, and the hero's ground contact is its physics
// sprite's displayed bottom — 32 world px below the sprite's centre y (a
// 32x32 frame at GAME_SCALE 2, centre origin). The positions below are
// therefore hero *centres*; the comment on each gives the resulting ground y.

/** Practice Slime ground contact (Tiled 704,320 at GAME_SCALE 2). */
export const SLIME_GROUND = { x: 1408, y: 640 };

/**
 * Mira ground contact (Tiled 416,256 at GAME_SCALE 2), on the ground ellipse
 * her silhouette is drawn standing on (local y 5) rather than her anchor.
 */
export const MIRA_GROUND = { x: 832, y: 522 };

/** Up-map/down-map offset used by every spot, in world px. */
const OFFSET = 20;
/** Sideways offset, so both sprites stay partly visible in the overlap. */
const SIDE = 16;
/** Hero centre y -> ground y. */
const HERO_GROUND_DROP = 32;

const spot = (name, anchor, direction, expectation) => ({
  name,
  anchor,
  player: {
    x: anchor.x + SIDE,
    y: anchor.y + direction * OFFSET - HERO_GROUND_DROP
  },
  expectation
});

export const WORLD_DEPTH_EVIDENCE_SPOTS = [
  spot(
    'slime-north',
    SLIME_GROUND,
    -1,
    // Before: the slime was pinned at depth 2, under the hero's fixed 3, so
    // the hero drew over it from up-map too. After: the slime wins.
    'hero stands up-map of the Practice Slime, so the slime draws in front'
  ),
  spot(
    'slime-south',
    SLIME_GROUND,
    +1,
    'hero stands down-map of the Practice Slime, so the hero draws in front'
  ),
  spot(
    'mira-north',
    MIRA_GROUND,
    -1,
    'hero stands up-map of Mira, so Mira draws in front'
  ),
  spot(
    'mira-south',
    MIRA_GROUND,
    +1,
    // Before: Mira was pinned at 3.5, over the hero's fixed 3, so she drew
    // over the hero from down-map too. After: the hero wins.
    'hero stands down-map of Mira, so the hero draws in front'
  )
];

export const WORLD_DEPTH_EVIDENCE_SPOT_NAMES = WORLD_DEPTH_EVIDENCE_SPOTS.map((s) => s.name);

export const WORLD_DEPTH_EVIDENCE_PROFILES = [
  { id: 'grade2-mage', label: 'mage', clickAt: [480, 232] },
  { id: 'grade5-adventurer', label: 'ranger', clickAt: [480, 368] }
];

/** Crop window around the overlap, in game-logical px. */
export const CROP = { width: 176, height: 168 };
/** Nearest-neighbour magnification applied to each cropped cell. */
export const CELL_ZOOM = 2;
