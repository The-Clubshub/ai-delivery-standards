# AI Model Routing Standard

This standard defines how AI providers and models are selected for delivery work. It applies to every job, feature step, loop task, review pass, and generated implementation plan unless a product repository defines a stricter local routing policy.

## Principles

- Declare the provider and model before work starts.
- Use the strongest available reasoning model for decisions that are expensive to reverse.
- Use cost-effective implementation models for bounded, lower-risk code generation.
- Route security, auth, billing, payments, permissions, customer data, database, and migration work to premium review.
- Treat model routing as delivery evidence, not an optional note.

## Required Field

Every delivery step or job must include an `ai_provider` field:

```yaml
ai_provider:
  provider: openai | zai | anthropic | other
  model: gpt-5.5 | glm-5.2 | other
  reason: short explanation
  fallback_model: optional backup model
  requires_premium_review: true | false
  execution:
    runner: codex | claude | cursor | other
    provider: optional runtime provider id
    model: optional runtime model id
    profile: optional runner profile
```

`provider`, `model`, `reason`, and `requires_premium_review` are required. `fallback_model` is optional but should be present when delivery can continue with a different model after provider outage, rate limit, or budget exhaustion.

Use `other` only when the concrete provider or model is named in `reason` and the step still satisfies the risk rules in this standard.

`execution` is optional and maps the standard routing decision to a concrete runner command. Use it when the delivery runner needs a provider-specific model slug, profile, or command target. For example, a semantic Z.ai route can execute through Codex using an OpenRouter profile:

```yaml
ai_provider:
  provider: zai
  model: glm-5.2
  reason: cost-effective for bulk coding
  fallback_model: gpt-5.5
  requires_premium_review: false
  execution:
    runner: codex
    provider: openrouter
    model: z-ai/glm-5.2
    profile: openrouter
```

An Anthropic/Claude route can use `provider: anthropic`, `model: other`, and a concrete execution model:

```yaml
ai_provider:
  provider: anthropic
  model: other
  reason: Claude reviewer requested for long-context implementation critique
  requires_premium_review: false
  execution:
    runner: claude
    provider: anthropic
    model: claude-sonnet-4-5
```

## Routing Matrix

Every project-level `model_routing` or `modelRouting` matrix must include these routes. Each route uses the same provider/model/reason/review shape as `ai_provider`; `fallback_model` is optional, but `requires_premium_review` is required so validation can fail closed.

```yaml
model_routing:
  product_strategy:
    provider: openai
    model: gpt-5.5
    reason: high-level reasoning and product judgement
    requires_premium_review: true
  architecture:
    provider: openai
    model: gpt-5.5
    reason: structural decisions have high long-term cost
    requires_premium_review: true
  database_schema:
    provider: openai
    model: gpt-5.5
    reason: schema mistakes are expensive to reverse
    requires_premium_review: true
  implementation:
    provider: zai
    model: glm-5.2
    reason: cost-effective for bulk coding
    fallback_model: gpt-5.5
    requires_premium_review: false
  refactoring:
    provider: zai
    model: glm-5.2
    reason: good for repetitive code changes
    fallback_model: gpt-5.5
    requires_premium_review: false
  unit_tests:
    provider: zai
    model: glm-5.2
    reason: cost-effective for standard test coverage
    fallback_model: gpt-5.5
    requires_premium_review: false
  edge_case_tests:
    provider: openai
    model: gpt-5.5
    reason: better reasoning around failure modes
    requires_premium_review: false
  code_review:
    provider: openai
    model: gpt-5.5
    reason: final quality gate
    requires_premium_review: false
  security_review:
    provider: openai
    model: gpt-5.5
    reason: security-sensitive work must use strongest reviewer
    requires_premium_review: true
  auth_billing_payments:
    provider: openai
    model: gpt-5.5
    reason: high-risk business-critical code
    requires_premium_review: true
  documentation:
    provider: zai
    model: glm-5.2
    reason: low-risk text generation
    fallback_model: gpt-5.5
    requires_premium_review: false
  marketing_copy:
    provider: openai
    model: gpt-5.5
    reason: stronger taste, positioning and brand judgement
    requires_premium_review: true
```

## Required Delivery Table

Task plans, implementation plans, review artifacts, and pull request bodies must include a model usage summary:

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| Planning | OpenAI | GPT-5.5 | Architecture/product reasoning | N/A |
| Implementation | Z.ai | GLM-5.2 | Bulk code generation | GPT-5.5 |
| Review | OpenAI | GPT-5.5 | Final QA | N/A |

Add or remove rows so the table matches the actual work. If a row uses `GLM-5.2` and touches premium-review areas, the reviewer must be `GPT-5.5`.

## Runtime Command Routing

Loop builder and reviewer commands may use routing placeholders so each step can launch the right runner and model:

| Placeholder | Meaning |
| --- | --- |
| `{provider}` | Active semantic provider for the command role. |
| `{model}` | Active semantic model for the command role. |
| `{executionProvider}` | Concrete provider id for the command runner. |
| `{executionModel}` | Concrete model id for the command runner. |
| `{executionProfile}` | Concrete runner profile, if declared or inferred. |
| `{codexConfigArgs}` | Codex-ready model/provider arguments for the active route. |
| `{reviewerProvider}` | Semantic provider for `ai_reviewer`. |
| `{reviewerModel}` | Semantic model for `ai_reviewer`. |
| `{reviewerCodexConfigArgs}` | Codex-ready model/provider arguments for the reviewer route. |

