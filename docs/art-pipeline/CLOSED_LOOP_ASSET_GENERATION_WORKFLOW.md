# Eldoria-V2 Closed-Loop Asset Generation Workflow

**Status:** Durable project operating protocol  
**Applies to:** ChatGPT-led image generation, visual auditing, corrective prompting, runtime-master rescue, and repo handoff  
**Default owner:** ChatGPT for generation and visual judgment; user for final art-direction approval; repo-capable agent for deterministic ingestion when needed

---

## 1. Purpose

This workflow reduces the user's role from repeated prompt-writing and correction-writing to a small number of creative-direction decisions.

The intended operating pattern is:

```text
user sets target and direction
→ ChatGPT generates candidate batch
→ ChatGPT audits exact runtime result
→ ChatGPT writes its own corrective prompt
→ ChatGPT regenerates as needed
→ ChatGPT presents only a passing approval package
→ user approves, requests one focused change, or rejects the direction
→ approved asset enters the deterministic repo pipeline
```

The user should not need to diagnose magenta contamination, palette drift, seam problems, runtime occupancy, modularity, pivot placement, or normalization failures. Those are pipeline responsibilities.

---

## 2. Important interface limitation

The current ChatGPT image-generation interface ends the assistant turn when an image batch is generated. It does not reliably permit an invisible multi-generation loop to continue in the background without another user turn.

Therefore, the default workflow is **minimal-touch closed loop**, not unattended background generation:

1. ChatGPT generates a batch.
2. The user sends a neutral continuation signal such as `continue`.
3. ChatGPT audits the batch without asking the user to diagnose it.
4. If nothing passes, ChatGPT generates the next corrected batch.
5. The user again sends `continue`.
6. This repeats until ChatGPT presents a passing approval package.

The user's continuation signal is permission to proceed, not a request to rewrite or improve the prompt. ChatGPT owns the correction logic.

Where the interface allows multiple candidates in one generation, generate **four candidates per batch** to reduce the number of continuation turns.

---

## 3. Standing authority

Unless the user overrides the workflow for a specific asset, ChatGPT is authorized to:

- generate multiple candidates;
- reject its own weak candidates;
- revise prompts based on measured failures;
- normalize or simulate the declared runtime dimensions;
- create nearest-neighbour inspection previews;
- create tiled repetition previews where applicable;
- measure palette distance, alpha, bounds, occupancy, edge contact, and seam indicators;
- perform narrow deterministic runtime-pixel corrections;
- recommend **APPROVED RUNTIME MASTER** when the runtime pixels pass but the high-resolution generation does not;
- stop and escalate when the target specification itself appears unsuitable.

ChatGPT is **not** authorized by this workflow alone to:

- change the target geometry, pivot, collision, required variants, palette families, or production order;
- integrate assets into runtime maps;
- change gameplay, curriculum, quests, saves, economy, or interactions;
- merge a visual PR without the required evidence and exact-head green CI;
- claim physical-iPad or child validation.

Those actions require the applicable repo rules and user authorization.

---

## 4. Roles

### User — creative director

The user:

- sets or approves the overall art direction;
- approves the first representative asset in a visual family;
- decides among materially different art directions;
- approves a passing final candidate;
- may request one focused aesthetic change;
- decides when to abandon or resize a target after escalation.

The user should receive a compact approval package, not raw failed iterations unless requested.

### ChatGPT — generation and visual QA owner

ChatGPT:

- reads the authoritative target and palette documents;
- constructs the production prompt;
- generates candidate batches;
- audits source and exact runtime pixels;
- identifies failure causes;
- writes corrective prompts;
- selects or corrects the strongest candidate;
- assigns the formal verdict;
- prepares the final approval package;
- writes the repo-ingestion brief or performs repo work when tools permit.

### Repo-capable engineering agent

Claude, Codex, ChatGPT with GitHub access, or another repo-capable agent:

- verifies file identity and hashes;
- creates canonical production sources;
- creates review-only manifests and evidence;
- proves block exactness and round-trip identity;
- runs repository checks;
- opens a focused draft PR;
- does not reinterpret the approved artwork.

---

## 5. Authoritative inputs

Before generating, resolve the following from repository sources of truth:

1. target ID and variant;
2. runtime canvas;
3. gameplay footprint;
4. pivot;
5. collision and interaction metadata, if declared;
6. render layer;
7. palette families and exact locked swatches;
8. perspective and lighting;
9. required family variants;
10. current batch order;
11. production source, manifest, and review paths;
12. whether the target is isolated, seamless, modular, animated, or packed.

