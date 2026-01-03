# Bug Fixes Verification
**Date:** 2025-01-30  
**Issue:** Two bugs identified in chat type headers and dependency arrays

---

## Bug 1: useChat Transport Headers Don't Update When activeTab Changes

### Problem

`currentChatType` was computed at render time (line 136) and passed to `useChat` hook's transport initialization. However, the `DefaultChatTransport` headers are evaluated once when the transport is created. Since `getChatType()` depends on `activeTab` and `getModeString()`, switching between Feed tab and Photos tab wouldn't update the headers, causing the wrong chat context to be used.

### Root Cause

The `useChat` hook from AI SDK initializes the transport once with static headers. When `activeTab` changes from "photos" to "feed", the headers still contain the old `chatType` value because the transport was already initialized.

### Solution

**File:** `components/sselfie/maya/hooks/use-maya-chat.ts`

Changed headers from a static object to a function that computes headers dynamically on each request:

```typescript
// Before (Bug 1):
const currentChatType = getChatType()
const { messages, sendMessage, status, setMessages } = useChat({
  transport: new DefaultChatTransport({
    headers: {
      "x-chat-type": currentChatType, // Static value - doesn't update
    },
  }) as any,
})

// After (Fixed):
const { messages, sendMessage, status, setMessages } = useChat({
  transport: new DefaultChatTransport({
    headers: () => {
      // Compute headers dynamically on each request
      const currentChatType = getChatType()
      return {
        "x-studio-pro-mode": studioProMode ? "true" : "false",
        "x-chat-type": currentChatType, // Now updates when activeTab changes
        ...(activeTab ? { "x-active-tab": activeTab } : {}),
      }
    },
  }) as any,
})
```

### Verification

- Headers are now computed dynamically using a function
- When `activeTab` changes, `getChatType()` returns the correct value ("feed-planner" for Feed tab, "maya"/"pro" for Photos tab)
- The function is called on each request, ensuring current values are sent

---

## Bug 2: Missing Dependencies in handleCreateFeed Callback

### Problem

The `handleCreateFeed` callback in `maya-feed-tab.tsx` captures `studioProMode`, `styleStrength`, `promptAccuracy`, `aspectRatio`, and `realismStrength` from the parent scope (lines 319-323), but these props were not in the dependency array (lines 349-354). If user settings change between when the feed generation is triggered and when the callback executes, stale values would be stored in the message part.

### Root Cause

React's `useCallback` hook only recreates the callback when dependencies change. Since the settings weren't in the dependency array, the callback captured stale values from when it was first created.

### Solution

**File:** `components/sselfie/maya/maya-feed-tab.tsx`

Added missing dependencies to the `useCallback` dependency array:

```typescript
// Before (Bug 2):
const handleCreateFeed = useCallback(
  async (strategy: FeedStrategy) => {
    // ... uses studioProMode, styleStrength, promptAccuracy, aspectRatio, realismStrength
  },
  [
    messages,
    setMessages,
    onCreateFeed,
    setIsCreatingFeed,
    // Missing: studioProMode, styleStrength, promptAccuracy, aspectRatio, realismStrength
  ]
)

// After (Fixed):
const handleCreateFeed = useCallback(
  async (strategy: FeedStrategy) => {
    // ... uses studioProMode, styleStrength, promptAccuracy, aspectRatio, realismStrength
  },
  [
    messages,
    setMessages,
    onCreateFeed,
    setIsCreatingFeed,
    studioProMode,      // ✅ Added
    styleStrength,      // ✅ Added
    promptAccuracy,     // ✅ Added
    aspectRatio,        // ✅ Added
    realismStrength,    // ✅ Added
  ]
)
```

### Verification

- All captured values are now in the dependency array
- When settings change, the callback is recreated with current values
- Stale values are prevented from being stored in message parts

---

## Testing

After these fixes:

1. **Bug 1 Test:**
   - Switch from Photos tab to Feed tab
   - Send a message
   - Verify the API receives `x-chat-type: feed-planner` header
   - Switch back to Photos tab
   - Send a message
   - Verify the API receives `x-chat-type: maya` or `x-chat-type: pro` header

2. **Bug 2 Test:**
   - Change styleStrength or other settings
   - Trigger feed generation
   - Verify the message part contains the current settings, not stale values

---

## Related Files

- `components/sselfie/maya/hooks/use-maya-chat.ts` - Fixed headers to use function
- `components/sselfie/maya/maya-feed-tab.tsx` - Fixed dependency array
- `app/api/maya/chat/route.ts` - Already handles chatType from headers/body (unchanged)

---

## Notes

- The function-based headers approach is supported by `DefaultChatTransport` in the AI SDK
- The dependency array fix follows React best practices for `useCallback`
- Both fixes are minimal and focused, avoiding unnecessary refactoring

