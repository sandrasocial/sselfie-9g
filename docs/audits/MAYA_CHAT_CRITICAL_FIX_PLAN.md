# Maya Chat Critical Fix Plan
**Date:** 2025-01-27  
**Status:** 🔴 CRITICAL - App Deployed with Users  
**Priority:** URGENT - All 5 Tabs Broken

## Executive Summary

After cleanup/simplification work, the entire Maya chat system is broken:
- ❌ **5 tabs (photos, videos, prompts, training, feed) - NONE working**
- ❌ **Blank screen - no chats shown in UI**
- ❌ **Inconsistent loading indicators when switching tabs**
- ❌ **App is deployed with users - urgent fix needed**

This document provides a **phased approach** to systematically fix ALL issues without breaking more things.

---

## Phase 0: Emergency Assessment (IMMEDIATE)

### Goal
Identify the ROOT CAUSE of blank screen and get basic functionality working.

### Investigation Checklist

#### 1. Check Console Errors
- [ ] Open browser console
- [ ] Check for JavaScript errors
- [ ] Check for API errors (Network tab)
- [ ] Document ALL errors

#### 2. Check API Responses
- [ ] Test `/api/maya/load-chat?chatType=maya` - Does it return data?
- [ ] Test `/api/maya/load-chat?chatType=feed-planner` - Does it return data?
- [ ] Check response status codes
- [ ] Check response JSON structure

#### 3. Check Database
- [ ] Verify `maya_chats` table has data
- [ ] Verify `maya_chat_messages` table has data
- [ ] Check `chat_type` column values match expected ("maya", "pro", "feed-planner")
- [ ] Check `concept_cards` and `feed_cards` columns exist

#### 4. Check React State
- [ ] Is `isLoadingChat` stuck as `true`?
- [ ] Is `messages` array empty when it shouldn't be?
- [ ] Is `chatId` null when it should have a value?
- [ ] Is `hasLoadedChatRef.current` preventing loads?

### Quick Fixes (If Found)

**If `isLoadingChat` stuck:**
- Check `hasLoadedChatRef` logic in `use-maya-chat.ts`
- Ensure ref is set to `true` after successful load
- Ensure ref is reset on errors

**If messages empty:**
- Check `loadChat` function is actually calling API
- Check API response is being parsed correctly
- Check `setMessages` is being called with data

**If blank screen:**
- Check conditional rendering in `maya-chat-screen.tsx`
- Check if `isEmpty` check is wrong
- Check if loading state is preventing render

---

## Phase 1: Stabilize Chat Loading (CRITICAL)

### Goal
Fix blank screen and get chats loading reliably.

### Issues Identified

#### Issue 1.1: Tab Switch Clears Messages Too Aggressively
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts` (lines 723-748)

**Problem:**
```typescript
if (chatTypeChanged) {
  setMessages([])  // Clears messages immediately
  setChatId(null)  // Clears chatId
  hasLoadedChatRef.current = false  // Resets load state
}
```

**Issue:** When switching tabs, messages are cleared BEFORE new chat loads, causing blank screen.

**Fix:**
- Don't clear messages until NEW chat is loaded
- Show loading indicator during transition
- Preserve messages until replacement arrives

#### Issue 1.2: Loading State Race Condition
**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts` (lines 707-712)

**Problem:**
```typescript
if (isLoadingChat && !hasLoadedChatRef.current) {
  return  // Prevents loading if already loading
}
```

**Issue:** If loading gets stuck, this prevents retry.

**Fix:**
- Add timeout for stuck loads
- Reset loading state on error
- Add retry mechanism

#### Issue 1.3: Empty State Check Too Aggressive
**Location:** `components/sselfie/maya-chat-screen.tsx`

**Problem:** `isEmpty` check might be showing welcome screen when chat is loading.

**Fix:**
- Check `isLoadingChat` before showing empty state
- Show loading indicator instead of empty state during load

### Implementation Steps

1. **Fix Tab Switch Message Clearing**
   ```typescript
   // DON'T clear messages immediately
   // Instead, load new chat first, THEN replace messages
   if (chatTypeChanged) {
     setIsLoadingChat(true)  // Show loading
     // Load new chat
     await loadChat(undefined, currentChatType)
     // Messages will be replaced by loadChat
   }
   ```

