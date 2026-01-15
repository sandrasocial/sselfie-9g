# FREE BLUEPRINT FUNNEL TO PAID UPSELL - FORENSIC AUDIT

**Date:** 2025-01-27  
**Audit Mode:** Production Codebase Analysis  
**Scope:** Complete free blueprint → paid upgrade flow

---

## 1. SYSTEM BOUNDARY & ENTRY POINTS

### 1.1 Public Routes (No Auth Required)
- **`/blueprint`** → `app/blueprint/page.tsx` → `components/blueprint/blueprint-landing.tsx`
  - Entry point for blueprint landing page
  - Email capture flow
  - No authentication required

### 1.2 Protected Routes (Auth Required)
- **`/feed-planner`** → `app/feed-planner/page.tsx` → `app/feed-planner/feed-planner-client.tsx`
  - Main feed planner entry point
  - Requires authentication (redirects to `/auth/login?returnTo=/feed-planner` if not authenticated)
  - Server-side: Fetches `neonUser` via `getUserByAuthId(authUser.id)`
  - Client-side: Renders `FeedPlannerClient` wrapper

- **`/checkout/blueprint`** → `app/checkout/blueprint/page.tsx`
  - Blueprint checkout entry point
  - Checks feature flag: `FEATURE_PAID_BLUEPRINT_ENABLED` (env var or DB flag)
  - Supports authenticated and unauthenticated checkout
  - Redirects to `/checkout?client_secret=...&product_type=paid_blueprint`

- **`/checkout/success`** → `app/checkout/success/page.tsx` → `components/checkout/success-content.tsx`
  - Post-purchase success page
  - Handles both authenticated and unauthenticated users
  - Auto-redirects authenticated users to `/feed-planner?purchase=success` after 2 seconds

### 1.3 Middleware
- **`middleware.ts`** (lines 5-53)
  - No blueprint-specific middleware found
  - General auth middleware may apply

### 1.4 Server vs Client Boundaries

**Server Components:**
- `app/feed-planner/page.tsx` - Server component, fetches user data
- `app/checkout/blueprint/page.tsx` - Server component, creates Stripe session
- `app/checkout/success/page.tsx` - Server component wrapper

**Client Components:**
- `app/feed-planner/feed-planner-client.tsx` - Client wrapper, handles wizard logic
- `components/feed-planner/feed-view-screen.tsx` - Client component, manages feed view
- `components/feed-planner/feed-single-placeholder.tsx` - Client component, free user placeholder
- `components/checkout/success-content.tsx` - Client component, handles post-purchase flow

### 1.5 Route → Component → Data Source Map

| Route | Component | Data Source |
|-------|-----------|-------------|
| `/feed-planner` | `FeedPlannerPage` → `FeedPlannerClient` | `/api/feed-planner/access`, `/api/user/onboarding-status`, `/api/profile/personal-brand` |
| `/feed-planner?feedId=X` | `FeedViewScreen` → `InstagramFeedView` | `/api/feed/[feedId]` or `/api/feed/latest` |
| `/checkout/blueprint` | `BlueprintCheckoutPage` | Stripe API (session creation) |
| `/checkout/success` | `SuccessContent` | `/api/user-by-email`, `/api/checkout-session` |

---

## 2. USER / ENTITY MODELS

### 2.1 Identity Systems

**Primary Identity:**
- **Supabase Auth** (`auth.users`)
  - Primary key: `id` (UUID string)
  - Email-based authentication
  - Session managed via cookies

**Neon Database Identity:**
- **`users` table** (`scripts/00-create-all-tables.sql`, lines 5-24)
  - Primary key: `id` (TEXT - stores Supabase UUID as string)
  - Foreign key: `stripe_customer_id` (TEXT)
  - Fields: `email`, `display_name`, `onboarding_completed` (BOOLEAN)
  - Created via: `getOrCreateNeonUser(authId, email, displayName)` in `lib/user-mapping.ts`

**Identity Mapping:**
- **`lib/user-mapping.ts`** - Maps Supabase auth ID → Neon user ID
- Function: `getUserByAuthId(authId)` - Fetches Neon user by Supabase auth ID
- Function: `getOrCreateNeonUser(authId, email, displayName)` - Creates Neon user if doesn't exist

### 2.2 Blueprint-Specific Entities

**`blueprint_subscribers` table** (`scripts/create-blueprint-subscribers-table.sql`, lines 1-60)
- Primary key: `id` (SERIAL)
- Unique constraints: `email` (VARCHAR), `access_token` (VARCHAR)
- Foreign key: `user_id` (TEXT) → `users.id` (added later via migration)
- Fields:
  - `form_data` (JSONB) - Wizard form responses
  - `feed_style` (VARCHAR) - Selected feed aesthetic
  - `paid_blueprint_purchased` (BOOLEAN) - Purchase flag
  - `paid_blueprint_purchased_at` (TIMESTAMP) - Purchase timestamp
  - `paid_blueprint_stripe_payment_id` (TEXT) - Stripe payment ID
  - `free_grid_used_count` (INTEGER) - Free grid usage counter
  - `free_grid_used_at` (TIMESTAMP) - Free grid usage timestamp
