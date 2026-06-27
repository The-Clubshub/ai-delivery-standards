# Architecture Decision Record Template

```yaml
artifact: architecture-decision-record
adr_id: ADR-000
title: ""
status: proposed
date: YYYY-MM-DD
deciders: []
related_features: []
```

## Status

`Proposed | Accepted | Superseded | Deprecated`

## Context

Describe the forces that require a decision:

- Business goals
- Technical constraints
- Existing architecture
- Compliance or operational requirements
- Known risks

## Decision

State the decision clearly.

## AI Model Routing

Architecture decisions must use the configured premium-review route or an explicitly approved equal-or-stronger route.

```yaml
ai_provider:
  provider: <project-configured-provider>
  model: <project-configured-model>
  risk_tier: premium_review
  strength_rank: 3
  reason: structural decisions have high long-term cost
  requires_premium_review: true
  reviewer_route: architecture
```

## Options Considered

| Option | Benefits | Costs | Decision |
| --- | --- | --- | --- |
| `<option>` | `<benefits>` | `<costs>` | `<chosen/rejected>` |

## Consequences

### Positive

- `<positive consequence>`

### Negative

- `<negative consequence>`

### Neutral Or Operational

- `<operational consequence>`

## Implementation Guidance

- Required code changes:
- Required migrations:
- Required tests:
- Required observability:
- Required documentation:

## Fitness Checks

Define how the team will know the decision remains valid.

| Check | Method | Frequency |
| --- | --- | --- |
| `<check>` | `<method>` | `<frequency>` |

## Rollback Or Supersession

Describe what would cause this ADR to be replaced and how to move away from the decision safely.

## References

- `<link>`
