# Workflow: Create A New Feature

Use this workflow for new user-facing, API, backend, infrastructure, or AI-enabled features.

If the feature already exists in the application and you are changing or fixing it for the first time under this standards framework, use `workflows/existing-feature-change.md` instead.

If the request contains multiple independent features, use `workflows/autonomous-feature-queue.md` to maintain the queue and run this workflow for each feature.

## Outcome

A feature moves from intent to reviewed implementation with synchronized specs, tests, and code.

## Required Artifacts

Create:

```text
docs/features/<ID>-<slug>/
  reasons-canvas.md
  feature-spec.md
  implementation-plan.md
  test-plan.md
  review-checklist.md
```

Add ADRs when the feature introduces long-lived architecture decisions.

## Steps

### 1. Intake

Capture:

- Feature name
- Problem statement
- Target users
- Business value
- Constraints
- Deadline or release target
- Known scope out

### 2. Inspect Existing Context

Read:

- Existing product docs
- Related feature specs
- Architecture overview
- Relevant code and tests
- API contracts
- UI routes and components
- Standards in this repository

### 3. Create REASONS Canvas

Use `templates/reasons-canvas.md`.

CLI shortcut for the full artifact folder:

```bash
ai-delivery feature FEA-042 "Scoped Help Assistant"
```

Minimum content:

- Requirements with acceptance criteria.
- Entities and domain vocabulary.
- Approach and trade-offs.
- Structure and impacted modules.
- Operations.
- Norms.
- Safeguards.

### 4. Create Feature Spec

Use `templates/feature-spec.md`.

Include:

- Goals and non-goals.
- User experience.
- Functional requirements.
- Non-functional requirements.
- API or interface contracts.
- AI behavior contract if relevant.
- Observability and rollout.
- Acceptance criteria traceability.

### 5. Create Implementation Plan

Use `templates/implementation-plan.md`.

Each operation must include:

- Purpose.
- Files or modules.
- Tests.
- Validation.
- Rollback or mitigation.

### 6. Create Test Plan

Use `templates/test-plan.md`.

Cover:

- Unit tests.
- Integration or contract tests.
- End-to-end tests where useful.
- Accessibility tests for UI.
- Security tests for protected behavior.
- AI evaluations for AI features.
- Performance checks where relevant.

### 7. Spec Review Gate

Do not implement until:

- Acceptance criteria are testable.
- Scope out is clear.
- Data and permission boundaries are defined.
- Safeguards are enforceable.
- Implementation operations are ordered.
- Test plan covers the main risks.

### 8. Implement Operation By Operation

For each operation:

1. Update plan status to `In progress`.
2. Add or update tests where feasible.
3. Implement the change.
4. Run focused validation.
5. Update plan status to `Done`.
6. Record unexpected decisions.

### 9. Review AI-Generated Code

Use `review-checklist.md`.

Check:

- Intent alignment.
- Scope control.
- Architecture fit.
- Accessibility.
- Security.
- Testing.
- Observability.
- Spec-code sync.

### 10. Sync Specs

Before merge:

- Update contracts with final request/response shapes.
- Update operations with actual files and statuses.
- Update test plan with actual validation.
- Record deferred work and known gaps.

## Example Prompt

```text
Create and implement a new feature under ai-delivery-standards.

Feature: <feature name>
Problem: <problem>
Users: <users>
Constraints:
- <constraint>

Process:
1. Inspect existing code and docs.
2. Create docs/features/<ID>-<slug>/ with all required artifacts.
3. Stop if acceptance criteria, authorization, data ownership, or safety boundaries are unclear.
4. Implement only the operations in implementation-plan.md.
5. Add tests from test-plan.md.
6. Complete review-checklist.md.
7. Sync specs with final code.
```

## Quality Gates

- [ ] Required artifacts exist.
- [ ] Acceptance criteria map to tests.
- [ ] Implementation follows ordered operations.
- [ ] Standards are applied.
- [ ] Validation evidence is recorded.
- [ ] Specs match final behavior.
