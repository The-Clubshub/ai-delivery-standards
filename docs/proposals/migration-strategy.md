# Migration Strategy

Status: Proposal

This proposal defines how existing projects can migrate from V1 to V2 with minimal disruption, backward compatibility, and phased adoption.

## Objective

Existing projects should be able to adopt the V2 operating system without stopping delivery or rewriting historical feature docs. Migration should:

- Preserve V1 artifacts.
- Add `.ai/` as the new runtime control plane.
- Keep `AGENTS.md` as the root bootloader.
- Enforce V2 gates for new work first.
- Gradually migrate active and historical work.

## V1 Audit Summary

Current install output creates:

```text
product-repo/
  ai-delivery-standards/
  .ai-delivery.json
  AGENTS.md
  docs/
    ai-delivery.md
    architecture/
      overview.md
    features/
      FEA-001-initial-product-skeleton/
        reasons-canvas.md
        feature-spec.md
        implementation-plan.md
        test-plan.md
        review-checklist.md
```

This is a strong starting point. V2 should avoid breaking it. The main migration is to add:

```text
.ai/
  config.json
  registry.json
  state.json
  memory/
  features/
```

and map V1 feature artifacts into V2 lifecycle artifacts.

## Migration Principles

1. Add before replacing.
   Introduce `.ai/` without deleting `docs/features`.

2. New work follows V2 first.
   Existing historical work can be migrated opportunistically.

3. Active work gets priority.
   Migrate in-progress features before archived features.

4. Approval history is not invented.
   If V1 lacks explicit approval, V2 records approval as pending or legacy-accepted, depending on project policy.

5. Backward compatibility remains visible.
   Keep V1 paths readable and documented during transition.

6. Tooling can lag policy.
   Agents can follow V2 manually before CLI enforcement exists.

## Migration Phases

### Phase 0: Inventory

Goal:

Understand the current project state without changing behavior.

Actions:

- Read existing `AGENTS.md`.
- Read `.ai-delivery.json`.
- List `docs/features`, `docs/bugs`, `docs/refactors`, and `docs/decisions`.
- Identify active work.
- Identify whether approvals are recorded anywhere.
- Identify validation commands.

Output:

- Migration notes.
- List of active features to migrate first.
- Known gaps.

### Phase 1: Install V2 Control Plane

Goal:

Add `.ai/` while preserving V1 docs.

Add:

```text
.ai/
  config.json
  registry.json
  state.json
  memory/
    project.md
    glossary.md
    constraints.md
    decisions.md
    validation.md
```

Update:

- `AGENTS.md` to reference `.ai/config.json` and state machine.
- `docs/ai-delivery.md` to explain V2 paths.

Do not delete:

- `.ai-delivery.json`
- `docs/features/*`
- Existing V1 artifact files.

### Phase 2: Migrate Active Features

Goal:

Convert active V1 feature folders to V2 feature folders.

For each active V1 feature:

```text
docs/features/FEA-001-example/
  reasons-canvas.md
  feature-spec.md
  implementation-plan.md
  test-plan.md
  review-checklist.md
```

Create:

```text
.ai/features/FEA-001/
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

Mapping:

| V1 | V2 |
| --- | --- |
| `reasons-canvas.md` | `requirements.md` |
| `feature-spec.md` | `requirements.md` |
| `implementation-plan.md` | `plan.md` |
| `test-plan.md` | `tests.md` |
| `review-checklist.md` | `review.md` |
| Existing approval notes | `approval.md` |

State inference:

| V1 Evidence | V2 Starting State |
| --- | --- |
| Only idea or empty artifacts | `intake` or `requirements_draft` |
| Requirements drafted but no explicit approval | `requirements_pending_review` |
| Requirements explicitly approved, no plan | `requirements_approved` |
| Plan drafted but no explicit approval | `plan_pending_review` |
| Plan explicitly approved, no code started | `plan_approved` |
| Code in progress | `building` if plan approved; otherwise `blocked` |
| Review checklist in progress | `reviewing` |
| Test plan has validation evidence | `testing` or `ready_for_human_review` |
| Completed and accepted by human | `complete` |
| Missing required decisions | `blocked` |

If approval cannot be proven, default to the nearest pending review state.

### Phase 3: Enforce V2 For New Work

Goal:

All new features use `.ai/features/<ID>/` as canonical lifecycle state.

Rules:

- `/start-feature` creates V2 artifacts.
- Builder Agents refuse to build without V2 approvals.
- Planner Agents refuse to plan without requirements approval.
- `docs/features` becomes a mirror or human summary, not the source of truth.

This phase delivers most of the governance benefit with low disruption.

### Phase 4: Migrate Supporting Work Types

Goal:

Extend V2 structure beyond features.

Migrate:

- Bugs from `docs/bugs/*` to `.ai/bugs/*` or `.ai/features/BUG-*`.
- Refactors from `docs/refactors/*`.
- Architecture decisions into `.ai/memory/decisions.md` plus `docs/decisions/ADR-*`.
- Feature queues into `.ai/queues/active.md`.

Recommended approach:

- Keep ADRs under `docs/decisions/` because they are long-lived human architecture docs.
- Reference ADRs from `.ai/features/<ID>/requirements.md` and `plan.md`.

### Phase 5: Add Tooling And Checks

Goal:

Turn policy into stronger automation after teams are already following it manually.

Future checks may include:

- Validate `.ai/config.json`.
- Validate feature `state.json`.
- Check required artifacts exist.
- Check approval gates before build.
- Check complete features have review and test evidence.
- Check `docs/features` mirrors are current when enabled.

This phase should not block early adoption.

### Phase 6: Deprecate V1 Canonical Paths

Goal:

Make `.ai/` the only canonical lifecycle root for new work.

Allowed after:

- All active work uses `.ai/`.
- Agents and humans are trained on V2 commands.
- The project has a policy for legacy docs.

Legacy options:

- Keep `docs/features` as generated summaries.
- Archive old V1 folders.
- Leave old folders untouched but mark them legacy.

## Backward Compatibility Matrix

| V1 Concept | V2 Equivalent | Compatibility Strategy |
| --- | --- | --- |
| `.ai-delivery.json` | `.ai/config.json` | Keep both during migration; V2 reads `.ai/config.json`. |
| `AGENTS.md` | `AGENTS.md` V2 | Update in place, preserving product-specific rules. |
| `docs/features` | `.ai/features` | Mirror or migrate active features first. |
| `reasons-canvas.md` | `requirements.md` | Merge content. |
| `feature-spec.md` | `requirements.md` | Merge content. |
| `implementation-plan.md` | `plan.md` | Rename and normalize. |
| `test-plan.md` | `tests.md` | Rename and normalize. |
| `review-checklist.md` | `review.md` | Rename and normalize. |
| Inline approvals | `approval.md` | Extract explicit approvals only. |
| Status front matter | `state.json` | Infer cautiously. |
| Agent adapter files | Role definitions plus adapters | Keep adapters, add universal role model. |

## Migration Of Approvals

Approval migration must be conservative.

| Existing Evidence | V2 Approval Status |
| --- | --- |
| Explicit human approval in PR, issue, ticket, or chat | `approved` with source reference. |
| Merged PR but no explicit approval | `legacy_accepted` only if project chooses to allow it; otherwise `pending`. |
| Agent said artifacts are complete | `pending`. |
| Tests passed | `pending`. |
| No evidence | `pending`. |

`legacy_accepted` is useful for historical completed work, but should not be allowed for new V2 work.

## Minimal Disruption Path

For a product currently using V1:

1. Add `.ai/config.json`.
2. Add `.ai/registry.json`.
3. Add `.ai/memory/project.md` and `.ai/memory/validation.md`.
4. Update `AGENTS.md` to require `.ai/` state checks.
5. Migrate only the current active feature.
6. Require V2 for all new features.
7. Migrate historical folders only when touched.

This allows a team to adopt the V2 operating model in one small PR.

## Greenfield Adoption

New projects should start directly with:

```text
AGENTS.md
.ai/
ai-delivery-standards/
docs/ai-delivery.md
docs/architecture/overview.md
```

The first feature starts at:

```text
.ai/features/FEA-001/
```

No V1 `docs/features` folder is required unless the team wants human-facing mirrors.

## Migration Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Agents keep using V1 paths | Update `AGENTS.md` boot sequence and make `.ai/` authoritative. |
| Approval history is ambiguous | Default to pending; never invent approval. |
| Hidden `.ai/` folder is ignored by humans | Keep `docs/ai-delivery.md` and optional `docs/features` mirrors. |
| Active work is disrupted | Migrate active feature only and preserve V1 artifacts. |
| Tooling lags behind policy | Let agents follow command semantics manually. |
| Duplicate sources of truth drift | Declare `.ai/features` authoritative and `docs/features` mirror-only. |

## Success Criteria

Migration succeeds when:

- Existing V1 projects can adopt `.ai/` without deleting current docs.
- New work follows V2 state and approval gates.
- Agents can identify current state from `.ai/features/<ID>/state.json`.
- Builder Agents refuse to build without migrated or newly recorded approvals.
- Historical artifacts remain accessible.
- Teams can migrate feature-by-feature rather than all at once.

