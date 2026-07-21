# Frontier Model Stack Research — Verified Errata and Provider-Review Addendum

**Date:** 2026-07-21  
**Applies to:** `2026-07-21_FRONTIER_MODEL_STACK_RESEARCH.md`  
**Status:** Dated correction layer; does not replace current first-party product documentation

> The original research remains a dated snapshot. This addendum records corrections found through independent Claude and Kimi review and a final ChatGPT verification pass. Stable operating policy belongs in the operating guide, not in this file.

---

## 1. Adjudicated conclusion

The original strategic conclusion remains sound:

- Claude Code is the default sustained implementation and difficult-debugging engine.
- Kimi is the large-context audit, parallel exploration, and bounded second implementation engine.
- ChatGPT is the product, kid-UX, visual, wording, independent-review, and release-adjudication layer.
- The human owner retains protected authority.
- A consequential change requires independent review and fresh evidence.

The provider reviews converged on **APPROVE WITH AMENDMENTS**.

---

## 2. OpenAI corrections and clarifications

Verified first-party sources on 2026-07-21 indicate:

- GPT-5.6 Sol powers Medium and High reasoning on ChatGPT Plus.
- Extra High and Sol Pro are not included with Plus.
- GPT-5.6 Terra and Luna are not standard Chat model-picker options; Plus can use them in supported Work and Codex surfaces.
- GPT-5.5 Instant remains the everyday default.
- Codex usage is governed by the current ChatGPT/Codex rate-card system and should not be treated as unlimited.

Operational effect:

- Reserve GPT-5.6 Sol High for consequential product decisions, complex review, and adjudication.
- Use Terra or Luna in supported Work/Codex contexts for lower-risk and higher-volume work.
- Do not design the repository workflow around Sol Pro or Extra High access on a Plus plan.

Primary sources:

- https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt
- https://openai.com/index/gpt-5-6/
- https://help.openai.com/en/articles/20001106

---

## 3. Anthropic corrections and clarifications

Current first-party materials identify a mixed Claude lineup including:

- Claude Fable 5 for the hardest long-horizon coding and knowledge work;
- Claude Sonnet 5 for frontier coding and agent work at scale;
- Claude Opus 4.8 as a still-current high-capability model;
- smaller tiers for lower-cost work where available.

Claude Code should not be described only as terminal-first. Its current operating surfaces include CLI, IDE, desktop/web-connected workflows, GitHub integration, hooks, memory, subagents, and remote or asynchronous workflows.

Operational effect:

- Use the strongest Claude tier for high-risk architecture, migrations, and hard root-cause debugging.
- Use the balanced coding tier for routine feature delivery.
- Use hooks and repository guidance to enforce policy deterministically.
- Claude should own CI shepherding, restacks, and code-coupled documentation for its branches.

Primary sources:

- https://www.anthropic.com/claude/fable
- https://www.anthropic.com/news/redeploying-fable-5
- https://www.anthropic.com/news
- https://www.anthropic.com/research/claude-opus-4-8
- https://docs.anthropic.com/en/docs/claude-code/overview

---

## 4. Kimi corrections and clarifications

### 4.1 Verified plan facts

The current global Kimi plan table lists Allegro at:

- $99 monthly, or $79 effective monthly on annual billing;
- 360 shared agent credits;
- four concurrent agent tasks;
- 120 Agent Swarm uses;
- four concurrent swarm subtasks;
- 15× Kimi Code credits;
- 12,000 professional-database calls.

The professional databases have little direct value for Eldoria development and should not influence routing.

Primary sources:

- https://www.kimi.com/help/membership/membership-overview
- https://www.kimi.com/help/membership/membership-pricing

### 4.2 Kimi Code limits

Kimi Code officially documents:

- a weekly quota;
- a rolling five-hour rate window;
- shared quota across logged-in tools and devices;
- current high-frequency limits that vary by plan and load.

Heavy coding sessions should therefore be scheduled against current usage state rather than the monthly headline multiplier.

