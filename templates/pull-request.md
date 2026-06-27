# Pull Request Template

## Summary

- `<what changed>`

## AI Model Routing

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| Planning | `<provider>` | `<model>` | `premium_review` | Architecture/product reasoning | N/A |
| Implementation | `<provider>` | `<model>` | `standard_implementation` | Bounded implementation | `<code_review route>` |
| Review | `<provider>` | `<model>` | `standard_review` | Final QA | N/A |

## Validation

| Check | Command Or Method | Result |
| --- | --- | --- |
| `<check>` | `<command>` | `<pass/fail/not run>` |

## Risk Notes

- Premium-review triggers:
- Remaining gaps:
- Rollback:
