# AUDIT FIXES - IMPLEMENTATION STATUS

**Date:** 2025-01-12  
**Audit Document:** `docs/FREE_BLUEPRINT_FUNNEL_AUDIT.md`  
**Implementation Plan:** 5 Critical Fixes

---

## ✅ FIX 1: TEMPLATE SELECTION PRIORITY

**Status:** ✅ **FULLY IMPLEMENTED**

**Location:** `app/api/feed/[feedId]/generate-single/route.ts` (lines 288-393)

**Implementation:**
- ✅ Checks `user_personal_brand` FIRST (unified wizard - PRIMARY SOURCE)
- ✅ Falls back to `blueprint_subscribers` (legacy blueprint wizard - SECONDARY SOURCE)
- ✅ Uses default template if both sources fail
- ✅ Applied to both FREE and PAID blueprint users
- ✅ Also implemented in `regenerate-post/route.ts`

**Verification:**
```typescript
// PRIMARY SOURCE: user_personal_brand (unified wizard)
const personalBrand = await sql`
  SELECT settings_preference, visual_aesthetic
  FROM user_personal_brand
  WHERE user_id = ${user.id}
  ORDER BY created_at DESC
  LIMIT 1
`

// FALLBACK: blueprint_subscribers (legacy)
if (!personalBrand || personalBrand.length === 0) {
  const blueprintSubscriber = await sql`
    SELECT form_data, feed_style
    FROM blueprint_subscribers
    WHERE user_id = ${user.id}
    LIMIT 1
  `
}
```

---

## ✅ FIX 2: FEED EXPANSION ON UPGRADE

**Status:** ✅ **FULLY IMPLEMENTED**

**Implementation:**

### Webhook Expansion (Primary)
**Location:** `app/api/webhooks/stripe/route.ts` (lines 1222-1291, 1326-1395)

