# Eldoria-V2 Current State

Last refreshed on 2026-07-17 after accepting the Batch B `grass_b` runtime master. This file owns volatile project status; durable rules live in `AGENTS.md`, and the documentation map lives in `docs/README.md`.

## Product invariant

**Learning never gates adventure.** Wrong answers and skipped prompts do not block movement, exploration, quest progress, baseline rewards, retries, or story progression.

## Playable vertical slice

- Phaser 4, Vite, TypeScript, and a Tiled farm map.
- `960×640` internal canvas with `pixelArt`, `roundPixels`, `FIT`, and `CENTER_BOTH` preserved.
- Grade 2 audio-first **Mage** and Grade 5 reader-mode **Ranger Explorer** profiles. Stable IDs remain `grade2-mage` and `grade5-adventurer`.
- Fresh profiles enter a short, skippable **Waking Gate** action scene before the farm. Mage fires spell sparks; Ranger fires tracking shots. Returning saves enter the farm directly.
- Keyboard movement, dynamic lower-left joystick, lower-right **ACTION**, portrait-orientation guidance, and the **STATS** panel.
- Mira's First Errand, The Whispering Scarecrow, and The Sleepy Sprouts.
- Optional crop and three-hit Practice Slime learning bonuses. The prompt opens only after the encounter presentation completes; wrong answers and skips preserve adventure progress.
- Optional Wildbloom Sprig discovery loop with three persistent secrets, profile-specific reveal abilities, and no random or variable reward.
- Persistent quest, inventory, gold, keepsake, player-position, and mastery data.
- Save version 2 with a tested v1→v2 coordinate migration that scales valid legacy positions exactly once.
- Background music, interaction/reward/UI effects, read-aloud support, and music ducking. Shipped audio remains placeholder material pending a later licensed-art pass.
- GitHub Pages deployment from verified `main` builds.

## Presentation and asset state

### Runtime-integrated

- Grade 2 Mage directional idle, walk, and cast animation sheets.
- Practice Slime v001 idle and encounter presentation.
- Code-drawn or layered bridge presentation for Ranger Explorer, Mira, Wildbloom landmarks, quest markers, crop/sprout markers, shadows, projectiles, and feedback effects.

### Production contracts locked but not runtime-integrated

- Armor uses separate editable source components compiled into one atomic runtime outfit package with synchronized back and front overlay slices; weapons remain separate synchronized overlays.
- The first armor implementation is cosmetic and switches complete outfits rather than independently swapping live robe, hat, cape, and bracer sprites.
- Base actor clips own frame count, timing, pivots, and semantic action events. Armor and weapons may not run independent animation clocks.
- Mage armor production is limited to the existing `idle`, `walk`, `cast`, and `hurt` baseline. Dedicated Ranger production requires `idle`, `walk`, `shoot`, and `hurt` before Ranger armor begins.
- Light attack, heavy attack, death, specials, generalized combat hitboxes, player health, and broader combat architecture remain deferred until real gameplay requires them.
- Durable authority: `docs/ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md` and `docs/visual-targets/mage_starter_equipment_targets.json`.

### Approved Phase 2 source assets — not yet runtime-integrated

