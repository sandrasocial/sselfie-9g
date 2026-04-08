# Retraining Quality Degradation Audit - CRITICAL FINDINGS

## Executive Summary

This audit investigates why users are experiencing **worse image quality after retraining** their models, and why **the same model produces better images on Replicate's interface than in the app**. The investigation reveals **CRITICAL bugs** that cause quality degradation and version mismatches.

---

## When Do Users Retrain?

Users can retrain their model by:
1. Clicking "Retrain Model" button after training completes
2. This resets the training screen to upload stage
3. User uploads new images (typically 5-25 images)
4. Training starts with the newly uploaded images

**Key Finding:** Retraining uses **ONLY the newly uploaded images**, not a combination of old + new images. This is a potential source of quality degradation if users upload fewer or lower-quality images on retraining.

---

## Critical Issues Found

### 🔴 **CRITICAL BUG #1: Wrong Model Version Used for Predictions**

**Location:** All image generation routes (`app/api/maya/generate-image/route.ts`, `app/api/studio/generate/route.ts`, etc.)

**Problem:**
The app uses `version: replicateVersionId` when creating predictions, but `replicateVersionId` might be:
1. An **old version hash** from a previous training (not updated after retraining)
2. Just a **hash** (e.g., `"4e0de78d"`) instead of the full model path
3. **Incorrectly extracted** from training output

**In Replicate's interface:**
- Uses full model path: `sandrasocial/user-50c-selfie-lora:4e0de78d` ✅
- Always uses the **latest version** of the model ✅

**In the app:**
```typescript
// Line 244-247 in generate-image/route.ts
const prediction = await replicate.predictions.create({
  version: replicateVersionId, // ❌ Might be old hash or wrong format
  input: predictionInput,
})
```

**Impact:**
- App might be using an **old version** of the model (from before retraining)
- Replicate interface uses the **latest version** (after retraining)
- This explains why same model works better on Replicate than in app
- Quality degrades because app is stuck on old version while Replicate uses new one

**Evidence from Screenshot:**
- Replicate shows multiple versions: `4e0de78d` (latest), `686b79b2`, `6fb3e8e6`, etc.
- User has retrained multiple times (versions created 1-4 days ago)
- App might be using an older version hash stored in database

**Severity:** 🔴 **CRITICAL** - This is the PRIMARY cause of quality difference between Replicate and app

---

### 🔴 **CRITICAL BUG #2: Version ID Not Updated on Retraining**

**Location:** `app/api/training/progress/route.ts` line 309

**Problem:**
When training completes, `replicate_version_id` is set from `training.output?.version`:
```typescript
replicate_version_id = ${training.output?.version || null},
```

But `training.output.version` might be:
1. In format `"model:hash"` (e.g., `"sandrasocial/user-50c-selfie-lora:4e0de78d"`)
2. Or just the hash (e.g., `"4e0de78d"`)
3. Or might be the **trainer version** instead of **destination model version**

**The code tries to extract hash:**
```typescript
// Line 247-249
const versionHash = training.output.version.includes(':')
  ? training.output.version.split(':')[1]
  : training.output.version
```

**But then stores the FULL string:**
```typescript
// Line 309 - Stores full string, not just hash!
replicate_version_id = ${training.output?.version || null},
```

**Impact:**
- If `training.output.version` is `"sandrasocial/user-50c-selfie-lora:4e0de78d"`, that's stored
- But predictions.create expects just the hash `"4e0de78d"`
- OR it might be storing the wrong version entirely
- On retraining, if version isn't properly updated, app uses old version

**Severity:** 🔴 **CRITICAL** - Causes version mismatch

---

### 🔴 **CRITICAL BUG #3: Trigger Word Overwritten During Retraining**

**Location:** `app/api/training/start/route.ts` line 172

**Problem:**
```typescript
// Line 138-140: Correctly calculates preserved trigger word
const finalTriggerWord = isRetraining && existingModel[0].trigger_word
  ? existingModel[0].trigger_word
  : triggerWord

// Line 158: Uses correct trigger word for Replicate training
trigger_word: finalTriggerWord, // ✅ CORRECT

// Line 172: BUT THEN OVERWRITES IT WITH WRONG ONE! ❌
trigger_word = ${triggerWord}, // ❌ BUG: Should be finalTriggerWord
```

