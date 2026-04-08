# USER JOURNEY ANALYSIS - DESIRED vs CURRENT

**Date:** January 2025  
**Purpose:** Complete analysis of desired user journey vs current implementation  
**Status:** ✅ Complete Analysis

---

## DESIRED USER JOURNEY (Step-by-Step)

### FREE MODE JOURNEY

| Step | User Action | System Response | Current Status | Gap |
|------|-------------|-----------------|----------------|-----|
| 1 | Sign up (Email, Name, Password) | Access to app + 2 bonus credits | ✅ **WORKING** | None |
| 2 | Complete unified onboarding wizard | Brand, Style, Vibe saved to `user_personal_brand` | ✅ **WORKING** | None |
| 3 | Upload 1-3 selfies | Reference images saved to `user_avatar_images` | ✅ **WORKING** | None |
| 4 | **Generate Brand Pillars (last step)** | Maya generates pillars + example posts | ✅ **WORKING** | Already integrated as last optional step |
| 5 | Routed to Free Feed Planner | See empty 9:16 placeholder | ✅ **WORKING** | None |
| 6 | Click "Generate" on placeholder | **3x4 grid preview (12 posts in 1 image, 2 credits)** | ✅ **WORKING** | Templates create grid as one image |
| 7 | View preview feed | See 3x4 grid image in placeholder | ✅ **WORKING** | Grid image displays correctly |
| 8 | Access tabs | Caption Templates, Pillars tabs | ✅ **WORKING** | None |
| 9 | Use 2 credits | After 2 credits used | ⚠️ **PARTIAL** | Need credit tracking |
| 10 | Upsell popup | "Buy Credits" OR "Unlock Full Blueprint ($47)" | ❌ **NOT WORKING** | Generic upsell button exists |
| 11 | Buy credits (if chosen) | Generate more preview feeds with new templates | ❌ **NOT WORKING** | Need template expansion |

---

### PAID MODE JOURNEY

| Step | User Action | System Response | Current Status | Gap |
|------|-------------|-----------------|----------------|-----|
| 1 | Purchase $47 | 60 credits added + subscription created | ✅ **WORKING** | None |
| 2 | **Welcome Wizard** | Tutorial explaining full functionality | ❌ **NOT WORKING** | Missing welcome wizard |
| 3 | See Full Feed Planner | **3x4 grid (12 individual placeholders)** | ❌ **NOT WORKING** | Currently 3x3 (9 posts) |
| 4 | Click placeholder | **Maya generates unique prompt** from preview template | ❌ **NOT WORKING** | Uses static templates |
| 5 | Generate single image | One high-res image per click | ✅ **WORKING** | None |
| 6 | Generate Bio/Highlights | AI-generated bio and highlights | ✅ **WORKING** | None |
| 7 | Generate Captions | Maya generates captions per post | ✅ **WORKING** | None |
| 8 | Generate Strategy | Complete Instagram strategy document | ✅ **WORKING** | None |
| 9 | Complete 12 images | Feed completed | ⚠️ **PARTIAL** | Need 12 posts support |
| 10 | Save previous feeds | Previous feeds in "My Feed" history | ⚠️ **PARTIAL** | Need feed history UI |
| 11 | Free preview in history | Free preview saved in "My Feed" | ❌ **NOT WORKING** | Need preview storage |
| 12 | Create new feed | Button to create new feed | ✅ **WORKING** | None |
| 13 | After 12 images | Upsell to Studio Membership | ✅ **WORKING** | None |

---

## DETAILED GAP ANALYSIS

### FREE MODE GAPS

#### Gap 1: Brand Pillars in Onboarding
**Desired:** Generate Brand Pillars as last step of onboarding wizard  
**Current:** ✅ **WORKING** - Already integrated as last optional step (Step 7 of 8)  
**Status:** ✅ **WORKING**  
**Action:** None - Already implemented

**Files:**
- ✅ `/api/maya/content-pillars/route.ts` - EXISTS
- ✅ `components/sselfie/content-pillar-builder.tsx` - EXISTS
- ✅ `components/onboarding/unified-onboarding-wizard.tsx` - INTEGRATED (line 146-149, 744-878)

