# Farm Environment Production-Generation Handoff v1

**Status:** Durable Farm source-art order and generation contract  
**Current progress and next target:** [`../CURRENT_STATE.md`](../CURRENT_STATE.md)

This document defines how Farm environment source art is generated and audited. It does not track which assets are complete. Never restart a completed batch or infer the next asset from this file; confirm current status in `CURRENT_STATE.md` and the committed manifests/audit records.

## Authorities

- Machine-readable geometry and variants:
  - `docs/visual-targets/farm_village_tile_targets.json`
  - `docs/visual-targets/farm_water_shoreline_targets.json`
  - `docs/visual-targets/farm_vegetation_targets.json`
  - `docs/visual-targets/farm_props_targets.json`
  - `docs/visual-targets/wildbloom_magical_environment_target.json`
- Palette: `docs/visual-targets/farm_environment_palette_v1.json`
- Visual rules: [`../VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)
- Generation and audit loop: [`CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md`](CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md)
- Prompt construction: [`IMAGE_PROMPTING_GUIDE.md`](IMAGE_PROMPTING_GUIDE.md)
- Normalization and validation: [`SPRITE_ASSET_PIPELINE.md`](SPRITE_ASSET_PIPELINE.md)

The owner-provided visual reference is **STYLE REFERENCE ONLY**. It defines quality, material language, palette direction, elevated three-quarter perspective, outline weight, upper-left lighting, layered density, and magical-landmark treatment. Do not crop, normalize, commit, or integrate pixels from it.

## Global production rules

1. Generate one asset variant per image by default. Use a family sheet only when every cell has identical source/runtime geometry, pivot logic, and background treatment.
2. Never create mixed-size production sheets.
3. Full-cell terrain is edge-to-edge and seamless. It contains no magenta padding or baked Decor.
4. Base grass, dirt, and water remain quiet. Flowers, rocks, lilies, reeds, crops, shimmer, and other detail belong in separate overlays or props.
5. Padded decals and tall props use true alpha or a clean edge-connected key background with generous empty margins.
6. Tall props are grounded in their declared lower footprint while visual height extends upward.
7. Dynamic or Y-sorted assets contain no baked ground shadow unless the target explicitly authorizes one.
8. Use one upper-left key light and the locked palette. Do not bake a scene-level atmosphere wash into individual assets.
9. No text, labels, UI, borders, grid lines, checkerboards, presentation framing, watermarks, or unrelated scenery.
10. Approval is based on exact normalized runtime pixels, not the attractiveness of the high-resolution generation.
11. Do not integrate an incomplete family or fabricate missing cells from placeholders.
12. Completed approved assets remain complete unless a focused defect or an approved direction change requires replacement.

## Asset categories

### A. Full-cell seamless terrain

Examples: grass base, dirt centre/transitions, water base/shore transitions, tilled soil.

- full-bleed;
- no key-colour padding;
- exact cell fill;
- top-left placement;
- 3×3 and large-field repeat evidence;
- no decorative perimeter on centre tiles.

### B. Padded decals and small overlays

Examples: grass scatter, crop states, lilies, flower clusters, weeds, small stones, shore rocks, logs.

- subject normally occupies about 40–60% of the cell;
- outer margin remains empty;
- sparse or off-centre composition is encouraged where the target requires it;
- normalize with alpha trimming and the declared centre or centre-bottom anchor;
- no second visible tile grid.

### C. Tall grounded props

Examples: trees, large bushes, landmark rocks, reeds, fences, gates, signposts, Wildbloom landmarks.

- visual mass extends above a smaller lower footprint;
- centre-bottom pivot unless the target says otherwise;
- enough surrounding empty space for clean extraction;
- no baked shadow;
- silhouette and grounding must survive exact runtime size.

## Strategic production order

The order below expresses dependencies, not current completion status.

### Batch A — style and geometry anchors

Approve representative grass, dirt, water, tree, fence, rock, and Wildbloom landmark anchors. Together they prove palette, lighting, material language, perspective, scale, padding, and grounding.

### Batch B — variation and scatter

Produce the grass base variants and the configured grass-scatter family. Review the scatter assets as one family before runtime wiring.

### Batch C — terrain families

Complete required dirt, shoreline, water, and tilled-soil families using approved centre materials and deterministic composition where practical. Author all declared edge/corner topologies and verify adjacency.

### Batch D — vegetation and water detail

Produce bushes, flowers, weeds, logs, reeds, lilies, shore rocks, and related Decor layers. Preserve navigation hierarchy and keep the ground plane quiet.

### Batch E — Farm structures, props, and crops

Produce complete fence/gate/sign families, crop states, gardening props, buildings, entrances, and landmark-supporting objects. Modular families must prove connection behavior and lighting without relying on invalid mirroring.

### Batch F — magical-landmark and family cohesion

Complete Wildbloom landmark states and review the full environment contact sheet for scale, palette, projection, light, material cohesion, density, and child readability.

## Audit and advancement gates

Every generated candidate receives exactly one source/runtime verdict defined by the image-prompting and closed-loop guides.

Required evidence varies by type but normally includes:

- source dimensions, grid, padding, and background audit;
- exact normalized runtime output;
- `1×` and enlarged nearest-neighbour previews;
- palette and contamination checks;
- footprint and pivot evidence;
- repeat/adjacency evidence for terrain;
- modular connection evidence for fences and structures;
- family contact sheet for related variants;
- in-game evidence only when the approved family is actually integrated.

Advance only when the applicable gate passes. A visually attractive source that fails runtime scale, perspective, padding, modularity, or repeatability does not advance.

## Repository handoff

After approval:

1. preserve the approved source or exact runtime master;
2. record provenance and hashes;
3. create or update the manifest;
4. normalize through the real pipeline;
5. validate exact dimensions, alpha, palette, pivot, and family rules;
6. prove deterministic round trip where a runtime master is used;
7. retain concise durable evidence;
8. update the changelog;
9. update `CURRENT_STATE.md` only when milestone status or next work materially changes;
10. open a focused PR;
11. defer map/runtime integration until the complete required family and visual evidence permit it.

The authoritative next asset, active candidate, and completed-family status always come from `CURRENT_STATE.md`, committed manifests, and audit records—not this durable order document.
