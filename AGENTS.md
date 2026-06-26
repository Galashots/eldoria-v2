# Eldoria v2 Agent Instructions

## Non-negotiable design rule

Learning must never block movement, exploration, combat, farming, talking, or story progress.

Correct answers may grant:
- bonus harvest
- extra gold
- extra XP
- critical damage
- better loot odds
- faster growth
- free crafting/cooking batches
- cosmetics, pets, dragons, armor, mounts, or titles

Wrong answers must:
- never punish harshly
- never remove progress
- never lock the player out
- usually just skip the bonus and let the player continue

## Technical direction

- Phaser + Vite + TypeScript.
- Keep changes small and testable.
- Prefer data files under `src/data` over hardcoding gameplay content in scenes.
- Keep Tiled maps under `public/maps`.
- Keep runtime assets under `public/assets`.
- Avoid remote/CDN assets; the game should remain local-first and GitHub Pages-friendly.
- Preserve iPad/touch-first usability.
- Keep early-reader flows audio/visual-first with minimal text.

## Before committing

Run:

```bash
npm run check
```
