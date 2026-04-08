# Verification Bug Fixes
**Date:** 2025-01-30  
**Issues:** Three bugs identified and fixed

---

## Bug 1: Headers Function Not Supported by AI SDK

### Problem

The code passed a function to `headers` in `DefaultChatTransport`:
```typescript
headers: () => {
  const currentChatType = getChatType()
  return { "x-chat-type": currentChatType, ... }
}
```

However, the Vercel AI SDK's `DefaultChatTransport` captures headers at transport initialization time and doesn't support dynamic function-based headers. Headers were frozen with initial state values and wouldn't reflect changes to `studioProMode` or `activeTab` in subsequent requests.

### Root Cause

The AI SDK's transport initialization evaluates headers once when the transport object is created. Passing a function doesn't work because the SDK expects a static object, not a function.

### Solution

**File:** `components/sselfie/maya/hooks/use-maya-chat.ts`

Changed from function-based headers to using `useMemo` to recreate the transport when dependencies change:

```typescript
// Before (Bug 1):
const { messages, sendMessage, status, setMessages } = useChat({
  transport: new DefaultChatTransport({
    headers: () => {  // ❌ Function not supported
      const currentChatType = getChatType()
      return { ... }
    },
  }) as any,
})

// After (Fixed):
const currentChatType = getChatType()
const chatTransport = useMemo(() => {
  return new DefaultChatTransport({
    api: "/api/maya/chat",
    headers: {
      "x-studio-pro-mode": studioProMode ? "true" : "false",
      "x-chat-type": currentChatType,
      ...(activeTab ? { "x-active-tab": activeTab } : {}),
    },
  }) as any
}, [studioProMode, currentChatType, activeTab])

const { messages, sendMessage, status, setMessages } = useChat({
  transport: chatTransport,
})
```

**Key Changes:**
- Compute `currentChatType` before creating transport
- Use `useMemo` to recreate transport when `studioProMode`, `currentChatType`, or `activeTab` changes
- Pass static headers object (not a function)
- Transport is recreated when dependencies change, ensuring headers are current

**Note:** This approach recreates the transport when dependencies change, which may cause the `useChat` hook to reinitialize. However, this is the correct way to handle dynamic headers with the AI SDK.

---

## Bug 2: Error Code Changed from 404 to 401

### Problem

When user is not found in database, the endpoint returned `{ error: "Unauthorized" }` with status 401, but previously it returned 404 with `"User not found"`. This changes the API contract and error semantics.

### Root Cause

The error response was changed during refactoring, treating a missing user database record the same as authentication failure.

### Solution

**File:** `app/api/feed/latest/route.ts`

Reverted error code back to 404 for "User not found":

```typescript
// Before (Bug 2):
if (!user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 }) // ❌ Wrong status code
}

// After (Fixed):
if (!user) {
  return Response.json({ error: "User not found" }, { status: 404 }) // ✅ Correct status code
}
```

**Rationale:**
- 401 Unauthorized = Authentication failure (user not authenticated)
- 404 Not Found = Resource not found (user record doesn't exist in database)
- Maintaining the API contract is important for error handling logic

---

## Bug 3: Polling Effect Lacks feedId Guard

### Problem

The polling effect in `feed-preview-card.tsx` didn't check if `feedId` exists before setting up the interval. For unsaved feeds where `feedId` is null, the code would still set up polling and attempt to fetch `/api/feed/null` every 3 seconds, causing unnecessary failed API requests and network errors.

### Root Cause

The effect checked for generating/pending posts but didn't verify that `feedId` exists before starting the polling interval.

### Solution

**File:** `components/feed-planner/feed-preview-card.tsx`

Added early return if `feedId` is not set:

```typescript
// Before (Bug 3):
useEffect(() => {
  const hasGeneratingPosts = postsData.some(...)
  const hasPendingPosts = postsData.some(...)
  
  if (!hasGeneratingPosts && !hasPendingPosts && !isGenerating) {
    return
  }
  
  const interval = setInterval(async () => {
    const response = await fetch(`/api/feed/${feedId}`) // ❌ feedId might be null
    ...
  }, 3000)
  
  return () => clearInterval(interval)
}, [feedId, postsData, isGenerating])

// After (Fixed):
useEffect(() => {
  // Early return if feedId is not set (unsaved feeds don't need polling)
  if (!feedId) {
    return // ✅ Guard added
  }
  
  const hasGeneratingPosts = postsData.some(...)
  const hasPendingPosts = postsData.some(...)
  
  if (!hasGeneratingPosts && !hasPendingPosts && !isGenerating) {
    return
  }
  
  const interval = setInterval(async () => {
    const response = await fetch(`/api/feed/${feedId}`) // ✅ feedId guaranteed to exist
    ...
  }, 3000)
  
  return () => clearInterval(interval)
}, [feedId, postsData, isGenerating])
```

**Key Changes:**
- Added early return at the start of the effect if `!feedId`
- Prevents polling for unsaved feeds (no feedId = no API endpoint to poll)
- Eliminates unnecessary failed API requests

---

## Testing

After these fixes:

1. **Bug 1 Test:**
   - Switch between Photos and Feed tabs
   - Send messages in each tab
   - Verify correct `x-chat-type` header is sent (check network tab)
   - Verify headers update when `studioProMode` changes

2. **Bug 2 Test:**
   - Test `/api/feed/latest` with invalid user
   - Verify response is 404 "User not found" (not 401)

3. **Bug 3 Test:**
   - Create an unsaved feed (no feedId)
   - Verify no polling requests are made to `/api/feed/null`
   - Check browser console for errors (should be none)
   - Verify polling only starts when feedId exists

---

## Related Files

- `components/sselfie/maya/hooks/use-maya-chat.ts` - Fixed headers using useMemo
- `app/api/feed/latest/route.ts` - Fixed error code (404 instead of 401)
- `components/feed-planner/feed-preview-card.tsx` - Added feedId guard to polling

---

## Notes

- **Bug 1:** The `useMemo` approach recreates the transport, which may cause `useChat` to reinitialize. This is the correct approach for dynamic headers with the AI SDK, but be aware that it may cause brief state resets when dependencies change.
- **Bug 2:** API contract consistency is important - 404 for missing resources, 401 for auth failures.
- **Bug 3:** Always guard effects that make API calls based on required parameters to prevent unnecessary requests.