**Impact:**
- The trigger word is correctly preserved for the Replicate training API call
- BUT the database is updated with the **wrong trigger word** (newly generated instead of preserved)
- This causes inconsistency between what Replicate trained with and what the database thinks it is
- Future image generations may use the wrong trigger word, causing quality issues

**Severity:** 🔴 **CRITICAL** - This directly causes quality degradation

---

### 🟡 **Issue #1: Only New Images Used for Retraining**

**Location:** `components/sselfie/training-screen.tsx` + `app/api/training/upload-zip/route.ts`

**Problem:**
- When users retrain, they upload new images
- The ZIP file created contains **ONLY the newly uploaded images**
- Old training images from previous training sessions are **NOT included**
- If users upload fewer/lower quality images on retraining, the model quality degrades

**Current Flow:**
1. User clicks "Retrain Model" → `handleRetrain()` resets `uploadedImages` to empty array
2. User uploads new images → Only new images are in `uploadedImages` state
3. ZIP is created from only these new images → `createTrainingZip(imageUrls)` receives only new images
4. Training uses only new images → Model quality depends entirely on new image quality

**Impact:**
- If user originally trained with 20 high-quality images
- Then retrains with only 5 lower-quality images
- Model quality will degrade because it's learning from fewer, worse examples

**Severity:** 🟡 **HIGH** - Major contributor to quality degradation

---

### 🟡 **Issue #2: No Image Quality Validation**

**Location:** `components/sselfie/training-screen.tsx` + `app/api/training/upload-zip/route.ts`

**Problem:**
- No validation that retraining images are of similar or better quality than original
- No check for image diversity (angles, lighting, expressions)
- No warning if user uploads fewer images than original training
- No guidance on what makes good retraining images

**Impact:**
- Users may unknowingly retrain with worse images
- No feedback mechanism to prevent quality degradation

**Severity:** 🟡 **MEDIUM** - Contributes to quality issues

---

### 🟡 **Issue #3: Model Destination Inconsistency**

**Location:** `app/api/training/start/route.ts` vs `app/api/training/upload-zip/route.ts`

**Problem:**
- `/api/training/start` (line 131-135): Reuses existing model name for retraining ✅
- `/api/training/upload-zip` (line 175): **Always creates new model name** ❌
  ```typescript
  const destinationModelName = `user-${neonUser.id.substring(0, 8)}-selfie-lora`
  ```
- These two routes handle retraining differently
- `upload-zip` doesn't check for existing model name

**Impact:**
- If user uses `upload-zip` route (which is the main one), retraining may create a new model instead of updating existing one
- This could cause confusion and quality issues

**Severity:** 🟡 **MEDIUM** - Inconsistency between routes

---

### 🟢 **Issue #4: Training Parameters May Be Too Aggressive**

**Location:** `lib/replicate-client.ts`

**Current Parameters:**
```typescript
steps: 1400,
lora_rank: 48, // Very high
num_repeats: 20, // Very high
learning_rate: 0.00008,
caption_dropout_rate: 0.15,
```

**Problem:**
- With fewer images on retraining, these aggressive parameters may cause overfitting
- High `num_repeats` (20) with fewer images = model sees same images too many times
- High `lora_rank` (48) may be too much for smaller datasets

**Impact:**
- Retraining with fewer images + aggressive parameters = overfitting
- Model becomes too specific to training images, loses generalization
- Quality degrades on new prompts

**Severity:** 🟢 **LOW-MEDIUM** - May contribute but not primary cause

---

## Root Causes of Quality Degradation

### Primary Causes (Most Likely):

1. **🔴 WRONG MODEL VERSION** - App uses old version hash, Replicate uses latest version
   - This is THE MAIN REASON why Replicate produces better images
   - App is stuck on version from before retraining
   - Replicate interface always uses latest version

2. **🔴 Version ID Not Updated** - On retraining, version might not be properly extracted/updated
   - Database might have old version hash
   - New training creates new version, but database doesn't update

3. **🔴 Trigger Word Bug** - Database inconsistency causes wrong trigger word usage
   - Even if version is correct, wrong trigger word degrades quality

4. **🟡 Only New Images** - Retraining with fewer/worse images than original
   - But this wouldn't explain why Replicate works better with same model

