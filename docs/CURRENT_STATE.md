# Eldoria-V2 Current State

Last refreshed on 2026-07-10. This file records volatile project status; `AGENTS.md` remains the durable operating contract.

## Playable Vertical Slice

- Phaser, Vite, TypeScript, and Tiled farm map.
- Grade 2 audio-first and Grade 5 reader-mode profiles.
- A fresh profile now enters a short, skippable **Waking Gate** action scene before the farm: the Mage fires three spell sparks and the Ranger Explorer fires three tracking shots, with immediate touch/keyboard feedback, impact reactions, progress pips, a completion burst, and no learning gate or save-schema change. Existing saves and returning profiles enter the farm directly.
- The first-minute visual polish pass replaces the opening's diagram hero with the real Mage sprite/cast animation (and a tinted normalized hero proxy with bow/quiver cues for Ranger), simplifies the opening instructions, adds visibly escalating rune/crack/particle damage states, and carries the gate event into the farm through an arrival burst, guiding sparkle trail, player shadow, gold Mira marker, warmer presentation layer, and story-forward helper text.
- The Practice Slime now continues those profile abilities inside the farm through a focused three-hit encounter: visible pips, Mage spell sparks or Ranger tracking shots, friendly squash/hop reactions, rapid-tap rejection, and a larger completion burst. The existing optional learning prompt opens only after the third deliberate hit; quest, mastery, inventory, gold, and save state do not change before the prompt resolves.
- Keyboard movement, dynamic lower-left joystick, and lower-right ACTION control.
- Mira's First Errand with objective HUD, optional crop/slime prompts, return reward, save/load, and permanent Sunberry Charm keepsake.
- One optional second micro-errand, The Whispering Scarecrow, becomes available after Mira's first errand, reuses the existing crop patch interaction, and adds a short investigate-and-return loop with a text-only Moonseed Charm discovery and a small gold reward.
- Learning remains bonus-only: wrong answers and skips never block quest progress.
- Floating gold/item feedback, primitive sparkle bursts, and per-skill mastery records.
- Contextual Grade 2/Grade 5 templates and development/E2E-only deterministic prompt preview.
- Playwright browser coverage includes both profiles, the one-time Waking Gate, the real three-tap Practice Slime encounter, rapid-tap rejection, Ranger front/side/ACTION presentation, prompt timing, quest/save behavior, mastery, curriculum templates, preview side-effect safety, portrait-orientation guidance, and the Stats & Mastery panel.
- Crop Bonus interactions provide short, readable visual feedback before their unchanged optional prompts open.
- Arcade Physics bounds cover the full farm map, so the crop/scarecrow and Practice Slime targets are reachable through normal movement rather than only test positioning.
- Optional prompt panels render above the actor and provide a button-sized pointer target for `Skip bonus`.
- Portrait phone/tablet layouts show a DOM-based landscape-orientation message instead of shrinking the playable canvas into an unreadable strip.
- A parent-facing real-child playtest guide documents the live iPad setup, controls, per-profile session scripts, save reset steps, observation notes, and blocker-versus-polish triage.
- Hero animation/rendering is isolated in a profile-configured presentation controller. The Mage uses approved normalized animation sheets; the Ranger now uses the existing directional physics sprite plus presentation-only hood, mantle, leather strap, bow, quiver, arrows, and ACTION recoil until approved production art exists.
- Mira's two errands use a renderer-independent farm quest state system while preserving the existing version-1 save fields and player-facing behavior.
- A third optional errand, The Sleepy Sprouts, becomes available after the Whispering Scarecrow completes: wake 3 new "Sleepy Sprout" map markers around the farm, then return to Mira for gold and a new Wildbloom Sprig keepsake. Continues the "old magic waking" thread the second errand introduced.
- The Stats & Mastery panel's keepsake section is a small charm-registry-driven row of slots instead of one hardcoded Sunberry Charm slot, so newly earned charms are visible there.
- Green `main` builds automatically deploy to GitHub Pages at `https://galashots.github.io/eldoria-v2/` for HTTPS browser play on the boys' iPads.
- Stable interaction IDs are fully decoupled from display labels/names using `interactionId` Tiled custom properties, preventing marker name changes from breaking handler mappings.
- Fully integrated Vitest unit test framework with unit tests covering QuestionEngine, MasterySystem, LearningBonusSystem, interactions, and curriculum templates.
- Established save migration seam in SaveSystem and updated WorldScene saving to dynamically read CURRENT_SAVE_VERSION.
- Center-canvas Stats & Mastery UI overlay showing active profile details, gold, charms keepsake slots, and visual mastery bars across core subjects. Interactive STATS HUD button and I/Tab hotkeys are functional.
- Ported Web SpeechSynthesis garbage collection reference pins and lifecycle event listeners.
- A full audio pipeline: looping background music, footstep/interact/reward/quest-complete/UI-tap SFX, a default-on mute toggle in the HUD (persisted independent of per-profile saves), and read-aloud ducking music while a prompt is being spoken. **The shipped audio files are synthesized placeholders, not final assets** — see `ATTRIBUTION.md` for the concrete licensed packs to swap in once a normal network is available.
- The Grade 5 fraction template (`grade5-farm-fractions-sunberry-rows`) asks for a fraction-to-decimal conversion with a denominator of 10 or 100, matching Alberta's actual outcome wording more closely than the previous generic framing.
- A visual design pass fixed several code-only UI issues across the title screen, HUD, Stats & Mastery panel, and bonus-prompt panel: shared rounded-rect helpers replace ad hoc flat rectangles; the prompt background is fully opaque; keepsake slots have individual captions; mute and coin icons are hand-drawn instead of emoji; and the title screen has a warmer magical presentation.
- The Attention-First Opening Pass is implemented: Grade 5's player-facing label is **Ranger Explorer** (internal `grade5-adventurer` ID unchanged); the title and Mira dialogue seed the "old magic waking" mystery; the Wildbloom Sprig hints at future secrets; keepsake rewards receive emphasized feedback; and repetitive placeholder audio is quieter.

