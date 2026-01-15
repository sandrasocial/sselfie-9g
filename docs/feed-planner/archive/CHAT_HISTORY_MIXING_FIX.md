# Chat History Mixing Fix
**Date:** 2025-01-30  
**Issue:** Chat history in Feed tab showing messages from Photos tab

---

## Problem

The chat history in the Maya Feed tab was showing messages from both the Photos tab and Feed tab. This indicated that chat messages were not being properly isolated by chatType when switching between tabs.

---

## Root Cause

When switching tabs (e.g., from "photos" to "feed"), the `useEffect` in `use-maya-chat.ts` detected the `chatType` change but **did not clear messages immediately**. This meant:

1. User switches from Photos tab (chatType: "maya") to Feed tab (chatType: "feed-planner")
2. The `useEffect` detects the change and sets `hasLoadedChatRef.current = false`
3. But messages from the Photos tab were still visible while the new chat was loading
4. This created the appearance that messages from both tabs were mixed

---

## Solution

**File:** `components/sselfie/maya/hooks/use-maya-chat.ts`

**Change:** Added immediate message clearing when `chatType` changes, before loading the new chat.

```typescript
if (chatTypeChanged) {
  console.log("[useMayaChat] ChatType changed from", lastModeRef.current, "to", currentChatType, "- clearing messages and resetting chat load state")
  // CRITICAL: Clear messages immediately when chatType changes to prevent showing wrong messages
  setMessages([])
  savedMessageIds.current.clear()
  setChatId(null)
  setChatTitle("Chat with Maya")
  hasLoadedChatRef.current = false
}
```

**Key Changes:**
1. Clear `messages` immediately when chatType changes
2. Clear `savedMessageIds` ref to prevent trigger detection issues
3. Reset `chatId` and `chatTitle` to prevent showing wrong chat data
4. Then reset `hasLoadedChatRef` to allow loading the new chat

---

## How Chat Type Isolation Works

### Chat Types
- **Photos Tab:** Uses chatType "maya" (Classic Mode) or "pro" (Studio Pro Mode)
- **Feed Tab:** Always uses chatType "feed-planner"

### Storage Keys
Each chatType has its own localStorage key:
- Photos: `mayaCurrentChatId_maya` or `mayaCurrentChatId_pro`
- Feed: `mayaCurrentChatId_feed-planner`

### Database Filtering
- Backend APIs (`/api/maya/load-chat`, `/api/maya/chats`, `/api/maya/new-chat`) filter by `chatType`
- Database query: `WHERE chat_type = ${chatType}`
- This ensures chats are completely isolated in the database

---

## Testing

After this fix:
1. Switch from Photos tab to Feed tab → Messages should clear immediately
2. Feed tab should only show messages from "feed-planner" chatType
3. Switch back to Photos tab → Should show only "maya"/"pro" messages
4. Chat history panel should filter correctly by chatType

---

## Additional Fix

**File:** `components/sselfie/maya-chat-screen.tsx`

**Change:** Updated `MayaChatHistory` and `ProModeChatHistory` components to pass correct `chatType` based on active tab.

```typescript
// Before:
chatType={getModeString()}

// After:
chatType={activeMayaTab === "feed" ? "feed-planner" : getModeString()}
```

This ensures the chat history panel shows only chats for the current tab (Feed tab shows only "feed-planner" chats, Photos tab shows only "maya"/"pro" chats).

## Related Files

- `components/sselfie/maya/hooks/use-maya-chat.ts` - Fixed message clearing on tab change
- `components/sselfie/maya-chat-screen.tsx` - Fixed chatType passed to history components
- `app/api/maya/load-chat/route.ts` - Filters by chatType (already correct)
- `app/api/maya/chats/route.ts` - Filters by chatType (already correct)
- `app/api/maya/new-chat/route.ts` - Creates chat with correct chatType (already correct)
- `lib/data/maya.ts` - Database queries filter by chatType (already correct)

---

## Notes

- Messages are NOT saved to multiple databases - they're correctly filtered by `chat_type` column
- The issue was purely a UI state management problem where messages weren't cleared fast enough
- All backend code correctly filters by chatType, so no database changes needed

