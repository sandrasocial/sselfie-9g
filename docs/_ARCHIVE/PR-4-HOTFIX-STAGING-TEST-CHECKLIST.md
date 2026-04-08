# PR-4 HOTFIX: Staging Test Checklist

**Purpose:** End-to-end verification of Paid Blueprint grid generation flow  
**Date:** 2026-01-09  
**Tester:** Sandra (copy-paste commands, report results)

---

## ✅ PRE-FLIGHT CHECKS

### 1. Verify Database Schema

**Command:**
```bash
# Connect to your database and run:
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'blueprint_subscribers' AND column_name IN ('feed_style', 'paid_blueprint_photo_urls') ORDER BY column_name;"
```

**Expected Output:**
```
       column_name        |   data_type
--------------------------+---------------
 feed_style               | character varying
 paid_blueprint_photo_urls| jsonb
```

**Evidence Location:**
- Schema defined in: `/scripts/create-blueprint-subscribers-table.sql` (line 15)
- Paid columns added in: `/scripts/migrations/add-paid-blueprint-tracking.sql` (line 19)

---

## 🔍 STEP 5A — DATABASE VERIFY

### Query 1: Find Invalid feed_style Values

**Command:**
```bash
psql $DATABASE_URL -f scripts/verify-blueprint-feed-style-data.sql
```

**Or run queries individually:**

```sql
-- Find rows with INVALID feed_style (should be luxury/minimal/beige, not educator/coach/etc)
SELECT 
  id,
  LEFT(email, 3) || '***' AS masked_email,
  feed_style AS current_value,
  form_data->>'vibe' AS category,
  created_at
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL 
  AND feed_style NOT IN ('luxury', 'minimal', 'beige')
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results:**
- ✅ **If 0 rows:** No repair needed, proceed to Step 5B
- ⚠️ **If >0 rows:** Bad data exists, run repair script in Step 5A-FIX

**Report Back:**
- [ ] Number of invalid rows: `_____`
- [ ] Sample invalid values: `_____`

---

### Query 2: Count Affected Rows

```sql
SELECT 
  COUNT(*) AS total_invalid_rows,
  COUNT(DISTINCT feed_style) AS unique_invalid_values
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL 
  AND feed_style NOT IN ('luxury', 'minimal', 'beige');
