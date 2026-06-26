# Workflow: Autonomous Feature Queue

Use this workflow when one request contains multiple independent features or a backlog slice that an AI agent can implement without asking the user to approve each next step.

This workflow does not replace specification-first delivery. It adds an execution mode for moving through several specified or specifiable features with disciplined validation, review, and stop conditions.

For large builds where the human wants to approve requirements once and then let the agent run the rest of the loop, initialize or configure the project with:

```json
{
  "approvalPolicy": {
    "requirements": "human_required",
    "plan": "not_required",
    "implementation": "not_required"
  }
}
```

This is the same policy created by `ai-delivery init . --autonomous-after-requirements`.

## Outcome

A feature batch moves through a queue automatically. Each feature is specified, implemented, validated, reviewed, fixed where useful, completed with evidence, and followed by the next queue item unless a defined blocker is reached.

## Required Artifacts

For each feature, create or update:

```text
.ai/features/<ID>-<slug>/
  reasons-canvas.md
  feature-spec.md
  implementation-plan.md
  test-plan.md
  review-checklist.md
```

For the batch, create or update a queue log when the work spans more than one feature:

```text
.ai/queues/active.md
```

Use `templates/feature-queue.md` for the queue log.

## Queue Rules

- Maintain the queue explicitly.
- Work one feature at a time.
- Select the next feature from the queue without asking the user to continue.
- Do not ask for approval before starting the next queued feature unless a stop condition applies.
- Prefer dependency order first, then smallest safe feature, then highest user value.
- Do not bundle unrelated feature implementations into one diff unless the specs share the same operation.
- Keep each feature's artifacts synchronized before moving to the next feature.
- Declare AI model routing for each feature before implementation starts.

## Stop Conditions

Stop and ask the user only when:

- Requirements are contradictory.
- Acceptance criteria cannot be made testable without a product decision.
- Authorization, data ownership, tenant boundary, privacy, payment, legal, or security behavior is unclear.
- A secret, API key, payment, production credential, or external approval is needed.
- Destructive changes, irreversible migrations, or production actions are required.
- Tests cannot be run and the unvalidated risk is material.
- The next feature depends on a product decision not present in the brief.

If none of these conditions apply, record assumptions in the artifacts and continue.

## Per-Feature Loop

### 1. Restate Objective And Acceptance Criteria

Before editing code for the feature, record:

- Feature objective.
- Acceptance criteria.
- Scope out.
- Dependencies on earlier queue items.
- Assumptions that are safe enough to proceed.
- AI provider, model, reason, fallback model if any, and premium-review status.

The restatement should live in the feature spec and, when useful, in the queue log.

### 2. Implement The Smallest Clean Solution

Implement the narrowest change that satisfies the acceptance criteria.

Rules:

- Follow the implementation plan operation by operation.
- Follow each operation's `ai_provider` routing.
- Prefer existing project patterns and helpers.
- Add abstractions only when they remove real complexity or match existing architecture.
- Avoid opportunistic redesign, dependency additions, analytics, notifications, permissions, or UI paths not required by the spec.

### 3. Validate

Run relevant checks for the feature:

- Unit tests.
- Integration or contract tests.
- End-to-end tests when user flows changed.
- Lint, typecheck, or build commands.
- Accessibility, security, performance, or observability checks when the feature touches those risks.

Record commands, results, and gaps in `test-plan.md` and `review-checklist.md`.

### 4. Self-Review

Before asking any critic or reviewer, answer:

- What could break?
- Is this over-engineered?
- Does this conflict with existing patterns?
- Are edge cases handled?
- Did the implementation stay within scope?
- Do specs match the final behavior?

Record material findings in `review-checklist.md`.

### 5. Critic Review

Spawn a critic reviewer when the environment supports it. Otherwise simulate one by reviewing the diff from an adversarial but scope-bound perspective.

The critic must:

- Challenge assumptions.
- Identify risks, missing tests, regressions, and simpler alternatives.
- Check acceptance criteria and scope out.
- Check generated-code risks such as invented APIs, dead code, broad abstractions, data leaks, missing authorization, and accessibility regressions.
- Avoid requesting changes unless they are tied to acceptance criteria, standards, maintainability, security, or real defects.

Record critic findings by severity in `review-checklist.md`.

### 6. Apply Useful Fixes

Apply fixes only when they improve:

- Correctness.
- Maintainability.
- Security or privacy.
- Accessibility.
- Performance.
- Observability.
- User-facing behavior required by the spec.
- Test confidence for material risk.

Do not apply stylistic churn or speculative enhancements.

### 7. Review/Fix Cycle Limit

After validation and critic review, run at most two review/fix cycles.

Stop revising when either:

- All acceptance criteria pass and no material defects remain.
- Two review/fix cycles have completed.

If material defects remain after two cycles, mark the feature blocked or incomplete with concrete remaining risks and ask the user only if a stop condition applies.

### 8. Mark Feature Complete

Before moving to the next queue item, update the queue log and feature artifacts with:

- Feature status.
- Files changed.
- Tests and validation commands run.
- Self-review result.
- Critic-review result.
- Fixes applied.
- Remaining risks or known gaps.
- Next feature selected.

### 9. Continue Automatically

Pick the next unblocked feature in the queue and repeat the loop.

The agent may announce the next selected feature for traceability, but must not wait for user approval before starting it unless a stop condition applies.

Only stop when:

- The queue is complete.
- Every remaining item is blocked by a stop condition.
- The user interrupts or changes direction.

## Queue Status Values

Use these status values in `.ai/queues/active.md`:

- `Queued`
- `In progress`
- `Reviewing`
- `Fixing`
- `Complete`
- `Blocked`
- `Deferred`

## Example Prompt

```text
Use ai-delivery-standards and the autonomous feature queue workflow.

Features:
1. Add saved-search rename.
2. Add saved-search duplicate.
3. Add saved-search delete confirmation.

Process:
- Create or update `.ai/queues/active.md`.
- For each feature, restate objective and acceptance criteria.
- Create or update required feature artifacts.
- Implement the smallest clean solution.
- Run relevant tests, lint, typecheck, or build commands.
- Self-review and critic-review the diff.
- Apply only correctness, maintainability, security, accessibility, or required UX fixes.
- Stop after acceptance criteria pass or two review/fix cycles.
- Mark the feature complete and continue to the next unblocked feature.
```

## Quality Gates

- [ ] Feature queue is explicit and ordered.
- [ ] Each feature has required artifacts.
- [ ] Each feature has AI model routing before implementation.
- [ ] Acceptance criteria are testable.
- [ ] Each completed feature has validation evidence.
- [ ] Self-review is recorded.
- [ ] Critic review is recorded.
- [ ] Review/fix cycles do not exceed two per feature.
- [ ] Remaining risks are recorded before moving on.
- [ ] Specs match final implementation for each completed feature.
