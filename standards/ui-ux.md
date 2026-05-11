# UI And UX Standards

These standards define the product experience bar for AI-generated UI.

## UX Principles

- Make the primary workflow obvious.
- Minimize user memory load.
- Keep actions close to the objects they affect.
- Prefer clear recovery over clever prevention.
- Make system state visible.
- Preserve user work during errors when possible.

## Information Architecture

- Navigation labels should use user vocabulary.
- Related tasks should be grouped by workflow, not internal implementation.
- Avoid burying high-frequency actions.
- Use progressive disclosure for advanced or dangerous controls.
- Maintain consistent page, panel, modal, and drawer patterns.

## Content And Microcopy

- Use concise, specific copy.
- Error messages should explain what happened and what to do next.
- Buttons should use verbs: `Save`, `Invite`, `Export`, `Archive`.
- Avoid vague labels: `Submit`, `OK`, `Proceed` unless context is unambiguous.
- Do not expose implementation details in user-facing copy.

## Feedback And Recovery

| Scenario | Required UX |
| --- | --- |
| User action starts async work | Show progress, disable duplicate submission, preserve context. |
| Action succeeds | Confirm success without interrupting the flow unnecessarily. |
| Action fails | Show actionable error and recovery path. |
| Partial success | Explain what succeeded, what failed, and what can be retried. |
| Destructive action | Use confirmation, undo, or delayed execution based on severity. |

## Forms And Validation

- Validate as early as useful, but do not block typing with noisy errors.
- Use inline errors for field-specific problems.
- Use a summary for multi-field or form-level failure.
- Preserve entered values after validation failure.
- Use examples for complex formats.
- Avoid disabling submit without explaining why.

## Tables And Dense Data

- Provide clear column names.
- Align numbers by decimal or right edge where appropriate.
- Keep row actions consistent.
- Provide empty states that explain how to create or find data.
- Include sorting, filtering, pagination, or search when needed.
- Use skeletons sparingly; prefer meaningful loading affordances.

## Modals, Drawers, And Overlays

- Use modals for focused decisions that block the underlying workflow.
- Use drawers for contextual editing or details that benefit from page context.
- Trap focus inside modal dialogs.
- Restore focus to the invoking control on close.
- Provide escape and close controls unless the workflow is intentionally blocking.

## Notifications

- Toasts are for transient status, not critical information.
- Critical errors need persistent placement.
- Avoid stacking many notifications.
- Include actions in notifications only when they are immediately useful.

## AI Feature UX

AI-enabled features must show:

- What context the AI used when relevant.
- Confidence or uncertainty in user-appropriate language.
- Refusal or limitation messages that are calm and actionable.
- Ways to correct, retry, or provide missing context.
- No false implication that AI output is guaranteed correct.

## UX Review Questions

- Can the target user complete the primary workflow without instructions?
- Are error states recoverable?
- Does the UI preserve trust?
- Is the feature usable repeatedly, not just impressive once?
- Does the UX match the product's domain and maturity?

