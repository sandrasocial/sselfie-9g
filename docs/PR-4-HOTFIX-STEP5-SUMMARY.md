# PR-4 HOTFIX: Step 5 Summary — Staging Test Materials

**Status:** ✅ Ready for Sandra to execute tests  
**Date:** 2026-01-09  
**What Changed:** 1 file modified, 4 test files created

---

## 📋 WHAT YOU NEED TO DO

Sandra, I've prepared everything for you to test. Here's what to do:

### 1️⃣ Check Your Database for Bad Data

**Copy-paste this command:**
```bash
psql $DATABASE_URL -f scripts/verify-blueprint-feed-style-data.sql
```

**What it does:** Checks if any subscribers have invalid `feed_style` values (like "educator" instead of "minimal")

**Report back:** How many rows have bad data?

---

### 2️⃣ Fix Bad Data (If Step 1 Found Issues)

**Copy-paste this command:**
```bash
psql $DATABASE_URL -f scripts/repair-blueprint-feed-style.sql
```

**What it does:** Automatically fixes invalid values using the correct source

**Report back:** Did it say "✅ Repair completed successfully"?

---

### 3️⃣ Run Full Staging Test

**Open this file and follow step-by-step:**
```
/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md
```

**What it tests:**
- ✅ Generate Grid 1, 2, 3
- ✅ Verify database writes
- ✅ Test idempotency (no overwrites)
- ✅ Confirm mood values work correctly

**Report back:** Fill out the checkboxes in the document

---

## 📁 FILES I CREATED FOR YOU

| File | Purpose | When to Use |
|------|---------|-------------|
| `/scripts/verify-blueprint-feed-style-data.sql` | Check for bad data | Run first (Step 1) |
| `/scripts/repair-blueprint-feed-style.sql` | Fix bad data | Run if Step 1 finds issues |
| `/scripts/test-paid-blueprint-staging-checklist.sql` | SQL helpers for testing | Used by main checklist |
| `/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md` | **Main test guide** | Follow this step-by-step |
| `/docs/PR-4-HOTFIX-STEP5-SUMMARY.md` | This summary | Read first |

---

## 🔍 STEP 5A — DATABASE EVIDENCE

### Schema Confirmation

**File:** `/scripts/create-blueprint-subscribers-table.sql`

**Line 15:**
```sql
feed_style VARCHAR(50),
```

✅ Column exists  
✅ Type: VARCHAR(50)  
✅ Valid values: 'luxury', 'minimal', 'beige', NULL

**File:** `/scripts/migrations/add-paid-blueprint-tracking.sql`

**Line 19:**
```sql
ADD COLUMN IF NOT EXISTS paid_blueprint_photo_urls JSONB DEFAULT '[]'::jsonb,
```

✅ Column exists  
✅ Type: JSONB  
✅ Structure: Array of strings (URLs)  
✅ Default: Empty array

---

### Data Quality Queries

**Query 1: Find Invalid Values**
```sql
SELECT 
  id,
  email,
  feed_style,
  form_data->>'vibe' AS category
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL 
  AND feed_style NOT IN ('luxury', 'minimal', 'beige')
ORDER BY created_at DESC;
```

**What to look for:**
- If 0 rows: ✅ No bad data
- If >0 rows: ⚠️ Run repair script

---

**Query 2: Count Affected Rows**
```sql
SELECT 
  COUNT(*) AS total_invalid_rows
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL 
  AND feed_style NOT IN ('luxury', 'minimal', 'beige');
```

---

**Query 3: Sample Bad Data**
```sql
SELECT 
  LEFT(email, 3) || '***' AS masked_email,
  feed_style AS bad_value,
  form_data->>'vibe' AS category,
  form_data->>'selectedFeedStyle' AS correct_mood
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL 
  AND feed_style NOT IN ('luxury', 'minimal', 'beige')
LIMIT 10;
```

