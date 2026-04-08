# Feed Planner Architecture - Master Documentation

**Last Updated:** January 2025  
**Status:** ✅ Current Implementation  
**Purpose:** Complete reference for Feed Planner system architecture, covering all user types and feed types

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [User Types & Access Levels](#user-types--access-levels)
3. [Feed Types](#feed-types)
4. [Dynamic Template System](#dynamic-template-system)
5. [Prompt Generation Pipeline](#prompt-generation-pipeline)
6. [Credit System](#credit-system)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [UI Components](#ui-components)
10. [User Flows](#user-flows)

---

## SYSTEM OVERVIEW

The Feed Planner is SSELFIE's Instagram feed generation system that allows users to create aesthetic, cohesive Instagram feeds. The system supports three user types (free, paid blueprint, membership) and two feed types (preview feeds, full feeds).

### Key Features
- **Preview Feeds:** Single 9:16 image showing feed aesthetic (free users)
- **Full Feeds:** 9 individual posts in a 3x3 grid (paid blueprint users)
- **Dynamic Template Injection:** Personalized outfits, locations, accessories based on user's fashion style
- **Rotation System:** Prevents duplicate content across multiple feeds
- **Credit-Based Generation:** 2 credits per image (Pro Mode, 2K resolution)

---

## USER TYPES & ACCESS LEVELS

### Free Users

**Access Control:**
- `isFree: true`
- `canGenerateImages: false` (unless they have credits)
- `hasGalleryAccess: false`
- `placeholderType: "single"` (9:16 aspect ratio)
- `maxFeedPlanners: null` (unlimited preview feeds)

**Capabilities:**
- ✅ Create preview feeds (`layout_type: 'preview'`)
- ✅ Generate ONE preview image (9:16, all 9 scenes in one image)
- ✅ Purchase credits to generate more preview feeds
- ❌ Cannot create full feeds (3x3 grid)
- ❌ Cannot access gallery
- ❌ Cannot generate captions, strategy, bio, highlights

**Credit Allocation:**
- Free users receive 2 credits on signup (for testing)
- Can purchase additional credits via credit top-up packages

**UI Restrictions:**
- "New Feed" button is hidden
- Only "New Preview" button visible
- Single placeholder displayed (not 3x3 grid)

---

### Paid Blueprint Users

**Access Control:**
- `isPaidBlueprint: true`
- `canGenerateImages: true`
- `hasGalleryAccess: true`
- `placeholderType: "grid"` (3x3 grid)
- `maxFeedPlanners: 3` (limited to 3 full feeds)

**Capabilities:**
- ✅ Create preview feeds (optional)
- ✅ Create full feeds (`layout_type: 'grid_3x4'`)
- ✅ Generate all 9 individual posts (one scene per image)
- ✅ Access gallery
- ✅ Generate captions, strategy, bio, highlights
- ✅ Use dynamic template injection with rotation

**Credit Usage:**
- 2 credits per image (Pro Mode, 2K resolution)
- 4 credits per image (Pro Mode, 4K resolution)

**UI Features:**
- "New Feed" button visible
- "New Preview" button visible
- 3x3 grid displayed for full feeds
- All generation features enabled

---

### Membership Users

**Access Control:**
- `isMembership: true`
- `canGenerateImages: true`
- `hasGalleryAccess: true`
- `placeholderType: "grid"` (3x3 grid)
- `maxFeedPlanners: null` (unlimited feeds)

**Capabilities:**
- ✅ Everything paid blueprint users can do
- ✅ Unlimited feed planners (no 3-feed limit)
- ✅ 200 credits/month included in subscription

**Credit Usage:**
- Same as paid blueprint (2 credits for 2K, 4 credits for 4K)
- Monthly credit allocation: 200 credits

---

## FEED TYPES

### Preview Feeds (`layout_type: 'preview'`)

**Purpose:** Single 9:16 image showing all 9 scenes in one grid

**Characteristics:**
- **Posts:** 1 post (position 1)
- **Aspect Ratio:** 9:16 (portrait)
- **Template:** Full 9-scene template (all scenes in one prompt)
- **Display:** Single placeholder (not 3x3 grid)
- **Generation:** Uses full injected template (all 9 scenes)
- **Users:** Free users (primary), paid users (optional)

**Creation:**
- Endpoint: `POST /api/feed/create-free-example`
- Button: "New Preview" in feed header
- Template Selection: Based on `user_personal_brand` or `blueprint_subscribers`

**Template Storage:**
- Full template stored in `feed_posts[0].prompt`
- Contains all 9 scenes with placeholders
- Placeholders replaced during generation via dynamic injection

**Generation Flow:**
1. User clicks "Generate" on preview placeholder
2. System retrieves full template from `feed_posts[0].prompt`
3. Dynamic injection replaces placeholders (outfits, locations, accessories)
4. Full injected template sent to Replicate (all 9 scenes in one image)
5. Result: Single 9:16 image with 3x3 grid of 9 scenes

---

### Full Feeds (`layout_type: 'grid_3x4'`)

**Purpose:** Complete feed with 9 individual posts (one scene per image)

**Characteristics:**
- **Posts:** 9 posts (positions 1-9)
- **Aspect Ratio:** 4:5 per post (Instagram standard)
- **Template:** Full 9-scene template (extracted per position)
- **Display:** 3x3 grid
- **Generation:** Extracts individual scene from injected template
- **Users:** Paid blueprint and membership users only

**Creation:**
- Endpoint: `POST /api/feed/create-manual`
- Button: "New Feed" in feed header
- Feed Style Selection: User selects style via `FeedStyleModal`

**Template Storage:**
- Full template stored in `feed_layouts.feed_style` (for template selection)
- Individual scene prompts stored in `feed_posts[position].prompt` after extraction

**Generation Flow:**
1. User clicks "Generate" on individual post placeholder
2. System retrieves full template based on `feed_layouts.feed_style`
3. Dynamic injection replaces placeholders (outfits, locations, accessories)
4. System extracts scene for specific position (1-9) from injected template
5. Extracted scene prompt sent to Replicate
6. Result: Single 4:5 image with one scene

**Scene Extraction:**
- Uses `buildSingleImagePrompt(injectedTemplate, position)` function
- Extracts frame description for specific position
- Maintains aesthetic consistency across all 9 posts

---

## DYNAMIC TEMPLATE SYSTEM

### Overview

The dynamic template system injects personalized content (outfits, locations, accessories) into blueprint templates based on:
- User's fashion style (from onboarding wizard)
- Visual aesthetic (luxury, minimal, beige, etc.)
- Feed style (dark & moody, light & minimalistic, beige aesthetic)
- Rotation state (prevents duplicate content)

### Template Structure

**Location:** `lib/maya/blueprint-photoshoot-templates.ts`

**Template Format:**
```typescript
{
  name: "Luxury Dark Moody",
  description: "...",
  posts: [
    {
      position: 1,
      description: "Full-body by window",
      category: "luxury",
      promptTemplate: "Create a 3x3 grid...\n\nOUTFIT STYLING: {{OUTFIT_STYLING}}\n\nFRAMES:\n1. {{LOCATION_OUTDOOR_1}}..."
    }
  ]
}
```

**Placeholders:**
- `{{OUTFIT_STYLING}}` - Comprehensive outfit description (outfit, pieces, brands, occasion)
- `{{LOCATION_OUTDOOR_1}}`, `{{LOCATION_INDOOR_1}}`, etc. - Location descriptions
- `{{ACCESSORY_CLOSEUP_1}}`, `{{ACCESSORY_FLATLAY_1}}`, etc. - Accessory descriptions
- `{{LIGHTING_EVENING}}`, `{{LIGHTING_BRIGHT}}`, etc. - Lighting descriptions

### Vibe Libraries

**Location:** `lib/styling/vibe-libraries.ts`

**Structure:**
- 18 vibes (luxury_dark_moody, minimal_light_minimalistic, etc.)
- Each vibe contains:
  - `outfits`: Organized by fashion style (casual, business, bohemian, classic, trendy, athletic)
  - `locations`: 3-5 locations per vibe
  - `accessories`: Accessory sets per vibe

**Fashion Styles:**
- `casual` - Relaxed, everyday wear
- `business` - Professional, office-appropriate
- `bohemian` - Free-spirited, artistic
- `classic` - Timeless, traditional
- `trendy` - Current fashion trends
- `athletic` - Sporty, activewear

### Injection Process

**Function:** `injectDynamicContentWithRotation()`

**Location:** `lib/feed-planner/dynamic-template-injector.ts`

**Process:**
1. **Get Rotation State:**
   - Queries `user_feed_rotation_state` table
   - Retrieves current indices for outfit, location, accessory
   - Creates new state if doesn't exist

2. **Build Placeholders:**
   - Selects outfit based on fashion style and rotation index
   - Selects location based on rotation index
   - Selects accessories based on rotation index
   - Formats `OUTFIT_STYLING` placeholder with comprehensive description

3. **Replace Placeholders:**
   - Uses `replacePlaceholders()` from `template-placeholders.ts`
   - Replaces all `{{PLACEHOLDER}}` instances with actual content
   - Validates all placeholders are replaced

4. **Increment Rotation:**
   - Updates rotation indices in `user_feed_rotation_state`
   - Cycles through available options
   - Prevents duplicate content across feeds

**Rotation Logic:**
- Outfit index cycles through available outfits for user's fashion style
- Location index cycles through available locations for vibe
- Accessory index cycles through available accessory sets
- Indices reset when all options exhausted

### Preview Feed vs Full Feed Injection

**Preview Feeds:**
- Full template injected (all 9 scenes)
- `finalPrompt = injectedTemplate` (complete template)
- Sent to Replicate as single prompt
- Result: One 9:16 image with 3x3 grid

**Full Feeds:**
- Full template injected (all 9 scenes)
- Scene extracted for specific position: `finalPrompt = buildSingleImagePrompt(injectedTemplate, position)`
- Sent to Replicate as single scene prompt
- Result: One 4:5 image with one scene

**Key Difference:**
- Preview feeds use full template directly
- Full feeds extract individual scenes from injected template

---

## PROMPT GENERATION PIPELINE

### Preview Feed Generation

**Endpoint:** `POST /api/feed/[feedId]/generate-single`

**Flow:**
1. **Access Check:**
   - Verifies user has credits (free users) or generation access (paid users)
   - Checks `feedLayout.layout_type === 'preview'`

2. **Template Retrieval:**
   - Reads `feed_posts[0].prompt` (full template with placeholders)
   - If missing, retrieves template based on `user_personal_brand` or `feed_layouts.feed_style`

3. **Category & Vibe Extraction:**
   - **PRIMARY:** `feed_layouts.feed_style` (if exists)
   - **SECONDARY:** `user_personal_brand.visual_aesthetic[0]` → category
   - **SECONDARY:** `user_personal_brand.settings_preference[0]` → mood
   - **FALLBACK:** `blueprint_subscribers` (legacy)

4. **Fashion Style Extraction:**
   - Reads `user_personal_brand.fashion_style`
   - Maps wizard style to vibe library style via `mapFashionStyleToVibeLibrary()`
   - Defaults to `'business'` if not found

5. **Dynamic Injection:**
   - Calls `injectDynamicContentWithRotation(template, vibe, fashionStyle, userId)`
   - Validates all placeholders replaced
   - Throws error if placeholders remain

6. **Prompt Assignment:**
   - `finalPrompt = injectedTemplate` (full template for preview feeds)
   - Saves to `feed_posts[0].prompt`

7. **Image Generation:**
   - Uses `generateWithNanoBanana()` (Pro Mode)
   - Resolution: 2K (free users) or 2K/4K (paid users)
   - Aspect ratio: 9:16
   - Credits: 2 (2K) or 4 (4K)

---

### Full Feed Generation (Paid Blueprint)

**Endpoint:** `POST /api/feed/[feedId]/generate-single`

**Flow:**
1. **Access Check:**
   - Verifies `access.isPaidBlueprint` or `access.isMembership`
   - Checks `feedLayout.layout_type !== 'preview'`

2. **Template Retrieval:**
   - If `feed_posts[position].prompt` exists and has no placeholders, uses it directly
   - Otherwise, retrieves template based on `feed_layouts.feed_style`

3. **Category & Vibe Extraction:**
   - **PRIMARY:** `feed_layouts.feed_style` → mood
   - **SECONDARY:** `user_personal_brand.visual_aesthetic[0]` → category
   - Builds vibe key: `${category}_${moodMapped}`

4. **Fashion Style Extraction:**
   - Same as preview feeds

5. **Dynamic Injection:**
   - Same as preview feeds
   - Validates all placeholders replaced

6. **Scene Extraction:**
   - Calls `buildSingleImagePrompt(injectedTemplate, post.position)`
   - Extracts frame description for specific position (1-9)
   - `finalPrompt = extractedScene`
   - Saves to `feed_posts[position].prompt`

7. **Image Generation:**
   - Uses `generateWithNanoBanana()` (Pro Mode)
   - Resolution: 2K or 4K (user choice)
   - Aspect ratio: 4:5
   - Credits: 2 (2K) or 4 (4K)

---

### Template Selection Logic

**Priority Order:**
1. **Feed Style (Primary):** `feed_layouts.feed_style` (luxury, minimal, beige)
2. **Visual Aesthetic (Secondary):** `user_personal_brand.visual_aesthetic[0]` (luxury, minimal, beige, warm, edgy, professional)
3. **Settings Preference (Secondary):** `user_personal_brand.settings_preference[0]` (dark_moody, light_minimalistic, beige_aesthetic)
4. **Blueprint Subscribers (Fallback):** `blueprint_subscribers.feed_style` and `form_data.vibe` (legacy)

**Template Key Construction:**
- Category: From `visual_aesthetic[0]` (luxury, minimal, beige, warm, edgy, professional)
- Mood: From `settings_preference[0]` or `feed_style` (dark_moody, light_minimalistic, beige_aesthetic)
- Template Key: `${category}_${moodMapped}` (e.g., `luxury_dark_moody`)

**Mood Mapping:**
- `luxury` → `dark_moody` (via `MOOD_MAP`)
- `minimal` → `light_minimalistic`
- `beige` → `beige_aesthetic`

---

## CREDIT SYSTEM

### Credit Costs

**Pro Mode (NanoBanana Pro):**
- 2K resolution: 2 credits
- 4K resolution: 4 credits
- Function: `getStudioProCreditCost(resolution)`

**Classic Mode (FLUX):**
- 1 credit per image
- Function: `CREDIT_COSTS.IMAGE`

### Credit Deduction

**Timing:** Before image generation

**Process:**
1. Check credits: `checkCredits(userId, creditsNeeded)`
2. Deduct credits: `deductCredits(userId, amount, 'image')`
3. Generate image
4. Refund on failure (if implemented)

**Location:** `app/api/feed/[feedId]/generate-single/route.ts`

### Credit Packages

**Location:** `lib/products.ts`

**Packages:**
- 10 credits: $X (starter pack for preview feeds)
- 100 credits: $X
- 200 credits: $X

**Purchase Flow:**
1. User clicks "Buy Credits" in upsell modal
2. Routes to `/checkout/credits`
3. Stripe Embedded Checkout
4. Webhook grants credits on completion

---

## DATABASE SCHEMA

### feed_layouts

**Key Fields:**
- `id` - Primary key
- `user_id` - Foreign key to users
- `layout_type` - `'preview'` | `'grid_3x4'` | `'grid_3x3'` | NULL
- `feed_style` - `'luxury'` | `'minimal'` | `'beige'` (for template selection)
- `status` - `'draft'` | `'saved'` | `'completed'`
- `brand_name`, `username` - Display fields
- `created_at`, `updated_at` - Timestamps

**Indexes:**
- `idx_feed_layouts_user_id`
- `idx_feed_layouts_feed_style`
- `idx_feed_layouts_created_at`

### feed_posts

**Key Fields:**
- `id` - Primary key
- `feed_layout_id` - Foreign key to feed_layouts
- `user_id` - Foreign key to users
- `position` - 1-9 (or 1-12)
- `prompt` - Template prompt or extracted scene prompt
- `image_url` - Generated image URL
- `generation_status` - `'pending'` | `'generating'` | `'completed'` | `'failed'`
- `generation_mode` - `'classic'` | `'pro'`
- `created_at`, `updated_at` - Timestamps

**Indexes:**
- `idx_feed_posts_feed_layout_id`
- `idx_feed_posts_user_id`
- `idx_feed_posts_generation_status`

**Constraints:**
- UNIQUE: `(feed_layout_id, position)`
- CHECK: `generation_mode IN ('classic', 'pro')`

### user_feed_rotation_state

**Purpose:** Tracks rotation indices to prevent duplicate content

**Key Fields:**
- `id` - Primary key
- `user_id` - Foreign key to users
- `vibe` - Vibe key (e.g., `'luxury_dark_moody'`)
- `fashion_style` - Fashion style (e.g., `'business'`)
- `outfit_index` - Current outfit rotation index
- `location_index` - Current location rotation index
- `accessory_index` - Current accessory rotation index
- `last_used_at` - Last rotation update
- `total_generations` - Total generations for this vibe/style combo

**Constraints:**
- UNIQUE: `(user_id, vibe, fashion_style)`

**Indexes:**
- `idx_user_feed_rotation_state_user_id`
- `idx_user_feed_rotation_state_vibe_style`

### user_personal_brand

**Key Fields for Feed Planner:**
- `user_id` - Foreign key to users
- `visual_aesthetic` - JSONB array (e.g., `["luxury", "minimal"]`)
- `settings_preference` - JSONB array (e.g., `["dark_moody"]`)
- `fashion_style` - JSONB array (e.g., `["business", "classic"]`)
- `feed_planner_welcome_shown` - Boolean (welcome wizard tracking)

---

## API ENDPOINTS

### Feed Creation

**`POST /api/feed/create-free-example`**
- Creates preview feed (`layout_type: 'preview'`)
- Creates 1 post (position 1)
- Stores full template in `feed_posts[0].prompt`
- Returns: `{ feedId, feed, posts }`

**`POST /api/feed/create-manual`**
- Creates full feed (`layout_type: 'grid_3x4'`)
- Creates 9 posts (positions 1-9)
- Stores feed style in `feed_layouts.feed_style`
- Returns: `{ feedId, feed, posts }`

### Image Generation

**`POST /api/feed/[feedId]/generate-single`**
- Generates single image for specific post
- Handles preview feeds (full template) and full feeds (extracted scene)
- Dynamic injection with rotation
- Credit deduction before generation
- Returns: `{ predictionId, postId }`

**`POST /api/feed/[feedId]/regenerate-post`**
- Regenerates existing post
- Same logic as generate-single
- Returns: `{ predictionId, postId }`

### Feed Management

**`GET /api/feed/list`**
- Lists user's feeds
- Filters preview feeds for paid users (excludes from grid view)
- Returns: `{ feeds: [...] }`

**`GET /api/feed/[feedId]`**
- Gets specific feed with posts
- Returns: `{ feed, posts }`

**`PATCH /api/feed/[feedId]/update-metadata`**
- Updates feed metadata (title, display_color)
- Returns: `{ success, feed }`

### Access Control

**`GET /api/feed-planner/access`**
- Returns user's access level
- Returns: `FeedPlannerAccess` object

---

## UI COMPONENTS

### Feed Header

**File:** `components/feed-planner/feed-header.tsx`

**Features:**
- "New Preview" button (all users)
- "New Feed" button (paid users only, hidden for free users)
- Feed style modal integration
- Credit display

### Feed Style Modal

**File:** `components/feed-planner/feed-style-modal.tsx`

**Features:**
- Feed style selection (luxury, minimal, beige)
- Advanced options:
  - Visual aesthetic selection
  - Fashion style selection
  - Selfie image upload
- Saves to `user_personal_brand` and `feed_layouts.feed_style`

### Feed Single Placeholder

**File:** `components/feed-planner/feed-single-placeholder.tsx`

**Features:**
- Preview feed placeholder (9:16 aspect ratio)
- Generate button
- Credit check
- Upsell modal (when credits = 0)

### Feed Grid

**File:** `components/feed-planner/feed-grid.tsx`

**Features:**
- 3x3 grid display (full feeds)
- Individual post placeholders
- Generate buttons per post
- Drag-and-drop reordering

### Instagram Feed View

**File:** `components/feed-planner/instagram-feed-view.tsx`

**Features:**
- Main feed display component
- Switches between single placeholder (preview) and grid (full feed)
- Based on `feedData?.feed?.layout_type === 'preview'`

---

## USER FLOWS

### Free User: Preview Feed Creation

1. User signs up → Receives 2 free credits
2. User navigates to `/feed-planner`
3. User clicks "New Preview" button
4. System creates preview feed (`layout_type: 'preview'`)
5. System selects template based on `user_personal_brand`
6. System stores full template in `feed_posts[0].prompt`
7. User sees single 9:16 placeholder
8. User clicks "Generate"
9. System checks credits (2 credits available)
10. System injects dynamic content (outfits, locations, accessories)
11. System generates image (full template, all 9 scenes)
12. User sees generated 9:16 image with 3x3 grid
13. User runs out of credits → Upsell modal appears
14. User purchases credits → Can create more preview feeds

---

### Paid Blueprint User: Full Feed Creation

1. User has paid blueprint subscription
2. User navigates to `/feed-planner`
3. User clicks "New Feed" button
4. Feed style modal appears
5. User selects feed style (e.g., "Dark & Moody")
6. User optionally selects visual aesthetic, fashion style, uploads selfies
7. System creates full feed (`layout_type: 'grid_3x4'`)
8. System creates 9 posts (positions 1-9)
9. System stores feed style in `feed_layouts.feed_style`
10. User sees 3x3 grid with 9 placeholders
11. User clicks "Generate" on position 1
12. System retrieves template based on `feed_layouts.feed_style`
13. System injects dynamic content (outfits, locations, accessories)
14. System extracts scene for position 1 from injected template
15. System generates image (single scene, 4:5 aspect ratio)
16. User sees generated image in position 1
17. User repeats for positions 2-9
18. Each generation uses rotated content (different outfits, locations, accessories)

---

### Credit Purchase Flow

1. User runs out of credits (balance = 0)
2. Upsell modal appears automatically
3. User clicks "Buy Credits"
4. System routes to `/checkout/credits`
5. User selects credit package (10, 100, or 200 credits)
6. Stripe Embedded Checkout displayed
7. User completes payment
8. Webhook processes payment
9. Credits granted to user account
10. User redirected to success page
11. User can now generate more images

---

## KEY DIFFERENCES SUMMARY

| Feature | Preview Feeds | Full Feeds |
|---------|--------------|------------|
| **Layout Type** | `'preview'` | `'grid_3x4'` |
| **Posts** | 1 post (position 1) | 9 posts (positions 1-9) |
| **Aspect Ratio** | 9:16 | 4:5 per post |
| **Template Usage** | Full template (all 9 scenes) | Extracted scenes (one per post) |
| **Display** | Single placeholder | 3x3 grid |
| **Users** | Free users (primary) | Paid blueprint/membership |
| **Generation** | One image with all scenes | Nine images with one scene each |
| **Credits** | 2 credits per preview | 2 credits per post (18 total for full feed) |

---

## TROUBLESHOOTING

### Placeholders Not Replaced

**Symptoms:** Prompts sent to Replicate contain `{{PLACEHOLDER}}` strings

**Causes:**
1. `injectDynamicContentWithRotation()` not called
2. Vibe library missing content for user's fashion style
3. Rotation state not initialized

**Fix:**
1. Check `app/api/feed/[feedId]/generate-single/route.ts` injection logic
2. Verify `lib/styling/vibe-libraries.ts` has content for user's vibe and fashion style
3. Check `user_feed_rotation_state` table for user's rotation state

### Wrong Template Selected

**Symptoms:** Images don't match selected feed style

**Causes:**
1. `feed_layouts.feed_style` not set during feed creation
2. `user_personal_brand.visual_aesthetic` malformed JSON
3. Fallback to `blueprint_subscribers` (legacy data)

**Fix:**
1. Verify `feed_layouts.feed_style` is set in `create-manual` endpoint
2. Check JSON parsing for `visual_aesthetic` (should be array, not object)
3. Ensure `FeedStyleModal` saves to both `user_personal_brand` and `feed_layouts`

### Preview Feed Shows Grid Instead of Single Placeholder

**Symptoms:** Preview feed displays 3x3 grid instead of single 9:16 placeholder

**Causes:**
1. `feed_layouts.layout_type` not set to `'preview'`
2. `InstagramFeedView` not checking `layout_type`

**Fix:**
1. Verify `create-free-example` sets `layout_type: 'preview'`
2. Check `instagram-feed-view.tsx` conditional: `feedData?.feed?.layout_type === 'preview'`

---

## RELATED FILES

### Core Implementation
- `app/api/feed/[feedId]/generate-single/route.ts` - Main generation endpoint
- `lib/feed-planner/dynamic-template-injector.ts` - Dynamic injection logic
- `lib/feed-planner/access-control.ts` - Access level determination
- `lib/feed-planner/build-single-image-prompt.ts` - Scene extraction
- `lib/maya/blueprint-photoshoot-templates.ts` - Template definitions
- `lib/styling/vibe-libraries.ts` - Outfit/location/accessory libraries

### UI Components
- `components/feed-planner/feed-header.tsx` - Header with buttons
- `components/feed-planner/feed-style-modal.tsx` - Style selection modal
- `components/feed-planner/feed-single-placeholder.tsx` - Preview placeholder
- `components/feed-planner/feed-grid.tsx` - 3x3 grid display
- `components/feed-planner/instagram-feed-view.tsx` - Main feed view

### Database
- `scripts/migrations/create-user-feed-rotation-state.sql` - Rotation state table
- `scripts/migrations/add-feed-style-to-feed-layouts.sql` - Feed style column

---

**Document Status:** ✅ Complete and Current  
**Last Reviewed:** January 2025  
**Maintained By:** Engineering Team
