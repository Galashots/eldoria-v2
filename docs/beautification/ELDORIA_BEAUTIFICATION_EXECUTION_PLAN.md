# Eldoria-V2 Beautification Execution Plan for Claude Code

## Mission

Transform Eldoria-V2 from a technically functional prototype into a cohesive, premium-looking, family-friendly 2D fantasy RPG that approaches the visual quality and atmosphere of the approved reference art while preserving the existing gameplay, curriculum, save compatibility, accessibility, and iPad support.

This is an execution brief, not a request for a single giant rewrite. Work in small, reviewable pull requests. Each phase must be independently green, visually inspected, and safe to merge.

---

## Executive Decision: Canvas and Display Resolution

### Adopt a 960 × 640 internal game canvas

Change the Phaser logical game size from:

```ts
480 × 320
```

to:

```ts
960 × 640
```

This preserves the existing **3:2 aspect ratio** used by the current game and the approved reference artwork, while providing exactly **2× the linear resolution and 4× the drawable pixel area**.

### Why 960 × 640 is the correct target

1. **Exact 2× migration path**
   - Existing coordinates, camera framing, UI positions, tile placement, effects, and touch targets can be converted predictably by multiplying by two.
   - Existing 32 × 48 hero presentation can migrate toward 64 × 96 production presentation without fractional scaling.
   - Existing 32-pixel tiles can migrate toward 64-pixel visual tiles while preserving map topology.

2. **Appropriate for iPad Safari**
   - The rendered frame is only about 0.61 megapixels before browser compositing, which is modest for modern iPads.
   - Phaser `FIT` scaling can continue to preserve aspect ratio and center the canvas.
   - A 3:2 game displayed on a roughly 4:3 iPad leaves modest letterboxing instead of cropping important HUD or world content.
   - Landscape remains mandatory; preserve the existing portrait-orientation guidance.

3. **Enough visual density for the reference direction**
   - Allows richer terrain transitions, water edges, foliage, shadows, particles, ornamental UI, and readable character detail.
   - Supports larger production sprites and higher-quality UI without making text and icons microscopic.
   - Avoids the performance and authoring burden of 1536 × 1024 or full Retina-native rendering.

4. **Safer than 1024 × 768**
   - 1024 × 768 would force a 4:3 redesign and invalidate the current 3:2 scene composition.
   - The attached reference art is 3:2, and the current opening/farm composition already assumes 3:2.

5. **Safer than 768 × 512**
   - 768 × 512 is workable but does not provide the clean 2× conversion from 480 × 320.
   - Fractional scaling of existing systems would create more layout churn and visual inconsistency.

### Renderer policy

For the first resolution migration:

- Keep `pixelArt: true`.
- Keep `roundPixels: true`.
- Keep `Phaser.Scale.FIT` and `CENTER_BOTH`.
- Do **not** also apply a device-pixel-ratio renderer multiplier in the first PR.
- Do **not** target a 1920 × 1280 backing buffer until real-device profiling proves it is needed.
- Use CSS/browser scaling only through the existing Scale Manager contract.

After the visual replacement is integrated and stable, a later optional experiment may compare renderer resolution `1` versus a capped high-DPI value such as `Math.min(devicePixelRatio, 1.5)`. That experiment must be separately profiled on iPad and must not be bundled into the canvas migration.

### Performance target

At 960 × 640 on an actual iPad in landscape:

- Maintain 60 FPS during ordinary movement where feasible.
- Never remain below 45 FPS during normal gameplay.
- Temporary spell/reveal bursts may dip briefly but must remain responsive.
- Avoid full-screen per-frame shader work, large alpha layers, or uncontrolled particle counts.
- Use texture atlases, static layers, and pooled/reused effects where sensible.

---

## Non-Negotiable Product Rules

