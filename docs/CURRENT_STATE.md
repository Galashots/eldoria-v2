# Eldoria-V2 Current State

Last refreshed on 2026-07-06. This file records volatile project status; `AGENTS.md` remains the durable operating contract.

## Playable Vertical Slice

- Phaser, Vite, TypeScript, and Tiled farm map.
- Grade 2 audio-first and Grade 5 reader-mode profiles.
- Keyboard movement, dynamic lower-left joystick, and lower-right ACTION control.
- Mira's First Errand with objective HUD, optional crop/slime prompts, return reward, save/load, and permanent Sunberry Charm keepsake.
- One optional second micro-errand, The Whispering Scarecrow, becomes available after Mira's first errand, reuses the existing crop patch interaction, and adds a short investigate-and-return loop with a text-only Moonseed Charm discovery and a small gold reward.
- Learning remains bonus-only: wrong answers and skips never block quest progress.
- Floating gold/item feedback, primitive sparkle bursts, and per-skill mastery records.
- Contextual Grade 2/Grade 5 templates and development/E2E-only deterministic prompt preview.
- Six Playwright vertical-slice smoke tests covering both profiles, quest/save behavior, mastery, templates, preview side-effect safety, portrait-orientation guidance, and the Stats & Mastery panel.
- Crop Bonus and Practice Slime interactions now provide short, readable visual feedback before their unchanged optional prompts open.
- Arcade Physics bounds now cover the full farm map, so the crop/scarecrow and Practice Slime targets are reachable through normal movement rather than only test positioning.
- Optional prompt panels render above the actor and provide a button-sized pointer target for `Skip bonus`.
- Portrait phone/tablet layouts show a DOM-based landscape-orientation message instead of shrinking the playable canvas into an unreadable strip.
- A privacy-safe 10-15 minute child-clarity checklist is ready for separate Grade 2 and Grade 5 sessions.
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

## Visual And Asset State

- Visual asset contract and validated hero, starter-equipment, Practice Slime, and farm/village target specs.
- Manifest-driven PNG normalization and validation pipeline with alpha, color-key, and edge-flood cleanup.
- Practice Slime v001 source and normalized `192x128` runtime sheet are committed.
- Practice Slime v001 is preloaded, displayed at its Tiled interaction coordinates, plays its four-frame idle loop, and gives short hop feedback when interacted with.
- Grade 2 Mage hero idle v001 is preloaded and displayed for the Grade 2 profile with four directional idle loops from its normalized `32x48` cells.
- Grade 2 Mage walk v001 is preloaded and plays six-frame directional loops while keyboard or joystick movement is active, returning to the matching idle loop on release.
- Grade 2 Mage cast v001 is preloaded and plays a brief directional presentation-only clip when ACTION is pressed away from interaction targets, returning to matching walk or idle.
- Grade 2 Mage hurt v001 is preloaded and can be triggered only from a development/test-safe path as a brief directional presentation-only clip that preserves movement underneath, cancels cast cleanly, and recovers to matching walk or idle with no combat, damage, reward, quest, or save effects.
- The Grade 5 Ranger Explorer technical target is validated as `char_ranger_boy_base`; final visual identity, seed frame, and image prompt remain pending the required ChatGPT approval.
- Grade 5 continues to use the existing adventurer placeholder; its presentation is unchanged.
- Equipment, farm/village, crop, building, and UI production art remain target specifications only; Grade 2 Mage idle, walk, cast, and hurt runtime presentation are integrated.

## Active Milestone

The starter farm slice is technically ready for its real-child clarity checkpoint, with the live iPad setup and separate Grade 2 and Grade 5 sessions documented in `docs/REAL_CHILD_PLAYTEST_GUIDE.md`. Grade 2 Mage idle, walk, cast, and hurt presentation are live, while Grade 5 remains on the existing placeholder presentation. Refactoring for quest states, presentation delegation, unit test suites, stable interaction ID mappings, and save migrations is fully complete and verified. The Stats & Mastery UI panel and SpeechSynthesis GC fixes have been successfully ported onto this new architecture and verified via Playwright integration smoke tests.

## Next Checkpoint

An AI-assisted technical walkthrough of both profiles (`docs/playtests/AI_ASSISTED_WALKTHROUGH_2026-07-05.md`) found zero blockers — full errand loop, save/reload, and the bonus-only rule all held under genuine keyboard play. That is not a substitute for the real checkpoint: run the Grade 2 and Grade 5 sessions in `docs/REAL_CHILD_PLAYTEST_GUIDE.md` in landscape with an actual child. Fix only demonstrated blockers or repeated confusion, then obtain ChatGPT approval for the Grade 5 Ranger Explorer visual identity and image prompt before generating its seed frame. The Sleepy Sprouts errand adds new story/dialogue wording (continuing the second errand's "old magic waking" thread) that has not yet had a user/ChatGPT curriculum-and-story review pass; do that before writing further quest content on top of it.

## Lighting Note (for whenever the atmosphere work lands)

A research pass initially surfaced a Phaser 3 tutorial (normal maps + the `Light2D` pipeline) as a cheap way to add torch/window glow beyond the ambient day/evening tint. Checked directly against the installed dependency: this project runs Phaser `^4.2.0`, which ships its own purpose-built `PointLight` game object (`this.add.pointlight(x, y, color, radius, intensity, attenuation)`, in `node_modules/phaser/src/gameobjects/pointlight/`) — no normal maps, no per-sprite shader setup, explicitly documented for effects like "flickering torches or muzzle flashes," and cheaper to add than the Phaser 3 recipe. WebGL-only (no Canvas fallback), which is a non-issue given `Phaser.AUTO` and modern iPad/desktop browsers. Use this native API instead of the Phaser 3 tutorial when the atmosphere/lighting pass happens (currently proposed but unimplemented on `main`; the ambient tint/particles/shadows referenced in `docs/EXPANSION_PROPOSALS_2026-07.md` live only in the still-open PR #51 branch as of this writing).

## Routine Merge Policy

Codex may self-audit and squash-merge a narrow, agreed PR when targeted tests, `npm run check`, `npm run build`, and `npm run smoke` pass and gameplay/UI changes receive browser inspection. Scope expansion or product/curriculum/architecture decisions require a user or ChatGPT checkpoint.
