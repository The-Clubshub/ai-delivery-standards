# AI Workbench And Models Standard

This standard defines the default AI setup for delivery work. It keeps the project configuration to one selected workbench and a small set of stage model names.

Plain English distinction:

- Workbench: the desktop app or CLI where AI work runs.
- Model: the AI model selected inside that workbench for a delivery stage.
- High-risk review model: the model used for final review when the work touches sensitive or expensive-to-reverse areas.

## Default Rule

Every governed project defines one `aiWorkbench` object in `.ai/config.json`.

```json
{
  "aiWorkbench": {
    "provider": "codex",
    "mode": "desktop_or_cli",
    "stageModels": {
      "requirements": "GPT-5.5",
      "planning": "GPT-5.5",
      "building": "GPT-5.3 Codex",
      "reviewing": "GPT-5.5",
      "testing": "GPT-5.3 Codex",
      "syncCompletion": "GPT-5.4 mini",
      "highRiskReview": "GPT-5.5"
    }
  }
}
```

Supported workbench values:

- `codex`
- `claude`
- `cursor`

`workbench-default` means use the model currently selected in the chosen workbench.

## Required Stage Models

| Stage | Purpose |
| --- | --- |
| `requirements` | Requirements drafting and acceptance criteria. |
| `planning` | Implementation planning, architecture reasoning, and sequencing. |
| `building` | Bounded implementation from an approved plan. |
| `reviewing` | Normal implementation review. |
| `testing` | Test design and test generation. |
| `syncCompletion` | Sync Agent handoff, state sync, and completion summaries. |
| `highRiskReview` | Final review for high-risk work. |

Plans, reviews, handoffs, and pull requests should include a simple workbench/model summary:

| Stage | Workbench | Model |
| --- | --- | --- |
| Requirements | `<codex/claude/cursor>` | `<model>` |
| Planning | `<codex/claude/cursor>` | `<model>` |
| Build | `<codex/claude/cursor>` | `<model>` |
| Review | `<codex/claude/cursor>` | `<model>` |
| Test | `<codex/claude/cursor>` | `<model>` |
| Sync and completion | `<codex/claude/cursor>` | `<model>` |
| High-risk review | `<codex/claude/cursor>` | `<model>` |

## Desktop Model Switch Visibility

When an agent changes from one configured model to another, the desktop app must show the switch before the next stage starts. The visible status should name the previous stage/model and the next stage/model, for example:

```text
Switching model: Building / GPT-5.3 Codex -> Reviewing / GPT-5.5
```

The same switch should be recorded in activity, handoff, review, or completion artifacts when those artifacts exist.

## High-Risk Review Rule

Use the configured `highRiskReview` model for final review when work touches:

- Architecture boundaries or cross-cutting abstractions.
- Authentication, authorization, permissions, roles, or tenant boundaries.
- Billing, payments, pricing, invoices, refunds, subscriptions, or credits.
- Database schemas, migrations, destructive data changes, or customer data lifecycle.
- Security controls, secrets, encryption, audit logging, abuse prevention, or compliance-sensitive workflows.

This is the only default escalation rule.

## Runtime Commands

Loop builder and reviewer commands may use simple placeholders:

| Placeholder | Meaning |
| --- | --- |
| `{workbench}` | Selected workbench. |
| `{stage}` | Current task stage model key. |
| `{model}` | Selected model for the current builder or reviewer command. |
| `{modelArg}` | Codex-style `-m <model>` argument, empty for `workbench-default`. |
| `{reviewModel}` | Review or high-risk review model for the task. |
| `{reviewModelArg}` | Codex-style `-m <reviewModel>` argument, empty for `workbench-default`. |

When Codex is the selected workbench, loop init may wire simple Codex commands automatically. Cursor and Claude users can run the prompts manually or provide their own command templates.

## Exact Model IDs

Model names are not normalized beyond trimming; they are inserted into command templates exactly as entered.

- `workbench-default` is the only reserved keyword and tells the runner to use the model currently selected in the workbench.
- All other values should match the model identifier expected by the target workbench/provider (for example `claude-fable-5`).

### Codex workbench model discovery

Codex exposes the model catalog seen by the CLI.

- `codex debug models` prints the model catalog Codex can see as JSON.
- `codex debug models --bundled` prints only the catalog bundled with the current Codex binary.
- During `init`, Codex model selection uses `codex debug models` when the Codex CLI is installed.
- If the Codex catalog cannot be read, the UI falls back to recommended Codex model IDs and still allows manual entry.

### Claude workbench model discovery

Claude exposes model metadata through its API and official docs.

- `GET https://api.anthropic.com/v1/models` returns available models.
- The docs page for model offerings includes current Claude IDs (for example `claude-fable-5` and other actively published IDs).
- Example:

```bash
curl -sS https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  | jq -r '.data[].id'
```

### Cursor model discovery

Cursor docs indicate its model picker is provider-driven:

- OpenAI: standard chat models available to your key.
- Anthropic: all Claude models available through the Anthropic API.

Cursor does not guarantee a single universal Cursor-side model-list API in public docs, so keep this explicit:

- Use the underlying provider API to list models (OpenAI, Anthropic, etc.).
- Paste the exact model ID into the stage model field.
- For most OpenAI-based providers, model IDs are listed at the provider endpoint (`/v1/models`).
- For Anthropic-backed models, use the Anthropic `/v1/models` list as above.

Because model availability changes over time, using provider APIs is the reliable way to keep these stage values current.

During `init`, model selection now filters by chosen workbench:

- Codex uses the local Codex CLI model catalog when available.
- Claude uses `ANTHROPIC_API_KEY` to show available Claude model IDs.
- Cursor uses available OpenAI (`OPENAI_API_KEY`) and Anthropic (`ANTHROPIC_API_KEY`) discovered models.
- If provider discovery is unavailable, the UI still offers `workbench-default` plus manual model entry.
