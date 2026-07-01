# Universal Command Protocol

These commands are the portable V2 lifecycle interface for chat, CLI, PR comments, issue comments, and future AI tools.

## Canonical Commands

| Command | Purpose | Required State | Actor |
| --- | --- | --- | --- |
| `/start-feature` | Create a V2 feature lifecycle entry. | none or project-ready | Human or Requirements Agent |
| `/status` | Report project or feature state. | any | Any |
| `/approve-requirements` | Record human requirements approval, move to `plan_draft`, and start planning. | `requirements_pending_review` | Human approval, then Planner Agent |
| `/approve-plan` | Record human plan approval, move to `building`, and start implementation for the full approved request. | `plan_pending_review` | Human approval, then Builder Agent |
| `/build` | Continue gated implementation. | `building` | Builder Agent |
| `/ai-review` | Review implementation against approved artifacts. | `building` or `reviewing` | Reviewer Agent |
| `/test` | Validate implementation against the test plan. | `reviewing` or `testing` | Tester Agent |
| `/continue` | Resume the next allowed lifecycle action after an interruption or stale handoff. It is not required after approvals. | any non-terminal | State-derived role |
| `/complete` | Record implementation approval when required and mark complete. | `ready_for_human_review` | Human when `implementation` is `human_required`; Sync Agent when `not_required` |

## Codex Goal Mode

`/goal` is a Codex-specific control command. It is not required for Claude, Cursor, PR comments, or generic agents.

When the selected workbench is Codex, non-trivial work should run under an active `/goal`:

- The goal is the top-level objective for the current thread.
- The goal governs feature selection, planning, queue order, implementation scope, review, and completion criteria.
- The goal does not override approval gates, feature state, safety rules, or explicit newer user instructions.
- Do not clear or replace the goal until it is complete, blocked, or explicitly changed by the user.
- If a request contains multiple features, the feature queue must map each queue item back to the active goal.
- If `/goal` is unavailable in the Codex surface, record the same objective in the active feature or queue artifacts and continue under the normal lifecycle.

Use `/goal` before `/start-feature` for large or multi-step work. Use `/status` to report how the active feature or queue relates to the goal.

## Approval Policy

Projects configure manual approval gates in `.ai/config.json`:

```json
{
  "approvalPolicy": {
    "requirements": "human_required",
    "plan": "human_required",
    "implementation": "human_required"
  }
}
```

Each gate accepts:

| Value | Meaning |
| --- | --- |
| `human_required` | A human must explicitly approve the gate before the transition. |
| `not_required` | The responsible agent may advance after the required artifact or evidence exists, recording `not_required` in `approval.md` and `state.json`. |

A gate is satisfied when its status is `approved` for `human_required` or `not_required` for `not_required`. Satisfying a gate immediately moves the feature to the next executable state:

| Gate | Satisfied By | Immediate State | Immediate Role |
| --- | --- | --- | --- |
| Requirements | `/approve-requirements` or `not_required` evidence | `plan_draft` | Planner Agent |
| Plan | `/approve-plan` or `not_required` evidence | `building` | Builder Agent |
| Implementation | `/complete` or `not_required` evidence | `complete` | Sync Agent |

For "approve requirements once, then run autonomously" work, use:

```json
{
  "approvalPolicy": {
    "requirements": "human_required",
    "plan": "not_required",
    "implementation": "not_required"
  }
}
```

After `/approve-requirements`, the Planner Agent starts immediately. If the plan and implementation gates are `not_required`, the lifecycle may continue through planning, building, review, testing, fix cycles, and completion until a stop condition or failed validation requires human input.

## Full-Request Implementation Approval

For broad requests such as "build a full website", the plan gate applies to the entire original request, not only the first feature folder or first queue item.

Before `/approve-plan` or an equivalent "go ahead and implement" instruction can start implementation, the plan must identify the full request scope and the ordered feature queue needed to satisfy it. Once the user approves that plan, the Builder, Reviewer, Tester, and Sync Agents must continue through every unblocked queued feature in the original request without asking for separate approval to start each feature.

The agent must ask again only when:

- A queued item is outside the original request.
- A stop condition from `workflows/autonomous-feature-queue.md` applies.
- The user changes scope, priority, or direction.
- The plan is missing a material feature, page, flow, or integration needed for the original request.

## Required Response Shape

For successful commands, report:

- Command
- Feature
- Current state
- Role
- Action taken
- Next action or stop condition
- Artifacts updated
- Approval status
- Blockers

For refused commands, report:

- Command
- Feature
- Current state
- Requested action
- Why refused
- Required state or approval
- Allowed next action

## Non-Negotiable Rules

- `/approve-requirements`, `/approve-plan`, and `/complete` are compound commands: record the gate evidence, update state, and immediately start the next lifecycle action when there is one.
- `/approve-plan` covers every feature in the original approved request when the plan includes a feature queue.
- `/continue` never grants human approval and is not required after a successful approval command.
- AI agents never execute approval commands as the approver.
- AI agents may record `not_required` only when `.ai/config.json` explicitly configures that gate as `not_required`.
- `/build` requires requirements and plan gates to be satisfied.
- `/build` requires the active plan to record the AI workbench/model profile.
- `/ai-review` flags missing AI workbench/model profile or missing high-risk review evidence.
- `/complete` requires review evidence, test evidence, and the implementation gate to be satisfied.
- Invalid commands fail closed and explain the next allowed action or required approval.
