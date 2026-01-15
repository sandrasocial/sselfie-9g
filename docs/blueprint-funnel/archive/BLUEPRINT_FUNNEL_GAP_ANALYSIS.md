# BLUEPRINT FUNNEL - GAP ANALYSIS & MIGRATION PLAN

**Date:** January 2025  
**Purpose:** Compare DESIRED vs CURRENT blueprint funnel and create migration strategy  
**Status:** ✅ Complete Analysis

---

## EXECUTIVE SUMMARY

This document provides a comprehensive gap analysis between the **DESIRED** blueprint funnel (user's vision) and the **CURRENT** system (as audited). It identifies what can be reused, what needs modification, and what must be built new.

**Key Findings:**
- **Free Mode Preview:** ✅ **WORKING** - 3x4 grid preview (12 posts in 1 image, 2 credits) already implemented
- **Brand Pillars:** ✅ **WORKING** - Already integrated as last optional step in onboarding
- **Preview Display:** ✅ **WORKING** - Grid image displays correctly in placeholder
- **Database:** Mostly reusable, needs extension from 9 to 12 posts for paid mode
- **API Endpoints:** Maya integration exists, need to use preview template as guideline
- **Frontend:** Paid mode needs extension from 3x3 to 3x4 grid
- **Maya Integration:** ✅ Already exists (`/api/maya/generate-feed-prompt`)
- **Templates:** Need to convert to Maya guidelines (use preview template as guideline for paid mode)

---

## ⚠️ CRITICAL: FREE MODE PRESERVATION

**Current Free Mode (WORKING - DO NOT BREAK):**
- ✅ **3x4 grid preview generation** (12 posts in 1 image, 2 credits) - **WORKING** via templates
- ✅ **Preview display** - Grid image shows correctly in placeholder - **WORKING**
- ✅ **Brand Pillars** - Already integrated as last optional step (Step 7 of 8) - **WORKING**
- ✅ Single post created at position 1 via `/api/feed/create-free-example`
- ✅ `FeedSinglePlaceholder` displays preview grid image
- ✅ Polling works for generation status
- ✅ Individual images can still be generated (if user has credits) - **PRESERVE**

**What Needs to be Added (DON'T REPLACE):**
- ➕ **Credit-based upsell modal** - After 2 credits used, show "Buy Credits" OR "Unlock Full Blueprint"
- ➕ **Template expansion** - More templates for credit buyers (optional enhancement)

**Implementation Strategy:**
- ✅ **PRESERVE** existing preview generation (already working correctly)
- ✅ **PRESERVE** individual image generation (if user wants to use it)
- ✅ **ADD** credit-based upsell modal (replace generic button)

**See:** 
- `docs/FREE_MODE_CURRENT_IMPLEMENTATION.md` - Detailed current state analysis
- `docs/USER_JOURNEY_ANALYSIS.md` - Complete user journey comparison

---

## TASK 1: REUSABILITY AUDIT

### Database Tables

| Table | Current State | Reusability | Changes Needed |
|-------|--------------|-------------|----------------|
| `feed_layouts` | Main feed container | ✅ **REUSE** | Add `feed_type` field ('preview' \| 'individual') OR use `layout_type` |
| `feed_posts` | Individual posts (1-9 positions) | ✅ **MODIFY** | Extend `position` from 1-9 to 1-12, add `preview_image_url` for free mode |
| `user_personal_brand` | Brand profile data | ✅ **REUSE** | No changes needed |
| `blueprint_subscribers` | Legacy wizard data | ⚠️ **DEPRECATE** | Migrate `form_data` to `user_personal_brand`, keep only `paid_blueprint_purchased` flag |
| `subscriptions` | Subscription tracking | ✅ **REUSE** | No changes needed |
| `user_credits` | Credit balance | ✅ **REUSE** | No changes needed (2 credits per generation already correct) |
| `instagram_bios` | Generated bios | ✅ **REUSE** | No changes needed |
| `instagram_highlights` | Highlight covers | ✅ **REUSE** | No changes needed |
| `feed_strategy` | Strategy documents | ✅ **REUSE** | No changes needed |

**Database Changes Summary:**
1. **`feed_posts.position`**: Currently supports 1-9, needs to support 1-12
2. **`feed_posts.preview_image_url`**: NEW field to store free mode grid preview (single 9:16 image)
3. **`feed_layouts.layout_type`**: Currently 'grid_3x3', add 'grid_3x4' OR use existing field with new value
4. **`feed_layouts.feed_type`**: NEW optional field ('preview' \| 'individual') OR use `status` field

---

### API Endpoints

| Endpoint | Current State | Reusability | Changes Needed |
|----------|--------------|-------------|----------------|
| `/api/feed/create-free-example` | Creates 1 post (position 1) | ✅ **PRESERVE** | **DO NOT MODIFY** - Keep creating 1 post. Preview is separate feature |
| `/api/feed/expand-for-paid` | Expands 1→9 posts | ⚠️ **MODIFY** | Change to expand 1→12 posts (positions 2-12) |
| `/api/feed/[feedId]/generate-single` | Generates 1 individual image | ✅ **PRESERVE** | **DO NOT MODIFY** - Works for free users. Keep individual generation working |
| `/api/feed/[feedId]/progress` | Polls Replicate status | ✅ **REUSE** | No changes needed |
| `/api/feed-planner/access` | Returns access control | ✅ **REUSE** | No changes needed |
| `/api/maya/generate-feed-prompt` | ✅ **EXISTS** | ✅ **REUSE** | Already generates Maya prompts, use for paid mode |

**New Endpoints Needed:**
1. **`/api/feed-planner/welcome-status`**: NEW endpoint for welcome wizard status
   - Tracks if welcome wizard has been shown
   - Returns welcome status for paid users

**Endpoints Already Working (No Changes Needed):**
1. **Preview Generation**: ✅ Already working via templates + Nano Banana Pro
   - Templates generate 3x4 grid prompt (12 posts in 1 image)
   - Nano Banana Pro creates one image with all scenes
   - Costs 2 credits
   - Stores in `feed_posts[0].image_url` (or similar)

**Endpoints to PRESERVE (Do Not Modify):**
1. **`/api/feed/[feedId]/generate-single`**: ✅ Keep working for free users
   - Free users can still generate individual images (2 credits)
   - Individual images stored in `feed_posts[0].image_url`
   - Must continue to work alongside preview generation

**API Changes Summary:**
- ✅ Maya integration already exists (`/api/maya/generate-feed-prompt`)
- ✅ Individual generation endpoint works (`/api/feed/[feedId]/generate-single`)
- ⚠️ Need new preview generation endpoint for free mode
- ⚠️ Need to integrate Maya into paid mode generation flow

---

### Frontend Components

| Component | Current State | Reusability | Changes Needed |
|-----------|--------------|-------------|----------------|
| `FeedPlannerClient` | Wizard + feed view wrapper | ✅ **REUSE** | No changes needed |
| `FeedViewScreen` | Main feed container | ✅ **REUSE** | No changes needed |
| `InstagramFeedView` | Tab navigation | ✅ **REUSE** | No changes needed |
| `FeedGrid` | 3x3 grid display | ⚠️ **MODIFY** | Change from `grid-cols-3` to support 3x4 (12 posts) |
| `FeedSinglePlaceholder` | Single 9:16 placeholder | ⚠️ **MODIFY** | **ADD** preview grid display (if exists), **KEEP** individual image display |
| `FeedPostCard` | Individual post card | ✅ **REUSE** | Works for 12 posts, no changes needed |
| `useFeedPolling` | Polling hook | ✅ **PRESERVE** | **DO NOT MODIFY** - Keep single post polling working |

**Frontend Changes Summary:**
1. **`FeedGrid`**: Change from `grid-cols-3` (9 posts) to `grid-cols-4` (12 posts) for paid mode
2. **`FeedSinglePlaceholder`**: **ADD** preview grid display (if `feed_layouts.preview_image_url` exists), **KEEP** individual image display (if `feed_posts[0].image_url` exists)
3. **Priority Logic**: Show preview if exists, otherwise show individual image, otherwise show placeholder
4. **New Component**: `FeedPreviewGrid` - Optional component to display preview grid (can be integrated into `FeedSinglePlaceholder`)

---

### Maya Integration

| Feature | Status | Location | Reusability |
|---------|--------|----------|-------------|
| Maya prompt generation | ✅ **EXISTS** | `/api/maya/generate-feed-prompt` | ✅ **REUSE** |
| User context retrieval | ✅ **EXISTS** | `lib/maya/get-user-context.ts` | ✅ **REUSE** |
| Brand profile integration | ✅ **EXISTS** | `user_personal_brand` table | ✅ **REUSE** |
| Template guidelines | ⚠️ **NEEDS CHANGE** | `lib/maya/blueprint-photoshoot-templates.ts` | ⚠️ **MODIFY** |

**Maya Integration Summary:**
- ✅ Maya endpoint already exists and generates prompts dynamically
- ✅ User context system already in place
- ⚠️ Current templates are static prompts, need to become Maya guidelines
- ✅ Can pass templates to Maya as context (not direct prompts)

---

## TASK 2: GAP ANALYSIS TABLE

| Feature | Desired | Current | Gap | Action Required | Priority |
|---------|---------|---------|-----|----------------|----------|
| **FREE MODE - ONBOARDING** |
| Brand Pillars in onboarding | Last optional step of wizard | ✅ **WORKING** | NONE | Already integrated (Step 7 of 8) | ✅ NONE |
| **FREE MODE - PREVIEW GENERATION** |
| Free grid format | **3x4 grid (12 posts in 1 image)** | ✅ **WORKING** | NONE | Templates generate 3x4 grid correctly | ✅ NONE |
| Free generation | Nano Banana **3x4 grid preview** (2 credits) | ✅ **WORKING** | NONE | Templates create grid as one image | ✅ NONE |
| Free preview storage | One 9:16 mockup image | ✅ **WORKING** | NONE | Grid image stored correctly | ✅ NONE |
| Free preview display | Show 3x4 grid in placeholder | ✅ **WORKING** | NONE | Grid image displays correctly | ✅ NONE |
| **FREE MODE - UPSELL** |
| Credit tracking | Track when 2 credits used | No tracking | MINOR | Add credit usage tracking | 🟡 MEDIUM |
| Upsell modal | "Buy Credits" OR "Unlock Full Blueprint" | Generic button (always visible) | MAJOR | Create credit-based upsell modal | 🔴 HIGH |
| Template expansion | Buy credits → More preview templates | No template expansion | MINOR | Create template expansion system | 🟢 LOW |
| **FREE MODE - PRESERVE** |
| Individual image gen | N/A (preview only) | ✅ Working (1 image, 2 credits) | N/A | **MUST PRESERVE** - Don't break existing flow | 🔴 CRITICAL |
| Single post creation | N/A | ✅ Working (1 post at position 1) | N/A | **MUST PRESERVE** - Keep post creation | 🔴 CRITICAL |
| Image display | Preview grid | ✅ Working (individual image in placeholder) | N/A | **MUST PRESERVE** - Keep individual image display | 🔴 CRITICAL |
| **PAID MODE - ONBOARDING** |
| Welcome wizard | Tutorial after purchase | Missing | MAJOR | Create welcome wizard component | 🔴 HIGH |
| **PAID MODE - GRID & GENERATION** |
| Paid grid format | **3x4 grid (12 individual)** | 3x3 (9 individual) | MINOR | Extend posts to 12 | 🟡 MEDIUM |
| Paid generation | Individual images (12) | Individual images (9) | MINOR | Extend to 12 positions | 🟡 MEDIUM |
| Paid prompt gen | **Maya generates from preview template** | Static templates | MAJOR | Integrate Maya to use preview as guideline | 🔴 HIGH |
| Paid aspect ratio | 4:5 per image | 4:5 per image | NONE | No change | ✅ NONE |
| Paid credits | 2 per image | 2 per image | NONE | No change | ✅ NONE |
| **PAID MODE - FEATURES** |
| Bio generation | AI-generated bio | ✅ Working | NONE | No change | ✅ NONE |
| Highlights generation | AI-generated highlights | ✅ Working | NONE | No change | ✅ NONE |
| Captions generation | Maya generates per post | ✅ Working | NONE | No change | ✅ NONE |
| Strategy generation | Complete strategy document | ✅ Working | NONE | No change | ✅ NONE |
| **PAID MODE - FEED MANAGEMENT** |
| Feed history | Previous feeds in "My Feed" | Feed list exists | MINOR | Add organization UI (color code, rename) | 🟡 MEDIUM |
| Free preview in history | Free preview saved in history | No preview storage | MINOR | Save preview feeds to history | 🟡 MEDIUM |
| Create new feed | Button to create new feed | ✅ Working | NONE | No change | ✅ NONE |
| Feed limit | 3 feeds max | 3 feeds max | NONE | No change | ✅ NONE |
| **PAID MODE - UPSELL** |
| Studio upsell | After 12 images complete | ✅ Working | NONE | No change | ✅ NONE |
| **ONBOARDING** |
| Unified wizard | Required | ✅ Exists | NONE | No change | ✅ NONE |
| Brand Pillars step | Last step of onboarding | Exists but not integrated | MINOR | Integrate as last step | 🟡 MEDIUM |
| **TEMPLATE SYSTEM** |
| Template usage | Maya guidelines (from preview) | Static prompts | MAJOR | Convert templates to Maya guidelines | 🔴 HIGH |
| Template storage | Pass preview template to Maya | Direct prompt use | MAJOR | Refactor to use preview as guideline | 🔴 HIGH |
| Template expansion | More templates for credit buyers | No expansion system | MINOR | Create template expansion | 🟢 LOW |

---

## TASK 3: MIGRATION STRATEGY

### 1. Database Changes

**Question:** Do we need a `feed_preview_image` field to store free mode grid?

**Answer:** ✅ YES, but store in `feed_posts[0].preview_image_url` OR add `feed_layouts.preview_image_url`
- **Option A:** Store in first post (`feed_posts[0].preview_image_url`)
- **Option B:** Store in feed layout (`feed_layouts.preview_image_url`)
- **Recommendation:** Option B (feed layout) - cleaner separation

**Question:** Do we need a `feed_type` field ('preview' \| 'individual')?

**Answer:** ⚠️ MAYBE - Can use existing `feed_layouts.status` or `layout_type`
- **Option A:** Add new `feed_type` field
- **Option B:** Use `feed_layouts.status = 'preview'` for free mode
- **Option C:** Use `feed_layouts.layout_type = 'preview_grid'` vs `'grid_3x4'`
- **Recommendation:** Option C - extend `layout_type` field

**Question:** How do we extend `feed_posts` from 9 to 12 positions?

**Answer:** ✅ SIMPLE - `position` field already supports any integer
- No schema change needed
- Update validation to allow 1-12
- Update frontend to display 12 posts

---

### 2. Generation Flow

**Question:** Can we reuse `/api/feed/[feedId]/generate-single` for both modes?

**Answer:** ⚠️ PARTIALLY
- ✅ Works for paid mode (individual images)
- ❌ Does NOT work for free mode (needs grid preview)
- **Solution:** Create new `/api/feed/[feedId]/generate-preview` for free mode

**Question:** Should free mode have separate endpoint `/api/feed/generate-preview`?

**Answer:** ✅ YES
- New endpoint: `/api/feed/[feedId]/generate-preview`
- Generates ONE 3x4 grid image (12 posts in 1 image)
- Uses Nano Banana Pro with special grid prompt
- Stores in `feed_layouts.preview_image_url`
- Costs 2 credits

**Question:** How does paid mode call Maya for prompt generation?

**Answer:** ✅ INTEGRATE into existing flow
- Current: `/api/feed/[feedId]/generate-single` uses static templates
- New: Call `/api/maya/generate-feed-prompt` before generation
- Pass template as guideline (not direct prompt)
- Use Maya's generated prompt for image generation

---

### 3. Maya Integration

**Question:** Does `/api/maya/generate-feed-prompt` exist?

**Answer:** ✅ YES - Already exists at `/app/api/maya/generate-feed-prompt/route.ts`
- Generates prompts dynamically based on user context
- Supports both Classic (FLUX) and Pro (Nano Banana) modes
- Uses `user_personal_brand` data
- Returns formatted prompts

**Question:** If not, where should we create Maya prompt generation?

**Answer:** ✅ NOT NEEDED - Already exists

**Question:** Can we use existing Maya tools from your earlier Blueprint audit?

**Answer:** ✅ YES
- `getUserContextForMaya()` - Gets user brand profile
- `/api/maya/generate-feed-prompt` - Generates prompts
- `user_personal_brand` table - Brand data source

---

### 4. Template System

**Question:** Current `blueprint_photoshoot_templates.ts` has 18 static templates. How do these become Maya guidelines instead of direct prompts?

**Answer:** ⚠️ REFACTOR TEMPLATE USAGE
- **Current:** Templates are direct prompts passed to Nano Banana
- **New:** Templates become guidelines passed to Maya
- **Flow:**
  1. Load template from `blueprint_photoshoot_templates.ts`
  2. Pass template to Maya as context: "Use this template as a guideline..."
  3. Maya generates unique prompt maintaining aesthetic consistency
  4. Use Maya's prompt for image generation

**Question:** Do we pass templates to Maya as context?

**Answer:** ✅ YES
- Pass template as part of Maya's system prompt
- Example: "Based on this template guideline: [template], generate a unique prompt for position [X]..."
- Maya maintains aesthetic while creating variation

---

### 5. Access Control

**Question:** Does current `placeholderType: "single" \| "grid"` distinction work?

**Answer:** ✅ YES, but needs extension
- `placeholderType: "single"` = Free mode (preview grid)
- `placeholderType: "grid"` = Paid mode (3x4 individual)
- **No changes needed** - distinction already works

**Question:** Do we need additional flags like `generationType: "preview" \| "individual"`?

**Answer:** ⚠️ MAYBE - Can infer from access level
- Free users → preview generation
- Paid users → individual generation
- **Recommendation:** No new flag needed, use `access.isFree` to determine

---

### 6. Component Reuse

**Question:** Can `FeedSinglePlaceholder` display the free preview grid image?

**Answer:** ✅ YES, with modification
- Current: Shows single 9:16 placeholder
- New: Show preview grid image if exists (`feed_layouts.preview_image_url`)
- Fallback to placeholder if no preview

**Question:** Can `FeedGrid` extend from 3x3 to 3x4?

**Answer:** ✅ YES, simple CSS change
- Current: `grid-cols-3` (9 posts)
- New: `grid-cols-4` (12 posts)
- Update mapping logic to handle 12 positions

**Question:** What new components are absolutely required?

**Answer:** ⚠️ MINIMAL
- **New:** `FeedPreviewGrid` component (optional - can use `FeedSinglePlaceholder`)
- **Modify:** `FeedGrid` for 3x4 layout
- **Modify:** `FeedSinglePlaceholder` to show preview image

---

## TASK 4: IMPLEMENTATION ROADMAP

### Phase 1: Database & Access Control ✅ LOW RISK

**Goal:** Extend database to support 12 posts and preview images

**Tasks:**
- [ ] Add `preview_image_url` field to `feed_layouts` table
- [ ] Update `feed_posts.position` validation to allow 1-12 (no schema change needed)
- [ ] Update `feed_layouts.layout_type` to support 'grid_3x4'
- [ ] Create migration script: `scripts/migrations/add-preview-image-to-feeds.sql`
- [ ] Run migration automatically
- [ ] Verify migration success

**Files to Modify:**
- `scripts/migrations/add-preview-image-to-feeds.sql` (NEW)
- `scripts/migrations/run-preview-image-migration.ts` (NEW)
- `scripts/migrations/verify-preview-image-migration.ts` (NEW)

**Estimated Time:** 2-3 hours

---

### Phase 2: Credit-Based Upsell Modal 🔴 HIGH PRIORITY

**Goal:** Add credit-based upsell modal after 2 credits used (Free Mode)

**Tasks:**
- [ ] Create credit tracking system (detect when 2 credits used)
- [ ] Create upsell modal component with two options:
  - "Buy Credits" (top-up) → Link to credit purchase
  - "Unlock Full Blueprint ($47)" → Link to paid blueprint checkout
- [ ] Replace generic "Unlock Full Feed Planner" button with modal
- [ ] Show modal only after 2 credits are used
- [ ] **PRESERVE** existing preview generation (already working)

**Files to Modify:**
- `components/feed-planner/feed-single-placeholder.tsx` (MODIFY - replace generic button with modal)

**Files to Create:**
- `components/feed-planner/free-mode-upsell-modal.tsx` (NEW - credit-based upsell)

**Files to PRESERVE (Do Not Modify):**
- Preview generation system (already working correctly)
- Individual image generation (keep working)

**Estimated Time:** 3-4 hours

---

### Phase 3: Maya Integration for Paid 🔴 HIGH PRIORITY

**Goal:** Use Maya to generate prompts from preview template for paid mode individual images

**Tasks:**
- [ ] Audit existing `/api/maya/generate-feed-prompt` endpoint
- [ ] Modify `/api/feed/[feedId]/generate-single` to call Maya for paid users
- [ ] Pass **preview template as guideline** to Maya (not direct prompt)
- [ ] Maya generates unique prompt for each position maintaining preview style
- [ ] Test Maya prompt generation for all 12 positions
- [ ] Ensure aesthetic consistency across prompts (color grade, format, layout)

**Key Flow:**
1. User has preview grid with template style stored
2. Click placeholder at position X
3. Load preview template from `feed_layouts.preview_image_url` or template used
4. Pass template to Maya as guideline: "Based on this preview template, generate unique prompt for position X..."
5. Maya generates unique prompt maintaining style
6. Generate single image with Maya's prompt

**Files to Modify:**
- `app/api/feed/[feedId]/generate-single/route.ts` (MODIFY - add Maya integration for paid mode)
- `lib/maya/blueprint-photoshoot-templates.ts` (MODIFY - convert to guidelines)

**Files to Create:**
- `lib/feed-planner/maya-template-guideline-builder.ts` (NEW - converts preview template to Maya guidelines)

**Estimated Time:** 6-8 hours

---

### Phase 4: Paid Grid Extension 🟡 MEDIUM PRIORITY

**Goal:** Extend paid mode from 9 to 12 posts

**Tasks:**
- [ ] Update `FeedGrid` component from 3x3 to 3x4
- [ ] Update `/api/feed/expand-for-paid` to create positions 2-12 (instead of 2-9)
- [ ] Update feed creation logic to support 12 posts
- [ ] Test 12-image workflow end-to-end
- [ ] Update UI to handle 12 posts gracefully

**Files to Modify:**
- `components/feed-planner/feed-grid.tsx` (MODIFY)
- `app/api/feed/expand-for-paid/route.ts` (MODIFY)
- `components/feed-planner/instagram-feed-view.tsx` (MODIFY - if needed)

**Estimated Time:** 3-4 hours

---

### Phase 5: Welcome Wizard 🔴 HIGH PRIORITY

**Goal:** Build welcome wizard for paid users (Brand Pillars already working)

**Tasks:**
- [ ] Create welcome wizard component (same style as onboarding)
- [ ] Add tutorial steps (feed planner overview, generation workflow, features)
- [ ] Store `feed_planner_welcome_shown` flag in database
- [ ] Show wizard only for first-time paid users after purchase
- [ ] Add skip functionality

**Files to Create:**
- `components/feed-planner/welcome-wizard.tsx` (NEW)
- `app/api/feed-planner/welcome-status/route.ts` (NEW)

**Files to Modify:**
- `app/feed-planner/feed-planner-client.tsx` (MODIFY - add welcome wizard check)

**Note:** Brand Pillars already integrated as last optional step (Step 7 of 8) - no changes needed

**Estimated Time:** 6-8 hours

---

### Phase 6: Template System Refactor 🟡 MEDIUM PRIORITY

**Goal:** Convert static templates to Maya guidelines

**Tasks:**
- [ ] Refactor `blueprint_photoshoot_templates.ts` to return guidelines (not prompts)
- [ ] Create guideline builder that formats templates for Maya
- [ ] Update template usage in generation flow
- [ ] Test template-to-Maya integration

**Files to Modify:**
- `lib/maya/blueprint-photoshoot-templates.ts` (MODIFY)
- `lib/feed-planner/maya-template-guideline-builder.ts` (MODIFY)

**Estimated Time:** 3-4 hours

---

## TASK 5: CLEANUP PLAN

### Legacy Tables

**`blueprint_subscribers.form_data`**
- **Status:** ⚠️ DEPRECATE
- **Action:** Migrate to `user_personal_brand` table
- **Timeline:** Phase 1 (low priority)
- **Files:** `app/api/feed/create-free-example/route.ts` (line 121-152)

---

### Duplicate Logic

**Template Selection**
- **Issue:** Checks `blueprint_subscribers.form_data` AND `user_personal_brand`
- **Action:** Consolidate to only use `user_personal_brand`
- **Files:** `app/api/feed/create-free-example/route.ts`

**Access Control Logic**
- **Status:** ✅ Already centralized in `lib/feed-planner/access-control.ts`
- **Action:** No changes needed

---

### Unused Endpoints

**`/api/feed-planner/create-strategy`**
- **Status:** ⚠️ DEPRECATED (per audit)
- **Action:** Remove or mark as deprecated
- **Files:** `app/api/feed-planner/create-strategy/route.ts`

---

### Confusing Logic

**Wizard Conditions in `FeedPlannerClient`**
- **Issue:** Complex conditional logic for wizard visibility
- **Action:** Simplify or add feature flag
- **Files:** `app/feed-planner/feed-planner-client.tsx` (lines 79-139)

**Feed Expansion Timing**
- **Issue:** Client-side expansion in `FeedViewScreen`
- **Action:** Move to server-side (webhook or API check)
- **Files:** `components/feed-planner/feed-view-screen.tsx` (lines 103-154)

---

## DELIVERABLES SUMMARY

### 1. Reusability Matrix ✅

**Database:** 7 REUSE, 2 MODIFY, 1 DEPRECATE  
**API Endpoints:** 5 REUSE, 2 MODIFY, 1 NEW  
**Frontend:** 4 REUSE, 3 MODIFY, 0 NEW  
**Maya:** 3 REUSE, 1 MODIFY

---

### 2. Gap Analysis Table ✅

**Total Gaps:** 15 features  
- **MAJOR:** 6 gaps (free preview, Maya integration, welcome wizard)
- **MINOR:** 6 gaps (grid extension, UI updates)
- **NONE:** 3 gaps (credits, aspect ratios)

---

### 3. Migration Strategy ✅

**Database:** Minimal changes (add preview_image_url, extend position validation)  
**Generation Flow:** New preview endpoint + Maya integration  
**Maya:** ✅ Already exists, needs integration  
**Templates:** Convert to guidelines  
**Access Control:** ✅ Works as-is  
**Components:** Minor modifications

---

### 4. Implementation Roadmap ✅

**6 Phases:**
1. Database & Access Control (2-3 hours)
2. Free Preview Generation (4-6 hours)
3. Maya Integration (4-6 hours)
4. Paid Grid Extension (3-4 hours)
5. Welcome Wizard (6-8 hours)
6. Template Refactor (3-4 hours)

**Total Estimated Time:** 20-30 hours (reduced since preview generation, Brand Pillars, and preview display already working)

---

### Phase 7: Feed History & Organization 🟡 MEDIUM PRIORITY

**Goal:** Add feed organization features and save free preview in history

**Tasks:**
- [ ] Add feed organization UI (color coding, renaming)
- [ ] Save free preview feeds to feed history
- [ ] Display preview feeds in "My Feed" with same UI as free mode
- [ ] Add "Create New Preview Feed" button for paid users

**Files to Modify:**
- `components/feed-planner/feed-header.tsx` (MODIFY - add organization features)
- `app/api/feed/create-free-example/route.ts` (MODIFY - save preview to history)
- `app/api/feed/list/route.ts` (MODIFY - include preview feeds)

**Estimated Time:** 4-6 hours

---

### Phase 8: Template Expansion 🟢 LOW PRIORITY

**Goal:** Allow credit buyers to generate more preview feeds with expanded templates

**Tasks:**
- [ ] Create template expansion system
- [ ] Map credit purchases to template unlocks
- [ ] Update preview generation to use expanded templates

**Files to Create:**
- `lib/feed-planner/template-expansion.ts` (NEW)

**Files to Modify:**
- `app/api/feed/[feedId]/generate-preview/route.ts` (MODIFY - use expanded templates)

**Estimated Time:** 3-4 hours

---

### 5. Cleanup Checklist ✅

- [ ] Migrate `blueprint_subscribers.form_data` to `user_personal_brand`
- [ ] Consolidate template selection logic
- [ ] Remove deprecated `/api/feed-planner/create-strategy`
- [ ] Simplify wizard conditions
- [ ] Move feed expansion to server-side

---

### 6. File Change List

**Files to CREATE (6):**
1. `lib/feed-planner/maya-template-guideline-builder.ts` - Maya guideline builder (use preview template as guideline)
2. `components/feed-planner/welcome-wizard.tsx` - Welcome wizard
3. `app/api/feed-planner/welcome-status/route.ts` - Welcome status API
4. `components/feed-planner/free-mode-upsell-modal.tsx` - Credit-based upsell modal
5. `lib/feed-planner/template-expansion.ts` - Template expansion system (for credit buyers)
6. `scripts/migrations/add-feed-organization-fields.sql` - Database migration (if needed for feed organization)

**Files to MODIFY (7):**
1. `app/api/feed/expand-for-paid/route.ts` (extend to 12 posts - positions 2-12)
2. `components/feed-planner/feed-grid.tsx` (extend from 3x3 to 3x4)
3. `components/feed-planner/feed-single-placeholder.tsx` (add credit-based upsell modal - replace generic button)
4. `app/feed-planner/feed-planner-client.tsx` (add welcome wizard check)
5. `lib/maya/blueprint-photoshoot-templates.ts` (convert to guidelines for Maya)
6. `app/api/feed/[feedId]/generate-single/route.ts` (add Maya integration for paid mode - use preview template as guideline)
7. `components/feed-planner/feed-header.tsx` (add feed organization features - color coding, renaming)

**Files to PRESERVE (Do Not Modify):**
1. `app/api/feed/create-free-example/route.ts` - ✅ Keep creating 1 post
2. `components/feed-planner/hooks/use-feed-polling.ts` - ✅ Keep single post polling

---

### 7. New File List

**Only files that MUST be created (not modifications):**

1. **`app/api/feed/[feedId]/generate-preview/route.ts`** - Free mode preview generation
2. **`lib/feed-planner/grid-preview-prompt-builder.ts`** - Builds 3x4 grid prompt
3. **`lib/feed-planner/maya-template-guideline-builder.ts`** - Converts templates to Maya guidelines
4. **`components/feed-planner/welcome-wizard.tsx`** - Welcome wizard component
5. **`app/api/feed-planner/welcome-status/route.ts`** - Welcome wizard status API
6. **`scripts/migrations/add-preview-image-to-feeds.sql`** - Database migration
7. **`scripts/migrations/run-preview-image-migration.ts`** - Migration runner
8. **`scripts/migrations/verify-preview-image-migration.ts`** - Migration verifier

**Total New Files:** 8

---

## CRITICAL CONSTRAINTS MET ✅

1. ✅ **NO DUPLICATES:** Reused existing components wherever possible
2. ✅ **CLEAN LOGIC:** Identified consolidation opportunities
3. ✅ **MAYA FIRST:** Verified Maya integration exists before building new
4. ✅ **DATABASE MINIMAL:** Only 1 new field (`preview_image_url`)
5. ✅ **GRADUAL MIGRATION:** Phased approach doesn't break existing users
6. ✅ **PRESERVE FREE MODE:** Individual image generation continues to work
7. ✅ **ADDITIVE CHANGES:** Preview generation is ADDED, not replacing existing functionality

---

## ⚠️ CRITICAL: FREE MODE PRESERVATION

### What Must NOT Break

**Current Free Mode (WORKING - DO NOT BREAK):**
- ✅ **3x4 grid preview generation** (12 posts in 1 image, 2 credits) - **WORKING** via templates
- ✅ **Preview display** - Grid image shows correctly in placeholder - **WORKING**
- ✅ **Brand Pillars** - Already integrated as last optional step (Step 7 of 8) - **WORKING**
- ✅ Individual images can still be generated (if user has credits) - **PRESERVE**
- ✅ Single post created at position 1
- ✅ Polling works for generation status

**What Needs to be Added:**
- ➕ **Credit-based upsell modal** - After 2 credits used, show "Buy Credits" OR "Unlock Full Blueprint"
- ➕ **Template expansion** - More templates for credit buyers (optional)

**Implementation Rule:**
- ✅ **PRESERVE** existing preview generation (already working correctly)
- ✅ **PRESERVE** individual image generation (keep working)
- ✅ **ADD** credit-based upsell modal (replace generic button)

**See:** `docs/FREE_MODE_CURRENT_IMPLEMENTATION.md` for detailed analysis

---

## NEXT STEPS

1. **Review this document** with Sandra
2. **Approve implementation roadmap** (phases 1-6)
3. **Start with Phase 1** (Database & Access Control) - lowest risk
4. **Test each phase** before moving to next
5. **Document changes** in CHANGELOG.md after each phase

---

---

## SUMMARY: WHAT'S WORKING vs WHAT NEEDS TO BE DONE

### ✅ WHAT'S ALREADY WORKING (DO NOT BREAK)

**Free Mode:**
- ✅ Sign up with 2 bonus credits
- ✅ Unified onboarding wizard
- ✅ **Brand Pillars generation** (last optional step - Step 7 of 8)
- ✅ **3x4 grid preview generation** (12 posts in 1 image, 2 credits) - Templates create grid as one image
- ✅ **Preview display** - Grid image shows correctly in placeholder
- ✅ Single post creation (position 1)
- ✅ Individual image generation (2 credits) - Still works alongside preview
- ✅ Image display in placeholder
- ✅ Caption Templates tab
- ✅ Pillars tab (displays generated pillars)
- ✅ Polling for generation status

**Paid Mode:**
- ✅ Purchase flow ($47, 60 credits)
- ✅ 3x3 grid display (9 posts) - **Needs extension to 3x4 (12 posts)**
- ✅ Individual image generation (2 credits per image)
- ✅ Bio generation
- ✅ Highlights generation
- ✅ Caption generation (per post)
- ✅ Strategy document generation
- ✅ Feed list/selector
- ✅ Studio membership upsell

**Maya Integration:**
- ✅ `/api/maya/generate-feed-prompt` endpoint exists
- ✅ `/api/maya/content-pillars` endpoint exists
- ✅ User context system works
- ✅ Brand profile integration works

---

### ❌ WHAT NEEDS TO BE BUILT (NEW FEATURES)

**Free Mode:**
1. ❌ **Credit-Based Upsell Modal** - "Buy Credits" OR "Unlock Full Blueprint" after 2 credits used
2. ❌ **Template Expansion** - More templates for credit buyers (optional enhancement)

**Paid Mode:**
1. ❌ **Welcome Wizard** - Tutorial after purchase
2. ❌ **3x4 Grid Extension** - Extend from 9 to 12 posts
3. ❌ **Maya Prompt from Preview** - Generate unique prompts using preview template as guideline
4. ❌ **Feed History Organization** - Color coding, renaming, organization UI
5. ❌ **Free Preview in History** - Save preview feeds to history

---

### ⚠️ WHAT NEEDS TO BE MODIFIED (EXISTING FEATURES)

**Free Mode:**
1. ⚠️ **FeedSinglePlaceholder** - Replace generic upsell button with credit-based modal

**Paid Mode:**
1. ⚠️ **FeedGrid** - Extend from 3x3 to 3x4 (12 posts)
2. ⚠️ **Generate Single Endpoint** - Add Maya integration (use preview template as guideline for unique prompts)
3. ⚠️ **Expand for Paid** - Extend from 9 to 12 posts (positions 2-12)
4. ⚠️ **Feed Header** - Add organization features (color coding, renaming)

**Templates:**
1. ⚠️ **Blueprint Templates** - Convert to Maya guidelines (not direct prompts)

---

## CRITICAL IMPLEMENTATION NOTES

### Grid Size - CONFIRMED ✅
- **Free Preview:** ✅ **3x4 grid (12 posts in 1 image)** - Currently working correctly
- **Paid Mode:** ✅ **3x4 grid (12 individual images)** - Need to extend from 9 to 12 posts
- **Status:** Free mode working, paid mode needs extension

### Credit Cost - CONFIRMED ✅
- **Free Preview:** ✅ **2 credits** for 3x4 grid preview - Currently working correctly
- **Paid Individual:** ✅ **2 credits** per individual image - Currently working correctly
- **Status:** Both working correctly

### Preview Template Flow - KEY IMPLEMENTATION
- **Key Insight:** Paid mode should use the **preview template** (that generated the 3x4 grid) as a guideline for Maya
- **Flow:** 
  1. User has preview grid (3x4, 12 posts in 1 image) generated from template
  2. User clicks placeholder at position X in paid mode
  3. System loads the template that was used for preview
  4. Pass template to Maya as guideline: "Based on this preview template style, generate unique prompt for position X..."
  5. Maya generates unique prompt maintaining color grade, format, layout from preview
  6. Generate single image with Maya's prompt
- **This ensures:** Consistency between preview and paid images while maintaining uniqueness per position

---

## NEXT STEPS

1. **Review this document** with Sandra
2. **Clarify grid size and credit cost** if needed
3. **Approve implementation roadmap** (phases 1-8)
4. **Start with Phase 1** (Database) - lowest risk
5. **Test each phase** before moving to next
6. **Document changes** in CHANGELOG.md after each phase

---

**End of Gap Analysis**
