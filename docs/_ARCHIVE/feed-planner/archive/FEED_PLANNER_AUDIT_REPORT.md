# Feed Planner Comprehensive Audit Report

**Date:** 2025-01-30  
**Purpose:** Document the ACTUAL implementation state of the Feed Planner system  
**Methodology:** Code examination only - no assumptions

---

## SECTION 1: DATABASE SCHEMA

### 1.1 - Feed Layouts Table (`feed_layouts`)

**Source:** Migration files and API route usage

```sql
CREATE TABLE feed_layouts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  title VARCHAR(255),                    -- Optional, can be NULL
  brand_name VARCHAR(255),               -- Used for feed title/name
  username VARCHAR(255),                 -- Instagram username
  description TEXT,                      -- Optional description
  
  -- Status & Type
  status VARCHAR(50) DEFAULT 'draft',   -- Values: 'draft', 'saved', 'completed', 'chat'
  layout_type VARCHAR(50) DEFAULT 'grid_3x3',  -- Values: 'preview', 'grid_3x3', 'grid_3x4'
  
  -- Aesthetic & Branding
  brand_vibe VARCHAR(255),               -- Brand vibe/mood
  business_type VARCHAR(255),           -- Business category
  color_palette TEXT,                    -- Color preferences (TEXT, not JSONB in some migrations)
  aesthetic VARCHAR(255),                -- Aesthetic identifier
  aesthetic_id VARCHAR(100),             -- Aesthetic ID reference
  visual_rhythm TEXT,                    -- Visual rhythm description
  feed_story TEXT,                       -- Feed story/narrative
  overall_vibe TEXT,                     -- Overall vibe description
  
  -- Organization
  display_color VARCHAR(7),              -- Hex color code for visual organization (e.g., #ec4899)
  
  -- Strategy
  strategic_rationale TEXT,               -- Strategy document/rationale
  
  -- Credits
  total_credits INTEGER DEFAULT 0,        -- Total credits used for this feed
  
  -- Metadata
  created_by VARCHAR(50),                -- Creator type: 'manual', 'maya', etc. (may not exist in all schemas)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes Found:**
- `idx_feed_layouts_user_id` - On `user_id`
- `idx_feed_layouts_username` - On `username`
- `idx_feed_layouts_aesthetic_id` - On `aesthetic_id`

**Constraints:**
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE
- No unique constraint on `user_id` (multiple feeds per user allowed)

**Key Findings:**
- ✅ `layout_type` field exists and is used to distinguish:
  - `'preview'` - Preview feeds (free users, single 9:16 image)
  - `'grid_3x3'` - Default for 9-post grids
  - `'grid_3x4'` - For 12-post grids (manual feeds)
- ✅ `display_color` exists for feed organization
- ✅ `status` field exists with multiple values
- ⚠️ `created_by` field may not exist in all database instances (code has fallback)

---

### 1.2 - Feed Posts Table (`feed_posts`)

**Source:** Migration files and API route usage

```sql
CREATE TABLE feed_posts (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER NOT NULL REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Position & Type
  position INTEGER NOT NULL,              -- Grid position: 1-9 (or 1-12 for grid_3x4)
  post_type VARCHAR(50) NOT NULL,         -- Values: 'user', 'object', 'flatlay', 'scenery', etc.
  shot_type VARCHAR(50),                  -- Shot type: 'portrait', 'half-body', 'full-body', etc.
  
  -- Content
  image_url TEXT,                         -- Generated image URL (nullable)
  caption TEXT,                           -- Instagram caption
  prompt TEXT,                            -- Generation prompt (nullable)
  text_overlay TEXT,                      -- Text overlay content
  text_overlay_style JSONB,               -- Text overlay styling
  
  -- Generation
  generation_status VARCHAR(50) DEFAULT 'pending',  -- Values: 'pending', 'generating', 'completed', 'failed'
  generation_mode VARCHAR(10) DEFAULT 'classic',     -- Values: 'classic', 'pro' (CHECK constraint)
  pro_mode_type VARCHAR(50),                        -- Pro Mode type: 'carousel-slides', 'text-overlay', etc.
  prediction_id TEXT,                                -- Replicate prediction ID (for polling)
  
  -- Content Strategy
  content_pillar VARCHAR(255),            -- Content category/pillar
  purpose TEXT,                           -- Post purpose
  visual_direction TEXT,                  -- User's visual input/description
  background TEXT,                        -- Background description
  
  -- Metadata
  seed_variation INTEGER,                  -- Seed variation for consistency
  error TEXT,                              -- Error message if generation failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes Found:**
- `idx_feed_posts_feed_layout_id` - On `feed_layout_id`
- `idx_feed_posts_content_pillar` - On `content_pillar`
- `idx_feed_posts_post_status` - On `post_status` (if exists)
- `idx_feed_posts_generation_mode` - On `generation_mode`
- `idx_feed_posts_pro_mode_type` - On `pro_mode_type`
- `idx_feed_posts_shot_type` - On `shot_type`
- `feed_posts_feed_position_unique` - UNIQUE on `(feed_layout_id, position)` (prevents duplicate positions)

**Constraints:**
- Foreign key: `feed_layout_id` → `feed_layouts(id)` ON DELETE CASCADE
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE
- CHECK constraint: `generation_mode IN ('classic', 'pro')`
- UNIQUE constraint: `(feed_layout_id, position)` - Prevents duplicate positions in same feed

**Key Findings:**
- ✅ Position range: 1-9 for standard grids, 1-12 for `grid_3x4` feeds
- ✅ `generation_mode` distinguishes Classic (FLUX LoRA) vs Pro (NanoBanana Pro)
- ✅ `prediction_id` used for polling Replicate status
- ✅ `prompt` field stores the generation prompt (used for preview template extraction)

---

### 1.3 - Other Feed-Related Tables

#### `instagram_bios`
```sql
CREATE TABLE instagram_bios (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  bio_text TEXT NOT NULL,
  emoji_style VARCHAR(50),
  link_text VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `instagram_highlights`
```sql
CREATE TABLE instagram_highlights (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  image_url TEXT,
  icon_style VARCHAR(50),
  prompt TEXT,
  generation_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `blueprint_subscribers`
**Status:** EXISTS (legacy table, still used as fallback)

**Purpose:** Legacy blueprint subscription tracking

**Key Fields:**
- `user_id`
- `form_data` (JSONB) - Legacy form data
- `feed_style` - Legacy feed style selection

**Usage:** Used as fallback when `user_personal_brand` data not found

#### `user_personal_brand`
**Status:** EXISTS (primary source for unified wizard data)

**Feed-Related Fields:**
- `visual_aesthetic` (TEXT/JSONB) - Aesthetic preferences
- `settings_preference` (TEXT/JSONB) - Location/setting preferences
- `feed_planner_welcome_shown` (BOOLEAN) - Welcome wizard tracking

---

## SECTION 2: FEED CREATION FLOW

### 2.1 - Free Mode Feed Creation

**Endpoint:** `POST /api/feed/create-free-example`

**File:** `app/api/feed/create-free-example/route.ts`

**Request Body:**
```typescript
// No body required - uses authenticated user session
```

**Process:**
1. Authenticates user
2. Checks if user already has a feed → returns existing feed if found
3. Creates `feed_layouts` entry with:
   - `layout_type: 'preview'`
   - `status: 'saved'`
   - `brand_name: "Preview Feed - [date]"`
   - `username: [user.name]`
4. Gets template prompt from:
   - PRIMARY: `user_personal_brand` (unified wizard) - `settings_preference` + `visual_aesthetic`
   - FALLBACK: `blueprint_subscribers` (legacy)
5. Creates ONE `feed_posts` entry:
   - `position: 1`
   - `post_type: 'user'`
   - `generation_status: 'pending'`
   - `prompt: [template prompt or NULL]`
   - `generation_mode: 'pro'` (NanoBanana Pro)

**Credits Used:** 
- NOT deducted in this endpoint
- Deducted in `/api/feed/[feedId]/generate-single` when generation starts

**Status Values:**
- `feed_layouts.status: 'saved'`
- `feed_posts.generation_status: 'pending'`

**Preview Template:**
- Stored in: `feed_posts[0].prompt`
- Selected from: `BLUEPRINT_PHOTOSHOOT_TEMPLATES` based on `category_mood` key
- Template key format: `{category}_{mood}` (e.g., `luxury_dark_moody`)

**Actual Implementation Status:**
- ✅ Fully implemented
- ✅ Uses unified wizard data (primary)
- ✅ Falls back to legacy blueprint_subscribers
- ✅ Creates preview feed with single post

---

### 2.2 - Paid Mode Feed Expansion

**Endpoint:** `POST /api/feed/expand-for-paid`

**File:** `app/api/feed/expand-for-paid/route.ts`

**Status:** ✅ EXISTS

**Request Body:**
```typescript
{
  feedId: number  // Required
}
```

**Process:**
1. Authenticates user
2. Checks existing posts in feed
3. Creates posts for missing positions: **2-12** (11 new posts)
4. Sets:
   - `post_type: 'photo'`
   - `generation_status: 'pending'`
   - `generation_mode: 'pro'`

**Trigger:**
- **Automatic:** Client-side `useEffect` in `feed-view-screen.tsx` detects:
  - User is paid blueprint
  - Feed has only 1 post
  - Automatically calls expansion endpoint
- **Manual:** Can be called directly if needed

**Actual Implementation:**
- ✅ Feed expansion from 1 post → 12 posts: **FULLY IMPLEMENTED**
- ✅ Automatic expansion for paid users: **FULLY IMPLEMENTED**
- ✅ Creates positions 2-12 (3x4 grid)

---

### 2.3 - New Feed Creation (Multi-Feed)

**Endpoint 1:** `POST /api/feed/create-manual`

**File:** `app/api/feed/create-manual/route.ts`

**Request Body:**
```typescript
{
  title?: string  // Optional, defaults to "My Feed - [date]"
}
```

**Process:**
1. Authenticates user
2. Creates `feed_layouts` entry with:
   - `layout_type: 'grid_3x4'`
   - `status: 'saved'`
   - `brand_name: [title or default]`
   - `username: [user.name]`
3. Creates 9 empty `feed_posts` entries:
   - Positions: 1-9
   - `post_type: 'user'`
   - `generation_status: 'pending'`
   - `prompt: NULL`
   - `image_url: NULL`

**Actual Implementation Status:**
- ✅ Fully implemented
- ✅ Creates empty feed with 9 placeholders
- ✅ No preview generation (manual upload/selection)

**Endpoint 2:** `POST /api/feed-planner/create-strategy`

**File:** `app/api/feed-planner/create-strategy/route.ts`

**Purpose:** Creates feed from Maya strategy generation

**Process:**
1. Generates or uses approved strategy
2. Creates `feed_layouts` entry
3. Creates 9 `feed_posts` entries with strategy data
4. Can use approved preview strategy

**Actual Implementation Status:**
- ✅ Fully implemented
- ✅ Creates feed from strategy
- ✅ Supports approved preview strategies

---

## SECTION 3: FEED MANAGEMENT & ORGANIZATION

### 3.1 - Feed List/History

**Endpoint:** `GET /api/feed/list`

**File:** `app/api/feed/list/route.ts`

**Query Parameters:** None

**Response Structure:**
```typescript
{
  feeds: Array<{
    id: number
    title: string                    // feed.title || feed.brand_name || `Feed ${feed.id}`
    created_at: string
    status: string                   // 'saved' | 'completed' | 'draft'
    layout_type: string               // 'preview' | 'grid_3x3' | 'grid_3x4'
    post_count: number
    image_count: number
    display_color: string | null      // Hex color code
    preview_image_url: string | null  // Only for preview feeds
  }>
}
```

**Filtering:**
- ✅ By status: `status IN ('saved', 'completed', 'draft')`
- ✅ By layout_type: Paid users exclude `layout_type = 'preview'`
- ✅ Preview vs full feeds: Distinguished by `layout_type`

**UI Display:**
- **Component:** NOT FOUND (need to check feed planner components)
- **Location:** Unknown (need to check feed planner page)

**Features:**
- Feed switching: ❓ Unknown (need to check UI)
- Feed renaming: ❓ Unknown (need to check API)
- Color coding: ✅ Database field exists (`display_color`)
- Delete feed: ✅ `DELETE /api/feed/[feedId]` exists

---

### 3.2 - Feed Switcher

**Status:** ❌ NOT FOUND IN UI

**Files Checked:**
- `components/feed-planner/feed-header.tsx` - No feed selector found
- `components/feed-planner/feed-view-screen.tsx` - Fetches feed list but no UI selector found
- `components/feed-planner/feed-list.tsx` - NOT FOUND

**Finding:** 
- Feed list is fetched via `/api/feed/list` in `feed-view-screen.tsx`
- `feeds` array is available: `const feeds = feedListData?.feeds || []`
- `hasMultipleFeeds` flag exists: `const hasMultipleFeeds = feeds.length > 1`
- **BUT:** No UI component found to display or switch between feeds

**Actual Implementation:**
- ❌ Feed switcher UI: **NOT IMPLEMENTED**
- ✅ Feed list API: **EXISTS** (`/api/feed/list`)
- ✅ Feed switching via URL: **WORKS** (`?feedId=123`)
- ❌ Feed selector dropdown: **NOT FOUND**

---

### 3.3 - Feed Organization Features

**Color Coding:**
- ✅ Database field: `feed_layouts.display_color` (VARCHAR(7))
- ❓ UI for selecting color: NEEDS CHECK
- ❓ API endpoint for updating: NEEDS CHECK

**Renaming:**
- ✅ Database field: `feed_layouts.brand_name` or `feed_layouts.title`
- ✅ API endpoint: `PATCH /api/feed/[feedId]/update-metadata` 
  - Updates: `title` (or `brand_name`), `display_color`
  - File: `app/api/feed/[feedId]/update-metadata/route.ts`
- ❓ UI for renaming: **NEEDS CHECK** (API exists, UI unknown)

**Sorting:**
- ✅ Default: `ORDER BY created_at DESC` (most recent first)
- ❓ User-controlled sorting: NEEDS CHECK

---

## SECTION 4: WIZARDS & ONBOARDING

### 4.1 - Unified Onboarding Wizard

**Component:** `components/onboarding/unified-onboarding-wizard.tsx`

**Status:** ✅ FULLY IMPLEMENTED

**Total Steps:** 8 steps (0-7, 0-indexed)

**Step-by-Step Breakdown:**

**Step 0: Welcome**
- Purpose: Introduction screen
- Fields: None (display only)
- Validation: N/A

**Step 1: Business Type**
- Purpose: "What do you do?"
- Fields: `businessType` (text input)
- Validation: Required

**Step 2: Audience Builder**
- Purpose: "Who is your ideal audience?"
- Fields: 
  - `idealAudience` (text)
  - `audienceChallenge` (text)
  - `audienceTransformation` (text)
- Validation: Required

**Step 3: Story**
- Purpose: "What's your story?"
- Fields: `transformationStory` (textarea)
- Validation: Required

**Step 4: Visual Style**
- Purpose: "What's your visual style?"
- Fields: 
  - `visualAesthetic` (array) - Multiple selection from: minimal, luxury, warm, edgy, professional, beige
  - `feedStyle` (string) - Single selection: luxury, minimal, beige
- Validation: Required

**Step 5: Selfies**
- Purpose: "Upload your selfies"
- Fields: `selfieImages` (array of image URLs)
- Validation: Required (minimum 1 image)

**Step 6: Optional Details**
- Purpose: Additional optional information
- Fields:
  - `fashionStyle` (array) - Optional
  - `brandInspiration` (text) - Optional
  - `inspirationLinks` (text) - Optional
- Validation: All optional

**Step 7: Brand Pillars**
- Purpose: "Create your content pillars"
- Fields: `contentPillars` (array of objects)
  - Each pillar: `{ name, description, contentIdeas: [] }`
- Validation: Optional

**Data Storage:**
- **Table:** `user_personal_brand`
- **Fields:**
  - `business_type` → `businessType`
  - `ideal_audience` → `idealAudience`
  - `audience_challenge` → `audienceChallenge`
  - `audience_transformation` → `audienceTransformation`
  - `transformation_story` → `transformationStory`
  - `visual_aesthetic` (JSONB) → `visualAesthetic`
  - `settings_preference` (JSONB) → `feedStyle`
  - `fashion_style` (JSONB) → `fashionStyle`
  - `brand_inspiration` → `brandInspiration`
  - `inspiration_links` → `inspirationLinks`
  - `content_pillars` (JSONB) → `contentPillars`
- **API Endpoint:** `POST /api/profile/personal-brand`

**Completion:**
- Calls `onComplete` callback with all form data
- Data saved to `user_personal_brand` table
- User redirected to feed planner
- Does NOT automatically create a feed (feed creation is separate)

**Features:**
- ✅ Can start at specific step via `initialStep` prop
- ✅ Pre-fills from existing data (`existingData` prop)
- ✅ SWR caching for data persistence
- ✅ No localStorage (uses SWR cache)

---

### 4.2 - Welcome Wizard (Paid Users)

**Component:** `components/feed-planner/welcome-wizard.tsx`

**Status:** ✅ FULLY IMPLEMENTED

**Total Steps:** 4 steps

**Trigger Condition:**
- **When shown:** 
  - First-time paid blueprint users (`feed_planner_welcome_shown = false`)
  - Auto-shown once per session (tracked via `useRef` in `feed-planner-client.tsx`)
  - Can be manually opened via Help button (?) in header
- **Check:** `/api/feed-planner/welcome-status` (GET)
- **Database flag:** `user_personal_brand.feed_planner_welcome_shown` (BOOLEAN)

**Step-by-Step Breakdown:**

**Step 1: Welcome to your Feed Planner**
- Content: 
  - If preview feed exists: Shows preview image with "Use Preview Style" / "Choose New Style" buttons
  - Otherwise: Default welcome message explaining feed planner
- Dynamic based on preview feed detection via `/api/feed-planner/preview-feed`

**Step 2: Generate your photos**
- Content: Explains how to click placeholders to generate photos
- Tip: Start with first few photos to see how they look together

**Step 3: Add captions and strategy**
- Content: Explains Post tab (captions) and Strategy tab (guide)
- Shows visual examples of tabs

**Step 4: You're all set!**
- Content: Completion message
- Encourages user to create content
- Mentions help button (?) in header

**Completion:**
- Calls `onComplete()` callback
- Sets `feed_planner_welcome_shown = true` in database
- API endpoint: `POST /api/feed-planner/welcome-status`
- Closes wizard modal

**Features:**
- ✅ Preview feed detection (shows preview image if exists)
- ✅ "Use Preview Style" button (calls `onUsePreviewStyle`)
- ✅ "Choose New Style" button (calls `onChooseNewStyle`, opens unified wizard at step 4)
- ✅ Matches unified wizard UI style (backdrop, modal styling, progress bar)
- ✅ Interactive step navigation

---

### 4.3 - Brand Profile Wizard

**Status:** ✅ INTEGRATED INTO UNIFIED WIZARD

**Finding:**
- No separate "Brand Profile Wizard" component found
- Brand profile data is collected in **Unified Onboarding Wizard** (Section 4.1)
- All brand profile fields are part of the unified wizard steps

**Location:**
- Accessed via: Unified Onboarding Wizard (steps 1-7)
- Settings: Can be edited by re-opening unified wizard (Settings button in header)

**Fields Collected (via Unified Wizard):**
- ✅ Business type: Step 1
- ✅ Target audience: Step 2 (ideal audience, challenges, transformation)
- ✅ Brand vibe: Step 4 (visual aesthetic)
- ✅ Color preferences: Step 4 (feed style - luxury/minimal/beige)
- ✅ Fashion style: Step 6 (optional)
- ✅ Brand inspiration: Step 6 (optional)
- ✅ Content pillars: Step 7 (optional)

**Storage:**
- **Table:** `user_personal_brand`
- **Fields:** See Section 4.1 for complete mapping

**Usage:**
- ✅ Used for feed generation: Template selection based on `visual_aesthetic` + `settings_preference`
- ✅ Used for Maya context: Personal brand data passed to Maya for prompt generation
- ✅ Used for preview feed: Template prompt selected from `BLUEPRINT_PHOTOSHOOT_TEMPLATES` based on category + mood

---

## SECTION 5: IMAGE GENERATION

### 5.1 - Preview Grid Generation (Free)

**Endpoint:** `POST /api/feed/[feedId]/generate-single`

**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Status:** ✅ FULLY IMPLEMENTED

**Request Body:**
```typescript
{
  postId: number  // Required - ID of feed_posts entry to generate
}
```

**Process Flow:**
1. Authenticates user
2. Checks access control (`getFeedPlannerAccess`)
3. Checks credits (2 credits for Pro Mode)
4. Checks rate limits
5. Determines generation mode:
   - Free users: **Always Pro Mode** (NanoBanana Pro)
   - Paid blueprint: **Always Pro Mode**
   - Membership: Classic Mode (FLUX LoRA) if trained model exists
6. For Pro Mode (free/paid blueprint):
   - Fetches user avatar images (up to 5)
   - Uses template prompt from `feed_posts[0].prompt` (preview template)
   - Generates with NanoBanana Pro (2K resolution, 9:16 aspect ratio)
7. For Classic Mode (membership):
   - Uses trained FLUX LoRA model
   - Generates with Replicate FLUX model
8. Updates `feed_posts`:
   - `generation_status: 'generating'`
   - `prediction_id: [replicate prediction ID]`
9. Credits deducted: **2 credits** (Pro Mode) or **1 credit** (Classic Mode)
10. Polling: Frontend polls `/api/feed/[feedId]/progress` to check status

**Template Selection:**
- **Source:** `feed_posts[0].prompt` (stored when preview feed created)
- **Origin:** `BLUEPRINT_PHOTOSHOOT_TEMPLATES` based on `category_mood` key
- **Format:** Full template string with 3x3 grid description

**Credit Usage:**
- **Cost:** 2 credits (Pro Mode) or 1 credit (Classic Mode)
- **Deduction timing:** **BEFORE generation starts** (immediate)
- **Refund on failure:** ❌ No automatic refund (manual refund possible)

**Result Storage:**
- **Image URL:** Stored in `feed_posts.image_url` (Vercel Blob)
- **Status:** `feed_posts.generation_status: 'completed'`
- **Prediction ID:** Stored in `feed_posts.prediction_id` (for tracking)

**Aspect Ratio:**
- Free users: **9:16** (vertical, single placeholder)
- Paid users: **4:5** (Instagram post ratio, 3x4 grid)

---

### 5.2 - Individual Image Generation (Paid)

**Same endpoint:** `POST /api/feed/[feedId]/generate-single`

**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Status:** ✅ FULLY IMPLEMENTED

**Detection of Paid User:**
- **How determined:** `access.isPaidBlueprint` check (from `getFeedPlannerAccess`)
- **Code location:** Line 84 in `generate-single/route.ts`

**Maya Integration:**
- ✅ **Is Maya called:** YES (for paid blueprint users)
- ✅ **Endpoint:** `/api/maya/generate-feed-prompt`
- ✅ **Mode parameter:** `mode: 'feed-planner-background'` (if locked aesthetic exists)
- ✅ **Locked aesthetic:** Passed as `lockedAesthetic` object

**Prompt Construction:**
- **Preview Template Lookup:**
  1. Finds preview feed (`layout_type: 'preview'`)
  2. Extracts prompt from `feed_posts[0].prompt` (preview template)
  3. Extracts aesthetic using `extractAestheticFromTemplate()`
- **Maya Generation:**
  - If preview template exists: Uses **locked aesthetic mode**
  - If no preview: Uses **chat mode** with brand profile data
- **Style Switching:**
  - Compares preview style with current brand profile
  - If mismatch: Uses brand profile template instead of preview

**NanoBanana Prompt Structure:**
- ✅ **Has base identity prompt:** YES
  ```
  "Influencer/pinterest style of a woman maintaining exactly the same physical 
  characteristics of the woman in the attached image (face, body, skin tone, 
  hair, and visual identity), without modifications."
  ```
- ✅ **Has Maya variation:** YES (pose, angle, composition)
- ✅ **Has assembly modifier:** YES (e.g., "luxury_dark_moody")
- ✅ **Has quality modifiers:** YES (e.g., "professional photography, 8k, high detail")
- ✅ **Three-part structure:** YES (base identity + variation + technical)

**Credit Usage:**
- **Cost:** 2 credits (Pro Mode - same as free)
- **Different from free:** NO (same cost, but different prompt generation)

**Current Implementation:**
- ✅ Generated images use Maya prompts
- ✅ Locked aesthetic extraction works
- ✅ Three-part prompt assembly works
- ✅ Style switching detection works
- ✅ Fallback to brand profile if no preview

---

## SECTION 6: CREDIT SYSTEM

### 6.1 - Credit Display

**API Endpoint:** `GET /api/credits/balance`

**File:** `app/api/credits/balance/route.ts`

**Response:**
```typescript
{
  balance: number        // Current credit balance
  total_used: number     // Total credits used
  total_purchased: number // Total credits purchased
}
```

**Display Locations:**
- ✅ **Header:** `components/sselfie/sselfie-app.tsx` - CreditBalance component
- ✅ **Feed planner:** Displayed in header (via SselfieApp)
- ✅ **Upsell modals:** Shows credit balance

**Update Frequency:**
- ✅ **Real-time:** NO (SWR polling)
- ✅ **On page load:** YES
- ✅ **After actions:** YES (SWR revalidation)
- ✅ **Polling:** NO (manual refresh via SWR)

**Component:** `components/credits/credit-balance.tsx`

---

### 6.2 - Credit Deduction

**Function:** `deductCredits(userId, amount, type, description, referenceId?)`

**File:** `lib/credits.ts`

**Preview Generation:**
- **Cost:** 2 credits (Pro Mode)
- **Deduction timing:** **BEFORE generation starts** (immediate)
- **Code location:** `app/api/feed/[feedId]/generate-single/route.ts` line 173

**Individual Image:**
- **Cost:** 2 credits (Pro Mode) or 1 credit (Classic Mode)
- **Deduction timing:** **BEFORE generation starts** (immediate)
- **Code location:** `app/api/feed/[feedId]/generate-single/route.ts` line 173

**Transaction Recording:**
- **Table:** `credit_transactions`
- **Fields recorded:**
  - `user_id`
  - `amount` (negative for usage)
  - `transaction_type` ('image', 'training', 'animation', 'refund')
  - `description`
  - `reference_id` (optional - post ID, feed ID, etc.)
  - `balance_after`

**Refund Logic:**
- ✅ **Exists:** YES (manual refund function)
- ❌ **Automatic refund:** NO (on generation failure)
- **Code location:** `lib/credits.ts` - `grantCredits()` with type 'refund'

**Credit Costs:**
- **Pro Mode (NanoBanana):** 2 credits (all resolutions: 1K, 2K, 4K)
- **Classic Mode (FLUX):** 1 credit
- **Training:** 20 credits

---

### 6.3 - Credit Top-Up

**Status:** ✅ FULLY IMPLEMENTED

**Purchase Components:**
- ✅ **Modal:** `components/sselfie/buy-credits-modal.tsx`
- ✅ **Dialog:** `components/credits/buy-credits-dialog.tsx`
- ✅ **Page:** `app/checkout/credits/page.tsx` (if exists)

**Credit Packages:**
- **100 Credits:** $45 (4,500 cents)
- **200 Credits:** $85 (8,500 cents) - Popular

**Stripe Integration:**
- ✅ **Product IDs:** `credits_topup_100`, `credits_topup_200`
- ✅ **Checkout flow:** Embedded Stripe checkout
- ✅ **Action:** `app/actions/stripe.ts` - `startCreditCheckoutSession()`

**Webhook:**
- ✅ **Route:** `/api/webhooks/stripe/route.ts`
- ✅ **Credit grant logic:** YES (handles `checkout.session.completed` for credit top-ups)
- ✅ **Events handled:**
  - `checkout.session.completed` (for credit purchases)
  - `payment_intent.succeeded` (for credit purchases)

**Low Credit Warnings:**
- ✅ **Modal:** `components/credits/low-credit-modal.tsx`
- ✅ **Warning:** `components/credits/low-credit-warning.tsx`
- **Threshold:** 30 credits (default, configurable)
- **Shows for:** Paid users only (not free users)

---

## SECTION 7: FEED PLANNER UI

### 7.1 - Main Feed Planner Screen

**Route:** `/feed-planner`

**Main Component:** `app/feed-planner/page.tsx` (server) → `app/feed-planner/feed-planner-client.tsx` (client)

**Layout Structure:**
- **Header:** Feed name, color badge, settings button, help button
- **Main area:** Feed grid (3x3 or 3x4) or single placeholder (9:16)
- **Sidebar:** None (tabs are in main area)

**Tabs/Sections:**
- ✅ **Grid:** YES - Main feed grid view
- ✅ **Posts:** YES - Individual post view with captions
- ✅ **Strategy:** YES - Feed strategy guide
- ✅ **Captions:** YES - Caption templates and generation
- ✅ **Bio:** YES - Instagram bio generation
- ✅ **Highlights:** YES - Highlight cover generation

**Grid Component:**
- **File:** `components/feed-planner/feed-grid.tsx`
- **Layout:** `grid-cols-3 md:grid-cols-4` (3 columns mobile, 4 columns desktop)
- **Positions:** 1-9 (standard) or 1-12 (grid_3x4)
- **Responsive:** YES (mobile optimized)

---

### 7.2 - Feed Placeholder Component

**File:** `components/feed-planner/feed-single-placeholder.tsx`

**States:**
- ✅ **Empty/pending:** Shows placeholder with "Generate" button
- ✅ **Generating:** Shows loading spinner and "Generating your preview feed" text
- ✅ **Completed:** Shows generated image with download button
- ✅ **Failed:** Shows error state (not explicitly found, but handled)

**Free Mode (Preview):**
- ✅ **Shows preview grid:** YES (9:16 aspect ratio)
- ✅ **9:16 aspect ratio:** YES
- ✅ **Upsell button:** YES ("Continue Creating" button)
- ✅ **Download button:** YES ("Save to Device" button)

**Paid Mode:**
- ✅ **Generate button:** YES (in feed-grid.tsx)
- ✅ **Credit check:** YES (before generation, shows credit cost)
- ✅ **Maya integration:** YES (calls Maya for prompt generation)

**Upsell Modal:**
- ✅ **Component:** `components/feed-planner/free-mode-upsell-modal.tsx`
- ✅ **Trigger:** 
  - Automatic: 10 seconds after generation completes (first time)
  - Recurring: Every 5 minutes after first showing
- ✅ **Options:** 
  - "Top Up Credits" button → Opens credit purchase modal
  - "Unlock Full Blueprint" button → Opens BuyBlueprintModal (embedded checkout)

---

### 7.3 - Feed Header/Navigation

**Component:** `components/feed-planner/feed-header.tsx`

**Elements:**
- ✅ **Feed name:** Shows `feed.title || feed.brand_name || "Feed {id}"`
- ✅ **Color badge:** Shows `display_color` if set
- ✅ **"New Preview" button:** Creates preview feed (`/api/feed/create-free-example`)
- ✅ **"New Feed" button:** Creates manual feed (`/api/feed/create-manual`)
- ✅ **Settings button:** Opens unified wizard (edit wizard answers)
- ✅ **Help button:** Opens welcome wizard (paid users only)
- ✅ **Credit display:** Via SselfieApp header (not in feed header)

**Feed Switching:**
- ❌ **Implemented:** NO (no UI selector found)
- ❌ **UI:** NOT FOUND (feed list fetched but not displayed)
- ✅ **Updates grid:** YES (via URL parameter `?feedId=123`)

**Features:**
- ✅ **Write Bio button:** Hidden for free users (`!access?.isFree`)
- ✅ **Create Highlights button:** Hidden for free users (`!access?.isFree`)
- ✅ **Profile image:** Clickable, shows upload option

---

## SECTION 8: ACCESS CONTROL

**File:** `lib/feed-planner/access-control.ts`

**Status:** ✅ FULLY IMPLEMENTED

**Function:** `getFeedPlannerAccess(userId: string): Promise<FeedPlannerAccess>`

**Paid User Detection:**
- ✅ **Checks subscription table:** YES (via `hasPaidBlueprint()`)
- ✅ **Checks blueprint_subscribers:** NO (deprecated)
- **Check logic:**
  ```typescript
  const hasPaid = await hasPaidBlueprint(userId)
  const hasMembership = await hasStudioMembership(userId)
  const isPaidBlueprint = hasPaid && !hasMembership
  const isFree = !hasMembership && !hasPaid
  ```

**Access Object Structure:**
```typescript
interface FeedPlannerAccess {
  isFree: boolean
  isPaidBlueprint: boolean
  isOneTime: boolean  // Deprecated (always false)
  isMembership: boolean
  hasGalleryAccess: boolean
  canGenerateImages: boolean
  canGenerateCaptions: boolean
  canGenerateStrategy: boolean
  canGenerateBio: boolean
  canGenerateHighlights: boolean
  maxFeedPlanners: number | null  // 3 for paid blueprint, null (unlimited) for others
  placeholderType: "single" | "grid"  // "single" for free, "grid" for paid
}
```

**Used Where:**
- ✅ **Feed generation endpoints:** YES (`/api/feed/[feedId]/generate-single`)
- ✅ **UI components:** YES (`feed-header.tsx`, `feed-grid.tsx`, `feed-single-placeholder.tsx`)
- ✅ **Feature gating:** YES (hides buttons, restricts generation)

**Feature Restrictions:**

**Free User Can:**
- ✅ Create preview feed (1 post, 9:16 aspect ratio)
- ✅ Generate ONE image (uses 2 credits)
- ✅ View feed planner
- ✅ See upsell modals after using credits

**Free User Cannot:**
- ❌ Generate multiple images (only 1 preview)
- ❌ Access gallery selector
- ❌ Generate captions
- ❌ Generate strategy
- ❌ Generate bio
- ❌ Generate highlights
- ❌ Write bio
- ❌ Create highlights

**Paid User Can:**
- ✅ Create unlimited feeds (or 3 max for paid blueprint)
- ✅ Generate unlimited images (with credits)
- ✅ Access gallery selector
- ✅ Generate captions
- ✅ Generate strategy
- ✅ Generate bio
- ✅ Generate highlights
- ✅ Write bio
- ✅ Create highlights
- ✅ Full 3x4 grid (12 positions)

**Paid User Cannot:**
- ❌ Access preview feeds (filtered out in feed list)
- ❌ See preview feeds in grid (redirected to full feed)

---

## SECTION 9: API ENDPOINTS SUMMARY

**Need to compile complete list**

---

## SECTION 10: GAPS & MISSING FEATURES

**Need to compare discussed vs implemented**

---

## NEXT STEPS

1. Continue with Section 2.2 (feed expansion) - verify if it exists
2. Document Section 3.2 (feed switcher UI)
3. Document Section 4 (all wizards)
4. Document Section 5 (image generation flows)
5. Document Section 6 (credit system)
6. Document Section 7 (UI components)
7. Document Section 8 (access control)
8. Compile Section 9 (API endpoints)
9. Complete Section 10 (gaps analysis)
