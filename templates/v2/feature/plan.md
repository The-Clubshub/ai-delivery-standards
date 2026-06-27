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
- [ ] AI model routing is declared before work starts.

## Implementation Rules

- Implement only approved scope from `requirements.md`.
- Follow `standards/ai-model-routing.md` for every operation.

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

## Detailed Operations

### Operation 1: `<name>`

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

## Dependencies And Migrations

## Configuration And Flags

## Rollout And Rollback

## Completion Checklist
