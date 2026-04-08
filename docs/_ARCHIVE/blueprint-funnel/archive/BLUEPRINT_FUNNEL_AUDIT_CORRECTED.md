# Blueprint Funnel Audit Report - CORRECTED
**Date:** $(date)  
**Auditor:** AI Engineering Team  
**Purpose:** Audit current blueprint funnel implementation with CORRECTED understanding

---

## CORRECTED Understanding

### What Blueprint/Feed Planner Actually Is

**Blueprint = Feed Planner with Different Access Levels**

The entire funnel should be **Feed Planner** with three tiers:
1. **Free Feed Planner** - Questionnaire wizard → ONE example grid (one image placeholder) → Upsell
2. **Paid Feed Planner** - Full Feed Planner access (30 photos, captions, strategy, direct image generation)
3. **One-Time Session** - Feed Planner + All app features (Maya, Gallery, etc.) except Academy
4. **Membership** - Full access to everything including Academy

---

## Key Correction: What Should Happen

### Free Feed Planner (Currently "Blueprint") - CONSOLIDATED APPROACH
```
1. User lands on /feed-planner (Blueprint tab removed)
2. Completes questionnaire wizard (brand questions) - integrated into Feed Planner
3. Uploads selfies (image library, same as Maya chat)
4. Generates ONE example grid (9:16 placeholder, not full 3x3 grid)
5. Shows Feed Planner UI with tabs: Grid - Captions - Strategy
6. Caption templates and posting calendar/strategy (already implemented)
7. All AI generation buttons HIDDEN (access control):
   - Captions generation button (hidden)
   - Bio generation button (hidden)
   - Strategy generation button (hidden)
   - Highlights generation button (hidden)
8. Shows preview of what full Feed Planner looks like
9. Upsell CTA: "Get Full Feed Planner + 30 Photos, Captions & Strategy"
```

### Paid Feed Planner (Currently "Paid Blueprint") - CONSOLIDATED APPROACH
```
1. After checkout, user lands on /feed-planner (same route as free)

FIRST-TIME USERS (if haven't completed free feed planner):
├─ Show wizard for onboarding (skip free example)
├─ Complete questionnaire (brand questions for backend context/aesthetics)
├─ Upload selfies (image library, same as Maya chat)
├─ Can change images when needed or add more
└─ Then proceed to full Feed Planner

RETURNING USERS (already completed free feed planner):
└─ Go directly to full Feed Planner (access control unlocks features)

FULL FEED PLANNER (Same UI as free, just unlocked):
├─ Same UI as free Feed Planner (consolidated)
├─ Access control determines features (free vs paid vs membership)
├─ Access to Gallery (to store generated images)
├─ Direct image generation buttons on each image placeholder
├─ Click button → Backend generates image using templates (Nano Banana Pro)
├─ No Maya chat needed (backend only, no prompts from user)
├─ Users can generate images:
│  ├─ One at a time (click individual placeholder buttons)
│  └─ All at once (generate all 9 images in grid)
├─ Users get 3 feed planners only to generate from
├─ 1 strategy and captions for each of the 30 photos
├─ 30 photos total (3x3 grids with captions and strategy)
├─ All AI-generated in background, returned to postcards
└─ All generation buttons visible (captions, bio, strategy, highlights)
```

### Key Differences from Current Implementation

**WRONG (Current):**
- Blueprint = separate feature from Feed Planner
- Blueprint uses different UI/components
- Paid blueprint embeds FeedViewScreen with mode flags
- Blueprint maps data to feed format

**CORRECT (What Should Be - CONSOLIDATED):**
- Remove Blueprint tab/screen entirely
- Consolidate into Feed Planner with free mode detection
- Same Feed Planner UI for free and paid (unified experience)
- Free mode: One 9:16 placeholder (access control hides features)
- Paid mode: Full 3x3 grid (9 image placeholders, all features)
- No separate routes/components - just access control
- Same logic for image generation (just access control limits)

---

## Current Architecture Issues (REVISED)

### Problem 1: Blueprint is Separate from Feed Planner

**Current:**
- `/blueprint` route = separate "Blueprint" feature
- `/feed-planner` route = separate "Feed Planner" feature
- Different components, different logic

