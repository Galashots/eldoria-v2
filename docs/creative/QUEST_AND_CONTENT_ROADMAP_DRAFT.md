# Realm of Eldoria — Quest and Content Roadmap

**Status:** Creative Director recommended draft  
**Companion document:** `ELDORIA_CREATIVE_BIBLE_DRAFT.md`  
**Scope:** A reviewable bridge from story direction to later engineering and asset-production slices  
**Out of scope:** Runtime code, save migration, current quest rewrites, visual-target geometry, credentials, and PixelLab integration

## 1. The production strategy

Eldoria should not build four thin acts. It should build one excellent first chapter in the existing Farm, Wildbloom Woods, and Eldoria Village, then expand only when the first chapter proves:

- the two hero fantasies;
- one satisfying 10–15 minute episode;
- one relationship that changes;
- one visible world repair;
- one optional learning advantage;
- one secret worth discussing;
- one deterministic companion invitation;
- one compelling next question.

The immediate narrative production target is therefore **Chapter I: A Song Under the Soil**, layered over the current playable content without breaking saves or renaming current quests.

## 2. Quest episode contract

Every ordinary episode should fit one short session and contain:

1. **Hook** — a person, place, creature, or object presents an understandable change.
2. **Plain objective** — one sentence, available in profile-appropriate text and read-aloud form.
3. **Three to five playable steps** — movement, collection, observation, conversation, combat, crafting, or restoration.
4. **Profile expression** — the Mage and Ranger Explorer each get an equally competent presentation or optional method.
5. **Optional learning lever** — contextual, skippable, recoverable, and never required.
6. **Completion beat** — clear audiovisual acknowledgement.
7. **Deterministic reward** — baseline progress always arrives.
8. **World memory** — a persistent visual, relationship, service, route, codex, or ability change.
9. **Return thread** — curiosity, not urgency.

### Fifteen-minute pacing target

| Beat | Target | Purpose |
| --- | ---: | --- |
| Hook and objective | 1–2 min | Establish desire and clarity. |
| First action | 2–4 min | Build confidence with a familiar verb. |
| Twist or discovery | 2–3 min | Add surprise, choice, or profile flavor. |
| Resolution action | 3–4 min | Recombine the episode's verbs. |
| Reward and world change | 1–2 min | Make progress legible and memorable. |
| Next curiosity | under 1 min | Invite return without pressure. |

These are authoring targets, not countdowns shown to a child.

## 3. Learning integration contract

### Baseline path

The player can always:

- continue the story;
- complete the quest;
- receive the baseline reward;
- move and explore;
- retry after mistakes;
- skip a prompt.

### Learning advantage

An optional learning action may grant one deterministic advantage:

- extra ordinary currency;
- an additional known ingredient;
- a shorter safe route;
- a clearer clue;
- a cosmetic flourish;
- a temporary tactical edge;
- richer codex context;
- a relationship reaction;
- faster completion of a non-blocking task.

No rare roll, mystery multiplier, streak, or “perfect answer” pressure follows the choice.

### Stealth-evidence preference

Prefer evidence from play:

- repair a fence with a suitable number of boards;
- organize ingredients in recipe order;
- choose a route based on a map;
- compare tracks;
- identify a material suited to rain;
- divide supplies fairly;
- infer which witness account fits the evidence.

Use explicit question panels when they are the clearest accessible interaction, not as the default shape of every learning moment.

## 4. Quest definition model

This is a content contract for later engineering design, not an instruction to paste a global object into `index.html`.

Definitions should be immutable, typed data. Runtime progress should be stored separately and migrated only under an explicitly approved save scope.

```ts
type QuestDefinition = {
  id: string;
  version: number;
  chapterId: string;
  sequence: number;
  title: string;
  giverNpcId?: string;
  prerequisiteIds: string[];
  locationIds: string[];
  presentation: {
    mage: ProfileQuestPresentation;
    ranger: ProfileQuestPresentation;
  };
  steps: QuestStepDefinition[];
  optionalBranches: QuestBranchDefinition[];
  learningOpportunities: LearningOpportunityDefinition[];
  rewards: {
    baseline: DeterministicReward[];
    optionalBonuses: DeterministicReward[];
  };
  worldChanges: WorldChangeDefinition[];
  relationshipChanges: RelationshipChangeDefinition[];
  dialogueScriptIds: string[];
  assetTargetIds: string[];
  curriculumTags: CurriculumTag[];
  accessibility: {
    readAloudRequired: boolean;
    visualCueRequired: boolean;
    colorIndependentCueRequired: boolean;
  };
};

type QuestProgress = {
  questId: string;
  status: "locked" | "available" | "active" | "complete";
  activeStepId?: string;
  counters: Record<string, number>;
  completedBranchIds: string[];
};
```

