# Frontier Model Stack Research for Eldoria-V2 and Game Repositories

**Research snapshot:** 2026-07-21  
**Scope:** GPT-5.6 and Codex, Claude Code and current Claude models, Kimi K3 and the Kimi ecosystem  
**Subscription context:** ChatGPT Plus, Claude Max, Kimi Allegro  
**Status:** Dated external-research reference, not an authoritative repository instruction

> Product features, model availability, limits, pricing, and user experience can change quickly. Verify time-sensitive claims against current first-party documentation before changing a production workflow. Current user direction, authoritative repository documents, and accepted project decisions take precedence over this report.

---

## 1. Executive conclusion

The strongest practical arrangement is a **multi-model stack with role separation**, not a contest to select one permanent winner.

For the subscriptions currently available:

- **Claude Max / Claude Code** should be the primary implementation engine for sustained repository work, difficult debugging, architecture-sensitive changes, and risky refactors.
- **Kimi Allegro / Kimi K3, Kimi Code, and Kimi Work** should be the parallel-execution engine for independent spikes, broad audits, gameplay/UI experiments, local automation, large-context comparisons, and swarm-style exploration.
- **ChatGPT Plus / GPT-5.6 and Codex** should be the product supervisor, independent reviewer, player-facing wording and kid-UX authority, visual-review coordinator, documentation finisher, and release-orchestration layer.

This split is driven as much by **plan economics and product surfaces** as by raw model quality. Claude Max is the best-matched subscription for sustained coding. Kimi Allegro provides unusually high parallelism and agent capacity. ChatGPT Plus provides high-quality GPT-5.6 reasoning and strong review/artifact workflows, but is less suitable as the only long-running implementation engine because usage is more constrained.

The operating rule should therefore be:

> **Claude builds the hardest branch, Kimi explores the widest solution space, ChatGPT decides what is product-correct and independently verifies the landing.**

No model should be allowed to write, review, and approve the same consequential change without independent evidence.

---

## 2. Method and source hierarchy

This report separates four kinds of evidence:

1. **Official product documentation and release notes**  
   Used for model availability, context windows, pricing, supported tools, plan benefits, and intended workflows.

2. **Independent benchmark and analysis sites**  
   Used only as directional evidence. Benchmark ranks can change, may reward narrow task distributions, and should not substitute for repository-specific evaluation.

3. **Credible developer feedback**  
   GitHub issues, Hacker News, Stack Overflow, and focused community discussions are useful for discovering failure modes, but remain anecdotal.

4. **Project-specific operational evidence**  
   Eldoria-V2’s own history is ultimately more important than generic rankings: which agent consistently produces reviewable diffs, respects repository doctrine, supplies fresh tests, and responds well to feedback.

Where sources disagree:

- first-party documentation governs product features and limits;
- independent benchmarks inform comparative hypotheses;
- user feedback identifies risks to test;
- Eldoria’s own measured outcomes determine the final workflow.

---

## 3. Current market snapshot

The three ecosystems have converged on several major capabilities:

- approximately million-token context windows in flagship tiers;
- terminal or desktop coding agents;
- tool calling and browser/computer interaction;
- reusable repository instructions or skills;
- subagents or multi-agent execution;
- long-horizon coding and research workflows;
- reviewable artifacts, pull-request integration, and automated testing support.

Their differentiation is increasingly in **workflow reliability, subscription economics, integration maturity, and agent governance**, not simply benchmark intelligence.

### OpenAI

OpenAI’s current GPT-5.6 family is organized around **Sol, Terra, and Luna**, with the flagship family emphasizing long context, tool use, computer use, programmatic tool calling, prompt caching, persisted reasoning, and multi-agent workflows. Codex has developed into a broad software-delivery surface with CLI, GitHub review, reusable instructions, skills, IDE/app integration, and review-oriented workflows.

### Anthropic

Claude Code remains the most coding-native consumer product of the three. Its terminal-first approach, hooks, memory, subagents, git workflows, model selection, and long-running task style fit sustained repository work. Current high-end Claude materials emphasize Opus-class long-horizon agentic coding and Sonnet-class cost/performance.

### Moonshot / Kimi

Kimi K3 combines a very large context window, reasoning, visual understanding, structured output, tool use, caching, and OpenAI-compatible APIs. Kimi Code and Kimi Work extend this into terminal, IDE, local-file, browser, Goal-mode, and swarm workflows. Allegro’s concurrency and agent allowances make Kimi particularly attractive for parallel work.

