# Consistency Mode Reference Images Implementation Checklist

## 📋 Specification vs Implementation Review

### ✅ IMPLEMENTED

#### Imports
- [x] `generateWithNanoBanana` imported from `@/lib/nano-banana-client`
- [x] `checkNanoBananaPrediction` imported from `@/lib/nano-banana-client`
- [x] `put` imported from `@vercel/blob`

#### Main Logic Structure
- [x] Consistency mode check: `consistencyMode === 'consistent' && concepts.length >= 2 && studioProMode`
- [x] User selfies extraction: `referenceImages?.selfies || []`
- [x] Concept #1 generation with `generateWithNanoBanana`
- [x] Polling loop for concept #1 completion (30 attempts max)
- [x] Download concept #1 image from URL
- [x] Store concept #1 in Vercel Blob
- [x] Build reference image array: `[...userSelfies, blob.url]`
- [x] Generate concepts #2-6 with reference images
- [x] Store `predictionId` and `referenceImages` on concepts

#### Helper Function
- [x] `enhancePromptForReferences()` function exists
- [x] Function handles prompts with reference instructions
- [x] Function builds specific image role instructions

#### Edge Cases
- [x] Handles concept #1 generation failure
- [x] Handles timeout (30 attempts max)
- [x] Handles missing prompts
- [x] Error handling with try-catch blocks
- [x] Fallback to prompt-based consistency on errors

---

### ❌ NOT IMPLEMENTED / ISSUES FOUND

