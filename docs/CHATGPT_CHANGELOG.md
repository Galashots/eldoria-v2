# ChatGPT Change Log

This file keeps recent, high-value change summaries. Full historical entries through 2026-07-11 are preserved in [`docs/changelog/legacy-through-2026-07-11.md`](changelog/legacy-through-2026-07-11.md) and in Git history.

Entries should remain concise: date/author, branch or PR, scope, compatibility impact, verification, and remaining risk. Detailed implementation narratives belong in the PR description and commits.

## 2026-07-11 — Asset-pipeline fix: RGB+alpha sources and fit:"fill"

- Branch/PR: `claude/beautification-phase2-batch-a-grass-a` (draft PR #72, addressing ChatGPT's review comment).
- Scope: generic fix to `scripts/normalize-asset-sheet.mjs` requested during ChatGPT's visual review of PR #72. `background.mode: "alpha"` now accepts an RGB source (readPng already synthesizes alpha=255 for RGB input; `writePng`/output remain RGBA), and `fit: "fill"` is now implemented alongside `fit: "contain"` (independent X/Y nearest-neighbour scaling that fully covers the destination cell, no letterboxing). Removes the need for a per-source RGBA-adapter workaround for every future full-bleed terrain source.
- Principal files: `scripts/normalize-asset-sheet.mjs` (validation + `paste()` fit handling), `scripts/test-asset-pipeline.mjs` (new focused tests: RGB+alpha normalization producing fully-opaque RGBA output with source RGB preserved; `fit: "contain"` vs `fit: "fill"` behavior on a non-square source; confirmation an unknown `fit` value is still rejected).
- Grass_a review evidence updated to match: `docs/art-pipeline/review/tile_farm_grass_base_grass_a/grass_a.review.manifest.json` now points directly at the approved source (`assets/source/generated/tile_farm_grass_base/grass_a.png`) with `background.mode: "alpha"` and `fit: "fill"`; the temporary `grass_a.rgba-adapter.png` was deleted. The regenerated normalized 16×16 output is **byte-identical** to the prior adapter-based output (confirmed by SHA-256), so all previously-audited seam/gradient/palette findings still hold; evidence preview images were regenerated (nearest-neighbour only) from the same normalized pixels.
- Compatibility: pipeline-script and review-evidence change only; no runtime, map, save, quest, curriculum, mastery, or interaction change. No production `tile_farm_grass_base` manifest exists; `grass_a` remains 1 of 3 required cells.
- Verification: `npm ci`, `npm run check`, `npm run test:asset-pipeline` (including the two new tests), `npm run test:unit` all pass locally; `npm run smoke` hit the same local Playwright browser-revision/proxy limitation noted previously (not a code issue) — GitHub CI's pinned browser suite is the source of truth.
- Remaining risk: awaiting ChatGPT's final review of this pipeline fix before `grass_b`/`grass_c` or `tile_farm_path_dirt` generation begins.

## 2026-07-11 — Batch A grass_a source acceptance and review-only normalization

- Branch/PR: `claude/beautification-phase2-batch-a-grass-a` (draft PR pending).
- Scope: accepted the first Phase 2 Batch A production source candidate (`tile_farm_grass_base` / `grass_a`, ChatGPT-approved as **APPROVED SOURCE CANDIDATE**); verified the received PNG's format/dimensions/SHA-256 against the expected values before committing it byte-for-byte; produced a clearly review-only manifest/normalization (16×16, Category A settings) plus nearest-neighbor evidence previews (enlarged tile, 3×3 repeat, 12×8 field, comparison panel) and a deterministic seam/gradient/palette audit, all under `docs/art-pipeline/review/tile_farm_grass_base_grass_a/`, not under the production manifest/output paths.
- Principal files: `assets/source/generated/tile_farm_grass_base/grass_a.png` (new, approved source); `docs/art-pipeline/review/tile_farm_grass_base_grass_a/` (new review manifest, RGBA input adapter, normalized output, evidence images, `AUDIT.md`).
- Compatibility: no runtime, map, save, quest, curriculum, mastery, or interaction change. `public/maps/farm.json` untouched. Nothing loaded in Phaser. No production `tile_farm_grass_base` manifest or packed sheet was created — the target is a 3-cell (`grass_a`/`grass_b`/`grass_c`) sheet and only 1 of 3 cells exists.
- Verification: `npm ci`, `npm run check`, `npm run test:asset-pipeline`, `npm run test:unit`, `npm run smoke` all run (see PR report for results); the review manifest itself was normalized and validated through the repo's actual `normalize-asset-sheet.mjs`/`validate-asset-sheet.mjs` scripts.
- Pipeline note: found and worked around a real gap between `FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`'s Category A guidance (`background: alpha`, `fit: fill`) and the current `normalize-asset-sheet.mjs`, which rejects an alpha-less RGB source under `mode: alpha` and only accepts `fit: "contain"`. Full detail and the exact workaround (a byte-exact RGBA round-trip of the approved source, verified 0 pixel differences) are in `AUDIT.md` — relevant to whoever authors the eventual production manifest for this target.
- Remaining risk: awaiting ChatGPT visual review of this evidence set before `grass_b`/`grass_c` or `tile_farm_path_dirt` generation begins. The two script/doc pipeline mismatches noted above will recur for the production manifest unless addressed.

## 2026-07-11 — Claude Code review fixes: canvas-scale helpers, button hit-testing, palette validation

- Branch/PR: `claude/eldoria-v2-audit-expansion-qi1s6r`, PR #73 (draft, not yet merged).
- Scope: this PR went through three rounds, not just the original ten findings — later rounds are follow-up corrections on top of the first, not a replacement for it.
  1. **Original 10 findings** from a full-repo `/code-review` pass over the canvas-scale migration and Phase 2 farm-spec work (PRs #66, #70, #71). Two real bugs: an un-doubled quest-marker label font size, and an un-scaled scatter stride in `PolishedWorldScene`'s ambient farm motes that caused visible clustering. Eight cleanup/altitude fixes: added `sscale()`/`fpx()` helpers to `gameDimensions.ts` alongside `sx`/`sy`; centralized `drawRoundedButton()`'s `setScrollFactor(0)`; replaced the Stats panel's hand-synced duplicate close-button geometry with one `drawRoundedButton()` call in real screen coordinates; made `validate-visual-targets.mjs`'s palette validator check any hex-swatch object generically instead of two hardcoded fields; deduplicated the hex-color regex and the `MemoryStorage` test double.
  2. **Two follow-up fixes from a Google Jules review pass** on the round-1 head: `WorldScene.nearestTarget()` (runs every frame) now uses `Phaser.Math.Distance.Squared` instead of `Distance.Between`, avoiding a `sqrt` per target; `getTiledProperty()`'s `any` parameter/return types were replaced with a `TiledPropertyEntry[] | Record<string, unknown>` union and an `unknown` return type. (Three other Jules suggestions — replacing `Math.hypot`, caching `makeTargets()`, and flagging `Math.random()`/`--host 0.0.0.0` as security issues — were reviewed and rejected as either non-hot-path micro-optimizations or context-blind false positives; see the PR body for the full reasoning.)
  3. **Two final-review corrections**, applied before merge: (a) round-1's `fpx()` conversion had incorrectly been applied to text children inside `WorldScene`'s `openStatsPanel()` panel and `showToast()`'s toast container — both already `.setScale(GAME_SCALE)`'d, so wrapping their child font sizes in `fpx()` too would compound the scale a second time if `GAME_SCALE` ever changes (today's rendered output was unaffected, since the round-trip conversion was numerically lossless at `GAME_SCALE=2`, but the pattern was wrong). Those 12 sites were restored to local design-space literals, and `fpx()`'s doc comment now states this scope explicitly. (b) `validate-visual-targets.mjs`'s generic palette-swatch-group validation silently skipped any non-array entry (e.g. a malformed `"root_star": "#FFD666"` instead of an array would have passed); non-array entries are now validation errors, `contractFamilyMapping` was added to an explicit non-swatch-object exclusion list, and the script was refactored to export `collectVisualTargetErrors`/`validatePaletteDocument` for direct testing — six new focused tests live in `scripts/test-visual-targets.mjs` (new `test:visual-targets` script).
- Principal files: `src/gameDimensions.ts`, `src/scenes/WorldScene.ts`, `src/scenes/PolishedWorldScene.ts`, `src/scenes/TitleScene.ts`, `src/presentation/uiHelpers.ts`, `src/presentation/HeroPresentationController.ts`, `src/presentation/PracticeSlimeEncounterController.ts`, `src/presentation/WildbloomDiscoveryController.ts`, `src/data/interactions.ts`, `scripts/validate-visual-targets.mjs`, `scripts/normalize-asset-sheet.mjs`, `scripts/lib/hex-color.mjs` (new), `scripts/test-visual-targets.mjs` (new), `tests/support/memoryStorage.ts` (new).
- Compatibility: presentation/tooling only; no gameplay, save, quest, curriculum, or mastery behavior changed. Visible effect is limited to the two round-1 bug fixes (marker label now full size; ambient motes spread evenly instead of clustering) — everything else, across all three rounds, is an internal refactor with identical rendered output.
- Verification: `npm ci`, `npm run check` (visual-target validation + typecheck + build), `npm run test:unit` (48 passed), `npm run test:asset-pipeline`, `npm run test:visual-targets` (new, 6 focused palette-validation cases), and the full Playwright suite (50 passed, run via a throwaway local-Chromium config to work around the sandbox's browser-revision mismatch; CI installs the pinned browser directly) all green.
- Remaining risk: PR #72 (RGB-alpha/`fit:"fill"` pipeline support, grass_a source acceptance) merged first; this branch was rebased onto the resulting `main`, preserving both #72's pipeline changes and this PR's shared hex-pattern import and review fixes (see the rebase-conflict resolution recorded in this session's report). No physical-iPad validation was performed for this change.

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
