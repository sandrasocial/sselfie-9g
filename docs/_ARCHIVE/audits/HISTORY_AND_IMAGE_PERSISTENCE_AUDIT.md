# History Tab & Image Persistence Audit

## Executive Summary
Two critical issues identified:
1. **History Tab Bug**: Clicking a chat from history shows welcome screen, but refresh shows it correctly
2. **Image Persistence Bug**: Generated images disappear on page refresh (not saved to JSONB)

## Issue 1: History Tab Welcome Screen Bug

### Problem
- User clicks on a previous chat from history tab
- Welcome screen appears instead of the chat
- User refreshes page → Chat appears correctly
- Happens in both Feed and Photos tabs

### Root Cause Analysis

#### Flow When Clicking History Chat:
1. `MayaChatHistory` component calls `onSelectChat(chatId)`
2. `handleSelectChat` in `maya-chat-screen.tsx` calls `baseHandleSelectChat` from `use-maya-chat.ts`
3. `handleSelectChat` in `use-maya-chat.ts` calls `loadChat(selectedChatId, chatType)`
4. `loadChat` sets `isLoadingChat(true)` and fetches from API
5. **PROBLEM**: While loading, `hasUsedMayaBefore` might be false or `messages.length === 0`
6. **PROBLEM**: Welcome screen condition checks `isEmpty` which might be true during loading
7. On refresh, localStorage has the chatId, so it loads correctly

#### Code Locations:
- `components/sselfie/maya-chat-screen.tsx:1946` - `handleSelectChat` wrapper
- `components/sselfie/maya/hooks/use-maya-chat.ts:301` - `loadChat` function
- `components/sselfie/maya-chat-screen.tsx:2770` - Welcome screen condition

#### Welcome Screen Condition:
```typescript
{isEmpty && hasProFeatures && !isTyping && (
  // Welcome screen shown
)}
```

Where `isEmpty` is likely:
```typescript
const isEmpty = messages.length === 0 && !isLoadingChat
```

**Problem**: When clicking history chat:
- `isLoadingChat` becomes `true` (correct)
- But `messages.length === 0` (old messages cleared or not loaded yet)
- `isEmpty` might be calculated BEFORE `isLoadingChat` is set
- Or `isLoadingChat` check in `isEmpty` is not working correctly

### Conflicts & Duplications

1. **Multiple Loading States**:
   - `isLoadingChat` in `use-maya-chat.ts`
   - `isLoading` in `useChat` hook (from AI SDK)
   - `status` from `useChat` hook (`idle`, `streaming`, `submitted`, `ready`)
   - These might be out of sync

2. **Multiple Chat Loading Triggers**:
   - `useEffect` in `use-maya-chat.ts:548` - Auto-loads on mount/tab change
   - `handleSelectChat` - Manual load from history
   - Both might conflict when clicking history chat

