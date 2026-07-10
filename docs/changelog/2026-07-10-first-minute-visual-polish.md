# 2026-07-10 — First-Minute Visual Polish

## Branch

`chatgpt/visual-first-minute-polish`

## Summary

Implemented the first code-backed visual pass inspired by the approved Waking Gate and farm-entry mockups without changing quest progression, curriculum, rewards, saves, or collision behavior.

## Waking Gate

- Replaced the diagram-like Grade 2 hero with the existing production Mage sprite.
- Reused the existing Mage cast animation for each spell shot.
- Replaced the blocky Ranger opening placeholder with a tinted normalized hero proxy, bow, and quiver treatment until approved Ranger production art lands.
- Simplified the opening copy to `BREAK THE WAKING GATE!` and `Tap ACTION 3 times`.
- Added layered gate rings, rune nodes, floating shards, visible cracks, stronger impact bursts, and escalating damage states.
- Enlarged and emphasized the ACTION target while preserving gate taps, Space/E, and SKIP.
- Passed a presentation-only `fromOpening` flag into the farm transition.

## Farm Entry

- Added `PolishedWorldScene`, a presentation-only wrapper around the verified `WorldScene` gameplay scene.
- Added a gate-arrival burst and a short guiding sparkle trail toward Mira.
- Added a player shadow, subtle atmosphere motes, warm color grading, and a clearer gold Mira marker.
- Reworded the initial on-screen objective to connect the gate event to Mira.
- Replaced `Explore. Learning bonuses are optional.` with `Old magic is stirring nearby.` in the presentation layer while preserving the gameplay text object for regression stability.
- Reformatted contextual helper text as `ACTION • ...` in the presentation layer.

## Verification Coverage

- Existing full repository validation remains required.
- Expanded Playwright opening coverage now captures:
  - Mage fresh start
  - Mage first and second hit states
  - Mage farm arrival
  - Ranger fresh start
  - Ranger first hit
  - returning-profile bypass

## Guardrails

- No save-schema change.
- No quest-state change.
- No curriculum or learning-bonus change.
- No reward or economy change.
- No player damage, fail state, timers, streak pressure, or random rewards.
- Generated visual mockups remain design references only; runtime presentation uses existing game assets and code-drawn effects.
