# Multi-Model Game Development Operating Guide

**Version:** 1.1  
**Date:** 2026-07-21  
**Applies to:** Eldoria-V2 and other AI-led game repositories  
**Purpose:** Stable day-to-day routing, coordination, review, and evidence rules for ChatGPT, Claude Code, Kimi, and the human owner

> This guide deliberately excludes volatile model names, prices, quotas, and feature counts. Those belong in dated research. Repository-specific guidance and current owner decisions always take precedence.

---

## 1. Authority order

When instructions conflict, use:

1. The owner’s explicit direction in the current conversation.
2. Current authoritative repository documents and accepted project decisions.
3. Repository-specific change-control and agent methodology.
4. This operating guide.
5. Dated model research and provider reviews.
6. General provider defaults.

No model’s completion report is proof. Repository state and fresh evidence are proof.

---

## 2. Default role assignment

### ChatGPT — Product, player experience, independent review, and release authority

ChatGPT leads:

- product judgment and prioritization;
- kid UX, pre-reader accessibility, and touch-first usability;
- player-facing wording, names, dialogue, and onboarding;
- visual direction, image generation, and screenshot-based visual QA;
- curriculum/gameplay reconciliation;
- cross-agent adjudication;
- consequential PR review;
- evidence-quality review;
- release notes, landing reports, and owner-facing summaries.

Use the strongest available reasoning tier for consequential decisions and difficult independent reviews.  
Do not spend limited ChatGPT capacity duplicating sustained implementation already assigned to Claude or Kimi.

### Claude Code — Primary implementation and branch-delivery engine

Claude Code leads:

- approved feature implementation;
- root-cause debugging;
- architecture-sensitive changes;
- risky refactors;
- multi-file engine and TypeScript work;
- behavior-critical tests;
- code-coupled documentation;
- branch, worktree, restack, and merge-train upkeep;
- CI shepherding and exact-head verification;
- delivery of a coherent branch through repair and review.

Use the strongest Claude tier for ambiguity, architecture, migrations, and difficult debugging.  
Use the balanced coding tier for routine implementation and repeated test cycles.

### Kimi — Large-context audit, parallel exploration, and bounded second implementation engine

Kimi leads:

- doctrine and documentation-drift audits;
- broad repository and cross-repository analysis;
- independent solution spikes;
- PR overlap and bulk-scan work;
- visual and gameplay comparisons;
- browser or local exploration that fits the active environment;
- research-heavy tasks;
- bounded beta swarm investigations;
- non-protected, machine-verifiable implementation slices.

Suitable Kimi implementation slices include:

- validators and validator cases;
- deterministic asset tooling;
- test scaffolds;
- documentation transforms;
- narrow tooling and automation changes outside protected paths.

Kimi does not lead protected systems such as saves, migrations, curriculum, mastery, deterministic rewards, profile identity, privacy, deployment cutovers, or protected workflow configuration unless the owner explicitly reassigns them.

### Human owner — Protected authority

The owner retains final authority for:

- product scope and major prioritization;
- destructive or difficult-to-reverse actions;
- save compatibility and migrations;
- privacy, analytics, accounts, monetization, and personal data;
- secrets, cloud infrastructure, and production deployment cutovers;
- major dependencies;
- fundamental art-direction changes;
- protected repository paths and explicit merge gates;
- exceptions to the standing coordination and review rules.

Merge authority follows current owner direction and repository policy. It is not inferred from a model’s role.

---

## 3. Workflow selection

Classify substantive work before acting.

### A. Direct answer

No repository change or current-state verification required.

### B. Audit or review

Inspect actual files, diffs, tests, evidence, and authoritative documents. Separate requirement, implementation, visual, and evidence quality.

### C. New feature or material design

Define player outcome, constraints, non-goals, alternatives, and definition of done. Obtain approval only for material choices.

### D. Approved implementation

Assign one lead, define the stopping condition, work in isolation, test coherent slices, and continue until complete or genuinely blocked.

### E. Bug or failed test

Establish root cause before fixing. Prove a regression test can fail where practical.

### F. Visual, asset, UI, animation, camera, or touch work

Use comparable in-game captures and evidence-first visual QA.

### G. External research

Use current primary sources. Keep external facts separate from repository facts.

---

## 4. Task-routing matrix

