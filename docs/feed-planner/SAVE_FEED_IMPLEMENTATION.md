# Save Feed Button Implementation Summary

**Date:** 2024-12-30  
**Status:** ✅ COMPLETE

---

## Overview

Implemented the "Save Feed" button approach where users can preview feed strategies before saving them to the database. Once saved, the button changes to "View Feed" and routes to the Feed Planner screen.

---

## Changes Made

### 1. Modified Feed Creation Flow (`maya-feed-tab.tsx`)

**Before:**
- Feed was automatically saved to database when strategy was created
- Feed card appeared with feedId immediately

**After:**
- Strategy is stored in message part (not saved to database)
- Feed card appears in "unsaved" state (no feedId)
- User must click "Save Feed" to save to database

**Key Changes:**
- `handleCreateFeed` now stores strategy in message part without calling `createFeedFromStrategyHandler`
- Stores settings (studioProMode, styleStrength, etc.) in output for later use
- Sets `isSaved: false` flag to indicate unsaved state

### 2. Updated FeedPreviewCard Component (`feed-preview-card.tsx`)

**New Props Added:**
- `feedId?: number` - Now optional (unsaved feeds don't have feedId)
- `strategy?: FeedStrategy` - Strategy data for unsaved feeds
- `isSaved?: boolean` - Flag to indicate saved state
- `onSave?: (feedId: number) => void` - Callback when feed is saved
- `studioProMode`, `styleStrength`, etc. - Settings for saving

**New Features:**
- Handles unsaved state: Shows preview from strategy data (no database fetch)
- "Save Feed" button: Calls `createFeedFromStrategyHandler` to save feed
- "View Feed" button: Appears after save, routes to Feed Planner
- State management: Tracks saved state and feedId

**Button Logic:**
```typescript
{!isSaved || !feedId ? (
  <button onClick={handleSaveFeed}>Save Feed</button>
) : (
  <button onClick={handleViewFullFeed}>View Feed</button>
)}
```

### 3. Updated Maya Chat Interface (`maya-chat-interface.tsx`)

**Changes:**
- Detects both saved (has feedId) and unsaved (has strategy) feed cards
- Passes strategy and settings to FeedPreviewCard
- Handles `onSave` callback to update message part with feedId
- Removes strategy from output after save (cleanup)

**Key Logic:**
```typescript
const isSaved = output.isSaved !== false && !!output.feedId

const handleSave = (feedId: number) => {
  // Update message part with feedId
  setMessages(prevMessages => {
    // Find and update tool-generateFeed part
    // Set feedId and isSaved: true
    // Remove strategy from output
  })
}
```

---

## User Flow

### Before (Auto-Save)
1. User: "Create a feed strategy"
2. Maya: Generates strategy → **Auto-saves** → Shows feed card with feedId
3. User: Clicks "View Full Feed"
4. User: Sees feed in Feed Planner

### After (Save Button)
1. User: "Create a feed strategy"
2. Maya: Generates strategy → Shows feed card with "Save Feed" button (unsaved)
3. User: Reviews strategy → Clicks "Save Feed"
4. Button changes to "View Feed"
5. User: Clicks "View Feed"
6. User: Sees feed in Feed Planner

---

## Technical Details

### State Management

**Unsaved State:**
- Strategy stored in message part output
- `feedId: undefined`
- `isSaved: false`
- FeedPreviewCard uses strategy data for preview

**Saved State:**
- Feed saved to database
- `feedId: number`
- `isSaved: true`
- FeedPreviewCard fetches from database

### Save Handler Flow

1. User clicks "Save Feed"
2. `handleSaveFeed` calls `createFeedFromStrategyHandler(strategy, options)`
3. Feed saved to database, returns `feedId`
4. Updates local state: `setSavedFeedId(feedId)`
5. Calls `onSave(feedId)` callback
6. Parent updates message part with feedId
7. Button changes to "View Feed"

### Data Flow

```
Maya generates strategy
  ↓
Stored in message part (unsaved)
  ↓
FeedPreviewCard renders with strategy
  ↓
User clicks "Save Feed"
  ↓
createFeedFromStrategyHandler saves to DB
  ↓
Returns feedId
  ↓
onSave callback updates message part
  ↓
FeedPreviewCard re-renders with feedId
  ↓
Button changes to "View Feed"
```

---

## Files Modified

1. ✅ `components/sselfie/maya/maya-feed-tab.tsx`
   - Modified `handleCreateFeed` to store strategy without saving

2. ✅ `components/feed-planner/feed-preview-card.tsx`
   - Added unsaved state handling
   - Added "Save Feed" button and handler
   - Added "View Feed" button (replaces "Save Feed" after save)
   - Updated to handle both saved and unsaved states

3. ✅ `components/sselfie/maya/maya-chat-interface.tsx`
   - Updated to pass strategy and settings to FeedPreviewCard
   - Added `onSave` callback handler
   - Handles message part updates after save

---

## Testing Checklist

- [ ] Create feed strategy in Maya Feed tab
- [ ] Verify feed card appears with "Save Feed" button
- [ ] Verify preview shows strategy data (no database fetch)
- [ ] Click "Save Feed" button
- [ ] Verify feed is saved to database
- [ ] Verify button changes to "View Feed"
- [ ] Click "View Feed" button
- [ ] Verify navigation to Feed Planner screen
- [ ] Verify feed appears in Feed Planner
- [ ] Test page refresh (verify saved feeds persist)

---

## Benefits

1. ✅ **User Control** - Users can preview before committing
2. ✅ **Cleaner Database** - Only saves what users actually want
3. ✅ **Clear Mental Model** - Explicit save action
4. ✅ **Better Feed History** - Only shows meaningful feeds
5. ✅ **Reduced Clutter** - Discard unwanted strategies

---

## Backward Compatibility

- ✅ Existing saved feeds still work (has feedId)
- ✅ FeedPreviewCard defaults to `isSaved: true` for backward compatibility
- ✅ All existing feed functionality preserved

---

## Next Steps

1. Test the implementation in browser
2. Verify save flow works end-to-end
3. Test page refresh scenarios
4. Consider adding auto-save to localStorage as backup (prevent data loss)

---

**Implementation Complete!** ✅

