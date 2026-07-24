# Post-D3 Browser Playthrough and UI Audit — 2026-07-23

Source: [issue #132](https://github.com/Galashots/eldoria-v2/issues/132), ChatGPT's post-D3 browser playthrough and UI-design audit of deployed `main` after PR #131. This document is the durable record; the issue remains the coordination tracker until every item below is fixed or deliberately deferred.

## Audited build and scope

- Repository: `Galashots/eldoria-v2`
- Audited `main`: `9e427c1f93caa1984e7c7e875a766eb94c38c30f` (PR #131 merge commit)
- Browser viewport used: `1363×936`
- Profiles exercised: Grade 2 Mage and Grade 5 Ranger Explorer
- Inputs exercised: touch movement surface and keyboard interaction
- Relevant application-console errors observed: none
- Physical iPad, real WebKit audio/read-aloud, memory/thermal stability, and child comprehension were **not** tested — browser automation and emulation remain regression evidence only, not physical-device or child validation.

## Passed visual/runtime gate

- D3 Farm grass scatter passes in motion.
- Routes, Farm arrival, Mira, crops, Practice Slime, objectives/markers, and Wildbloom locations remain readable.
- Scatter remains appropriately restrained and secondary to actors/interactions.
- The Grade 2 optional learning prompt remains non-gating, readable, forgiving, and supported by prominent READ ALOUD and large answer targets.

This cleared the temporary D4 boundary that prohibited repository ingestion until D3's deployed playthrough audit passed. D4 assets still require their own source/runtime/integration evidence and PR review gates.

## Confirmed findings

### Fixed by this PR — Farm↔Village transition failure under normal held movement

Reported: the Farm→Village transition could not be triggered by ordinary continuous held movement (only a synthetic teleport into the exit zone worked). See this PR's body for the full root-cause evidence, the red-before/green-after regression (`tests/farm-village-held-movement.spec.ts`), and browser proof for both profiles and both directions. Root cause and fix are collision-geometry-only (two `public/maps/*.json` Collision-layer cells, plus widening Eldoria Village's `GateToFarm` exit zone to match the player's actual, asymmetric physics-body footprint); no gameplay, save, or transition-logic code changed.

### P1 — transient world message persists and competes with labels (not yet fixed)

Observed `Old magic is stirring nearby` remaining visible for several minutes rather than behaving like a transient toast. It covered/crowded Crop Patch and Sleepy Sprout labels and reduced usable playfield.

Acceptance for the fix that lands this:
- reproduce on current `main`;
- establish the intended message lifetime/state transition from the nearest working pattern;
- add focused regression coverage where practical;
- correct the source lifecycle rather than hiding the overlap with offsets;
- verify at the supported `1194×834` viewport and a larger desktop viewport;
- confirm message dismissal does not remove required objective guidance.

### P1 — confirmed Sleepy Sprout/world-label depth conflict (not yet fixed)

The existing confirmed layering defect remains actionable and is made more visible by the persistent-message problem above.

Acceptance:
- fix only the demonstrated depth/layer ownership defect;
- preserve actor, marker, objective, interaction, and dialogue hierarchy;
- capture comparable before/after evidence at the affected spot for both profiles.

### P2 — dialogue/learning-feedback ghost layer lingers after control returns (not yet fixed)

Mira/learning feedback remains semi-visible while movement and the next objective are already active. The old and new states compete instead of handing control back cleanly.

Acceptance:
- determine whether the lingering layer is an intended timed fade or stale state;
- shorten or replace it with the smallest transition that preserves readable feedback;
- do not remove supportive wrong-answer feedback or Grade 2 audio-first affordances;
- verify movement resumes only with a clearly subordinate or dismissed prior panel.

### P2 — HUD and touch controls consume too much playfield (deferred design pass, not part of a bug-fix PR)

Header, objective bar, dialogue/feedback, transient message, joystick, and ACTION can compete simultaneously. The joystick occupies a large lower-left region; ACTION has weak inactive/available differentiation.

Acceptance for the later design pass:
- retain ≥44 CSS-pixel touch targets at `1194×834`;
- reduce simultaneous overlay coverage and preserve world visibility;
- establish clear inactive, available, pressed, and disabled ACTION states;
- retain one current objective and one transient-message layer;
- provide Mage/Ranger screenshots in ordinary play, dialogue, and learning-prompt states.

### P3 — Stats & Mastery and Profile Select need production presentation (deferred to post-D4)

Observed issues:
- `0/0` mastery values resemble missing data;
- empty keepsake boxes resemble debug inventory;
- curriculum language reads more like a school dashboard than fantasy progression;
- Profile Select is clear but emotionally flat and has excessive unused space.

Deferred until approved D4 identity art/portraits are available. Not blocking D4.

## Investigation-only findings

### Practice Slime input reliability (not yet actionable)

Repeated focused Space input at `Cast at Practice Slime (3 hits)` animated the scene but did not visibly advance the three-hit state. Cloud-browser input behaviour may be involved; this is **not yet a confirmed gameplay defect**.

Required before any fix:
- reproduce separately with ordinary keyboard, on-screen ACTION, and physical iPad touch where available;
- inspect actual hit-state transitions rather than animation alone;
- add a failing regression only after a deterministic failure is established;
- do not patch combat speculatively.

### Service-worker/update freshness (not yet actionable)

One existing browser tab initially retained an older cached bundle until a fresh cache-busted navigation. This may be expected service-worker update behaviour. Record during the next physical-iPad/PWA validation; no action without a reproducible stale-version failure.

## Accepted engineering queue (post-D3)

1. ~~Farm↔Village transition failure under normal held movement~~ — fixed by this PR.
2. Persistent transient-message lifecycle plus confirmed Sleepy Sprout/world-label depth repair.
3. Dialogue/feedback handoff cleanup.
4. Practice Slime input investigation; implementation only if confirmed.
5. Later HUD/control consolidation.
6. Stats/Profile Select production pass after D4 identity art is available.

D4 (character perspective trial) remains a parallel art lane, not gated on items 2–6 above.

## Non-goals held for this and the immediately following items

- no save-schema, profile-ID, curriculum, quest, reward, or interaction-ID changes;
- no speculative Objective ghosting or unproved STATS-badge fix;
- no D3 scatter retune;
- no broad Farm beautification folded into UI fixes;
- no claim of physical-iPad or child validation.
