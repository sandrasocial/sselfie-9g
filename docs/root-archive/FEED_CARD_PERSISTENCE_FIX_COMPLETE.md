# Feed Card Persistence Fix - Complete

## Problem
Feed cards were disappearing on page refresh or when switching tabs because they were stored as markers in the `content` column, which could be overwritten by the AI SDK or other processes.

## Solution
Feed cards are now saved to the `styling_details` JSONB column (similar to how `concept_cards` uses the `concept_cards` column), ensuring they persist independently of message content.

## Changes Made

### 1. Database Schema
- **File:** `lib/data/maya.ts`
- **Change:** Updated `MayaChatMessage` interface to include `styling_details` field
- **Change:** Updated `saveChatMessage()` to accept `feedCards` parameter and save to `styling_details` column

### 2. Save Message API
- **File:** `app/api/maya/save-message/route.ts`
- **Change:** Added `feedCards` parameter to request body
- **Change:** Pass `feedCards` to `saveChatMessage()` function

### 3. Update Message API
- **File:** `app/api/maya/update-message/route.ts`
- **Change:** Added `feedCards` parameter to request body
- **Change:** Update `styling_details` column when `feedCards` is provided

### 4. Load Chat API
- **File:** `app/api/maya/load-chat/route.ts`
- **Change:** Restore feed cards from `styling_details` column (primary source)
- **Change:** Keep marker-based restoration as fallback for backward compatibility

### 5. Frontend - Feed Creation
- **File:** `components/sselfie/maya/maya-feed-tab.tsx`
- **Change:** Save feed cards to `styling_details` column via `update-message` API instead of markers in content

### 6. Frontend - Feed Saving
- **File:** `components/sselfie/maya-chat-screen.tsx`
- **Change:** `handleFeedSaved` now saves feed cards to `styling_details` column with `feedId` instead of markers

## How It Works Now

### Creating Feed (Unsaved)
1. User creates feed → `handleCreateFeed()` in `maya-feed-tab.tsx`
2. Feed card added to message parts (UI state)
3. Feed card data saved to `styling_details` column via `update-message` API
4. Feed card persists even if component remounts or page refreshes

### Saving Feed (Saved)
1. User clicks "Save Feed" → `handleFeedSaved()` in `maya-chat-screen.tsx`
2. Feed saved to `feed_layouts` table (gets `feedId`)
3. Feed card data updated in `styling_details` column with `feedId`
4. Feed card persists with link to saved feed

### Loading Chat
1. `load-chat` API reads messages from database
2. Checks `styling_details` column for feed cards (primary source)
3. Restores feed cards to message parts
4. Falls back to marker-based restoration for backward compatibility

## Benefits

✅ **Persistent:** Feed cards survive page refreshes and component remounts
✅ **Independent:** Not affected by AI SDK overwriting message content
✅ **Consistent:** Uses same pattern as concept cards (`concept_cards` column)
✅ **Backward Compatible:** Still supports marker-based restoration for old messages

## Testing

1. Create a feed in Maya chat
2. Refresh the page → Feed card should still be visible
3. Switch to Feed Planner tab and back → Feed card should still be visible
4. Save the feed → Feed card should persist with `feedId`
5. Refresh the page → Saved feed card should still be visible