- Created via: `/api/onboarding/unified-onboarding-complete` (line 196-225) OR `/api/blueprint/state` POST (line 220-266)

**`user_personal_brand` table** (referenced in `app/api/onboarding/unified-onboarding-complete/route.ts`)
- Primary key: `id` (SERIAL, inferred)
- Foreign key: `user_id` (TEXT) → `users.id`
- Fields:
  - `business_type`, `ideal_audience`, `transformation_story` (TEXT)
  - `visual_aesthetic` (JSONB) - Array of aesthetic IDs
  - `settings_preference` (JSONB) - Array containing feed style
  - `fashion_style` (JSONB) - Array of fashion style IDs
  - `content_pillars` (JSONB) - Array of content pillar objects
  - `is_completed` (BOOLEAN)
- Created via: `/api/onboarding/unified-onboarding-complete` (line 141-184)

**`feed_layouts` table** (`scripts/21-create-feed-tables-fixed.sql`, lines 9-18)
- Primary key: `id` (SERIAL)
- Foreign key: `user_id` (VARCHAR) → `users.id`
- Fields: `brand_name`, `username`, `status`, `created_at`, `updated_at`
- Created via: `/api/feed/create-free-example` (line 69-87) OR `/api/feed/create-manual`

**`feed_posts` table** (`scripts/21-create-feed-tables-fixed.sql`, lines 21-35)
- Primary key: `id` (SERIAL)
- Foreign keys: `feed_layout_id` → `feed_layouts.id`, `user_id` → `users.id`
- Fields:
  - `position` (INTEGER) - Grid position (1-9 for paid, 1 for free)
  - `post_type` (VARCHAR) - Post type
  - `image_url` (TEXT) - Generated image URL
  - `generation_status` (VARCHAR) - 'pending', 'generating', 'completed', 'failed'
  - `prediction_id` (TEXT) - Replicate prediction ID
  - `prompt` (TEXT) - Generation prompt
  - `generation_mode` (VARCHAR) - 'classic' or 'pro'
- Created via: `/api/feed/create-free-example` (line 155-181) OR `/api/feed/[feedId]/generate-single`

**`subscriptions` table** (`scripts/00-create-all-tables.sql`, lines 42-55)
- Primary key: `id` (SERIAL)
- Foreign key: `user_id` (TEXT) → `users.id`
- Fields:
  - `product_type` (TEXT) - 'paid_blueprint', 'sselfie_studio_membership', etc.
  - `status` (TEXT) - 'active', 'canceled', 'expired'
  - `stripe_subscription_id` (TEXT) - Stripe subscription ID
- Created via: Stripe webhook `/api/webhooks/stripe/route.ts` (line 1159-1167)

### 2.3 Identity Duplication

**DUPLICATION FOUND:**
1. **Wizard Data Storage:**
   - `blueprint_subscribers.form_data` (JSONB) - Old blueprint wizard data
   - `user_personal_brand.*` (multiple columns) - New unified wizard data
   - **Conflict:** Both tables store similar data (business type, audience, aesthetic)
   - **Resolution:** Unified wizard writes to `user_personal_brand`, but `blueprint_subscribers` is still used for template prompt lookup

2. **Feed Style Storage:**
   - `blueprint_subscribers.feed_style` (VARCHAR) - Old blueprint feed style
   - `user_personal_brand.settings_preference` (JSONB array) - New unified wizard feed style
   - **Conflict:** Two sources of truth for feed aesthetic
   - **Resolution:** Code checks `blueprint_subscribers` first, falls back to `user_personal_brand` (see `app/api/feed/[feedId]/generate-single/route.ts`, lines 320-400)

3. **User Identity:**
   - Supabase `auth.users.id` (UUID)
   - Neon `users.id` (TEXT - stores UUID as string)
   - **No conflict:** Properly mapped via `getUserByAuthId()`

### 2.4 Entity Creation Flow

**Free User Journey:**
1. User signs up → Supabase creates `auth.users` record
2. `/auth/callback` → `syncUserWithNeon()` → Creates `users` record
3. User completes wizard → `/api/onboarding/unified-onboarding-complete` → Creates `user_personal_brand` record
4. Same endpoint → Creates `blueprint_subscribers` record (minimal, for tracking)
5. User accesses feed planner → `/api/feed/create-free-example` → Creates `feed_layouts` + `feed_posts` (1 post)

**Paid User Journey (Post-Purchase):**
1. Stripe webhook → `/api/webhooks/stripe/route.ts` → Creates `subscriptions` record (product_type: 'paid_blueprint')
2. Webhook → Updates `blueprint_subscribers.paid_blueprint_purchased = TRUE`
3. Webhook → Calls `grantPaidBlueprintCredits()` → Adds credits to user account

---

## 3. DATA FLOW & SOURCE OF TRUTH

### 3.1 Core Concepts & Sources

| Concept | Source | Location | Notes |
|---------|--------|----------|-------|
| **Auth Identity** | Supabase `auth.users` | Supabase (external) | Primary identity system |
| **User Profile** | Neon `users` table | `scripts/00-create-all-tables.sql` | Mapped from Supabase via `getUserByAuthId()` |
| **Access / Entitlement** | `subscriptions` table + `lib/subscription.ts` | `lib/subscription.ts` | `hasPaidBlueprint()`, `getBlueprintEntitlement()` |
| **Wizard Data** | `user_personal_brand` table | `app/api/onboarding/unified-onboarding-complete/route.ts` | **PRIMARY SOURCE** for unified wizard |
| **Wizard Data (Legacy)** | `blueprint_subscribers.form_data` | `app/api/blueprint/state/route.ts` | **SECONDARY SOURCE** - still used for template prompts |
| **Feed Style** | `user_personal_brand.settings_preference` (JSONB) | Unified wizard | **PRIMARY SOURCE** |
| **Feed Style (Legacy)** | `blueprint_subscribers.feed_style` (VARCHAR) | Old blueprint wizard | **SECONDARY SOURCE** - checked first in generation |
| **Generated Assets** | `feed_posts.image_url` | `app/api/feed/[feedId]/route.ts` | Updated via polling when Replicate completes |
| **Progress / State** | `feed_posts.generation_status` | `feed_posts` table | 'pending', 'generating', 'completed', 'failed' |
| **Payments** | Stripe API + `subscriptions` table | `/api/webhooks/stripe/route.ts` | Webhook creates subscription record |

### 3.2 Multiple Sources Flagged

**⚠️ CRITICAL: Wizard Data Duplication**
- **Primary:** `user_personal_brand` (unified wizard)
- **Secondary:** `blueprint_subscribers.form_data` (legacy blueprint wizard)
- **Impact:** Template prompt selection checks `blueprint_subscribers` first, may miss unified wizard data
- **Location:** `app/api/feed/[feedId]/generate-single/route.ts`, lines 320-400

**⚠️ CRITICAL: Feed Style Duplication**
- **Primary:** `user_personal_brand.settings_preference` (JSONB array)
- **Secondary:** `blueprint_subscribers.feed_style` (VARCHAR)
- **Impact:** Generation endpoint checks legacy source first, may not use unified wizard selection
- **Location:** `app/api/feed/[feedId]/generate-single/route.ts`, lines 320-400

**⚠️ WARNING: Access Control Duplication**
- **Source 1:** `lib/feed-planner/access-control.ts` - `getFeedPlannerAccess()`
- **Source 2:** `lib/subscription.ts` - `hasPaidBlueprint()`, `getBlueprintEntitlement()`
- **Impact:** Both used in different contexts, may diverge
- **Resolution:** `getFeedPlannerAccess()` calls `hasPaidBlueprint()` internally (line 43)

### 3.3 Server vs Client Source Differences

**Server-Side:**
- Access control: `lib/feed-planner/access-control.ts` → `getFeedPlannerAccess()`
- Wizard data: `/api/profile/personal-brand` → Reads from `user_personal_brand`
- Feed data: `/api/feed/[feedId]` → Reads from `feed_layouts` + `feed_posts`

**Client-Side:**
- Access control: `/api/feed-planner/access` → Calls `getFeedPlannerAccess()` server-side
- Wizard data: SWR `/api/profile/personal-brand` → Cached client-side
- Feed data: SWR `/api/feed/[feedId]` → Polled via `useFeedPolling` hook

**No conflicts found** - Client always fetches from server APIs

---

## 4. STATE & PERSISTENCE LAYERS

### 4.1 Database (Primary Persistence)

**Tables Used:**
- `users` - User identity
- `user_personal_brand` - Wizard data (PRIMARY)
- `blueprint_subscribers` - Legacy wizard data + purchase tracking
- `feed_layouts` - Feed containers
- `feed_posts` - Individual posts
- `subscriptions` - Purchase entitlements

**Write Operations:**
- **Wizard completion:** `app/api/onboarding/unified-onboarding-complete/route.ts` (line 116-184)
  - Writes to `user_personal_brand` (UPDATE or INSERT)
  - Writes to `users.onboarding_completed = true`
  - Creates minimal `blueprint_subscribers` record if doesn't exist
- **Feed creation:** `app/api/feed/create-free-example/route.ts` (line 69-181)
  - Creates `feed_layouts` record
  - Creates `feed_posts` record (1 post for free users)
- **Image generation:** `app/api/feed/[feedId]/generate-single/route.ts`
  - Updates `feed_posts.generation_status = 'generating'`
  - Updates `feed_posts.prediction_id`
- **Polling:** `app/api/feed/[feedId]/route.ts` (line 128-200)
  - Updates `feed_posts.image_url` when Replicate completes
  - Updates `feed_posts.generation_status = 'completed'` or 'failed'
