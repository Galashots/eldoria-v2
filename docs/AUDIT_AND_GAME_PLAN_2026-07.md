# Eldoria-V2 Audit & Game Plan — July 2026

Consolidated from three parallel audits (code/architecture, build/CI health, game design/content) run on 2026-07-02. This document is the roadmap; `docs/CURRENT_STATE.md` remains the volatile status file.

## Verdict in one paragraph

The engineering foundation is genuinely good — clean build (0 vulnerabilities, ~370 KB gzipped JS, fine for iPad-over-Pages), disciplined docs, a working save/quest/mastery layer that is mostly renderer-independent, and a well-tested asset pipeline. But the *game* is still a tech proof: ~5–8 minutes of unique content (2 quests, 1 map, 1 NPC), gold with nothing to spend it on, mastery telemetry that is collected but never used, a Grade 5 profile that is a reskinned Grade 2, and four architectural walls (no save migration, hardcoded interaction dispatch, no multi-map support, non-parameterized non-math templates) that will make every future feature more expensive the longer they stand.

## A. Audit findings

### A1. Health check (all pipelines run live)

- `npm install`: clean, 0 vulnerabilities. `npm run check` (visual targets + typecheck + build): passes in ~5s. `test:asset-pipeline`: passes.
- Playwright: 7/13 passed locally; the 6 failures are a sandbox browser-revision mismatch (Playwright 1.61 wants Chromium rev 1228, sandbox has 1194), **not app regressions** — CI installs matching browsers.
- Bundle: 1.6 MB dist total, 1.4 MB JS (370 KB gzip, mostly Phaser). Fine now; consider per-scene dynamic import only when the game grows.
- CI gaps: `test:asset-pipeline` is never run in CI; no lint/format gate (only `tsc`); no Dependabot/audit job; Playwright browsers reinstalled every run (no cache); no post-deploy health check; no bundle-size budget.
- Deps current: Phaser 4.2.0, Vite 8.1 (8.1.3 available), TS 5.9 (6.0 exists, not urgent), Playwright 1.61.1.

### A2. Architecture (top issues, full detail in audit notes)

1. **No save migration.** `SaveSystem` validates `version === 1` exactly; any schema change silently wipes existing saves to `null` — i.e., the kids lose all progress on the next `SaveState` change. Biggest single risk in the repo. (`src/systems/SaveSystem.ts`)
2. **`WorldScene` (833 lines) is becoming a god object.** Quest/NPC interaction dispatch is hardcoded `if (target.label === MIRA_FIRST_ERRAND.targets.x)` branches keyed on *display-label strings*; every new NPC/quest requires scene surgery. Reward gold amounts and tile-collision GIDs are inline magic numbers. (`src/scenes/WorldScene.ts:185-221, 469-513, 741-756, 90`)
3. **Multi-map is documented but unimplemented.** `CONTENT_SCHEMA.md` describes an `ExitTown`/`exit` zone-transition convention; zero code handles it, and `WorldScene` hardcodes the `farm` map key. A second zone is currently impossible without new architecture.
4. **`FarmQuestSystem` hardcodes exactly two quests** with bespoke booleans and hand-written transitions; quest #3 means copy-paste. `questFlags` is generically extensible (good), but `firstQuestStep` is a one-off top-level enum.
5. **Curriculum layer soft-couples to Phaser** just for RNG helpers; non-math templates would be blocked from running in external tooling.
6. Smaller items: facing-direction logic duplicated in two files; dead `dialogue.complete` string and write-only `miraFirstErrandComplete` flag; biased `sort(() => Math.random() - 0.5)` shuffle; dev/test-only scene methods ship in the production bundle; `curriculum.ts` is an empty facade.
7. **Test gaps:** `QuestionEngine` selection/fallback logic, `MasterySystem` streak logic, `LearningBonusSystem`, and 11 of 15 question templates have no direct tests; there is no fast unit-test layer (everything rides the Playwright runner). The "every template has exactly one correct answer among unique choices" invariant — flagged as open in the project's own docs — is untested.

### A3. Game design / content