**Should Be (CONSOLIDATED APPROACH):**
- Remove Blueprint tab/screen entirely
- `/feed-planner` route = Feed Planner (free and paid)
- Free mode flag/system detects when users are in free mode
- Same UI for all users (unified Feed Planner)
- Free mode: One 9:16 placeholder instead of full 3x3 grid
- Paid mode: Full 3x3 grid (9 image placeholders)
- Questionnaire wizard integrated into Feed Planner (paid users need it anyway)
- Same logic for image generation (just access control limits)

### Problem 2: Unnecessary Mode Flags

**Current:**
- `mode="blueprint"` flags in FeedViewScreen
- Hides features instead of proper access control

**Should Be:**
- No mode flags needed
- Same FeedViewScreen component
- Access control determines features (free vs paid vs membership)

### Problem 3: Image Generation Should Be Direct in Feed Grid

**Current:**
- Paid blueprint tries to use FeedViewScreen with Maya chat
- Feature flags hide Maya chat

**Should Be:**
- Image generation buttons directly on image placeholders
- Click button → Backend generates image using templates (Nano Banana Pro)
- No Maya chat needed
- Same as all other image generations in the app
- Users can generate one at a time or all at once

### Problem 4: Access Control Should Be Simple

**Current:**
- Complex routing between blueprint and feed planner
- Different components for free vs paid

**Should Be:**
- Single Feed Planner component
- Access control determines what user sees:
  - Free: Questionnaire → One example grid → Upsell
  - Paid: Full Feed Planner (30 photos, captions, strategy)
  - One-Time: Feed Planner + Maya + Gallery (no Academy)
  - Membership: Everything + Academy

---

## Proposed Corrected Architecture

### Unified Feed Planner Funnel

```
/feed-planner (All Users)

FREE USERS:
├─ Questionnaire Wizard (brand questions)
├─ Generate ONE example grid (3x3 with ONE image placeholder)
├─ Preview of full feed planner
└─ Upsell: "Get Full Feed Planner + 30 Photos, Captions & Strategy"

PAID USERS (After Checkout):
├─ Full Feed Planner UI (same as membership)
├─ Direct image generation buttons on placeholders
├─ Generate images (one at a time or all at once)
├─ Generate captions (30 days of content)
├─ Generate strategy (AI-generated in background)
├─ 30 photos = 3x3 grids with captions and strategy
└─ All AI-generated, returned to postcards

ONE-TIME SESSION USERS:
├─ Feed Planner (full features)
├─ Maya (chat-based generation)
├─ Gallery (save and manage photos)
└─ No Academy access

MEMBERSHIP USERS:
├─ Feed Planner (full features)
├─ Maya (chat-based generation)
├─ Gallery (save and manage photos)
└─ Academy (access to training content)
```

### Key Implementation Details

**1. Image Generation (Paid Feed Planner)**
- Image generation buttons directly on image placeholders in grid
- Click button → Backend API generates image using templates
- Uses Nano Banana Pro (same as all other image generations)
- No user prompts needed (template-based)
- Users can generate one at a time or all at once
- Same generation logic as rest of app

**2. Captions & Strategy**
- AI-generated in background (no user input needed)
- 30 days of content = 3x3 grids with captions and strategy
- Returned to postcards automatically
- Same as membership feed planner

**3. Access Control**
- Check user's access level (free, paid, one-time, membership)
- Show appropriate features based on access
- No mode flags needed - just access control

**4. Questionnaire Wizard**
- Free users: Complete wizard → Upload selfies → Generate one example → Preview (tabs with generation buttons hidden) → Upsell
- Paid first-time users: Complete wizard (skip free example) → Upload selfies → Full Feed Planner
- Paid returning users: Skip wizard (already completed) → Go to full Feed Planner
- Same wizard for all (reuse existing)

**5. Image Upload**
- Free users: Upload selfies (image library, same as Maya chat) for example grid
- Paid users: Upload selfies (image library, same as Maya chat) for feed generation
- Can change images when needed or add more
- Uses same image library component as Maya chat

---

## Recommended Changes

### 1. Consolidate Routes

**Remove:**
- `/blueprint` route (consolidate into `/feed-planner`)
- `/blueprint/paid` route (no longer needed)
- All blueprint-specific routes

**Keep:**
- `/feed-planner` route (handles all access levels)

### 2. Remove Mode Flags

**Remove:**
- `mode="blueprint"` props from FeedViewScreen
- `mode` props from feed planner components
- Feature flags that hide features

