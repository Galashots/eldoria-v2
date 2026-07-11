# Realm of Eldoria v2

A Phaser + Vite + Tiled fantasy-learning RPG designed for Grade 2 and Grade 5 players.

## Play on iPad or in a browser

[Open Realm of Eldoria v2](https://galashots.github.io/eldoria-v2/)

On iPad, open the link in Safari and turn the device to landscape. Use Safari's Share menu and **Add to Home Screen** for a game-like launcher icon.

Browser viewport coverage is not the same as physical-iPad validation. See the [real-child playtest guide](docs/REAL_CHILD_PLAYTEST_GUIDE.md) for supervised device testing.

## Core design rule

**Learning never gates adventure.**

Learning may provide optional bonuses such as extra harvest, gold, combat help, clues, cosmetics, pets, mounts, or convenience rewards. Wrong answers and skipped prompts never block movement, quests, baseline rewards, retries, exploration, or story progress.

## Current profiles

- **Grade 2 Mage:** audio-first, short prompts, read-aloud support, simple choices, and clear magical feedback.
- **Grade 5 Ranger Explorer:** reader-mode, richer clues and reasoning, tracking and tactical presentation. The stable internal profile ID remains `grade5-adventurer`.

## Stack

- Phaser 4
- Vite
- TypeScript
- Tiled JSON maps
- Local-first browser saves
- GitHub Pages static deployment

## Quick start

Use the lockfile for a reproducible setup:

```bash
npm ci
npm run dev
```

Use `npm install` only when intentionally changing dependencies or the lockfile. Open the local URL printed by Vite.

## Controls

- Arrow keys / WASD: move
- Space / E: interact
- I / Tab or the on-screen **STATS** button: toggle Stats & Mastery
- Touch: drag in the lower-left area to move and tap **ACTION** in the lower-right to interact

## Current vertical slice

- 960×640 internal canvas with pixel-art rendering and landscape tablet support
- Short, skippable first-run Waking Gate action scene for both profiles
- Tiled farm with movement, collision, camera follow, objectives, and persistent saves
- Mira's first errand, Whispering Scarecrow, and Sleepy Sprouts
- Optional crop and three-hit Practice Slime learning bonuses
- Optional Wildbloom Sprig discovery loop with profile-specific reveal abilities
- Production Grade 2 Mage and Practice Slime presentation assets
- Ranger Explorer bridge presentation pending dedicated production sprites
- Stats & Mastery panel with gold, keepsakes, and per-skill progress
- GitHub Actions validation, browser smoke tests, visual-playtest artifacts, and deployment from verified `main`

For volatile implementation status and the active milestone, read [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).

## Verification

```bash
npm ci
npm run check
npm run test:asset-pipeline
npm run test:unit
npm run smoke
```

`npm run check` includes visual-target validation, type checking, and the production build. The production site is written to `dist/`.

## Documentation

Start with [`docs/README.md`](docs/README.md).

- [`AGENTS.md`](AGENTS.md) — durable product, workflow, testing, and merge rules
- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — active milestone, current capabilities, and risks
- [`docs/VISUAL_ASSET_CONTRACT.md`](docs/VISUAL_ASSET_CONTRACT.md) — visual production contract
- [`docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`](docs/art-pipeline/SPRITE_ASSET_PIPELINE.md) — asset normalization pipeline
- [`docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`](docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md) — approved beautification phases

## Tiled workflow

Use `public/maps/eldoria.tiled-project` in Tiled. The current farm map is `public/maps/farm.json`.

Recommended layers:

1. `Ground`
2. `Decor`
3. `Collision`
4. `Objects`

Use object properties and stable `interactionId` values for gameplay metadata instead of coupling behavior to display labels.