- **Content inventory:** 2 quests, 1 map (30×20 tiles), 1 NPC, 1 non-combat creature, 15 question templates (7 Grade 2, 8 Grade 5) covering ~12 of 37 declared skill tags (~32%); zero Grade 2 social-studies templates. Math templates are parameterized (infinite variants); **ELA/science/social templates are single hardcoded sentences** — replay shows the literal same question.
- **Engagement gaps:** 14 total obtainable gold with no sink (no shop); 2 collectibles is not a collection; no visible progression (level/XP/mastery surface); no customization despite equipment specs existing on paper; all 4 reward kinds render identically.
- **Mastery is write-only:** per-skill telemetry is recorded and saved but never read back — no adaptive difficulty (difficulty is hardcoded to 1) and no parent-facing progress view. Both are already listed as known future items in `docs/CURRICULUM_QUESTION_ENGINE.md`.
- **Grade 5 has no identity:** same content with harder numbers and a placeholder sprite; Ranger art is blocked on the required visual-identity approval gate.
- **Art pipeline is the slowest lever:** ~5 runtime sheets shipped total at one-clip-per-PR cadence; farm/village tiles, equipment, and UI art are all spec-only, and tile art is a prerequisite for any second zone.

## B. Game plan

Ordered phases. Each phase is sized and scoped so a small batch (2–3) of implementation agents can execute it under supervision, with a user checkpoint between phases. Phase 0 is the project's own documented gate and requires no code.

### Phase 0 — Child-clarity playtest (user-run, no code)
Run the documented Grade 2 and Grade 5 sessions (`docs/playtests/CHILD_CLARITY_CHECKLIST.md`). Fix only demonstrated blockers. This is the repo's own stated next checkpoint and should stay first — it tells us whether the current slice communicates before we build on top of it.

### Phase 1 — Foundation hardening (S/M, no design decisions, safe to run any time)
Protects the kids' saves and removes the walls that tax every later phase.
1. **Save migration layer** in `SaveSystem` (`migrateSaveState(raw, fromVersion)` before validation) + tests. Do this before *any* feature that touches `SaveState`.
2. **Extract a data-driven interaction registry** from `WorldScene` (target id → handler), replacing display-label string dispatch; move reward-gold table and collision GIDs into named data; dedupe the facing helper; delete dead flags.
3. **Add a Vitest unit layer** for `QuestionEngine`, `MasterySystem`, `LearningBonusSystem`, plus an all-templates invariant test (exactly one correct answer, unique choices — closes the project's own open item). Decouple the curriculum layer from Phaser RNG while touching it.
4. **CI tune-up:** run `test:asset-pipeline` in CI, cache Playwright browsers, add Dependabot config, optional post-deploy curl check.

### Phase 2 — Content depth (M, pure data, no art dependency)
Parameterize the non-math template pattern and expand to 3+ templates per declared skill; fill the Grade 2 social-studies gap (currently zero). Cheapest way to make replays feel fresh. Curriculum wording choices should get a user/ChatGPT review per the project's checkpoint discipline.

### Phase 3 — Player-visible progression (M)
Wire mastery data into `QuestionEngine` difficulty selection (adaptive difficulty) and add a minimal parent-facing progress view. The telemetry cost is already sunk; this is mostly wiring. Requires the Phase 1 save-migration layer if `SaveState` grows.

### Phase 4 — World growth: village + shop (L, art-gated)
Implement the documented `exit`/zone-transition convention, parameterize `WorldScene` by map key, and build a small village square with a shop (the gold sink) and a second quest-giving NPC. **Prerequisite:** farm/village tile art (specs exist; production art does not) — schedule tile generation just ahead of this phase.

### Parallel art track (approval-gated, runs alongside any phase)
1. Grade 5 Ranger visual-identity approval → seed frame → idle/walk integration (the single most-referenced pending item; unlocks Grade 5 feeling like its own game).
2. Farm/village tile set production (unblocks Phase 4).
3. Later: starter equipment overlays, UI art targets.

### Relationship to Eldoria-Godot
This repo's strengths are iteration speed and zero-friction iPad delivery via Pages. Recommendation: treat Eldoria-V2 as the **fast-playtest/content-design bed** (curriculum templates, quest scripts, engagement-loop experiments are all portable data/design) and let Godot be the long-term engine bet. Phases 1–3 produce learnings and content that transfer; Phase 4 is the first phase that builds significant Phaser-specific machinery, so decide before Phase 4 how much world-building belongs here vs. in Godot.

## C. Suggested execution model

- Planning/synthesis stays with the managing model; implementation batches use 2–3 Sonnet agents per phase, each with a narrow brief and the existing `npm run check` + smoke gates.
- User checkpoint between every phase; product/curriculum/architecture decisions stay with the user (and the ChatGPT review loop the repo already documents).
- Respect the existing merge policy in `AGENTS.md` / `docs/CURRENT_STATE.md`.
