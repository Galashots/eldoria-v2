# Closed-Loop Asset Generation Workflow

**Status:** Durable AI-led generation, audit, approval, and handoff protocol  
**Current asset status:** [`../CURRENT_STATE.md`](../CURRENT_STATE.md)

This workflow lets ChatGPT own routine source-art iteration from an approved target through a documented visual verdict, while keeping deterministic repository ingestion and runtime integration as separate evidence stages.

## Authority boundary

- The owner approves material art direction, target geometry/size, palette changes, production-order changes, and major scope decisions.
- ChatGPT owns routine prompting, measured visual QA, corrective iteration, and per-asset approval after all applicable gates pass.
- Engineering agents own deterministic ingestion, normalization, validation, integration, and repository evidence for their assigned branch.
- A different provider independently reviews consequential PRs under `AGENTS.md`.
- No provider's generated output is privileged. Exact normalized runtime pixels and in-game evidence decide.

## Task-routed startup

Do not load every art document for every task.

Always resolve:

1. repository and exact branch/head;
2. target JSON and palette authority;
3. current status from `CURRENT_STATE.md` when status matters;
4. applicable visual contract.

Then load only what is needed:

- generation/prompting: this workflow plus the relevant part of `IMAGE_PROMPTING_GUIDE.md`;
- approved-source ingestion: `SPRITE_ASSET_PIPELINE.md` plus the audit record;
- character/creature/equipment work: `CHARACTER_PERSPECTIVE_LOCK_V1.md` and the target JSON;
- map/runtime integration: the visual contract, evidence policy, affected scene/map/tests, and active visual subplan.

Use `docs/README.md` as the router. Never infer current status from an old chat, embedded prompt, or historical snapshot.

## Production classes (derive-over-generate)

