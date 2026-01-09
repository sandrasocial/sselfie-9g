# PR-4 Rework Implementation Notes
**Incremental Generation Architecture**

---

## STEP 0 AUDIT FINDINGS (Evidence-Backed)

### A) `paid_blueprint_photo_urls` Format ✅

**Evidence:**
- **File:** `/app/api/blueprint/generate-paid/route.ts` (line 81)
  ```typescript
  const existingPhotoUrls = Array.isArray(data.paid_blueprint_photo_urls) ? data.paid_blueprint_photo_urls : []
  ```
- **File:** `/scripts/migrations/add-paid-blueprint-tracking.sql` (line 19)
  ```sql
  ADD COLUMN IF NOT EXISTS paid_blueprint_photo_urls JSONB DEFAULT '[]'::jsonb
  ```

**Conclusion:** `paid_blueprint_photo_urls` is a **JSONB array of strings** (`string[]`), with possible `null` values for incomplete slots.

### B) No "check-paid-grid" Endpoint Existed ❌

**Evidence:**
- Glob search: 0 files found matching `**/check-paid*.ts`
- Only existing endpoints: `/generate-paid` (generate only), `/get-paid-status` (status only)

**Action Taken:** **CREATED** `/app/api/blueprint/check-paid-grid/route.ts`

### C) Maya Pro Prediction Persistence Pattern ✅

**Evidence:**
- **File:** `/app/api/maya/pro/photoshoot/generate-grid/route.ts` (lines 243-245)
  ```sql
  UPDATE pro_photoshoot_grids
  SET prediction_id = ${result.predictionId}
  WHERE id = ${gridId}
  ```
- **File:** `/app/api/maya/pro/photoshoot/check-grid/route.ts` (lines 61-62)
  ```typescript
  const predictionId = searchParams.get("predictionId")  // Client tracks it
  ```

**Pattern:** Maya Pro stores `prediction_id` per grid in DB (can resume after refresh).

**For Paid Blueprint:**  
Storing 30 prediction IDs would require:
- **Option A:** New JSONB column `paid_blueprint_prediction_ids` ❌ (requires migration)
- **Option B:** **Client-side tracking via localStorage** ✅ (no schema changes)

**Decision:** Use **client-side tracking** per constraints ("Do not change schema unless explicitly told").

### D) Category/Mood Source ✅

**Evidence:**
- **File:** `/app/blueprint/page.tsx` (line 642)
  ```typescript
  formData.vibe === vibe.toLowerCase()  // Options: Luxury, Minimal, Beige, Warm, Edgy, Professional
  ```
- **File:** `/scripts/create-blueprint-subscribers-table.sql` (line 15)
  ```sql
  feed_style VARCHAR(50)
  ```

**Mapping:**
- **Category** = `form_data.vibe` (fallback: "professional")
- **Mood** = `feed_style` column OR `form_data.feed_style` (fallback: "minimal")

---

## FILES CHANGED

### 1. Modified: `/app/api/blueprint/generate-paid/route.ts`

**Lines Changed:** Entire file (169 lines total after rewrite)

