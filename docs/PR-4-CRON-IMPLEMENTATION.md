# PR-4: Extend Cron Job for Paid Blueprint Followups
**Date:** 2026-01-09  
**Status:** ✅ Complete  
**File Modified:** `/app/api/cron/send-blueprint-followups/route.ts`

---

## 📋 INVESTIGATION FINDINGS

### Existing Cron Job Patterns

**File:** `/app/api/cron/send-blueprint-followups/route.ts`

**Patterns:**
- Uses bounded time windows: `created_at <= NOW() - INTERVAL 'X days' AND created_at > NOW() - INTERVAL 'X+1 days'`
- Deduplication: Checks `email_logs` table via LEFT JOIN + WHERE `el.id IS NULL`
- Flag updates: Updates `day_X_email_sent` and `day_X_email_sent_at` after successful send
- Error handling: Wrapped in try-catch, uses `logAdminError` for failures
- Results tracking: Returns summary with found/sent/failed/skipped counts
- Auth: Uses `CRON_SECRET` environment variable (Bearer token)

**FREE Blueprint Pattern:**
- Day 3: 3-4 days after `created_at`
- Day 7: 7-8 days after `created_at`
- Day 14: 14-15 days after `created_at`
- Checks: `welcome_email_sent = TRUE` (only send to subscribers who got welcome email)

---

### Studio Membership Exclusion Logic

**Evidence:**
- File: `/lib/subscription.ts`
- Function: `hasStudioMembership(userId)` checks:
  - `subscriptions` table
  - `product_type = 'sselfie_studio_membership'`
  - `status = 'active'`

**Join Pattern (from `blueprint-discovery-funnel` cron):**
```sql
LEFT JOIN users u ON u.email = bs.email
LEFT JOIN subscriptions s ON s.user_id = u.id 
  AND s.product_type = 'sselfie_studio_membership' 
  AND s.status = 'active'
WHERE s.id IS NULL  -- Exclude if active Studio membership exists
```

**Decision:**
- Use email-based join: `blueprint_subscribers.email` → `users.email` → `users.id` → `subscriptions.user_id`
- Exclude if `subscriptions.id IS NOT NULL` (active Studio membership found)
- This is safe because:
  - `users.email` is UNIQUE (from schema)
  - Only checks `status = 'active'` subscriptions
  - Only checks `product_type = 'sselfie_studio_membership'`

---

## ✅ IMPLEMENTATION

### Changes Made

**1. Imports Added (lines 5-7):**
```typescript
import { generatePaidBlueprintDay1Email, PAID_BLUEPRINT_DAY1_SUBJECT } from "@/lib/email/templates/paid-blueprint-day-1"
import { generatePaidBlueprintDay3Email, PAID_BLUEPRINT_DAY3_SUBJECT } from "@/lib/email/templates/paid-blueprint-day-3"
import { generatePaidBlueprintDay7Email, PAID_BLUEPRINT_DAY7_SUBJECT } from "@/lib/email/templates/paid-blueprint-day-7"
```

**2. Results Object Extended (lines 50-56):**
```typescript
paidDay1: { found: 0, sent: 0, failed: 0, skipped: 0 },
paidDay3: { found: 0, sent: 0, failed: 0, skipped: 0 },
paidDay7: { found: 0, sent: 0, failed: 0, skipped: 0 },
```

**3. Three New Query+Send Blocks Added:**

**Day 1 Paid (24h after purchase):**
- Query: `paid_blueprint_purchased_at <= NOW() - INTERVAL '1 day' AND paid_blueprint_purchased_at > NOW() - INTERVAL '2 days'`
- Checks: `day_1_paid_email_sent = FALSE`, `paid_blueprint_purchased = TRUE`
- Excludes: Active Studio members via LEFT JOIN
- Updates: `day_1_paid_email_sent = TRUE`, `day_1_paid_email_sent_at = NOW()`

**Day 3 Paid (72h after purchase):**
- Query: `paid_blueprint_purchased_at <= NOW() - INTERVAL '3 days' AND paid_blueprint_purchased_at > NOW() - INTERVAL '4 days'`
- Checks: `day_3_paid_email_sent = FALSE`, `paid_blueprint_purchased = TRUE`
- Excludes: Active Studio members via LEFT JOIN
- Updates: `day_3_paid_email_sent = TRUE`, `day_3_paid_email_sent_at = NOW()`

