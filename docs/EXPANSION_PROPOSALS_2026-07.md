# Eldoria-V2 Expansion Proposals — July 2026

Audit refresh plus concrete proposals for quest/story expansion, world-building, and the visual path toward a Stardew-Valley-quality look. Synthesized from three parallel explorations (architecture, quest/story/guidance content, rendering/asset inventory) run on 2026-07-04.

This document is a **proposal for review**, per the checkpoint rules in `AGENTS.md`: story, quest, dialogue, naming, worldbuilding, and art-direction decisions belong to the user (and the ChatGPT review loop). Nothing here changes code, maps, saves, curriculum, or assets. It builds on `docs/AUDIT_AND_GAME_PLAN_2026-07.md` (the roadmap) and does not replace it.

---

## A. Audit refresh (delta since the 2026-07-02 audit)

### What has improved

Phase 1 (foundation hardening) from the July game plan is **done and verified** on `main`:

- Save migration seam (`migrateRawSave`, `CURRENT_SAVE_VERSION`) in `src/systems/SaveSystem.ts` — kids' saves survive future schema changes.
- Stable `interactionId` registry (`src/data/interactions.ts`) decoupled from Tiled display labels.
- Vitest unit layer covering `QuestionEngine`, `MasterySystem`, `LearningBonusSystem`, interactions, and templates.
- Renderer-independent `FarmQuestSystem`, profile-configured `HeroPresentationController`, Stats & Mastery panel, SpeechSynthesis GC fixes.

The engineering base is now genuinely ready to carry content. The bottleneck has fully shifted to **content, world, and presentation**.

### What still stands between the tech proof and a game

| Area | Current state | Gap |
| --- | --- | --- |
| Quests | 2 errands, hand-coded state machine | Quest #3 still requires editing `FarmQuestSystem.ts` + `WorldScene.ts` by hand |
| Story | ~8 Mira lines; one lore thread ("Eldoria's old magic", `src/data/quests.ts`) | No intro beat, no arc, no second character, thread never developed |
| Kid guidance | Objective banner, "Optional:" framing, READ ALOUD, no fail states | No journal to re-read; direction hints are text-only ("southwest of here"); no non-reading cue pointing to the active target |
| World | 1 farm map (30×20), 4 placed objects | `exit`/zone transition documented in `CONTENT_SCHEMA.md` but unimplemented; `WorldScene` hardcodes the `farm` map key |
| Economy | ~14 obtainable gold | Still no sink; gold is a number that only goes up |
| Environment art | 8 flat placeholder tiles (grass, dirt, water, tree, floor, house, door, sign) | All farm/village tile art is spec-only; the world *is* the placeholder |
| Atmosphere | None | No animated tiles, particles, lighting/tint, day/night, weather, or seasonal palettes |
| Audio | None (only SpeechSynthesis read-aloud) | Zero music and SFX — roughly half of the "Stardew feel" is missing by definition |
| UI | Flat rectangles, `system-ui` font, emoji icons | No pixel font, no 9-slice panels, no drawn icons |
| Grid | Map is 32×32 tiles | `docs/VISUAL_ASSET_CONTRACT.md` mandates 16×16 world grammar — must be resolved **before** producing tile art |
| Playtest | Guides written, sessions not yet run | Phase 0 (child clarity checkpoint) remains the cheapest next signal and should still happen first |

---

## B. Quest & story expansion (kid-clarity first)

### B1. Guidance contract — rules every future quest must follow

The current clarity mechanics are good but thin: one objective line, and if a child misses it there is nothing to fall back on. Proposed contract, ordered by importance:

1. **Exactly one active main objective at a time.** Optional errands keep the `Optional:` prefix. Never two "go here" instructions at once.
2. **Every objective has a non-reading cue.** The active target's on-world marker pulses gently (scale/alpha tween on the existing marker circles — no art needed). A Grade 2 child who cannot read the banner can still see *where the game is looking*. Consider a soft sparkle trail for the first errand only.
3. **One short sentence per objective, read-aloud capable.** Objectives route through the same SpeechSynthesis path as prompts, so the Grade 2 profile can tap the objective banner to hear it.
4. **A Quest Journal panel** (same overlay pattern as the Stats & Mastery panel in `WorldScene.ts`): current objective, done steps with checkmarks, and the quest giver's face/name. Lets a child who walked away re-read/re-hear what to do. One button, one panel, no nesting.
5. **NPC reminders always name a landmark, not a compass direction.** "Near the big tree by the water" beats "southwest of here" for a 7-year-old. Existing dialogue (`MIRA_FIRST_ERRAND.dialogue`) should migrate to landmark phrasing as maps get real art.
6. **Completion is loud and warm.** Keep the toast + sparkle; add a short jingle when audio lands (Section D4).
7. **Learning stays bonus-only.** Unchanged, non-negotiable.