2. **Add Loading Timeout**
   ```typescript
   const LOAD_TIMEOUT = 10000 // 10 seconds
   const loadWithTimeout = async () => {
     const timeout = setTimeout(() => {
       if (isLoadingChat) {
         console.error("Load timeout - resetting state")
         setIsLoadingChat(false)
         hasLoadedChatRef.current = false
       }
     }, LOAD_TIMEOUT)
     // ... load logic
     clearTimeout(timeout)
   }
   ```

3. **Fix Empty State Check**
   ```typescript
   const isEmpty = !isLoadingChat && messages.length === 0 && hasLoadedChatRef.current
   ```

### Testing
- [ ] Switch between Photos and Feed tabs - should show loading, then messages
- [ ] Refresh page - should load chat correctly
- [ ] Create new chat - should work
- [ ] Select chat from history - should load correctly

---

## Phase 2: Fix Tab-Specific Issues

### Goal
Ensure each tab loads and displays correctly.

### Tab Analysis

#### Photos Tab (Classic & Pro)
**Chat Type:** `"maya"` (Classic) or `"pro"` (Pro Mode)
**Content:** Concept cards
**Storage:** `concept_cards` column

**Issues:**
- [ ] Concept cards not loading
- [ ] Concept cards duplicating (already fixed, verify)
- [ ] Images not persisting
- [ ] Trigger detection not working

**Fix Checklist:**
- [ ] Verify `load-chat/route.ts` processes concept cards for Photos tab
- [ ] Verify `enrichConceptsWithImages` is called
- [ ] Verify `processedConceptMessagesRef` is working
- [ ] Test concept generation flow

#### Feed Tab
**Chat Type:** `"feed-planner"`
**Content:** Feed cards
**Storage:** `feed_cards` column (with `styling_details` fallback)

**Issues:**
- [ ] Feed cards not loading
- [ ] Feed cards duplicating
- [ ] Images not loading from database
- [ ] Strategy not displaying

**Fix Checklist:**
- [ ] Verify `load-chat/route.ts` processes feed cards for Feed tab
- [ ] Verify `processFeedCards` function works
- [ ] Verify `processedFeedMessagesRef` is working
- [ ] Test feed creation flow

#### Videos Tab
**Chat Type:** `"maya"` or `"pro"` (same as Photos)
**Content:** Video cards
**Storage:** Unknown - needs investigation

**Issues:**
- [ ] Videos not loading
- [ ] Video generation not working
- [ ] Chat history not showing videos

**Fix Checklist:**
- [ ] Identify how videos are stored
- [ ] Verify video cards load from database
- [ ] Test video generation flow

#### Prompts Tab
**Chat Type:** `"maya"` or `"pro"` (same as Photos)
**Content:** Prompt suggestions/workbench
**Storage:** Unknown - needs investigation

**Issues:**
- [ ] Prompts not loading
- [ ] Workbench not working
- [ ] Library not syncing

**Fix Checklist:**
- [ ] Identify how prompts are stored
- [ ] Verify prompt library loads
- [ ] Test prompt generation flow

#### Training Tab
**Chat Type:** Unknown - needs investigation
**Content:** Training status/onboarding
**Storage:** Unknown - needs investigation

**Issues:**
- [ ] Training status not loading
- [ ] Onboarding not working
- [ ] Progress not displaying

**Fix Checklist:**
- [ ] Identify training data storage
- [ ] Verify training API endpoints
- [ ] Test training flow

### Implementation Steps

1. **Audit Each Tab's Data Flow**
   - Document how each tab loads data
   - Document how each tab saves data
   - Document schema for each tab

2. **Fix Tab-Specific Loading**
   - Ensure each tab calls correct API
   - Ensure each tab processes correct data
   - Ensure each tab displays correctly

3. **Test Each Tab Independently**
   - Test Photos tab (Classic)
   - Test Photos tab (Pro)
   - Test Feed tab
   - Test Videos tab
   - Test Prompts tab
   - Test Training tab

