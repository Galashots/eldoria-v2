# Eldoria-V2 Multi-Model Operating Guide

**Version:** 1.2  
**Status:** Active cross-provider coordination authority  
**Owner decision:** 2026-07-21  
**Product direction:** [`ELDORIA_MASTER_PLAN.md`](ELDORIA_MASTER_PLAN.md)  
**Repository-specific rules:** [`../AGENTS.md`](../AGENTS.md)

This guide defines how multiple AI providers coordinate, review, repair, and merge Eldoria work. It is intentionally concise. Provider product comparisons, subscription notes, prompt examples, and dated model research belong under `docs/research/`, not in the daily operating path.

---

## 1. Precedence

When instructions conflict:

1. the owner's explicit current direction;
2. current repository authorities and accepted decisions;
3. this guide;
4. general provider defaults.

`AGENTS.md` is the binding Eldoria-specific operating contract. `ELDORIA_MASTER_PLAN.md` defines stable product and world direction. `CURRENT_STATE.md` alone owns volatile status and next work.

---

## 2. Default operating model

Use one accountable implementation owner per branch.

A provider may continue autonomously through approved work until complete or genuinely blocked. Do not add approval gates merely because multiple models are involved.

Default cycle:

1. an objective and material direction are approved;
2. one provider owns implementation;
3. a different provider reviews the exact base-to-head range read-only;
4. the implementation owner repairs findings;
5. fresh verification runs on the exact final head;
6. the reviewer or another non-implementing provider audits the landing report;
7. a non-implementing provider may merge when all repository gates pass.

The implementation provider must not be the only reviewer or final merger of consequential work.

---

## 3. Role allocation

Assign work by capability and available environment, not brand loyalty.

### Implementation owner

Owns:

- the branch and final diff;
- code, tests, documentation, and evidence required by the task;
- root-cause investigation;
- repairing review findings;
- an accurate landing report.

### Independent reviewer

Owns:

- requirement compliance;
- product invariants;
- defects and regressions;
- compatibility and migration risk;
- evidence quality;
- unrelated-scope detection;
- a clear verdict tied to the exact reviewed head.

The reviewer does not mutate the implementation branch during review.

### Product and visual authority

ChatGPT normally owns or adjudicates:

- kid UX and accessibility;
- player-facing wording;
- product priority and world direction;
- reward and healthy-engagement judgment;
- source-art prompting and visual QA;
- comparison against the approved reference image;
- final sprite, UI, composition, and asset verdicts.

Another provider may independently challenge the evidence or propose a better direction. The exact runtime result and repository constraints decide.

### Owner

The owner retains reserved approvals and may redirect any work at any time. Routine work should not wait for the owner when explicit delegation and all merge gates are already satisfied.

---

## 4. Task classification

Before substantive work, classify it proportionally:

- **audit/review** — inspect actual repository state and exact changes;
- **approved implementation** — execute the settled objective with the smallest sufficient solution;
- **bug/unexpected behavior** — establish root cause before fixing;
- **visual/asset work** — use exact runtime evidence and the applicable visual contract;
- **material new design** — present meaningful alternatives and obtain direction;
- **current external research** — use current primary sources and separate external facts from repository facts.

Do not force formal brainstorming or repeated approval onto settled decisions, routine continuation, documentation cleanup, narrow fixes, or properly audited asset work.

---

## 5. Coordination surfaces

Material overlapping work uses one visible coordination surface:

- a GitHub issue with a decision log; or
- the draft PR when one branch is the only active implementation lane.

Do not coordinate material decisions through private side channels or uncommitted local notes.

When a material disagreement or consequential decision needs a dedicated venue, run it as a **council**: one GitHub issue with a named chair, declared rounds and speaking order, a visible decision log, and an explicit closure naming the deciding authority and execution owner. Councils are for material architecture, overlapping-PR reconciliation, unresolved consequential disagreement, player-experience conflicts, and save/deployment/privacy/scope decisions — not routine work.

Parallel sessions must declare:

- provider/session;
- branch or sandbox;
- owned files, systems, or questions;
- stopping condition;
- expected evidence.

One branch has one accountable implementation owner. Ownership transfers explicitly and whole; another provider does not quietly continue a partially owned branch.

Unrelated registered work may proceed in parallel.

---

## 6. Scope and stopping conditions

Every implementation lane should define:

- objective;
- definition of done;
- authoritative documents and relevant code;
- expected files or systems;
- protected/non-goal surfaces;
- required tests and visual evidence;
- exact condition for stopping or escalating.

Use the smallest solution that satisfies the requirement. Avoid opportunistic refactoring, documentation rewrites, or asset changes outside the approved scope.

Escalate when:

- requirements materially conflict;
- two choices would significantly change product or architecture;
- a destructive or difficult-to-reverse action is required;
- privacy, analytics, accounts, monetization, external data, or legal implications appear;
- access, credentials, source assets, or required device evidence are missing;
- three evidence-based repair attempts indicate the architecture may be wrong.

---

## 7. Evidence gate

A landing report must include:

- branch, base, and exact head SHA;
- concise scope and principal files/systems;
- fresh checks and complete results;
- named CI jobs and exact-head status;
- browser and visual captures when applicable;
- deterministic asset validation and hashes when applicable;
- compatibility and migration statement;
- remaining uncertainty;
- physical-device and child-validation status.

Rules:

1. Re-run relevant verification after every repair, rebase, restack, or conflict resolution.
2. A green result on an earlier head is stale evidence.
3. A merged branch is never reused; follow-up work starts from current `main`.
4. If an environment cannot run a long suite reliably, run focused checks locally and use CI as the declared authoritative long-run surface.
5. Never describe an unrun check as passing.
6. Test count alone is not coverage evidence.

---

## 8. Test ownership

- The implementation owner writes behavior-critical tests.
- Saves, migrations, rewards, mastery, curriculum, identity, validators, and state transitions require regression tests that fail against the invalid behavior where practical.
- Browser tests wait for observable state rather than arbitrary sleeps.
- Visual-only and documentation work use their real evidence classes rather than artificial unit tests.
- The independent reviewer verifies that the evidence supports the completion claim.

---

## 9. Visual and asset separation

For visual work, separate:

1. source or runtime-art approval;
2. deterministic ingestion and normalization;
3. runtime integration;
4. in-game visual verification;
5. physical-iPad verification.

Passing one stage does not imply the next.

The product/visual reviewer should inspect exact runtime pixels, comparison captures, contact sheets, pivots, perspective, scale, palette, and environmental context as applicable.

Production character, NPC, creature, equipment, and armor work must follow `docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md` before base families or customization layers are approved.

---

## 10. Review verdicts

Use clear verdicts:

- **APPROVE** — merge gates satisfied once exact-head CI is green;
- **APPROVE WITH AMENDMENTS** — bounded repairs required before merge;
- **CONCERNS** — material evidence or design risk remains unresolved;
- **BLOCKER** — do not merge until resolved or explicitly overruled by the appropriate authority.

The review should identify:

- exact reviewed base and head;
- findings ranked by severity;
- smallest required repair;
- evidence still missing;
- whether fresh review is required after repair.

Do not treat another model's completion summary as proof.

---

## 11. Merge authority and separation

The owner authorizes cross-model routine merging when every `AGENTS.md` gate passes.

Required separation:

- implementation provider ≠ independent reviewer;
- implementation provider ≠ final merger for consequential work;
- review covers the exact final range or is refreshed after repair;
- merger verifies exact-head CI and the landing report rather than relying on the implementer's statement.

The independent reviewer or another non-implementing provider may create the merge commit without waiting for the owner when:

- the objective and material direction were already approved;
- all findings are resolved or accepted by the correct authority;
- required code, browser, visual, compatibility, migration, and documentation evidence exists;
- final CI is green;
- no protected or owner-reserved decision is present;
- the final diff contains no unrelated work.

Always use a merge commit. Never squash or rebase-merge.

---

## 12. Reserved owner gates

Unless explicitly delegated for the specific action or scope, the owner retains:

- `.github/workflows/**` changes;
- save schema and migrations;
- stable profile IDs;
- privacy, analytics, accounts, monetization, or external-data behavior;
- deployment cutovers and save-origin transfer decisions;
- secrets and credentials;
- destructive history operations;
- unresolved material product, curriculum, kid-UX, story, economy, architecture, art-direction, target-size, or target-geometry decisions.

Protected-path hooks and CI reduce accidents; they are not a substitute for review or owner authority.

---

## 13. Documentation discipline

- `CURRENT_STATE.md` is the only volatile status authority.
- Durable contracts contain no “next asset,” current branch, or temporary milestone snapshot.
- `CHATGPT_CHANGELOG.md` stays concise; detailed narratives live in PRs, commits, audits, or archived changelog files.
- Concurrent top-of-changelog conflicts use keep-both, newest first.
- Completed execution plans are marked historical or replaced by current subplans; they are not silently re-run.
- Default session reading is task-routed through `docs/README.md`; do not load every doctrine file for routine work.

---

## 14. Completion handoff

A meaningful completion report states:

1. branch and PR;
2. exact final head;
3. result and principal files;
4. checks and CI;
5. visual/gameplay evidence;
6. compatibility and migration impact;
7. remaining uncertainty and device status;
8. correct next owner: repair agent, independent reviewer, merger, art trial, or user playtest.