Example Codex/OpenRouter builder command:

```bash
ai-delivery loop init \
  --spec SPEC.md \
  --standards AI_STANDARDS.md \
  --routed-codex
```

Example Claude builder command:

```bash
ai-delivery loop init \
  --spec SPEC.md \
  --standards AI_STANDARDS.md \
  --builder-command "claude --model {executionModel} < {prompt}"
```

Command routing can enforce model usage only for external commands it launches. A manually operated Desktop thread must still be started with the intended model or profile.

## Enforcement Rules

- GLM-5.2 may implement code but must not make final architecture, auth, billing, database, or security decisions.
- Any GLM-5.2-generated implementation touching auth, billing, payments, migrations, permissions, or customer data must receive GPT-5.5 review before merge.
- Every task plan must declare its model and provider before work starts.
- Pull requests must include a model usage summary.
- The final review model must be equal or stronger than the implementation model.
- If model routing is missing, the task fails standards validation.
- Premium-review work must use GPT-5.5 for the final reviewer even when implementation used another model.
- Model fallback must not downgrade below the required risk tier. If the required model is unavailable for premium-review work, the task blocks until an equal or stronger reviewer is available.

## Strength Order

Use this order when comparing implementation and final review models:

| Tier | Models |
| --- | --- |
| Premium review | GPT-5.5 |
| Standard implementation | GLM-5.2 |
| Other | Must declare relative strength in the plan before use |

Unknown or `other` models cannot be treated as equal or stronger than GPT-5.5 unless a project-specific routing policy explicitly says so.

## Premium-Review Triggers

Set `requires_premium_review: true` when a step touches:

- Architecture boundaries or cross-cutting abstractions.
- Authentication, authorization, permissions, roles, or tenant boundaries.
- Billing, payments, pricing, invoices, refunds, subscriptions, or credits.
- Database schemas, migrations, destructive data changes, or customer data lifecycle.
- Security controls, secrets, encryption, audit logging, abuse prevention, or compliance-sensitive workflows.
- Public marketing positioning, brand strategy, or high-visibility launch copy.

## Examples

### Standard Feature Build

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| Planning | OpenAI | GPT-5.5 | Product and architecture reasoning | N/A |
| Implementation | Z.ai | GLM-5.2 | Bounded feature code | GPT-5.5 |
| Unit tests | Z.ai | GLM-5.2 | Standard coverage | GPT-5.5 |
| Review | OpenAI | GPT-5.5 | Final quality gate | N/A |

```yaml
ai_provider:
  provider: zai
  model: glm-5.2
  reason: bounded implementation from approved plan
  fallback_model: gpt-5.5
  requires_premium_review: false
```

### Security-Sensitive Feature

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| Threat model | OpenAI | GPT-5.5 | Security reasoning | N/A |
| Implementation | OpenAI | GPT-5.5 | Auth and permission changes are high risk | GPT-5.5 |
| Security review | OpenAI | GPT-5.5 | Strongest reviewer required | N/A |

```yaml
ai_provider:
  provider: openai
  model: gpt-5.5
  reason: touches authentication, permissions, and customer data
  requires_premium_review: true
```

### Marketing/Content Task

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| Positioning | OpenAI | GPT-5.5 | Taste, positioning, and brand judgement | N/A |
| Draft copy | OpenAI | GPT-5.5 | High-visibility marketing language | Human brand reviewer |
| Documentation cleanup | Z.ai | GLM-5.2 | Low-risk supporting text | OpenAI GPT-5.5 if launch-critical |

```yaml
ai_provider:
  provider: openai
  model: gpt-5.5
  reason: stronger judgement for brand positioning and conversion copy
  fallback_model: other
  requires_premium_review: true
```

### Bug Fix

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| Root cause analysis | OpenAI | GPT-5.5 | Failure-mode reasoning | N/A |
| Minimal fix | Z.ai | GLM-5.2 | Bounded code correction | GPT-5.5 |
| Regression test | Z.ai | GLM-5.2 | Standard test coverage | GPT-5.5 |
| Review | OpenAI | GPT-5.5 | Check blast radius and regression risk | N/A |

```yaml
ai_provider:
  provider: zai
  model: glm-5.2
  reason: minimal implementation after GPT-5.5 root-cause analysis
  fallback_model: gpt-5.5
  requires_premium_review: false
```

Set `requires_premium_review: true` if the bug touches auth, billing, payments, migrations, permissions, or customer data.

### Refactor

| Step | Provider | Model | Reason | Reviewer |
|---|---|---|---|---|
| Refactor plan | OpenAI | GPT-5.5 | Boundary and blast-radius reasoning | N/A |
| Mechanical refactor | Z.ai | GLM-5.2 | Repetitive code changes | GPT-5.5 |
| Characterization tests | Z.ai | GLM-5.2 | Standard safety coverage | GPT-5.5 |
| Review | OpenAI | GPT-5.5 | Verify behavior preservation | N/A |

```yaml
ai_provider:
  provider: zai
  model: glm-5.2
  reason: mechanical refactor from approved plan
  fallback_model: gpt-5.5
  requires_premium_review: false
```

Use GPT-5.5 for the refactor implementation itself when the refactor changes architecture boundaries, database schema, auth, billing, payments, or permissions.