---

## 4. OpenAI GPT-5.6 and Codex

### 4.1 Current functionality

The GPT-5.6 family is positioned for:

- long-context reasoning;
- text and image understanding;
- function and tool calling;
- web and file search;
- computer-use workflows;
- programmatic tool orchestration;
- explicit prompt caching;
- persisted reasoning;
- multi-agent execution in supported products and APIs;
- structured knowledge-work deliverables.

Codex adds software-development features including:

- repository-level instructions such as `AGENTS.md`;
- reusable skills;
- CLI and IDE workflows;
- GitHub pull-request review;
- diff-oriented review and editing;
- Work-style reviewable deliverables;
- automation and sandboxing controls;
- code-review flows designed to identify serious defects rather than merely restyle code.

### 4.2 Model tiers and recommended use

#### GPT-5.6 Sol

Use for:

- high-stakes independent review;
- architecture adjudication;
- subtle product and kid-UX reasoning;
- player-facing wording;
- cross-document synthesis;
- final release-readiness analysis;
- difficult visual or evidence interpretation;
- concise owner-facing decisions.

Avoid spending Sol capacity on:

- repetitive mechanical edits;
- routine dependency maintenance;
- large batches of low-risk code generation;
- broad parallel implementation that another subscription can cover.

#### GPT-5.6 Terra

Use where available for:

- pull-request triage;
- medium-risk review;
- test-plan generation;
- issue decomposition;
- comparison of competing implementation approaches;
- documentation drafts;
- routine repository audits.

#### GPT-5.6 Luna

Use where available for:

- high-volume extraction;
- formatting;
- metadata and checklist generation;
- repetitive low-risk review;
- simple documentation transforms;
- bulk summarization before a stronger model adjudicates.

### 4.3 ChatGPT Plus implications

ChatGPT Plus provides powerful GPT-5.6 access, but it should be treated as a **high-signal limited resource** rather than the default engine for every coding hour.

Practical implications:

- reserve GPT-5.6 High for consequential review and product decisions;
- avoid duplicating implementation work already assigned to Claude or Kimi;
- use ChatGPT’s strongest value areas: connected-context review, visual inspection, artifact creation, project continuity, wording, and cross-agent coordination;
- use Codex in focused sessions rather than assuming unlimited day-long execution;
- keep durable repository guidance concise so every OpenAI session spends fewer tokens rediscovering project rules.

### 4.4 Strengths for game repositories

OpenAI is especially strong for:

- independent review after another model implements;
- kid-facing copy and onboarding;
- reconciling design, pedagogy, and engineering constraints;
- visual direction and screenshot-based QA;
- producing polished Markdown, Word, PDF, spreadsheet, and presentation artifacts;
- release notes and landing reports;
- evaluating whether evidence actually supports a completion claim;
- synthesizing disagreements between agents.

For Eldoria-V2, ChatGPT should remain the established authority for:

- product judgment;
- kid UX;
- player-facing names and dialogue;
- visual-quality review;
- curriculum/player-experience reconciliation;
- final risk summaries.

### 4.5 Limitations and credible user feedback

Recent developer feedback around Codex has included:

- Windows stability problems;
- unclear or surprising usage limits;
- quota-display mismatches;
- regressions after desktop/product integration changes;
- inconsistent behavior across local environments.

These reports are anecdotal and version-sensitive, but they support a conservative conclusion:

> Codex is highly valuable for focused implementation and review, but ChatGPT Plus should not be the only execution backbone for an AI-led multi-repository program.

---

## 5. Claude Code and the Claude model family

### 5.1 Current functionality

Claude Code’s product surface is unusually aligned with repository delivery:

- terminal-native codebase inspection;
- direct file editing and command execution;
- git and pull-request workflows;
- project memory and instruction files;
- hooks for deterministic commands and policy enforcement;
- subagents;
- slash commands and reusable workflows;
- MCP and external tool integration;
- long-running implementation sessions;
- model selection among Anthropic tiers;
- compaction and context-management support.

Anthropic’s recent model materials emphasize improvements in:

- long-horizon agentic coding;
- tool-trigger reliability;
- adaptive thinking;
- recovery after context compaction;
- effort calibration;
- difficult codebase reasoning;
- fewer skipped tool calls.

### 5.2 Model tiers and recommended use

#### Opus-class model

Use for:

