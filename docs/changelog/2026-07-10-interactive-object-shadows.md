# 2026-07-10 — Interactive Object Ground Shadows

## Agent

Claude (Sonnet 5) via Claude Code, at Leo's request.

## Branch

`claude/interactive-object-shadows`

## Summary

Grounded the remaining interactive farm objects with the same soft ground shadow the player and Mira already use, implementing the cheapest high-visibility item from the 2026-07-10 Stardew-caliber visual research (contract Section 8a). Presentation-only; adds no art, gameplay, quest, curriculum, reward, mastery, collision, or save-schema changes.

## Files changed

- `src/scenes/PolishedWorldScene.ts` — added `addInteractiveObjectShadows()`, called once in `create()`. It draws a soft ground-shadow ellipse under the Practice Slime sprite and under each remaining bare quest marker (crop bonus, the three sleepy sprouts). Mira already draws its own shadow (`addMiraGuidance`) and the Wildbloom spots draw theirs, so both are skipped to avoid doubling.
- `docs/CURRENT_STATE.md` — recorded the new grounding in the Visual And Asset State section.

## Implementation notes

- Shadows are static `Phaser.GameObjects.Ellipse` objects at depth 1 (same layer/style the existing player shadow uses: `0x06110d` at ~0.3 alpha). The objects do not move, so no per-frame update was added.
- The change lives entirely in the presentation subclass; `WorldScene` (the gameplay/quest/save authority) is untouched.
- Verified locally: `npm run validate:visual-targets`, `npm run typecheck`, and `npm run build` pass; `npm run test:unit` passes 48/48; the Playwright smoke suite passes (one Grade 2 movement-distance assertion is a pre-existing timing flake under full-suite load — it passes 3/3 in isolation on this branch and passed on clean main, and this change adds only static display objects with no physics).
- Browser-inspected via temporary screenshot capture (not committed): the Practice Slime and the sleepy-sprout/crop markers now read as grounded objects rather than flat markers floating over the tile grid. The crop-bonus marker's shadow is lower-contrast because it sits on dark tilled soil, which is expected.

## Reason

Requested by Leo as the first, nearly-free win from the Stardew-caliber visual research: "do the cheap shadow fix." Ground shadows were the highest-leverage no-new-art item identified for the "sprites read as flat markers floating over the grid" problem the standing ChatGPT audit flagged.
