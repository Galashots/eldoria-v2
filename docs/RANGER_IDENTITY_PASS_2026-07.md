# Ranger Explorer Identity Pass — July 2026

## Goal

Remove the largest remaining profile-identity mismatch in the playable farm without waiting for a new binary sprite-generation round.

## Scope

- replace the visible Grade 5 physics placeholder with a presentation-only Ranger proxy built from the existing normalized adventurer frames;
- add readable green hood/shoulder accents, bow, quiver, and arrow cues;
- preserve the existing collision body, movement, quest, save, curriculum, and interaction behavior;
- add a short tracking-shot action lean/recoil so ACTION has a visible character response before the projectile appears;
- keep the implementation isolated in `HeroPresentationController` so a future production Ranger sheet can replace the proxy cleanly;
- add browser screenshot coverage for idle directions and ACTION presentation.

## Guardrails

- no save-schema change;
- no quest, reward, curriculum, or economy change;
- no new binary art is claimed as final production art;
- no generalized equipment-rendering system;
- no player damage or combat-stat system.

## Completion Standard

The Grade 5 farm hero must immediately read as the same Ranger Explorer promised by the title and Waking Gate, even before final bespoke sprite art is available.