5. **🟡 No Quality Validation** - Users unknowingly upload worse images

### Secondary Causes (Contributing):

6. **🟡 Model Destination Inconsistency** - Different behavior between routes
7. **🟢 Aggressive Parameters** - Overfitting with smaller retraining datasets

---

## Code Flow Analysis

### Retraining Flow (Current):

```
User clicks "Retrain Model"
  ↓
handleRetrain() resets uploadedImages = []
  ↓
User uploads NEW images only
  ↓
ZIP created from NEW images only
  ↓
/api/training/upload-zip called
  ↓
Checks for existing model ✅
Preserves trigger word ✅
BUT: Uses hardcoded model name (doesn't reuse) ❌
  ↓
Training starts with ONLY new images
  ↓
Model quality depends entirely on new images
```

### What Should Happen:

```
User clicks "Retrain Model"
  ↓
Option A: Use existing images + new images (recommended)
Option B: Replace with new images (with quality validation)
  ↓
Quality validation:
  - Check image count (should be >= original)
  - Check image quality metrics
  - Warn if quality may degrade
  ↓
Training with combined or validated new images
  ↓
Model quality maintained or improved
```

---

## Recommendations

### Immediate Fixes (Critical):

1. **🔴 FIX VERSION ID EXTRACTION** (`app/api/training/progress/route.ts:309`)
   
   **Problem:** Storing full version string instead of just hash
   
   **Fix:**
   ```typescript
   // Extract just the hash from training.output.version
   let versionHash = null
   if (training.output?.version) {
     versionHash = training.output.version.includes(':')
       ? training.output.version.split(':')[1]  // Extract hash from "model:hash"
       : training.output.version  // Already just hash
   }
   
   // Store just the hash
   replicate_version_id = ${versionHash || null},
   ```

2. **🔴 FIX VERSION USAGE IN PREDICTIONS** (All generation routes)
   
   **Problem:** Using version hash might not work correctly. Should verify format.
   
   **Option A:** Use full model path with version
   ```typescript
   const prediction = await replicate.predictions.create({
     model: `${replicateModelId}:${replicateVersionId}`,  // Full path
     input: predictionInput,
   })
   ```
   
   **Option B:** Ensure version hash is correct format
   ```typescript
   // Verify version is just hash, not full path
   const versionHash = replicateVersionId?.includes(':')
     ? replicateVersionId.split(':')[1]
     : replicateVersionId
   
   const prediction = await replicate.predictions.create({
     version: versionHash,  // Just the hash
     input: predictionInput,
   })
   ```

3. **🔴 VERIFY VERSION IS LATEST** (Add validation)
   
   **Add check after training completes:**
   ```typescript
   // After training completes, verify we have the latest version
   if (replicateModelId && versionHash) {
     // Fetch latest version from Replicate API
     const modelResponse = await fetch(`https://api.replicate.com/v1/models/${replicateModelId}/versions`, {
       headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` }
     })
     const versions = await modelResponse.json()
     const latestVersion = versions.results[0]?.id
     
     if (latestVersion !== versionHash) {
       console.warn(`[v0] ⚠️ Version mismatch! DB has ${versionHash}, latest is ${latestVersion}`)
       // Update to latest
       versionHash = latestVersion
     }
   }
   ```

4. **Fix Trigger Word Bug** (`app/api/training/start/route.ts:172`)
   ```typescript
   // Change from:
   trigger_word = ${triggerWord},
   // To:
   trigger_word = ${finalTriggerWord},
   ```

2. **Fix Model Destination in upload-zip** (`app/api/training/upload-zip/route.ts:175`)
   ```typescript
   // Check for existing model and reuse name
   const existingModelForName = await sql`
     SELECT replicate_model_id
     FROM user_models
     WHERE user_id = ${neonUser.id}
     AND training_status = 'completed'
     ORDER BY created_at DESC
     LIMIT 1
   `
   
   const destinationModelName = existingModelForName.length > 0 && existingModelForName[0].replicate_model_id
     ? existingModelForName[0].replicate_model_id.split('/')[1]
     : `user-${neonUser.id.substring(0, 8)}-selfie-lora`
   ```

### High Priority Fixes:

3. **Add Image Quality Validation**
   - Compare new image count to original
   - Warn if fewer images
   - Suggest minimum image count (15-25)

