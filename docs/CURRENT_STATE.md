# Eldoria-V2 Current State

Last refreshed on 2026-06-30. This file records volatile project status; `AGENTS.md` remains the durable operating contract.

## Playable Vertical Slice

- Phaser, Vite, TypeScript, and Tiled farm map.
- Grade 2 audio-first and Grade 5 reader-mode profiles.
- Keyboard movement, dynamic lower-left joystick, and lower-right ACTION control.
- Mira's First Errand with objective HUD, optional crop/slime prompts, return reward, save/load, and permanent Sunberry Charm keepsake.
- One optional second micro-errand, The Whispering Scarecrow, becomes available after Mira's first errand, reuses the existing crop patch interaction, and adds a short investigate-and-return loop with a text-only Moonseed Charm discovery and a small gold reward.
- Learning remains bonus-only: wrong answers and skips never block quest progress.
- Floating gold/item feedback, primitive sparkle bursts, and per-skill mastery records.
- Contextual Grade 2/Grade 5 templates and development/E2E-only deterministic prompt preview.
- Five Playwright vertical-slice smoke tests covering both profiles, quest/save behavior, mastery, templates, preview side-effect safety, and portrait-orientation guidance.
- Crop Bonus and Practice Slime interactions now provide short, readable visual feedback before their unchanged optional prompts open.
- Arcade Physics bounds now cover the full farm map, so the crop/scarecrow and Practice Slime targets are reachable through normal movement rather than only test positioning.
- Optional prompt panels render above the actor and provide a button-sized pointer target for `Skip bonus`.
- Portrait phone/tablet layouts show a DOM-based landscape-orientation message instead of shrinking the playable canvas into an unreadable strip.
- A privacy-safe 10-15 minute child-clarity checklist is ready for separate Grade 2 and Grade 5 sessions.
- Hero animation/rendering is isolated in a profile-configured presentation controller; the unchanged Grade 5 placeholder remains the fallback until approved Ranger art exists.
- Mira's two errands now use a renderer-independent farm quest state system while preserving the existing version-1 save fields and player-facing behavior.
- Green `main` builds automatically deploy to GitHub Pages at `https://galashots.github.io/eldoria-v2/` for HTTPS browser play on the boys' iPads.
- Stable interaction IDs are fully decoupled from display labels/names using `interactionId` Tiled custom properties, preventing marker name changes from breaking handler mappings.
- Fully integrated Vitest unit test framework with 41 unit tests covering QuestionEngine, MasterySystem, LearningBonusSystem, and curriculum templates.
- Established save migration seam in SaveSystem and updated WorldScene saving to dynamically read CURRENT_SAVE_VERSION.

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

The starter farm slice is technically ready for its real-child clarity checkpoint. Grade 2 Mage idle, walk, cast, and hurt presentation are live, while Grade 5 remains on the existing placeholder presentation. Refactoring for quest states, presentation delegation, unit test suites, stable interaction ID mappings, and save migrations is fully complete and verified.

## Next Checkpoint

Run the documented Grade 2 and Grade 5 child-clarity sessions in landscape. Fix only demonstrated blockers or repeated confusion, then obtain ChatGPT approval for the Grade 5 Ranger Explorer visual identity and image prompt before generating its seed frame.

## Routine Merge Policy

Codex may self-audit and squash-merge a narrow, agreed PR when targeted tests, `npm run check`, `npm run build`, and `npm run smoke` pass and gameplay/UI changes receive browser inspection. Scope expansion or product/curriculum/architecture decisions require a user or ChatGPT checkpoint.
