# Workflow: Release Process

Use this workflow when preparing a feature, bug fix, or batch of changes for release.

## Outcome

The release is traceable to specs, validated, observable, and reversible.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Completed feature or bug artifacts | `.ai/features/` or `.ai/bugs/` |
| Review checklist | Each release item |
| Release notes | Product-specific release location |
| Runbook updates | Product-specific operations docs |
| ADR updates | `.ai/decisions/`, if decisions changed |

## Steps

### 1. Confirm Release Scope

List:

- Features.
- Bug fixes.
- Refactors.
- Migrations.
- Flags.
- Operational changes.
- Known exclusions.

### 2. Verify Artifacts

For each release item:

- Required specs exist.
- Review checklist is complete.
- Test plan has validation evidence.
- Specs match final code.
- Follow-up gaps are tracked.

### 3. Run Validation

Run product-specific:

- Formatting.
- Linting.
- Type checking.
- Unit tests.
- Integration tests.
- End-to-end tests.
- Accessibility checks.
- Security checks.
- Build.
- Smoke tests.

### 4. Check Operational Readiness

Confirm:

- Logs, metrics, traces, and dashboards exist.
- Alerts are updated.
- Runbooks are updated.
- Feature flags are configured.
- Rollback steps are understood.
- Support teams have user-facing notes if needed.

### 5. Check Data And Migration Readiness

For migrations:

- Migration was tested.
- Runtime and lock risk are understood.
- Rollback or mitigation exists.
- Backfill behavior is monitored.
- Compatibility during deployment is addressed.

### 6. Prepare Release Notes

Include:

- User-visible changes.
- Breaking changes.
- Migration notes.
- Known limitations.
- Support guidance.

### 7. Release And Monitor

During rollout:

- Monitor error rates, latency, saturation, and domain metrics.
- Watch logs for new failures.
- Confirm expected adoption or event signals.
- Pause or roll back if guardrails are breached.

### 8. Post-Release Sync

After release:

- Update specs with any release-time changes.
- Record incidents or unexpected behavior.
- Promote reusable patterns to standards or examples.
- Close or create follow-up tickets.

## Example Prompt

```text
Prepare this change for release under .ai/ai-delivery-standards.

Release scope:
- <features/bugs/PRs>

Process:
1. Verify all required artifacts are complete.
2. Run or list required validation checks.
3. Check release, rollback, migration, and monitoring readiness.
4. Draft release notes.
5. Update specs if release preparation changes behavior or operations.
```

## Quality Gates

- [ ] Release scope is explicit.
- [ ] Artifacts are complete.
- [ ] Tests and checks pass or risks are accepted.
- [ ] Rollback and monitoring are ready.
- [ ] Release notes are clear.
- [ ] Post-release sync is planned.
