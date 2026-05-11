# Workflow: Accessibility Review

Use this workflow for UI changes, accessibility audits, and pre-release checks.

## Outcome

The feature is usable with keyboard and assistive technology, meets WCAG AA expectations, and records accessibility evidence.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Feature review checklist | Feature folder `review-checklist.md` |
| Test plan updates | Feature folder `test-plan.md` |
| Accessibility findings | PR review, issue tracker, or feature checklist |

## Steps

### 1. Identify Affected Flows

List:

- Pages, dialogs, drawers, menus, forms, tables, charts, and dynamic regions changed.
- User roles.
- Supported viewports.
- Critical keyboard paths.

### 2. Check Semantics

Verify:

- Landmarks are meaningful.
- Headings are ordered.
- Buttons are buttons and links are links.
- Form fields have labels.
- Tables use table semantics.
- ARIA is necessary and correct.

### 3. Check Keyboard Support

Test:

- Tab order.
- Reverse tab order.
- Activation with Enter and Space.
- Arrow-key behavior for composite widgets.
- Escape behavior for overlays.
- No keyboard traps.

### 4. Check Focus Management

Verify:

- Focus is visible.
- Dialogs move focus inside on open.
- Focus returns to the invoking control on close.
- Validation errors receive focus or are announced.
- Route or major content changes have sensible focus behavior.

### 5. Check Screen Reader Behavior

Verify:

- Controls have accessible names.
- Field help and errors are announced.
- Dynamic loading and completion states are announced where needed.
- Decorative content is hidden.
- Icon-only controls are named.

### 6. Check Visual Accessibility

Verify:

- Text contrast meets WCAG AA.
- Focus indicators meet contrast expectations.
- Meaning is not conveyed by color alone.
- Content reflows at supported zoom.
- Motion respects reduced-motion settings.

### 7. Record Findings

For each issue:

- Severity.
- Affected user.
- Location.
- Expected behavior.
- Actual behavior.
- Suggested fix.

### 8. Update Artifacts

Update:

- `test-plan.md` accessibility section.
- `review-checklist.md` accessibility checks.
- Feature spec if UX behavior changed.

## Example Prompt

```text
Run an accessibility review under ai-delivery-standards.

Scope:
- <pages/components/flows>

Use:
- standards/accessibility.md
- feature test-plan.md
- feature review-checklist.md

Check keyboard, focus, semantics, screen reader behavior, contrast, motion, and
responsive reflow. Record findings with severity and suggested fixes. Update the
feature artifacts with evidence and remaining gaps.
```

## Quality Gates

- [ ] Keyboard-only flow works.
- [ ] Focus order and restoration are correct.
- [ ] Semantic structure is correct.
- [ ] Screen reader names and announcements are adequate.
- [ ] Contrast meets WCAG AA.
- [ ] Known gaps are documented with owners.

