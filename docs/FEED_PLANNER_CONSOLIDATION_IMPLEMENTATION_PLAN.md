# Feed Planner Consolidation Implementation Plan
**Date:** $(date)  
**Purpose:** Complete implementation plan to consolidate Blueprint into Feed Planner with unified funnel

---

## Overview

**Goal:** Remove Blueprint as separate feature and consolidate into Feed Planner with access control (free mode)

**Approach:** 
- Remove Blueprint tab/screen entirely
- All users (free and paid) use `/feed-planner` route
- Access control determines features (free vs paid vs membership)
- Same UI/components for all users
- Free mode: One 9:16 placeholder, generation buttons hidden
- Paid mode: Full 3x3 grid, all features unlocked
- Questionnaire wizard integrated (paid users need it anyway)

---

## Current Architecture (Based on Code Inspection)

### Current Implementation:

**Routes:**
- `/feed-planner` - Feed Planner page (authenticated users only)
- `/blueprint` - Blueprint page (free and paid blueprint)
- `/blueprint/paid` - Paid blueprint page (separate route)

**Components:**
- `components/feed-planner/feed-view-screen.tsx` - Main Feed Planner component
- `components/feed-planner/instagram-feed-view.tsx` - Feed view with tabs (Grid - Posts - Strategy)
- `components/sselfie/blueprint-screen.tsx` - Blueprint screen (separate component)
- `components/onboarding/blueprint-onboarding-wizard.tsx` - Questionnaire wizard

**Access Control (lib/subscription.ts):**
- `hasPaidBlueprint(userId)` - Checks if user has paid blueprint
- `hasStudioMembership(userId)` - Checks if user has membership
- `getBlueprintEntitlement(userId)` - Returns entitlement type (free/paid/studio)
- `getUserProductAccess(userId)` - Returns product type
- `hasAcademyAccess(userId)` - Checks academy access (membership only)

**Database Tables:**
- `blueprint_subscribers` - Stores blueprint data (form_data, strategy_data, grid_url, selfie_image_urls, paid_blueprint_purchased)
- `feed_layouts` - Stores feed planner feeds
- `feed_posts` - Stores feed posts
- `subscriptions` - Stores user subscriptions (paid_blueprint, sselfie_studio_membership)

**Image Generation:**
- Uses Nano Banana Pro (`lib/nano-banana-client.ts`)
- Template-based generation (no user prompts)
- API: `/api/feed/[feedId]/generate-single` - Generates single image
- Uses avatar images from `user_avatar_images` table

**Navigation:**
- Blueprint tab in `components/sselfie/sselfie-app.tsx` (line 554)
- Routes to `BlueprintScreen` component when blueprint tab active
- Tabs array includes blueprint: `{ id: "blueprint", label: "Blueprint", icon: FileText }`

---

## Access Levels (From Code Inspection)

### Free Users:
- No subscription
- Can access Feed Planner (but limited features)
- Can complete questionnaire wizard
- Can upload selfies
- Can generate one example grid (currently in blueprint)

### Paid Blueprint Users:
- `subscriptions.product_type = "paid_blueprint"`
- `subscriptions.status = "active"`
- Can access full Feed Planner (30 photos, captions, strategy)
- Gallery access (to store images)
- 3 feed planners only
- Direct image generation buttons

### One-Time Session Users:
- Have credits but no subscription
- Access to Feed Planner + Maya + Gallery
- No Academy access
- Tracked via credits (not subscriptions table)

### Membership Users:
- `subscriptions.product_type = "sselfie_studio_membership"`
- `subscriptions.status = "active"`
- Full access to everything (Feed Planner + Maya + Gallery + Academy)
- 200 credits/month

---

## Implementation Steps

### Phase 1: Access Control Setup

**1.1 Create Access Control Utility**

**File:** `lib/feed-planner/access-control.ts` (NEW)

