# Empty Error Object Fix — Better Console Logging

**Date:** 2026-01-19  
**Issue:** `[useFeedPostPolling] Error checking post 3851: {}`  
**Status:** ✅ FIXED

---

## 🎯 PROBLEM

Console error was showing empty object `{}` instead of useful error information:

```
[useFeedPostPolling] Error checking post 3851: {}
```

This made debugging impossible because:
- No error message visible
- No stack trace
- No context about what went wrong

---

## 🔍 ROOT CAUSE

The error object was being logged inside another object, and when the error had no enumerable properties, it appeared as `{}`:

```typescript
// BAD - Shows {} for errors with no enumerable properties
console.error(`[useFeedPostPolling] Error checking post ${postId}:`, {
  error: errorMessage,  // If errorMessage is an object with no properties → {}
  errorType: '...',
  // ...
})
```

---

## ✅ SOLUTION

**File: `lib/hooks/use-feed-post-polling.ts` (Lines 186-196)**

### Changed Logging Strategy

**Before:**
```typescript
console.error(`[useFeedPostPolling] Error checking post ${postId}:`, {
  error: errorMessage,
  errorType: err instanceof Error ? err.constructor.name : typeof err,
  errorDetails: Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
  postId,
  predictionId,
  feedId,
})
```

**After:**
```typescript
// Log errorMessage directly (not in object) to avoid empty {} display
console.error(`[useFeedPostPolling] Error checking post ${postId}: ${errorMessage}`)
console.error(`[useFeedPostPolling] Error context:`, {
  errorType: err instanceof Error ? err.constructor.name : typeof err,
  errorDetails: Object.keys(errorDetails).length > 0 ? errorDetails : 'No additional details',
  postId,
  predictionId,
  feedId,
  rawError: err // Include raw error for full inspection
})
```

---

## 🔧 KEY IMPROVEMENTS

1. **Error message in string:** Log error message directly in the string template, not in an object
2. **Separate context log:** Second `console.error` with context details
3. **Raw error included:** Added `rawError: err` to see the original error object
4. **Better fallback:** If no details, show `'No additional details'` instead of `undefined`

---

## 📊 BEFORE vs AFTER

### Before (Empty Object)

```
[useFeedPostPolling] Error checking post 3851: {}
```

**Result:** Useless, no debugging information ❌

---

### After (Detailed Error)

```
[useFeedPostPolling] Error checking post 3851: Failed to check generation status
[useFeedPostPolling] Error context: {
  errorType: 'Error',
  errorDetails: { name: 'Error', message: 'Failed to check generation status', stack: '...' },
  postId: 3851,
  predictionId: 'abc123',
  feedId: '456',
  rawError: Error { ... }
}
```

**Result:** Actionable debugging information ✅

---

## 🧪 TESTING

To verify the fix:

1. **Trigger an error** in feed post polling (e.g., disconnect network)
2. **Check console** - Should now see:
   ```
   [useFeedPostPolling] Error checking post XXXX: <actual error message>
   [useFeedPostPolling] Error context: { ... detailed info ... }
   ```
3. **No empty `{}`** should appear

---

## 📋 RELATED IMPROVEMENTS

This same pattern should be applied to other console.error calls that might log empty objects:

**Files to Check:**
- `lib/hooks/use-feed-polling.ts`
- `components/feed-planner/feed-single-placeholder.tsx`
- `components/feed-planner/feed-header.tsx`
- Any other hooks with catch blocks

**Pattern to Follow:**
```typescript
// ✅ GOOD - Error message in string, context in separate log
console.error(`[Context] Error: ${errorMessage}`)
console.error(`[Context] Details:`, { ...context, rawError: err })

// ❌ BAD - Can show {} if errorMessage is an object
console.error(`[Context] Error:`, { error: errorMessage, ...context })
```

---

## ✅ COMPLETED

- ✅ Fixed `use-feed-post-polling.ts` error logging
- ✅ Error message now logged directly in string
- ✅ Raw error included for full inspection
- ✅ No linter errors

---

**Status:** ✅ Complete  
**Documentation:** EMPTY_ERROR_OBJECT_FIX.md  
**Next:** Monitor console for any remaining empty `{}` errors in other hooks
