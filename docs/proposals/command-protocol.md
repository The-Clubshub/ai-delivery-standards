# Universal Command Protocol

Status: Proposal

Current implementation note: approval gates are configurable through `.ai/config.json` `approvalPolicy`. This proposal's human-approval language describes the default `human_required` policy; a project may set any gate to `not_required` to allow automated advancement after required artifacts and evidence exist.

This proposal defines a tool-agnostic command protocol for AI-assisted projects governed by `ai-delivery-standards` V2. Commands are the human and agent vocabulary for moving work through the lifecycle.

## Objective

The command protocol must work across:

- Claude Code
- OpenAI Codex
- Cursor
- GPT
- Gemini
- PR comments
- Issue comments
- CLI tools
- Future AI agents

The protocol defines command semantics, not a required implementation interface. If no CLI exists, agents must still interpret commands according to this proposal.

## V1 Audit Summary

V1 includes CLI commands:

- `ai-delivery init`
- `ai-delivery sync`
- `ai-delivery feature`
- `ai-delivery doctor`

V1 does not define lifecycle commands such as `/approve-plan`, `/build`, `/review`, or `/complete`. V2 should preserve the existing CLI setup commands and add universal lifecycle commands that can be executed in chat or by future tooling.

## Command Principles

1. Commands are state-aware.
   Every command validates current feature state before action.

2. Commands are role-aware.
   A command selects or confirms the acting role.

3. Commands are approval-aware.
   Approval commands require a human actor.

4. Commands are idempotent where practical.
   Re-running `/status` or `/continue` should not corrupt state.

5. Commands fail closed.
   If preconditions are missing, the command reports the next allowed action.

6. Commands update artifacts.
   State-changing commands record activity in `state.json` and `activity.md`.

## Command Syntax

Canonical shape:

```text
/<command> [feature-id] [arguments]
```

Examples:

```text
/start-feature "Team invitation management"
/status
/status FEA-001
/approve-requirements FEA-001
/approve-plan FEA-001
/build FEA-001
/review FEA-001
/test FEA-001
/continue FEA-001
/complete FEA-001
```

Feature ID may be omitted when there is exactly one active feature.

## Command Response Contract

Every command should respond with:

```text
Command:
Feature:
Current state:
Role:
Action taken:
Next allowed state or command:
Artifacts updated:
Approval status:
Blockers:
```

For refused commands:

```text
Command:
Feature:
Current state:
Requested action:
Why refused:
Required state or approval:
Allowed next step:
```

## Canonical Commands

### `/start-feature`

Purpose:

Create a feature lifecycle entry from an idea.

Allowed from:

- No active feature.
- Project backlog.
- `complete` when starting a new feature.

Primary role:

- Requirements Agent.

Arguments:

```text
/start-feature "<feature name>"
/start-feature FEA-042 "<feature name>"
```

State effect:

- Creates `.ai/features/<ID>/`.
- Creates initial lifecycle artifacts.
- Sets state to `intake` or `requirements_draft`.
- Adds feature to `.ai/registry.json`.

Required artifacts after command:

- `state.json`
- `requirements.md`
- `approval.md`
- `activity.md`
- `handoff.md`

Refuse when:

- A different active feature is mid-lifecycle and the project policy allows only one active feature.
- Feature ID conflicts with an existing feature.

### `/status`

Purpose:

Report current project or feature state.

Allowed from:

- Any state.

Primary role:

- Any role.

Arguments:

```text
/status
/status FEA-001
```

State effect:

- Read-only.

Response should include:

- Active feature.
- Current state.
- Active role.
- Approval status.
- Next allowed commands.
- Blockers.
- Required artifacts.

### `/approve-requirements`

Purpose:

Record human approval of requirements.

Allowed from:

- `requirements_pending_review`

Required actor:

- Human.

State effect:

- Records approval in `approval.md`.
- Updates `state.json.approvals.requirements`.
- Transitions to `requirements_approved`.

Refuse when:

- Actor is not human.
- Requirements are not pending review.
- `requirements.md` is missing.
- Open blockers affect requirements.

### `/approve-plan`

Purpose:

Record human approval of implementation plan and test strategy.

Allowed from:

- `plan_pending_review`

Required actor:

- Human.

State effect:

- Records approval in `approval.md`.
- Updates `state.json.approvals.plan`.
- Transitions to `plan_approved`.

Refuse when:

- Requirements approval is missing or stale.
- Plan is not pending review.
- `plan.md` or `tests.md` is missing.
- Material blockers remain unresolved.

### `/build`

Purpose:

Start or continue approved implementation.

Allowed from:

- `plan_approved`
- `building`

Primary role:

- Builder Agent.

State effect:

- Transitions `plan_approved` to `building`.
- Leaves state as `building` when continuing.
- Updates activity and plan operation statuses.

Required approvals:

- Requirements approval.
- Plan approval.

Refuse when:

- Requirements approval is missing, stale, revoked, or changes requested.
- Plan approval is missing, stale, revoked, or changes requested.
- Current state is before `plan_approved`.
- Feature is `blocked` without resolution.

### `/review`

Purpose:

Run AI implementation review.

Allowed from:

- `building`
- `reviewing`

Primary role:

- Reviewer Agent.

State effect:

- Transitions `building` to `reviewing`.
- Records review findings in `review.md`.
- Moves to `testing` if review passes.
- Returns to `building` if material fixes are required.

Refuse when:

- Build has not started.
- Approved requirements or plan are missing.
- There is no implementation to review.

### `/test`

Purpose:

Run validation against the approved test plan.

Allowed from:

- `reviewing`
- `testing`

Primary role:

- Tester Agent.

State effect:

- Transitions `reviewing` to `testing`.
- Records validation evidence in `tests.md`.
- Moves to `ready_for_human_review` when validation is complete.
- Returns to `building` when implementation defects are found.
- Returns to `reviewing` when validation changes review risk.

Refuse when:

- Review stage has not occurred.
- Test plan is missing.
- Required environment or credentials are missing and the risk cannot be safely bounded.

### `/continue`

Purpose:

Continue the next allowed lifecycle action.

Allowed from:

- Any non-terminal state.
- `blocked` only when blocker is resolved or accepted.

Primary role:

- Derived from current state.

State effect:

- Executes the next allowed role action for the current state.
- Does not skip approval gates.

Examples:

| Current State | `/continue` Means |
| --- | --- |
| `intake` | Continue requirements drafting. |
| `requirements_pending_review` | Report pending approval; do not proceed. |
| `requirements_approved` | Start planning. |
| `plan_pending_review` | Report pending approval; do not proceed. |
| `plan_approved` | Start building. |
| `building` | Continue approved implementation. |
| `reviewing` | Continue review. |
| `testing` | Continue validation. |
| `ready_for_human_review` | Report pending human implementation approval. |

### `/complete`

Purpose:

Record human implementation approval and mark feature complete.

Allowed from:

- `ready_for_human_review`

Required actor:

- Human.

State effect:

- Records implementation approval in `approval.md`.
- Updates `state.json.approvals.implementation`.
- Transitions to `complete`.
- Updates registry.

Refuse when:

- Actor is not human.
- Review or testing evidence is missing.
- Requirements or plan approval is missing or stale.
- Feature is not ready for human review.
- Material blockers remain unresolved.

## Recommended Additional Commands

These commands are not required by the user prompt but should be included in V2 for a complete operating system.

| Command | Purpose |
| --- | --- |
| `/request-changes` | Record human requested changes at a review gate. |
| `/block` | Mark current feature blocked with reason and owner. |
| `/unblock` | Resolve blocker and return to recorded resume state. |
| `/sync` | Run Sync Agent to update artifacts and registry. |
| `/handoff` | Prepare handoff notes for the next role. |
| `/queue` | Show or manage multi-feature queue. |
| `/abort` | Stop a feature lifecycle without marking complete. |

## Command Preconditions Matrix

| Command | Required State | Required Approval | Actor |
| --- | --- | --- | --- |
| `/start-feature` | none or project-ready | none | Human or Requirements Agent |
| `/status` | any | none | Any |
| `/approve-requirements` | `requirements_pending_review` | none | Human |
| `/approve-plan` | `plan_pending_review` | requirements | Human |
| `/build` | `plan_approved` or `building` | requirements and plan | Builder Agent |
| `/review` | `building` or `reviewing` | requirements and plan | Reviewer Agent |
| `/test` | `reviewing` or `testing` | requirements and plan | Tester Agent |
| `/continue` | any non-terminal | state-dependent | State-dependent |
| `/complete` | `ready_for_human_review` | requirements, plan, implementation | Human |

## Forbidden Command Behavior

Commands must not:

- Transition directly from requirements to build.
- Treat `/continue` as approval.
- Treat `/complete` as valid before review and testing.
- Allow an AI actor to execute approval commands.
- Hide command refusal behind generic "cannot proceed" language.
- Modify production code from approval commands.
- Change requirements or plan after approval without marking approvals stale.

## Chat Command Examples

### Starting Work

Human:

```text
/start-feature "Team invitation management"
```

Agent:

```text
Command: /start-feature
Feature: FEA-001 Team invitation management
Current state: requirements_draft
Role: Requirements Agent
Action taken: Created feature lifecycle artifacts.
Next allowed command: /status or continue requirements drafting
Artifacts updated: state.json, requirements.md, approval.md, activity.md
Approval status: requirements pending
Blockers: none
```

### Refusing Premature Build

Human:

```text
/build FEA-001
```

Agent:

```text
Command: /build
Feature: FEA-001
Current state: requirements_pending_review
Requested action: build
Why refused: building requires plan_approved state and requirements plus plan approval.
Required state or approval: requirements approval, plan approval
Allowed next step: /approve-requirements or request requirements changes
```

## CLI Compatibility

V2 can map commands to future CLI subcommands:

```text
ai-delivery start-feature "Feature name"
ai-delivery status FEA-001
ai-delivery approve-requirements FEA-001
ai-delivery approve-plan FEA-001
ai-delivery build FEA-001
ai-delivery review FEA-001
ai-delivery test FEA-001
ai-delivery complete FEA-001
```

The chat command remains canonical because it is portable across agents.

## Success Criteria

The command protocol succeeds when:

- Humans can use the same commands regardless of AI provider.
- Agents can refuse invalid commands with precise next steps.
- Every state transition is traceable to a command or recorded action.
- Approval commands cannot be executed by AI agents.
- `/continue` never bypasses human approval gates.