| Work type | Lead | Independent reviewer / adjudicator |
|---|---|---|
| Product direction | ChatGPT | Claude or Kimi |
| Kid UX, naming, dialogue | ChatGPT | Claude implements |
| Routine feature | Claude | ChatGPT or Kimi |
| Risky refactor or migration | Claude | ChatGPT |
| Root-cause debugging | Claude | ChatGPT audit; Kimi alternate hypothesis |
| Bounded non-protected implementation slice | Kimi | Claude or ChatGPT |
| Doctrine / doc-drift audit | Kimi | ChatGPT adjudicates |
| Broad repository audit | Kimi | ChatGPT adjudicates |
| Parallel solution spikes | Kimi | Claude integrates code; ChatGPT integrates product decisions |
| Behavior-critical tests | Implementation lead | ChatGPT audits coverage claims |
| Test ideation / scaffolding | Kimi or Claude | Implementation lead owns final tests |
| PR triage | ChatGPT adjudicates on repository and CI state prepared by Claude, Kimi, or tools | Different provider where consequential |
| Final PR review | Provider other than implementer | ChatGPT audits landing decision |
| Visual QA | ChatGPT | Kimi comparison support |
| Asset tooling | Claude or bounded Kimi lane | ChatGPT visual audit |
| Code-coupled docs | Implementer | ChatGPT reviews wording |
| Release notes / landing reports / player copy | ChatGPT | Implementer verifies facts |
| CI shepherding / restacks | Claude | ChatGPT reviews risk; owner merges where reserved |
| CI or deployment configuration | Claude implements only with approval | ChatGPT audits; owner approves |
| Model council | Distinct model lenses | Named chair records decision |

---

## 5. Coordination surface and session registry

### 5.1 One authoritative coordination surface

For material cross-agent decisions, use at most one active coordination or council surface for the same repository and overlapping scope.

- Use one named GitHub issue as the authoritative venue.
- Do not use local files, side chats, or ad hoc message buses as competing decision records.
- The issue names the chair, agenda, participants, decision log, execution owner, and closing condition.
- Opening a competing surface for the same scope requires owner approval.
- Unrelated, non-overlapping execution work may continue only when ownership is explicit and it cannot race the active decision.

### 5.2 Session registry

Before parallel work starts, each active session declares:

- provider and model/product surface;
- owned branch or sandbox;
- owned files, systems, or questions;
- read-only versus write access;
- stopping condition;
- protected areas;
- expected evidence;
- handoff or integration owner.

One branch has one accountable owner. Ownership transfers whole and explicitly; two engines never co-own one branch.

### 5.3 Parallel and swarm isolation

- Parallel work must be non-overlapping.
- Swarm subtasks are read-only or use isolated worktrees/sandboxes.
- Use bounded swarm runs only when subtasks are independent and synthesizable.
- The integration branch is never swarm-edited.
- Every adopted patch is independently inspected by the accountable integrator.
- Swarm output never self-approves.

---

## 6. Required stopping condition

Before implementation, state the concrete finish line:

- exact player-visible or repository-visible outcome;
- expected files or systems;
- tests and named CI jobs that must pass;
- visual or asset evidence where applicable;
- code-coupled docs that must be updated;
- known non-goals;
- owner-gated items outside scope;
- environment limits that affect verification.

---

## 7. Execution-environment limits

Execution constraints are part of task design, not an afterthought.

Before assigning work, record relevant limits such as:

- foreground command timeout;
- background-process availability;
- browser lifecycle restrictions;
- local filesystem or connector scope;
- subagent duration;
- concurrency and quota windows;
- real-device access.

Long-running test or e2e suites must be:

1. pre-chunked into targeted specifications;
2. run through a suitable long-running local environment; or
3. delegated to CI as the authoritative long-run evidence surface.

A locally timed-out full suite is neither a failure of the code nor passing evidence. Report it accurately and use the appropriate evidence surface.

Environment-specific observations belong in dated research or task records, not as universal provider claims.

---

## 8. Evidence gate

A meaningful landing report must contain:

- branch, base, and exact head SHA;
- concise change summary;
- files or systems touched;
- fresh test and build results;
- named CI jobs and exact-head status;
- visual captures for visual changes;
- deterministic asset validation and hashes where applicable;
- compatibility or migration statement;
- remaining uncertainty;
- physical-device status where relevant.

Additional rules:

1. Re-run relevant verification after every rebase, restack, conflict resolution, or repair.
2. A merged branch is not reused for follow-up work; restart from the latest default branch.
3. A green result on an earlier head is stale evidence.
4. Repository-specific changelog conflict rules must be documented; where the accepted protocol is keep-both, preserve both entries.
5. If a check cannot run, report why and what evidence remains missing.

---

## 9. Test ownership

- Kimi and other volume tools may ideate test matrices and generate scaffolding.
- The implementation lead owns behavior-critical tests.
- Saves, migrations, rewards, mastery, curriculum, identity, validators, and state transitions require tests that demonstrably fail against the unfixed or invalid behavior where practical.
- ChatGPT audits whether the test evidence actually supports the completion claim.
- Test count alone is not coverage evidence.

---

## 10. Review separation

Use this default cycle:

1. One accountable provider implements.
2. A different provider reviews requirements, defects, compatibility, and evidence.
3. The implementation provider repairs.
4. Fresh exact-head verification runs.
5. ChatGPT produces or audits the landing report.
6. The owner performs reserved approvals or merges.

The implementation provider must not be the only reviewer of a consequential change.

---

## 11. Protected-path enforcement

Repository policy should be enforced deterministically where practical.

Examples:

- pre-tool hooks;
- sandbox permission rules;
- path allowlists or denylists;
- CI checks;
- explicit owner-approval markers.

Protected surfaces commonly include:

- workflow configuration;
- save schema and migration code;
- secrets and deployment configuration;
- profile identity;
- privacy, analytics, account, or monetization systems.