- `tile_farm_grass_base / grass_a` — approved high-resolution source candidate with review-only normalization evidence.
- `tile_farm_grass_base / grass_b` — approved exact `16×16` runtime master derived by a reproducible interior-only micro-detail recipe, with unchanged borders, exact forest-palette histogram preservation, deterministic `1024×1024` canonical source, and a zero-drift round trip.
- `tile_farm_grass_base / grass_c` — approved exact `16×16` runtime master derived from `grass_a` by 22 adjacent interior pair swaps (seed 91537), with unchanged borders and 1px inner buffer, exact histogram/forest-palette preservation, deterministic `1024×1024` canonical source, and a zero-drift round trip. Verdict assigned by ChatGPT via direct pixel-grid audit.
- `tile_farm_path_dirt / center` — approved exact `16×16` runtime master, deterministically upscaled to the canonical source with a zero-drift round trip.
- `tile_farm_path_dirt` **blend family (13 cells)** — deterministically composited by `scripts/compose-terrain-blend-family.mjs` from approved `path_dirt/center` over approved `grass_a` using a four-corner integer-bilinear mask plus a one-pixel material interlock (seed `0x0000D17A`). Every output pixel is copied verbatim from one of the two approved inputs; `center` stays byte-identical. All per-tile/complementary-edge/family gates pass (0 unexpected colours, 256/256 within palette tolerance 40, 84 shared-edge pairs with 0 mismatches, packed `208×16` sheet with zero drift). **Approved** by ChatGPT's formal visual + implementation review (all 12 generated cells accepted as APPROVED RUNTIME MASTERS; independent mixed-lattice rebuild and seam check confirmed no hard grid lines or discontinuities). Source + review evidence + packed sheet only; **not** runtime/map/Wangset integrated.
- `tile_farm_water_base / water_a` — approved exact `16×16` runtime master, deterministically upscaled to the canonical source with a zero-drift round trip.
- `tile_farm_water_base / water_b` — approved exact `16×16` runtime master derived from `water_a` by 18 adjacent interior pair swaps (seed 33199, delta ≤ 1 for the near-uniform water tile), with unchanged borders and 1px inner buffer, exact histogram/palette preservation, deterministic `1024×1024` canonical source, and a zero-drift round trip. Verdict assigned by ChatGPT via direct pixel audit.
- `env_farm_tree / oak` — approved exact `32×48` runtime master, deterministically upscaled to a `1024×1536` canonical source with a zero-drift round trip.
- `env_farm_fence / rail_horizontal` — approved exact `16×32` runtime master, deterministically upscaled to a `512×1024` canonical source with a zero-drift round trip and retained modular connection evidence.
- `env_farm_rock_medium / rock_a` — approved exact `32×32` runtime master, deterministically upscaled to a `1024×1024` canonical source with a zero-drift round trip and retained footprint/pivot evidence.
- `env_wildbloom_landmark / root_star_revealed` — approved exact `32×32` runtime master with exact Root-Star accent coverage, a reproducible colour-only correction recipe, deterministic `1024×1024` canonical source, and zero-drift round trip.
- The deterministic seven-anchor Batch A contact sheet passes the family-level scale, palette, lighting, grounding, and readability gate; its report explicitly preserves incomplete-family and no-integration claims.
- `npm run review:asset` normalizes, validates, generates nearest-neighbour evidence, and reports deterministic seam, alpha, hash, and optional palette metrics for one-cell review manifests.

The seven Batch A anchors are approved, and Batch B terrain-family completion has begun. A source-only production manifest and packed sheet now exist for the `tile_farm_path_dirt` blend family (`assets/manifests/tile_farm_path_dirt.manifest.json`, `assets/tilesets/tile_farm_path_dirt.png`), approved by ChatGPT's formal visual verdict. No Phaser loading path, Wangset/Tiled wiring, or map integration is complete for any farm-environment target.

### Pending production replacement

- Dedicated Ranger Explorer sprite sheets.
- Dedicated Mira sprite sheets.
- Remaining production farm terrain, shoreline, vegetation, fences, props, crop art, and Wildbloom landmark art.
- Production fantasy UI skin.
- Final licensed audio replacement.

Bridge presentation is intentional and functional, but it is not final production art.

## Quality and test coverage

The repository includes:

- visual-target schema validation;
- manifest-driven asset normalization and validation;
- automated one-cell asset-review evidence and metrics;
- a closed-loop ChatGPT asset-generation workflow;
- a visual-evidence retention policy requiring reviewable proof while keeping superseded galleries out of Git history;
- Vitest coverage for learning, mastery, interactions, curriculum templates, and save migration;
- Playwright coverage for both profiles, the Waking Gate, movement/input, focus-loss recovery, Mira quests, crop prompts, the Practice Slime encounter, Wildbloom discovery and persistence, Stats & Mastery, save/reload, and portrait guidance;
- reviewable screenshot artifacts, including iPad-like landscape browser viewports.

Browser viewport evidence is not physical-iPad validation. The build remains technically and visually browser-verified rather than child-validated or physically iPad-certified.

## Active milestone — Phase 2 environment-art production

Phases 0 and 1 of `docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md` are complete:

- Phase 0: baseline visual audit and screenshot lock.
- Phase 1: migration from `480×320` to `960×640` while preserving world coverage, touch behavior, saves, quests, curriculum, and profile paths.

Phase 2A specification groundwork is complete:

