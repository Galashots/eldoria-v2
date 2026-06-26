# Realm of Eldoria v2

A fresh Phaser + Vite + Tiled build for a kid-focused 2D educational fantasy RPG.

## Core design rule

**Learning never gates adventure.**  
Learning creates bonuses only: extra harvest, bonus gold, critical hits, faster crafting, better loot, cosmetics, pets, mounts, or convenience rewards.

Players can always explore, farm, talk, fight, retry, and progress slowly without answering correctly.

## Stack

- Phaser 4
- Vite
- TypeScript
- Tiled JSON maps
- Local-first browser saves
- GitHub Pages-friendly static build

## Quick start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
```

The production site is written to `dist/`.

## Starter controls

- Arrow keys / WASD: move
- Space / E: interact
- On-screen D-pad/action buttons are included for touch testing

## Current vertical slice

- Loads a Tiled-compatible farm map
- Pixel-perfect Phaser renderer
- Player movement and collision
- Camera follow
- NPC / crop / enemy interaction stubs
- Bonus-only curriculum question flow
- Grade 5 and Grade 2 profile data
- Local save utility stub
- GitHub Actions build check

## Tiled workflow

Use `public/maps/eldoria.tiled-project` in Tiled. The starter map is `public/maps/farm.json`.

Recommended map layers:

1. `Ground`
2. `Decor`
3. `Collision`
4. `Objects`

Use object properties for gameplay metadata instead of hardcoding all map logic in scenes.
