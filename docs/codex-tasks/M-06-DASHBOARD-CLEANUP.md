# TASK M-06 — Dashboard Cleanup (Stage 1)
Priority: High · Do today
Estimated time: 20 minutes

## Objective
Remove the test "Sandra" entry from Closed Lost in the Brand Engine admin dashboard so the pipeline looks clean and professional.

## Problem
A test lead "Sandra" is showing as "Closed Lost (1)" in the admin dashboard at sselfie.ai/admin/brand-engine-applications. This is confusing and makes the pipeline look broken.

## Scope — ONLY these actions
1. Find the test entry "Sandra" in the brand_engine_applications table (or equivalent)
2. Delete or mark it as a test/hidden entry
3. Verify dashboard shows Closed Lost (0) after fix

## Out of scope
- Do NOT touch any real leads or applications
- Do NOT redesign or refactor the dashboard
- Do NOT touch payment logic, cron jobs, or email flows

## Acceptance criteria
- [ ] Dashboard shows Closed Lost (0)
- [ ] No real leads affected
- [ ] Admin page loads without errors

## Rollback
If anything breaks, restore the entry and leave dashboard as-is. Report back.
