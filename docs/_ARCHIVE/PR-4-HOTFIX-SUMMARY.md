# 🔥 PR-4 HOTFIX: Model Correction Complete

**Date:** January 9, 2026  
**Type:** Critical Model Fix  
**Status:** ✅ Implemented, Awaiting Re-Test

---

## 🚨 ISSUE

PR-4 was using the **WRONG model** entirely:
- ❌ Used: `black-forest-labs/flux-dev` (generic AI images)
- ✅ Should use: `google/nano-banana-pro` (personalized grids with user's face)

**Impact:** Users would receive generic stock photos instead of personalized brand photoshoot grids.

---

## ✅ FIX IMPLEMENTED

### File Changed
- `/app/api/blueprint/generate-paid/route.ts` - **Complete rewrite** (409 lines)

### What Changed

**1. Model Switch ✅**
```typescript
// BEFORE (WRONG):
const prediction = await replicate.predictions.create({
  model: "black-forest-labs/flux-dev",
  ...
})

// AFTER (CORRECT):
const result = await generateWithNanoBanana({
  prompt: templatePrompt,
  image_input: validSelfieUrls,  // User's selfies!
  ...
})
```

**2. Added Selfie Requirement ✅**
```typescript
// Now requires user's selfies from free blueprint
const selfieUrls = data.selfie_image_urls || []
if (!Array.isArray(selfieUrls) || selfieUrls.length === 0) {
  return 400: "Please upload your selfies in the free blueprint first"
}
```

**3. Template System Integration ✅**
```typescript
// Now uses same sophisticated templates as free blueprint
const category = formData.vibe || 'professional'
const mood = formData.selectedFeedStyle || 'minimal'
const templatePrompt = getBlueprintPhotoshootPrompt(category, mood)
```

**4. Proper Grid Storage ✅**
```typescript
// Downloads grid from Replicate and uploads to Vercel Blob
const gridBlob = await put(
  `paid-blueprint/grids/${predictionId}-grid-${gridNumber}.png`,
  gridBuffer,
  { access: "public", contentType: "image/png" }
)
```

---

## 📊 AUDIT FINDINGS (VERIFIED)

### Free Blueprint Flow (VERIFIED)

**File:** `/app/api/blueprint/generate-grid/route.ts`

**Model:** `google/nano-banana-pro` ✅

**Inputs:**
- `prompt`: From `getBlueprintPhotoshootPrompt(category, mood)`
- `image_input`: 1-3 selfie URLs (user uploaded)
- `aspect_ratio`: "1:1"
- `resolution`: "2K"
- `output_format`: "png"
- `safety_filter_level`: "block_only_high"

**Output:**
- **Primary:** ONE 3x3 grid image URL (`grid_url`)
- **Secondary:** 9 individual frame URLs (`grid_frame_urls`)

**Storage:**
- `grid_generated`: BOOLEAN
- `grid_url`: TEXT (full grid)
- `grid_frame_urls`: JSONB array (9 frames)

---

### Paid Blueprint Implementation (CORRECTED)

**Generates:** 30 grids (not 30 individual photos)

**Each grid:**
- Uses Nano Banana Pro with user's selfies
- Creates 3x3 grid (9 frames of user's face)
- Maintains facial/body consistency
- Uses same template system as free blueprint

**Storage:**
- `paid_blueprint_photo_urls`: JSONB array of 30 grid URLs
- Each URL is a full 3x3 grid image
- Frames can be extracted later if needed (not stored for MVP)

---

## 🔄 KEY DIFFERENCES FROM BEFORE

| Feature | Before (WRONG) | After (CORRECT) |
|---------|----------------|-----------------|
| **Model** | `flux-dev` ❌ | `nano-banana-pro` ✅ |
| **User Selfies** | Not used ❌ | Required (1-3) ✅ |
| **Prompts** | Generic variations ❌ | Template system ✅ |
| **Output** | Single images ❌ | 3x3 grids ✅ |
| **Consistency** | No face consistency ❌ | Uses selfies for consistency ✅ |
| **Cost** | $0.03/image × 30 = $0.90 | $0.02/grid × 30 = $0.60 ✅ |

---

## 💰 COST IMPROVEMENT

**Before (FLUX):**
- $0.03 per image
- 30 images = $0.90

**After (Nano Banana Pro):**
- $0.02 per grid
- 30 grids = $0.60

**Better margin:** $0.30 saved per user (33% cost reduction!)

---

## 🔒 SAFETY FEATURES (RETAINED)

All concurrency safety features from previous implementation retained:

1. ✅ **In-progress detection** (2-minute window)
2. ✅ **Re-read before write** (detect concurrent mods)
3. ✅ **Atomic guard** (`WHERE jsonb_array_length < 30`)
4. ✅ **Hard cap** (`.slice(0, 30)` everywhere)
5. ✅ **Final verification** (re-read before marking complete)

---

## 📋 WHAT WAS VERIFIED

✅ Free blueprint uses `google/nano-banana-pro`  
✅ Free blueprint requires selfie images  
✅ Free blueprint uses `getBlueprintPhotoshootPrompt` templates  
✅ Free blueprint stores `grid_url` + `grid_frame_urls`  
✅ Free blueprint uses Nano Banana client wrapper  
✅ Parameters: 2K resolution, 1:1 aspect, PNG format  

---

## 🧪 TESTING REQUIRED

### Re-Test Checklist

- [ ] **Test 1:** User without selfies → Error message
- [ ] **Test 2:** User with selfies + purchase → Generate 30 grids
- [ ] **Test 3:** Verify grids are 3x3 (not single images)
- [ ] **Test 4:** Verify user's face appears in grids
- [ ] **Test 5:** Idempotency (retry returns same grids)
- [ ] **Test 6:** Concurrency (simultaneous requests don't create 60)
- [ ] **Test 7:** Database integrity (exactly 30 grid URLs)

### Expected Changes in Test Results

**Before:**
- Generated 30 generic AI images
- No face consistency
- Time: ~49 seconds

**After:**
- Generates 30 personalized grids
- Face consistency using selfies
- Time: Expected longer (~2-3 min per grid = 60-90 min total for 30)

⚠️ **Note:** Nano Banana Pro is slower than FLUX but produces higher quality personalized grids.

---

## 📁 FILES MODIFIED

### Code Changes (1 file)

1. `/app/api/blueprint/generate-paid/route.ts` - **COMPLETE REWRITE**
   - Switched to Nano Banana Pro
   - Added selfie requirement
   - Added template system
   - Added Vercel Blob upload
   - Retained all concurrency safety

### No Changes Needed

✅ `/app/api/blueprint/get-paid-status/route.ts` - No changes (returns array of URLs regardless of content)  
✅ Webhook, checkout, schema - Already correct (PR-2, PR-3)  
✅ Database - No new columns needed  

---

## 🚀 DEPLOYMENT STATUS

**Previous Status:** ✅ Ready for production (INCORRECT - wrong model)

**Current Status:** ⏳ **Requires re-testing** with correct model

**Blockers:**
1. Must re-run tests with new implementation
2. Must verify grids (not single images) are generated
3. Must verify face consistency
4. Must measure actual generation time

**Risk Level:** Medium
- Complete rewrite of generation logic
- Different model with different characteristics
- Longer generation time expected

---

## 📊 COMPARISON TABLE

| Aspect | Free Blueprint | Paid Blueprint (Before) | Paid Blueprint (After) |
|--------|----------------|------------------------|------------------------|
| Model | Nano Banana Pro ✅ | FLUX ❌ | Nano Banana Pro ✅ |
| Selfies | Required ✅ | Not used ❌ | Required ✅ |
| Templates | Yes ✅ | No ❌ | Yes ✅ |
| Output | 1 grid | 30 images ❌ | 30 grids ✅ |
| Generation | 1 call | 30 calls | 30 calls |
| Cost | $0.02 | $0.90 total | $0.60 total ✅ |
| Face Consistency | Yes ✅ | No ❌ | Yes ✅ |

---

## ⏱️ EXPECTED TIMING

### Free Blueprint
- **1 grid:** ~30-60 seconds
- **Nano Banana Pro:** Slower but higher quality

### Paid Blueprint (Corrected)
- **30 grids:** ~30-60 min total (optimistic: 1-2 min per grid)
- **Batch of 5:** ~5-10 min per batch
- **6 batches:** ~30-60 min total

⚠️ **Note:** This is MUCH longer than the previous 49 seconds with FLUX, but this is the correct implementation that matches user expectations.

---

## 🎯 WHAT USERS GET NOW

**Before (WRONG):**
- 30 generic AI-generated images
- No face consistency
- Not personalized

**After (CORRECT):**
- 30 professional brand photoshoot grids
- Each grid = 3x3 layout with 9 frames
- All featuring USER'S actual face
- Consistent styling across all grids
- Matches their selected category + mood aesthetic

---

## 💬 SANDRA'S QUESTION ANSWERED

**Q:** "The FREE blueprint does NOT have black-forest-labs/flux-dev. We refactored to pro. Nanobanana pro and the prompting templates."

**A:** You were 100% correct. The issue has been fixed:
- ✅ Now uses `google/nano-banana-pro` (correct)
- ✅ Now uses user's selfies (correct)
- ✅ Now uses template system (correct)
- ✅ Now generates 3x3 grids (correct)

---

## 📋 NEXT STEPS

### Immediate (Before Deployment)

1. **Re-run migration** (already done, no changes needed)
2. **Create test subscriber** with:
   - Uploaded selfies
   - Completed free blueprint
   - Purchased paid blueprint
3. **Test generation** (expect 30-60 min runtime)
4. **Visual QA** (verify grids show user's face)

### After Testing

5. **Update all PR-4 documentation** (model references, timing estimates)
6. **Deploy to staging**
7. **Real user test** (1-2 test purchases)
8. **Deploy to production**

---

## 🔗 RELATED DOCUMENTS

- [Original Implementation](./PR-4-IMPLEMENTATION-SUMMARY.md) - Now outdated
- [Critical Fix Document](./PR-4-CRITICAL-MODEL-FIX.md) - Analysis
- [Blueprint Audit](./PR-4-BLUEPRINT-CONSISTENCY-AUDIT.md) - Initial audit (found the issue)
- [Test Results](./PR-4-TEST-RESULTS.md) - Old results (wrong model)

---

## ✅ HOTFIX CHECKLIST

- [x] Verified free blueprint implementation
- [x] Identified correct model (Nano Banana Pro)
- [x] Identified required inputs (selfies, templates)
- [x] Rewritten generation logic
- [x] Retained concurrency safety
- [x] Added Vercel Blob storage
- [x] Added proper error handling
- [ ] Re-tested with correct model
- [ ] Visual QA of generated grids
- [ ] Performance testing (timing)
- [ ] Documentation updates
- [ ] Deployment

---

**Hotfix Completed:** January 9, 2026  
**Implementation Status:** ✅ Code complete  
**Testing Status:** ⏳ Pending re-test  
**Deployment Status:** 🔴 Blocked pending tests