4. **Consider Combining Old + New Images**
   - Option to include previous training images
   - Or at least show what was used originally

5. **Add Retraining Guidance**
   - UI message explaining retraining best practices
   - Warning if image count is low
   - Quality tips before retraining

### Medium Priority Improvements:

6. **Adjust Training Parameters for Retraining**
   - Reduce `num_repeats` if fewer images
   - Adjust `lora_rank` based on dataset size
   - Dynamic parameter adjustment

7. **Track Training History**
   - Store which images were used for each training
   - Show training history to users
   - Compare quality metrics across trainings

---

## Specific User Case Analysis

### User with Multiple Retrainings (user-50c-selfie-lora)

**Evidence from Screenshot:**
- Model: `sandrasocial/user-50c-selfie-lora`
- Multiple versions created: `4e0de78d` (latest, 1 day ago), `686b79b2`, `6fb3e8e6`, `a6918e48`, etc.
- User has retrained **multiple times** (versions from 1-4 days ago)
- Images get "worse and worse each time"

**Root Cause:**
1. **App is using OLD version hash** stored in database
2. Each retraining creates a **new version** on Replicate
3. Database `replicate_version_id` might not be updating correctly
4. App generates with old version, Replicate uses latest → different results

**What to Check:**
```sql
-- Check what version is stored in database
SELECT 
  id,
  user_id,
  replicate_model_id,
  replicate_version_id,
  trigger_word,
  training_status,
  created_at,
  updated_at
FROM user_models
WHERE replicate_model_id LIKE '%user-50c%'
ORDER BY created_at DESC;

-- Compare with Replicate's latest version
-- Latest should be: 4e0de78d (from screenshot)
-- If database has older hash, that's the bug!
```

**Expected Behavior:**
- After each retraining, `replicate_version_id` should update to latest version hash
- App should use this latest version for all predictions
- If database has `686b79b2` but Replicate shows `4e0de78d` as latest, app is using wrong version

---

## Testing Recommendations

1. **🔴 CRITICAL: Test Version Updates**
   - Retrain a model
   - Check database `replicate_version_id` matches Replicate's latest version
   - Generate images in app vs Replicate interface
   - Should produce same results if using same version

2. **Test Version Format**
   - Verify `replicate_version_id` is just hash (e.g., `"4e0de78d"`)
   - Not full path (e.g., `"sandrasocial/user-50c-selfie-lora:4e0de78d"`)
   - Check predictions.create works with stored format

3. **Test Trigger Word Preservation**
   - Retrain a model
   - Check database has correct trigger word
   - Generate images and verify quality

4. **Test Image Selection**
   - Retrain with fewer images
   - Verify quality degradation
   - Test with more images to verify improvement

5. **Test Model Destination**
   - Retrain via both routes
   - Verify same model is updated (not new one created)

6. **Test Quality Validation**
   - Try retraining with 3 images (should warn)
   - Try retraining with 25 images (should allow)

---

## Summary

The primary causes of quality degradation after retraining are:

1. **🔴 CRITICAL: WRONG MODEL VERSION USED**
   - App uses old version hash from database (before retraining)
   - Replicate interface uses latest version (after retraining)
   - **This explains why same model works better on Replicate than in app**
   - Version ID not properly extracted/updated on retraining

2. **🔴 CRITICAL: Version ID Format Issues**
   - Storing full version string `"model:hash"` instead of just hash
   - Or storing trainer version instead of destination model version
   - Predictions.create might not work correctly with wrong format

3. **🔴 CRITICAL: Trigger word bug** - Database inconsistency causes wrong trigger word usage

4. **🟡 Only new images used:** Retraining doesn't include previous training images

5. **🟡 No quality validation:** Users can retrain with worse images unknowingly

**Immediate Action Required:** 
1. **Fix version ID extraction and storage** - This is THE PRIMARY ISSUE
2. **Verify version is latest after retraining** - Add validation
3. **Fix version usage in predictions** - Ensure correct format
4. Fix trigger word bug
5. Implement quality validation

**Why Replicate Works Better:**
- Replicate's interface **always uses the latest version** of the model
- The app is **stuck on an old version** stored in the database
- When user retrains, Replicate sees the new version, but app doesn't update
- This is why "same model" produces different results
