# Existing Logic Analysis - No Duplication Needed

## ✅ EXISTING ENDPOINTS

### 1. `/api/feed/[feedId]/check-post` - ALREADY EXISTS ✅
**File:** `app/api/feed/[feedId]/check-post/route.ts`

**Purpose:** Check status of a single feed post
**Parameters:**
- `predictionId` (query param) - Replicate prediction ID
- `postId` (query param) - Database post ID

**Returns:**
```typescript
{
  status: "succeeded" | "failed" | "processing" | "starting",
  imageUrl?: string,  // Only when status === "succeeded"
  error?: string      // Only when status === "failed"
}
```

**Features:**
- ✅ Checks Replicate prediction status
- ✅ Updates database when complete
- ✅ Uploads to Blob storage
- ✅ Saves to ai_images gallery
- ✅ Handles rate limits with retries
- ✅ Returns cached result if already completed

**Can we use it?** ✅ YES - Perfect match for per-placeholder polling!

---

### 2. `/api/feed/[feedId]/generate-single` - ALREADY EXISTS ✅
**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Purpose:** Start image generation for a single post
**Returns:**
```typescript
{
  predictionId: string,
  success: true,
  message: "Image generation started"
}
```

**Features:**
- ✅ Creates Replicate prediction
- ✅ Updates database with `prediction_id` and `generation_status = 'generating'`
- ✅ Deducts credits
- ✅ Returns `predictionId` for polling

**Can we use it?** ✅ YES - Already returns predictionId!

---

### 3. `/api/feed/[feedId]/progress` - ALREADY EXISTS ✅
**File:** `app/api/feed/[feedId]/progress/route.ts`

**Purpose:** Check ALL posts in a feed (bulk check)
**Returns:**
```typescript
{
  total: number,
  completed: number,
  failed: number,
  progress: number,  // Percentage
  posts: Array<{
    position: number,
    status: string,
    imageUrl?: string
  }>
}
```

**Features:**
- ✅ Checks all posts with prediction_id
- ✅ Updates database for completed posts
- ✅ Returns summary statistics

**Can we use it?** ⚠️ PARTIALLY - Works but inefficient for single post polling (checks all posts)

---

## 🔍 WHAT'S MISSING

### Missing: Per-Placeholder Polling Hook
**Status:** ❌ NOT CREATED YET

**What we need:**
- A hook similar to concept card polling
- Uses existing `/api/feed/[feedId]/check-post` endpoint
- Polls every 3 seconds
- Stops when status is "succeeded" or "failed"

**File to create:** `lib/hooks/use-feed-post-polling.ts`

---

### Missing: Position-Based Check Endpoint (Optional)
**Status:** ⚠️ NOT NEEDED - Can use postId instead

**Current endpoint requires:**
- `predictionId` + `postId`

**Alternative we could add:**
- `feedId` + `position` (to avoid needing postId)

**Decision:** ✅ NOT NEEDED - Components already have `post.id`, so we can use existing endpoint

---

## 📋 IMPLEMENTATION PLAN

### Step 1: Create Polling Hook (NEW)
**File:** `lib/hooks/use-feed-post-polling.ts`

**Reuses:**
- ✅ Existing `/api/feed/[feedId]/check-post` endpoint
- ✅ Same pattern as concept card polling

**Pattern from concept cards:**
```typescript
useEffect(() => {
  if (!predictionId || !postId || isGenerated) return

  const pollInterval = setInterval(async () => {
    const response = await fetch(
      `/api/feed/${feedId}/check-post?predictionId=${predictionId}&postId=${postId}`
    )
    const data = await response.json()

    if (data.status === "succeeded") {
      setImageUrl(data.imageUrl)
      setIsGenerated(true)
      clearInterval(pollInterval)
    } else if (data.status === "failed") {
      setError(data.error)
      clearInterval(pollInterval)
    }
  }, 3000)

  return () => clearInterval(pollInterval)
}, [predictionId, postId, isGenerated])
```

---

### Step 2: Update Feed Placeholders (MODIFY)
**Files:**
- `components/feed-planner/feed-single-placeholder.tsx`
- `components/feed-planner/feed-grid.tsx`

**Changes:**
1. Store `predictionId` from generate-single response
2. Use new polling hook instead of relying on feed-level polling
3. Simplify loading state (single source of truth)

**Reuses:**
- ✅ Existing `/api/feed/[feedId]/generate-single` endpoint
- ✅ Existing `/api/feed/[feedId]/check-post` endpoint

---

## ✅ SUMMARY

**What EXISTS and can be REUSED:**
1. ✅ `/api/feed/[feedId]/check-post` - Perfect for per-placeholder polling
2. ✅ `/api/feed/[feedId]/generate-single` - Already returns predictionId
3. ✅ `/api/feed/[feedId]/progress` - Can keep for bulk checks (optional)

**What needs to be CREATED:**
1. ❌ `lib/hooks/use-feed-post-polling.ts` - New polling hook (reuses existing endpoint)

**What needs to be MODIFIED:**
1. ⚠️ `components/feed-planner/feed-single-placeholder.tsx` - Add polling hook
2. ⚠️ `components/feed-planner/feed-grid.tsx` - Add polling hook

**NO DUPLICATION NEEDED** - All endpoints exist, just need to use them correctly!
