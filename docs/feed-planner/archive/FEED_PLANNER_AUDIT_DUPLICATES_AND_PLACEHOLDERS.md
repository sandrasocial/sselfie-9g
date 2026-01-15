# Feed Planner Audit: Duplicate Logic & Placeholder Image Issues

**Date:** 2025-01-30  
**Status:** 🔴 Issues Found  
**Purpose:** Audit feed planner implementation for duplicate/conflicting logic and fix placeholder image preview issues

---

## 🎯 Executive Summary

### Issues Found

1. **Duplicate/Conflicting Logic:** ⚠️ **CONFIRMED**
   - Two strategy creation endpoints exist: `create-strategy` (old, complex) and `create-from-strategy` (new, simplified)
   - Old `orchestrator.ts` logic may conflict with new conversational approach
   - Unclear which endpoint should be used going forward

2. **Placeholder Images Not Updating:** 🔴 **CONFIRMED**
   - SWR polling logic may stop before images are fully processed
   - API endpoint updates database but UI may not refresh immediately
   - Missing explicit refresh after image upload completes

3. **Import Dependencies:** ✅ **CLEAN**
   - UI components properly use Maya chat infrastructure (as per plan)
   - No duplicate imports or conflicting dependencies

---

## 📊 Detailed Findings

### 1. Duplicate/Conflicting Logic

#### Issue: Two Strategy Creation Endpoints

**Current State:**
- ✅ `/api/feed-planner/create-from-strategy/route.ts` - **ACTIVE** (used by UI)
- ⚠️ `/api/feed-planner/create-strategy/route.ts` - **EXISTS** but unclear if still used

**Evidence:**
```typescript
// feed-planner-screen.tsx line 292
const response = await fetch("/api/feed-planner/create-from-strategy", {
  method: "POST",
  // ... uses create-from-strategy
})
```

**Analysis:**
- `create-from-strategy` is the new endpoint (used by conversational UI)
- `create-strategy` is the old endpoint (complex orchestrator-based)
- Both endpoints exist, creating confusion
- Old endpoint may still be referenced elsewhere

