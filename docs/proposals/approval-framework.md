# Human Approval Framework

Status: Proposal

This proposal defines a lightweight approval framework for V2. The framework is intentionally simple: approvals are durable Markdown records backed by machine-readable state in `state.json`.

## Objective

AI agents must be unable to proceed past these gates without human approval:

1. Requirements approval.
2. Planning approval.
3. Implementation approval.

The framework must work in chat, CLI, PR comments, issue comments, ticket systems, or future agent tools.

## V1 Audit Summary

V1 includes approval concepts in several places:

- The REASONS Canvas template has an `Approval` section.
- Workflows mention review gates.
- Generated `AGENTS.md` says implementation starts only after artifacts are coherent.

V1 does not yet define:

- A single approval artifact.
- Required approval fields.
- A distinction between agent-generated readiness and human approval.
- A machine-readable approval status.
- A universal rule that Builder Agents cannot proceed before approvals exist.

## Approval Principles

1. Approval must be explicit.
   Silence, lack of objection, or a successful agent summary is not approval.

2. Approval must be human.
   Agents may prepare artifacts and record approvals, but cannot approve their own work.

3. Approval must be scoped.
   Approval applies to a named feature, artifact, and version or timestamp.

4. Approval must be durable.
   It must be recorded in `approval.md` and reflected in `state.json`.

5. Approval must be revocable through a state transition.
   If scope changes, the feature returns to the appropriate draft state and affected approvals become stale.

## Required Approval Gates

### Requirements Approval

Gate transition:

```text
requirements_pending_review -> requirements_approved
```

Required before:

- Planner Agent creates detailed implementation plan.
- Any implementation planning that commits to files, migrations, dependencies, or architecture choices.

Approval confirms:

- Problem and scope are correct.
- Acceptance criteria are testable.
- Scope out is understood.
- Users, permissions, data boundaries, and safeguards are sufficiently defined.

### Plan Approval

Gate transition:

```text
plan_pending_review -> plan_approved
```

Required before:

- Builder Agent edits production code.
- Agent adds dependencies, migrations, API changes, UI flows, or runtime behavior.

Approval confirms:

- Operations are acceptable.
- Test strategy is acceptable.
- Risks, rollback, migrations, and flags are acceptable.
- The proposed implementation stays within approved requirements.

### Implementation Approval

Gate transition:

```text
ready_for_human_review -> complete
```

Required before:

- Feature is marked complete.
- Release-ready status is claimed.

Approval confirms:

- Human has reviewed final implementation summary and evidence.
- Review and testing stages are complete or gaps are accepted.
- Remaining risks are acceptable.

## `approval.md` Canonical Structure

````markdown
# Approval: <Feature Name>

```yaml
artifact: approval
feature_id: FEA-001
feature_name: "<Feature Name>"
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Approval Policy

| Gate | Required | Status |
| --- | --- | --- |
| Requirements | Yes | Pending |
| Plan | Yes | Pending |
| Implementation | Yes | Pending |

## Requirements Approval

Status: Pending
Approved by:
Approved at:
Source:
Approved artifact:
Artifact version or hash:
Notes:

## Plan Approval

Status: Pending
Approved by:
Approved at:
Source:
Approved artifact:
Artifact version or hash:
Notes:

## Implementation Approval

Status: Pending
Approved by:
Approved at:
Source:
Reviewed evidence:
Accepted gaps:
Notes:

## Approval History

| Date | Gate | Action | Actor | Source | Notes |
| --- | --- | --- | --- | --- | --- |
````

## Approval Status Values

| Status | Meaning |
| --- | --- |
| `pending` | Approval has not been granted. |
| `approved` | Human approval has been granted and recorded. |
| `changes_requested` | Human requested changes; return to draft state. |
| `stale` | Approval existed, but approved artifact changed materially. |
| `revoked` | Human explicitly revoked approval. |
| `legacy_accepted` | Historical approval accepted during migration; not valid for new V2 work. |
| `not_required` | Project policy says this gate is not required for this work type. |

For non-trivial feature work, the three primary gates should default to `pending`, not `not_required`.

## Machine-Readable Approval In `state.json`

`approval.md` is the human-readable record. `state.json` mirrors the gate status for agents.

Conceptual shape:

```json
{
  "approvals": {
    "requirements": {
      "status": "approved",
      "approvedBy": "Scott Heslop",
      "approvedAt": "2026-06-22T10:15:00Z",
      "source": "chat",
      "artifact": "requirements.md"
    },
    "plan": {
      "status": "pending"
    },
    "implementation": {
      "status": "pending"
    }
  }
}
```

## What Counts As Human Approval

Valid approval sources:

- Direct user message in the current agent conversation.
- PR comment from an authorized human.
- Issue or ticket comment from an authorized human.
- Commit signed or authored by an authorized human that explicitly approves the gate.
- Project-approved approval system.

Invalid approval sources:

- Agent inference.
- Agent self-review.
- Passing tests.
- Merged code without explicit approval.
- "Looks good" from another AI agent.
- Lack of human response.

## Approval Capture Rules

When a human approves in chat, the agent may update `approval.md` with:

- Approver display name if known.
- Timestamp.
- Source as `chat`.
- Exact gate approved.
- Short quote or summary of the approval.

If the human says "approved" while multiple gates are pending, the agent must clarify which gate is approved unless context makes it unambiguous.

## Builder Agent Enforcement

Before editing production code, Builder Agent must verify:

```text
state.json.state == "plan_approved"
approvals.requirements.status == "approved"
approvals.plan.status == "approved"
```

If either approval is missing, stale, revoked, or changes requested, Builder Agent must refuse to build.

Refusal format:

```text
I cannot build FEA-001 because plan approval is pending.
Allowed next step: /approve-plan after reviewing .ai/features/FEA-001/plan.md.
```

## Stale Approval Rules

Approval becomes stale when:

- Approved requirements change materially.
- Approved plan changes materially.
- Scope is expanded.
- Acceptance criteria change.
- API, data, authorization, migration, security, or AI behavior changes beyond approved plan.
- Human explicitly requests a new review.

Approval does not become stale for:

- Typo fixes.
- Formatting.
- Status updates.
- Validation evidence updates.
- Clarifying notes that do not alter scope, behavior, risk, or operations.

When approval becomes stale:

- Requirements approval returns to `pending` if requirements changed.
- Plan approval returns to `pending` if plan changed.
- Implementation approval returns to `pending` if final implementation changes after approval.
- Feature state returns to the appropriate draft state.

## Changes Requested

When a human requests changes:

| Current Gate | New State |
| --- | --- |
| Requirements review | `requirements_draft` |
| Plan review | `plan_draft` |
| Human implementation review | `building`, `reviewing`, or `testing` depending on change type |

The agent must record the requested change in `approval.md` and `activity.md`.

## Lightweight Integrity

The framework does not require cryptographic signatures for V2, but it should support optional artifact hashes:

```text
Approved artifact: requirements.md
Artifact version or hash: sha256:<hash>
```

Future tooling can compute hashes automatically. Until then, timestamp and source are enough for a lightweight human workflow.

## Approval Commands

Canonical approval commands:

- `/approve-requirements`
- `/approve-plan`
- `/complete`

`/complete` includes implementation approval and final state transition when all prior gates and evidence exist.

## Success Criteria

The approval framework succeeds when:

- A Builder Agent refuses to build without requirements and plan approval.
- A Planner Agent refuses to plan without requirements approval.
- A Sync Agent can explain exactly who approved which gate and when.
- A changed requirement invalidates stale plan approval.
- A feature cannot become `complete` without human implementation approval.
