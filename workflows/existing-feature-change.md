# Workflow: Amend An Existing Feature

Use this workflow when changing a feature that already exists in the application but was built before `ai-delivery-standards` was adopted.

## Outcome

The existing feature gains enough living specification to support the requested change safely. The team captures current production behavior, separates it from the requested amendment, implements the smallest safe change, and leaves synchronized specs for future work.

## Required Artifacts

Create or update:

```text
docs/features/<ID>-<slug>/
  reasons-canvas.md
  feature-spec.md
  implementation-plan.md
  test-plan.md
  review-checklist.md
```

If the change is primarily a defect, also consider:

```text
docs/bugs/<BUG-ID>-<slug>/bugfix-spec.md
```

If the change creates a long-lived architecture decision, add an ADR in `docs/decisions/`.

## Key Rule

Document current behavior before changing it.

For legacy features, the first artifact pass should describe what the system does today, what appears intentional, what is accidental or unclear, and what the requested change will alter.

## Steps

### 1. Intake

Capture:

- Existing feature name.
- Requested change or fix.
- User impact.
- Business reason.
- Known defects.
- Areas that must not change.
- Release urgency.

### 2. Inspect Current Implementation

Read:

- Relevant UI components, pages, routes, services, jobs, and schemas.
- Existing tests and fixtures.
- API contracts.
- Database migrations or model definitions.
- Product docs or support docs.
- Analytics, logs, or event names if they exist.
- Related issues, PRs, or ADRs where available.

Do not infer behavior from code alone if tests, docs, or product behavior contradict it. Record the conflict as an open question.

### 3. Create Or Locate Feature Artifacts

If no feature folder exists, create one:

```bash
node ai-delivery-standards/bin/ai-delivery.js feature FEA-<ID> "<Existing Feature Name>"
```

If running from the central standards repo before publishing:

```bash
npx --package /path/to/ai-delivery-standards ai-delivery feature FEA-<ID> "<Existing Feature Name>"
```

### 4. Document Baseline Current Behavior

In `reasons-canvas.md` and `feature-spec.md`, add:

- Current user flow.
- Current API contracts.
- Current data model.
- Current permissions.
- Current UI states.
- Current tests.
- Known gaps.
- Known bugs.
- Behavior that must not regress.

Use labels such as:

```text
Current behavior:
Requested change:
Unclear or unverified:
```

### 5. Specify The Amendment

Define:

- What changes.
- What stays the same.
- Acceptance criteria for the amendment.
- Regression criteria for existing behavior.
- Scope out.
- Security, accessibility, data, and operational safeguards.

### 6. Plan Small Operations

Create an implementation plan that separates:

- Baseline documentation.
- Regression test additions.
- Code changes.
- Migration or config changes.
- UI updates.
- Spec sync.

Avoid rewriting the feature unless the approved change requires it.

### 7. Create Test Plan

Include:

- Regression tests for current intended behavior.
- Tests for the requested change.
- Negative tests for permissions and validation.
- Accessibility tests for changed UI.
- Contract tests for changed APIs.
- Manual validation where automation is not practical.

### 8. Implement

Rules:

- Implement only the approved amendment.
- Preserve current intended behavior.
- Add tests before or with the behavior change.
- Stop and update specs if implementation reveals a different required design.
- Do not mix broad refactors with feature amendments.

### 9. Review And Sync

Use `review-checklist.md`.

Verify:

- Current behavior is documented.
- Requested change is implemented.
- Existing behavior did not regress.
- Tests cover old and new behavior.
- Specs match final implementation.

## Example Prompt: Amend Existing Feature

```text
Use AGENTS.md and ai-delivery-standards.

Task: Amend an existing feature that predates this workflow.

Existing feature: Saved searches
Requested change: Allow users to rename saved searches from the saved-search menu.
Known constraints:
- Do not change saved-search creation.
- Do not change saved-search sharing.
- Preserve existing API response shape unless the spec approves a change.

Required process:
1. Read AGENTS.md.
2. Read docs/ai-delivery.md and docs/architecture/overview.md.
3. Inspect current saved-search UI, API, data model, permissions, and tests.
4. Create docs/features/FEA-<ID>-saved-searches/ if missing.
5. Document current production behavior as the baseline.
6. Specify the rename amendment with acceptance criteria and scope out.
7. Create implementation-plan.md and test-plan.md.
8. Add regression tests for existing saved-search behavior.
9. Implement the rename change only.
10. Complete review-checklist.md and sync specs with final code.
```

## Example Prompt: Fix Existing Feature

```text
Use AGENTS.md and ai-delivery-standards.

Task: Fix an existing feature that predates this workflow.

Feature: Contract document upload
Bug: Uploading a PDF larger than the allowed limit shows a generic server error.
Expected behavior: The user sees a clear validation error before or during upload.
Observed behavior: The request fails and the UI shows "Something went wrong."

Required process:
1. Read AGENTS.md.
2. Inspect current upload UI, API, storage validation, and tests.
3. Create or update the feature artifact folder.
4. Document current intended upload behavior and the defect.
5. Create a test plan with a regression test for oversize PDFs.
6. Implement the smallest root-cause fix.
7. Verify accessibility of the error message.
8. Update review-checklist.md with validation evidence.
```

## Quality Gates

- [ ] Current production behavior is documented.
- [ ] Requested change is separate from baseline behavior.
- [ ] Scope out is explicit.
- [ ] Regression tests protect existing intended behavior.
- [ ] New tests cover the amendment or fix.
- [ ] No unrelated refactor is included.
- [ ] Specs match final implementation.
