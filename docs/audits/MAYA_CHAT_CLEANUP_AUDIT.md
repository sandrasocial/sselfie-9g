# Maya Chat Cleanup Audit
**Date:** 2025-01-27  
**Scope:** Photos Tab (Pro/Classic), Feed Tab - Consistency, Duplication, Schema Issues

## Executive Summary

After thorough analysis of Maya's chat system, I've identified several areas needing cleanup:

1. **🔴 CRITICAL: Concept Cards Duplication on Page Refresh**
2. **⚠️ Inconsistent Trigger Detection Patterns**
3. **⚠️ Schema Mismatches Between Save/Load**
4. **⚠️ Code Duplication Between Tabs**
5. **✅ Tab Separation is Working Correctly**

---

## 1. 🔴 CRITICAL: Concept Cards Duplication Issue

### Problem
Concept cards are appearing duplicated on page refresh. This happens because:

**Root Cause:**
- Concept cards are loaded from database in `app/api/maya/load-chat/route.ts` (lines 608-664)
- BUT trigger detection in `components/sselfie/maya-chat-screen.tsx` (lines 322-415) may re-trigger on refresh
- The `alreadyHasConceptCards` check (line 341-347) may not be working correctly when messages are loaded from DB

**Evidence:**
```typescript:322:347:components/sselfie/maya-chat-screen.tsx
// Detect [GENERATE_CONCEPTS] trigger in messages
useEffect(() => {
  // ... status checks ...
  
  const alreadyHasConceptCards = lastAssistantMessage.parts?.some(
    (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
  )
  if (alreadyHasConceptCards) {
    console.log("[v0] Message already has concepts, skipping:", messageId)
    return
  }
  // ... continues to check for trigger ...
```

**Issue:** The check happens AFTER messages are loaded, but the trigger detection might run before the parts are fully populated, or the check might miss cases where concepts exist but aren't detected properly.

### Solution Required
1. **Add processedConceptMessagesRef** (like Feed tab has `processedFeedMessagesRef`)
2. **Clear ref on chatId change** (like Feed tab does)
3. **Check ref BEFORE trigger detection** to prevent re-processing loaded messages
4. **Ensure trigger detection only runs for NEW messages**, not loaded ones

### Files to Fix
- `components/sselfie/maya-chat-screen.tsx` - Add processedConceptMessagesRef tracking
- Ensure trigger detection respects loaded state

---

## 2. ⚠️ Inconsistent Trigger Detection Patterns

### Photos Tab (Concept Cards)
**Location:** `components/sselfie/maya-chat-screen.tsx` (lines 322-415)

**Pattern:**
- Uses `useEffect` with `messages` dependency
- Checks `alreadyHasConceptCards` but no ref tracking
- Sets `pendingConceptRequest` state
- Processes in separate `useEffect` (lines 418-783)

**Issues:**
- No `processedConceptMessagesRef` (unlike Feed tab)
- No ref clearing on chatId change
- May re-process messages on refresh

### Feed Tab (Feed Cards)
**Location:** `components/sselfie/maya/maya-feed-tab.tsx` (lines 122-496)

**Pattern:**
- Uses `processedFeedMessagesRef` ref for tracking
- Clears ref on chatId change (line 132)
- Checks ref BEFORE processing (line 370)
- Sets `pendingFeedRequest` state
- Processes in separate `useEffect` (lines 415-496)

**Status:** ✅ Better pattern - has ref tracking

### Recommendation
**Standardize on Feed Tab pattern:**
1. Add `processedConceptMessagesRef` to Photos tab
2. Clear ref on chatId change
3. Check ref before processing triggers
4. This will prevent duplication on refresh

---

## 3. ⚠️ Schema Mismatches

### Concept Cards Schema
**Save Location:** `app/api/maya/save-message/route.ts`
- Saves to `concept_cards` column (JSONB array)

**Load Location:** `app/api/maya/load-chat/route.ts` (lines 608-664)
- Reads from `concept_cards` column
- Enriches with images via `enrichConceptsWithImages()`
- Creates `tool-generateConcepts` part

**Status:** ✅ Consistent

### Feed Cards Schema
**Save Location:** `components/sselfie/maya-chat-screen.tsx` (line 1105)
- Saves to `feed_cards` column via `update-message` API
- Also has fallback to `styling_details` (legacy)

**Load Location:** `app/api/maya/load-chat/route.ts` (lines 149-448, 699-723)
- Reads from `feed_cards` column first
- Falls back to `styling_details` for backward compatibility
- Creates `tool-generateFeed` part

**Status:** ⚠️ Dual storage (feed_cards + styling_details fallback) - could cause confusion

### Recommendation
1. **Audit database** to migrate all `styling_details` feed cards to `feed_cards` column
2. **Remove fallback** after migration complete
3. **Document** the migration in code comments