```

**Report Back:**
- [ ] Total invalid rows: `_____`
- [ ] Unique invalid values: `_____`

---

## 🔧 STEP 5A-FIX — REPAIR BAD DATA (Only if Query 1 found issues)

**Command:**
```bash
psql $DATABASE_URL -f scripts/repair-blueprint-feed-style.sql
```

**What This Does:**
1. Tries to fix using `form_data.selectedFeedStyle` (correct source)
2. Falls back to `form_data.feed_style` if available
3. Sets to NULL if no valid source found
4. Shows BEFORE/AFTER counts

**Expected Output:**
```
NOTICE: BEFORE REPAIR: X rows with invalid feed_style
NOTICE: AFTER REPAIR:
NOTICE:   Invalid rows remaining: 0
NOTICE:   NULL rows: Y
NOTICE:   Valid rows (luxury/minimal/beige): Z
NOTICE: ✅ Repair completed successfully!
```

**Report Back:**
- [ ] Repair script ran successfully: YES / NO
- [ ] Invalid rows remaining: `_____` (should be 0)

---

## 🧪 STEP 5B — PREPARE TEST SUBSCRIBER

### Create Test Subscriber with Valid Data

**Command:**
```bash
psql $DATABASE_URL -f scripts/test-paid-blueprint-staging-checklist.sql
```

**Or run this SQL:**
```sql
INSERT INTO blueprint_subscribers (
  email,
  name,
  access_token,
  form_data,
  feed_style,
  paid_blueprint_purchased,
  paid_blueprint_purchased_at,
  paid_blueprint_photo_urls,
  selfie_image_urls
) VALUES (
  'test-pr4-staging@sselfie.app',
  'Test PR4 User',
  'test-pr4-staging-' || gen_random_uuid()::text,
  '{"vibe": "educator"}'::jsonb,
  'minimal', -- Valid mood
  TRUE,
  NOW(),
  '[]'::jsonb,
  '["https://replicate.delivery/test-1.jpg", "https://replicate.delivery/test-2.jpg"]'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
  feed_style = 'minimal',
  paid_blueprint_purchased = TRUE,
  paid_blueprint_photo_urls = '[]'::jsonb,
  selfie_image_urls = '["https://replicate.delivery/test-1.jpg", "https://replicate.delivery/test-2.jpg"]'::jsonb
RETURNING id, email, access_token;
```

**Report Back:**
- [ ] Test subscriber created: YES / NO
- [ ] Access token: `_____` (save this for API calls)

---

### Verify Test Subscriber

```sql
SELECT 
  id,
  email,
  access_token,
  feed_style AS mood,
  form_data->>'vibe' AS category,
  paid_blueprint_purchased,
  selfie_image_urls,
  paid_blueprint_photo_urls
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';
```

**Expected:**
- `mood`: "minimal"
- `category`: "educator"
- `paid_blueprint_purchased`: true
- `selfie_image_urls`: array with 2 URLs
- `paid_blueprint_photo_urls`: empty array `[]`

**Report Back:**
- [ ] All fields correct: YES / NO

---

## 🚀 STEP 5C — END-TO-END API TEST

**Prerequisites:**
- Dev server running on `http://localhost:3000`
- Test subscriber access token from Step 5B

### Test 1: Get Paid Status

**Command:**
```bash
# Replace TOKEN with your access_token from Step 5B
curl -X GET "http://localhost:3000/api/blueprint/get-paid-status?access=TOKEN"
```

**Expected Response:**
```json
{
  "hasPaid": true,
  "hasGenerated": false,
  "hasFormData": true,
  "selfieImages": ["url1", "url2"],
  "photoUrls": []
}
```

**Report Back:**
- [ ] API returned 200: YES / NO
- [ ] `hasPaid` is true: YES / NO
- [ ] `hasFormData` is true: YES / NO

---

### Test 2: Generate Grid 1

**Command:**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "TOKEN",
    "gridNumber": 1
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "predictionId": "abc123...",
  "gridNumber": 1,
  "status": "starting"
}
```

**Report Back:**
- [ ] API returned 200: YES / NO
- [ ] Got `predictionId`: `_____`
- [ ] Status is "starting" or "processing": YES / NO

---

### Test 3: Poll Grid 1 Status

**Command:**
```bash
# Replace PREDICTION_ID and TOKEN
curl -X GET "http://localhost:3000/api/blueprint/check-paid-grid?predictionId=PREDICTION_ID&gridNumber=1&access=TOKEN"
```

**Poll every 5 seconds until status is "completed" or "failed"**

**Expected Final Response:**
```json
{
  "success": true,
  "status": "completed",
  "gridNumber": 1,
  "gridUrl": "https://...",
  "totalCompleted": 1,
  "allComplete": false
}
```

**Report Back:**
- [ ] Grid completed successfully: YES / NO
- [ ] Got `gridUrl`: `_____`
- [ ] `totalCompleted` is 1: YES / NO

---

### Test 4: Verify Grid 1 in Database

**Command:**
```sql
SELECT 
  email,
  paid_blueprint_photo_urls->0 AS grid_1_url,
  jsonb_array_length(paid_blueprint_photo_urls) AS array_length
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';
```

**Expected:**
- `grid_1_url`: Should be a URL (not null)
- `array_length`: Should be 1 or greater

**Report Back:**
- [ ] Grid 1 URL stored in slot 0: YES / NO
- [ ] URL matches API response: YES / NO

---

### Test 5: Generate Grid 2

**Command:**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "TOKEN",
    "gridNumber": 2
  }'
```

**Then poll:**
```bash
curl -X GET "http://localhost:3000/api/blueprint/check-paid-grid?predictionId=PREDICTION_ID&gridNumber=2&access=TOKEN"
```

**Report Back:**
- [ ] Grid 2 completed: YES / NO
- [ ] `totalCompleted` is 2: YES / NO

---

### Test 6: Generate Grid 3

**Command:**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "TOKEN",
    "gridNumber": 3
  }'