```typescript
import { hasPaidBlueprint, hasStudioMembership, getBlueprintEntitlement } from "@/lib/subscription"
import { getUserCredits } from "@/lib/credits"

export interface FeedPlannerAccess {
  isFree: boolean
  isPaidBlueprint: boolean
  isOneTime: boolean
  isMembership: boolean
  hasGalleryAccess: boolean
  canGenerateImages: boolean
  canGenerateCaptions: boolean
  canGenerateStrategy: boolean
  canGenerateBio: boolean
  canGenerateHighlights: boolean
  maxFeedPlanners: number | null // null = unlimited
  placeholderType: "single" | "grid" // single = 9:16 placeholder, grid = 3x3
}

export async function getFeedPlannerAccess(userId: string): Promise<FeedPlannerAccess> {
  const hasPaid = await hasPaidBlueprint(userId)
  const hasMembership = await hasStudioMembership(userId)
  const credits = await getUserCredits(userId)
  const hasCredits = credits > 0
  
  // Determine access level
  const isMembership = hasMembership
  const isPaidBlueprint = hasPaid && !hasMembership
  const isOneTime = !hasMembership && !hasPaid && hasCredits
  const isFree = !hasMembership && !hasPaid && !hasCredits
  
  return {
    isFree,
    isPaidBlueprint,
    isOneTime,
    isMembership,
    hasGalleryAccess: hasPaid || hasMembership || hasCredits, // Paid, membership, or one-time
    canGenerateImages: hasPaid || hasMembership || hasCredits, // Paid, membership, or one-time
    canGenerateCaptions: hasPaid || hasMembership || hasCredits, // Paid, membership, or one-time
    canGenerateStrategy: hasPaid || hasMembership || hasCredits, // Paid, membership, or one-time
    canGenerateBio: hasPaid || hasMembership || hasCredits, // Paid, membership, or one-time
    canGenerateHighlights: hasPaid || hasMembership || hasCredits, // Paid, membership, or one-time
    maxFeedPlanners: isPaidBlueprint ? 3 : null, // Paid blueprint = 3, others = unlimited
    placeholderType: isFree ? "single" : "grid", // Free = single 9:16, others = 3x3 grid
  }
}
```

**1.2 Update Feed Planner Page to Check Access**

**File:** `app/feed-planner/page.tsx`

**Changes:**
- Add access control check
- Pass access level to FeedViewScreen
- Integrate questionnaire wizard for free/first-time paid users

---

### Phase 2: Remove Blueprint Tab

**2.1 Remove Blueprint from Navigation**

**File:** `components/sselfie/sselfie-app.tsx`

**Changes:**
- Remove blueprint from tabs array (line 554)
- Remove blueprint tab logic
- Remove blueprint routing logic
- Update valid tabs list

**Lines to modify:**
- Line 90: Remove "blueprint" from validTabs
- Line 102: Remove "blueprint" from validTabs
- Line 554: Remove blueprint tab object from tabs array
- Line 962-964: Remove BlueprintScreen rendering
- Line 1051: Remove blueprint from feedback button hide condition
- Line 1132: Remove blueprint tab redirect

**2.2 Redirect Blueprint Routes to Feed Planner**

**File:** `app/blueprint/page.tsx` (MODIFY to redirect)

**Changes:**
- Redirect `/blueprint` → `/feed-planner`
- Redirect `/blueprint/paid` → `/feed-planner`

**Or remove entirely:**
- Delete `app/blueprint/` directory
- Update all links/references

---

### Phase 3: Integrate Questionnaire Wizard into Feed Planner

**3.1 Add Wizard to Feed Planner Page**

**File:** `app/feed-planner/page.tsx`

**Changes:**
- Check if user needs wizard (free or first-time paid)
- Show wizard if needed
- After wizard completion, proceed to Feed Planner

**3.2 Wizard Integration Logic**

**Check:**
- Free users: Always show wizard (unless already completed)
- Paid first-time users: Show wizard (skip free example)
- Paid returning users: Skip wizard

**Use existing:** `components/onboarding/blueprint-onboarding-wizard.tsx`

---

### Phase 4: Update Feed Planner UI for Free Mode

**4.1 Add Access Control to FeedViewScreen**

**File:** `components/feed-planner/feed-view-screen.tsx`

**Changes:**
- Accept access control prop
- Show one 9:16 placeholder for free users
- Show full 3x3 grid for paid users
- Hide generation buttons for free users