---

## 4. ⚠️ Code Duplication

### Duplicated Logic Patterns

#### 1. Trigger Detection Pattern
**Photos Tab:**
```typescript:322:415:components/sselfie/maya-chat-screen.tsx
// Detect [GENERATE_CONCEPTS] trigger
useEffect(() => {
  // ... detection logic ...
  const alreadyHasConceptCards = lastAssistantMessage.parts?.some(...)
  if (alreadyHasConceptCards) return
  // ... trigger detection ...
}, [messages, status, ...])
```

**Feed Tab:**
```typescript:327:407:components/sselfie/maya/maya-feed-tab.tsx
// Detect [CREATE_FEED_STRATEGY] trigger
useEffect(() => {
  // ... detection logic ...
  if (processedFeedMessagesRef.current.has(messageKey)) return
  const alreadyHasFeedCard = lastAssistantMessage.parts?.some(...)
  if (alreadyHasFeedCard) return
  // ... trigger detection ...
}, [messages, status, ...])
```

**Duplication:** Similar structure, different triggers

#### 2. Processing Pattern
**Photos Tab:**
```typescript:418:783:components/sselfie/maya-chat-screen.tsx
useEffect(() => {
  if (!pendingConceptRequest || isGeneratingConcepts) return
  // ... API call ...
  // ... update messages with concepts ...
}, [pendingConceptRequest, ...])
```

**Feed Tab:**
```typescript:415:496:components/sselfie/maya/maya-feed-tab.tsx
useEffect(() => {
  if (!pendingFeedRequest) return
  // ... API call ...
  // ... update messages with feed card ...
}, [pendingFeedRequest, ...])
```

**Duplication:** Nearly identical structure

### Recommendation
**Create shared hook:** `use-maya-trigger-detection.ts`
- Generic trigger detection pattern
- Accepts trigger regex, part type, processing function
- Handles ref tracking, chatId clearing
- Used by both Photos and Feed tabs

**Benefits:**
- Single source of truth
- Consistent behavior
- Easier to fix bugs (fix once, works everywhere)

---

## 5. ✅ Tab Separation (Working Correctly)

### Photos Tab
**Chat Type:** `"maya"` (Classic) or `"pro"` (Pro Mode)
**Content:** Concept cards only
**API:** `/api/maya/generate-concepts` or `/api/maya/pro/generate-concepts`
**Storage:** `concept_cards` column

**Status:** ✅ Correctly separated

### Feed Tab
**Chat Type:** `"feed-planner"`
**Content:** Feed cards only
**API:** `/api/maya/generate-feed` or `/api/maya/pro/generate-feed`
**Storage:** `feed_cards` column (with `styling_details` fallback)

**Status:** ✅ Correctly separated

### Load Chat Route Separation
```typescript:544:545:app/api/maya/load-chat/route.ts
const isFeedTab = chatType === "feed-planner"
const isPhotosTab = chatType === "maya" || chatType === "pro"
```

**Concept Cards Processing:**
```typescript:608:673:app/api/maya/load-chat/route.ts
if (isPhotosTab && msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0) {
  // Process concept cards
}
```

**Feed Cards Processing:**
```typescript:699:723:app/api/maya/load-chat/route.ts
if (isFeedTab) {
  const feedCardParts = await processFeedCards(...)
  // Process feed cards
}
```

**Status:** ✅ Correctly separated - no cross-contamination

---

## 6. Detailed Findings

### A. Photos Tab (Pro vs Classic)

#### Pro Mode
- Uses `ConceptCardPro` component
- API: `/api/maya/pro/generate-concepts`
- Supports `imageLibrary` prop
- Uses `linkedImages` from concept data

#### Classic Mode
- Uses `ConceptCard` component
- API: `/api/maya/generate-concepts`
- Uses `uploadedImages` prop
- Simpler image handling

**Status:** ✅ Consistent separation, no issues found

### B. Feed Tab

#### Structure
- Uses `MayaFeedTab` component (separate file)
- Uses `MayaChatInterface` for rendering
- Has own trigger detection (`processedFeedMessagesRef`)
- Has own processing logic

**Status:** ✅ Well-structured, but missing ref tracking in Photos tab

### C. Message Saving

#### Concept Cards Save
```typescript:908:990:components/sselfie/maya-chat-screen.tsx
// Extract concept cards from parts
const conceptCards: any[] = []
// ... extraction logic ...
// Save to database
fetch("/api/maya/save-message", {
  body: JSON.stringify({
    conceptCards: conceptCards.length > 0 ? conceptCards : null,
  })
})
```

**Status:** ✅ Works correctly

