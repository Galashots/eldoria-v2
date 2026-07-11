# Attention-First Opening Pass — Historical Record

> **Status: Implemented and browser-verified.**  
> This is a historical product/execution brief. Do not re-run it as an active task without a new approved scope. Current status and next steps live in `docs/CURRENT_STATE.md`.

## Original purpose

Eldoria needed to compete with familiar iPad games for limited screen time. The first 60–90 seconds had to feel magical, responsive, and worth continuing before the project added more quest volume.

The product assumption remains useful:

- the game must establish a clear fantasy promise immediately;
- each profile should feel like a hero identity rather than a settings choice;
- controls and objectives should be understandable with minimal adult coaching;
- the build must not be described as child-validated until real-child playtesting occurs.

## Non-negotiables preserved

- Learning never gates adventure.
- Wrong answers and skipped prompts do not block movement, quests, baseline rewards, exploration, or retries.
- Grade 2 remains audio-first.
- Grade 5 remains reader-mode.
- Stable internal profile IDs are preserved.
- No quest #4, broad combat expansion, or save-schema redesign was part of this milestone.

## Approved identity direction

### Grade 2 Mage

The first impression should communicate:

- magical, friendly, and younger-child readable;
- audio-first support;
- spell sparkles, charms, and gentle fantasy danger;
- simple instructions and obvious touch targets.

### Grade 5 Ranger Explorer

The player-facing identity is **Ranger Explorer**, while the stable internal ID remains `grade5-adventurer`.

The first impression should communicate:

- explorer/tracker identity;
- forest cloak and practical leather equipment;
- clues, hidden secrets, nature/science, map sense, and tactical feedback;
- older-child competence rather than worksheet mode.

## Story direction retained

The farm's opening thread is **old magic waking**. Mira should sound like something strange and interesting is happening, not like she is assigning chores.

The Sleepy Sprouts dialogue established the Wildbloom Sprig as a keepsake that “hums when secrets are nearby,” which later became the implemented Wildbloom discovery loop.

## What shipped

The milestone resulted in:

- hero-framed title/profile copy;
- Ranger Explorer player-facing language;
- stronger “old magic waking” story framing;
- more magical opening and reward presentation;
- improved charm/reward toasts;
- softer placeholder audio levels;
- preserved read-aloud and audio ducking;
- browser screenshot review across both profiles and key prompt/reward states.

Later work expanded the first minute with the Waking Gate action scene, Practice Slime ability loop, Ranger bridge presentation, and Wildbloom discovery loop. Those later systems are summarized in `docs/CURRENT_STATE.md` and have their own tests and implementation history.

## Historical constraints that still matter

- Synthesized placeholder audio is infrastructure, not final first-impression audio.
- Production Ranger, farm, building, and UI art must follow the visual asset contract and normalization pipeline.
- Stale or closed atmosphere branches must not be merged without rebasing and fresh visual verification.
- Product, curriculum, save, economy, quest, or kid-UX scope changes still require explicit review.

## Verification standard carried forward

For future opening changes, run the full repository suite and inspect at minimum:

- title/profile selection;
- Mage and Ranger Waking Gate states;
- farm arrival and Mira guidance;
- crop and Practice Slime prompts;
- reward/keepsake feedback;
- Stats & Mastery;
- an iPad-like landscape viewport.

Physical-iPad and child validation remain separate real-device checkpoints.
