# Eldoria-V2 — Project Handoff (2026-07-20)

> **For any AI agent joining this project.** Read this after `AGENTS.md` and `docs/CURRENT_STATE.md`, before doing any work. Written by Kimi (project architect/reviewer) at the repo owner's request. Everything below marked "verified" was checked against the live repo on 2026-07-20; verify again before relying on it.

---

## 1. The game in 60 seconds

**Realm of Eldoria** is a kid-focused 2D learning-adventure for the repo owner's children. Phaser 4 + Vite + TypeScript, Tiled maps, 960×640 design canvas (pixelArt, FIT), deployed to GitHub Pages from `main`, target device iPad. Two profiles: **Grade 2 Mage** (`grade2-mage`, audio-first, read-aloud everywhere) and **Grade 5 Ranger Explorer** (`grade5-adventurer`, reader mode).

**Product invariant (non-negotiable):** *Learning never gates adventure.* Wrong answers and skipped prompts never block movement, exploration, quest progress, baseline rewards, retries, or story. All rewards are fixed — no random loot, no variable-ratio anything. Child-safe always; no manipulative retention patterns.

## 2. Verified current state (main @ `f68fcfa`, 2026-07-20)

**Merged milestone arc** (through-line: *feel right → become a world → become alive → play anywhere*):

| Milestone | PR | Status |
|---|---|---|
| Kimi audit bundle (adaptive difficulty, PWA manifest, terrain proof, E2E hardening) | #102 | ✅ merged |
| Shoreline terrain family | #99 | ✅ merged |
| Canvas-renderer e2e split (`Phaser.CANVAS` for tests, `Phaser.AUTO` in prod) | #105 | ✅ merged |
| Village art top-3 families | #106 | ✅ merged |
| **M1** — game feel + purposeful interactions (movement/camera tuning, permanent Practice Slime defeat, post-purpose flavor + opt-in practice, pre-reader objective marker + edge arrow) | #104 | ✅ merged |
| **M2** — multi-map world foundation (map registry, exits/transitions, Wildbloom Woods, save-your-map, MAP_AUTHORING.md) | #107 | ✅ merged |

**Test state:** unit **116/116**, e2e **65/65**, `npm run check` green. CI = `.github/workflows/ci.yml`: check + validators + unit + full Playwright smoke (~7 min, ubuntu).

**Open PRs:**
- **#103** — offline PWA (deterministic service worker, PROD-gated, versioned caches) + iPad Playwright emulation. Draft. **Needs a review** (brief in §6). ⚠️ Its body claims head `ad3f323` but the real head is `86fe5d2b` — ChatGPT pushed more commits after writing the body; review the real head.
- **Dependabot: #67** (phaser patch, probably fine), **#68** (actions group, CI-only), **#69** (⚠️ TypeScript 5.9→**7.0.2** — major jump against strict TS config; **do not merge without a full local verification**; high breakage risk).

