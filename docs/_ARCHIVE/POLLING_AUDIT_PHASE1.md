# FEED PLANNER POLLING AUDIT - PHASE 1

## CONCEPT CARD POLLING (Working System)

### Component Structure
- **File:** `components/sselfie/concept-card.tsx`
- **State Management:**
  - `isGenerating` - Local state for generation button
  - `isGenerated` - Flag when image is complete
  - `generatedImageUrl` - Image URL (initialized from concept prop for persistence)
  - `predictionId` - Replicate prediction ID
  - `generationId` - Database generation ID
  - `error` - Error state

### Generation Trigger
- **User action:** Click "Generate" button on concept card
- **API call:** `/api/maya/generate-image` (Classic) or `/api/maya/pro/generate-image` (Pro)
- **Method:** POST
- **Response:** Returns `predictionId` and `generationId` immediately

### Polling Logic
```typescript
// Lines 527-580 in concept-card.tsx
useEffect(() => {
  // Skip if Pro mode or already generated
  if (isProMode || !predictionId || !generationId || isGenerated) return

  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(
        `/api/maya/check-generation?predictionId=${predictionId}&generationId=${generationId}`,
      )
      const data = await response.json()

      if (data.status === "succeeded") {
        setGeneratedImageUrl(data.imageUrl)
        setIsGenerated(true)
        setIsGenerating(false)
        clearInterval(pollInterval) // ✅ STOPS POLLING IMMEDIATELY
      } else if (data.status === "failed") {
        setError(data.error || "Generation failed")
        setIsGenerating(false)
        clearInterval(pollInterval) // ✅ STOPS POLLING ON ERROR
      }
    } catch (err) {
      console.error("[v0] Error polling generation:", err)
      setError("Failed to check generation status")
      setIsGenerating(false)
      clearInterval(pollInterval) // ✅ STOPS POLLING ON EXCEPTION
    }
  }, 3000) // Poll every 3 seconds

  return () => {
    clearInterval(pollInterval) // ✅ CLEANUP ON UNMOUNT
  }
}, [predictionId, generationId, isGenerated, isProMode])
```

**Key Characteristics:**
1. ✅ Polling starts when `predictionId` and `generationId` are set
2. ✅ Polls every 3 seconds
3. ✅ Stops immediately when `status === "succeeded"` or `status === "failed"`
4. ✅ Cleans up interval on unmount
5. ✅ No page refresh or navigation
6. ✅ State persists via concept prop (imageUrl restored on page refresh)

### Preview Rendering
- Image appears when `generatedImageUrl` is set
- Image URL is stored in component state AND saved to JSONB in database
- Component re-initializes `generatedImageUrl` from concept prop on mount (persistence)

### Error Handling
- Errors set `error` state and stop polling
- Error message displayed to user
- No page refresh on error

---

## FEED PLACEHOLDER POLLING (Broken System)

### Component Structure
- **File:** `components/feed-planner/feed-single-placeholder.tsx` (free users)
- **File:** `components/feed-planner/feed-grid.tsx` (paid users)
- **State Management:**
  - `isGenerating` - Local state (only in feed-single-placeholder)
  - `generatingPostId` - Local state (only in feed-grid)
  - **NO local polling** - Relies on parent component polling

### Generation Trigger
- **User action:** Click "Generate Image" button
- **API call:** `/api/feed/${feedId}/generate-single`
- **Method:** POST
- **Body:** `{ postId: post.id }` or `{ position: number }`
- **Response:** Returns immediately (no predictionId in response)

### Polling Logic
**CRITICAL ISSUE:** Feed placeholders do NOT poll themselves. They rely on:
1. `useFeedPolling` hook in parent (`components/feed-planner/hooks/use-feed-polling.ts`)
2. SWR refreshInterval in `InstagramFeedView`
3. Progress endpoint calls (`/api/feed/${feedId}/progress`)

**Problems:**
1. ❌ No direct polling per placeholder (unlike concept cards)
2. ❌ Polling happens at feed level, not post level
3. ❌ Multiple sources of truth for loading state
4. ❌ Complex conditional logic for when to poll

### Loading States
**feed-single-placeholder.tsx:**
```typescript
// Lines 93-97
const isPostGenerating = post?.generation_status === "generating" || 
                         (post?.prediction_id && !post?.image_url) ||
                         isGenerating
```

**feed-grid.tsx:**
```typescript
// Lines 100-105
const isGenerating = !isManualFeed && 
                     (postStatus?.isGenerating || 
                      (post.generation_status === "generating" && post.prediction_id))
const isComplete = !!post.image_url
```

**Issues:**
- Multiple conditions for "generating" state
- Depends on `postStatus` from parent (unclear source)
- Mix of local state and prop-based state

### Preview Rendering
- Image appears when `post.image_url` exists
- Image URL comes from parent component's feed data
- No local state for image URL (unlike concept cards)

### Error Handling
- Errors shown via toast notification
- `isGenerating` reset on error
- But polling continues (no cleanup)

---

## FEED VIEW SCREEN (Parent Component)

### State Management
- **File:** `components/feed-planner/feed-view-screen.tsx`
- Uses SWR for feed data fetching
- Uses `useFeedPolling` hook for polling
- **NO local generation state**

### Data Flow
1. `FeedViewScreen` fetches feed data via SWR
2. Passes data to `InstagramFeedView`
3. `InstagramFeedView` uses `useFeedPolling` hook
4. `useFeedPolling` polls `/api/feed/${feedId}` and `/api/feed/${feedId}/progress`
5. Placeholders receive `post` data as props

### Page Refresh Issue
**🚨 CRITICAL BUG FOUND:** Line 165 in `feed-view-screen.tsx`
```typescript
// After expanding feed for paid users
window.location.reload() // ❌ THIS CAUSES PAGE REFRESH!
```

**Location:** `components/feed-planner/feed-view-screen.tsx:165`
**Context:** After expanding feed from 1 post to 9 posts for paid users

**Fix Required:** Replace with SWR mutate instead of page reload

### Welcome Screen Reappearance
**Investigation needed:**
- Check if welcome flag is being reset
- Check if localStorage is being cleared
- Check if database flag is being set correctly

---

## ROOT CAUSE ANALYSIS

### Issue 1: Page Refresh After Generation
**Root Cause:** `window.location.reload()` in feed expansion logic
**Impact:** Full page reload loses all state, triggers welcome screen check again
**Fix:** Replace with SWR mutate/revalidate

### Issue 2: Inconsistent Polling
**Root Cause:** Feed placeholders don't poll themselves (unlike concept cards)
**Impact:** 
- Polling happens at feed level, not post level
- Complex conditional logic
- Multiple sources of truth
**Fix:** Implement per-placeholder polling (like concept cards)

### Issue 3: Loading States Out of Sync
**Root Cause:** Multiple conditions for "generating" state
**Impact:** UI shows wrong state, polling doesn't stop correctly
**Fix:** Single source of truth for generation status

### Issue 4: No Direct Status Check Endpoint
**Root Cause:** Feed placeholders rely on feed-level polling, not post-level status checks
**Impact:** Can't check individual post status without fetching entire feed
**Fix:** Create `/api/feed/[feedId]/check-post?position=X` endpoint (like concept cards use `/api/maya/check-generation`)

---

## NEXT STEPS

1. **Fix page refresh** - Remove `window.location.reload()` from feed-view-screen.tsx
2. **Create status check endpoint** - `/api/feed/[feedId]/check-post`
3. **Implement per-placeholder polling** - Like concept cards
4. **Simplify loading states** - Single source of truth
5. **Test welcome screen persistence** - Verify flag is set correctly
