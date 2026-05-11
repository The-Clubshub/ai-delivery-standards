# Accessibility Standards

All user-facing UI must target WCAG 2.2 AA unless the product has a stricter requirement. Accessibility is a design and engineering requirement, not a post-build audit.

## Baseline Requirements

| Area | Requirement |
| --- | --- |
| Keyboard | All interactive functionality works without a mouse. |
| Focus | Focus order is logical, visible, and managed during dynamic changes. |
| Semantics | Use semantic HTML first; use ARIA only when needed. |
| Names | Interactive elements have accessible names that match visible labels where practical. |
| Contrast | Text and meaningful UI indicators meet WCAG AA contrast. |
| Screen readers | Dynamic content and errors are announced appropriately. |
| Motion | Respect reduced-motion preferences. |
| Forms | Labels, instructions, validation, and errors are programmatically associated. |

## WCAG AA Guidance

Minimum expectations:

- Normal text contrast: at least 4.5:1.
- Large text contrast: at least 3:1.
- Non-text UI indicators and focus states: at least 3:1.
- Do not rely on color alone to communicate meaning.
- Provide text alternatives for meaningful images.
- Maintain visible focus for all keyboard-operable controls.
- Ensure content can reflow without loss of information at supported zoom levels.

## Semantic HTML

Prefer native elements:

| Need | Preferred Element |
| --- | --- |
| Command | `button` |
| Navigation | `a href` |
| Page landmarks | `header`, `nav`, `main`, `aside`, `footer` |
| Form fields | `label`, `input`, `select`, `textarea`, `fieldset`, `legend` |
| Tabular data | `table`, `thead`, `tbody`, `th`, `td` |
| Dialog | Native dialog or accessible dialog pattern |

Avoid:

- Clickable `div` or `span` elements.
- ARIA roles that conflict with native semantics.
- Removing focus outlines without replacing them.
- Icon-only buttons without accessible names.

## Keyboard Support

Required:

- `Tab` moves through interactive elements in logical order.
- `Shift+Tab` moves backward.
- `Enter` and `Space` activate buttons where expected.
- Arrow keys operate menus, tabs, listboxes, sliders, and similar composite widgets according to established patterns.
- `Escape` closes dismissible overlays.
- No keyboard traps unless the component is a modal dialog, and then focus must be contained intentionally.

## Focus Management

Manage focus when:

- Opening or closing modals, drawers, menus, popovers, and dialogs.
- Navigating to a new route or significant page state.
- Submitting forms with validation errors.
- Dynamically inserting content that requires immediate user attention.

Rules:

- Move focus to the first meaningful heading or interactive control after route changes when the framework does not handle it.
- Move focus to form error summaries after failed submit when multiple fields fail.
- Restore focus to the triggering control when closing overlays.
- Keep focus visible at all times.

## Screen Reader Support

- Use headings in logical order.
- Provide accessible names for controls.
- Use `aria-describedby` for field help and errors.
- Use live regions for async status changes that are not otherwise announced.
- Use `aria-expanded`, `aria-controls`, and `aria-current` where appropriate.
- Hide decorative icons from assistive technology.
- Do not place critical content only in placeholders, tooltips, or hover states.

## Forms

- Every input has a programmatic label.
- Required state is announced.
- Errors are associated with fields.
- Error text is specific and actionable.
- Autocomplete attributes are used for common personal information fields where appropriate.
- Group related controls with `fieldset` and `legend`.

## Images, Icons, And Media

- Meaningful images need alt text that communicates purpose.
- Decorative images use empty alt text or are hidden from assistive tech.
- Icon-only buttons need accessible names.
- Video requires captions when it contains speech.
- Audio-only content needs transcript where product context requires it.

## Motion And Animation

- Respect `prefers-reduced-motion`.
- Avoid flashing content.
- Do not use motion as the only way to communicate state.
- Keep animations short and purposeful.

## Accessibility Testing

Minimum checks:

- Keyboard-only walkthrough of primary flow.
- Screen reader smoke test for changed flow.
- Automated accessibility scan where tooling exists.
- Contrast check for new colors.
- Focus behavior check for overlays and validation.
- Responsive zoom/reflow check for critical layouts.

## Review Gate

A UI change is not complete until the review checklist records:

- Keyboard result
- Focus result
- Semantics result
- Screen reader result
- Contrast result
- Known accessibility gaps, if any

