# AI Model Routing Standard

This standard defines how AI model routes are selected for delivery work. It is provider agnostic: the standards define required route categories, risk rules, review gates, and evidence. Each product repository defines the concrete provider, model, runner, and fallback values in `.ai/config.json`.

This applies to every job, feature step, loop task, review pass, and generated implementation plan unless a product repository defines a stricter local routing policy.

## Principles

- Declare the configured route before work starts.
- Keep concrete provider and model names in project config, not in the universal standard.
- Use the strongest configured review route for decisions that are expensive to reverse.
- Use cost-effective configured implementation routes for bounded, lower-risk code generation.
- Route security, auth, billing, payments, permissions, customer data, database, and migration work to the configured premium-review route.
- Treat model routing as delivery evidence, not an optional note.

## Project Config Owns Concrete Routes

Every governed project must define `modelRouting` in `.ai/config.json`. The standards own the route names and the required fields. The project owns the actual provider/model choices.

Required route keys:

| Route | Purpose | Expected Risk Tier |
| --- | --- | --- |
| `product_strategy` | Product direction, positioning, scope tradeoffs | `premium_review` |
| `architecture` | Boundaries, abstractions, cross-cutting design | `premium_review` |
| `database_schema` | Schemas, migrations, data lifecycle | `premium_review` |
| `implementation` | Bounded implementation from an approved plan | `standard_implementation` |
| `refactoring` | Mechanical or bounded refactors | `standard_implementation` |
| `unit_tests` | Standard unit and component test generation | `standard_implementation` |
| `edge_case_tests` | Failure modes, negative cases, ambiguous input | `standard_review` |
| `code_review` | General implementation review | `standard_review` |
| `security_review` | Security-sensitive review | `premium_review` |
| `auth_billing_payments` | Auth, billing, payments, permissions, subscriptions | `premium_review` |
| `documentation` | Low-risk docs and supporting text | `low_risk` |
| `marketing_copy` | High-visibility copy, launch messaging, positioning | `premium_review` |

Example project config shape:

```json
{
  "modelRouting": {
    "implementation": {
      "provider": "your-standard-provider",
      "model": "your-standard-implementation-model",
      "risk_tier": "standard_implementation",
      "strength_rank": 1,
      "reason": "bounded implementation from an approved plan",
      "fallback_model": "your-premium-review-model",
      "requires_premium_review": false,
      "reviewer_route": "code_review"
    },
    "security_review": {
      "provider": "your-premium-provider",
      "model": "your-premium-review-model",
      "risk_tier": "premium_review",
      "strength_rank": 3,
      "reason": "security-sensitive work must use the strongest configured reviewer",
      "requires_premium_review": true
    }
  }
}
```

`provider` and `model` are project-defined strings. They may name a hosted vendor, local model, router, profile, or internal platform. When a semantic route needs a provider-specific model slug or CLI profile, add `execution`.

```yaml
ai_provider:
  provider: your-standard-provider
  model: your-standard-implementation-model
  risk_tier: standard_implementation
  strength_rank: 1
  reason: bounded implementation from an approved plan
  fallback_model: your-premium-review-model
  requires_premium_review: false
  reviewer_route: code_review
  execution:
    runner: codex
    provider: your-runtime-provider
    model: your-runtime-model-id
    profile: your-runtime-profile
```

## Required Field

Every delivery step or job must include an `ai_provider` field copied from, or explicitly aligned to, the relevant project route:

```yaml
ai_provider:
  provider: <project-configured-provider>
  model: <project-configured-model>
  risk_tier: premium_review | standard_review | standard_implementation | low_risk | other
  strength_rank: <optional numeric strength, higher is stronger>
  reason: short explanation
  fallback_model: optional backup model
  requires_premium_review: true | false
  reviewer_route: optional modelRouting route key for final review
  execution:
    runner: codex | claude | cursor | other
    provider: optional runtime provider id
    model: optional runtime model id
    profile: optional runner profile
```

`provider`, `model`, `reason`, and `requires_premium_review` are required. `risk_tier`, `strength_rank`, `fallback_model`, `reviewer_route`, and `execution` are recommended because they make provider-agnostic validation stronger.

`fallback_model` should be present when delivery can continue with a different model after provider outage, rate limit, or budget exhaustion. Fallback must not downgrade below the required risk tier.

## Required Delivery Table

Task plans, implementation plans, review artifacts, and pull request bodies must include a model usage summary:

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| Planning | `<provider>` | `<model>` | `premium_review` | Architecture/product reasoning | N/A |
| Implementation | `<provider>` | `<model>` | `standard_implementation` | Bounded implementation | `<configured review route>` |
| Review | `<provider>` | `<model>` | `standard_review` or `premium_review` | Final QA | N/A |

