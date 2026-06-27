# Eldoria-V2 Current State

Last refreshed after PR #23 on 2026-06-27. This file records volatile project status; `AGENTS.md` remains the durable operating contract.

## Playable Vertical Slice

- Phaser, Vite, TypeScript, and Tiled farm map.
- Grade 2 audio-first and Grade 5 reader-mode profiles.
- Keyboard movement, dynamic lower-left joystick, and lower-right ACTION control.
- Mira's First Errand with objective HUD, optional crop/slime prompts, return reward, save/load, and permanent Sunberry Charm keepsake.
- Learning remains bonus-only: wrong answers and skips never block quest progress.
- Floating gold/item feedback, primitive sparkle bursts, and per-skill mastery records.
- Contextual Grade 2/Grade 5 templates and development/E2E-only deterministic prompt preview.
- Four Playwright vertical-slice smoke tests covering both profiles, quest/save behavior, mastery, templates, and preview side-effect safety.

## Visual And Asset State

- Visual asset contract and validated hero, starter-equipment, Practice Slime, and farm/village target specs.
- Manifest-driven PNG normalization and validation pipeline with alpha, color-key, and edge-flood cleanup.
- Practice Slime v001 source and normalized `192x128` runtime sheet are committed.
- Practice Slime runtime loading and world display are not implemented yet.
- Hero, equipment, farm/village, crop, building, and UI production art remain target specifications only.

## Active Milestone

Display the Practice Slime v001 asset in the existing world without changing interaction, quest, learning, save, combat, or AI behavior.

The runtime PR should:

- preload the existing `32x32` spritesheet,
- replace only the Practice Slime placeholder marker with a bottom-centered sprite,
- play the four-frame idle loop,
- preserve the Tiled interaction coordinates, ACTION flow, prompt behavior, and quest progression,
- add focused smoke coverage and desktop/mobile screenshot verification.

## Next Checkpoint

Return to ChatGPT after the Practice Slime display PR is merged. Decide there whether the next milestone is animation feedback, combat design, farming, or broader visual replacement. Do not begin combat, AI, rewards, curriculum expansion, or additional asset generation before that checkpoint.

## Routine Merge Policy

Codex may self-audit and squash-merge a narrow, agreed PR when targeted tests, `npm run check`, `npm run build`, and `npm run smoke` pass and gameplay/UI changes receive browser inspection. Scope expansion or product/curriculum/architecture decisions require a user or ChatGPT checkpoint.