---

## Phase 3: Fix Schema & Database Issues

### Goal
Ensure database schema is consistent and data loads correctly.

### Schema Audit

#### Current Schema
```sql
maya_chats:
  - id (SERIAL)
  - user_id (TEXT)
  - chat_title (TEXT)
  - chat_type (TEXT) -- "maya", "pro", "feed-planner"
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  - last_activity (TIMESTAMP)

maya_chat_messages:
  - id (SERIAL)
  - chat_id (INTEGER)
  - role (TEXT) -- "user", "assistant", "system"
  - content (TEXT)
  - concept_cards (JSONB) -- For Photos tab
  - feed_cards (JSONB) -- For Feed tab
  - styling_details (JSONB) -- Legacy, should migrate to feed_cards
  - created_at (TIMESTAMP)
```

#### Issues

1. **Dual Storage for Feed Cards**
   - `feed_cards` column (new)
   - `styling_details` column (legacy)
   - **Problem:** Code checks both, causing confusion

2. **Missing Chat Type Validation**
   - Some queries don't filter by `chat_type`
   - Could load wrong chats in wrong tabs

3. **Missing Indexes**
   - `chat_type` not indexed
   - `user_id + chat_type` not indexed
   - Could cause slow queries

### Fix Steps

1. **Migrate Legacy Feed Cards**
   ```sql
   -- Find all messages with feed cards in styling_details
   SELECT id, styling_details 
   FROM maya_chat_messages 
   WHERE styling_details IS NOT NULL 
     AND styling_details::text LIKE '%feedStrategy%'
   
   -- Migrate to feed_cards column
   UPDATE maya_chat_messages
   SET feed_cards = styling_details
   WHERE feed_cards IS NULL 
     AND styling_details IS NOT NULL
     AND styling_details::text LIKE '%feedStrategy%'
   ```

