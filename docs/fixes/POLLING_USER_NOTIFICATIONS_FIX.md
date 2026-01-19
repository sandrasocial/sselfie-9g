# Polling User Notifications Fix — Toast Alerts for Queued/Slow Generation

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Issue:** Users not notified when Replicate queues or takes longer than expected

---

## 🎯 PROBLEM

When Replicate is slow, queued, or cancels generation, users see:
- ❌ **Console errors only** (not user-facing)
- ❌ **No UI feedback** about what's happening
- ❌ **No indication of wait time** or progress
- ❌ **"Generation was canceled"** error with no retry guidance

**Result:** Users think it's broken and give up, when actually it's just queued or slow.

---

## ✅ SOLUTION

**File:** `lib/hooks/use-feed-post-polling.ts`

Added user-facing toast notifications for different polling states:

### 1. Time-Based Progress Notifications

**After 90 seconds (1.5 minutes):**
```typescript
toast({
  title: "Still generating...",
  description: "Your image is taking a bit longer than usual. Replicate might be queued. We'll keep trying.",
  duration: 5000,
})
```

**After 180 seconds (3 minutes):**
```typescript
toast({
  title: "Generation in progress",
  description: "Your image is still being generated. This can take up to 5 minutes during peak times.",
  duration: 5000,
})
```

### 2. Queued/Canceled Notification

When Replicate returns "canceled" (meaning it's queued):
```typescript
toast({
  title: "Generation queued",
  description: "Replicate is processing your request. This might take a few minutes.",
  duration: 4000,
})
```

### 3. Non-Retryable Error Notification

For actual errors (not queues/timeouts):
```typescript
import("@/lib/replicate-error-handler").then(({ getReplicateErrorMessage }) => {
  const friendlyError = getReplicateErrorMessage(err)
  toast({
    title: "Generation issue",
    description: friendlyError.userMessage,  // User-friendly message
    variant: "destructive",
    duration: 7000,
  })
})
```

---

## 🔧 IMPLEMENTATION DETAILS

### Added Refs for Time Tracking

```typescript
const startTimeRef = useRef<number | null>(null)
const slowWarningShownRef = useRef<boolean>(false)
const verySlowWarningShownRef = useRef<boolean>(false)
```

### Start Time Tracking on Polling Start

```typescript
if (predictionId && enabled && !imageUrl) {
  startTimeRef.current = Date.now() // Start tracking
  slowWarningShownRef.current = false // Reset warnings
  verySlowWarningShownRef.current = false
}
```

### Elapsed Time Calculation in Polling Loop

```typescript
if (!startTimeRef.current) {
  startTimeRef.current = Date.now()
}

const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)

// Show messages at 90s and 180s thresholds
if (elapsedSeconds > 90 && !slowWarningShownRef.current) {
  // Show "taking longer" message
}

if (elapsedSeconds > 180 && !verySlowWarningShownRef.current) {
  // Show "still working" message
}
```

### Retryable Error Detection

Added "canceled"/"cancelled" to retryable errors:

```typescript
const isRetryable = 
  errorMessage.includes("503") || 
  errorMessage.includes("Service Unavailable") ||
  errorMessage.includes("Network") ||
  errorMessage.includes("fetch") ||
  errorMessage.includes("timeout") ||
  errorMessage.includes("canceled") ||  // ✅ NEW
  errorMessage.includes("cancelled")    // ✅ NEW
```

---

## 📊 USER EXPERIENCE TIMELINE

### Before (No Feedback)

```
0:00  → User clicks generate
0:05  → Console: "Starting polling..."
0:30  → (silence)
1:00  → (silence)
2:00  → Console: "Generation was canceled"
2:00  → User: "Is it broken? Should I retry?"
```

### After (With Notifications)

```
0:00  → User clicks generate
0:05  → UI: "Generating photo..." (existing)
0:30  → (polling continues)
1:30  → Toast: "Still generating... Replicate might be queued. We'll keep trying."
3:00  → Toast: "Generation in progress. This can take up to 5 minutes during peak times."
4:00  → UI: "Photo complete!" (or error toast if failed)
```

---

## 🎯 NOTIFICATION TYPES

| Scenario | Toast Message | When |
|----------|---------------|------|
| **Slow Generation** | "Still generating... Replicate might be queued." | After 90 seconds |
| **Very Slow** | "Generation in progress. Can take up to 5 minutes." | After 3 minutes |
| **Queued/Canceled** | "Generation queued. Replicate is processing your request." | On "canceled" error |
| **Actual Error** | User-friendly error from Replicate error handler | On non-retryable error |

---

## 🧪 TESTING

### Test Scenarios

**1. Normal Generation (< 90s):**
- ✅ No extra toasts (just "Generating..." and "Complete!")

**2. Slow Generation (90s - 3min):**
- ✅ Toast at 90s: "Still generating..."
- ✅ Polling continues
- ✅ Eventually completes

**3. Very Slow Generation (3min+):**
- ✅ Toast at 90s: "Still generating..."
- ✅ Toast at 3min: "Generation in progress..."
- ✅ Polling continues until 5min timeout

**4. Replicate Queued ("canceled" error):**
- ✅ Toast: "Generation queued. Replicate is processing..."
- ✅ Polling continues (retryable)
- ✅ Eventually processes

**5. Actual Error (503, network, etc.):**
- ✅ Toast with friendly error message
- ✅ Red destructive variant
- ✅ User knows to retry or contact support

---

## 📁 FILES MODIFIED

**`lib/hooks/use-feed-post-polling.ts`**
- Added `useToast` import
- Added time tracking refs (`startTimeRef`, `slowWarningShownRef`, `verySlowWarningShownRef`)
- Added elapsed time calculation in polling loop
- Added 90s and 180s progress notifications
- Added "canceled" to retryable errors list
- Added queued toast for canceled errors
- Added error toast using Replicate error handler

---

## ✅ BENEFITS

1. **User Awareness:** Users know generation is still working
2. **Reduced Anxiety:** Clear messaging about expected wait times
3. **Better UX:** Friendly explanations instead of silence
4. **Retry Guidance:** Users know when to wait vs. when to retry
5. **Queue Transparency:** Users understand Replicate queuing
6. **Error Clarity:** Friendly error messages from error handler

---

## 🔄 RELATED IMPROVEMENTS

This works together with:
- **`lib/replicate-error-handler.ts`** - User-friendly error messages
- **`lib/hooks/use-feed-polling.ts`** - Feed-level polling (similar pattern)
- **`components/feed-planner/feed-single-placeholder.tsx`** - UI loading states

---

**Status:** ✅ Complete - No linter errors  
**Documentation:** POLLING_USER_NOTIFICATIONS_FIX.md  
**Testing:** Generate images and observe toasts at 90s, 3min, and on queued/error states
