# Workflow: Start A New Project

Use this workflow when initializing a greenfield product or adding `ai-delivery-standards` V2 to a repository.

## Outcome

A product repository has:

- AI delivery standards installed or referenced.
- `.ai/` operating-system control plane.
- Root `AGENTS.md` bootloader.
- Initial project memory and quality gates.
- First feature lifecycle artifacts created before application implementation.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Legacy compatibility config | `.ai-delivery.json` |
| V2 config | `.ai/config.json` |
| Project state | `.ai/state.json` |
| Feature registry | `.ai/registry.json` |
| Project memory | `.ai/memory/` |
| Root agent instructions | `AGENTS.md` |
| Standards bundle | `.ai/ai-delivery-standards/` |
| AI delivery guide | `.ai/ai-delivery.md` |
| Architecture overview | `.ai/architecture/overview.md` |
| Architecture decisions | `.ai/decisions/` |
| First feature lifecycle | `.ai/features/FEA-001-initial-product-skeleton/` |

## Steps

### 1. Bootstrap With The CLI

Preferred command:

```bash
ai-delivery init . \
  --feature-id FEA-001 \
  --feature-name "Initial Product Skeleton"
```

To skip manual approval for every gate:

```bash
ai-delivery init . \
  --feature-id FEA-001 \
  --feature-name "Initial Product Skeleton" \
  --approval-policy not_required
```

To approve requirements once, then let planning, build, review, test, fixes, and completion run without more manual approval gates:

```bash
ai-delivery init . \
  --feature-id FEA-001 \
  --feature-name "Initial Product Skeleton" \
  --autonomous-after-requirements
```

To skip only requirements approval:

```bash
ai-delivery init . --requirements-approval not_required
```

For a product in another directory:

```bash
ai-delivery init ../my-product
```

This creates the standards bundle, V2 operating-system files, product docs, and first feature artifacts.

### 2. Establish Standards Version

Record:

- Standards version or commit SHA.
- Required agent instruction file.
- Product-specific overrides.
- Approval policy.

The CLI writes this to `.ai/config.json`.

### 3. Create Product AI Delivery Guide

Create `.ai/ai-delivery.md` with:

- Standards version.
- `.ai/` paths.
- Required lifecycle states.
- Agent behavior rules.
- Approval gates.
- Quality gates.

### 4. Define Initial Architecture

Create `.ai/architecture/overview.md` with:

- Product purpose.
- Users and actors.
- System context diagram.
- Tech stack.
- Major components.
- Data stores.
- External integrations.
- Security boundary.
- Observability baseline.

### 5. Define Project Memory

Populate:

- `.ai/memory/project.md`
- `.ai/memory/glossary.md`
- `.ai/memory/constraints.md`
- `.ai/memory/decisions.md`
- `.ai/memory/validation.md`

Agents must use these files instead of relying on chat history.

### 6. Define Baseline Quality Gates

Document commands in `.ai/memory/validation.md` for:

- Formatting
- Linting
- Type checking
- Unit tests
- Integration tests
- End-to-end tests
- Accessibility checks
- Security checks
- Build verification

If a command does not exist yet, record the gap instead of inventing one.

### 7. Create First Feature Lifecycle

Before writing production code, create:

```text
.ai/features/FEA-001-initial-product-skeleton/
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

CLI shortcut:

```bash
ai-delivery feature FEA-001 "Initial Product Skeleton"
```

### 8. Satisfy Requirements Gate

Do not plan until the requirements gate is satisfied. If `approvalPolicy.requirements` is `human_required`, approve with:

```text
/approve-requirements
```

If `approvalPolicy.requirements` is `not_required`, record `not_required` in `approval.md` and `state.json` and continue.

### 9. Satisfy Plan Gate

Do not scaffold application code until the plan gate is satisfied. If `approvalPolicy.plan` is `human_required`, approve with:

```text
/approve-plan
```

If `approvalPolicy.plan` is `not_required`, record `not_required` in `approval.md` and `state.json` and continue.

### 10. Build, Review, Test, Complete

Follow:

```text
/build
/ai-review
/test
/complete
```

`/complete` requires human implementation approval when `approvalPolicy.implementation` is `human_required`. If it is `not_required`, the Sync Agent may complete after review and test evidence are recorded.

## Quality Gates

- [ ] `.ai/config.json` exists.
- [ ] `.ai/registry.json` identifies the active feature.
- [ ] `.ai/features/FEA-001-initial-product-skeleton/state.json` exists.
- [ ] Requirements gate is satisfied before planning.
- [ ] Plan gate is satisfied before building.
- [ ] CI or validation commands are documented.
- [ ] Security and accessibility baselines are defined.
- [ ] Final specs match the created project skeleton.
