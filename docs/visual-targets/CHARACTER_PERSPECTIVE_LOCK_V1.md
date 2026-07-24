# Character Perspective Lock v1.1

**Status:** Binding visual target for new production character, NPC, creature, equipment, and armor work  
**Original owner decision:** 2026-07-21  
**Cardinal-heading clarification:** 2026-07-23  
**Runtime integration status:** Not started  
**Current milestone status:** [`../CURRENT_STATE.md`](../CURRENT_STATE.md)

This document establishes the camera projection and sprite-family rules required to align Eldoria's actors with the owner-approved painterly landscape reference.

The key distinction is:

- **camera pitch** describes the fixed vertical viewing angle;
- **actor heading** describes the character's horizontal rotation on the world ground plane.

Those two axes must never be conflated.

---

## 1. Target projection

Eldoria uses one **fixed elevated orthographic 2.5D camera** for environments and standing actors.

The camera looks downward at approximately **35 degrees relative to an eye-level horizontal view**. That number is a practical description, not a machine-verifiable substitute for the owner-approved visual exemplars. When the number and an approved exemplar appear to differ, the approved exemplar governs the visual read.

The result should feel like a character standing inside a slightly overhead fantasy world — not:

- an eye-level portrait or platform-game elevation;
- a true top-down token;
- a true isometric diamond projection;
- a perspective or lens change between directions;
- four unrelated camera angles assigned to four movement directions.

All directions preserve one camera position, one downward pitch, one orthographic scale language, one lighting direction, and one grounding model. The actor rotates beneath that stationary camera.

Do not use the unqualified phrase **three-quarter side view** for four-direction actor headings. It previously conflated vertical camera elevation with a 45-degree horizontal actor turn.

---

## 2. Cardinal heading rules

The required four-direction set uses strict world-cardinal headings:

| Direction | Actor forward axis | Required body orientation |
| --- | --- | --- |
| South / down / front | toward the bottom of the world/screen ground plane | direct South heading |
| West / left | toward the left of the world/screen ground plane | exact 90-degree rotation from South |
| North / up / back | toward the top of the world/screen ground plane | exact 180-degree rotation from South |
| East / right | toward the right of the world/screen ground plane | exact 90-degree rotation from South in the opposite direction |

These are actor headings, not camera moves.

### South / down / front

The actor faces directly South. A square South heading is correct and must not be rotated toward Southwest or Southeast merely to create a diagonal character view.

Because the camera remains elevated, show:

- visible crown/top planes of hair, hood, hat, helmet, shoulders, backpack, quiver, or other upper equipment as applicable;
- facial features vertically foreshortened beneath the visible head top;
- shoulders and upper torso seen from above;
- torso and legs compressed by the fixed camera pitch;
- feet beneath the body with a stable bottom-centre contact point.

Avoid:

- an eye-level front elevation with no visible top planes;
- full-length legs rendered as if photographed horizontally;
- a forward-leaning or stepping pose when the target is neutral idle;
- forced horizontal yaw introduced only to avoid symmetry.

A neutral South idle may be broadly symmetrical. Camera elevation is proved by visible top planes and vertical foreshortening, not by turning the actor diagonally.

### West / left

Rotate the actor **exactly 90 degrees around its vertical axis from South to West** while the camera remains fixed and elevated.

The actor's forward axis must point exactly West, with no South-facing or North-facing component. The face, torso, hips, knees, and feet must all agree with that heading.

Because the camera remains elevated, show the appropriate top surfaces of the crown, nearer shoulder/upper torso, arms, hips, and footwear. Natural near/far occlusion is expected.

Important:

- a horizontally profile-like silhouette is correct for the strict West heading;
- it must still be an **elevated cardinal profile**, not an eye-level side elevation;
- do not require a front plane of the face or chest if doing so rotates the actor toward Southwest;
- do not rotate the far shoulder, hips, or feet toward the viewer to manufacture a three-quarter character pose;
- do not force both feet to be equally visible when correct elevated occlusion would hide part of the far foot.

### North / up / back

Rotate the actor exactly 180 degrees from South so the forward axis points North.

Show:

- the top and rear planes of hair, hood, helmet, shoulders, backpack, quiver, or other upper equipment;
- the rear of the costume under the same fixed camera pitch;
- vertically foreshortened torso and legs;
- stable apparent height and ground contact matching South.

Avoid:

- an eye-level flat rear elevation with no visible top surfaces;
- a diagonal Northwest or Northeast heading;
- equipment shifting scale, side, or camera pitch.

A square rear heading is correct. Do not add a side contour by rotating the actor away from North.

### East / right

Rotate the actor **exactly 90 degrees around its vertical axis from South to East** while the camera remains fixed and elevated.