**Use:**
- Access control checks (free vs paid vs membership)
- Same components for all users
- Show/hide features based on access level

### 3. Direct Image Generation in Feed Grid

**Implement:**
- Image generation buttons directly on image placeholders
- Click → Backend API generates image using templates
- Uses Nano Banana Pro (same as rest of app)
- No Maya chat needed
- Template-based generation (no user prompts)

### 4. Simplified Access Control

**Free Users:**
- Show questionnaire wizard
- Upload selfies (image library)
- Generate one example grid (one image placeholder)
- Show Feed Planner UI with tabs: Grid - Captions - Strategy
- Show caption templates and posting calendar/strategy
- Hide all AI generation buttons (captions, bio, strategy, highlights)
- Show upsell CTA

**Paid Users - First Time (if haven't completed free feed planner):**
- Show wizard for onboarding (skip free example)
- Complete questionnaire (for backend context/aesthetics)
- Upload selfies (image library, can change/add images)
- Then proceed to full Feed Planner

**Paid Users - Returning (already completed free feed planner):**
- Go directly to full Feed Planner

**Paid Users - Full Feed Planner:**
- Show full Feed Planner UI (same as membership)
- Access to Gallery (to store generated images)
- Direct image generation buttons on placeholders
- Generate images (one at a time or all at once)
- Generate captions (30 days of content)
- Generate strategy (AI-generated in background)
- Users get 3 feed planners only to generate from
- 1 strategy and captions for each of the 30 photos
- All generation buttons visible (captions, bio, strategy, highlights)

**One-Time Session:**
- Feed Planner + Maya + Gallery (no Academy)

**Membership:**
- Everything + Academy

---

## Files to Modify

### Remove (No Longer Needed):
- `app/blueprint/` directory (consolidate into `/feed-planner`)
- `components/sselfie/blueprint-screen.tsx` (use FeedViewScreen instead)
- `app/api/feed/blueprint/route.ts` (no mapping needed)
- `lib/feed-planner/blueprint-mapper.ts` (no mapping needed)
- `mode="blueprint"` props from all feed planner components

### Create/Modify:
- Unified Feed Planner page (handles all access levels)
- Direct image generation buttons in feed grid (template-based)
- Access control logic (free vs paid vs membership)
- Questionnaire wizard integration (for free and paid first-time users)
- Hide/show AI generation buttons based on access level
- Gallery access for paid users
- Image upload component (same as Maya chat image library)

### Keep/Update:
- `components/feed-planner/feed-view-screen.tsx` (remove mode props)
- `components/feed-planner/feed-posts-list.tsx` (remove mode props)
- `components/feed-planner/feed-tabs.tsx` (remove mode props)
- Image generation API (template-based, no user prompts)

---

## Conclusion

The current implementation is wrong because:
1. ❌ Blueprint is separate from Feed Planner (should be unified)
2. ❌ Mode flags hide features (should use access control)
3. ❌ Different components for free vs paid (should be same component)
4. ❌ Tries to use Maya chat for paid (should be direct image generation)

**The correct architecture:**
1. ✅ Blueprint = Feed Planner with different access levels
2. ✅ Same Feed Planner UI for all users (tabs: Grid - Captions - Strategy)
3. ✅ Access control determines features (not mode flags)
4. ✅ Direct image generation in feed grid (template-based, no Maya)
5. ✅ Free: Questionnaire → Upload selfies → One example grid → Preview → Upsell
6. ✅ Free: All AI generation buttons hidden (captions, bio, strategy, highlights)
7. ✅ Paid: Full Feed Planner (30 photos, captions, strategy, Gallery access)
8. ✅ Paid: First-time users see onboarding wizard (skip free example)
9. ✅ Paid: Upload selfies (image library, can change/add images)
10. ✅ Paid: Users get 3 feed planners only to generate from
11. ✅ Paid: All generation buttons visible

**Simplified Flow:**
- Free: Questionnaire → Upload selfies → One example → Preview (tabs with generation buttons hidden) → Upsell
- Paid (First-time): Onboarding wizard (skip free example) → Upload selfies → Full Feed Planner
- Paid (Returning): Full Feed Planner (direct image generation, Gallery access, 3 feed planners, no Maya needed)
- One-Time: Feed Planner + Maya + Gallery
- Membership: Everything + Academy
