# Wildbloom Sprig Discovery Loop — Historical Record

> **Status: Implemented and browser-verified.**  
> This document records the approved loop and its durable guardrails. Do not re-implement or redesign it without a new approved scope. Current milestone status lives in `docs/CURRENT_STATE.md`.

## Purpose

Give the Wildbloom Sprig keepsake a concrete optional exploration purpose inside the farm: it hums near hidden magical places, guides the player toward them, and lets each profile reveal them with its own ability.

## Implemented player loop

1. Earn the Wildbloom Sprig through The Sleepy Sprouts.
2. Explore the farm.
3. Near one of three hidden spots, the Sprig produces visible green-gold sensing feedback and an in-world hint.
4. Move close and press ACTION.
5. Mage casts a blue-violet reveal spell; Ranger Explorer fires a green-gold tracking shot.
6. The spot becomes a named, persistent visual landmark with a lore reveal.
7. Revealing all three completes the Sprig's song with a larger presentation beat and no random or variable reward.

## Hidden spots

- **Root-Star Sigil** — north farm roots.
- **Moonwell Echo** — southwest field edge.
- **Foxfire Seed** — eastern meadow.

The current landmarks are cohesive code-drawn bridge presentation. Production replacements are specified under the Phase 2 farm-environment art milestone and must preserve these identities, colours, motifs, persistence keys, and interaction semantics.

## Technical ownership

- `WildbloomDiscoveryController` owns sensing, proximity state, profile-specific effects, reveal presentation, and transient input locking.
- `PolishedWorldScene` owns the controller through the existing presentation seam and provides inventory/save callbacks.
- Discovery persistence uses additive keys in the existing `inventory: Record<string, number>` save field.
- The loop does not alter curriculum prompts, mastery, gold, quest progression, or baseline rewards.

## Durable guardrails

- no random loot or variable reward;
- no countdown, streak, daily, or retention pressure;
- no learning gate or required prompt;
- no quest rewrite or quest #4 dependency;
- no new save migration for discovery state;
- no player damage, failure state, or enemy AI;
- discoveries remain optional and do not block adventure progress;
- stable lore identities and persistence keys must survive visual replacement.

## Verification standard

Future changes must preserve:

- full repository checks, asset-pipeline tests, unit tests, and Playwright coverage;
- Mage and Ranger screenshots for sensing, ability-in-flight, and reveal states;
- all three discoveries persisting after reload;
- dormant, inert spots when the Sprig has not been earned;
- no quest, curriculum, mastery, reward, or save-schema regression.

Physical-iPad behavior remains a separate real-device checkpoint.
