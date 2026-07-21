# Eldoria-V2 Current State

Last refreshed on 2026-07-21 after the **Batch 1 game feel & readability pass** (interactable affordances, button press feedback, typewriter dialogue, marker glyph/label pass, panel pops, stats CLOSE depth fix) — following the **Living World** milestone (M3: Eldoria Village, reusable profile-aware dialogue, the Berry Order registry quest, and validated cross-map objective guidance) — following the M2 multi-map foundation, game-feel + purposeful-interactions milestone, browser-test-only Phaser Canvas path (production stays on `Phaser.AUTO`), approved shoreline family (PR #99), and independently reviewed Kimi-K3 adaptive-difficulty, PWA, terrain-proof, and E2E-hardening bundle (PR #102). This file owns volatile project status; durable rules live in `AGENTS.md`, and the documentation map lives in `docs/README.md`.

## Product invariant

**Learning never gates adventure.** Wrong answers and skipped prompts do not block movement, exploration, quest progress, baseline rewards, retries, or story progression.

## Playable vertical slice

- Phaser 4, Vite, TypeScript, and Tiled maps.
- **Multi-map world**: three real maps — **The Farm**, **Wildbloom Woods**, and **Eldoria Village** — connected by reciprocal walk-into gates with fade transitions and map-name entry banners. Map specifics and validated `nextHop` objective routes live in `src/data/maps.ts`; exit geometry remains authoritative in each Tiled JSON. Authoring contract: `docs/MAP_AUTHORING.md`.
- **Eldoria Village**: a bounded 20×14 town map with a continuous farm road, solid border, plaza, Baker Pell, a notice board, and a well. Village flavor interactions never open learning prompts, and no shop art or economy system is integrated.
- **Your map persists**: the current map rides the pre-existing `lastArea` save field with no schema version bump — old saves (`lastArea: 'farm'`) and unknown values resolve to the farm, and quitting in the woods returns you to the woods.
- `960×640` internal canvas with `pixelArt`, `roundPixels`, `FIT`, and `CENTER_BOTH` preserved.
- Grade 2 audio-first **Mage** and Grade 5 reader-mode **Ranger Explorer** profiles. Stable IDs remain `grade2-mage` and `grade5-adventurer`.
- Fresh profiles enter a short, skippable **Waking Gate** action scene before the farm. Mage fires spell sparks; Ranger fires tracking shots. Returning saves enter the farm directly.
- Keyboard movement, dynamic lower-left joystick, lower-right **ACTION**, portrait-orientation guidance, and the **STATS** panel.
- **Tuned movement/camera feel** (2026-07 play feedback): 350 world px/sec max speed with light per-frame acceleration smoothing and a 0.3 camera-follow lerp, centralized in `src/movementTuning.ts` with unit-tested bounds.
- **Cross-map objective compass**: the objective banner, bouncing gold chevron, and screen-edge arrow now resolve both registry and Mira objectives through validated first-hop routes. Same-map objectives point to their interaction target; off-map objectives point to the real exit rectangle's centre. Mira's off-farm wording begins `Head back to The Farm —`, closing the M2 guidance gap.
- **Reusable dialogue UI**: Baker Pell's bottom dialogue box owns ACTION/pointer advancement, disposes its listeners safely across scene restarts, supports automatic Mage read-aloud, and exposes manual Ranger speaker playback. Speech replacement/cancellation restores music exactly once.
- **Game feel & readability (Batch 1)**: world markers idle-bob with staggered phases and pop (with a single sparkle) as the player enters interaction range; every `drawRoundedButton` button plus the touch ACTION button and joystick knob give squash-and-release press feedback; dialogue types out (~24ms/char, ACTION completes then advances, bouncing ▼ cue, TTS unchanged); markers are literal glyphs with kid-friendly display names (no more `CropBonus` on screen); prompt/stats/dialogue panels pop in with the toast's Back.easeOut; the stats CLOSE label renders above its button again.
- **Typed quest registry**: optional `questSteps` remain save-version-2 compatible. The generic `QuestSystem` owns registry quests while Mira's existing `FarmQuestSystem` stays authoritative for her legacy flags and state machine.
- Mira's First Errand, The Whispering Scarecrow, and The Sleepy Sprouts.
- **The Berry Order**: an optional Baker Pell quest with non-gating crop gathering, persistent 0/3 progress, and one deterministic reward of 20 gold plus one Berry Pie. Berry gathering never opens a learning prompt and rapid ACTION presses cannot double-grant the reward.
- Optional crop and three-hit Practice Slime learning bonuses. The prompt opens only after the encounter presentation completes; wrong answers and skips preserve adventure progress.
- **The Practice Slime's defeat is permanent** (persisted `practiceSlimeDefeated` quest flag; old saves default to present): after the three-hit encounter and its first-defeat prompt, the slime, pips, and interaction target leave the world and stay gone across reloads. Quest soft-locks are guarded (crop completion and save load route past `find-slime` when the slime is already defeated).
- **Post-purpose interactions give flavor, not quizzes**: once an interactable's quest purpose is fulfilled, repeats show short rotating flavor toasts (`src/data/flavor.ts`); the crop patch and Mira carry an explicit "ACTION again to practice!" opt-in (Mira rotates combat/farm/quest practice contexts, replacing the retired slime as the combat-practice tap), and post-errand sprouts are pure flavor. First-time and quest-relevant interactions are unchanged; learning never gates adventure.
- Optional Wildbloom Sprig discovery loop with three persistent secrets, profile-specific reveal abilities, and no random or variable reward.
- Persistent registry/Mira quest state, inventory, gold, keepsakes, player position/map, and mastery data.
- Save version 2 with a tested v1→v2 coordinate migration that scales valid legacy positions exactly once.
- **Adaptive difficulty** on optional learning bonuses: each skill's derived difficulty is `1 + floor(streak/3)`, capped per template. Requested context remains authoritative, and every context template is reachable at its declared floor; this avoids impossible self-unlock loops for higher-floor skills such as Grade 5 decimals. Correct streaks raise later number ranges, wrong answers ease back toward the floor, and skips do not move difficulty. Rewards and adventure progress remain ungated. See `docs/CURRICULUM_QUESTION_ENGINE.md`.
- **PWA / Add to Home Screen**: a relative-path web app manifest and deterministic generated icons support standalone home-screen launch with Realm of Eldoria branding. No service worker or offline caching yet; physical iPad installation remains unvalidated.
- Background music, interaction/reward/UI effects, read-aloud support, and music ducking. Shipped audio remains placeholder material pending a later licensed-art pass.
- GitHub Pages deployment from verified `main` builds.

## Presentation and asset state

### Runtime-integrated

- Grade 2 Mage directional idle, walk, cast, and hurt animation sheets, regenerated 2026-07-21 with uniform per-clip fixed scaling (one 46.7px body height across every idle/walk direction), per-sprite source rectangles, and source cleanup that removes stray-pixel residue. Awaiting ChatGPT visual re-audit of the regenerated masters.
- Practice Slime v001 idle and encounter presentation.
- Code-drawn or layered bridge presentation for Ranger Explorer, Mira, Wildbloom landmarks, quest markers, crop/sprout markers, shadows, projectiles, and feedback effects.
- **Bounded terrain integration (centres + transitions):** the farm Ground layer uses approved `grass_b`/`grass_c`, `water_a`/`water_b`, and dirt-centre runtime pixels through a deterministic generated tileset, and — user-authorized on 2026-07-21 as a bounded relaxation of the complete-kit gate — all 24 approved dirt-blend and shoreline transition cells, assigned by a pure tested neighborhood resolver so the path and pond blend into the grass. Farm only; woods/village keep hard edges, and the final Wangset/Tiled-native pass remains deferred.

### Production contracts locked but not runtime-integrated

- Armor uses separate editable source components compiled into one atomic runtime outfit package with synchronized back and front overlay slices; weapons remain separate synchronized overlays.
- The first armor implementation is cosmetic and switches complete outfits rather than independently swapping live robe, hat, cape, and bracer sprites.
- Base actor clips own frame count, timing, pivots, and semantic action events. Armor and weapons may not run independent animation clocks.
- Mage armor production is limited to the existing `idle`, `walk`, `cast`, and `hurt` baseline. Dedicated Ranger production requires `idle`, `walk`, `shoot`, and `hurt` before Ranger armor begins.
- Light attack, heavy attack, death, specials, generalized combat hitboxes, player health, and broader combat architecture remain deferred until real gameplay requires them.
- Durable authority: `docs/ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md` and `docs/visual-targets/mage_starter_equipment_targets.json`.

### Approved Phase 2 source assets

- `tile_farm_grass_base / grass_a` — approved high-resolution source candidate with review-only normalization evidence; a family-pack decision must retain its exact approved runtime interpretation rather than silently deriving a new one.
- `tile_farm_grass_base / grass_b` — approved exact `16×16` runtime master derived by a reproducible interior-only micro-detail recipe, with unchanged borders, exact forest-palette histogram preservation, deterministic `1024×1024` canonical source, and a zero-drift round trip.
- `tile_farm_grass_base / grass_c` — approved exact `16×16` runtime master derived from `grass_a` by 22 adjacent interior pair swaps (seed 91537), with unchanged borders and 1px inner buffer, exact histogram/forest-palette preservation, deterministic `1024×1024` canonical source, and a zero-drift round trip.
- `tile_farm_path_dirt / center` — approved exact `16×16` runtime master, deterministically upscaled to the canonical source with a zero-drift round trip.
- `tile_farm_path_dirt` **blend family (13 cells)** — deterministically composited from approved `path_dirt/center` over approved `grass_a`; all 12 generated transition cells are APPROVED RUNTIME MASTERS. Source, review evidence, manifest, and packed sheet are on `main`. The proof map currently uses centre only; Wangset-aware transitions remain deferred.
- `tile_farm_water_shore` **blend family (13 cells)** — deterministically composited from approved `water_a` over approved `grass_a` using the reviewed five-band shoreline mode. The v2 material correction passed exhaustive adjacency and visual review; all 12 generated transition cells are APPROVED RUNTIME MASTERS, and `center` retains the approved `water_a` identity. Source, review evidence, manifest, and packed sheet are on `main`; it is not runtime/map/Wangset integrated.
- `tile_farm_water_base / water_a` — approved exact `16×16` runtime master, deterministically upscaled to the canonical source with a zero-drift round trip.
- `tile_farm_water_base / water_b` — approved exact `16×16` runtime master derived from `water_a` by 18 adjacent interior pair swaps (seed 33199, delta ≤ 1), with unchanged borders and 1px inner buffer, exact histogram/palette preservation, deterministic `1024×1024` canonical source, and a zero-drift round trip.
- `env_farm_tree / oak` — approved exact `32×48` runtime master with a deterministic canonical source and zero-drift round trip.
- `env_farm_fence / rail_horizontal` — approved exact `16×32` runtime master with retained modular connection evidence.
- `env_farm_rock_medium / rock_a` — approved exact `32×32` runtime master with retained footprint/pivot evidence.
- `env_wildbloom_landmark / root_star_revealed` — approved exact `32×32` runtime master with exact Root-Star accent coverage and a reproducible colour-only correction recipe.
- The deterministic seven-anchor Batch A contact sheet passes the family-level scale, palette, lighting, grounding, and readability gate.
- `npm run review:asset` normalizes, validates, generates nearest-neighbour evidence, and reports deterministic seam, alpha, hash, and optional palette metrics for one-cell review manifests.

Both required reduced terrain-blend families are approved and on `main`: `tile_farm_path_dirt` and `tile_farm_water_shore`. The bounded proof map still uses only grass/water centres and dirt centre; shoreline and Wangset-aware transitions remain deferred to the final terrain-integration gate.

### Terrain integration proof of concept

The farm map's Ground layer now draws grass (`grass_b`/`grass_c`), water (`water_a`/`water_b`), and dirt path (`path_dirt/center`) from approved `16×16` runtime masters, upscaled exactly `2×` onto the unchanged `32px` map grid by `scripts/compose-terrain-proof-tileset.mjs` into `public/assets/tilesets/farm-terrain-proof.png`. The repaint is deterministic and idempotent, and repository checks regenerate both the terrain proof and PWA icons before requiring a clean diff.

Only the five reviewed centre cells are used. Dirt transitions and shoreline are deliberately absent until the Wangset/final-map pass. Collision, Decor/structure tiles, object coordinates, saves, and gameplay semantics remain unchanged. This user-approved proof is intentionally ahead of the complete-environment-kit gate; it may remain as a bounded visual upgrade, but it does not authorize broader piecemeal map integration.

### Pending production replacement

- Dedicated Ranger Explorer sprite sheets.
- Dedicated Mira sprite sheets.
- Remaining production vegetation, fences, structures, props, crop art, shoreline decals, and Wildbloom landmark family art.
- Production fantasy UI skin.
- Final licensed audio replacement.

Bridge presentation is intentional and functional, but it is not final production art.

## Quality and test coverage

The repository includes:

- visual-target schema validation;
- manifest-driven asset normalization and validation;
- automated one-cell asset-review evidence and metrics;
- a closed-loop ChatGPT asset-generation workflow;
- deterministic generation checks for PWA icons and the bounded terrain-proof map/sheet;
- terrain-blend regression coverage for both dirt and shoreline families;
- Vitest coverage for learning, mastery, adaptive floors/elevation, interactions, curriculum templates, save migration, movement tuning, quest definitions/engines, speech lifecycle, the real map exit graph, BFS route validation, and pure objective-guidance resolution;
- Playwright coverage for both profiles, adaptive difficulty through the live WorldScene, the Waking Gate, movement/input, focus-loss recovery, Mira and Berry Order quests, profile-specific dialogue speech, exact deterministic rewards, crop prompts, the Practice Slime encounter and its permanent-defeat reload persistence, post-purpose flavor/opt-in pacing, local and cross-map marker/edge-arrow guidance, all three maps and their save/reload paths, Wildbloom discovery, Stats & Mastery, and portrait guidance;
- an intentional renderer split: Playwright sets `window.__ELDORIA_E2E__` before application code, forcing `Phaser.CANVAS`, while production continues to use unchanged `Phaser.AUTO`; the exact base/candidate full-suite benchmark improved from 224s to 194s (30s, 13.4%), with 56/56 candidate tests passing and no `WebGL Context lost` warnings;
- renderer-agnostic movement round-trip assertions bounded to one `32px` map tile, covering one-frame Canvas/WebGL cadence variation without changing gameplay physics or production controls;
- browser-side transient-event recorders that are reset immediately before reward or reveal actions, including recursive capture of text nested in Wildbloom toast containers, avoiding lifetime-text false positives while remaining robust on slow software-rendered runners;
- reviewable screenshot artifacts, including iPad-like landscape browser viewports.

Browser viewport evidence is not physical-iPad validation. The build remains technically and visually browser-verified rather than child-validated or physically iPad-certified.

## Active milestone — Phase 2 environment-art production

Phases 0 and 1 of `docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md` are complete. Phase 2A specification groundwork is complete, including the palette lock, target contracts, padded-`sourceRect` extraction contract, and ordered production handoff.

Batch A is **7 of 7 foundational assets approved**. Batch B status:

1. `tile_farm_grass_base / grass_b` — complete.
2. `tile_farm_grass_base / grass_c` — complete; the three visual grass cells are ready for the family-pack decision.
3. `tile_farm_path_dirt` reduced 13-cell family — complete, approved, and merged.
4. `tile_farm_water_base / water_b` — complete; the two water cells are ready for family packing.
5. `tile_farm_water_shore` reduced 13-cell family — complete, approved, and merged on PR #99.

## Immediate next steps

1. Close the grass-family packaging gap with an explicit `grass_a` runtime interpretation, then pack and audit `grass_a`/`grass_b`/`grass_c` in one deterministic manifest and sheet.
2. Pack and audit the two-cell `water_a`/`water_b` family.
3. After the terrain families are source/packed complete, proceed to Batch C vegetation. Do not expand the bounded terrain proof into piecemeal final-map integration before the environment-kit contact-sheet and Wangset gates.
4. Keep the now-merged dirt and shoreline transition families out of the proof map until the final Wangset-aware composition can demonstrate coherent boundaries at target scale.
5. In parallel only where it does not displace the environment milestone, produce the dedicated Ranger Explorer base and freeze both heroes' required clip timing before armor source generation.
6. Keep the Wildbloom recursive transient-text recorder covered in CI; it closes the repeated completion-toast timeout without changing gameplay or toast timing.

## Decisions for the generation handoff

- Generate grass scatter with vegetation in Batch C.
- Generate tilled soil, sprouts, harvest crops, and crop-row overlays with the crop/prop family in Batch D.
- Pack normalized variants into one deterministic PNG sheet per target ID, with a documented fixed layout in each manifest.
- Keep water shimmer frames in the asset kit; decide the runtime loop mechanism during Phase 3 integration.
- Keep shoreline rocks as small `16×16` decals and the medium rock as a `32×32` landmark.

## Deferred but still required

- Physical iPad Safari smoke test after the production farm recomposition, followed by formal Phase 7 certification.
- Dedicated Ranger Explorer and Mira production art.
- Mage starter outfit source generation, compiled overlay production, and cosmetic runtime integration after base timing freezes.
- Merchant/customization gold sink and separately scoped equipment mechanics.
- UI skin, lighting, atmosphere, and final performance tuning.
- Mossheart Ruins, Elder Rowan, Quest #4, or broader combat architecture only after a separate approved build scope; M3 does not implement that design.

## Known risks

- Physical touch comfort, safe-area behavior, PWA installation/orientation behavior, audio balance, memory stability, and frame pacing remain unverified on an actual iPad.
- The terrain proof intentionally has hard centre-tile boundaries at pond/path edges because transition families are not yet Wangset-integrated; it is visually stronger than placeholders but not the final terrain composition.
- Dense generated environment art may lose readability at tiny runtime sizes; target-size changes must be made explicitly rather than hidden through blurry scaling.
- High-resolution image generation tends to over-pattern quiet terrain and invent palette intermediates. Every candidate must be judged from its exact runtime pixels, not from the attractive high-resolution preview.
- A high-resolution source can remain unsuitable even when its normalized runtime cell is good. In that case, freeze the approved runtime pixels and use the documented Approved Runtime Master workflow instead of repeatedly regenerating.
- Terrain centres and transition tiles can easily become non-seamless or reveal periodic motifs; one-cell `3×3` and large-field repeats remain mandatory gates.
- Ranger, Mira, structures, and several interactive objects remain bridge art and may look inconsistent against the production terrain proof.
- The compiled two-slice outfit model is specification-only and remains unproven in-engine; the first cosmetic outfit integration must validate occlusion, synchronization, memory cost, and iPad frame pacing before expanding runtime slot granularity.
