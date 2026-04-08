# PR-4 HOTFIX: Step 5 Complete Index

**Status:** ✅ All Materials Ready  
**Date:** 2026-01-09  
**Next Action:** Sandra runs tests and reports results

---

## 🎯 START HERE

**Sandra, follow this order:**

1. **Read:** `/docs/PR-4-HOTFIX-STEP5-EXEC-SUMMARY.md` (Quick overview)
2. **Run:** Data verification queries (Step 5A)
3. **Run:** Repair script if needed (Step 5A-FIX)
4. **Follow:** `/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md` (Main test guide)
5. **Report:** Results back to engineering team

---

## 📁 ALL FILES CREATED

### Documentation (3 files)
```
✅ /docs/PR-4-HOTFIX-STEP5-EXEC-SUMMARY.md
   → Quick executive summary with all evidence

✅ /docs/PR-4-HOTFIX-STEP5-SUMMARY.md
   → Detailed explanation for Sandra

✅ /docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md
   → Step-by-step test guide (MAIN GUIDE)
```

### SQL Scripts (3 files)
```
✅ /scripts/verify-blueprint-feed-style-data.sql
   → 5 queries to check data quality

✅ /scripts/repair-blueprint-feed-style.sql
   → Idempotent repair script with safety checks

✅ /scripts/test-paid-blueprint-staging-checklist.sql
   → SQL helpers for staging tests
```

### Index (1 file)
```
✅ /docs/PR-4-HOTFIX-STEP5-INDEX.md
   → This file
```

---

## 🔍 WHAT WAS VERIFIED IN STEP 5

### ✅ STEP 5A — Database Evidence
- [x] Schema confirmed: `feed_style` column exists (VARCHAR(50))
- [x] Schema confirmed: `paid_blueprint_photo_urls` column exists (JSONB)
- [x] Data quality queries prepared (5 queries)
- [x] Repair script created (idempotent, safe)

**Files:**
- Evidence: `/scripts/create-blueprint-subscribers-table.sql` line 15
- Evidence: `/scripts/migrations/add-paid-blueprint-tracking.sql` line 19
- Queries: `/scripts/verify-blueprint-feed-style-data.sql`
- Repair: `/scripts/repair-blueprint-feed-style.sql`

---

