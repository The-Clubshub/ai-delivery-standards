# Observability Standards

Every production feature should be diagnosable without reading code or reproducing locally.

## Required Signals

| Signal | Use |
| --- | --- |
| Logs | Explain discrete events, decisions, and failures. |
| Metrics | Quantify rate, latency, errors, saturation, and business counters. |
| Traces | Connect work across services, jobs, databases, and external calls. |
| Audit events | Record security or compliance-relevant actions. |

## Logging

Logs should include:

- Event name
- Correlation or request ID
- Actor or service identity where safe
- Resource identifiers where safe
- Outcome
- Error code or class
- Duration for expensive operations

Logs must not include:

- Secrets
- Access tokens
- Passwords
- Raw payment data
- Sensitive PII unless explicitly approved and protected
- Full AI prompts or retrieved documents when they may contain sensitive data

## Log Levels

| Level | Use |
| --- | --- |
| Debug | Local or temporary diagnostic detail, normally disabled in production. |
| Info | Important successful business or system events. |
| Warn | Recoverable unexpected behavior requiring attention. |
| Error | Failed operation requiring investigation or alerting. |

## Metrics

For new service behavior, consider:

- Request count
- Success count
- Failure count by reason
- Latency percentiles
- External dependency latency and errors
- Queue depth and processing duration
- Domain counters such as invites sent, exports completed, refusals returned

## Tracing

Use traces for:

- Cross-service request flows.
- Background jobs.
- External API calls.
- AI retrieval and generation pipelines.
- Slow database operations.

Trace spans should identify the operation without exposing sensitive payloads.

## Audit Events

Add audit events for:

- Permission changes.
- Data export.
- Administrative actions.
- Security settings changes.
- AI actions that change state or access sensitive context.

Audit events should include actor, action, resource, timestamp, outcome, and safe context.

## AI Observability

AI features should record:

- Intent classification result.
- Retrieval document IDs or safe references.
- Refusal reason.
- Output schema validation failures.
- Model/provider latency.
- Token usage or cost where available.
- Safety filter outcomes.

Do not log hidden prompts, secrets, or full sensitive retrieval context.

## Alerts And Dashboards

Add or update alerts when the feature introduces:

- New critical path dependency.
- New background processing.
- New revenue, security, compliance, or customer-facing risk.
- New AI refusal or hallucination risk requiring monitoring.

## Done Means

- Operators can identify whether the feature is working.
- Failures can be correlated across layers.
- Sensitive data is redacted.
- Metrics support SLOs or practical support investigation.