- architecture-sensitive changes;
- hard root-cause debugging;
- risky refactors;
- complex multi-file features;
- interpreting ambiguous legacy code;
- migrations;
- independent review of another agent’s consequential implementation;
- long autonomous work where judgment matters more than speed.

#### Sonnet-class model

Use for:

- routine feature implementation;
- test writing;
- documentation updates tied to code;
- bounded refactors;
- issue fixes with a clear root cause;
- repeated repository operations;
- high-volume branch work.

#### Haiku-class model

Use for:

- fast codebase searches;
- simple transformations;
- classification;
- repetitive checks;
- lightweight subagent tasks;
- drafting test cases that a stronger model reviews.

### 5.3 Claude Max implications

Claude Max is the best subscription match among the three for a **primary repo mechanic**.

Practical implications:

- Claude should receive the longest implementation sessions;
- use Sonnet for routine execution and Opus for high-risk reasoning;
- use deterministic hooks so linting, tests, forbidden-path checks, and branch rules do not depend on model memory;
- preserve expensive Opus capacity for the decisions most likely to cause rework;
- keep each task bounded by a stopping condition and evidence checklist.

### 5.4 Strengths for game repositories

Claude Code is the best default lead for:

- implementing approved designs;
- carrying a branch through code, tests, and docs;
- root-cause debugging;
- difficult TypeScript or engine refactors;
- repository-wide consistency changes;
- worktree and git hygiene;
- systematic test repair;
- migration and compatibility analysis;
- long-running tasks with multiple coherent slices.

For Eldoria-V2, Claude should usually be the lead when the task is:

- machine-verifiable;
- architecture-sensitive;
- code-heavy;
- likely to require many command/test cycles;
- too large for economical use of ChatGPT Plus;
- better handled by one accountable branch owner than by a swarm.

### 5.5 Limitations and credible user feedback

Positive reports frequently describe Claude Code as:

- strong at scoped implementation;
- good at asking useful questions;
- reliable for code review;
- effective in long sessions;
- better than chat-only tools at maintaining repository state.

Reported risks include:

- dynamic-workflow and sandbox quirks;
- tool allowlist surprises;
- model-inheritance inconsistencies;
- incomplete documentation for rapidly changing features;
- over-broad edits when task boundaries are weak;
- security concerns around browser-extension permissions.

Operational conclusion:

> Claude Code should be trusted with broad repository access only when repository policy is deterministic and the task scope is explicit. The model should execute the workflow, not define the governance.

---

## 6. Kimi K3, Kimi Code, and Kimi Work

### 6.1 Current functionality

Kimi K3 is positioned as a flagship reasoning and agent model with:

- approximately one-million-token context;
- native image/visual understanding;
- always-on reasoning;
- configurable reasoning effort;
- automatic context caching;
- structured JSON and schema output;
- tool calling;
- internet search;
- dynamic tool loading;
- OpenAI-compatible API patterns.

Kimi Code provides:

- terminal and IDE coding;
- repository-wide analysis;
- command execution;
- file editing;
- web search;
- subagents.

Kimi Work expands into:

- local-folder and local-file workflows;
- browser automation;
- Goal mode;
- plugins;
- scheduled or repeated work;
- permission boundaries;
- large agent swarms;
- broad desktop execution.

### 6.2 Model tiers and recommended use

#### Kimi K3

Use for:

- large-context repository analysis;
- visual/gameplay inspection;
- comparing many documents or branches;
- independent architecture proposals;
- research-heavy coding work;
- multi-modal audits;
- broad cross-repo reasoning.

#### Kimi K2.7 Code or current coding specialist

Use for:

- high-volume implementation;
- repetitive test generation;
- straightforward refactors;
- branch experiments;
- bulk code review;
- lower-cost coding subtasks.

#### Smaller Kimi tiers

Use for:

- extraction;
- categorization;
- formatting;
- repetitive local-file tasks;
- swarm subtasks with narrow instructions.

### 6.3 Kimi Allegro implications

Allegro’s value is primarily **parallel capacity**:

- multiple concurrent tasks;
- large agent-credit allowance;
- swarm access;
- elevated Kimi Code usage;
- many professional-database calls.

Practical implications:

- use Kimi for work that benefits from multiple independent attempts;
- avoid spending ChatGPT or Opus capacity on broad initial exploration;
- run parallel audits of separate systems rather than letting multiple agents edit the same files;
- use swarms for comparison, reconnaissance, and test ideas—not for uncontrolled concurrent writes;
- assign one lead to integrate findings.

