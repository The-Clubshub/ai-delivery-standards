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
- [ ] Final review model is equal or stronger than the implementation model.
- [ ] GPT-5.5 reviewed any GLM-5.2 work touching auth, billing, payments, migrations, permissions, or customer data.

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| Planning | OpenAI | GPT-5.5 | Architecture/product reasoning | N/A |
| Implementation | Z.ai | GLM-5.2 | Bulk code generation | GPT-5.5 |
| Review | OpenAI | GPT-5.5 | Final QA | N/A |

## Pull Request Model Usage Summary

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| `<step>` | `<provider>` | `<model>` | `<reason>` | `<reviewer>` |

## Findings By Severity

## Requirements Alignment

## Plan Alignment

## Security

## Accessibility

## Testing

## Fixes Applied

## Remaining Risks