- **Purchase:** `/api/webhooks/stripe/route.ts` (line 1192-1292)
  - Creates `subscriptions` record
  - Updates `blueprint_subscribers.paid_blueprint_purchased = TRUE`

**Read Operations:**
- **Wizard data:** `/api/profile/personal-brand` → Reads `user_personal_brand`
- **Feed data:** `/api/feed/[feedId]` → Reads `feed_layouts` + `feed_posts`
- **Access control:** `/api/feed-planner/access` → Reads `subscriptions` + credits

### 4.2 localStorage

**FINDINGS:**
- **`components/feed-planner/**`** - **NO localStorage usage found** (grep returned no matches)
- **`components/onboarding/unified-onboarding-wizard.tsx`** - **NO localStorage usage** (lines 162, 307, 312, 404 - comments indicate removal)
- **`components/onboarding/blueprint-onboarding-wizard.tsx`** - **HAS localStorage** (lines 103, 124, 195, 202, 219)
  - **⚠️ WARNING:** Legacy blueprint wizard still uses localStorage, but unified wizard does not
  - **Impact:** Legacy wizard may conflict with unified wizard if both exist

**What is written:**
- Legacy blueprint wizard saves form state to localStorage (key: `WIZARD_STORAGE_KEY`)
- Unified wizard does NOT use localStorage (SWR handles caching)

**When it's written:**
- Legacy wizard: On form data change (line 195-202)
- Unified wizard: Never (removed)

**When it's read:**
- Legacy wizard: On component mount (line 103-124)
- Unified wizard: Never

**What breaks on refresh:**
- Legacy wizard: State persists in localStorage (may conflict with unified wizard)
- Unified wizard: State fetched from database via SWR (no localStorage)

### 4.3 URL Params

**Used For:**
- **`/feed-planner?feedId=X`** - Specific feed selection
- **`/feed-planner?purchase=success`** - Post-purchase redirect flag
- **`/feed-planner?tab=X`** - Initial tab selection
- **`/checkout/success?session_id=X&email=Y&type=paid_blueprint`** - Post-purchase success page

**Persistence:**
- Not persisted - lost on refresh
- Used for navigation state only

### 4.4 Cookies / Sessions

**Supabase Auth Session:**
- Managed by Supabase client
- Stored in HTTP-only cookies
- Used for authentication on all protected routes

**No custom cookies found** for blueprint state

### 4.5 In-Memory State

**React State:**
- `FeedPlannerClient` - `showWizard` state (line 27)
- `FeedSinglePlaceholder` - `isGenerating` state (line 29)
- `FeedViewScreen` - `isCreatingFreeExample` state (line 36)

**SWR Cache:**
- `/api/feed-planner/access` - Cached for 60 seconds (line 42)
- `/api/user/onboarding-status` - Cached for 5 seconds (line 55)
- `/api/profile/personal-brand` - Cached for 60 seconds (line 72)
- `/api/feed/[feedId]` - Polled via `useFeedPolling` hook

**What breaks on refresh:**
- React state: Lost (re-initialized from props/SWR)
- SWR cache: Persists in memory (revalidated on focus/reconnect)

---

## 5. BUSINESS LOGIC EXECUTION PATH

### 5.1 Critical Logic Flows

#### Flow 1: Free User First Access → Wizard → Feed Creation

**Trigger:** User navigates to `/feed-planner` (first time)

**Execution Path:**
1. **Server:** `app/feed-planner/page.tsx` (line 14-59)
   - Authenticates user via Supabase
   - Fetches `neonUser` via `getUserByAuthId()`
   - Creates user if doesn't exist
   - Renders `SselfieApp` with `initialTab="feed-planner"`

2. **Client:** `app/feed-planner/feed-planner-client.tsx` (line 26-268)
   - Fetches access control via SWR `/api/feed-planner/access`
   - Fetches onboarding status via SWR `/api/user/onboarding-status`
   - **Decision:** If `onboardingCompleted === false` → Show wizard
   - Renders `UnifiedOnboardingWizard` if needed

3. **Wizard Completion:** `components/onboarding/unified-onboarding-wizard.tsx`
   - User completes all steps (business type, audience, aesthetic, selfies)
   - Calls `onComplete()` callback with form data

