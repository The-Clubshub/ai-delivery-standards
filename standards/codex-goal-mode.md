# Codex Goal Mode Standard

This standard applies when the selected AI workbench is Codex and the Codex surface supports `/goal`.

## Default Rule

For non-trivial, multi-step, or multi-feature work, Codex must run under an active `/goal`.

The active goal is the top-level objective for the thread. It governs:

- Feature selection.
- Feature queue membership and priority.
- Requirements and plan scope.
- Implementation focus.
- Review and validation focus.
- Completion criteria.

## Precedence

`/goal` does not override:

- System, developer, platform, or tool instructions.
- Newer explicit user instructions.
- Approval gates in `.ai/config.json`.
- The active feature state machine.
- Safety, security, permission, or refusal rules.

If the goal conflicts with the lifecycle state, the lifecycle state wins and Codex reports the next allowed action or required approval.

## Required Behavior

Codex must:

- Set or confirm `/goal` before `/start-feature` for large or multi-feature work.
- Keep the goal active until it is complete, blocked, or explicitly changed by the user.
- For broad requests, ensure the goal and feature queue cover the full original request before implementation starts.
- Map every feature, queue item, plan operation, review summary, and completion summary back to the active goal.
- Remove, defer, or ask before doing work that does not support the active goal.
- Report goal progress in status, handoff, queue, and completion summaries.

## Fallback

If `/goal` is unavailable in the active Codex surface, record the same objective in:

- `.ai/queues/active.md` for queued work.
- The active feature `requirements.md` or `plan.md` for single-feature work.
- `handoff.md` when work pauses or blocks.

The fallback objective should be treated as the controlling goal until Codex `/goal` is available or the user changes it.

## Stop Conditions

Stop and ask the user when:

- The active goal is too vague to derive testable acceptance criteria.
- The goal conflicts with approved requirements or plan.
- The goal would require work outside approved scope.
- The goal appears complete but residual queue items remain.
- The user changes the objective in a way that invalidates existing feature artifacts.
