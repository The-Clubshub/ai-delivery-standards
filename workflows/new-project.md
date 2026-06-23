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
| Standards bundle | `ai-delivery-standards/` |
| AI delivery guide | `docs/ai-delivery.md` |
| Architecture overview | `docs/architecture/overview.md` |
| First feature lifecycle | `docs/features/FEA-001/` |

## Steps

### 1. Bootstrap With The CLI

Preferred command:

```bash
ai-delivery init . \
  --feature-id FEA-001 \
  --feature-name "Initial Product Skeleton"
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

Create `docs/ai-delivery.md` with:

- Standards version.
- `.ai/` paths.
- Required lifecycle states.
- Agent behavior rules.
- Approval gates.
- Quality gates.

### 4. Define Initial Architecture

Create `docs/architecture/overview.md` with:

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
docs/features/FEA-001/
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

### 8. Approve Requirements

Do not plan until requirements are approved:

```text
/approve-requirements
```

### 9. Approve Plan

Do not scaffold application code until the plan is approved:

```text
/approve-plan
```

### 10. Build, Review, Test, Complete

Follow:

```text
/build
/review
/test
/complete
```

`/complete` requires human implementation approval.

## Quality Gates

- [ ] `.ai/config.json` exists.
- [ ] `.ai/registry.json` identifies the active feature.
- [ ] `docs/features/FEA-001/state.json` exists.
- [ ] Requirements approval exists before planning.
- [ ] Plan approval exists before building.
- [ ] CI or validation commands are documented.
- [ ] Security and accessibility baselines are defined.
- [ ] Final specs match the created project skeleton.
