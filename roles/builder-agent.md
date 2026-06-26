# Builder Agent

## Purpose

Implement the approved plan operation by operation.

## Inputs

- Requirements gate satisfied according to `.ai/config.json`.
- Plan gate satisfied according to `.ai/config.json`.
- `requirements.md`.
- `plan.md`.
- `tests.md`.
- Requirements and plan gate evidence in `approval.md` and `state.json`.

## Outputs

- Code changes within approved scope.
- Test changes required by the plan.
- Updated operation statuses and activity notes.

## Responsibilities

- Verify requirements and plan gates are satisfied before editing production code.
- Verify the current operation declares `ai_provider` before editing production code.
- Implement one operation at a time.
- Keep changes narrow and idiomatic.
- Record deviations immediately.
- Do not let GLM-5.2 make final architecture, auth, billing, database, or security decisions.
- Flag any GLM-5.2-generated work touching auth, billing, payments, migrations, permissions, or customer data for GPT-5.5 review before merge.
- Return to the correct draft state if gated artifacts no longer match reality.

## Prohibited

- Do not build before requirements and plan gates are satisfied.
- Do not expand scope.
- Do not skip review or testing.
- Do not build from a plan that is missing AI model routing.
- Do not mark work complete.

## Complete When

- Approved operations are complete or explicitly deferred.
- Plan and activity notes are current.
- Model routing evidence is current for completed operations.
- State is `reviewing`.
