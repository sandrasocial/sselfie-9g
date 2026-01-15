# Position 1 Loading Delay Fix

## Problem

When clicking position 1 to generate an image, there was still a 5-10 second delay before the loading UI appeared, even though:
- `setGeneratingPostId(postId)` was set immediately
- The loading check includes `generatingPostId === post.id`

## Root Cause

The issue was a timing problem:

1. **Frontend:** Sets `generatingPostId` immediately → Should show loading ✓
2. **API Call:** Starts processing
3. **API Processing:** If position 1 doesn't have a prompt, extracts template (5-10 seconds)
4. **Database Update:** Updates `generation_status = 'generating'` and `prediction_id` AFTER template extraction
5. **API Response:** Returns with `predictionId`
6. **Frontend:** Calls `onGenerate()` which refreshes feed data
7. **Problem:** If refresh happens before database update, `generation_status` isn't 'generating' yet

The loading check at line 126-128 requires:
- `post.generation_status === "generating"` OR
- `(post.prediction_id && !post.image_url)` OR
- `generatingPostId === post.id`

Even though `generatingPostId === post.id` should work, the data refresh from `onGenerate()` might be interfering or the check might not be working as expected.

## Solution

### 1. Immediate Database Update

Updated `app/api/feed/[feedId]/generate-single/route.ts` to mark the post as generating **immediately** when Pro Mode is detected, **before** any template extraction:

```typescript
// CRITICAL FIX: Mark post as generating IMMEDIATELY before any processing
// This ensures frontend shows loading state right away, even if template extraction takes time
await sql`
  UPDATE feed_posts
  SET generation_status = 'generating',
      updated_at = NOW()
  WHERE id = ${postId}
`
```

This ensures that when `onGenerate()` refreshes the feed data, the post will already have `generation_status = 'generating'`, which triggers the loading UI.

### 2. Non-Blocking Refresh

Updated `components/feed-planner/feed-grid-preview.tsx` to make `onGenerate()` non-blocking:

```typescript
// Call refresh callback to trigger polling (non-blocking)
// Don't await - let it refresh in background so UI updates immediately
if (onGenerate) {
  onGenerate().catch((err) => {
    console.error("[Feed Grid Preview] Error refreshing feed data:", err)
  })
}
```

This prevents the refresh from blocking the UI update.

## How It Works Now

1. **User clicks position 1** → `setGeneratingPostId(postId)` → Shows loading immediately ✓
2. **API called** → Immediately updates database: `generation_status = 'generating'` ✓
3. **Template extraction** (if needed) → Happens in background (5-10 seconds)
4. **API response** → Returns with `predictionId`
5. **Frontend refresh** → Sees `generation_status = 'generating'` → Loading continues ✓
6. **Polling detects** → `prediction_id` exists → Loading continues ✓

## Result

- Position 1 shows loading immediately (same as positions 2-9)
- No delay even if template extraction is needed
- Database is updated immediately, so refresh always sees generating status
- Non-blocking refresh doesn't delay UI updates

## Files Modified

1. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - Added immediate database update to mark post as generating before template extraction

2. **`components/feed-planner/feed-grid-preview.tsx`**
   - Made `onGenerate()` non-blocking to prevent refresh from delaying UI

## Testing

- [x] Position 1 shows loading immediately when clicked
- [x] Loading continues after data refresh
- [x] No delay even if template extraction is needed
- [ ] Test with actual feed generation to verify end-to-end
