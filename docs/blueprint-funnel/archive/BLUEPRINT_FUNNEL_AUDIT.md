# Blueprint Funnel Audit Report
**Date:** $(date)  
**Auditor:** AI Engineering Team  
**Purpose:** Audit current blueprint funnel implementation, identify complexity/duplication issues, and provide recommendations

---

## Executive Summary

The current blueprint funnel implementation has become **overcomplicated and duplicated**. The paid blueprint was implemented as an embedded FeedViewScreen with feature flags, which conflicts with the intended design: **a minimal template-based version of the feed planner** (not Maya chat-based).

### Key Findings:
1. ✅ **Free Blueprint** works well as a standalone funnel (email capture → wizard → strategy → grid)
2. ❌ **Paid Blueprint** duplicates FeedViewScreen architecture instead of using templates
3. ⚠️ **Feature flags** (`mode="blueprint"`) create complexity and confusion
4. 🔄 **Data mapping** between blueprint and feed formats is unnecessary overhead
5. 🎯 **Naming inconsistency**: "Blueprint" vs "Feed" creates confusion

---

## Current Architecture

### 1. Free Blueprint Flow (✅ Working Well)

**Entry Point:** `/blueprint`

**Flow:**
```
1. Email Capture (guest) OR Authenticated User Check
2. Brand Onboarding Wizard (questions about business)
3. Feed Style Selection
4. Strategy Generation (AI creates content strategy)
5. Selfie Upload (optional, for grid generation)
6. Grid Generation (30-day Instagram grid preview)
7. Results View (Strategy | Captions | Grid tabs)
8. Upsell to Paid Blueprint OR Membership
```

**Components:**
- `app/blueprint/page-server.tsx` - Server-side routing logic
- `app/blueprint/page-client.tsx` - Client-side multi-step wizard
- `components/blueprint/blueprint-email-capture.tsx` - Email capture form
- `components/onboarding/blueprint-onboarding-wizard.tsx` - Brand questions
- `components/blueprint/blueprint-selfie-upload.tsx` - Selfie upload
- `components/sselfie/blueprint-screen.tsx` - Authenticated user blueprint view

**Database Tables:**
- `blueprint_subscribers` - Stores email, form data, strategy, grid URLs
- Columns: `email`, `access_token`, `form_data`, `strategy_data`, `strategy_generated`, `grid_generated`, `grid_url`, `selfie_image_urls`, `feed_style`, `paid_blueprint_purchased`

---

### 2. Paid Blueprint Flow (❌ Overcomplicated)

**Current Implementation (WRONG):**
```
1. User completes Free Blueprint
2. Clicks "Upgrade to Paid Blueprint" CTA
3. Checkout at `/checkout/blueprint`
4. After payment → Redirects to `/blueprint/paid?access=TOKEN`
5. Shows FeedViewScreen with mode="blueprint" flag
6. Uses /api/feed/blueprint endpoint
7. Maps blueprint strategy_data to feed format via blueprint-mapper.ts
8. Generates 30 grids using Maya chat flow (WRONG - should be template-based)
```

**Components (Current - Overcomplicated):**
- `app/blueprint/paid/page.tsx` - Paid blueprint page (separate from free)
- `app/api/feed/blueprint/route.ts` - API that maps blueprint to feed format
- `lib/feed-planner/blueprint-mapper.ts` - Converts blueprint strategy → feed posts
- `components/feed-planner/feed-view-screen.tsx` - Embedded with `mode="blueprint"`
- `components/feed-planner/feed-posts-list.tsx` - Has mode prop to hide caption generation
- `components/feed-planner/feed-tabs.tsx` - Has mode prop to hide strategy tab
- `components/feed-planner/instagram-feed-view.tsx` - Has mode prop for feature flags

**Database:**
- Same `blueprint_subscribers` table
- `paid_blueprint_purchased` = true
- `paid_blueprint_photo_urls` = array of 30 grid URLs

**Issues:**
1. ❌ Uses full FeedViewScreen (designed for Maya chat-based feed creation)
2. ❌ Feature flags (`mode="blueprint"`) scattered across multiple components
3. ❌ Unnecessary data mapping (blueprint strategy → feed format)
4. ❌ Separate route `/blueprint/paid` instead of unified experience
5. ❌ Uses Maya chat architecture instead of template-based approach
6. ❌ Duplicates feed planner logic instead of being minimal version

---

### 3. What Paid Blueprint SHOULD Be (Per Requirements)

**Intended Design:**
```
1. User completes Free Blueprint (has strategy_data)
2. Clicks "Upgrade to Paid Blueprint"
3. Checkout
4. After payment → Show minimal feed planner UI
5. Template-based image generation (NOT Maya chat)
6. Uses same strategy_data from free blueprint
7. Generates 30 photos using templates (same as free blueprint grid generation)
8. Simple grid gallery view (like current /blueprint/paid but simpler)
```