Do not improvise missing geometry or metadata. Escalate material ambiguity before generation.

---

## 6. Verdict vocabulary

Every audited candidate receives exactly one of these formal verdicts:

### APPROVED SOURCE CANDIDATE

The high-resolution source itself is clean and suitable as canonical manifest input.

Use when:

- source composition is correct;
- background or alpha is clean enough for deterministic normalization;
- palette, perspective, lighting, silhouette, and occupancy pass;
- no forbidden source-level motif or artifact remains.

### APPROVED RUNTIME MASTER

The exact runtime pixels pass, but the high-resolution generated source is not suitable as the canonical source.

Use when:

- the runtime result is visually strong;
- remaining corrections are narrow and deterministic;
- the result can be frozen as exact pixel data;
- nearest-neighbour upscaling and zero-drift round-trip proof are appropriate.

### HOLD

The candidate is promising and may be salvageable, but it is not yet approved.

A HOLD must state the next deterministic test or correction. Do not leave HOLD as an indefinite status.

### REGENERATE

The candidate fails important production requirements and would require material redrawing or recomposition.

### CHANGE TARGET SIZE

The artwork is viable, but the declared runtime canvas cannot preserve required readability or identity.

This is a specification decision and must be escalated to the user.

### STYLE REFERENCE ONLY

The candidate is useful for visual direction but not suitable for normalization or runtime-master extraction.

---

## 7. Closed-loop algorithm

### Step 1 — Build the target card

Record:

```text
ID:
Variant:
Runtime canvas:
Footprint:
Pivot:
Collision:
Render layer:
Palette families:
Asset type:
Required visual read at 1×:
Forbidden structures:
Source format:
Current batch position:
```

### Step 2 — Choose the generation strategy

Use **source-first** when the high-resolution source must preserve important shapes, silhouettes, or family identity.

Examples:

- characters;
- creatures;
- buildings;
- large props;
- trees;
- animated sheets.

Use **runtime-first** when the runtime pixels are the true design object and high-resolution detail is likely to create noise.

Examples:

- 16×16 terrain;
- quiet base water;
- small modular props;
- tiny decals;
- compact VFX cells.

### Step 3 — Generate a candidate batch

Default:

- four candidates when supported;
- one asset variant only;
- no presentation board;
- no mixed-size sheet;
- exact background instructions;
- runtime-read statement near the top of the prompt;
- explicit anti-pattern list based on known failures.

### Step 4 — Audit source scale

Check:

- correct subject and variant;
- source occupancy and padding;
- exact or usable background treatment;
- no text, UI, border, checkerboard, watermark, or unrelated scenery;
- perspective;
- upper-left lighting;
- palette direction;
- modular construction;
- edge contact;
- obvious repeated motif;
- source suitability as canonical input.

### Step 5 — Audit exact runtime pixels

Create the declared normalized result using nearest-neighbour behavior.

Check:

- exact dimensions;
- alpha state;
- visible bounding box;
- opaque-pixel count;
- footprint and pivot;
- top, bottom, left, and right edge contacts;
- silhouette at 1×;
- major color clusters;
- palette-distance metrics;
- contamination;
- gameplay readability;
- family compatibility.

### Step 6 — Run type-specific checks

Apply the relevant audit below.

### Step 7 — Decide

- If source and runtime pass: **APPROVED SOURCE CANDIDATE**.
- If runtime passes but source fails: test **APPROVED RUNTIME MASTER**.
- If the correction is narrow and deterministic: correct, re-audit, and classify.
- If material redrawing is needed: **REGENERATE**.
- If target dimensions are the blocker: **CHANGE TARGET SIZE**.

### Step 8 — Correct automatically

ChatGPT writes the next prompt from the measured failure. The user is not asked to diagnose the candidate.

### Step 9 — Stop at the approval threshold

Do not show the user a final approval package until one candidate passes ChatGPT's own audit.

---

## 8. Type-specific audit gates

### A. Seamless terrain

Required evidence:

- exact runtime cell;
- enlarged nearest-neighbour preview;
- 3×3 repeat;
- large-field repeat, normally 12×8;
- horizontal and vertical wrap-step indicators;
- directional luminance check;
- palette-distance metrics;
- motif scan tailored to the material.

Reject:

- hard seams;
- stripes;
- lattices;
- checkerboards;
- crosses;
- rosettes;
- scales;
- ripple rows;
- periodic highlight spacing;
- decorative borders;
- baked objects;
- excessive visual noise.

Base terrain must remain quieter than actors, props, shore decoration, flora, and VFX.

### B. Trees and tall Y-sorted props

Required evidence:

- exact runtime canvas;
- enlarged transparent/checkerboard preview;
- visible bounding box;
- footprint overlay;
- pivot marker;
- edge-contact list;
- palette metrics;
- 1× silhouette review.

Reject:

- full-width canopy without breathing room;
- insufficient vertical use;
- frontal concept-art perspective;
- baked ground shadow;
- uncontrolled roots;
- foliage confetti;
- magenta fringe;
- fragile branches that vanish;
- canopy that collapses into a circle, slab, or mushroom.

### C. Modular fences, walls, and rails

Required evidence:

- exact runtime canvas;
- one-tile preview;
- repeated horizontal or vertical strip;
- connection-edge inspection;
- footprint and pivot overlay;
- open-background connectivity check;
- palette metrics.

Reject:

- complete self-contained panel when a repeatable cell is required;
- doubled posts at joins;
- decorative endcaps blocking repetition;
- enclosed key-colour regions that edge-flood cleanup cannot reach;
- rails that fail to meet connection boundaries;
- wrong orientation;
- mirrored lighting;
- ladder, gate, sign, or wall misread.

### D. Characters and creatures

Required evidence:

- exact cell sheet;
- row/column divisibility;
- baseline and pivot consistency;
- contact sheet;
- 1× and enlarged previews;
- direction/state identity;
- animation timing and loop review when frames exist;
- no cell bleed.

Reject:

- scale drift;
- pose drift;
- inconsistent identity;
- missing silhouette cues;
- misaligned feet;
- different light direction between frames;
- unrequested accessories;
- effects or shadows outside cells.

### E. Buildings and large props

Required evidence:

- exact normalized size;
- entrance and interaction readability;
- footprint and pivot;
- perspective compatibility;
- material hierarchy;
- runtime screenshot or map mock-up before integration approval.

Use **CHANGE TARGET SIZE** rather than forcing important detail into an undersized canvas.

### F. VFX

Required evidence:

- exact cell size;
- frame sequence;
- alpha cleanliness;
- core shape readability;
- no rectangular background;
- intensity hierarchy;
- reduced-motion compatibility when applicable.

---

## 9. Automatic correction playbook

When a candidate fails, use the smallest correction category that addresses the measured problem.

### Occupancy failure

Prompt with explicit source-bounding-box percentages and desired normalized dimensions.

Example:

```text
Visible subject occupies 70–75% of source width and 84–88% of source height.
After normalization it should occupy approximately 28×45 pixels inside 32×48.
```

### Background failure

Strengthen:

- exact `#FF00FF`;
- every background pixel identical;
- no gradient;
- no texture;
- no antialiasing;
- no edge blending.

If the runtime result is strong, prefer deterministic alpha cleanup over indefinite regeneration.

### Palette failure

First measure the actual runtime pixels.

- Minor isolated outliers: deterministic nearest-swatch remap may be eligible for runtime-master correction.
- Broad hue drift or wrong material story: regenerate.

### Perspective failure

Replace vague wording with visible-surface requirements.

Example:

```text
Show narrow upper planes and front planes from a slightly elevated 3/4 view.
Do not use straight frontal elevation, side view, true isometric, or true top-down.
```

### Over-detail failure

Specify:

- exact number of major masses;
- maximum number of accents;
- more empty area than texture;
- explicit anti-patterns.

### Modularity failure

Describe the repeating cell, not the complete object.

State which edges must connect and which elements belong to separate variants.

### Seam or repetition failure

Do not merely repeat “seamless.”

Specify:

- opposite edges statistically similar to interior;
- no directional gradient;
- no periodic spacing;
- no repeated highlight clusters;
- clean 3×3 and large-field appearance.

### Runtime-size failure

If the concept is sound but cannot survive the declared canvas, classify **CHANGE TARGET SIZE**. Do not hide the problem with filtered scaling.

---

## 10. Runtime-master rescue rules

A runtime-master correction is allowed only when all of the following are true:

1. The exact runtime result already has the correct identity and composition.
2. The correction does not require creative redrawing.
3. Corrections are narrow and auditable, such as:
   - removing isolated edge-contact pixels;
   - clearing background-fringe pixels;
   - remapping isolated palette outliers;
   - preserving or correcting exact alpha;
   - fixing one-pixel cleanup defects.
