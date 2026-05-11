# Implementation Plan: Scoped In-App Help Assistant

```yaml
artifact: implementation-plan
feature_id: FEA-042
feature_name: "Scoped In-App Help Assistant"
status: example
owner: "AI Platform + Product Experience"
created: 2026-05-06
updated: 2026-05-06
source_canvas: reasons-canvas.md
source_spec: feature-spec.md
```

## Implementation Rules

- Implement only the assistant behavior defined in `feature-spec.md`.
- Do not add general chat, web search, ticket creation, or action execution.
- Keep the classifier, retriever, generator, and validator separately testable.
- Enforce all safeguards server-side.
- Sync specs before merge if contracts or behavior change.

## Preconditions

- [ ] Published help articles are identified.
- [ ] Vector index or search provider is available.
- [ ] Authentication and tenant context helpers exist.
- [ ] JSON schema validation library is approved.
- [ ] AI model provider and timeout settings are approved.
- [ ] Feature flag service is available.

## Operation Plan

| Step | Status | Operation | Files Or Modules | Tests | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Not started | Define response schema and validation helper | `assistant/schema` | Schema unit tests | Must validate answer, refusal, clarification |
| 2 | Not started | Implement intent classifier interface | `assistant/classifier` | Classifier unit and eval tests | Labels: in_scope, out_of_scope, ambiguous, unsafe |
| 3 | Not started | Implement permission-scoped retriever | `assistant/retriever` | Integration tests with tenant fixtures | Filter by published status and visibility |
| 4 | Not started | Implement evidence gate | `assistant/evidenceGate` | Low-score and empty evidence tests | Refuse below threshold |
| 5 | Not started | Implement grounded generator | `assistant/generator` | Grounding, citation, invalid JSON tests | Use retrieved chunks only |
| 6 | Not started | Add assistant API endpoint | `POST /api/help-assistant/messages` | API contract and auth tests | Rate limited |
| 7 | Not started | Add help assistant UI panel | `HelpAssistantPanel` | Component and accessibility tests | Feature flag protected |
| 8 | Not started | Add observability | logging, metrics, tracing helpers | Redaction and metric tests | No raw prompt logs |
| 9 | Not started | Add AI evaluation suite | `evals/help-assistant` | Golden eval command | Run in CI or scheduled job |

## Detailed Operations

### Operation 1: Response Schema

**Purpose:** Guarantee every response can be rendered and evaluated safely.

**Inputs:**

- JSON schema from `reasons-canvas.md`.
- Product error handling conventions.

**Expected Output:**

- `AssistantResponse` type.
- Runtime schema validator.
- Safe fallback response for validation failure.

**Validation:**

- Valid answer passes.
- Valid refusal passes.
- Missing `type` fails.
- Answer without citation fails.
- Unknown `reason` fails.

**Rollback:** Remove helper and endpoint dependency before enabling feature flag.

### Operation 2: Intent Classifier

**Purpose:** Prevent unrelated questions from reaching retrieval and generation.

**Inputs:**

- User message.
- Current application surface.
- Optional safe conversation summary.

**Expected Output:**

```json
{
  "label": "in_scope",
  "confidence": 0.91,
  "reason": "Question asks how to use the customer export feature."
}
```

**Validation:**

- Application usage questions classify as `in_scope`.
- General knowledge questions classify as `out_of_scope`.
- Prompt injection classifies as `unsafe` or preserves the real underlying scope.
- Ambiguous pronouns or missing context classify as `ambiguous`.

**Rollback:** Disable feature flag; no schema or data migration required.

### Operation 3: Permission-Scoped Retriever

**Purpose:** Retrieve only help content the user is allowed to see.

**Inputs:**

- Tenant ID.
- User role or permissions.
- Surface.
- Question text.

**Expected Output:**

- Ranked `RetrievedEvidence[]` with safe citations.

**Validation:**

- Unpublished documents are excluded.
- Other-tenant documents are excluded.
- Role-restricted documents are excluded for unauthorized users.
- Top score and document IDs are logged safely.

**Rollback:** Disable feature flag; keep index intact.

### Operation 4: Evidence Gate

**Purpose:** Refuse instead of guessing when evidence is weak.

**Inputs:**