- ✅ Creates posts 2-9 when `paid_blueprint_purchased = TRUE`
- ✅ Checks existing post positions
- ✅ Only creates missing positions
- ✅ Handles both authenticated and guest checkout scenarios
- ✅ Error handling (doesn't fail webhook if expansion fails)

### Client-Side Fallback (Secondary)
**Location:** `components/feed-planner/feed-view-screen.tsx` (lines 101-154)

- ✅ Detects paid user with only 1 post
- ✅ Calls `/api/feed/expand-for-paid` endpoint
- ✅ Refreshes feed data after expansion

### API Endpoint
**Location:** `app/api/feed/expand-for-paid/route.ts`

- ✅ Created and functional
- ✅ Receives `feedId` and `userId`
- ✅ Creates missing posts for positions 2-9

**Verification:**
```typescript
// Webhook: After paid_blueprint_purchased = TRUE
const positionsToCreate = [2, 3, 4, 5, 6, 7, 8, 9].filter(
  (pos) => !existingPositions.includes(pos)
)
```

---

## ✅ FIX 3: WEBHOOK RACE CONDITION

**Status:** ✅ **FULLY IMPLEMENTED**

**Location:** `components/checkout/success-content.tsx` (lines 76-150)

**Implementation:**
- ✅ Polls `/api/feed-planner/access` every 2 seconds
- ✅ Waits until `isPaidBlueprint: true` before redirecting
- ✅ Max 30 attempts (60 seconds timeout)
- ✅ Shows loading message: "Setting up your paid access..."
- ✅ Redirects to `/feed-planner?purchase=success` when confirmed
- ✅ Falls back to redirect with `refresh=needed` if timeout reached

**Verification:**
```typescript
// Poll access status for paid blueprint purchases
useEffect(() => {
  if (!isPollingAccess || !isAuthenticated || purchaseType !== "paid_blueprint") {
    return
  }

  const pollAccessStatus = async () => {
    const response = await fetch('/api/feed-planner/access')
    const data = await response.json()

    if (data.isPaidBlueprint) {
      // Webhook completed! Redirect now
      setIsPollingAccess(false)
      setTimeout(() => {
        router.push('/feed-planner?purchase=success')
      }, 500)
    }
  }

  const interval = setInterval(pollAccessStatus, 2000)
  // ...
}, [isPollingAccess, isAuthenticated, purchaseType])
```

---

## ⚠️ FIX 4: POLLING TIMEOUT

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

**Location:** `components/feed-planner/hooks/use-feed-polling.ts` (lines 33, 38, 67-83)

**Implemented:**
- ✅ 5-minute timeout (`MAX_POLLING_DURATION = 5 * 60 * 1000`)
- ✅ Tracks polling start time (`pollingStartTimeRef`)
- ✅ Stops polling when timeout exceeded
- ✅ Sets `hasTimedOut` flag for UI
- ✅ Logs stuck posts

**Missing:**
- ❌ `/api/feed/post/[postId]/mark-failed` endpoint (not created)
- ❌ Polling hook doesn't call endpoint to mark stuck posts as failed
- ❌ Stuck posts remain in "generating" state in database

**Current Implementation:**
```typescript
if (elapsedTime > MAX_POLLING_DURATION) {
  console.error('[useFeedPolling] ⚠️ Max polling duration exceeded (5 minutes), stopping poll')
  
  // Mark stuck posts (for UI to show error)
  const stuckPosts = data?.posts?.filter((p: any) => p.prediction_id && !p.image_url) || []
  if (stuckPosts.length > 0) {
    console.error(`[useFeedPolling] Posts stuck:`, stuckPosts.map((p: any) => p.id))
    setHasTimedOut(true) // Only sets UI flag, doesn't update database
  }
  
  return 0 // Stop polling
}
```

**What's Needed:**
1. Create `/app/api/feed/post/[postId]/mark-failed/route.ts`
2. Call this endpoint from polling hook when timeout occurs
3. Update database: `generation_status = 'failed'`

---

## ✅ FIX 5: BACKWARD COMPATIBILITY

**Status:** ✅ **FULLY IMPLEMENTED**

**Location:** `app/api/onboarding/unified-onboarding-complete/route.ts` (lines 195-260)

**Implementation:**
- ✅ Writes to `user_personal_brand` (PRIMARY - unified wizard)
- ✅ Also writes to `blueprint_subscribers` (SECONDARY - legacy compatibility)
- ✅ Maps unified wizard format to legacy format:
  - `visual_aesthetic` → `form_data.vibe`
  - `settings_preference` → `feed_style`
  - `businessType`, `idealAudience` → `form_data.businessType`, `form_data.idealAudience`
- ✅ Handles both UPDATE (existing record) and INSERT (new record)
- ✅ Ensures both old and new code paths work

**Verification:**
```typescript
// PRIMARY: Write to user_personal_brand (unified wizard)
await sql`
  INSERT INTO user_personal_brand (...)
  VALUES (...)
`

// SECONDARY: Also write to blueprint_subscribers (backward compatibility)
const formDataForLegacy = {
  businessType: businessType || null,
  idealAudience: idealAudience || null,
  vibe: visualAesthetic[0] || "professional",
  // ...
}

await sql`
  UPDATE blueprint_subscribers
  SET 
    form_data = ${JSON.stringify(formDataForLegacy)}::jsonb,
    feed_style = ${feedStyleForLegacy},
    updated_at = NOW()
  WHERE user_id = ${neonUser.id}
`
```

---

## SUMMARY

| Fix | Status | Completion |
|-----|--------|------------|
| **Fix 1: Template Selection Priority** | ✅ Complete | 100% |
| **Fix 2: Feed Expansion on Upgrade** | ✅ Complete | 100% |
| **Fix 3: Webhook Race Condition** | ✅ Complete | 100% |
| **Fix 4: Polling Timeout** | ⚠️ Partial | 80% (timeout works, but missing mark-failed endpoint) |
| **Fix 5: Backward Compatibility** | ✅ Complete | 100% |

**Overall Completion:** 96% (4/5 fixes fully implemented, 1/5 partially implemented)

---

## RECOMMENDATION

**To Complete Fix 4:**

1. Create `/app/api/feed/post/[postId]/mark-failed/route.ts`:
```typescript
import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const postId = parseInt(params.postId)

    await sql`
      UPDATE feed_posts
      SET generation_status = 'failed',
          updated_at = NOW()
      WHERE id = ${postId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MARK FAILED] Error:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}
```

2. Update `use-feed-polling.ts` to call this endpoint:
```typescript
if (stuckPosts.length > 0) {
  console.error(`[useFeedPolling] Posts stuck:`, stuckPosts.map((p: any) => p.id))
  setHasTimedOut(true)
  
  // Mark stuck posts as failed in database
  stuckPosts.forEach(post => {
    fetch(`/api/feed/post/${post.id}/mark-failed`, { method: 'POST' })
      .catch(err => console.error(`[useFeedPolling] Failed to mark post ${post.id} as failed:`, err))
  })
}
```

---

**END OF STATUS REPORT**
