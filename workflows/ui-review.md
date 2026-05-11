# Workflow: UI Review

Use this workflow for product experience review of AI-generated UI.

## Outcome

The UI is coherent, usable, responsive, accessible, and consistent with the product's design language.

## Required Artifacts

| Artifact | Location |
| --- | --- |
| Feature spec UX section | Feature folder `feature-spec.md` |
| Test plan UI and accessibility sections | Feature folder `test-plan.md` |
| Review checklist | Feature folder `review-checklist.md` |

## Steps

### 1. Review Against User Goal

Check:

- The primary workflow is immediately visible.
- The user can complete the task without explanatory copy outside the interface.
- The UI does not add unapproved flows.
- Success and failure states are clear.

### 2. Review Information Architecture

Check:

- Navigation and labels match user vocabulary.
- Actions are close to affected objects.
- Layout supports scanning and repeated use.
- Advanced options do not obscure the main path.

### 3. Review Visual Design

Check:

- Spacing, typography, and color follow the existing design system.
- Visual hierarchy matches task importance.
- No nested cards or decorative clutter.
- Icon usage is familiar and named.
- Text fits in containers at supported viewport widths.

### 4. Review Interaction Design

Check:

- Controls match user expectations.
- Destructive actions have confirmation, undo, or clear consequence.
- Loading, empty, error, success, and disabled states exist.
- Optimistic updates recover from failure.

### 5. Review Responsive Behavior

Check:

- Mobile, tablet, and desktop layouts work.
- Tables or dense data have a responsive strategy.
- Touch targets are usable.
- Text does not overlap or clip.
- Fixed-format elements use stable dimensions.

### 6. Review Accessibility

Apply `workflows/accessibility-review.md` for any interactive UI.

### 7. Update Artifacts

Record:

- Accepted UI behavior.
- Required fixes.
- Deferred improvements.
- Screenshots or manual validation notes where useful.

## Example Prompt

```text
Review this AI-generated UI under ai-delivery-standards.

Scope:
- <components/pages>

Use:
- standards/frontend.md
- standards/ui-ux.md
- standards/accessibility.md
- feature-spec.md
- review-checklist.md

Find issues in workflow clarity, layout, responsive behavior, controls, states,
copy, accessibility, and consistency with existing design patterns. Prioritize
blocking user-impacting issues first.
```

## Quality Gates

- [ ] Primary workflow is clear.
- [ ] UI states are complete.
- [ ] Layout works across supported viewports.
- [ ] Design system conventions are followed.
- [ ] Accessibility review completed.
- [ ] Review checklist updated.

