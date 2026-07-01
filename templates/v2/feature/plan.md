# Plan: <Feature Name>

```yaml
artifact: plan
feature_id: FEA-000
feature_name: ""
state: not_started
owner_role: Planner Agent
source_requirements: requirements.md
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Preconditions

- [ ] Requirements gate is satisfied according to `.ai/config.json` approval policy.
- [ ] Requirements gate status is mirrored in `approval.md` and `state.json`.
- [ ] AI workbench and stage models are recorded before work starts.

## Implementation Rules

- Implement only approved scope from `requirements.md`.
- Follow the configured AI workbench and stage model profile.
- Work operation by operation.
- Update tests with the operation that changes behavior.
- Stop and return to the right draft state if implementation needs to diverge.

## AI Workbench And Models

| Stage | Workbench | Model |
| --- | --- | --- |
| Requirements | `<codex/claude/cursor>` | `<model>` |
| Planning | `<codex/claude/cursor>` | `<model>` |
| Build | `<codex/claude/cursor>` | `<model>` |
| Review | `<codex/claude/cursor>` | `<model>` |
| Test | `<codex/claude/cursor>` | `<model>` |
| Sync and completion | `<codex/claude/cursor>` | `<model>` |
| High-risk review | `<codex/claude/cursor>` | `<model>` |

Use `syncCompletion` for Sync Agent handoff and completion summaries. Use `highRiskReview` for final review when work touches auth, permissions, billing, payments, security, customer data, database schema, migrations, tenant boundaries, or architecture.

## Operation Plan

| Step | Status | Operation | Stage Model | Files Or Modules | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Not started | `<operation>` | `<model>` | `<files>` | `<tests>` | `<notes>` |

## Detailed Operations

### Operation 1: `<name>`

Purpose:

Inputs:

Expected output:

Validation:

Rollback:

## Dependencies And Migrations

## Configuration And Flags

## Rollout And Rollback

## Completion Checklist