### Required authoring fields

Before a quest is ready for engineering, its brief must state:

- fiction goal;
- mechanic goal;
- player-visible objective;
- current locations and interaction dependencies;
- Mage treatment;
- Ranger Explorer treatment;
- baseline path;
- optional learning advantage;
- mistake recovery;
- deterministic rewards;
- persistent world change;
- relationship beat;
- curriculum and stealth-evidence tags;
- dialogue and audio needs;
- asset dependencies;
- save impact;
- acceptance evidence.

## 5. Chapter I quest spine

This spine preserves current quests. Proposed bridge episodes are new working titles and must receive scoped implementation briefs before code changes.

| Order | Episode | Status | Dramatic function | World memory |
| ---: | --- | --- | --- | --- |
| 0 | Waking Gate | Existing | Establish hero fantasy and first mystery. | Gate has answered the chosen hero. |
| 1 | Mira's Errands I–III | Existing | Build trust through useful Farm work. | Farm rhythm, trade, and relationship progress. |
| 2 | Whispering Scarecrow | Existing | Prove that old magic is funny, strange, and connected to ordinary things. | Post-purpose Scarecrow dialogue and clue memory. |
| 3 | Sleepy Sprouts | Existing | Turn cultivation into magical discovery. | Wildbloom Sprig earned. |
| 4 | The Sprig's Three Notes | Existing optional loop | Root-Star, Moonwell, and Foxfire establish the mystery grammar. | Three persistent named landmarks. |
| 5 | Baker Pell's Berry Order | Existing | Connect Farm work to Village care and food. | Pell relationship and Village response. |
| 6 | Lanterns on the Woodland Road | Proposed | A shared route begins reacting to the three notes. The hero helps residents make it welcoming rather than “unlocking” travel. | New lights, safe resting point, changed NPC routine. |
| 7 | A Guest Made of Steam | Proposed | Introduce the first visible Dumpling invitation and Buddy friendship. | Exact companion lives at a known home spot. |
| 8 | The Note That Wandered | Proposed | Follow one magical disturbance across all three maps using profile-specific evidence. | Route and landmark state changes. |
| 9 | A Song Under the Soil | Proposed chapter finale | Bring residents, discoveries, and the first Buddy together; resolve a local imbalance and hear a Rootsong phrase. | Public place restored; relationship dialogue advances; next mystery appears. |

### Chapter I scope guard

The first production pass needs only one proposed bridge episode plus the first Dumpling invitation, not all four proposed episodes at once. Playtest that pair before commissioning the complete chapter-finale asset set.

## 6. Example episode brief

### A Guest Made of Steam

**Status:** Proposed vertical-slice companion proof

**Fiction goal:** A tiny warm creature has left floury footprints near a place where the Rootsong hums. Learn what would make it feel safe enough to appear.

**Shared actions:**

1. Notice three signs in Farm, Village, and Woods.
2. Ask Mira and Baker Pell what the signs might mean.
3. Gather a known grain, fragrant herb, and clean water.
4. Prepare a simple invitation.
5. Place it at the revealed home spot.
6. Meet and befriend the exact named Dumpling.

**Mage expression:**

- hears each sign as one note;
- matches the three invitation steps through sound, shape, and color-independent symbols;
- uses a gentle warming spell during the reveal.

**Ranger Explorer expression:**

- distinguishes flour prints from pollen and pale soil;
- compares evidence from the three locations;
- estimates a practical ingredient quantity or heat range.

**Baseline path:** Mira and Pell give direct hints after exploration. The invitation always succeeds when the known ingredients are placed.

**Optional learning advantages:** One contextual prompt may add a decorative garnish and a richer first codex note. Skipping or answering incorrectly changes neither friendship nor the Buddy Trick.

**Deterministic reward:** The named Dumpling companion, its known Buddy Trick, a codex entry, and a permanent home animation.

**World memory:** The companion appears at its home between adventures; Pell adds a small matching bakery display; Mira gains one new line.

