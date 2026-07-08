# Attention-First Opening Plan — July 2026

## Purpose

This plan replaces the skipped real-child clarity checkpoint with an explicit product assumption: the current Eldoria-V2 build must compete with other iPad games for the boys' limited screen time.

Because the boys are likely to choose known games over a prototype, the next milestone should make the first 60-90 seconds feel magical, responsive, and worth continuing before adding more quest volume.

This is a planning and execution brief for Codex, Claude Code, or another coding agent. It is not itself a runtime implementation.

## Current Product Constraint

The original next checkpoint was a supervised real-child playtest. That is now intentionally skipped because limited iPad screen time makes it unrealistic: the boys will tend to spend that time on already-fun games.

Do not describe the current UX as child-validated. Treat it as technically verified but not child-proven.

## Primary Milestone

**Milestone name:** Attention-First Opening Pass

**Goal:** Make the first minute feel like a real fantasy game rather than a systems prototype.

**Definition of done:** A parent opening the live build can see, hear, and feel an immediate fantasy promise on the title screen and during the first Mira interaction, without adding quest #4 or changing the bonus-only learning rule.

## Non-Negotiables

- Learning never gates adventure.
- Wrong answers and skipped prompts must never block quest, movement, rewards that are not learning bonuses, exploration, or retry.
- Preserve Grade 2 audio-first support.
- Preserve Grade 5 reader-mode support.
- Preserve existing save compatibility unless a migration is explicitly included and tested.
- Do not rename internal profile IDs in this milestone.
- Do not merge stale atmosphere work from PR #51 unless it is rebased and reviewed against the latest `main`.
- Do not add quest #4 in this milestone.
- Do not perform broad architecture refactors.

## Approved Product Direction

### Grade 2 profile

Keep the visible identity as **Mage**.

The first impression should communicate:

- magical, friendly, younger-child readable;
- audio-first;
- spell sparkles, charms, gentle fantasy danger;
- simple instructions and obvious tap targets.

### Grade 5 profile

Approve the **Ranger Explorer** direction for the older child, while keeping the internal profile ID as `grade5-adventurer` for now.

Player-facing language may shift from Adventurer toward Ranger/Explorer, but avoid save/test churn unless the implementation scope explicitly includes updating the relevant tests.

The first impression should communicate:

- explorer, tracker, forest cloak, practical leather gear;
- clues, hidden secrets, nature/science, map sense, tactical combat;
- older-child competence rather than worksheet mode.

A suitable short title-card phrase is:

> Ranger Explorer — reader mode, clues, tracking, and tactical bonuses.

## Approved Story Direction

Keep the existing **old magic waking** thread, but make it more immediate and exciting.

The farm should feel like it is beginning to wake up with hidden magic. Mira should not sound like she is assigning chores; she should sound like something strange and interesting is happening.

### Mira opening tone

Mira should establish a small mystery immediately:

- the farm is glowing or humming;
- old magic is waking;
- the player can help and discover what is happening;
- learning bonuses help, but adventure continues either way.

### The Sleepy Sprouts revised wording

Use wording close to the following, adjusted only as needed for line length and existing tests:

**Start:**

> Mira: The farm is glowing again! Three sleepy sprouts curled up in the rows. Wake them before the old magic fades.

**Reminder:**

> Mira: Find the glowing sprouts. They wiggle when you get close.

**Progress:**

> Sprout awake! It popped up with a sparkle.

**Return:**

> Mira: All three woke up? Then the old magic likes you. Take this Wildbloom Sprig — it hums when secrets are nearby.

**Complete:**

> Mira: Keep exploring. If the Sprig hums, something hidden may be close.

The Wildbloom Sprig should become a future hook for secrets, hidden paths, or discovery bonuses. Do not implement those future systems in this milestone.

## Audio Direction

The current audio pipeline is acceptable as code infrastructure, but synthesized placeholder audio should not be treated as final first-impression audio.

For this milestone, choose the simplest safe implementation:

1. If licensed/CC0 audio can be added cleanly, replace the placeholder background loop and SFX with real child-friendly fantasy/farm audio and update attribution.
2. If proper replacement audio is not available, reduce first-impression risk by keeping SFX soft and making the placeholder background loop unobtrusive or muted by default if it is annoying.
3. Read-aloud must remain clear and must continue to duck or override music.

Do not spend this milestone building a large audio asset pipeline. The decision is about first impression, not completeness.

## Visual/UX Direction

The opening should feel more like a game immediately.

Prefer small, visible improvements:

- title screen that frames the two profiles as heroes, not settings;
- stronger first interaction feedback;
- sparkle/pop feedback for early magic events;
- clearer reward/charm toasts;
- obvious hint text that tells the player what to do next;
- no opaque new systems hidden behind docs.

Do not try to solve all production art in this milestone. The existing visual asset contract remains authoritative for real assets.

## Candidate Implementation Scope

