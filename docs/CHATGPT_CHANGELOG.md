# ChatGPT Change Log

This file keeps recent, high-value change summaries. Full historical entries through 2026-07-11 are preserved in [`docs/changelog/legacy-through-2026-07-11.md`](changelog/legacy-through-2026-07-11.md) and in Git history.

Entries should remain concise: date/author, branch or PR, scope, compatibility impact, verification, and remaining risk. Detailed implementation narratives belong in the PR description and commits.

## 2026-07-21 — Living World (M3)

- Author/branch: Codex (lead engineering agent), `world/living-world-m3`, draft PR #108. Phase commits through the cross-map compass: village `56e19b3`, quest foundations `79d91d1`, dialogue/Berry Order `f956b6b`, and the Phase 4 commit containing this entry.
- Scope: added Eldoria Village and reciprocal farm travel; reusable profile-aware Baker Pell dialogue; shared speech lifecycle support; a typed registry-owned Berry Order with no-prompt gathering and a deterministic one-time 20-gold/Berry-Pie reward; and a validated `nextHop` cross-map compass that targets real exit centres and corrects Mira's off-farm banner to `Head back to The Farm —`. Detailed record: [`docs/changelog/2026-07-21-living-world.md`](changelog/2026-07-21-living-world.md).
- Verification: local `npm run typecheck` exit 0; `npm run test:unit` exit 0 (13 files, 148 tests); `npx playwright test --list` exit 0 (73 tests in 14 files); `npm run check` exit 0 (11 visual-target files / 37 targets, 43-module production build, PWA/generated-surface/village-art checks); full `npx playwright test` exit 0 (73/73 in 5.0 minutes). Phase 3 exact-head CI run [`29710792994`](https://github.com/Galashots/Eldoria-v2/actions/runs/29710792994) passed at `f956b6b81efeb1953f076487490ee86f3582c54e`; final Phase 4 exact-head CI is recorded in PR #108 after push.
- Compatibility: save version remains 2; optional quest fields default gracefully and Mira's legacy flags/state machine remain authoritative. No migration, profile-ID, curriculum, mastery, dependency, asset-pipeline, economy, learning-gate, Mossheart Ruins, shop, or new art/audio change.
- Evidence/risk: six committed browser screenshots cover Mage/Ranger dialogue, gathering/reward, and both cross-map guidance directions. Physical-iPad Safari and child validation remain unperformed; village/character bridge art is not final production art.

## 2026-07-19 — Evidence-first agent workflow

- Author/branch: Codex, `codex/evidence-first-workflow`; draft PR #109.
- Scope: added proportional root-cause debugging, red/green behavioral regression evidence, condition-based waiting, exact-range read-only review, and fresh exact-head completion evidence to `AGENTS.md`. Created the reusable local `evidence-first-development` Codex skill outside the public repository; existing Game Studio skills remain authoritative for new browser-game architecture, implementation, assets, UI, and playtesting.
- Compatibility: documentation/workflow only; no runtime, save, curriculum, dependency, or asset-pipeline change.
- Verification: independent Kimi-K3 exact-range review of the PR diff; PR CI green before merge; `main` post-merge tree re-verified (`npm run typecheck`, `npm run test:unit`, `npm run check` all exit 0).
- Risk: none identified; the workflow raises evidence requirements for future agent work rather than changing game behavior.

## 2026-07-19 — Wildbloom transient-text CI hardening

- Author/branch: Codex, `codex/wildbloom-transient-text-hardening`; draft PR #110.
- Scope: replaced the remaining fixed sleeps and one-shot display-list samples in `tests/wildbloom-discovery.spec.ts` with a browser-side rAF recorder (`__wildbloomCanvasTextsSeen`) that is reset immediately before reveal actions and captures text recursively inside toast containers. No runtime change; the completion toast and reveal timing are untouched.
- Compatibility: test-only. No save, curriculum, dependency, asset-pipeline, or gameplay change.
- Verification: local wildbloom spec 3/3 green; exact-head CI run [`29715603293`](https://github.com/Galashots/Eldoria-v2/actions/runs/29715603293) green (148/148 unit, 73/73 browser); independent Kimi-K3 review confirmed no remaining fixed waits except the intentional dormant-spot negative-test settle.
- Risk: the recorder pattern is now the required template for asserting any transient canvas text; future specs must reset before the triggering action to avoid lifetime-text false positives.

## 2026-07-20 — Multi-map world foundation (M2)

- Author/branch: Codex (lead engineering agent), `world/multi-map-foundation`, draft PR #107. Commits: map data + farm exit `9a1a71d`, Wildbloom Woods map/scene rewire `5f0d6c1`, save/`lastArea` persistence `a8fe205`, E2E + docs `cd9c52e`, review fixes `f68fcfa`.
- Scope: real Tiled multi-map world (The Farm ↔ Wildbloom Woods) with reciprocal walk-into gates, fade transitions, entry banners, spawn points, and per-map collision; `src/data/maps.ts` owns map metadata and the directed exit graph; map authoring contract in `docs/MAP_AUTHORING.md`.
- Compatibility: `lastArea` rides an existing save field — no schema bump; old saves resolve to the farm. No curriculum, mastery, quest-ID, dependency, or asset-pipeline change.
- Verification: 117 unit / 68 browser tests green on exact-head CI; independent Kimi-K3 review of the full diff; local fresh-checkout reproduction of typecheck, unit, check, and full Playwright suite.
- Risk: off-map objective guidance (compass/arrow routing across maps) was explicitly deferred to M3; Mira's off-farm banner wording was known-misleading until the M3 compass correction.

## 2026-07-19 — Game feel + purposeful interactions (play-feedback milestone)

- Author/branch: Codex, `play/feel-and-purpose`; PR #106. Squash-merged after Kimi-K3 playtest-debugging cycle.
- Scope: movement/camera tuning centralized in `src/movementTuning.ts` (350 px/s cap, acceleration smoothing, 0.3 camera lerp); post-purpose interactions converted to rotating flavor toasts (`src/data/flavor.ts`) with an explicit crop/Mira "ACTION again to practice!" opt-in; Mira rotates combat/farm/quest practice contexts and replaces the retired slime as the combat-practice tap; Practice Slime permanent-defeat persistence with soft-lock guards.
- Compatibility: save version 2 unchanged; `practiceSlimeDefeated` flag defaults to present for old saves. Learning remains fully optional and never gates adventure.
- Verification: playtest-driven hypotheses with one-variable-at-a-time changes; 110+ unit tests and full browser suite green on exact-head CI; Kimi-K3 verified completion claims against fresh evidence before acceptance.
- Risk: flavor rotation and opt-in pacing validated in browser only; child validation pending next playtest.

## 2026-07-17 — Shoreline terrain-blend family (13 cells) — APPROVED, no v3 required

- Author/branch: ChatGPT generation + Kimi-K3 deterministic compositor, `terrain/water-shore-family`; PR #99.
- Scope: all 12 generated `tile_farm_water_shore` transition cells approved as runtime masters after the v2 material correction passed exhaustive adjacency and visual review; `center` retains approved `water_a` identity. Source, review evidence, manifest, and packed sheet on `main`.
- Compatibility: asset-only; not runtime/map/Wangset integrated. The bounded proof map continues to use centres only.
- Verification: deterministic recompositing reproduces every cell byte-exact; adjacency matrix and large-field repeat gates passed; user visual approval recorded.
- Risk: none for current scope; final integration awaits the Wangset-aware composition gate.

## 2026-07-17 — Shoreline terrain-blend family v2 material correction — verdict pending

- Superseded by the APPROVED entry above; retained for decision history.

## 2026-07-17 — Shoreline terrain-blend family (13 cells) — implementation complete, verdict pending

- Superseded by the APPROVED entry above; retained for decision history.

## 2026-07-17 — Deterministic terrain-blend compositor + dirt family (13 cells) — APPROVED

- Author/branch: Kimi-K3, `terrain/dirt-blend-family`; merged to `main`.
- Scope: `scripts/compose-terrain-blend.mjs` deterministically composites transition cells from approved centres; all 12 `tile_farm_path_dirt` transition cells approved as runtime masters; manifest, source, and packed sheet on `main`.
- Compatibility: asset-only. Proof map unchanged (centre only).
- Verification: zero-drift round trips; adjacency/repeat gates; user approval.
- Risk: none for current scope.

## 2026-07-17 — Batch B water_b runtime master

- Author: Kimi-K3. `tile_farm_water_base / water_b` derived from `water_a` by 18 adjacent interior pair swaps (seed 33199, delta ≤ 1), unchanged borders and 1px inner buffer, exact histogram/palette preservation, deterministic `1024×1024` canonical source, zero-drift round trip. APPROVED as exact `16×16` runtime master.

## 2026-07-16 — Batch B grass_c runtime master

- Author: Kimi-K3. `tile_farm_grass_base / grass_c` derived from `grass_a` by 22 adjacent interior pair swaps (seed 91537), unchanged borders and 1px inner buffer, exact histogram/forest-palette preservation, deterministic canonical source, zero-drift round trip. APPROVED as exact `16×16` runtime master.

## 2026-07-16 — Adaptive difficulty, PWA, terrain proof, E2E hardening bundle

- Author/branch: Kimi-K3, four stacked PRs (#102 chain), independently reviewed by Codex and merged after evidence-first fixes.
- Scope: adaptive difficulty `1 + floor(streak/3)` with per-template caps and reachable floors; PWA manifest + deterministic generated icons; bounded terrain integration proof on the farm Ground layer via `scripts/compose-terrain-proof-tileset.mjs`; Playwright Canvas-forcing (`__ELDORIA_E2E__`) cutting the full suite from 224s to 194s with zero WebGL context-loss warnings; renderer-agnostic movement round-trip assertions bounded to one tile.
- Compatibility: save version 2 unchanged; production renderer stays `Phaser.AUTO`; no curriculum template removed.
- Verification: each PR merged only after exact-head CI green plus independent reviewer reproduction; bundle re-verified on post-merge `main`.
- Risk: PWA physical-iPad installation unvalidated; terrain proof has hard centre-tile boundaries by design.

## 2026-07-15 — Practice Slime encounter and first-defeat prompt

- Author/branch: Codex, `combat/practice-slime`; reviewed and merged.
- Scope: three-hit Practice Slime with pips, encounter presentation gating the learning prompt, and first-defeat persistence groundwork.
- Compatibility: save version 2; learning never gates adventure.
- Verification: unit + browser coverage of the encounter, prompt timing, and wrong-answer/skip preservation.

## 2026-07-14 — Wildbloom Woods discovery loop

- Author/branch: Codex, `world/wildbloom-discovery`; reviewed and merged.
- Scope: optional Wildbloom Sprig discovery loop with three persistent secrets, profile-specific reveal abilities (Mage spell spark / Ranger tracking shot), and fixed non-random rewards.
- Compatibility: purely additive optional content; no learning-gate.
- Verification: discovery persistence across reload; both profile paths browser-tested.

## 2026-07-13 — Mira's three-errand quest chain

- Author/branch: Codex, `quest/mira-errands`; reviewed and merged.
- Scope: Mira's First Errand, The Whispering Scarecrow, and The Sleepy Sprouts on `FarmQuestSystem`; fixed rewards; save-version-2 persistence.
- Compatibility: legacy flags authoritative; no migration needed from v1 test saves.
- Verification: full chain browser-tested on both profiles including reload resume.

## 2026-07-12 — Waking Gate opening scene

- Author/branch: Codex, `scene/waking-gate`; reviewed and merged.
- Scope: short skippable opening action scene for fresh profiles; Mage fires spell sparks, Ranger fires tracking shots; returning saves skip to the farm.
- Compatibility: `opening_seen` localStorage flag only; no save-schema change.

---

Older entries live in [`docs/changelog/legacy-through-2026-07-11.md`](changelog/legacy-through-2026-07-11.md).
