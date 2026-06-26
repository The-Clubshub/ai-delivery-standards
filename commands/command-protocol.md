# Universal Command Protocol

These commands are the portable V2 lifecycle interface for chat, CLI, PR comments, issue comments, and future AI tools.

## Canonical Commands

| Command | Purpose | Required State | Actor |
| --- | --- | --- | --- |
| `/start-feature` | Create a V2 feature lifecycle entry. | none or project-ready | Human or Requirements Agent |
| `/status` | Report project or feature state. | any | Any |
| `/approve-requirements` | Record human requirements approval when `approvalPolicy.requirements` is `human_required`. | `requirements_pending_review` | Human |
| `/approve-plan` | Record human plan approval when `approvalPolicy.plan` is `human_required`. | `plan_pending_review` | Human |
| `/build` | Start or continue gated implementation. | `plan_approved` or `building` | Builder Agent |
| `/ai-review` | Review implementation against approved artifacts. | `building` or `reviewing` | Reviewer Agent |
| `/test` | Validate implementation against the test plan. | `reviewing` or `testing` | Tester Agent |
| `/continue` | Continue the next allowed lifecycle action. | any non-terminal | State-derived role |
| `/complete` | Record implementation approval when required and mark complete. | `ready_for_human_review` | Human when `implementation` is `human_required`; Sync Agent when `not_required` |

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

A gate is satisfied when its status is `approved` for `human_required` or `not_required` for `not_required`.

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

After `/approve-requirements`, `/continue` may progress through planning, building, review, testing, fix cycles, and completion until a stop condition or failed validation requires human input.

## Required Response Shape

For successful commands, report:

- Command
- Feature
- Current state
- Role
- Action taken
- Next allowed command
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
- Allowed next step

## Non-Negotiable Rules

- `/continue` never grants human approval.
- AI agents never execute approval commands as the approver.
- AI agents may record `not_required` only when `.ai/config.json` explicitly configures that gate as `not_required`.
- `/build` requires requirements and plan gates to be satisfied.
- `/build` requires AI model routing for the current operation.
- `/ai-review` fails standards validation when model routing is missing or premium-review rules are unsatisfied.
- `/complete` requires review evidence, test evidence, and the implementation gate to be satisfied.
- Invalid commands fail closed and explain the next allowed action.
