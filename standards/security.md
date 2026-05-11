# Security Standards

Security-sensitive behavior must be specified, implemented, tested, and reviewed. AI agents must never assume security controls exist.

## Core Requirements

- Enforce authentication and authorization server-side.
- Validate input at every trust boundary.
- Encode or sanitize output based on context.
- Protect secrets and sensitive data.
- Log enough for investigation without leaking protected information.
- Use secure defaults.
- Test negative paths.

## Authentication

- Use established product authentication mechanisms.
- Do not create custom auth flows without an ADR.
- Do not trust client-provided user identity.
- Sessions and tokens must have expiry, revocation strategy, and secure storage.
- Authentication failures should be safe and consistent.

## Authorization

For every protected action define:

| Question | Required Answer |
| --- | --- |
| Who can perform this action? | Role, permission, policy, or ownership rule. |
| What resource is protected? | Entity, tenant, organization, file, record, or operation. |
| Where is it enforced? | API, service, policy, database, or all relevant layers. |
| How is it tested? | Allowed and denied cases. |

Authorization must be enforced close to the server-side action, not only in UI.

## Input Validation

Validate:

- Required fields
- Types and formats
- Lengths and numeric ranges
- Enums
- Identifiers and ownership
- File type, size, and content where uploads exist
- Dates and time zones
- Nested objects and arrays

Reject or safely normalize invalid input. Do not pass raw user input into SQL, shell commands, templates, logs, prompts, or model tools.

## Injection Risks

Defend against:

- SQL/NoSQL injection
- Command injection
- Cross-site scripting
- Template injection
- Server-side request forgery
- Path traversal
- Prompt injection for AI features

Use parameterized queries, safe APIs, escaping, allowlists, and strict tool boundaries.

## Secrets

- Never commit secrets.
- Never expose server secrets to client bundles.
- Never log secrets.
- Use secret management or environment injection.
- Rotate exposed credentials immediately.
- Provide fake credentials for local tests.

## Sensitive Data And Privacy

- Classify new data fields as public, internal, confidential, or regulated where relevant.
- Collect the minimum necessary data.
- Redact PII in logs and analytics unless explicitly approved.
- Avoid sending sensitive data to AI models unless the product's data policy allows it.
- Respect tenant isolation and data residency requirements.
- Include retention and deletion behavior where required.

## AI-Specific Security

AI features must include safeguards for:

- Prompt injection
- Data exfiltration
- Tool misuse
- Retrieval of unauthorized documents
- Hidden system prompt disclosure
- Cross-tenant context leakage
- Unsafe structured output parsing

Required controls:

- Scope retrieval by user permissions.
- Treat retrieved text as untrusted.
- Use explicit refusal rules.
- Validate model output against schema.
- Enforce server-side action permissions even when AI suggests or triggers actions.
- Log AI decisions safely for audit and debugging.

## Dependency Security

- Review new dependencies for license, maintenance, and advisories.
- Pin versions according to product practice.
- Do not introduce abandoned packages for critical paths.
- Run dependency scanning where available.

## Security Testing

Minimum tests for security-sensitive features:

- Unauthorized request is rejected.
- Authenticated but forbidden request is rejected.
- Cross-tenant access is rejected.
- Invalid input is rejected safely.
- Sensitive fields are redacted.
- AI prompt injection attempts fail for AI features.

## Security Review Gate

Before merge:

- [ ] Threats are documented in the spec or review checklist.
- [ ] Controls are implemented server-side.
- [ ] Negative tests exist.
- [ ] Logs and errors do not leak sensitive data.
- [ ] Dependencies and secrets are reviewed.

