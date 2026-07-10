# 2026-07-10 — Practice Slime Combat & Profile Ability Loop

## Branch

`chatgpt/practice-slime-combat-loop`

## Summary

Added a focused, child-safe three-hit Practice Slime encounter so the Mage and Ranger abilities introduced at the Waking Gate continue inside the farm before the existing optional learning bonus.

## Encounter

- The Practice Slime displays three readable health pips.
- Each deliberate ACTION creates an immediate profile-specific projectile and a friendly squash/hop reaction.
- Grade 2 Mage uses the existing cast animation plus a blue-violet spell spark.
- Grade 5 Ranger Explorer uses a green-gold tracking shot and target-ring treatment.
- The first two hits do not open a prompt or change quest, mastery, inventory, gold, or save state.
- The third hit creates a larger completion burst and `Practice complete!` feedback before opening the existing optional combat learning prompt.
- Correct, wrong, and skipped prompt outcomes still flow through the existing bonus-only quest logic.
- The encounter resets after the prompt resolves and may reset when the scene reloads.

## Technical Shape

- Added `src/presentation/PracticeSlimeEncounterController.ts` for transient hit state, input lock, pips, projectiles, effects, reactions, and completion timing.
- Integrated the controller through `PolishedWorldScene` while keeping `WorldScene`, `FarmQuestSystem`, `LearningBonusSystem`, and `SaveSystem` authoritative for gameplay state.
- Preserved the existing scene key, profile IDs, prompt system, and save schema.
- Rendered pips as independent world objects so existing prompt-panel and scene-container contracts remain stable.
- Added focused Playwright coverage for real three-tap Mage and Ranger flows, rapid-tap rejection, prompt timing, read-aloud distinction, state isolation, skip progression, and encounter reset.
- Expanded CI visual evidence to include `slime-*.png` screenshots and added short-lived diagnostic artifacts for failed check/smoke runs.

## Guardrails

- No player damage, health, death, fail state, enemy AI, aggro, XP, loot table, random drops, streaks, or timers.
- No quest #4.
- No save-schema change.
- No curriculum, reward, mastery, or economy change before the existing optional prompt resolves.
- Learning remains bonus-only and never gates adventure.

## Verification

Required before merge:

- `npm run check`
- `npm run test:asset-pipeline`
- `npm run test:unit`
- `npm run smoke`
- Browser screenshot inspection for Mage and Ranger before, during, and after the encounter
- Physical iPad landscape touch check remains a separate device checkpoint