**4.2 Remove Mode Props**

**Files to update:**
- `components/feed-planner/feed-view-screen.tsx` - Remove mode prop
- `components/feed-planner/instagram-feed-view.tsx` - Remove mode prop
- `components/feed-planner/feed-tabs.tsx` - Remove mode prop
- `components/feed-planner/feed-posts-list.tsx` - Remove mode prop

**Replace with:** Access control checks

**4.3 Update FeedTabs Component**

**File:** `components/feed-planner/feed-tabs.tsx`

**Changes:**
- Remove mode prop
- Add access control prop
- Hide strategy tab based on access control (instead of mode)
- Show all tabs for paid users

**4.4 Update FeedPostsList Component**

**File:** `components/feed-planner/feed-posts-list.tsx`

**Changes:**
- Remove mode prop
- Add access control prop
- Hide caption generation button based on access control
- Show caption generation for paid users

**4.5 Create Single Placeholder Component**

**File:** `components/feed-planner/feed-single-placeholder.tsx` (NEW)

**Purpose:** Show one 9:16 placeholder for free users

---

### Phase 5: Image Generation for Paid Users

**5.1 Add Direct Image Generation Buttons**

**File:** `components/feed-planner/feed-grid.tsx` (or relevant component)

**Changes:**
- Add image generation buttons on placeholders
- Only show for paid users (access control)
- Click → Call `/api/feed/[feedId]/generate-single`
- Use template-based generation (Nano Banana Pro)
- No user prompts needed

**5.2 Image Generation Logic**

**Already exists:** `/api/feed/[feedId]/generate-single`

**Uses:**
- Nano Banana Pro (`lib/nano-banana-client.ts`)
- Template-based prompts
- Avatar images from `user_avatar_images`

**No changes needed** - just ensure access control checks are in place

---

### Phase 6: Update Checkout Flow

**6.1 Update Checkout Success Redirect**

**File:** `components/checkout/success-content.tsx`

**Changes:**
- Line 86-87: Redirect paid_blueprint to `/feed-planner` instead of `/blueprint?purchase=success`

**6.2 Update Checkout Error Redirect**

**File:** `app/checkout/blueprint/page.tsx`

**Changes:**
- Line 78: Redirect to `/feed-planner?message=checkout_error` instead of `/blueprint?message=checkout_error`

---

### Phase 7: Database & API Updates

**7.1 Update Blueprint State API**

**File:** `app/api/blueprint/state/route.ts`

**Changes:**
- Keep existing logic (needed for questionnaire wizard)
- May need to update to work with Feed Planner

**7.2 Remove Blueprint Feed Mapping**

**Files to remove:**
- `app/api/feed/blueprint/route.ts` - No longer needed
- `lib/feed-planner/blueprint-mapper.ts` - No longer needed

**7.3 Update Feed Planner APIs**

**Files to verify:**
- `/api/feed/latest` - Should work for all users
- `/api/feed/[feedId]` - Should work for all users
- `/api/feed/[feedId]/generate-single` - Should work for paid users

**Add access control checks** where needed

---

### Phase 8: Gallery Access for Paid Users

**8.1 Verify Gallery Access**

**Check:** `components/feed-planner/instagram-feed-view.tsx`

**Ensure:** Gallery button/access works for paid users

**Note:** Gallery access should already work (check access control)

---

### Phase 9: Testing & Verification

**9.1 Test Free User Flow**
- [ ] User lands on `/feed-planner`
- [ ] Questionnaire wizard shows
- [ ] Can upload selfies
- [ ] Can generate one example (9:16 placeholder)
- [ ] Feed Planner UI shows (tabs: Grid - Captions - Strategy)
- [ ] Generation buttons are hidden
- [ ] Upsell CTA shows

**9.2 Test Paid User Flow (First-Time)**
- [ ] User purchases paid blueprint
- [ ] Redirects to `/feed-planner`
- [ ] Questionnaire wizard shows (skip free example)
- [ ] Can upload selfies
- [ ] Can proceed to full Feed Planner
- [ ] Full 3x3 grid shows
- [ ] All generation buttons visible
- [ ] Can generate images (one at a time or all at once)
- [ ] Gallery access works

