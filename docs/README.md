# Eldoria-V2 Documentation Map

Use this page to find the current source of truth. Do not infer project status from whichever planning file appears newest.

## Source-of-truth hierarchy

When documents disagree, use this order:

1. Runtime code, map data, tests, and committed asset manifests for what the game actually does.
2. Machine-readable target JSON under `docs/visual-targets/` for asset geometry, variants, pivots, palettes, and metadata.
3. `docs/CURRENT_STATE.md` for volatile implementation status, the active milestone, known risks, and next steps.
4. Durable contracts and pipeline guides for rules and process.
5. Execution plans and research documents for approved direction and historical rationale.

A planning document does not prove implementation. A browser-emulated iPad viewport does not prove physical-iPad behavior. Generated concept art does not become production source art until it receives an explicit source-audit verdict.

## Start here

- [`../AGENTS.md`](../AGENTS.md) — durable product rules, workflow, testing, visual evidence, and merge policy.
- [`CURRENT_STATE.md`](CURRENT_STATE.md) — current playable capabilities, active milestone, near-term work, and known risks.
- [`../README.md`](../README.md) — live-build link, controls, setup, and verification commands.
- [`CHATGPT_CHANGELOG.md`](CHATGPT_CHANGELOG.md) — chronological record of meaningful repository changes.

## Active beautification milestone

- [`beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`](beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md) — approved multi-phase beautification direction. Phases 0 and 1 are complete; Phase 2 environment-art production is active.
- [`beautification/BEAUTIFICATION_BASELINE_2026-07.md`](beautification/BEAUTIFICATION_BASELINE_2026-07.md) — pre-migration visual and renderer baseline.
- [`art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`](art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md) — current authoritative Batch A–F farm source-art generation order and acceptance gates.
- [`visual-targets/FARM_ENVIRONMENT_PALETTE_V1.md`](visual-targets/FARM_ENVIRONMENT_PALETTE_V1.md) and [`visual-targets/farm_environment_palette_v1.json`](visual-targets/farm_environment_palette_v1.json) — approved farm palette lock.

## Visual and asset production

- [`VISUAL_ASSET_CONTRACT.md`](VISUAL_ASSET_CONTRACT.md) — durable style, perspective, palette, naming, metadata, layering, terrain-blending, and grounding rules.
- [`art-pipeline/SPRITE_ASSET_PIPELINE.md`](art-pipeline/SPRITE_ASSET_PIPELINE.md) — manifest-driven source-to-runtime normalization and validation.
- [`art-pipeline/IMAGE_PROMPTING_GUIDE.md`](art-pipeline/IMAGE_PROMPTING_GUIDE.md) — source-art prompting, audit verdicts, background cleanup, and production lessons.
- `visual-targets/*.json` — authoritative machine-readable target specifications.
- `visual-targets/*.md` — human-readable explanations of those targets.

### Asset-status vocabulary

Use these terms precisely:

- **STYLE REFERENCE ONLY** — establishes direction but is not clean or exact enough for normalization.
- **APPROVED SOURCE CANDIDATE** — clean generated or authored source ready for a manifest and normalization.
- **NORMALIZED RUNTIME ASSET** — exact-dimension output produced and validated through the pipeline.
- **RUNTIME-INTEGRATED ASSET** — normalized asset loaded and verified in the game.
- **REGENERATE** — generation failed important production constraints.
- **CHANGE TARGET SIZE** — the artwork is viable but the declared runtime target is too small or otherwise unsuitable.

## Product, curriculum, and gameplay

- [`ATTENTION_FIRST_OPENING_PLAN_2026-07.md`](ATTENTION_FIRST_OPENING_PLAN_2026-07.md) — implemented historical brief for the first-minute fantasy hook.
- [`WILDBLOOM_DISCOVERY_LOOP_2026-07.md`](WILDBLOOM_DISCOVERY_LOOP_2026-07.md) — implemented historical brief for the optional Sprig discovery loop.
- Current quest, curriculum, save, mastery, and interaction behavior must be confirmed in code/tests and summarized in `CURRENT_STATE.md`.

## Playtesting and device validation

- [`REAL_CHILD_PLAYTEST_GUIDE.md`](REAL_CHILD_PLAYTEST_GUIDE.md) — supervised physical-iPad/child session procedure.
- [`playtests/CHILD_CLARITY_CHECKLIST.md`](playtests/CHILD_CLARITY_CHECKLIST.md) — short observation sheet.
- Automated Playwright screenshots and iPad-like viewport evidence are browser validation, not physical-device certification.
- The dedicated physical-iPad certification scope remains in Phase 7 of the beautification plan.

## Research and reference material

Research reports under `docs/research/` explain why decisions were made. They are not volatile status documents and should not be rewritten merely because implementation progresses. When later findings supersede an earlier recommendation, record the updated decision in a durable contract or current execution plan and preserve the research as historical evidence.

## Updating documentation

- Update `CURRENT_STATE.md` only for material capability, milestone, next-step, or risk changes.
- Update `CHATGPT_CHANGELOG.md` for meaningful repository changes.
- Update durable contracts only when a durable rule changes.
- Add a status banner to completed execution plans instead of deleting their historical detail.
- Avoid copying the same volatile roadmap list into multiple documents.