- Learning never gates adventure.
- Grade 2 remains audio-first and usable by a child who cannot yet read independently.
- Grade 5 remains reader-mode and must feel older and more capable.
- No random loot, countdown timers, streak pressure, daily pressure, manipulative retention loops, or variable-reward mechanics.
- Preserve save compatibility unless a migration is explicitly approved, implemented, and tested.
- Do not rename internal profile IDs.
- Do not destructively rewrite existing quests, curriculum, mastery, or reward systems.
- Keep gameplay logic out of visual controllers.
- Keep new features and visual systems isolated in narrow classes/controllers instead of growing `WorldScene` indiscriminately.
- Do not copy protected game assets or UI. The approved reference images define quality, palette, composition, hierarchy, and atmosphere only.
- Generated concept art is not automatically production-ready runtime art.

---

## Required Reading Before Work

Read the latest versions on `main` before changing anything:

- `AGENTS.md`
- `README.md`
- `docs/CURRENT_STATE.md`
- `docs/VISUAL_ASSET_CONTRACT.md`
- `docs/research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md`
- relevant visual-target specifications under `docs/visual-targets/`
- relevant art-pipeline guidance under `docs/art-pipeline/`
- `src/gameConfig.ts`
- `src/scenes/OpeningScene.ts`
- `src/scenes/WorldScene.ts`
- `src/scenes/PolishedWorldScene.ts`
- `src/presentation/HeroPresentationController.ts`
- `src/presentation/WildbloomDiscoveryController.ts`
- `src/presentation/PracticeSlimeEncounterController.ts`
- `public/maps/farm.json`
- `.github/workflows/ci.yml`
- all current Playwright visual tests

Also inspect the recent Claude work already merged after PR #63, including the visual research, asset-contract additions, terrain-blend targets, scatter targets, and PR #64 ground-shadow pass. Do not duplicate or casually overwrite that work.

---

## Working Method

### General branch discipline

- Start each phase from fresh, updated `main`.
- Use one branch and one PR per phase.
- Do not stack unrelated phases into one PR.
- Keep each PR mergeable and independently valuable.
- Use squash merge only after all required CI and visual checks are green.
- Do not merge on the basis of build success alone.

### Required evidence for every visual PR

Each PR must include:

- Before screenshot.
- After screenshot.
- Grade 2 Mage screenshot.
- Grade 5 Ranger screenshot.
- At least one iPad-like viewport screenshot.
- A contact sheet or clearly named image set in the CI artifact.
- Short visual critique in the PR description covering what improved and what remains weak.

### Required automated checks

Run the complete repository suite, including at minimum:

```bash
npm ci
npm run check
npm run test:asset-pipeline
npm run test:unit
npm run smoke
```

Use the exact scripts available in the repository if names have changed. Do not weaken or skip tests to make a PR green.

---

# Phase 0 — Baseline Audit and Screenshot Lock

## Goal

Establish a trustworthy baseline after the user’s recent Claude changes before beginning the visual migration.

## Tasks

1. Pull latest `main`.
2. Confirm the exact current commit and recent merged PRs.
3. Run the full test suite before modifications.
4. Capture baseline screenshots for:
   - title screen;
   - Mage Waking Gate start and first hit;
   - Ranger Waking Gate start and first hit;
   - Mage farm arrival;
   - Ranger farm arrival;
   - Mira interaction area;
   - Practice Slime encounter;
   - Wildbloom sensing and reveal;
   - Stats panel;
   - optional-learning prompt.
5. Record current FPS and renderer information in desktop Chromium.
6. Record current canvas dimensions, CSS display dimensions, and scale factor.
7. Create a short audit file:

```text
docs/beautification/BEAUTIFICATION_BASELINE_2026-07.md
```

## No runtime changes in Phase 0

This is a baseline-only PR or commit. Do not begin the resolution migration until the baseline is captured.

---

# Phase 1 — Canvas Resolution Migration to 960 × 640

## Goal

Double the logical resolution without changing gameplay semantics, visible world coverage, quest behaviour, saves, or input behaviour.

## Core requirement

The game should display approximately the same amount of world and preserve existing compositions, but at twice the coordinate and visual resolution.

## Implementation strategy

### 1. Introduce explicit design-scale constants

In or near `src/gameConfig.ts`, establish:

```ts
export const LEGACY_GAME_WIDTH = 480;
export const LEGACY_GAME_HEIGHT = 320;
export const GAME_SCALE = 2;
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;
```

Do not leave unexplained magic numbers scattered through scenes.

Create helpers where useful:

```ts
export const sx = (value: number): number => value * GAME_SCALE;
export const sy = (value: number): number => value * GAME_SCALE;
```

Prefer named layout constants for final code rather than blindly wrapping every number forever.

### 2. Preserve world coverage

Two acceptable implementation approaches exist. Choose one after auditing the current camera/map behaviour:

#### Preferred approach: scale the map and world presentation by 2

- Scale Tiled tile display from 32 to 64 pixels without changing logical tile topology.
- Multiply object-layer coordinates by two at runtime or export a 2× map representation through a controlled loader seam.
- Scale collision bodies and interaction radii by two.
- Scale player speed by two so traversal time remains approximately unchanged.
- Scale camera bounds, world bounds, spawn positions, target locations, discovery coordinates, and effect offsets by two.
- Scale hero/slime/NPC display sizes by two while keeping animation frame contracts clear.

Do not manually rewrite hundreds of map coordinates in uncontrolled fashion. Prefer a centralized map/world scale seam.

#### Alternative approach: world camera zoom and dedicated UI camera

Only use this if it materially reduces risk and is cleanly supported by the current architecture. If used:

- Keep world coordinates in legacy space.
- Render the world through a 2× camera zoom.
- Render HUD and fixed UI through a separate unzoomed UI camera at 960 × 640.
- Explicitly assign world objects and UI objects to their respective cameras.
- Prove input mapping, pointer coordinates, camera follow, interaction distances, and Playwright coordinates remain correct.

Do not use a single zoomed camera for both world and HUD if that causes edge positioning or hitbox errors.

### 3. Convert HUD and touch controls

- Rebuild fixed UI layout for 960 × 640 using named layout constants.
- Keep physical touch targets large enough on iPad.
- ACTION target should remain at least roughly 88–110 CSS pixels across after FIT scaling.
- Dynamic joystick must remain lower-left and must not cover objective text or world actors.
- Preserve portrait guidance.
- Preserve screen-safe margins.

### 4. Update visual tests

Existing tests that click fixed canvas coordinates must be updated through a shared coordinate helper. Do not leave each test hardcoded independently.

Create or update a helper similar to:

```ts
clickGame(page, gameX, gameY)
```

It must derive click positions from `GAME_WIDTH` and `GAME_HEIGHT` rather than assuming 480 × 320.

### 5. Resolution acceptance criteria

- Same gameplay progression before and after.
- Same visible world coverage within a small intentional tolerance.
- No clipped HUD.
- No broken touch targets.
- No changed save schema.
- No changed curriculum logic.
- No changed quest logic.
- No interaction-radius regressions.
- No blurry fractional internal asset scaling where avoidable.
- Both profiles fully playable.
- Full CI green.

## Required screenshots

- 480 × 320 baseline next to 960 × 640 migrated screen.
- Mage and Ranger farm entry.
- Opening scene.
- Stats panel.
- Prompt panel.
- Landscape iPad-sized browser viewport.

## PR title

```text
Migrate Eldoria to a 960×640 internal canvas
```

---

# Phase 2 — Environment Art Pipeline and Production Farm Kit v1

## Goal

Replace the development-grid look with a cohesive production environment kit that matches the approved reference’s visual language.

## Do not redesign gameplay in this phase

This phase is visual and map-composition work. Existing interactions, quests, discoveries, collisions, and traversal routes must continue working.

## Required art kit

Create or acquire through the approved asset-generation pipeline:

### Terrain

- 3–5 grass base tiles with subtle value/hue variation.
- 6–10 grass scatter overlays.
- Dirt-path center tiles.
- Horizontal and vertical path edges.
- Inner and outer corners.
- Narrow and wide path transitions.
- Grass-to-dirt blend tiles.
- Tilled-soil center and edge tiles.
- Optional packed-earth or meadow variant for the Practice Slime area.

### Water and shoreline

- Pond water base frames.
- Shoreline edges and corners.
- Water-to-grass transitions.
- Lily pads.
- Small water flowers.
- Shore rocks.
- Reeds and edge plants.
- One subtle looping shimmer or water animation.

### Vegetation