**Approved but unbuilt:** the **Mossheart Ruins (Zone #4)** design spec — `docs/design/2026-07-20-mossheart-ruins-design.md`. Owner-approved. Depends on M2 (✅ done) and **M3 (not started)**. Do NOT build it before M3 merges.

## 3. Roadmap

1. **M3 — living world (NEXT, critical path).** Build Prompt 03 (the repo owner has the full prompt file). Scope: data-driven **quest registry** (migrate Mira's errands to data), **dialogue UI** (reuse read-aloud), **cross-map objective compass** (fixes M2's documented gap: the objective banner shows farm text while in the woods), **Eldoria Village** map + **Baker Pell's cross-map "Berry Order" quest**. Uses M2 machinery (registry, exits, save-your-map). The Mossheart spec §2 names its M3 API dependencies — read it before shaping the quest-registry/dialogue/compass APIs so they serve Zone #4 without rework.
2. **M4 — play anywhere.** Merge #103 after an independent review (§6), then physical-iPad validation.
3. **Zone #4 — Mossheart Ruins.** Build prompts written from the committed spec after M3 lands (prompts must reference M3's real symbol names — never guessed ones).
4. **World-expansion sibling sub-projects** (each gets its own brainstorm → spec → prompts): **B** monsters + boss encounter (Old Mossback's "trial"), **C** battle animation set (unlocked by B, against the armor contract's deferred clips), **D** hero/NPC production sprites (Ranger, Mira, Elder Rowan — Phase 4 queue).
5. **Beautification Phase 2** (active art milestone): Batch B done; next = grass/water family packing, then Batch C vegetation, Batch D crops. Phase 3 farm recomposition waits for the complete kit + Wangset gates. All art goes through the deterministic closed-loop pipeline with formal verdicts — no exceptions.
6. **Engagement improvements (Stardew/Zelda review)** — `docs/design/2026-07-20-stardew-zelda-plan-review.md`: P1 Collections tab, P2 cosmetic gold sink (village), P3 Star Shards, P4 favor board, P5 guardian sightline (fold into Zone #4 prompts). P1 is the cheapest fill of the weakest loop (meta). Each enters game-design-brainstorm before building.
7. **Parking lot:** physical iPad certification; audio pass (final licensed audio — AI-generated SFX are now an option via the owner's tools, placeholder-tier acceptable); curriculum breadth beyond math (reading/science templates); merchant/equipment mechanics (beyond P2); seasons/festivals (deterministic palette-recolor later).

## 4. How this project works (multi-agent workflow)

- **The repo owner relays** prompts and results between AIs. Builders (Claude, ChatGPT, Codex) push branches + evidence; reviewers (Kimi, ChatGPT) independently verify before merge.
- **Communication doctrine — evidence-first:** report the **exact head SHA**, commands run, and observed output (with exit codes). "Should work" is a failure to verify. If you didn't run it, say you didn't.
- **Verify prerequisites — adapt to actual names — stop and report if missing.** Never improvise around a missing dependency; never rewrite existing interaction IDs destructively.
- **PR discipline:** open a **draft** PR early, push early and often (a lost branch already cost this project a full milestone once). No merge with red CI, unexplained failures, or unresolved review threads. Every meaningful change: `docs/CHATGPT_CHANGELOG.md` entry + a dated file in `docs/changelog/` + `docs/CURRENT_STATE.md` refreshed + docs placed per `docs/README.md`.
- **Merge commits, not squash** (repo convention). Merge-message summarises the milestone + verification evidence.
- **Save compatibility is a hard gate:** no schema bumps without explicit owner sign-off; new persisted fields need graceful defaults for old saves (open `questFlags` record precedent).
- **Learning-content decisions (curriculum/Alberta alignment) belong to the owner + ChatGPT.** Flavor/dialogue copy for children gets a wording review before ship.

## 5. Verification playbook (learned the hard way, 2026-07-19/20)

- **Independent review = fresh checkout of the exact head** (codeload tarball works unauthenticated), `npm ci --registry=https://registry.npmjs.org` (the default mirror 404s on phaser), then `npm run check`, `npm run test:unit`, targeted Playwright. `git init && git add -A && git commit` first — the deterministic-surfaces gate shells out to `git diff`.
- **Byte-verification:** after pushing file edits via API, compare the pushed blob SHA to local `git hash-object` — this caught/ruled out transcription errors twice.
- **E2E flake doctrine (three species fixed during M2 review — all the same family):** never assert on fixed wall-clock waits or one-shot transient samples. (1) Fixed `waitForTimeout` before sampling `body.blocked` flakes → poll state while the key is held. (2) `expect.poll` default 5s timeout is too short for tween-gated state on loaded runners → explicit 15–20s. (3) Fixed-duration key holds cover frame-rate-dependent distances → hold keys until a **position poll** confirms displacement; make assertions true by construction. Browser-side rAF recorders for transient events (existing repo pattern) — use them.
- **`tsc --noEmit` does NOT cover `tests/`** — a syntax error in a spec passes typecheck and only fails at Playwright load (as "No tests found"). Run the spec before pushing.
- **Reproducing CI-only flakes locally:** saturate CPU (`yes > /dev/null` loops on each core) and re-run — CI's runner is a contended 2-core; this reliably surfaces the same failures.
- **Git protocol from sandboxes is flaky; the GitHub REST API + MCP connector works** (reads and writes both confirmed 2026-07-19/20). CI logs/artifacts are login-walled — anonymous API cannot read them.
- **GitHub mobile app cannot resolve merge conflicts** (no conflict editor) — merges needing resolution happen on desktop web or via API.

## 6. Task queue (in order)

### NOW — M3 build
Execute Build Prompt 03 (owner has the file). If the file is unavailable, the minimum scope is §3.1 above — present a plan to the owner before building from the summary. Read the Mossheart spec §2 first for API shape.

### THEN — Review PR #103 (PWA + iPad harness)
Verify against the **real head `86fe5d2b`**, fresh checkout:
- Service worker: deterministic generation, registration **PROD-gated** (dev/e2e must NOT register), versioned cache names, precache manifest covers all runtime assets, no runtime network calls beyond same-origin assets, update flow (skipWaiting/clientsClaim policy) safe for a kids' single-page game.
- iPad Playwright project: viewport/DPR/throttle settings honest (not mislabeled as physical-iPad), performance/memory budgets asserted, evidence screenshots.
- `npm run check` + unit + targeted e2e on the merged tree (test-merge onto current main first; main moved since).
- Compare the body against the real head's diff (`ad3f323`..`86fe5d2b`) and flag anything the body doesn't mention.

### THEN — Zone #4 build prompts
From `docs/design/2026-07-20-mossheart-ruins-design.md`, after M3 merges. Conventions: phased prompts (art batch → map → content), exact M3 symbol names verified against merged code, P5 guardian sightline folded in, acceptance criteria from spec §10.

### THEN — Engagement P1 (Collections tab)
Enters game-design-brainstorm first (owner decision), per the Stardew/Zelda review.

### HYGIENE (anytime, low priority)
- Dependabot: #67 merge after CI; #68 review-then-merge; **#69 do NOT merge** (TS 7 major) — close or split vite/vitest only after local verification.
- Watch for recurrence of the Wildbloom canvas-text timeout (tracked repo-health flake).

## 7. Key file map

- `AGENTS.md` — durable rules (non-negotiable)
- `docs/CURRENT_STATE.md` — volatile status (keep fresh)
- `docs/README.md` — documentation map/placement discipline
- `docs/design/2026-07-20-mossheart-ruins-design.md` — approved Zone #4 spec
- `docs/design/2026-07-20-stardew-zelda-plan-review.md` — engagement audit (P1–P7)
- `docs/MAP_AUTHORING.md` — map authoring contract (incl. the 72px-body caveat)
- `docs/ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md` — animation/armor architecture
- `docs/CURRICULUM_QUESTION_ENGINE.md` — adaptive difficulty authority
- `docs/beautification/` — art production program
- `docs/changelog/` — dated milestone entries
- `src/data/maps.ts` — map registry (M2)
- `src/movementTuning.ts` — movement constants (M1)

## 8. Definition of done (for any task)

1. `npm run check` exit 0; `npm run test:unit` green; targeted + full `npx playwright test` green (all on the exact head you report).
2. Product invariant intact; save compat proven (old saves load, new fields default).
3. Changelog + CURRENT_STATE + docs updated; docs placed per the map.
4. Draft PR with evidence in the body (exact head SHA, commands, outputs, screenshots for UI).
5. Reviewer-independent verification passes before merge. No self-merged "should work."