### 6.4 Strengths for game repositories

Kimi is the best fit for:

- independent solution spikes;
- broad repo audits;
- screenshot and UI comparison;
- gameplay loop analysis;
- local asset-pipeline experiments;
- batch test generation;
- browser/playtest exploration;
- research across many sources;
- comparing approaches before implementation;
- parallel review of non-overlapping areas.

For Eldoria-V2 and similar game repositories, useful Kimi roles include:

- audit separate maps, systems, or asset families concurrently;
- generate multiple UI or mechanic implementation proposals;
- inspect visual evidence across many screenshots;
- run playtest-emulation explorations;
- analyze performance traces and test output;
- compare several PRs for overlap and reconciliation risk.

### 6.5 Limitations and credible user feedback

Recent reports have included:

- MCP schema-validation issues;
- loopback and proxy configuration problems;
- missing lifecycle/plugin APIs;
- Windows and terminal-rendering problems;
- encoding issues;
- fast-changing product behavior.

Operational conclusion:

> Kimi is currently the highest-upside parallel engine, but it should not be the sole owner of protected release operations or the only reviewer of its own swarm output.

---

## 7. Comparative task routing

| Task | Primary | Secondary / reviewer | Rationale |
|---|---|---|---|
| Product direction | ChatGPT Sol | Claude Opus, Kimi K3 | ChatGPT combines project context, player focus, wording, and design judgment |
| Kid UX and onboarding | ChatGPT Sol | Kimi K3 visual review | Player-facing judgment and pre-reader considerations |
| Dialogue and display names | ChatGPT Sol | Claude for implementation | ChatGPT is established wording reviewer |
| Architecture-sensitive implementation | Claude Opus | ChatGPT independent review | Long-horizon repo work plus independent product/risk review |
| Routine feature implementation | Claude Sonnet | Kimi coding specialist | Max plan supports sustained execution |
| Root-cause debugging | Claude Opus | ChatGPT audit, Kimi independent hypothesis | Claude leads systematic branch work |
| Broad repository audit | Kimi K3 | ChatGPT or Claude adjudication | Large context and parallelism |
| Parallel implementation spikes | Kimi | Claude chooses/integrates | Use non-overlapping sandboxes or worktrees |
| PR triage | ChatGPT Terra/Sol | Kimi bulk scan | Strong structured decision output |
| Final PR review | ChatGPT Sol or Claude independent reviewer | Other provider | Writer must not be sole approver |
| Test generation | Claude Sonnet / Kimi Code | ChatGPT reviews coverage claims | Volume plus evidence scrutiny |
| Visual QA | ChatGPT | Kimi parallel comparison | ChatGPT owns accepted visual direction |
| Asset generation workflow | ChatGPT art direction; Claude/Kimi tooling | Independent visual audit | Separate art judgment from pipeline execution |
| Documentation | ChatGPT | Claude verifies code accuracy | Artifact and wording strength |
| Release notes / landing report | ChatGPT | Implementer verifies facts | Owner-facing clarity |
| CI/workflow changes | Claude implementation | ChatGPT audit; owner approval | High consequence and owner gate |
| Deployment/migrations | Human owner | Models provide runbook and evidence | Irreversible or externally consequential |
| Model council | ChatGPT/Kimi/Claude | Chair synthesis | Only for genuinely consequential disagreement |

---

## 8. Recommended operating framework

### 8.1 Authority order

Use this order in every repository:

1. Current explicit user direction.
2. Current authoritative repository documents and accepted decisions.
3. Repository-specific operating and change-control guide.
4. The stable multi-model operating guide.
5. This dated research report.
6. General provider defaults.

A model’s completion report is never authoritative evidence.

### 8.2 Task classification

Before substantive work, classify the task:

- direct answer;
- audit/review;
- new feature/design;
- approved implementation;
- bug/debugging;
- visual/asset/UI;
- current external research.

Then select one accountable lead and one independent reviewer.

### 8.3 Risk classes

#### Low risk

Examples:

- typo;
- docs-only correction;
- test-only improvement;
- narrow deterministic script change.

Lead: Claude Sonnet, Kimi coding tier, or focused Codex session.  
Review: lightweight independent check.

#### Medium risk

Examples:

- bounded feature;
- new UI component;
- gameplay tuning;
- contained asset-pipeline work.

Lead: Claude.  
Parallel support: Kimi.  
Review: ChatGPT or a separate Claude/Kimi reviewer.