- At least three tree silhouettes.
- Bush clusters in multiple sizes.
- Flower clusters in several palettes.
- Weeds and fern-like plants.
- Small stones and medium rocks.
- Fallen branch/log option.
- Fence posts, rails, corners, gates, and broken variants.

### Props

- Farm signpost.
- Small crate/barrel or gardening prop family.
- Crop-row visual kit.
- One magical environmental prop family compatible with Wildbloom reveals.

## Art direction

- Family-friendly fantasy.
- Rich but readable.
- Painterly pixel-art feel, not flat vector shapes.
- Warm sunlight from upper-left.
- Consistent outline and shadow language.
- No photorealism.
- No excessive micro-detail that disappears at gameplay size.
- Actors must remain more visually salient than terrain.
- Avoid obvious repeated tile stamps.

## Asset pipeline requirements

- Use the existing manifest-driven normalization pipeline.
- Add or update target specs before generating final runtime files.
- Keep source art separate from normalized runtime art.
- Validate dimensions, alpha, color-key cleanup, pivots, and naming.
- Record provenance and attribution.
- Do not commit temporary generated junk or unused variants.
- Build contact sheets for asset review before map integration.

## Visual acceptance gate before map integration

Do not integrate the full kit until a review contact sheet proves:

- tiles share one palette;
- path transitions join cleanly;
- shoreline corners work;
- tree silhouettes are consistent;
- scatter overlays do not look like stickers;
- props match the same perspective;
- assets remain readable at final runtime size.

## PR title

```text
Add the production farm environment kit v1
```

---

# Phase 3 — Recompose the Farm Map

## Goal

Use the production environment kit to rebuild the existing farm into a deliberate, attractive, readable adventure space.

## Composition target

The opening farm view should communicate:

- a welcoming magical farm;
- a clear player arrival point;
- an obvious path to Mira;
- depth created by trees, pond, fences, and foliage;
- natural terrain variation rather than a tile grid;
- room for touch controls without obscuring critical actors;
- memorable landmarks that make navigation possible without heavy reading.

## Required landmarks

### Arrival glade

- Open readable ground around the player.
- Arrival magic integrated into grass and path.
- No clutter directly under the hero.
- Clear sightline toward Mira.

### Mira path area

- Mira positioned beside an authored path, sign, flower cluster, or fence feature.
- Quest marker complements rather than replaces the character.
- Enough negative space for interaction text and effects.

### Pond landmark

- Pond in the northwest or another compositionally strong location.
- Rocks, lilies, reeds, and shoreline transitions.
- Used as a navigation anchor and future story location.

### Practice Slime meadow

- Distinct soft meadow or training patch.
- Creature remains visible against background.
- Health pips and effects remain readable.

### Crop area

- Recognizable tilled soil and crop rows.
- Better integration of crop-bonus and sleepy-sprout interactions.
- Avoid marker-like floating objects.

### Wildbloom discoveries

- Each secret placed near a unique environmental feature.
- Root-Star near roots/tree landmark.
- Moonwell near water/stone landmark.
- Foxfire near meadow/log/flower landmark.
- Revealed landmarks must look native to the environment kit.

## Technical constraints

- Preserve stable interaction IDs.
- Preserve quest target semantics.
- Preserve collision reachability.
- Preserve save-loaded player positions or safely clamp them to valid nearby ground.
- Avoid changing save schema.
- Update map tests and reachability checks.
- Do not hide interactive targets behind decoration.

## Visual-density rule

Use a three-tier density model:

- **Navigation lanes:** low clutter.
- **Activity areas:** moderate detail.
- **Borders and landmarks:** high foliage/prop density.

Do not fill every tile with decoration.

## PR title

```text
Recompose the farm with production environment art
```

---

# Phase 4 — Production Character and NPC Pass

## Priority order

1. Mira.
2. Ranger Explorer.
3. Mage refinement if needed.
4. Sleepy Sprouts and crop interaction actors.
5. Wildbloom landmarks.
6. Practice Slime integration details.

## Mira requirements

- Dedicated production sprite.
- Four-direction idle minimum.
- Simple talk/wave animation if feasible.
- Same perspective and lighting as the heroes.
- Quest marker floats above a real character, not a code-drawn silhouette.
- Clear silhouette at iPad gameplay scale.