```

**Then poll until complete.**

**Report Back:**
- [ ] Grid 3 completed: YES / NO
- [ ] `totalCompleted` is 3: YES / NO

---

### Test 7: Verify All 3 Grids in Database

**Command:**
```sql
SELECT 
  email,
  paid_blueprint_photo_urls->0 IS NOT NULL AS has_grid_1,
  paid_blueprint_photo_urls->1 IS NOT NULL AS has_grid_2,
  paid_blueprint_photo_urls->2 IS NOT NULL AS has_grid_3,
  jsonb_array_length(paid_blueprint_photo_urls) AS array_length,
  paid_blueprint_photo_urls
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';
```

**Expected:**
- All 3 grids: true
- Array length: 3 or greater

**Report Back:**
- [ ] All 3 grids stored: YES / NO
- [ ] Array structure correct: YES / NO

---

## 🔒 STEP 5D — IDEMPOTENCY TEST

### Test 8: Re-run Grid 1 Generation (Should Not Overwrite)

**Save current Grid 1 URL first:**
```sql
SELECT paid_blueprint_photo_urls->0 AS original_grid_1_url
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';
```

**Report Back:**
- [ ] Original Grid 1 URL: `_____`

---

**Now re-run Grid 1 generation:**
```bash
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "TOKEN",
    "gridNumber": 1
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Grid 1 already generated",
  "gridUrl": "https://...",
  "status": "completed"
}
```

**Report Back:**
- [ ] API returned "already generated" message: YES / NO
- [ ] Did NOT create new prediction: YES / NO

---

**Verify Grid 1 URL unchanged:**
```sql
SELECT 
  paid_blueprint_photo_urls->0 AS current_grid_1_url,
  paid_blueprint_photo_urls->0 = 'PASTE_ORIGINAL_URL_HERE' AS urls_match
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';
```

**Report Back:**
- [ ] Grid 1 URL unchanged: YES / NO
- [ ] Idempotency preserved: YES / NO

---

## 🏁 STEP 5E — CONCURRENCY TEST (Optional, Advanced)

**Scenario:** Simulate two polls completing at the same time for the same grid.

**This is difficult to test manually. Instead, verify the idempotency guard in code:**

**File:** `/app/api/blueprint/check-paid-grid/route.ts`  
**Lines 123-132:**

```typescript
await sql`
  UPDATE blueprint_subscribers
  SET paid_blueprint_photo_urls = ${JSON.stringify(existingPhotoUrls)}::jsonb,
      updated_at = NOW()
  WHERE access_token = ${accessToken}
  AND (
    paid_blueprint_photo_urls IS NULL 
    OR paid_blueprint_photo_urls->>${targetIndex} IS NULL
  )
`
```

**Guard Explanation:**
- Only updates if slot is NULL
- If two polls try to write simultaneously, only first succeeds
- Second poll's WHERE clause fails (slot no longer NULL)
- No data loss, no overwrite

**Report Back:**
- [ ] Idempotency guard verified in code: YES / NO

---

## 🧹 CLEANUP

**After all tests pass:**

```sql
-- Option 1: Delete test subscriber
DELETE FROM blueprint_subscribers WHERE email = 'test-pr4-staging@sselfie.app';

-- Option 2: Reset for re-testing
UPDATE blueprint_subscribers
SET 
  paid_blueprint_photo_urls = '[]'::jsonb,
  paid_blueprint_generated = FALSE
WHERE email = 'test-pr4-staging@sselfie.app';
```

---

## 📊 FINAL SUMMARY

**Sandra, fill this out after completing all tests:**

### Test Results
- [ ] Database schema verified
- [ ] Invalid feed_style data found: YES / NO (if yes, repaired: YES / NO)
- [ ] Test subscriber created successfully
- [ ] Grid 1 generated and stored
- [ ] Grid 2 generated and stored
- [ ] Grid 3 generated and stored
- [ ] All 3 grids verified in database
- [ ] Idempotency test passed (no overwrite)
- [ ] Concurrency guard verified in code

### Issues Found
- Issue 1: `_____`
- Issue 2: `_____`
- Issue 3: `_____`

### Overall Status
- [ ] ✅ All tests passed — READY FOR PRODUCTION
- [ ] ⚠️ Minor issues found — needs patch
- [ ] ❌ Critical issues found — needs rework

---

## 📁 FILES CREATED FOR THIS TEST

1. `/scripts/verify-blueprint-feed-style-data.sql` — Data quality checks
2. `/scripts/repair-blueprint-feed-style.sql` — Fix invalid feed_style values
3. `/scripts/test-paid-blueprint-staging-checklist.sql` — SQL helpers for testing
4. `/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md` — This checklist

---

## 🔗 EVIDENCE REFERENCES

### Database Schema
- **feed_style column:** `/scripts/create-blueprint-subscribers-table.sql` line 15
  - Type: `VARCHAR(50)`
  - Valid values: 'luxury', 'minimal', 'beige', NULL

- **paid_blueprint_photo_urls column:** `/scripts/migrations/add-paid-blueprint-tracking.sql` line 19
  - Type: `JSONB`
  - Default: `'[]'::jsonb`
  - Structure: Array of strings (URLs)

### API Routes
- **Get Paid Status:** `/app/api/blueprint/get-paid-status/route.ts` line 38 (fetches feed_style)
- **Generate Paid:** `/app/api/blueprint/generate-paid/route.ts` line 103 (reads mood)
- **Check Paid Grid:** `/app/api/blueprint/check-paid-grid/route.ts` lines 111-132 (writes to JSONB array)

### Helper Functions
- **Nano Banana Client:** `/lib/nano-banana-client.ts` lines 153-176 (checkNanoBananaPrediction)
- **Output handling:** Lines 161-169 (handles array or string output)

### Bug Fix
- **Subscribe Route:** `/app/api/blueprint/subscribe/route.ts`
  - Line 17: Extract `selectedFeedStyle` from request
  - Line 48: Store in `feed_style` column (UPDATE)
  - Line 92: Store in `feed_style` column (INSERT)

---

**End of Staging Test Checklist**
