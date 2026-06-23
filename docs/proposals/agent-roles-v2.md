# Agent Roles V2

Status: Proposal

This proposal defines the universal AI agent roles used by V2. Roles are tool-agnostic. A role describes what the agent is allowed to do, what artifacts it owns, and when it must stop.

## Objective

Every agent must know which role it is performing before acting. The role may be assigned explicitly by the user, inferred from a command, or derived from the active feature state.

The standard roles are:

- Requirements Agent
- Planner Agent
- Builder Agent
- Reviewer Agent
- Tester Agent
- Sync Agent

No role may approve its own gate.

## Role And State Mapping

| State | Primary Role | Secondary Role |
| --- | --- | --- |
| `intake` | Requirements Agent | Sync Agent |
| `requirements_draft` | Requirements Agent | Sync Agent |
| `requirements_pending_review` | Requirements Agent | Sync Agent |
| `requirements_approved` | Planner Agent | Sync Agent |
| `plan_draft` | Planner Agent | Sync Agent |
| `plan_pending_review` | Planner Agent | Sync Agent |
| `plan_approved` | Builder Agent | Sync Agent |
| `building` | Builder Agent | Sync Agent |
| `reviewing` | Reviewer Agent | Sync Agent |
| `testing` | Tester Agent | Sync Agent |
| `ready_for_human_review` | Sync Agent | Reviewer Agent or Tester Agent for clarification only |
| `complete` | Sync Agent | Read-only by default |
| `blocked` | Current role | Sync Agent |

## Requirements Agent

### Purpose

Turn an idea into reviewable requirements that define scope, acceptance criteria, constraints, actors, domain vocabulary, safeguards, and open questions.

### Inputs

- Human idea or feature request.
- Existing product docs and architecture notes.
- Related features, bugs, support notes, or incidents.
- Project memory and domain glossary.
- Relevant standards.

### Outputs

- `.ai/features/<ID>/requirements.md`
- Updated `.ai/features/<ID>/state.json`
- Open questions or blocker entry when requirements cannot be made safe.
- Handoff notes for the Planner Agent.

### Responsibilities

- Create or locate the feature folder.
- Capture problem statement, users, scope in, scope out, acceptance criteria, non-functional needs, and safeguards.
- Inspect relevant repository context before naming implementation targets.
- Identify data, authorization, privacy, accessibility, security, performance, AI behavior, and operational risks.
- Mark requirements ready for human review only when they are testable and bounded.

### Prohibited Behavior

- Do not edit production code.
- Do not create detailed implementation operations beyond high-level approach.
- Do not approve requirements.
- Do not ignore unresolved product, data, security, legal, or authorization questions.
- Do not turn vague intent into implementation assumptions when those assumptions create material risk.

### Completion Criteria

- `requirements.md` is complete enough for another agent to plan from.
- Acceptance criteria are observable and testable.
- Scope out is explicit.
- Safeguards are enforceable.
- Open questions are either resolved or recorded as blockers.
- State is `requirements_pending_review`.

## Planner Agent

### Purpose

Convert approved requirements into an ordered implementation and validation plan.

### Inputs

- Approved `requirements.md`.
- Requirements approval in `approval.md`.
- Project architecture, codebase context, standards, and validation commands.
- Existing tests and patterns.

### Outputs

- `.ai/features/<ID>/plan.md`
- Draft or updated `.ai/features/<ID>/tests.md`
- Updated `state.json`
- Handoff notes for the Builder Agent.

### Responsibilities

- Verify requirements approval exists before planning.
- Inspect implementation targets and repository conventions.
- Break work into small operations.
- Map each operation to files or modules where known.
- Map acceptance criteria to tests or validation evidence.
- Identify migrations, flags, rollout, rollback, dependencies, and observability work.
- Mark plan ready for human review only when it is executable and bounded.

### Prohibited Behavior

- Do not edit production code.
- Do not plan unapproved scope.
- Do not approve the plan.
- Do not hide implementation uncertainty that changes scope, cost, security, or architecture.
- Do not add dependencies, migrations, or architecture changes without documenting rationale and approval needs.

### Completion Criteria

- Requirements approval is present.
- `plan.md` contains ordered operations.
- `tests.md` maps acceptance criteria to validation.
- Risks and rollback are documented.
- State is `plan_pending_review`.

## Builder Agent

### Purpose

Implement the approved plan operation by operation while keeping artifacts synchronized.

### Inputs

- Approved `requirements.md`.
- Approved `plan.md`.
- `tests.md`.
- Human requirements and plan approvals.
- Repository code, tests, and standards.

### Outputs

- Code changes within approved scope.
- Test changes required by the approved plan.
- Updated plan operation statuses.
- Implementation notes in `activity.md` or `handoff.md`.
- Handoff to Reviewer Agent.

### Responsibilities

- Verify requirements and plan approvals before editing production code.
- Implement one operation at a time.
- Keep changes narrow and locally idiomatic.
- Add or update tests with behavior changes where planned.
- Record deviations immediately.
- Return to `requirements_draft` or `plan_draft` if approved artifacts no longer match reality.
- Move state to `reviewing` only when implementation is ready for review.

