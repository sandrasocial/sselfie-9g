# BUG FIX — M-10 Brand Engine Broadcast Bootstrap Error
Priority: URGENT — blocks email send today
Error: "Failed to bootstrap Brand Engine broadcast"
Shown in: /admin/marketing Brand Engine Broadcast panel

## What's happening
Clicking "Create Draft" in the Brand Engine Broadcast panel returns:
"Failed to bootstrap Brand Engine broadcast"

The POST handler in:
app/api/admin/marketing/brand-engine-broadcast/route.ts

Is failing when trying to INSERT into admin_email_campaigns.

## Most likely causes (check in this order)

1. The `created_by` column may not exist in admin_email_campaigns
   — The INSERT uses `created_by` but this column may be missing from the table schema
   — Fix: Check if column exists, if not either add it or remove it from the INSERT

2. The `target_audience` column may not accept jsonb or may not exist
   — The INSERT casts `${targetAudience}::jsonb`
   — Fix: Verify column type, adjust cast if needed

3. A required NOT NULL column is missing from the INSERT statement
   — Check admin_email_campaigns schema for any NOT NULL columns
      not included in the INSERT

## How to fix
1. Run: SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'admin_email_campaigns'
         ORDER BY ordinal_position;

2. Compare columns in INSERT statement against actual schema

3. Fix the mismatch — either:
   a. Remove `created_by` from INSERT if column doesn't exist, OR
   b. Add migration to create the column if it should exist

4. Test by hitting POST /api/admin/marketing/brand-engine-broadcast
   and confirming campaign row is created in database

## Critical
Do NOT change the email content, subject line, or CTA URL.
Do NOT change the send logic.
Only fix the database INSERT/UPDATE to match actual schema.

## Acceptance criteria
- [ ] POST /api/admin/marketing/brand-engine-broadcast returns success
- [ ] Campaign row created in admin_email_campaigns
- [ ] Campaign status shows as "draft" in admin panel
- [ ] No "Failed to bootstrap" error
- [ ] Preview button becomes active after draft created