**Day 7 Paid (168h after purchase):**
- Query: `paid_blueprint_purchased_at <= NOW() - INTERVAL '7 days' AND paid_blueprint_purchased_at > NOW() - INTERVAL '8 days'`
- Checks: `day_7_paid_email_sent = FALSE`, `paid_blueprint_purchased = TRUE`
- Excludes: Active Studio members via LEFT JOIN
- Updates: `day_7_paid_email_sent = TRUE`, `day_7_paid_email_sent_at = NOW()`

**4. Total Counts Updated:**
- Includes paid followups in `totalSent`, `totalFailed`, `totalSkipped`
- Added to `cronLogger.success()` payload
- Added to response JSON `summary` object

---

## 🔒 MEMBERSHIP EXCLUSION RULE

**Rule Used:**
```sql
LEFT JOIN users u ON u.email = bs.email
LEFT JOIN subscriptions s ON s.user_id = u.id 
  AND s.product_type = 'sselfie_studio_membership' 
  AND s.status = 'active'
WHERE s.id IS NULL  -- Exclude if subscription found
```

**Evidence:**
- Table: `subscriptions` (from `/lib/subscription.ts`)
- Columns: `user_id`, `product_type`, `status`
- Product type: `'sselfie_studio_membership'` (from `/lib/subscription.ts` line 3)
- Status: `'active'` (from `/lib/subscription.ts` line 4)
- Join path: `blueprint_subscribers.email` → `users.email` → `users.id` → `subscriptions.user_id`

**Why This Works:**
- `users.email` is UNIQUE (enforced by schema)
- Only checks active subscriptions (not canceled/expired)
- Only checks Studio membership (not other product types)
- LEFT JOIN ensures subscribers without users table entries are still included

---

## 🧪 TEST PLAN

### SQL Test Data Setup

```sql
-- Create test subscribers for Day 1 (25 hours ago)
INSERT INTO blueprint_subscribers (
  email, name, access_token, paid_blueprint_purchased, 
  paid_blueprint_purchased_at, day_1_paid_email_sent
) VALUES (
  'test-day1@example.com',
  'Test Day1',
  'test-token-day1-12345',
  TRUE,
  NOW() - INTERVAL '25 hours',
  FALSE
) ON CONFLICT (email) DO UPDATE SET
  paid_blueprint_purchased = TRUE,
  paid_blueprint_purchased_at = NOW() - INTERVAL '25 hours',
  day_1_paid_email_sent = FALSE,
  access_token = 'test-token-day1-12345';

-- Create test subscriber for Day 3 (73 hours ago)
INSERT INTO blueprint_subscribers (
  email, name, access_token, paid_blueprint_purchased, 
  paid_blueprint_purchased_at, day_3_paid_email_sent
) VALUES (
  'test-day3@example.com',
  'Test Day3',
  'test-token-day3-12345',
  TRUE,
  NOW() - INTERVAL '73 hours',
  FALSE
) ON CONFLICT (email) DO UPDATE SET
  paid_blueprint_purchased = TRUE,
  paid_blueprint_purchased_at = NOW() - INTERVAL '73 hours',
  day_3_paid_email_sent = FALSE,
  access_token = 'test-token-day3-12345';

-- Create test subscriber for Day 7 (169 hours ago)
INSERT INTO blueprint_subscribers (
  email, name, access_token, paid_blueprint_purchased, 
  paid_blueprint_purchased_at, day_7_paid_email_sent
) VALUES (
  'test-day7@example.com',
  'Test Day7',
  'test-token-day7-12345',
  TRUE,
  NOW() - INTERVAL '169 hours',
  FALSE
) ON CONFLICT (email) DO UPDATE SET
  paid_blueprint_purchased = TRUE,
  paid_blueprint_purchased_at = NOW() - INTERVAL '169 hours',
  day_7_paid_email_sent = FALSE,
  access_token = 'test-token-day7-12345';

-- Create test subscriber with active Studio membership (should be excluded)
-- First, create user if not exists
INSERT INTO users (id, email, created_at, updated_at)
VALUES (
  'test-studio-user-id',
  'test-studio-member@example.com',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create subscription for Studio member
INSERT INTO subscriptions (
  user_id, product_type, status, created_at, updated_at
)
SELECT 
  id,
  'sselfie_studio_membership',
  'active',
  NOW(),
  NOW()
FROM users
WHERE email = 'test-studio-member@example.com'
ON CONFLICT DO NOTHING;

-- Create paid blueprint subscriber who is also Studio member (should be excluded)
INSERT INTO blueprint_subscribers (
  email, name, access_token, paid_blueprint_purchased, 
  paid_blueprint_purchased_at, day_1_paid_email_sent
) VALUES (
  'test-studio-member@example.com',
  'Studio Member',
  'test-token-studio-12345',
  TRUE,
  NOW() - INTERVAL '25 hours',
  FALSE
) ON CONFLICT (email) DO UPDATE SET
  paid_blueprint_purchased = TRUE,
  paid_blueprint_purchased_at = NOW() - INTERVAL '25 hours',
  day_1_paid_email_sent = FALSE,
  access_token = 'test-token-studio-12345';
```

