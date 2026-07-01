# Workflow: Create A New Feature

Use this workflow for new user-facing, API, backend, infrastructure, or AI-enabled features under the V2 operating system.

If the feature already exists in the application and you are changing or fixing it for the first time under this standards framework, use `workflows/existing-feature-change.md` and migrate enough lifecycle state to `.ai/features/<ID>-<slug>/` before implementation.

If the request contains multiple independent features or a broad deliverable such as a full website, use `.ai/queues/active.md`, create a plan for the full original request, and then work one feature lifecycle entry at a time.

## Outcome

A feature moves from intent to requirements gate, plan gate, implementation, AI review, testing, implementation gate, and completion with synchronized state. By default each approval gate is `human_required`, but projects may set gates to `not_required` in `.ai/config.json`.

## Required Artifacts

Create:

```text
.ai/features/<ID>-<slug>/
  state.json
  requirements.md
  plan.md
  tests.md
  review.md
  approval.md
  memory.md
  activity.md
  handoff.md
```

Add ADRs in `.ai/decisions/` when the feature introduces long-lived architecture decisions.

## Required State Flow

```text
intake
-> requirements_draft
-> requirements_pending_review
-> plan_draft
-> plan_pending_review
-> building
-> reviewing
-> testing
-> ready_for_human_review
-> complete
```

The feature may enter `blocked` from any non-terminal state.

## Steps

### 1. Start Feature

Use:

```bash
ai-delivery feature FEA-042 "Scoped Help Assistant"
```

This creates `.ai/features/FEA-042-scoped-help-assistant/`, updates `.ai/registry.json`, and makes the feature active in `.ai/state.json`.

### 2. Requirements Draft

The Requirements Agent fills `requirements.md` with:

- Feature name
- Problem statement
- Target users
- Scope in
- Scope out
- Acceptance criteria
- Domain vocabulary and entities
- UX, API, AI behavior, and non-functional requirements where relevant
- Safeguards
- Open questions

Do not plan implementation or edit production code in this state.

### 3. Requirements Review

Move to `requirements_pending_review` when requirements are testable and bounded.

If `approvalPolicy.requirements` is `human_required`, do not continue to planning until a human approves requirements with:

```text
/approve-requirements
```

After `/approve-requirements`, record approval evidence, move directly to `plan_draft`, and start Planner Agent work. Do not wait for `/continue`.

If `approvalPolicy.requirements` is `not_required`, record `not_required` in `approval.md` and `state.json`, then move directly to `plan_draft`.

Gate evidence must be recorded in `approval.md` and mirrored in `state.json`.

### 4. Plan Draft

After the requirements gate is satisfied, the Planner Agent fills:

- `plan.md`
- `tests.md`

The plan must include ordered operations, expected files or modules where known, validation, rollback, dependencies, configuration, security, accessibility, observability, and rollout notes.

The plan must also include the AI workbench/model profile using `standards/ai-workbench.md`. Missing model selection blocks the plan gate.

For multi-feature requests, the plan gate is not ready until `.ai/queues/active.md` covers the full original request. The plan must identify every feature, page, flow, integration, shared operation, validation pass, and dependency needed to satisfy that request, or explicitly mark items as deferred with a reason.

### 5. Plan Review

Move to `plan_pending_review` when the implementation plan and test plan are ready.

If `approvalPolicy.plan` is `human_required`, do not build until a human approves the plan with:

```text
/approve-plan
```

After `/approve-plan`, record approval evidence, move directly to `building`, and start Builder Agent work. Do not wait for `/continue`. For a request with a feature queue, this approval covers every queued feature inside the original request; do not ask for separate approval before starting the next queued feature unless a stop condition applies.

If `approvalPolicy.plan` is `not_required`, record `not_required` in `approval.md` and `state.json`, then move directly to `building`.

Gate evidence must be recorded in `approval.md` and mirrored in `state.json`.

### 6. Build

The Builder Agent may build only when state is `building`.

Rules:

- Implement only gated operations.
- Follow the operation's declared `ai_model`.
- Work operation by operation.
- Keep changes narrow.
- Add or update tests with behavior changes.
- Return to `requirements_draft` or `plan_draft` if gated artifacts no longer match reality.

### 7. Review

The Reviewer Agent reviews implementation against:

- Gated requirements.
- Gated plan.
- Tests.
- Security, accessibility, performance, observability, API, frontend, backend, and engineering standards.
- Generated-code risks.
- AI workbench/model profile, including high-risk review requirements.

Material findings return the feature to `building`.

### 8. Test

The Tester Agent records validation in `tests.md`.

Run the smallest meaningful checks first and broaden based on risk:

- Unit tests.
- Integration or contract tests.
- End-to-end tests where useful.
- Accessibility tests for UI.
- Security tests for protected behavior.
- AI evaluations for AI features.
- Performance and observability checks where relevant.

Failed validation returns to `building` or `reviewing`.

### 9. Implementation Gate

When review and testing are complete, move to `ready_for_human_review`.

The Sync Agent prepares the completion summary and ensures:

- `state.json` is current.
- `approval.md` shows requirements and plan gate evidence.
- `review.md` records findings.
- `tests.md` records validation evidence.
- `handoff.md` names the next action or stop condition.

### 10. Complete

If `approvalPolicy.implementation` is `human_required`, only a human may complete the feature:

```text
/complete
```

After `/complete`, record approval evidence and move directly to `complete`. Do not wait for `/continue`.

If `approvalPolicy.implementation` is `not_required`, the Sync Agent may record `not_required` in `approval.md` and `state.json`, then move the feature directly to `complete`.

Completion records implementation gate evidence in `approval.md`, mirrors it in `state.json`, and moves the feature to `complete`.

## Quality Gates

- [ ] V2 feature folder exists.
- [ ] Requirements gate is satisfied before planning.
- [ ] Plan gate is satisfied before building.
- [ ] For broad or multi-feature requests, the queue covers the full original request before building.
- [ ] AI workbench/model profile exists for every delivery step.
- [ ] Review stage completed.
- [ ] Testing stage completed or gaps accepted.
- [ ] Implementation gate is satisfied before `complete`.
- [ ] Specs match final implementation.
