# Chat History Infinite Loop Fix

## Issue
The `/api/maya/chats?chatType=feed-planner` endpoint was being called repeatedly in an infinite loop, causing the app to be stuck in a loading state.

## Root Cause
The `checkChatHistory` useEffect in `use-maya-chat.ts` was running on every render because:
1. **Unstable dependencies**: The `user` object was being recreated on every render, causing the effect to re-run
2. **No guard against duplicate checks**: The effect didn't track if it had already checked history for the current chatType
3. **No concurrent request protection**: Multiple requests could be triggered simultaneously

## Fix Applied

### 1. Added Refs to Track History Checks
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:123-124`

```typescript
// CRITICAL FIX: Track history checks to prevent infinite loops
const checkedHistoryForChatTypeRef = useRef<string | null>(null)
const isCheckingHistoryRef = useRef(false)
```

### 2. Added Guard to Prevent Duplicate Checks
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:545-550`

```typescript
// CRITICAL FIX: Prevent infinite loop by checking if we've already checked this chatType
// and if we're currently checking
if (checkedHistoryForChatTypeRef.current === chatType || isCheckingHistoryRef.current) {
  console.log("[useMayaChat] ⏭️ Skipping history check - already checked for chatType:", chatType)
  return
}
```

### 3. Mark as Checking Before Request
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:552-554`

```typescript
// Mark as checking to prevent concurrent requests
isCheckingHistoryRef.current = true
checkedHistoryForChatTypeRef.current = chatType
```

### 4. Reset Flag After Request Completes
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:580-581`

```typescript
} finally {
  // Reset checking flag after request completes
  isCheckingHistoryRef.current = false
}
```

### 5. Use Stable Dependencies
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:588`

**Before:**
```typescript
}, [user, proMode, activeTab])
```

**After:**
```typescript
}, [user?.id, proMode, activeTab])
```

**Impact:** Using `user?.id` instead of `user` object prevents re-runs when the user object reference changes but the ID stays the same.

### 6. Reset History Check on Tab Switch
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:664`

```typescript
// CRITICAL FIX: Reset history check ref when chatType changes so we check history for new type
checkedHistoryForChatTypeRef.current = null
```

**Impact:** When switching tabs (chatType changes), we reset the check so history is checked for the new tab.

## Testing Checklist

✅ **Fixed:**
- [x] No infinite loop of `/api/maya/chats` calls
- [x] History check runs once per chatType
- [x] History check resets when switching tabs
- [x] No concurrent requests for same chatType
- [x] App no longer stuck in loading state

## Files Modified

1. `components/sselfie/maya/hooks/use-maya-chat.ts`
   - Added refs to track history checks
   - Added guard to prevent duplicate checks
   - Added concurrent request protection
   - Changed dependency from `user` to `user?.id`
   - Reset history check on tab switch

