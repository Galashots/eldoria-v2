# Eldoria-V2 Current State

Last refreshed on 2026-07-14 after Batch A fence runtime-master ingestion. This file owns volatile project status; durable rules live in `AGENTS.md`, and the documentation map lives in `docs/README.md`.

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

### Approved Phase 2 source assets — not yet runtime-integrated

- `tile_farm_grass_base / grass_a` — approved high-resolution source candidate with review-only normalization evidence.
- `tile_farm_path_dirt / center` — approved exact `16×16` runtime master, deterministically upscaled to the canonical source with a zero-drift round trip.
- `tile_farm_water_base / water_a` — approved exact `16×16` runtime master, deterministically upscaled to the canonical source with a zero-drift round trip.
- `env_farm_tree / oak` — approved exact `32×48` runtime master, deterministically upscaled to a `1024×1536` canonical source with a zero-drift round trip.
- `env_farm_fence / rail_horizontal` — approved exact `16×32` runtime master, deterministically upscaled to a `512×1024` canonical source with a zero-drift round trip and retained modular connection evidence.
- `npm run review:asset` normalizes, validates, generates nearest-neighbour evidence, and reports deterministic seam, alpha, hash, and optional palette metrics for one-cell review manifests.

These five assets are approved individually, but their target families remain incomplete. No production farm-environment manifest, packed terrain sheet, Phaser loading path, or map integration is complete.

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
- approved external style direction classified as **STYLE REFERENCE ONLY**, not committed or normalized.

Batch A progress is **5 of 7 foundational assets approved**:

1. `tile_farm_grass_base / grass_a` — complete.
2. `tile_farm_path_dirt / center` — complete.
3. `tile_farm_water_base / water_a` — complete.
4. `env_farm_tree / oak` — complete.
5. `env_farm_fence / rail_horizontal` — complete; one central post with rails connecting across tile boundaries, not a complete two-post panel.
6. `env_farm_rock_medium / rock_a` — next.
7. `env_wildbloom_landmark / root_star_revealed` — pending.

## Immediate next steps

1. Generate and audit `env_farm_rock_medium / rock_a` through the closed-loop workflow.
2. Require exact `32×32` runtime evidence, grounded footprint/pivot review, `metal_stone` palette verification, silhouette readability, and transparent-background inspection.
3. Continue Batch A in canonical order with the revealed Root-Star landmark after the medium rock.
4. After all seven Batch A anchors are approved, review a Batch A family contact sheet before beginning Batch B terrain variations (`grass_b/c`, dirt transitions, `water_b`, and the complete shoreline set).
5. Do not recompose `public/maps/farm.json` until the complete production kit passes the contact-sheet acceptance gate.

## Decisions for the generation handoff

- Generate grass scatter with vegetation in Batch C.
- Generate tilled soil, sprouts, harvest crops, and crop-row overlays with the crop/prop family in Batch D.
- Pack normalized variants into one deterministic PNG sheet per target ID, with a documented fixed layout in each manifest. Source generation may remain one image per variant where that improves consistency.
- Keep water shimmer frames in the asset kit; decide the runtime loop mechanism during Phase 3 integration.
- Keep shoreline rocks as small `16×16` decals and the medium rock as a `32×32` landmark.

## Deferred but still required

- Physical iPad Safari smoke test after the production farm recomposition, followed by formal Phase 7 certification.
- Dedicated Ranger Explorer and Mira production art.
- Merchant/customization gold sink.
- UI skin, lighting, atmosphere, and final performance tuning.
- Quest #4, a second zone, or broader combat architecture only after the visual milestone is reassessed.

## Known risks

- Physical touch comfort, safe-area behavior, audio balance, memory stability, and frame pacing remain unverified on an actual iPad.
- Dense generated environment art may lose readability at tiny runtime sizes; target-size changes must be made explicitly rather than hidden through blurry scaling.
- High-resolution image generation tends to over-pattern quiet terrain and invent palette intermediates. Every candidate must be judged from its exact runtime pixels, not from the attractive high-resolution preview.
- A high-resolution source can remain unsuitable even when its normalized runtime cell is good. In that case, freeze the approved runtime pixels and use the documented Approved Runtime Master workflow instead of repeatedly regenerating.
- Terrain centres and transition tiles can easily become non-seamless or reveal periodic motifs; one-cell `3×3` and large-field repeats remain mandatory gates.
- Ranger, Mira, and several interactive objects remain bridge art and may look inconsistent once production terrain arrives.
