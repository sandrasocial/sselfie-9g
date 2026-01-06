# Chat History & Tab Separation - Implementation Plan

**Date:** 2024-12-19  
**Based on:** `CHAT_HISTORY_TAB_SEPARATION_AUDIT.md`

---

## Overview

This plan addresses the root causes identified in the audit:
1. **No `chat_type` validation when loading chats** (CRITICAL)
2. **Database schema mismatches** (HIGH)
3. **Duplicate save paths** (HIGH)
4. **Over-engineered state management** (MEDIUM)
5. **Missing validations** (MEDIUM)

---

## Phase 1: Critical Fixes - Chat Type Validation

### 1.1 Update `loadChatById` to Accept and Validate `chat_type`

**File:** `lib/data/maya.ts`

**Changes:**
- Add optional `chatType` parameter to `loadChatById`
- Verify `chat.chat_type === chatType` before returning
- Return `null` if mismatch (chat exists but wrong type)

**Impact:** Prevents wrong chats from loading in wrong tabs.

---

### 1.2 Add `chat_type` Validation in `load-chat/route.ts`

**File:** `app/api/maya/load-chat/route.ts`

**Changes:**
- After `loadChatById`, verify `chat.chat_type === chatType`
- Return 404 with clear error message if mismatch
- Log validation failures for debugging

**Impact:** API-level validation prevents wrong chats from being returned.

---

### 1.3 Fix `save-chat/route.ts` to Set `chat_type`

**File:** `app/api/maya/save-chat/route.ts`

**Changes:**
- Add `chatType` parameter (default to "maya" for backward compatibility)
- Set `chat_type` when creating chat
- Update INSERT statement to include `chat_type`

**Impact:** Legacy route now creates properly typed chats.

---

## Phase 2: High Priority - Consolidate Save Paths

### 2.1 Audit All Save Paths

**Files to Review:**
- `components/sselfie/maya/hooks/use-maya-chat.ts` (onFinish)
- `components/sselfie/maya-chat-screen.tsx` (concept cards, user messages)
- `components/sselfie/maya/maya-feed-tab.tsx` (feed cards)

**Changes:**
- Document all save paths
- Identify duplicates
- Create single save path per message type

---

### 2.2 Add Deduplication Logic

**File:** `app/api/maya/save-message/route.ts`

**Changes:**
- Check if message already exists before saving
- Use `messageId` if provided, otherwise check by `chatId + role + content hash`
- Return existing message if duplicate found

**Impact:** Prevents duplicate saves, reduces database writes.

---

### 2.3 Consolidate Feed Card Saves

**Files:**
- `components/sselfie/maya/hooks/use-maya-chat.ts` (onFinish)
- `components/sselfie/maya/maya-feed-tab.tsx` (useEffect)

**Changes:**
- Remove duplicate feed card save from `maya-feed-tab.tsx`
- Keep only `onFinish` save in `use-maya-chat.ts`
- Add ref to track saved messages to prevent duplicates

**Impact:** Single save path for feed cards, eliminates race conditions.

---

## Phase 3: High Priority - Add Validations

### 3.1 Add `chat_type` Validation in `save-message/route.ts`

**File:** `app/api/maya/save-message/route.ts`

**Changes:**
- Load chat to get `chat_type`
- Validate `conceptCards` only allowed in Photos tab chats (`maya` or `pro`)
- Validate `feedCards` only allowed in Feed tab chats (`feed-planner`)
- Return 400 error if validation fails

**Impact:** Prevents wrong cards from being saved to wrong chats.

---

### 3.2 Add `chat_type` Validation in `update-message/route.ts`

**File:** `app/api/maya/update-message/route.ts`

**Changes:**
- Load message to get `chat_id`
- Load chat to get `chat_type`
- Validate `feedCards` only allowed in Feed tab chats
- Return 400 error if validation fails

**Impact:** Prevents wrong cards from being updated in wrong chats.

---

## Phase 4: Medium Priority - Simplify State Management

### 4.1 Reduce localStorage Complexity

**File:** `components/sselfie/maya/hooks/use-maya-chat.ts`

**Changes:**
- Keep localStorage for persistence only
- Remove duplicate localStorage updates
- Single `useEffect` for localStorage sync (not multiple)

**Impact:** Reduces race conditions, simpler state management.

---

### 4.2 Simplify Refs

**File:** `components/sselfie/maya/hooks/use-maya-chat.ts`

**Changes:**
- Consolidate `hasLoadedChatRef` and `hasClearedStateRef` if possible
- Document purpose of each ref
- Remove unused refs

**Impact:** Clearer code, easier to maintain.

---

## Phase 5: Medium Priority - Database Constraints

### 5.1 Add NOT NULL Constraint on `chat_type`

**File:** `migrations/add-chat-type-not-null.sql` (NEW)

**Changes:**
- Add NOT NULL constraint on `maya_chats.chat_type`
- Update existing NULL values to default `'maya'`
- Add check constraint: `chat_type IN ('maya', 'pro', 'feed-planner')`

**Impact:** Database-level validation, prevents future NULL values.

---

### 5.2 Migrate Legacy Chats

**File:** `migrations/migrate-legacy-chats.sql` (NEW)

**Changes:**
- Find all chats with `chat_type = NULL`
- Update to `'maya'` (default for legacy)
- Log count of migrated chats

**Impact:** Fixes existing orphaned chats.

---

## Implementation Order

1. **Phase 1** - Critical fixes (prevents wrong chats loading)
2. **Phase 2** - Consolidate saves (reduces race conditions)
3. **Phase 3** - Add validations (prevents data corruption)
4. **Phase 4** - Simplify state (improves maintainability)
5. **Phase 5** - Database constraints (long-term data integrity)

---

## Testing Strategy

After each phase:
1. **Unit Tests:** Test validation logic
2. **Integration Tests:** Test chat loading with different `chat_type` values
3. **Manual Testing:**
   - Feed tab: Select chat from history → Should show feed cards
   - Photos tab: Select chat from history → Should show concept cards
   - Feed tab: Try to select Photos chat → Should return 404
   - Photos tab: Try to select Feed chat → Should return 404
   - Tab switch: Should load correct chat
   - Page refresh: Should load correct chat

---

## Rollback Plan

If issues arise:
1. Revert Phase 1 changes (validation can be temporarily disabled)
2. Keep Phase 2 changes (consolidation is safe)
3. Keep Phase 3 changes (validation is safe, just returns errors)
4. Revert Phase 4 if state issues occur
5. Phase 5 can be rolled back via migration rollback

---

## Success Criteria

✅ Feed tab loads feed cards correctly from history  
✅ Photos tab loads concept cards correctly from history  
✅ Wrong chat type returns 404 (not welcome screen)  
✅ No duplicate saves  
✅ Tab switching loads correct chat  
✅ Page refresh loads correct chat  
✅ No race conditions in state management  

---

**END OF PLAN**

