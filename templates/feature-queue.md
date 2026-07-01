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

- This queue is the implementation plan for the full original request.
- Include every known feature, page, flow, integration, shared operation, and validation pass needed to satisfy that request.
- Work one feature at a time.
- Continue automatically to the next unblocked feature.
- Ask the user only when a stop condition in `workflows/autonomous-feature-queue.md` applies.
- Do not ask for separate approval before starting the next queued feature after the user approves this plan or says to implement it.
- Stop revising a feature after acceptance criteria pass or two review/fix cycles complete.
- Declare AI workbench/model selection before starting each queued feature.
- When running in Codex, keep every queued feature aligned to the active `/goal`.

## Original Request

| Field | Value |
| --- | --- |
| Request | `<original user request>` |
| Approved Plan Scope | `<what implementation approval covers>` |
| Out Of Scope | `<items not included or deferred>` |
| Implementation Agreement | `<pending/approved/not_required>` |

## Active Goal

| Field | Value |
| --- | --- |
| Codex Goal | `<active /goal text or fallback objective>` |
| Goal Status | `<active/blocked/complete/changed>` |
| Completion Criteria | `<how the queue proves the goal is done>` |

## Feature Queue

| Order | Feature ID | Feature | Status | Workbench | Stage Model | Objective | Acceptance Criteria Summary | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `FEA-000` | `<feature>` | Queued | `<codex/claude/cursor>` | `<model>` | `<objective>` | `<criteria>` | `<dependencies>` | `<notes>` |

## Current Feature

| Field | Value |
| --- | --- |
| Feature ID | `<FEA-ID>` |
| Feature | `<name>` |
| Objective | `<objective>` |
| Acceptance Criteria | `<summary>` |
| AI Workbench | `<codex/claude/cursor>` |
| Stage Model | `<model>` |
| AI Model | `<model>` |
| Premium Review Required | `<true/false>` |
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
