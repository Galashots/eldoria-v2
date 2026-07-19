# Eldoria Village Art Gap Assessment — 2026-07-19

## Approved inventory usable in a village

The repository already has approved grass (`grass_a/b/c`), dirt-path centre and the complete 13-cell dirt blend family, water (`water_a/b`) and the complete 13-cell shoreline family, the oak tree, one horizontal weathered fence rail, one medium rock, and the Root-Star landmark. These provide a coherent ground, natural border, and material/palette foundation. They do not yet constitute a village kit: most are source/review assets and only the bounded terrain proof is currently loaded by the farm.

## Short gap list for a 24×16 village square

1. Building envelope: approved wall, door, and roof cells.
2. Square surfacing: cobble/plaza centre plus complete grass/cobble transitions.
3. Market identity: stall/canopy, counters, crates, barrels, baskets, and signs.
4. Exit language: complete fence corners/verticals/broken pieces and matching gate.
5. Civic landmarks: well/fountain, lamp, notice board, benches, and flower planters.
6. Village vegetation: approved bush/flower/weed families and additional tree silhouettes.

## Top-three gaps completed in this batch

This batch closes the minimum building-envelope gap first because Map 3 cannot read as a village without a coherent structure silhouette:

- `tile_village_shop_wall`: `stone_base`, `wood_trim`, `window_lit`.
- `tile_village_shop_door`: `closed`, `highlighted`, `open_optional`.
- `tile_village_shop_roof`: `thatch_base`, `thatch_moss`, `ridge`.

All nine exact runtime masters pass the deterministic source → normalize → validate → review → packed family → family contact-sheet chain. Formal verdicts are recorded under `docs/art-pipeline/review/`. No map, scene, loader, collision activation, or gameplay file is changed.

## Recommended next art order

Next: cobble/plaza family and transitions; then market stall/storage props; then the complete fence/gate family. Map composition should continue to consume only assets whose exact runtime pixels carry a recorded approval verdict.
