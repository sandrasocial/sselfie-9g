# Content Moderation Error Handling Fix (E005)

**Date:** 2026-01-17  
**Issue:** Console error showing raw Anthropic E005 content moderation errors  
**Priority:** P1 (User experience degradation)

---

## PROBLEM

When AI-generated content is flagged by Anthropic's safety systems (error code E005), users see a confusing technical error in the console:

```
The input or output was flagged as sensitive. Please try again with different inputs. (E005) (uIJ6l3ruRD)
```

This error is not being handled gracefully, causing:
1. Console errors that confuse users
2. No clear guidance on what to do next
3. Poor UX during feed generation

---

## ROOT CAUSE

The E005 error flows through the system without special handling:

1. **Replicate prediction fails** due to Anthropic content moderation
2. **API returns raw error:** `app/api/feed/[feedId]/check-post/route.ts` line 270
3. **Hook throws error:** `lib/hooks/use-feed-post-polling.ts` line 57
4. **User sees console error** instead of friendly message

---

## FIX APPLIED

### 1. API Layer: Detect and Transform E005 Errors

**File:** `app/api/feed/[feedId]/check-post/route.ts`  
**Lines:** 261-288 (updated)

```typescript
} else if (prediction.status === "failed") {
  // 🔴 FIX: Handle content moderation errors gracefully (E005)
  const originalError = prediction.error || "Generation failed"
  const isContentFlagged = 
    originalError.includes("E005") || 
    originalError.includes("flagged as sensitive") ||
    originalError.includes("content moderation") ||
    originalError.toLowerCase().includes("inappropriate")
  
  // Use a user-friendly error message
  const userFriendlyError = isContentFlagged
    ? "Content flagged by safety systems. Please try different wording or style."
    : originalError
  
  if (isContentFlagged) {
    console.warn(`[v0] ⚠️ Content moderation triggered for post ${postId}:`, originalError)
  } else {
    console.error(`[v0] ❌ Generation failed for post ${postId}:`, originalError)
  }

  await sql`
    UPDATE feed_posts
    SET generation_status = 'failed'
    WHERE id = ${Number.parseInt(postId)}
  `

  return NextResponse.json({
    status: "failed",
    error: userFriendlyError, // User sees friendly message
  })
}
```

**Changes:**
- ✅ Detects E005 and similar content moderation errors
- ✅ Transforms to user-friendly message
- ✅ Logs warning (not error) for content flags
- ✅ Returns clear guidance to user

---

### 2. Polling Hook: Handle Content Flags Gracefully

**File:** `lib/hooks/use-feed-post-polling.ts`  
**Lines:** 53-85 (updated)

```typescript
const data = await response.json()

// Handle errors from API
if (data.error) {
  // 🔴 FIX: Handle content moderation errors gracefully (E005)
  const errorMessage = data.error || "Failed to check generation status"
  const isContentFlagged = errorMessage.includes("E005") || errorMessage.includes("flagged as sensitive")
  
  if (isContentFlagged) {
    console.warn(`[useFeedPostPolling] Content flagged for post ${postId}:`, errorMessage)
    // Set a user-friendly error message
    const friendlyError = "Content flagged by safety systems. Please try different wording or style."
    setStatus("failed")
    setError(friendlyError)
    setImageUrl(null)

    // Stop polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // Call error callback with friendly message
    if (onError) {
      onError(friendlyError)
    }
    return // Don't throw - handle gracefully
  }
  
  // For other errors, throw as before
  throw new Error(errorMessage)
}
```

**Changes:**
- ✅ Detects E005 errors before throwing
- ✅ Sets friendly error message
- ✅ Stops polling gracefully
- ✅ Calls error callback with user-friendly message
- ✅ Prevents console error from being thrown

---

## USER EXPERIENCE

### Before Fix
```
❌ Console Error: The input or output was flagged as sensitive. Please try again with different inputs. (E005) (uIJ6l3ruRD)
```
- User sees confusing technical error
- No guidance on what to do
- May think the app is broken

### After Fix
```
⚠️ Post generation failed
Message: "Content flagged by safety systems. Please try different wording or style."
```
- User sees clear, actionable message
- Knows what happened (content flagged)
- Knows what to do (try different wording)

---

## TESTING

### Manual Test Steps

1. **Trigger content moderation:**
   - Create a feed post with potentially flagged content
   - Example: Request extremely specific/unusual combinations that might trigger safety
   - Watch for E005 error during generation

2. **Verify error handling:**
   - ✅ User sees friendly message (not E005 code)
   - ✅ Message says "Content flagged by safety systems"
   - ✅ Guidance provided: "try different wording or style"
   - ✅ No console error thrown
   - ✅ Post marked as failed in database
   - ✅ User can regenerate with different prompt

3. **Verify other errors still work:**
   - Test non-content-moderation errors (network, timeout, etc.)
   - ✅ These should still show normal error messages
   - ✅ Console logging should still work

---

## FILES CHANGED

1. `app/api/feed/[feedId]/check-post/route.ts`
   - Lines 261-288: Added E005 detection and transformation

2. `lib/hooks/use-feed-post-polling.ts`
   - Lines 53-85: Added graceful E005 handling before throw

---

## IMPACT

**Severity:** P1 (User experience degradation)  
**Risk:** Low (defensive code, doesn't change happy path)  
**Testing:** Manual (requires triggering content moderation)

**Benefits:**
- ✅ Better user experience during content moderation
- ✅ Clear guidance on what to do
- ✅ No confusing console errors
- ✅ Maintains error logging for debugging

---

## ROLLBACK PLAN

If this fix causes issues, revert both files:

```bash
git checkout HEAD -- app/api/feed/[feedId]/check-post/route.ts
git checkout HEAD -- lib/hooks/use-feed-post-polling.ts
```

---

## RELATED ISSUES

- Anthropic E005 content moderation errors
- User confusion during feed generation failures
- Console errors causing support tickets

---

**Status:** ✅ **FIXED**  
**Next Steps:** Monitor for E005 errors in production logs
