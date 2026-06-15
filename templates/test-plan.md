# Test Plan Template

```yaml
artifact: test-plan
feature_id: FEA-000
feature_name: ""
status: draft
owner: ""
created: YYYY-MM-DD
updated: YYYY-MM-DD
source_spec: feature-spec.md
```

## Test Strategy

Describe how the feature will be validated across unit, integration, contract, end-to-end, accessibility, security, performance, and observability checks.

## Test Matrix

| Requirement Or Risk | Test Type | Test Case | Expected Result | Automation |
| --- | --- | --- | --- | --- |
| `<requirement>` | `<unit/integration/e2e/etc>` | `<case>` | `<expected>` | `<yes/no>` |

## Acceptance Criteria Tests

| Acceptance Criterion | Test Name | Level | Notes |
| --- | --- | --- | --- |
| `<AC>` | `<test>` | `<level>` | `<notes>` |

## Unit Tests

- `<test case>`

## Integration Tests

- `<test case>`

## Contract Or API Tests

```http
POST /example
Content-Type: application/json

{}
```

Expected:

```json
{}
```

## End-To-End Tests

- `<flow>`

## Accessibility Tests

- Keyboard-only navigation:
- Focus order and visible focus:
- Semantic roles and names:
- Screen reader announcements:
- Color contrast:
- Reduced motion:

## Security Tests

- Authentication:
- Authorization:
- Input validation:
- Injection resistance:
- Sensitive data redaction:
- Abuse and rate limits:

## AI Evaluation Tests

Use this section for AI-enabled features.

| Scenario | Input | Expected AI Behavior | Required Assertion |
| --- | --- | --- | --- |
| In-domain | `<prompt>` | `<answer behavior>` | `<assertion>` |
| Out-of-domain | `<prompt>` | `<refusal behavior>` | `<assertion>` |
| Ambiguous | `<prompt>` | `<clarify behavior>` | `<assertion>` |

## Performance Tests

| Scenario | Budget | Method |
| --- | --- | --- |
| `<scenario>` | `<latency/throughput/resource budget>` | `<test method>` |

## Observability Tests

- Required logs are emitted without sensitive data.
- Metrics include success, failure, latency, and relevant business counters.
- Traces connect user action to backend processing and external dependencies.
- Alerts or dashboards are updated when the feature introduces new operational risk.

## Manual QA

| Scenario | Steps | Expected Result | Evidence |
| --- | --- | --- | --- |
| `<scenario>` | `<steps>` | `<expected>` | `<screenshot/log/link>` |

## Validation Commands

```bash
# Replace with commands from the repository's runtime command policy.
# Bun-only example:
bun test
bun run lint
bun run test:e2e
```

## Known Gaps

| Gap | Risk | Owner | Follow-Up |
| --- | --- | --- | --- |
| `<gap>` | `<risk>` | `<owner>` | `<ticket>` |
