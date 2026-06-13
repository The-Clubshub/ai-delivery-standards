# Feature Queue Template

```yaml
artifact: feature-queue
status: active
owner: ""
created: YYYY-MM-DD
updated: YYYY-MM-DD
workflow: autonomous-feature-queue
```

## Queue Policy

- Work one feature at a time.
- Continue automatically to the next unblocked feature.
- Ask the user only when a stop condition in `workflows/autonomous-feature-queue.md` applies.
- Stop revising a feature after acceptance criteria pass or two review/fix cycles complete.

## Feature Queue

| Order | Feature ID | Feature | Status | Objective | Acceptance Criteria Summary | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `FEA-000` | `<feature>` | Queued | `<objective>` | `<criteria>` | `<dependencies>` | `<notes>` |

## Current Feature

| Field | Value |
| --- | --- |
| Feature ID | `<FEA-ID>` |
| Feature | `<name>` |
| Objective | `<objective>` |
| Acceptance Criteria | `<summary>` |
| Started | `<date/time>` |
| Review/Fix Cycle | `0 of 2` |

## Completion Log

| Feature ID | Status | Files Changed | Validation | Self-Review Result | Critic-Review Result | Remaining Risks | Next Feature |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FEA-000` | `<Complete/Blocked/Deferred>` | `<files>` | `<commands/results>` | `<summary>` | `<summary>` | `<risks>` | `<FEA-ID or none>` |

## Stop Conditions Encountered

| Feature ID | Stop Condition | Why It Blocks | User Decision Needed |
| --- | --- | --- | --- |
| `<FEA-ID>` | `<condition>` | `<reason>` | `<decision>` |