2. **Add Indexes**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_maya_chats_user_type 
     ON maya_chats(user_id, chat_type);
   
   CREATE INDEX IF NOT EXISTS idx_maya_messages_chat 
     ON maya_chat_messages(chat_id);
   ```

3. **Add Chat Type Validation**
   - Update all queries to filter by `chat_type`
   - Add validation in `loadChatById`
   - Add validation in `getOrCreateActiveChat`

### Testing
- [ ] Verify feed cards migrate correctly
- [ ] Verify queries use indexes
- [ ] Verify chat type validation works
- [ ] Test with existing user data

---

## Phase 4: Fix Loading Indicators

### Goal
Ensure loading indicators show correctly and consistently.

### Issues

1. **Inconsistent Loading States**
   - Some tabs show loading, others don't
   - Loading gets stuck sometimes
   - Loading shows when it shouldn't

2. **Multiple Loading Indicators**
   - `isLoadingChat` from hook
   - `isGeneratingConcepts` from component
   - `isCreatingFeed` from component
   - Could conflict

### Fix Steps

1. **Standardize Loading States**
   ```typescript
   // Single source of truth for loading
   const isLoading = isLoadingChat || isGeneratingConcepts || isCreatingFeed
   ```

2. **Add Loading Timeouts**
   - Prevent stuck loading states
   - Reset after timeout

3. **Show Loading During Tab Switch**
   - Show loading when switching tabs
   - Hide when new tab loads

### Testing
- [ ] Loading shows during initial load
- [ ] Loading shows during tab switch
- [ ] Loading hides when complete
- [ ] Loading doesn't get stuck

---

## Phase 5: Fix Duplication Issues

### Goal
Ensure no duplicate cards, messages, or data.

### Issues Already Fixed
- ✅ Concept cards duplication (added `processedConceptMessagesRef`)
- ✅ Feed cards duplication (has `processedFeedMessagesRef`)

### Remaining Issues

1. **Message Duplication**
   - Messages might duplicate on load
   - Messages might duplicate on refresh

2. **Card Duplication**
   - Cards might duplicate on tab switch
   - Cards might duplicate on refresh

### Fix Steps

1. **Deduplicate Messages on Load**
   ```typescript
   // Already implemented in use-maya-chat.ts (lines 402-437)
   // Verify it's working correctly
   ```

2. **Prevent Duplicate Processing**
   - Ensure refs are cleared on chat change
   - Ensure refs are checked before processing

### Testing
- [ ] No duplicate messages on load
- [ ] No duplicate cards on refresh
- [ ] No duplicate cards on tab switch

---

## Phase 6: Testing & Validation

### Goal
Ensure everything works correctly before deployment.

### Test Checklist

#### Basic Functionality
- [ ] App loads without errors
- [ ] Chats display correctly
- [ ] Can switch between tabs
- [ ] Can create new chat
- [ ] Can select chat from history
- [ ] Can delete chat

#### Photos Tab (Classic)
- [ ] Concept cards load
- [ ] Concept cards generate
- [ ] Images persist on refresh
- [ ] No duplicates

#### Photos Tab (Pro)
- [ ] Concept cards load with library
- [ ] Concept cards generate
- [ ] Images persist on refresh
- [ ] No duplicates

#### Feed Tab
- [ ] Feed cards load
- [ ] Feed cards create
- [ ] Images load from database
- [ ] No duplicates

#### Videos Tab
- [ ] Videos load
- [ ] Videos generate
- [ ] Video history works

#### Prompts Tab
- [ ] Prompts load
- [ ] Workbench works
- [ ] Library syncs

#### Training Tab
- [ ] Training status loads
- [ ] Onboarding works
- [ ] Progress displays

#### Edge Cases
- [ ] Page refresh preserves state
- [ ] Tab switch preserves state
- [ ] Network errors handled gracefully
- [ ] Empty states show correctly

---

## Implementation Order

### Week 1: Emergency Fixes
1. **Day 1:** Phase 0 - Emergency Assessment
2. **Day 2:** Phase 1 - Stabilize Chat Loading
3. **Day 3:** Phase 1 - Testing & Fixes

### Week 2: Tab Fixes
4. **Day 4-5:** Phase 2 - Fix Photos Tab
5. **Day 6:** Phase 2 - Fix Feed Tab
6. **Day 7:** Phase 2 - Fix Videos/Prompts/Training Tabs

### Week 3: Schema & Polish
7. **Day 8-9:** Phase 3 - Fix Schema Issues
8. **Day 10:** Phase 4 - Fix Loading Indicators
9. **Day 11:** Phase 5 - Fix Duplication Issues
10. **Day 12-14:** Phase 6 - Testing & Validation

---

## Risk Mitigation

### Before Each Phase
- [ ] Create backup of database
- [ ] Create feature branch
- [ ] Document current state
- [ ] Test current functionality

### During Each Phase
- [ ] Test incrementally
- [ ] Don't break existing functionality
- [ ] Roll back if issues found
- [ ] Document changes

### After Each Phase
- [ ] Test thoroughly
- [ ] Get user feedback (if possible)
- [ ] Deploy to staging first
- [ ] Monitor for errors

---

## Success Criteria

### Phase 1 Success
- ✅ Chats load reliably
- ✅ No blank screens
- ✅ Tab switching works

### Phase 2 Success
- ✅ All 5 tabs work
- ✅ Data loads correctly
- ✅ No errors in console

### Phase 3 Success
- ✅ Schema is consistent
- ✅ No legacy data issues
- ✅ Queries are optimized

### Phase 4 Success
- ✅ Loading indicators work
- ✅ No stuck loading states
- ✅ Consistent UX

### Phase 5 Success
- ✅ No duplicates
- ✅ Data persists correctly
- ✅ State management works

### Overall Success
- ✅ All tabs functional
- ✅ No critical bugs
- ✅ Users can use app
- ✅ Performance is good

---

## Next Steps

1. **IMMEDIATE:** Start Phase 0 - Emergency Assessment
2. **TODAY:** Identify root cause of blank screen
3. **THIS WEEK:** Fix critical issues (Phase 1)
4. **NEXT WEEK:** Fix tab-specific issues (Phase 2)
5. **FOLLOWING WEEK:** Fix schema and polish (Phase 3-5)

---

**End of Plan**

