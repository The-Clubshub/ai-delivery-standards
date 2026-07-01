# Implementation Plan Template

```yaml
artifact: implementation-plan
feature_id: FEA-000
feature_name: ""
status: draft
owner: ""
created: YYYY-MM-DD
updated: YYYY-MM-DD
source_canvas: reasons-canvas.md
source_spec: feature-spec.md
```

## Implementation Rules

- Implement only the approved scope in `feature-spec.md`.
- Follow the configured AI workbench and stage model profile.
- Work operation by operation.
- Update tests with the operation that changes behavior.
- Stop and update the spec first if implementation needs to diverge.
- Keep changes small enough to review.

## Preconditions

- [ ] REASONS Canvas reviewed.
- [ ] Feature spec reviewed.
- [ ] Test plan reviewed.
- [ ] Relevant standards identified.
- [ ] AI workbench/model selection declared before work starts.
- [ ] Required secrets, services, test data, and environments are available.

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

Status values: `Not started`, `In progress`, `Blocked`, `Done`, `Deferred`.

## Detailed Operations

### Operation 1: `<name>`

**Purpose:** `<why this step exists>`

**Stage Model:** `<model>`

**Inputs:**

- `<input>`

**Expected Output:**

- `<output>`

**Implementation Notes:**

- `<note>`

**Validation:**

- `<command or manual check>`

**Rollback:**

- `<how to reverse safely>`

## Dependency And Migration Plan

| Dependency Or Migration | Action | Owner | Rollback |
| --- | --- | --- | --- |
| `<item>` | `<action>` | `<owner>` | `<rollback>` |

## Configuration And Flags

| Config Or Flag | Default | Environment | Purpose |
| --- | --- | --- | --- |
| `<name>` | `<default>` | `<env>` | `<purpose>` |

## Observability Implementation

| Signal | Location | Fields | Alert Or Dashboard |
| --- | --- | --- | --- |
| `<log/metric/trace>` | `<where>` | `<fields>` | `<link/name>` |

## Security And Privacy Implementation

- Authentication:
- Authorization:
- Input validation:
- Output encoding:
- Secrets:
- PII handling:
- Audit logging:

## Accessibility Implementation

- Semantic structure:
- Keyboard interaction:
- Focus management:
- Screen reader behavior:
- Motion and contrast:

## Completion Checklist

- [ ] All operations complete or explicitly deferred.
- [ ] AI workbench/model selection was followed for every operation.
- [ ] Any work touching auth, billing, payments, migrations, permissions, customer data, database schema, tenant boundaries, or architecture received final review with the configured `highRiskReview` model.
- [ ] Tests added or updated.
- [ ] Validation commands pass.
- [ ] Review checklist completed.
- [ ] Specs synchronized with final implementation.
