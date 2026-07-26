# Eldoria-V2 Current State

**Last verified `main`:** `30e4467c9b4717f04f5f560b37cd09b881c08962` (PR #137 merged, 2026-07-25)  
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
- Keyboard and touch movement; a dynamic joystick bounded to a lower-left corner zone (not the whole lower-left quadrant); a four-state ACTION button (inactive / available / pressed / disabled-busy); ambient HUD guidance that dims while a modal holds focus; portrait guidance, Stats & Mastery, global mute, read-aloud, music ducking, dialogue typewriter, and read-aloud blips. Two active touch pointers are configured (gameConfig `input.activePointers`) so movement and ACTION can be pressed at once.
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
- World actors (hero, Practice Slime, Mira) render in a shared feet-sorted depth band (`src/systems/worldDepth.ts`) rather than at fixed depths, so whoever stands further down the map draws in front. Ground shadows stay below the band and floating quest indicators stay above it.
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

2. ~~Persistent transient-message lifecycle plus confirmed Sleepy Sprout/world-label depth repair~~ — fixed: `Old magic is stirring nearby.` was a permanent `formatHint()` substitution (it never expired because the base hint returns to the same idle string constantly during ordinary play), replaced with a one-shot toast fired once on gate arrival; the confirmed depth conflict was world-space target markers/labels (depth 3) rendering behind the screen-fixed hint/objective HUD bars (depth 21) whenever they overlapped on screen — raised to depth 22. Objective ghosting remains investigation-only (not yet confirmed actionable). The unproved STATS badge report is not actionable until reproduced.

3. ~~Dialogue/feedback handoff cleanup~~ — fixed: the post-prompt outcome toast held+faded for ~2.3s total, long enough that a player who moved away immediately after answering saw it as a leftover panel competing with already-resumed movement and the next objective. The shortened ~1.4s "quick" timing is scoped (PR #136 amendment) to the two prompt-close hand-offs only, and on the answer path only when the answer was correct: correct-answer and skip outcomes use the quick ~1.4s timing, while a wrong-answer outcome (which carries the prompt's possibly-long Grade 2 hint text) keeps the original ~2.3s default, as does every other toast (flavor, quest/reward, the practice-offer CTA).

4. ~~Practice Slime input-reliability investigation~~ — **investigation complete; not a defect.** Reproduced across all three ordinary input paths named in the audit — keyboard Space, the on-screen ACTION control (real touch tap), and real touch under iPad emulation (`tests-emulation/practice-slime-touch.spec.ts`) — inspecting actual hit-state transitions, not animation. Deliberately spaced strikes land all three hits and complete on every path. The single-slot buffered-strike that drops rapid mash input beyond one buffered slot is intentional anti-mash / anti-hold-to-win design (documented and tested in `tests/practice-slime-encounter.spec.ts`), and matches the reported "animated but didn't advance" symptom. No deterministic ordinary-player input is lost, so combat is unchanged.

5. **D4 — Run the first character perspective trial** — parallel art lane, not gated on items 2–4
   - one neutral Mage identity, four idle directions only; same-sheet versus direction-anchored generation;
   - the evidence harness is merged (PR #127) and ready; this task now awaits the exact candidate-PNG handoff for processing through the merged harness;
   - judged on exact runtime pixels on bright Farm and darker Woods plates;
   - choose size/prompt strategy before commissioning complete animation families.

6. ~~HUD/touch-control consolidation~~ — delivered ([PR #137](https://github.com/Galashots/eldoria-v2/pull/137), merged 2026-07-25): the dynamic joystick now activates only from a bounded lower-left corner zone (`src/presentation/joystickZone.ts`, ~323×274 CSS px at 1194×834) instead of the whole lower-left quadrant, and a touch on any fixed control (ACTION/STATS/mute/dialogue/prompt/Stats-CLOSE) no longer engages it; ACTION has four distinct states — inactive, available, pressed, disabled/busy (`src/presentation/actionButtonState.ts`); ambient HUD guidance (header, objective, hint) dims while a modal holds focus while staying present, keeping one visible objective layer and one ambient-hint layer without collapsing the WorldScene-authority/PolishedWorldScene-presentation split; two active touch pointers are configured (gameConfig `input.activePointers`) so movement and ACTION can be pressed together. Proven through real Chromium-emulation touch input (`tests-emulation/touch-golden-journey.spec.ts`, `tests-emulation/support/touch.ts`) plus Phaser-free unit gates; both profiles retain their guidance and Grade 2 keeps READ ALOUD. Physical-iPad and WebKit validation remain outstanding.

7. **Stats & Mastery / Profile Select production presentation** — deferred until approved D4 identity art/portraits are available; not blocking D4.

9. **Eldoria Village's first structure** — on `claude/village-shop-structure` (stacked on the y-sort branch), `HOLD` for the owner's visual verdict. The nine approved `tile_village_shop_*` runtime masters had never been loaded by the game; they now compose Baker Pell's shop, sorted into the actor band with only its bottom two rows solid so the roof overhangs walkable ground and the hero can be hidden behind it. **Owner decision, 2026-07-26 (Leo, in session): structures are actors, not terrain** — every building and tall prop Y-sorts against the hero, recorded in [`VISUAL_ASSET_CONTRACT.md`](VISUAL_ASSET_CONTRACT.md) "Buildings and props" and applied by correcting the shop wall/door targets from `terrain` to `actors_body` (the value tall vegetation and props already used). **Correction to an earlier claim in this file:** I first reported that `tile_village_shop_roof` had no declared target. It does — in its own `docs/visual-targets/village_shop_roof_target.json`, not alongside the wall and door — and I had not looked for a per-family target file. All three families are now `actors_body`. **The real loose thread** is that the roof target declares `collision.solid: true`, while the shipped composition deliberately makes only the bottom two rows solid so the roof can overhang and occlude; reconciling that declaration with the composition is an owner question. Evidence: [`docs/playtests/2026-07-25-village-shop/`](playtests/2026-07-25-village-shop/).

8. **World-actor depth sorting (y-sort)** — delivered on `claude/world-depth-ysort`, owner-requested 2026-07-25 outside the audit queue. The hero, the Practice Slime, and Mira sat at hardcoded depths (3, 2, 3.5), an order that was right from one side and wrong from the other; they now share a feet-sorted band (`src/systems/worldDepth.ts`). Prerequisite for any occluding structure the hero should be able to walk behind; the Village shop (item 9) is the first one, landed on the stacked branch. Evidence: [`docs/playtests/2026-07-25-world-depth/`](playtests/2026-07-25-world-depth/).

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

## Known documentation debt (found by audit, 2026-07-26)

A sweep after the Y-sort and structures-are-actors work found roughly forty statements
across the planning documents that the code has outgrown. The actively misleading ones
were corrected: `MAP_AUTHORING.md` told authors to put walk-behind trees on a `Decor`
layer (which draws beneath every actor and cannot occlude anything — exactly the pattern
the owner rejected), and two target documents asserted that no Y-sort implementation
existed. The rest is recorded here rather than fixed, because most of it is not a
documentation problem:

- **The target schema cannot express an integrated asset.** `scripts/validate-visual-targets.mjs`
  *requires* every target to declare `status: "target_only"` and to carry a note reading
  "Specification only" or "No runtime behavior". Three families — `tile_village_shop_wall`,
  `_door`, `_roof` — are now runtime-integrated with live collision, so their own metadata
  contradicts reality and **cannot be corrected without changing the validator's contract**,
  which is an owner-gated decision. `docs/README.md` already defines a
  `RUNTIME-INTEGRATED ASSET` verdict the machine schema has no way to record.
- **The validator does not check `renderLayer` against the visual contract.** That is how
  `tile_village_shop_roof` kept declaring `terrain` after the owner ruled structures are
  actors. A unit gate in `tests/unit/villageShopBuilding.test.ts` now covers the shop
  families specifically; a general rule would belong in the validator.
- Several roadmap documents still sequence Village production art behind Farm completion
  (`ELDORIA_MASTER_PLAN.md` §11 step 6, `beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`
  Phase F), which the shop shipped ahead of. The master plan also has no place for renderer
  capabilities such as depth sorting — its depth vocabulary describes authored art strata only.
- `docs/AUDIT_AND_GAME_PLAN_2026-07.md` and `docs/art-pipeline/VILLAGE_ART_GAP_ASSESSMENT_2026-07-19.md`
  describe farm/village tile art as spec-only, which stopped being true when the terrain
  proof, the grass scatter, and now the shop were integrated.
