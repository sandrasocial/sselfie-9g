# Free Blueprint Polling Fix - Audit & Implementation

## Problem Statement

Free blueprint feed generation returns **ONE image** (a grid of 9 images in one image), but polling continues indefinitely even after the image is generated and found in the database.

## Root Causes Identified

### 1. **Complex Polling Logic with Grace Period**
- The polling hook used a "grace period" that continued polling for 15 seconds after the last update
- This was designed for multi-post feeds but caused infinite polling for single posts
- Concept cards (working example) stop polling immediately when image is ready - no grace period

### 2. **Polling Condition Not Optimized for Single Posts**
- The polling condition checked `hasGeneratingPosts || isProcessing` but didn't have a specific check for single posts
- For free blueprint (1 post), when that post completes, polling should stop immediately
- The grace period logic continued polling even after the single post had an `image_url`

### 3. **Progress Endpoint Not Called for Edge Cases**
- Progress endpoint was only called when `hasGeneratingPosts` was true
- Edge cases where a single post had `prediction_id` but polling condition didn't catch it weren't handled

## Solution Implemented

### Fix 1: Simplified Polling Logic for Single Posts
**File**: `components/feed-planner/hooks/use-feed-polling.ts`

- Added explicit check for single post feeds (free blueprint)
- If single post has `image_url` and `generation_status === 'completed'`, stop polling immediately
- Removed grace period logic that was causing infinite polling
- Matches the working concept card pattern: stop immediately when image is ready

```typescript
// CRITICAL FIX: For free blueprint (single post), check if the post has image_url
// If it does, STOP polling immediately (don't wait for grace period)
const singlePost = data?.posts?.length === 1 ? data.posts[0] : null
const singlePostHasImage = singlePost?.image_url && singlePost?.generation_status === 'completed'

if (singlePostHasImage) {
  console.log('[useFeedPolling] ✅ Single post has image, stopping polling immediately')
  return 0 // Stop polling immediately
}
```

### Fix 2: Removed Grace Period
**File**: `components/feed-planner/hooks/use-feed-polling.ts`

- Removed the 15-second grace period that continued polling after posts completed
- Concept cards don't use grace period - they stop immediately when image is ready
- For multi-post feeds, polling stops when no posts are generating (no grace period needed)

### Fix 3: Enhanced Progress Endpoint Calls
**File**: `components/feed-planner/hooks/use-feed-polling.ts`

- Added explicit check for single posts with `prediction_id` but no `image_url`
- Ensures progress endpoint is called even in edge cases
- Progress endpoint updates `image_url` and `generation_status` in database

```typescript
// CRITICAL FIX: For single posts, also call progress endpoint even if hasGeneratingPosts is false
// This handles edge cases where the post has prediction_id but polling condition didn't catch it
else if (feedId && singlePost && singlePost.prediction_id && !singlePost.image_url) {
  console.log('[useFeedPolling] 🔄 Single post has prediction_id but no image_url, calling progress endpoint...')
  fetch(`/api/feed/${feedId}/progress`)
    .then(/* ... */)
}
```

## How It Works Now

### Free Blueprint Flow (Single Post)

1. **User clicks "Generate Image"** → `generate-single` endpoint creates Replicate prediction
2. **Post status set to `generating`** with `prediction_id` stored
3. **Polling starts** → Checks feed API every 3 seconds
4. **Progress endpoint called** → Checks Replicate status and updates database
5. **When image completes**:
   - Progress endpoint sets `image_url` and `generation_status = 'completed'`
   - Next polling check sees single post has `image_url`
   - **Polling stops immediately** (no grace period)
6. **UI updates** → Image displays in `FeedSinglePlaceholder` component

### Comparison with Concept Cards (Working Pattern)

| Aspect | Concept Cards (Working) | Feed Polling (Before Fix) | Feed Polling (After Fix) |
|--------|------------------------|---------------------------|--------------------------|
| Polling Method | `useEffect` + `setInterval` | SWR `refreshInterval` | SWR `refreshInterval` |
| Stop Condition | `data.status === "succeeded"` | Complex condition + grace period | Simple: `image_url` exists |
| Grace Period | None (stops immediately) | 15 seconds | None (stops immediately) |
| Single Post Handling | N/A (always single) | Not optimized | Explicit check for single posts |

## Testing Checklist

- [x] Single post feed (free blueprint) stops polling when image completes
- [x] Image displays correctly in `FeedSinglePlaceholder` component
- [x] No infinite polling after image is generated
- [x] Progress endpoint updates database correctly
- [x] Multi-post feeds still work correctly (no regression)
- [x] Polling stops immediately when all posts complete (no grace period)

## Files Modified

1. `components/feed-planner/hooks/use-feed-polling.ts`
   - Added single post detection and immediate stop logic
   - Removed grace period
   - Enhanced progress endpoint calls for edge cases

## Related Files (No Changes Needed)

- `app/api/feed/[feedId]/progress/route.ts` - Already correctly updates `image_url` and `generation_status`
- `app/api/feed/[feedId]/generate-single/route.ts` - Already correctly sets `generation_status = 'generating'`
- `components/feed-planner/feed-single-placeholder.tsx` - Already correctly displays image when `post.image_url` exists

## Key Principle

**Match the working pattern**: Concept cards use simple, immediate polling that stops as soon as the image is ready. The feed polling now follows the same pattern for single posts.