## Visual And Asset State

- Visual asset contract and validated hero, starter-equipment, Practice Slime, and farm/village target specs.
- Manifest-driven PNG normalization and validation pipeline with alpha, color-key, and edge-flood cleanup.
- Practice Slime v001 source and normalized `192x128` runtime sheet are committed.
- Practice Slime v001 is preloaded, displayed at its Tiled interaction coordinates, plays its four-frame idle loop, and now participates in the three-hit encounter with three pips, profile-colored projectiles, readable reactions, a child-safe completion burst, and reset-to-idle behavior after the optional prompt.
- Grade 2 Mage hero idle v001 is displayed with four directional idle loops from normalized `32x48` cells.
- Grade 2 Mage walk v001 plays six-frame directional loops while keyboard or joystick movement is active, returning to matching idle on release.
- Grade 2 Mage cast v001 plays for ordinary ACTION use and each Practice Slime spell strike.
- Grade 2 Mage hurt v001 remains available only from a development/test-safe preview path with no combat, damage, reward, quest, or save effects.
- The Waking Gate reuses the real Mage sprite and cast animation, while Ranger uses a tinted normalized hero proxy plus presentation-only bow/quiver accents until production Ranger art exists.
- The Grade 5 Ranger Explorer technical target is validated as `char_ranger_boy_base`; final production sprite generation and normalization remain pending a dedicated art pass.
- Inside the farm, Grade 5 now reads as Ranger Explorer through a forest-green hood and mantle, leather harness cue, visible bow/quiver/arrows in every direction, and a short ACTION recoil/arrow presentation layered around the existing directional adventurer base. This is an intentional bridge, not final production art.
- Equipment, farm/village, crop, building, and broader UI production art remain target specifications rather than final integrated assets.

## Active Milestone

The **Ranger Explorer Identity Pass** defined in `docs/RANGER_IDENTITY_PASS_2026-07.md` is implemented and browser-verified. It removes the largest profile-role mismatch in the playable farm while preserving the existing collision, quest, curriculum, reward, and save seams.

The **Practice Slime Combat & Profile Ability Loop** defined in `docs/PRACTICE_SLIME_COMBAT_PLAN_2026-07.md` also remains implemented and browser-verified: three profile-specific ACTION hits, readable reactions and health pips, then the existing optional learning prompt. It adds no player damage, fail state, enemy AI, random loot, new save fields, quest #4, or generalized combat architecture.

The build remains technically verified rather than child-validated until the deployed iPad experience is observed directly.

## Next Checkpoint

1. Verify the merged Waking Gate, Ranger identity, and Practice Slime flow on an actual iPad in landscape, focusing on ACTION timing, accidental double taps, text fit, audio levels, and whether the first minute holds attention.
2. Replace the Ranger bridge presentation with dedicated `char_ranger_boy_base` idle/walk/action sheets through the existing normalization and presentation-controller contract; do not redesign gameplay while swapping art.
3. Implement the Wildbloom Sprig discovery loop so the first permanent keepsake leads to an optional secret in the existing farm.
4. Add a small merchant/customization gold sink so quest and bonus rewards visibly change the hero or world.
5. Reassess after those loops before choosing quest #4, a second zone, or broader combat architecture.

## Lighting Note (for whenever the atmosphere work lands)

A research pass initially surfaced a Phaser 3 tutorial using normal maps and `Light2D`. This project runs Phaser `^4.2.0`, which ships its own `PointLight` game object (`this.add.pointlight(x, y, color, radius, intensity, attenuation)`) and is the preferred future route for controlled torch, window, spell-impact, or muzzle-flash effects without normal-map setup.

## Routine Merge Policy

Codex may self-audit and squash-merge a narrow, agreed PR when targeted tests, `npm run check`, `npm run build`, and `npm run smoke` pass and gameplay/UI changes receive browser inspection. Scope expansion or product/curriculum/architecture decisions require a user or ChatGPT checkpoint.
