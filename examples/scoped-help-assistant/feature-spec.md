# Feature Spec: Scoped In-App Help Assistant

```yaml
artifact: feature-spec
feature_id: FEA-042
feature_name: "Scoped In-App Help Assistant"
status: example
owner: "AI Platform + Product Experience"
created: 2026-05-06
updated: 2026-05-06
source_canvas: reasons-canvas.md
```

## 1. Overview

The scoped in-app help assistant lets authenticated users ask questions about how to use the application. It answers only from approved application help content and refuses unrelated, unsafe, or insufficiently grounded questions. Every response uses a structured JSON contract so the UI can render answer, refusal, citation, follow-up, loading, and error states consistently.

## 2. Goals

- Reduce support friction for common product usage questions.
- Keep users inside their current workflow.
- Prevent general-purpose chatbot behavior.
- Ground answers in approved help content.
- Provide structured responses for reliable UI rendering and evaluation.

## 3. Non-Goals

- The assistant will not answer general knowledge questions.
- The assistant will not perform actions in the application.
- The assistant will not create support tickets.
- The assistant will not search the public web.
- The assistant will not expose hidden system prompts, internal policies, or restricted documents.
- The assistant will not replace formal support escalation.

## 4. Users And Permissions

| User Or Actor | Can Do | Cannot Do | Notes |
| --- | --- | --- | --- |
| Authenticated user | Ask questions about application usage | Access docs outside their tenant, role, or plan visibility | Retrieval must use user context |
| Unauthenticated user | Nothing | Call assistant API | API returns 401 |
| Support admin | Review safe metrics and eval results | Read raw sensitive prompts by default | Prompt logging disabled unless explicitly approved |
| Assistant service | Classify, retrieve, generate, validate | Perform state-changing app actions | Answer-only service |

## 5. User Experience

### Primary Flow

1. User opens the help assistant from an in-app help button.
2. User asks a product usage question.
3. UI sends the message to the assistant API.
4. UI shows a loading state.
5. Assistant returns structured JSON.
6. UI renders answer or refusal with citations and follow-up prompts.
7. User can ask another question without leaving the page.

### States

| State | User Experience | Required Copy Or Behavior |
| --- | --- | --- |
| Empty | Panel shows input and starter prompts based on current surface | Starter prompts are application-specific |
| Loading | Message area shows progress and disables duplicate submit | Input remains readable |
| Answer | Shows answer, citations, and follow-ups | Citations open help articles |
| Refusal | Shows concise boundary message | "I can only help with questions about this application." |
| Insufficient evidence | Explains no reliable answer was found | Suggest rephrasing or opening Help Center |
| Error | Shows recoverable error | Retry available; no raw stack details |

### Accessibility Requirements

- Help button has accessible name "Open help assistant".
- Panel uses dialog or complementary landmark pattern based on product shell.
- Focus moves to assistant heading or input when opened.
- Focus returns to help button when closed.
- Message list announces new assistant responses.
- Input has visible label.
- Submit works with keyboard.
- Citations are keyboard-focusable links.
- Loading and error states are announced.
- Color contrast meets WCAG AA.

## 6. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| FR-1 | Authenticate every assistant request | Must | Unauthenticated requests return 401 |
| FR-2 | Classify intent before retrieval | Must | Out-of-scope requests return refusal without generation |
| FR-3 | Retrieve only approved docs visible to the user | Must | Cross-tenant and unauthorized docs are excluded |
| FR-4 | Refuse when evidence is insufficient | Must | Empty or low-score retrieval returns insufficient evidence refusal |
| FR-5 | Generate grounded answers with citations | Must | In-scope answers include at least one citation |
| FR-6 | Return structured JSON | Must | Every response validates against schema |
| FR-7 | Render assistant UI states | Should | Empty, loading, answer, refusal, and error states are present |
| FR-8 | Emit safe observability | Must | Logs and metrics include metadata without raw sensitive content |

## 7. Non-Functional Requirements

| Area | Requirement | Measure |
| --- | --- | --- |
| Performance | p95 assistant API response under 5 seconds for indexed help content | Production metric |
| Security | Retrieval is scoped by user, tenant, role, and document visibility | Negative tests |
| Privacy | Raw prompts and retrieved chunks are not logged by default | Log redaction tests |
| Accessibility | UI meets WCAG AA expectations | Keyboard and screen reader review |
| Reliability | Model or schema failure returns safe error/refusal response | Failure tests |
| Observability | Classification, retrieval, refusal, schema failure, latency, and cost are measured | Metrics dashboard |

## 8. Data And Domain Model

