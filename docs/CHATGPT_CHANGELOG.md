# ChatGPT Change Log

This file records repository changes made through ChatGPT so future work can see what changed, who made it, and when.

## 2026-07-06 - Claude Code (design critique + visual polish)

- Branch: `claude/design-polish` (stacked on `claude/audio-and-content-fixes`, PR #54)
- Files changed:
  - `src/presentation/uiHelpers.ts` (new)
  - `src/scenes/TitleScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
  - `docs/CURRENT_STATE.md`
- Summary: Ran a live-screenshot design critique of the title screen, HUD, world (no menus), and both the Stats & Mastery and bonus-prompt panels across both Grade 2 and Grade 5 profiles, grounded in `docs/VISUAL_ASSET_CONTRACT.md`. Fixed every code-only finding, then iterated (fix → full test pass → re-screenshot → re-critique) until a second round turned up no new major issues.
- Implementation notes:
  - Extracted shared `drawRoundedButton`/`drawRoundedPanelBackground` Graphics helpers into `src/presentation/uiHelpers.ts` so every scene's buttons/panels read as one consistent rounded-rect UI language instead of ad hoc flat rectangles.
  - Root-caused the bonus-prompt panel's "ghosting" (the `CropBonus` world label visibly bleeding through the panel background): the panel background had a `0.96` alpha. `drawRoundedPanelBackground` renders fully opaque, which fixed it.
  - The Stats panel's keepsake row used to share one `(Empty Slot)` caption under both slots regardless of which was actually empty; each slot now gets its own caption. Its first pass wrapped long charm names (`Sunberry Charm`, `Wildbloom Sprig`) with a `wordWrap` width narrower than the words themselves, and Phaser doesn't force a break on an over-width single word unless `useAdvancedWrap` is set — the two captions' first lines ran together and read as one merged word. Fixed with `useAdvancedWrap: true` plus a wider slot gap so common charm names wrap on a natural word boundary instead of mid-word.
  - Gave the Stats panel a slate-blue (`0x5a7a94`) divider instead of the shared brown/gold chrome, so it reads as a distinct "character sheet" screen rather than a re-skinned bonus prompt.
  - Replaced the 🔊/🔇/🪙 emoji HUD icons with hand-drawn vector shapes (`paintSpeakerIcon`, `drawCoinIcon`) for a consistent look across platforms/fonts.
  - Title screen: added a warm vertical-gradient background plus a soft glow, and moved the "Tap a hero to start" line up to use vertical space freed by the new visual treatment. Verified real mastery/keepsake data (`4/5` Math, `1/2` ELA, both keepsake slots filled) renders correctly in the mastery bars and keepsake row, which no prior save had exercised.
  - Deliberately left the ACTION touch-control dimmed (not hidden) on non-touch devices and preserved existing profile-card Y-positions and the Stats-panel CLOSE button's exact size, to avoid breaking several Playwright tests that click/measure those elements by coordinate or bounding box — renamed the CLOSE button lookup in `tests/vertical-slice.spec.ts` to match on `setName('stats-close-button')` instead of width/height once it became a `Graphics` object.
  - Left tile/sprite art, the Grade 5 Ranger visual identity, and hero portraits on title cards untouched — those are art/story-gated per `AGENTS.md` and reserved for a user/ChatGPT checkpoint, not this pass.
  - Verified with `npm run check`, `npm run test:unit` (48 passing), `npm run test:asset-pipeline`, and the full Playwright smoke suite (29 passing) after every round, plus a second round of screenshots across both profiles to confirm no regressions and no new major findings.
- Reason: Follow through on the user's design-critique findings with actual fixes, then keep iterating fix/verify/re-critique cycles (as instructed) until convergence rather than a single unverified pass.

## 2026-07-06 - Claude Code (audio pipeline + curriculum tightening)

- Branch: `claude/audio-and-content-fixes`
- Files changed:
  - `src/data/questionTemplates.ts`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `src/systems/AudioPreference.ts` (new)
  - `public/assets/audio/` (new, placeholder WAVs)
  - `tests/system-foundations.spec.ts`
  - `ATTRIBUTION.md`
  - `docs/CURRENT_STATE.md`
- Summary: Acted on a research pass (curriculum alignment, audio sourcing, Stardew-style visual direction). Tightened one curriculum-adjacent question template, checked and documented the right Phaser lighting approach for later, and built a complete audio pipeline (music, SFX, mute toggle, read-aloud ducking) — using synthesized placeholder assets since this environment's network policy blocks the actual licensed-asset sources.
- Implementation notes:
  - `grade5-farm-fractions-sunberry-rows` now asks for a fraction-to-decimal conversion with denominator 10 or 100 (e.g. "7 of 10 rows... what decimal is that?") instead of generic "simplify to 1/4" — matches Alberta's actual Grade 5 outcome wording (fraction-decimal conversion, denominators of 10/100) more tightly. Distractors model real misconceptions (misplaced decimal point, extra zero).
  - Checked Phaser 4.2.0's installed source directly: it ships a purpose-built `PointLight` game object (`this.add.pointlight(...)`) that's cheaper and simpler than the Phaser-3-era normal-map/Light2D tutorial the research surfaced. Documented in `docs/CURRENT_STATE.md` for whenever the atmosphere/lighting work (currently only in the still-open PR #51) lands — no lighting code shipped in this change, it's a decision record only.
  - Attempted to download the actual recommended CC0 audio packs (Tallbeard/HydroGene on itch.io, Freesound SFX); this sandbox's network policy hard-blocks itch.io, freesound.org, opengameart.org, incompetech.com, and kenney.nl (confirmed via proxy status, not a transient failure). Generated placeholder WAVs locally instead (`public/assets/audio/`, pure sine/triangle/noise synthesis, no samples) so the integration code is real and testable. `ATTRIBUTION.md` documents exactly which real packs to swap in and why.
  - Added `src/systems/AudioPreference.ts` (mute preference persisted to `localStorage`, independent of per-profile saves, defaults to unmuted) plus a background music loop, 5 SFX triggers (footstep, interact, reward, quest-complete, UI tap on the Stats panel), and a default-on mute button in the HUD.
  - Read-aloud now ducks music volume for the duration of the utterance and restores it after, so "read-aloud always wins" holds for audio too.
  - Found and fixed a real bug during testing: Phaser's WebAudio `mute` getter reads a `GainNode`'s value, and the setter schedules the change via `AudioParam.setValueAtTime` — reading `this.sound.mute` back immediately after setting it (same tick) can return the stale pre-toggle value. Fixed by computing the intended mute state once into a local variable and reusing it, instead of re-reading the getter.
  - Added a Playwright test block for `AudioPreference` (default/round-trip/malformed-value/storage-failure cases) following the existing `MemoryStorage`-mock pattern already used for `SaveSystem`.
- Reason: Follow through on the research brief delivered earlier — verify/tighten curriculum content, make an informed lighting-technique decision instead of blindly following an outdated tutorial, and get real (if temporary) audio into the game rather than leaving it silent.

## 2026-07-05 - Claude Code (quest #3)

- Branch: `claude/repo-audit-roadmap-65q59n`
- Files changed:
  - `public/maps/farm.json`
  - `src/data/interactions.ts`
  - `src/data/quests.ts`
  - `src/scenes/WorldScene.ts`
  - `src/systems/FarmQuestSystem.ts`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `tests/system-foundations.spec.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added a third optional errand, "The Sleepy Sprouts," continuing the "old magic waking" story thread the second errand planted, and generalized the Stats panel's single hardcoded keepsake slot into a small charm-registry-driven row so newly earned charms are visible.
- Implementation notes:
  - Extended `FarmQuestSystem`'s existing hand-rolled per-quest pattern (the same approach already used for the first two errands) with a third errand: three new boolean save flags track which of 3 "Sleepy Sprout" map markers have been awakened; returning to Mira once all 3 are done grants gold and a new Wildbloom Sprig charm. **Not** a data-driven `QuestDefinition` refactor — `docs/AUDIT_AND_GAME_PLAN_2026-07.md` explicitly predicted "quest #3 means copy-paste" under the current architecture, and this diff confirms that debt rather than paying it down; a self-review pass judged the added refactor cost bounded/linear rather than a new category of entanglement, but a fourth quest is the natural point to reconsider the generic-schema refactor already proposed elsewhere.
  - Added 3 new Tiled objects to `public/maps/farm.json` (bumped `nextobjectid` accordingly), reusing the existing generic "bonus"-type marker rendering and the crop-bonus pulse-feedback animation — no new art.
  - Added a defensive fix during self-review: the "all sprouts awake" completion check now requires `thirdErrandAccepted` first, so a malformed/tampered save can't skip Mira's start dialogue and silently auto-complete.
  - Generalized the Stats panel's keepsake section (`src/scenes/WorldScene.ts`) to render one slot per entry in a new `CHARM_REGISTRY` (`src/data/quests.ts`) instead of a single hardcoded Sunberry Charm check; the compact top-HUD "Keepsake:" line is unchanged (still Sunberry-only) to avoid touching its tested exact-text assertions.
  - Extended the existing vertical-slice E2E test to walk all three sprouts to completion (with a `test.setTimeout(60000)` bump, matching the precedent already set by the Stats & Mastery test, since the test now covers three errands instead of two) and added two new `FarmQuestSystem` unit-style tests (full third-errand walkthrough, and the malformed-save defensive case).
  - **New curriculum/story content**: the quest dialogue and Wildbloom Sprig naming have not yet had a user/ChatGPT story/curriculum review pass, per `AGENTS.md`'s reserved-decisions list. Flagging explicitly rather than treating as routine.
  - Ran `npm run check`, `npm run test:unit` (48/48), `npm run test:asset-pipeline`, and the full Playwright smoke suite (25/25, including 2 new tests) — all green. Also manually verified in a live dev-server browser session: marker rendering, prompt opening, objective counter, reward toast, and the new keepsake shelf.
- Reason: Continue the roadmap in `docs/AUDIT_AND_GAME_PLAN_2026-07.md` with genuine new playable content now that Phase 1 (foundation hardening) is done and a technical walkthrough found the existing slice has no blockers to build on top of.

## 2026-07-05 - Claude Code

- Branch: `claude/repo-audit-roadmap-65q59n`
- Files changed:
  - `src/data/questionTemplates.ts`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `docs/playtests/AI_ASSISTED_WALKTHROUGH_2026-07-05.md` (new)
- Summary: Ran an AI-assisted technical walkthrough of both profiles' vertical slice, then executed the audit's Phase 2 content-depth item: parameterized the six non-math question templates that previously showed the literal same sentence on every replay, and added the first Grade 2 social-studies template (previously zero).
- Implementation notes:
  - Added a `pickVariantPrompt` helper (`src/data/questionTemplates.ts`) that picks uniformly among 2-3 hand-authored text/answer/distractor variants per template, reusing the existing `pickRandom`/`shuffledChoices` helpers rather than inventing new randomization.
  - Converted `grade2-quest-ela-story-detail`, `grade2-crafting-science-materials`, `grade5-combat-science-energy-transfer`, `grade5-combat-science-forces`, `grade5-quest-social-rivers`, and `grade5-quest-ela-evidence` from single hardcoded sentences to 3 variants each.
  - Added `grade2-quest-social-trade-transportation` (3 variants) to close the previously-empty Grade 2 social-studies gap noted in `docs/AUDIT_AND_GAME_PLAN_2026-07.md`.
  - Kept every template's per-context `id`, `rewardKind`, and structural tags (`band`/`subject`/`skill`) unchanged and variant-independent so existing tests and save/mastery keying are unaffected.
  - **New curriculum wording/facts were authored in this change** (not just numeric parameterization) — per `AGENTS.md`'s reserved-decisions list, this content has not had a user/ChatGPT curriculum review pass yet and should get one before/at merge, same as the original Phase 2 note in `docs/AUDIT_AND_GAME_PLAN_2026-07.md` already flagged.
  - Added `docs/playtests/AI_ASSISTED_WALKTHROUGH_2026-07-05.md`, a genuine-keyboard-input Playwright walkthrough of both profiles' full errand loop (movement, both bonuses, skip-never-blocks, save/reload, Stats & Mastery panel), explicitly distinguished from the still-required real-child Phase 0 checkpoint. Found zero technical blockers; noted three polish items (Practice Slime interact radius, slime hop-animation delay before the prompt opens, and the Stats panel showing 0/0 after a skip-only session).
  - Ran `npm run check`, `npm run test:unit` (48/48), `npm run test:asset-pipeline`, and the full Playwright smoke suite (23/23, via the sandbox's pre-installed Chromium since the pinned Playwright version wants a newer browser revision than the sandbox ships — CI installs the matching one) — all green.
- Reason: Continue the roadmap in `docs/AUDIT_AND_GAME_PLAN_2026-07.md` past the already-completed Phase 1 (foundation hardening) into Phase 2 (content depth), after confirming via a technical walkthrough that the existing vertical slice has no blockers to build on top of.

## 2026-07-04 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/child-playtest-readiness`
- Files changed:
  - `README.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `docs/REAL_CHILD_PLAYTEST_GUIDE.md`
- Summary: Prepared the verified farm slice for supervised real-child and iPad playtesting without changing gameplay.
- Implementation notes:
  - Added separate 10-15 minute Grade 2 Mage and Grade 5 Adventurer session scripts using the live GitHub Pages build.
  - Documented iPad landscape setup, touch and keyboard controls, local-save reset options, parent observation rules, privacy-safe notes, and blocker-versus-polish triage.
  - Updated the README with current Stats & Mastery controls, the playtest guide, and the standard verification commands.
  - Refreshed current-state documentation to point the active child-clarity checkpoint at the new guide and account for the Stats & Mastery browser test.
  - Left gameplay, saves, quests, curriculum, rewards, maps, and assets unchanged.
- Reason: Give the parent a repeatable, low-friction procedure for gathering useful evidence from the first real-child sessions before further feature or production-art work.

## 2026-06-30 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/ipad-pages-link`
- Files changed:
  - `.github/workflows/ci.yml`
  - `README.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
- Summary: Added a stable GitHub Pages link for browser play on the boys' iPads.
- Implementation notes:
  - Extended the existing CI workflow to package `dist` only after validation, build, and all Playwright smoke tests pass on a push to `main`.
  - Added a least-privilege Pages deployment job using the `github-pages` environment and GitHub's artifact-based deployment actions.
  - Documented the public HTTPS game URL, landscape requirement, and optional Safari Add to Home Screen flow.
  - Left Vite's existing relative base and Phaser's relative public asset paths unchanged because they already support the repository-scoped Pages URL.
- Reason: Give both iPads one durable link that updates automatically from verified `main` builds without requiring a local development server.

## 2026-06-30 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/save-foundation-hardening`
- Files changed:
  - `AGENTS.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `playwright.config.ts`
  - `src/systems/SaveSystem.ts`
  - `tests/system-foundations.spec.ts`
- Summary: Hardened version-1 save loading and added focused regression coverage for the extracted save and farm-quest foundations.
- Implementation notes:
  - Added runtime validation for required save fields, profile identity, finite numeric values, quest steps, optional records, and mastery entries before a parsed save can reach the world scene.
  - Kept malformed JSON and storage read/write failures non-blocking by falling back to a fresh game without throwing.
  - Added Playwright-runner tests for valid save round-trips, malformed saves with fresh-world fallback, storage failures, both Mira errand transition sequences, state serialization, contextual hints, and duplicate-reward protection.
  - Kept the expanded smoke suite on its historical single-worker execution so the long Grade 2 browser flow does not compete with the new pure-system test file and exceed its existing timeout.
  - Refreshed the durable repository baseline to reflect the loaded Practice Slime, five browser smoke tests, farm quest system, and hero presentation controller.
- Reason: Prevent damaged local storage from crashing scene startup and give the newly extracted pure systems direct regression coverage before the child-clarity checkpoint.

## 2026-06-29 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/grade5-ranger-foundation`
- Files changed:
  - `README.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `docs/visual-targets/GRADE5_RANGER_ACTOR_TARGET.md`
  - `docs/visual-targets/grade5_ranger_actor_target.json`
  - `src/presentation/HeroPresentationController.ts`
  - `src/scenes/WorldScene.ts`
  - `src/systems/FarmQuestSystem.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Established the Grade 5 Ranger technical target and moved actor presentation and farm quest rules out of the Phaser world scene.
- Implementation notes:
  - Added the validated `char_ranger_boy_base` target with idle, walk, presentation-only inspect, and development/test-only hurt contracts; asset generation remains blocked on ChatGPT visual/prompt approval.
  - Replaced Grade 2-specific scene animation state with a profile-configured hero presentation controller while preserving the Grade 5 placeholder fallback.
  - Moved both Mira errands into a renderer-independent state system that returns presentation outcomes and serializes the unchanged version-1 quest fields.
  - Reduced `WorldScene.ts` from 1,174 to roughly 830 lines without changing movement, rewards, learning, saves, quest progression, or profile behavior.
- Reason: Prepare profile-specific production actors and future quest work without continuing to concentrate rendering and gameplay rules in one Phaser scene.

## 2026-06-29 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/child-clarity-foundations`
- Files changed:
  - `.github/workflows/ci.yml`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `docs/playtests/CHILD_CLARITY_CHECKLIST.md`
  - `index.html`
  - `src/styles/global.css`
  - `tests/vertical-slice.spec.ts`
- Summary: Prepared the verified farm slice for its real-child clarity checkpoint.
- Implementation notes:
  - Added an accessible portrait-only orientation overlay so supported touch play stays readable in landscape.
  - Added a privacy-safe 10-15 minute checklist for separate Grade 2 and Grade 5 sessions with explicit no-gating acceptance criteria.
  - Added portrait/landscape regression coverage and expanded CI to install Chromium and run the Playwright smoke suite.
  - Left quests, curriculum, rewards, save data, controls, maps, and actor presentation unchanged.
- Reason: The current slice needs real-player clarity evidence before more content or production-art expansion.

## 2026-06-29 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `main`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Fixed the playtest-blocking farm traversal bounds and optional-prompt Skip control.
- Implementation notes:
  - Expanded Arcade Physics world bounds from the viewport default to the existing Tiled map dimensions so normal movement can reach the crop/scarecrow and Practice Slime interaction points.
  - Raised optional prompt panels above the actor presentation and replaced the text-only Skip hit area with a visible button-sized pointer target.
  - Changed smoke coverage to activate Skip through the rendered canvas control instead of directly emitting its internal event.
  - Added movement coverage proving the Grade 2 actor can travel below the original 320-pixel viewport boundary.
- Reason: The screenshot-assisted playtest found that the map camera exposed targets outside the default physics bounds and that the visible Skip label did not respond to pointer input, preventing a child from completing the quest normally.

## 2026-06-29 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `main`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/data/quests.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Polished the Whispering Scarecrow interaction hint and shortened its player-facing lines.
- Implementation notes:
  - Changed the contextual ACTION hint at the existing crop/scarecrow point from the internal `CropBonus` label to `Check Scarecrow` only while the second errand is in its investigate state.
  - Left ordinary crop-bonus interactions and the first Mira errand on the existing `CropBonus` hint and unchanged mechanics.
  - Shortened the scarecrow start, reminder, return, and discovery lines to reduce reading density without changing the quest flow, reward behavior, or save format.
  - Updated smoke coverage to verify the ordinary crop hint still reads `CropBonus` while the second-errand hint reads `Check Scarecrow`.
- Reason: Make the follow-up errand easier for kids to read in moment-to-moment play without expanding scope or changing systems.

## 2026-06-29 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `main`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/data/quests.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Replaced the temporary follow-up farm favor with the requested Whispering Scarecrow micro-errand.
- Implementation notes:
  - Added a two-step post-quest follow-up where Mira sends the player to the existing crop/scarecrow spot, the player discovers a text-only Moonseed Charm through the current ACTION and optional-prompt flow, and then returns to Mira for a small gold reward.
  - Kept the implementation inside the existing `firstQuestStep`, optional `questFlags`, HUD objective text, toast, floating reward, sparkle, and save/load paths without adding maps, art, combat, AI, economy, or a new quest system.
  - Preserved version-1 save compatibility by storing only optional booleans for accepted, charm-found, and complete second-errand state while leaving the original first-errand step ids unchanged.
  - Updated the Grade 2 smoke flow to verify the new accept-investigate-return-complete sequence, Moonseed Charm discovery text, reward persistence, and post-reload recovery.
- Reason: Align the follow-up farm loop with the requested story hook while keeping the vertical slice small, optional-learning-safe, and fully testable.

## 2026-06-29 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/optional-second-farm-errand`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/data/quests.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added one optional second Mira farm errand that reuses the existing crop patch interaction and reward patterns.
- Implementation notes:
  - Added a small typed follow-up errand definition with one acceptance step from Mira, one crop-check completion step, and a small gold-only payout.
  - Stored the follow-up errand only in optional `questFlags`, preserving version-1 save compatibility and leaving the existing first-errand step ids unchanged.
  - Reused the current crop bonus prompt, HUD objective, toast, floating reward, sparkle, and save/load paths so no new maps, art, systems, combat, AI, economy, or Grade 5 presentation work was introduced.
  - Extended the vertical-slice smoke flow to verify second-errand availability, optional-prompt completion on skip, reward persistence, and protection against duplicate charm rewards.
- Reason: Give the farm slice one more short, kid-playtestable adventure loop without expanding scope beyond the current map and existing interaction systems.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/integrate-grade2-mage-hurt`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Integrated the Grade 2 Mage hurt sheet as a presentation-only recovery animation on a development/test-safe trigger.
- Implementation notes:
  - Preloaded the committed hurt sheet and registered guarded three-frame directional clips using the merged manifest row order.
  - Added a development/test-only hurt trigger that preserves facing, leaves movement and physics running underneath, cancels cast cleanly, and recovers to matching walk or idle after the one-shot completes.
  - Kept hurt disconnected from combat, damage, hitboxes, rewards, quests, mastery, saves, controls, collision, maps, and Grade 5 behavior.
- Reason: Complete the Grade 2 production actor baseline while preserving the separation between presentation work and future gameplay systems.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/integrate-grade2-mage-cast`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Integrated the Grade 2 Mage cast sheet as a presentation-only ACTION animation in safe, no-target contexts.
- Implementation notes:
  - Preloaded the committed cast sheet and registered guarded four-frame directional clips.
  - Preserved the active facing direction, underlying movement/physics actor, and return to the matching walk or idle state after casting.
  - Kept hurt asset-only and left Grade 5, interactions, controls, collision, quests, learning, saves, rewards, combat, AI, and maps unchanged.
- Reason: Add readable Grade 2 Mage casting presentation without introducing combat or combining the separate hurt-integration milestone.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/grade2-mage-cast-hurt-assets`
- Files changed:
  - `assets/manifests/char_mage_boy_base_cast_v001.manifest.json`
  - `assets/source/generated/char_mage_boy_base_cast_v001/source_sheet.png`
  - `assets/sprites/char_mage_boy_base_cast_v001.png`
  - `assets/manifests/char_mage_boy_base_hurt_v001.manifest.json`
  - `assets/source/generated/char_mage_boy_base_hurt_v001/source_sheet.png`
  - `assets/sprites/char_mage_boy_base_hurt_v001.png`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
- Summary: Added Grade 2 Mage cast and hurt source/runtime assets without runtime wiring.
- Implementation notes:
  - Added manifest-driven cast and hurt sheets using the existing Mage identity.
  - Normalized to exact `32x48` runtime cells.
  - Kept runtime, controls, collision, quests, learning, saves, rewards, combat, AI, and Grade 5 unchanged.
- Reason: Extend the production Mage animation set while preserving asset/runtime separation.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/integrate-grade2-mage-walk`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added directional Grade 2 Mage walk animation during existing movement input.
- Implementation notes:
  - Preloaded the committed walk sheet and registered guarded six-frame front, back, left, and right loops.
  - Switched the existing presentation sprite to walk while keyboard or joystick movement is active and back to the matching idle loop on release or busy state.
  - Preserved the invisible physics actor, speed, collision, camera, interaction distance, save coordinates, and Grade 5 presentation.
  - Added smoke coverage for walk-sheet transitions in all four directions and verified mid-stride desktop/mobile captures.
- Reason: Replace the Grade 2 hero's sliding idle presentation with readable movement animation without changing gameplay mechanics.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/grade2-mage-hero-walk-asset`
- Files changed:
  - `assets/manifests/char_mage_boy_base_walk_v001.manifest.json`
  - `assets/source/generated/char_mage_boy_base_walk_v001/source_sheet.png`
  - `assets/sprites/char_mage_boy_base_walk_v001.png`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
- Summary: Added a matching four-direction, six-frame Grade 2 Mage walk asset without runtime wiring.
- Implementation notes:
  - Used the approved idle source as the identity reference for one strict `6x4` walk source sheet.
  - Converted the flat chroma background to true alpha locally, then normalized the sheet to an exact `192x192` PNG with `32x48` bottom-centered cells.
  - Kept the runtime, movement, controls, collisions, saves, quests, learning, and Grade 5 profile unchanged.
- Reason: Establish production movement art as a separately reviewable asset before changing the live player animation state machine.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/display-grade2-mage-hero-idle`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Displayed the four-direction Grade 2 Mage idle asset without changing player physics or Grade 5 presentation.
- Implementation notes:
  - Preloaded the committed `32x48` runtime sheet and registered guarded front, back, left, and right idle loops.
  - Added a bottom-centered presentation sprite that follows the unchanged Grade 2 physics actor, preserving collision, camera follow, interaction distance, controls, and save coordinates.
  - Kept the Grade 5 adventurer placeholder visible and behaviorally unchanged.
  - Extended browser smoke coverage for texture, dimensions, pivot, profile isolation, and directional transitions.
- Reason: Put the first production hero art into the playable vertical slice while keeping the visual change isolated from gameplay systems.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/grade2-mage-hero-idle-asset`
- Files changed:
  - `assets/manifests/char_mage_boy_base_idle_v001.manifest.json`
  - `assets/source/generated/char_mage_boy_base_idle_v001/source_sheet.png`
  - `assets/sprites/char_mage_boy_base_idle_v001.png`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
- Summary: Added the first asset-only Grade 2 Mage hero idle sheet for all four production directions.
- Implementation notes:
  - Generated one strict `4x4` source sheet with front, back, left, and right rows and four subtle idle phases per direction, then converted its flat chroma field to true alpha with local soft-matte cleanup.
  - Normalized the source through the existing manifest pipeline into an exact `128x192` RGBA runtime PNG with `32x48` cells and bottom-center anchoring.
  - Kept the asset out of Phaser so player presentation, controls, collision, saves, quests, learning, and gameplay remain unchanged.
  - This is the idle foundation only; walk, cast, hurt, equipment overlays, and runtime integration remain separate work.
- Reason: Establish a consistent, Grade 2-readable hero identity and directional baseline before producing synchronized animation and equipment layers.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/crop-bonus-interaction-feedback`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added lightweight Crop Bonus interaction feedback before its existing optional prompt.
- Implementation notes:
  - Added a short primitive pulse and four leaf-like motes at the unchanged Crop Bonus target coordinate.
  - Held input only for the visual beat, then opened the existing prompt and preserved its original quest callback.
  - Updated the Grade 2 smoke flow to exercise the real crop interaction and verify feedback appears, clears, and leaves read-aloud and quest progression intact.
  - Added no assets, maps, farming systems, inventory, timers, curriculum, mastery, save, combat, AI, or reward changes.
- Reason: Give both interactions in Mira's starter errand a responsive RPG presentation without expanding gameplay scope.

## 2026-06-28 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/practice-slime-animation-feedback`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added short Practice Slime hop feedback to its existing optional-prompt interaction.
- Implementation notes:
  - Added a guarded six-frame hop animation using the committed runtime sheet and a one-shot completion listener that restores idle.
  - Triggered feedback only from the existing Practice Slime interaction path and opened the unchanged prompt after the hop so the creature remains visible during feedback.
  - Extended smoke coverage to verify the texture, idle and hop registrations, interaction transition, and return to idle.
  - Preserved prompt behavior, quest progression, mastery, saves, rewards, controls, combat state, and AI behavior.
- Reason: Give the first production creature a more responsive RPG interaction moment without expanding gameplay scope.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/display-practice-slime`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`
  - `docs/visual-targets/PRACTICE_SLIME_TARGET.md`
  - `src/scenes/PreloadScene.ts`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Displayed the production Practice Slime v001 sprite in the existing farm world.
- Implementation notes:
  - Imported the committed runtime sheet through Vite, preloaded it as a `32x32` spritesheet, and added a four-frame idle loop.
  - Replaced only the Practice Slime circle/text marker with a bottom-centered sprite at the unchanged Tiled interaction coordinates.
  - Strengthened smoke coverage to verify sprite geometry/animation and exercise the real Practice Slime interaction path.
  - Preserved optional learning, quest progression, saves, mastery, controls, rewards, combat state, and AI behavior.
- Reason: Complete the first production-asset runtime presentation without expanding gameplay scope.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/project-memory-refresh`
- Files changed:
  - `AGENTS.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md`
  - `docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`
  - `docs/visual-targets/PRACTICE_SLIME_TARGET.md`
- Summary: Refreshed project memory and established the milestone-checkpoint collaboration workflow.
- Implementation notes:
  - Updated the merged implementation baseline and moved volatile roadmap status into a concise current-state document.
  - Recorded the normalized Practice Slime asset as complete while keeping runtime display explicitly pending.
  - Defined routine Codex self-merge gates and the product/design decisions that still require a user or ChatGPT checkpoint.
- Reason: Reduce repetitive cross-chat context transfer while preserving small PRs, verification discipline, and strategic design review.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/practice-slime-v001-asset`
- Files changed:
  - `assets/source/generated/mob_slime_practice_v001/source_sheet.png`
  - `assets/manifests/mob_slime_practice_v001.manifest.json`
  - `assets/sprites/mob_slime_practice_v001.png`
  - `docs/CHATGPT_CHANGELOG.md`
- Summary: Added the approved Practice Slime v001 source art and deterministic runtime spritesheet.
- Implementation notes:
  - Preserved the original lossless `1536x1024` PNG as a `6x4` source sheet with `256x256` source cells.
  - Used the asset manifest and normalizer to generate the exact `192x128` RGBA runtime sheet with `32x32` cells.
  - Tuned edge-flood color-key tolerance for this source after enlarged inspection exposed anti-aliased magenta fringe; enclosed poof colors remain protected.
  - Validated transparent unused cells, color-key cleanup, sprite readability, and poof-particle preservation without loading the asset in Phaser.
- Reason: Establish the first production-ready Practice Slime art asset while keeping runtime integration in a separate PR.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `manual/asset-sheet-normalizer`
- Files changed:
  - `.gitignore`
  - `assets/manifests/mob_slime_practice_v001.manifest.json`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md`
  - `docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`
  - `docs/art-pipeline/examples/practice_slime_v001.manifest.example.json`
  - `package.json`
  - `scripts/normalize-asset-sheet.mjs`
  - `scripts/test-asset-pipeline.mjs`
  - `scripts/validate-asset-sheet.mjs`
- Summary: Added and stabilized a dependency-free asset-sheet normalization pipeline for generated source art.
- Implementation notes:
  - Added manifest-driven PNG normalization with exact target dimensions, nearest-neighbor scaling, uniform-grid and source-rectangle extraction, alpha trimming, configurable anchoring, and transparent unused cells.
  - Added alpha, full color-key, and per-frame edge-flood color-key cleanup; the edge-flood mode preserves matching colors enclosed inside a sprite.
  - Added aggregated manifest/output validation and synthetic coverage for alpha sheets, color-key sheets, edge-flood behavior, source rectangles, expected empty cells, malformed manifests, and variable cell sizes.
  - Added pipeline and prompting guidance plus an illustrative manifest and a dormant real Practice Slime manifest for the later source-asset PR.
  - Folded the temporary connector-authored pipeline note into this canonical changelog and removed the temporary note.
- Reason: Convert approved AI-generated source art into deterministic, reviewable Phaser-ready PNG sheets without changing runtime or gameplay behavior.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/visual-target-validation-check`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `package.json`
- Summary: Wired visual target validation into the existing `npm run check` path.
- Implementation notes:
  - Prepends `npm run validate:visual-targets` before the unchanged typecheck and build chain.
  - Uses the validator's aggregated errors and nonzero exit code without custom failure handling.
- Reason: Make visual target drift fail automatically anywhere the standard project check runs.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/visual-target-validator`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/README.md`
  - `package.json`
  - `scripts/validate-visual-targets.mjs`
- Summary: Added dependency-free validation for all checked-in visual target JSON files.
- Implementation notes:
  - Validates shared fields, canonical unique IDs, contract references, target-only/no-runtime intent, geometry shapes, clip shapes, and inheritance references.
  - Aggregates all errors with file/target context and builds only an in-memory target index.
  - Added `npm run validate:visual-targets` and documented its use without changing existing scripts.
- Reason: Keep visual target manifests enforceable before future art generation or runtime integration.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/farm-village-tile-targets`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/FARM_VILLAGE_TILE_TARGETS.md`
  - `docs/visual-targets/farm_village_tile_targets.json`
- Summary: Added the first eight Farm/Village production tile target specifications.
- Implementation notes:
  - Defined grass, path, soil, crop, shop, door, and interaction-marker targets using the `16x16` tile grammar.
  - Recorded variants, palettes, layers, collision/interaction metadata, and `environment_farm` atlas ownership.
  - Kept crop, door, sign, farming, map, and collision behavior explicitly unimplemented.
- Reason: Establish reviewable tile targets before generating art or changing the current map/runtime pipeline.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/practice-slime-target-spec`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/PRACTICE_SLIME_TARGET.md`
  - `docs/visual-targets/practice_slime_target.json`
- Summary: Added the production target specification for the friendly Practice Slime.
- Implementation notes:
  - Defined `mob_slime_practice_base` as a front-view `32x32` visual target with idle, hop, hurt, and poof clips.
  - Recorded palette, silhouette, collision, interaction, atlas, layer, and child-friendly readability requirements.
  - Explicitly left combat stats, AI, hitboxes, and runtime defeat behavior undefined.
- Reason: Establish a reviewable Practice Slime target before generating or replacing art.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/mage-starter-equipment-targets`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/MAGE_STARTER_EQUIPMENT_TARGETS.md`
  - `docs/visual-targets/mage_starter_equipment_targets.json`
- Summary: Added Grade 2 Mage starter robe, hat, cape, and staff overlay target specifications.
- Implementation notes:
  - Declared four target-only cosmetic entries inheriting `char_mage_boy_base` canvas, pivot, directions, and clip timing.
  - Recorded palette, render-layer, slice/socket, atlas, and no-collision ownership rules for each overlay.
  - Added a future art PR alignment checklist without generating art or adding equipment gameplay.
- Reason: Lock overlay compatibility to the approved hero base before any starter equipment art is generated.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/hero-actor-target-spec`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/visual-targets/HERO_ACTOR_TARGETS.md`
  - `docs/visual-targets/hero_actor_targets.json`
- Summary: Added the first production hero actor target specification and machine-readable manifest entry.
- Implementation notes:
  - Defined `char_mage_boy_base` as a `32x48`, four-direction Grade 2 Mage target aligned to the visual asset contract.
  - Recorded required animation ranges, palette families, slices, collision/interaction boxes, atlas family, and deferred art scope.
  - Added a future art PR checklist without generating art or changing runtime behavior.
- Reason: Establish a reviewable production target before any hero sprite generation or replacement work begins.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/visual-asset-contract`
- Files changed:
  - `AGENTS.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/VISUAL_ASSET_CONTRACT.md`
  - `docs/research/visual-design/Executable_2D_RPG_Visual_Design_Guide_for_Eldoria_V2.pdf`
- Summary: Added a concise visual asset contract and stored its source research guide at the canonical repo path.
- Implementation notes:
  - Defined the production baseline for scale, pivots, palettes, lighting, naming, metadata, category rules, animation, layering, atlas direction, and validation.
  - Added a minimal `AGENTS.md` link so future asset work discovers the contract before generating or replacing art.
  - Preserved the supplied PDF unchanged; no images were extracted and no runtime asset pipeline was added.
- Reason: Give human and AI contributors an enforceable visual specification that prevents asset drift while the current Phaser vertical slice remains the priority.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/deterministic-prompt-preview`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `src/systems/LearningBonusSystem.ts`
  - `src/systems/QuestionEngine.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added a development/test-only utility that renders a chosen question template by ID in the existing prompt panel.
- Implementation notes:
  - Added strict template lookup that validates the active profile band and uses the template's first declared context and minimum difficulty.
  - Added a guarded `WorldScene.previewPrompt` entry point with no reward, mastery, quest, or save side effects.
  - Added smoke coverage for exact Grade 2 and Grade 5 template selection, profile-specific read-aloud behavior, and side-effect-free skip and answer paths.
- Reason: Make prompt visual QA deterministic and repeatable without changing player-facing behavior or relying on random template selection.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/four-contextual-question-templates`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/data/questionTemplates.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added exactly four contextual learning templates for the existing farm and combat bonus moments.
- Implementation notes:
  - Added two short Grade 2 math prompts with explicit read-aloud text: farm place value and combat addition.
  - Added two Grade 5 reader-mode prompts with richer reasoning: farm fraction simplification and combat energy transfer.
  - Reused existing reward kinds and adjusted Grade 2 mastery smoke assertions to allow valid random skill selection without weakening skip and progression coverage.
  - Added focused smoke coverage for template presence, answer choices, Grade 2 audio support, and context/reward/skill contracts.
- Reason: Expand curriculum variety in a small, testable PR while keeping learning optional and embedded in existing gameplay actions.

## 2026-06-27 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/sunberry-charm-hud-keepsake`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Made the earned Sunberry Charm persistently visible as a compact keepsake in the existing top HUD.
- Implementation notes:
  - Appends `Keepsake: Sunberry Charm` only when the saved inventory contains the one-time charm reward.
  - Reuses the typed charm key and name from the Mira quest definition rather than adding item metadata or a new inventory surface.
  - Extended smoke coverage for pre-reward absence, immediate visibility, HUD fit, reload persistence, and single rendering after repeated Mira interaction.
- Reason: The starter quest's permanent reward should remain visible after its completion toast without expanding into an inventory or equipment system.

## 2026-06-26 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/title-profile-layout-polish`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/TitleScene.ts`
- Summary: Adjusted the title and profile-selection vertical spacing so all text and panels remain readable without overlap.
- Implementation notes:
  - Moved the title and North Star subtitle upward and added clear space above and between the Grade 2 Mage and Grade 5 Adventurer panels.
  - Kept both existing profile hit areas compatible with the current smoke-test interaction points.
- Reason: Live browser inspection found the subtitle partially hidden behind the Mage panel on the current title screen.

## 2026-06-26 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/mastery-tracking-foundation`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `src/systems/MasterySystem.ts`
  - `src/systems/SaveSystem.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added invisible, save-backed mastery tracking for optional learning prompt outcomes.
- Implementation notes:
  - Records seen, attempted, correct, wrong, skipped, current streak, best streak, and last prompt metadata under stable curriculum keys.
  - Keeps mastery optional in version-1 saves so existing saves load without migration.
  - Treats skips as non-punitive: they advance existing quest callbacks, award no learning bonus, and do not reset a correct streak.
  - Extended smoke coverage to exercise the real Grade 2 skip action, deterministic Grade 5 correct and wrong answers, old-save loading, and mastery persistence after reload.
- Reason: Reliable local learning telemetry is the next foundation for later adaptive content and summaries, without surfacing UI or changing player-facing gameplay.

## 2026-06-26 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/data-driven-mira-quest`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/data/quests.ts`
  - `src/scenes/WorldScene.ts`
- Summary: Extracted the existing Mira first-errand content into a small typed quest definition without changing gameplay.
- Implementation notes:
  - Centralized the quest id and name, existing save-compatible step ids, objective text, target labels, Mira dialogue, progress messages, completion toast, and completion rewards.
  - Updated `WorldScene` to use the typed definition while retaining quest orchestration and all learning, control, save, and rendering behavior.
  - Left the Playwright tests unchanged so the existing vertical-slice suite continues to lock the player-visible behavior.
- Reason: The starter quest content needs a small data boundary before later content expansion, without introducing a generalized quest engine or feature scope.

## 2026-06-26 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/mira-reward-juice-sunberry-charm`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `src/systems/SaveSystem.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added lightweight reward feedback and a persistent Sunberry Charm reward to Mira's first errand.
- Implementation notes:
  - Preserved the existing 10 gold quest reward and added a one-time `inventory.sunberryCharm` reward when the errand transitions to complete.
  - Added floating gold/item text and a small Phaser primitive sparkle burst for quest completion and correct optional-learning bonuses.
  - Kept inventory optional in version 1 save data so existing saves continue to load without migration.
  - Extended the vertical-slice smoke test to verify charm feedback, save/reload persistence, and protection against duplicate rewards after completion.
- Reason: The starter quest needs immediate feedback and permanent progress so its completion feels like an RPG reward loop without making learning mandatory.

## 2026-06-26 — Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/agent-reference-docs`
- Files changed:
  - `AGENTS.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/reference/Design-Guide-for-a-Beautiful-Deep-Addictive-Immersive-Curriculum-Aligned-2D-RPG.pdf`
- Summary: Added the deep design guide PDF to repo references and expanded project agent instructions.
- Implementation notes:
  - Created `docs/reference/` for durable project reference materials.
  - Copied the attached design guide PDF into the reference folder with a descriptive filename.
  - Replaced the shorter `AGENTS.md` with full Eldoria-V2 operating instructions covering product rules, current baseline, target player assumptions, roadmap, Codex/ChatGPT split, workflow, changelog requirements, testing expectations, and response format.
  - Audited the instructions against current `main` and added the merged Playwright smoke suite to the baseline, stabilization workflow, and pre-merge checks.
- Reason: Future Codex work needs durable project context, a local design reference, and explicit rules that preserve the current vertical slice and bonus-only learning model.

## 2026-06-26 — Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `codex/playwright-smoke-infra`
- Files changed:
  - `.gitignore`
  - `docs/CHATGPT_CHANGELOG.md`
  - `package-lock.json`
  - `package.json`
  - `playwright.config.ts`
  - `src/main.ts`
  - `src/vite-env.d.ts`
  - `tests/vertical-slice.spec.ts`
- Summary: Added Playwright smoke-test coverage for the current vertical slice.
- Implementation notes:
  - Added `@playwright/test`, a `npm run smoke` script, and a Chromium Playwright config that starts or reuses the local Vite server.
  - Exposed the Phaser game instance in dev/e2e mode so tests can inspect canvas-only scene state without adding player-visible UI.
  - Added Grade 2 smoke coverage for movement in all four directions, ACTION with Mira, objective progress, Grade 2 read-aloud prompt visibility, Mira reward completion, and save reload.
  - Added Grade 5 smoke coverage that verifies reader-mode prompts do not show the Grade 2 `READ ALOUD` control.
- Reason: Browser-game QA needs repeatable Playwright checks for the canvas vertical slice before adding new gameplay features.

## 2026-06-26 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/dynamic-joystick-current`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
- Summary: Rebuilt the dynamic lower-left virtual joystick on the current `main` after the curriculum engine and starter quest loop were merged.
- Implementation notes:
  - Closed stale PR #2 as superseded because it was based on an older `WorldScene.ts` and was no longer mergeable.
  - Replaced the fixed lower-left D-pad with an all-direction joystick that appears under the thumb when a touch starts in the lower-left quadrant.
  - Preserved the objective HUD, Mira starter quest loop, curriculum prompt layout, and read-aloud support.
  - The joystick resets on release, when a learning prompt opens, and when the scene shuts down.
- Reason: Tablet/mobile movement should feel natural before adding more gameplay complexity.

## 2026-06-26 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/starter-quest-objectives`
- Files changed:
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/scenes/WorldScene.ts`
  - `src/systems/SaveSystem.ts`
- Summary: Added the first playable quest/objective loop using Mira, the crop bonus, and the Practice Slime.
- Implementation notes:
  - Added a persistent `firstQuestStep` save field and a `miraFirstErrandComplete` quest flag.
  - Added an objective HUD below the main gold/profile HUD.
  - Added Mira interaction states that direct the player through the first errand.
  - Progress advances after the player checks the crop bonus and interacts with the Practice Slime, regardless of whether the optional learning bonus is answered correctly or skipped.
  - Updated prompt layout to better support longer answer choices from the curriculum-aware question engine.
  - Incorporated PR audit findings by consolidating result/objective toasts into one message and avoiding prototype wording that implied the slime marker disappears visually.
- Reason: The deep design research recommends one excellent vertical slice with a clear 10-15 minute progress loop before expanding systems or content.

## 2026-06-26 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/curriculum-question-engine`
- Files changed:
  - `docs/CURRICULUM_QUESTION_ENGINE.md`
  - `docs/CHATGPT_CHANGELOG.md`
  - `src/data/curriculum.ts`
  - `src/data/curriculumMap.ts`
  - `src/data/questionTemplates.ts`
  - `src/systems/LearningBonusSystem.ts`
  - `src/systems/QuestionEngine.ts`
- Summary: Added a curriculum-aware question engine foundation for Grade 2 and Grade 5 prompts.
- Implementation notes:
  - Added typed curriculum metadata for subject, skill, game context, answer value, hints, explanations, and reward type.
  - Added starter Grade 2 and Grade 5 templates across math, ELA, science, and social studies.
  - Routed the existing learning prompt facade through the new `QuestionEngine` so current gameplay can keep calling `makeLearningPrompt`.
  - Updated answer resolution to support numeric and non-numeric choices.
  - Documented the curriculum/game-design synthesis before broader quest integration.
- Reason: The game needs a curriculum-aware engine that can make learning feel like RPG mechanics rather than detached quizzes.

## 2026-06-25 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/grade2-read-aloud`
- Files changed:
  - `src/scenes/WorldScene.ts`
  - `docs/CHATGPT_CHANGELOG.md`
- Summary: Added a Grade 2 audio-first `READ ALOUD` button to optional learning prompts using the browser `speechSynthesis` API.
- Implementation notes:
  - Kept read-aloud behind an explicit tap/click instead of auto-playing speech.
  - Limited the button to profiles with `readingMode: 'audio-first'`.
  - Cancels active speech when the prompt is answered, skipped, or the scene shuts down.
  - Added no new dependencies.
- Reason: The Grade 2 Mage profile is defined as audio-first, but the prompt UI previously required reading the question and choices.

## 2026-07-04 - Codex via OpenAI, coordinated with GPT-5.5 Thinking

- Branch: `review/pr45`
- Files changed:
  - `src/scenes/WorldScene.ts`
  - `src/data/interactions.ts`
  - `public/maps/farm.json`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
  - `tests/unit/interactions.test.ts`
- Summary: Resolved PR #45 review concerns regarding interaction ID decoupling, save version hardcoding, and missing documentation.
- Implementation notes:
  - Configured explicit stable `interactionId` custom properties on all interactive Tiled objects inside `public/maps/farm.json`.
  - Added `getTiledProperty` helper to `src/data/interactions.ts` to extract properties from both flat structures and Tiled property arrays.
  - Refactored `WorldScene.makeTargets()` to resolve interaction ID using Tiled custom properties, with a backwards-compatible fallback to the display name registry.
  - Updated `WorldScene.save()` to use the imported `CURRENT_SAVE_VERSION` constant from `SaveSystem.ts` instead of hardcoded `version: 1`.
  - Added a dedicated unit test suite in `tests/unit/interactions.test.ts` proving that resolved interaction IDs remain stable when Tiled display names are changed.
- Reason: Resolve security/robustness concerns around name-based dispatch logic and maintain clean, up-to-date project logs.

## 2026-07-04 - Google Antigravity, coordinated with GPT-5.5 Thinking

- Branch: `antigravity/stats-mastery-panel-port`
- Files changed:
  - `src/scenes/WorldScene.ts`
  - `tests/vertical-slice.spec.ts`
  - `docs/CHATGPT_CHANGELOG.md`
  - `docs/CURRENT_STATE.md`
- Summary: Ported the Stats & Mastery UI panel and Web SpeechSynthesis fixes to the clean post-PR #45 architecture.
- Implementation notes:
  - Ported the centered container UI overlay (`380x240`), dividing line, and close button from the parked `antigravity/wip-stats-mastery-panel` branch reference.
  - Added a visible top-right `STATS` HUD button and configured hotkeys (`I`, `Tab` with capturing prevent-default logic) to toggle the stats panel.
  - Displayed player profile name/reading description, gold count, keepsakes slot (rendering a `🍓` emoji if the Sunberry Charm is owned), and progress bars tracking mastery ratios for core subjects (Math, ELA, Science, Social Studies).
  - Maintained complete coexistence with the PR #45 decoupled interaction ID registries, save migration seams, and quest controllers (e.g. reading via `this.farmQuest.firstQuestStep` without editing quest progression).
  - Ported missing SpeechSynthesis garbage collection reference pins and lifecycle listeners (`PAUSE`/`SLEEP`/`DESTROY`/`SHUTDOWN`) to fix voice narration cut-offs.
  - Ported the E2E vertical-slice test verifying HUD and hotkey panel toggle interactions.
  - Configured a test-specific timeout of 60s for the Stats UI E2E test to prevent slow environment timeouts in CI VMs.
- Reason: Restore the visual overlay, progress tracking, and speech fixes safely to main while preserving all PR #45 hardening foundations.
