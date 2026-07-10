# Eldoria-V2 Current State

Last refreshed on 2026-07-10. This file records volatile project status; `AGENTS.md` remains the durable operating contract.

## Playable Vertical Slice

- Phaser, Vite, TypeScript, and Tiled farm map.
- Grade 2 audio-first and Grade 5 reader-mode profiles.
- A fresh profile now enters a short, skippable **Waking Gate** action scene before the farm: the Mage fires three spell sparks and the Ranger Explorer fires three tracking shots, with immediate touch/keyboard feedback, impact reactions, progress pips, a completion burst, and no learning gate or save-schema change. Existing saves and returning profiles enter the farm directly.
- The first-minute visual polish pass replaces the opening's diagram hero with the real Mage sprite/cast animation (and a tinted normalized hero proxy with bow/quiver cues for Ranger), simplifies the opening instructions, adds visibly escalating rune/crack/particle damage states, and carries the gate event into the farm through an arrival burst, guiding sparkle trail, player shadow, gold Mira marker, warmer presentation layer, and story-forward helper text.
- Keyboard movement, dynamic lower-left joystick, and lower-right ACTION control.
- Mira's First Errand with objective HUD, optional crop/slime prompts, return reward, save/load, and permanent Sunberry Charm keepsake.
- One optional second micro-errand, The Whispering Scarecrow, becomes available after Mira's first errand, reuses the existing crop patch interaction, and adds a short investigate-and-return loop with a text-only Moonseed Charm discovery and a small gold reward.
- Learning remains bonus-only: wrong answers and skips never block quest progress.
- Floating gold/item feedback, primitive sparkle bursts, and per-skill mastery records.
- Contextual Grade 2/Grade 5 templates and development/E2E-only deterministic prompt preview.
- Playwright browser coverage now includes the one-time Waking Gate flow plus the existing vertical-slice tests covering both profiles, quest/save behavior, mastery, templates, preview side-effect safety, portrait-orientation guidance, and the Stats & Mastery panel.
- Crop Bonus and Practice Slime interactions now provide short, readable visual feedback before their unchanged optional prompts open.
- Arcade Physics bounds now cover the full farm map, so the crop/scarecrow and Practice Slime targets are reachable through normal movement rather than only test positioning.
- Optional prompt panels render above the actor and provide a button-sized pointer target for `Skip bonus`.
- Portrait phone/tablet layouts show a DOM-based landscape-orientation message instead of shrinking the playable canvas into an unreadable strip.
- A parent-facing real-child playtest guide documents the live iPad setup, controls, per-profile session scripts, save reset steps, observation notes, and blocker-versus-polish triage.
- Hero animation/rendering is isolated in a profile-configured presentation controller; the unchanged Grade 5 placeholder remains the fallback until approved Ranger art exists.
- Mira's two errands now use a renderer-independent farm quest state system while preserving the existing version-1 save fields and player-facing behavior.
- A third optional errand, The Sleepy Sprouts, becomes available after the Whispering Scarecrow completes: wake 3 new "Sleepy Sprout" map markers around the farm (reusing the crop-bonus-style optional prompt), then return to Mira for gold and a new Wildbloom Sprig keepsake. Continues the "old magic waking" thread the second errand introduced.
- The Stats & Mastery panel's keepsake section is now a small charm-registry-driven row of slots instead of one hardcoded Sunberry Charm slot, so newly earned charms (like Wildbloom Sprig) are visible there.
- Green `main` builds automatically deploy to GitHub Pages at `https://galashots.github.io/eldoria-v2/` for HTTPS browser play on the boys' iPads.
- Stable interaction IDs are fully decoupled from display labels/names using `interactionId` Tiled custom properties, preventing marker name changes from breaking handler mappings.
- Fully integrated Vitest unit test framework with unit tests covering QuestionEngine, MasterySystem, LearningBonusSystem, interactions, and curriculum templates.
- Established save migration seam in SaveSystem and updated WorldScene saving to dynamically read CURRENT_SAVE_VERSION.
- Center-canvas Stats & Mastery UI overlay showing active profile details, gold, charms keepsake slot, and visual mastery bars across core subjects. Interactive STATS HUD button and I/Tab hotkeys fully functional.
- Ported Web SpeechSynthesis garbage collection reference pins and lifecycle event listeners.
- A full audio pipeline: looping background music, footstep/interact/reward/quest-complete/UI-tap SFX, a default-on mute toggle in the HUD (persisted independent of per-profile saves), and read-aloud ducking music while a prompt is being spoken. **The shipped audio files are synthesized placeholders, not final assets** — see `ATTRIBUTION.md` for the concrete licensed packs to swap in once a normal (non-sandboxed) network is available.
- The Grade 5 fraction template (`grade5-farm-fractions-sunberry-rows`) now asks for a fraction-to-decimal conversion with a denominator of 10 or 100, matching Alberta's actual outcome wording more closely than the previous generic "simplify to 1/4" framing.
- A visual design pass (grounded in a live-screenshot critique against `docs/VISUAL_ASSET_CONTRACT.md`) fixed several code-only UI issues across the title screen, HUD, Stats & Mastery panel, and bonus-prompt panel: shared rounded-rect button/panel helpers (`src/presentation/uiHelpers.ts`) replace ad hoc flat rectangles; the bonus-prompt panel background is now fully opaque (fixing a label-ghosting bug caused by a stale 0.96 alpha); the Stats panel gives each keepsake slot its own caption instead of one shared "(Empty Slot)" label and uses a slate-blue divider to read as a distinct "character sheet" screen; the mute and gold-coin HUD icons are hand-drawn vector shapes instead of emoji; the title screen has a warm gradient background and its "Tap a hero to start" line moved up to use freed vertical space. Confirmed via fresh Playwright screenshots across both profiles (title, world, Stats panel with real mastery/keepsake data, bonus prompt) and a full `npm run check` + unit + asset-pipeline + Playwright smoke pass. Tile/sprite art, the Grade 5 Ranger visual identity, and title-card hero portraits remain out of scope for this pass (art/story-gated, reserved for a user/ChatGPT checkpoint per `AGENTS.md`).
- The Attention-First Opening Pass (`docs/ATTENTION_FIRST_OPENING_PLAN_2026-07.md`) is implemented: Grade 5's player-facing label is now **Ranger Explorer** (internal `grade5-adventurer` ID unchanged) with a matching subtitle; the title screen's tagline now reads "Old magic is waking in Eldoria. Learning helps — adventure never waits." with a handful of slow ambient sparkle dots; Mira's very first line now seeds the "old magic waking" mystery immediately instead of reading as a chore ("Check the crop patch for a bonus!"); the Sleepy Sprouts errand's dialogue is rewritten to the approved wording, including the Wildbloom Sprig becoming a "hums when secrets are nearby" hook for a future (not-yet-implemented) discovery system; keepsake charm rewards now get an emphasized pop-in floating text and a larger sparkle burst than a plain gold trickle, and the quest toast is a rounded gold-bordered card with a pop-in tween instead of a flat text box (also repositioned below the objective banner, fixing a pre-existing overlap); the looping placeholder background music and the footstep SFX (the two most repetitive sounds) are quieter to reduce first-impression annoyance risk. Verified via `npm run check`, unit, asset-pipeline, and the full Playwright smoke suite, plus a fresh browser-inspection screenshot pass across both profiles covering the title screen, each profile's fresh start, Mira's first interaction, the crop bonus and Practice Slime prompts, the Sleepy Sprouts interaction, reward/charm feedback, and the Stats panel with a charm.

