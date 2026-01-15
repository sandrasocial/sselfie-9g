# Paid Blueprint Preview Feed Issue - Audit

## Problem
When paid blueprint users click "New Preview" button:
- ✅ Preview feed is created successfully (`layout_type: 'preview'`)
- ✅ Frontend navigates to the new preview feed
- ❌ **UI doesn't update** - user sees their current full 9-post feed instead of the 9:16 single placeholder

## Root Cause Analysis

### Flow Breakdown

1. **User clicks "New Preview"** (`components/feed-planner/feed-header.tsx:55`)
   - Opens feed style modal
   - User selects style and confirms

2. **Preview feed creation** (`components/feed-planner/feed-header.tsx:89`)
   - Calls `/api/feed/create-free-example`
   - API creates feed with `layout_type: 'preview'` ✅
   - Returns `feedId` ✅

3. **Navigation** (`components/feed-planner/feed-header.tsx:108`)
   - `router.push(\`/feed-planner?feedId=${responseData.feedId}\`)`
   - Navigates to new preview feed ✅

4. **Feed data fetch** (`app/api/feed/[feedId]/route.ts`)
   - Page loads and fetches feed data
   - **🔴 PROBLEM**: Lines 117-180 check if feed is preview feed
   - **🔴 PROBLEM**: If user is paid blueprint, redirects to latest full feed ❌

### The Redirect Logic

```typescript:app/api/feed/[feedId]/route.ts
// Lines 117-180
if (feedLayout.layout_type === 'preview') {
  const access = await getFeedPlannerAccess(user.id)
  
  if (access?.isPaidBlueprint) {
    // 🔴 REDIRECTS PAID USERS AWAY FROM PREVIEW FEEDS
    // Get user's most recent full feed (exclude preview feeds)
    const fullFeeds = await sql`
      SELECT * FROM feed_layouts
      WHERE user_id = ${user.id}
        AND (layout_type IS NULL OR layout_type != 'preview')
      ORDER BY created_at DESC
      LIMIT 1
    `
    
    if (fullFeeds.length > 0) {
      // Return the full feed instead
      return Response.json({
        feed: fullFeed,
        posts: fullFeedPosts || [],
        // ...
        redirectedFromPreview: true,
      })
    }
  }
}
```

### Why This Happens

The redirect logic was designed to prevent paid users from accessing preview feeds (which were originally free-only). However:

1. **`create-free-example/route.ts`** (line 67) says: "Removed free-only restriction - all users can create preview feeds"
2. **The redirect still blocks paid users** from accessing preview feeds they just created
3. **Result**: Preview feed is created, but user is immediately redirected to their full feed

### Frontend Display Logic

The frontend correctly checks for preview feeds:

```typescript:components/feed-planner/instagram-feed-view.tsx
// Line 532
{feedData?.feed?.layout_type === 'preview' || access?.placeholderType === "single" ? (
  <FeedSinglePlaceholder ... />
) : (
  <FeedGrid ... />
)}
```

But `feedData?.feed?.layout_type` is never `'preview'` for paid users because the API redirects them to a full feed before the frontend can render.

## Solution Options

### Option 1: Simple Fix - Remove Redirect for Preview Feeds (RECOMMENDED)
**Complexity**: ⭐ Simple (1 file, ~10 lines)

**Change**: Remove or modify the redirect logic in `/api/feed/[feedId]/route.ts` to allow paid users to access preview feeds.

**Rationale**: 
- `create-free-example/route.ts` already allows all users to create preview feeds
- Frontend already supports displaying preview feeds for all users
- The redirect is blocking a feature that should work

**Files to modify**:
- `app/api/feed/[feedId]/route.ts` (lines 117-180)

**Change**:
```typescript
// BEFORE: Redirect paid users away from preview feeds
if (feedLayout.layout_type === 'preview') {
  if (access?.isPaidBlueprint) {
    // Redirect to full feed
  }
}

// AFTER: Allow all users to access preview feeds
// Remove the redirect logic entirely
// OR add a flag to allow newly created preview feeds
```

### Option 2: Add Flag to Distinguish New Preview Feeds
**Complexity**: ⭐⭐ Medium (2 files, ~30 lines)

**Change**: Add a query parameter or flag to indicate this is a newly created preview feed that should be accessible.

**Rationale**: More granular control, but adds complexity.

**Files to modify**:
- `components/feed-planner/feed-header.tsx` (add flag to navigation)
- `app/api/feed/[feedId]/route.ts` (check flag before redirecting)

### Option 3: Remove Preview Feed Restriction Entirely
**Complexity**: ⭐ Simple (multiple files, ~50 lines)

**Change**: Remove all restrictions on preview feeds for paid users across the codebase.

**Rationale**: If preview feeds are available to all users, remove all restrictions.

**Files to check**:
- `app/api/feed/[feedId]/route.ts` (redirect logic)
- `app/api/feed/list/route.ts` (filtering logic)
- Any other places that filter preview feeds

## Recommendation

**Option 1 (Simple Fix)** is recommended because:
1. ✅ Minimal code change
2. ✅ Aligns with existing comment in `create-free-example/route.ts`
3. ✅ Frontend already supports it
4. ✅ No breaking changes to existing functionality

## Implementation Plan

1. **Remove redirect logic** in `app/api/feed/[feedId]/route.ts`
2. **Test**: Paid user creates preview feed → should see 9:16 placeholder
3. **Verify**: Free users still see preview feeds correctly
4. **Verify**: Full feeds still work for paid users

## Files Involved

- `app/api/feed/[feedId]/route.ts` (lines 117-180) - **PRIMARY FIX**
- `components/feed-planner/feed-header.tsx` (lines 55-124) - Already correct
- `components/feed-planner/instagram-feed-view.tsx` (line 532) - Already correct
- `components/feed-planner/feed-single-placeholder.tsx` - Already correct
- `app/api/feed/create-free-example/route.ts` - Already correct

## Expected Behavior After Fix

1. Paid user clicks "New Preview"
2. Preview feed created with `layout_type: 'preview'`
3. User navigates to preview feed
4. **✅ UI shows 9:16 single placeholder** (not full 9-post grid)
5. User can generate preview image with all 9 scenes in one image