### Local Test Command

```bash
# Set CRON_SECRET if not already set
export CRON_SECRET="your-cron-secret-here"

# Run cron job locally
curl -X GET http://localhost:3000/api/cron/send-blueprint-followups \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Blueprint follow-ups sent: X successful, 0 failed, 0 skipped",
  "summary": {
    "day3": { "found": 0, "sent": 0, "failed": 0, "skipped": 0 },
    "day7": { "found": 0, "sent": 0, "failed": 0, "skipped": 0 },
    "day14": { "found": 0, "sent": 0, "failed": 0, "skipped": 0 },
    "paidDay1": { "found": 1, "sent": 1, "failed": 0, "skipped": 0 },
    "paidDay3": { "found": 1, "sent": 1, "failed": 0, "skipped": 0 },
    "paidDay7": { "found": 1, "sent": 1, "failed": 0, "skipped": 0 },
    "totalSent": 3,
    "totalFailed": 0,
    "totalSkipped": 0
  },
  "errors": [],
  "totalErrors": 0
}
```

### Verification Queries

**1. Check email_logs:**
```sql
SELECT user_email, email_type, status, sent_at
FROM email_logs
WHERE user_email IN (
  'test-day1@example.com',
  'test-day3@example.com',
  'test-day7@example.com',
  'test-studio-member@example.com'
)
AND email_type LIKE 'paid-blueprint-day-%'
ORDER BY sent_at DESC;
```

**Expected:** 3 rows (one per day), `test-studio-member@example.com` should NOT appear

**2. Check blueprint_subscribers flags:**
```sql
SELECT 
  email,
  day_1_paid_email_sent,
  day_1_paid_email_sent_at,
  day_3_paid_email_sent,
  day_3_paid_email_sent_at,
  day_7_paid_email_sent,
  day_7_paid_email_sent_at
FROM blueprint_subscribers
WHERE email IN (
  'test-day1@example.com',
  'test-day3@example.com',
  'test-day7@example.com'
);
```

**Expected:** All flags should be `TRUE`, timestamps should be recent

**3. Verify deduplication (rerun cron):**
```bash
# Run cron again immediately
curl -X GET http://localhost:3000/api/cron/send-blueprint-followups \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected:** `skipped: 3` for paidDay1/paidDay3/paidDay7, no new emails sent

---

## ✅ ACCEPTANCE CRITERIA

- [x] Paid followups send at correct intervals (1 day, 3 days, 7 days after purchase)
- [x] No duplicates on rerun (dedupe via email_logs + flags)
- [x] Does not affect FREE blueprint followups (separate queries)
- [x] Excludes active Studio members (LEFT JOIN + WHERE s.id IS NULL)
- [x] All emails link back to `/blueprint/paid` with access token
- [x] Uses same patterns as FREE blueprint cron (bounded windows, dedupe, error handling)
- [x] Updates flags in blueprint_subscribers after successful send
- [x] Logs to email_logs automatically (via sendEmail)
- [x] Results included in summary response

---

## 📝 CODE DIFF SUMMARY

**Lines Added:** ~250 lines (3 new query+send blocks)

**Key Changes:**
1. Imports: 3 new template imports
2. Results object: Added `paidDay1`, `paidDay3`, `paidDay7` tracking
3. Three new blocks: Day 1, Day 3, Day 7 paid followups
4. Totals updated: Include paid followups in aggregate counts
5. Response updated: Include paid followups in summary JSON

**No Breaking Changes:**
- FREE blueprint followups unchanged
- Existing error handling preserved
- Auth mechanism unchanged
- Response format extended (backward compatible)

---

**Ready for:** Testing and deployment