**Key Difference:**
- ✅ **Template-based**: Uses prompt templates + selfies (like free blueprint)
- ✅ **Minimal UI**: Simple grid gallery, no tabs, no strategy view, no captions
- ✅ **Same logic**: Reuses free blueprint's grid generation logic
- ❌ **NOT Maya chat**: Should not use feed planner's chat-based creation
- ❌ **NOT FeedViewScreen**: Should not embed full feed planner component

---

## Architecture Problems

### Problem 1: Duplication of Feed Planner

**Current Approach:**
- Paid blueprint embeds `FeedViewScreen` with `mode="blueprint"`
- Uses `/api/feed/blueprint` endpoint that maps blueprint data to feed format
- Hides features with feature flags instead of using simpler component

**What Should Happen:**
- Paid blueprint should use simple template-based generation
- Reuse free blueprint's grid generation logic
- Simple gallery view (like current `/blueprint/paid/page.tsx` but better)

---

### Problem 2: Feature Flags Scattered Everywhere

**Files with `mode="blueprint"` feature flags:**
1. `components/feed-planner/feed-view-screen.tsx` - Uses different API endpoint
2. `components/feed-planner/feed-posts-list.tsx` - Hides caption generation
3. `components/feed-planner/feed-tabs.tsx` - Hides strategy tab
4. `components/feed-planner/instagram-feed-view.tsx` - Passes mode prop through

**Impact:**
- Maintenance burden (feature flags in 4+ files)
- Confusion about what blueprint mode does
- Risk of bugs when modifying feed planner
- Unclear separation of concerns

---

### Problem 3: Unnecessary Data Mapping

**Current:**
- `lib/feed-planner/blueprint-mapper.ts` converts blueprint `strategy_data` to feed `posts` format
- `/api/feed/blueprint` endpoint does the mapping
- FeedViewScreen expects feed format, blueprint has different format

**Why This Is Wrong:**
- Blueprint already has `strategy_data` in its own format
- Paid blueprint should use blueprint's format directly
- No need to convert to feed format if we're not using FeedViewScreen

---

### Problem 4: Naming Inconsistency

**Current Names:**
- "Blueprint" (free and paid)
- "Feed Planner" (membership feature)
- Both create Instagram feeds/strategies
- Confusing for users and developers

**User Perspective:**
- "Blueprint" = Free brand strategy tool
- "Feed Planner" = Paid membership feature
- But paid blueprint also creates feeds...

**Recommendation:**
- Consider renaming "Blueprint" to "Feed" or "Brand Feed"
- OR rename "Feed Planner" to "Studio Feed" or "Membership Feed"
- Keep naming consistent across freebie → paid → membership

---

### Problem 5: Separate Routes Create Fragmentation

**Current Routes:**
- `/blueprint` - Free blueprint (guest flow)
- `/blueprint?email=X&token=Y` - Free blueprint (guest resume)
- `/blueprint` - Free blueprint (authenticated user, uses BlueprintScreen)
- `/blueprint/paid?access=TOKEN` - Paid blueprint (separate page)

**Issues:**
- Paid blueprint feels disconnected from free blueprint
- Users don't understand the relationship
- Hard to maintain state between free → paid
- Redirects create confusion

---

## Current Funnel Flow Analysis

### Free Blueprint → Paid Blueprint → Membership

**Step 1: Free Blueprint (✅ Working)**
```
/blueprint
├─ Email capture (creates blueprint_subscribers record)
├─ Brand wizard (saves form_data)
├─ Feed style selection
├─ Strategy generation (saves strategy_data)
├─ Selfie upload (optional, saves selfie_image_urls)
├─ Grid generation (saves grid_url)
└─ Results view with upsell CTAs
```

**Step 2: Paid Blueprint (❌ Overcomplicated)**
```
Checkout (/checkout/blueprint)
├─ Stripe payment
├─ Webhook sets paid_blueprint_purchased = true
└─ Redirects to /blueprint/paid?access=TOKEN

/blueprint/paid?access=TOKEN
├─ Fetches status via /api/blueprint/get-paid-status
├─ Shows FeedViewScreen with mode="blueprint"
├─ Uses /api/feed/blueprint (maps strategy_data → feed format)
├─ Should generate 30 grids using templates
└─ Currently uses Maya chat flow (WRONG)
```

**Step 3: Membership Upsell (❓ Unclear)**
```
- Where does paid blueprint users see membership upsell?
- Current implementation doesn't show clear path
- Should show upsell after generating paid blueprint photos
```

---

## Simplification Opportunities

### Opportunity 1: Unify Paid Blueprint with Free Blueprint

**Current:**
- Separate route `/blueprint/paid`
- Separate page component
- Different data flow

**Recommended:**
- Keep same route `/blueprint`
- Add paid features to existing page
- Show paid blueprint generation in same UI
- Better user experience (seamless upgrade)

---

### Opportunity 2: Remove FeedViewScreen Dependency

