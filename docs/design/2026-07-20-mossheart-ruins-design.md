# Mossheart Ruins (Zone #4) — Design Spec

- **Date:** 2026-07-20
- **Status:** APPROVED (section-by-section user review, 2026-07-20)
- **Program:** World-expansion program, sub-project **A** (world + maps). Sibling sub-projects, each to be specced separately: **B** monsters + boss encounter, **C** battle animation set, **D** hero/NPC production sprites.
- **Author:** Kimi (design), with the repo owner as product approver. Implementation is delegated per the multi-agent workflow.

---

## 1. Product frame

**Player fantasy:** the child's *first real adventure*. The Farm stays safe, Wildbloom Woods stays wonder, Eldoria Village stays cozy — the Mossheart Ruins are where a kid first feels like a hero.

**Primary fun test:** the kid returns to the ruins **unprompted** after completing the arc. (Technical bars in §10 are necessary but not sufficient; this is the metric that matters.)

**Doctrine compliance (non-negotiables preserved):**

- **Learning never gates adventure.** The Mossgate Arch opens from waystone *discovery count*, never from answering anything. Wrong answers never un-wake a waystone. Pattern puzzles are opt-in bonuses.
- No random loot or variable rewards — all rewards are fixed values.
- Child-safe presentation: the guardian is a gentle mossy tortoise; there is **no combat anywhere in this spec**.
- Profile paths preserved: Mage audio-first with read-aloud everywhere; Ranger reader-mode with slightly richer text. Stable profile IDs untouched.
- Save compatibility: **no schema version bump**; every new field has a graceful default for old saves.

## 2. Dependencies and build order

This spec sits **after** two in-flight milestones and must not be implemented before both merge:

1. **M2 — multi-map foundation** (Prompt 02 → ChatGPT): map registry, exits/transitions, save-your-map, Wildbloom Woods. Zone #4 is the *second consumer* of this machinery and its first new map built from scratch on it.
2. **M3 — living world** (Prompt 03 → Claude, after M2): data-driven quest registry, dialogue UI (read-aloud reuse), cross-map objective compass, Eldoria Village. *The Silent Guardian* is designed as the registry's first cross-map quest and the compass's first cross-map target.

**Implementer convention (from project doctrine):** verify prerequisites against the merged code — adapt to the *actual* symbol names M2/M3 land (registry, quest-def, and dialogue-API names below are semantic, not literal) — and **stop and report** if a prerequisite is missing rather than improvising around it.

## 3. Player-facing behavior

### 3.1 The place

**Mossheart Ruins** (`mossheart-ruins`): one 1920×1280 px map (farm dimensions; 960×640 design resolution × `GAME_SCALE` 2). Entry at the edge nearest Wildbloom Woods; a winding path through ruin nooks; a walled **sanctum** at the far end sealed by the **Mossgate Arch**.

### 3.2 Getting there

- A new exit on the **Wildbloom Woods edge farthest from the farm entrance**, built on M2's exit/transition machinery. Visible and walkable from the first Woods visit — exploration is never locked.
- World route: Farm → Wildbloom Woods → Mossheart Ruins.

### 3.3 The quest: *The Silent Guardian* (`mossheart-guardian`)

