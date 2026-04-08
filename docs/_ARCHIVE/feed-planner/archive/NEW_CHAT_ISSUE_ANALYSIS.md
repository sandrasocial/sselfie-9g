# New Chat Issue Analysis
**Date:** 2025-01-30  
**Issue:** "New Project" button shows all data/recent chats instead of clearing messages

---

## Root Cause Analysis

### Problem 1: useChat Hook Headers Don't Update
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts`

**Issue:**
- `useChat` hook creates transport with headers ONCE when hook initializes
- Headers use `getModeString()` which only returns "maya" or "pro"
- Headers don't use `getChatType()` which returns "feed-planner" for Feed tab
- When `activeTab` changes, headers don't update (transport is created once)

**Impact:**
- Feed tab requests send `x-chat-type: maya` or `x-chat-type: pro` instead of `feed-planner`
- API creates/loads wrong chatType
- Messages from different chatTypes mix together

**Fix Applied:**
- Changed headers to use `getChatType()` instead of `getModeString()`
- BUT: This still only works at initialization time
- Headers won't update when `activeTab` changes

### Problem 2: Messages Not Clearing on New Chat
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts` → `handleNewChat()`

**Current Implementation:**
```typescript
const handleNewChat = useCallback(async () => {
  const chatType = getChatType()
  const response = await fetch("/api/maya/new-chat", {
    method: "POST",
    body: JSON.stringify({ chatType }),
  })
  const data = await response.json()
  setChatId(data.chatId)
  setChatTitle("New Chat")
  setMessages([]) // Clear messages
  savedMessageIds.current.clear()
  saveChatIdToStorage(data.chatId, chatType)
}, [getChatType, activeTab, setMessages])
```

**Issue:**
- `setMessages([])` is called, but `useChat` hook maintains its own internal state
- When user sends next message, `useChat` may append to existing messages
- Messages might be reloaded from database if `chatId` changes

### Problem 3: useChat Hook Maintains Message State
**Issue:**
- `useChat` from AI SDK maintains messages in its own state
- `setMessages` from `useChat` may not properly clear if hook has internal state
- When `chatId` changes, hook doesn't automatically reload messages
- But when next message is sent, it might use old messages

---

## Proposed Fixes

### Fix 1: Pass chatType in Request Body (Immediate)
**Why:** API already supports `chatType` in request body (line 108 in chat route)

**Action:**
- Modify `sendMessage` calls to include `chatType` in body
- OR: Recreate `useChat` hook when `activeTab` changes (requires rethinking hook structure)

**Challenge:** `useChat` hook is created once, can't easily pass dynamic chatType per request

### Fix 2: Force Message Clear with Key Prop (Recommended)
**Why:** React key prop forces component remount when it changes

**Action:**
- Add `key` prop to component using `useMayaChat`
- Change key when creating new chat or switching tabs
- Forces `useChat` hook to recreate with fresh state

**Location:** `maya-chat-screen.tsx` or parent component

### Fix 3: Clear Messages Before Setting New ChatId
**Why:** Ensure messages are cleared before any reload happens

**Action:**
- Call `setMessages([])` BEFORE creating new chat
- Clear `savedMessageIds` BEFORE setting new chatId
- Set `hasLoadedChatRef.current = false` to prevent auto-reload

### Fix 4: Use chatId as Key for useChat Hook (Best Long-term)
**Why:** When chatId changes, hook should recreate

**Action:**
- Restructure to recreate `useChat` hook when `chatId` changes
- OR: Use `chatId` in hook dependencies to force recreation

**Challenge:** `useChat` hook structure doesn't easily support this

---

## Recommended Solution

**Combination Approach:**

1. **Fix headers** (already done - use `getChatType()`)
   - BUT: Only works at initialization
   - Headers still won't update when tab changes

2. **Pass chatType in request body** (if possible)
   - Check if `sendMessage` from `useChat` supports body params
   - If yes, wrap `sendMessage` to include chatType

3. **Force message clear on new chat:**
   ```typescript
   const handleNewChat = useCallback(async () => {
     // Clear messages FIRST
     setMessages([])
     savedMessageIds.current.clear()
     
     // THEN create new chat
     const chatType = getChatType()
     const response = await fetch("/api/maya/new-chat", {
       method: "POST",
       body: JSON.stringify({ chatType }),
     })
     const data = await response.json()
     
     // Set new chatId AFTER clearing
     setChatId(data.chatId)
     setChatTitle("New Chat")
     saveChatIdToStorage(data.chatId, chatType)
     
     // Prevent auto-reload
     hasLoadedChatRef.current = true
   }, [getChatType, activeTab, setMessages])
   ```

4. **Use chatId as component key** (if needed)
   - Add `key={chatId}` to component using messages
   - Forces remount when chatId changes

---

## Testing Checklist

After fixes:
- [ ] Create new chat in Photos tab → messages clear
- [ ] Create new chat in Feed tab → messages clear  
- [ ] Switch from Photos to Feed tab → messages are separate
- [ ] Switch from Feed to Photos tab → messages are separate
- [ ] Send message after new chat → only new messages appear
- [ ] Check localStorage → correct chatId stored per chatType
- [ ] Check API logs → correct chatType used per request

---

## Next Steps

1. Test current fix (headers using getChatType)
2. If still broken, implement force message clear
3. If still broken, investigate useChat hook recreation
4. Consider restructuring to recreate useChat when chatId/activeTab changes