**Required assets:**

- one approved Dumpling base design and minimal idle/reaction clips;
- three small clue props or effects;
- one invitation dish;
- one home marker or nest;
- one reveal effect;
- one codex portrait.

**Explicit exclusions:** No gacha animation, sealed product, duplicate, rarity color, pity counter, premium currency, or real-time wait.

## 7. Dialogue production template

Each episode should ship a small script packet:

```text
SCENE ID
Speaker
Shared dramatic intent

MAGE
- spoken/read-aloud line
- short on-screen summary
- response choices, if any

RANGER EXPLORER
- richer line
- evidence or planning option
- response choices, if any

OBJECTIVE
- one plain sentence

RECOVERY
- hint after hesitation
- response after mistake

RETURN
- post-completion line
- later ambient line
```

Dialogue budgets should be tested at the supported tablet viewport. Longer lore belongs in optional codex pages or follow-up conversation, not inside a required objective handoff.

## 8. World content matrix

Before adding Mossheart Ruins, the current zones should reach this minimum:

| Zone | Landmark trio | Resident relationship | Visible problem | Optional secret | Return reason | Rootsong role |
| --- | --- | --- | --- | --- | --- | --- |
| Farm | Farmhouse/arrival glade; cultivation clearing; pond or Moonwell edge | Mira | Neglected rhythm and strange growth | Root-Star, Moonwell, Foxfire loop | Crops, home growth, Dumpling home, changed magic | First notes wake beneath ordinary work. |
| Wildbloom Woods | Threshold; branching trail; ancient clearing | One recurring resident still to approve | Routes and creatures responding out of rhythm | Profile-specific tracking/sensing discovery | New paths, ingredients, resident story, deeper clues | Living systems carry and alter the song. |
| Eldoria Village | Square; Mira-linked trade point; Pell's Ovenhouse | Baker Pell plus one future recurring resident | Services and people affected by disconnected notes | Social or architectural history clue | Relationships, recipes, crafting, exhibitions | Shared work turns separate notes into community memory. |

The exact map composition and asset geometry remain governed by current visual and Tiled authorities.

## 9. Funded asset-pipeline priorities

This is narrative priority, not a replacement for the binding visual target, perspective, palette, manifest, and audit order.

### Gate A — Character projection lock

Finish and approve:

1. Mage four-direction idle perspective proof;
2. Ranger Explorer matching perspective proof;
3. Mira matching NPC proportion/perspective proof;
4. shared pivot, contact-shadow, and scale evidence.

Do not commission large outfit, armor, weapon, or animation families before this gate closes.

### Gate B — Chapter I identity set

Produce only after the relevant targets exist:

- Mage and Ranger Explorer core movement/action identity;
- Mira production NPC family;
- Baker Pell production NPC family;
- first Squishy Dumpling and home behavior;
- Practice Slime continuity check against the final character projection;
- profile-specific reveal effects that preserve the Wildbloom identities.

### Gate C — Existing-zone narrative landmarks

Prioritize assets that support multiple scenes and quests:

- Farmhouse exterior and Farm arrival composition;
- Mira's trade point;
- Baker Pell's Ovenhouse;
- Farm cultivation and pond/Moonwell set dressing;
- Wildbloom threshold and ancient clearing;
- Village square and market dressing;
- the three existing discovery landmarks;
- woodland-road lights/rest point;
- first Dumpling invitation and home props.

### Gate D — Chapter I action and expression

- hero ability clips required by actual quests;
- NPC talk/work reactions;
- companion idle, follow, celebrate, and Buddy Trick;
- deterministic repair-state variants;
- quest-specific clue props and effects;
- codex portraits and keepsake icons.

### Gate E — Future expansion

Only after the first companion quest and Chapter I bridge episode pass browser, device, and child-clarity tests:

- additional Dumplings;
- seasonal state families;
- Mossheart concept exploration;
- ruin tiles, structures, Warden, and memory-state effects;
- advanced outfits and equipment.

## 10. Asset ledger for any external generator

Every externally generated candidate should have a repository-safe record:

| Field | Purpose |
| --- | --- |
| target ID | Links the candidate to authoritative geometry and use. |
| narrative role | Explains what player memory or quest beat it serves. |
| production class | Anchor, derived, or procedural under the current workflow. |
| target document/version | Prevents generation against stale constraints. |
| prompt version | Makes iteration reviewable. |
| provider and job ID | Provenance without storing credentials. |
| seed/reference IDs when available | Supports controlled variants. |
| source candidate hash | Identifies exact reviewed source. |
| audit verdict | Uses the formal asset-status vocabulary. |
| runtime manifest/output | Links approved source to normalized pixels. |
| integration PR | Links the asset to actual use and evidence. |

API keys, account details, private source images, and provider credentials never belong in the public repository.

## 11. AI collaboration workflow

This draft PR should be the single coordination surface for the creative reconciliation.

### Creative Director / ChatGPT

- owns story, lore, names, quest fiction, reward direction, kid experience, asset narrative priority, prompts, and visual approval;
- records recommended decisions and clearly marks unresolved owner choices;
- reviews future content briefs for continuity.

### Claude Code / engineering owner

- reviews the draft against current code, maps, IDs, and architecture;
- identifies implementation seams and save-risk before any quest-engine work;
- converts one approved episode at a time into a narrow technical plan;
- implements only after scope and dependencies are approved;
- provides exact-head tests and browser evidence.

### Gemini or another adviser

- may critique structure, curriculum coverage, economy, or content gaps;
- submits comments or proposed patches against this coordination surface;
- does not self-label proposals as approved canon;
- treats repository authorities and recorded owner decisions as binding.

### Review order

1. Creative continuity and child-trust review.
2. Owner decisions on the open canon choices.
3. Independent codebase feasibility review.
4. Merge the docs-only reconciliation after exact-head CI.
5. Open separate, narrow implementation or asset PRs.

Do not mix story-bible approval, save migration, quest-engine architecture, and art integration into one implementation branch.

## 12. Twelve-month content horizon

This is a dependency horizon, not a date promise.

### Horizon 1 — Make the first world lovable

- finish Farm visual foundation and character perspective;
- reconcile Chapter I continuity;
- productionize Mira and Pell;
- implement one bridge episode;
- implement the first deterministic Dumpling invitation;
- playtest both profiles on a physical tablet and with children;
- revise objective clarity and session pacing.

### Horizon 2 — Make the first world deepen

- relationship level-two scenes;
- changed-state returns across all three zones;
- two additional Dumplings;
- stronger stealth-evidence interactions;
- codex and keepsake presentation;
- one always-available request-board proof without real-world cadence.

### Horizon 3 — Earn the fourth zone

- confirm the first three zones pass their scorecards;
- prototype the unique Mossheart verb before final art;
- write its resident, problem, secret, return reason, and Rootsong revelation;
- commission only the art needed for one playable ruin episode;
- validate the episode before scaling the zone.

### Horizon 4 — Build toward accord

- complete Chapter III relationship and history choices;
- transform earlier zones in response;
- produce the Heartroot reveal from established visual motifs;
- deliver a finale with equivalent Mage and Ranger approaches;
- open post-story relationship, Dumpling, codex, cooking, and restoration goals.

## 13. Decision queue

### Ready for owner review

- Rootsong / Heartroot / Accord Keepers naming;
- role identities versus fixed hero names;
- sibling relationship;
- eighteen as a target or ceiling;
- first Dumpling theme and name;
- Mira/Pell service boundaries.

### Ready for engineering feasibility review after creative approval

- typed quest-definition boundary;
- immutable definition versus runtime progress split;
- event hooks for persistent world changes;
- dialogue script storage;
- asset target references;
- one episode's exact save impact.

### Ready for art exploration after current perspective gate

- first Dumpling silhouette trio;
- Baker Pell silhouette;
- woodland-road lighting landmark;
- Farm invitation-home prop;
- Rootsong effect language derived from Root-Star, Moonwell, and Foxfire.

### Explicitly deferred

- fourth-zone production;
- eighteen-companion full production;
- armor families;
- cloud telemetry or student-data services;
- commerce;
- accounts;
- daily events;
- save-schema changes;
- generic procedural quest generation.

## 14. Definition of “awesome” for this roadmap

The roadmap succeeds when a child can finish Chapter I and excitedly explain:

- who they helped;
- what changed in the Farm, Woods, or Village;
- how their chosen hero solved something in a special way;
- which strange clue they still wonder about;
- why their first Dumpling chose to stay;
- what they want to do next.

Feature count is not the test. Remembered people, places, powers, and mysteries are.
