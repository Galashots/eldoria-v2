# Eldoria-V2 Armor and Battle Animation Contract

**Status:** Durable pre-production contract. This document fixes the first implementation architecture before armor art, equipment runtime code, or broader combat expansion begins.

References:

- [`VISUAL_ASSET_CONTRACT.md`](VISUAL_ASSET_CONTRACT.md)
- [`visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md)
- [`visual-targets/HERO_ACTOR_TARGETS.md`](visual-targets/HERO_ACTOR_TARGETS.md)
- [`visual-targets/MAGE_STARTER_EQUIPMENT_TARGETS.md`](visual-targets/MAGE_STARTER_EQUIPMENT_TARGETS.md)
- [`ELDORIA_MASTER_PLAN.md`](ELDORIA_MASTER_PLAN.md)
- [`CURRENT_STATE.md`](CURRENT_STATE.md)

## Product boundaries

- Learning remains bonus-only and never gates adventure.
- Armor art does not own collision, hurtboxes, hitboxes, movement, quest progress, curriculum, or rewards.
- The first armor implementation is cosmetic. Inventory, equipment stats, shops, and gold costs are later product work.
- Battle animation assets are created only for actions the game actually supports or has explicitly scheduled.
- Hurt presentation remains child-safe. Do not add blood, wounds, frightening injury, or death animation merely to complete a conventional RPG checklist.
- Do not produce substantial armor or outfit families against transitional base sprites that do not pass the character-perspective lock.

## Perspective-first prerequisite

The base actor must pass `CHARACTER_PERSPECTIVE_LOCK_V1.md` before armor, clothing, weapon, or accessory production begins.

The current direct-to-camera downward facings are transitional. Rebuild the base family first when its camera, body geometry, pivot, or apparent scale is scheduled to change.

Required freeze before equipment production:

- elevated three-quarter camera pitch;
- four-direction base identity;
- apparent body height and proportions;
- canvas and cell geometry;
- bottom-center pivot and baseline;
- clip names and frame counts;
- per-frame durations and semantic event frames;
- attachment sockets and direction-specific occlusion rules.

## Locked armor architecture

Eldoria uses a hybrid source-layer and compiled-runtime model.

### Editable source

The editable source keeps these pieces separate and aligned to the perspective-locked base actor:

- base body;
- torso or robe;
- helm or hat;
- cape or back piece;
- weapon;
- named attachment slices and sockets.

Separate source components preserve clean authoring, future recolours, and later customization. They are not automatically separate runtime sprites.

### Runtime outfit package

The first runtime implementation equips one complete outfit set atomically. A compiled outfit package may contain at most two synchronized transparent sheets:

1. `outfit_back` — portions that must render behind the body, such as the back of a cape; rendered in the existing `actors_body` group with a lower local depth than the base actor.
2. `outfit_front` — torso, helm, front cape edges, bracers, and other visible armor; rendered on `armor_overlays`.

The package is one selectable outfit even when it uses two render slices. The first implementation does not independently swap robe, hat, cape, and bracers at runtime.

This avoids multiplying alignment and animation failures while preserving a reusable base body. It also avoids duplicating the base character pixels inside every armor tier.

### Weapons

Weapons remain separate synchronized overlays because their foreground or background relationship can change by direction and action.

- The weapon source aligns to the actor's declared socket.
- A weapon may use a back slice in the existing actor-depth group and a front slice on `weapons_front`.
- The owning actor's action timeline is authoritative.
- Weapon art does not invent hitboxes or damage windows.
- Direction-specific weapon planes must preserve the shared elevated camera rather than switching to frontal or pure-profile presentation.

### Required inheritance

Every compiled outfit and weapon overlay inherits the owning actor's:

- perspective and camera pitch;
- canvas size;
- footprint;
- pivot and bottom-centre anchor;
- directions;
- clip names;
- frame count;
- per-frame duration;
- event-frame numbering;
- nearest-neighbour rendering;
- upper-left light direction;
- attachment sockets and occlusion plan.

No independent scale, baseline, frame index, easing, projection, or playback clock is permitted.

## First Mage outfit package

The existing Grade 2 source-component targets remain:

- `armor_mage_starter_robe`;
- `armor_mage_starter_hat`;
- `armor_mage_starter_cape`;
- `weapon_mage_starter_staff`.

Their first compiled runtime package is:

- package ID: `armor_mage_starter_outfit`;
- back slice: `armor_mage_starter_outfit_back`;
- front slice: `armor_mage_starter_outfit_front`;
- weapon package: `weapon_mage_starter_staff`.

The outfit package synchronizes only to the Mage clips required by the approved perspective-locked base target: `idle`, `walk`, `cast`, and `hurt`.

Do not generate light attack, heavy attack, death, or special-action armor frames until those base clips and gameplay actions are explicitly scoped.

## Battle animation contract

### Base actor owns timing

The base actor sheet is the animation authority. Armor, weapons, shadows, projectiles, and VFX subscribe to that timeline rather than maintaining independent durations.

Each non-looping action records semantic event frames when relevant:

- `anticipation_start`;
- `projectile_spawn` or `contact`;
- `recovery_start`;
- `clip_complete`.

A melee action may later add `hitbox_on` and `hitbox_off`, but only when a combat system owns real hit detection. Art-only work must not invent them.

### Initial hero clip sets

Grade 2 Mage production baseline:

- `idle`;
- `walk`;
- `cast`;
- `hurt`.

Grade 5 Ranger Explorer production baseline:

- `idle`;
- `walk`;
- `shoot`;
- `hurt`.

The Ranger's current code-drawn ACTION recoil and tracking shot are bridge presentation. Dedicated perspective-locked Ranger sheets must replace that bridge before Ranger armor production begins.

### Deferred combat clips

The following remain deferred until a real encounter requires them:

- light melee attack;
- heavy melee attack;
- dodge or block;
- death;
- special or ultimate actions;
- generalized enemy attack sets;
- player damage and health-state transitions.

A deferred clip is not generated solely to make an asset list look complete.

### VFX and reactions

- Projectiles and impact effects remain separate from actor sheets.
- Effects reinforce anticipation, release, contact, and recovery; they do not obscure the actor or replace readable motion.
- Creature reactions must remain readable and child-safe.
- Camera shake, flashes, and particles require reduced-motion-safe behavior and physical-iPad profiling before final certification.

## Production order

Current status and the active step remain authoritative only in `CURRENT_STATE.md`.

Strategic order:

1. complete one bounded four-direction character perspective proof;
2. rebuild and approve the production Mage and Ranger Explorer base families;
3. approve required NPC and creature bases that share their projection;
4. freeze camera pitch, canvas, pivots, proportions, clip names, frame counts, durations, sockets, and event frames;
5. generate and audit the Mage starter source components against the frozen Mage base;
6. compile and audit the Mage `outfit_back` and `outfit_front` runtime sheets plus the separate staff sheet;
7. integrate a cosmetic whole-outfit toggle with no stats or unapproved save-schema expansion;
8. add merchant, inventory, equipment slots, prices, and gameplay bonuses only in a separately scoped progression milestone.

Do not treat completion of the Farm environment as permission to skip the character perspective proof, and do not build armor in parallel with an unresolved base-sprite camera change.

## Acceptance gates

Armor source and runtime work must prove:

- the base family already passed the character-perspective lock;
- exact base canvas, pivot, frame count, and timing inheritance;
- no frame-to-frame or direction-to-direction scale drift at 1× and enlarged nearest-neighbour review scales;
- correct behind-body and front-body occlusion in every direction;
- preserved face, hands, feet, and interaction-readable silhouette;
- stable animation transitions for idle, walk, action, and hurt;
- consistent elevated projection for the outfit and weapon planes;
- no collision, quest, save, curriculum, mastery, or reward regression;
- fresh in-engine screenshots for all directions and required clips on bright and dark backgrounds;
- physical-iPad verification before claiming final touch-device certification.

## Change control

Changing the runtime granularity from whole-outfit packages to independently swappable live armor pieces is an architecture change. It requires a focused prototype proving synchronization, render order, memory cost, and iPad performance before the target specifications or production pipeline are expanded.

Changing the approved character camera, base geometry, pivot, or clip timing after armor production begins is also a consequential change. Stop and reassess the base family rather than silently repairing every overlay independently.
