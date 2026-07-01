# Workflow: V2 Feature Lifecycle

Every non-trivial feature follows the V2 state machine.

```text
intake
-> requirements_draft
-> requirements_pending_review
-> plan_draft
-> plan_pending_review
-> building
-> reviewing
-> testing
-> ready_for_human_review
-> complete
```

The feature may enter `blocked` from any non-terminal state.

## Approval Policy

Approval gates are configured in `.ai/config.json`.

| Gate | Transition | Command When Human Required | Default Policy |
| --- | --- | --- | --- |
| Requirements | `requirements_pending_review -> plan_draft` | `/approve-requirements` | `human_required` |
| Plan | `plan_pending_review -> building` | `/approve-plan` | `human_required` |
| Implementation | `ready_for_human_review -> complete` | `/complete` | `human_required` |

When a gate is `not_required`, the responsible agent may make the same transition after the required artifact or evidence exists, and must record `not_required` in `approval.md` and `state.json`.

`requirements_approved` and `plan_approved` are legacy/transient states. Do not stop there during normal flow; move immediately to `plan_draft` or `building`.

For a broad or multi-feature original request, the plan gate applies to the whole request. The plan must cover the full requested deliverable and queue every required feature before implementation starts. Once the user approves that plan or agrees to implementation, the lifecycle continues through every unblocked queued feature without separate per-feature approval.

## Forbidden Transitions

- Requirements draft directly to planning or building.
- Planning directly to building before the plan gate is satisfied.
- Building directly to testing without review.
- Reviewing or testing directly to complete.
- Complete back into implementation for the same lifecycle entry.

## Agent Rules

- Requirements Agent owns intake and requirements draft.
- Planner Agent owns planning after the requirements gate is satisfied.
- Builder Agent owns implementation after the plan gate is satisfied.
- Reviewer Agent owns AI review.
- Tester Agent owns validation.
- Sync Agent owns state, registry, handoff, and artifact sync.

If state and requested action conflict, state wins.
