# NEXT PHASE — Phase Z: Credit Enforcement Resolution (Approval Required)

## Objective
- Enforce access control on uncovered AI routes using minimal gating (auth requirement or feature-flag disablement).

## Scope
- Add auth requirement to uncovered AI routes that are clearly user-facing.
- Use feature-flag gating for routes with unclear audience.
- Admin routes must remain admin-only.

## Tasks
1. Add early-return auth guards to uncovered routes where audience is clear.
2. Gate ambiguous routes behind `ENABLE_UNUSED_ENDPOINTS` (if approved).
3. Update `EXECUTION_STATUS.md` with changes and any STOP notices.

## Allowed Actions
- Minimal access-control guards (early return).
- Update canonical docs with results.

## Forbidden Actions
- Feature or logic changes
- Schema or migration changes
- Pricing or billing model changes
- AI prompt/model/training changes
- New documents outside `docs/_CANONICAL/`

## Success Criteria
- Uncovered AI routes are not publicly callable without auth or explicit gating.
- Any ambiguous routes are documented with STOP notice.
