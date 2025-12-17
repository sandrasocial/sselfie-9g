# Retraining Mixed Quality - Root Cause Analysis

## 🔍 Problem Statement

**Users get really good images after their first training, but if they retrain they get mixed quality.**

This is NOT about training parameters (which are tested and verified). This is about **what happens differently during retraining**.

---

## 🔴 **CRITICAL BUG FOUND: Order of Operations Issue**

### The Problem:

**In `app/api/training/upload-zip/route.ts`:**

1. Line 205: Calls `getOrCreateTrainingModel()` FIRST
2. Line 110 in `lib/data/training.ts`: This sets `replicate_model_id = NULL`
3. Line 233: THEN tries to check for existing model to get model name
4. **Result:** `replicate_model_id` is already NULL, so check fails!
5. **Result:** Creates NEW model name instead of reusing existing one!

### Impact:

- **First training:** Creates model `user-50c-selfie-lora` ✅
- **Retraining:** Should reuse `user-50c-selfie-lora`, but creates NEW model instead ❌
- **Result:** Multiple models on Replicate, each trained independently
- **Result:** Mixed quality because each retraining creates a separate model

---

## 🔴 **CRITICAL BUG #2: replicate_model_id Set to NULL**

### The Problem:

**In `lib/data/training.ts` line 110:**

```typescript
replicate_model_id = NULL, -- Will be set when training starts
```

This clears the model ID **before** we need it to determine the destination model name.

### Impact:

- When retraining, we lose the original model ID
- Can't determine which model to update
- Creates new model instead of updating existing one

---

## ✅ **FIXES IMPLEMENTED**

### Fix #1: Preserve replicate_model_id During Retraining

**File:** `lib/data/training.ts`

**Change:**
- Instead of setting `replicate_model_id = NULL`
- Preserve it: `replicate_model_id = ${preservedModelId}`
- This allows us to reuse the model name

### Fix #2: Check for Existing Model BEFORE getOrCreateTrainingModel

**File:** `app/api/training/upload-zip/route.ts`

**Change:**
- Get existing model info FIRST (before calling getOrCreateTrainingModel)
- Extract model name from existing `replicate_model_id`
- THEN call getOrCreateTrainingModel (which now preserves the ID)

---

## 🎯 **Why This Causes Mixed Quality**

### Scenario:

1. **First Training:**
   - Creates: `sandrasocial/user-50c-selfie-lora` (version 1)
   - Quality: ✅ Good

2. **Retraining (BEFORE FIX):**
   - Should update: `sandrasocial/user-50c-selfie-lora` (version 2)
   - Actually creates: `sandrasocial/user-50c-selfie-lora` (NEW model, version 1)
   - OR: Creates completely different model name
   - Quality: ❌ Mixed (different model, different training data)

3. **Retraining (AFTER FIX):**
   - Updates: `sandrasocial/user-50c-selfie-lora` (version 2)
   - Quality: ✅ Consistent (same model, updated version)

### Why Mixed Quality Happens:

- Each retraining creates a **separate model** instead of updating the same one
- Different models have different training histories
- App might use wrong model version
- Inconsistent results across retrainings

---

## 📊 **What Should Happen vs What Was Happening**

### ✅ **Correct Flow (After Fix):**

```
First Training:
  → Creates: sandrasocial/user-50c-selfie-lora (version 1)
  → Database: replicate_model_id = "sandrasocial/user-50c-selfie-lora"

Retraining:
  → Checks database: Finds replicate_model_id
  → Reuses: sandrasocial/user-50c-selfie-lora
  → Updates: Creates version 2 of SAME model
  → Database: replicate_model_id = "sandrasocial/user-50c-selfie-lora" (same)
  → Quality: ✅ Consistent
```

### ❌ **Broken Flow (Before Fix):**

```
First Training:
  → Creates: sandrasocial/user-50c-selfie-lora (version 1)
  → Database: replicate_model_id = "sandrasocial/user-50c-selfie-lora"

Retraining:
  → getOrCreateTrainingModel() sets replicate_model_id = NULL
  → Check for existing model: Finds NULL
  → Creates NEW: sandrasocial/user-50c-selfie-lora (NEW model, version 1)
  → OR: Creates different model name
  → Database: replicate_model_id = "sandrasocial/user-50c-selfie-lora" (but it's a NEW model)
  → Quality: ❌ Mixed (different model)
```

---

## 🔬 **How to Verify the Fix**

### Check Database:

```sql
-- Should show same replicate_model_id across retrainings
SELECT 
  id,
  user_id,
  replicate_model_id,
  replicate_version_id,
  training_status,
  created_at,
  updated_at
FROM user_models
WHERE user_id = 'USER_ID_HERE'
ORDER BY updated_at DESC;
```

### Check Replicate:

- Go to: `https://replicate.com/sandrasocial/user-50c-selfie-lora`
- Should see: Multiple versions of SAME model (not multiple models)
- Versions should increment: v1, v2, v3, etc.

### Expected Behavior After Fix:

- ✅ Same `replicate_model_id` across all retrainings
- ✅ Multiple versions of same model on Replicate
- ✅ Consistent quality across retrainings
- ✅ App uses latest version correctly

---

## 📝 **Summary**

**Root Cause:** 
- `replicate_model_id` was set to NULL before checking for existing model
- This caused retraining to create NEW models instead of updating existing ones
- Each new model = different quality = mixed results

**Fix:**
- Preserve `replicate_model_id` during retraining
- Check for existing model BEFORE calling getOrCreateTrainingModel
- Reuse same model name for all retrainings

**Result:**
- Retraining now updates the same model (creates new version)
- Consistent quality across retrainings
- App uses correct, latest version