- 36 machine-readable farm-environment targets;
- approved, versioned farm palette lock;
- complete 13-variant dirt-path and shoreline blend sets;
- corrected tall-prop geometry and pivots;
- ordered production-generation handoff in `docs/art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`;
- scoped farm-palette validation/review tooling and a tested Category-C padded-`sourceRect` extraction contract;
- approved external style direction classified as **STYLE REFERENCE ONLY**, not committed or normalized.

Batch A progress is **7 of 7 foundational assets approved**:

1. `tile_farm_grass_base / grass_a` — complete.
2. `tile_farm_path_dirt / center` — complete.
3. `tile_farm_water_base / water_a` — complete.
4. `env_farm_tree / oak` — complete.
5. `env_farm_fence / rail_horizontal` — complete; one central post with rails connecting across tile boundaries, not a complete two-post panel.
6. `env_farm_rock_medium / rock_a` — complete.
7. `env_wildbloom_landmark / root_star_revealed` — complete.

Batch B progress:

1. `tile_farm_grass_base / grass_b` — complete; exact borders remain compatible with `grass_a`, 48 interior pixels change through 24 recorded pair swaps, and the real-pipeline round trip has zero drift.
2. `tile_farm_grass_base / grass_c` — complete; 44 interior pixels change through 22 adjacent recorded pair swaps (seed 91537), borders and 1px inner buffer stay compatible with `grass_a`/`grass_b`, and the real-pipeline round trip has zero drift. The three-cell grass family is now complete at the individual-cell gate.

## Immediate next steps

1. Pack and audit the complete deterministic three-cell grass family (`grass_a`/`grass_b`/`grass_c`) into the first production `tile_farm_grass_base` manifest + packed sheet before beginning dirt transitions.
2. After the grass family packs, continue with dirt transitions.
3. Continue with dirt transitions, `water_b`, and the complete shoreline set only after each preceding reference cell passes.
4. Keep every Batch B terrain variant on its one-cell seam/repetition gate before any packed family sheet.
5. Do not recompose `public/maps/farm.json` until the complete production kit passes the later environment-kit contact-sheet acceptance gate.
6. In parallel only where it does not displace Batch B, produce the dedicated Ranger Explorer base and freeze both heroes' required clip timing before any armor source generation.

## Decisions for the generation handoff

- Generate grass scatter with vegetation in Batch C.
- Generate tilled soil, sprouts, harvest crops, and crop-row overlays with the crop/prop family in Batch D.
- Pack normalized variants into one deterministic PNG sheet per target ID, with a documented fixed layout in each manifest. Source generation may remain one image per variant where that improves consistency.
- Keep water shimmer frames in the asset kit; decide the runtime loop mechanism during Phase 3 integration.
- Keep shoreline rocks as small `16×16` decals and the medium rock as a `32×32` landmark.

## Deferred but still required

- Physical iPad Safari smoke test after the production farm recomposition, followed by formal Phase 7 certification.
- Dedicated Ranger Explorer and Mira production art.
- Mage starter outfit source generation, compiled overlay production, and cosmetic runtime integration after base timing freezes.
- Merchant/customization gold sink and separately scoped equipment mechanics.
- UI skin, lighting, atmosphere, and final performance tuning.
- Quest #4, a second zone, or broader combat architecture only after the visual milestone is reassessed.

## Known risks

- Physical touch comfort, safe-area behavior, audio balance, memory stability, and frame pacing remain unverified on an actual iPad.
- Dense generated environment art may lose readability at tiny runtime sizes; target-size changes must be made explicitly rather than hidden through blurry scaling.
- High-resolution image generation tends to over-pattern quiet terrain and invent palette intermediates. Every candidate must be judged from its exact runtime pixels, not from the attractive high-resolution preview.
- A high-resolution source can remain unsuitable even when its normalized runtime cell is good. In that case, freeze the approved runtime pixels and use the documented Approved Runtime Master workflow instead of repeatedly regenerating.
- Terrain centres and transition tiles can easily become non-seamless or reveal periodic motifs; one-cell `3×3` and large-field repeats remain mandatory gates.
- Ranger, Mira, and several interactive objects remain bridge art and may look inconsistent once production terrain arrives.
- The compiled two-slice outfit model is specification-only and remains unproven in-engine; the first cosmetic outfit integration must validate occlusion, synchronization, memory cost, and iPad frame pacing before expanding runtime slot granularity.
