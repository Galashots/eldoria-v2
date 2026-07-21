# Eldoria-V2 Current State

**Last verified `main`:** `a4f90d3509946f876410e05ca514d59ab769f1e8` (PR #123 merged, 2026-07-21)  
**Stable product direction:** [`ELDORIA_MASTER_PLAN.md`](ELDORIA_MASTER_PLAN.md)  
**Repository rules:** [`../AGENTS.md`](../AGENTS.md)

This file is the only authority for volatile capability status, the active milestone, immediate work, known risks, and outstanding device evidence. Detailed implementation history belongs in PRs, audits, subsystem documents, and the changelog.

## Product invariant

**Learning never gates adventure.** Wrong answers and skipped prompts do not block movement, exploration, quest progress, baseline rewards, retries, or story progression.

## Playable build

- Phaser 4 + Vite + TypeScript + Tiled, with a `960×640` internal canvas.
- Grade 2 audio-first **Mage** and Grade 5 reader-mode **Ranger Explorer** profiles. Stable IDs remain `grade2-mage` and `grade5-adventurer`.
- Short skippable Waking Gate action opening for fresh profiles.
- Three connected maps: **The Farm**, **Wildbloom Woods**, and **Eldoria Village**, with reciprocal gates, entry banners, persistent current map, and validated objective routing.
- Keyboard and touch movement, dynamic joystick, ACTION button, portrait guidance, Stats & Mastery, global mute, read-aloud, music ducking, dialogue typewriter, and read-aloud blips.
- Mira's three errands, Whispering Scarecrow, Sleepy Sprouts, Baker Pell's Berry Order, optional crop and Practice Slime learning bonuses, and post-purpose flavor interactions.
- Permanent Practice Slime defeat with save-safe quest routing.
- Wildbloom Sprig discovery loop with three persistent secrets and profile-specific reveal abilities.
- Persistent save version 2: quest state, inventory, gold, keepsakes, player position/map, and mastery; tested v1→v2 coordinate migration.
- Adaptive per-skill optional-prompt difficulty; wrong answers ease difficulty and never block rewards or adventure.
- Offline-capable PWA service worker and deterministic app icons.
- GitHub Pages deployment from verified `main`.

## Current presentation

### Runtime-integrated

- Directional Mage idle/walk/cast/hurt sheets with fixed per-clip scaling and cleaned source rectangles.
- Practice Slime production presentation.
- Bridge presentation for Ranger Explorer, Mira, several NPC/landmark elements, markers, shadows, projectiles, and effects.
- Farm terrain proof using approved grass, dirt, water, all 12 dirt transitions, and all 12 shoreline transitions through a deterministic resolver.
- Batch 1 feel/readability: interaction affordances, press feedback, typewriter dialogue, readable marker glyphs/names, panel pops, and corrected Stats CLOSE layering.

### Approved source/runtime masters not fully integrated

| Family | Status |
| --- | --- |
| grass base | `grass_a`, `grass_b`, `grass_c` approved |
| dirt | centre plus complete 13-cell blend family approved; transition cells integrated on Farm |
| water | `water_a`, `water_b` plus complete 13-cell shoreline family approved; transition cells integrated on Farm |
| Farm anchors | oak, horizontal fence segment, medium rock, revealed Root-Star approved |
| Batch A family gate | seven-anchor contact sheet approved |

Detailed asset audit records remain under `docs/art-pipeline/review/`.

### Deterministic Decor-scatter primitive

PR #122 is merged. The repository now contains:

- `src/systems/decorScatter.ts` — pure seeded placement;
- `src/systems/decorExclusions.ts` — static eligibility derived from Ground/Collision/Decor/Objects data, registry collision/spawns, and Wildbloom constants;
- `src/data/wildbloomSpots.ts` — Phaser-free spot source of truth;
- a full 38-placement farm plan pinned by unit tests.

The primitive is **not scene-integrated** and causes no runtime visual change. Integration waits for approved `tile_farm_grass_scatter` masters and a configuration/wiring PR with in-game density evidence.

## Visual direction and character status

The active visual target is painterly, layered fantasy pixel art with an elevated three-quarter camera, authored landmarks, quiet ground, rich Decor/structure/canopy layers, coherent materials, and restrained atmosphere.

The governing visual authorities (merged in PR #123) are:

- `docs/ELDORIA_MASTER_PLAN.md` — stable product/world authority;
- `docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md` — current visual-transformation subplan;
- `docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md` — binding elevated three-quarter projection.

The current direct-to-camera downward hero facings are transitional. Production Mage, Ranger, Mira, NPC, creature, equipment, and armor families must be rebuilt or re-authored where necessary to share the environments' elevated projection.

Do not begin substantial armor or outfit production until base perspective, proportions, pivots, sockets, and clip timing are approved and frozen.

Asset production now follows the **derive-over-generate production classes** (owner-adjudicated 2026-07-21, `CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md`): `anchor` (full ceremony), `derived` (recipe-level approval from locked inputs), and `procedural` (runtime presentation, judged in-game), declared per target as `productionClass`. Declared values are enum-validated by the visual-target validator; unclassified legacy targets are classified when they enter their next production batch.

## Active milestone

**Layered Farm foundation plus character-perspective preparation.**

The immediate goal is to establish the missing visual layers that create the reference look while preparing a bounded four-direction sprite perspective proof.

### Next work

1. **Approve the first grass-scatter art family (first mixed anchor/derived recipe pilot)**
   - the family remains anchor-gated: `tuft_a`, `flower_a`, `pebble_a` as independently approved anchors; `tuft_b` as a deterministic derived sibling of `tuft_a`;
   - the `tuft_b` recipe is the first exercise of the derived recipe-level gate: recipe-level approval with applicable machine gates, full-family contact sheet, one family verdict;
   - no scene integration until the family passes.

2. **Run the first character perspective trial** — in parallel, not gated on environment completion
   - one identity, four idle directions, neutral outfit;
   - compare same-sheet versus direction-anchored generation when practical;
   - judge exact runtime pixels on bright Farm and darker Woods backgrounds;
   - choose size/prompt strategy before commissioning complete animation families.

3. **Wire the decor-scatter primitive into the Farm scene** (config-only swap once the scatter family passes)
   - density, weighting, and invalid-config handling resolved in the wiring PR;
   - in-game density and spacing evidence required.

## Known risks and deferred work

- The Farm still lacks most production vegetation, fences, structures, props, crops, shoreline decals, canopy/border massing, and final composition.
- Wildbloom Woods and Eldoria Village still use bridge terrain, structures, character art, and shared placeholder music.
- Ranger Explorer and Mira require dedicated production sheets.
- Mage sheets need re-evaluation against the new elevated perspective lock even though their scale-normalization defect was repaired.
- Current armor targets remain pre-production and must not advance ahead of the perspective-locked bases.
- Production fantasy UI, final licensed audio, broader world restoration, codex/customization loops, and additional zones remain future milestones.
- PR #112 Vercel migration remains owner-gated; GitHub Pages stays the child-playtest origin until an explicit cutover/save decision.

## Verification baseline

The repository's PR CI currently requires:

- `build`: repository check, target/pipeline/terrain/unit tests, and full browser smoke;
- `emulation`: production-build offline-PWA and iPad-fidelity suites;
- `deploy`: push-to-`main` only.

PR #122 exact head passed `build` and `emulation` before merge.

## Outstanding physical evidence

Not yet certified on a physical iPad after the latest world, PWA, dialogue, and visual changes:

- standalone/Add-to-Home-Screen chrome and safe areas;
- touch comfort and latency;
- real WebKit audio/read-aloud behavior;
- memory and thermal stability over a normal session;
- final character/environment perspective;
- child comprehension, remembered goals, voluntary continuation, and return interest.

Browser automation and emulation remain regression evidence, not physical-device or child validation.
