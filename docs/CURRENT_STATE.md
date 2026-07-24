# Eldoria-V2 Current State

**Last verified `main`:** `82b7f192e830922d0d1bf03fda833c0108c38ad4` (PR #131 and PR #69 merged, 2026-07-23)  
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
| grass scatter | all four variants — `tuft_a`, `tuft_b` (derived seed sibling), `flower_a`, `pebble_a` — approved runtime masters (PR #126; overnight owner-delegated visual gate, owner-confirmed 2026-07-22; `pebble_a` paints in `metal_stone`); ChatGPT's final visual confirmation is complete, no further visual confirmation is pending; scatter integrated on Farm |

Detailed asset audit records remain under `docs/art-pipeline/review/`.

### Deterministic Decor-scatter primitive

PR #122 is merged. The repository now contains:

- `src/systems/decorScatter.ts` — pure seeded placement;
- `src/systems/decorExclusions.ts` — static eligibility derived from Ground/Collision/Decor/Objects data, registry collision/spawns, and Wildbloom constants;
- `src/data/wildbloomSpots.ts` — Phaser-free spot source of truth;
- a full 38-placement farm plan pinned by unit tests.

PR #131 (merged), `claude/d3-farm-scatter-wiring` (D3), wires the primitive into the Farm scene against the approved `tile_farm_grass_scatter` family (`tuft_a`, `tuft_b`, `pebble_a`, `flower_a`; `docs/art-pipeline/review/tile_farm_grass_scatter_family/AUDIT.md`): `src/data/farmDecorScatterConfig.ts` composes the primitive with a `tuft_a:tuft_b:pebble_a:flower_a = 2:2:1:1` weighting (tufts combined 4:1 over flowers), and `WorldScene` renders it as Farm-only presentation Decor below every actor/marker/effect, with no collision body, no save-state, and no `farm.json` edit. This is a visible but restrained ground-texture change: direct sprite-pixel inspection of the already-approved art confirms tufts are 74% of the 38 placements (28/38) and are low-contrast dark-olive-green by design against the base grass, so the repetition-reduction effect is real and measurable but reads as subtle rather than dramatic; the pebble/flower accents (the other 26%) are clearly visible restrained accents. That subtlety is a property of the approved sprite art, not the weighting or wiring, and a future retune alone will not change it. Most Farm vegetation, props, structures, canopy, pond detail, and final composition remain incomplete (see "Known risks" below).

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

The full source is [issue #132](https://github.com/Galashots/eldoria-v2/issues/132) and its audit record, [`docs/playtests/PLAYTHROUGH_UI_AUDIT_2026-07-23.md`](playtests/PLAYTHROUGH_UI_AUDIT_2026-07-23.md). This section preserves only the accepted order.

1. ~~Reproduce and fix the Farm→Village transition failure~~ — fixed: the transition now works via ordinary held movement for both profiles and both directions (Collision-geometry-only fix; no gameplay/save/transition-logic change).

2. **Persistent transient-message lifecycle plus confirmed Sleepy Sprout/world-label depth repair**
   - correct the `Old magic is stirring nearby`-class message's lifetime at its source rather than offsetting the overlap;
   - fix only the demonstrated Sleepy Sprout/world-label depth-sorting defect;
   - Objective ghosting remains investigation-only (not yet confirmed actionable). The unproved STATS badge report is not actionable until reproduced.

3. **Dialogue/feedback handoff cleanup** — the Mira/learning-feedback layer must not linger visibly once movement and the next objective are already active.

4. **Practice Slime input-reliability investigation** — not yet a confirmed defect; reproduce deterministically before any fix.

5. **D4 — Run the first character perspective trial** — parallel art lane, not gated on items 2–4
   - one neutral Mage identity, four idle directions only; same-sheet versus direction-anchored generation;
   - the evidence harness is merged (PR #127) and ready; this task now awaits the exact candidate-PNG handoff for processing through the merged harness;
   - judged on exact runtime pixels on bright Farm and darker Woods plates;
   - choose size/prompt strategy before commissioning complete animation families.

6. **HUD/touch-control consolidation** — deferred design pass (not a bug-fix item); see the audit for acceptance criteria.

7. **Stats & Mastery / Profile Select production presentation** — deferred until approved D4 identity art/portraits are available; not blocking D4.

## Known risks and deferred work

- The Farm still lacks most production vegetation, fences, structures, props, crops, shoreline decals, canopy/border massing, and final composition.
- Wildbloom Woods and Eldoria Village still use bridge terrain, structures, character art, and shared placeholder music.
- Ranger Explorer and Mira require dedicated production sheets.
- Mage sheets need re-evaluation against the new elevated perspective lock even though their scale-normalization defect was repaired.
- Current armor targets remain pre-production and must not advance ahead of the perspective-locked bases.
- Production fantasy UI, final licensed audio, broader world restoration, codex/customization loops, and additional zones remain future milestones.
- The Vercel migration proposal (PR #112) is closed; GitHub Pages remains the deployment and child-playtest origin. Any future hosting cutover is a new owner decision with its own save-origin plan.
- Provider roster reduced to Claude Code + ChatGPT (owner decision 2026-07-22; operating guide v1.3). Reduced reviewer diversity; owner spot-checks are the backstop.
- Foundry GPT (ChatGPT's private pixel-art configuration/package) and its Preview tests are an external authoring tool for candidate source art only. They are not a repository blocker and not repository authority — repository status is governed solely by `main`, the documents in this repository, and owner/ChatGPT decisions recorded here and in the changelog.
- The Creative Bible reconciliation (narrative/world-document alignment) is tracked as a separate future documentation-only lane, not part of this PR or any current engineering task. It will not change current IDs, saves, quests, runtime behavior, or deployment names when it lands.

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
