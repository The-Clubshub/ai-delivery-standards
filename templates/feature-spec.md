# Feature Spec Template

```yaml
artifact: feature-spec
feature_id: FEA-000
feature_name: ""
status: draft
owner: ""
created: YYYY-MM-DD
updated: YYYY-MM-DD
source_canvas: reasons-canvas.md
```

## 1. Overview

Describe the feature, the user value, and the expected production outcome.

## 2. Goals

- `<goal>`

## 3. Non-Goals

- `<explicitly excluded behavior>`

## 4. Users And Permissions

| User Or Actor | Can Do | Cannot Do | Notes |
| --- | --- | --- | --- |
| `<actor>` | `<allowed>` | `<not allowed>` | `<notes>` |

## 5. User Experience

### Primary Flow

1. `<step>`
2. `<step>`
3. `<step>`

### Empty, Loading, Error, And Success States

| State | User Experience | Required Copy Or Behavior |
| --- | --- | --- |
| Empty | `<description>` | `<copy/behavior>` |
| Loading | `<description>` | `<copy/behavior>` |
| Error | `<description>` | `<copy/behavior>` |
| Success | `<description>` | `<copy/behavior>` |

### Accessibility Requirements

- Keyboard path:
- Focus behavior:
- Screen reader announcements:
- Required semantics:
- Contrast requirements:

## 6. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | `<requirement>` | Must | `<criteria>` |

## 7. Non-Functional Requirements

| Area | Requirement | Measure |
| --- | --- | --- |
| Performance | `<requirement>` | `<budget>` |
| Security | `<requirement>` | `<control>` |
| Observability | `<requirement>` | `<log/metric/trace>` |
| Reliability | `<requirement>` | `<behavior>` |
| Accessibility | `<requirement>` | `<WCAG/user evidence>` |

## 8. Data And Domain Model

| Entity | Fields | Rules | Persistence |
| --- | --- | --- | --- |
| `<entity>` | `<fields>` | `<rules>` | `<store>` |

## 9. API Or Interface Contracts

### Request

```json
{}
```

### Response

```json
{}
```

### Errors

| Status Or Code | Cause | Response |
| --- | --- | --- |
| `<code>` | `<cause>` | `<body>` |

## 10. AI Behavior Contract

Use this section for AI-enabled features.

| Behavior | Requirement |
| --- | --- |
| Grounding | `<sources/tools/context required>` |
| Refusal | `<when to refuse>` |
| Output shape | `<schema>` |
| Safety | `<policy/security/privacy boundaries>` |
| Evaluation | `<tests/evals>` |

## 11. Analytics And Observability

| Event, Metric, Or Log | Trigger | Fields | Privacy Notes |
| --- | --- | --- | --- |
| `<name>` | `<trigger>` | `<fields>` | `<privacy>` |

## 12. Rollout And Migration

- Feature flag:
- Migration steps:
- Backward compatibility:
- Rollback:
- Support runbook:

## 13. Acceptance Criteria Traceability

| Acceptance Criterion | Implementation Operation | Test Case |
| --- | --- | --- |
| `<AC>` | `<operation>` | `<test>` |

## 14. Open Questions

| Question | Owner | Decision Date | Resolution |
| --- | --- | --- | --- |
| `<question>` | `<owner>` | `<date>` | `<resolution>` |

