# Eldoria-V2 Visual Transformation Plan

**Status:** Active visual-production subplan  
**Overall product authority:** [`../ELDORIA_MASTER_PLAN.md`](../ELDORIA_MASTER_PLAN.md)  
**Current progress and next task:** [`../CURRENT_STATE.md`](../CURRENT_STATE.md)  
**Historical baseline:** [`BEAUTIFICATION_BASELINE_2026-07.md`](BEAUTIFICATION_BASELINE_2026-07.md)

This plan explains how Eldoria's visual presentation will reach the owner-approved painterly, layered fantasy reference direction. It is not the overall game roadmap and contains no volatile “next asset” status. Use `CURRENT_STATE.md` to determine which part is active.

The earlier canvas migration, baseline capture, and initial terrain-production work are implemented history. Do not restart them from this document.

---

## 1. Visual mission

Transform the current functional world into a cohesive, premium-looking, child-readable fantasy RPG while preserving:

- gameplay and quest semantics;
- bonus-only learning;
- Grade 2 audio-first support;
- Grade 5 Ranger Explorer identity;
- stable profile and interaction IDs;
- save compatibility unless separately approved;
- iPad touch and performance requirements;
- original/generated-art licensing rules.

The target is not “more decoration.” It is a world with deliberate composition, consistent elevated perspective, memorable landmarks, layered depth, coherent materials, grounded characters, restrained atmosphere, and readable UI.

---

## 2. Reference-image translation

The owner-provided reference defines quality, camera, composition, depth, palette, atmosphere, and environmental storytelling. It is **STYLE REFERENCE ONLY**, not production source art.

### Required visual traits

1. **Fixed elevated orthographic camera**
   - environments, characters, NPCs, creatures, props, buildings, equipment, and shadows share one stationary elevated camera pitch;
   - character camera pitch and horizontal actor heading are independent axes;
   - four-direction actors use strict South, West, North, and East headings beneath that camera;
   - South and North remain direct cardinal headings while visible top surfaces and vertical foreshortening prove the elevated camera;
   - West and East are exact 90-degree cardinal rotations, not Southwest/Southeast diagonal turns; profile-like horizontal silhouettes are valid when top surfaces prove the camera remains elevated.

2. **Layered world depth**
   - quiet ground plane;
   - mid-layer flora, stones, crops, fences, shoreline, and props;
   - border/canopy masses framing the playable space;
   - occasional foreground overlap that never blocks touch or objectives.

3. **Authored composition**
   - strong arrival framing;
   - clear navigation lanes;
   - negative space around actors and interactions;
   - landmarks readable without labels;
   - dense borders and focal areas rather than uniform clutter.

4. **Material and lighting cohesion**
   - one palette family system;
   - consistent upper-left key light;
   - compatible outline and shadow language;
   - atmosphere applied coherently rather than baked differently into every asset.

5. **Readable hierarchy**
   - heroes, NPCs, enemies, interactables, and objectives remain more salient than terrain;
   - UI supports the world rather than covering it;
   - Grade 2 text and touch targets remain obvious.

---

## 3. Ground-versus-Decor doctrine

Terrain blend families are the correct foundation for clean grass, dirt, and water boundaries. They are not the main lever for the painterly reference look.

The layered target depends on:

- approved Decor scatter;
- vegetation and flower variation;
- props and structures;
- canopy and border silhouettes;
- dappled light/shadow decals;
- landmark composition;
- coherent character perspective;
- restrained motion and atmosphere.

Do not respond to a flat scene by generating unlimited ground variants. Diagnose which visual layer is actually missing.

---

## 4. Production sequence

The sequence is strategic, not a live checklist. `CURRENT_STATE.md` identifies the current step.

### Phase A — Layered Farm environment foundation

Complete and integrate the production families required to move beyond the development-grid look:

- deterministic grass Decor scatter;
- grass tufts, flowers, pebbles, weeds, and fern variants;
- pond lilies, reeds, shoreline rocks, and subtle shimmer;
- tree silhouettes and canopy/border masses;
- bushes, stones, logs, and landmark rocks;
- fences, posts, corners, gates, broken variants, and signs;
- crop rows, tilled soil, and gardening props;
- Farm structures and readable entrances;
- Wildbloom landmark families.

Use the manifest-driven art pipeline, applicable target JSON, palette lock, and type-specific audit evidence.

#### Scatter acceptance

The deterministic scatter primitive is infrastructure, not a visual success claim.

Before runtime integration:

