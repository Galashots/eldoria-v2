# 2026-07-10 — Stardew-Caliber Visual Research And Guidance Update

## Agent

Claude (Sonnet 5) via Claude Code, at Leo's request, working directly against `main` (documentation and target-spec only; no runtime or gameplay code changed).

## Summary

Researched concretely what makes pixel-art top-down RPGs like Stardew Valley read as cohesive and premium, then translated the findings into contract rules, tile targets, and pipeline prompting guidance. Adds no art, no runtime behavior, and no gameplay changes.

## Files added

- `docs/research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md` — sourced research findings (terrain blending/autotiling, flattened perspective, palette/dithering discipline, ground shadows, cheap atmosphere lighting, "juice"/feedback, UI material) with an explicit non-goals section (no day/night cycle, no normal-map lighting, no full 47-tile blob set everywhere).

## Files changed

- `docs/VISUAL_ASSET_CONTRACT.md` — added Section 4a (Perspective Discipline), Section 8a (Grounding And Shadows), Section 13 (Terrain Blending/Autotiling), Section 14 (Lighting And Atmosphere), Section 15 (Feedback And Juice), plus matching checklist lines in Section 11 and a palette-swatch caveat in Section 4.
- `docs/visual-targets/FARM_VILLAGE_TILE_TARGETS.md` and `docs/visual-targets/farm_village_tile_targets.json` — added a new `tile_farm_grass_scatter` decoration target, formalized `tile_farm_path_dirt` as the project's reference terrain-blend set, cross-referenced the new contract sections, and expanded the acceptance checklist.
- `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md` — added a new "Prompting for Stardew-caliber techniques" section covering terrain-blend tile generation strategy, scatter-decoration prompting, why ground shadows should not be baked into animated actor art, and why atmosphere tint should not be baked into source art.

## Implementation notes

- `scripts/validate-visual-targets.mjs` was run locally against the updated `farm_village_tile_targets.json` (plus the existing hero/ranger/mage/slime target files) and passes unchanged — the new target uses only existing schema fields, so no validator changes were needed or made.
- No changes to `scripts/normalize-asset-sheet.mjs` or `scripts/validate-asset-sheet.mjs` — this pass adds no art, consistent with the contract's existing "target specifications only" pattern.
- Deliberately did not touch `docs/CURRENT_STATE.md` or `AGENTS.md`'s changelog-file pointer in this pass to avoid colliding with the concurrently in-flight `chatgpt/wildbloom-discovery-loop` PR (#63), which also edits `docs/CURRENT_STATE.md`.

## Reason

Requested directly by Leo: "do some deep research on how to make this game look better, more like Stardew Valley (or even better), present findings and update project guidance documents and the asset pipeline as applicable," following the standing ChatGPT audit finding that the farm "reads as a development grid" and character fidelity is inconsistent across the game.

## Next step for whoever produces the next farm/village art pass

Follow `docs/visual-targets/FARM_VILLAGE_TILE_TARGETS.md`'s now-expanded target set and the new prompting-guide section, in this order: (1) finish `tile_farm_path_dirt`'s blend set against `tile_farm_grass_base`, (2) add `tile_farm_grass_scatter`, (3) add ground shadows to `Mira` and other placeholder markers per contract Section 8a — this last one needs no new art at all, just an engine-drawn ellipse, and is the cheapest visible win available today.