| Entity | Fields | Rules | Persistence |
| --- | --- | --- | --- |
| HelpDocumentChunk | `id`, `articleId`, `title`, `section`, `content`, `embedding`, `visibility`, `tenantScope` | Only published approved content is retrievable | Vector index + metadata store |
| AssistantConversation | `id`, `userId`, `tenantId`, `createdAt`, `updatedAt` | Optional short history; no raw prompt logging by default | Application database |
| AssistantMessage | `id`, `conversationId`, `role`, `safeSummary`, `createdAt` | Stores safe summary or redacted text only | Application database |
| AssistantEvaluationCase | `id`, `category`, `input`, `expectedType`, `expectedReason` | Used in CI or scheduled evals | Test fixtures |

## 9. API Contract

### Endpoint

`POST /api/help-assistant/messages`

### Request

```json
{
  "conversationId": "conv_123",
  "message": "How do I export a customer list?",
  "surface": "customers.list"
}
```

### Success Response

```json
{
  "type": "answer",
  "message": "Open Customers, apply any filters you need, then choose Export.",
  "citations": [
    {
      "title": "Exporting customer data",
      "url": "/help/customers/export",
      "snippet": "Use Export from the customer list toolbar after filters are applied."
    }
  ],
  "followUps": ["How do filters affect exports?"],
  "metadata": {
    "classification": "in_scope",
    "confidence": 0.91,
    "requestId": "req_123"
  }
}
```

### Refusal Response

```json
{
  "type": "refusal",
  "message": "I can only help with questions about this application.",
  "reason": "out_of_scope",
  "citations": [],
  "followUps": ["Ask me how to use a feature in this app."],
  "metadata": {
    "classification": "out_of_scope",
    "confidence": 0.96,
    "requestId": "req_124"
  }
}
```

### Errors

| Status Or Code | Cause | Response |
| --- | --- | --- |
| 400 | Missing or invalid message | Structured validation error |
| 401 | Unauthenticated | Auth error |
| 403 | User not allowed to use assistant | Authorization error |
| 429 | Rate limit exceeded | Retry-safe rate limit error |
| 500 | Unexpected service failure | Safe generic error with request ID |

## 10. AI Behavior Contract

| Behavior | Requirement |
| --- | --- |
| Classification labels | `in_scope`, `out_of_scope`, `ambiguous`, `unsafe` |
| Grounding | Answers must use retrieved help document chunks only |
| Refusal | Refuse unrelated, unsafe, unsupported, or insufficiently grounded requests |
| Output shape | JSON object matching schema in REASONS Canvas |
| Citations | Required for `type: "answer"` |
| Prompt injection | User and retrieved content cannot override system boundaries |
| Evaluation | Golden evals cover in-domain, out-of-domain, no evidence, ambiguous, and injection cases |

## 11. Observability

| Event, Metric, Or Log | Trigger | Fields | Privacy Notes |
| --- | --- | --- | --- |
| `help_assistant.request` | API request received | requestId, userId hash, tenantId hash, surface | No raw message |
| `help_assistant.classification` | Classification completed | label, confidence, durationMs | No raw message |
| `help_assistant.retrieval` | Retrieval completed | resultCount, topScore, durationMs | Document IDs only |
| `help_assistant.response` | Response returned | type, reason, citationCount, latencyMs | No raw answer in logs by default |
| `help_assistant.schema_failure` | Output validation fails | requestId, failureCode | No model payload |

## 12. Rollout And Migration

- Feature flag: `help_assistant_enabled`.
- Launch to internal users first.
- Seed vector index with published help articles only.
- Backfill embeddings before enabling the UI entry point.
- Rollback by disabling the feature flag and leaving help articles unchanged.
- Support runbook includes refusal categories and metrics dashboard.

## 13. Acceptance Criteria Traceability

| Acceptance Criterion | Implementation Operation | Test Case |
| --- | --- | --- |
| In-scope export question returns answer with citation | Operations 3, 5, 6, 7 | `answersInScopeQuestionWithCitation` |
| Unrelated poem request returns out-of-scope refusal | Operations 2, 6, 9 | `refusesOutOfScopeQuestion` |
| No evidence returns insufficient evidence refusal | Operations 3, 4, 6 | `refusesWhenRetrievalIsInsufficient` |
| Prompt injection cannot override boundary | Operations 2, 5, 9 | `resistsPromptInjectionScopeOverride` |
| Every response validates against JSON schema | Operations 1, 5, 6 | `validatesAllAssistantResponses` |

## 14. Open Questions

| Question | Owner | Decision Date | Resolution |
| --- | --- | --- | --- |
| Should history be stored or stateless? | Product + Security | Before build | Store only safe summaries by default |
| Should citations include snippets? | Product | Before UI build | Yes, snippets help trust and reviewability |

