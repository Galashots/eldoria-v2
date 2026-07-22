# Character Perspective Trial — Evidence Harness Plan (2026-07)

**Status:** Implemented (PR #127); this document is the approved design record. The manifest is bound to the canonical `char_mage_boy_base` target and the exact repo plate assets; occupancy bounds are mandatory.
**Authorities:** [`visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md) §8–§9, [`visual-targets/hero_actor_targets.json`](visual-targets/hero_actor_targets.json) (`char_mage_boy_base`), [`CURRENT_STATE.md`](CURRENT_STATE.md) active-milestone item 2, [`../AGENTS.md`](../AGENTS.md).

## Purpose

Give the first character perspective trial (Mage, four idle facings, neutral outfit) a **deterministic, one-command evidence pipeline** so every generation candidate — same-sheet or direction-anchored, from any provider — produces the identical §9 evidence set for visual adjudication. No art is approved, committed, or integrated by this work.

## Owner decisions folded in

- Trial identity: **Mage** (`char_mage_boy_base`), existing 32×48 canvas, pivot (16,47); CHANGE TARGET SIZE remains the escape hatch.
- Branch deliverable: **evidence harness only.** Generation brief and per-candidate visual verdicts remain with ChatGPT per `AGENTS.md`.
- Backgrounds: **offline deterministic composition** from committed tiles; no live capture, no scene integration.
- Review protocol amendment (owner, 2026-07-21): **any reviewer (AI or human) issuing perspective verdicts must first consult external reference imagery** for the elevated three-quarter idiom rather than critiquing from memory. Machine gates measure pixels; judgment gates require referenced comparison.

## Reference adjudication (informs judgment criteria)

Reviewed: SLYNYRD Pixelblog 22 (3/4 top-down character process, proportion reference, in-world mockup), an 8-direction 3/4 template (ZeggyGames), and the repository's approved oak master.

- The approved Eldoria environment pitch is **moderate** (gently elevated, ~30° feel: top-lit canopy planes, mostly vertical silhouette). Character pitch must match **our oak**, not an external game.
- Reject both extremes: steep-tilt chibi (head becomes a faceless dome — identity loss unacceptable for the Grade 2 audio-first hero) and frontal down-facing (the current transitional Mage; explicitly rejected by the lock).
- Target band at 32×48, down-facing: hair/hat top plane roughly **3–5 px rows**; eye line in the **lower half of the head mass**; thin visible shoulder top plane; foreshortened torso with slightly compressed legs; feet stacked under body mass at the pivot row; face still readable.
- Side facings: three-quarter with near shoulder and a sliver of chest/back plane; up facing: hair top + back planes with side contour.
- **No default left/right mirroring.** Mirroring is acceptable only when upper-left lighting, asymmetric equipment, and handedness survive; the trial brief must demand independently lit side views or an explicit mirror-validity check.

## Harness architecture

New `scripts/compose-perspective-trial-evidence.mjs` (+ `scripts/test-perspective-trial.mjs`), reusing `readPng`/`writePng` from `normalize-asset-sheet.mjs` and `upscale-nearest-neighbor.mjs`. Plain-node, no new dependencies.

**Input:** a trial manifest JSON listing 1..N candidates. Each candidate: id, provenance (provider, approach: `same_sheet` | `direction_anchored`), path to a normalized 128×48 sheet (four 32×48 cells in declared order front/back/left/right), and declared occupancy bounds. All input files SHA-256-locked into the report.

**Background plates (deterministic, honestly labeled):**
- `farm_bright`: tiled from approved `tile_farm_grass_base/grass_a` master.
- `woods_bridge`: tiled from the declared cells of `public/assets/tilesets/eldoria-placeholder.png` that Wildbloom Woods actually uses (labeled *bridge terrain* in every artifact).

**Outputs per candidate** (to `docs/art-pipeline/review/char_mage_boy_base_perspective_trial/<candidate-id>/`):
1. exact 1× runtime preview on both plates (each direction, grounded at pivot);
2. enlarged nearest-neighbor previews (8×);
3. pivot/baseline overlay per direction;
4. four-direction contact sheet;
5. `report.json` — measured metrics, gate results, input hashes, tool provenance.

**Cross-candidate:** one comparison sheet aligning all candidates per direction, plus a combined report index.

## Gates

**Machine (fail-closed):** cell geometry exactly 32×48 ×4; binary alpha (partial alpha rejected by name); no cell bleed; per-direction opaque bounding boxes with apparent-height parity **±1 px across all four directions**; bottom contact row = pivot row 47; occupancy within declared bounds; two-run byte-identical regeneration.

**Judgment (named, not machine-passed):** foreshortened-not-frontal down view; visible top planes in all facings; single camera pitch matching the approved oak; one upper-left key light; identity/face readability; embedded-not-pasted on both plates. Emitted in `report.json` as named open gates with the reference-consultation requirement stated.

## Verification and wiring

- `test:perspective-trial` npm script; chained into `test:asset-pipeline` (no `.github/workflows/**` change — owner-gated surface).
- Red-first suite in the repo's existing style (synthetic fixtures in `.tmp/`, `assert/strict`): geometry/alpha/bleed rejections each proven able to fail; height-parity and pivot-contact measured on constructed sprites; plate determinism; two-run byte-identity; report schema.
- Full local verification on the exact head before PR: `check`, `test:visual-targets`, `test:asset-pipeline`, `test:terrain-blend`, `test:unit`, `smoke`.

## Non-goals

No art generation or approval; no scene/runtime integration; no changes to existing gates, targets, or geometry; no dependency changes; Kimi's unmerged lane-report contract is not depended on — report structure follows merged conventions and can harmonize once that branch lands.

## Next owners after merge

ChatGPT: §7-compliant generation brief + candidate generation + visual verdicts (with reference consultation). Engineering (any provider, fresh branch): integration/wiring PR only after a family verdict passes.
