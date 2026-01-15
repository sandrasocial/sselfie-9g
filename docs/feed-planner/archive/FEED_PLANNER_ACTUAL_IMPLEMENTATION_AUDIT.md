# COMPREHENSIVE FEED PLANNER AUDIT - ACTUAL IMPLEMENTATION

**Date:** January 2025  
**Purpose:** Document the ACTUAL current state of the Feed Planner system based on code analysis  
**Method:** Code review, schema analysis, API endpoint review, component analysis

**Related Documents:**
- `docs/FEED_PLANNER_ACTUAL_FLOWS.md` - User flow diagrams based on actual code
- `docs/FEED_PLANNER_STATUS.md` - Implementation status checklist

---

## TABLE OF CONTENTS

1. [Database Schema](#section-1-database-schema)
2. [Feed Creation Flow](#section-2-feed-creation-flow)
3. [Feed Management & Organization](#section-3-feed-management--organization)
4. [Wizards & Onboarding](#section-4-wizards--onboarding)
5. [Image Generation](#section-5-image-generation)
6. [Credit System](#section-6-credit-system)
7. [Feed Planner UI](#section-7-feed-planner-ui)
8. [Access Control](#section-8-access-control)
9. [API Endpoints Summary](#section-9-api-endpoints-summary)
10. [Gaps & Missing Features](#section-10-gaps--missing-features)

---

## SECTION 1: DATABASE SCHEMA

### 1.1 - Feed Layouts Table

**Source Files:**
- `scripts/21-create-feed-tables-fixed.sql` (base schema)
- `scripts/24-complete-feed-schema.sql` (additions)
- `migrations/add-feed-planner-schema-fields.sql` (migrations)
- `scripts/26-add-username-brandname-to-feed-layouts.sql`
- `scripts/add-feed-display-color.sql`
- `scripts/38-add-photoshoot-consistency-fields.sql`
- `migrations/ensure-feed-planner-columns.sql`

**Actual Schema:**

```sql
CREATE TABLE feed_layouts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  title VARCHAR(255),
  description TEXT,
  brand_name VARCHAR(255),        -- Added in scripts/26
  username VARCHAR(255),          -- Added in scripts/26
  
  -- Status & Type
  status VARCHAR(50) DEFAULT 'draft',  -- Values: 'draft', 'saved', 'chat', 'completed'
  layout_type VARCHAR(50) DEFAULT 'grid_3x3',  -- Values: 'grid_3x3', 'preview', 'grid_3x4'
  
  -- Aesthetic & Brand
  brand_vibe VARCHAR(255),        -- Added in scripts/22, 24
  business_type VARCHAR(255),     -- Added in scripts/22, 24
  color_palette TEXT,              -- Added in scripts/22, 24 (can be JSONB in some migrations)
  visual_rhythm TEXT,              -- Added in scripts/22, 24
  feed_story TEXT,                 -- Added in scripts/22, 24
  research_insights TEXT,          -- Added in scripts/22, 24
  hashtags TEXT[],                 -- Added in scripts/23, 24
  
  -- Aesthetic Fields (from migrations)
  aesthetic VARCHAR(255),          -- Added in migrations/add-feed-planner-schema-fields.sql
  aesthetic_id VARCHAR(100),       -- Added in migrations/add-feed-planner-schema-fields.sql
  strategic_rationale TEXT,        -- Added in migrations/add-feed-planner-schema-fields.sql
  overall_vibe TEXT,               -- Added in migrations/add-feed-planner-schema-fields.sql
  total_credits INTEGER DEFAULT 0, -- Added in migrations/add-feed-planner-schema-fields.sql
  
  -- Organization
  display_color VARCHAR(7),        -- Added in scripts/add-feed-display-color.sql (hex color for visual organization)
  
  -- Photoshoot Consistency (from scripts/38)
  photoshoot_enabled BOOLEAN DEFAULT false,
  photoshoot_base_seed INTEGER,
  photoshoot_base_outfit TEXT,
  photoshoot_base_location TEXT,
  photoshoot_base_hair TEXT,
  photoshoot_base_accessories TEXT,
  
  -- Profile Image (from scripts/28, 30)
  profile_image_url TEXT,          -- Added in scripts/28-add-profile-image-to-feed-layouts.sql
  profile_image_prompt TEXT,       -- Added in scripts/30-add-profile-image-prompt.sql
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Legacy/Deprecated (may exist in some schemas)
  created_by VARCHAR(255)          -- Optional, may not exist in all schemas
);
```

**Indexes:**
```sql
CREATE INDEX idx_feed_layouts_user_id ON feed_layouts(user_id);
CREATE INDEX idx_feed_layouts_created_at ON feed_layouts(created_at DESC);
CREATE INDEX idx_feed_layouts_username ON feed_layouts(username);
CREATE INDEX idx_feed_layouts_aesthetic_id ON feed_layouts(aesthetic_id);
CREATE INDEX idx_feed_layouts_photoshoot ON feed_layouts(photoshoot_enabled, user_id);
```

**Constraints:**
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE
- No unique constraints found
- No check constraints on `status` or `layout_type` (VARCHAR allows any value)

**Status Values (from code analysis):**
- `'draft'` - Default
- `'saved'` - Feed saved
- `'chat'` - Created via chat
- `'completed'` - Feed complete

**Layout Type Values (from code analysis):**
- `'grid_3x3'` - Default, 9-post grid
- `'preview'` - Preview feed (free users, single post)
- `'grid_3x4'` - 12-post grid (if implemented)

---

### 1.2 - Feed Posts Table

**Source Files:**
- `scripts/21-create-feed-tables-fixed.sql` (base schema)
- `migrations/add-feed-planner-schema-fields.sql`
- `migrations/add-pro-mode-to-feed-posts.sql`
- `migrations/ensure-feed-planner-columns.sql`
- `scripts/38-add-photoshoot-consistency-fields.sql`
- `scripts/25-add-prediction-id-to-feed-posts.sql`
- `scripts/26-add-calendar-scheduling.sql`

**Actual Schema:**

```sql
CREATE TABLE feed_posts (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER NOT NULL REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Position & Type
  position INTEGER NOT NULL,  -- Range: 1-9 (or 1-12 for 3x4 grid)
  post_type VARCHAR(50) NOT NULL,  -- Values: 'user', 'object', 'flatlay', 'scenery', 'place'
  
  -- Content
  image_url TEXT,
  caption TEXT,
  prompt TEXT,  -- Template prompt or generated prompt
  
  -- Generation
  generation_status VARCHAR(50) DEFAULT 'pending',  -- Values: 'pending', 'generating', 'completed', 'failed'
  generation_mode VARCHAR(50) DEFAULT 'classic',     -- Values: 'classic', 'pro' (CHECK constraint exists)
  pro_mode_type VARCHAR(50),                        -- Values: 'carousel-slides', 'text-overlay', 'quote-graphic', etc.
  
  -- Post Metadata
  shot_type VARCHAR(50),           -- Added in migrations/add-feed-planner-schema-fields.sql
                                    -- Values: 'portrait', 'half-body', 'full-body', 'object', 'flatlay', 'scenery'
  visual_direction TEXT,            -- Added in migrations/add-feed-planner-schema-fields.sql
  purpose TEXT,                     -- Added in migrations/add-feed-planner-schema-fields.sql
  content_pillar VARCHAR(255),      -- Added in migrations/ensure-feed-planner-columns.sql
  background TEXT,                  -- Added in migrations/add-feed-planner-schema-fields.sql
  
  -- Text Overlay
  text_overlay TEXT,
  text_overlay_style JSONB,
  
  -- Photoshoot Consistency
  seed_variation INTEGER DEFAULT 0, -- Added in scripts/38-add-photoshoot-consistency-fields.sql
  
  -- Replicate Integration
  prediction_id TEXT,              -- Added in scripts/25-add-prediction-id-to-feed-posts.sql
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,  -- Added in scripts/26-add-calendar-scheduling.sql
  
  -- Status
  post_status VARCHAR(50) DEFAULT 'draft',  -- Added in migrations/ensure-feed-planner-columns.sql
                                             -- Values: 'draft', 'scheduled', 'posted'
  
  -- Error Handling
  error TEXT,                       -- Added in migrations/add-feed-planner-schema-fields.sql
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_feed_posts_feed_layout_id ON feed_posts(feed_layout_id);
CREATE INDEX idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX idx_feed_posts_generation_mode ON feed_posts(generation_mode);
CREATE INDEX idx_feed_posts_pro_mode_type ON feed_posts(pro_mode_type);
CREATE INDEX idx_feed_posts_content_pillar ON feed_posts(content_pillar);
CREATE INDEX idx_feed_posts_post_status ON feed_posts(post_status);
CREATE INDEX idx_feed_posts_shot_type ON feed_posts(shot_type);
```

**Constraints:**
- Foreign key: `feed_layout_id` → `feed_layouts(id)` ON DELETE CASCADE
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE
- CHECK constraint: `generation_mode IN ('classic', 'pro')` (from migrations/ensure-feed-planner-columns.sql)
- UNIQUE constraint: `(feed_layout_id, position)` (from migrations/add-feed-planner-schema-fields.sql)

**Position Range:**
- Code shows positions 1-9 for standard grids
- No database constraint enforcing range (relies on application logic)
- Unique constraint prevents duplicate positions per feed

**Generation Status Values:**
- `'pending'` - Default, not yet generated
- `'generating'` - Generation in progress
- `'completed'` - Generation successful
- `'failed'` - Generation failed

---

### 1.3 - Blueprint Subscribers Table

**Source File:** `scripts/create-blueprint-subscribers-table.sql`

**Actual Schema:**

```sql
CREATE TABLE blueprint_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  user_id VARCHAR,  -- Added later, nullable for backward compatibility
  form_data JSONB,
  feed_style VARCHAR(50),
  strategy_generated BOOLEAN DEFAULT false,
  strategy_data JSONB,
  strategy_generated_at TIMESTAMP WITH TIME ZONE,
  blueprint_completed BOOLEAN DEFAULT false,
  blueprint_completed_at TIMESTAMP WITH TIME ZONE,
  access_token VARCHAR(255),
  day_3_email_sent BOOLEAN DEFAULT false,
  day_7_email_sent BOOLEAN DEFAULT false,
  day_14_email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_blueprint_subscribers_created_at ON blueprint_subscribers(created_at DESC);
CREATE INDEX idx_blueprint_subscribers_day3_email ON blueprint_subscribers(day_3_email_sent, created_at) WHERE day_3_email_sent = FALSE;
CREATE INDEX idx_blueprint_subscribers_day7_email ON blueprint_subscribers(day_7_email_sent, created_at) WHERE day_7_email_sent = FALSE;
CREATE INDEX idx_blueprint_subscribers_day14_email ON blueprint_subscribers(day_14_email_sent, created_at) WHERE day_14_email_sent = FALSE;
```

**Purpose:**
- Legacy table for blueprint funnel (pre-unified wizard)
- Still used as fallback for template selection
- Linked to `user_id` when available

---

### 1.4 - User Personal Brand Table

**Source File:** `scripts/05-create-brand-tables.sql`

**Relevant Fields for Feed Planner:**

```sql
CREATE TABLE user_personal_brand (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Wizard Data
  settings_preference JSONB,       -- Feed style preference (luxury/minimal/beige)
  visual_aesthetic JSONB,          -- Visual aesthetic array (luxury/minimal/beige/warm/edgy/professional)
  
  -- Physical Preferences
  physical_preferences TEXT,
  
  -- Welcome Wizard
  feed_planner_welcome_shown BOOLEAN DEFAULT false,
  feed_planner_welcome_shown_at TIMESTAMP WITH TIME ZONE,
  
  -- Other fields (brand voice, origin story, etc.)
  -- ... (not relevant to feed planner)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Usage:**
- PRIMARY source for template selection in preview feed creation
- Stores unified wizard data
- Used to determine category/mood for blueprint templates

---

### 1.5 - Other Related Tables

**Instagram Bios:**
```sql
CREATE TABLE instagram_bios (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER NOT NULL REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio_text TEXT NOT NULL,
  emoji_style VARCHAR(50),
  link_text VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Instagram Highlights:**
```sql
CREATE TABLE instagram_highlights (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER NOT NULL REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  image_url TEXT,
  icon_style VARCHAR(50),
  prompt TEXT,
  generation_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Carousel Posts:**
```sql
CREATE TABLE carousel_posts (
  id SERIAL PRIMARY KEY,
  feed_post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  image_url TEXT,
  text_overlay TEXT,
  text_overlay_style JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## SECTION 2: FEED CREATION FLOW

### 2.1 - Free Mode Feed Creation

**Endpoint:** `POST /api/feed/create-free-example`

**File:** `app/api/feed/create-free-example/route.ts`

**Request Body:**
- None (uses authenticated user session)

**Process:**

1. **Authentication:**
   - Uses `getAuthenticatedUserWithRetry()`
   - Maps to `user_id` via `getUserByAuthId()`

2. **Check Existing Feed:**
   ```typescript
   // Returns existing feed if found (no duplicate creation)
   SELECT id FROM feed_layouts
   WHERE user_id = ${user.id}
   ORDER BY created_at DESC
   LIMIT 1
   ```

3. **Create Feed Layout:**
   ```sql
   INSERT INTO feed_layouts (
     user_id,
     brand_name,      -- Set to "Preview Feed - {date}"
     username,        -- Set to user.name (lowercase, no spaces)
     description,     -- NULL
     status,          -- 'saved'
     layout_type,     -- 'preview'
     created_by       -- 'manual' (if column exists)
   )
   ```

4. **Template Selection:**
   - **PRIMARY:** Reads from `user_personal_brand`:
     - `settings_preference[0]` → mood (luxury/minimal/beige)
     - `visual_aesthetic[0]` → category (luxury/minimal/beige/warm/edgy/professional)
   - **FALLBACK:** Reads from `blueprint_subscribers`:
     - `form_data.vibe` → category
     - `feed_style` → mood
   - **Template Key:** `${category}_${mood}`
   - **Source:** `lib/maya/blueprint-photoshoot-templates.ts`
   - **Validation:** Calls `validateBlueprintTemplate()` to check extractability

5. **Create Feed Post:**
   ```sql
   INSERT INTO feed_posts (
     feed_layout_id,
     user_id,
     position,              -- 1
     post_type,             -- 'user'
     image_url,             -- NULL
     caption,               -- NULL
     generation_status,     -- 'pending'
     content_pillar,        -- NULL
     prompt,                -- Template prompt (or NULL if no wizard data)
     generation_mode        -- 'pro' (NanoBanana Pro)
   )
   ```

**Credits Used:**
- **NOT deducted here** - Deducted in `/api/feed/[feedId]/generate-single` when user generates image

**Status Values:**
- `feed_layouts.status`: `'saved'`
- `feed_layouts.layout_type`: `'preview'`
- `feed_posts.generation_status`: `'pending'`
- `feed_posts.generation_mode`: `'pro'`

**Preview Template:**
- **Stored:** `feed_posts[0].prompt` (first post's prompt field)
- **Selected:** Based on `user_personal_brand` or `blueprint_subscribers` data
- **Format:** Full blueprint template prompt (can be extracted for locked aesthetic)

**Response:**
```json
{
  "feedId": number,
  "feed": { /* feed_layouts row */ },
  "posts": [ /* feed_posts row */ ]
}
```

---

### 2.2 - Paid Mode Feed Expansion

**Endpoint:** `POST /api/feed/expand-for-paid`

**File:** `app/api/feed/expand-for-paid/route.ts`

**Status:** ✅ **IMPLEMENTED**

**Request Body:**
```typescript
{
  feedId: number  // Required
}
```

**Process:**

1. **Authentication:**
   - Uses `getAuthenticatedUserWithRetry()`
   - Maps to `user_id` via `getUserByAuthId()`

2. **Check Existing Posts:**
   ```sql
   SELECT position
   FROM feed_posts
   WHERE feed_layout_id = ${feedId}
   ORDER BY position ASC
   ```

3. **Create Missing Positions:**
   - Creates positions 2-12 (3x4 grid, extended from 2-9)
   - Only creates positions that don't exist
   - For each position:
     ```sql
     INSERT INTO feed_posts (
       feed_layout_id,
       user_id,
       position,              -- 2-12
       post_type,             -- 'photo'
       generation_status,     -- 'pending'
       generation_mode,       -- 'pro'
       created_at,
       updated_at
     )
     ```

4. **Status Update:**
   - ❌ **Does NOT update `layout_type`** - Remains as 'preview' or original value
   - ❌ **Does NOT copy template prompt** - New posts have NULL prompt

**Trigger:**
- **Automatic:** Called from `feed-view-screen.tsx` when:
  - User is paid blueprint (`access.isPaidBlueprint`)
  - Feed exists and has data
  - Feed has only 1 post (free tier)
  - Not already expanding
- **Manual:** Can be called directly via API

**Response:**
```json
{
  "success": true,
  "positionsCreated": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
}
```

**Note:** This is a **client-side fallback** when webhook expansion fails or user upgrades before webhook completes.

---

### 2.3 - New Feed Creation (Multi-Feed)

**Endpoint:** `POST /api/feed/create-manual`

**File:** `app/api/feed/create-manual/route.ts`

**Status:** ✅ **IMPLEMENTED**

**Request Body:**
```typescript
{
  title?: string  // Optional, defaults to "My Feed - {date}"
}
```

**Process:**

1. **Authentication:**
   - Uses `getAuthenticatedUserWithRetry()`
   - Maps to `user_id` via `getUserByAuthId()`

2. **Create Feed Layout:**
   ```sql
   INSERT INTO feed_layouts (
     user_id,
     brand_name,      -- Set to title or "My Feed - {date}"
     username,        -- Set to user.name (lowercase, no spaces)
     description,     -- NULL
     status,          -- 'saved'
     layout_type,     -- 'grid_3x4' (12-post grid)
     created_by       -- 'manual' (if column exists)
   )
   ```

3. **Create Feed Posts:**
   - Creates 9 empty posts (positions 1-9)
   - All fields NULL except:
     - `position`: 1-9
     - `post_type`: 'user'
     - `generation_status`: 'pending'

**UI Trigger:**
- **Component:** `components/feed-planner/feed-header.tsx`
- **Button:** "Create New Feed" button (Plus icon)
- **Function:** `handleCreateNewFeed()`
- **Navigation:** Redirects to `/feed-planner?feedId={feedId}`

**Aesthetic Selection:**
- ❌ **No aesthetic selection modal** - Creates empty feed
- User can add images manually or generate later

**Response:**
```json
{
  "feedId": number,
  "feed": { /* feed_layouts row */ },
  "posts": [ /* 9 feed_posts rows */ ]
}
```

**Actual Implementation:** ✅ **FULLY IMPLEMENTED**

---

## SECTION 3: FEED MANAGEMENT & ORGANIZATION

### 3.1 - Feed List/History

**Endpoint:** `GET /api/feed/list`

**File:** `app/api/feed/list/route.ts`

**Query Parameters:**
- None found in code

**Response Structure:**
```typescript
// Expected (needs verification)
{
  feeds: Array<{
    id: number,
    title: string,
    status: string,
    layout_type: string,
    created_at: string,
    // ... other feed_layouts fields
  }>
}
```

**Filtering:**
- **By layout_type:** Excludes `'preview'` feeds for paid users
- **By user_id:** Only user's own feeds
- **Order:** `ORDER BY created_at DESC`

**UI Display:**
- **Component:** Needs verification
- **Location:** Needs verification
- **Features:**
  - Feed switching: ❓ Needs verification
  - Feed renaming: ❓ Needs verification
  - Color coding: ✅ Database field exists (`display_color`)
  - Delete feed: ❓ Needs verification

---

### 3.2 - Feed Switcher

**Component:** `components/feed-planner/feed-view-screen.tsx` (fetches feed list)
**Header Component:** `components/feed-planner/feed-header.tsx` (likely contains selector)

**Status:** 🚧 **PARTIALLY IMPLEMENTED**

**Features:**
- ✅ **Fetches feed list:** Yes (calls `/api/feed/list` via SWR)
- ✅ **Shows feed status:** Yes (in feed list response)
- ✅ **Shows feed metadata:** title, layout_type, post_count, image_count, display_color
- ✅ **Cache invalidation:** Yes (mutates feed list after creating new feed)
- ❓ **UI dropdown/selector:** Needs verification (code suggests it exists in FeedHeader)
- ❓ **Click to switch:** Needs verification

**Code Evidence:**
- `feed-view-screen.tsx:95-104` - SWR hook for feed list
- `feed-view-screen.tsx:246` - "Invalidate feed list cache so selector appears immediately"
- `feed-view-screen.tsx:397` - "FeedHeader component inside InstagramFeedView handles header with feed selector"
- `feed-header.tsx` - Contains feed header logic (needs full review for selector)

**Feed List Response:**
```typescript
{
  feeds: Array<{
    id: number,
    title: string,
    created_at: string,
    status: string,
    layout_type: string,
    post_count: number,
    image_count: number,
    display_color: string | null,
    preview_image_url: string | null  // For preview feeds
  }>
}
```

**Actual Implementation:** 🚧 **PARTIAL** (backend ready, UI component needs full review)

---

### 3.3 - Feed Organization Features

**Color Coding:**
- ✅ **Database field exists:** `feed_layouts.display_color` (VARCHAR(7), hex color)
- ✅ **API endpoint:** `PATCH /api/feed/[feedId]/update-metadata` (accepts `display_color`)
- ❓ **UI for selecting color:** Needs verification (API ready)

**Renaming:**
- ✅ **Database field exists:** `feed_layouts.title` or `feed_layouts.brand_name`
- ✅ **API endpoint:** `PATCH /api/feed/[feedId]/update-metadata` (accepts `title`)
- ❓ **UI for renaming:** Needs verification (API ready)

**Update Metadata Endpoint:**
- **Route:** `PATCH /api/feed/[feedId]/update-metadata`
- **File:** `app/api/feed/[feedId]/update-metadata/route.ts`
- **Request Body:**
  ```typescript
  {
    title?: string,
    display_color?: string  // Hex color (e.g., "#ec4899")
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "feed": {
      "id": number,
      "title": string,
      "display_color": string | null
    }
  }
  ```

**Sorting:**
- ❓ **Can feeds be sorted?** Unknown (not found in code)
- ❓ **By what criteria?** Unknown

**Feed Deletion:**
- ✅ **API endpoint:** `DELETE /api/feed/[feedId]`
- **File:** `app/api/feed/[feedId]/route.ts`
- **Process:**
  1. Deletes `feed_posts` (cascade)
  2. Deletes `instagram_highlights`
  3. Deletes `instagram_bios`
  4. Deletes `feed_layouts`
- **Authorization:** Only deletes feeds owned by user
- ❓ **UI for deletion:** Needs verification

**Actual Implementation Status:**
- Color coding: ✅ **API Ready** (database + API exist, UI needs verification)
- Renaming: ✅ **API Ready** (database + API exist, UI needs verification)
- Feed deletion: ✅ **API Ready** (endpoint exists, UI needs verification)
- Sorting: ❓ **Unknown**

---

## SECTION 4: WIZARDS & ONBOARDING

### 4.1 - Unified Onboarding Wizard

**Component:** `components/onboarding/unified-onboarding-wizard.tsx`

**Status:** ✅ **FULLY IMPLEMENTED**

**Total Steps:** 8 steps (including welcome)

**Step-by-Step Breakdown:**

**Step 0: Welcome**
- Purpose: Introduction screen
- Fields: None (welcome message)
- Validation: Always can proceed

**Step 1: Business Type**
- Purpose: Collect business type
- Fields: `businessType` (text input)
- Validation: Required (must have value)
- Subtitle: "Step 1 of 8"

**Step 2: Audience Builder**
- Purpose: Collect ideal audience information
- Fields: 
  - `idealAudience` (text)
  - `audienceChallenge` (text)
  - `audienceTransformation` (text)
- Validation: `idealAudience` required
- Subtitle: "Step 2 of 8"
- Type: `isAudienceBuilder: true`

**Step 3: Story**
- Purpose: Collect transformation story
- Fields: `transformationStory` (textarea)
- Validation: Required
- Subtitle: "Step 3 of 8"
- Type: `isTextarea: true`

**Step 4: Visual Style**
- Purpose: Select visual aesthetic and feed style
- Fields:
  - `visualAesthetic` (array) - Multiple selection from:
    - "minimal", "luxury", "warm", "edgy", "professional", "beige"
  - `feedStyle` (single selection) - From:
    - "luxury" (Dark & Moody)
    - "minimal" (Light & Minimalistic)
    - "beige" (Beige Aesthetic)
- Validation: Both required (`visualAesthetic.length > 0 && feedStyle.length > 0`)
- Subtitle: "Step 4 of 8"
- Type: `isVisualSelector: true`

**Step 5: Selfie Upload**
- Purpose: Upload selfie images for training
- Fields: `selfieImages` (array of image URLs)
- Validation: Required (at least 1 image)
- Subtitle: "Step 5 of 8"
- Type: `isSelfieUpload: true`
- Component: `BlueprintSelfieUpload`

**Step 6: Optional Details**
- Purpose: Collect optional brand information
- Fields:
  - `currentSituation` (text)
  - `futureVision` (text)
  - `fashionStyle` (array) - Multiple selection
  - `brandInspiration` (text)
  - `inspirationLinks` (text)
- Validation: All optional
- Subtitle: "Step 6 of 8"
- Type: `isOptional: true`

**Step 7: Brand Pillars (Optional)**
- Purpose: Create content pillars
- Fields: `contentPillars` (array of objects)
  - Each pillar: `{ name, description, contentIdeas[] }`
- Validation: Optional
- Subtitle: "Step 7 of 8 (Optional)"
- Type: `isBrandPillars: true`
- Can generate pillars with AI

**Data Storage:**
- **API Endpoint:** `POST /api/onboarding/unified-onboarding-complete`
- **Table:** `user_personal_brand`
- **Fields Stored:**
  - `settings_preference` (JSONB) - Contains `feedStyle`
  - `visual_aesthetic` (JSONB) - Contains `visualAesthetic` array
  - Other brand fields (business type, audience, story, etc.)

**Completion:**
- Saves data to `user_personal_brand` table
- Calls `onComplete()` callback with all form data
- May redirect to feed planner (handled by parent component)
- Does NOT automatically create preview feed

**Actual Implementation:** ✅ **FULLY IMPLEMENTED**

---

### 4.2 - Welcome Wizard (Paid Users)

**Component:** `components/feed-planner/welcome-wizard.tsx`

**Status:** ✅ **FULLY IMPLEMENTED**

**Trigger Condition:**
- Checks `user_personal_brand.feed_planner_welcome_shown`
- API: `GET /api/feed-planner/welcome-status`
- Shows if `feed_planner_welcome_shown === false`

**Steps:** Interactive tutorial with multiple steps

**Key Features:**
- ✅ **Detects preview feed:** Checks if user has preview feed from free tier
- ✅ **Preview image display:** Shows preview image if available
- ✅ **Style options:** 
  - "Use preview style" - Creates feed with existing data
  - "Choose new style" - Opens onboarding wizard at step 4
- ✅ **Progress indicator:** Shows step progress
- ✅ **Dismissible:** Can be dismissed or completed

**Completion:**
- Sets `feed_planner_welcome_shown = true`
- Updates `feed_planner_welcome_shown_at = NOW()`
- Calls `onComplete()` callback
- API: `POST /api/feed-planner/welcome-status` (updates database)

**Actual Implementation:** ✅ **FULLY IMPLEMENTED**

---

### 4.3 - Brand Profile Wizard

**Status:** ❓ **NEEDS VERIFICATION**

**May be part of:**
- Unified onboarding wizard
- Settings page
- Separate component

**Fields Collected:**
- Business type
- Target audience
- Brand vibe
- Color preferences
- Physical preferences

**Storage:**
- `user_personal_brand` table

**Usage:**
- Used for feed generation (template selection)
- Used for Maya context

---

## SECTION 5: IMAGE GENERATION

### 5.1 - Preview Grid Generation (Free)

**Endpoint:** `POST /api/feed/[feedId]/generate-single`

**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Trigger:**
- User clicks "Generate" button on preview post
- Button in `components/feed-planner/feed-single-placeholder.tsx`

**Process:**

1. **Access Control:**
   - Calls `getFeedPlannerAccess(userId)`
   - Determines free vs paid status

2. **Template Selection:**
   - Reads `feed_posts[0].prompt` (template prompt)
   - If missing, looks for preview feed with `layout_type = 'preview'`
   - Extracts aesthetic using `extractAestheticFromTemplate()`

3. **Prompt Construction:**
   - **Free Mode:** Always uses Pro Mode (NanoBanana Pro)
   - **Locked Aesthetic:** Extracted from template
   - **Maya Integration:** Calls `/api/maya/generate-feed-prompt` with `lockedAesthetic`
   - **Three-Part Structure:**
     - Base identity prompt (fixed)
     - Maya creative variation
     - Assembly + quality modifiers

4. **Generation:**
   - Uses `generateWithNanoBanana()` from `lib/nano-banana-client.ts`
   - Model: `google/nano-banana-pro`
   - Resolution: 2K (free users)
   - Aspect ratio: 9:16 (portrait)

5. **Credit Deduction:**
   - Cost: `getStudioProCreditCost()` (2 credits for 2K)
   - Timing: Before generation
   - Refund: On failure (needs verification)

6. **Storage:**
   - Image URL stored in `feed_posts.image_url`
   - Status updated to `'completed'`
   - Error stored in `feed_posts.error` if failed

**Template System:**
- **Location:** `lib/maya/blueprint-photoshoot-templates.ts`
- **Structure:** Full prompt with Vibe, Setting, Outfits, Color grade, Lighting
- **Selection:** Based on `user_personal_brand` or `blueprint_subscribers`

**Credit Usage:**
- **Cost:** 2 credits (2K resolution, Pro Mode)
- **Deduction:** Before generation (in `generate-single` endpoint)
- **Refund:** ❓ Needs verification (likely on failure)
- **Function:** `getStudioProCreditCost("2K")` returns 2

**Result:**
- Image stored in Vercel Blob (via `generateWithNanoBanana`)
- Database: `feed_posts.image_url` updated
- Status: `feed_posts.generation_status = 'completed'`

---

### 5.2 - Individual Image Generation (Paid)

**Endpoint:** Same: `POST /api/feed/[feedId]/generate-single`

**Detection of Paid User:**
- `access.isPaidBlueprint` from `getFeedPlannerAccess()`
- Code location: `app/api/feed/[feedId]/generate-single/route.ts:165`

**Maya Integration:**
- ✅ **Is Maya called:** Yes
- **Endpoint:** `/api/maya/generate-feed-prompt`
- **Mode parameter:** `proMode: true`
- **Locked aesthetic:** ✅ Passed (from template extraction)

**Prompt Construction:**
- ✅ **Maya variation:** Yes (creative variation only)
- ✅ **Template-based:** Yes (locked aesthetic)
- ✅ **Hybrid:** Yes (Maya generates variation, template provides base)

**NanoBanana Prompt Structure:**
- ✅ **Has base identity prompt:** Yes
  ```typescript
  "Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications."
  ```
  - Source: `lib/feed-planner/extract-aesthetic-from-template.ts:getBaseIdentityPrompt()`
  - Fixed for all NanoBanana Pro generations

- ✅ **Has assembly modifier:** Yes
  - Extracted from template: `lockedAesthetic.assembly`
  - Format: `"luxury_dark_moody"`, `"minimal_light_minimalistic"`, `"beige_beige_aesthetic"`, etc.
  - Source: `lib/feed-planner/extract-aesthetic-from-template.ts:extractAssembly()`

- ✅ **Has quality modifiers:** Yes
  - Extracted from template: `lockedAesthetic.qualityModifiers`
  - Format: `"professional photography, high detail"`
  - Source: `lib/feed-planner/extract-aesthetic-from-template.ts:extractQualityModifiers()`

- ✅ **Three-part structure:** Yes
  ```typescript
  `${baseIdentity}

  ${variation}, in ${setting}, wearing ${outfit}, ${lighting}, ${colorGrade}.

  Assembly: ${assembly}
  ${quality}`
  ```
  - Source: `app/api/maya/generate-feed-prompt/route.ts:assembleNanoBananaPrompt()`
  - Validation logging: Enhanced in recent updates

**Credit Usage:**
- **Cost:** 2 credits (2K), 4 credits (4K)
- **Different from free:** Same cost structure
- **Code:** `getStudioProCreditCost(resolution)`

**Current Issues:**
- ✅ **Generated images match preview:** Yes (locked aesthetic enforced)
- ✅ **Consistency across positions:** Yes (same template, Maya variations)

---

## SECTION 6: CREDIT SYSTEM

### 6.1 - Credit Display

**API Endpoint:** Needs verification (likely `/api/credits/balance`)

**Display Locations:**
- ✅ **Header:** Needs verification
- ✅ **Feed planner:** Needs verification
- **Component:** Needs verification

**Update Frequency:**
- ❓ **Real-time:** Unknown
- ✅ **On page load:** Likely
- ✅ **After actions:** Likely
- ❓ **Polling:** Unknown

---

### 6.2 - Credit Deduction

**Function/File:** `lib/credits.ts`

**Credit Costs:**
```typescript
export const CREDIT_COSTS = {
  TRAINING: 20,      // $3.00 / $0.15 per credit
  IMAGE: 1,          // $0.15 per credit
  ANIMATION: 3,      // Video/B-roll generation
}
```

**NanoBanana Pro Costs:**
- **Function:** `getStudioProCreditCost(resolution)` from `lib/nano-banana-client.ts`
- **2K resolution:** 2 credits
- **4K resolution:** 4 credits
- **1K resolution:** 1 credit (assumed)

**Preview Generation:**
- **Cost:** 2 credits (2K resolution, Pro Mode)
- **Deduction timing:** Before generation
- **Code location:** `app/api/feed/[feedId]/generate-single/route.ts` (calls `deductCredits()`)
- **Function:** `deductCredits(userId, amount, 'image')`

**Individual Image (Paid):**
- **Cost:** 2 credits (2K), 4 credits (4K)
- **Deduction timing:** Before generation
- **Code location:** Same as above
- **Mode:** Pro Mode (NanoBanana Pro) for paid blueprint users

**Transaction Recording:**
- **Table:** `credit_transactions` (assumed, needs verification)
- **Fields:** Needs verification (likely: user_id, amount, type, created_at)

**Refund Logic:**
- ❓ **Exists:** Needs verification
- ❓ **When triggered:** Needs verification (likely on generation failure)

---

### 6.3 - Credit Top-Up

**Status:** ✅ **FULLY IMPLEMENTED**

**Purchase Components:**
- **Dialog:** `components/credits/buy-credits-dialog.tsx`
- **Modal:** `components/sselfie/buy-credits-modal.tsx`
- **Low Credit Warning:** `components/credits/low-credit-warning.tsx`
- **Low Credit Modal:** `components/credits/low-credit-modal.tsx`

**Credit Packages:**
- **Source:** `lib/products.ts`
- **Interface:**
  ```typescript
  export interface CreditPackage {
    id: string
    name: string
    credits: number
    price: number
    priceId: string  // Stripe price ID
    popular?: boolean
  }
  ```
- **Packages:** Defined in `CREDIT_TOPUP_PACKAGES` array
- **Function:** `getCreditPackageById(packageId)` to retrieve package

**Stripe Integration:**
- **Action:** `app/actions/stripe.ts:startCreditCheckoutSession()`
- **Checkout:** Uses Stripe Embedded Checkout
- **Product Type:** `"credit_topup"` in metadata
- **Flow:**
  1. User selects package
  2. Calls `startCreditCheckoutSession(packageId, promoCode?)`
  3. Creates Stripe checkout session
  4. Embedded checkout displayed
  5. On completion: Redirects to `/checkout/success?type=credit_topup`

**Webhook:**
- **Route:** `/api/webhooks/stripe/route.ts`
- **Credit Grant Logic:**
  - Detects `productType === "credit_topup"` or `package_id.includes("credit")`
  - Grants credits to user account
  - Records transaction
- **Events Handled:**
  - `checkout.session.completed` - Grants credits
  - Sends confirmation email
  - Logs to `email_logs` table

**Email Confirmation:**
- **Template:** `lib/email/templates/welcome-email.tsx`
- **Subject:** "Your {credits} credits have been added!"
- **Tags:** `["credit-topup", "purchase-confirmation"]`

**Actual Implementation:** ✅ **FULLY IMPLEMENTED**

---

## SECTION 7: FEED PLANNER UI

### 7.1 - Main Feed Planner Screen

**Route:** `/feed-planner` or `/feed/[feedId]`

**Main Component:** Needs verification

**Layout Structure:**
- **Header:** `components/feed-planner/feed-header.tsx`
- **Main area:** `components/feed-planner/feed-grid.tsx`
- **Sidebar:** Unknown

**Tabs/Sections:**
- ✅ **Grid:** `components/feed-planner/feed-grid.tsx`
- ✅ **Posts:** `components/feed-planner/feed-posts-list.tsx`
- ✅ **Strategy:** `components/feed-planner/feed-strategy.tsx`
- ✅ **Captions:** `components/feed-planner/feed-caption-card.tsx`
- ✅ **Bio:** Likely in strategy or separate
- ✅ **Highlights:** `components/feed-planner/feed-highlights-modal.tsx`

**Grid Component:**
- **File:** `components/feed-planner/feed-grid.tsx`
- **Layout:** Needs verification (likely `grid-cols-3`)
- **Positions:** 1-9 (or 1-12)
- **Responsive:** Needs verification

---

### 7.2 - Feed Placeholder Component

**File:** `components/feed-planner/feed-single-placeholder.tsx`

**States:**
- **Empty/pending:** Needs verification
- **Generating:** Needs verification
- **Completed:** Needs verification
- **Failed:** Needs verification

**Free Mode (Preview):**
- ✅ **Shows preview grid:** Yes (9:16 aspect ratio)
- ✅ **Upsell button:** Needs verification

**Paid Mode:**
- ✅ **Generate button:** Yes
- ✅ **Credit check:** Before generation
- ✅ **Maya integration:** Yes

**Upsell Modal:**
- **Component:** `components/feed-planner/free-mode-upsell-modal.tsx`
- **Trigger:** Needs verification

---

### 7.3 - Feed Header/Navigation

**Component:** `components/feed-planner/feed-header.tsx`

**Elements:**
- ❓ **Feed selector/dropdown:** Needs verification
- ❓ **"Create New Feed" button:** Needs verification
- ✅ **Credit display:** Likely
- ❓ **Settings/actions:** Needs verification

**Feed Switching:**
- ❓ **Implemented:** Needs verification
- ❓ **UI:** Needs verification
- ❓ **Updates grid:** Needs verification

---

## SECTION 8: ACCESS CONTROL

### 8.1 - Free vs Paid Detection

**Function/File:** `lib/feed-planner/access-control.ts`

**Paid User Detection:**
- ✅ **Checks subscription table:** Yes (via `hasPaidBlueprint()` and `hasStudioMembership()`)
- ✅ **Checks blueprint_subscribers:** Yes (via `hasPaidBlueprint()`)
- **Check logic:**
  ```typescript
  const hasPaid = await hasPaidBlueprint(userId)
  const hasMembership = await hasStudioMembership(userId)
  const isMembership = hasMembership
  const isPaidBlueprint = hasPaid && !hasMembership
  const isFree = !hasMembership && !hasPaid
  ```

**Access Object Structure:**
```typescript
export interface FeedPlannerAccess {
  isFree: boolean
  isPaidBlueprint: boolean
  isOneTime: boolean          // Deprecated, always false
  isMembership: boolean
  hasGalleryAccess: boolean
  canGenerateImages: boolean
  canGenerateCaptions: boolean
  canGenerateStrategy: boolean
  canGenerateBio: boolean
  canGenerateHighlights: boolean
  maxFeedPlanners: number | null  // null = unlimited, 3 for paid blueprint
  placeholderType: "single" | "grid"  // "single" = 9:16, "grid" = 3x3
}
```

**Feature Access:**
- **Gallery access:** `isPaidBlueprint || isMembership || isOneTime`
- **Generation features:** `isPaidBlueprint || isMembership || isOneTime`
- **Feed planner limits:** Paid blueprint = 3, others = unlimited (null)
- **Placeholder type:** Free = "single" (9:16), others = "grid" (3x3)

**Used Where:**
- ✅ **Feed generation endpoints:** Yes (`/api/feed/[feedId]/generate-single`)
- ✅ **Feed list endpoint:** Yes (`/api/feed/list` - filters preview feeds)
- ✅ **UI components:** Likely (passed as `access` prop)
- ✅ **Feature gating:** Yes

---

### 8.2 - Feature Restrictions

**Free User Can:**
- ✅ Create preview feed (1 post, `layout_type: 'preview'`)
- ✅ Generate preview image (2 credits, Pro Mode)
- ✅ View preview grid (9:16 aspect ratio)
- ✅ See preview feed in feed list

**Free User Cannot:**
- ❌ Generate positions 2-9 (needs upgrade)
- ❌ Access gallery (`hasGalleryAccess: false`)
- ❌ Generate captions (`canGenerateCaptions: false`)
- ❌ Generate strategy (`canGenerateStrategy: false`)
- ❌ Generate bio (`canGenerateBio: false`)
- ❌ Generate highlights (`canGenerateHighlights: false`)
- ❌ Create full feeds (only preview feeds)

**Paid Blueprint User Can:**
- ✅ Create full feeds (9 posts, `layout_type: 'grid_3x4'`)
- ✅ Generate all positions (all 9 posts)
- ✅ Use Maya integration (locked aesthetic)
- ✅ Access gallery (`hasGalleryAccess: true`)
- ✅ Generate captions, strategy, bio, highlights
- ✅ Create up to 3 feed planners (`maxFeedPlanners: 3`)

**Membership User Can:**
- ✅ Everything paid blueprint can do
- ✅ Unlimited feed planners (`maxFeedPlanners: null`)
- ✅ 200 credits/month (`SUBSCRIPTION_CREDITS.sselfie_studio_membership`)

**Paid User Cannot:**
- ❌ No known restrictions (all features available)

---

## SECTION 9: API ENDPOINTS SUMMARY

### Feed Creation
- `POST /api/feed/create-free-example` - Create preview feed
- `POST /api/feed/create-manual` - Create new feed (multi-feed)
- `POST /api/feed/expand-for-paid` - Expand preview to full feed (needs verification)

### Feed Management
- `GET /api/feed/list` - List user's feeds
- `GET /api/feed/latest` - Get latest feed
- `GET /api/feed/[feedId]` - Get specific feed
- `POST /api/feed/[feedId]/update-metadata` - Update feed metadata
- `POST /api/feed/[feedId]/reorder` - Reorder posts

### Image Generation
- `POST /api/feed/[feedId]/generate-single` - Generate single image
- `POST /api/feed/[feedId]/generate-images` - Generate multiple images
- `POST /api/feed/[feedId]/regenerate-post` - Regenerate specific post
- `GET /api/feed/[feedId]/progress` - Check generation progress
- `GET /api/feed/[feedId]/check-post` - Check post status

### Maya Integration
- `POST /api/maya/generate-feed-prompt` - Generate prompt with locked aesthetic

### Credits
- `GET /api/credits/balance` - Get credit balance (assumed)

### Access/Status
- `GET /api/feed/[feedId]/status` - Get feed status
- `GET /api/feed-planner/welcome-status` - Check welcome wizard status

### Other
- `POST /api/feed/[feedId]/generate-captions` - Generate captions
- `POST /api/feed/[feedId]/generate-bio` - Generate bio
- `POST /api/feed/[feedId]/generate-highlights` - Generate highlights
- `POST /api/feed/[feedId]/add-caption` - Add caption
- `POST /api/feed/[feedId]/update-caption` - Update caption
- `POST /api/feed/[feedId]/generate-strategy` - Generate strategy
- `POST /api/feed/[feedId]/add-strategy` - Add strategy

---

## SECTION 10: GAPS & MISSING FEATURES

### Features Discussed But NOT Implemented

**Feed Organization:**
- 🚧 **Color coding feeds:** Partial (database field exists, UI unknown)
- 🚧 **Renaming feeds:** Partial (database field exists, UI unknown)
- ❓ **Feed sorting:** Unknown

**Credit Top-Up:**
- ❓ **Purchase page:** Unknown
- ❓ **Credit packages:** Unknown
- ❓ **Stripe integration:** Unknown

**Multi-Feed:**
- 🚧 **Create new feed UI:** Partial (endpoint exists, UI unknown)
- ❓ **Feed selector:** Unknown
- ✅ **Aesthetic selection per feed:** Yes (via template selection)

**Maya Integration:**
- ✅ **Locked aesthetic:** Yes (implemented)
- ✅ **Three-part prompt:** Yes (implemented)
- ✅ **Assembly modifiers:** Yes (implemented)

**Wizards:**
- ✅ **Welcome wizard:** Yes (component exists)
- ✅ **Brand profile:** Yes (part of unified wizard)
- ✅ **Unified onboarding:** Yes (component exists)

**Other:**
- ❓ **Feed deletion:** Unknown
- ❓ **Feed duplication:** Unknown
- ❓ **Feed export:** Unknown

---

## SUMMARY

### ✅ Fully Implemented
- **Database schema:** feed_layouts, feed_posts, blueprint_subscribers, user_personal_brand
- **Preview feed creation:** `/api/feed/create-free-example` (creates 1 post, layout_type: 'preview')
- **Multi-feed creation:** `/api/feed/create-manual` (creates 9 posts, layout_type: 'grid_3x4')
- **Paid feed expansion:** `/api/feed/expand-for-paid` (creates positions 2-12)
- **Template-based prompt system:** Blueprint templates with validation
- **Maya integration:** Locked aesthetic extraction and three-part prompt assembly
- **Three-part NanoBanana prompt structure:** Base identity + variation + assembly/quality
- **Credit deduction system:** Before generation, 2 credits for Pro Mode
- **Image generation:** Free (preview) and paid (full feeds)
- **Welcome wizard:** Component exists, detects preview feed, style selection
- **Unified onboarding wizard:** 8 steps, saves to user_personal_brand
- **Access control:** Free vs paid detection, feature gating
- **Feed list API:** `/api/feed/list` with filtering and post counts

### 🚧 Partially Implemented
- **Feed organization:** Database fields exist (`display_color`, `title`), UI needs verification
- **Feed switcher:** Backend ready (feed list API), UI component needs verification
- **Feed renaming:** Database field exists, UI needs verification
- **Credit display:** API exists, display locations need verification

### ❓ Unknown/Needs Verification
- **Credit top-up system:** Purchase page, packages, Stripe integration
- **Feed deletion:** API endpoint and UI
- **Feed renaming UI:** Component location
- **Feed color selection UI:** Component location
- **Feed switcher UI:** Component implementation details
- **Credit refund logic:** When triggered, how implemented
- **Feed export:** Download functionality

---

## KEY FINDINGS

### Database Schema
- ✅ **feed_layouts:** 30+ columns including aesthetic, organization, photoshoot fields
- ✅ **feed_posts:** 20+ columns including generation, scheduling, metadata fields
- ✅ **blueprint_subscribers:** Legacy table, still used as fallback
- ✅ **user_personal_brand:** Primary source for wizard data

### Feed Creation
- ✅ **Free mode:** Creates preview feed (1 post, layout_type: 'preview')
- ✅ **Paid mode:** Creates full feed (9 posts, layout_type: 'grid_3x4')
- ✅ **Expansion:** Client-side fallback creates positions 2-12

### Image Generation
- ✅ **Free users:** Pro Mode (NanoBanana Pro), 2 credits, 2K resolution
- ✅ **Paid users:** Pro Mode (NanoBanana Pro), 2 credits, 2K resolution
- ✅ **Locked aesthetic:** Extracted from template, enforced via Maya
- ✅ **Three-part prompts:** Fully implemented with validation logging

### Wizards
- ✅ **Unified onboarding:** 8 steps, saves to user_personal_brand
- ✅ **Welcome wizard:** Detects preview feed, style selection options
- ✅ **Brand profile:** Part of unified wizard

### Access Control
- ✅ **Free users:** Can create preview feeds, generate 1 image
- ✅ **Paid blueprint:** Can create 3 feeds, generate all positions
- ✅ **Membership:** Unlimited feeds, 200 credits/month

---

**Next Steps:**
1. ✅ Database schema documented
2. ✅ Feed creation flows documented
3. ✅ Image generation flows documented
4. ✅ Wizards documented
5. ⚠️ UI components need verification (feed switcher, renaming, color selection)
6. ⚠️ Credit top-up system needs verification
7. ⚠️ Feed deletion needs verification