**Current:**
- Paid blueprint embeds FeedViewScreen
- Uses feature flags to hide features
- Maps data to feed format

**Recommended:**
- Create simple paid blueprint gallery component
- Reuse free blueprint's grid generation logic
- No feature flags needed
- Cleaner separation

---

### Opportunity 3: Use Template-Based Generation (As Intended)

**Current:**
- Tries to use FeedViewScreen (Maya chat-based)
- Complex data mapping

**Recommended:**
- Use same template-based generation as free blueprint
- Reuse `/api/blueprint/generate-concept-image` or similar
- Generate 30 photos using templates + selfies
- Simple grid gallery view

---

### Opportunity 4: Simplify Naming

**Option A: Rename "Blueprint" to "Feed"**
```
Free Feed → Paid Feed → Studio Membership
- More consistent
- Clearer progression
- "Feed" is more familiar to users
```

**Option B: Keep "Blueprint", Rename "Feed Planner"**
```
Blueprint (Free) → Paid Blueprint → Studio Feed Planner (Membership)
- Keeps existing "Blueprint" brand
- Renames membership feature for clarity
```

**Option C: Unified "Brand Feed"**
```
Brand Feed (Free) → Brand Feed Pro (Paid) → Studio Membership
- All under "Brand Feed" umbrella
- Clear tiers
```

**Recommendation:** Option A or B (user research needed)

---

## Recommendations

### Short-Term Fixes (Keep Current Architecture)

1. **Fix Paid Blueprint to Use Templates**
   - Remove FeedViewScreen dependency
   - Create simple paid blueprint gallery component
   - Reuse free blueprint's grid generation API
   - Remove blueprint-mapper.ts (no longer needed)

2. **Unify Routes**
   - Keep paid blueprint on `/blueprint` route
   - Use query param or state to show paid features
   - Remove `/blueprint/paid` route

3. **Simplify Feature Flags**
   - Remove `mode="blueprint"` from feed planner components
   - Paid blueprint doesn't use feed planner anymore

---

### Long-Term Refactor (Recommended)

1. **Consolidate Blueprint Implementation**
   - Free and paid blueprint share same component
   - Paid blueprint = free blueprint + 30 grid generation
   - Simple template-based generation for both

2. **Rename for Consistency**
   - Decide on naming strategy (Blueprint vs Feed)
   - Update all routes, components, database columns
   - Update user-facing copy

3. **Simplify Data Model**
   - Blueprint and feed planner have different purposes
   - No need to map between them
   - Keep data models separate

4. **Clear Funnel Progression**
   - Free Feed/Blueprint (template-based, strategy + grid)
   - Paid Feed/Blueprint (template-based, 30 photos)
   - Studio Membership (Maya chat-based, unlimited)

---

## Proposed Architecture

### Simplified Blueprint Funnel

```
/blueprint (Free)
├─ Email capture
├─ Brand wizard
├─ Strategy generation
├─ Grid generation (1 grid, 30 days)
└─ Results + "Generate 30 Photos" CTA

/blueprint (Paid - after checkout)
├─ Same UI as free blueprint
├─ Shows "Generate 30 Photos" button (enabled)
├─ Template-based generation (reuses free blueprint logic)
├─ Gallery view (30 grids)
└─ Membership upsell

/studio (Membership)
├─ Maya chat (feed creation)
├─ Feed Planner (full features)
└─ Gallery, Academy, etc.
```

**Key Changes:**
1. ✅ Same route for free and paid (`/blueprint`)
2. ✅ Same component (just enable paid features after checkout)
3. ✅ Template-based generation (not FeedViewScreen)
4. ✅ No feature flags needed
5. ✅ No data mapping needed
6. ✅ Clear progression: Free → Paid → Membership

---

## Files to Modify (If Refactoring)

### Remove (No Longer Needed):
- `app/blueprint/paid/page.tsx` (consolidate into main blueprint)
- `app/api/feed/blueprint/route.ts` (no feed mapping needed)
- `lib/feed-planner/blueprint-mapper.ts` (no mapping needed)
- `mode="blueprint"` props from feed planner components

### Create/Modify:
- Simple paid blueprint gallery component (template-based)
- Unified blueprint page (handles both free and paid)
- Template-based photo generation API (reuse free blueprint logic)

### Update:
- Remove feature flags from feed planner components
- Update routes to unify free/paid blueprint
- Update database queries (remove mapping logic)

---

## Conclusion

The current paid blueprint implementation is **overcomplicated** because it:
1. Embeds FeedViewScreen (designed for different use case)
2. Uses feature flags instead of proper separation
3. Maps data unnecessarily
4. Creates separate routes instead of unified experience

**The solution is simpler:**
- Paid blueprint should be a **minimal template-based version**
- Reuse free blueprint's generation logic
- Same route and component (just enable paid features)
- No feed planner dependency
- Clear progression: Free → Paid → Membership

**Recommendation:** Refactor to simplified architecture for maintainability and user experience.