Evidence and ceremony scale with creative risk. Every visual target may declare `productionClass` in its target JSON (validator-enforced values; absent means unclassified legacy until the target's next production batch):

- **`anchor`** — genuinely new identity, silhouette, material, anatomy, construction logic, or readable gameplay identity. Full per-asset ceremony: generation through the closed loop, source + exact-runtime audit, formal verdict, contact sheet.
- **`derived`** — deterministic transformation or recombination of locked approved inputs (compositor recipes, palette-locked siblinging, cropping/recombination). Recipe-level approval, below.
- **`procedural`** — runtime presentation that requires no independent generated source-art family: code-drawn effects, runtime transforms of approved art, deterministic overlays, or shaders. Judged in-game on bright and dark backgrounds with reduced-motion and performance evidence.

Classification rules (owner-adjudicated, 2026-07-21):

1. Classify by actual creative novelty, not broad asset category. Any target introducing a new silhouette, material, anatomy, construction logic, or readable gameplay identity is an anchor even inside a usually-derived family. A family containing any anchor variant is gated as anchor; derived siblings within it are named in the target's notes.
2. Derived does not mean recolouring an unrelated input. A recipe may transform or recombine only suitable locked approved inputs and locked palette data; it may not invent missing subject geometry.
3. Every family output is visually inspected in the family contact sheet. The audit *narrative* may be family-level, but no output hides behind sampling; hard cases receive enlarged individual evidence.
4. Water decals (lilies, flowers) require their own approved anchor silhouettes; variants may be derived afterward, never from water pixels alone.
5. Tilled soil requires an approved authored furrow/groove mask or anchor before the family may be classified derived, even when approved dirt supplies material and palette.
6. Crop intermediate stages may be derived only when the recipe preserves a believable growth progression and passes the complete-family visual gate; each crop's sprout and harvest identities remain anchors.
7. Expected efficiency gains are measured after the first derived-family pilot, not promised in advance.

### Recipe-level approval gate (derived families)

A derived family is approved once, at the recipe level:

1. **Committed deterministic recipe** — seeded, tested red-first like any other deterministic tooling (precedent: `compose-terrain-blend-family.mjs`).
2. **Locked inputs** — approved masters by SHA-256 plus the locked palette; outputs recombine only what those inputs contain.
3. **Full machine validation for every output** — histogram/palette preservation, border/buffer integrity, seam/adjacency, occupancy, zero-drift round trip, deterministic regeneration.
4. **Representative hard-case audit** — ChatGPT audits the hardest outputs (inner corners, densest cells), not every cell individually.
5. **One contact sheet containing every family output + one family-level verdict** — the report is machine-generated from the family report data, not hand-written per cell.

ChatGPT retains visual veto over any derived output. Owner gates (art direction, palette, geometry, production order) are unchanged.

## Closed loop

### 1. Resolve the target

Confirm:

- target ID and variant;
- source and runtime dimensions;
- grid layout when applicable;
- footprint and pivot;
- palette family;
- perspective and light;
- required variants/states;
- production family and dependency order;
- forbidden content;
- expected evidence and stopping condition.

Escalate before generation only when a material target, direction, or scope decision is unresolved.

### 2. Write the production prompt

Use the target contract, not generic art language. State the runtime reading goal, source geometry, approved palette/perspective, background/padding rules, exact state/direction layout, and known failure modes.

### 3. Generate a bounded batch

Use the smallest batch that can answer the current question. Do not commission a complete family before the identity, projection, material, or geometry anchor has passed.

### 4. Audit the source

Inspect:

- subject and variant;
- dimensions, aspect ratio, and grid;
- padding and background;
- text/UI/border/checkerboard/watermark contamination;
- edge contact and cell bleed;
- identity, silhouette, perspective, lighting, palette, and material language;
- family consistency;
- source suitability as canonical input.

### 5. Produce and audit exact runtime pixels

Normalize or create the declared runtime result using nearest-neighbour behavior. Inspect:

- exact dimensions and alpha;
- visible bounding box and occupancy;
- footprint, pivot, and baseline;
- silhouette and major colour clusters at `1×`;
- palette distance and contamination;
- modularity, repeatability, adjacency, or frame continuity as applicable;
- gameplay readability in required backgrounds.

The high-resolution source cannot override a failing runtime result.

### 6. Run type-specific evidence

#### Seamless terrain

- exact cell and enlarged preview;
- 3×3 repeat;
- large-field repeat;
- horizontal/vertical wrap evidence;
- directional-gradient and motif checks;
- palette metrics.

Reject seams, stripes, lattices, checkerboards, crosses, rosettes, scales, ripple rows, periodic clusters, decorative borders, baked objects, and excessive noise.

#### Padded decals and scatter

- transparent/keyed preview;
- occupancy and outer-margin measurement;
- family contact sheet;
- repetition/grid-risk review;
- in-game density and spacing evidence before integration.

#### Tall props and structures

- exact canvas, footprint, pivot, and grounding;
- silhouette at `1×`;
- modular connection or entrance evidence where applicable;
- upper-left lighting and projection consistency;
- no baked shadow unless explicitly allowed.

#### Characters, NPCs, creatures, armor, and weapons

Apply `docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`.

Require four-direction/state contact sheets as applicable, exact runtime backgrounds, baseline/pivot overlays, apparent-height comparison, identity/equipment consistency, timing review, and no direct-frontal down facing or pure-profile side facing.

Do not begin substantial armor/customization production until the base family passes and its geometry/timing are frozen.

#### UI and VFX

Use real state matrices, long/short text, touch dimensions, readability, reduced-motion behavior, and performance evidence. Decorative polish must not obscure interaction state or actors.

### 7. Decide

Use one formal verdict:

- **APPROVED SOURCE CANDIDATE**;
- **APPROVED RUNTIME MASTER**;
- **STYLE REFERENCE ONLY**;
- **HOLD**;
- **REGENERATE**;
- **CHANGE TARGET SIZE**.

A passing verdict records the evidence and residual limitation. A failing verdict names the measured cause and next correction.

### 8. Correct autonomously

ChatGPT writes the next prompt or applies one permitted deterministic runtime correction. Do not ask the owner to diagnose seams, palette drift, key-colour contamination, occupancy, pivot fit, modularity, or similar pipeline defects.

### 9. Stop at the approval threshold

Advance a routine passing candidate without waiting for per-asset owner approval. Escalate only a material direction/geometry/size/palette/order decision, repeated model failure, privacy/licensing concern, or scope expansion.

### 10. Hand off to the repository

After approval:

1. preserve approved bytes and provenance;
2. verify format, dimensions, and SHA-256;
3. create or update the canonical source and manifest;
4. normalize through the real pipeline;
5. validate exact output and deterministic regeneration;
6. prove zero-drift round trip for runtime masters;
7. retain concise durable evidence;
8. update the changelog;
9. update `CURRENT_STATE.md` only for material status changes;
10. open a focused PR;
11. keep source approval separate from runtime integration and in-game verification.

For an incomplete family, do not create a fake packed sheet, duplicate placeholders, modify the map, or mark it runtime-integrated.

## Runtime-master rescue

A deterministic correction is allowed only when:

1. identity, silhouette, perspective, and composition already pass;
2. the remaining defect is narrow and auditable;
3. correction does not require creative redrawing;
4. corrected runtime pixels are fully re-audited;
5. every edit is recorded;
6. the canonical source is nearest-neighbour block replication;
7. the production pipeline reproduces the master with zero differences.

Permitted examples include clearing isolated fringe pixels, exact alpha cleanup, isolated palette remapping, or removal of stray edge pixels.

Wrong perspective, wrong identity, major proportion failure, missing modular construction, or severe detail collapse require regeneration or target-size change.

## Iteration limits

Default before escalation:

- up to three bounded generated batches for one target direction;
- up to one deterministic runtime-master correction;
- one explicit target-size reassessment when the canvas is the repeated blocker.

After repeated failure, report the best candidate, recurring defect, likely bottleneck, evidence, and recommended decision. Do not burn unlimited attempts.

## Approval record

A passing record contains:

- target and variant;
- approved source or exact runtime master;
- exact `1×` and enlarged preview;
- applicable repeat, modular, pivot, family, or in-game evidence;
- formal verdict;
- residual limitations;
- provenance and hashes when handed to the repo.

## Evidence boundaries

These stages are distinct:

1. source/runtime-art approval;
2. deterministic ingestion and normalization;
3. runtime integration;
4. in-game visual verification;
5. browser iPad-like verification;
6. physical-iPad verification;
7. child playtesting.

Passing one stage does not prove the next. Record physical-device and child evidence honestly.

## Current-status rule

This workflow contains no current asset queue. The authoritative completed assets, active candidate, next target, open PRs, and integration status are in `CURRENT_STATE.md`, committed manifests/audits, and GitHub—not in this durable protocol.
