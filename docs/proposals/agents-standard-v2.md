# AGENTS.md Standard V2

Status: Proposal

Current implementation note: approval gates are configurable through `.ai/config.json` `approvalPolicy`. This proposal's human-approval language describes the default `human_required` policy; a project may set any gate to `not_required` to allow automated advancement after required artifacts and evidence exist.

This proposal redesigns `AGENTS.md` as the primary behavioral contract for all AI agents operating in a project. It must be installable into any software repository and understandable by tool-specific agents, general chat assistants, coding agents, and future AI systems.

## Objective

`AGENTS.md` should function as the bootloader for the AI project operating system:

- It tells agents where the project control plane lives.
- It requires agents to determine their role before acting.
- It requires agents to read feature state before acting.
- It binds agents to approval gates.
- It defines forbidden behavior.
- It points tool-specific agents to adapters without letting adapters override the universal lifecycle.

## V1 Audit Summary

The current generated `AGENTS.md` is a strong specification-first instruction file. It already includes:

- The prime directive: no non-trivial implementation before specification.
- A precedence order for instructions.
- Trivial versus non-trivial work classification.
- Required reading order.
- Required feature artifacts.
- New feature, existing feature, bug fix, autonomous queue, review, and sync rules.
- Refusal conditions.
- Quality standards.

V2 should preserve those strengths but add:

- Mandatory `.ai/` state awareness.
- A universal role selection protocol.
- Explicit approval gates for requirements, planning, and implementation.
- A hard rule that state machine violations are forbidden even if a user asks the agent to skip ahead.
- A command protocol reference.
- A clear split between governance artifacts and implementation artifacts.

## Required AGENTS.md Responsibilities

Every installed `AGENTS.md` must define:

| Area | Requirement |
| --- | --- |
| Boot sequence | What files every agent must read before acting. |
| State awareness | How to find active feature state and determine allowed actions. |
| Role awareness | How to determine whether the agent is Requirements, Planner, Builder, Reviewer, Tester, or Sync. |
| Workflow | The required Idea -> Requirements -> Approval -> Plan -> Approval -> Build -> Review -> Test -> Human Review -> Complete lifecycle. |
| Approval gates | Which transitions require human approval and where evidence is recorded. |
| Repository expectations | Paths, standards bundle, memory files, docs, tests, and command policy. |
| Forbidden actions | State violations, self-approval, scope expansion, implementation before approval, and undocumented drift. |
| Refusal behavior | What to do when the requested action is unsafe or not allowed by state. |

## Proposed Installable AGENTS.md Shape

The installed file should use this structure:

````markdown
# Agent Instructions

This repository is governed by ai-delivery-standards V2.

## Prime Directive

AI agents must follow the repository state machine. No agent may implement,
plan, review, test, approve, or complete work unless the active feature state
allows that action.

## Boot Sequence

Before acting, every agent must read:

1. `AGENTS.md`
2. `.ai/config.json`
3. `.ai/registry.json`
4. `.ai/state.json`, if present
5. `.ai/features/<FEATURE-ID>/state.json`, for the active feature
6. `.ai/features/<FEATURE-ID>/approval.md`
7. The role definition for the current role
8. Relevant standards and workflow files under `ai-delivery-standards/`

If the active feature cannot be identified, run `/status` semantics and ask
for the feature ID only if it cannot be inferred safely.

## Operating System Paths

| Purpose | Path |
| --- | --- |
| Project config | `.ai/config.json` |
| Feature registry | `.ai/registry.json` |
| Project memory | `.ai/memory/` |
| Feature state | `.ai/features/<ID>/state.json` |
| Feature artifacts | `.ai/features/<ID>/` |
| Standards bundle | `ai-delivery-standards/` |

## Required Lifecycle

Every non-trivial feature must move through:

Idea -> Requirements Agent -> Human Approval -> Planner Agent -> Human Approval
-> Builder Agent -> Reviewer Agent -> Tester Agent -> Human Review -> Complete

The state machine is defined in:

`ai-delivery-standards/workflows/lifecycle.md`

## Required States

Valid feature states are:

- `intake`
- `requirements_draft`
- `requirements_pending_review`
- `requirements_approved`
- `plan_draft`
- `plan_pending_review`
- `plan_approved`
- `building`
- `reviewing`
- `testing`
- `ready_for_human_review`
- `complete`
- `blocked`

## Role Selection

If the user's command or current feature state implies a role, adopt that role.
If role and state conflict, state wins.

| State | Allowed Primary Role |
| --- | --- |
| `intake` | Requirements Agent |
| `requirements_draft` | Requirements Agent |
| `requirements_pending_review` | Requirements Agent |
| `requirements_approved` | Planner Agent |
| `plan_draft` | Planner Agent |
| `plan_pending_review` | Planner Agent |
| `plan_approved` | Builder Agent |
| `building` | Builder Agent |
| `reviewing` | Reviewer Agent |
| `testing` | Tester Agent |
| `ready_for_human_review` | Sync Agent |
| `complete` | Sync Agent, read-only unless starting a new lifecycle entry |
| `blocked` | Current role or Sync Agent |

