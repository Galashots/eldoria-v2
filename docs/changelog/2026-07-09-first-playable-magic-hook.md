# 2026-07-09 — First Playable Magic Hook

## Branch

`chatgpt/first-playable-magic-hook`

## Summary

Added a short, skippable Waking Gate action scene before a fresh profile's first farm visit so the game opens with immediate player agency instead of dialogue or a learning prompt.

## Changes

- Added `src/scenes/OpeningScene.ts`.
- Fresh profiles play a three-hit opening action beat; existing saves and returning profiles bypass it.
- Mage fires spell sparks; Ranger Explorer fires tracking shots.
- Each input produces a projectile, gate reaction, SFX, progress feedback, and camera shake.
- Third hit produces a larger completion burst and transitions into the farm.
- Supports tapping the gate, tapping ACTION, or pressing Space/E.
- Includes a visible SKIP control.
- Registered the scene in `src/gameConfig.ts` and routed fresh profiles through it from `TitleScene`.
- Added Playwright coverage and reviewable screenshots.
- CI now uploads visual-playtest evidence for this PR.
- Updated README and current-state documentation.

## Guardrails

- Learning remains bonus-only.
- No quest #4.
- No save-schema change.
- No random rewards, streak pressure, timers, or other manipulative retention mechanics.
- Existing profile IDs are unchanged.
- The new behavior is isolated from `WorldScene`.

## Verification

GitHub Actions run 128 passed:

- `npm ci`
- `npm run check`
- `npm run test:asset-pipeline`
- `npm run test:unit`
- `npm run smoke`
- visual-playtest artifact upload

The automated screenshots cover the fresh Mage opening, first gate hit, and transition into the farm.
