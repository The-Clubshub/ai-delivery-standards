# Workflow: Security Review

Use this workflow for features that touch authentication, authorization, sensitive data, external integrations, file handling, payments, admin capabilities, AI tools, or tenant boundaries.

## Outcome

Security risks are identified, mitigated, tested, and documented before release.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Feature spec security requirements | Feature folder `feature-spec.md` |
| Implementation plan security section | Feature folder `implementation-plan.md` |
| Test plan security cases | Feature folder `test-plan.md` |
| Review checklist security section | Feature folder `review-checklist.md` |
| ADR | Required for new security architecture or provider decisions |

## Steps

### 0. Verify Model Routing

Security-sensitive work must use GPT-5.5 for review. If implementation used GLM-5.2 anywhere in the security-sensitive diff, require GPT-5.5 review before merge.

### 1. Identify Assets And Actors

List:

- Users, roles, services, and external systems.
- Protected resources.
- Sensitive fields.
- Trust boundaries.
- Tenant or organization boundaries.

### 2. Identify Threats

Consider:

- Unauthorized access.
- Privilege escalation.
- Cross-tenant leakage.
- Injection.
- Secret exposure.
- Sensitive data in logs or analytics.
- Dependency compromise.
- Prompt injection or tool misuse for AI features.
- Replay, duplicate, or race conditions.

### 3. Map Controls

For each threat define:

- Prevention control.
- Detection signal.
- Test evidence.
- Residual risk.

### 4. Review Implementation

Check:

- Server-side auth and authorization.
- Input validation.
- Output encoding.
- Safe errors.
- Secret handling.
- Audit logging.
- Dependency changes.
- AI retrieval and tool boundaries.

### 5. Run Security Tests

Minimum tests:

- Unauthenticated request.
- Forbidden request.
- Cross-tenant request.
- Invalid input.
- Sensitive log redaction.
- Prompt injection for AI features.

### 6. Update Artifacts

Update:

- Security requirements in feature spec.
- Security implementation notes.
- Test plan results.
- Review checklist.
- ADR if the decision affects future work.

## Example Prompt

```text
Run a security review under ai-delivery-standards.

Scope:
- <feature/files/endpoints>

Use:
- standards/security.md
- standards/api-design.md
- standards/observability.md
- feature-spec.md
- implementation-plan.md
- test-plan.md

Identify threats, verify controls, add missing negative tests where feasible, and
update the review checklist with validation evidence and residual risk.
```

## Quality Gates

- [ ] Assets, actors, and trust boundaries are documented.
- [ ] GPT-5.5 reviewed the security-sensitive work.
- [ ] Authorization is server-side and tested.
- [ ] Input validation and safe errors are implemented.
- [ ] Sensitive data is redacted.
- [ ] AI-specific security controls exist where relevant.
- [ ] Residual risks are accepted or tracked.
