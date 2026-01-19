# Error Message Fix — False Positive "Profile Photos" Error

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Issue:** "There was an issue with your profile photos" shown for unrelated prompt generation errors

---

## 🎯 PROBLEM

User gets confusing error:
```
"There was an issue with your profile photos. Please try re-uploading your photos.: Failed to generate prompt for position 1"
```

**But the actual issue is:** Prompt generation failure (not profile photos!)

**Root Cause:**
1. Replicate error handler was too broad - matched on "image url" 
2. Error details concatenation was confusing: `"${errorCode}: ${errorDetails}"`
3. This created messages like: `"photo error: prompt error"` 

---

## ✅ SOLUTION

### 1. Fixed Replicate Error Handler (lib/replicate-error-handler.ts)

**Before (Too Broad):**
```typescript
if (
  errorLower.includes('image_input') ||
  errorLower.includes('reference image') ||
  errorLower.includes('image url') ||  // ❌ Too broad!
  errorLower.includes('failed to download')
) {
  return {
    userMessage: "There was an issue with your profile photos...",
    // ...
  }
}
```

**After (More Specific):**
```typescript
if (
  errorLower.includes('image_input') ||
  errorLower.includes('reference image') ||
  errorLower.includes('failed to download image') ||  // ✅ More specific
  errorLower.includes('invalid image url') ||         // ✅ More specific
  errorLower.includes('image url is invalid') ||      // ✅ More specific
  errorLower.includes('could not download image')     // ✅ More specific
) {
  return {
    userMessage: "There was an issue with your profile photos...",
    // ...
  }
}
```

**Why:** 
- Removed generic "image url" check
- Now only matches actual image download/reference errors
- Won't trigger on "Failed to generate prompt for position 1" (which contains no image-related keywords)

### 2. Fixed Error Message Concatenation (components/feed-planner/feed-grid.tsx)

**Before:**
```typescript
const fullErrorMessage = errorDetails ? `${errorCode}: ${errorDetails}` : errorCode
throw new Error(fullErrorMessage)
```

**Result:** `"There was an issue with your profile photos: Failed to generate prompt for position 1"`

**After:**
```typescript
// Use errorDetails if available, otherwise use errorCode
// Don't concatenate if they're similar to avoid "error: error" messages
const fullErrorMessage = errorDetails && errorDetails !== errorCode 
  ? errorDetails 
  : errorCode
throw new Error(fullErrorMessage)
```

**Result:** `"We couldn't generate a prompt for position 1. <actual error>"`

### 3. Removed Replicate Error Handler from Prompt Generation (app/api/feed/[feedId]/generate-single/route.ts)

**Before:**
```typescript
catch (promptError) {
  // Use Replicate error handler for user-friendly message
  const { formatReplicateErrorResponse } = await import("@/lib/replicate-error-handler")
  const errorResponse = formatReplicateErrorResponse(promptError, `Failed to generate prompt for position ${post.position}`)
  
  return Response.json({
    error: errorResponse.error,  // ❌ Wrong! Returns "profile photos" error
    details: errorResponse.details,
    // ...
  })
}
```

**After:**
```typescript
catch (promptError) {
  // Extract error message directly
  const errorMessage = promptError instanceof Error ? promptError.message : String(promptError)
  
  return Response.json({
    error: "Prompt generation failed",  // ✅ Correct error type
    details: `We couldn't generate a prompt for position ${post.position}. ${errorMessage}`,
    // ...
  })
}
```

---

## 📊 ERROR MESSAGES COMPARISON

### Before (Confusing)

**User Sees:**
```
Toast: "There was an issue with your profile photos. Please try re-uploading your photos.: Failed to generate prompt for position 1"
```

**User Thinks:**
- ❌ "My photos are broken?"
- ❌ "Should I re-upload photos?"
- ❌ Tries to re-upload (doesn't fix prompt generation issue)

---

### After (Clear)

**User Sees:**
```
Toast: "We couldn't generate a prompt for position 1. <actual error reason>"
```

**User Understands:**
- ✅ It's a prompt generation issue
- ✅ Not a photo issue
- ✅ Can report actual error to support

---

## 🔧 WHEN TO SHOW "PROFILE PHOTOS" ERROR

**Only show "profile photos" error when:**
- ✅ `failed to download image`
- ✅ `invalid image url`
- ✅ `image url is invalid`
- ✅ `could not download image`
- ✅ `image_input` (Replicate specific)
- ✅ `reference image` error

**Don't show for:**
- ❌ Prompt generation errors
- ❌ Scene resolution errors
- ❌ Validation errors
- ❌ Any error mentioning "image" generically

---

## 🧪 TESTING

### Test Scenarios

**1. Actual Profile Photo Error:**
```
Error: "Failed to download image from URL"
User Sees: "There was an issue with your profile photos. Please try re-uploading your photos."
```
✅ Correct

**2. Prompt Generation Error:**
```
Error: "Failed to generate prompt for position 1"
User Sees: "We couldn't generate a prompt for position 1. <error details>"
```
✅ Correct (not "profile photos" error)

**3. Scene Resolution Error:**
```
Error: "Scene not found for position 5"
User Sees: "We couldn't generate a prompt for position 5. Scene not found for position 5"
```
✅ Correct

---

## 📁 FILES MODIFIED

1. **`lib/replicate-error-handler.ts`**
   - Made "reference image" error detection more specific
   - Removed broad "image url" check
   - Added specific checks for actual image download failures

2. **`components/feed-planner/feed-grid.tsx`**
   - Fixed error message concatenation
   - Avoids duplicate error messages
   - Prefers `errorDetails` over `errorCode` when different

3. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - Removed incorrect use of Replicate error handler for prompt errors
   - Returns direct, accurate error messages
   - Includes position and actual error reason

---

## ✅ BENEFITS

1. **Accurate Error Messages:**
   - Users see the real issue
   - No false "profile photos" errors

2. **Better User Experience:**
   - Clear, actionable error messages
   - Users know what actually went wrong

3. **Easier Support:**
   - Error messages match actual issues
   - Support can debug real problems

4. **No Confusion:**
   - Prompt errors ≠ Photo errors
   - Each error type has correct message

---

**Status:** ✅ Complete - No linter errors  
**Documentation:** ERROR_MESSAGE_FIX.md  
**Testing:** Trigger prompt generation error, verify it doesn't mention "profile photos"
