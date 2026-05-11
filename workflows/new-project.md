# Workflow: Start A New Project

Use this workflow when initializing a greenfield product or adding `ai-delivery-standards` to a newly created repository.

## Outcome

A new product repository has:

- AI delivery standards installed or referenced.
- Initial architecture and quality gates documented.
- First feature artifacts created before application implementation.
- CI and review expectations defined.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Product config | `.ai-delivery.json` |
| Root agent instructions | `AGENT.md` |
| Standards bundle | `ai-delivery-standards/` |
| AI delivery guide | `docs/ai-delivery.md` |
| Architecture overview | `docs/architecture/overview.md` |
| First feature REASONS Canvas | `docs/features/FEA-001-<slug>/reasons-canvas.md` |
| First feature spec | `docs/features/FEA-001-<slug>/feature-spec.md` |
| First implementation plan | `docs/features/FEA-001-<slug>/implementation-plan.md` |
| First test plan | `docs/features/FEA-001-<slug>/test-plan.md` |
| First review checklist | `docs/features/FEA-001-<slug>/review-checklist.md` |

## Steps

### 1. Bootstrap With The CLI

Preferred command:

```bash
ai-delivery \
  --feature-id FEA-001 \
  --feature-name "Initial Product Skeleton"
```

For a product in another directory:

```bash
ai-delivery init ../my-product
```

This creates the standards bundle, product config, baseline docs, and first feature artifacts.

### 2. Establish Standards Version

Choose whether to copy this repository into the product or reference a central version.

Record:

- Standards version or commit SHA.
- Required agent instruction file.
- Product-specific overrides.

### 3. Create Product AI Delivery Guide

Create `docs/ai-delivery.md` with:

- Standards version.
- Required artifacts.
- Agent behavior rules.
- Branch and PR naming conventions.
- Quality gates.
- How specs stay synchronized with code.

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

### 5. Define Baseline Quality Gates

Document commands for:

- Formatting
- Linting
- Type checking
- Unit tests
- Integration tests
- End-to-end tests
- Accessibility checks
- Security checks
- Build verification

If a command does not exist yet, create a follow-up task with owner and target date.

### 6. Create First Feature Artifacts

Before writing production code, create the first feature folder:

```text
docs/features/FEA-001-initial-product-skeleton/
```

Use the templates:

- `templates/reasons-canvas.md`
- `templates/feature-spec.md`
- `templates/implementation-plan.md`
- `templates/test-plan.md`
- `templates/review-checklist.md`

CLI alternative:

```bash
ai-delivery feature FEA-001 "Initial Product Skeleton"
```

### 7. Review Specification

Review:

- Scope is clear.
- Acceptance criteria are testable.
- Architecture boundary is plausible.
- Security and accessibility requirements are explicit.
- Implementation operations are small.
- Test plan maps to acceptance criteria.

### 8. Implement Project Skeleton

Only after spec review:

- Scaffold application.
- Add baseline tests.
- Add CI commands.
- Add health check or smoke test.
- Add minimal deployment configuration if in scope.

### 9. Sync And Commit

Update artifacts with final decisions and commands.

Resync standards after framework updates:

```bash
ai-delivery sync .
ai-delivery doctor .
```

Commit sequence:

```text
docs(FEA-001): add project delivery standards and initial specs
feat(FEA-001): scaffold product skeleton
test(FEA-001): add baseline validation
docs(FEA-001): sync implementation details
```

## Example Prompt

```text
Initialize this repository using ai-delivery-standards.

Product:
<name and short description>

Constraints:
- <tech stack>
- <deployment target>
- <security/compliance expectations>

Required:
1. Create docs/ai-delivery.md.
2. Create docs/architecture/overview.md.
3. Create docs/features/FEA-001-initial-product-skeleton/ with all required artifacts.
4. Do not scaffold production application code until the artifacts are complete.
5. After implementation, sync the specs with final commands, structure, and known gaps.
```

## Quality Gates

- [ ] Standards version recorded.
- [ ] Required artifacts exist.
- [ ] First feature has acceptance criteria.
- [ ] CI or validation commands are documented.
- [ ] Security and accessibility baselines are defined.
- [ ] Specs are committed before implementation.
- [ ] Final specs match the created project skeleton.