### Prohibited Behavior

- Do not build before requirements and plan approval.
- Do not expand scope.
- Do not change public contracts without approved requirements and plan updates.
- Do not self-review as a substitute for Reviewer Agent.
- Do not mark work ready for human review without review and testing stages.
- Do not bury failing tests or validation gaps.

### Completion Criteria

- Approved operations are complete or explicitly deferred.
- Tests required during build have been added or updated where feasible.
- Plan statuses and activity notes are current.
- State is `reviewing`.

## Reviewer Agent

### Purpose

Review implementation against approved requirements, approved plan, standards, generated-code risks, and maintainability expectations.

### Inputs

- Current diff.
- `requirements.md`
- `plan.md`
- `tests.md`
- Project standards.
- Review history.

### Outputs

- `.ai/features/<ID>/review.md`
- Findings by severity.
- Required fixes or approval to proceed to testing.
- Updated state.

### Responsibilities

- Start from approved requirements before reading the diff.
- Verify scope control.
- Verify each changed file is explained by the plan.
- Check architecture fit, security, accessibility, performance, observability, and testing implications.
- Challenge assumptions and generated-code risks.
- Return to `building` when material fixes are required.
- Move to `testing` when no material review blockers remain.

### Prohibited Behavior

- Do not approve as the human implementation reviewer.
- Do not add unplanned features.
- Do not request speculative polish unrelated to acceptance criteria, standards, or defects.
- Do not mutate production behavior directly; material changes return to Builder Agent.
- Do not skip test review.

### Completion Criteria

- Review findings are recorded by severity.
- Scope and spec-code sync are evaluated.
- Required fixes are either resolved or routed back to `building`.
- State is `testing` or `building`.

## Tester Agent

### Purpose

Validate the implementation against the approved acceptance criteria, safeguards, and test plan.

### Inputs

- Reviewed implementation.
- `requirements.md`
- `plan.md`
- `tests.md`
- `review.md`
- Repository validation commands and test tooling.

### Outputs

- Updated `.ai/features/<ID>/tests.md`
- Validation evidence.
- Test failure reports.
- State transition to `ready_for_human_review`, `building`, or `reviewing`.

### Responsibilities

- Verify that the test plan maps to acceptance criteria.
- Run focused validation first and broaden based on risk.
- Add planned tests where the plan explicitly assigns testing work to the Tester Agent.
- Record commands, results, environment, and gaps.
- Return to `building` when failures indicate implementation defects.
- Return to `reviewing` when test evidence changes review risk.

### Prohibited Behavior

- Do not change production behavior directly.
- Do not mark tests as passed without running them or documenting why they could not run.
- Do not weaken tests to pass.
- Do not ignore material validation gaps.
- Do not complete the feature.

### Completion Criteria

- Required validation is run or gaps are documented with risk.
- Acceptance criteria have automated tests or justified manual evidence.
- Security, accessibility, performance, observability, and AI eval checks are recorded where relevant.
- State is `ready_for_human_review`, `building`, or `reviewing`.

## Sync Agent

### Purpose

Keep operating-system artifacts, memory, state, and handoffs consistent with the actual repository state.

### Inputs

- All feature artifacts.
- Current `state.json`.
- Approval records.
- Diff, test evidence, review findings, and human comments.
- Project memory.

### Outputs

- Updated `state.json`
- Updated `activity.md`
- Updated `handoff.md`
- Updated project or feature memory.
- Final summary for human review.

### Responsibilities

- Maintain state consistency.
- Record command history and major transitions.
- Sync artifact descriptions when implementation details change.
- Prepare human review summaries.
- Mark blockers clearly.
- Keep `registry.json` current.
- Preserve compatibility mirrors under `docs/features` when the project uses them.

### Prohibited Behavior

- Do not approve requirements, plan, or implementation.
- Do not change production code.
- Do not hide artifact drift.
- Do not change feature state without required evidence.
- Do not rewrite history to make skipped gates appear valid.

### Completion Criteria

- State, approvals, artifacts, and registry agree.
- Handoff notes identify the next allowed action.
- Human review summary includes scope, files changed, validation, review findings, and risks.
- State is accurate.

## Role Handoff Contract

Every role handoff should update `.ai/features/<ID>/handoff.md` with:

```text
From role:
To role:
Current state:
Allowed next command:
Artifacts updated:
Open questions:
Risks:
Validation or review evidence:
```

## Multi-Agent Environments

If a tool supports subagents, the primary agent may delegate role-specific work, but the primary agent remains responsible for:

- Reading the role instructions itself.
- Verifying state transitions.
- Confirming approvals.
- Ensuring final artifacts are synchronized.

Subagents must not be used to bypass role restrictions.

## Success Criteria

The role model succeeds when:

- A Requirements Agent refuses to build.
- A Planner Agent refuses to plan without requirements approval.
- A Builder Agent refuses to build without plan approval.
- A Reviewer Agent sends implementation defects back to `building`.
- A Tester Agent sends failed validation back to `building` or `reviewing`.
- A Sync Agent can make the repository understandable to the next agent without relying on chat history.

