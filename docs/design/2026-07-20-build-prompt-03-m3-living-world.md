# Build Prompt 03 — M3: Living World (re-issued 2026-07-20)

This is the M3 build prompt for the Eldoria-v2 project, re-issued and verified against `main` @ `dfa56fd` (all file paths, symbol names, map coordinates, and test counts below were checked against the live repo on 2026-07-20). It supersedes any earlier copy of Prompt 03.

**How to use:** paste everything below the horizontal rule to the implementing agent (Codex) in one message, after it has completed its orientation report per the handoff prompt.

---

# Build Prompt 03 — M3: Living World (quest registry, dialogue UI, cross-map compass, Eldoria Village)

You are the implementing agent for **Eldoria-v2** (`Galashots/Eldoria-v2`), a kid-focused 2D learning-adventure (Phaser 4 + Vite + TypeScript, Tiled maps, 960×640 design canvas at `GAME_SCALE` 2, deployed to GitHub Pages, target iPad). Work in a real clone (the repo's `npm run check` includes a `git diff` gate). Create branch `world/living-world-m3` off current `main`, open a **draft PR with your first push**, and keep pushing as you go.

## Milestone goal

Make the world *alive*: a data-driven quest registry, a real dialogue UI with read-aloud, a cross-map objective compass (closing M2's documented gap: the objective banner shows farm text while the player stands in the woods), and a third map — **Eldoria Village** — with **Baker Pell** and the cross-map **Berry Order** quest. This milestone's APIs are consumed by the approved Mossheart Ruins (Zone #4) spec, so their shapes matter beyond this PR.

## Non-negotiable rules (violating any of these fails the task)

- **Product invariant:** learning never gates adventure. Wrong answers and skipped prompts never block movement, exploration, quest progress, rewards, or story. All rewards are fixed values (no randomness anywhere).
- **Save compatibility:** no save-schema version bump (`CURRENT_SAVE_VERSION` stays `2`). New persisted fields must be optional with graceful defaults for old saves (the `questFlags` open-record precedent).
- **Art/audio:** use only already-approved/committed art. Do NOT wire the `tile_village_shop_*` families or any other new art (the beautification program owns map integration). Do NOT add audio files — the village reuses `bgm-farm` as a documented placeholder (the woods does the same).
- **E2E flake doctrine (this repo has been burned three times):** never assert on fixed `waitForTimeout` durations or one-shot samples of transient state. Poll real browser state (position/flags/objects) with explicit generous timeouts (15–20s); hold keys until a *position poll* confirms displacement, never for fixed wall-clock durations.
- **`tsc --noEmit` does NOT cover `tests/`** — a syntax error in a spec passes typecheck and only fails at Playwright load. Run the specs before pushing.
- **No unrelated refactoring.** Mira's quest state machine (`src/systems/FarmQuestSystem.ts`) keeps working byte-for-byte behaviorally; you may register her quest *definitions* as data but must not change her logic, save fields, or outcomes.
- **Docs discipline (with the phase that lands each change):** update `docs/CHATGPT_CHANGELOG.md`, add a dated entry in `docs/changelog/`, refresh `docs/CURRENT_STATE.md`.
- **Evidence-first reporting:** every phase report includes the exact head SHA, full command outputs (pasted, not summarized), and any deviation from this prompt with reasons.

## Verified facts about the current code (main @ `dfa56fd`)

- Map registry: `src/data/maps.ts` — `MapId = 'farm' | 'wildbloom-woods'`, `MAP_REGISTRY`, `MapDefinition` (`tiledKey`, `jsonPath`, `displayName`, `tilesets`, `musicKey`, `spawns`, `defaultSpawn`, `collisionGids`), `resolveMapId`, `resolveSpawn`, `validateMapRegistry(registry, mapSummaries?, worldScale)`. Exits live as `type:"exit"` rect objects in each map's own JSON (properties `targetMap`/`targetSpawn`), NOT in the registry.
- `tests/unit/maps.test.ts` iterates `MAP_REGISTRY` and validates every registered map against its real committed JSON — **a new map is auto-covered once registered**, no test edits needed.
- Farm map (`public/maps/farm.json`): 30×20 tiles of 32px (960×640 map px = 1920×1280 world px). The dirt road is Ground GID `13` on rows 9–10, columns 2–29 (the east gate to the woods is at column 29, collision cleared there). The west border (column 0) is currently grass GID `9` on Ground and GID `4` (blocking) on Collision at rows 9–10. Existing exit object: `GateToWoods` rect x=928, y=288, w=32, h=64 (map px). Farm spawns: `default` {x:320,y:512}, `from-woods` {x:1760,y:640} (world px).
- `scripts/compose-terrain-proof-tileset.mjs` deterministically repaints farm.json's Ground layer (placeholder GIDs 1/2/3 → 9-13) and is idempotent over hand-set GID `13` cells and over object-layer edits — `npm run check` regenerates and requires a clean `git diff` on `public/maps/farm.json`. The M2 east gate was hand-authored exactly this way.
- Quest state today: `src/systems/FarmQuestSystem.ts` (Mira's three errands) persists via `SaveState.firstQuestStep` + open `questFlags?: Record<string, boolean>` (`SaveSystem.ts`, `CURRENT_SAVE_VERSION = 2`). Quest definitions live in `src/data/quests.ts` (`MIRA_FIRST_ERRAND` etc.). Objective text/marker: `FarmQuestSystem.currentObjective()` / `.currentObjectiveTarget(): InteractionId | null`, consumed by `WorldScene.refreshObjective()` / `.updateObjectiveMarker()` (bouncing chevron `objective-marker`) and `.updateObjectiveEdgeArrow()` (screen-edge arrow driven by `objectiveTargetPosition`).
- Interaction dispatch: `WorldScene.interactionHandlers: Record<InteractionId, ...>` keyed by stable ids from `src/data/interactions.ts` (`resolveInteractionId`, `getTiledProperty`). Tiled objects: `type` = `npc|bonus|enemy` (→ BonusContext `quest|farm|combat`), `name` = display label, property `interactionId` = stable id.
- Read-aloud lives in `WorldScene`: `readPromptAloud`, `stopPromptReadAloud`, `hasPromptReadAloudSupport`, `makeReadAloudText`, `activeUtterance` — SpeechSynthesis with rate 0.85, pitch 1.05, music ducking via `setMusicVolume(this.musicDuckedVolume)` / restore, cancel on scene PAUSE/SLEEP/shutdown.
- Post-purpose flavor: `src/data/flavor.ts` (`POST_PURPOSE_FLAVOR` line arrays, `PRACTICE_OFFER_SUFFIX`, `PRACTICE_OFFER_WINDOW_MS`), served via `WorldScene.nextFlavorLine` / `showFlavorWithPracticeOffer` / `tryConsumePracticeOffer`.
- NPC bridge presentation: `drawTargetMarkers()` draws a colored circle + floating label per target (quest=npc → blue `0x4488cc`, farm=bonus → green `0x55aa33`). Baker Pell ships with exactly this presentation (the Mira precedent).
- PreloadScene loads every registered map's JSON in a registry loop — **adding a map needs no PreloadScene change** (no new tileset image, no new music).
- The player's physics body is 72×72 world px — leave a clear tile of walking room in corridors (see `docs/MAP_AUTHORING.md`).
- Current test state: unit **116/116**, e2e **65/65**. E2E boot pattern: see `tests/multi-map.spec.ts` (`boot()` helper, `window.__ELDORIA_GAME__` scene reads, `tests/support/canvas.ts`).
- Save key pattern: `eldoria_v2_save_<profileId>`; the opening scene is skipped in tests via `eldoria_v2_opening_seen_<profileId>`.

## Phase plan

Four phases, **one commit each**, each independently green (`npm run check`, `npm run test:unit`, full `npx playwright test`) before moving on. If a phase goes red and you cannot explain it, stop and report — do not push red work silently.

---

## Phase 1 — Data-driven quest registry + generic quest-step persistence

**Goal:** new quests become pure data; quest steps persist generically. Zero runtime behavior change in this phase (nothing consumes the registry yet).

**Files:**

- Modify: `src/systems/SaveSystem.ts`
- Create: `src/data/questDefs.ts`
- Create: `src/systems/QuestSystem.ts`
- Create: `tests/unit/questDefs.test.ts`, `tests/unit/questSystem.test.ts`, `tests/unit/SaveSystem.test.ts` (no dedicated SaveSystem unit file exists today — save coverage lives in FarmQuestSystem.test.ts and e2e; create it)

**Changes:**

1. `SaveSystem.ts`:
   - Add to `SaveState`: `questSteps?: Record<string, string>;` (optional; absent in every existing save).
   - Add an `isStringRecord` guard (mirror `isBooleanRecord`) and accept `questSteps` in `isSaveState`: `(value.questSteps === undefined || isStringRecord(value.questSteps))`.
   - Do NOT bump `CURRENT_SAVE_VERSION`. Do NOT add a migration.
2. `src/data/questDefs.ts` — the registry. Use exactly these types:

   ```ts
   import type { MapId } from './maps';
   import type { InteractionId } from './interactions';

   export type DialogueLine = {
     speaker: string;
     text: string;
     /** Optional spoken form for read-aloud (symbol replacements etc.). */
     readAloudText?: string;
   };

   export type QuestObjectiveTarget = {
     map: MapId;
     target: InteractionId;
   };

   export type QuestDefinition = {
     id: string;
     name: string;
     /** 'registry' = generic QuestSystem state machine; 'farm-legacy' = FarmQuestSystem owns state (descriptor only). */
     engine: 'registry' | 'farm-legacy';
     giver: InteractionId;
     /** Ordered step ids; first is always 'not-started', last is always 'complete'. */
     steps: readonly string[];
     /** Objective banner text per step (functions receive derived progress). */
     objectives: Record<string, string | ((progress: number) => string)>;
     /** Where the objective marker should point per step; null = no marker. */
     objectiveTargets: Record<string, QuestObjectiveTarget | null>;
     /** Dialogue beats for registry-engine quests (e.g. 'offer' | 'reminder' | 'return'). */
     dialogue?: Record<string, DialogueLine[]>;
     rewards: { gold: number; item?: { key: string; name: string } };
   };

   export const QUEST_REGISTRY: Record<string, QuestDefinition>;

   export function getQuestDefinition(id: string): QuestDefinition;
   export function validateQuestRegistry(registry?: Record<string, QuestDefinition>): void;
   ```

   - `validateQuestRegistry()` throws with a specific message on: missing/empty id or name; steps not starting `'not-started'` / not ending `'complete'`; an objective key or objectiveTarget key not present in `steps`; an objectiveTarget whose `map` is not in `MAP_REGISTRY`; negative reward gold; `registry`-engine quests missing `dialogue` beats `offer` and `return`.
   - Register **one full registry-engine quest** — the Berry Order, exactly as specified in Phase 3 (define it now; it is consumed there) — and **three farm-legacy descriptor entries** for Mira's errands (`engine: 'farm-legacy'`, ids `mira-first-errand`, `mira-second-errand`, `mira-third-errand`, giver `'mira'`, objectives/targets mirroring `src/data/quests.ts`, all objectiveTargets `{ map: 'farm', ... }`). Descriptors exist so the Phase 4 compass reads every quest's objective target uniformly; they change no behavior.
3. `src/systems/QuestSystem.ts` — generic step + progress store for `registry`-engine quests:

   ```ts
   import type { SaveState } from './SaveSystem';

   export class QuestSystem {
     static fromSave(saved: SaveState | null): QuestSystem;
     step(questId: string): string;                 // defaults to 'not-started'
     isActive(questId: string): boolean;            // step is neither 'not-started' nor 'complete'
     isComplete(questId: string): boolean;
     setStep(questId: string, step: string): void;  // throws on unknown quest or step
     berriesCollected(): number;                    // 0..3, derived from questFlags booleans
     collectNextBerry(): number;                    // sets pellBerryOrderBerryN, returns new count; no-op at 3
     toSaveFields(): Pick<SaveState, 'questSteps'> & { questFlags: Record<string, boolean> };
   }
   ```

   - Berry progress rides the open `questFlags` record as three booleans — `pellBerryOrderBerry1`, `pellBerryOrderBerry2`, `pellBerryOrderBerry3` (the `miraThirdErrandSprout1Awakened` precedent). Absent flags = `false` for old saves.
   - `step()` validates against `QUEST_REGISTRY`; `fromSave` tolerates `questSteps` entries naming unknown quests/steps by ignoring them (never throws on load).
   - `toSaveFields()` returns only quests whose step is not `'not-started'` (keeps saves small) plus only the berry flags that are `true`.
4. Unit tests:
   - `questDefs.test.ts`: registry passes `validateQuestRegistry()`; each violation case above throws; Berry Order def has steps `['not-started','gathering','return-ready','complete']`.
   - `questSystem.test.ts`: defaults for a null save and for a v2 save without `questSteps`; accept → gather×3 → return-ready → complete transitions; `berriesCollected()` derivation; `collectNextBerry()` idempotence at 3; save round-trip (`toSaveFields` → `fromSave`); unknown quest/step in save data ignored on load; `setStep` throws on unknown ids.
   - Save validation: a v2 save without `questSteps` validates and loads unchanged; one with `questSteps` round-trips; one with a malformed `questSteps` (e.g. an array) is rejected to `null`.

**Verify:**

- `npm run typecheck` — exit 0
- `npm run test:unit` — 116 existing + your new cases, all green (report the new total)
- `npx playwright test` — full suite, 65/65 (no behavior change, so nothing new should fail)
- `npm run check` — exit 0

---

## Phase 2 — Eldoria Village map + farm west gate + travel

**Goal:** the third map exists and is walkable: farm ↔ village round trip with spawns, banners, collision, and save-your-map, using only already-approved art.

**Files:**

- Create: `public/maps/eldoria-village.json`
- Modify: `public/maps/farm.json` (west gate)
- Modify: `src/data/maps.ts`
- Modify: `src/data/interactions.ts`, `src/data/flavor.ts`
- Modify: `src/scenes/WorldScene.ts` (two flavor handler entries only)
- Create: `tests/village.spec.ts`

**Changes:**

1. `src/data/maps.ts`: add `'eldoria-village'` to the `MapId` union and this registry entry (world px = map px × 2):

   ```ts
   'eldoria-village': {
     id: 'eldoria-village',
     tiledKey: 'eldoria-village',
     jsonPath: 'maps/eldoria-village.json',
     displayName: 'Eldoria Village',
     tilesets: STANDARD_TILESETS,
     // Reusing the farm loop is the accepted placeholder (same as the woods);
     // a dedicated village track must be a real reviewed asset first.
     musicKey: 'bgm-farm',
     spawns: {
       // Two tiles west of the east gate (GateToFarm), so arriving from the
       // farm never lands inside the exit zone.
       'from-farm': { x: 1120, y: 448 }
     },
     defaultSpawn: 'from-farm',
     collisionGids: [3, 4]
   }
   ```

   Add farm spawn `'from-village': { x: 160, y: 640 }` (two tiles east of the new west gate, mirroring `from-woods`).
2. `public/maps/eldoria-village.json`: author a 20×14 map (32px tiles; 640×448 map px) per `docs/MAP_AUTHORING.md` and the `wildbloom-woods.json` reference:
   - Same tileset set and order as the woods map (placeholder structural tileset firstgid 1, `farm-terrain-proof` firstgid 9) so GIDs match `collisionGids: [3, 4]` and dirt path GID `13`.
   - Required layers: `Ground`, `Decor`, `Collision`, `Objects`.
   - Ground: grass (`9`/`10`) base; a dirt (`13`) path entering from the east gate at rows 6–7 (columns 10–19) leading to a small dirt plaza around map center.
   - Collision + border: solid border on all edges (GID `3`/`4` structures/fences) EXCEPT a two-tile gate gap on the east edge (column 19) at rows 6–7. A few interior clumps shaping the plaza, leaving the plaza and all corridors at least two tiles wide (72px body rule).
   - Objects layer (all coordinates map px):
     - `PlayerSpawn` point at (560, 224) (matches the registry spawn).
     - `Baker Pell`, type `npc`, at (288, 192), property `interactionId: 'baker-pell'`.
     - `Notice Board`, type `bonus`, at (224, 288), property `interactionId: 'village-notice-board'`.
     - `Village Well`, type `bonus`, at (384, 320), property `interactionId: 'village-well'`.
     - `GateToFarm`, type `exit`, rect x=608, y=192, w=32, h=64, properties `targetMap: 'farm'`, `targetSpawn: 'from-village'`.
3. `public/maps/farm.json` west gate (mirror the M2 east gate):
   - Ground layer: set row 9 col 0, row 9 col 1, row 10 col 0, row 10 col 1 to GID `13` (data indices 270, 271, 300, 301 in the 30-wide layer array) so the road reaches the west border.
   - Collision layer: set row 9 col 0 and row 10 col 0 (indices 270, 300) to `0` (clears the border at the road rows only).
   - Objects layer: add `GateToVillage`, type `exit`, rect x=0, y=288, w=32, h=64, properties `targetMap: 'eldoria-village'`, `targetSpawn: 'from-farm'`.
   - **Idempotence gate:** `npm run compose:terrain-proof && git diff --exit-code -- public/maps/farm.json public/assets/tilesets/farm-terrain-proof.png` must exit 0 after your edit (proves the deterministic repaint round-trips your hand-set cells, exactly as it did for the M2 east gate).
4. `src/data/interactions.ts`: extend the `InteractionId` union with `'baker-pell' | 'village-notice-board' | 'village-well'` (before `'generic-bonus'`; do not change the fallback table — all three ids arrive via explicit Tiled `interactionId` properties).
5. `src/data/flavor.ts`: add two line arrays (copy rules: warm, ≤8 words where possible, pre-reader friendly):

   ```ts
   'village-notice-board': [
     'The board lists odd jobs for helpers.',
     'A drawing of the farm is pinned here.',
     '"Lost: one oven mitt." — Pell'
   ],
   'village-well': [
     'The well water glitters deep down.',
     'You hear a soft plip. An echo says hi.',
     'The bucket is full of cool water.'
   ]
   ```

6. `WorldScene.interactionHandlers`: add `'village-notice-board': () => this.showToast(this.nextFlavorLine('village-notice-board'))` and the same shape for `'village-well'`. Add a placeholder `'baker-pell'` entry that toasts `'Baker Pell is kneading dough.'` for now — Phase 3 replaces it with the real dialogue (one line, clearly commented).
7. `tests/village.spec.ts` (mirror `tests/multi-map.spec.ts` patterns — poll scene state, never fixed waits):
   - Farm → village via the west gate: map becomes `eldoria-village`, player lands at the `from-farm` spawn (1120, 448), entry banner shows `Eldoria Village`.
   - Village → farm via GateToFarm: map becomes `farm`, player at `from-village` (160, 640).
   - Save on the village, reload: boots on the village (save-your-map).
   - Village border collision: hold a movement key into the border and poll `body.blocked` true (the woods tree-border test pattern — poll while the key is held, explicit 20s timeout).
   - Notice board + well: ACTION shows a flavor toast from the new arrays; no prompt opens.
   - Quest/marker integrity after travel (same assertions the multi-map spec makes for the woods).

**Verify:**

- `npm run compose:terrain-proof && git diff --exit-code -- public/maps/farm.json public/assets/tilesets/farm-terrain-proof.png` — exit 0
- `npm run test:unit` — green (registry validation auto-covers the new map; report totals)
- `npx playwright test` — full suite green including the new spec
- `npm run check` — exit 0
- Screenshots: the village plaza with Pell's marker, and the farm west gate.

---

## Phase 3 — Dialogue UI + Baker Pell's Berry Order quest

**Goal:** a reusable, data-driven dialogue UI with read-aloud, proven by the village's first quest.

**Files:**

- Create: `src/systems/speech.ts`
- Create: `src/presentation/DialogueBox.ts`
- Modify: `src/scenes/WorldScene.ts` (speech extraction, dialogue wiring, Pell handler, berry gathering, save wiring, objective banner)
- Modify: `src/data/flavor.ts` (Pell post-quest lines)
- Modify: `tests/unit/questSystem.test.ts` (flow-level cases if any gaps surfaced), new `tests/unit/dialogue.test.ts` if you add DialogueBox logic worth unit-testing (line paging state)
- Modify: `tests/village.spec.ts` (quest e2e below)

**Changes:**

1. `src/systems/speech.ts` — extract the speech machinery from `WorldScene` with **zero behavior change**:

   ```ts
   export type SpeechHooks = { onStart?: () => void; onEnd?: () => void };
   export type SpeechSupport = {
     supported(): boolean;
     /** Cancels any active utterance, then speaks (rate 0.85, pitch 1.05). */
     speak(text: string, hooks?: SpeechHooks): void;
     cancel(): void;
   };
   export function createSpeechSupport(): SpeechSupport;
   ```

   One shared active-utterance slot: `speak` cancels the previous utterance first; `cancel` restores via the same end semantics. `WorldScene.readPromptAloud` / `stopPromptReadAloud` delegate to it (keep the `'Read aloud is not available here.'` toast and the `makeReadAloudText` prompt formatting in WorldScene; keep the music duck/restore wiring on the scene side through the hooks). The existing scene PAUSE/SLEEP/shutdown cancel paths must cover dialogue speech too (they will, if they call `speech.cancel()`).
2. `src/presentation/DialogueBox.ts` — a reusable bottom dialogue panel:

   - API: `open(lines: DialogueLine[], opts?: { autoRead?: boolean; onClose?: () => void }): void`, `advance(): void`, `close(): void`, `isOpen(): boolean`.
   - Visuals (match the existing chrome): rounded panel via `drawRoundedPanelBackground` (dark body, gold border), bottom-center at `GAME_WIDTH / 2`, `GAME_HEIGHT - sy(64)`, size `GAME_WIDTH - sx(24)` × `sy(52)`, `setScrollFactor(0)`, depth 41 (above toasts at 40); speaker name tag top-left (`fpx(10)`, gold); body text `fpx(12)`, word-wrapped; a `▼ ACTION` continue hint bottom-right (`fpx(9)`); a read-aloud speaker button top-right using the existing `paintSpeakerIcon` pattern. All sizing through the existing `sx`/`sy`/`fpx` helpers — no raw pixel literals.
   - Input: pointerdown on the panel, or ACTION/Space/E, advances; on the last line it closes. Advancing cancels the current line's speech. Movement stays locked while open (WorldScene sets `this.busy = true` and resets the joystick on open, clears on close — mirror the `openBonusPrompt` flow).
   - Read-aloud: when `autoRead` is true, each line speaks on display (`line.readAloudText ?? line.text`). WorldScene passes `autoRead: profileId === 'grade2-mage'` (Mage is audio-first; Ranger is reader mode — no auto-read, but the speaker button replays the line on both profiles).
   - No per-frame work, no allocations in `advance`.
3. Berry Order definition (already registered in Phase 1) — fill in exactly:

   ```ts
   'pell-berry-order': {
     id: 'pell-berry-order',
     name: 'The Berry Order',
     engine: 'registry',
     giver: 'baker-pell',
     steps: ['not-started', 'gathering', 'return-ready', 'complete'],
     objectives: {
       'not-started': 'Optional: Visit Baker Pell in Eldoria Village.',
       gathering: (n: number) => `Pick sunberries at the farm crop patch (${n}/3).`,
       'return-ready': 'Bring the sunberries back to Baker Pell.',
       complete: 'The Berry Order complete. The village smells like pie.'
     },
     objectiveTargets: {
       'not-started': { map: 'eldoria-village', target: 'baker-pell' },
       gathering: { map: 'farm', target: 'crop-bonus' },
       'return-ready': { map: 'eldoria-village', target: 'baker-pell' },
       complete: null
     },
     dialogue: {
       offer: [
         { speaker: 'Baker Pell', text: "You must be the farm helper! I'm Baker Pell." },
         { speaker: 'Baker Pell', text: "I'm baking a pie, but my sunberries are all gone." },
         { speaker: 'Baker Pell', text: 'Could you pick 3 sunberries from your crop patch?' }
       ],
       reminder: [
         { speaker: 'Baker Pell', text: "Three sunberries from your farm's crop patch, please!" }
       ],
       return: [
         { speaker: 'Baker Pell', text: 'Oh my whiskers — perfect sunberries!' },
         { speaker: 'Baker Pell', text: 'Here: a slice of my famous pie. And gold for your trouble!' }
       ]
     },
     rewards: { gold: 20, item: { key: 'berryPie', name: "Pell's Berry Pie" } }
   }
   ```

   (`objectives.gathering` receives `berriesCollected()`. All player-facing copy gets a ChatGPT wording review before merge — flag it in the PR body, do not block on it.)
4. `WorldScene` quest wiring:
   - Construct `QuestSystem.fromSave(saved)` alongside `FarmQuestSystem.fromSave(saved)` — keep the field name `questSystem` (a private field like `farmQuest`; e2e polls it via the established `as unknown as` cast pattern). In `save()`, merge: `questFlags: { ...this.farmQuest.toSaveFields().questFlags, ...this.questSystem.toSaveFields().questFlags }` and add `...this.questSystem.toSaveFields()` for `questSteps`. (Check the actual current `save()` shape and merge minimally.)
   - Replace the Phase 2 placeholder `'baker-pell'` handler:
     - step `not-started` → open DialogueBox with `dialogue.offer`; on close, `setStep('gathering')`, `save()`, `refreshObjective()`.
     - step `gathering` → `dialogue.reminder` (no state change).
     - step `return-ready` → `dialogue.return`; on close: `setStep('complete')`, grant rewards through the same presentation path as `applyQuestOutcome` (gold +20 floating text, `Received: Pell's Berry Pie` emphasized text, big sparkle burst, `sfx-quest-complete`, toast `Quest Complete: The Berry Order\nReceived: Pell's Berry Pie`), `save()`, `refreshObjective()`. Reuse the existing outcome-application code rather than duplicating it — if that means widening `applyQuestOutcome`'s input type, do it minimally and say so in the report.
     - step `complete` → rotating flavor toast via a new `POST_PURPOSE_FLAVOR['baker-pell']` array: `['Baker Pell: The oven smells wonderful today.', 'Baker Pell: Next pie needs moonberries, I think.', 'Baker Pell: Best berries in Eldoria, yours!']`. No practice opt-in (the sprout precedent).
   - Berry gathering in `handleCropBonusInteraction`, with this exact precedence: (a) if Mira's crop purpose is NOT fulfilled, her existing behavior runs unchanged; (b) else if Berry Order is `gathering` and `berriesCollected() < 3`, gather instead of flavor/practice: `collectNextBerry()`, floating text `Sunberry ${n}/3` (gold color, same style as floating rewards), `sfx-interact` already played by `tryInteract`; when the third berry lands, `setStep('return-ready')`, toast `'Pell is waiting — back to the village!'`, `refreshObjective()`; `save()` after every gather; (c) else today's post-purpose flavor/practice path. No learning prompt ever opens from berry gathering.
   - Objective banner precedence in `refreshObjective()` (text only this phase; marker comes in Phase 4): active Berry Order (`gathering`/`return-ready`) → its objective text; else Mira chain incomplete → her current text (unchanged); else Berry Order `not-started` → its invite text; else Berry Order `complete` → its complete text. Marker behavior unchanged in this phase EXCEPT: when the active registry quest's target is on the current map, `updateObjectiveMarker` may point at it (both Berry Order target maps exist by now); when it is off-map, hide the marker (do not crash, do not point at a stale farm target). Document in the changelog that off-map guidance lands in Phase 4.
5. E2e (`tests/village.spec.ts`, same polling doctrine):
   - Dialogue opens on ACTION at Pell: speaker name `Baker Pell` visible; ACTION advances through all three offer lines; on close the step is `gathering` (poll the scene's quest state).
   - Mage auto-read: `page.addInitScript` wraps `window.speechSynthesis.speak` pushing utterance texts onto `window.__SPEECH_LOG__`; on the Mage profile the log contains the first offer line after the dialogue opens; on Ranger it stays empty until the speaker button is tapped.
   - Gathering: with the quest at `gathering` and Mira's crop purpose fulfilled (boot a save state or drive her chain — prefer driving state via existing test seams over long walkthroughs), ACTION on the crop patch three times yields `Sunberry 1/3`, `2/3`, `3/3` and the step becomes `return-ready`; **no bonus prompt opens from any gather**.
   - Return: dialogue `return` plays; on close gold increased by exactly 20 and inventory `berryPie === 1` (poll scene state).
   - Persistence: save + reload at `gathering` with 2 berries — step and count survive.
   - Precedence: with Berry Order active, the banner shows its text on both maps (poll `objectiveText`); with Mira's chain incomplete and Berry Order not started, her banner text is unchanged (existing specs already cover this — keep them green).
   - Mira's chain still completes end-to-end (existing suites cover; run them).

**Verify:**

- `npm run typecheck` / `npm run test:unit` / full `npx playwright test` — all green (report totals)
- `npm run check` — exit 0
- Screenshots: the dialogue box mid-line on both profiles, the `Sunberry 2/3` floating text, the completion toast.

---

## Phase 4 — Cross-map objective compass + docs

**Goal:** the objective banner, chevron, and edge arrow guide the player across maps; M2's documented farm-text-in-the-woods gap closes.

**Files:**

- Modify: `src/data/maps.ts` (next-hop routing)
- Create: `src/systems/objectiveGuidance.ts`
- Create: `tests/unit/objectiveGuidance.test.ts`
- Modify: `tests/unit/maps.test.ts` (route validation cases)
- Modify: `src/scenes/WorldScene.ts` (guidance wiring)
- Modify: `tests/village.spec.ts` + `tests/multi-map.spec.ts` (compass e2e)
- Docs: `docs/MAP_AUTHORING.md` (the new registry field), `docs/CURRENT_STATE.md`, `docs/CHATGPT_CHANGELOG.md`, `docs/changelog/2026-07-21-living-world.md` (one entry covering the milestone; date it to merge day)

**Changes:**

1. `src/data/maps.ts`: add to `MapDefinition` — `nextHop: Partial<Record<MapId, MapId>>` ("to reach map X from this map, take the exit to map Y"). Populate:
   - farm: `{ 'wildbloom-woods': 'wildbloom-woods', 'eldoria-village': 'eldoria-village' }`
   - 'wildbloom-woods': `{ farm: 'farm', 'eldoria-village': 'farm' }`
   - 'eldoria-village': `{ farm: 'farm', 'wildbloom-woods': 'farm' }`
   Extend validation (new exported `validateMapRoutes(registry, mapSummaries)`, exercised from the existing maps unit test against the **real committed JSONs**): every `nextHop` value must be a map the current map has a real exit to, AND must equal the first hop of a BFS over the real exit graph from that map to the key map. (The Zone #4 map will later add `'mossheart-ruins': 'wildbloom-woods'` to the farm/village tables — one line each, validated the same way.)
2. `src/systems/objectiveGuidance.ts` — pure, fully unit-tested:

   ```ts
   import type { MapId } from '../data/maps';
   import type { QuestObjectiveTarget } from '../data/questDefs';

   export type ObjectiveGuidance =
     | { kind: 'local'; target: QuestObjectiveTarget['target'] }
     | { kind: 'exit'; exitTo: MapId }
     | { kind: 'none' };

   export function resolveObjectiveGuidance(
     currentMap: MapId,
     objective: QuestObjectiveTarget | null
   ): ObjectiveGuidance;
   ```

   Rules: no objective → `none`; objective on the current map → `local`; otherwise look up `MAP_REGISTRY[currentMap].nextHop[objective.map]` → `exit` (hop found) or `none` (no route declared).
3. `WorldScene` wiring:
   - `refreshObjective()` computes `{ bannerText, objective }` from the Phase 3 precedence, then `resolveObjectiveGuidance(this.mapId, objective)`:
     - `local`: marker over the interaction target (today's behavior).
     - `exit`: marker over the **center of the exit rect** whose `targetMap === exitTo` (store exit centers when parsing in `makeExits`); the edge arrow works unchanged off `objectiveTargetPosition`. Banner keeps the quest's own objective text (it is already worded for anywhere: "Pick sunberries at the farm crop patch (0/3)").
     - `none`: marker and arrow hidden.
   - Mira-chain objectives wrap as `{ map: 'farm', target: this.farmQuest.currentObjectiveTarget() }` (null target → `none`, today's all-complete behavior). **The gap fix:** when guidance is `exit` for a Mira objective, prefix the banner: `Head back to The Farm — ` + her objective text. (From the woods, the player now gets correct wording AND an arrow at GateToFarm.)
   - Keep zero per-frame allocations: `updateObjectiveEdgeArrow` already runs per frame — resolve guidance only in `refreshObjective()` (quest-state changes), not per frame.
4. Unit tests (`objectiveGuidance.test.ts`): same-map → local; village→farm quest target → exit `farm`; village→woods target → exit `farm` (two-hop first leg); null → none; undeclared route → none. Maps test additions: `validateMapRoutes` passes on the real registry+JSONs; a table entry naming a non-exit target throws; a table entry contradicting BFS first-hop throws.
5. E2e:
   - Berry Order at `gathering`, player in the village: edge arrow renders pointing at GateToFarm (poll the `objective-edge-arrow` object's visibility + rotation roughly east), banner shows the gathering text. Walk to the farm: chevron sits over the crop patch.
   - Mira objective active, player in the woods: banner starts `Head back to The Farm — ` and the arrow points at GateToFarm (this is the regression proof for M2's documented gap — assert it explicitly).
   - Guidance survives save/reload mid-quest.
6. Docs (this phase): `MAP_AUTHORING.md` gains the `nextHop` field documentation; `CURRENT_STATE.md` gains the village, dialogue UI, quest registry, and compass (and loses the M2 known-gap sentence — it is fixed now); changelog entry per `AGENTS.md`.

**Verify:**

- `npm run test:unit` — green (report totals)
- full `npx playwright test` — green (report totals and runtime)
- `npm run check` — exit 0
- Screenshots: arrow-at-exit in the village during `gathering`; the `Head back to The Farm —` banner in the woods.

---

## Report back (per phase, in the PR body and to me)

1. Phase number, commit SHA(s), and one-sentence outcome.
2. Full pasted output of every verify command (no summaries), including unit/e2e totals.
3. The screenshots listed for the phase.
4. Anything you changed that deviates from this prompt, and why. If any prerequisite symbol or file named above does not exist as described, **stop and report instead of improvising**.

## Out of scope (do not build, do not "sneak in")

Elder Rowan and anything from the Mossheart Ruins spec (its prompts come later, written against YOUR landed symbols); the `tile_village_shop_*` art integration; any shop/gold-sink mechanics; new music or SFX; Mira state-machine refactors; practice opt-ins for Pell; STATS panel changes; anything touching PR #103 or the dependabot PRs.