- approve exact runtime masters for each configured decal;
- confirm the set reads as one family;
- tune density and spacing from in-game screenshots, not only an ASCII/grid proof;
- preserve clear routes, gate mouths, spawns, interactables, crop areas, and discovery landmarks;
- avoid regular wallpaper spacing and equal-probability visual noise;
- permit authored density zones or weighted families when evidence shows uniform scatter is visually weak.

### Phase B — Farm recomposition

Rebuild the Farm as a deliberate adventure space while preserving gameplay reachability and interaction semantics.

#### Required composition zones

**Arrival glade**

- readable player landing;
- clear sightline toward the first useful objective;
- open ground under the hero;
- immediate magical or environmental promise.

**Mira path area**

- authored path and local landmark;
- negative space for interaction, dialogue, and quest feedback;
- Mira reads as a character, not a floating marker.

**Pond landmark**

- coherent shoreline and water treatment;
- lilies, reeds, rocks, and visual depth;
- strong navigation anchor and future story value.

**Practice Slime meadow**

- distinct training-space identity;
- clear creature contrast;
- readable health, impact, reward, and optional-learning presentation.

**Crop area**

- clear tilled-soil and crop-row language;
- crop and sprout interactions embedded naturally;
- enough open space for touch and effects.

**Wildbloom discoveries**

- each secret tied to a unique environmental feature;
- revealed landmarks feel native to the environment kit;
- sensing/tracking routes remain readable.

#### Density model

- **navigation lanes:** low clutter;
- **activity areas:** moderate authored detail;
- **borders and landmarks:** high visual density;
- **touch-critical zones:** deliberate negative space.

Do not fill every eligible tile.

### Phase C — Character and creature perspective rebuild

Production characters must follow:

[`../visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](../visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md)

Expected scope:

1. bounded four-direction camera-and-heading proof;
2. production Mage base family;
3. production Ranger Explorer base family;
4. production Mira;
5. core NPC families;
6. Practice Slime and other creatures requiring camera correction;
7. base timing/pivot freeze;
8. armor, clothing, weapon, and accessory production only after the bases pass.

Current bridge facings are transitional. Do not build large armor libraries against bases already scheduled for replacement.

### Phase D — Reusable fantasy UI

Create one coherent UI system for:

- title/profile selection;
- objective and guidance presentation;
- dialogue and read-aloud state;
- prompts and answer choices;
- Stats & Mastery;
- rewards, gold, keepsakes, and discoveries;
- ACTION, mute/settings, and contextual hints;
- quest and interaction markers.

Requirements:

- reusable nine-slice or scalable components;
- world remains visible;
- Grade 2 text remains large, sparse, and readable;
- Grade 5 presentation can carry richer information without feeling like schoolwork;
- all touch targets meet the supported iPad viewport policy;
- visual skin stays separate from interaction authority.

### Phase E — Atmosphere, motion, and juice

Add depth only after art and composition are stable.

Preferred effects:

- upper-left contact shadows;
- soft ambient color grade;
- controlled edge framing;
- pond shimmer;
- selected foliage movement;
- localized magical light;
- short arrival, reveal, reward, and impact bursts;
- small camera response for strong events only;
- environmental audio identities when approved production audio exists.

Restrictions:

- no permanent particle spam;
- no glow on every object;
- no heavy full-screen shader dependency without profiling;
- no animation that competes with navigation, text, or comfort;
- reduced-motion behavior remains supported.

### Phase F — Three-map visual cohesion

After the Farm establishes the production grammar, extend it to Wildbloom Woods and Eldoria Village.

Each location should share the world's projection and material logic while retaining a distinct identity.

**Wildbloom Woods**

- deeper canopy and mystery;
- tracking/sensing landmarks;
- ancient natural-magic accents;
- stronger shadow, flora, and route silhouettes;
- reasons to revisit after discoveries.

**Eldoria Village**

- readable streets, buildings, entrances, signs, and social spaces;
- warm windows and community landmarks;
- NPC identity and services;
- visible consequences of completed quests;
- visual contrast from Farm and Woods without changing camera or asset rules.

Do not add another major zone merely to increase map count before these three feel complete and connected.

### Phase G — Physical iPad and child evidence

Browser automation and emulation are required regression surfaces but do not certify the final experience.

Physical iPad checks include:

- load and offline behavior;
- canvas fit, centering, safe area, and orientation;
- joystick and ACTION comfort;
- accidental taps and browser interference;
- text fit and read-aloud balance;
- touch latency and frame pacing;
- memory/thermal stability over a normal session;
- terrain, character, and UI sharpness;
- both profile paths and all three maps.

Child evidence should observe:

- first-minute comprehension;
- remembered characters and landmarks;
- voluntary continuation;
- near-term goal understanding;
- confusion, friction, or adult-coaching needs;
- whether permanent progress feels meaningful.

Do not claim child validation from adult inspection or automation.

---

## 5. Perspective and sprite acceptance

All new character, NPC, creature, armor, and weapon work must pass the perspective lock before integration.

Minimum evidence:

- four-direction contact sheet;
- exact runtime sheet and enlarged nearest-neighbour preview;
- baseline/pivot overlay;
- bright Farm screenshot;
- darker Woods screenshot;
- apparent-height and identity comparison;
- idle/walk or required action timing review;
- one stationary elevated orthographic camera across every direction;
- strict South, West, North, and East actor headings;
- South and North direct cardinal facings retain visible top surfaces and vertical foreshortening;
- West and East are exact 90-degree rotations, not Southwest/Southeast diagonal turns or eye-level side elevations;
- profile-like West/East silhouettes are not rejected merely for being profile-like when their top surfaces prove the elevated camera;
- no armor/customization work before base geometry freezes.

---

## 6. Reference-alignment scorecard

A visual milestone is not complete merely because assets exist or tests pass.

Review the exact in-game result against these questions:

### Composition

- Is the first screen intentionally framed?
- Are paths and landmarks understandable without labels?
- Is important negative space preserved?
- Do high-density areas support rather than obscure play?

### Depth

- Are ground, Decor, structure, canopy, actors, and atmosphere visibly layered?
- Does the scene avoid both flatness and uniform clutter?
- Do borders frame the space without creating corridors everywhere?

### Cohesion

- Do materials share palette, light, outline, and perspective?
- Do characters belong to the same camera as the landscape?
- Do buildings, props, and vegetation feel produced for one game?

### Kid readability

- Is the next useful action visible?
- Are actors and interactables more salient than terrain?
- Are touch-critical areas uncluttered?
- Can both profiles understand guidance at their intended reading level?

### Delight and memory

- Is there a visible curiosity or magical promise?
- Can the location be recognized from a screenshot?
- Is at least one landmark or character memorable?
- Does completing an objective produce a satisfying visible response?

Material failures require correction even when CI is green.

---

## 7. Evidence requirements by change type

Use the smallest evidence set that proves the change, following `VISUAL_EVIDENCE_RETENTION_POLICY.md`.

- source-only asset: exact runtime output, enlarged preview, type-specific audit;
- terrain: one cell, 3×3 repeat, large-field repeat, transition context;
- scatter family: family contact sheet plus in-game density proof before integration;
- character family: four-direction/state contact sheet, pivots, runtime backgrounds;
- map composition: same-camera before/after, both profiles where relevant, iPad-like viewport;
- UI: state matrix, touch dimensions, long/short text, both profiles;
- atmosphere: before/after plus reduced-motion and performance evidence.

Temporary galleries remain artifacts or attachments. Commit only durable evidence needed to reproduce the final decision.

---

## 8. Technical constraints

- Preserve stable interaction IDs and quest targets.
- Preserve collision reachability and exits.
- Preserve or safely clamp loaded positions when map geometry changes.
- Keep gameplay authority out of presentation-only systems.
- Use deterministic generation and regeneration gates for committed surfaces.
- Avoid fractional/filtering blur where exact pixel presentation is intended.
- Keep production assets separate from source and review-only evidence.
- Use original/generated art with recorded provenance.
- Follow the current merge and independent-review policy in `AGENTS.md`.

---

## 9. Definition of visual transformation complete

The visual program is complete enough for the first family release when:

- the Farm no longer reads as a development grid;
- all three maps share one elevated visual grammar and retain distinct identities;
- first screens have authored composition and memorable landmarks;
- ground transitions, Decor, vegetation, structures, and atmosphere work as layers;
- Mage, Ranger Explorer, Mira, core NPCs, and creatures share the environment's fixed elevated camera and cardinal-heading grammar;
- transitional bridge facings are replaced where required;
- base character families are frozen before armor/customization expansion;
- Wildbloom discoveries appear embedded in the world;
- UI uses one readable fantasy system;
- iPad Safari behavior is physically verified;
- both profiles remain distinct, accessible, and fully playable;
- quests, curriculum, saves, rewards, and bonus-only learning remain correct;
- children demonstrate remembered goals, landmarks, or characters and voluntary return;
- remaining limitations are recorded honestly rather than hidden by a “beautification complete” label.