### ✅ STEP 5B — Repair Script
- [x] Idempotent (safe to run multiple times)
- [x] Only fixes invalid rows
- [x] Uses correct source (`form_data.selectedFeedStyle`)
- [x] Falls back to `form_data.feed_style`
- [x] Sets NULL if no valid source (doesn't guess)
- [x] Shows before/after counts

**File:** `/scripts/repair-blueprint-feed-style.sql`

---

### ✅ STEP 5C — End-to-End Test Checklist
- [x] Test subscriber creation SQL
- [x] API test procedures (12 tests)
- [x] Database verification queries
- [x] Idempotency test procedure
- [x] Success criteria defined
- [x] Cleanup procedures

**File:** `/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md`

**Test Coverage:**
1. Database schema verification
2. Data quality check
3. Test subscriber creation
4. GET /api/blueprint/get-paid-status
5. POST /api/blueprint/generate-paid (Grid 1)
6. Poll GET /api/blueprint/check-paid-grid
7. Database verification (Grid 1)
8. Generate Grid 2
9. Generate Grid 3
10. Database verification (All 3 grids)
11. Re-run Grid 1 (idempotency test)
12. Verify no overwrite

---

### ✅ STEP 5D — Idempotency Verification
- [x] Code guard verified: `/app/api/blueprint/check-paid-grid/route.ts` lines 128-131
- [x] Test procedure documented
- [x] Expected behavior defined
- [x] Database-level atomic check confirmed

**Guard Logic:**
```typescript
WHERE access_token = ${accessToken}
AND (
  paid_blueprint_photo_urls IS NULL 
  OR paid_blueprint_photo_urls->>${targetIndex} IS NULL
)
```

**What It Does:**
- Only updates if slot is NULL
- Prevents overwrites
- Handles concurrent requests safely

---

### ✅ STEP 5E — Concurrency Test
- [x] Race condition scenario documented
- [x] Protection mechanism explained
- [x] Verification steps provided
- [x] Atomic database check confirmed

**Protection:**
- Database-level WHERE clause
- Only first write succeeds
- Second write fails gracefully
- No data loss

---

## 📊 EVIDENCE LOCATIONS

### Database Schema
| What | File | Line |
|------|------|------|
| `feed_style` column | `/scripts/create-blueprint-subscribers-table.sql` | 15 |
| `paid_blueprint_photo_urls` column | `/scripts/migrations/add-paid-blueprint-tracking.sql` | 19 |

### Code References
| What | File | Lines |
|------|------|-------|
| JSONB write logic | `/app/api/blueprint/check-paid-grid/route.ts` | 111-132 |
| Idempotency guard | `/app/api/blueprint/check-paid-grid/route.ts` | 128-131 |
| Output handling | `/lib/nano-banana-client.ts` | 161-169 |
| Bug fix (subscribe) | `/app/api/blueprint/subscribe/route.ts` | 17, 48, 92 |
| Mood usage (generate) | `/app/api/blueprint/generate-paid/route.ts` | 103 |
| Mood fetch (status) | `/app/api/blueprint/get-paid-status/route.ts` | 38 |

---

## 🎯 SANDRA'S CHECKLIST

### Pre-Flight
- [ ] Read executive summary
- [ ] Understand what was changed (1 file, 3 lines)
- [ ] Understand what's being tested

### Step 5A: Data Verification
- [ ] Run: `psql $DATABASE_URL -f scripts/verify-blueprint-feed-style-data.sql`
- [ ] Report: Number of invalid rows found
- [ ] Report: Sample invalid values

### Step 5A-FIX: Repair (If Needed)
- [ ] Run: `psql $DATABASE_URL -f scripts/repair-blueprint-feed-style.sql`
- [ ] Report: Repair completed successfully (YES/NO)
- [ ] Report: Invalid rows remaining (should be 0)

### Step 5C: Staging Tests
- [ ] Open: `/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md`
- [ ] Complete: All 12 tests
- [ ] Fill out: All checkboxes
- [ ] Report: Test results

### Final Report
- [ ] All tests passed: YES / NO
- [ ] Issues found: List any issues
- [ ] Ready for production: YES / NO

---

## 🚀 QUICK COMMANDS

### Check Data Quality
```bash
psql $DATABASE_URL -f scripts/verify-blueprint-feed-style-data.sql
```

### Repair Bad Data
```bash
psql $DATABASE_URL -f scripts/repair-blueprint-feed-style.sql
```

### Create Test Subscriber
```bash
psql $DATABASE_URL -f scripts/test-paid-blueprint-staging-checklist.sql
```

### Test API (Grid 1)
```bash
# Get paid status
curl "http://localhost:3000/api/blueprint/get-paid-status?access=TOKEN"

# Generate grid
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "TOKEN", "gridNumber": 1}'

# Check status (poll every 5 seconds)
curl "http://localhost:3000/api/blueprint/check-paid-grid?predictionId=ID&gridNumber=1&access=TOKEN"
```

---

## ✅ SUCCESS CRITERIA

### All Must Pass
- [ ] No invalid `feed_style` data (or repaired)
- [ ] Grid 1 generates successfully
- [ ] Grid 1 stored in database slot 0
- [ ] Grid 2 generates successfully
- [ ] Grid 2 stored in database slot 1
- [ ] Grid 3 generates successfully
- [ ] Grid 3 stored in database slot 2
- [ ] All 3 grids verified in database
- [ ] Re-running Grid 1 does NOT overwrite
- [ ] No TypeScript errors
- [ ] No runtime errors

### Production Ready When
- [ ] ✅ All tests passed
- [ ] ✅ Data quality verified
- [ ] ✅ Idempotency confirmed
- [ ] ✅ JSONB structure correct
- [ ] ✅ No new issues introduced

---

## 🔗 RELATED DOCUMENTS

### Previous Steps
- Step 4 Audit: `/docs/PR-4-HOTFIX-COMPLETE-SUMMARY.md`
- Step 4 Visual: `/docs/PR-4-HOTFIX-VISUAL-COMPARISON.md`
- Original Plan: `/docs/PR-4-HOTFIX-PLAN.md`

### Reference Docs
- PR-4 Summary: `/docs/PR-4-SANDRA-SUMMARY.md`
- Test Results: `/docs/PR-4-TEST-RESULTS.md`
- Quick Reference: `/docs/PR-4-QUICK-REFERENCE.md`

---

## 📞 SUPPORT

**If Tests Fail:**
1. Stop immediately
2. Document the failure (error message, which test, what happened)
3. Report back to engineering team
4. Do NOT proceed to production

**If Data Cannot Be Repaired:**
1. Document the issue
2. Report number of affected rows
3. Report sample invalid values
4. Wait for engineering team to investigate

**If Unsure About Anything:**
1. Stop and ask
2. Do NOT guess
3. Do NOT skip steps
4. Do NOT proceed without confirmation

---

## 📊 FILE SUMMARY

| File | Type | Purpose | When to Use |
|------|------|---------|-------------|
| `PR-4-HOTFIX-STEP5-EXEC-SUMMARY.md` | Doc | Executive summary | Read first |
| `PR-4-HOTFIX-STEP5-SUMMARY.md` | Doc | Detailed explanation | Reference |
| `PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md` | Doc | **Main test guide** | Follow step-by-step |
| `verify-blueprint-feed-style-data.sql` | SQL | Data quality checks | Run first |
| `repair-blueprint-feed-style.sql` | SQL | Fix bad data | Run if needed |
| `test-paid-blueprint-staging-checklist.sql` | SQL | Test helpers | Used by checklist |
| `PR-4-HOTFIX-STEP5-INDEX.md` | Doc | This index | Navigation |

---

## ⏭️ NEXT STEPS

1. **Sandra:** Read executive summary
2. **Sandra:** Run data verification
3. **Sandra:** Run repair if needed
4. **Sandra:** Follow test checklist
5. **Sandra:** Report results
6. **Engineering:** Review results
7. **Engineering:** Apply patches if needed
8. **Together:** Go/no-go decision

---

**Sandra, start here:**
```
/docs/PR-4-HOTFIX-STAGING-TEST-CHECKLIST.md
```

Everything is ready. Copy-paste commands, check boxes, report results.

---

**End of Step 5 Index**
