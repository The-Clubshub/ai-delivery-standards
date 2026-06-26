# Workflow: Refactor

Use this workflow for structural code improvements that should not change externally observable behavior.

## Outcome

The code structure improves while behavior remains stable and specs stay accurate.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Refactor plan | `.ai/refactors/<REF-ID>-<slug>/implementation-plan.md` |
| Test plan | `.ai/refactors/<REF-ID>-<slug>/test-plan.md` |
| ADR | Required if architecture boundaries or shared patterns change |
| Updated feature specs | Required when refactor changes documented structure or contracts |

## Steps

### 1. Define Refactor Intent

Clarify:

- What code is hard to change?
- What risk or duplication exists?
- What behavior must remain unchanged?
- What future work this enables.
- What is explicitly out of scope.

### 2. Establish Safety Net

Before refactoring:

- Identify existing tests.
- Add characterization tests if behavior is under-tested.
- Capture API snapshots, UI screenshots, or contract examples where useful.

### 3. Create Plan

Use `templates/implementation-plan.md`.

Operations should be mechanical and reversible where possible:

- Extract function.
- Move module.
- Rename domain concept.
- Introduce interface.
- Replace dependency.
- Delete dead path.

Every operation must declare `ai_provider`. GLM-5.2 may perform mechanical refactors, but GPT-5.5 must handle final architecture decisions and review any refactor touching auth, billing, payments, migrations, permissions, database schema, or customer data.

### 4. Refactor In Small Steps

For each operation:

1. Run baseline tests.
2. Make one structural change.
3. Run focused tests.
4. Commit or checkpoint if using git.
5. Continue only when behavior remains stable.

### 5. Validate Behavior

Run:

- Existing tests for affected area.
- Contract tests.
- End-to-end smoke tests for critical flows.
- Performance check if hot paths changed.

### 6. Sync Specs

Update docs when:

- Component boundaries changed.
- File/module names changed.
- API contracts changed.
- Domain language changed.
- Architecture decisions changed.

## Example Prompt

```text
Refactor this area under .ai/ai-delivery-standards.

Area: <module/component/service>
Problem: <why refactor is needed>
Behavior constraints:
- No externally observable behavior changes.

Process:
1. Inspect existing tests and behavior.
2. Create .ai/refactors/<REF-ID>-<slug>/implementation-plan.md and test-plan.md.
3. Add characterization tests if needed.
4. Refactor in small operations.
5. Run validation after each operation.
6. Sync affected specs and ADRs.
```

## Quality Gates

- [ ] Refactor intent is documented.
- [ ] Behavior-preserving boundary is explicit.
- [ ] Safety tests exist.
- [ ] AI model routing is declared and premium-review triggers are satisfied.
- [ ] No unapproved feature behavior changed.
- [ ] Specs and ADRs reflect final structure.
