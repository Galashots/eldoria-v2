# Character Perspective Lock v1

**Status:** Binding visual target for new production character, NPC, creature, equipment, and armor work  
**Owner decision:** 2026-07-21  
**Runtime integration status:** Not started  
**Current milestone status:** [`../CURRENT_STATE.md`](../CURRENT_STATE.md)

This document establishes the camera projection and sprite-family rules required to align Eldoria's characters with the owner-approved painterly landscape reference.

The existing direct-to-camera downward facings are transitional. Production sprite families should be rebuilt rather than extended when they cannot satisfy this lock cleanly.

---

## 1. Target projection

Characters are viewed through the same **elevated three-quarter camera** as the environments.

The result should feel like a character standing inside a slightly overhead fantasy world — not:

- a frontal portrait walking on a flat background;
- a pure side-view platform character;
- a true top-down token;
- a true isometric diamond projection;
- four unrelated camera angles assigned to four movement directions.

All directions must preserve one camera pitch, one scale language, one lighting direction, and one grounding model.

---

## 2. Direction rules

### Moving down / facing the player

The down-facing view must remain elevated rather than directly frontal.

Show:

- visible top planes of hair, hood, hat, helmet, shoulders, backpack, quiver, staff head, or other upper equipment as applicable;
- facial features simplified and slightly foreshortened;
- shoulders and upper torso viewed from above;
- feet and lower body beneath the torso rather than spread in a portrait-like stance;
- the ground contact point clearly below the body mass.

Avoid:

- symmetrical front-elevation poses;
- a face and chest presented squarely to the camera;
- full-length legs with no overhead compression;
- equipment drawn as if photographed straight on.

### Moving up / facing away

Show:

- the top and rear planes of hair, hood, helmet, shoulders, cloak, backpack, quiver, or staff;
- enough side contour to preserve the elevated three-quarter view;
- a compact readable foot rhythm;
- consistent body height and ground contact with the down-facing view.

Avoid:

- a flat rear elevation;
- a character reduced to the back of a head and a rectangle of torso;
- equipment shifting to a different scale or camera pitch.

### Moving left and right

Side directions are **three-quarter side views**, not pure profiles.

Show:

- the near shoulder and some chest/back plane;
- visible top planes on hair, headgear, shoulders, and carried equipment;
- a clear forward leg and trailing leg without changing the camera height;
- equipment placement that agrees with the down/up facings.

Avoid:

- a flat profile with no visible top surfaces;
- an enlarged head or weapon caused by a side-view camera change;
- mirrored lighting when deriving the opposite direction.

### Mirroring policy

Do not assume horizontal mirroring is acceptable.

Mirroring may be used only when it preserves:

- upper-left lighting;
- asymmetric equipment placement;
- handedness where relevant;
- cloak, quiver, staff, weapon, hair, and costume identity;
- readable action silhouettes.

When those conditions fail, author both directions independently.

---

## 3. Shared body and camera rules

Every production family must maintain:

- one consistent head-to-body proportion;
- one consistent camera pitch;
- one consistent apparent height;
- one bottom-center pivot convention;
- one ground-contact line;
- one upper-left key light;
- one outline and contrast hierarchy;
- stable body mass across directions and states;
- no per-frame auto-scaling that changes apparent character size.

The character should not grow, shrink, tilt, or change lens between:

- idle and walk;
- directional facings;
- cast, shoot, interact, hurt, and victory states;
- base outfit and equipment variants.

---

## 4. Grounding and footprint

Character art and gameplay geometry remain separate.

### Visual grounding

- Feet or the lowest body contact point align to the declared bottom-center pivot.
- Contact shadows use the shared upper-left lighting model and remain independent runtime presentation where practical.
- Decorative height may extend above the collision body.
- Capes, staffs, bows, quivers, hair, and effects must not redefine the collision footprint.

### Movement readability

At exact runtime size:

- the leading foot or body shift must identify the walk phase;
- the silhouette should remain readable over grass, dirt, water edges, village materials, and dark woods;
- animation should not produce vertical jumping unless intentionally part of the action;
- left/right movement should not look like skating;
- down-facing movement should not read as a frontal dance loop.

---

## 5. Identity rules by family

### Mage

Preserve:

- friendly young hero identity;
- magical silhouette;
- staff/hand casting readability;
- simple facial expression at runtime size;
- audio-first player's clear, approachable presentation.

Rebuild where needed so the down-facing view shows elevated top planes rather than the current direct-to-camera presentation.

### Ranger Explorer

Require:

- dedicated production art rather than bridge overlays;
- practical cloak, bow, and quiver silhouette;
- older-child competence;
- equipment consistent across all facings;
- action/shot frames authored for the same camera pitch.