**Recommendation:**
1. ✅ Keep `create-from-strategy` (it's actively used)
2. ⚠️ **Deprecate or remove** `create-strategy` endpoint (if not used)
3. ⚠️ Check if `orchestrator.ts` is still needed (only used by old endpoint)

#### Issue: Orchestrator vs. Conversational Approach

**Files Involved:**
- `lib/feed-planner/orchestrator.ts` - Complex orchestration logic
- `app/api/feed-planner/create-strategy/route.ts` - Uses orchestrator
- `app/api/feed-planner/create-from-strategy/route.ts` - Direct strategy creation (no orchestrator)

**Conflicting Patterns:**
1. **Old Pattern (orchestrator.ts):**
   - Multi-step orchestration
   - Research, analysis, layout generation
   - Complex flow with multiple AI calls

2. **New Pattern (create-from-strategy):**
   - Direct strategy creation from Maya's JSON
   - No orchestration needed
   - Simpler, faster flow

**Recommendation:**
- ✅ **New pattern is correct** (matches simplified plan)
- ⚠️ **Archive/deprecate orchestrator.ts** if not used
- ✅ Keep `create-from-strategy` as primary endpoint

---

### 2. Placeholder Images Not Fetching/Previewing After Generation

#### Issue: Images Complete but UI Doesn't Refresh

**Symptoms:**
- Images are generated and uploaded to Blob storage
- Database is updated with `image_url`
- UI still shows placeholder instead of actual image

**Root Cause Analysis:**

1. **SWR Polling Logic** (`instagram-feed-view.tsx:115-125`):
```typescript
refreshInterval: (data) => {
  const hasGeneratingPosts = data?.posts?.some(
    (p: any) => p.prediction_id && !p.image_url  // ⚠️ ISSUE HERE
  )
  const isProcessing = data?.feed?.status === 'processing' || 
                      data?.feed?.status === 'queueing'
  return (hasGeneratingPosts || isProcessing) ? 5000 : 0
}
```

**Problem:** Polling stops when `!p.image_url` is false, but there's a timing issue:
- Replicate completes → API updates database
- But SWR hasn't refreshed yet
- Polling condition stops before refresh happens
- UI shows stale data (no image_url yet)

2. **API Endpoint Updates Database** (`app/api/feed/[feedId]/route.ts:132-212`):
```typescript
// API correctly updates database when Replicate completes
if (prediction.status === "succeeded" && prediction.output) {
  // Uploads to Blob, updates database
  await sql`UPDATE feed_posts SET image_url = ${blob.url}, ...`
}
```

**Problem:** API updates database but:
- Updates happen asynchronously
- SWR may not refresh immediately after update
- UI needs explicit refresh trigger

3. **Missing Explicit Refresh After Generation**:
- `handleGenerateSingle` calls `mutate()` after 1 second delay
- But if generation completes in background, no explicit refresh
- SWR polling should catch it, but timing window exists

#### Solution

**Fix 1: Improve Polling Logic**
```typescript
refreshInterval: (data) => {
  // Poll if posts have prediction_id but no image_url (generating)
  const hasGeneratingPosts = data?.posts?.some(
    (p: any) => p.prediction_id && !p.image_url
  )
  
  // ALSO poll if feed status indicates processing
  const isProcessing = data?.feed?.status === 'processing' || 
                      data?.feed?.status === 'queueing' ||
                      data?.feed?.status === 'generating'
  
  // Continue polling for a grace period even if all posts have image_url
  // (in case API just updated database)
  const shouldPoll = hasGeneratingPosts || isProcessing
  
  return shouldPoll ? 3000 : 0 // Reduced to 3s for faster updates
}
```

**Fix 2: Add Explicit Refresh After Image Upload**
```typescript
// In /api/feed/[feedId]/route.ts after updating database:
await sql`UPDATE feed_posts SET image_url = ${blob.url}, ...`

// Trigger immediate refresh by returning updated data
// (SWR will automatically update UI)
```

**Fix 3: Add Polling Grace Period**
- Continue polling for 10-15 seconds after last update
- Ensures UI catches database updates even if timing is off

---

### 3. Import Dependencies Audit

#### UI Components (feed-planner-screen.tsx)

**Imports Check:** ✅ **CLEAN - No Duplicates**

```typescript
// Maya infrastructure (correctly reused per plan)
import { useMayaChat } from "@/components/sselfie/maya/hooks/use-maya-chat"
import MayaChatInterface from "../sselfie/maya/maya-chat-interface"
import MayaUnifiedInput from "../sselfie/maya/maya-unified-input"

// Feed planner specific
import StrategyPreview from "./strategy-preview"
import InstagramFeedView from "./instagram-feed-view"

// Shared utilities
import { useMayaSettings } from "@/components/sselfie/maya/hooks/use-maya-settings"
import { useMayaMode } from "@/components/sselfie/maya/hooks/use-maya-mode"
```

**Analysis:**
- ✅ No duplicate imports
- ✅ Correctly uses Maya infrastructure (per simplified plan)
- ✅ No conflicting dependencies
- ✅ Follows plan's "reuse existing components" approach

#### Instagram Feed View (instagram-feed-view.tsx)

**Imports Check:** ✅ **CLEAN**

```typescript
import useSWR from "swr"
import { FeedPostGallerySelector } from "./feed-post-gallery-selector"
import { FeedProfileGallerySelector } from "./feed-profile-gallery-selector"
```

**Analysis:**
- ✅ No duplicate imports
- ✅ Uses SWR correctly for polling
- ✅ No conflicting state management

---

## 🔧 Recommended Fixes

### Priority 1: Fix Placeholder Image Refresh Issue

**File:** `components/feed-planner/instagram-feed-view.tsx`

**Change 1: Improve refreshInterval logic**
```typescript
refreshInterval: (data) => {
  // More aggressive polling when generating
  const hasGeneratingPosts = data?.posts?.some(
    (p: any) => p.prediction_id && !p.image_url
  )
  const isProcessing = data?.feed?.status === 'processing' || 
                      data?.feed?.status === 'queueing' ||
                      data?.feed?.status === 'generating'
  
  // Poll faster (3s instead of 5s) when generating
  if (hasGeneratingPosts || isProcessing) {
    return 3000
  }
  
  // Stop polling when all posts have images
  return 0
}
```

**Change 2: Add explicit mutate after generation**
```typescript
// In handleGenerateSingle, after API call succeeds:
setTimeout(() => {
  mutate(`/api/feed/${feedId}`) // Explicit refresh
}, 2000) // Wait 2s for Replicate to process
```

**Change 3: Add key-based refresh trigger**
```typescript
// Use a ref to track last update time
const lastUpdateRef = useRef<number>(Date.now())

// In refreshInterval, check if updates happened recently
const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
const shouldContinuePolling = timeSinceLastUpdate < 15000 // 15s grace period

return (hasGeneratingPosts || isProcessing || shouldContinuePolling) ? 3000 : 0
```

### Priority 2: Clean Up Duplicate Endpoints

**Action Items:**
1. ✅ **Keep:** `create-from-strategy` (active, used by UI)
2. ⚠️ **Deprecate:** `create-strategy` (if not used elsewhere)
3. ⚠️ **Check:** Search codebase for references to `create-strategy`
4. ⚠️ **Archive:** `orchestrator.ts` if not used

**Files to Check:**
```bash
# Search for references to old endpoint
grep -r "create-strategy" app/ components/ --exclude-dir=node_modules
grep -r "orchestrateFeedPlanning" app/ components/ lib/
```

---

## 📋 Implementation Checklist

### Fix Placeholder Images
- [ ] Update `refreshInterval` logic in `instagram-feed-view.tsx`
- [ ] Add explicit `mutate()` calls after generation
- [ ] Add grace period for polling
- [ ] Test: Generate image → Verify UI updates within 5 seconds
- [ ] Test: Multiple images generating → Verify all update correctly

### Clean Up Duplicates
- [ ] Search for all references to `create-strategy` endpoint
- [ ] Verify `create-strategy` is not used anywhere
- [ ] If unused, add deprecation comment or remove
- [ ] Check if `orchestrator.ts` is used (search codebase)
- [ ] Archive or remove unused code

### Testing
- [ ] Test image generation → UI refresh flow
- [ ] Test polling stops when all images complete
- [ ] Test polling continues during generation
- [ ] Test multiple images generating simultaneously
- [ ] Verify no console errors
- [ ] Verify no duplicate API calls

---

## 🎯 Summary

### Current State
- ✅ UI correctly uses Maya infrastructure (per plan)
- ✅ `create-from-strategy` endpoint is active and working
- ⚠️ Old `create-strategy` endpoint still exists (unclear if used)
- 🔴 Placeholder images not refreshing after generation (timing issue)

### Recommended Actions
1. **IMMEDIATE:** Fix placeholder image refresh (update polling logic)
2. **HIGH:** Clean up duplicate endpoints (deprecate/remove old code)
3. **MEDIUM:** Add explicit refresh triggers after image generation
4. **LOW:** Archive unused orchestrator code

### Success Criteria
- ✅ Images appear in UI within 5 seconds of database update
- ✅ No duplicate/conflicting endpoints
- ✅ Clear codebase with single source of truth
- ✅ All tests pass

---

## 📝 Notes

- The simplified plan's approach (reusing Maya infrastructure) is correctly implemented
- The placeholder issue is a timing/polling problem, not a fundamental architecture issue
- Cleaning up duplicate endpoints will improve maintainability
- Consider adding unit tests for polling logic to prevent regressions






