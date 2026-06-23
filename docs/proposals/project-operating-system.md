# Universal AI Project Operating System

Status: Proposal

This proposal designs V2 of `ai-delivery-standards` as a universal operating system for AI-assisted software projects. The goal is not to add more documentation. The goal is to define a portable control plane that every AI agent can read before it acts.

## Objective

Any project that installs these standards should give Claude Code, OpenAI Codex, Cursor, GPT, Gemini, or a future agent the same answer to these questions:

- What role am I performing?
- What feature is active?
- What lifecycle state is the feature in?
- What artifacts are required before I can proceed?
- What approvals are missing?
- What actions are forbidden from this state?
- What evidence must exist before the work is complete?

The operating system must be readable by humans, enforceable by agents, and portable across toolchains.

## V1 Audit Summary

The current repository already has strong foundations:

- `README.md` clearly defines specification-first delivery.
- `bin/ai-delivery.js` can initialize a project, sync standards, create feature artifacts, and run setup checks.
- `AGENTS.md` is generated into installed projects as the root behavioral contract.
- `agents/` adapts behavior for generic agents, Codex, Claude Code, and Cursor.
- `workflows/` covers new projects, new features, existing feature changes, bug fixes, refactors, autonomous queues, reviews, UI review, accessibility review, security review, releases, and spec sync.
- `standards/` covers engineering, frontend, backend, API design, testing, security, accessibility, observability, performance, and UI/UX.
- `templates/` provides REASONS Canvas, feature spec, implementation plan, test plan, review checklist, bugfix spec, feature queue, and ADR templates.
- `examples/scoped-help-assistant/` proves the current artifact model can express complex AI behavior.

V1 gaps that V2 must address:

- Lifecycle state is implicit in document text and front matter, not authoritative machine-readable state.
- Human approval is mentioned but not normalized into durable approval gates.
- Agents are instructed to create coherent artifacts, but they are not bound to a universal state machine.
- `docs/features/` is useful for human review, but there is no `.ai/` runtime control plane that agents must inspect.
- Agent roles are described by tool adapter files, not as reusable operating-system roles.
- There is no universal command protocol for humans and agents to move work through the lifecycle.
- Testing is a standard and artifact, but not a first-class lifecycle state owned by a Tester Agent.
- The current autonomous queue can continue across features without per-feature prompts, while the V2 vision requires explicit human approval before requirements, planning, and implementation completion gates.

## Design Principles

1. `AGENTS.md` is the bootloader.
   Every agent starts there. It tells the agent where the operating-system state lives and what behavior is mandatory.

2. `.ai/` is the runtime control plane.
   It contains active feature state, approvals, durable memory, role handoffs, and command history.

3. `ai-delivery-standards/` is the policy library.
   It contains reusable standards, schemas, role definitions, workflows, command definitions, and templates.

4. Human-readable and machine-readable artifacts coexist.
   Markdown artifacts explain intent. `state.json` tells agents what is currently allowed.

5. The system fails closed.
   If state, approval, or role is unclear, agents must stop, create or repair control artifacts, or ask for human direction.

6. Tool-specific adapters are secondary.
   Codex, Claude Code, Cursor, Gemini, and GPT adapters can improve ergonomics, but they cannot override the universal lifecycle.

7. Existing projects can migrate without rewriting history.
   V1 `docs/features/*` artifacts remain valid inputs and can be mapped into V2 `.ai/features/*` structures.

## Standards Repository V2 Structure

The standards repository should evolve toward this structure:

```text
ai-delivery-standards/
  AGENTS.md.template
  README.md
  package.json
  bin/
    ai-delivery.js
  agents/
    generic-agent.md
    codex.md
    claude-code.md
    cursor.md
    gemini.md
    gpt.md
  commands/
    command-protocol.md
    commands.schema.json
  docs/
    proposals/
  roles/
    requirements-agent.md
    planner-agent.md
    builder-agent.md
    reviewer-agent.md
    tester-agent.md
    sync-agent.md
  schemas/
    ai-config.schema.json
    feature-state.schema.json
    approval.schema.json
    feature-registry.schema.json
  standards/
  templates/
    v2/
      feature/
        requirements.md
        plan.md
        tests.md
        review.md
        approval.md
        state.json
        memory.md
      project/
        ai-config.json
        project-memory.md
        feature-registry.json
        AGENTS.md
    legacy/
      reasons-canvas.md
      feature-spec.md
      implementation-plan.md
      test-plan.md
      review-checklist.md
  workflows/
    lifecycle.md
    new-feature.md
    bug-fix.md
    refactor.md
    review.md
    testing.md
    spec-sync.md
```

This proposal does not require all files to be implemented immediately. It defines the target architecture.

## Installed Project V2 Structure

Every project that adopts V2 should contain:

```text
product-repo/
  AGENTS.md
  .ai/
    config.json
    registry.json
    state.json
    memory/
      project.md
      glossary.md
      constraints.md
      decisions.md
      validation.md
    features/
      FEA-001/
        state.json
        requirements.md
        plan.md
        tests.md
        review.md
        approval.md
        memory.md
        activity.md
        handoff.md
        artifacts/
          screenshots/
          logs/
          evals/
    queues/
      active.md
    agents/
      role-overrides.md
      tool-adapters.md
  ai-delivery-standards/
    agents/
    commands/
    roles/
    schemas/
    standards/
    templates/
    workflows/
  docs/
    ai-delivery.md
    architecture/
      overview.md
    features/
      FEA-001/
        README.md
```

### Authoritative Paths