Add or remove rows so the table matches the actual work. If a row touches premium-review areas, the reviewer must use the configured premium-review route.

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

Example routed Codex command:

```bash
ai-delivery loop init \
  --spec SPEC.md \
  --standards AI_STANDARDS.md \
  --routed-codex
```

Example custom builder command:

```bash
ai-delivery loop init \
  --spec SPEC.md \
  --standards AI_STANDARDS.md \
  --builder-command "your-agent --model {executionModel} < {prompt}"
```

Command routing can enforce model usage only for external commands it launches. A manually operated thread must still be started with the intended model or profile.

## Enforcement Rules

- Every task plan must declare its model route before work starts.
- Pull requests must include a model usage summary.
- If model routing is missing, the task fails standards validation.
- Premium-review work must use the configured premium-review route for final review.
- The final review model must be equal or stronger than the implementation model according to project `strength_rank`, `risk_tier`, or the local routing policy.
- Model fallback must not downgrade below the required risk tier.
- If the required route is unavailable for premium-review work, the task blocks until an equal or stronger reviewer is available.

## Risk Tier Order

Use this order when comparing implementation and final review routes:

| Rank | Risk Tier |
| --- | --- |
| 3 | `premium_review` |
| 2 | `standard_review` |
| 1 | `standard_implementation` or `low_risk` |
| 0 | `other` or unspecified |

When two routes use different providers or model families, `strength_rank` in `.ai/config.json` is the project-owned authority. Unknown routes cannot be treated as equal or stronger unless a project-specific routing policy explicitly says so.

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

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| Planning | `<premium-provider>` | `<premium-model>` | `premium_review` | Product and architecture reasoning | N/A |
| Implementation | `<standard-provider>` | `<standard-model>` | `standard_implementation` | Bounded feature code | `<code_review route>` |
| Unit tests | `<standard-provider>` | `<standard-model>` | `standard_implementation` | Standard coverage | `<code_review route>` |
| Review | `<review-provider>` | `<review-model>` | `standard_review` | Final quality gate | N/A |

```yaml
ai_provider:
  provider: your-standard-provider
  model: your-standard-implementation-model
  risk_tier: standard_implementation
  strength_rank: 1
  reason: bounded implementation from approved plan
  fallback_model: your-premium-review-model
  requires_premium_review: false
  reviewer_route: code_review
```

### Security-Sensitive Feature

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| Threat model | `<premium-provider>` | `<premium-model>` | `premium_review` | Security reasoning | N/A |
| Implementation | `<premium-provider>` | `<premium-model>` | `premium_review` | Auth and permission changes are high risk | `<security_review route>` |
| Security review | `<premium-provider>` | `<premium-model>` | `premium_review` | Strongest configured reviewer required | N/A |

```yaml
ai_provider:
  provider: your-premium-provider
  model: your-premium-review-model
  risk_tier: premium_review
  strength_rank: 2
  reason: touches authentication, permissions, and customer data
  requires_premium_review: true
  reviewer_route: security_review
```

### Bug Fix

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| Root cause analysis | `<review-provider>` | `<review-model>` | `standard_review` | Failure-mode reasoning | N/A |
| Minimal fix | `<standard-provider>` | `<standard-model>` | `standard_implementation` | Bounded code correction | `<code_review route>` |
| Regression test | `<standard-provider>` | `<standard-model>` | `standard_implementation` | Standard test coverage | `<code_review route>` |
| Review | `<review-provider>` | `<review-model>` | `standard_review` | Check blast radius and regression risk | N/A |

Set `requires_premium_review: true` if the bug touches auth, billing, payments, migrations, permissions, or customer data.

### Refactor

| Step | Provider | Model | Risk Tier | Reason | Reviewer |
|---|---|---|---|---|---|
| Refactor plan | `<premium-provider>` | `<premium-model>` | `premium_review` | Boundary and blast-radius reasoning | N/A |
| Mechanical refactor | `<standard-provider>` | `<standard-model>` | `standard_implementation` | Repetitive code changes | `<code_review route>` |
| Characterization tests | `<standard-provider>` | `<standard-model>` | `standard_implementation` | Standard safety coverage | `<code_review route>` |
| Review | `<review-provider>` | `<review-model>` | `standard_review` | Verify behavior preservation | N/A |

Use the configured premium-review route for the refactor implementation itself when the refactor changes architecture boundaries, database schema, auth, billing, payments, or permissions.
