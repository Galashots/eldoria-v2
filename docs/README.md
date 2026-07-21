# Eldoria-V2 Documentation Map

Use this page to find the current source of truth and the smallest reading set needed for the task. Do not infer project status from whichever planning file appears newest.

## Source-of-truth hierarchy

When documents disagree, use this order:

1. Runtime code, map data, tests, and committed asset manifests for what the game actually does.
2. Machine-readable target JSON under `docs/visual-targets/` for asset geometry, variants, pivots, palettes, and metadata.
3. [`ELDORIA_MASTER_PLAN.md`](ELDORIA_MASTER_PLAN.md) for stable product, world, engagement, progression, and visual-north-star direction.
4. [`CURRENT_STATE.md`](CURRENT_STATE.md) for volatile implementation status, the active milestone, known risks, and next steps.
5. Durable contracts and pipeline guides for rules and process.
6. Execution plans and research documents for approved implementation direction and historical rationale.

A planning document does not prove implementation. A browser-emulated iPad viewport does not prove physical-iPad behavior. Generated concept art does not become production source art until it receives an explicit audit verdict.

## Core entry points

`AGENTS.md` is always required. Load the other entry points only when the task needs their subject matter.

- [`../AGENTS.md`](../AGENTS.md) — binding product rules, workflow, evidence, merge authority, protected surfaces, and change control.
- [`ELDORIA_MASTER_PLAN.md`](ELDORIA_MASTER_PLAN.md) — stable product mission, hero promises, healthy-return model, world-building framework, visual north star, progression, and strategic sequence.
- [`CURRENT_STATE.md`](CURRENT_STATE.md) — current playable capabilities, active milestone, near-term work, and known risks.
- [`../README.md`](../README.md) — live-build link, controls, setup, and verification commands.

Read [`MULTI_MODEL_OPERATING_GUIDE.md`](MULTI_MODEL_OPERATING_GUIDE.md) only when work involves multiple providers, branch ownership, independent review, governance, protected paths, or delegated merging.

## Task-routed reading

Load only what the task requires after `AGENTS.md`.

| Task | Required authorities |
| --- | --- |
| Product priority, world, engagement, progression, or new-zone decision | `ELDORIA_MASTER_PLAN.md`, `CURRENT_STATE.md`, relevant code/tests |
| Routine scoped implementation | `CURRENT_STATE.md`, affected code/tests, the relevant subsystem contract |
| Cross-provider implementation or review | `MULTI_MODEL_OPERATING_GUIDE.md`, PR/issue coordination surface, exact diff |
| Generate environment source art | target JSON, palette JSON, `CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md`, relevant section of `IMAGE_PROMPTING_GUIDE.md` |
| Ingest an approved asset | target JSON, `SPRITE_ASSET_PIPELINE.md`, the approved audit record |
| Character, NPC, creature, armor, or weapon art | target JSON, `CHARACTER_PERSPECTIVE_LOCK_V1.md`, `SPRITE_ASSET_PIPELINE.md`, applicable armor/animation contract |
| Integrate visual assets into a map or scene | `VISUAL_ASSET_CONTRACT.md`, `VISUAL_EVIDENCE_RETENTION_POLICY.md`, current beautification subplan, affected map/scene/tests |
| Review a visual PR | exact base-to-head diff, applicable target/contract, required screenshots/contact sheets, exact runtime pixels |
| Save or migration work | `AGENTS.md` owner gates, save code/tests, explicit owner-approved migration scope |
| Curriculum or question work | curriculum engine docs, prompt templates, mastery code/tests, product invariants |
| Physical-iPad or child playtest | `REAL_CHILD_PLAYTEST_GUIDE.md`, clarity checklist, current build URL and known risks |

Do not load every art-pipeline guide for ordinary gameplay work or the full coordination guide for a single-owner routine branch.

## Active visual transformation

- [`beautification/README.md`](beautification/README.md) — current visual-program entry point and relationship to the master plan.
- [`beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`](beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md) — visual-production subplan and acceptance gates; not the overall product roadmap.
- [`beautification/BEAUTIFICATION_BASELINE_2026-07.md`](beautification/BEAUTIFICATION_BASELINE_2026-07.md) — historical pre-migration visual and renderer baseline.
- [`art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`](art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md) — authoritative Farm source-art order and specifications; current completion status remains in `CURRENT_STATE.md`.
- [`visual-targets/FARM_ENVIRONMENT_PALETTE_V1.md`](visual-targets/FARM_ENVIRONMENT_PALETTE_V1.md) and [`visual-targets/farm_environment_palette_v1.json`](visual-targets/farm_environment_palette_v1.json) — approved Farm palette lock.

## Visual and asset production

