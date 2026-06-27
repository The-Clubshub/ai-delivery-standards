# Workflow: Review AI-Generated Code

Use this workflow whenever an AI agent has generated or substantially modified production code.

## Outcome

The review verifies that generated code is intentional, scoped, tested, secure, accessible, and synchronized with specs.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Review checklist | Feature or bug artifact folder |
| Source spec | Feature or bug artifact folder |
| Test plan | Feature or bug artifact folder |

## Steps

### 1. Review The Spec Before The Diff

Read:

- REASONS Canvas or bugfix spec.
- Feature spec.
- Implementation plan.
- Test plan.
- AI model routing from the plan and review artifact.

Identify what the code is supposed to do before looking at implementation details.

### 2. Review Scope

Check:

- Every changed file is explained by the plan.
- No scope-out item was implemented.
- No unrelated refactors or dependency changes are present.
- Public contracts changed only when approved.

### 3. Review Behavior

Check:

- Acceptance criteria are implemented.
- Edge cases and negative cases are handled.
- Existing behavior is preserved where required.
- Error states are safe and useful.

### 4. Review Standards

Apply relevant standards:

- `standards/engineering.md`
- `standards/ai-model-routing.md`
- `standards/frontend.md`
- `standards/backend.md`
- `standards/ui-ux.md`
- `standards/accessibility.md`
- `standards/testing.md`
- `standards/security.md`
- `standards/performance.md`
- `standards/observability.md`
- `standards/api-design.md`

### 5. Review Tests

Check:

- Acceptance criteria map to tests.
- Safeguards have negative tests.
- Bug fixes have regression tests.
- AI features have grounded, refusal, ambiguous, injection, and schema tests.
- Test assertions prove behavior rather than implementation trivia.

### 6. Review Generated-Code Risks

Look for:

- Invented APIs.
- Dead code.
- Overbroad abstractions.
- Inconsistent naming.
- Missing authorization.
- Hidden data leaks.
- Unhandled async errors.
- Accessibility regressions.
- Unapproved dependencies.
- False comments that do not match behavior.

### 7. Review AI Model Routing

Check:

- Every delivery step has `ai_provider`.
- Standard implementation routes did not make final architecture, auth, billing, database, or security decisions.
- Configured premium-review routing covered work touching auth, billing, payments, migrations, permissions, or customer data.
- The final review route is equal or stronger than the implementation route.
- The pull request includes a model usage summary.

### 8. Review Spec-Code Sync

If code differs from specs:

- Update specs if the change is correct and approved.
- Change code if the difference is drift.
- Add tests for the final decision.

### 9. Run Self-Review And Critic Review

For AI-generated implementation work, record both:

- Self-review: what could break, whether the solution is over-engineered, whether it conflicts with existing patterns, and whether edge cases are handled.
- Critic review: a scope-bound challenge of assumptions, missing tests, regressions, simpler alternatives, security, accessibility, and generated-code risks.

Apply fixes only when they improve correctness, maintainability, security, accessibility, performance, observability, or required user-facing behavior.

For autonomous feature queue work, stop after acceptance criteria pass or after two review/fix cycles.

### 10. Record Findings

Prioritize findings:

- P0: Blocks release; severe security, data loss, outage, or legal risk.
- P1: Serious correctness, security, accessibility, or compatibility issue.
- P2: Important maintainability, test, UX, or operational issue.
- P3: Minor improvement.

## Example Prompt

```text
Review this AI-generated code under ai-delivery-standards.

Use the feature artifacts first, then inspect the diff.

Prioritize:
1. Spec mismatch.
2. Security or authorization defects.
3. Accessibility defects.
4. Missing tests.
5. Scope creep.
6. Architecture or maintainability risks.

Update review-checklist.md with findings and validation evidence.
```

## Quality Gates

- [ ] Review starts from specs.
- [ ] Scope is controlled.
- [ ] Acceptance criteria are covered.
- [ ] Generated-code risks are checked.
- [ ] AI model routing is checked.
- [ ] Specs are synchronized.
- [ ] Findings are recorded by severity.