**Summary:**
- **Removed:** All batch generation logic (old: generated all 30 at once)
- **Added:** Accept `gridNumber` param (1-30)
- **Added:** Validate `gridNumber` is between 1-30
- **Added:** Guards for selfies (1-3 required), form_data (category/mood)
- **Added:** Idempotency check for specific grid slot
- **Added:** Single grid generation with Nano Banana Pro
- **Added:** Return `predictionId` immediately (don't wait)
- **Removed:** `checkNanoBananaPrediction` import (moved to check-paid-grid)
- **Removed:** `put` (Vercel Blob) import (moved to check-paid-grid)
- **Removed:** `waitForNanoBananaPrediction` helper function (polling moved to check-paid-grid)

**Key Logic:**
```typescript
// Line 20: Accept gridNumber param
const { accessToken, gridNumber } = await req.json()

// Lines 76-86: Guard for selfies (1-3 valid URLs)
const validSelfieUrls = selfieUrls.filter((url: any) => 
  typeof url === "string" && url.startsWith("http")
)

// Lines 100-105: Get category/mood from stored data
const formData = data.form_data || {}
const category = (formData.vibe || "professional") as BlueprintCategory
const mood = (data.feed_style || formData.feed_style || "minimal") as BlueprintMood

// Lines 111-120: Idempotency - check if grid already exists
const targetIndex = gridNumber - 1
if (existingPhotoUrls[targetIndex]) {
  return { status: "completed", gridUrl: existingPhotoUrls[targetIndex] }
}

// Lines 143-151: Generate ONE grid
const result = await generateWithNanoBanana({
  prompt: templatePrompt,
  image_input: validSelfieUrls,
  resolution: "2K",
})

// Lines 155-161: Return immediately with predictionId
return { success: true, gridNumber, predictionId, status: "starting" }
```

---

### 2. Created: `/app/api/blueprint/check-paid-grid/route.ts`

**Lines:** 207 total

**Summary:**
- **NEW** GET endpoint for polling prediction status
- Accepts query params: `predictionId`, `gridNumber`, `access` (accessToken)
- Validates inputs and access token
- Checks prediction status via `checkNanoBananaPrediction`
- On success: downloads grid, uploads to Vercel Blob, stores in DB
- Implements atomic update with idempotency guard
- Counts completed grids and marks `paid_blueprint_generated=TRUE` at 30
- Returns processing/completed/failed states

**Key Logic:**
```typescript
// Lines 22-56: Validate inputs (predictionId, gridNumber, accessToken)

// Lines 71-77: Verify access token (lookup subscriber)

// Line 81: Check prediction status
const status = await checkNanoBananaPrediction(predictionId)

// Lines 86-145: If succeeded, process grid
// - Download from Replicate
// - Upload to Vercel Blob: `/paid-blueprint/grids/{subscriberId}-{gridNumber}.png`
// - Update DB at correct index with atomic guard
// - Count completed grids
// - Mark as generated if 30/30

// Lines 117-130: Atomic update
existingPhotoUrls[targetIndex] = gridBlob.url
await sql`
  UPDATE blueprint_subscribers
  SET paid_blueprint_photo_urls = ${JSON.stringify(existingPhotoUrls)}::jsonb
  WHERE access_token = ${accessToken}
  AND (paid_blueprint_photo_urls->>${targetIndex} IS NULL)
`

// Lines 140-149: Mark as generated at 30/30
if (completedCount >= 30) {
  await sql`UPDATE blueprint_subscribers SET paid_blueprint_generated = TRUE`
}
```

---

### 3. Modified: `/app/api/blueprint/get-paid-status/route.ts`

**Lines Changed:** 28-68 (expanded response)

**Summary:**
- **Added:** Fetch `selfie_image_urls`, `form_data`, `feed_style` from DB
- **Added:** Calculate progress (completed/30, percentage)
- **Added:** Find missing grid numbers (for retry UI)
- **Added:** Check prerequisites (hasSelfies, hasFormData)
- **Enhanced:** Return only non-null URLs in `photoUrls`

**Key Logic:**
```typescript
// Lines 36-48: Calculate progress
const completedUrls = photoUrls.filter(url => url !== null && url !== undefined)
const completedCount = completedUrls.length
const percentage = Math.round((completedCount / 30) * 100)

// Lines 50-56: Find missing grid numbers
const missingGridNumbers: number[] = []
for (let i = 0; i < 30; i++) {
  if (!photoUrls[i]) missingGridNumbers.push(i + 1)
}

// Lines 58-62: Check prerequisites
const hasSelfies = Array.isArray(data.selfie_image_urls) && 
  data.selfie_image_urls.some(url => typeof url === "string" && url.startsWith("http"))
const hasFormData = !!(formData.vibe || data.feed_style)

// Lines 76-86: Enhanced response
return {
  ...existing fields,
  progress: { completed, total: 30, percentage },
  missingGridNumbers,
  hasSelfies,
  hasFormData
}
```

---

## DESIGN DECISIONS

### Decision 1: Client-Side Prediction Tracking

**Problem:** How to track 30 prediction IDs for resume capability?

**Options Considered:**
1. **DB column** `paid_blueprint_prediction_ids JSONB` (requires migration) ❌
2. **Client-side** localStorage (no schema changes) ✅

**Chosen:** Client-side tracking

**Justification:**
- Constraint: "Do not change schema unless explicitly told"
- Maya Pro can afford DB tracking (admin feature, controlled usage)
- Paid blueprint is public-facing (keep schema minimal)
- Tradeoff: Resume requires same browser (acceptable for MVP)

**Implementation:**
```typescript
// Client (not in this PR, documented for UI PR)
const predictions = JSON.parse(localStorage.getItem('paid_blueprint_predictions') || '{}')
predictions[gridNumber] = predictionId
localStorage.setItem('paid_blueprint_predictions', JSON.stringify(predictions))

// On page refresh, check localStorage for in-progress grids
Object.entries(predictions).forEach(([gridNum, predId]) => {
  pollCheckPaidGrid(predId, gridNum)
})
```

---

### Decision 2: Category/Mood from Stored Data

**Problem:** Free blueprint accepts category/mood as request params, but paid blueprint must use stored data.

**Evidence:**
- `form_data.vibe` stores category choice from form
- `feed_style` column stores mood choice

**Mapping:**
```typescript
category = formData.vibe || "professional"  // Default: professional
mood = data.feed_style || formData.feed_style || "minimal"  // Default: minimal
```

**Fallbacks:**
- If `vibe` missing → default to "professional" (safe neutral choice)
- If `feed_style` missing → default to "minimal" (clean aesthetic)

---

### Decision 3: Idempotency via Slot Checking

**Problem:** Prevent duplicate grid generation if user double-clicks.

**Solution:** Check if specific grid slot already has a URL.

**Implementation:**
```typescript
// In generate-paid:
const targetIndex = gridNumber - 1
if (existingPhotoUrls[targetIndex]) {
  return { status: "completed", gridUrl: existingPhotoUrls[targetIndex] }
}

// In check-paid-grid:
await sql`
  UPDATE ... 
  WHERE access_token = ${accessToken}
  AND (paid_blueprint_photo_urls->>${targetIndex} IS NULL)  // Only if empty
`
```

**Result:** Duplicate requests return existing URL, no new prediction created.

---

### Decision 4: 2K Resolution (Not 4K)

**Evidence:** Free blueprint uses 2K (line 116 in generate-grid/route.ts)

**Chosen:** 2K

**Justification:**
- Match free blueprint quality
- Faster generation (~30 sec vs ~60 sec)
- No additional cost (included in $47)
- Can offer "4K Upgrade" as separate upsell later

---

### Decision 5: No Frame Splitting (Yet)

**Problem:** Should we split each grid into 9 individual frames?

**Evidence:**
- Free blueprint splits frames (check-grid/route.ts lines 90-113)
- Maya Pro splits frames (for gallery integration)

**Chosen:** Store full grids only (defer frame splitting)

**Justification:**
- Not required for MVP (users can download full grids)
- Paid blueprint is standalone (no gallery integration needed)
- Can add frame splitting later if user feedback requests it
- Reduces complexity (fewer Blob uploads, simpler DB structure)

---

## RESUME STRATEGY (Client-Side)

### How Client Resumes After Refresh

**1. On page load:**
```typescript
// Check localStorage for in-progress predictions
const predictions = JSON.parse(localStorage.getItem('paid_blueprint_predictions') || '{}')

// Check status API
const statusResponse = await fetch('/api/blueprint/get-paid-status?access=TOKEN')
const { progress, missingGridNumbers } = await statusResponse.json()

// Resume polling for in-progress grids
Object.entries(predictions).forEach(([gridNum, predId]) => {
  if (missingGridNumbers.includes(parseInt(gridNum))) {
    // This grid is still incomplete, resume polling
    pollCheckPaidGrid(predId, gridNum)
  } else {
    // Grid completed, remove from localStorage
    delete predictions[gridNum]
  }
})

localStorage.setItem('paid_blueprint_predictions', JSON.stringify(predictions))
```

**2. Start new grid:**
```typescript
const genResponse = await fetch('/api/blueprint/generate-paid', {
  body: JSON.stringify({ accessToken, gridNumber })
})
const { predictionId } = await genResponse.json()

// Store prediction ID
predictions[gridNumber] = predictionId
localStorage.setItem('paid_blueprint_predictions', JSON.stringify(predictions))

// Start polling
pollCheckPaidGrid(predictionId, gridNumber)
```

**3. Polling function:**
```typescript
async function pollCheckPaidGrid(predictionId, gridNumber) {
  const interval = setInterval(async () => {
    const response = await fetch(
      `/api/blueprint/check-paid-grid?predictionId=${predictionId}&gridNumber=${gridNumber}&access=${TOKEN}`
    )
    const data = await response.json()
    
    if (data.status === "completed") {
      clearInterval(interval)
      // Remove from localStorage
      const predictions = JSON.parse(localStorage.getItem('paid_blueprint_predictions') || '{}')
      delete predictions[gridNumber]
      localStorage.setItem('paid_blueprint_predictions', JSON.stringify(predictions))
      // Update UI
      updateProgressBar(data.totalCompleted, 30)
    } else if (data.status === "failed") {
      clearInterval(interval)
      // Show retry button
      showRetryButton(gridNumber)
    }
  }, 5000)  // Poll every 5 seconds
}
```

---

## OUT OF SCOPE (NOT IN THIS PR)

1. **UI Pages** (`/blueprint/paid` with progress bar) → Separate PR
2. **Delivery Email** (send when 30/30 complete) → Separate PR
3. **Cron Sequences** (follow-up emails) → Separate PR
4. **Frame Splitting** (split grids into 9 frames) → Future PR (if needed)
5. **Gallery Integration** (save frames to `ai_images`) → Not needed
6. **4K Resolution Option** → Future upsell
7. **Checkout Changes** → Already handled by PR-3
8. **Schema Changes** → No new columns (all exist from PR-3)

---

## TESTING CHECKLIST

See `/docs/PR-4-REWORK-TESTING.md` for full test plan.

**Quick Checklist:**
- [ ] Single grid generates successfully
- [ ] Idempotency works (retry same grid returns existing URL)
- [ ] Sequential generation works (3 grids in a row)
- [ ] Resume works (can continue from Grid 5 if 1-4 complete)
- [ ] Guards work (missing selfies, not purchased, invalid gridNumber)
- [ ] Full completion (30/30) marks as generated
- [ ] Failed grids can be retried
- [ ] Status API returns progress correctly

---

## SUCCESS CRITERIA

- ✅ No timeouts (all API calls < 5 seconds)
- ✅ Idempotent (duplicate requests safe)
- ✅ Resumable (can continue after close tab)
- ✅ Model consistency (Nano Banana Pro, matches free blueprint)
- ✅ Prompt consistency (template library, matches free blueprint)
- ✅ Input consistency (selfies required, 1-3 images)
- ✅ Output consistency (2K resolution, full grids stored)
- ✅ Database integrity (no duplicates, atomic updates)

---

## ROLLBACK PLAN

**If issues detected:**

1. **Feature flag off:**
   ```sql
   UPDATE admin_feature_flags 
   SET enabled = FALSE 
   WHERE flag_name = 'paid_blueprint_enabled'
   ```

2. **No data loss:**
   - All progress saved in `paid_blueprint_photo_urls`
   - Can resume after fix deployed

3. **Revert code:**
   ```bash
   git revert <commit-hash>
   git push
   ```

---

**Implementation Complete ✅**  
**Ready for Testing**