## Ranger requirements

- Replace bridge overlay with dedicated `char_ranger_boy_base` production sheets.
- Four-direction idle and walk minimum.
- Action/shot animation.
- Bow and quiver must be baked consistently into the sprite design.
- Preserve the internal `grade5-adventurer` profile ID.
- Keep collision and gameplay logic unchanged.

## Mage requirements

- Preserve existing approved identity.
- Upscale/re-author through the pipeline rather than applying blurry runtime scaling.
- Ensure cast effects originate from consistent hand/staff anchors.

## Animation and anchoring

- Define bottom-center anchors.
- Keep feet aligned across frames.
- Avoid visible sprite jumping.
- Maintain collision-body independence from decorative sprite height.
- Add subtle contact shadows.

## PR strategy

Do not combine all characters into one massive PR if assets are not ready. Mira and Ranger may be separate PRs.

---

# Phase 5 — UI Skin and Typography Pass

## Goal

Replace prototype-like panels with a reusable ornamental fantasy UI system that echoes the approved reference without copying it.

## Required reusable assets/components

- Nine-slice top status bar.
- Nine-slice objective panel.
- Nine-slice bottom hint panel.
- Profile crest frame.
- Stats button frame.
- Mute/settings button frame.
- Large ACTION button frame.
- Quest marker.
- Gold/coin icon.
- Keepsake slot frame.
- Prompt panel frame.

## UI architecture

- Centralize skin assets and dimensions.
- Use nine-slice or reusable scalable components.
- Do not embed a different bespoke frame in every scene.
- Preserve current input hitboxes or explicitly update tests.
- Separate visual skin from interaction logic.

## Typography

- Use a readable fantasy display face only for large headings if licensing is safe.
- Use a highly readable UI/body face for instructions and Grade 2 content.
- Ensure Grade 2 text remains large and sparse.
- Avoid all-caps for long sentences.
- Maintain strong contrast and text strokes/shadows where necessary.

## HUD reduction

- Keep the world visible.
- Avoid oversized permanent bars.
- Objective panel may collapse or shorten after the player understands the task.
- Bottom hint should appear contextually and fade when unnecessary.
- Do not remove essential accessibility guidance.

## ACTION button

- Retain a large, obvious lower-right target.
- Use a more ornate, tactile fantasy frame.
- Include clear pressed/disabled states.
- Preserve reliable iPad touch behaviour.

---

# Phase 6 — Lighting, Atmosphere, and Juice

## Goal

Add final depth only after production art and composition are stable.

## Approved effects

- Upper-left directional contact shadows.
- Soft ambient color grade.
- Controlled edge vignette.
- Pond shimmer.
- Selected flower/grass sway.
- Magic illumination near active spell impacts.
- Quest-marker glow.
- Short arrival/reveal bursts.
- Small camera shake for strong impacts only.

## Restrictions

- No full-screen heavy shader stack without profiling.
- No permanent particle spam.
- No glow on every object.
- No animation that competes with navigation or reading.
- Respect photosensitivity and comfort.

## Phaser lighting

The repository notes indicate Phaser 4’s `PointLight` is available. Use it only for localized effects such as spell impacts, magical props, windows, or torches. Do not convert the entire game to an expensive dynamic-lighting pipeline in one pass.

---

# Phase 7 — iPad Quality and Performance Certification

## Required real-device checks

Test at least one actual iPad in landscape Safari.

Verify:

- load time;
- canvas fit and centering;
- orientation message;
- ACTION button size;
- joystick comfort;
- accidental double taps;
- text fit;
- audio/read-aloud balance;
- touch latency;
- frame pacing;
- memory stability after 10–15 minutes;
- no browser zoom/selection/scroll interference;
- no clipped safe-area content;
- no blurry or shimmering terrain transitions;
- both Mage and Ranger paths;
- opening, Mira, slime, Wildbloom, prompt, Stats panel.

## Performance instrumentation

Add a development-only lightweight performance overlay or logging seam that can report:

- average FPS;
- low-percentile frame time if practical;
- active texture count;
- active game-object count;
- particle/effect count during bursts;
- canvas and display dimensions;
- renderer type;
- device pixel ratio.