#### Feed Cards Save
```typescript:1096:1123:components/sselfie/maya-chat-screen.tsx
// Save feed card
fetch("/api/maya/update-message", {
  body: JSON.stringify({
    feedCards: [updatedFeedCard],
  })
})
```

**Status:** ✅ Works correctly, but uses different API endpoint

### D. Image Enrichment

#### Concept Cards
```typescript:627:653:app/api/maya/load-chat/route.ts
// Enrich concept cards with generated images
let enrichedConcepts = msg.concept_cards
enrichedConcepts = await enrichConceptsWithImages(
  msg.concept_cards,
  neonUser
)
```

**Status:** ✅ Works correctly, images persist on refresh

#### Feed Cards
- Images loaded from `feed_posts` table via `fetchFeedData()`
- Fresh data fetched on load (line 167-211)

**Status:** ✅ Works correctly

---

## 7. Recommendations Priority

### 🔴 HIGH PRIORITY (Fix Immediately)

1. **Fix Concept Cards Duplication** ✅ **FIXED**
   - ✅ Added `processedConceptMessagesRef` to Photos tab
   - ✅ Clear ref on chatId change
   - ✅ Check ref before trigger detection
   - ✅ Mark messages as processed when concept cards exist (loaded from DB)
   - ✅ Mark messages as processed immediately when trigger detected
   - **File:** `components/sselfie/maya-chat-screen.tsx`
   - **Status:** Implemented and ready for testing

2. **Standardize Trigger Detection** ✅ **FIXED**
   - ✅ Now uses Feed tab pattern (with ref tracking) in Photos tab
   - ✅ Consistent behavior between Photos and Feed tabs
   - **File:** `components/sselfie/maya-chat-screen.tsx`
   - **Status:** Implemented and ready for testing

### ⚠️ MEDIUM PRIORITY (Fix Soon)

3. **Create Shared Hook**
   - Extract trigger detection to `use-maya-trigger-detection.ts`
   - Use in both Photos and Feed tabs
   - **Files:** Create new hook, update both tabs

4. **Audit Schema Migration**
   - Check how many feeds are in `styling_details` vs `feed_cards`
   - Migrate if needed
   - Remove fallback after migration

### ✅ LOW PRIORITY (Nice to Have)

5. **Code Documentation**
   - Add comments explaining trigger detection pattern
   - Document why ref tracking is needed
   - Document schema migration status

---

## 8. Testing Checklist

After fixes, test:

- [ ] **Photos Tab (Classic):**
  - [ ] Create concept cards
  - [ ] Refresh page → Should NOT duplicate
  - [ ] Switch chats → Should load correct concepts
  - [ ] Generate image → Should persist on refresh

- [ ] **Photos Tab (Pro):**
  - [ ] Create concept cards with image library
  - [ ] Refresh page → Should NOT duplicate
  - [ ] Switch chats → Should load correct concepts
  - [ ] Generate image → Should persist on refresh

- [ ] **Feed Tab:**
  - [ ] Create feed strategy
  - [ ] Refresh page → Should NOT duplicate
  - [ ] Switch chats → Should load correct feeds
  - [ ] Save feed → Should persist on refresh

- [ ] **Cross-Tab:**
  - [ ] Photos tab chat should NOT show feed cards
  - [ ] Feed tab chat should NOT show concept cards
  - [ ] Switching tabs should load correct chat type

---

## 9. Summary

### What's Working ✅
- Tab separation (Photos vs Feed)
- Schema storage (concept_cards, feed_cards)
- Image enrichment and persistence
- Feed tab trigger detection (has ref tracking)

### What Needs Fixing 🔴
- Concept cards duplication on refresh (missing ref tracking)
- Inconsistent trigger detection patterns
- Code duplication between tabs

### Estimated Fix Time
- **High Priority:** 2-3 hours
- **Medium Priority:** 4-6 hours
- **Total:** ~1 day of focused work

---

## 10. Code References

### Key Files
- `components/sselfie/maya-chat-screen.tsx` - Main chat screen, Photos tab logic
- `components/sselfie/maya/maya-feed-tab.tsx` - Feed tab component
- `components/sselfie/maya/maya-chat-interface.tsx` - Message rendering
- `components/sselfie/maya/maya-concept-cards.tsx` - Concept cards wrapper
- `app/api/maya/load-chat/route.ts` - Chat loading, concept/feed card restoration
- `app/api/maya/save-message/route.ts` - Message saving
- `app/api/maya/update-message/route.ts` - Message updating (feed cards)

### Key Patterns
- Trigger detection: `useEffect` with `messages` dependency
- Processing: Separate `useEffect` with pending state
- Ref tracking: `useRef<Set<string>>` for processed messages
- Chat type separation: `chatType === "feed-planner"` vs `"maya"/"pro"`

---

**End of Audit**