3. **State Race Condition**:
   - `handleSelectChat` calls `loadChat`
   - `loadChat` sets `isLoadingChat(true)` and clears `messages` (or doesn't preserve them)
   - Welcome screen condition checks `isEmpty` before messages are loaded
   - Messages arrive later, but welcome screen already shown

### Missing Logic

1. **No Loading State During History Selection**:
   - When clicking history chat, should show loading spinner, not welcome screen
   - Welcome screen should only show if `!isLoadingChat && messages.length === 0 && !hasUsedMayaBefore`

2. **Messages Not Preserved During Load**:
   - When loading new chat, old messages might be cleared immediately
   - Should preserve old messages until new ones arrive (or show loading state)

## Issue 2: Image Persistence Bug

### Problem
- User generates image from concept card → Image shows correctly ✅
- User refreshes page → Image disappears ❌
- Image exists in `ai_images` or `generated_images` table
- But `concept_cards` JSONB doesn't have `generatedImageUrl`

### Root Cause Analysis

#### Current Flow:
1. **Image Generation**:
   - User clicks "Generate" on concept card
   - Image generated via `/api/maya/check-generation` or `/api/maya/check-studio-pro`
   - Image saved to `ai_images` table with `prediction_id`
   - Image saved to `generated_images` table (Classic Mode)
   - **MISSING**: `generatedImageUrl` NOT saved to `concept_cards` JSONB

2. **Image Display (Initial)**:
   - `ConceptCardPro` or `ConceptCard` component receives image URL from polling
   - Sets `generatedImageUrl` state
   - Image displays correctly ✅
   - **MISSING**: State not saved to database JSONB

3. **Page Refresh**:
   - `load-chat` API loads messages with `concept_cards` JSONB
   - JSONB doesn't have `generatedImageUrl` (never saved)
   - `enrichConceptsWithImages` tries to find image:
     - Checks JSONB → Not found ❌
     - Queries by `concept_card_id` → Concept has temporary ID like "concept-123-0" ❌
     - Queries by `prediction_id` → `concept.predictionId` might not be in JSONB ❌
   - Image not found → Card shows empty

#### Code Locations:
- `app/api/maya/load-chat/route.ts:48` - `enrichConceptsWithImages` function
- `components/sselfie/pro-mode/ConceptCardPro.tsx:495` - Image saved to localStorage only
- `components/sselfie/concept-card.tsx` - Image state management
- `app/api/maya/check-generation/route.ts` - Image saved to tables, not JSONB
- `app/api/maya/check-studio-pro/route.ts` - Image saved to tables, not JSONB

### Conflicts & Duplications

1. **Two Storage Systems**:
   - **localStorage**: `ConceptCardPro` saves to `localStorage` with key `pro-generation-${concept.id}`
   - **Database JSONB**: Should be source of truth, but not updated
   - **Conflict**: localStorage can be cleared, database JSONB is missing

2. **Multiple Image Query Methods**:
   - `enrichConceptsWithImages` queries by `concept_card_id` (might not exist)
   - `enrichConceptsWithImages` queries by `prediction_id` (might not be in JSONB)
   - Components check `concept.generatedImageUrl` prop (not in JSONB)
   - **Duplication**: Multiple ways to find images, but none work reliably

3. **Missing Link Between Tables and JSONB**:
   - Images saved to `ai_images` table with `prediction_id`
   - Images saved to `generated_images` table with `concept_card_id`
   - But `concept_cards` JSONB doesn't have:
     - `generatedImageUrl` (image URL)
     - `predictionId` (link to `ai_images`)
     - Real `concept_card_id` (link to `generated_images`)

### Missing Logic

1. **Not Saving `generatedImageUrl` to JSONB**:
   - When image is generated, should update `concept_cards` JSONB in `maya_chat_messages`
   - Should save: `generatedImageUrl`, `predictionId`, `concept_card_id` (if available)

2. **Not Saving `predictionId` to Concept JSONB**:
   - Pro Mode uses `predictionId` to link images
   - But `predictionId` is not saved to concept JSONB
   - So `enrichConceptsWithImages` can't query by `predictionId`

3. **Temporary Concept IDs**:
   - Concepts have temporary IDs like "concept-123-0"
   - These don't match real UUIDs in `generated_images.concept_card_id`
   - Need to save real concept card ID when available, or use `predictionId` instead

## Implementation Plan

### Phase 1: Fix History Tab Welcome Screen Bug

#### Step 1.1: Fix Welcome Screen Condition
**File**: `components/sselfie/maya-chat-screen.tsx`

**Change**:
```typescript
// BEFORE
const isEmpty = messages.length === 0 && !isLoadingChat

// AFTER
const isEmpty = messages.length === 0 && !isLoadingChat && !hasUsedMayaBefore
```

**Also**: Show loading spinner when `isLoadingChat && messages.length === 0` instead of welcome screen

#### Step 1.2: Preserve Messages During Load
**File**: `components/sselfie/maya/hooks/use-maya-chat.ts`

**Change**: Don't clear messages immediately when loading new chat. Only clear after new messages arrive.

#### Step 1.3: Fix State Race Condition
**File**: `components/sselfie/maya/hooks/use-maya-chat.ts`

**Change**: Ensure `isLoadingChat` is set BEFORE clearing messages or checking `isEmpty`

### Phase 2: Fix Image Persistence

#### Step 2.1: Save `generatedImageUrl` to JSONB When Image Generated
**Files**: 
- `app/api/maya/check-generation/route.ts`
- `app/api/maya/check-studio-pro/route.ts` (if exists)
- `components/sselfie/pro-mode/ConceptCardPro.tsx` (on image received)

**Change**: After image is generated and saved to tables, update `concept_cards` JSONB:
```typescript
// Update concept_cards JSONB with generatedImageUrl
await sql`
  UPDATE maya_chat_messages
  SET concept_cards = jsonb_set(
    concept_cards,
    '{0,generatedImageUrl}',
    ${imageUrl}::jsonb
  )
  WHERE id = ${messageId}
    AND concept_cards IS NOT NULL
    AND jsonb_array_length(concept_cards) > 0
`
```

#### Step 2.2: Save `predictionId` to Concept JSONB
**Files**: Same as Step 2.1

**Change**: Also save `predictionId` to concept JSONB:
```typescript
// Update concept_cards JSONB with predictionId
await sql`
  UPDATE maya_chat_messages
  SET concept_cards = jsonb_set(
    concept_cards,
    '{0,predictionId}',
    ${predictionId}::jsonb
  )
  WHERE id = ${messageId}
`
```

#### Step 2.3: Fix `enrichConceptsWithImages` to Use Saved `predictionId`
**File**: `app/api/maya/load-chat/route.ts`

**Change**: The function already queries by `predictionId`, but ensure it's reading from concept JSONB:
```typescript
// Step 3: Query by prediction_id (Pro Mode)
if (!imageUrl && concept.predictionId) {
  // This should work if predictionId is saved to JSONB
}
```

#### Step 2.4: Add `conceptCards` Support to `update-message` API
**File**: `app/api/maya/update-message/route.ts`

**Change**: Add `conceptCards` parameter (similar to `feedCards`):
```typescript
const { messageId, content, append = false, feedCards, conceptCards } = body

// Update concept_cards JSONB if provided
if (conceptCards && Array.isArray(conceptCards)) {
  const conceptCardsJson = JSON.stringify(conceptCards)
  await sql`
    UPDATE maya_chat_messages
    SET concept_cards = ${conceptCardsJson}
    WHERE id = ${messageIdNum}
  `
}
```

#### Step 2.5: Update Concept Card Components to Save to JSONB
**Files**:
- `components/sselfie/pro-mode/ConceptCardPro.tsx`
- `components/sselfie/concept-card.tsx`

**Change**: When image is received from polling, call API to update JSONB:
```typescript
// After setting generatedImageUrl state
if (data.imageUrl && concept.id) {
  // Get all concepts from message and update the one that matches
  const updatedConcepts = concepts.map(c => 
    c.id === concept.id 
      ? { ...c, generatedImageUrl: data.imageUrl, predictionId: predictionId }
      : c
  )
  
  // Update JSONB via API
  await fetch('/api/maya/update-message', {
    method: 'POST',
    body: JSON.stringify({
      messageId: messageId,
      content: currentContent, // Preserve existing content
      conceptCards: updatedConcepts
    })
  })
}
```

### Phase 3: Cleanup & Consolidation

#### Step 3.1: Remove localStorage Dependency
**Files**: `components/sselfie/pro-mode/ConceptCardPro.tsx`

**Change**: 
- Keep localStorage as cache only (optional)
- Make database JSONB the source of truth
- Remove localStorage restoration logic (rely on JSONB from database)

#### Step 3.2: Consolidate Image Query Logic
**File**: `app/api/maya/load-chat/route.ts`

**Change**: Simplify `enrichConceptsWithImages`:
1. Check JSONB first (should have `generatedImageUrl` if saved correctly)
2. Query by `predictionId` (should be in JSONB)
3. Query by `concept_card_id` (only if real UUID exists)

#### Step 3.3: Remove Duplicate Loading States
**Files**: `components/sselfie/maya-chat-screen.tsx`, `components/sselfie/maya/hooks/use-maya-chat.ts`

**Change**: Consolidate loading states:
- Use `isLoadingChat` from `use-maya-chat.ts` as primary
- Use `status` from `useChat` for message streaming only
- Remove duplicate `isLoading` checks

## Testing Plan

### Test 1: History Tab
1. Create a chat with messages
2. Open history tab
3. Click on a previous chat
4. **Expected**: Chat loads immediately, no welcome screen
5. **If broken**: Welcome screen appears

### Test 2: Image Persistence
1. Generate image from concept card
2. Verify image shows in card ✅
3. Refresh page
4. **Expected**: Image still shows in card ✅
5. **If broken**: Image disappears ❌

### Test 3: Image Persistence (Old Images)
1. Load a chat with old concept cards (images generated days/weeks ago)
2. **Expected**: Images show in cards ✅
3. **If broken**: Cards are empty ❌

## Summary

| Issue | Root Cause | Fix Priority | Complexity |
|-------|-----------|--------------|------------|
| History Welcome Screen | State race condition, `isEmpty` check | 🔴 High | Medium |
| Image Persistence | `generatedImageUrl` not saved to JSONB | 🔴 High | Medium |
| localStorage Dependency | Two storage systems | 🟡 Medium | Low |
| Duplicate Loading States | Multiple loading flags | 🟡 Medium | Low |

**Total Estimated Work**: 4-6 hours
**Risk Level**: Medium (touching core chat loading and image persistence logic)