A coding agent may implement a small PR containing some or all of the following, as long as the PR remains focused.

### 1. Title/profile opening polish

Inspect:

- `src/scenes/TitleScene.ts`
- `src/data/profiles.ts`
- `tests/vertical-slice.spec.ts`

Possible changes:

- Reword Grade 5 subtitle toward Ranger Explorer direction while preserving internal ID.
- Add small hero-role copy to title cards.
- Add a short magical promise line under the title.
- Keep hitboxes/tap targets stable unless tests are updated deliberately.

### 2. Opening dialogue and Sleepy Sprouts wording

Inspect:

- `src/data/quests.ts`
- `src/systems/FarmQuestSystem.ts`
- `tests/system-foundations.spec.ts`
- `tests/vertical-slice.spec.ts`

Possible changes:

- Revise Mira first interaction text to create curiosity.
- Revise The Sleepy Sprouts text using the approved direction above.
- Keep quest state machine behavior unchanged.
- Update tests only for expected text changes.

### 3. Reward and charm feedback

Inspect:

- `src/scenes/WorldScene.ts`
- `src/data/quests.ts`
- `src/presentation/uiHelpers.ts`

Possible changes:

- Make charm/reward toasts more readable and magical.
- Improve sparkle/pop feedback using existing primitives.
- Avoid persistent gameplay effects unless already in the save model.

### 4. Placeholder audio risk reduction

Inspect:

- `src/scenes/PreloadScene.ts`
- `src/scenes/WorldScene.ts`
- `src/systems/AudioPreference.ts`
- `ATTRIBUTION.md`

Possible changes:

- Lower placeholder music volume if it competes with read-aloud or feels annoying.
- Keep SFX short and soft.
- Preserve mute persistence.
- Do not add unlicensed assets.

## Out of Scope

- Quest #4.
- Combat system expansion.
- Inventory equipment screen.
- Save schema changes unless strictly needed.
- Full atlas loading.
- Production Ranger sprite generation.
- Production tile/building art.
- Full PR #51 atmosphere merge.
- Broad `WorldScene` rewrite.
- Any ads, analytics, accounts, cloud saves, or external services.

## Stale PR #51 Guidance

PR #51 contains potentially useful atmosphere ideas: ambient tint, motes, fireflies, actor shadows, and scene fades.

However, it is stale relative to the latest merged audio and UI polish work. Treat it as a reference only.

A future agent may salvage it only by:

1. rebasing on latest `main`;
2. separating docs-only expansion proposals from runtime atmosphere implementation;
3. proving no conflict with the current HUD, prompt panel, Stats panel, audio, and tests;
4. providing fresh screenshots.

Do not merge PR #51 directly as part of the attention-first opening pass.

## Verification Requirements

Run:

```bash
npm install
npm run check
npm run test:unit
npm run test:asset-pipeline
npm run smoke
```

For gameplay/UI changes, also run:

```bash
npm run dev
```

Perform browser inspection and capture notes or screenshots for:

- title screen;
- Grade 2 start;
- Grade 5 start;
- first Mira interaction;
- crop bonus prompt;
- Practice Slime interaction;
- Sleepy Sprouts interaction;
- reward/charm feedback;
- Stats & Mastery panel after at least one charm.

## Suggested Codex/Claude Prompt

```text
Objective: implement the Attention-First Opening Pass described in docs/ATTENTION_FIRST_OPENING_PLAN_2026-07.md.

Read first:
- README.md
- AGENTS.md
- docs/CURRENT_STATE.md
- docs/ATTENTION_FIRST_OPENING_PLAN_2026-07.md
- src/data/profiles.ts
- src/data/quests.ts
- src/scenes/TitleScene.ts
- src/scenes/WorldScene.ts
- tests/vertical-slice.spec.ts
- tests/system-foundations.spec.ts

Constraints:
- Preserve learning-never-gates-adventure.
- Preserve Grade 2 audio-first support.
- Preserve save compatibility.
- Keep internal profile IDs unchanged.
- Do not add quest #4.
- Do not merge stale PR #51.
- Keep the PR small and focused.

Deliverables:
- Small PR implementing opening/title/dialogue/reward/audio-risk improvements only.
- Updated tests for intentional text/UI changes.
- docs/CHATGPT_CHANGELOG.md entry.
- docs/CURRENT_STATE.md update if the active milestone or capabilities change.
- Verification output from npm run check, npm run test:unit, npm run test:asset-pipeline, npm run smoke, and browser inspection.
```

## Product Review Notes For After Implementation

After the attention-first pass lands, pause before adding more quests and review:

- Does the title screen make each profile feel like a hero?
- Does the first Mira interaction create curiosity?
- Does the first reward feel satisfying?
- Is any audio irritating or too repetitive?
- Does the Grade 2 path remain playable without reading?
- Does the Grade 5 path feel older and more capable?
- Is quest #4 still the right next content step, or should Ranger art/visual polish happen first?
