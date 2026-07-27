# ACTION casts — review evidence, 2026-07-26

Durable evidence for `claude/action-feel`: ACTION now fires a ranged cast when
there is nothing within arm's reach, instead of playing the hero's cast
animation in silence.

## What changed for the player

Pressing ACTION away from an interactable used to run
`heroPresentation.playAction()` and nothing else — the animation played, no
projectile left the hero, no sound fired, nothing in the world reacted. Across
most of a 1920×1280 map that is what the button did.

Now the hero casts: a projectile travels the way the hero is facing, up to
**192 world px** (three tiles), and lands with an impact pop, a short camera
shake on a hit, and a sound. The Mage throws a round arcane spark; the Ranger
looses a thin arrow, in its own accent colour.

The walk-up interaction range is unchanged at `sx(42)` = 84 px, so the cast is
roughly **2.3× the reach** the button had before.

## The rule: you can hit things, you cannot shout at people

A cast reaches the Practice Slime, the three Sleepy Sprouts and the Mossy
Stone. It deliberately does **not** reach Mira, Baker Pell, the Notice Board,
the Village Well, the Crop Patch or the Whispering Flower.

That is a design decision with an engineering reason behind it. A spark that
opens Mira's dialogue from three tiles away reads as a bug, and it would let a
player skip the walk the objective is actually asking for. Dialogue and quest
handoffs also assume the hero is standing at the target, so keeping them out of
cast range means quest routing, objective state and save behaviour are entirely
untouched by this feature.

## The sheet

[`cast-contact-sheet.png`](cast-contact-sheet.png) — 1204×806, two columns
(mid-flight, landed) by two rows (Mage, Ranger Explorer), captured at the
declared supported viewport **1194×834** and point-sampled down by 2.

In every frame the hero is standing **150 world px** from the Practice Slime —
beyond the 84 px walk-up reach, so the hit is only possible because of the cast.
The landed column shows the impact ring and the slime's first health pip filled.

`measurements.json` records, per profile: the standoff distance, the hero's
facing read from the live scene, and the slime's hit count before and after. The
capture script exits non-zero if a cast fails to register.

Two things the sheet cannot show: the camera shake, and the sound.

## Automated gates

- `tests/unit/castTargeting.test.ts` (15 assertions) — the targeting rule as
  pure logic: direction vectors, range and corridor bounds, nearest-of-several,
  flying past a non-castable target to reach a castable one behind it, and the
  castable/non-castable split asserted by name in both directions.
- `tests/cast-action.spec.ts` (6 browser tests, both profiles) — a cast hits the
  slime from beyond walk-up range; a cast into empty ground changes nothing and
  raises nothing; and a cast does **not** advance Mira from range while walking
  up to her still does.

## A regression this caught

The first version gated `tryInteract()` behind `nearestTarget()`, on the
assumption that skipping it when nothing was near could not matter. It broke
**every Wildbloom secret reveal** on both profiles: `PolishedWorldScene` wraps
`tryInteract` to check the Wildbloom spots first, and those spots are not
interaction targets, so gating the call skipped them entirely. Types were clean
and the new tests passed; `npm run smoke` caught it. `tryInteract()` is now
always called, and the obsolete "Nothing to use here yet." toast — which fired
on every cast and read as an error message for a working action — is gone.

## What this evidence does not cover

Browser emulation is regression evidence only, not physical-iPad or child
validation (`AGENTS.md` rule 10). Whether a seven-year-old finds this fun is
exactly the thing no automated check can answer.
