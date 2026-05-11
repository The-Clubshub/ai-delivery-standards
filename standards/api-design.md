# API Design Standards

APIs must be explicit, stable, secure, and easy to consume. These standards apply to HTTP, RPC, GraphQL, event, and internal service contracts.

## Contract First

Define the contract in the feature spec before implementation:

- Endpoint or operation name
- Authentication and authorization
- Request shape
- Response shape
- Error shape
- Idempotency and concurrency behavior
- Versioning and compatibility
- Observability fields

## Resource Naming

For HTTP APIs:

- Use nouns for resources: `/teams/{teamId}/invitations`.
- Use HTTP methods for actions where possible.
- Use action subresources only when the action is not a standard CRUD operation.
- Keep path naming consistent with the existing API.
- Use plural collections unless local convention differs.

## Request Design

- Require explicit fields.
- Reject invalid types and unsupported enum values.
- Define defaulting behavior.
- Avoid overloading one field with multiple meanings.
- Use ISO 8601 timestamps unless local convention differs.
- Use stable identifiers, not display names, for references.
- Treat client-provided derived values as untrusted.

## Response Design

- Return only fields the client needs and is authorized to see.
- Use consistent naming and casing.
- Include pagination metadata for lists.
- Include status or state fields when workflows are asynchronous.
- Include safe correlation IDs for support when useful.

## Error Design

Errors should be consistent and machine-readable:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request is invalid.",
    "details": [
      {
        "field": "email",
        "code": "invalid_email",
        "message": "Enter a valid email address."
      }
    ],
    "correlationId": "req_123"
  }
}
```

Do not expose stack traces, SQL errors, internal hostnames, provider secrets, or hidden policy details.

## Status Codes

| Status | Use |
| --- | --- |
| 200 | Successful read or synchronous operation. |
| 201 | Resource created. |
| 202 | Accepted for asynchronous processing. |
| 204 | Successful operation with no body. |
| 400 | Invalid request. |
| 401 | Authentication required or invalid. |
| 403 | Authenticated but not allowed. |
| 404 | Resource not found or intentionally hidden. |
| 409 | Conflict with current resource state. |
| 422 | Semantically invalid request when product convention uses it. |
| 429 | Rate limit exceeded. |
| 500 | Unexpected server failure. |

## Pagination, Filtering, And Sorting

- Use pagination for collections that can grow.
- Define maximum page size.
- Validate filters and sort fields.
- Use cursor pagination for mutable large collections where possible.
- Document default sort order.

## Idempotency

Define idempotency for:

- Payment-like operations.
- External side effects.
- Retries.
- Webhooks.
- Background jobs.
- Bulk mutations.

Use idempotency keys or natural unique constraints where appropriate.

## Versioning And Compatibility

- Avoid breaking changes to public APIs.
- Add fields rather than changing meanings.
- Mark deprecations with migration guidance.
- Version when consumers cannot move in lockstep.
- Include compatibility tests for widely used contracts.

## Event Contracts

Events should define:

- Event name
- Producer
- Consumers
- Schema
- Version
- Idempotency key
- Ordering assumptions
- Retention and replay behavior

## API Review Gate

- [ ] Contract appears in `feature-spec.md`.
- [ ] Validation and error behavior are tested.
- [ ] Authorization behavior is tested.
- [ ] Backward compatibility is addressed.
- [ ] Observability and correlation are included.

