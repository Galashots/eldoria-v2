# Practice Slime Combat & Profile Ability Loop — July 2026

## Decision

The next milestone is a **small Practice Slime combat slice**, not quest #4 and not the hidden-secret system yet.

The Waking Gate now teaches the player that Mage magic and Ranger tracking shots are real abilities. The farm must immediately honour that promise. The Practice Slime is already visible, friendly, integrated into Mira's first errand, and supported by production sprite art, making it the fastest path to meaningful action without expanding the map or inventing a broad combat architecture prematurely.

## Product Goal

Turn the existing Practice Slime interaction from “touch creature, see one hop, receive a learning panel” into a short, satisfying three-hit encounter that happens **before** the optional learning bonus.

The sequence should feel like:

1. Player approaches the obvious friendly slime.
2. Hint clearly says to use ACTION.
3. Each ACTION produces an immediate profile-specific attack and a readable slime reaction.
4. The third hit produces a friendly poof/burst and completes the encounter.
5. Only then does the optional learning-bonus panel appear.
6. Answering incorrectly or skipping still advances the quest exactly as it does today.

## Why This Comes Next

- It connects the new Waking Gate directly to the actual game instead of leaving the ability promise isolated in a one-time scene.
- A visible creature is easier for both boys to understand than a hidden-secret system, especially for the younger audio-first profile.
- It upgrades an interaction already required by the first quest, so the fun arrives early without adding another errand.
- It uses the existing Mage cast sheet and Practice Slime sheet; Ranger projectile feedback can be code-drawn until production Ranger art lands.
- It can be isolated in a controller instead of adding a large new subsystem to `WorldScene`.

## Definition of Done

### Encounter

- Practice Slime has three clearly readable hit points or pips.
- A successful hit registers once per deliberate ACTION press.
- Feedback begins immediately; target is under roughly 150 ms from input to visible response.
- Three clean presses should finish the encounter in approximately 2–4 seconds.
- Repeated taps during the short impact lock must not double-count hits.
- The slime remains friendly and child-safe: no blood, pain language, frightening audio, player damage, defeat screen, or fail state.

### Profile identity

**Grade 2 Mage**

- Plays the existing directional cast animation where feasible.
- Fires a bright, soft spell spark toward the slime.
- Impact uses blue-violet magic, squash/bounce, and sparkles.

**Grade 5 Ranger Explorer**

- Fires a fast code-drawn tracking shot or leaf-arrow streak.
- Impact uses green-gold tracking marks, a small knockback/squash, and a brief target-ring effect.
- Do not wait for production Ranger sprite art to make the mechanic functional.

### Quest and learning behavior

- The optional combat learning prompt opens only after the third hit.
- `FarmQuestSystem.completeSlimeInteraction()` remains the authority for quest-state advancement.
- Correct, wrong, and skipped prompt outcomes all preserve the current bonus-only rule.
- No learning prompt may interrupt the three-hit action sequence.
- No new quest is added.

### Persistence and economy

- Do not change the save schema for this milestone.
- Mid-encounter progress may reset on reload or leaving the scene.
- The combat action itself does not create a repeatable loot farm, random drop, streak reward, or timer pressure.
- Existing learning-bonus rewards remain unchanged unless a bug is discovered.

## Technical Shape

### New controller

Prefer a focused controller such as:

`src/presentation/PracticeSlimeEncounterController.ts`

Responsibilities:

- own transient hit count and short input lock;
- draw and update health pips;
- produce Mage and Ranger projectile/impact presentation;
- coordinate slime hit and completion reactions;
- expose a small `tryStrike()` or equivalent API;
- invoke an `onDefeated` callback after the third hit;
- reset/dispose cleanly with the scene lifecycle;
- expose a development/E2E snapshot only when necessary for deterministic tests.

It must not own:

- quest state;
- mastery records;
- prompt resolution;
- save data;
- generalized enemy AI or player combat stats.

### Minimal WorldScene integration

`WorldScene` should:

- construct the controller after the Practice Slime sprite exists;
- route the existing `practice-slime` interaction handler to the controller;
- set `busy` only where needed to prevent movement during a hit/defeat transition;
- open the existing optional combat prompt from the controller's completion callback;
- call the existing quest-completion method when the prompt closes;
- dispose the controller on scene shutdown.

Do not turn this milestone into a broad `WorldScene` rewrite. Small extraction that directly supports the controller is acceptable; unrelated cleanup is not.

### Existing assets

Use:

- `practice-slime-v001` idle and hop frames;
- Grade 2 Mage cast presentation;
- existing sparkle, SFX, rounded UI, and tween conventions.

A code-drawn poof, impact ring, projectile, shadow pulse, and health pips are acceptable. Do not add unlicensed art.

## Interaction Details

### Hint text

When the slime is the nearest target, use clear profile-specific text, for example:

- Mage: `ACTION: Cast at Practice Slime (3 hits)`
- Ranger: `ACTION: Shoot Practice Slime (3 hits)`

After each hit, the visible pips should communicate remaining progress without requiring reading.

### Third-hit finish

The finish should include:

- larger squash or hop;
- short poof/ring burst;
- stronger but soft SFX;
- all pips filled/cleared consistently;
- brief completion text such as `Practice complete!`;
- optional learning panel opening after the finish effect, not over it.

The slime may return to idle after the prompt closes so the world does not permanently lose its only creature.

## Test Requirements

### Automated

Run:

```bash
npm install
npm run check
npm run test:unit
npm run test:asset-pipeline
npm run smoke
```

Add browser coverage for:

1. Grade 2 Mage: first two hits do not open a prompt; third hit opens it.
2. Grade 2 skip: quest advances after the completed encounter.
3. Grade 5 Ranger: tracking-shot presentation is created and no READ ALOUD control appears.
4. Input lock prevents one tap from registering more than one hit.
5. Encounter does not change gold, inventory, mastery, or quest state before the prompt resolves.
6. Reload/save compatibility remains unchanged.

### Visual evidence

Capture reviewable screenshots for both profiles:

- before first hit with three pips visible;
- first-hit impact;
- third-hit completion burst;
- optional prompt after combat.

Store or upload the evidence through CI as already established for the Waking Gate.

### Manual browser/iPad review

Check:

- ACTION target remains comfortable in landscape iPad Safari;
- three deliberate taps register reliably;
- effects are readable but not visually overwhelming;
- audio is soft and not repetitive;
- the prompt does not appear early;
- the slime remains friendly rather than distressed;
- both profile attacks feel meaningfully different.

## Out of Scope

- player health, damage, death, armour, stats, XP, levels, enemy AI, aggro, pathfinding, cooldown systems, loot tables, random drops, boss logic, or a generalized combat framework;
- quest #4;
- hidden-secret or Wildbloom Sprig discovery mechanics;
- shop, gold sink, equipment screen, or customization;
- production Ranger sprite creation;
- map expansion or village work;
- salvaging the stale atmosphere PR.

## Reconsidered Roadmap After This Slice

1. **Practice Slime Combat & Profile Ability Loop** — make the first quest actively fun.
2. **Grade 5 Ranger production art** in parallel — remove the biggest identity mismatch.
3. **Wildbloom Sprig discovery loop** — three hidden farm secrets found with Mage sensing or Ranger tracking, using permanent non-random discoveries.
4. **Small merchant/customization sink** — give accumulated gold a visible purpose once the active play loop is proven.
5. Only then decide between quest #4, a second zone, or broader combat architecture.

This order deliberately prioritizes action, identity, exploration, and progression before adding more dialogue-driven errands.

## Suggested Agent Prompt

```text
Objective: implement the Practice Slime Combat & Profile Ability Loop described in docs/PRACTICE_SLIME_COMBAT_PLAN_2026-07.md.

Read first:
- AGENTS.md
- docs/CURRENT_STATE.md
- docs/PRACTICE_SLIME_COMBAT_PLAN_2026-07.md
- src/scenes/WorldScene.ts
- src/presentation/HeroPresentationController.ts
- src/systems/FarmQuestSystem.ts
- tests/vertical-slice.spec.ts
- tests/opening-scene.spec.ts

Constraints:
- Keep learning bonus-only.
- The three-hit encounter must occur before the optional prompt.
- No save-schema change, quest #4, generalized combat framework, random loot, timers, player damage, or unrelated refactor.
- Isolate transient encounter behavior in a focused controller.
- Preserve current quest progression and save compatibility.
- Provide browser screenshots for both profiles.

Deliverables:
- focused implementation PR;
- updated automated tests;
- visual-playtest evidence;
- docs/CURRENT_STATE.md and change record updates;
- full verification output.
```
