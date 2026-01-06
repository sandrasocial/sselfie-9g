# Chat History & Tab Separation - Comprehensive Audit

**Date:** 2024-12-19  
**Issue:** Chat history shows welcome screen instead of chat and cards when selecting from history in both Maya tab and Feed tab.

---

## Executive Summary

The chat history loading issue is caused by **multiple architectural problems**:
1. **Database schema mismatches** - Chats created without `chat_type`
2. **No validation** - Loading chats doesn't verify `chat_type` matches active tab
3. **Duplicate save paths** - Messages saved multiple times through different routes
4. **Mixed logic** - Tab separation incomplete, cards can be saved to wrong chats
5. **Over-engineered state management** - Complex localStorage + refs + state causing race conditions

---

## 1. DATABASE SCHEMA MISMATCHES

### ❌ Issue 1.1: `save-chat/route.ts` Creates Chats Without `chat_type`

**File:** `app/api/maya/save-chat/route.ts` (Lines 23-27)

```typescript
const [chat] = await sql`
  INSERT INTO maya_chats (user_id, created_at, updated_at)
  VALUES (${user.id}, NOW(), NOW())
  RETURNING id
`
```

**Problem:**
- Creates chats without `chat_type` column
- These chats will have `chat_type = NULL` in database
- `getUserChats` filters by `chat_type`, so these chats won't appear in history
- When loaded, they won't match the active tab's expected `chat_type`

**Impact:** HIGH - Chats created via this route are orphaned and won't load correctly.

**Comparison:**
- ✅ `new-chat/route.ts` correctly sets `chat_type` (line 55)
- ✅ `getOrCreateActiveChat` correctly sets `chat_type` (line 112)
- ❌ `save-chat/route.ts` does NOT set `chat_type`

---

### ❌ Issue 1.2: `loadChatById` Doesn't Verify `chat_type`

**File:** `lib/data/maya.ts` (Lines 77-94)

```typescript
export async function loadChatById(chatId: number, userId: string): Promise<MayaChat | null> {
  const chat = await sql`
    SELECT * FROM maya_chats
    WHERE id = ${chatId} AND user_id = ${userId}
    LIMIT 1
  `
  // ... no chat_type validation
  return chat[0] as MayaChat
}
```

**Problem:**
- Loads chat by ID without checking `chat_type`
- A Feed tab chat (`chat_type = "feed-planner"`) could be loaded in Photos tab
- A Photos tab chat (`chat_type = "maya"` or `"pro"`) could be loaded in Feed tab
- This causes wrong cards to appear or no cards at all

**Impact:** CRITICAL - Wrong chats loaded in wrong tabs, causing welcome screen to show.

---

### ❌ Issue 1.3: `load-chat/route.ts` Doesn't Validate `chat_type` Match

**File:** `app/api/maya/load-chat/route.ts` (Lines 305-314)

```typescript
let chat
if (requestedChatId) {
  chat = await loadChatById(Number.parseInt(requestedChatId), neonUser.id)
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }
  // ❌ NO VALIDATION: chat.chat_type === chatType?
} else {
  chat = await getOrCreateActiveChat(neonUser.id, chatType)
}
```

**Problem:**
- When loading by `chatId`, doesn't verify the chat's `chat_type` matches the requested `chatType`
- If user selects a Feed tab chat from history while in Photos tab, it loads anyway
- Messages are then filtered by `chatType` in `processFeedCards`, but chat itself is wrong

**Impact:** CRITICAL - Root cause of the welcome screen issue.

---

## 2. DUPLICATE SAVE PATHS

### ❌ Issue 2.1: Multiple Save Endpoints for Same Message

**Save Paths Identified:**

1. **`useMayaChat.onFinish`** (Line 205)
   - Saves assistant messages when AI SDK finishes streaming
   - Saves feed cards if present
   - File: `components/sselfie/maya/hooks/use-maya-chat.ts`

2. **`maya-chat-screen.tsx` Concept Cards Save** (Line 977)
   - Saves assistant messages with concept cards
   - Only for Photos tab
   - File: `components/sselfie/maya-chat-screen.tsx`

3. **`maya-feed-tab.tsx` Feed Cards Save** (Line 366)
   - Saves feed cards via `update-message` endpoint
   - Only for Feed tab
   - File: `components/sselfie/maya/maya-feed-tab.tsx`

4. **`maya-chat-screen.tsx` User Messages Save** (Line 736)
   - Saves user messages
   - File: `components/sselfie/maya-chat-screen.tsx`

**Problem:**
- Same message can be saved multiple times
- Race conditions between saves
- Inconsistent data if one save succeeds and another fails
- No deduplication logic

**Impact:** MEDIUM - Causes duplicate saves, potential data inconsistency.

---

### ❌ Issue 2.2: Messages Can Have Both `concept_cards` AND `feed_cards`

**File:** `lib/data/maya.ts` (Lines 247-248)

