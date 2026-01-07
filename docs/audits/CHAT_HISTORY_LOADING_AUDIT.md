# Chat History Loading Audit

## Issue
When clicking on a chat from history:
1. Loading starts
2. Shows empty chat (welcome screen)
3. User must refresh page for chat to appear
4. Logs show infinite loop of `[useMayaChat] 🚀 Loading chat` calls

## Root Cause Analysis

### Problem 1: Race Condition in `handleSelectChat`
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:785-807`

```typescript
const handleSelectChat = useCallback(
  async (selectedChatId: number, selectedChatTitle?: string) => {
    const chatType = getChatType()
    
    // ❌ PROBLEM: Sets ref to true BEFORE loading
    hasLoadedChatRef.current = true
    
    // Then loads chat
    await loadChat(selectedChatId, chatType)
  },
  [loadChat, getChatType, saveChatIdToStorage],
)
```

**Issue:**
- `hasLoadedChatRef.current = true` is set BEFORE `loadChat` completes
- This prevents the useEffect from loading, but `loadChat` is async
- If `loadChat` takes time, `isEmpty` condition evaluates to true (no messages yet)
- Welcome screen shows before messages arrive

### Problem 2: `isEmpty` Condition Timing
**Location:** `components/sselfie/maya-chat-screen.tsx:2398`

```typescript
const isEmpty = (!messages || messages.length === 0) && !isLoadingChat && !hasUsedMayaBefore
```

**Issue:**
- When clicking a chat, messages are empty initially
- `isLoadingChat` might not be set to `true` immediately (race condition)
- `hasUsedMayaBefore` might be `false` if history check hasn't completed
- Result: `isEmpty = true` → welcome screen shows

### Problem 3: useEffect Conflict with `handleSelectChat`
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:572-710`

**Issue:**
- useEffect checks `hasLoadedChatRef.current` to decide if it needs to load
- When `handleSelectChat` sets `hasLoadedChatRef.current = true`, useEffect skips loading
- But useEffect might run AFTER ref is set but BEFORE `loadChat` completes
- This creates a race condition where:
  1. `handleSelectChat` sets `hasLoadedChatRef.current = true`
  2. useEffect runs, sees ref is true, skips loading
  3. `loadChat` is still in progress
  4. Messages are empty → welcome screen shows

### Problem 4: Infinite Loop in Logs
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:665`

```typescript
const needsLoad = !isCurrentlyLoading && (!hasLoadedChatRef.current || chatTypeChanged || (!chatId && messages.length === 0) || hasWrongChatId)
```

**Issue:**
- `isCurrentlyLoading` checks `isLoadingChat && hasLoadedChatRef.current`
- But when `handleSelectChat` sets `hasLoadedChatRef.current = true` BEFORE `loadChat` sets `isLoadingChat = true`, the condition becomes:
  - `isCurrentlyLoading = false` (because `isLoadingChat` is still false)
  - `needsLoad = true` (because ref is true but chatId doesn't match yet)
- This causes the useEffect to keep trying to load, creating an infinite loop

### Problem 5: Messages Not Cleared Before Loading New Chat
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts:785-807`

**Issue:**
- When selecting a new chat, old messages are not cleared immediately
- This causes the UI to show old messages briefly before new ones load
- Or if messages are cleared, `isEmpty` becomes true and welcome screen shows

## Conflicts & Over-Engineering

### Conflict 1: Two Loading Systems
1. **useEffect auto-loading** (line 572-710): Automatically loads chat when dependencies change
2. **Manual `handleSelectChat` loading** (line 785-807): Manually loads chat when user clicks

**Problem:** These two systems conflict:
- `handleSelectChat` sets `hasLoadedChatRef.current = true` to prevent useEffect from interfering
- But this creates a race condition where useEffect might run anyway
- Both systems try to manage the same state, causing conflicts

### Conflict 2: Multiple State Flags
- `hasLoadedChatRef.current`: Tracks if chat is loaded
- `isLoadingChat`: Tracks if chat is currently loading
- `chatId`: Current chat ID
- `messages.length`: Number of messages

**Problem:** These flags can get out of sync:
- `hasLoadedChatRef.current = true` but `messages.length = 0` (chat "loaded" but empty)
- `isLoadingChat = false` but `hasLoadedChatRef.current = false` (not loading but not loaded)
- This causes incorrect `isEmpty` evaluation

### Over-Engineering: Complex Loading Logic
The `needsLoad` condition (line 665) checks:
- `!isCurrentlyLoading`
- `!hasLoadedChatRef.current`
- `chatTypeChanged`
- `!chatId && messages.length === 0`
- `hasWrongChatId`

**Problem:** Too many conditions create edge cases and race conditions.

## Recommended Solution

### Phase 1: Fix `handleSelectChat` Race Condition
1. **Clear messages FIRST** before setting ref
2. **Set `isLoadingChat = true`** before setting ref
3. **Set `hasLoadedChatRef.current = false`** to allow useEffect to work
4. **Let `loadChat` set the ref to true** after successful load

### Phase 2: Simplify Loading Logic
1. **Single source of truth:** Either useEffect OR manual loading, not both
2. **Remove `hasLoadedChatRef` from `handleSelectChat`:** Let `loadChat` manage it
3. **Simplify `needsLoad` condition:** Remove complex checks

### Phase 3: Fix `isEmpty` Condition
1. **Check `isLoadingChat` first:** If loading, don't show welcome screen
2. **Check `chatId`:** If chatId exists, don't show welcome screen (chat is selected)
3. **Only show welcome screen if:** No chatId, not loading, no messages, no history

### Phase 4: Cleanup
1. **Remove duplicate loading logic**
2. **Consolidate state flags**
3. **Add loading state to `handleSelectChat`**

## Implementation Plan

### Step 1: Fix `handleSelectChat`
```typescript
const handleSelectChat = useCallback(
  async (selectedChatId: number, selectedChatTitle?: string) => {
    const chatType = getChatType()
    
    // ✅ FIX: Clear messages and set loading state FIRST
    setMessages([])
    setIsLoadingChat(true)
    
    // ✅ FIX: Set ref to false to allow loadChat to manage it
    hasLoadedChatRef.current = false
    
    // Save to localStorage
    saveChatIdToStorage(selectedChatId, chatType)
    
    // Update title
    if (selectedChatTitle) {
      setChatTitle(selectedChatTitle)
    }
    
    // Load the chat (will set hasLoadedChatRef.current = true on success)
    await loadChat(selectedChatId, chatType)
  },
  [loadChat, getChatType, saveChatIdToStorage, setMessages, setIsLoadingChat],
)
```

### Step 2: Fix `isEmpty` Condition
```typescript
// ✅ FIX: Check loading and chatId first
const isEmpty = 
  !isLoadingChat && // Don't show welcome screen while loading
  !chatId && // Don't show welcome screen if chat is selected
  (!messages || messages.length === 0) && // No messages
  !hasUsedMayaBefore // No history
```

### Step 3: Simplify `needsLoad` Condition
```typescript
// ✅ FIX: Simpler condition
const needsLoad = 
  !isLoadingChat && // Not currently loading
  (!hasLoadedChatRef.current || chatTypeChanged || hasWrongChatId) // Need to load
```

## Testing Checklist

- [ ] Click chat from history → messages appear immediately (no welcome screen)
- [ ] Switch between chats → correct messages load
- [ ] Switch tabs → correct chat loads for each tab
- [ ] No infinite loops in console
- [ ] No duplicate loading calls
- [ ] Welcome screen only shows when truly empty (no chat, no history, not loading)


