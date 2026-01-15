# Feed Planner (Paid Blueprint) - Comprehensive Audit

**Date:** January 2025  
**Scope:** Complete audit of Feed Planner workflow for Paid Blueprint users  
**Purpose:** Understand current architecture before implementing welcome wizard

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Schema](#database-schema)
3. [Backend API Architecture](#backend-api-architecture)
4. [Frontend Component Architecture](#frontend-component-architecture)
5. [Access Control System](#access-control-system)
6. [Image Generation Flow](#image-generation-flow)
7. [User Journey: Free vs Paid Blueprint](#user-journey-free-vs-paid-blueprint)
8. [Credit System Integration](#credit-system-integration)
9. [State Management & Polling](#state-management--polling)
10. [UI/UX Components](#uiux-components)
11. [Key Findings & Issues](#key-findings--issues)

---

## Executive Summary

The Feed Planner is a complex system that allows users to create Instagram feed grids with AI-generated images. The system supports:

- **Free Users:** 1 feed with 1 post (9:16 single placeholder)
- **Paid Blueprint Users:** Up to 3 feeds with 9 posts each (3x3 grid)
- **Studio Membership Users:** Unlimited feeds with 9 posts each

The architecture follows a clear separation:
- **Backend:** PostgreSQL database (Neon) with RESTful API endpoints
- **Frontend:** Next.js 15+ with React components and SWR for data fetching
- **Image Generation:** Replicate API (Flux LoRA for Classic Mode, Nano Banana Pro for Pro Mode)

---

## Database Schema

### Core Tables

#### `feed_layouts`
**Purpose:** Main container for a feed grid

```sql
CREATE TABLE feed_layouts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_name VARCHAR(255),
  username VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  layout_type VARCHAR(50) DEFAULT 'grid_3x3',
  created_by VARCHAR(50), -- 'manual', 'auto', 'maya'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields:**
- `user_id`: Links feed to user
- `brand_name`: Display name for the feed
- `status`: 'draft', 'saved', 'generating', 'completed'
- `created_by`: Source of feed creation

**Location:** `scripts/21-create-feed-tables-fixed.sql`

---

#### `feed_posts`
**Purpose:** Individual posts in a feed (1-9 positions for 3x3 grid)

```sql
CREATE TABLE feed_posts (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER NOT NULL REFERENCES feed_layouts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 1-9 for 3x3 grid
  post_type VARCHAR(50) NOT NULL, -- 'photo', 'carousel', 'user'
  image_url TEXT, -- Final generated image URL
  caption TEXT,
  text_overlay TEXT,
  text_overlay_style JSONB,
  prompt TEXT, -- Generation prompt
  generation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  generation_mode VARCHAR(50) DEFAULT 'classic', -- 'classic' (Flux LoRA) or 'pro' (Nano Banana Pro)
  prediction_id TEXT, -- Replicate prediction ID
  content_pillar VARCHAR(50), -- For content calendar
  post_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'posted'
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields:**
- `position`: 1-9 for 3x3 grid (free users only have position 1)
- `generation_status`: Tracks image generation lifecycle
- `generation_mode`: 'classic' (LoRA) vs 'pro' (Nano Banana)
- `prediction_id`: Replicate prediction tracking

**Location:** `scripts/21-create-feed-tables-fixed.sql`

---

#### `instagram_bios`
**Purpose:** Generated Instagram bio for a feed

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

**Location:** `scripts/24-complete-feed-schema.sql`

---

#### `instagram_highlights`
**Purpose:** Instagram highlight cover images

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

**Location:** `scripts/24-complete-feed-schema.sql`

---

#### `feed_strategy`
**Purpose:** Complete strategy document for feed content

```sql
CREATE TABLE feed_strategy (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feed_layout_id INTEGER REFERENCES feed_layouts(id) ON DELETE CASCADE,
  brand_positioning TEXT,
  content_pillars JSONB, -- Array of content pillars
  posting_schedule JSONB,
  growth_tactics JSONB,
  hook_formulas JSONB,
  caption_templates JSONB,
  hashtag_strategy JSONB,
  content_format_mix JSONB,
  strategy_version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Location:** `scripts/create-feed-strategy-table.sql`

---

#### `blueprint_subscribers`
**Purpose:** Legacy table for old blueprint wizard data + paid blueprint purchase tracking

```sql
CREATE TABLE blueprint_subscribers (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  form_data JSONB, -- Old wizard data (vibe, business, etc.)
  feed_style VARCHAR(50), -- Old wizard selection
  paid_blueprint_purchased BOOLEAN DEFAULT FALSE,
  paid_blueprint_purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields:**
- `form_data`: Contains old wizard answers (vibe, business type, etc.)
- `feed_style`: Old wizard aesthetic selection
- `paid_blueprint_purchased`: Boolean flag for paid blueprint purchase
- `paid_blueprint_purchased_at`: Purchase timestamp

**Location:** `scripts/create-blueprint-subscribers-table.sql`

---

#### `subscriptions`
**Purpose:** Tracks user subscriptions and product access

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_type VARCHAR(50) NOT NULL, -- 'paid_blueprint', 'sselfie_studio_membership'
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'expired'
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields:**
- `product_type`: 'paid_blueprint' for feed planner access
- `status`: 'active' determines access
- `stripe_subscription_id`: Stripe tracking (NULL for one-time purchases)

**Location:** `scripts/00-create-all-tables.sql`

---

#### `user_credits`
**Purpose:** Credit balance for image generation

```sql
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Credit Costs:**
- Image generation: 2 credits per image
- Paid blueprint purchase: Grants 60 credits (30 images × 2 credits)

**Location:** `scripts/22-create-credit-system.sql`

---

## Backend API Architecture

### Access Control Endpoint

#### `GET /api/feed-planner/access`
**Purpose:** Returns access control object for authenticated user

**Response:**
```typescript
{
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
  maxFeedPlanners: number | null // 3 for paid blueprint, null for unlimited
  placeholderType: "single" | "grid" // "single" for free, "grid" for paid
}
```

**Logic:**
1. Checks `subscriptions` table for active `paid_blueprint` or `sselfie_studio_membership`
2. Uses `hasPaidBlueprint()` and `hasStudioMembership()` from `lib/subscription.ts`
3. Determines access level based on subscription type

**Location:** `app/api/feed-planner/access/route.ts`

---

### Feed Management Endpoints

#### `GET /api/feed/latest`
**Purpose:** Get user's most recent feed (convenience wrapper)

**Response:**
```typescript
{
  exists: boolean
  feed?: FeedLayout
  posts?: FeedPost[]
  bio?: InstagramBio
  highlights?: InstagramHighlight[]
}
```

**Location:** `app/api/feed/latest/route.ts`

---

#### `GET /api/feed/[feedId]`
**Purpose:** Get specific feed by ID

**Query Parameters:**
- `feedId`: Feed ID (integer) or "latest"

**Response:**
```typescript
{
  feed: FeedLayout
  posts: FeedPost[]
  bio: InstagramBio | null
  highlights: InstagramHighlight[]
  userDisplayName: string
}
```

**Security:** Verifies `feed_layouts.user_id === authenticated_user.id`

**Location:** `app/api/feed/[feedId]/route.ts`

---

#### `POST /api/feed/create-free-example`
**Purpose:** Auto-create feed with 1 post for free users

**Flow:**
1. Checks if user is free (`access.isFree`)
2. Checks if user already has a feed
3. Creates `feed_layouts` record
4. Creates single `feed_posts` record (position 1, `generation_mode: 'pro'`)
5. Optionally loads template prompt from `blueprint_subscribers.form_data`

**Location:** `app/api/feed/create-free-example/route.ts`

---

#### `POST /api/feed/expand-for-paid`
**Purpose:** Expand feed from 1 post to 9 posts when user upgrades

**Flow:**
1. Authenticates user
2. Checks existing posts in feed
3. Creates posts for positions 2-9 (if missing)
4. Sets all new posts to `generation_mode: 'pro'`, `generation_status: 'pending'`

**Location:** `app/api/feed/expand-for-paid/route.ts`

---

### Image Generation Endpoint

#### `POST /api/feed/[feedId]/generate-single`
**Purpose:** Generate a single image for a specific post

**Request Body:**
```typescript
{
  postId: number
}
```

**Flow:**
1. Authenticates user
2. Checks access control (`getFeedPlannerAccess()`)
3. Verifies credits (2 credits per image)
4. Checks rate limits
5. Fetches post from database
6. Determines generation mode (`generation_mode` field):
   - **Classic Mode (`classic`)**: Uses Flux LoRA (requires trained model)
     - Loads `user_models` with `training_status = 'completed'`
     - Uses `trigger_word` and `lora_weights_url`
     - Calls Replicate Flux LoRA API
   - **Pro Mode (`pro`)**: Uses Nano Banana Pro (no model training needed)
     - Loads `user_avatar_images` (reference images)
     - Requires at least 1 avatar image (recommended: 3+)
     - Calls Nano Banana Pro API
7. Deducts credits (2 credits)
8. Creates Replicate prediction
9. Updates `feed_posts`:
   - `generation_status = 'generating'`
   - `prediction_id = replicate_prediction_id`
   - `prompt = final_prompt`

**Response:**
```typescript
{
  success: boolean
  postId: number
  predictionId: string
  prompt: string
  generationMode: 'classic' | 'pro'
}
```

**Location:** `app/api/feed/[feedId]/generate-single/route.ts`

---

#### `GET /api/feed/[feedId]/progress`
**Purpose:** Poll Replicate API to check generation status and update database

**Flow:**
1. Authenticates user
2. Fetches all posts with `prediction_id` (generating posts)
3. For each generating post:
   - Calls Replicate API to check prediction status
   - If `status === 'succeeded'`:
     - Downloads image from Replicate
     - Uploads to Vercel Blob Storage
     - Updates `feed_posts.image_url`
     - Sets `generation_status = 'completed'`
   - If `status === 'failed'`:
     - Sets `generation_status = 'failed'`
4. Returns completion stats

**Response:**
```typescript
{
  completed: number
  failed: number
  total: number
  progress: number // Percentage (0-100)
}
```

**Note:** This endpoint is called by frontend polling mechanism (`useFeedPolling` hook)

**Location:** `app/api/feed/[feedId]/progress/route.ts`

---

### Feed List Endpoint

#### `GET /api/feed/list`
**Purpose:** Get list of all feeds for authenticated user

**Response:**
```typescript
{
  feeds: Array<{
    id: number
    brand_name: string
    username: string
    status: string
    created_at: string
    updated_at: string
    post_count: number // Number of posts with images
  }>
}
```

**Location:** `app/api/feed/list/route.ts`

---

## Frontend Component Architecture

### Page Structure

#### `/feed-planner` (Server Component)
**File:** `app/feed-planner/page.tsx`

**Flow:**
1. Authenticates user (redirects to login if not authenticated)
2. Gets or creates Neon user
3. Fetches subscription status
4. Renders `SselfieApp` component with:
   - `userId`
   - `userName`
   - `userEmail`
   - `initialTab="feed-planner"`
   - `purchaseSuccess` flag from query params

**Location:** `app/feed-planner/page.tsx`

---

#### `FeedPlannerClient` (Client Component)
**File:** `app/feed-planner/feed-planner-client.tsx`

**Purpose:** Wrapper that handles wizard logic and shows FeedViewScreen

**Flow:**
1. Fetches access control (`/api/feed-planner/access`)
2. Fetches onboarding status (`/api/user/onboarding-status`)
3. Determines if wizard is needed:
   - **Free users:** Show wizard if missing base or extension data
   - **Paid users:** Show wizard if missing extension data (skip free example)
4. If wizard needed: Shows `UnifiedOnboardingWizard`
5. If wizard not needed: Shows `FeedViewScreen`

**Key Logic:**
```typescript
// Free users: Show wizard if not completed
if (access.isFree) {
  const needsWizard = !hasBaseWizardData || !hasExtensionData || !onboardingCompleted
  setShowWizard(needsWizard)
}

// Paid users: Show wizard if missing extension data
if (access.isPaidBlueprint) {
  const needsWizard = !hasExtensionData && !onboardingCompleted
  setShowWizard(needsWizard)
}
```

**Location:** `app/feed-planner/feed-planner-client.tsx`

---

#### `FeedViewScreen` (Client Component)
**File:** `components/feed-planner/feed-view-screen.tsx`

**Purpose:** Main view container for feed planner

**Flow:**
1. Fetches access control
2. Gets feedId from props or query params (falls back to latest)
3. Fetches feed data (`/api/feed/latest` or `/api/feed/[feedId]`)
4. Auto-creates free example feed if:
   - User is free
   - No feed exists
   - Not already creating
5. Auto-expands feed if:
   - User is paid blueprint
   - Feed exists with only 1 post
6. Renders `InstagramFeedView` component

**Location:** `components/feed-planner/feed-view-screen.tsx`

---

#### `InstagramFeedView` (Client Component)
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Purpose:** Main feed display with tabs (Grid, Posts, Strategy, etc.)

**Tabs:**
1. **Grid:** 3x3 grid preview (`FeedGrid`)
2. **Posts:** List view of posts (`FeedPostsList`)
3. **Strategy:** Content strategy document (`FeedStrategy`)
4. **Captions:** Caption templates (`FeedCaptionTemplates`)
5. **Calendar:** Content calendar (`FeedContentCalendar`)
6. **Pillars:** Content pillars (`FeedBrandPillars`)

**Key Features:**
- Uses `useFeedPolling` hook for real-time updates
- Handles image generation via `FeedPostCard` components
- Shows `FeedSinglePlaceholder` for free users
- Shows full 3x3 grid for paid users

**Location:** `components/feed-planner/instagram-feed-view.tsx`

---

### Polling Hook

#### `useFeedPolling`
**File:** `components/feed-planner/hooks/use-feed-polling.ts`

**Purpose:** Manages real-time polling for feed data and image generation status

**Flow:**
1. Uses SWR to fetch feed data (`/api/feed/[feedId]`)
2. Determines if polling is needed:
   - Checks for posts with `prediction_id` but no `image_url` (generating)
   - Checks for posts with `generation_status = 'generating'`
3. **For free users (single post):**
   - Stops polling immediately if single post has `image_url`
   - No grace period
4. **For paid users (multiple posts):**
   - Continues polling while any posts are generating
   - Calls `/api/feed/[feedId]/progress` to update database
5. Returns `refreshInterval`:
   - `3000` (3 seconds) if generating
   - `0` (stop) if all complete or single post has image

**Key Logic:**
```typescript
// Free blueprint: Stop immediately if single post has image
const singlePost = data?.posts?.length === 1 ? data.posts[0] : null
const singlePostHasImage = singlePost?.image_url

if (singlePostHasImage) {
  return 0 // Stop polling
}

// Paid blueprint: Continue polling while generating
if (hasGeneratingPosts || isProcessing) {
  // Call progress endpoint to update database
  fetch(`/api/feed/${feedId}/progress`)
  return 3000 // Poll every 3 seconds
}
```

**Location:** `components/feed-planner/hooks/use-feed-polling.ts`

---

## Access Control System

### Access Control Function

#### `getFeedPlannerAccess(userId: string)`
**File:** `lib/feed-planner/access-control.ts`

**Purpose:** Determines user access level and feature availability

**Flow:**
1. Checks `subscriptions` table for active subscriptions
2. Uses `hasPaidBlueprint()` and `hasStudioMembership()` helper functions
3. Determines access tier:
   - **Free:** No active subscription
   - **Paid Blueprint:** Active `paid_blueprint` subscription
   - **Studio Membership:** Active `sselfie_studio_membership` subscription

**Access Control Rules:**
```typescript
{
  isFree: boolean, // True if no subscription
  isPaidBlueprint: boolean, // True if paid_blueprint subscription active
  isMembership: boolean, // True if sselfie_studio_membership subscription active
  hasGalleryAccess: boolean, // Paid blueprint or membership only
  canGenerateImages: boolean, // Paid blueprint or membership only
  canGenerateCaptions: boolean, // Paid blueprint or membership only
  canGenerateStrategy: boolean, // Paid blueprint or membership only
  canGenerateBio: boolean, // Paid blueprint or membership only
  canGenerateHighlights: boolean, // Paid blueprint or membership only
  maxFeedPlanners: number | null, // 3 for paid blueprint, null for unlimited
  placeholderType: "single" | "grid" // "single" for free, "grid" for paid
}
```

**Location:** `lib/feed-planner/access-control.ts`

---

### Subscription Helper Functions

#### `hasPaidBlueprint(userId: string)`
**File:** `lib/subscription.ts`

**Flow:**
1. Queries `subscriptions` table
2. Checks for active subscription with `product_type = 'paid_blueprint'`
3. Returns `true` if found and `status = 'active'`

**Location:** `lib/subscription.ts`

---

#### `hasStudioMembership(userId: string)`
**File:** `lib/subscription.ts`

**Flow:**
1. Queries `subscriptions` table
2. Checks for active subscription with `product_type = 'sselfie_studio_membership'`
3. Returns `true` if found and `status = 'active'`

**Location:** `lib/subscription.ts`

---

## Image Generation Flow

### Classic Mode (Flux LoRA)

**Requirements:**
- Trained LoRA model (`user_models` with `training_status = 'completed'`)
- `trigger_word` from model
- `lora_weights_url` from model
- `replicate_version_id` from model

**Flow:**
1. Loads user model from `user_models` table
2. Builds prompt with `trigger_word` prefix
3. Calls Replicate Flux LoRA API with:
   - `prompt` (with trigger word)
   - `lora_weights_url`
   - `version_id`
4. Creates prediction and stores `prediction_id`

**Location:** `app/api/feed/[feedId]/generate-single/route.ts` (lines 217-231, 340-450)

---

### Pro Mode (Nano Banana Pro)

**Requirements:**
- At least 1 avatar image (`user_avatar_images` table)
- Recommended: 3+ avatar images for best results
- No model training needed

**Flow:**
1. Loads avatar images from `user_avatar_images` table
2. Validates at least 1 image exists
3. Builds Nano Banana Pro prompt with user context
4. Calls Nano Banana Pro API with:
   - `prompt`
   - `base_images` (avatar images as references)
   - `style_preset`
5. Creates prediction and stores `prediction_id`

**Location:** `app/api/feed/[feedId]/generate-single/route.ts` (lines 234-310, 460-650)

---

### Generation Status Lifecycle

1. **`pending`:** Post created, no generation initiated
2. **`generating`:** Replicate prediction created, waiting for completion
3. **`completed`:** Image generated and uploaded to Vercel Blob
4. **`failed`:** Generation failed (handled by `/api/feed/[feedId]/progress`)

---

### Polling & Progress Updates

**Flow:**
1. Frontend `useFeedPolling` hook polls `/api/feed/[feedId]` every 3 seconds
2. If generating posts detected, calls `/api/feed/[feedId]/progress`
3. Progress endpoint:
   - Queries Replicate API for each `prediction_id`
   - Downloads completed images
   - Uploads to Vercel Blob Storage
   - Updates `feed_posts.image_url` and `generation_status`
4. Frontend automatically re-renders when SWR cache updates

**Location:** `app/api/feed/[feedId]/progress/route.ts`

---

## User Journey: Free vs Paid Blueprint

### Free User Journey

1. **Sign Up / Login**
   - Creates account
   - Gets 2 credits (welcome bonus)

2. **Access Feed Planner** (`/feed-planner`)
   - `FeedPlannerClient` checks onboarding status
   - If incomplete: Shows `UnifiedOnboardingWizard`
   - If complete: Shows `FeedViewScreen`

3. **Wizard Completion** (if needed)
   - Completes base wizard (business type, audience, etc.)
   - Completes extension wizard (visual aesthetic, feed style, selfies)
   - Data saved to `user_personal_brand` table
   - Wizard closes, feed planner loads

4. **Auto-Create Free Example Feed**
   - `FeedViewScreen` detects no feed exists
   - Calls `/api/feed/create-free-example`
   - Creates feed with 1 post (position 1)
   - Post has `generation_mode: 'pro'` and optional template prompt

5. **View Feed**
   - `InstagramFeedView` shows `FeedSinglePlaceholder` (single 9:16 placeholder)
   - No generation buttons visible (free users can't generate)
   - Upsell CTA: "Unlock Full Feed Planner" button

6. **Generate Image** (Optional - uses 2 credits)
   - User clicks "Generate Image" button (if credits available)
   - Calls `/api/feed/[feedId]/generate-single` with `postId`
   - Uses Pro Mode (Nano Banana Pro with avatar images)
   - Deducts 2 credits
   - Polling starts, shows loading state
   - Image completes, displays in placeholder

7. **Upgrade to Paid Blueprint**
   - Clicks "Unlock Full Feed Planner" button
   - Opens `BuyBlueprintModal` (embedded Stripe checkout)
   - Completes purchase
   - Webhook grants 60 credits and creates subscription
   - Feed expands from 1 post to 9 posts automatically

---

### Paid Blueprint User Journey

1. **Purchase Paid Blueprint**
   - Completes Stripe checkout
   - Webhook processes purchase:
     - Creates `subscriptions` entry (`product_type: 'paid_blueprint'`)
     - Updates `blueprint_subscribers.paid_blueprint_purchased = TRUE`
     - Grants 60 credits (`grantPaidBlueprintCredits`)
     - Expands existing feed from 1 to 9 posts (if exists)

2. **Access Feed Planner** (`/feed-planner`)
   - `FeedPlannerClient` checks onboarding status
   - If missing extension data: Shows `UnifiedOnboardingWizard` (skip free example)
   - If complete: Shows `FeedViewScreen`

3. **View Feed**
   - `InstagramFeedView` shows full 3x3 grid (`FeedGrid`)
   - All 9 posts visible (some may be placeholders)
   - Generation buttons visible on each post

4. **Generate Images**
   - User clicks "Generate Image" on any post
   - Calls `/api/feed/[feedId]/generate-single` with `postId`
   - Uses Pro Mode (Nano Banana Pro) by default
   - Deducts 2 credits per image
   - Polling updates grid in real-time
   - Images appear as they complete

5. **Create Multiple Feeds** (Up to 3)
   - User can create up to 3 feeds total
   - Each feed has 9 posts
   - Feed selector in header shows all feeds
   - Switching between feeds updates URL (`?feedId=X`)

6. **Content Strategy**
   - **Strategy Tab:** View/regenerate content strategy document
   - **Captions Tab:** View/regenerate caption templates
   - **Calendar Tab:** Schedule posts for content calendar
   - **Pillars Tab:** View/regenerate content pillars

---

## Credit System Integration

### Credit Costs

- **Image Generation:** 2 credits per image (both Classic and Pro Mode)
- **Paid Blueprint Purchase:** Grants 60 credits (30 images × 2 credits)

### Credit Flow

1. **Purchase Paid Blueprint:**
   - Stripe webhook calls `grantPaidBlueprintCredits(userId, paymentId)`
   - Adds 60 credits to `user_credits.balance`
   - Creates `credit_transactions` entry

2. **Generate Image:**
   - Checks credits before generation (`checkCredits(userId, 2)`)
   - If insufficient: Returns 402 error
   - If sufficient: Deducts credits (`deductCredits(userId, 2)`)
   - Updates `user_credits.balance`
   - Creates `credit_transactions` entry

### Credit Balance Display

- Frontend fetches credits via `/api/user/credits`
- Displayed in header/navigation
- Updates in real-time after generation

**Location:** `lib/credits.ts`

---

## State Management & Polling

### SWR (Stale-While-Revalidate)

**Primary Data Fetching:**
- Feed data: `/api/feed/[feedId]` or `/api/feed/latest`
- Access control: `/api/feed-planner/access`
- Feed list: `/api/feed/list`
- User credits: `/api/user/credits`
- Onboarding status: `/api/user/onboarding-status`

**Caching Strategy:**
- `revalidateOnFocus: false` (prevents excessive re-fetching)
- `dedupingInterval: 60000` (1 minute cache)
- Manual invalidation via `mutate()` when needed

### Polling Mechanism

**Hook:** `useFeedPolling`
- Uses SWR `refreshInterval` for automatic polling
- Dynamically determines polling frequency:
  - `3000` (3 seconds) if generating
  - `0` (stop) if complete
- Calls `/api/feed/[feedId]/progress` to update database
- Optimized for single-post feeds (stops immediately when image appears)

**Location:** `components/feed-planner/hooks/use-feed-polling.ts`

---

## UI/UX Components

### Feed Grid Components

#### `FeedGrid`
**Purpose:** Displays 3x3 grid of posts

**Features:**
- Responsive grid layout
- Post cards with generation buttons
- Loading states for generating images
- Placeholder states for empty posts

**Location:** `components/feed-planner/feed-grid.tsx`

---

#### `FeedPostCard`
**Purpose:** Individual post card in grid

**Features:**
- Image display (if generated)
- Loading spinner (if generating)
- Placeholder (if not generated)
- Generate button (if access allows)
- Regenerate button (if image exists)

**Location:** `components/feed-planner/feed-post-card.tsx`

---

#### `FeedSinglePlaceholder`
**Purpose:** Single 9:16 placeholder for free users

**Features:**
- Displays single post preview
- Upsell CTA: "Unlock Full Feed Planner" button
- Opens `BuyBlueprintModal` on click

**Location:** `components/feed-planner/feed-single-placeholder.tsx`

---

### Modal Components

#### `BuyBlueprintModal`
**Purpose:** Embedded Stripe checkout for paid blueprint purchase

**Features:**
- Product details (30 Photos, $47)
- Embedded Stripe checkout form
- Handles authenticated and unauthenticated users
- Redirects to success page on completion

**Location:** `components/sselfie/buy-blueprint-modal.tsx`

---

#### `FeedModals`
**Purpose:** Collection of modals (gallery selector, profile image, etc.)

**Location:** `components/feed-planner/feed-modals.tsx`

---

### Tab Components

#### `FeedTabs`
**Purpose:** Tab navigation (Grid, Posts, Strategy, Captions, Calendar, Pillars)

**Location:** `components/feed-planner/feed-tabs.tsx`

---

#### `FeedBrandPillars`
**Purpose:** Content pillars display and regeneration

**Location:** `components/feed-planner/feed-brand-pillars.tsx`

---

## Key Findings & Issues

### ✅ What's Working Well

1. **Clear Access Control:** Access control system is well-structured and centralized
2. **Polling Optimization:** Single-post feed polling stops immediately (no unnecessary polling)
3. **Credit Integration:** Credit system is integrated at generation time
4. **Pro Mode Default:** Paid blueprint uses Pro Mode (Nano Banana Pro) by default (no model training needed)
5. **Auto-Feed Creation:** Free users get feed automatically created

---

### ⚠️ Potential Issues & Improvements

#### 1. **Feed Expansion Timing**
**Issue:** Feed expansion happens client-side in `FeedViewScreen` useEffect  
**Impact:** May not trigger if user doesn't visit feed planner immediately after purchase  
**Recommendation:** Move expansion to webhook or server-side check on feed access

**Location:** `components/feed-planner/feed-view-screen.tsx` (lines 103-154)

---

#### 2. **Template Prompt Loading**
**Issue:** Free example feed loads prompt from `blueprint_subscribers.form_data` (legacy table)  
**Impact:** Inconsistent with new `user_personal_brand` table  
**Recommendation:** Migrate to `user_personal_brand` table or remove legacy dependency

**Location:** `app/api/feed/create-free-example/route.ts` (lines 121-152)

---

#### 3. **Wizard Logic Complexity**
**Issue:** Wizard visibility logic is complex and depends on multiple conditions  
**Impact:** Potential for edge cases (e.g., paid user missing extension data)  
**Recommendation:** Simplify wizard conditions or add feature flag

**Location:** `app/feed-planner/feed-planner-client.tsx` (lines 79-139)

---

#### 4. **Feed Limit Enforcement**
**Issue:** `maxFeedPlanners: 3` for paid blueprint is not enforced in API  
**Impact:** Users could potentially create more than 3 feeds  
**Recommendation:** Add validation in feed creation endpoints

**Location:** `lib/feed-planner/access-control.ts` (line 83)

---

#### 5. **Credit Balance Check**
**Issue:** Free users can generate images if they have credits, but UI may not show generate button  
**Impact:** Confusing UX if credits exist but button is hidden  
**Recommendation:** Show generate button if credits available, even for free users

**Location:** `components/feed-planner/feed-single-placeholder.tsx`

---

#### 6. **Missing Welcome Wizard**
**Issue:** No welcome wizard explaining feed planner workflow to first-time users  
**Impact:** Users may not understand how to use feed planner  
**Recommendation:** **IMPLEMENT WELCOME WIZARD** (current request)

---

### 🔧 Technical Debt

1. **Legacy `blueprint_subscribers` Table:** Still used for template prompts, should migrate to `user_personal_brand`
2. **Deprecated Endpoints:** `/api/feed-planner/create-strategy` is deprecated but still exists
3. **Mixed Data Sources:** Some features use `blueprint_subscribers`, others use `user_personal_brand`

---

## Recommendations for Welcome Wizard Implementation

Based on this audit, the welcome wizard should:

1. **Explain the Feed Planner Concept:**
   - What is a feed grid (3x3 Instagram grid)
   - How posts work (1-9 positions)
   - Free vs Paid differences

2. **Show the Workflow:**
   - Step 1: Generate images (explain Pro Mode vs Classic Mode)
   - Step 2: Add captions (auto-generated or manual)
   - Step 3: Schedule posts (content calendar)
   - Step 4: Download and post to Instagram

3. **Highlight Paid Blueprint Benefits:**
   - 30 photos (vs 1 for free)
   - 3 feed planners
   - Full access to all features
   - 60 credits included

4. **Interactive Demo (Optional):**
   - Show a sample feed with generated images
   - Walk through generating first image
   - Show caption generation

5. **Skip Conditions:**
   - Don't show if user has already generated at least 1 image
   - Don't show on subsequent visits (store `feed_planner_welcome_shown` flag)

---

## Conclusion

The Feed Planner is a well-structured system with clear separation of concerns. The main areas for improvement are:

1. **Welcome Wizard:** Currently missing, needed to onboard new users
2. **Feed Expansion:** Should happen server-side, not client-side
3. **Data Migration:** Legacy `blueprint_subscribers` should be fully migrated to `user_personal_brand`
4. **Feed Limit Enforcement:** Add API validation for 3-feed limit

The system is production-ready but would benefit from these enhancements.

---

**End of Audit**