---

#### Gap 2: 3x4 Grid Preview Generation
**Desired:** Generate 3x4 grid preview (12 posts in 1 image) using 2 credits  
**Current:** ✅ **WORKING** - Templates generate 3x4 grid as one image via Nano Banana Pro  
**Status:** ✅ **WORKING**  
**Action:** None - Already implemented correctly

**Key Details:**
- **Current:** 3x4 grid (12 posts) in ONE image, 2 credits
- **How it works:** Templates create prompt that generates one image with all 12 scenes in grid layout
- **Storage:** Grid image stored in `feed_posts[0].image_url` (or similar)

**Files (Already Working):**
- ✅ Template system generates grid prompts
- ✅ Nano Banana Pro creates one image with all scenes
- ✅ Image displays in placeholder

---

#### Gap 3: Preview Display
**Desired:** Display 3x4 grid preview image in 9:16 placeholder  
**Current:** ✅ **WORKING** - Grid image displays correctly  
**Status:** ✅ **WORKING**  
**Action:** None - Already implemented

**Files:**
- ✅ `components/feed-planner/feed-single-placeholder.tsx` - Already displays grid image

---

#### Gap 4: Credit Tracking & Upsell
**Desired:** After 2 credits used → Show upsell modal with "Buy Credits" OR "Unlock Full Blueprint"  
**Current:** Generic "Unlock Full Feed Planner" button always visible  
**Status:** ❌ **NOT WORKING**  
**Action:** Create credit-based upsell modal

**Files to Create:**
- `components/feed-planner/free-mode-upsell-modal.tsx` (NEW)

**Files to Modify:**
- `components/feed-planner/feed-single-placeholder.tsx` - Replace generic button with modal

---

#### Gap 5: Template Expansion for Credits
**Desired:** Buy credits → Generate more preview feeds with new templates  
**Current:** Credit top-up exists but no template expansion  
**Status:** ❌ **NOT WORKING**  
**Action:** Create template expansion system for preview generation

**Files to Create:**
- `lib/feed-planner/template-expansion.ts` (NEW)

---

### PAID MODE GAPS

#### Gap 6: Welcome Wizard
**Desired:** Welcome wizard/tutorial after purchase explaining full functionality  
**Current:** No welcome wizard exists  
**Status:** ❌ **NOT WORKING**  
**Action:** Create welcome wizard component

**Files to Create:**
- `components/feed-planner/welcome-wizard.tsx` (NEW)
- `app/api/feed-planner/welcome-status/route.ts` (NEW)

**Files to Modify:**
- `app/feed-planner/feed-planner-client.tsx` - Add welcome wizard check

---

#### Gap 7: 3x4 Grid (12 Posts)
**Desired:** 3x4 grid with 12 individual placeholders  
**Current:** 3x3 grid with 9 posts  
**Status:** ❌ **NOT WORKING**  
**Action:** Extend grid from 9 to 12 posts

**Files to Modify:**
- `components/feed-planner/feed-grid.tsx` - Change to 3x4
- `app/api/feed/expand-for-paid/route.ts` - Create positions 2-12

---

#### Gap 8: Maya Prompt Generation from Preview
**Desired:** Maya generates unique prompts from preview template for each position  
**Current:** Uses static templates from `blueprint_photoshoot_templates.ts`  
**Status:** ❌ **NOT WORKING**  
**Action:** Integrate Maya to generate prompts based on preview template

**Key Flow:**
1. User has preview grid with template style
2. Click placeholder at position X
3. Maya reads preview template as guideline
4. Maya generates unique prompt for position X maintaining style
5. Generate single image with Maya's prompt

**Files to Modify:**
- `app/api/feed/[feedId]/generate-single/route.ts` - Add Maya integration
- `lib/maya/blueprint-photoshoot-templates.ts` - Convert to guidelines

**Files to Create:**
- `lib/feed-planner/maya-template-guideline-builder.ts` (NEW)

