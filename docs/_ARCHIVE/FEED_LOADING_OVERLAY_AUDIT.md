# Feed Loading Overlay Audit & Solution

## Problem Statement

The loading overlay is not stopping when the first image is created. It continues to show "4 of 9 complete" even after individual images finish generating.

## Current Implementation Analysis

### 1. Overlay Display Logic (`instagram-feed-view.tsx`)

**Current Logic:**
```typescript
const shouldShowLoadingOverlay = !isManualFeed && 
                                 access?.placeholderType !== "single" && 
                                 !isFeedComplete && 
                                 feedData?.feed && 
                                 isMayaProcessing // ONLY checks feed status
```

**Issues:**
- Only checks `isMayaProcessing` (feed status: 'processing'/'queueing'/'generating')
- Does NOT check if posts are actually generating (`hasGeneratingPosts`)
- Does NOT hide when individual images complete
- Hardcoded to wait for ALL 9 images (`isFeedComplete = readyPosts === totalPosts`)

### 2. Polling Logic (`use-feed-polling.ts`)

**Current Logic:**
```typescript
const hasGeneratingPosts = data?.posts?.some(
  (p: any) => p.prediction_id && !p.image_url
)
const isProcessing = data?.feed?.status === 'processing' || 
                    data?.feed?.status === 'queueing' ||
                    data?.feed?.status === 'generating'

if (hasGeneratingPosts || isProcessing) {
  return 3000 // Poll every 3s
}
```

**Issues:**
- Polling correctly detects generating posts
- But overlay logic doesn't use this information

### 3. Post Status Detection (`instagram-feed-view.tsx`)

**Current Logic:**
```typescript
const postStatuses = useMemo(() => {
  return feedData.posts.map((post: any) => ({
    isGenerating: !!post.prediction_id && !post.image_url,
    isComplete: !!post.image_url,
  }))
}, [feedData])

const hasGeneratingPosts = postStatuses.some((p: any) => p.isGenerating)
```

**Status:** ✅ This is correct and already calculated

## Root Cause

The overlay logic is **over-engineered** and **inconsistent**:

1. **Over-engineered:** Uses multiple conditions (`isManualFeed`, `placeholderType`, `isFeedComplete`, `isMayaProcessing`) but doesn't check the actual generating state
2. **Inconsistent:** Polling hook correctly detects `hasGeneratingPosts`, but overlay doesn't use it
3. **Hardcoded:** Assumes all 9 images must complete before hiding overlay

## Solution: Simplest Approach

### Principle
**The overlay should show when posts are generating, and hide when they're not.**

### Simple Logic
```typescript
// Show overlay if:
// 1. There are posts actively generating (prediction_id but no image_url)
// 2. OR feed is processing prompts/captions (bulk generation setup)
// Hide overlay when:
// 1. No posts are generating AND feed is not processing
// 2. OR it's a manual feed (always show grid)
// 3. OR it's a free user (single placeholder)
```

### Implementation

**Replace the complex logic with:**

```typescript
// Simple: Show overlay if posts are generating OR feed is processing
const shouldShowLoadingOverlay = 
  !isManualFeed &&                                    // Never for manual feeds
  access?.placeholderType !== "single" &&             // Never for free users
  feedData?.feed &&                                   // Must have feed data
  (hasGeneratingPosts || isMayaProcessing) &&         // Show if generating OR processing
  !isFeedComplete                                     // Hide when all complete
```

**Key Changes:**
1. Add `hasGeneratingPosts` check (already calculated, just not used)
2. Keep `isMayaProcessing` for bulk generation setup phase
3. Hide when `isFeedComplete` (all 9 images done)
4. Hide when no posts are generating AND feed is not processing

## What's Over-Engineered?

1. ❌ **Multiple redundant checks** - `isManualFeed`, `placeholderType`, `isFeedComplete` are checked but the core logic is wrong
2. ❌ **Not using existing data** - `hasGeneratingPosts` is calculated but ignored
3. ❌ **Hardcoded assumptions** - Assumes overlay must wait for all 9 images

## What's the Simplest Solution?

**Use the data we already have:**
- `hasGeneratingPosts` - tells us if ANY posts are generating
- `isMayaProcessing` - tells us if feed is in bulk setup phase
- `isFeedComplete` - tells us if all images are done

**Simple rule:**
- Show overlay = `hasGeneratingPosts || isMayaProcessing`
- Hide overlay = `!hasGeneratingPosts && !isMayaProcessing` OR `isFeedComplete`

## Implementation Plan

1. **Update `shouldShowLoadingOverlay` logic** to include `hasGeneratingPosts`
2. **Test with single image generation** - overlay should NOT show
3. **Test with bulk generation** - overlay should show until all complete
4. **Test with mixed state** - overlay should hide when no posts are generating

## Expected Behavior

### Single Image Generation (Paid Blueprint)
- ❌ Overlay should NOT show
- ✅ Grid should show with inline loading spinner on generating post
- ✅ Loading spinner disappears when image completes

### Bulk Generation (Maya Feed)
- ✅ Overlay should show when feed status is 'processing'/'queueing'/'generating'
- ✅ Overlay should show when posts have `prediction_id` but no `image_url`
- ✅ Overlay should hide when no posts are generating AND feed is not processing
- ✅ Overlay should hide when all 9 images are complete