## Visual And Asset State

- Visual asset contract and validated hero, starter-equipment, Practice Slime, and farm/village target specs.
- Manifest-driven PNG normalization and validation pipeline with alpha, color-key, and edge-flood cleanup.
- Practice Slime v001 source and normalized `192x128` runtime sheet are committed.
- Practice Slime v001 is preloaded, displayed at its Tiled interaction coordinates, plays its four-frame idle loop, and gives short hop feedback when interacted with.
- Grade 2 Mage hero idle v001 is preloaded and displayed for the Grade 2 profile with four directional idle loops from its normalized `32x48` cells.
- Grade 2 Mage walk v001 is preloaded and plays six-frame directional loops while keyboard or joystick movement is active, returning to the matching idle loop on release.
- Grade 2 Mage cast v001 is preloaded and plays a brief directional presentation-only clip when ACTION is pressed away from interaction targets, returning to matching walk or idle.
- Grade 2 Mage hurt v001 is preloaded and can be triggered only from a development/test-safe path as a brief directional presentation-only clip that preserves movement underneath, cancels cast cleanly, and recovers to matching walk or idle with no combat, damage, reward, quest, or save effects.
- The Waking Gate now reuses the real Mage sprite and cast animation, while Ranger uses a tinted normalized hero proxy plus presentation-only bow/quiver accents until production Ranger art exists.
- The Grade 5 Ranger Explorer technical target is validated as `char_ranger_boy_base`; final production sprite generation remains pending a dedicated art prompt/asset PR.
- Grade 5 continues to use the existing adventurer placeholder in the farm.
- Equipment, farm/village, crop, building, and UI production art remain target specifications only; Grade 2 Mage idle, walk, cast, and hurt runtime presentation are integrated.