**What you'll see:**
- `bad_value`: "educator", "coach", etc. (WRONG — this is category)
- `correct_mood`: "minimal", "luxury", etc. (RIGHT — this is mood)

---

## 🔧 STEP 5B — REPAIR SCRIPT (IF NEEDED)

**File:** `/scripts/repair-blueprint-feed-style.sql`

**What it does:**
1. Tries `form_data.selectedFeedStyle` first (correct source)
2. Falls back to `form_data.feed_style` if available
3. Sets NULL if no valid source found
4. Shows before/after counts

**Safety features:**
- ✅ Idempotent (safe to run multiple times)
- ✅ Only fixes invalid rows
- ✅ Doesn't guess values
- ✅ Shows detailed output

**Expected output:**
```
NOTICE: BEFORE REPAIR: 15 rows with invalid feed_style
NOTICE: AFTER REPAIR:
NOTICE:   Invalid rows remaining: 0
NOTICE:   NULL rows: 3
NOTICE:   Valid rows (luxury/minimal/beige): 12
NOTICE: ✅ Repair completed successfully!
```

---

## 🧪 STEP 5C — END-TO-END TEST CHECKLIST

**File:** `/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md`

### Test Flow:

```
1. Create test subscriber
   ↓
2. Call GET /api/blueprint/get-paid-status
   ↓
3. Call POST /api/blueprint/generate-paid (Grid 1)
   ↓
4. Poll GET /api/blueprint/check-paid-grid (until complete)
   ↓
5. Verify Grid 1 in database (slot 0)
   ↓
6. Repeat for Grid 2 (slot 1)
   ↓
7. Repeat for Grid 3 (slot 2)
   ↓
8. Verify all 3 grids in database
   ↓
9. Re-run Grid 1 (test idempotency)
   ↓
10. Verify Grid 1 NOT overwritten
```

### What You'll Test:

| Test | What It Verifies | Expected Result |
|------|------------------|-----------------|
| Get Paid Status | API reads correct data | `hasPaid: true`, `hasFormData: true` |
| Generate Grid 1 | Prompt generation works | Returns `predictionId` |
| Poll Grid 1 | Replicate polling works | Returns `gridUrl` when complete |
| DB Check Grid 1 | JSONB write works | `paid_blueprint_photo_urls[0]` has URL |
| Generate Grid 2 | Multiple grids work | `totalCompleted: 2` |
| Generate Grid 3 | Array expansion works | `totalCompleted: 3` |
| Re-run Grid 1 | Idempotency guard works | Returns existing URL, no new prediction |
| DB Check Again | No overwrite occurred | Grid 1 URL unchanged |

---

## 🔒 STEP 5D — IDEMPOTENCY VERIFICATION

**What We're Testing:** If you try to generate Grid 1 twice, it should NOT overwrite the first grid.

**How It Works:**

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

**The Guard:**
- Line 129-130: `OR paid_blueprint_photo_urls->>${targetIndex} IS NULL`
- This means: "Only update if slot is empty"
- If Grid 1 already exists, the WHERE clause fails
- No overwrite happens

**Test Steps:**
1. Generate Grid 1 → save URL
2. Re-run Grid 1 generation
3. Check database → URL should be SAME
4. Check API response → should say "already generated"

---

## 🏁 STEP 5E — CONCURRENCY TEST

**Scenario:** Two polls complete at the exact same time for the same grid.

**What Could Go Wrong:**
- Both polls read empty slot
- Both polls try to write
- One overwrites the other
- We lose a grid URL

**How We Prevent It:**

The idempotency guard (lines 128-131) uses a **database-level atomic check**:

```sql
WHERE access_token = ${accessToken}
AND paid_blueprint_photo_urls->>${targetIndex} IS NULL
```

**What Happens:**
1. Poll A reads slot 0 (empty)
2. Poll B reads slot 0 (empty) — race condition!
3. Poll A writes to slot 0 → WHERE clause succeeds
4. Poll B tries to write to slot 0 → WHERE clause FAILS (slot no longer NULL)
5. Only Poll A's write succeeds
6. No data loss

