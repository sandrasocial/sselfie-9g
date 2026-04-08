# New Chat Messages Clearing Fix
**Date:** 2025-01-30  
**Issue:** When creating a new project (new chat), old feed card previews and strategies from previous chats were still showing

---

## Problem

When users clicked "New Project" to create a new chat, the messages weren't being properly cleared. Old feed card previews, strategies, and other messages from previous chats were still visible in the new chat.

---

## Root Cause

The issue had multiple contributing factors:

1. **useEffect Triggering on chatId Change**: When `setChatId(data.chatId)` was called after creating a new chat, it triggered the `useEffect` that saves chatId to localStorage (line 390-393). This could cause timing issues.

2. **State Update Timing**: React state updates are asynchronous, so calling `setMessages([])` and then `setChatId(data.chatId)` might not clear messages before the chatId change triggers effects.

3. **useChat Internal State**: The `useChat` hook from AI SDK maintains its own internal message state. Simply calling `setMessages([])` might not fully clear the hook's internal state if it happens before the hook processes the change.

---

## Solution

**File:** `components/sselfie/maya/hooks/use-maya-chat.ts`

### Changes Made:

1. **Added `isCreatingNewChatRef` flag** to prevent the `useEffect` that saves chatId from running during new chat creation:

```typescript
const isCreatingNewChatRef = useRef(false)

// Save chatId to localStorage when it changes (chat-type-specific)
// BUT: Skip saving if we're in the middle of creating a new chat (to prevent reload)
useEffect(() => {
  // Skip saving if we're creating a new chat (handleNewChat will save it)
  if (isCreatingNewChatRef.current) {
    return
  }
  const chatType = getChatType()
  saveChatIdToStorage(chatId, chatType)
}, [chatId, getChatType])
```

2. **Reordered operations in `handleNewChat`** to ensure proper sequencing:

```typescript
const handleNewChat = useCallback(async () => {
  try {
    // Set flag to prevent useEffect from saving chatId
    isCreatingNewChatRef.current = true
    
    // Clear messages FIRST
    setMessages([])
    savedMessageIds.current.clear()
    
    // Create new chat...
    const data = await response.json()
    
    // Mark as loaded BEFORE setting chatId
    hasLoadedChatRef.current = true
    
    // Save to localStorage BEFORE setting chatId
    saveChatIdToStorage(data.chatId, chatType)
    
    // Set new chatId AFTER saving and marking as loaded
    setChatId(data.chatId)
    setChatTitle("New Chat")
    
    // CRITICAL: Clear messages again after setting chatId
    // This ensures useChat hook resets its internal state
    setMessages([])
    savedMessageIds.current.clear()
    
    // Reset flag in next tick
    setTimeout(() => {
      isCreatingNewChatRef.current = false
    }, 0)
  } catch (error) {
    // Error handling...
    isCreatingNewChatRef.current = false
  }
}, [getChatType, activeTab, setMessages])
```

### Key Improvements:

1. **Flag to Prevent useEffect**: `isCreatingNewChatRef` prevents the localStorage save effect from running during new chat creation, avoiding timing issues.

2. **Double Clear**: Messages are cleared both before creating the new chat AND after setting the new chatId. This ensures the `useChat` hook's internal state is reset.

3. **Proper Sequencing**: Operations are ordered to:
   - Clear messages first
   - Create new chat
   - Mark as loaded (prevents auto-load)
   - Save to localStorage
   - Set new chatId
   - Clear messages again (ensures useChat resets)

4. **Flag Reset**: The `isCreatingNewChatRef` flag is reset in a `setTimeout` to ensure it happens after all state updates complete.

---

## Testing

After this fix:

1. Create a feed strategy in the Feed tab
2. Click "New Project" button
3. Verify that:
   - Messages are completely cleared (no feed cards, no strategies)
   - Chat starts fresh with empty message list
   - No messages from previous chats appear

---

## Related Files

- `components/sselfie/maya/hooks/use-maya-chat.ts` - Fixed handleNewChat and added flag

---

## Notes

- The double `setMessages([])` call is intentional - it ensures both React state and useChat's internal state are cleared
- The `setTimeout` for resetting the flag ensures it happens after all synchronous state updates
- This fix works in conjunction with the previous fix for chat type isolation

