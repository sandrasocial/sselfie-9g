# Feed Planner UI Fix Plan

## Analysis Summary

### Current Issues Identified:

1. **Duplicate "New Feed" Buttons**
   - ✅ Button in `feed-header.tsx` (line 108-113) - next to "Write Bio" (KEEP THIS ONE, change to "Create Highlights")
   - ❌ Button in `feed-view-screen.tsx` (line 288-302) - in outer header (REMOVE THIS ONE)

2. **Missing "My Feeds" Selector**
   - Feed selector exists in `feed-view-screen.tsx` but only shows when `hasMultipleFeeds === true`
   - Should be visible in feed header for easy feed switching
   - Currently hidden in outer wrapper, not accessible from feed view

3. **Write Bio is Manual (Not Using AI)**
   - Currently opens textarea modal (`handleWriteBio` in `instagram-feed-view.tsx`)
   - AI bio writer exists at `/api/feed/[feedId]/generate-bio`
   - Should use AI generation instead of manual input

4. **Missing Highlights Feature**
   - No button/functionality for creating highlights
   - Should replace "New Feed" button next to "Write Bio"

---

## Implementation Plan

### Task 1: Remove Duplicate "New Feed" Button from Outer Wrapper
**File:** `components/feed-planner/feed-view-screen.tsx`
- Remove "New Feed" button (lines 288-302)
- Keep only feed selector in outer header

### Task 2: Change Header Button to "Create Highlights" (TODO)
**File:** `components/feed-planner/feed-header.tsx`
- Change button text from "New Feed" to "Create Highlights" (line 108-113)
- Remove `onCreateNewFeed` prop and handler
- Add TODO comment for future implementation
- Button should be disabled or show "Coming Soon" for now

### Task 3: Add "My Feeds" Selector to Header
**File:** `components/feed-planner/feed-header.tsx`
- Add feed selector dropdown to header
- Fetch feed list using `/api/feed/list`
- Show current feed name/title
- Allow switching between feeds
- Should be visible even with single feed (for future use)

### Task 4: Connect Write Bio to AI Bio Writer
**File:** `components/feed-planner/instagram-feed-view.tsx`
- Replace `handleWriteBio` to call `/api/feed/[feedId]/generate-bio`
- Show loading state while generating
- Display generated bio in modal
- Allow editing after generation (optional - can save directly or edit first)
- Show error if brand profile not completed

---

## Detailed Changes

### Change 1: Feed Header Component
```typescript
// Change: "New Feed" → "Create Highlights" (disabled/TODO)
// Remove: onCreateNewFeed prop (no longer needed)
// Add: onFeedChange, feeds list, currentFeedId for feed selector
```

### Change 2: Instagram Feed View
```typescript
// Replace handleWriteBio:
// - Call /api/feed/[feedId]/generate-bio
// - Show loading spinner
// - Display generated bio
// - Allow save or edit
```

### Change 3: Feed View Screen
```typescript
// Remove "Create New Feed" button from outer wrapper
// Move feed selector logic to FeedHeader (or keep here but make it visible)
```

---

## Files to Modify

1. `components/feed-planner/feed-header.tsx`
   - Change "New Feed" button to "Create Highlights" (TODO/disabled)
   - Remove `onCreateNewFeed` prop
   - Add "My Feeds" selector dropdown
   - Add feed list fetching

2. `components/feed-planner/instagram-feed-view.tsx`
   - Remove `onCreateNewFeed` prop usage
   - Replace manual bio modal with AI generation
   - Add loading state for bio generation
   - Handle brand profile requirement

3. `components/feed-planner/feed-view-screen.tsx`
   - Remove "Create New Feed" button from outer wrapper
   - Keep feed selector here OR move to header (user preference)

---

## Success Criteria

- ✅ Only one "New Feed" button removed (from outer wrapper)
- ✅ "Create Highlights" button visible in header (disabled/TODO)
- ✅ "My Feeds" selector visible (in header or outer wrapper)
- ✅ "Write Bio" uses AI generation
- ✅ All buttons functional
- ✅ Clean, organized UI

---

## Notes

- Highlights feature marked as TODO for Phase 6
- Feed selector should work seamlessly
- AI bio generation requires brand profile completion
- Error handling for missing brand profile

