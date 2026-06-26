# Workflow: Bug Fix

Use this workflow for defects, regressions, production incidents, and incorrect behavior.

## Outcome

The bug is fixed with root cause, regression coverage, minimal scope, and updated specs when behavior changes.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Bugfix spec | `.ai/bugs/<BUG-ID>-<slug>/bugfix-spec.md` |
| Related feature updates | Existing feature artifact folder, if behavior changes |
| ADR | `.ai/decisions/ADR-<ID>.md`, if architecture changes |

## Steps

### 1. Capture Evidence

Collect:

- User report or incident link.
- Reproduction steps.
- Logs, trace IDs, screenshots, or data examples.
- Affected versions and environments.
- Severity and impact.

### 2. Reproduce Or Bound The Failure

Try to reproduce with the smallest possible case.

If reproduction is impossible, define:

- What evidence exists.
- What hypotheses are plausible.
- What additional logging or diagnostics are needed.

### 3. Create Bugfix Spec

Use `templates/bugfix-spec.md`.

Include:

- Expected behavior.
- Actual behavior.
- Root cause.
- Fix scope.
- Regression test plan.
- AI model routing for root cause analysis, implementation, tests, and review.
- Rollout and monitoring.

### 4. Check Related Feature Specs

If the bug means the original spec was wrong or incomplete:

- Update the feature spec.
- Update test plan.
- Update safeguards.

If the implementation simply violates the spec:

- Keep the spec.
- Fix the code.
- Add regression test.

### 5. Implement Minimal Fix

Rules:

- Fix the root cause, not only the symptom.
- Follow the declared `ai_provider` routing.
- Avoid unrelated refactors.
- Add a regression test that would have caught the bug.
- Preserve existing public behavior unless a spec update approves a change.

### 6. Validate

Run:

- Regression test.
- Focused affected test suite.
- Broader suite if shared logic changed.
- Manual verification if user workflow was affected.

### 7. Review And Sync

Update:

- `bugfix-spec.md` completion checklist.
- Related feature artifacts, if behavior changed.
- Review checklist or PR body with validation evidence.

## Example Prompt

```text
Fix this bug under .ai/ai-delivery-standards.

Bug:
<description>

Evidence:
- <logs/screenshots/reproduction>

Process:
1. Inspect relevant code and tests.
2. Create .ai/bugs/<BUG-ID>-<slug>/bugfix-spec.md.
3. Reproduce or document why reproduction is not possible.
4. Implement the smallest root-cause fix.
5. Add regression coverage.
6. Update related feature specs if expected behavior changes.
```

## Quality Gates

- [ ] Bugfix spec exists.
- [ ] Root cause is documented.
- [ ] Fix scope is minimal.
- [ ] AI model routing is declared and followed.
- [ ] Regression test exists or gap is documented.
- [ ] Related specs are updated if behavior changed.
- [ ] Validation evidence is recorded.