---

#### Gap 9: Feed History & Organization
**Desired:** Previous feeds saved in "My Feed" with color coding and renaming  
**Current:** Feed list exists but no organization features  
**Status:** ⚠️ **PARTIAL**  
**Action:** Add feed organization UI

**Files to Modify:**
- `components/feed-planner/feed-header.tsx` - Add organization features
- `app/api/feed/list/route.ts` - May need updates

---

#### Gap 10: Free Preview in History
**Desired:** Free preview feed saved in "My Feed" history  
**Current:** No preview storage in feed history  
**Status:** ❌ **NOT WORKING**  
**Action:** Save preview feeds to feed history

**Files to Modify:**
- `app/api/feed/create-free-example/route.ts` - Save preview when generated
- `components/feed-planner/feed-header.tsx` - Show preview in history

---

## CLARIFICATIONS CONFIRMED ✅

### Grid Size - CONFIRMED
**Free Mode:** ✅ **3x4 grid preview** (12 posts in 1 image) - Currently working  
**Paid Mode:** ✅ **3x4 grid** (12 individual images) - Need to extend from 9 to 12  
**Status:** Free mode working correctly, paid mode needs extension

### Credit Cost - CONFIRMED
**Free Preview:** ✅ **2 credits** for 3x4 grid preview - Currently working  
**Paid Individual:** ✅ **2 credits** per individual image - Currently working  
**Status:** Both working correctly

---

## IMPLEMENTATION PRIORITY

### 🔴 HIGH PRIORITY (Core Funnel)
1. **Credit-Based Upsell Modal** (Free Mode) - Conversion point (after 2 credits used)
2. **Maya Prompt Generation from Preview** (Paid Mode) - Core differentiation
3. **Welcome Wizard** (Paid Mode) - User onboarding

### 🟡 MEDIUM PRIORITY (Enhancement)
4. **3x4 Grid Extension** (Paid Mode) - Extend from 9 to 12 posts
5. **Feed History Organization** (Paid Mode) - Color coding, renaming
6. **Free Preview in History** (Paid Mode) - Save preview feeds

### 🟢 LOW PRIORITY (Nice to Have)
7. **Template Expansion** (Free Mode) - More templates for credit buyers

---

## FILES TO CREATE (NEW FEATURES)

1. `components/feed-planner/free-mode-upsell-modal.tsx` - Credit-based upsell modal (Buy Credits OR Unlock Full Blueprint)
2. `components/feed-planner/welcome-wizard.tsx` - Welcome wizard for paid users
3. `app/api/feed-planner/welcome-status/route.ts` - Welcome status API
4. `lib/feed-planner/maya-template-guideline-builder.ts` - Maya guideline builder (use preview template as guideline)
5. `lib/feed-planner/template-expansion.ts` - Template expansion system (for credit buyers)

---

## FILES TO MODIFY (EXISTING FEATURES)

1. `components/feed-planner/feed-single-placeholder.tsx` - Add credit-based upsell modal (replace generic button)
2. `components/feed-planner/feed-grid.tsx` - Extend from 3x3 to 3x4 (12 posts)
3. `app/api/feed/expand-for-paid/route.ts` - Extend from 9 to 12 posts (positions 2-12)
4. `app/api/feed/[feedId]/generate-single/route.ts` - Add Maya integration for paid mode (use preview template as guideline)
5. `app/feed-planner/feed-planner-client.tsx` - Add welcome wizard check
6. `lib/maya/blueprint-photoshoot-templates.ts` - Convert to guidelines (for Maya to use)
7. `components/feed-planner/feed-header.tsx` - Add feed organization features (color coding, renaming)

---

## FILES TO PRESERVE (DO NOT MODIFY)

1. `app/api/feed/create-free-example/route.ts` - Keep creating 1 post
2. `app/api/feed/[feedId]/generate-single/route.ts` - Keep individual generation working
3. `components/feed-planner/hooks/use-feed-polling.ts` - Keep polling working

---

**End of User Journey Analysis**
