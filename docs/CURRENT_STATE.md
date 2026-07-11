# Eldoria-V2 Current State

Last refreshed on 2026-07-11 during the Phase 2 farm-environment art milestone. This file owns volatile project status; durable rules live in `AGENTS.md`, and the documentation map lives in `docs/README.md`.

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

### Pending production replacement

- Dedicated Ranger Explorer sprite sheets.
- Dedicated Mira sprite sheets.
- Production farm terrain, shoreline, vegetation, fences, props, crop art, and Wildbloom landmark art.
- Production fantasy UI skin.
- Final licensed audio replacement.

Bridge presentation is intentional and functional, but it is not final production art.

## Quality and test coverage

The repository includes:

- visual-target schema validation;
- manifest-driven asset normalization and validation;
- Vitest coverage for learning, mastery, interactions, curriculum templates, and save migration;
- Playwright coverage for both profiles, the Waking Gate, movement/input, Mira quests, crop prompts, the Practice Slime encounter, Wildbloom discovery and persistence, Stats & Mastery, save/reload, and portrait guidance;
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

No production farm-environment source art or runtime kit has been approved yet.

## Immediate next steps

1. Generate **Batch A foundational source candidates** one asset at a time: grass centre, dirt centre, water centre, oak tree, horizontal fence, medium rock, and revealed Root-Star landmark.
2. Audit each result at source size and at 1x/3x runtime previews. Assign one of: `APPROVED SOURCE CANDIDATE`, `STYLE REFERENCE ONLY`, `REGENERATE`, or `CHANGE TARGET SIZE`.
3. Only after Batch A establishes palette, seamlessness, outline weight, lighting, and perspective, proceed through terrain variants, vegetation, props, water decoration, and the remaining Wildbloom family.
4. Do not recompose `public/maps/farm.json` until the complete kit passes the contact-sheet acceptance gate.

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
- Dense generated environment art may lose readability at `16×16`; target-size changes must be made explicitly rather than hidden through blurry scaling.
- Terrain centres and transition tiles can easily become non-seamless or visually over-detailed; Batch A and Batch B are mandatory gates.
- Ranger, Mira, and several interactive objects remain bridge art and may look inconsistent once production terrain arrives.