### B2. Story spine — grow the seed that already exists

The Whispering Scarecrow already planted the hook: *"Maybe the farm is closer to Eldoria's old magic than I thought."* Proposal: make **"the old magic of Eldoria is waking up"** the spine of the whole game.

- Long ago, Eldoria's magic went to sleep in the land. It is waking gently — in crops, in creatures, in old objects.
- Every completed quest recovers a **charm** (Sunberry and Moonseed already exist). Charms are fragments of the waking magic.
- Charms collect on a visible **keepsake shelf** (extend the single keepsake slot in the Stats panel into a shelf grid) — a permanent, growing, non-purchasable record of adventures. This is the kid-visible progression the audit said was missing, and it costs no new systems, only data + one panel change.
- Tone rules: gentle mystery, never horror. Nothing in Eldoria is evil; things are *sleepy*, *lost*, *tangled*, or *mischievous*. No death, no peril a 7-year-old can fail at.
- The Grade 5 profile reads deeper into the *same* events (richer dialogue variants per profile — the quest data model in B4 supports per-profile dialogue text), which gives Grade 5 an identity without forking content.

### B3. Proposed quest arcs

**Act 1 — "The Waking Farm"** (current map, zero art dependency, can start immediately after the child playtest):

| # | Working title | Loop | Guidance beats | Curriculum tie (optional bonuses) |
| --- | --- | --- | --- | --- |
| 3 | Sprout Trouble | Mira asks the player to check three sleepy crop spots; interacting "wakes" each (marker pulse → sparkle) | Three pulsing markers, counted objective: "Wake 3 sleepy sprouts (2 left)" | Farm math (counting/addition), plant-growth science |
| 4 | The Slime Parade | Three colored Practice Slimes appear one at a time; each wants to "practice" | One marker at a time; slime hop feedback already exists | Combat subtraction, pattern/sorting |
| 5 | Mira's Lost Locket | Search three decor spots (tree, well, fence) for Mira's locket; wrong spots give warm hints | Pulsing markers narrow after each try; hint lines are landmark-based | ELA story-detail comprehension as optional clue bonuses |
| 6 | A Letter for the Village | Mira gives a letter to deliver; the path ends at a **closed village gate**; a gatekeeper sign says the gate opens "when the road wakes up" | Single marker at the gate; ends Act 1 on a cliffhanger that makes zone 2 a promise | Shop/quest addition; sets up trade/social studies |

Rewards: 1 charm each + small gold, keeping the existing 4–10 gold scale so the Act 2 shop prices stay meaningful.

**Act 2 — "Willowbrook Village"** (art-gated on the farm/village tileset; needs zone transitions from C3):

- **The gold sink:** a shop run by a shopkeeper NPC. Sells *cosmetic and comfort* items only (hat/cape overlays when equipment art lands, a pet follower, home decorations) — never learning advantages, so the bonus-only rule holds in reverse too: money can't buy learning outcomes.
- **Cast (3 NPCs):** shopkeeper (warm, businesslike), elder lorekeeper (tells old-magic stories — the lore delivery channel and the Grade 5 reading hook), and a kid friend (quest companion energy, gives the boys a peer in the world).
- **3–4 quests** using the subject-to-mechanic map in `docs/CURRICULUM_QUESTION_ENGINE.md`: a first-purchase shop tutorial quest (decimals/estimation for Grade 5, coin addition for Grade 2), a trade-delivery loop (social studies: goods and transportation), an elder story-quest (ELA evidence questions as optional "remember the tale" bonuses).

Final names, dialogue, and lore wording go through the user/ChatGPT review loop before implementation, per `AGENTS.md`.

### B4. Engineering enabler — quests as data

`FarmQuestSystem` hardcodes two quests with bespoke booleans; Act 1 needs four more. Before quest #3, generalize to a data-driven definition so new quests are content, not scene surgery:

```ts
type QuestDefinition = {
  id: string;
  name: string;
  giver: InteractionId;
  optional: boolean;
  steps: Array<{
    id: string;
    objective: string;                  // one short sentence, read-aloud capable
    target: InteractionId | InteractionId[];  // markers to pulse
    count?: number;                     // "wake 3 sprouts"
    dialogue?: Partial<Record<ProfileId, string>> & { default: string };
  }>;
  rewards: { gold: number; charm?: { key: string; name: string } };
};
```

- A single generic `QuestSystem` walks `steps[]`; per-quest flags live in the already-extensible `questFlags`.
- Mira's two existing errands become the first two entries in the new format (behavior-preserving port, protected by the existing unit tests + a save migration if `firstQuestStep` moves into generic state).
- The journal panel (B1.4) renders directly from this data.

---

## C. World-building

### C1. A one-page world bible (`docs/WORLD_BIBLE.md`)

Before more dialogue gets written, capture the canon in one short reviewed doc so every future quest/NPC/asset prompt pulls from the same source:

- **What Eldoria is:** a small, warm valley where old magic sleeps in the land and is gently waking.
- **Tone rules:** cozy > epic; sleepy/lost/mischievous > evil; every problem fixable by a kid; humor welcome.
- **Naming conventions:** soft, readable, two-syllable-friendly names (Mira, Willowbrook); nature + light imagery (Sunberry, Moonseed) — names a Grade 2 child can sound out.
- **Region map** (matches the sub-palettes already declared in `docs/VISUAL_ASSET_CONTRACT.md`):

| Zone | Palette family | Feel | Curriculum lean (bonuses only) |
| --- | --- | --- | --- |
| Farm (exists) | `forest` | Home base, safety | Math counting/add/sub, plant science |
| Willowbrook Village | `wood_leather` + `forest` | Warmth, people, shop | Money math, decimals, trade/social studies |
| Whisperwood Forest | `forest` (darker greens) | Gentle wonder, fireflies | Science: light/sound, materials, animals |
| The Old Ruins | `ruins` / `arcane` | Sleeping magic, discovery | Grade 5 ancient civilizations, symmetry/geometry |

- **NPC cast list** with one-line personalities (Mira the farmer-mentor + the Act 2 trio to start), so dialogue voice stays consistent across writing sessions.
- Written as a *proposal draft* for user/ChatGPT approval — the bible is canon only once approved.

### C2. World structure principle