#### High risk

Examples:

- save changes;
- architecture replacement;
- major dependency;
- CI/deployment;
- privacy or data collection;
- monetization;
- broad art-direction shift;
- destructive migration.

Lead: strongest appropriate model, usually Claude Opus.  
Independent review: ChatGPT Sol plus another provider when practical.  
Decision: human owner.

### 8.4 Branch ownership

- One agent owns a branch at a time.
- Parallel agents work on non-overlapping branches, files, or questions.
- Swarms may investigate, but should not simultaneously edit the same integration branch.
- The integration owner must independently inspect every adopted patch.
- A merge requires fresh exact-head evidence.

### 8.5 Evidence standard

A meaningful completion claim should include:

- exact head SHA;
- files changed;
- test commands and results;
- build result;
- visual captures where relevant;
- asset validation where relevant;
- remaining uncertainty;
- physical-device status where relevant;
- explicit owner-gated items still pending.

### 8.6 Cross-review rule

The preferred pattern is:

1. One provider implements.
2. A second provider reviews requirements and defects.
3. The original provider repairs.
4. Fresh tests run on the repaired exact head.
5. ChatGPT or the designated release reviewer produces the landing report.
6. Owner-gated actions remain with the human.

---

## 9. Subscription-aware allocation

### Claude Max

Spend heavily on:

- long implementation sessions;
- difficult debugging;
- multi-file refactors;
- test and branch iteration;
- codebase exploration tied directly to execution.

Conserve by:

- using Sonnet for routine work;
- reserving Opus for ambiguity and high consequence;
- preventing duplicate agents from redoing the same branch.

### Kimi Allegro

Spend heavily on:

- parallel audits;
- independent spikes;
- local automation;
- browser exploration;
- visual comparison;
- high-volume test ideas;
- research and cross-repo analysis.

Conserve by:

- using swarms only where approaches can remain independent;
- stopping before concurrent integration;
- assigning one lead to synthesize outputs.

### ChatGPT Plus

Spend heavily on:

- product decisions;
- independent review;
- wording;
- visual judgment;
- documentation;
- orchestration;
- high-value audits.

Conserve by:

- avoiding long mechanical coding sessions when Claude Max is available;
- using project files and concise context instead of restating history;
- delegating broad first-pass research to Kimi;
- asking GPT-5.6 to adjudicate rather than reproduce all work.

---

## 10. Recommended model councils

Use a model council only when:

- architecture choices have material tradeoffs;
- agents disagree on a consequential decision;
- player experience, pedagogy, engineering, and art pull in different directions;
- two overlapping PRs need reconciliation;
- a save, deployment, privacy, or monetization decision is involved.

Do not use a council for:

- routine implementation;
- already approved work;
- narrow test fixes;
- documentation cleanups;
- visual polish inside an accepted direction;
- deterministic asset generation under an approved contract.

Council rules:

- explicit agenda;
- distinct lenses;
- one comment per model per round;
- severity-tagged objections;
- time-box;
- chair-maintained decision log;
- no implementation racing the council;
- final execution owner named.

---

## 11. Risks and controls

### Hallucinated completion

**Control:** inspect diffs and require fresh tests. Never accept another agent’s summary as proof.

### Scope drift

**Control:** protected-file list, expected file map, and explicit non-goals.

### Conflicting concurrent work

**Control:** branch ownership and non-overlapping parallel tracks.

### Model-version drift

**Control:** date research, pin model IDs where possible, and re-run repository-specific evaluations before changing defaults.

### Usage exhaustion

**Control:** allocate tasks by plan economics; use expensive reasoning only at decision points.

### Security and secrets

**Control:** no secrets in prompts, no production credentials in agent environments, least-privilege connectors, owner-gated infrastructure.

### Visual regression

**Control:** comparable in-game screenshots, exact asset hashes, deterministic normalization, and independent visual review.

### Kid-UX regression

**Control:** preserve read-aloud paths, large touch targets, clear direction, deterministic rewards, and “learning never gates adventure.”

---

## 12. Repository-specific evaluation program

Generic benchmark rankings should be supplemented by an Eldoria evaluation set.

Create 10–20 representative tasks such as:

- review a PR for a subtle save bug;
- diagnose a flaky Playwright test;
- implement a bounded Phaser UI fix;
- compare two visual screenshots;
- audit a sprite normalization manifest;
- write pre-reader dialogue;
- reconcile conflicting planning docs;
- design tests for a deterministic reward system;
- produce a landing report from raw CI evidence;
- identify overlap between two PRs.