#### 1. ⚠️ **CRITICAL: No Selfies Check Blocks Entire Flow**
**Location:** Line 4237-4240
```typescript
if (userSelfies.length === 0) {
  console.log("[v0] No user selfies provided, using prompt-based consistency only")
}
```
**Issue:** According to spec, the flow should work WITHOUT selfies (just using concept #1). Currently, it completely skips the reference image flow if no selfies.

**Fix Needed:** Remove this check OR allow concept #1-only reference flow.

---

#### 2. ⚠️ **CRITICAL: Concepts #2-6 Only Store predictionId, Not imageUrl**
**Location:** Line 4359-4361
```typescript
concept.predictionId = generation.predictionId
concept.referenceImages = referenceImageArray
```
**Issue:** The implementation stores `predictionId` but NOT the final `imageUrl`. Concepts #2-6 need their images to be polled separately. The spec implies they should be generated synchronously OR the frontend needs to poll.

**Fix Needed:** Either:
- Wait for concepts #2-6 to complete (add polling), OR
- Document that frontend must poll for completion

---

#### 3. ⚠️ **Missing: Prompt Enhancement Logic May Not Work**
**Location:** Line 4343-4346
```typescript
const enhancedPrompt = enhancePromptForReferences(
  concept.prompt,
  userSelfies.length
)
```
**Issue:** The `enhancePromptForReferences` function only modifies prompts that already have "character consistency with provided reference images" text. If Maya's prompts don't include this exact text, the enhancement won't happen.

**Fix Needed:** Verify that Maya's prompts include this text, OR make the enhancement more robust.

---

#### 4. ⚠️ **Potential: Reference Image Array Order May Be Incorrect**
**Location:** Line 4316-4319
```typescript
const referenceImageArray = [
  ...userSelfies, // User's face (images 1-N)
  blob.url // Concept #1 outfit/styling (last image)
]
```
**Issue:** This is correct according to spec, BUT the prompt enhancement references "images 1-3" for selfies and "image 4" for concept #1. If user has 1 selfie, it should be "image 1" and "image 2", not "images 1-1" and "image 2".

**Fix Needed:** Check that `enhancePromptForReferences` handles variable selfie counts correctly.

---

#### 5. ⚠️ **Missing: No Validation That Concept #1 Image Is Actually Used**
**Location:** Line 4350
```typescript
image_input: referenceImageArray,
```
**Issue:** The code builds `referenceImageArray` but there's no validation that `blob.url` is actually a valid URL or that the array is correct.

**Fix Needed:** Add validation before using `referenceImageArray`.

---

#### 6. ⚠️ **Missing: aspectRatio Variable May Not Be Defined**
**Location:** Lines 4253, 4351
```typescript
aspect_ratio: aspectRatio || "1:1",
```
**Issue:** Need to verify that `aspectRatio` is defined in scope. Check if it comes from request body.

**Fix Needed:** Verify `aspectRatio` is available in scope.

---

#### 7. ⚠️ **Potential: Reference Images Not Actually Being Used by Frontend**
**Issue:** The implementation stores `predictionId` and `referenceImages` on the concept objects, but the frontend may not be using these fields to actually generate images. The frontend may be generating images separately using just the prompts.

**Fix Needed:** Verify frontend behavior - does it use `predictionId` to poll for completion, or does it generate images separately?

---

### 🔍 QUESTIONS TO INVESTIGATE

1. **Where does `aspectRatio` come from?** Check if it's defined in the request body extraction.
2. **Does the frontend poll for prediction completion?** Check if there's a polling mechanism for `predictionId`.
3. **Do Maya's prompts include "character consistency with provided reference images"?** Verify the actual prompt structure.
4. **What happens to concepts after they're returned?** Are they used immediately or stored for later generation?

---

### 🚨 ROOT CAUSE ANALYSIS

Based on user's complaint: "The image generated from the first concept generated (of the batch) is not being sent as reference"

**Most Likely Issues:**
1. The no-selfies check is blocking the flow entirely
2. Concepts #2-6 are not actually using the reference images (frontend may be generating separately)
3. The reference image array is built but not properly passed/used
4. Timing issue: Concepts #2-6 might be generated before concept #1 completes

---

### ✅ RECOMMENDED FIXES

#### Fix 1: Remove No-Selfies Block
```typescript
// REMOVE THIS:
if (userSelfies.length === 0) {
  console.log("[v0] No user selfies provided, using prompt-based consistency only")
} else {
  // ... rest of logic
}

// REPLACE WITH:
// Allow flow to continue even without selfies (just use concept #1)
const userSelfies = referenceImages?.selfies || []
console.log("[v0] User selfies available:", userSelfies.length)

// Continue with logic (concept #1 can work without selfies)
```

#### Fix 2: Wait for Concept #1 Before Generating #2-6
```typescript
// Ensure concept1Url exists before building referenceImageArray
if (!concept1Url) {
  // ... error handling
} else {
  // Build reference array
  const referenceImageArray = userSelfies.length > 0 
    ? [...userSelfies, blob.url]
    : [blob.url] // Even without selfies, use concept #1
  
  // ... rest of logic
}
```

#### Fix 3: Add Validation
```typescript
// Validate reference image array before use
if (!referenceImageArray || referenceImageArray.length === 0) {
  console.error("[v0] Invalid reference image array")
  throw new Error("Reference image array is empty")
}

// Validate URLs
const invalidUrls = referenceImageArray.filter(url => !url || !url.startsWith('http'))
if (invalidUrls.length > 0) {
  console.error("[v0] Invalid URLs in reference array:", invalidUrls)
  throw new Error("Reference image array contains invalid URLs")
}
```

---

### 📊 IMPLEMENTATION STATUS SUMMARY

| Feature | Status | Notes |
|---------|--------|-------|
| Imports | ✅ Complete | All required imports present |
| Concept #1 Generation | ✅ Complete | Generates with selfies |
| Concept #1 Polling | ✅ Complete | 30 attempts, 1s intervals |
| Concept #1 Storage | ✅ Complete | Downloads and stores in Vercel Blob |
| Reference Array Building | ✅ Complete | [...userSelfies, blob.url] |
| Concepts #2-6 Generation | ✅ Complete | Uses reference array |
| Prompt Enhancement | ⚠️ Conditional | Only works if prompt has specific text |
| No Selfies Handling | ❌ Broken | Blocks entire flow |
| Error Handling | ✅ Good | Try-catch blocks present |
| Validation | ⚠️ Missing | No URL validation |
| Frontend Integration | ❓ Unknown | Need to verify polling mechanism |

---

## 🎯 NEXT STEPS

1. **Remove no-selfies check** - Allow flow to work without selfies
2. **Add validation** - Validate reference image URLs before use
3. **Verify aspectRatio** - Ensure it's defined in scope
4. **Check frontend** - Verify how frontend handles `predictionId`
5. **Test end-to-end** - Test with and without selfies
6. **Add logging** - More detailed logs to trace reference image flow




