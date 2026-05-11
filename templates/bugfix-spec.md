# Bugfix Spec Template

```yaml
artifact: bugfix-spec
bug_id: BUG-000
title: ""
severity: ""
status: draft
owner: ""
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

## Summary

Describe the defect, affected users, impact, and expected correction.

## Impact

| Area | Details |
| --- | --- |
| User impact | `<who is affected and how>` |
| Business impact | `<revenue/support/compliance impact>` |
| Technical impact | `<systems/data/jobs affected>` |
| Severity | `<critical/high/medium/low>` |

## Evidence

- Error message:
- Logs or trace IDs:
- Screenshots or recordings:
- Affected versions:
- First observed:
- Reproduction rate:

## Expected Behavior

`<what should happen>`

## Actual Behavior

`<what happens now>`

## Reproduction Steps

1. `<step>`
2. `<step>`
3. `<step>`

## Root Cause Analysis

| Question | Answer |
| --- | --- |
| What failed? | `<answer>` |
| Why did it fail? | `<answer>` |
| Why was it not caught? | `<test/process gap>` |
| What similar areas might be affected? | `<blast radius>` |

## Fix Scope

### Scope In

- `<fix behavior>`

### Scope Out

- `<not part of this fix>`

## Safeguards

- [ ] Fix does not weaken security, authorization, privacy, or accessibility.
- [ ] Fix includes regression coverage.
- [ ] Fix does not introduce unrelated refactors.
- [ ] Specs or docs are updated if behavior changes.

## Test Plan

| Case | Type | Expected Result |
| --- | --- | --- |
| Reproduction case | Regression | Bug no longer occurs |
| Boundary case | Unit/integration | `<expected>` |
| Existing behavior | Regression | No unintended change |

## Rollout And Monitoring

- Rollout:
- Rollback:
- Monitoring:
- Support note:

## Completion Checklist

- [ ] Root cause documented.
- [ ] Minimal fix implemented.
- [ ] Regression test added.
- [ ] Relevant specs updated.
- [ ] Validation evidence recorded.

