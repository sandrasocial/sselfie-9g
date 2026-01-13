# Polling System Comparison

| Feature | Concept Cards (✅ Working) | Feed Placeholders (❌ Broken) |
|---------|---------------------------|------------------------------|
| **Trigger** | User clicks "Generate" button | User clicks "Generate Image" button |
| **API Endpoint** | `/api/maya/generate-image` or `/api/maya/pro/generate-image` | `/api/feed/${feedId}/generate-single` |
| **Response** | Returns `predictionId` and `generationId` immediately | Returns immediately (no IDs in response) |
| **Loading State** | `isGenerating` (local state) | `isGenerating` (local) + `post.generation_status` (prop) + `postStatus.isGenerating` (unclear source) |
| **Polling Start** | `useEffect` when `predictionId` and `generationId` are set | ❌ NO DIRECT POLLING - relies on parent `useFeedPolling` hook |
| **Polling Interval** | 3 seconds | 3 seconds (but at feed level, not post level) |
| **Polling Endpoint** | `/api/maya/check-generation?predictionId=X&generationId=Y` | `/api/feed/${feedId}/progress` (checks ALL posts) |
| **Stop Condition** | `status === "succeeded"` or `status === "failed"` | Complex: checks if any post has `prediction_id && !image_url` |
| **Cleanup** | `clearInterval` in useEffect cleanup | ❌ No per-placeholder cleanup (feed-level only) |
| **Image Display** | `generatedImageUrl` state (initialized from concept prop) | `post.image_url` from parent feed data |
| **Error Handling** | Sets `error` state, stops polling, shows error | Shows toast, resets `isGenerating`, but polling continues |
| **State Persistence** | Image URL saved to JSONB, restored from concept prop | Image URL in database, but no local state restoration |
| **Page Refresh** | ✅ No refresh | ❌ `window.location.reload()` in feed expansion |

## Critical Differences

### Difference 1: Per-Component Polling vs Feed-Level Polling
**Concept Cards:** Each card polls its own generation status independently
**Feed Placeholders:** All placeholders rely on a single feed-level polling hook
**Impact:** 
- Feed placeholders can't check individual post status
- Polling continues even when some posts are done
- Complex conditional logic to determine when to stop

### Difference 2: Direct Status Check Endpoint
**Concept Cards:** `/api/maya/check-generation?predictionId=X&generationId=Y` - checks ONE generation
**Feed Placeholders:** `/api/feed/${feedId}/progress` - checks ALL posts in feed
**Impact:**
- Inefficient (checks all posts even if only one is generating)
- Can't check individual post status
- No direct equivalent to concept card's check endpoint

### Difference 3: State Management
**Concept Cards:** 
- Local state: `generatedImageUrl`, `isGenerating`, `predictionId`, `generationId`
- Persisted to JSONB in database
- Restored from concept prop on mount

**Feed Placeholders:**
- Local state: `isGenerating` (only in single placeholder)
- Image URL: comes from `post.image_url` prop (no local state)
- No persistence/restoration logic

**Impact:**
- Feed placeholders lose state on re-render
- Can't restore image URL from local state
- Multiple sources of truth for loading state

### Difference 4: Polling Cleanup
**Concept Cards:** 
- `clearInterval` in useEffect cleanup
- Stops immediately when status is "succeeded" or "failed"
- Cleanup on unmount

**Feed Placeholders:**
- No per-placeholder cleanup
- Feed-level polling continues until all posts are done
- Complex logic to determine when to stop

**Impact:**
- Polling continues unnecessarily
- UI flashing from frequent updates
- Performance issues

### Difference 5: Page Refresh
**Concept Cards:** ✅ No page refresh
**Feed Placeholders:** ❌ `window.location.reload()` in feed expansion (FIXED)
**Impact:**
- Page refresh loses all state
- Welcome screen reappears
- User loses context

---

## Root Causes Analysis

### Issue 1: Page Refresh After Generation ✅ FIXED
**Symptoms:**
- Page fully reloads after first image generates
- User loses context
- Welcome screen appears again

**Root Cause:** `window.location.reload()` in `feed-view-screen.tsx:165`
**Fix Applied:** Replaced with `router.refresh()` to maintain React state

### Issue 2: Welcome Screen Reappearing
**Symptoms:**
- Welcome wizard shows again after it was dismissed
- Flag not persisting

**Possible Causes:**
- Page refresh was clearing state (FIXED)
- Database flag not being set correctly
- Cache invalidation clearing flag

**Investigation Needed:**
- Check `/api/feed-planner/welcome-status` endpoint
- Verify flag is set in database
- Check if flag is checked correctly on mount

### Issue 3: Inconsistent Polling
**Symptoms:**
- Some placeholders poll, some don't
- Polling never stops
- Multiple polling intervals running

**Root Causes:**
1. No per-placeholder polling (unlike concept cards)
2. Feed-level polling checks all posts
3. Complex conditional logic for when to stop
4. No direct status check endpoint per post

**Fix Required:**
- Create `/api/feed/[feedId]/check-post?position=X` endpoint
- Implement per-placeholder polling hook (like concept cards)
- Simplify polling logic

### Issue 4: Loading States Out of Sync
**Symptoms:**
- Spinner shows but no generation happening
- Generation happens but no loading indicator
- Loading state stuck on

**Root Causes:**
1. Multiple sources of truth: `isGenerating`, `post.generation_status`, `postStatus.isGenerating`
2. State not updating after API call
3. No error handling resetting loading state
4. Props vs local state conflict

**Fix Required:**
- Single source of truth for generation status
- Consistent state management (like concept cards)
- Proper error handling

---

## Recommended Fixes

### Fix 1: Create Post Status Check Endpoint ✅ PENDING
**File:** `app/api/feed/[feedId]/check-post/route.ts`
**Purpose:** Check status of a single post (like concept cards use `/api/maya/check-generation`)

### Fix 2: Implement Per-Placeholder Polling Hook ✅ PENDING
**File:** `lib/hooks/use-feed-post-polling.ts`
**Purpose:** Poll individual post status (like concept cards poll their own status)

### Fix 3: Update Feed Placeholders ✅ PENDING
**Files:** 
- `components/feed-planner/feed-single-placeholder.tsx`
- `components/feed-planner/feed-grid.tsx`
**Purpose:** Use new polling hook instead of relying on feed-level polling

### Fix 4: Simplify Loading States ✅ PENDING
**Purpose:** Single source of truth for generation status

### Fix 5: Test Welcome Screen Persistence ✅ PENDING
**Purpose:** Verify welcome flag is set and persists correctly