The actor's forward axis must point exactly East, with no South-facing or North-facing component. The face, torso, hips, knees, and feet must all agree with that heading.

Because the camera remains elevated, show the appropriate top surfaces of the crown, nearer shoulder/upper torso, arms, hips, and footwear. Natural near/far occlusion is expected.

Important:

- a horizontally profile-like silhouette is correct for the strict East heading;
- it must still be an **elevated cardinal profile**, not an eye-level side elevation;
- do not require a front plane of the face or chest if doing so rotates the actor toward Southeast;
- do not rotate the far shoulder, hips, or feet toward the viewer to manufacture a three-quarter character pose;
- do not force both feet to be equally visible when correct elevated occlusion would hide part of the far foot.

### Eight-direction boundary

Diagonal actor headings are a separate, explicitly authorized eight-direction scope:

- Southwest;
- Northwest;
- Northeast;
- Southeast.

Those headings use approximately 45-degree horizontal actor rotations. They must never be substituted for West or East in a four-direction family.

### Mirroring policy

Do not assume horizontal mirroring is acceptable.

Mirroring may be used only when it preserves:

- upper-left lighting;
- asymmetric equipment placement;
- handedness where relevant;
- cloak, quiver, staff, weapon, hair, and costume identity;
- readable action silhouettes.

When those conditions fail, author West and East independently.

---

## 3. Shared body and camera rules

Every production family must maintain:

- one consistent head-to-body proportion;
- one fixed elevated camera pitch;
- one consistent apparent height;
- one bottom-centre pivot convention;
- one ground-contact line;
- one upper-left key light;
- one outline and contrast hierarchy;
- stable body mass across directions and states;
- no per-frame auto-scaling that changes apparent character size.

The character must not grow, shrink, tilt, change lens, or change camera height between:

- idle and walk;
- cardinal facings;
- cast, shoot, interact, hurt, and victory states;
- base outfit and equipment variants.

---

## 4. Grounding and footprint

Character art and gameplay geometry remain separate.

### Visual grounding

- Feet or the lowest body contact point align to the declared bottom-centre pivot.
- Contact shadows use the shared upper-left lighting model and remain independent runtime presentation where practical.
- Decorative height may extend above the collision body.
- Capes, staffs, bows, quivers, hair, and effects must not redefine the collision footprint.

### Movement readability

At exact runtime size:

- the leading foot or body shift must identify the walk phase;
- the silhouette remains readable over grass, dirt, water edges, Village materials, and darker Woods;
- animation does not produce vertical jumping unless intentionally part of the action;
- West/East movement does not look like skating;
- South movement does not read as a frontal dance loop.

---

## 5. Identity rules by family

### Mage

Preserve:

- friendly young hero identity;
- clear magical silhouette without permanent held equipment;
- simple facial expression at runtime size;
- audio-first player's approachable presentation.

For the neutral base:

- both hands are empty;
- no held staff;
- no permanent staff pixels;
- no cape in the canonical base;
- staff-on-back is a later separate equipment layer after the four-direction base and socket rules pass.

Casting and equipment states must inherit the accepted base camera, proportions, pivot, and cardinal headings.

### Ranger Explorer

Require:

- dedicated production art rather than bridge overlays;
- practical cloak, bow, and quiver silhouette;
- older-child competence;
- equipment consistent across all facings;
- action/shot frames authored under the same fixed elevated camera.

### Mira and NPCs

Require:

- the same camera pitch and grounding as the heroes;
- enough identity and silhouette variation to remain memorable;
- authored gestures that do not switch to portrait framing;
- stable interaction-marker clearance above the sprite.

### Creatures

Require:

- the same environmental camera pitch unless anatomy justifies a documented exception;
- readable top surfaces appropriate to anatomy and heading;
- stable ground contact and shadow;
- attack/hurt animation that preserves scale and projection.

---

## 6. Equipment, armor, and customization sequencing

Do not begin substantial armor or outfit-family production until the base sprite family passes this lock.

Required order:

1. approve one neutral base identity source;
2. approve all four cardinal idle directions;
3. approve all four cardinal walk directions;
4. approve the core profile action state;
5. freeze canvas, pivot, body proportions, camera pitch, and clip timing;
6. define equipment attachment and occlusion rules;
7. only then produce armor, clothing, weapon, and accessory variants.

Equipment variants inherit the exact base geometry. They must not rely on runtime stretching or per-frame repositioning to compensate for mismatched source art.

---

## 7. Source-generation contract

A production prompt or brief must state:

- the exact runtime cell and source-sheet geometry;
- one fixed elevated orthographic camera, approximately 35 degrees downward relative to eye level;
- strict South, West, North, and East actor headings beneath the stationary camera;
- South and North are direct cardinal front/rear headings, not eye-level elevations;
- West and East are exact 90-degree cardinal rotations, not Southwest/Southeast diagonal turns;
- visible top surfaces and vertical foreshortening appropriate to every heading;
- one upper-left key light;
- one stable body scale and bottom-centre pivot;
- no text, labels, frames, UI, checkerboard, scenery, or ground shadow;
- no effects outside cells unless the target specification explicitly includes a VFX layer;
- consistent identity, clothing, equipment, proportions, and palette across all frames;
- exact state and direction layout;
- wide clean key-colour or true-alpha separation;
- no cell bleed.

For West/East prompts, prefer this construction:

> Rotate the actor exactly 90 degrees around its vertical axis beneath the same stationary elevated camera. Its forward axis points exactly West/East with no South or North component. Preserve visible top surfaces from the elevated camera; do not rotate the actor diagonally toward the viewer.

Do not use the phrase “three-quarter side view” for a four-direction West/East prompt.

Final prompt wording should be trialled against one bounded sprite state before commissioning a full family.

---

## 8. Trial protocol

The first production experiment should be a small camera-and-heading proof set, not a complete animation library.

Recommended trial:

- one character identity;
- four cardinal idle facings;
- one neutral outfit;
- no armor variants;
- no elaborate VFX;
- enough source resolution for clean normalization;
- exact runtime preview in the Farm and one darker Woods background.

Generate direction by direction when needed to protect exact cardinal heading. A same-sheet approach may be compared, but it does not override per-direction heading accuracy.

Select based on identity consistency, camera consistency, cardinal accuracy, runtime readability, clean normalization, and iteration cost — not high-resolution attractiveness alone.

Trials from different providers or generation strategies may be compared, but no provider's output is privileged. The exact normalized runtime result and in-game evidence decide.

---

## 9. Required evidence

Before a base character family is approved:

- exact source dimensions and grid audit;
- exact normalized cell sheet;
- contact sheet of all directions and states;
- exact `1×` runtime preview;
- enlarged nearest-neighbour preview;
- bright Farm background capture;
- darker Woods background capture;
- pivot and baseline overlay;
- direction-to-direction apparent-height comparison;
- identity and equipment consistency review;
- cardinal-heading audit;
- idle-to-walk timing review;
- no cell bleed or effects outside cells;
- Mage and Ranger comparison when both families exist;
- iPad-like browser viewport after integration;
- physical-iPad status stated honestly.

### Camera and heading acceptance questions

- Do all four directions share one stationary elevated camera and apparent scale?
- Does South point exactly down while still showing crown/shoulder top surfaces and vertical foreshortening?
- Does West point exactly left with no Southwest or Northwest yaw?
- Does North point exactly up while showing top/rear surfaces under the same camera?
- Does East point exactly right with no Southeast or Northeast yaw?
- Are West/East elevated cardinal profiles rather than eye-level side elevations?
- Do feet, contact point, and shadows agree with the environment's ground plane?
- Does equipment remain on the same body, side, and scale?
- Does the character feel embedded in the landscape rather than pasted onto it?

Any material “no” means the lock has not passed.

---

## 10. Rejection conditions

Reject or regenerate when:

- any direction changes camera pitch, camera height, lens, or apparent scale;
- South or North is rendered as an eye-level elevation with no visible top surfaces;
- West/East drifts into Southwest/Southeast or Northwest/Northeast;
- a correct cardinal side heading is rejected merely because its horizontal silhouette is profile-like;
- top surfaces disappear in West/East because the camera was flattened to eye level;
- apparent height changes materially between directions;
- head, shoulders, equipment, or feet change scale;
- identity drifts between cells;
- pivot or baseline jumps;
- lighting flips between directions;
- armor or weapons change handedness unintentionally;
- details collapse at runtime size;
- the sprite matches itself but not the environment's camera pitch;
- high-resolution polish hides an incorrect normalized result.

Use **CHANGE TARGET SIZE** when identity, camera, and heading are correct but cannot survive the declared runtime canvas.

---

## 11. Completion boundary

This lock is complete as a specification when independently reviewed and merged.

The sprite-rebuild milestone is complete only when:

- the approved camera-and-heading proof trial exists;
- base Mage and Ranger families pass all applicable evidence gates;
- required NPC/creature families are sequenced from the same camera;
- base timing and pivots are frozen;
- armor/customization production can begin without rebuilding the bases again;
- runtime screenshots show the characters naturally aligned with the approved landscapes;
- physical-iPad confirmation remains explicitly tracked until performed.
