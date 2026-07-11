# Beautification Milestone Status

This directory contains the approved visual-improvement program for Eldoria-V2.

## Current phase status

| Phase | Status | Record |
| --- | --- | --- |
| Phase 0 — Baseline audit and screenshot lock | Complete | PR #65; `BEAUTIFICATION_BASELINE_2026-07.md` |
| Phase 1 — Canvas migration to 960×640 | Complete | PR #66 |
| Phase 2A — Environment targets, palette, and generation handoff | Complete in the current specification branch | PR #70; `../art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md` |
| Phase 2B — Production source-art generation and farm kit | Active next work | Batch A–F handoff |
| Phase 3 — Farm map recomposition | Not started | Must wait for the complete approved kit |
| Phase 4 — Production characters and NPCs | Not started | Mira and Ranger remain priorities |
| Phase 5 — UI skin and typography | Not started |  |
| Phase 6 — Lighting, atmosphere, and juice | Not started |  |
| Phase 7 — Physical iPad certification | Not started | Requires actual iPad Safari testing |

## How to use the execution plan

`ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md` remains the approved full sequence and acceptance criteria.

Its Phase 0/1 instructions and final “First Claude Code Command” are historical because those phases have already shipped. Do not run them again. Start from the active phase identified in `docs/CURRENT_STATE.md` and use the current handoff document for the next narrow task.

## Current gate

The next production gate is **Batch A foundational environment source candidates**:

- seamless grass centre;
- seamless dirt centre;
- seamless water centre;
- oak tree;
- horizontal fence segment;
- medium landmark rock;
- revealed Root-Star landmark.

Every result must receive an explicit source-audit verdict and a 1x/3x preview before later batches begin. The map must not be recomposed until the complete environment kit passes its contact-sheet acceptance gate.

## Device validation

Automated iPad-like viewport screenshots remain required for visual PRs, but they do not replace physical-iPad Safari testing. A quick physical smoke test is recommended after Phase 3 farm recomposition; formal certification remains Phase 7.