## Approval Gates

Human approval is required for:

1. Requirements approval:
   `requirements_pending_review -> requirements_approved`
2. Plan approval:
   `plan_pending_review -> plan_approved`
3. Implementation approval:
   `ready_for_human_review -> complete`

Approval evidence must be recorded in:

`.ai/features/<ID>/approval.md`

Agents may record human approval after it is given, but agents must never
self-approve or infer approval from silence.

## Universal Commands

Commands may be issued in chat, CLI, PR comments, issue comments, or another
project-approved interface. If no CLI exists, agents must interpret the command
semantics directly.

Canonical commands:

- `/start-feature`
- `/status`
- `/approve-requirements`
- `/approve-plan`
- `/build`
- `/ai-review`
- `/test`
- `/continue`
- `/complete`

The command protocol is defined in:

`ai-delivery-standards/commands/command-protocol.md`

## Required Feature Artifacts

Each feature must contain:

```text
.ai/features/<ID>/
  state.json
  requirements.md
  plan.md
  tests.md
  review.md
  approval.md
  memory.md
  activity.md
  handoff.md
```

## State-Aware Behavior

Before modifying files, every agent must answer:

- What feature is active?
- What state is it in?
- What role am I performing?
- Is my requested action allowed in this state?
- What approvals are required?
- Which artifacts must be updated before and after the action?

If the answer is unclear, the agent must stop and repair state, ask for the
missing feature ID, or mark the feature blocked.

## Forbidden Actions

Agents must not:

- Build before requirements approval exists.
- Build before plan approval exists.
- Plan before requirements approval exists.
- Complete a feature before human implementation approval exists.
- Self-approve any gate.
- Treat chat history as durable approval unless it is recorded in `approval.md`.
- Skip Reviewer Agent or Tester Agent stages.
- Modify production code while acting as Requirements Agent or Planner Agent.
- Modify production behavior while acting as Reviewer Agent or Tester Agent unless the lifecycle returns to `building`.
- Expand scope beyond approved requirements and plan.
- Hide unresolved blockers, test failures, security risks, accessibility gaps, or spec drift.
- Continue work from `blocked` without resolving or explicitly accepting the blocker.

## Drift Rule

If implementation reality contradicts approved requirements or plan:

1. Stop the current action.
2. Record the drift in `activity.md` or `review.md`.
3. Return to the appropriate earlier state:
   - Requirements change: `requirements_draft`
   - Plan change only: `plan_draft`
   - Implementation defect: `building`
4. Obtain any required approval again before continuing.

## Refusal Format

When a request violates state or approval gates, respond:

```text
I cannot proceed with <requested action> because feature <ID> is in state
<state>, and that action requires <required state or approval>.

Allowed next step:
<specific command or artifact update>
```

## Completion Rule

Before final response, agents must ensure:

- Feature state is current.
- Required artifacts are updated.
- Approval status is correct.
- Validation evidence is recorded.
- Remaining risks and blockers are explicit.
````

## Tool-Agnostic Behavior

The standard must not depend on any one agent product.

| Tool Type | Required Behavior |
| --- | --- |
| Terminal coding agent | Read files, update artifacts, edit code only when state permits. |
| IDE assistant | Use opened files and repo search, but still inspect `.ai/` state first. |
| Chat-only agent | Explain required state transitions and produce artifacts for the human to apply. |
| PR reviewer bot | Review against approved requirements, plan, tests, and state. |
| Future autonomous agent | Execute command protocol, but only through allowed transitions. |

## Repository Expectations

An installed project should declare:

- Standards version.
- Package manager and validation commands.
- Feature root.
- Approval policy.
- Architecture overview location.
- Security, accessibility, testing, and observability standards.
- Whether `docs/features` mirrors `.ai/features`.
- How human approvals are captured.

Project-specific rules may be stricter than the universal standard, but they must not allow bypassing V2 approval gates.

## Interaction With Existing Agent Adapters

Tool-specific files such as `agents/codex.md`, `agents/claude-code.md`, and `agents/cursor.md` remain useful. In V2 they become adapters, not primary policy.

Precedence:

1. System, developer, platform, and tool instructions.
2. User's current request.
3. Installed project `AGENTS.md`.
4. `.ai/` state and approvals.
5. Project docs and standards.
6. Tool-specific adapter guidance.
7. General model behavior.

If a tool-specific adapter conflicts with the state machine, the state machine wins.

## Success Criteria

The V2 `AGENTS.md` standard succeeds when an arbitrary agent can enter a repository and correctly refuse this request:

```text
Build this feature now.
```

when the feature is in `requirements_pending_review`, and can instead say:

```text
This feature needs requirements approval first. The allowed next command is
/approve-requirements or a requirements change request.
```
