# 2026-07-09 — Practice Slime Combat Plan

## Branch

`chatgpt/practice-slime-combat-plan`

## Summary

Reconsidered the post-Waking-Gate roadmap and selected a focused three-hit Practice Slime encounter as the next implementation milestone.

The visible creature is a better immediate target than quest #4 or hidden secrets because it is already part of the first errand, readable without text, supported by production art, and directly continues the Mage/Ranger abilities introduced at the Waking Gate.

## Changes

- Added `docs/PRACTICE_SLIME_COMBAT_PLAN_2026-07.md` with product behavior, architecture boundaries, test requirements, visual evidence requirements, guardrails, and an execution prompt.
- Updated `docs/CURRENT_STATE.md` to make the combat slice the active milestone.
- Ordered the subsequent roadmap as Ranger art, Wildbloom Sprig discoveries, then a small merchant/customization gold sink before quest #4.

## Scope Guardrails

- Three friendly hits before the existing optional prompt.
- Profile-specific attacks and readable health pips.
- No player damage, fail state, random loot, timer pressure, save-schema change, broad combat framework, or new quest.
- Transient encounter behavior should live in a focused controller rather than expanding `WorldScene` indiscriminately.
