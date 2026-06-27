# Review: <Feature Name>

```yaml
artifact: review
feature_id: FEA-000
feature_name: ""
state: not_started
owner_role: Reviewer Agent
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Review Scope

## AI Model Routing

- [ ] Every step has an `ai_provider` field.
- [ ] Final review route is equal or stronger than the implementation route.
- [ ] Configured premium-review routing covered any work touching auth, billing, payments, migrations, permissions, or customer data.

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| Planning | `<provider>` | `<model>` | `premium_review` | Architecture/product reasoning | N/A |
| Implementation | `<provider>` | `<model>` | `standard_implementation` | Bounded implementation | `<code_review route>` |
| Review | `<provider>` | `<model>` | `standard_review` | Final QA | N/A |

## Pull Request Model Usage Summary

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| `<step>` | `<provider>` | `<model>` | `<risk-tier>` | `<reason>` | `<reviewer>` |

## Findings By Severity

## Requirements Alignment

## Plan Alignment

## Security

## Accessibility

## Testing

## Fixes Applied

## Remaining Risks
