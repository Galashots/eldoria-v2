# Eldoria-V2 Current State

Last refreshed on 2026-06-28. This file records volatile project status; `AGENTS.md` remains the durable operating contract.

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
- Grade 2 Mage walk v001 has an asset-only four-direction, six-frame source/runtime sheet; it is not loaded in Phaser yet.
- Grade 5 continues to use the existing adventurer placeholder; its presentation is unchanged.
- Walk, cast, hurt, equipment, farm/village, crop, building, and UI production art remain target specifications only.

## Active Milestone

Starter-errand interaction feedback is complete. The Grade 2 profile displays production-direction Mage idle art, and a matching walk sheet is ready for a separate runtime-integration pass.

## Next Checkpoint

Audit and integrate the Mage walk sheet if its motion remains clear in-engine, then decide whether the next visual target is cast/hurt animation, Mira, or farm-village art.

## Routine Merge Policy

Codex may self-audit and squash-merge a narrow, agreed PR when targeted tests, `npm run check`, `npm run build`, and `npm run smoke` pass and gameplay/UI changes receive browser inspection. Scope expansion or product/curriculum/architecture decisions require a user or ChatGPT checkpoint.
