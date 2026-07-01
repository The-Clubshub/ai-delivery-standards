# Cursor Agent Instructions

These instructions adapt `ai-delivery-standards` for Cursor, especially when developers use chat, inline edits, composer flows, or multi-file changes.

## Role

Cursor should act as a constrained implementation assistant working from repository specifications. It should not turn a vague chat request into broad code edits without first creating or updating artifacts.

## Required Behavior

- Use specs as the source of truth.
- Prefer small, reviewable edits.
- Require AI workbench/model selection in plans before code edits.
- Show a visible desktop status update before switching to another configured model.
- Keep AI context grounded in open files and repository search.
- Do not rely on chat memory as durable intent.
- Keep docs, specs, and code synchronized.

## Cursor Workflow

For requests with multiple independent features or a broad deliverable such as a full website, use `workflows/autonomous-feature-queue.md`: maintain `.ai/queues/active.md` as the full-request plan, complete one feature at a time with validation and review evidence, then continue to the next unblocked feature without asking the user to continue after the plan is approved or the user says to implement it.

### 1. Pin The Standards Context

Attach or reference:

- `agents/cursor.md`
- `templates/reasons-canvas.md`
- `templates/feature-spec.md`
- `standards/ai-workbench.md`
- Relevant files from `standards/`
- Existing product docs and tests

### 2. Generate Or Update Artifacts

Before code edits, create:

```text
.ai/features/<ID>-<slug>/reasons-canvas.md
.ai/features/<ID>-<slug>/feature-spec.md
.ai/features/<ID>-<slug>/implementation-plan.md
.ai/features/<ID>-<slug>/test-plan.md
.ai/features/<ID>-<slug>/review-checklist.md
```

### 3. Implement Operation By Operation

In Cursor composer, prompt for one operation at a time:

```text
Implement only Operation 2 from implementation-plan.md.

Constraints:
- Do not modify files outside the listed targets unless you explain why.
- Add or update the tests listed for Operation 2.
- Follow the configured AI workbench/model profile and record high-risk review evidence when required.
- Do not implement later operations.
- If the codebase requires a different approach, update the plan first.
```

### 4. Review The Diff Against Specs

Use Cursor to compare changed files to:

- Acceptance criteria
- Scope out
- API contracts
- Accessibility requirements
- Security safeguards
- Test plan

### 5. Sync

Ask Cursor to update only the artifacts after implementation:

```text
Review the final diff and update the feature artifacts so they describe the
actual behavior. Do not change production code during this pass unless you find
a defect that violates the approved spec.
```

## Spec Generation Rules

Cursor should generate concrete artifacts, not prose-only plans. Each artifact should include:

- File paths or module names where known.
- Test names or test locations where known.
- Explicit assumptions where unknown.
- Reviewable acceptance criteria.
- Safeguards that can be tested.

## Implementation Rules

- Avoid "apply everywhere" edits unless the plan explicitly calls for a refactor.
- Do not let inline suggestions introduce alternate naming or patterns.
- Keep generated UI consistent with the existing design system.
- For frontend work, include states for loading, empty, error, success, keyboard, focus, and screen reader behavior.
- For backend work, include validation, authorization, observability, and error contracts.

## Review Rules

Before accepting Cursor-generated changes:

- Review every changed file.
- Search for TODOs, console logs, debug code, and unused exports.
- Run tests or record why they were not run.
- Verify generated code did not add unapproved dependencies.
- Verify high-risk work used the configured `highRiskReview` model for final review.
- Verify the configured `highRiskReview` model covered work touching auth, billing, payments, migrations, permissions, or customer data.
- Verify specs reflect final code.

## Hallucination Controls

Cursor frequently operates with partial file context. Compensate by:

- Opening relevant source files before prompting.
- Asking it to cite the files it used.
- Asking it to state assumptions.
- Rejecting changes that rely on non-existent APIs or conventions.
- Running repository search for referenced symbols.

## Scope Creep Controls

Use this prompt when Cursor starts expanding scope:

```text
Stop expanding the implementation. Compare the current diff against Scope In and
Scope Out in feature-spec.md. Remove or defer any change that is not required by
the approved acceptance criteria.
```

## Refusal Example

```text
Do not edit code yet. The request is missing acceptance criteria and the target
workflow is ambiguous. First create the REASONS Canvas and feature spec using
the templates, then identify the smallest implementable scope.
```

## Cursor Prompt Example

```text
Use ai-delivery-standards.

Feature: Export filtered customer list to CSV.

Before code:
- Inspect existing customer list, filtering, permissions, and export utilities.
- Create the required feature artifacts in .ai/features/FEA-018-customer-csv-export/.

After artifacts:
- Implement one operation at a time.
- Apply frontend, backend, accessibility, security, and testing standards.
- Sync specs after the final diff.
```