- **Quest giver:** **Elder Rowan** (`npc-elder-rowan`), a new village NPC added to Eldoria Village (M3's map). Bridge/code-drawn presentation initially, exactly as Mira shipped; production sprite belongs to sub-project D.
- **Ask:** the old guardian has gone silent; someone should wake the three waystones.
- **Compass:** the M3 cross-map objective compass + edge arrow guide each step (to the village when unaccepted, to the Woods exit, then to the nearest un-woken waystone, then to the sanctum). While the quest is `not-started`, no ruins objective marker appears — pre-quest discovery is curiosity-driven, matching the Wildbloom secrets precedent.

### 3.4 Waystones (`waystone-1`, `waystone-2`, `waystone-3`)

- **Discovery** = first ACTION interaction. Plays a discovery moment: hum, glow tween, one short flavor line (read-aloud on Mage). Sets the waystone's flag. **This alone wakes the stone.**
- Immediately after discovery, the M1 opt-in precedent applies: *"ACTION again to solve!"* — a second ACTION within 2 s opens the optional pattern puzzle (§8).
- Solving: chime + fixed +5 gold. Wrong answer or skip: encouragement toast only; the waystone **stays awake**; the puzzle remains re-offerable via double-ACTION.
- Waystones are discoverable in **any order**. The compass targets the nearest un-woken waystone (Euclidean distance from player position).
- When the third flag sets, the **Mossgate Arch rumbles open on its own** after the discovery moment completes (camera nudge + gate-open tween + rumble SFX). No prompt of any kind is involved.

### 3.5 The sanctum and Old Mossback

- **Old Mossback** (`guardian-mossback`): a colossal moss-covered stone tortoise, asleep in the sanctum. Largest sprite in the game (§9).
- **The scene** triggers exactly once, the first time the player enters the sanctum trigger zone with `guardianMet = false`: he wakes, speaks a short dialogue scene via M3's dialogue UI (read-aloud on Mage), grants the **Heartstone Keepsake**, teases — *"When you are ready, little one…"* — and dozes off. The boss fight this plants belongs to sub-projects B/C; **none is built here.**
- **Scene beats** (final copy to implementation; wording review by ChatGPT/kid per the M1 flavor-line precedent): (1) stirs, moss puffs; (2) *"You woke the stones, little one."*; (3) grants the Heartstone — *"Keep this close."*; (4) the tease line, then dozing. ≤4 lines; ≤8 words/line Mage, ≤12 words/line Ranger.
- **Post-scene visits:** one rotating flavor line per visit; he never replays the scene.

### 3.6 Ambient life (flavor-only, no combat)

- **Pebble Beetle** (×3): slow waypoint-tween wanderers. ACTION → rotating flavor toast. No prompt path exists.
- **Lantern Moth** (×3): drifting glow. Purely visual.
- Two hidden bonus nooks off the path: fixed +10 gold each, first discovery only.

### 3.7 Post-arc state

- Quest completes when the guardian scene ends (`guardianMet = true`). Elder Rowan gains a post-quest acknowledgment flavor line (no return-trip step).
- Waystones become opt-in **pattern practice** spots (double-ACTION, the Mira precedent), rotating context with Mira's existing practice offer.
- Guardian, critters, and nooks behave as in §3.5/§3.6.

## 4. Rules (mechanics invariants)

1. The arch opens from **discovery count == 3**, evaluated from persisted flags — never from prompt answers, never from quest-acceptance state.
2. No wrong answer or skip ever removes a flag, reward, unlock, or progress.
3. All rewards fixed: pattern solve +5 gold; nooks +10 gold ×2; arc completion = Heartstone Keepsake + fixed 50 gold.
4. First-time and quest-relevant interactions are never altered by the post-purpose flavor layer (M1 rule, carried forward).
5. Critters and the sealed Mossgate are pure flavor targets: toast only, no prompt path.

## 5. Data / state model

All persistence rides existing machinery; **no save-schema version bump**:

| Data | Where | Default for old saves |
|---|---|---|
| Quest `mossheart-guardian` step | M3 quest registry save data | `not-started` |
| `waystone1Woken`, `waystone2Woken`, `waystone3Woken` | open `SaveState.questFlags` record (the `practiceSlimeDefeated` precedent) | `false` |
| `guardianMet` | same | `false` |
| `heartstone` keepsake | existing keepsake collection | absent |
| Player map + position | M2 save-your-map | n/a (old saves never visited) |

Quest step enum: `not-started → accepted → wake-waystones → enter-sanctum → complete`. Waystone progress is derived from the three flags (not a separate counter). `enter-sanctum` begins when the arch opens; `complete` when the guardian scene ends.

## 6. Systems integration map

- **Map:** `mossheart-ruins` in M2's map registry; own Tiled JSON; per-map collision config (M2 removes the hardcoded farm GIDs — consume that, do not re-hardcode); interaction targets from Tiled object layers (`npc`/`bonus` + `interactionId`) through the existing map-agnostic handler registry. **All interaction IDs are new; no existing ID is rewritten** (product rule 6).
- **Ground art:** approved `grass_a/b/c`, `path_dirt` 13-cell family, `water_a/b` + `water_shore` 13-cell family, composed **Wangset-aware from day one** (this is the integrated visual upgrade; the farm's deferred Wangset pass does not block us).
- **Curriculum:** one new template `patterns` in the existing engine, multiple-choice via the current prompt UI, read-aloud on Mage, adaptive floors per the `clamp(derived, floor, cap)` rule.
- **Dialogue:** M3 dialogue UI; guardian scene + Rowan lines defined as data, read-aloud reuse on Mage.
- **Compass:** `currentObjectiveTarget()` generalizes to nearest-un-woken waystone (§3.4); first true cross-map quest for M3's compass.
- **Audio:** `bgm-mossheart` loop + 4 SFX (waystone hum, puzzle chime, arch rumble, guardian wake). Placeholder-tier per current audio doctrine; final licensed pass remains parked.
- **Renderer:** zero WebGL-only features; the Canvas-renderer e2e path must exercise everything.

## 7. Edge cases (specified, not emergent)

1. **Ruins before quest:** allowed. Waystones discoverable; arch opens at three; guardian scene plays; quest completes. Talking to Rowan afterward auto-completes with a *"You found him already!"* variant line. Accepting the quest after pre-finding waystones auto-advances the step.
2. **Save/reload anywhere** (mid-zone, mid-scene): flags persist; the guardian scene never replays; reload lands in-map per M2.
3. **Wrong-answer loop** on a pattern puzzle: encouragement toast; waystone stays awake; puzzle re-offerable.
4. **Sealed Mossgate poke** (<3 woken): flavor line *"The stones are quiet."* No prompt.
5. **Mage profile:** every line read-aloud; pattern puzzles audio-first; compass + edge arrow carry all wayfinding (pre-reader proof).
6. **Post-arc returns:** guardian rotating flavor; waystone opt-in practice; critters unchanged.

## 8. Tuning parameters (starting values)

| Parameter | Start | Valid range | Watch metric |
|---|---|---|---|
| Waystones | 3 | 3–4 | Kid finds all three unaided |
| Hidden nooks | 2 × +10 gold | 1–3 | — |
| `patterns` Mage | floor 1, cap 3 | floor stays 1 | Wrong-rate at floor |
| `patterns` Ranger | floor 2, cap 5 | — | Streak growth |
| Entry → Mossgate walk | ~75 s @350 px/s | 60–90 s | Child impatience |
| Guardian lines | ≤4; ≤8 words Mage / ≤12 Ranger | — | Read-aloud length |
| Critters | 3 beetles + 3 moths | ≤8 total | Frame pacing |
| Arc reward | Keepsake + 50 gold | fixed only | — |
| Interactives | ≤40 targets | — | Per-frame allocs = 0 |

**`patterns` template definition** (new skill id `patterns`; 4-term sequence, one missing term, position varies; 3 options = correct + two plausible distractors such as ±step or off-by-one-term):

- **Level 1:** AB shape/color patterns; +1 number sequences within 20.
- **Level 2:** +2/+5/+10 skip-counting within 50; ABC patterns.
- **Level 3:** +3/+4 within 100; decreasing by 1 or 2.
- **Level 4:** decreasing by 5 or 10; doubling (2, 4, 8, 16).
- **Level 5:** ×2/×5 table sequences within 100.

Mage profile: floor 1, cap 3. Ranger profile: floor 2, cap 5. Difficulty derives per the existing adaptive rule (`1 + floor(streak/3)`, clamped to the template's floor/cap). Skips do not move difficulty.

## 9. Art & audio manifest (integrated visual upgrade)

Ground terrain reuses the approved kit (§6). New production assets below go through the **closed-loop generation → audit → verdict** pipeline and must reach APPROVED RUNTIME MASTER / NORMALIZED RUNTIME ASSET status **before map composition**; the map must not be composed from placeholders (per the environment-kit gate):

| Asset | Target | Notes |
|---|---|---|
| Ruin prop family: mossy pillar, broken pillar, mossy slab | 16×32 / 32×32 | One new prop family |
| Waystone, dormant + humming variants | 32×32 | Two cells, one manifest |
| Mossgate Arch | 64×64 | Sealed + open states |
| **Old Mossback** | 64×64 | Largest sprite in the game; escalate to `CHANGE TARGET SIZE` 96×96 only if 1× review finds him unreadable |
| Pebble Beetle | 16×16 | 2-frame waddle |
| Lantern Moth | 16×16 | 2-frame drift + glow |
| Heartstone keepsake icon | 16×16 | Inventory/keepsake UI |
| `bgm-mossheart` + 4 SFX | mp3 | Placeholder-tier acceptable at ship; licensed pass parked |

## 10. Acceptance criteria

**Unit (Vitest):** pattern generator (level bands, distractor plausibility, floor/cap clamping, adaptive integration); quest step transitions incl. pre-quest auto-advance; nearest-un-woken waystone targeting; flag defaults and save round-trip.

**E2e (new `mossheart-ruins` spec, Canvas renderer, recorder-reset doctrine):**
1. Travel farm → woods → ruins via the new exit.
2. Waystone discovery persists across reload.
3. **Arch opens at three discoveries with zero prompts answered** (product-invariant proof).
4. Wrong answer never un-wakes a waystone.
5. Guardian scene plays exactly once (not on re-entry, not after reload); keepsake granted.
6. Opt-in pattern practice works post-arc; first-time behavior unaffected.
7. Cross-map compass targets the ruins steps correctly (incl. edge arrow).
8. Mage read-aloud present on all new dialogue.

**Save compat:** v2 saves load with new flags defaulted; no migration runs; current saves do not remigrate.

**Evidence:** both profiles; iPad-like landscape viewport screenshots of the path, a waystone moment, the open arch, and the guardian scene. Browser evidence only — **no physical-iPad or child-validation claims**.

**Gates:** `npm run check` green; unit suite green (108 + new); full e2e green; changelog + CURRENT_STATE updated.

**Fun test:** the kid returns to the ruins unprompted — observed per `REAL_CHILD_PLAYTEST_GUIDE.md` when device testing resumes.

## 11. Out of scope (YAGNI wall)

Boss fight and all combat; new hero animation clips; production sprites for Rowan/critters/guardian beyond §9's manifest; day cycle; reading/science templates; armor/equipment integration; merchant/gold-sink mechanics. Each has its home in sub-projects B/C/D or the parking lot.

## 12. Notes for the sibling sub-projects

- **B (monsters + boss):** Old Mossback's *"When you are ready…"* tease is the boss on-ramp; the sanctum is the arena (a split arena map remains a cheap option once M2 transitions are proven in content).
- **C (battle animations):** nothing here adds clips; the boss encounter in B defines the unlock list against the armor/battle contract's deferred set.
- **D (hero/NPC sprites):** Elder Rowan joins the Phase 4 production queue behind Ranger and Mira; his bridge presentation in this milestone is intentional, not a gap.