Do not expose this in production UI.

## Fallback policy

If the actual iPad cannot sustain acceptable performance at 960 × 640:

1. reduce particle counts;
2. remove unnecessary full-screen alpha layers;
3. atlas textures;
4. cache static map layers;
5. reduce animated foliage density;
6. cap localized lights;
7. only then consider a lower fallback resolution.

Do not immediately revert to 480 × 320.

A possible fallback is 768 × 512, but only after profiling demonstrates that optimization cannot make 960 × 640 acceptable.

---

# Testing Matrix

## Profiles

- Grade 2 Mage fresh profile.
- Grade 2 Mage returning save.
- Grade 5 Ranger fresh profile.
- Grade 5 Ranger returning save.

## Viewports

- 960 × 640 direct desktop capture.
- 1024 × 768 browser viewport.
- Modern iPad-like landscape viewport.
- Narrow landscape viewport.
- Portrait orientation warning.

## Gameplay states

- Title.
- Waking Gate start.
- Waking Gate first hit.
- Waking Gate completion.
- Farm arrival.
- Mira interaction.
- Crop bonus.
- Practice Slime before/impact/completion/prompt.
- Sleepy Sprouts.
- Wildbloom sensing/ability/reveal/completion.
- Stats panel.
- Save/reload.

## Visual regression checks

- No clipped panels.
- No floating markers without actors or world anchors.
- No obvious tile seams.
- No repeated scatter pattern visible at first glance.
- No interaction labels hidden behind foliage.
- No effects rendering beneath terrain incorrectly.
- No character feet floating above ground.
- No world props covering touch controls.

---

# Pull Request Sequence

Use this order unless a discovered blocker justifies a documented change:

1. `Baseline visual audit and screenshot lock`
2. `Migrate Eldoria to a 960×640 internal canvas`
3. `Add the production farm environment kit v1`
4. `Recompose the farm with production environment art`
5. `Add production Mira art`
6. `Replace the Ranger bridge with production sprites`
7. `Apply the production fantasy UI skin`
8. `Add restrained farm lighting and atmosphere`
9. `Certify the beautified build on iPad Safari`

Do not combine phases 2–8 into one PR.

---

# Definition of Beautification Complete

The beautification milestone is complete when:

- The farm no longer reads as a development grid.
- The first screen has intentional composition and memorable landmarks.
- Paths and terrain blend naturally.
- Water, trees, foliage, rocks, and props share one coherent style.
- Mira and Ranger use production sprites.
- Mage, Ranger, Mira, and Slime share scale, perspective, lighting, and grounding.
- Wildbloom reveals look embedded in the world.
- UI uses one reusable fantasy skin.
- The game remains fully playable on iPad Safari.
- Both profiles remain distinct and accessible.
- All existing quests, curriculum, saves, rewards, and bonus-only rules remain correct.
- CI and visual-playtest evidence are green for every merged PR.
- No claim of child validation is made until the children actually play it.

---

# First Claude Code Command

Begin with Phase 0 and Phase 1 only.

```text
You are working in Galashots/eldoria-v2.

Execute the first two stages of docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md, but keep them as separate PRs:

1. Baseline visual audit and screenshot lock.
2. Canvas resolution migration from 480×320 to 960×640.

Read all required files listed in the plan before changing code. Audit the recent Claude-generated visual research and PR #64 changes already on main. Do not duplicate or undo them.

For the canvas migration, preserve the existing 3:2 aspect ratio, visible world coverage, gameplay timing, touch behaviour, stable interaction IDs, saves, quests, curriculum, and both profiles. Centralize the 2× scaling strategy rather than scattering arbitrary coordinate edits. Update Playwright coordinate helpers so tests derive from the configured game dimensions. Keep pixelArt, roundPixels, FIT, and CENTER_BOTH. Do not add a devicePixelRatio renderer multiplier in this PR.

Run the full CI suite and capture reviewable screenshots for both profiles at the opening, farm entry, slime encounter, Wildbloom interaction, prompt panel, and Stats panel. Include an iPad-like viewport. Open each phase as its own PR and do not merge until green and visually inspected.
```
