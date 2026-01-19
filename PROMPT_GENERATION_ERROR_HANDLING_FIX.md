# Prompt Generation Error Handling Fix — Better Error Messages & Debugging

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Issue:** Generic "Failed to generate prompt" error with no useful debugging information

---

## 🎯 PROBLEM

Users seeing generic error: "**Failed to generate prompt. Please try again.**"

This error provided:
- ❌ No indication of WHY it failed
- ❌ No scene/position information  
- ❌ No debugging logs for developers
- ❌ No user guidance on how to fix it

**Result:** Users stuck with no actionable information, developers can't debug.

---

## ✅ SOLUTION

**File:** `app/api/feed/[feedId]/generate-single/route.ts`

Added comprehensive error handling at three levels:

### 1. Immediate Prompt Generation Errors (Lines 620-642, 651-673)

**For Free Users & Membership Users:**

```typescript
try {
  finalPrompt = buildSingleScenePromptFromScene(sceneForPosition)
  
  if (!finalPrompt || finalPrompt.trim().length < 20) {
    throw new Error(`Prompt too short or empty: ${finalPrompt?.length || 0} characters`)
  }
  
  console.log("[v0] ✅ Prompt generated successfully")
} catch (promptError) {
  console.error(`[v0] ❌ Prompt generation failed for scene ${post.position}:`, promptError)
  console.error(`[v0] Scene data:`, JSON.stringify(sceneForPosition, null, 2))
  
  // User-friendly error message
  const { formatReplicateErrorResponse } = await import("@/lib/replicate-error-handler")
  const errorResponse = formatReplicateErrorResponse(promptError, `Failed to generate prompt for position ${post.position}`)
  
  return Response.json({
    error: errorResponse.error,
    details: errorResponse.details,
    position: post.position,
    sceneInfo: {
      position: sceneForPosition.position,
      activity: sceneForPosition.activity,
      category: sceneForPosition.category
    }
  }, { status: 500 })
}
```

**Benefits:**
- ✅ Catches errors immediately after prompt generation
- ✅ Logs full scene data for debugging
- ✅ Returns scene info to help identify the problem
- ✅ Uses Replicate error handler for friendly messages

### 2. Final Validation Check (Lines 1232-1251)

**Before:**
```typescript
if (!finalPrompt || finalPrompt.trim().length < 20) {
  return Response.json(
    { error: "Failed to generate prompt. Please try again." },
    { status: 500 }
  )
}
```

**After:**
```typescript
if (!finalPrompt || finalPrompt.trim().length < 20) {
  console.error(`[v0] ❌ Final prompt validation failed`, {
    promptLength: finalPrompt?.length || 0,
    promptPreview: finalPrompt?.substring(0, 100) || '(empty)',
    postId,
    position: post.position,
    feedId: feedIdInt,
    access: {
      isPaidBlueprint: access.isPaidBlueprint,
      isFree: access.isFree,
      isMembership: access.isMembership
    }
  })
  
  return Response.json({
    error: "Prompt generation incomplete",
    details: "We couldn't generate a valid prompt for your image. This might be due to missing brand profile information. Please ensure your feed style and aesthetic are set.",
    position: post.position,
    feedId: feedIdInt
  }, { status: 500 })
}
```

**Benefits:**
- ✅ Detailed error logging with context
- ✅ User-friendly error message
- ✅ Actionable guidance (check brand profile)
- ✅ Includes position and feed ID for debugging

---

## 📊 ERROR MESSAGES COMPARISON

### Before

**Console:**
```
(no logs)
```

**User Sees:**
```
Toast: "Failed to generate prompt. Please try again."
```

**Developer Gets:**
- ❌ No error logs
- ❌ No scene data
- ❌ No position info
- ❌ Can't reproduce or debug

---

### After

**Console (Immediate Error):**
```
[v0] ❌ Prompt generation failed for scene 5: Error: Prompt too short or empty: 0 characters
[v0] Scene data: {
  "position": 5,
  "activity": "walking",
  "category": "bohemian",
  "outfit": { ... },
  "location": { ... },
  "objects": [ ... ]
}
```

**Console (Final Validation):**
```
[v0] ❌ Final prompt validation failed {
  promptLength: 0,
  promptPreview: "(empty)",
  postId: 3851,
  position: 5,
  feedId: 123,
  access: { isPaidBlueprint: false, isFree: true, isMembership: false }
}
```

**User Sees:**
```
Toast: "We couldn't generate a valid prompt for your image."
Details: "This might be due to missing brand profile information. Please ensure your feed style and aesthetic are set."
```

**Developer Gets:**
- ✅ Full error logs with context
- ✅ Complete scene data JSON
- ✅ Position, feed ID, user access level
- ✅ Can reproduce and fix the issue

---

## 🔍 DEBUGGING INFORMATION CAPTURED

### Immediate Error (Caught at Generation)
1. **Error Message:** Exact error from prompt builder
2. **Position:** Which post (1-9) failed
3. **Scene Data:** Complete scene JSON including:
   - Activity
   - Category
   - Outfit
   - Location
   - Objects
   - Lighting
   - Camera settings

### Final Validation Error (Fallback)
1. **Prompt Length:** Exact character count
2. **Prompt Preview:** First 100 characters (if any)
3. **Post ID:** Database ID for tracking
4. **Position:** Which post (1-9)
5. **Feed ID:** Which feed layout
6. **Access Level:** Free/Paid/Membership status

---

## 🎯 USER GUIDANCE

Old message:
```
"Failed to generate prompt. Please try again."
```

New message:
```
"We couldn't generate a valid prompt for your image. 
This might be due to missing brand profile information. 
Please ensure your feed style and aesthetic are set."
```

**Tells users:**
- ✅ What went wrong (prompt generation incomplete)
- ✅ Likely cause (missing brand profile)
- ✅ How to fix it (set feed style and aesthetic)

---

## 🧪 TESTING

### Test Scenarios

**1. Missing Visual Aesthetic:**
- User hasn't set visual aesthetic in feed style picker
- Should get clear error with guidance to set aesthetic

**2. Invalid Scene Data:**
- Scene resolver returns incomplete data
- Should log full scene JSON for debugging

**3. Prompt Builder Crashes:**
- Exception in prompt-shaper.ts
- Should catch error, log details, return friendly message

**4. Empty Prompt Returned:**
- Prompt builder returns empty string
- Should detect in immediate try/catch
- Should log scene data and return error before proceeding

---

## 📁 FILES MODIFIED

**`app/api/feed/[feedId]/generate-single/route.ts`**
- Lines 620-642: Added try/catch for free user prompt generation
- Lines 651-673: Added try/catch for membership user prompt generation
- Lines 1232-1251: Enhanced final validation with detailed logging and user guidance

---

## ✅ BENEFITS

1. **Developer Experience:**
   - Full error logs with scene data
   - Can reproduce and debug issues
   - Clear error categorization

2. **User Experience:**
   - Friendly, actionable error messages
   - Guidance on how to fix the issue
   - No generic "try again" messages

3. **Production Monitoring:**
   - Better error tracking
   - Can identify patterns (e.g., specific positions failing)
   - Scene data captured for analysis

4. **Error Recovery:**
   - Fails fast with clear errors
   - No silent failures
   - Users know what action to take

---

**Status:** ✅ Complete - No linter errors  
**Documentation:** PROMPT_GENERATION_ERROR_HANDLING_FIX.md  
**Testing:** Trigger error by generating without feed style set, check console logs and toast message
