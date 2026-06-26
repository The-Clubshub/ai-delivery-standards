# Review Checklist Template

```yaml
artifact: review-checklist
feature_id: FEA-000
feature_name: ""
status: draft
reviewer: ""
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Required Artifacts

- [ ] REASONS Canvas exists and is current.
- [ ] Feature spec exists and is current.
- [ ] Implementation plan exists and reflects completed work.
- [ ] Test plan exists and reflects executed validation.
- [ ] ADRs exist for long-lived architecture decisions.
- [ ] AI model routing is declared for every delivery step.

## AI Model Routing

- [ ] Every step has an `ai_provider` field with provider, model, reason, and `requires_premium_review`.
- [ ] GLM-5.2 did not make final architecture, auth, billing, database, or security decisions.
- [ ] Any GLM-5.2 work touching auth, billing, payments, migrations, permissions, or customer data received GPT-5.5 review.
- [ ] Final review model is equal or stronger than the implementation model.
- [ ] Pull request includes the model usage summary below.

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| Planning | OpenAI | GPT-5.5 | Architecture/product reasoning | N/A |
| Implementation | Z.ai | GLM-5.2 | Bulk code generation | GPT-5.5 |
| Review | OpenAI | GPT-5.5 | Final QA | N/A |

## Pull Request Model Usage Summary

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| `<step>` | `<provider>` | `<model>` | `<reason>` | `<reviewer>` |

## Intent And Scope

- [ ] Implementation matches the stated requirements and acceptance criteria.
- [ ] Scope-out items were not implemented accidentally.
- [ ] User, business, and operational outcomes are clear.
- [ ] Any requirement changes were applied to specs before code.

## Architecture

- [ ] Change fits existing architectural boundaries.
- [ ] New abstractions remove real complexity or enable approved extension points.
- [ ] Dependencies are justified and versioned.
- [ ] Data ownership, lifecycle, and migration behavior are clear.
- [ ] Failure modes have safe behavior.

## Code Quality

- [ ] Code is simple, readable, and locally idiomatic.
- [ ] Names reflect domain concepts.
- [ ] Duplicated logic is intentional or removed.
- [ ] Errors are handled through established patterns.
- [ ] No dead code, debugging leftovers, or unrelated refactors.

## Frontend And UX

- [ ] UI follows existing design conventions.
- [ ] Loading, empty, error, and success states are implemented.
- [ ] Layout works across supported viewports.
- [ ] Text does not overflow or overlap.
- [ ] Forms provide clear labels, validation, and recovery.

## Accessibility

- [ ] Keyboard operation works without traps.
- [ ] Focus order and focus restoration are correct.
- [ ] Interactive controls have accessible names.
- [ ] Semantic HTML or equivalent ARIA is used correctly.
- [ ] Screen reader announcements are provided for dynamic state changes.
- [ ] Color contrast meets WCAG AA.
- [ ] Motion respects reduced-motion preferences.

## Backend And API

- [ ] API contracts are explicit and tested.
- [ ] Validation rejects malformed, missing, and unauthorized input.
- [ ] Error responses are consistent and safe.
- [ ] Backward compatibility is addressed.
- [ ] Idempotency and concurrency are handled where relevant.

## Security And Privacy

- [ ] Authentication and authorization are enforced server-side.
- [ ] Input validation and output encoding are applied.
- [ ] Sensitive data is redacted from logs, analytics, and errors.
- [ ] Secrets are not committed or exposed to clients.
- [ ] Dependency changes were reviewed.
- [ ] Abuse paths, rate limits, and tenant isolation are considered.

## Testing

- [ ] Unit tests cover core logic.
- [ ] Integration or contract tests cover boundaries.
- [ ] End-to-end tests cover critical user flows where valuable.
- [ ] Accessibility tests were automated or manually recorded.
- [ ] Security and negative tests cover known risks.
- [ ] Regression tests protect existing behavior.

## Self-Review

- [ ] What could break has been considered.
- [ ] Over-engineering risk has been checked.
- [ ] Conflicts with existing patterns have been checked.
- [ ] Edge cases and negative paths have been checked.
- [ ] Scope and spec-code sync have been checked.

## Critic Review

- [ ] Assumptions were challenged.
- [ ] Risks, missing tests, regressions, and simpler alternatives were considered.
- [ ] Requested changes are tied to acceptance criteria, standards, maintainability, security, or real defects.
- [ ] Review/fix cycles stopped after acceptance criteria passed or after two cycles.

## Review/Fix Cycle Log

| Cycle | Reviewer | Findings | Fixes Applied | Result |
| --- | --- | --- | --- | --- |
| 1 | `<self/critic/name>` | `<findings>` | `<fixes>` | `<pass/fail/blocked>` |

## Observability

- [ ] Logs explain important decisions and failures.
- [ ] Metrics cover success, failure, latency, and domain counters.
- [ ] Traces connect cross-service flows.
- [ ] Alerts, dashboards, or runbooks are updated when needed.

## Performance

- [ ] Performance budgets are defined and met.
- [ ] Expensive work is bounded, cached, paginated, streamed, or queued.
- [ ] Database queries and external calls are reviewed.
- [ ] Client bundle or rendering cost is acceptable.

## Spec-Code Sync

- [ ] Final implementation behavior matches the REASONS Canvas.
- [ ] Feature spec reflects actual API, UI, data, and AI behavior.
- [ ] Implementation plan statuses are updated.
- [ ] Test plan reflects actual validation.
- [ ] Any deviations are documented with rationale.

## Validation Evidence

| Check | Command Or Method | Result | Notes |
| --- | --- | --- | --- |
| `<check>` | `<command>` | `<pass/fail>` | `<notes>` |

## Reviewer Notes

- Blocking findings:
- Non-blocking findings:
- Follow-up tickets:
