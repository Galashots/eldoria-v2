# Eldoria-V2 Current State

Last refreshed on 2026-06-29. This file records volatile project status; `AGENTS.md` remains the durable operating contract.

## Playable Vertical Slice

- Phaser, Vite, TypeScript, and Tiled farm map.
- Grade 2 audio-first and Grade 5 reader-mode profiles.
- Keyboard movement, dynamic lower-left joystick, and lower-right ACTION control.
- Mira's First Errand with objective HUD, optional crop/slime prompts, return reward, save/load, and permanent Sunberry Charm keepsake.
- Learning remains bonus-only: wrong answers and skips never block quest progress.
- Floating gold/item feedback, primitive sparkle bursts, and per-skill mastery records.
- Contextual Grade 2/Grade 5 templates and development/E2E-only deterministic prompt preview.
- Four Playwright vertical-slice smoke tests covering both profiles, quest/save behavior, mastery, templates, and preview side-effect safety.
- Crop Bonus and Practice Slime interactions now provide short, readable visual feedback before their unchanged optional prompts open.

## Visual And Asset State

- Visual asset contract and validated hero, starter-equipment, Practice Slime, and farm/village target specs.
- Manifest-driven PNG normalization and validation pipeline with alpha, color-key, and edge-flood cleanup.
- Practice Slime v001 source and normalized `192x128` runtime sheet are committed.
- Practice Slime v001 is preloaded, displayed at its Tiled interaction coordinates, plays its four-frame idle loop, and gives short hop feedback when interacted with.
- Grade 2 Mage hero idle v001 is preloaded and displayed for the Grade 2 profile with four directional idle loops from its normalized `32x48` cells.
- Grade 2 Mage walk v001 is preloaded and plays six-frame directional loops while keyboard or joystick movement is active, returning to the matching idle loop on release.
- Grade 2 Mage cast v001 is preloaded and plays a brief directional presentation-only clip when ACTION is pressed away from interaction targets, returning to matching walk or idle.
- Grade 2 Mage hurt v001 is preloaded and can be triggered only from a development/test-safe path as a brief directional presentation-only clip that preserves movement underneath, cancels cast cleanly, and recovers to matching walk or idle with no combat, damage, reward, quest, or save effects.
- Grade 5 Adventurer production actor target specs are defined as target-only docs/JSON; no Grade 5 art or runtime integration is included yet.
- Grade 5 continues to use the existing adventurer placeholder; its presentation is unchanged.
- Equipment, farm/village, crop, building, and UI production art remain target specifications only; Grade 2 Mage idle, walk, cast, and hurt runtime presentation are integrated.

## Active Milestone

Starter-errand interaction feedback is complete. Grade 2 Mage idle, walk, cast, and hurt presentation are live, and Grade 5 production actor target specs are now defined without changing the placeholder runtime presentation.

## Next Checkpoint

Generate or source the Grade 5 Adventurer idle asset in a separate asset-only PR before any Grade 5 runtime-integration work.

## Routine Merge Policy

Codex may self-audit and squash-merge a narrow, agreed PR when targeted tests, `npm run check`, `npm run build`, and `npm run smoke` pass and gameplay/UI changes receive browser inspection. Scope expansion or product/curriculum/architecture decisions require a user or ChatGPT checkpoint.
