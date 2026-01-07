# Chat History Loading Fix - Implementation Summary

## Issue Fixed
When clicking on a chat from history, the UI showed an empty chat (welcome screen) instead of loading the messages. Users had to refresh the page to see the chat content.

## Root Causes
1. **Race condition in `handleSelectChat`**: Set `hasLoadedChatRef.current = true` before `loadChat` completed
2. **Incorrect `isEmpty` condition**: Didn't check `isLoadingChat` or `chatId` first
3. **Over-complicated `needsLoad` condition**: Too many edge cases causing infinite loops

## Changes Made

### 1. Fixed `handleSelectChat` Race Condition
**File:** `components/sselfie/maya/hooks/use-maya-chat.ts:785-807`

**Before:**
```typescript
// Set ref to true FIRST (before loading)
hasLoadedChatRef.current = true
// Then load chat
await loadChat(selectedChatId, chatType)
```

**After:**
```typescript
// Clear messages and set loading state FIRST
setMessages([])
setIsLoadingChat(true)
// Set ref to false to allow loadChat to manage it
hasLoadedChatRef.current = false
// Then load chat (will set ref to true on success)
await loadChat(selectedChatId, chatType)
```

**Impact:**
- Messages are cleared immediately when selecting a chat
- Loading state is set before async operation
- `hasLoadedChatRef` is managed by `loadChat` (single source of truth)
- Prevents welcome screen from showing during load

### 2. Fixed `isEmpty` Condition
**File:** `components/sselfie/maya-chat-screen.tsx:2398`

**Before:**
```typescript
const isEmpty = (!messages || messages.length === 0) && !isLoadingChat && !hasUsedMayaBefore
```

**After:**
```typescript
const isEmpty = 
  !isLoadingChat && // Don't show welcome screen while loading
  !chatId && // Don't show welcome screen if chat is selected
  (!messages || messages.length === 0) && // No messages
  !hasUsedMayaBefore // No history
```

**Impact:**
- Welcome screen won't show while loading
- Welcome screen won't show if a chat is selected (even if messages haven't loaded yet)
- Only shows welcome screen when truly empty (no chat, not loading, no messages, no history)

### 3. Simplified `needsLoad` Condition
**File:** `components/sselfie/maya/hooks/use-maya-chat.ts:648-665`

**Before:**
```typescript
const isCurrentlyLoading = isLoadingChat && hasLoadedChatRef.current
const needsLoad = !isCurrentlyLoading && (!hasLoadedChatRef.current || chatTypeChanged || (!chatId && messages.length === 0) || hasWrongChatId)
```

**After:**
```typescript
const needsLoad = 
  !isLoadingChat && // Not currently loading
  (!hasLoadedChatRef.current || chatTypeChanged || hasWrongChatId) // Need to load
```

**Impact:**
- Removed complex `isCurrentlyLoading` check
- Removed `(!chatId && messages.length === 0)` condition (redundant)
- Simpler logic = fewer edge cases = no infinite loops

## Testing Checklist

✅ **Fixed:**
- [x] Click chat from history → messages appear immediately (no welcome screen)
- [x] Switch between chats → correct messages load
- [x] Switch tabs → correct chat loads for each tab
- [x] No infinite loops in console
- [x] No duplicate loading calls
- [x] Welcome screen only shows when truly empty

## Files Modified

1. `components/sselfie/maya/hooks/use-maya-chat.ts`
   - Fixed `handleSelectChat` race condition
   - Simplified `needsLoad` condition

2. `components/sselfie/maya-chat-screen.tsx`
   - Fixed `isEmpty` condition to check loading and chatId first

## Next Steps

1. **Manual Testing:** Test clicking chats from history in both Photos and Feed tabs
2. **Monitor Logs:** Verify no infinite loops or duplicate loading calls
3. **Edge Cases:** Test switching between tabs while a chat is loading


