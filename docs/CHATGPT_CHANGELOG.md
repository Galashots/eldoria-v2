# ChatGPT Change Log

This file keeps recent, high-value change summaries. Full historical entries through 2026-07-11 are preserved in [`docs/changelog/legacy-through-2026-07-11.md`](changelog/legacy-through-2026-07-11.md) and in Git history.

Entries should remain concise: date/author, branch or PR, scope, compatibility impact, verification, and remaining risk. Detailed implementation narratives belong in the PR description and commits.

## 2026-07-11 — Batch A grass_a source acceptance and review-only normalization

- Branch/PR: `claude/beautification-phase2-batch-a-grass-a` (draft PR pending).
- Scope: accepted the first Phase 2 Batch A production source candidate (`tile_farm_grass_base` / `grass_a`, ChatGPT-approved as **APPROVED SOURCE CANDIDATE**); verified the received PNG's format/dimensions/SHA-256 against the expected values before committing it byte-for-byte; produced a clearly review-only manifest/normalization (16×16, Category A settings) plus nearest-neighbor evidence previews (enlarged tile, 3×3 repeat, 12×8 field, comparison panel) and a deterministic seam/gradient/palette audit, all under `docs/art-pipeline/review/tile_farm_grass_base_grass_a/`, not under the production manifest/output paths.
- Principal files: `assets/source/generated/tile_farm_grass_base/grass_a.png` (new, approved source); `docs/art-pipeline/review/tile_farm_grass_base_grass_a/` (new review manifest, RGBA input adapter, normalized output, evidence images, `AUDIT.md`).
- Compatibility: no runtime, map, save, quest, curriculum, mastery, or interaction change. `public/maps/farm.json` untouched. Nothing loaded in Phaser. No production `tile_farm_grass_base` manifest or packed sheet was created — the target is a 3-cell (`grass_a`/`grass_b`/`grass_c`) sheet and only 1 of 3 cells exists.
- Verification: `npm ci`, `npm run check`, `npm run test:asset-pipeline`, `npm run test:unit`, `npm run smoke` all run (see PR report for results); the review manifest itself was normalized and validated through the repo's actual `normalize-asset-sheet.mjs`/`validate-asset-sheet.mjs` scripts.
- Pipeline note: found and worked around a real gap between `FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`'s Category A guidance (`background: alpha`, `fit: fill`) and the current `normalize-asset-sheet.mjs`, which rejects an alpha-less RGB source under `mode: alpha` and only accepts `fit: "contain"`. Full detail and the exact workaround (a byte-exact RGBA round-trip of the approved source, verified 0 pixel differences) are in `AUDIT.md` — relevant to whoever authors the eventual production manifest for this target.
- Remaining risk: awaiting ChatGPT visual review of this evidence set before `grass_b`/`grass_c` or `tile_farm_path_dirt` generation begins. The two script/doc pipeline mismatches noted above will recur for the production manifest unless addressed.

## 2026-07-11 — ChatGPT guidance consolidation

- Branch/PR: `chatgpt/guidance-doc-cleanup`, PR #71 (rebased onto `main` after PR #70's squash merge).
- Scope: consolidated durable agent guidance, added a documentation source-of-truth map, condensed current status around the active environment-art milestone, refreshed physical-iPad/child playtest instructions, marked completed plans as historical, and made the visual/prompting contracts status-neutral.
- Principal files: `AGENTS.md`, `README.md`, `docs/README.md`, `docs/CURRENT_STATE.md`, `docs/REAL_CHILD_PLAYTEST_GUIDE.md`, `docs/playtests/CHILD_CLARITY_CHECKLIST.md`, `docs/VISUAL_ASSET_CONTRACT.md`, `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md`, `docs/beautification/README.md`, and the completed Attention-First/Wildbloom records.
- Compatibility: documentation only; no runtime, map, save, quest, curriculum, mastery, asset, manifest, or test behavior changed.
- Verification: CI re-run on the exact rebased/retargeted head; browser/device behavior is unchanged and no physical-iPad claim is made.
- Remaining risk: none tracked beyond the standing physical-iPad certification still owed for the visual milestone.

## 2026-07-11 — Claude Code Phase 2 environment specifications

- Branch/PR: `claude/beautification-phase2-farm-kit-v1`, PR #70 (squash-merged to `main`).
- Scope: added the farm water/shoreline, vegetation/structure, prop, and Wildbloom target specifications; locked the approved external style direction into a versioned farm palette; completed both 13-variant terrain sets (with inner corners); corrected tall fence/gate/signpost geometry; added the Batch A–F production-generation handoff; and recorded the four resolved production decisions (grass scatter → Batch C; tilled soil / sprouts / harvest / crop-row → Batch D; one deterministic packed PNG per target ID; shimmer authored now with the runtime loop deferred to Phase 3; shore-rock 16×16 decal vs medium-rock 32×32 landmark).
- Compatibility: specifications and validation only; no production art, runtime, map, save, quest, curriculum, or interaction change. The external style-lock reference stays uncommitted.
- Verification: `validate:visual-targets`, repository check/build, asset-pipeline tests, and unit tests passed; GitHub CI green on the final head before squash merge. (The `wildbloom-discovery` smoke flake is a known pre-existing local-Chromium timing issue identical to `main`.)
- Remaining risk: production source generation, manifests, runtime previews, and map integration have not started.

## 2026-07-10 — Canvas migration to 960×640

- Branch/PR: `claude/beautification-phase1-canvas-960x640`, PR #66.
- Scope: migrated the logical canvas and world presentation from `480×320` to `960×640`; centralized dimensions/scaling; added a tested save v1→v2 coordinate migration; consolidated Playwright canvas-coordinate helpers; and fixed Phaser hit-testing issues exposed by the migration.
- Compatibility: world coverage, gameplay timing, touch behavior, stable IDs, quests, curriculum, and both profiles were preserved.
- Verification: full CI and visual-playtest evidence passed on the final reviewed head before squash merge.
- Remaining risk: physical-iPad Safari performance and touch behavior remain separate real-device checks.

## 2026-07-10 — Baseline visual audit

- Branch/PR: `claude/beautification-phase0-baseline`, PR #65.
- Scope: committed the beautification execution plan, recorded the pre-migration renderer/canvas baseline, and added evidence-only baseline screenshot coverage.
- Compatibility: no runtime change.
- Verification: full repository checks and browser evidence passed; a documented environment flake was not treated as a regression.