One new zone per act, each zone small (roughly the farm's size), fully polished before the next opens — this is the repo's own pillar #1 ("one excellent vertical slice before expanding scope") applied to geography. A locked gate/blocked path is itself kid-legible worldbuilding: the world visibly promises more.

### C3. Engineering enabler — zone transitions

Implement the `ExitTown`/`exit` object convention already documented in `CONTENT_SCHEMA.md`:

- Parameterize `WorldScene` by map key (`init` data instead of the hardcoded `'farm'`), with per-map tileset/collision config in a small data table.
- An `exit` object carries `targetMap` + `targetSpawn` properties; touching it fades out (see D2) and restarts the scene with the new map.
- Save `currentMap` alongside the existing position fields (uses the migration seam; bump `CURRENT_SAVE_VERSION`).
- This is Phase 4 of the existing game plan; nothing in Act 1 blocks on it.

---

## D. Visual beauty roadmap — the Stardew direction

Stardew Valley's look is not mainly resolution or detail; it is (1) rich, *animated* environment tiles, (2) warm lighting that changes over time, (3) constant tiny motion (particles, sway), (4) a cohesive hand-drawn UI, and (5) audio doing half the atmospheric work. The gap inventory (Section A) maps exactly onto those five. Two tracks:

### D1. Track 1 — engine-level quick wins (zero new art, ranked by beauty-per-effort)

1. **Ambient tint + slow day/evening cycle.** Tween the camera/world tint through a gentle palette (morning gold → noon neutral → evening amber). A single `setTint`/overlay-rectangle approach over ~10 real minutes transforms the flat placeholder look for almost no code. Keep nights bright enough for kids — dusk, never dark.
2. **Particles.** Phaser particle emitters: drifting leaves across the farm, fireflies at dusk (pairs with #1), soft pollen motes near crops, and richer harvest/reward sparkles replacing the hand-tweened circles in `WorldScene.ts`.
3. **Animated water and foliage.** Add tile-animation frames to the tileset (Tiled supports per-tile animations; Phaser plays them). Even the placeholder water shimmering reads as "alive". Trees get a 2-frame sway.
4. **Drop shadows under actors.** A soft ellipse under hero/NPC/slime grounds every sprite instantly — the single cheapest "looks like a real game" trick.
5. **Pixel font.** Replace `system-ui` with a readable pixel webfont for HUD/dialogue (bundled locally, no CDN). Keep Grade 2 sizes generous; readability beats style if they conflict.
6. **9-slice parchment UI panels + drawn markers.** One small `ui` sheet (panel frame, button, arrow/`!` marker icons) replaces flat rectangles and the colored marker circles. This is technically Track 2 art but tiny, and it restyles every panel at once via a shared panel helper.
7. **Scene fade transitions** (title → world, future zone exits) — camera fade in/out, two lines each.

Items 1–4 and 7 need no asset decisions at all and could ship as one small "atmosphere" PR each without touching gameplay, saves, or curriculum.

### D2. Track 2 — art production (through the existing pipeline)

**Decision first: resolve the grid mismatch.** The visual contract mandates 16×16 world grammar; `farm.json` is 32×32. Recommendation: **rebuild the farm map on 16×16 before any tile art is generated**, so production tiles are drawn once at the contract size. This doubles map coordinate resolution (30×20@32 → 60×40@16), keeps the same world size, and only the collision GID list + object coordinates need porting. Doing this *after* tile art would mean redrawing.

Then, in order:

1. **Farm tileset** per `docs/visual-targets/FARM_VILLAGE_TILE_TARGETS.md` (grass variants, dirt path with edges/corners, tilled soil states, crop sprout/harvest overlays). This is the highest-impact art in the whole plan — it replaces ~95% of every visible frame.
2. **Crop growth stages** (sprout → growing → ready) — makes Sprout Trouble (quest #3) and future farming read visually, Stardew's core loop-legibility trick.
3. **Village set** (shop wall/door, sign) — unblocks Act 2.
4. **Grade 5 Ranger** — already the most-referenced pending item; follows the existing approval gate (identity + image prompt via ChatGPT review, then seed frame → idle/walk).
5. **UI/panel/icon sheet** (pairs with D1.6) and **building facades**.
6. Later: seasonal palette variants of the farm tileset (autumn/winter recolors are cheap once the base set exists and are the signature Stardew "the world changed" moment).

All of it flows through the proven manifest → normalize → validate pipeline; each asset gets its target spec first per the contract.

### D3. Audio (its own lever, currently at zero)

- One gentle looping track for the farm (and later one per zone), volume-ducked under read-aloud speech.
- Five SFX cover most of the feel: footstep patter, interact blip, reward chime, quest-complete jingle, UI tap.
- Must default to on but with a visible mute button (parent-friendly), and read-aloud always wins over music.
- Source: licensed kid-safe chiptune/acoustic loops or generated tracks — flag for user decision; add an `ATTRIBUTION.md` entry either way.

### D4. Proposed re-phasing (extends, does not replace, the existing game plan)

| Phase | Content | Gate |
| --- | --- | --- |
| 0 (unchanged) | Run the child playtests | User-run |
| 2a | Quest-as-data refactor (B4) + journal + guidance cues (B1) | None — pure code/data |
| 2b (parallel) | Atmosphere quick wins (D1.1–4, 7) | None |
| 2c (unchanged from old Phase 2) | Parameterized non-math templates | Curriculum review |
| 3a | Act 1 quests #3–6 + keepsake shelf + story spine | User/ChatGPT approval of B2/B3 wording |
| 3b (parallel art) | 16×16 map rebuild → farm tileset → crop stages; Ranger approval track | Art approval gates |
| 4 | Zone transitions (C3) + Willowbrook Village + shop + Act 2 | 3b village tiles |
| 5 | Audio pass (D3), pixel font + UI sheet (D1.5–6), seasonal variants | User decision on audio sourcing |

Each phase stays a small reviewed batch per the existing merge policy; the child playtest remains the very next step before any of it.

---

## E. Suggested immediate next steps

1. **Run Phase 0** (the child playtest, `docs/REAL_CHILD_PLAYTEST_GUIDE.md`) — unchanged, still first, and it will pressure-test the guidance assumptions in B1 against real kids.
2. Review/approve or edit **B2/B3** (story spine + Act 1 quest list) and **C1** (world bible outline) in the ChatGPT loop.
3. Approve the **16×16 map rebuild decision** (D2) before any tile art is generated.
4. Green-light **2a + 2b** as the first implementation batches — both are code-only, art-independent, and directly improve what the kids see and how clearly they're guided.
