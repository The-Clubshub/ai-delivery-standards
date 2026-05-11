# Backend Standards

Backend changes must be correct, secure, observable, and resilient under realistic production conditions.

## Layering

Use clear boundaries:

| Layer | Responsibilities | Should Not Do |
| --- | --- | --- |
| API/Transport | Parse, validate, authorize, call application behavior, map responses | Contain domain rules |
| Application/Service | Coordinate use cases and transactions | Know HTTP details |
| Domain | Enforce business rules and invariants | Depend on infrastructure |
| Persistence | Query and persist data | Make authorization decisions |
| Integration | Wrap external systems | Leak provider-specific behavior everywhere |

## Validation

- Validate all input at trust boundaries.
- Validate IDs, enums, dates, lengths, formats, numeric ranges, and required fields.
- Normalize input intentionally.
- Reject unknown fields when contracts require strictness.
- Do not trust client-provided authorization, tenant, role, price, ownership, or audit fields.

## Authorization

- Enforce authorization server-side.
- Check tenant or organization ownership on every data access path.
- Use centralized policy helpers where available.
- Test allowed and denied cases.
- Do not expose existence of resources when the product uses indistinguishable 404 behavior.

## Transactions And Consistency

- Use transactions for multi-write invariants.
- Make idempotency explicit for retries, webhooks, background jobs, and payment-like flows.
- Define concurrency behavior for counters, quotas, inventory, balances, and sequence generation.
- Use database constraints for critical uniqueness and referential integrity.

## API Responses

- Return structured success and error responses.
- Keep error bodies consistent across endpoints.
- Do not expose stack traces or internal exception names.
- Include correlation IDs where supported.
- Preserve backward compatibility unless a versioned contract change is approved.

## Background Jobs

- Jobs must be idempotent or have explicit duplicate prevention.
- Record retry policies and dead-letter behavior.
- Log start, success, failure, and retry context.
- Include metrics for duration, attempts, success, and failure.
- Design jobs to resume safely after partial failure.

## External Integrations

- Wrap providers behind product-owned interfaces.
- Set timeouts.
- Retry only safe operations.
- Handle rate limits and provider outages.
- Redact provider secrets and sensitive payloads from logs.
- Provide test fakes or contract tests.

## Data Access

- Avoid unbounded queries.
- Use pagination for lists.
- Review N+1 risks.
- Select only needed fields where performance or privacy matters.
- Index new query patterns.
- Include migration rollback or mitigation notes.

## Backend Testing

Minimum coverage:

- Unit tests for domain rules.
- Integration tests for persistence and service boundaries.
- API contract tests for request, response, and errors.
- Authorization tests for allowed and denied actors.
- Regression tests for changed behavior.

## Done Means

- Inputs are validated.
- Authorization is enforced and tested.
- Data invariants are protected.
- Errors are safe and consistent.
- Logs and metrics support production diagnosis.
- Tests cover normal, boundary, and failure behavior.