```typescript
INSERT INTO maya_chat_messages (chat_id, role, content, concept_cards, feed_cards)
VALUES (${chatId}, ${role}, ${safeContent}, ${conceptCards ? JSON.stringify(conceptCards) : null}, ${feedCardsJson})
```

**Problem:**
- Database allows both columns to be populated
- No validation that concept cards should only be in Photos tab chats
- No validation that feed cards should only be in Feed tab chats
- A message could theoretically have both (though UI prevents this)

**Impact:** LOW - Currently prevented by UI logic, but no database constraint.

---

## 3. TAB SEPARATION INCOMPLETE

### ❌ Issue 3.1: No Validation When Saving Cards

**Problem:**
- `saveChatMessage` accepts both `conceptCards` and `feedCards` without checking chat's `chat_type`
- A Feed tab chat could theoretically receive concept cards
- A Photos tab chat could theoretically receive feed cards
- No validation in `save-message/route.ts` or `update-message/route.ts`

**Impact:** MEDIUM - Data integrity issue, though UI prevents it currently.

---

### ❌ Issue 3.2: `load-chat/route.ts` Filters Messages But Not Chat

**File:** `app/api/maya/load-chat/route.ts` (Lines 318-547)

**Problem:**
- `processFeedCards` correctly filters feed cards only for Feed tab
- Concept cards correctly filtered only for Photos tab
- BUT: Chat itself isn't validated to match `chatType`
- If wrong chat is loaded, messages are filtered but chat context is wrong

**Impact:** HIGH - Wrong chat loaded, filtered messages may be empty, showing welcome screen.

---

## 4. OVER-ENGINEERED STATE MANAGEMENT

### ❌ Issue 4.1: Complex localStorage + Refs + State

**File:** `components/sselfie/maya/hooks/use-maya-chat.ts`

**State Management Layers:**
1. **localStorage** - `mayaCurrentChatId_${chatType}` (per chat type)
2. **React State** - `chatId`, `chatTitle`, `isLoadingChat`
3. **Refs** - `hasLoadedChatRef`, `savedMessageIds`, `lastModeRef`, `hasClearedStateRef`
4. **AI SDK State** - `messages`, `status` from `useChat` hook

**Problem:**
- Too many layers of state management
- Race conditions between localStorage updates and state updates
- `hasLoadedChatRef` used to prevent infinite loops, but creates complexity
- Tab switching clears messages, but localStorage might still have wrong chatId

**Impact:** HIGH - Causes race conditions, wrong chats loaded, welcome screen shown.

---

### ❌ Issue 4.2: Tab Switching Logic Clears Messages But Doesn't Guarantee Correct Chat Load

**File:** `components/sselfie/maya/hooks/use-maya-chat.ts` (Lines 577-598)

```typescript
if (chatTypeChanged) {
  // Clear messages immediately
  setMessages([])
  savedMessageIds.current.clear()
  setChatId(null)
  setChatTitle("Chat with Maya")
  hasLoadedChatRef.current = false
}
```

**Problem:**
- Clears messages when tab switches
- Sets `hasLoadedChatRef.current = false` to trigger reload
- BUT: Reload might load wrong chat if localStorage has wrong chatId
- No validation that loaded chat matches new `chatType`

**Impact:** HIGH - Tab switching can load wrong chat, showing welcome screen.

---

## 5. INCONSISTENCIES IN CHAT CREATION

### ❌ Issue 5.1: Different Routes Create Chats Differently

**Comparison:**

| Route | Sets `chat_type`? | Used By |
|-------|-------------------|---------|
| `save-chat/route.ts` | ❌ NO | Legacy? |
| `new-chat/route.ts` | ✅ YES | `handleNewChat` |
| `getOrCreateActiveChat` | ✅ YES | `load-chat/route.ts`, `chat/route.ts` |

**Problem:**
- Inconsistent chat creation
- Legacy route creates chats without `chat_type`
- These chats become orphaned

**Impact:** MEDIUM - Legacy chats won't load correctly.

---

## 6. RACE CONDITIONS

### ❌ Issue 6.1: Multiple Saves for Same Message

**Scenario:**
1. AI SDK finishes streaming → `onFinish` saves message with feed cards
2. `maya-feed-tab.tsx` detects message has ID → saves feed cards again via `update-message`
3. `maya-chat-screen.tsx` detects concept cards → saves message again

**Problem:**
- Same message saved multiple times
- Last save wins, but earlier saves might have different data
- No coordination between save paths

**Impact:** MEDIUM - Data inconsistency, duplicate database writes.

---

### ❌ Issue 6.2: localStorage Updates vs State Updates

**Scenario:**
1. User selects chat from history → `handleSelectChat` saves to localStorage
2. `useEffect` watching `chatId` also saves to localStorage
3. Tab switch happens → localStorage might have wrong chatId
4. Reload triggers → loads wrong chat

**Problem:**
- Multiple places updating localStorage
- No single source of truth
- Race conditions between updates

**Impact:** HIGH - Wrong chat loaded, welcome screen shown.

---

## 7. MISSING VALIDATIONS

