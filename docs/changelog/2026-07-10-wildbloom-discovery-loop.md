# Wildbloom Sprig Discovery Loop — 2026-07-10

## Player-facing changes

- The Wildbloom Sprig now hums and glows near three hidden magical places in the farm.
- The Mage reveals secrets with a blue-violet magic cast.
- The Ranger Explorer reveals secrets with a green-gold tracking shot.
- Each hidden place becomes a permanent named landmark with a short lore reveal.
- Finding all three completes the Wildbloom song with a larger visual celebration.
- Mira now has a small world-space character silhouette beneath her quest marker rather than appearing only as a plain marker.

## Engineering changes

- Added `WildbloomDiscoveryController` as the focused owner of proximity sensing, input locking, profile-specific effects, reveal presentation, and discovery persistence.
- Integrated the controller through `PolishedWorldScene` callbacks instead of adding the feature to the core `WorldScene` implementation.
- Reused the existing optional inventory record for three additive discovery keys; save version remains 1 and no migration was added.
- Added browser coverage for Mage and Ranger sensing/reveal paths, three-discovery persistence, and no-Sprig dormancy.
- Added CI upload coverage for `discovery-*.png` visual-playtest evidence.

## Guardrails preserved

- No existing quest, curriculum, mastery, gold, or reward behavior was changed.
- No random loot, countdown, streak, daily-pressure, or variable-reward mechanic was added.
- No player damage, fail state, enemy AI, or quest #4 was added.
- The discoveries remain optional and never gate adventure progress.

## Verification

- `npm run check`: passed.
- Asset-pipeline tests: passed.
- Unit tests: passed.
- Full Playwright browser suite: passed.
- Mage and Ranger discovery screenshot sequences were captured and inspected before merge.