- [`VISUAL_ASSET_CONTRACT.md`](VISUAL_ASSET_CONTRACT.md) — durable style, perspective, palette, naming, metadata, layering, terrain-blending, and grounding rules.
- [`visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md) — binding elevated three-quarter projection and sprite-rebuild rules for characters, NPCs, creatures, equipment, and armor.
- [`ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md`](ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md) — hybrid armor runtime model, timing authority, battle clips, production order, and acceptance gates. Apply it only after the perspective-locked base family is approved.
- [`art-pipeline/CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md`](art-pipeline/CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md) — AI-led generation, self-audit, routine approval, runtime-master rescue, escalation, and repo handoff.
- [`art-pipeline/VISUAL_EVIDENCE_RETENTION_POLICY.md`](art-pipeline/VISUAL_EVIDENCE_RETENTION_POLICY.md) — required visual proof by change type and retention rules.
- [`art-pipeline/SPRITE_ASSET_PIPELINE.md`](art-pipeline/SPRITE_ASSET_PIPELINE.md) — manifest-driven source-to-runtime normalization and validation.
- [`art-pipeline/IMAGE_PROMPTING_GUIDE.md`](art-pipeline/IMAGE_PROMPTING_GUIDE.md) — source-art prompting, audit verdicts, cleanup, and production lessons.
- `visual-targets/*.json` — authoritative machine-readable target specifications.
- `visual-targets/*.md` — human-readable explanations of those targets.

### Asset-status vocabulary

Use these terms precisely:

- **STYLE REFERENCE ONLY** — establishes direction but is not clean or exact enough for normalization.
- **APPROVED SOURCE CANDIDATE** — clean generated or authored source ready for a manifest and normalization.
- **APPROVED RUNTIME MASTER** — exact runtime pixels pass review even though the original high-resolution generation is not suitable as the canonical source; use deterministic nearest-neighbour upscaling and a zero-drift round trip.
- **NORMALIZED RUNTIME ASSET** — exact-dimension output produced and validated through the pipeline.
- **RUNTIME-INTEGRATED ASSET** — normalized asset loaded and verified in the game.
- **HOLD** — promising but not approved; must name the next deterministic test or correction.
- **REGENERATE** — generation failed important production constraints.
- **CHANGE TARGET SIZE** — the artwork is viable but the declared runtime target is unsuitable.

## Product, curriculum, and gameplay

- [`ATTENTION_FIRST_OPENING_PLAN_2026-07.md`](ATTENTION_FIRST_OPENING_PLAN_2026-07.md) — implemented historical record for the first-minute fantasy hook.
- [`WILDBLOOM_DISCOVERY_LOOP_2026-07.md`](WILDBLOOM_DISCOVERY_LOOP_2026-07.md) — implemented historical record for the optional Sprig discovery loop.
- [`CURRICULUM_QUESTION_ENGINE.md`](CURRICULUM_QUESTION_ENGINE.md) — current curriculum-question architecture, bonus-only learning rules, and future opportunities.
- Current quest, curriculum, save, mastery, and interaction behavior must be confirmed in code/tests and summarized in `CURRENT_STATE.md`.

## Playtesting and device validation

- [`REAL_CHILD_PLAYTEST_GUIDE.md`](REAL_CHILD_PLAYTEST_GUIDE.md) — supervised physical-iPad/child session procedure.
- [`playtests/CHILD_CLARITY_CHECKLIST.md`](playtests/CHILD_CLARITY_CHECKLIST.md) — short observation sheet.
- Automated Playwright screenshots and iPad-like viewport evidence are browser validation, not physical-device certification.
- The dedicated physical-iPad certification scope remains part of the active visual subplan.

## Research and historical material

Research reports under `docs/research/` explain why decisions were made. They are not daily operating authorities and should not be loaded routinely. When later findings supersede a recommendation, record the updated rule in a durable contract or current plan and preserve the research as historical evidence.

Completed execution plans should identify themselves as historical. Do not re-run their embedded prompts without a new approved scope.

## Updating documentation

- Update `CURRENT_STATE.md` only for material capability, milestone, next-step, or risk changes.
- Update `CHATGPT_CHANGELOG.md` for meaningful repository changes and keep entries concise; archive older entries into `docs/changelog/` when the live file exceeds 25 entries or a major milestone lands, whichever comes first.
- Update `ELDORIA_MASTER_PLAN.md` only when stable product or strategic direction changes.
- Update durable contracts only when a durable rule changes.
- Keep current branches, exact heads, “next asset,” and temporary milestone snapshots out of durable contracts.
- Mark completed execution plans as implemented history or replace them with a current subplan.
- Avoid copying the same volatile roadmap list into multiple documents.
