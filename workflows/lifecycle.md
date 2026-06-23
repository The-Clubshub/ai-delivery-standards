# Workflow: V2 Feature Lifecycle

Every non-trivial feature follows the V2 state machine.

```text
intake
-> requirements_draft
-> requirements_pending_review
-> requirements_approved
-> plan_draft
-> plan_pending_review
-> plan_approved
-> building
-> reviewing
-> testing
-> ready_for_human_review
-> complete
```

The feature may enter `blocked` from any non-terminal state.

## Approval Gates

| Gate | Transition | Command | Actor |
| --- | --- | --- | --- |
| Requirements | `requirements_pending_review -> requirements_approved` | `/approve-requirements` | Human |
| Plan | `plan_pending_review -> plan_approved` | `/approve-plan` | Human |
| Implementation | `ready_for_human_review -> complete` | `/complete` | Human |

## Forbidden Transitions

- Requirements draft directly to planning or building.
- Planning directly to building without plan approval.
- Building directly to testing without review.
- Reviewing or testing directly to complete.
- Complete back into implementation for the same lifecycle entry.

## Agent Rules

- Requirements Agent owns intake and requirements draft.
- Planner Agent owns planning after requirements approval.
- Builder Agent owns implementation after plan approval.
- Reviewer Agent owns AI review.
- Tester Agent owns validation.
- Sync Agent owns state, registry, handoff, and artifact sync.

If state and requested action conflict, state wins.