**9.3 Test Paid User Flow (Returning)**
- [ ] User already completed free feed planner
- [ ] Purchases paid blueprint
- [ ] Redirects to `/feed-planner`
- [ ] Wizard skipped (already completed)
- [ ] Full Feed Planner shows
- [ ] All features unlocked

**9.4 Test One-Time Session Flow**
- [ ] User has credits (one-time session)
- [ ] Can access Feed Planner
- [ ] Can access Maya
- [ ] Can access Gallery
- [ ] Cannot access Academy

**9.5 Test Membership Flow**
- [ ] User has membership
- [ ] Can access Feed Planner (full features)
- [ ] Can access Maya
- [ ] Can access Gallery
- [ ] Can access Academy

---

## Files to Create

1. `lib/feed-planner/access-control.ts` - Access control utility
2. `components/feed-planner/feed-single-placeholder.tsx` - Single 9:16 placeholder component

---

## Files to Modify

1. `app/feed-planner/page.tsx` - Add access control, integrate wizard
2. `components/feed-planner/feed-view-screen.tsx` - Remove mode prop, add access control
3. `components/feed-planner/instagram-feed-view.tsx` - Remove mode prop, add access control
4. `components/feed-planner/feed-tabs.tsx` - Remove mode prop, add access control
5. `components/feed-planner/feed-posts-list.tsx` - Remove mode prop, add access control
6. `components/sselfie/sselfie-app.tsx` - Remove blueprint tab
7. `components/checkout/success-content.tsx` - Update redirect
8. `app/checkout/blueprint/page.tsx` - Update error redirect
9. `app/blueprint/page.tsx` - Redirect to `/feed-planner` (or delete)

---

## Files to Remove

1. `app/blueprint/` directory (consolidate into `/feed-planner`)
2. `components/sselfie/blueprint-screen.tsx` (use FeedViewScreen instead)
3. `app/api/feed/blueprint/route.ts` (no mapping needed)
4. `lib/feed-planner/blueprint-mapper.ts` (no mapping needed)
5. `app/blueprint/paid/page.tsx` (consolidate into `/feed-planner`)

---

## Migration Strategy

### Step 1: Add Access Control (Non-Breaking)
- Create access control utility
- Add to Feed Planner (doesn't change existing behavior)
- Test thoroughly

### Step 2: Update Feed Planner UI (Non-Breaking)
- Add free mode support
- Remove mode props
- Test with existing users

### Step 3: Integrate Wizard (Non-Breaking)
- Add wizard to Feed Planner
- Test with new users

### Step 4: Remove Blueprint Tab (Breaking)
- Remove from navigation
- Update redirects
- Test all flows

### Step 5: Cleanup (Non-Breaking)
- Remove unused files
- Remove unused APIs
- Clean up references

---

## Risk Assessment

### Low Risk:
- Adding access control utility
- Updating UI components (non-breaking)
- Integrating wizard (non-breaking)

### Medium Risk:
- Removing blueprint tab (breaking change)
- Redirecting routes (breaking change)
- Removing blueprint APIs (breaking change)

### High Risk:
- None (incremental changes)

---

## Rollback Plan

If issues arise:
1. Keep old blueprint route active (redirect only, don't delete)
2. Keep blueprint tab code (comment out, don't delete)
3. Keep blueprint APIs (don't delete, just mark deprecated)
4. Revert access control changes if needed

---

## Success Criteria

1. ✅ Blueprint tab removed from navigation
2. ✅ All users use `/feed-planner` route
3. ✅ Free users see one 9:16 placeholder
4. ✅ Free users see generation buttons hidden
5. ✅ Paid users see full 3x3 grid
6. ✅ Paid users see all generation buttons
7. ✅ Questionnaire wizard integrated
8. ✅ Access control works correctly
9. ✅ No mode props remain
10. ✅ All tests pass

---

## Next Steps

1. Review this plan
2. Get approval for approach
3. Start with Phase 1 (Access Control Setup)
4. Test incrementally
5. Deploy gradually