### ❌ Issue 7.1: No `chat_type` Validation When Loading Chat

**Missing Validations:**
1. `loadChatById` doesn't check `chat_type`
2. `load-chat/route.ts` doesn't verify `chat.chat_type === chatType`
3. `handleSelectChat` doesn't verify selected chat's `chat_type` matches active tab

**Impact:** CRITICAL - Wrong chats loaded, causing welcome screen issue.

---

### ❌ Issue 7.2: No Validation When Saving Cards

**Missing Validations:**
1. `saveChatMessage` doesn't check chat's `chat_type` before saving cards
2. `save-message/route.ts` doesn't validate `chat_type`
3. `update-message/route.ts` doesn't validate `chat_type`

**Impact:** MEDIUM - Data integrity issue.

---

## 8. SUMMARY OF ROOT CAUSES

### Primary Root Cause: **No `chat_type` Validation When Loading Chats**

When user selects a chat from history:
1. `handleSelectChat` calls `loadChat(selectedChatId, chatType)`
2. `loadChat` builds URL: `/api/maya/load-chat?chatId=123&chatType=feed-planner`
3. `load-chat/route.ts` calls `loadChatById(123, userId)`
4. `loadChatById` returns chat WITHOUT checking `chat.chat_type === "feed-planner"`
5. If chat's `chat_type` is `"maya"` but we're in Feed tab, wrong chat is loaded
6. Messages are filtered by `chatType` in `processFeedCards`, but chat context is wrong
7. If filtered messages are empty or chat has no messages, welcome screen shows

### Secondary Issues:
- Chats created without `chat_type` (legacy route)
- Duplicate save paths causing race conditions
- Over-engineered state management causing race conditions
- No validation when saving cards

---

## 9. RECOMMENDATIONS

### Priority 1: CRITICAL FIXES

1. **Add `chat_type` validation in `loadChatById`**
   - Accept `chatType` parameter
   - Verify `chat.chat_type === chatType` before returning
   - Return `null` if mismatch

2. **Add `chat_type` validation in `load-chat/route.ts`**
   - After `loadChatById`, verify `chat.chat_type === chatType`
   - Return 404 if mismatch

3. **Fix `save-chat/route.ts`**
   - Add `chat_type` parameter
   - Set `chat_type` when creating chat

### Priority 2: HIGH PRIORITY FIXES

4. **Consolidate save paths**
   - Single save path per message type
   - Remove duplicate saves
   - Add deduplication logic

5. **Simplify state management**
   - Reduce localStorage usage
   - Simplify refs
   - Single source of truth for chat state

6. **Add validation when saving cards**
   - Check chat's `chat_type` before saving cards
   - Reject saves that don't match

### Priority 3: MEDIUM PRIORITY FIXES

7. **Add database constraints**
   - Ensure `chat_type` is NOT NULL
   - Add check constraint: `chat_type IN ('maya', 'pro', 'feed-planner')`

8. **Migrate legacy chats**
   - Update chats with `chat_type = NULL` to default `'maya'`
   - Or mark them as legacy and handle separately

9. **Add logging**
   - Log all chat loads with `chat_type` validation
   - Log all saves with `chat_type` context
   - Track mismatches

---

## 10. FILES REQUIRING CHANGES

### Critical Changes:
1. `lib/data/maya.ts` - Add `chat_type` validation to `loadChatById`
2. `app/api/maya/load-chat/route.ts` - Add `chat_type` validation after `loadChatById`
3. `app/api/maya/save-chat/route.ts` - Add `chat_type` when creating chat

### High Priority Changes:
4. `components/sselfie/maya/hooks/use-maya-chat.ts` - Simplify state management
5. `app/api/maya/save-message/route.ts` - Add `chat_type` validation
6. `app/api/maya/update-message/route.ts` - Add `chat_type` validation
7. `components/sselfie/maya-chat-screen.tsx` - Consolidate save paths
8. `components/sselfie/maya/maya-feed-tab.tsx` - Consolidate save paths

### Medium Priority Changes:
9. Database migration - Add NOT NULL constraint on `chat_type`
10. Database migration - Update legacy chats with `chat_type = NULL`

---

## 11. TESTING CHECKLIST

After fixes, test:
- [ ] Feed tab: Select chat from history → Shows feed cards
- [ ] Photos tab: Select chat from history → Shows concept cards
- [ ] Feed tab: Select Photos tab chat from history → Returns 404 or error
- [ ] Photos tab: Select Feed tab chat from history → Returns 404 or error
- [ ] Tab switch: Feed → Photos → Loads correct chat
- [ ] Tab switch: Photos → Feed → Loads correct chat
- [ ] New chat: Feed tab → Creates chat with `chat_type = "feed-planner"`
- [ ] New chat: Photos tab → Creates chat with `chat_type = "maya"` or `"pro"`
- [ ] Page refresh: Feed tab → Loads correct chat with feed cards
- [ ] Page refresh: Photos tab → Loads correct chat with concept cards

---

**END OF AUDIT**

