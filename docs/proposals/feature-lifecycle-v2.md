# Feature Lifecycle V2

Status: Proposal

This proposal defines the canonical V2 feature structure. It replaces scattered lifecycle meaning with a single feature folder that contains state, requirements, plan, tests, review, approvals, memory, and handoff records.

## Objective

Every non-trivial feature should have a durable folder that lets any agent answer:

- What is this feature?
- What state is it in?
- What approvals exist?
- What requirements are approved?
- What implementation plan is approved?
- What has been built?
- What review and test evidence exists?
- What is the next allowed action?

## V1 Audit Summary

V1 feature folders currently use:

```text
docs/features/<ID>-<slug>/
  reasons-canvas.md
  feature-spec.md
  implementation-plan.md
  test-plan.md
  review-checklist.md
```

This is comprehensive, but V2 needs a lifecycle folder that is:

- More explicitly stateful.
- Easier for agents to parse.
- Explicit about human approvals.
- Independent from `docs/` as human documentation.
- Compatible with V1 artifacts.

## Canonical Feature Folder

V2 canonical feature folders live under `.ai/features/`:

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
    screenshots/
    logs/
    evals/
    exports/
```

The folder name should use the durable feature ID only. Human-readable names can live inside metadata and optional docs mirrors. This avoids path churn when names change.

## Feature ID Standard

Recommended IDs:

| Work Type | Prefix | Example |
| --- | --- | --- |
| Feature | `FEA` | `FEA-001` |
| Bug | `BUG` | `BUG-014` |
| Refactor | `REF` | `REF-003` |
| Architecture decision | `ADR` | `ADR-002` |
| Operational task | `OPS` | `OPS-005` |

V2 can support non-feature work with the same lifecycle model, but this proposal focuses on `FEA-*`.

## Required Files

### `state.json`

Machine-readable source of truth for current lifecycle state.

Required content:

- Feature ID and title.
- Current state.
- Active role.
- Previous state.
- Resume state if blocked.
- Approval statuses.
- Artifact paths.
- Last transition.
- Blockers.
- Review cycle count.

Agents must read this file before acting.

### `requirements.md`

Human-readable source of truth for what should be built.

This file combines V1's REASONS Canvas and feature spec into one canonical requirements artifact.

Required sections:

1. Metadata
2. Summary
3. Problem Statement
4. Users And Actors
5. Scope In
6. Scope Out
7. Requirements
8. Acceptance Criteria
9. Domain Vocabulary And Entities
10. User Experience
11. API Or Interface Contracts
12. AI Behavior Contract, when relevant
13. Non-Functional Requirements
14. Safeguards
15. Open Questions

`requirements.md` is owned by the Requirements Agent until requirements are approved. After approval, changes require a return to `requirements_draft`.

### `plan.md`

Human-readable source of truth for how approved requirements will be implemented.

Required sections:

1. Metadata
2. Preconditions
3. Implementation Rules
4. Operation Plan
5. Detailed Operations
6. Dependencies And Migrations
7. Configuration And Feature Flags
8. Rollout And Rollback
9. Observability Work
10. Security And Privacy Work
11. Accessibility Work
12. Completion Checklist

`plan.md` is owned by the Planner Agent until plan approval. After approval, changes require a return to `plan_draft` unless the change is purely status or evidence update.

### `tests.md`

Human-readable source of truth for validation strategy and evidence.

Required sections:

1. Metadata
2. Test Strategy
3. Acceptance Criteria Traceability
4. Test Matrix
5. Unit Tests
6. Integration Or Contract Tests
7. End-To-End Or Manual Flow Tests
8. Accessibility Tests
9. Security Tests
10. Performance Tests
11. Observability Tests
12. AI Evaluation Tests, when relevant
13. Validation Commands
14. Validation Evidence
15. Known Gaps

The Planner Agent drafts this file. The Builder Agent may update it when planned test work is implemented. The Tester Agent records final evidence.

### `review.md`

Human-readable source of truth for review findings and resolution.

Required sections:

1. Metadata
2. Review Scope
3. Requirements Alignment
4. Plan Alignment
5. Diff Summary
6. Findings By Severity
7. Security Review
8. Accessibility Review
9. Performance Review
10. Observability Review
11. Generated-Code Risk Review
12. Self-Review Notes
13. Critic Review Notes
14. Fixes Applied
15. Remaining Risks

The Reviewer Agent owns this file during `reviewing`. The Tester Agent may append validation-related review notes during `testing`.

### `approval.md`

Human-readable durable record of human approvals.

Required approvals:

- Requirements approval.
- Plan approval.
- Implementation approval.

Approval framework details are defined in `docs/proposals/approval-framework.md`.

### `memory.md`

Feature-scoped durable memory.

Recommended sections:

- Stable assumptions.
- Resolved decisions.
- Rejected options.
- External dependencies.
- Domain notes.
- Follow-up ideas outside scope.

This file is not an approval artifact. It supports future agents without turning chat history into hidden state.

### `activity.md`

Chronological log of important events.

Recommended entries:

```text
2026-06-22T10:00:00Z - /start-feature created FEA-001.
2026-06-22T10:30:00Z - Requirements Agent moved state to requirements_pending_review.
2026-06-22T11:00:00Z - Human approved requirements.
```

This file supports auditability but does not replace `state.json`.

### `handoff.md`

Role-to-role handoff notes.

Required sections:

- Current state.
- Current role.
- Next allowed role.
- Next allowed command.
- Updated artifacts.
- Open questions.
- Blockers.
- Risks.
- Validation evidence.

## Optional Artifact Folders

Use `.ai/features/<ID>/artifacts/` for supporting evidence that should not clutter lifecycle documents:

| Folder | Purpose |
| --- | --- |
| `screenshots/` | UI review, accessibility, visual validation. |
| `logs/` | Redacted local logs, command output summaries, test logs. |
| `evals/` | AI evaluation cases and results. |
| `exports/` | Generated reports or evidence files. |

Projects should avoid committing secrets, raw production data, private prompts, or sensitive logs.

## Feature State Lifecycle

The canonical states are:

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

The detailed transition model is defined in `docs/proposals/state-machine.md`.

## Legacy Mapping

V1 artifacts should map into V2 like this:

| V1 File | V2 File | Migration Behavior |
| --- | --- | --- |
| `reasons-canvas.md` | `requirements.md` | Merge requirements, entities, approach, structure, norms, safeguards. |
| `feature-spec.md` | `requirements.md` | Merge UX, functional requirements, contracts, non-functional requirements, acceptance criteria. |
| `implementation-plan.md` | `plan.md` | Preserve operations, preconditions, flags, rollout, rollback. |
| `test-plan.md` | `tests.md` | Preserve test matrix and validation commands. |
| `review-checklist.md` | `review.md` | Preserve checklist, findings, validation evidence. |
| Inline approval notes | `approval.md` | Extract if explicit human approval exists; otherwise mark pending. |

For compatibility, a project may keep `docs/features/<ID>-<slug>/` as a human-readable mirror. The authoritative state still lives in `.ai/features/<ID>/state.json`.

## Requirements Template Outline

````markdown
# Requirements: <Feature Name>

```yaml
artifact: requirements
feature_id: FEA-001
feature_name: "<Feature Name>"
state: requirements_draft
owner_role: Requirements Agent
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Summary

## Problem Statement

## Users And Actors

## Scope In

## Scope Out

## Acceptance Criteria

## Domain Vocabulary And Entities

## User Experience

## API Or Interface Contracts

## AI Behavior Contract

## Non-Functional Requirements

## Safeguards

## Open Questions
````

## Plan Template Outline

````markdown
# Plan: <Feature Name>

```yaml
artifact: plan
feature_id: FEA-001
state: plan_draft
owner_role: Planner Agent
source_requirements: requirements.md
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Preconditions

## Implementation Rules

## Operation Plan

| Step | Status | Operation | Files Or Modules | Tests | Notes |
| --- | --- | --- | --- | --- | --- |

## Detailed Operations

## Dependencies And Migrations

## Configuration And Flags

## Rollout And Rollback

## Completion Checklist
````

## Tests Template Outline

````markdown
# Tests: <Feature Name>

```yaml
artifact: tests
feature_id: FEA-001
state: draft
owner_role: Planner Agent
source_requirements: requirements.md
source_plan: plan.md
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Test Strategy

## Acceptance Criteria Traceability

## Test Matrix

## Validation Commands

## Validation Evidence

## Known Gaps
````

## Review Template Outline

````markdown
# Review: <Feature Name>

```yaml
artifact: review
feature_id: FEA-001
state: not_started
owner_role: Reviewer Agent
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Review Scope

## Findings By Severity

## Requirements Alignment

## Plan Alignment

## Security

## Accessibility

## Testing

## Fixes Applied

## Remaining Risks
````

## `state.json` Minimum Required Fields

```json
{
  "featureId": "FEA-001",
  "title": "Feature Name",
  "state": "requirements_draft",
  "activeRole": "Requirements Agent",
  "artifacts": {
    "requirements": "requirements.md",
    "plan": "plan.md",
    "tests": "tests.md",
    "review": "review.md",
    "approval": "approval.md"
  },
  "approvals": {
    "requirements": { "status": "pending" },
    "plan": { "status": "pending" },
    "implementation": { "status": "pending" }
  },
  "blockers": [],
  "updatedAt": "YYYY-MM-DDTHH:mm:ssZ"
}
```

## Completion Criteria

A feature folder is complete when:

- `state.json.state` is `complete`.
- `approval.md` records requirements, plan, and implementation approval.
- `requirements.md` reflects final accepted behavior.
- `plan.md` reflects final completed or deferred operations.
- `tests.md` records validation evidence and known gaps.
- `review.md` records review findings and resolution.
- `handoff.md` indicates no further AI action is pending.
