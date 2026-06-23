# Universal Command Protocol

These commands are the portable V2 lifecycle interface for chat, CLI, PR comments, issue comments, and future AI tools.

## Canonical Commands

| Command | Purpose | Required State | Actor |
| --- | --- | --- | --- |
| `/start-feature` | Create a V2 feature lifecycle entry. | none or project-ready | Human or Requirements Agent |
| `/status` | Report project or feature state. | any | Any |
| `/approve-requirements` | Record human requirements approval. | `requirements_pending_review` | Human |
| `/approve-plan` | Record human plan approval. | `plan_pending_review` | Human |
| `/build` | Start or continue approved implementation. | `plan_approved` or `building` | Builder Agent |
| `/review` | Review implementation against approved artifacts. | `building` or `reviewing` | Reviewer Agent |
| `/test` | Validate implementation against the test plan. | `reviewing` or `testing` | Tester Agent |
| `/continue` | Continue the next allowed lifecycle action. | any non-terminal | State-derived role |
| `/complete` | Record human implementation approval and mark complete. | `ready_for_human_review` | Human |

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

- `/continue` never grants approval.
- AI agents never execute approval commands as the approver.
- `/build` requires requirements and plan approvals.
- `/complete` requires review evidence, test evidence, and human implementation approval.
- Invalid commands fail closed and explain the next allowed action.