Score each model on:

- correctness;
- requirement compliance;
- scope control;
- evidence quality;
- test quality;
- visual judgment;
- wording quality;
- time and usage cost;
- number of repair rounds;
- human review burden.

The workflow should evolve from this measured project evidence, not from public rankings alone.

---

## 13. Final recommendation

Adopt this default division:

### ChatGPT

**Chief product, kid-UX, visual, wording, review, and release authority.**

### Claude Code

**Primary implementation, debugging, architecture, and branch-delivery engine.**

### Kimi

**Parallel research, audit, experimentation, visual/gameplay exploration, and swarm engine.**

### Human owner

**Final authority for product scope, destructive actions, infrastructure, privacy, monetization, save compatibility, and merge decisions where explicitly reserved.**

This structure provides:

- deep implementation capacity from Claude Max;
- parallel throughput from Kimi Allegro;
- high-signal product and review quality from ChatGPT Plus;
- independent verification between providers;
- less duplicated work;
- lower usage waste;
- clearer accountability.

---

## 14. Selected source register

### OpenAI official

- GPT-5.6 in ChatGPT: https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt
- ChatGPT Plus: https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus
- GPT-5.6 launch: https://openai.com/index/gpt-5-6/
- Model documentation: https://developers.openai.com/api/docs/models
- Latest-model guide: https://developers.openai.com/api/docs/guides/latest-model
- Tools guide: https://developers.openai.com/api/docs/guides/tools
- Codex best practices: https://developers.openai.com/codex/learn/best-practices
- Codex GitHub integration: https://developers.openai.com/codex/third-party/github
- Codex code review: https://developers.openai.com/codex/code-review
- Codex pricing: https://developers.openai.com/codex/pricing
- Data controls: https://developers.openai.com/api/docs/guides/your-data

### Anthropic official

- Claude Code overview: https://docs.anthropic.com/en/docs/claude-code/overview
- Claude Code release notes: https://docs.anthropic.com/en/release-notes/claude-code
- Claude Code hooks: https://docs.anthropic.com/en/docs/claude-code/hooks-guide
- Claude Code SDK / workflows: https://docs.anthropic.com/en/docs/claude-code/sdk
- Sonnet 5 changes: https://docs.anthropic.com/en/docs/about-claude/models/whats-new-sonnet-5
- Opus 4.8 changes: https://docs.anthropic.com/en/docs/about-claude/models/whats-new-claude-4-8
- API release notes: https://docs.anthropic.com/en/release-notes/api
- Max usage information: https://support.anthropic.com/en/articles/11647753-understanding-usage-and-length-limits

### Kimi official

- Kimi K3 quickstart: https://platform.kimi.ai/docs/guide/kimi-k3-quickstart
- Model list: https://platform.kimi.ai/docs/models
- Platform overview: https://platform.kimi.ai/docs/overview
- API chat documentation: https://platform.kimi.ai/docs/api/chat
- K3 pricing: https://platform.kimi.ai/docs/pricing/chat-k3
- Membership pricing: https://www.kimi.com/help/membership/membership-pricing
- Kimi Code introduction: https://www.kimi.com/resources/kimi-code-introduction
- Kimi Work introduction: https://www.kimi.com/resources/kimi-work-introduction
- Kimi Code repository: https://github.com/MoonshotAI/kimi-code

### Independent and community sources

- Artificial Analysis Kimi K3 assessment: https://artificialanalysis.ai/articles/kimi-k3-achieves-3-in-the-artificial-analysis-intelligence-index-comparable-to-opus-4-8-and-gpt-5-5
- LiveBench: https://livebench.ai/
- OpenAI Codex issues: https://github.com/openai/codex/issues
- Claude Code issues: https://github.com/anthropics/claude-code/issues
- Kimi Code issues: https://github.com/MoonshotAI/kimi-code/issues
- Hacker News discussions should be treated as anecdotal rather than authoritative.

---

## 15. Research maintenance

Review this report when any of the following occurs:

- a flagship model changes;
- subscription limits materially change;
- a provider launches a new coding-agent product;
- Eldoria accumulates enough measured model performance to overturn a generic recommendation;
- a major security or data-handling issue affects an enabled connector;
- the project changes engine or deployment architecture.

Recommended review cadence: quarterly, or immediately after a major model release.
