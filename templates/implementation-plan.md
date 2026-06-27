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
- Follow `standards/ai-model-routing.md` for every operation.
- Work operation by operation.
- Update tests with the operation that changes behavior.
- Stop and update the spec first if implementation needs to diverge.
- Keep changes small enough to review.

## Preconditions

- [ ] REASONS Canvas reviewed.
- [ ] Feature spec reviewed.
- [ ] Test plan reviewed.
- [ ] Relevant standards identified.
- [ ] AI model routing declared before work starts.
- [ ] Required secrets, services, test data, and environments are available.

## AI Model Routing

Every operation must include an `ai_provider` block that follows `standards/ai-model-routing.md`.

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| Planning | `<provider>` | `<model>` | `premium_review` | Architecture/product reasoning | N/A |
| Implementation | `<provider>` | `<model>` | `standard_implementation` | Bounded implementation | `<code_review route>` |
| Review | `<provider>` | `<model>` | `standard_review` | Final QA | N/A |

## Operation Plan

| Step | Status | Operation | Provider | Model | Reviewer | Files Or Modules | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Not started | `<operation>` | `<provider>` | `<model>` | `<reviewer>` | `<files>` | `<tests>` | `<notes>` |

Status values: `Not started`, `In progress`, `Blocked`, `Done`, `Deferred`.

## Detailed Operations

### Operation 1: `<name>`

**Purpose:** `<why this step exists>`

**AI Provider:**

```yaml
ai_provider:
  provider: <project-configured-provider>
  model: <project-configured-model>
  risk_tier: premium_review | standard_review | standard_implementation | low_risk | other
  strength_rank: <optional numeric strength, higher is stronger>
  reason: <short explanation>
  fallback_model: <optional backup model>
  requires_premium_review: false
  reviewer_route: <optional modelRouting route key>
```

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
- [ ] AI model routing was followed for every operation.
- [ ] Any work touching auth, billing, payments, migrations, permissions, or customer data received configured premium-review routing.
- [ ] Tests added or updated.
- [ ] Validation commands pass.
- [ ] Review checklist completed.
- [ ] Specs synchronized with final implementation.