**Manual Test (Optional):**
This is hard to test manually. Instead, verify:
- ✅ Code has the guard (lines 128-131)
- ✅ Idempotency test passes (Step 5C, Test 9)

---

## 📊 OUTPUT FORMAT VERIFICATION

**File:** `/lib/nano-banana-client.ts`

**Lines 153-176:** `checkNanoBananaPrediction` function

**Lines 161-169:**
```typescript
// Handle array or string output
let output: string | undefined
if (prediction.output) {
  if (Array.isArray(prediction.output)) {
    output = prediction.output[0] ? String(prediction.output[0]) : undefined
  } else {
    output = String(prediction.output)
  }
}
```

**What This Means:**
- ✅ Replicate can return array OR string
- ✅ We handle both cases
- ✅ Always return a single string URL
- ✅ Used correctly in `check-paid-grid/route.ts` line 87

**Return Type (Lines 17-22):**
```typescript
export interface NanoBananaOutput {
  predictionId: string
  status: "starting" | "processing" | "succeeded" | "failed"
  output?: string // Image URL when succeeded
  error?: string
}
```

✅ `output` is a string URL (or undefined)

---

## 🎯 WHAT TO REPORT BACK

After running the tests, tell me:

### 1. Data Quality Check
- [ ] Ran verify script: YES / NO
- [ ] Found invalid rows: YES / NO (if yes, how many?)
- [ ] Ran repair script: YES / NO (if needed)
- [ ] Repair successful: YES / NO

### 2. API Tests
- [ ] Grid 1 generated: YES / NO
- [ ] Grid 2 generated: YES / NO
- [ ] Grid 3 generated: YES / NO
- [ ] All 3 in database: YES / NO

### 3. Idempotency Test
- [ ] Re-ran Grid 1: YES / NO
- [ ] Grid 1 NOT overwritten: YES / NO
- [ ] API said "already generated": YES / NO

### 4. Issues Found
- Issue 1: `_____`
- Issue 2: `_____`
- Issue 3: `_____`

### 5. Overall Status
- [ ] ✅ All tests passed — READY FOR PRODUCTION
- [ ] ⚠️ Minor issues — needs small patch
- [ ] ❌ Critical issues — needs rework

---

## 🔗 QUICK REFERENCE

### Files Modified (Code Changes)
1. `/app/api/blueprint/subscribe/route.ts` — Fixed feed_style storage (3 lines)

### Files Created (Test Materials)
1. `/scripts/verify-blueprint-feed-style-data.sql` — Data quality checks
2. `/scripts/repair-blueprint-feed-style.sql` — Repair script
3. `/scripts/test-paid-blueprint-staging-checklist.sql` — SQL helpers
4. `/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md` — **Main test guide**
5. `/docs/PR-4-HOTFIX-STEP5-SUMMARY.md` — This summary

### Evidence Locations
- Schema: `/scripts/create-blueprint-subscribers-table.sql` line 15
- Paid columns: `/scripts/migrations/add-paid-blueprint-tracking.sql` line 19
- JSONB write: `/app/api/blueprint/check-paid-grid/route.ts` lines 111-132
- Idempotency guard: `/app/api/blueprint/check-paid-grid/route.ts` lines 128-131
- Output handling: `/lib/nano-banana-client.ts` lines 161-169
- Bug fix: `/app/api/blueprint/subscribe/route.ts` lines 17, 48, 92

---

## ⏭️ NEXT STEPS

1. **You:** Run data verification (Step 5A)
2. **You:** Run repair if needed (Step 5A-FIX)
3. **You:** Follow staging test checklist (Step 5C)
4. **You:** Report results back to me
5. **Me:** Review results, apply any patches if needed
6. **Together:** Make go/no-go decision for production

---

**Sandra, start with the main checklist:**
```
/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md
```

Copy-paste commands, report results. I'll be here to help if anything breaks.

---

**End of Step 5 Summary**