4. **API:** `app/api/onboarding/unified-onboarding-complete/route.ts` (line 13-238)
   - **DB Write 1:** Updates/creates `user_personal_brand` record
   - **DB Write 2:** Sets `users.onboarding_completed = true`
   - **DB Write 3:** Creates minimal `blueprint_subscribers` record (if doesn't exist)

5. **Client:** `feed-planner-client.tsx` (line 142-177)
   - Closes wizard (`setShowWizard(false)`)
   - Invalidates SWR caches (onboarding-status, access, feed, personal-brand)

6. **Client:** `feed-planner-client.tsx` (line 265-268)
   - Renders `FeedViewScreen` (wizard closed)

7. **Client:** `components/feed-planner/feed-view-screen.tsx` (line 104-145)
   - Detects no feed exists (`feedData?.exists === false`)
   - **Auto-creates feed** for free users via `/api/feed/create-free-example`

8. **API:** `app/api/feed/create-free-example/route.ts` (line 15-210)
   - **DB Write 1:** Creates `feed_layouts` record
   - **DB Write 2:** Creates `feed_posts` record (1 post, position 1)
   - **Template Prompt:** Fetches from `blueprint_subscribers` or `user_personal_brand` (line 122-152)
   - Returns `feedId` and `posts`

9. **Client:** `feed-view-screen.tsx` (line 133)
   - Redirects to `/feed-planner?feedId=X`

10. **Client:** `feed-view-screen.tsx` (line 332-338)
    - Renders `InstagramFeedView` with `feedId`

11. **Client:** `components/feed-planner/instagram-feed-view.tsx`
    - Renders `FeedSinglePlaceholder` for free users (`access.placeholderType === "single"`)

**Re-render Behavior:**
- SWR cache invalidation triggers re-fetch
- Components re-render with new data
- Wizard closes, feed view appears

#### Flow 2: Free User Generates Image

**Trigger:** User clicks "Generate Image" button in `FeedSinglePlaceholder`

**Execution Path:**
1. **Client:** `components/feed-planner/feed-single-placeholder.tsx` (line 32-77)
   - Sets `isGenerating = true`
   - Calls `/api/feed/${feedId}/generate-single` with `postId`

2. **API:** `app/api/feed/[feedId]/generate-single/route.ts`
   - **Template Selection:** (lines 320-400)
     - Checks `blueprint_subscribers.form_data` + `feed_style` (PRIMARY)
     - Falls back to `user_personal_brand.settings_preference` + `visual_aesthetic` (SECONDARY)
     - Maps to `BlueprintCategory` and `BlueprintMood`
     - Retrieves template prompt from `lib/maya/blueprint-photoshoot-templates.ts`
   - **DB Write 1:** Updates `feed_posts.generation_status = 'generating'`
   - **DB Write 2:** Updates `feed_posts.prediction_id` (Replicate prediction ID)
   - **DB Write 3:** Updates `feed_posts.prompt` (template prompt)
   - Calls Replicate Nano Banana Pro API
   - Returns success

3. **Client:** `feed-single-placeholder.tsx` (line 56-64)
   - Shows toast: "Generating photo, This takes about 30 seconds"
   - Calls `onGenerateImage()` callback to trigger SWR revalidation

4. **Polling:** `components/feed-planner/hooks/use-feed-polling.ts`
   - Polls `/api/feed/[feedId]` every 3 seconds
   - Checks for posts with `prediction_id` but no `image_url`

5. **API:** `app/api/feed/[feedId]/route.ts` (line 128-200)
   - Checks Replicate prediction status via `replicate.predictions.get()`
   - **If succeeded:** Updates `feed_posts.image_url` and `generation_status = 'completed'`
   - **If failed:** Updates `generation_status = 'failed'`

6. **Client:** `feed-single-placeholder.tsx` (line 86-90)
   - `useEffect` detects `post.image_url` exists
   - Sets `isGenerating = false`
   - Component re-renders, shows image

**Re-render Behavior:**
- Polling updates SWR cache
- Component re-renders with `post.image_url`
- Loading state clears, image displays

#### Flow 3: Free User Clicks Upsell → Purchase → Upgrade

**Trigger:** User clicks "Unlock Full Feed Planner" button in `FeedSinglePlaceholder`

**Execution Path:**
1. **Client:** `components/feed-planner/feed-single-placeholder.tsx` (line 177)
   - Navigates to `/checkout/blueprint`

2. **Server:** `app/checkout/blueprint/page.tsx` (line 35-94)
   - Checks feature flag `FEATURE_PAID_BLUEPRINT_ENABLED`
   - **If authenticated:** Calls `startProductCheckoutSession("paid_blueprint")`
   - **If unauthenticated:** Calls `createLandingCheckoutSession("paid_blueprint")`
   - Redirects to `/checkout?client_secret=...&product_type=paid_blueprint`

3. **Client:** `app/checkout/page.tsx` (Stripe Checkout)
   - User completes payment
   - Stripe redirects to `/checkout/success?session_id=X&type=paid_blueprint`

4. **Webhook:** `/api/webhooks/stripe/route.ts` (async, may arrive before redirect)
   - **Event:** `checkout.session.completed` (line 946)
   - **DB Write 1:** Creates `subscriptions` record (product_type: 'paid_blueprint', status: 'active')
   - **DB Write 2:** Updates `blueprint_subscribers.paid_blueprint_purchased = TRUE` (line 1192-1292)
   - **DB Write 3:** Calls `grantPaidBlueprintCredits()` → Adds credits (line 1105-1115)
   - **Email:** Sends paid blueprint delivery email (line 1334-1373)

5. **Client:** `components/checkout/success-content.tsx` (line 15-574)
   - **If authenticated:** Auto-redirects to `/feed-planner?purchase=success` after 2 seconds (line 85-92)
   - **If unauthenticated:** Shows account creation form

6. **Client:** `app/feed-planner/page.tsx` (line 44)
   - Detects `purchase=success` query param
   - Passes `purchaseSuccess={true}` to `SselfieApp`

7. **Client:** `app/feed-planner/feed-planner-client.tsx` (line 50-57)
   - Fetches access control (now returns `isPaidBlueprint: true`)
   - Wizard logic: Paid users skip wizard if `onboardingCompleted === true`

8. **Client:** `components/feed-planner/feed-view-screen.tsx` (line 332-338)
   - Renders `InstagramFeedView` with `access.isPaidBlueprint = true`

9. **Client:** `components/feed-planner/instagram-feed-view.tsx`
   - Renders `FeedGridPreview` (3x3 grid) instead of `FeedSinglePlaceholder`

**Re-render Behavior:**
- Access control cache invalidated
- Component re-renders with new access level
- Grid view appears (upgrade complete)

---

## 6. ASYNC & SIDE-EFFECT ANALYSIS

### 6.1 Background Jobs

**None found** - No background job system (e.g., Bull, BullMQ) detected

### 6.2 Webhooks

**Stripe Webhook:** `/api/webhooks/stripe/route.ts`
- **Event:** `checkout.session.completed`
- **Processing:**
  - Creates `subscriptions` record
  - Updates `blueprint_subscribers.paid_blueprint_purchased`
  - Grants credits via `grantPaidBlueprintCredits()`
  - Sends delivery email
- **Idempotency:** Uses `webhook_events` table to prevent duplicate processing (line 65-93)
- **Rate Limiting:** `checkWebhookRateLimit()` (line 96-101)
- **Timeout:** Not found - webhook may hang if Stripe API is slow

### 6.3 Polling

**Feed Polling:** `components/feed-planner/hooks/use-feed-polling.ts`
- **Endpoint:** `/api/feed/[feedId]`
- **Interval:** 3 seconds (if posts are generating)
- **Condition:** Polls if `post.prediction_id && !post.image_url` OR `feed.status === 'processing'`
- **Grace Period:** 15 seconds after last update (stops polling)
- **Timeout:** Not found - may poll indefinitely if prediction never completes
- **Fallback:** Not found - no error handling for stuck predictions

**Success Page Polling:** `components/checkout/success-content.tsx` (line 26-74)
- **Endpoint:** `/api/user-by-email?email=X`
- **Interval:** 2 seconds
- **Max Attempts:** 40 (80 seconds total)
- **Purpose:** Wait for webhook to create user account
- **Timeout:** Yes (40 attempts max)

### 6.4 Loading / Blocking States

**Wizard Loading:**
- `FeedPlannerClient` - `isCheckingWizard` state (line 28)
- Blocks render until access + onboarding status loaded
- Shows `UnifiedLoading` component

**Feed Creation Loading:**
- `FeedViewScreen` - `isCreatingFreeExample` state (line 36)
- Blocks feed view while creating free example
- Shows `UnifiedLoading` component

**Image Generation Loading:**
- `FeedSinglePlaceholder` - `isGenerating` state (line 29)
- Combined with `post.generation_status === "generating"` check
- Shows spinner overlay

### 6.5 What Waits on What

**Dependencies:**
1. **Wizard visibility** → Waits on: `access` + `onboardingStatus` (SWR)
2. **Feed creation** → Waits on: Access control (to determine free vs paid)
3. **Image generation** → Waits on: Post exists + credits available
4. **Polling** → Waits on: `prediction_id` exists (from generation API)
5. **Success page** → Waits on: Webhook to create user (for unauthenticated users)

### 6.6 What Can Hang Indefinitely

**⚠️ CRITICAL:**
1. **Feed Polling** - No timeout for stuck Replicate predictions
   - **Location:** `use-feed-polling.ts`
   - **Impact:** May poll forever if prediction fails silently
   - **Severity:** Medium

2. **Stripe Webhook** - No timeout for slow Stripe API calls
   - **Location:** `/api/webhooks/stripe/route.ts`
   - **Impact:** Webhook may timeout (Vercel 10s limit) if Stripe API is slow
   - **Severity:** High

3. **Template Prompt Lookup** - No fallback if both sources fail
   - **Location:** `app/api/feed/[feedId]/generate-single/route.ts`, lines 320-400
   - **Impact:** Uses default template if no data found (line 400)
   - **Severity:** Low (has fallback)

### 6.7 What Has No Timeout or Fallback

**⚠️ CRITICAL:**
1. **Feed Polling** - No timeout, no max attempts
   - **Location:** `use-feed-polling.ts`
   - **Recommendation:** Add max polling duration (e.g., 5 minutes)

2. **Replicate Prediction Check** - No retry logic
   - **Location:** `app/api/feed/[feedId]/route.ts`, line 136
   - **Impact:** Single API failure stops polling for that post
   - **Recommendation:** Add retry with exponential backoff

---

## 7. DUPLICATION & COMPLEXITY FINDINGS

### 7.1 Parallel Systems Solving the Same Problem

**⚠️ CRITICAL: Wizard Data Storage**
- **System 1:** `user_personal_brand` (unified wizard)
- **System 2:** `blueprint_subscribers.form_data` (legacy blueprint wizard)
- **Evidence:**
  - Unified wizard writes to `user_personal_brand` (`app/api/onboarding/unified-onboarding-complete/route.ts`, line 116-184)
  - Generation endpoint checks `blueprint_subscribers` first (`app/api/feed/[feedId]/generate-single/route.ts`, line 320-400)
  - **Impact:** Template prompts may not reflect unified wizard selections if `blueprint_subscribers` is empty

**⚠️ CRITICAL: Feed Style Storage**
- **System 1:** `user_personal_brand.settings_preference` (JSONB array)
- **System 2:** `blueprint_subscribers.feed_style` (VARCHAR)
- **Evidence:**
  - Unified wizard writes to `settings_preference` (line 94-97)
  - Generation endpoint checks `blueprint_subscribers.feed_style` first (line 320-400)
  - **Impact:** Same as above

**⚠️ WARNING: Access Control Logic**
- **System 1:** `lib/feed-planner/access-control.ts` - `getFeedPlannerAccess()`
- **System 2:** `lib/subscription.ts` - `hasPaidBlueprint()`, `getBlueprintEntitlement()`
- **Evidence:**
  - `getFeedPlannerAccess()` calls `hasPaidBlueprint()` internally (line 43)
  - Both used in different contexts
  - **Impact:** Low (properly integrated)

### 7.2 Temporary Flows That Became Permanent

**Not found** - No evidence of temporary flows

### 7.3 Features Rebuilt Instead of Reused

**⚠️ WARNING: Wizard Components**
- **Component 1:** `components/onboarding/unified-onboarding-wizard.tsx` (new, used)
- **Component 2:** `components/onboarding/blueprint-onboarding-wizard.tsx` (legacy, may still exist)
- **Evidence:**
  - Unified wizard removed localStorage (line 162, 307, 312, 404)
  - Legacy wizard still uses localStorage (grep found matches)
  - **Impact:** Low (unified wizard is primary, legacy may be unused)

### 7.4 Guest vs Authenticated Duplication

**⚠️ CRITICAL: Checkout Flow**
- **Authenticated:** `startProductCheckoutSession()` - Includes `user_id` in metadata
- **Unauthenticated:** `createLandingCheckoutSession()` - No `user_id`, email-based lookup
- **Evidence:** `app/checkout/blueprint/page.tsx`, lines 60-69
- **Impact:** Webhook must handle both cases (line 362-371)

**⚠️ WARNING: Success Page**
- **Authenticated:** Auto-redirects to `/feed-planner?purchase=success` (line 85-92)
- **Unauthenticated:** Shows account creation form (line 238-370)
- **Evidence:** `components/checkout/success-content.tsx`
- **Impact:** Two different user experiences

---

## 8. FAILURE MODES & RISK ASSESSMENT

### 8.1 Data Loss Scenarios

**Severity: HIGH**
1. **Wizard Data Loss on Upgrade**
   - **Scenario:** User completes unified wizard, upgrades to paid, wizard data not migrated
   - **Location:** `app/api/onboarding/unified-onboarding-complete/route.ts` writes to `user_personal_brand`
   - **Risk:** Low (data persists in `user_personal_brand`, not lost on upgrade)
   - **Mitigation:** Data already persisted, upgrade doesn't delete it

2. **Feed Post Loss on Generation Failure**
   - **Scenario:** Replicate prediction fails, `generation_status = 'failed'`, post remains in DB
   - **Location:** `app/api/feed/[feedId]/route.ts`, line 148-158
   - **Risk:** Low (post remains, user can retry)
   - **Mitigation:** Post not deleted, user can regenerate

**Severity: MEDIUM**
3. **Template Prompt Loss**
   - **Scenario:** Both `blueprint_subscribers` and `user_personal_brand` missing data
   - **Location:** `app/api/feed/[feedId]/generate-single/route.ts`, line 400
   - **Risk:** Low (falls back to default template)
   - **Mitigation:** Default template exists

### 8.2 Revenue-Impacting Failures

**Severity: HIGH**
1. **Webhook Failure → No Subscription Created**
   - **Scenario:** Stripe webhook fails, payment succeeds but no subscription record
   - **Location:** `/api/webhooks/stripe/route.ts`
   - **Risk:** User pays but doesn't get access
   - **Mitigation:** Idempotency check prevents duplicates, but doesn't handle missing records
   - **Recommendation:** Add manual reconciliation process

2. **Webhook Timeout → Partial Processing**
   - **Scenario:** Webhook times out (Vercel 10s limit) before completing
   - **Location:** `/api/webhooks/stripe/route.ts`
   - **Risk:** Subscription created but credits not granted
   - **Mitigation:** None (webhook may partially complete)
   - **Recommendation:** Add retry logic or background job

**Severity: MEDIUM**
3. **Access Control Cache Stale → Wrong Features Shown**
   - **Scenario:** User upgrades, but access control cache not invalidated
   - **Location:** `lib/feed-planner/access-control.ts`
   - **Risk:** User sees free features after upgrade
   - **Mitigation:** SWR cache invalidated on purchase success (line 169)
   - **Recommendation:** Add manual refresh button

### 8.3 User Lock-Out Paths

**Severity: HIGH**
1. **Wizard Never Completes**
   - **Scenario:** User stuck in wizard, can't proceed to feed planner
   - **Location:** `feed-planner-client.tsx`, line 100-139
   - **Risk:** User can't access feed planner
   - **Mitigation:** Wizard can be dismissed (redirects to `/studio`, line 256)
   - **Recommendation:** Add "Skip for now" option

2. **Feed Creation Fails → No Feed**
   - **Scenario:** `/api/feed/create-free-example` fails, user sees placeholder forever
   - **Location:** `feed-view-screen.tsx`, line 104-145
   - **Risk:** User can't generate images
   - **Mitigation:** Error handling shows error message (line 214-223)
   - **Recommendation:** Add retry button

**Severity: MEDIUM**
3. **Polling Stuck → Image Never Appears**
   - **Scenario:** Replicate prediction stuck, polling continues forever
   - **Location:** `use-feed-polling.ts`
   - **Risk:** User sees loading state forever
   - **Mitigation:** None (no timeout)
   - **Recommendation:** Add max polling duration

### 8.4 Scaling Risks

**Severity: MEDIUM**
1. **SWR Cache Invalidation Storm**
   - **Scenario:** Multiple users upgrade simultaneously, cache invalidation floods API
   - **Location:** `feed-planner-client.tsx`, line 168-174
   - **Risk:** API rate limiting, slow responses
   - **Mitigation:** SWR deduplication (line 42, 55, 72)
   - **Recommendation:** Batch cache invalidation

2. **Feed Polling Load**
   - **Scenario:** Many users generating images simultaneously, polling increases API load
   - **Location:** `use-feed-polling.ts`
   - **Risk:** Database load, API rate limiting
   - **Mitigation:** Polling limited to 3s interval, only when generating
   - **Recommendation:** Consider WebSocket for real-time updates

---

## 9. AUDIT SUMMARY (NO SOLUTIONS)

### 9.1 What is Fragile

1. **Wizard Data Duplication**
   - Two sources of truth (`user_personal_brand` vs `blueprint_subscribers`)
   - Generation endpoint checks legacy source first
   - May miss unified wizard data if legacy source is empty

2. **Feed Polling Timeout**
   - No timeout for stuck Replicate predictions
   - May poll indefinitely if prediction fails silently
   - No error handling for stuck predictions

3. **Webhook Partial Processing**
   - Webhook may timeout before completing all operations
   - No retry logic for failed operations
   - User may pay but not receive access

4. **Template Prompt Selection**
   - Checks legacy source first, may not use unified wizard data
   - Fallback to default template if both sources fail
   - No validation that template matches user's selections

### 9.2 What is Over-Engineered

1. **Dual Wizard Systems**
   - Unified wizard + legacy blueprint wizard
   - Legacy wizard still uses localStorage (unified doesn't)
   - Both may exist in codebase, causing confusion

2. **Access Control Layers**
   - Multiple functions checking subscription status
   - `getFeedPlannerAccess()` calls `hasPaidBlueprint()` internally
   - Could be simplified to single source of truth

3. **Success Page Polling**
   - Polls for user account creation (40 attempts, 80 seconds)
   - Only needed for unauthenticated users
   - Could use WebSocket or webhook callback instead

### 9.3 What Blocks Velocity

1. **Data Source Confusion**
   - Developers must know which source to check (legacy vs unified)
   - Generation endpoint logic is complex (lines 320-400)
   - Hard to debug template prompt selection issues

2. **Cache Invalidation Complexity**
   - Multiple SWR caches must be invalidated on wizard completion
   - Must invalidate in correct order (onboarding-status first)
   - Easy to miss a cache, causing stale data

3. **Webhook Reliability**
   - No retry logic for failed webhook operations
   - Must manually reconcile if webhook fails
   - Blocks user access if webhook doesn't complete

4. **Polling Limitations**
   - No timeout, may poll forever
   - No error handling for stuck predictions
   - Hard to debug why image never appears

---

## DONE WHEN

This audit can be used as a single source of truth to design a solution without guesswork.

**Key Findings:**
- Wizard data stored in two places (unified vs legacy)
- Generation endpoint checks legacy source first
- No timeout for feed polling
- Webhook may partially complete
- Access control has multiple layers

**Critical Issues:**
1. Template prompt selection may not use unified wizard data
2. Feed polling can hang indefinitely
3. Webhook failure can block user access

**Next Steps:**
- Design solution to consolidate wizard data sources
- Add timeout to feed polling
- Add retry logic to webhook processing
- Simplify access control logic

---

**END OF AUDIT**