## Active Milestone

The next implementation milestone is **Practice Slime Combat & Profile Ability Loop**, defined in `docs/PRACTICE_SLIME_COMBAT_PLAN_2026-07.md`.

This replaces the previous ambiguous choice between a creature interaction and a hidden-secret loop. The visible Practice Slime is the better first target: it is already part of Mira's first errand, understandable without reading, supported by production art, and gives the Waking Gate abilities a direct continuation inside the farm.

The planned slice is deliberately narrow: three profile-specific ACTION hits, readable slime reactions and health pips, then the existing optional learning prompt. No player damage, fail state, random loot, new save fields, quest #4, or generalized combat architecture.

The build remains technically verified rather than child-validated until the deployed iPad experience is observed directly.

## Next Checkpoint

1. Complete browser and iPad verification of the first-minute visual polish, especially text fit, Mage cast readability, Ranger fallback readability, three-hit escalation, and gate-to-farm continuity.
2. Implement the focused Practice Slime controller and minimal integration described in `docs/PRACTICE_SLIME_COMBAT_PLAN_2026-07.md`.
3. Prove that the first two slime hits do not open a prompt and the third hit does; skipping or answering incorrectly must still advance the quest.
4. Capture browser screenshots for Mage and Ranger before, during, and after the encounter, and test deliberate three-tap input on iPad Safari.
5. Run the Grade 5 Ranger Explorer production-art pass in parallel so the world model catches up to the profile promise.
6. After the slime slice is proven, implement the Wildbloom Sprig discovery loop, then a small merchant/customization gold sink before deciding on quest #4.

## Lighting Note (for whenever the atmosphere work lands)

A research pass initially surfaced a Phaser 3 tutorial (normal maps + the `Light2D` pipeline) as a cheap way to add torch/window glow beyond the ambient day/evening tint. Checked directly against the installed dependency: this project runs Phaser `^4.2.0`, which ships its own purpose-built `PointLight` game object (`this.add.pointlight(x, y, color, radius, intensity, attenuation)`, in `node_modules/phaser/src/gameobjects/pointlight/`) — no normal maps, no per-sprite shader setup, explicitly documented for effects like "flickering torches or muzzle flashes," and cheaper to add than the Phaser 3 recipe. WebGL-only (no Canvas fallback), which is a non-issue given `Phaser.AUTO` and modern iPad/desktop browsers. Use this native API instead of the Phaser 3 tutorial when the atmosphere/lighting pass happens.

## Routine Merge Policy

Codex may self-audit and squash-merge a narrow, agreed PR when targeted tests, `npm run check`, `npm run build`, and `npm run smoke` pass and gameplay/UI changes receive browser inspection. Scope expansion or product/curriculum/architecture decisions require a user or ChatGPT checkpoint.
