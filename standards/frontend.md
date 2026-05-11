# Frontend Standards

These standards apply to web, mobile web, and desktop UI surfaces unless the product defines stricter rules.

## Product Fit

- Build the actual user workflow, not a marketing wrapper.
- Follow the existing design system, spacing scale, typography, component library, and interaction patterns.
- Use dense, predictable operational layouts for SaaS, CRM, admin, and internal tools.
- Use expressive visuals only when the product domain benefits from them.

## Component Design

- Components should have a single clear responsibility.
- Separate presentation, state orchestration, data fetching, and domain rules when the framework supports it.
- Prefer composition over deeply configurable mega-components.
- Do not duplicate design system primitives.
- Keep props explicit and typed.

## UI States

Every user-facing async or conditional flow must define:

- Loading state
- Empty state
- Error state
- Success or completed state
- Disabled or unavailable state
- Permission-denied state where relevant

## Forms

- Every input has a visible label or equivalent accessible name.
- Required fields are indicated visually and programmatically.
- Validation messages identify the field and how to recover.
- Submit buttons show progress for long-running actions.
- Server-side validation errors are displayed near affected fields and summarized when needed.
- Forms must be usable with keyboard only.

## Responsive Layout

- Support the product's documented viewport range.
- Use responsive constraints, not viewport-scaled typography.
- Prevent horizontal overflow.
- Text must not overlap, clip, or escape buttons, cards, table cells, or panels.
- Fixed-format elements such as boards, grids, toolbars, counters, and tiles need stable dimensions.
- Tables need a responsive strategy: horizontal scroll, column priority, stacked layout, or alternate mobile view.

## Interaction Patterns

- Use familiar controls:
  - Buttons for commands.
  - Links for navigation.
  - Checkboxes or toggles for binary settings.
  - Radio groups or segmented controls for mutually exclusive modes.
  - Selects, menus, or comboboxes for option sets.
  - Sliders, steppers, or number inputs for numeric ranges.
- Destructive actions require confirmation or undo when impact is significant.
- Optimistic updates need rollback behavior.
- Long-running operations should communicate progress or queued state.

## Visual Quality

- Maintain consistent spacing, alignment, and visual hierarchy.
- Avoid nested cards and decorative clutter.
- Avoid one-note palettes dominated by a single hue family unless it is an established brand requirement.
- Use icons from the existing icon library.
- Tooltips should explain icon-only controls.
- Keep card radius modest unless the design system says otherwise.

## Data Display

- Format dates, numbers, currency, percentages, and units consistently.
- Distinguish unknown, zero, not applicable, and loading values.
- Provide sorting, filtering, pagination, or search for large datasets.
- Preserve user context after refreshes, mutations, and navigation where useful.

## Frontend Performance

- Avoid unnecessary re-renders in hot paths.
- Lazy-load heavy routes and media.
- Use pagination, virtualization, or incremental loading for large lists.
- Optimize images with appropriate dimensions, formats, and alt text.
- Do not add heavy client dependencies without a clear reason.

## Frontend Testing

Minimum test coverage for UI changes:

- Component tests for core states and interactions.
- Accessibility checks for labels, roles, keyboard flow, and focus.
- End-to-end tests for critical user journeys.
- Visual or screenshot checks for high-risk layout changes where supported.

## Done Means

- UI works across required viewports.
- Keyboard and screen reader behavior are considered and tested.
- Loading, empty, error, and success states exist.
- Text and controls do not overlap or overflow.
- The implementation matches the feature spec.