Primary sources:

- https://www.kimi.com/code/docs/en/kimi-code/membership.html
- https://www.kimi.com/code/docs/en/

### 4.3 K3 and thinking effort

The launch blog stated that K3 initially used max thinking effort by default and that lower effort modes would follow. The Kimi Code July 20 release notes now state that low, high, and max effort are supported in Kimi Code.

Adjudication:

- effort controls are product-surface and version specific;
- do not describe them as universally unavailable or universally available across every Kimi surface;
- verify in the active client before routing a task by effort mode.

Primary sources:

- https://www.kimi.com/blog/kimi-k3
- https://www.kimi.com/code/docs/en/kimi-code/whats-new.html

### 4.4 Weights and “open” status

Official Kimi materials are not fully consistent as of this date:

- the launch blog says full weights will be released by 2026-07-27;
- current Kimi Code release notes describe K3 as released and open-sourced.

Until a specific downloadable weight release and license are independently confirmed, self-hosting should not influence the operating workflow.

### 4.5 Swarm vocabulary

Replace “large swarms” with **bounded beta swarm**. Allegro’s current plan lists four concurrent swarm subtasks. Swarms are appropriate for independent read-only or isolated questions, not shared-branch editing.

### 4.6 Execution ceiling evidence

A Kimi Work session on the owner’s machine showed a 300-second foreground-command timeout and no usable background shell for that environment.

This is valid project evidence but not a universal Kimi product guarantee. The stable rule is:

- declare environment ceilings before execution;
- pre-chunk long suites;
- use CI as the long-run verifier where needed.

Primary sources and project evidence:

- Kimi provider review dated 2026-07-21;
- local Kimi Work execution record;
- https://github.com/MoonshotAI/kimi-code

---

## 5. Governance amendments adopted

1. One authoritative GitHub coordination surface for the same repository and overlapping material scope.
2. A session registry before parallel work.
3. One branch, one accountable owner; ownership transfers explicitly.
4. Fresh exact-head CI after every rebase, restack, conflict resolution, or repair.
5. Follow-up branches restart from the latest default branch.
6. Kimi ideates tests; the implementation lead owns behavior-critical tests.
7. Kimi may lead bounded, non-protected, machine-verifiable implementation slices.
8. Claude leads CI shepherding and code-coupled documentation for its branches.
9. ChatGPT adjudicates cross-agent input and owns player-facing or release wording.
10. Volatile plan facts stay outside the stable guide.
11. Protected-path enforcement should be deterministic and introduced in a separate PR.
12. Cross-provider review remains unchanged.

---

## 6. Final ChatGPT rulings

### Ruling A — Kimi as a second implementation engine

**Adopted with scope controls.**

Conditions:

- non-protected paths;
- bounded and machine-verifiable objective;
- one complete branch owner;
- no concurrent co-ownership with Claude;
- different-provider review;
- full verification through a suitable environment or CI;
- no self-approval or direct swarm integration.

### Ruling B — Guide ownership

**ChatGPT issues the stable v1.1 guide.**

Claude may implement it in the repository, but cross-agent policy adjudication remains with ChatGPT and protected governance changes remain owner-ratified.

### Ruling C — Merge authority

Do not encode “the owner performs every merge” as a universal cross-repository rule.

- Merge authority follows current owner delegation and repository policy.
- Governance or protected-path changes remain owner-gated unless explicitly delegated.
- Eldoria’s accepted current merge strategy is recorded in its repository guidance.

### Ruling D — Coordination scope

The one-surface rule applies to the same repository and overlapping material decision scope. It does not prohibit unrelated, explicitly registered work.

---

## 7. Source-review status

- Claude review: **APPROVE WITH AMENDMENTS**
- Kimi review: **APPROVE WITH AMENDMENTS**
- ChatGPT adjudication: **RATIFIED WITH THE RULINGS ABOVE**

The repository-specific evaluation program remains the mechanism for overturning default routing as better project evidence accumulates.
