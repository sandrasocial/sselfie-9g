# REPLICATE ERROR HANDLING — User-Friendly Messages

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Purpose:** Replace technical Replicate errors with friendly user messages

---

## 🎯 PROBLEM

When Replicate has issues (rate limits, downtime, content moderation), users were seeing technical error messages like:
- "429 Too Many Requests"
- "502 Bad Gateway"
- "Prediction failed: E005"
- Raw API error messages

**This is confusing and scary for non-technical users.**

---

## ✅ SOLUTION

Created a centralized error handler that translates all Replicate errors into user-friendly messages.

### New File: `lib/replicate-error-handler.ts`

**Key Features:**
- ✅ Translates technical errors to friendly messages
- ✅ Indicates if error is retryable
- ✅ Suggests retry delay
- ✅ Categorizes error severity
- ✅ Logs technical details for debugging

---

## 📋 ERROR TRANSLATIONS

| Replicate Error | User Sees |
|----------------|-----------|
| **429 Rate Limit** | "We're processing a lot of requests right now. Your image will generate in a moment." |
| **502/503/504 Downtime** | "Our image generation service is temporarily down. Please try again in a few minutes." |
| **E005 Content Moderation** | "This image couldn't be generated due to content guidelines. Please try adjusting your prompt or outfit choices." |
| **401/403 Auth Error** | "We're having trouble connecting to our image service. Our team has been notified." |
| **404 Model Not Found** | "The image generation service is unavailable. Our team has been notified." |
| **Timeout** | "Image generation is taking longer than usual. Please try again." |
| **Prediction Failed** | "We couldn't generate this image. Please try again with slightly different settings." |
| **400 Invalid Input** | "There was an issue with your image settings. Please try adjusting your selections." |
| **Network Error** | "Connection issue. Please check your internet and try again." |
| **Capacity/Quota** | "Our image service is at capacity. Please try again in a few minutes." |
| **Reference Image Error** | "There was an issue with your profile photos. Please try re-uploading your photos." |
| **Default Fallback** | "We couldn't generate this image right now. Please try again." |

---

## 🔧 IMPLEMENTATION

### 1. Core Error Handler

**Function:** `getReplicateErrorMessage(error: any)`

```typescript
export function getReplicateErrorMessage(error: any): UserFriendlyError {
  // Returns:
  {
    userMessage: "Friendly message for user",
    technicalMessage: "Original error for logs",
    shouldRetry: true/false,
    retryAfter: 30, // seconds
    severity: 'error' | 'warning' | 'info'
  }
}
```

### 2. API Response Formatter

**Function:** `formatReplicateErrorResponse(error: any, context?: string)`

```typescript
// Returns formatted error for API responses:
{
  error: "User-friendly message",
  details: "Context or technical message",
  shouldRetry: true/false,
  retryAfter: 30,
  severity: 'error',
  _technical: {
    originalError: "...",
    statusCode: 500,
    timestamp: "..."
  }
}
```

### 3. Integration Points

**Files Updated:**

**A. `lib/nano-banana-client.ts`**
- Wrapped errors with context for upstream handling
- Errors now have "Nano Banana generation failed: {reason}" format

**B. `app/api/feed/[feedId]/generate-single/route.ts`**
- Catch block now uses `formatReplicateErrorResponse()`
- Returns user-friendly messages with retry info
- Logs technical details separately

**C. `app/api/feed/[feedId]/check-post/route.ts`**
- Status check errors now use `formatReplicateErrorResponse()`
- Users see friendly messages instead of "Failed to check prediction status"

---

## 🧪 TESTING

### Test Scenarios

**1. Rate Limit (429)**
```
User sees: "We're processing a lot of requests right now. Your image will generate in a moment."
Should retry: Yes (after 30s)
```

**2. Service Down (502)**
```
User sees: "Our image generation service is temporarily down. Please try again in a few minutes."
Should retry: Yes (after 2min)
```

**3. Content Moderation (E005)**
```
User sees: "This image couldn't be generated due to content guidelines. Please try adjusting your prompt or outfit choices."
Should retry: No (requires user action)
```

**4. Generic Error**
```
User sees: "We couldn't generate this image right now. Please try again."
Should retry: Yes (after 30s)
```

### How to Test

1. **Simulate Replicate downtime:** Try generating when Replicate is down
2. **Check console logs:** Should see technical error in logs but friendly message in UI
3. **Check toast messages:** Should display user-friendly error
4. **Verify retry behavior:** Retryable errors should allow retry, non-retryable shouldn't

---

## 📊 ERROR FLOW

### Before

```
Replicate Error (429)
  ↓
App catches error
  ↓
Returns "429 Too Many Requests"
  ↓
User sees technical error in toast 😰
```

### After

```
Replicate Error (429)
  ↓
App catches error
  ↓
formatReplicateErrorResponse() translates
  ↓
Returns "We're processing a lot of requests..."
  ↓
User sees friendly message in toast 😊
  ↓
Technical error logged for debugging
```

---

## 🎯 USER EXPERIENCE IMPROVEMENTS

**Before:**
```
❌ Toast: "Failed to check generation status: 502 Bad Gateway"
```

**After:**
```
✅ Toast: "Our image generation service is temporarily down. Please try again in a few minutes."
```

---

**Before:**
```
❌ Toast: "Prediction failed: E005 - Content moderation triggered"
```

**After:**
```
✅ Toast: "This image couldn't be generated due to content guidelines. Please try adjusting your prompt or outfit choices."
```

---

**Before:**
```
❌ Toast: "Error: Failed to download image_input[0]"
```

**After:**
```
✅ Toast: "There was an issue with your profile photos. Please try re-uploading your photos."
```

---

## 📁 FILES MODIFIED

1. **`lib/replicate-error-handler.ts`** (NEW)
   - Core error translation logic
   - All Replicate error patterns
   - User-friendly message mappings

2. **`lib/nano-banana-client.ts`**
   - Added context to error messages
   - Throws descriptive errors for upstream handling

3. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - Integrated `formatReplicateErrorResponse()`
   - Returns user-friendly errors
   - Logs technical details separately

4. **`app/api/feed/[feedId]/check-post/route.ts`**
   - Integrated `formatReplicateErrorResponse()`
   - Returns user-friendly status check errors

---

## 🔄 FUTURE ENHANCEMENTS

**Potential Additions:**
1. **Retry logic in UI:** Automatically retry retryable errors after suggested delay
2. **Error analytics:** Track which Replicate errors are most common
3. **Status page integration:** Link to status page when service is down
4. **Localization:** Translate messages to user's language

---

## ✅ BENEFITS

1. **Better UX:** Users see helpful, friendly messages
2. **Clear Actions:** Users know what to do (retry, adjust settings, wait)
3. **Reduced Support:** Fewer "what does this error mean?" tickets
4. **Debug-Friendly:** Technical errors still logged for debugging
5. **Consistent:** All Replicate errors handled the same way

---

**Status:** ✅ Production-ready  
**Documentation:** REPLICATE_ERROR_HANDLING_SUMMARY.md  
**Testing:** Manual testing recommended with different Replicate error scenarios