### Mira and NPCs

Require:

- the same projection and grounding as the heroes;
- enough identity and silhouette variation to remain memorable;
- authored gestures that do not switch to portrait framing;
- stable interaction-marker clearance above the sprite.

### Creatures

Require:

- the same environmental camera pitch unless the creature's anatomy justifies a deliberate exception;
- readable top and side planes;
- stable ground contact and shadow;
- attack/hurt animation that preserves scale and projection.

---

## 6. Equipment, armor, and customization sequencing

Do not begin substantial armor or outfit-family production until the base sprite family passes this perspective lock.

Required order:

1. approve one neutral base identity sheet;
2. approve all four idle directions;
3. approve all four walk directions;
4. approve the core profile action state;
5. freeze canvas, pivot, body proportions, camera pitch, and clip timing;
6. define equipment attachment and occlusion rules;
7. only then produce armor, clothing, weapon, and accessory variants.

Equipment variants must inherit the exact base geometry. They must not rely on runtime stretching or per-frame repositioning to compensate for mismatched source art.

---

## 7. Source-generation contract

A production prompt or brief must state:

- the exact runtime cell and source-sheet geometry;
- elevated three-quarter camera shared across all directions;
- visible top planes in every facing;
- down-facing is foreshortened, not straight frontal;
- left/right are three-quarter side views, not pure profiles;
- one upper-left key light;
- one stable body scale and bottom-center pivot;
- no text, labels, frames, UI, checkerboard, scenery, or ground shadow;
- no effects outside cells unless the target specification explicitly includes a VFX layer;
- consistent identity, clothing, equipment, proportions, and palette across all frames;
- exact state and direction layout;
- wide clean key-color or true-alpha separation;
- no cell bleed.

Final prompt wording should be trialed against one bounded sprite state before commissioning a full family.

---

## 8. Trial protocol

The first production experiment should be a small perspective-proof set, not a complete animation library.

Recommended trial:

- one character identity;
- four idle facings;
- one neutral outfit;
- no armor variants;
- no elaborate VFX;
- enough source resolution for clean normalization;
- exact runtime preview in the Farm and one darker Woods background.

The trial should compare at least two generation approaches when practical:

1. one same-identity four-direction sheet;
2. direction-by-direction generation from an approved identity anchor.

Select based on identity consistency, camera consistency, runtime readability, clean normalization, and iteration cost — not high-resolution attractiveness alone.

Trials from different providers or generation strategies may be compared against each other, but no provider's output is privileged. The exact normalized runtime result and in-game evidence decide.

---

## 9. Required evidence

Before a base character family is approved:

- exact source dimensions and grid audit;
- exact normalized cell sheet;
- contact sheet of all directions and states;
- exact `1×` runtime preview;
- enlarged nearest-neighbor preview;
- bright Farm background capture;
- darker Woods background capture;
- pivot and baseline overlay;
- direction-to-direction apparent-height comparison;
- identity and equipment consistency review;
- idle-to-walk timing review;
- no cell bleed or effects outside cells;
- Mage and Ranger comparison when both families exist;
- iPad-like browser viewport after integration;
- physical-iPad status stated honestly.

### Perspective acceptance questions

- Can the top of the head/hood/hair be seen in the down-facing view?
- Does the torso read as foreshortened rather than frontal?
- Do side views retain visible top surfaces?
- Do all four directions appear to share one camera?
- Do feet and shadows agree with the environment's ground plane?
- Does equipment remain on the same body and at the same scale?
- Does the character feel embedded in the landscape rather than pasted onto it?

Any material “no” means the perspective lock has not passed.

---

## 10. Rejection conditions

Reject or regenerate when:

- down-facing is direct frontal elevation;
- side-facing is pure profile while other directions are elevated;
- apparent height changes materially between directions;
- head, shoulders, equipment, or feet change scale;
- identity drifts between cells;
- pivot or baseline jumps;
- lighting flips between directions;
- armor or weapons change handedness unintentionally;
- details collapse at runtime size;
- the sprite matches itself but not the environment's projection;
- high-resolution polish hides an incorrect normalized result.

Use **CHANGE TARGET SIZE** when the identity and projection are correct but cannot survive the declared runtime canvas.

---

## 11. Completion boundary

This perspective lock is complete as a specification when independently reviewed and merged.

The sprite-rebuild milestone is complete only when:

- the approved perspective-proof trial exists;
- base Mage and Ranger families pass all applicable evidence gates;
- required NPC/creature families are sequenced from the same projection;
- base timing and pivots are frozen;
- armor/customization production can begin without rebuilding the bases again;
- runtime screenshots show the characters naturally aligned with the approved landscapes;
- physical-iPad confirmation remains explicitly tracked until performed.