| Concern | Authoritative Path | Notes |
| --- | --- | --- |
| Agent behavior | `AGENTS.md` | Root bootloader and behavioral contract. |
| Project operating config | `.ai/config.json` | Standards version, paths, command policy, approval policy. |
| Project-wide AI memory | `.ai/memory/` | Durable facts agents may rely on. |
| Feature lifecycle state | `.ai/features/<ID>/state.json` | Machine-readable source of truth. |
| Feature requirements | `.ai/features/<ID>/requirements.md` | Human-readable requirements and acceptance criteria. |
| Feature plan | `.ai/features/<ID>/plan.md` | Ordered implementation operations. |
| Feature tests | `.ai/features/<ID>/tests.md` | Test plan and validation evidence. |
| Feature review | `.ai/features/<ID>/review.md` | Reviewer and tester findings. |
| Human approvals | `.ai/features/<ID>/approval.md` | Durable gate evidence. |
| Human-facing docs | `docs/` | Optional mirror, summary, or architecture docs. |

## `.ai/` Control Plane

The `.ai/` directory is the operating system state directory. It should be committed unless a project explicitly separates local volatile files from durable governance files.

### `.ai/config.json`

Purpose:

- Declare the installed standards version.
- Declare authoritative paths.
- Declare command and approval policy.
- Declare whether legacy `docs/features` artifacts are mirrored or canonical.
- Declare project-specific overrides.

Conceptual shape:

```json
{
  "standardsVersion": "2.0.0",
  "standardsPath": "ai-delivery-standards",
  "agentInstructions": "AGENTS.md",
  "featureRoot": ".ai/features",
  "legacyFeatureRoot": "docs/features",
  "approvalPolicy": {
    "requirements": "human_required",
    "plan": "human_required",
    "implementation": "human_required"
  },
  "commandPolicy": {
    "protocol": "universal-command-protocol-v2",
    "allowChatCommands": true,
    "allowCliCommands": true
  }
}
```

### `.ai/registry.json`

Purpose:

- List known features.
- Identify the active feature.
- Track high-level status for dashboards, agents, and future CLI checks.

### `.ai/state.json`

Purpose:

- Provide project-level operating state.
- Point to the active feature.
- Record whether the project is in normal delivery, migration, release, or blocked mode.

### `.ai/memory/`

Purpose:

- Capture durable facts that should survive chat history loss.
- Avoid agents relying on invisible conversation context.

Recommended files:

| File | Purpose |
| --- | --- |
| `project.md` | Product purpose, users, major workflows, important boundaries. |
| `glossary.md` | Domain vocabulary agents must preserve. |
| `constraints.md` | Technical, business, legal, security, and operational constraints. |
| `decisions.md` | Lightweight memory of decisions that do not warrant full ADRs. |
| `validation.md` | Standard commands, test environments, and known validation caveats. |

## Feature Artifacts

V2 feature folders should contain:

```text
.ai/features/FEA-001/
  state.json
  requirements.md
  plan.md
  tests.md
  review.md
  approval.md
  memory.md
  activity.md
  handoff.md
  artifacts/
```

The canonical lifecycle artifacts are defined in detail in `docs/proposals/feature-lifecycle-v2.md`.

## Templates

V2 templates should collapse V1's five feature documents into a smaller canonical set while preserving the useful structure:

| V1 Artifact | V2 Artifact |
| --- | --- |
| `reasons-canvas.md` | `requirements.md` sections for requirements, entities, approach, structure, norms, safeguards. |
| `feature-spec.md` | `requirements.md` sections for UX, contracts, non-functional requirements, acceptance criteria. |
| `implementation-plan.md` | `plan.md`. |
| `test-plan.md` | `tests.md`. |
| `review-checklist.md` | `review.md`. |
| Ad hoc approval sections | `approval.md` and `state.json.approvals`. |

This reduces artifact sprawl while keeping V1 semantics intact.

## Memory Artifacts

Memory must be explicit and scoped:

- Project memory describes stable facts about the product.
- Feature memory describes local assumptions, decisions, unresolved risks, and discoveries.
- Handoff notes describe what the next role needs to know.
- Activity logs describe significant transitions and commands.

Agents may rely on memory artifacts only when they are committed or otherwise durable in the repository. Chat history is not durable memory.

## Lifecycle Governance

V2 enforces this universal flow:

```text
Idea
-> Requirements Agent
-> Human Approval
-> Planner Agent
-> Human Approval
-> Builder Agent
-> Reviewer Agent
-> Tester Agent
-> Human Review
-> Complete
```

The state machine in `docs/proposals/state-machine.md` defines the exact states and transitions. No agent-specific adapter may bypass it.

## Compatibility With Existing V1 Projects

Existing projects can keep:

- `AGENTS.md`
- `.ai-delivery.json`
- `ai-delivery-standards/`
- `docs/features/<ID>-<slug>/reasons-canvas.md`
- `feature-spec.md`
- `implementation-plan.md`
- `test-plan.md`
- `review-checklist.md`

V2 migration should add `.ai/` and map existing docs into canonical feature folders without requiring immediate deletion or rewriting. The migration plan is defined in `docs/proposals/migration-strategy.md`.

## Success Criteria

V2 succeeds when:

- A new agent can enter any installed project and determine the active feature state without extra prompting.
- A Builder Agent refuses to build until requirements and plan approvals exist.
- A Planner Agent refuses to plan until requirements are approved.
- A Reviewer Agent and Tester Agent can operate from the same artifacts regardless of AI provider.
- Human approvals are durable, inspectable, and tied to state transitions.
- Existing V1 projects can adopt V2 gradually.