- Ranked evidence.
- Threshold configuration.

**Expected Output:**

- `sufficient` decision with evidence, or `insufficient_evidence` refusal.

**Validation:**

- Empty evidence refuses.
- Top score below threshold refuses.
- Sufficient evidence passes through.

**Rollback:** Adjust threshold config or disable flag.

### Operation 5: Grounded Generator

**Purpose:** Generate a concise answer using only retrieved help content.

**Inputs:**

- User question.
- Retrieved evidence snippets.
- Response schema.

**Expected Output:**

- Valid `AssistantResponse`.

**Validation:**

- Answer includes citation from evidence.
- Answer does not introduce unsupported steps.
- Invalid JSON triggers repair retry or safe model error refusal.
- Prompt injection in retrieved docs is ignored.

**Rollback:** Disable generation path with feature flag.

### Operation 6: API Endpoint

**Purpose:** Expose the assistant pipeline to authenticated UI clients.

**Inputs:**

- `conversationId`
- `message`
- `surface`

**Expected Output:**

- Structured assistant response.

**Validation:**

- 401 unauthenticated.
- 403 unauthorized feature access.
- 400 invalid message.
- 429 rate limit.
- 200 answer/refusal response.

**Rollback:** Disable route with feature flag or remove UI entry point.

### Operation 7: UI Panel

**Purpose:** Provide an accessible in-app assistant surface.

**Inputs:**

- User opens help assistant.
- User submits message.
- API response.

**Expected Output:**

- Panel with empty, loading, answer, refusal, error, and citation states.

**Validation:**

- Keyboard open, submit, close.
- Focus moves into panel and returns on close.
- New response is announced.
- Citations are links.
- Responsive layout works.

**Rollback:** Disable feature flag.

### Operation 8: Observability

**Purpose:** Make behavior diagnosable without exposing sensitive content.

**Signals:**

- Request count.
- Classification label and confidence.
- Retrieval result count and top score.
- Refusal reason.
- Schema failure count.
- Latency and provider cost.

**Validation:**

- Redaction tests prove raw prompt and full chunks are not logged.
- Metrics are emitted for answer and refusal.

**Rollback:** Disable new dashboard or remove emitted feature metrics.

### Operation 9: Evaluation Suite

**Purpose:** Protect AI behavior over time.

**Cases:**

- In-scope product question.
- Out-of-scope creative writing question.
- Insufficient evidence question.
- Ambiguous question.
- Prompt injection.
- Cross-tenant retrieval attempt.
- Invalid JSON model response.

**Validation:**

- Eval suite passes required thresholds.
- Failures include category and fixture name.

**Rollback:** Evals can be non-blocking during initial calibration, but production release requires tracked acceptance.

## Configuration And Flags

| Config Or Flag | Default | Environment | Purpose |
| --- | --- | --- | --- |
| `help_assistant_enabled` | `false` | all | Controls UI and API availability |
| `HELP_ASSISTANT_RETRIEVAL_THRESHOLD` | `0.78` | server | Minimum relevance score |
| `HELP_ASSISTANT_MAX_CHUNKS` | `5` | server | Limits context size |
| `HELP_ASSISTANT_TIMEOUT_MS` | `5000` | server | Bounds provider latency |
| `HELP_ASSISTANT_LOG_PROMPTS` | `false` | server | Must remain false unless privacy-approved |

## Security And Privacy Implementation

- Authentication: required for API endpoint.
- Authorization: feature access and document retrieval scoped to user context.
- Input validation: message length, required fields, surface enum.
- Output validation: JSON schema before response.
- Secrets: model provider keys server-side only.
- PII: raw prompts not logged by default.
- Audit: admin-level config changes are audit logged if settings are exposed later.

## Accessibility Implementation

- Use semantic button for launcher.
- Use accessible dialog or complementary panel pattern.
- Trap focus only if implemented as modal.
- Announce assistant responses through a polite live region.
- Ensure visible focus states.
- Ensure citation links have clear names.

## Completion Checklist

- [ ] Operations complete or explicitly deferred.
- [ ] Tests and evals added.
- [ ] Validation commands pass.
- [ ] Review checklist completed.
- [ ] Specs synchronized with final implementation.

