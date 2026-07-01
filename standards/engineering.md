# Engineering Standards

These standards apply to all AI-assisted implementation unless a product repository defines a stricter local rule.

## Principles

- Optimize for maintainability, correctness, and operability before cleverness.
- Prefer existing product patterns over new abstractions.
- Make behavior explicit through names, types, contracts, and tests.
- Keep changes scoped to the approved specification.
- Treat generated code exactly like human-written production code.

## Code Quality

| Standard | Requirement |
| --- | --- |
| Readability | Code should be understandable without reading chat history. |
| Simplicity | Use the smallest design that satisfies current requirements and likely near-term change. |
| Cohesion | Keep related behavior together; avoid cross-layer leakage. |
| Coupling | Depend on stable interfaces, not incidental implementation details. |
| Error handling | Use the product's established error model. |
| Comments | Explain non-obvious decisions, invariants, and trade-offs, not routine syntax. |

## Naming

- Use domain vocabulary from the REASONS Canvas.
- Names should describe responsibility, not implementation mechanics.
- Avoid vague names such as `data`, `result`, `manager`, `helper`, `processor`, and `utils` unless locally conventional and specific.
- Boolean names should read clearly: `isArchived`, `hasPermission`, `canInviteUser`.
- Use consistent suffixes:
  - `Controller` or `Route` for HTTP boundaries.
  - `Service` for domain orchestration.
  - `Repository` for persistence access.
  - `DTO` or `Request`/`Response` for transport objects.
  - `Policy` or `Guard` for authorization decisions.

## Architecture

- Keep UI, API, domain, persistence, and infrastructure concerns separated.
- Domain logic should not live in UI components, route handlers, or database migrations.
- API handlers should validate, authorize, call domain behavior, and translate responses.
- Persistence code should not make product decisions.
- External integrations should be wrapped behind product-owned interfaces.
- New cross-cutting abstractions require an ADR when they affect multiple features or teams.

## Dependencies

Before adding a dependency:

- Confirm the problem is not already solved in the codebase.
- Check maintenance health, license, bundle/runtime cost, security advisories, and ecosystem fit.
- Prefer small, stable libraries over broad frameworks.
- Record the dependency rationale in the implementation plan or ADR.

## Data And State

- Define ownership for every new entity.
- Validate inputs at trust boundaries.
- Preserve backward compatibility for persisted data and public contracts.
- Use transactions for multi-write invariants.
- Make concurrency behavior explicit for counters, quotas, idempotent operations, and background work.
- Never rely on client-side validation as the only enforcement.

## Error Handling

Errors should be:

- Specific enough for users or operators to act.
- Safe enough to avoid leaking secrets, PII, stack traces, or internal topology.
- Typed or structured where the product supports it.
- Logged with correlation IDs and relevant context.

Avoid:

- Swallowing errors silently.
- Retrying non-idempotent operations without safeguards.
- Returning generic success when partial failure occurred.

## Configuration

- Use environment-specific configuration through established product mechanisms.
- Defaults must be safe.
- Secrets must come from secret management, not source code.
- Feature flags should have owners, rollout plans, expiry dates, and fallback behavior.

## Documentation

Update docs when:

- Public behavior changes.
- API contracts change.
- Operational procedures change.
- New dependencies, services, flags, or background jobs are added.
- Implementation differs materially from the approved spec.

## AI-Generated Code Rules

AI-generated code must:

- Be reviewed against the same standards as human code.
- Declare and follow AI workbench/model selection from `standards/ai-workbench.md`.
- Include tests proportionate to risk.
- Include spec updates when behavior changes.
- Avoid invented APIs and unverified assumptions.
- Be traceable to feature artifacts.

## Done Means

- The code matches the approved spec.
- Tests and quality checks pass or gaps are documented.
- Review checklist is complete.
- Specs are synchronized with final behavior.
