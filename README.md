# Realm of Eldoria v2

A Phaser + Vite + Tiled fantasy-learning RPG for Grade 2 and Grade 5 players.

## Play on iPad or in a browser

[Open Realm of Eldoria v2](https://galashots.github.io/eldoria-v2/)

On iPad, open the link in Safari, turn the device to landscape, and use Safari's Share menu → **Add to Home Screen** for a game-like launcher.

Browser viewport coverage and emulation are not physical-iPad certification. See the [real-child playtest guide](docs/REAL_CHILD_PLAYTEST_GUIDE.md) for supervised device testing.

## Product mission

Eldoria should feel like a polished fantasy RPG that children voluntarily return to because the heroes feel powerful, the world changes, mysteries invite exploration, relationships advance, and every short session creates permanent progress.

**Learning never gates adventure.** Wrong answers and skipped prompts never block movement, quests, baseline rewards, retries, exploration, or story progress.

The stable product and world direction lives in [`docs/ELDORIA_MASTER_PLAN.md`](docs/ELDORIA_MASTER_PLAN.md).

## Hero profiles

- **Grade 2 Mage:** audio-first, short prompts, read-aloud support, simple choices, magical sensing, and clear spell feedback.
- **Grade 5 Ranger Explorer:** reader-mode, richer clues and reasoning, tracking, archery, map sense, and tactical presentation. The stable internal profile ID remains `grade5-adventurer`.

## Current playable world

- 960×640 internal canvas with pixel-art rendering and landscape-tablet support
- Short, skippable Waking Gate action opening for both profiles
- Three connected Tiled maps: **The Farm**, **Wildbloom Woods**, and **Eldoria Village**
- Persistent local saves, cross-map travel, objective guidance, and quest state
- Mira's errands, Whispering Scarecrow, Sleepy Sprouts, Baker Pell's Berry Order, and world flavor interactions
- Optional crop, Practice Slime, and contextual learning bonuses
- Optional Wildbloom Sprig discovery loop with profile-specific reveal abilities
- Stats & Mastery with gold, keepsakes, per-skill progress, and adaptive prompt difficulty
- Offline-capable PWA behavior plus browser smoke and iPad-emulation regression suites
- Production Mage and Practice Slime presentation, with Ranger/NPC/creature perspective rebuilds planned against the new visual lock

For exact volatile status, active work, and known risks, read [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).

## Visual direction

The owner-approved reference establishes a painterly, layered fantasy target with:

- elevated three-quarter perspective;
- authored paths and landmarks;
- quiet ground plus rich Decor, structures, canopy, and atmosphere;
- coherent palette, materials, light, and shadows;
- characters embedded in the same camera as the environments;
- readable fantasy UI that preserves the world.

The visual-production subplan is [`docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`](docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md).

Production characters, NPCs, creatures, equipment, and armor must follow [`docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md). Current direct-to-camera downward facings are transitional.

## Stack

- Phaser 4
- Vite
- TypeScript
- Tiled JSON maps
- Local-first browser saves
- GitHub Pages static deployment
- Playwright browser and iPad-emulation suites

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

## Verification

CI's build surface runs:

```bash
npm ci
npm run check
npm run test:visual-targets
npm run test:asset-pipeline
npm run test:terrain-blend
npm run test:unit
npm run smoke
```

Production-build iPad/PWA emulation runs separately:

```bash
npm run test:emulation
```

`npm run check` validates committed visual targets, type checks, builds, verifies PWA/generated surfaces, and requires deterministic generated files to remain clean.

## Documentation

Start with [`docs/README.md`](docs/README.md), which routes each task to the minimum authoritative reading set.

Key authorities:

- [`AGENTS.md`](AGENTS.md) — product invariants, workflow, evidence, review, and merge rules
- [`docs/ELDORIA_MASTER_PLAN.md`](docs/ELDORIA_MASTER_PLAN.md) — stable product, world, engagement, progression, and strategic direction
- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — active milestone, current capabilities, next steps, and risks
- [`docs/VISUAL_ASSET_CONTRACT.md`](docs/VISUAL_ASSET_CONTRACT.md) — durable visual-production contract
- [`docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md) — elevated production-sprite projection
- [`docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`](docs/art-pipeline/SPRITE_ASSET_PIPELINE.md) — deterministic source-to-runtime asset pipeline

## Licensing

The source code, build scripts, tests, and code-focused technical documentation are available under the [MIT License](LICENSE).

Eldoria's original art, audio, narrative, characters, setting, curriculum wording, screenshots, and other creative game content are not included in that MIT grant unless a file explicitly says otherwise. See [`ASSET_LICENSE.md`](ASSET_LICENSE.md) for creative-content terms and [`ATTRIBUTION.md`](ATTRIBUTION.md) for third-party or placeholder-asset records.

## Tiled workflow

Use `public/maps/eldoria.tiled-project` in Tiled.

Standard map layers:

1. `Ground`
2. `Decor`
3. `Collision`
4. `Objects`

Use object properties and stable `interactionId` values for gameplay metadata instead of coupling behavior to display labels.
