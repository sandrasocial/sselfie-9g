# Maya New Request Priority Fix

**Date:** January 2025  
**Issue:** Maya continues using the first initial prompt/concept/category even when user provides a NEW request in chat

---

## Problem Identified

When a user:
1. Selects a concept/category initially and generates concepts
2. Then provides a NEW different request in the chat

Maya was still using the OLD guide prompt/concept from the first generation instead of the new request.

**Root Cause:**
- Guide prompts were being extracted from `conversationContext` even when user provided new requests
- Old guide prompts persisted in conversation context from previous generations
- No check to detect if user request was NEW vs continuation of old prompt

---

## Fixes Applied

### 1. ✅ Detect New User Requests
**File:** `app/api/maya/generate-concepts/route.ts` (lines 118-181)

**Added detection for new user requests:**
- Tracks if user provided a new request (`hasNewUserRequest`)
- New request = userRequest with length > 20 characters
- Prevents old guide prompts from being extracted when new request exists

```typescript
let hasNewUserRequest = false
if (!detectedGuidePrompt && userRequest) {
  // ... detailed prompt detection ...
  if (hasSpecificDetails) {
    detectedGuidePrompt = userRequest.trim()
    hasNewUserRequest = true
  } else if (userRequestLength > 20) {
    // User provided a substantial request (even if not detailed enough for guide prompt)
    hasNewUserRequest = true
  }
}
```

### 2. ✅ Conditional Guide Prompt Extraction
**File:** `app/api/maya/generate-concepts/route.ts` (lines 164-181)

**Only extract old guide prompts from conversationContext if:**
- No new userRequest was provided, OR
- The new request appears to be a refinement of the old guide prompt

```typescript
// Only extract guide prompt from conversationContext if no new request
if (!detectedGuidePrompt && conversationContext && !hasNewUserRequest) {
  // Extract old guide prompt
}

// If new request exists, check if it's a refinement or completely different
else if (conversationContext && hasNewUserRequest && !detectedGuidePrompt) {
  // Check if new request mentions similar elements (refinement) or different (new request)
  if (newMentionsOutfit || newMentionsLocation) {
    // Refinement - use old guide prompt
  } else {
    // New request - ignore old guide prompt
  }
}
```

### 3. ✅ Refinement Detection
**File:** `app/api/maya/generate-concepts/route.ts` (lines 168-181)

**Detects if new request is:**
- **Refinement**: Mentions similar elements (outfit, location) as old guide prompt → use old guide prompt
- **New Request**: Doesn't mention similar elements → ignore old guide prompt, use new request

```typescript
const oldHasOutfit = /(?:wearing|outfit|dress|sweater|pajamas|gloves|heels)/i.test(oldGuidePrompt)
const newMentionsOutfit = oldHasOutfit && /(?:wearing|outfit|dress|sweater|pajamas|gloves|heels)/i.test(userRequest || "")
// If new request mentions similar elements, it's a refinement
```

### 4. ✅ Concept Selection Override
**File:** `app/api/maya/generate-concepts/route.ts` (lines 333-349)

**Only extract concept from referenceImages if no new user request:**
- If `hasNewUserRequest` is true, don't auto-extract concept from referenceImages
- Still extract it but mark it as lower priority (will be handled by `shouldPrioritizeUserRequest` logic)

### 5. ✅ Improved Different Request Detection
**File:** `app/api/maya/generate-concepts/route.ts` (line 350)

**Fixed to only check userRequest, not combined with conversationContext:**
- Changed from: `combinedUserRequest` (includes old context)
- Changed to: `userRequestLower` (only current request)
- This ensures we detect NEW requests, not old context

---

## Expected Behavior After Fix

### Before (Broken)
```
1. User selects "Christmas Cozy" concept → Generates concepts
2. User asks: "Actually, I want a beach scene instead"
3. Maya: Still uses "Christmas Cozy" from first generation ❌
```

### After (Fixed)
```
1. User selects "Christmas Cozy" concept → Generates concepts
2. User asks: "Actually, I want a beach scene instead"
3. Maya: Detects NEW request → Ignores old "Christmas Cozy" → Uses "beach scene" ✅
```

### Refinement Detection (Still Works)
```
1. User provides guide prompt: "Red dress, Christmas tree, warm lighting"
2. User asks: "Make it a blue dress instead"
3. Maya: Detects refinement (mentions dress + location) → Uses old guide prompt but with blue dress ✅
```

---

## Testing

To verify the fix works:

1. **Test New Request:**
   - Generate concepts with initial concept/category
   - Ask for something completely different
   - Verify Maya uses NEW request, not old concept

2. **Test Refinement:**
   - Generate concepts with guide prompt
   - Ask to change one element (e.g., "make it blue instead")
   - Verify Maya refines old guide prompt

3. **Check Logs:**
   - `[v0] ✅ User provided new request - will NOT use old guide prompt`
   - `[v0] ✅ User request appears to be refinement of old guide prompt`

---

## Files Modified

1. **`app/api/maya/generate-concepts/route.ts`**
   - Added `hasNewUserRequest` tracking
   - Conditional guide prompt extraction from conversationContext
   - Refinement detection logic
   - Concept selection override for new requests

---

## Status

✅ **Fix Applied**: All changes implemented  
✅ **New Request Detection**: Tracks when user provides new requests  
✅ **Conditional Extraction**: Only uses old guide prompts when appropriate  
✅ **Refinement Detection**: Distinguishes refinements from new requests  
⏳ **Ready for Testing**: Test with new requests vs refinements

---

## Next Steps

1. Test with completely different new requests
2. Test with refinements of existing guide prompts
3. Verify old concepts/categories don't persist inappropriately
4. Check logs to confirm correct behavior

























