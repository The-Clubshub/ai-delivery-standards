# Approval: <Feature Name>

```yaml
artifact: approval
feature_id: FEA-000
feature_name: ""
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Approval Policy

Policy is copied from `.ai/config.json` when the feature is created. `human_required` gates need explicit human approval. `not_required` gates can advance automatically after the required artifact or evidence exists. Once a gate is satisfied, state advances immediately: requirements to `plan_draft`, plan to `building`, and implementation to `complete`.

| Gate | Required | Status |
| --- | --- | --- |
| Requirements | Yes | Pending |
| Plan | Yes | Pending |
| Implementation | Yes | Pending |

## Requirements Approval

Status: Pending

## Plan Approval

Status: Pending

## Implementation Approval

Status: Pending

## Approval History

| Date | Gate | Action | Actor | Source | Notes |
| --- | --- | --- | --- | --- | --- |