4. The corrected runtime cell is re-audited from scratch.
5. Every correction is recorded.
6. The canonical high-resolution source is created only by deterministic nearest-neighbour block replication.
7. The real normalization pipeline reproduces the runtime master with zero pixel differences.

Do not use runtime-master rescue to hide:

- wrong perspective;
- wrong silhouette;
- missing modular structure;
- major proportion failure;
- wrong object identity;
- severe internal-detail collapse.

Those require regeneration or target-size change.

---

## 11. Iteration limits and escalation

Default maximum before escalation:

- up to **three generated batches** for one target direction;
- up to **one deterministic runtime-master correction** after a promising runtime result;
- one target-size reassessment if all failures are caused by the declared canvas.

After three failed batches, stop and present:

- the best candidate;
- the common repeated failure;
- whether the prompt, target geometry, palette restriction, or model capability is the bottleneck;
- a recommended decision.

Do not burn unlimited generation attempts.

---

## 12. User approval package

Once a candidate passes, present only:

### Candidate

The strongest source or approved runtime master.

### Exact runtime preview

Always show exact 1× plus an enlarged nearest-neighbour inspection view.

### Context evidence

Use only what applies:

- terrain repeat;
- modular repetition strip;
- footprint/pivot overlay;
- transparency preview;
- family contact sheet;
- in-game mock-up.

### Verdict

Exactly one:

- **APPROVED SOURCE CANDIDATE**
- **APPROVED RUNTIME MASTER**

### Residual limitations

State any acceptable known limitation, such as visible single-tile periodicity pending later variants.

### Decision requested

The user chooses one:

```text
APPROVE
ONE MORE PASS: <single focused direction>
REJECT DIRECTION
CHANGE TARGET
```

Do not ask the user to troubleshoot technical pipeline issues.

---

## 13. Repo handoff after approval

After user approval:

1. Verify input format, dimensions, mode, and SHA-256.
2. Preserve the approved file byte-for-byte.
3. Create the canonical source.
4. Create a clearly review-only manifest.
5. Normalize through the real pipeline.
6. Prove exact round trip.
7. Run the target-specific audit.
8. Generate concise evidence.
9. Update `docs/CHATGPT_CHANGELOG.md`.
10. Update `docs/CURRENT_STATE.md` only if milestone status or next steps materially changed.
11. Run canonical checks.
12. Open a focused draft PR.
13. Do not integrate into runtime until the production family and integration milestone permit it.

For an incomplete family:

- do not create a fake complete packed sheet;
- do not duplicate placeholders into missing cells;
- do not mark the asset runtime-integrated;
- do not modify the map.

---

## 14. Session-recovery protocol

At the start of a new ChatGPT, Claude, or Codex session:

1. Confirm the repository is `Galashots/eldoria-v2`.
2. Read:
   - `AGENTS.md`;
   - `docs/README.md`;
   - `docs/CURRENT_STATE.md`;
   - the target JSON;
   - `FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`;
   - this workflow;
   - `IMAGE_PROMPTING_GUIDE.md`;
   - `SPRITE_ASSET_PIPELINE.md`.
3. List current open PRs.
4. Confirm current `main`.
5. Identify:
   - last approved asset;
   - current candidate;
   - next canonical asset;
   - whether generation, ingestion, or integration is the active step.
6. Do not infer status from chat history alone.

---

## 15. Current Eldoria application

At the time this protocol was created:

- grass `grass_a`, dirt `center`, and water `water_a` were approved individually;
- oak reached an externally approved corrected `32×48` runtime master but still required deterministic repo ingestion;
- the first horizontal-fence attempt was rejected for geometry and modularity;
- the next fence generation must use a one-post repeatable modular cell rather than a complete two-post panel;
- no Phase 2 farm assets had yet been integrated into the runtime map.

Repository status remains authoritative over this snapshot.

---

## 16. Default instruction for ChatGPT

When this file is attached to the Eldoria-V2 ChatGPT Project, interpret asset-generation requests as follows:

> Own the production loop. Read the repository target and palette. Generate a candidate batch, audit the exact runtime result, write the corrective prompt yourself, and continue through minimal-touch continuation turns until a candidate passes. Do not ask the user to diagnose technical failures. Present only a passing approval package unless a target-size or art-direction decision requires escalation.
