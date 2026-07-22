# ChatGPT Change Log

This file keeps recent, high-value change summaries. Detailed historical entries through 2026-07-11 remain in [`docs/changelog/legacy-through-2026-07-11.md`](changelog/legacy-through-2026-07-11.md); later superseded detail remains available in Git history and the relevant PRs.

Each entry should state the actual author, branch or PR, concise scope, verification, compatibility, and remaining risk. Implementation narratives belong in PR descriptions, commits, and audit records.

## 2026-07-22 — Canonical lane contract restacked onto the approved scatter recipe

- Author/branch: Claude Code, `claude/lane-contract-restack`. Restacks the stranded lane-contract work (local-only commit `665064c`, orphaned when PR #126 merged without it; owner directed the restack 2026-07-22) onto current `main`, reconciled with the dual-family palette routing from #126.
- Scope: `scripts/paint-scatter-family.mjs` adopts `eldoria-lane-report/v1` — per-variant 256×256 exact-`#FF00FF` keyed sources with a fail-closed uniform-cell round-trip gate; explicit `binary_alpha` gate; declared per-variant expected width/height ranges; `horizontal_offset_from_pivot` metric; `producer.tool_sha256` + `lane` provenance; per-variant `production_class` and `palette_family`; `machine_passed` + `named_next_gate` verdict block. Per ChatGPT's independent review (2026-07-22): the production run now performs **two complete write passes**, compares the encoded files byte-for-byte (`written_files_byte_identical` + `files_compared`), decodes the written artifacts back through the repo decoder, and measures every gate on the decoded pixels (`measurement_basis` recorded in the report); `approved_master_parity` against the committed runtime masters is reported per variant (asserted true on canonical inputs by the suite; not hard-gated, so intentional grammar changes route to the visual gate). `scripts/test-paint-scatter.mjs` suite 20/20, including post-write corruption detection and cross-run byte-difference failure.
- Verification: `test:paint-scatter` 20/20; decoded fresh-run runtime pixels exactly equal the four committed `*.approved-runtime-master.png` files (machine-asserted; no art-pixel change; the committed approval-time `family-report.json` remains the approval record in its original schema — future runs emit the lane schema).
- Compatibility: tooling and tests only. No runtime, map, save, curriculum, quest, dependency, workflow-file, target-metadata, or asset-pixel change.
- Remaining risk: the lane contract is exercised by one family so far; adopting it for other recipe lanes is future work.

## 2026-07-22 — Grass-scatter family approved: grammar unheld, pebble palette-family amendment

- Author/branch: Kimi K3 (repo agent), `kimi/scatter-paint-recipe`, PR #126. Visual-audit gate explicitly owner-delegated to the repo agent for the overnight session; verdict recorded for morning confirmation in `docs/art-pipeline/review/tile_farm_grass_scatter_family/AUDIT.md`.
- Scope: overnight visual audit of the first mixed anchor/derived recipe pilot. Round 1: `tuft_a`/`tuft_b`/`flower_a` passed; `pebble_a` **failed the identity read** — a forest-green stone renders as a dark hole on grass. Spec finding resolved by amending `tile_farm_grass_scatter.paletteFamilies` to `["forest", "metal_stone"]` (locked palette JSON unchanged; `metal_stone` is the approved `rock_a` family) and routing `pebble_a` to it in both the JS recipe and the Python skill copy in one pass. `GRAMMAR_VERSION` unheld to `scatter-grammar/v1`. All four variants recorded as APPROVED RUNTIME MASTERS with the committed recipe as canonical source; evidence (montage, 8×, grass composites, runtime masters, machine family report) committed under `docs/art-pipeline/review/tile_farm_grass_scatter_family/`. Tests extended to 13/13: per-family palette exactness, `pebble_a` 100% metal_stone, dual-family tamper loudness.
- Verification: `test:paint-scatter` 13/13; full gate suite re-run on the exact committed head (`check`, `test:visual-targets`, `test:asset-pipeline`, `test:terrain-blend`, `test:unit`); Python skill copy re-run green on the same locked inputs.
- Compatibility: tooling, target metadata (one paletteFamilies amendment), and committed review evidence. No runtime, map, save, curriculum, quest, dependency, workflow, or scene change; no packed sheet or scene integration yet (belongs to the decor-scatter wiring PR).
- Remaining risk: the metal_stone amendment and the delegated verdict await owner morning confirmation (one-line target edit + one recipe constant to revert); scene wiring with in-game density evidence is still required before any visual change reaches players.

## 2026-07-21 — Scatter-decal painter recipe scaffold (grammar constants held)

- Author/branch: Kimi K3 (repo agent), `kimi/scatter-paint-recipe`. Owner-approved commit path (a): in-repo Node recipe per the `compose-terrain-blend-family.mjs` precedent; scaffold directed by Claude Code on the owner's behalf.
- Scope: `scripts/paint-scatter-family.mjs` — deterministic seeded painter for the `tile_farm_grass_scatter` family (`tuft_a`, `tuft_b` as declared seed sibling, `flower_a`, `pebble_a`); palette READ from the locked `farm_environment_palette_v1.json` (no inlined copy); SHA-256 locked-input recording; byte-identical two-run regeneration proof; per-variant gates (bbox, occupancy, edge contact, pivot band) plus an applicable-invariant table with explicit `N/A`s; family contact sheet + one family report with a DRAFT verdict (HOLD pending ChatGPT visual audit). `scripts/test-paint-scatter.mjs` — red-first suite exposed as `test:paint-scatter` and chained into `test:asset-pipeline` in `package.json`, so the existing CI asset-pipeline step gates it with **no `.github/workflows/` change** (owner-gated surface; a dedicated named CI step remains an owner-approval option). Grammar constants are **held** (`GRAMMAR_VERSION = scatter-grammar/v1-held`) pending ChatGPT's visual verdict; any tweak lands in this file and the Python skill copy in one pass.
- Verification: red-first run failed pre-implementation (`ERR_MODULE_NOT_FOUND`), then 12/12 green — including evidence-image subject-pixel checks added after the suite initially passed while `writePng` stride misuse produced blank previews (caught by montage inspection). Deterministic regeneration proven byte-identical across runs; locked-input tamper test proves a palette edit changes hash + output bytes.
- Compatibility: new tooling files only — no runtime, map, save, curriculum, quest, dependency, or asset change; no committed art (outputs are candidates + machine evidence).
- Remaining risk: grammar constants and final silhouettes await ChatGPT's visual verdict (flower quietness flagged as a likely note); JS-seeded silhouettes differ from the Python reference painter's (same grammar family, different draws) — the merged `.mjs` becomes the single production source on approval.

## 2026-07-21 — Derive-over-generate production classes + governance follow-ups

- Author/branch: Kimi K3 (repo agent), `kimi/production-classes-policy`. Implements ChatGPT's APPROVE-WITH-AMENDMENTS adjudication of the derive-over-generate proposal (PR #123 comment), all nine amendments encoded; plus the three follow-ups accepted from Kimi's #123 review.
- Scope: (1) three production classes (`anchor` / `derived` / `procedural`) with classification rules and the recipe-level approval gate added to `CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md` — derived families get one committed tested recipe, locked input hashes, full applicable machine validation (recipe-declared invariants and thresholds; non-applicable gates recorded `N/A`), hard-case audit, full-family contact sheet, one family-level verdict, machine-generated report; (2) `productionClass` added to the visual-target validator (optional; `anchor|derived|procedural`; absent = unclassified legacy, still valid) with red-first tests, and the `tile_farm_grass_scatter` pilot target classified `anchor` (tuft_a/flower_a/pebble_a anchors; only tuft_b derivable, per adjudication); (3) Farm handoff Batch B–F order corrected around derivation (furrow-mask requirement for tilled soil, lily/flower anchors, structures after the perspective trial, shimmer/sway/dapples/glow as procedural); (4) concise council-format rule restored in `MULTI_MODEL_OPERATING_GUIDE.md` §5; (5) changelog archival cadence (25 entries or major milestone) in `AGENTS.md` + `docs/README.md`; (6) `CURRENT_STATE.md` refreshed post-#123 (new verified main, next work = scatter pilot + parallel perspective trial + scatter wiring).
- Verification: red-first validator tests failed pre-implementation (`expected an invalid productionClass to fail, got: `), green after; `test:visual-targets`, `test:asset-pipeline`, `test:terrain-blend`, `test:unit` 231/231 all green; `npm run check` green on the committed head (generated-surfaces diff gate clean — the gate diffs the modified target JSON against HEAD, so it only passes post-commit).
- Compatibility: docs, validator tooling, and one optional target-metadata field. No runtime, map, save, curriculum, quest, dependency, workflow, or asset-pixel change; existing 37 targets validate unchanged.
- Remaining risk: classification of the remaining legacy targets happens as they enter production batches; the derive-over-generate efficiency claim is measured after the scatter pilot, not promised.
- Amendments (2026-07-21, ChatGPT independent review of `02c12a5`, applied in-branch): recipe gate reworded to **full applicable machine validation** — each recipe declares applicable invariants/thresholds, non-applicable gates recorded `N/A`, deterministic regeneration + locked-input verification + exact output validation universal, histogram/border/seam/occupancy/palette/frame-continuity as type-specific examples; pilot renamed **first mixed anchor/derived recipe pilot** (family stays anchor-gated; the `tuft_b` recipe is the first exercise of the derived recipe-level gate) in `CURRENT_STATE.md`, the Farm handoff, and this log; `CURRENT_STATE.md` enforcement wording corrected to the transitional rule (declared values enum-validated; legacy targets classified at their next production batch).

## 2026-07-21 — Product master plan, guidance compaction, and character perspective lock

- Author/branch: ChatGPT, `chatgpt/eldoria-master-plan-v2`, PR #123.
- Scope: adds `docs/ELDORIA_MASTER_PLAN.md` as the stable product/world authority; adds the binding elevated-three-quarter `CHARACTER_PERSPECTIVE_LOCK_V1.md`; rewrites the visual-transformation plan; updates hero, armor, visual, merge, review, and cross-provider guidance; routes agents through smaller task-specific reading sets; compacts `CURRENT_STATE.md`; refreshes the public README; and removes stale asset-production status from durable workflow documents.
- Verification: documentation source-of-truth, link, contradiction, stale-status, merge-policy, and obsolete-command audit; exact-head `build` and `emulation` CI plus independent Kimi review remain required after the final documentation commit.
- Compatibility: documentation and target metadata only. No runtime, map, save, curriculum, quest, dependency, workflow, or asset-pixel change.
- Remaining risk: the proposed `32×48` character proof canvas and prompt strategy still require a bounded four-direction runtime trial; physical-iPad and child validation remain outstanding.

## 2026-07-21 — Decor-scatter placement primitive

- Author/branch: Claude Code and Kimi K3 under explicit ownership transfer, `claude/d6-decor-scatter`, PR #122.
- Scope: pure seeded Decor placement, static map/registry-derived exclusions, Phaser-free Wildbloom spot constants, and a complete 38-placement Farm diff gate. The primitive is not scene-integrated.
- Verification: ChatGPT's independent review amendments pin the full placement output and clear every Tiled transformation flag; final exact-head `build` and `emulation` CI passed before merge.
- Compatibility: additive only; no map, save, quest, curriculum, profile-ID, dependency, workflow, or runtime-visual change.
- Remaining risk: density, weighting, invalid-config handling, and real in-game appearance remain for the approved scatter-art integration PR.

## 2026-07-21 — Protected-path Claude file-tool guardrail

- Author/branch: Claude Code, `claude/protected-path-hooks`, PR #121.
- Scope: portable PreToolUse guardrail for core Claude file tools writing `.github/workflows/**` or `src/systems/SaveSystem*`, with an ignored owner-approval marker and documented shell/MCP limitations.
- Verification: traversal, Windows-case, stdin/exit-code, marker-I/O, and committed-settings regressions passed; exact-head `build` and `emulation` CI passed before owner merge.
- Compatibility: no runtime, save, curriculum, quest, asset, dependency, or workflow-file change.
- Remaining risk: this is an accidental-write guardrail, not a security boundary.

## 2026-07-21 — Multi-model operating guide adopted and streamlined

- Initial implementation: Claude Code; independent reviews and adjudication by Kimi and ChatGPT. Current v1.2 compaction is part of PR #123.
- Scope: one accountable implementation owner per branch, visible coordination surfaces, different-provider review, exact-head evidence, merge-commit-only history, delegated non-self merging, and reserved owner gates.
- Verification: repository guidance cross-checked against `AGENTS.md`; PR #123 requires fresh exact-head CI and independent Kimi review.
- Compatibility: governance/documentation only.
- Remaining risk: process quality still depends on agents verifying evidence rather than trusting completion summaries.