Enforcement tooling should be introduced in a separate, reviewable change because it can itself block development or alter repository authority.

---

## 12. Subscription-aware use

### ChatGPT Plus

Reserve for:

- consequential product decisions;
- independent review;
- wording and kid UX;
- visual judgment;
- cross-agent adjudication;
- polished artifacts and release communication.

Avoid long mechanical implementation and broad duplicate scans when another paid plan is better suited.

### Claude Max

Use as the main sustained coding budget:

- routine implementation;
- difficult debugging;
- architecture-sensitive work;
- repeated branch/test cycles;
- CI shepherding.

Use the highest-cost tier only when the task’s ambiguity or risk justifies it.

### Kimi Allegro

Use for:

- large-context audits;
- independent spikes;
- bounded parallel investigations;
- visual/browser exploration;
- research;
- bounded non-protected implementation;
- quota insurance through complete branch ownership transfer.

Treat quotas, concurrency, effort controls, and swarm limits as dated product facts. Check the current product before scheduling a large run.

---

## 13. Model council policy

Use a council only for:

- material architecture choices;
- overlapping PR reconciliation;
- unresolved consequential disagreement;
- player-experience conflicts across engineering, pedagogy, and art;
- save, deployment, privacy, monetization, or major scope decisions.

Do not use a council for routine fixes, approved implementation, tests, docs, or narrow visual polish.

Council format:

- one GitHub issue;
- explicit agenda and time-box;
- named chair;
- distinct lenses;
- one signed contribution per round;
- severity-tagged objections;
- chair-maintained decision log;
- named execution owner;
- no overlapping implementation before the relevant decision is logged;
- explicit conclusion and closure or archival state.

---

## 14. Provider-specific prompt shapes

### ChatGPT review prompt

```text
Act as the independent product and release reviewer.
Read authoritative repository guidance, the exact base-to-head diff,
tests, CI evidence, and visual evidence.

Evaluate separately:
1. requirement compliance;
2. code and architecture quality;
3. kid UX and wording;
4. visual quality where relevant;
5. compatibility and migration risk;
6. test and evidence quality.

Rank findings by severity.
Do not accept another agent's completion report as proof.
Recommend the smallest defensible next action.
```

### Claude implementation prompt

```text
Implement the approved bounded objective on an isolated branch.

Before editing:
- inspect authoritative docs and current code;
- confirm base and exact head;
- establish root cause for any bug;
- state the stopping condition, expected files, and environment limits.

During work:
- use the smallest safe solution;
- avoid unrelated files;
- own behavior-critical tests;
- update code-coupled docs in the same PR;
- run required checks after coherent slices.

Finish with exact-head evidence, compatibility, remaining uncertainty,
and the next owner.
Stop only for material ambiguity, a protected action, or a genuine blocker.
```

### Kimi audit or bounded-implementation prompt

```text
Work only within the declared session-registry scope.

For an audit:
- inspect the complete authoritative document set;
- identify contradictions, drift, overlap, and stale evidence;
- remain read-only;
- return exact paths and a ranked recommendation.

For a bounded implementation slice:
- use a separate branch or worktree;
- touch only non-protected paths;
- keep the change machine-verifiable;
- state environment timeouts before choosing test commands;
- own the branch completely;
- stop before merge.

For parallel subtasks:
- isolate every subtask;
- return a spike report with files, commands, evidence, risks, and rollback;
- do not self-approve or edit the integration branch.
```

---

## 15. Repository-specific evaluation program

Public benchmarks inform hypotheses; repository outcomes determine routing.

Maintain a representative evaluation set such as:

- cross-document contradiction hunt;
- subtle save or state bug review;
- flaky browser-test diagnosis;
- bounded engine/UI implementation;
- visual screenshot-pair QA;
- deterministic asset-manifest audit;
- pre-reader dialogue rewrite;
- overlapping-PR reconciliation;
- e2e-suite chunking under a command ceiling;
- landing report from raw CI evidence.

Score:

- correctness;
- requirement compliance;
- scope control;
- evidence quality;
- test quality;
- visual and wording quality;
- time and subscription cost;
- repair rounds;
- human review burden.

Measured project evidence may override any default role in this guide.

---

## 16. Eldoria-specific invariants

Every Eldoria agent must preserve:

- learning never gates adventure;
- stable profile identities;
- deterministic rewards;
- pre-reader read-aloud support;
- large touch targets and iPad-first controls;
- save compatibility unless explicitly approved;
- original or properly licensed art and audio;
- deterministic asset pipelines;
- evidence-first visual QA;
- no unsupported completion claims;
- physical-iPad confirmation tracked separately from emulation.

Eldoria-specific merge strategy, viewport floor, protected paths, verification commands, and authoritative document map belong in Eldoria’s repository guidance rather than in this cross-repository guide.

---

## 17. Maintenance

Review this guide when:

- a provider changes flagship models or plan limits;
- measured project evidence changes the best routing;
- a major workflow or security change occurs;
- a new repository needs materially different roles.

Review dated provider research quarterly and after major releases.  
This file remains the stable daily operating source.
