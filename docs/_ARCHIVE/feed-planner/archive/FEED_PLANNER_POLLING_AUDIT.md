# Feed Planner Polling Audit - Single Source of Truth

## Problem Statement

Multiple polling mechanisms existed in the feed planner, violating the single source of truth principle. This caused:
- Race conditions
- Duplicate API requests
- Inconsistent state
- Performance issues

## Polling Mechanisms Found

### 1. ✅ PRIMARY: `useFeedPolling` Hook (CORRECT)
**Location**: `components/feed-planner/hooks/use-feed-polling.ts`
**Used By**: 
- `InstagramFeedView` (main feed planner view)
- `FeedViewScreen` (via InstagramFeedView)

**Mechanism**: SWR `refreshInterval`
- Polls `/api/feed/[feedId]` every 3 seconds when posts are generating
- Calls `/api/feed/[feedId]/progress` to update database
- Stops when all posts complete
- **This is the CORRECT single source of truth for feed planner**

### 2. ✅ FIXED: `FeedPreviewCard` Polling (WAS DUPLICATE, NOW FIXED)
**Location**: `components/feed-planner/feed-preview-card.tsx`
**Used By**: 
- `MayaChatInterface` (shows feed cards in chat)

**Before Fix**: `setInterval` (manual polling) ❌
**After Fix**: SWR `refreshInterval` ✅

**Changes Made**:
- Removed `setInterval` polling (lines 339-415)
- Added SWR hook with `refreshInterval` pattern
- Matches `useFeedPolling` pattern exactly
- SWR automatically handles deduplication

**Result**: Now uses same polling mechanism as feed planner ✅

### 3. ✅ NO POLLING: `FeedViewScreen` (CORRECT)
**Location**: `components/feed-planner/feed-view-screen.tsx`
**Status**: Uses SWR with `refreshInterval: 0` - delegates to `InstagramFeedView` ✅

### 4. ✅ NO POLLING: `FeedGridPreview` (CORRECT)
**Location**: `components/feed-planner/feed-grid-preview.tsx`
**Status**: No polling - relies on parent to refresh ✅

### 5. ✅ NO POLLING: `FeedSinglePlaceholder` (CORRECT)
**Location**: `components/feed-planner/feed-single-placeholder.tsx`
**Status**: No polling - relies on parent to refresh ✅

### 6. ✅ NO POLLING: `useFeedConfetti` (CORRECT)
**Location**: `components/feed-planner/hooks/use-feed-confetti.ts`
**Status**: Uses `setInterval` for confetti animation only (not data polling) ✅

## Solution Implemented

### Removed Duplicate Polling
- **Removed**: `setInterval` polling from `FeedPreviewCard`
- **Added**: SWR `refreshInterval` pattern matching `useFeedPolling`
- **Result**: Single source of truth - all polling uses SWR

### Benefits

✅ **Single Source of Truth**: All polling now uses SWR
✅ **Automatic Deduplication**: SWR prevents duplicate requests when feed card and feed planner are both open
✅ **Shared Cache**: SWR cache is shared across components
✅ **Consistent Behavior**: Same polling pattern everywhere
✅ **Better Performance**: No duplicate requests or race conditions

## Current Polling Architecture

```
┌─────────────────────────────────────────┐
│         Feed Planner Components         │
├─────────────────────────────────────────┤
│                                         │
│  InstagramFeedView                      │
│    └─> useFeedPolling (SWR)            │
│         └─> /api/feed/[feedId]         │
│         └─> /api/feed/[feedId]/progress│
│                                         │
│  FeedPreviewCard (Maya Chat)           │
│    └─> SWR refreshInterval             │
│         └─> /api/feed/[feedId]        │
│         └─> /api/feed/[feedId]/progress│
│                                         │
│  FeedViewScreen                         │
│    └─> SWR (refreshInterval: 0)       │
│         └─> Delegates to InstagramFeedView│
│                                         │
└─────────────────────────────────────────┘
         │
         ▼
    SWR Cache (Shared)
         │
         ▼
    /api/feed/[feedId]
```

## Files Modified

1. **`components/feed-planner/feed-preview-card.tsx`**
   - Removed `setInterval` polling (lines 339-415)
   - Added SWR hook with `refreshInterval` pattern
   - Removed `pollIntervalRef` state
   - Added SWR data synchronization

## Testing Checklist

- [ ] Feed cards in Maya chat update when images complete
- [ ] No duplicate polling when feed card and feed planner are both open
- [ ] Polling stops when all posts complete
- [ ] Progress endpoint is called correctly
- [ ] No race conditions or state inconsistencies
- [ ] SWR cache is shared correctly (no duplicate requests)

## Key Principle

**Single Source of Truth**: All feed data polling now uses SWR with `refreshInterval`. SWR automatically handles:
- Request deduplication
- Cache management
- Error handling
- Automatic revalidation

This ensures consistent behavior across all feed planner components.
