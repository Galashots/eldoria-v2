# Eldoria-V2 Master Plan

**Status:** Active product and world-direction authority  
**Owner:** Leo Pinto  
**Last major revision:** 2026-07-21  
**Current implementation status:** [`CURRENT_STATE.md`](CURRENT_STATE.md)

This document defines what Eldoria-V2 is trying to become and how major product, world, progression, educational, and visual decisions should support that goal. It is intentionally stable. Volatile milestone status, active branches, and the next concrete tasks belong only in `docs/CURRENT_STATE.md`.

Repository execution rules, review separation, merge authority, and protected surfaces remain governed by [`AGENTS.md`](../AGENTS.md) and [`MULTI_MODEL_OPERATING_GUIDE.md`](MULTI_MODEL_OPERATING_GUIDE.md).

---

## 1. Product mission

Build a family-friendly fantasy RPG that Leo's children voluntarily choose during limited screen time because the heroes feel powerful, the world feels alive, exploration produces genuine curiosity, and every short session leaves visible permanent progress.

Learning strengthens play but never obstructs it.

Eldoria should compete for attention through quality, agency, mystery, relationships, discovery, beauty, and earned progress — never through compulsion.

### Healthy-return standard

The desired outcome is **healthy voluntary return**, not manipulative addiction.

Use:

- meaningful goals;
- deterministic rewards;
- visible world change;
- character relationships;
- mysteries and foreshadowing;
- mastery, collection, customization, and exploration;
- short sessions with satisfying closure and a clear reason to return.

Do not use:

- random loot or variable-ratio rewards;
- daily pressure, streak loss, or fear of missing out;
- countdown urgency unrelated to the fiction;
- energy systems;
- paid progression;
- artificial grind whose main purpose is extending play time;
- learning failure as a blocker to adventure.

---

## 2. Non-negotiable product invariants

1. **Learning never gates adventure.** Wrong answers and skipped prompts never block movement, exploration, quests, retries, story, or baseline rewards.
2. **Grade 2 remains audio-first.** A child who cannot yet read independently must be able to understand the next useful action.
3. **Grade 5 feels older and more capable.** The Ranger Explorer path should emphasize clues, tactics, evidence, fieldcraft, and autonomy rather than merely larger numbers.
4. **Rewards are deterministic.** Children should understand what they earned and why.
5. **Progress is durable.** A normal 8–15 minute session should create a remembered event, visible world change, relationship beat, discovery, unlock, or mastery result.
6. **Stable internal profile IDs are preserved.** Player-facing identity may improve without renaming save-critical IDs.
7. **The game remains iPad-first.** Touch, readability, performance, audio, orientation, and safe-area behavior are core product requirements.
8. **No unsupported validation claims.** Browser automation, emulation, physical-iPad testing, and child playtesting are separate evidence classes.

---

## 3. The two hero promises

Both profiles inhabit the same world and share the same central story. Their powers, presentation, language, and problem-solving identity should feel meaningfully different.

### Grade 2 Mage

The Mage promise is **friendly magical power and wonder**.

The player should experience:

- immediate spell feedback;
- simple, obvious touch actions;
- read-aloud dialogue and prompts;
- shorter sentences and sparse UI;
- magical sensing, charms, light, and gentle fantasy danger;
- secrets revealed through magic;
- frequent reassurance without condescension.

### Grade 5 Ranger Explorer

The Ranger promise is **competent exploration and fieldcraft**.

The player should experience:

- tracking, clues, observation, and map sense;
- archery and tactical feedback;
- richer dialogue and evidence-based choices;
- practical equipment and older-child competence;
- secrets revealed through noticing patterns and environmental evidence;
- stronger independence from adult coaching.

### Shared-story rule

Profile differences should enrich identity without forcing two incompatible games. Shared locations, quests, characters, saves, and world-state systems should remain data-driven wherever practical, with profile-aware presentation and ability seams layered on top.

---

## 4. Engagement architecture

### Moment-to-moment loop

```text
explore -> notice something interesting -> move/use an ability/interact -> receive immediate audiovisual response
```

Every important interaction should answer quickly:

- What happened?
- Why did it happen?
- What can I do next?

### Short-session loop

```text
clear objective -> surprise, relationship, challenge, or secret -> completion -> deterministic reward -> permanent progress -> next curiosity
```

A typical 8–15 minute session should contain:

- one understandable objective;
- one meaningful action or discovery;
- one satisfying completion beat;
- one durable result;
- one optional thread that makes returning appealing.

### Long-term loop

Long-term motivation should come from:

- places visibly recovering or evolving;
- NPC relationships and dialogue advancing;
- new routes connecting familiar areas;
- deterministic keepsakes and codex discoveries;
- hero outfits, tools, spells, tracking abilities, and traversal options;
- mysteries that connect zones;
- occasional return visits that reveal changed circumstances.

### Failure standard

Failure should create a clear retry idea, not confusion or shame. The player should retain movement, story access, baseline progression, and the ability to try again.

---

## 5. World-building framework

Every substantial zone should include:

1. a distinctive visual identity;
2. a distinct musical or ambient identity when production audio is available;
3. two or three landmarks readable without text;
4. at least one resident relationship;
5. one local problem that visibly changes when helped;
6. one optional secret or discovery;
7. one reason to return later;
8. profile-specific flavor or ability use;
9. one connection to the broader **old magic waking** story.

### Current world roles

#### The Farm

- emotional home base;
- Mira relationship;
- cultivation and first responsibilities;
- first old-magic awakenings;
- visible restoration and familiar landmarks;
- a safe place that becomes richer over time.

#### Wildbloom Woods

- mystery, tracking, sensing, and environmental storytelling;
- ancient natural magic;
- secrets, clues, and unusual creatures;
- stronger profile-specific ability use;
- changing routes or discoveries on return visits.

#### Eldoria Village

- people, trades, services, conversation, and community consequences;
- cross-map errands and relationships;
- future customization and equipment opportunities;
- visible responses to completed quests;
- a social contrast to the Farm and Woods.

### Expansion rule

Do not add a fourth major zone merely to increase map count. First make the existing three locations feel visually coherent, narratively connected, memorable, and worth revisiting.

A future zone such as Mossheart Ruins should add a new fantasy promise, new relationship or mystery value, and new player verbs — not only more ground to cross.

---

## 6. Visual north star

The owner-approved reference image defines the target for composition, perspective, layered depth, palette cohesion, material language, atmosphere, and environmental storytelling. It is a quality and direction reference, not redistributable production art.

The target is **painterly, layered, readable pixel art viewed from a consistent elevated three-quarter camera**.

### Translation into production requirements

1. **Composition**
   - readable paths and arrival framing;
   - intentional negative space around actors and interactables;
   - landmarks that support navigation without heavy text;
   - authored focal points rather than uniform tile coverage.

2. **Layered depth**
   - quiet ground plane;
   - mid-layer grass, flowers, stones, props, fences, crops, and shoreline details;
   - high border/canopy masses that frame the play space;
   - foreground overlap used sparingly and never at the expense of touch clarity.

3. **Dappled atmosphere**
   - restrained shadow and light decals;
   - localized glow and environmental motion;
   - no heavy full-screen shader dependency;
   - atmosphere applied once rather than baked inconsistently into every asset.

4. **Material cohesion**
   - shared palette families;
   - consistent upper-left lighting;
   - compatible outline weight and contrast;
   - one environmental perspective and scale language.

5. **Character grounding**
   - stable pivots and feet;
   - contact shadows;
   - readable silhouettes at exact runtime size;
   - character projection aligned with the environment.

6. **UI restraint**
   - one reusable fantasy skin;
   - world remains visible;
   - Grade 2 readability is protected;
   - touch targets remain obvious and comfortable.

### Ground-versus-Decor doctrine

Terrain transition families solve hard ground boundaries. They are necessary, but they do not create the painterly reference look by themselves.

The reference's richness comes primarily from:

- deterministic but art-directed Decor scatter;
- flora variation;
- canopy and border silhouettes;
- props and landmarks;
- dappled light and shadow;
- coherent character/environment perspective;
- authored composition.

Do not respond to a flat scene by endlessly adding terrain variants when the missing layer is Decor, structure, canopy, atmosphere, or composition.

---

## 7. Character-perspective and sprite direction

All production characters, NPCs, creatures, equipment, armor, and carried weapons must share the elevated three-quarter projection of the environments.

The current direct-to-camera downward facings are transitional and should not define future production art.

The binding projection and sprite-rebuild contract is:

[`visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md)

### Sequencing rule

Lock perspective, proportions, pivots, and base animation timing before producing substantial armor, outfit, or weapon-overlay families. Do not build expensive customization layers against sprite bases already scheduled for replacement.

---

## 8. Progression and rewards

Progression should make the children feel increasingly capable and connected to the world.

Prefer:

- deterministic equipment and appearance unlocks;
- spell or tracking upgrades that open new interactions;
- world-restoration milestones;
- keepsakes tied to memorable events;
- codex discoveries with useful or story-rich information;
- relationships that unlock dialogue, services, or small world changes;
- mastery feedback that supports confidence without punishing mistakes.

Avoid rewards that are numerically larger but visually or behaviorally meaningless.

Every major reward should answer at least one of these:

- Does the hero look different?
- Can the hero do something new?
- Did the world change?
- Did a relationship advance?
- Did the player discover something memorable?

---

## 9. Curriculum integration

Learning should feel like an RPG action, clue, crafting decision, tactical choice, conversation insight, environmental observation, or bonus opportunity.

Use the existing curriculum and question-engine authorities for exact grade, subject, skill, mastery, and prompt rules.

Long-term integration should favor:

- contextual prompts rather than detached worksheets;
- stealth assessment through normal actions where appropriate;
- explanations and hints that preserve momentum;
- profile-appropriate reading load;
- permanent progress in every ordinary session;
- parent-facing summaries only from local, privacy-preserving data unless the owner approves otherwise.

---

## 10. Experience scorecard

Major milestones should be judged against player outcomes, not only file completion.

### First-minute scorecard

- fantasy promise is visible immediately;
- profile selection feels like choosing a hero;
- the next useful action is understandable with no more than one adult prompt;
- movement and ability feedback feel responsive;
- text and audio match the selected profile;
- at least one curiosity is visible before the opening minute ends.

### Zone scorecard

- the location can be recognized from a screenshot without its name;
- navigation works through landmarks and path hierarchy;
- the zone has a resident, problem, secret, and return reason;
- helping produces visible or remembered change;
- the zone contributes to the old-magic story;
- Mage and Ranger identities both have meaningful expression.

### Session scorecard

- the child can name what they accomplished;
- the child can identify a near-term next goal;
- the session produced durable progress;
- mistakes did not halt adventure;
- the child remembers a character, landmark, secret, or unresolved question;
- the child voluntarily continues or later asks to return.

Automated tests cannot prove the final two points. Physical child playtesting remains the authority for those claims.

---

## 11. Roadmap framework

Current milestone status belongs in `CURRENT_STATE.md`. Unless new evidence changes the order, the strategic sequence is:

1. **Finish the layered Farm foundation**
   - deterministic scatter primitive;
   - approved grass-scatter masters;
   - vegetation, fences, props, pond details, crops, structures, canopy/border massing;
   - restrained light and shadow treatment.

2. **Recompose the Farm against the visual north star**
   - arrival glade;
   - Mira path area;
   - pond landmark;
   - Practice Slime meadow;
   - crop area;
   - Wildbloom discoveries;
   - same-camera before/after evidence and a reference-alignment scorecard.

3. **Rebuild production character families**
   - perspective lock first;
   - Mage, Ranger Explorer, Mira, core NPCs, and creatures;
   - freeze base clips before customization production.

4. **Apply the reusable fantasy UI system**
   - objective, prompt, stats, action, settings, markers, and reward presentation;
   - preserve world visibility and Grade 2 clarity.

5. **Add atmosphere and delight**
   - selected foliage motion;
   - water shimmer;
   - localized magic and impact light;
   - restrained particles and camera feedback;
   - reduced-motion and performance validation.

6. **Create world cohesion across the three existing maps**
   - extend the approved visual language to Wildbloom Woods and Eldoria Village;
   - give each location distinct landmarks, palette accents, residents, and persistent-change opportunities;
   - replace placeholder music and bridge art through approved asset milestones.

7. **Physical iPad and child evidence loop**
   - real Safari touch, audio, safe area, performance, memory, and readability;
   - observe first-session comprehension, voluntary continuation, remembered goals, and confusion points;
   - choose subsequent world, quest, or system work from evidence rather than anticipation.

8. **Expand the world only after cohesion**
   - new zones must add new player verbs, story value, and return loops;
   - avoid content-volume expansion that leaves existing areas visually or socially unfinished.

---

## 12. Completion standard

Eldoria's first complete family build is not defined by a fixed number of maps or quests. It is complete enough for regular family play when:

- both children can start, navigate, understand, and make progress on iPad;
- both hero identities feel distinct and aspirational;
- the Farm, Woods, and Village feel like one coherent world with distinct local identities;
- the visual presentation aligns with the approved reference direction;
- production characters share the environment's projection;
- sessions reliably create satisfying permanent progress;
- learning is contextual, helpful, and never blocking;
- saves are dependable;
- performance and touch behavior are physically verified;
- the children demonstrate remembered goals and voluntary return;
- no manipulative retention system is required to sustain interest.
