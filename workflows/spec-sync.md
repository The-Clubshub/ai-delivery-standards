# Workflow: Sync Specs With Implementation

Use this workflow when code changes, refactors, bug fixes, or release preparation reveal that specs no longer describe the current system.

## Outcome

Specs and implementation agree. Future agents can rely on the artifacts as current context.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| REASONS Canvas | Feature folder |
| Feature spec or bugfix spec | Feature or bug folder |
| Implementation plan | Feature or refactor folder |
| Test plan | Feature or bug folder |
| Review checklist | Feature or bug folder |

## Steps

### 1. Identify Drift

Compare specs to:

- Changed files.
- API contracts.
- UI behavior.
- Data model.
- Tests.
- Config and flags.
- Observability.
- Security controls.

### 2. Classify Drift

| Drift Type | Action |
| --- | --- |
| Requirement changed | Update REASONS Canvas and feature spec before code changes continue. |
| Implementation correction | Update spec to match approved final behavior. |
| Accidental drift | Change code back to spec. |
| Refactor changed structure only | Update Structure and implementation plan. |
| Tests changed validation strategy | Update test plan. |
| Operational behavior changed | Update observability, rollout, and runbook notes. |

### 3. Update REASONS Canvas

Update:

- Requirements if behavior changed.
- Entities if domain model changed.
- Approach if strategy changed.
- Structure if components or dependencies changed.
- Operations with final implementation sequence.
- Norms if new standards apply.
- Safeguards if boundaries changed.

### 4. Update Feature Spec

Update:

- User experience.
- Functional requirements.
- Non-functional requirements.
- API contracts.
- AI behavior contract.
- Analytics and observability.
- Rollout and migration.
- Acceptance criteria traceability.

### 5. Update Implementation Plan

Update:

- Operation statuses.
- Actual files and modules changed.
- Deferred operations.
- Rollback notes.
- Config and flags.

### 6. Update Test Plan

Update:

- Actual test names.
- Manual validation evidence.
- Known gaps.
- Added regression cases.
- Accessibility, security, performance, and AI eval results.

### 7. Validate Sync

Ask:

- Could another agent implement or maintain this feature from the artifacts?
- Are all current public contracts represented?
- Are safeguards documented and tested?
- Are deferred items clearly out of current scope?

## Example Prompt

```text
Sync specs with implementation under ai-delivery-standards.

Compare the current diff against:
- reasons-canvas.md
- feature-spec.md
- implementation-plan.md
- test-plan.md
- review-checklist.md

Update artifacts so they describe final behavior. Do not change production code
unless you find accidental drift from the approved spec. Record all deviations
and validation evidence.
```

## Quality Gates

- [ ] Drift is classified.
- [ ] Correct artifacts are updated.
- [ ] Code changes are not made during sync unless drift is accidental.
- [ ] Acceptance criteria still map to tests.
- [ ] Future agents can use the artifacts as current source of truth.

