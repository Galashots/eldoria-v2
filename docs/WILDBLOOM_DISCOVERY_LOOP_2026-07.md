# Wildbloom Sprig Discovery Loop — July 2026

## Goal

Give the existing Wildbloom Sprig keepsake a concrete exploration purpose inside the current farm: it hums near hidden magical places, guides the player toward them, and lets each profile reveal them with its own ability.

## Player Loop

1. Earn the Wildbloom Sprig through The Sleepy Sprouts.
2. Explore the existing farm.
3. Near one of three hidden spots, the Sprig produces a visible green-gold pulse and an in-world hint.
4. Move close and press ACTION.
5. Mage casts a blue-violet reveal spell; Ranger fires a green-gold tracking shot.
6. The spot blooms into a permanent-in-save visual landmark with a named lore reveal.
7. Revealing all three completes the Sprig's song, with a larger final presentation beat but no random or variable reward.

## Hidden Spots

- Root-Star Sigil — north farm roots.
- Moonwell Echo — southwest field edge.
- Foxfire Seed — eastern meadow.

The spots are intentionally code-drawn moss, stone, rune, leaf, and flower clusters so they feel more like world details than development markers while final farm art remains pending.

## Technical Shape

- `WildbloomDiscoveryController` owns sensing, proximity state, profile-specific ability effects, reveal visuals, discovery presentation, and transient input locking.
- `PolishedWorldScene` owns the controller through the existing narrow presentation seam and gives it inventory/save callbacks.
- Discovery persistence reuses optional keys in the existing `inventory: Record<string, number>` save field; there is no schema version change or migration.
- Existing quests, curriculum prompts, mastery, gold, rewards, and interaction targets remain unchanged.
- Mira receives a small code-drawn NPC silhouette as a cheap bridge beyond the plain marker while final character art remains pending.

## Guardrails

- no random loot;
- no countdowns, streaks, daily pressure, or variable rewards;
- no learning gate or prompt;
- no quest rewrite or quest #4;
- no save-schema change or migration;
- no player damage, failure state, or enemy AI;
- discoveries remain optional and do not block adventure progress.

## Verification Standard

- full repository check, asset-pipeline tests, unit tests, and Playwright suite pass;
- browser screenshots cover Sprig sensing, profile ability in flight, and the reveal for both Mage and Ranger;
- all three spots persist after reload through the existing inventory record;
- without the Wildbloom Sprig, spots remain hidden and inert.
