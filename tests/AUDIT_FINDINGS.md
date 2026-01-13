# BLUEPRINT FUNNEL - E2E TEST AUDIT FINDINGS

**Date:** January 2025  
**Status:** ✅ Complete Audit

---

## 2.1 - SIGN UP FLOW AUDIT ✅

### Route
- **Sign Up Page:** `/auth/sign-up`
- **Component:** `app/auth/sign-up/page.tsx`

### Form Fields
- **Name Field:**
  - Selector: `input#name`
  - Type: `text`
  - Placeholder: "Your name"
  - Required: Yes

- **Email Field:**
  - Selector: `input#email` (for new users)
  - Selector: `input#email-existing` (for existing users - password-only flow)
  - Type: `email`
  - Placeholder: "you@example.com"
  - Required: Yes
  - Auto-checks if user exists (debounced)

- **Password Field:**
  - Selector: `input#password` (for new users)
  - Selector: `input#password-existing` (for existing users)
  - Type: `password`
  - Required: Yes
  - Min length: 8 characters

### Submit Button
- **New User Sign Up:**
  - Selector: `button[type="submit"]` (inside form for new users)
  - Text: "Sign Up" (or "Creating account..." when loading)
  - Disabled when: `isLoading || checkingUser`

- **Existing User Login:**
  - Selector: `button[type="submit"]` (inside form for existing users)
  - Text: "Sign In" (or "Signing in..." when loading)

### Success Redirect
- **After successful sign up:**
  - Redirects to: `/studio?tab=feed-planner` (or `next` query param if provided)
  - If sign-in fails (email not confirmed): `/auth/sign-up-success`

### Error Handling
- Error message displayed in: `<p className="text-sm text-red-400">` (inside form)
- Common errors:
  - "Invalid email or password. Please try again."
  - "Please confirm your email before logging in. Check your inbox."

### Notes
- Page has dual flow: new user signup OR existing user password-only login
- Auto-confirms email for free signups
- Checks if user exists when email is entered (debounced 500ms)

---

## 2.2 - ONBOARDING WIZARD FLOW AUDIT ✅

### Entry Point
- **Component:** `components/onboarding/unified-onboarding-wizard.tsx`
- **Trigger:** Shown automatically in `FeedPlannerClient` if onboarding not completed
- **Route:** Wizard is a modal/dialog, not a separate page

### Total Steps
- **8 Steps Total** (including welcome step)
- Steps defined in `UNIFIED_STEPS` array (line 102-151)

### Step Breakdown

#### Step 0: Welcome
- **Title:** "Welcome"
- **Subtitle:** "Let's get started"
- **Fields:** None (just welcome message)
- **Button:** "Continue →" (text from line 904: `currentStep === totalSteps - 1 ? "Complete" : "Continue →"`)

#### Step 1: Business Type
- **Title:** "What do you do?"
- **Subtitle:** "Step 1 of 8"
- **Field:** `businessType` (text input)
- **Button:** "Continue →"

#### Step 2: Audience Builder
- **Title:** "Who is your ideal audience?"
- **Subtitle:** "Step 2 of 8"
- **Field:** `isAudienceBuilder: true` (custom audience builder component)
- **Required:** `idealAudience.trim().length > 0`
- **Button:** "Continue →"

#### Step 3: Story
- **Title:** "What's your story?"
- **Subtitle:** "Step 3 of 8"
- **Field:** `transformationStory` (textarea)
- **Button:** "Continue →"

#### Step 4: Visual Style
- **Title:** "What's your visual style?"
- **Subtitle:** "Step 4 of 8"
- **Field:** `isVisualSelector: true` (visual aesthetic selector)
- **Options:** minimal, luxury, warm, edgy, professional, beige
- **Required:** `visualAesthetic.length > 0 && feedStyle.length > 0`
- **Button:** "Continue →"

#### Step 5: Selfie Upload
- **Title:** "Upload your selfies"
- **Subtitle:** "Step 5 of 8"
- **Field:** `isSelfieUpload: true` (selfie upload component)
- **Required:** `selfieImages.length > 0`
- **Button:** "Continue →"

#### Step 6: Optional Details
- **Title:** "Optional details"
- **Subtitle:** "Step 6 of 8"
- **Field:** `isOptional: true` (optional fields)
- **Required:** No (optional step)
- **Button:** "Continue →"

#### Step 7: Brand Pillars (Optional)
- **Title:** "Create your content pillars"
- **Subtitle:** "Step 7 of 8 (Optional)"
- **Field:** `isBrandPillars: true` (content pillars builder)
- **Required:** No (optional step)
- **Button:** "Complete" (last step)

### Navigation
- **Continue Button:**
  - Selector: `button:has-text("Continue →")` or `button:has-text("Complete")`
  - Text: "Continue →" (all steps except last), "Complete" (last step)
  - Disabled when: `isSaving` or `!canProceed()`

- **Back Button:** Not visible in code (wizard doesn't have back navigation)

### Completion
- **Action:** Calls `onComplete` callback with form data
- **Redirect:** Wizard closes, user stays on feed planner page
- **Storage:** Data saved to database via API

### Notes
- Wizard is a Dialog component (modal)
- Progress bar shows: `((currentStep + 1) / totalSteps) * 100`
- Data is fetched from `/api/profile/personal-brand` if user has existing data
- Wizard auto-opens if onboarding not completed

---

## 2.3 - FREE PREVIEW FLOW AUDIT ✅

### Route
- **Feed Planner:** `/feed-planner`
- **Component:** `app/feed-planner/page.tsx` → `FeedPlannerClient` → `FeedViewScreen` → `InstagramFeedView` → `FeedSinglePlaceholder`

### Free Mode Component
- **Component:** `components/feed-planner/feed-single-placeholder.tsx`
- **Shown when:** `access.placeholderType === "single"` (free users)

### Preview Generation
- **Generate Button:**
  - Selector: `button:has-text("Generate Image")` (line 207)
  - Location: Overlay on single 9:16 placeholder
  - API Call: `POST /api/feed/${feedId}/generate-single`
  - Body: `{ postId: post.id }`

### Credit Usage
- **Credits per preview:** 2 credits (from user journey docs)
- **Credit check:** Fetches from `/api/credits/balance` (returns `total_used`)

### Preview Display
- **Image Display:**
  - Selector: `img[src="${post.image_url}"]` (line 177)
  - Aspect ratio: 9:16
  - Container: `div.aspect-[9/16]` (line 175)

### Upsell Modal Trigger
- **Condition:** `creditsUsed >= 2` (line 237)
- **Modal Component:** `components/feed-planner/free-mode-upsell-modal.tsx`
- **Trigger Button:**
  - If `creditsUsed >= 2`: Button text "Continue Creating" (line 243)
  - If `creditsUsed < 2`: Button text "Unlock Full Feed Planner" (line 252)

### Upsell Modal
- **Component:** `FreeModeUpsellModal`
- **Options:**
  1. **Buy Credits:**
     - Button text: "Buy Credits"
     - Action: Navigates to `/account?tab=credits`
     - Selector: `button:has-text("Buy Credits")` (line 57)
  
  2. **Unlock Full Blueprint:**
     - Button text: "Unlock Full Blueprint"
     - Action: Opens `BuyBlueprintModal`
     - Selector: `button:has-text("Unlock Full Blueprint")` (line 73)

### Notes
- Free users see single 9:16 placeholder (not grid)
- Generation takes ~30 seconds (toast notification shown)
- Polling detects when image is ready
- Upsell modal shows automatically after 2 credits used

---

## 2.4 - STRIPE CHECKOUT FLOW AUDIT ✅

### Checkout Initiation
- **Component:** `components/sselfie/buy-blueprint-modal.tsx`
- **Trigger:** Button "Unlock Full Blueprint" in `FreeModeUpsellModal` or direct button
- **Modal:** Dialog component with product selection

### Product Selection
- **Product:** "paid_blueprint"
- **Price:** $47 (from `getProductById("paid_blueprint")`)
- **Button:** `button:has-text("Continue to Checkout")` (line 150)

### Checkout API
- **Authenticated Users:**
  - Function: `startProductCheckoutSession("paid_blueprint", promoCode)`
  - File: `app/actions/stripe.ts`
  - Returns: Stripe client secret

- **Unauthenticated Users:**
  - Function: `createLandingCheckoutSession("paid_blueprint", promoCode)`
  - File: `app/actions/landing-checkout.ts`
  - Returns: Stripe client secret

### Stripe Embedded Checkout
- **Component:** `EmbeddedCheckout` from `@stripe/react-stripe-js`
- **Provider:** `EmbeddedCheckoutProvider`
- **On Complete:** Calls `handleCheckoutComplete` (line 71)

### Success Page
- **Route:** `/checkout/success`
- **Query Params:**
  - `session_id`: Stripe session ID
  - `email`: User email (optional)
  - `type`: "paid_blueprint"
- **Component:** `components/checkout/success-content.tsx`
- **Redirect:** After webhook completes, redirects to `/feed-planner?purchase=success`

### Webhook
- **Endpoint:** `POST /api/webhooks/stripe/route.ts`
- **Handles:** `checkout.session.completed` event
- **Actions:**
  - Creates subscription record
  - Grants 60 credits
  - Updates `blueprint_subscribers` table
  - Sets `paid_blueprint_purchased = true`

### Data Stored After Payment
- **Subscriptions Table:**
  - `user_id`
  - `product_type`: "paid_blueprint"
  - `plan`: "one_time"
  - `status`: "active"
  - `stripe_subscription_id`
  - `stripe_customer_id`

- **User Credits:**
  - `balance`: +60 credits
  - `total_purchased`: +60

- **Blueprint Subscribers:**
  - `paid_blueprint_purchased`: true
  - `paid_blueprint_purchased_at`: NOW()

### Notes
- Uses Stripe Embedded Checkout (not redirect)
- Success page polls `/api/feed-planner/access` until `isPaidBlueprint` is true
- Webhook must complete before user gets paid access

---

## 2.5 - WELCOME WIZARD FLOW AUDIT ✅

### Component
- **File:** `components/feed-planner/welcome-wizard.tsx`
- **Type:** Dialog component (modal)

### Trigger Condition
- **Location:** `app/feed-planner/feed-planner-client.tsx` (line 153-167)
- **Condition:**
  - User is paid blueprint (`access.isPaidBlueprint === true`)
  - Welcome wizard not shown (`welcomeStatus.welcomeShown === false`)
  - Fetches from: `/api/feed-planner/welcome-status` (GET)

### Number of Steps
- **Total Steps:** 4 steps
- **Steps Array:** Defined in `steps` array (line 24-91)

### Step Breakdown

#### Step 1: Welcome
- **Title:** "Welcome to your Feed Planner!"
- **Content:** Explains 12 photos capability
- **Icon:** Sparkles
- **Button:** "Next" (or "Let's Go!")

#### Step 2: Generate Photos
- **Title:** "Generate your photos"
- **Content:** Explains clicking placeholders
- **Icon:** Grid3x3
- **Button:** "Next"

#### Step 3: Add Captions & Strategy
- **Title:** "Add captions and strategy"
- **Content:** Explains Post and Strategy tabs
- **Icon:** FileText
- **Button:** "Next"

#### Step 4: You're All Set
- **Title:** "You're all set!"
- **Content:** Final encouragement
- **Icon:** Check
- **Button:** "Start Creating" (last step)

### Navigation
- **Next Button:**
  - Selector: `button:has-text("Next")` or `button:has-text("Start Creating")`
  - Text: "Next" (steps 1-3), "Start Creating" (step 4)

- **Dismiss:** Can close via Dialog overlay click (calls `handleDismiss`)

### Completion
- **Action:** Calls `onComplete` callback
- **API Call:** `POST /api/feed-planner/welcome-status` (line 296-303)
- **Storage:** Sets `feed_planner_welcome_shown = true` in `user_personal_brand` table
- **After Completion:** Wizard closes, user sees feed planner grid

### Notes
- Shows only once per user (stored in database)
- Simple, warm language (no AI fluff)
- Progress bar shows completion percentage

---

## 2.6 - PAID FEED GRID FLOW AUDIT ✅

### Component
- **File:** `components/feed-planner/feed-grid.tsx`
- **Shown when:** `access.isPaidBlueprint === true` (paid users)

### Grid Layout
- **CSS Classes:** `grid grid-cols-3 md:grid-cols-4` (line 92)
- **Mobile:** 3 columns (4 rows = 12 posts)
- **Desktop:** 4 columns (3 rows = 12 posts)
- **Total Positions:** 12 posts (positions 1-12)

### Placeholder Selectors
- **Grid Container:** `div.grid.grid-cols-3.md\\:grid-cols-4` (line 92)
- **Post Placeholders:** Each post rendered in `.map()` (line 93)
- **Post Card:** Individual post card with position

### Generate Button
- **Selector:** `button:has-text("Generate image")` (line 144)
- **Location:** Overlay on each placeholder
- **Shown when:** `showGenerateButton === true` (line 89, requires `access.canGenerateImages`)
- **API Call:** `POST /api/feed/${feedId}/generate-single` (line 56)
- **Body:** `{ postId: post.id }`

### Image Display
- **Selector:** `img[src="${post.image_url}"]` (line 117)
- **Container:** `div.aspect-square` (line 105)
- **Aspect Ratio:** Square (1:1) for grid posts

### Maya Integration
- **API Endpoint:** `/api/feed/[feedId]/generate-single/route.ts`
- **For Paid Users:**
  - Loads preview template from `feed_posts[0].prompt`
  - Calls `/api/maya/generate-feed-prompt` with:
    - `referencePrompt`: Preview template
    - `feedPosition`: Current position (1-12)
    - `proMode`: true
  - Generates unique prompt for each position

### Generation Status
- **Loading State:**
  - Selector: `div:has-text("Generating...")` (when `isGenerating === true`)
  - Shows: Loader2 icon + "Generating..." text
- **Complete State:**
  - Image appears when `post.image_url` exists
  - Polling detects completion

### Notes
- Grid shows 12 placeholders for paid users
- Each position can generate independently
- Maya generates unique prompts maintaining preview aesthetic
- Generation takes ~30 seconds per image

---

## DATABASE SCHEMA FOR TEST HELPERS

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- Supabase UUID as string
  email TEXT UNIQUE,
  display_name TEXT,
  ...
)
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_name TEXT NOT NULL,  -- e.g., "paid_blueprint"
  status TEXT NOT NULL,  -- e.g., "active"
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  ...
)
```

### User Credits Table
```sql
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) UNIQUE,
  balance INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  ...
)
```

### User Personal Brand Table
```sql
-- Contains welcome wizard flag
feed_planner_welcome_shown BOOLEAN DEFAULT FALSE
```

### Blueprint Subscribers Table
```sql
CREATE TABLE blueprint_subscribers (
  id SERIAL PRIMARY KEY,
  user_id TEXT,  -- May be NULL for non-users
  email VARCHAR(255),
  paid_blueprint_purchased BOOLEAN DEFAULT FALSE,
  paid_blueprint_purchased_at TIMESTAMPTZ,
  ...
)
```

---

## SUMMARY

### Key Routes
- Sign Up: `/auth/sign-up`
- Login: `/auth/login`
- Feed Planner: `/feed-planner`
- Checkout Success: `/checkout/success`
- Account/Credits: `/account?tab=credits`

### Key Components
- Sign Up: `app/auth/sign-up/page.tsx`
- Onboarding: `components/onboarding/unified-onboarding-wizard.tsx`
- Free Preview: `components/feed-planner/feed-single-placeholder.tsx`
- Paid Grid: `components/feed-planner/feed-grid.tsx`
- Buy Blueprint: `components/sselfie/buy-blueprint-modal.tsx`
- Upsell Modal: `components/feed-planner/free-mode-upsell-modal.tsx`
- Welcome Wizard: `components/feed-planner/welcome-wizard.tsx`

### Key API Endpoints
- Credit Balance: `GET /api/credits/balance`
- Generate Single: `POST /api/feed/${feedId}/generate-single`
- Welcome Status: `GET /api/feed-planner/welcome-status`
- Welcome Status Update: `POST /api/feed-planner/welcome-status`
- Feed Planner Access: `GET /api/feed-planner/access`
- Checkout Session: `GET /api/checkout-session?session_id=${sessionId}`
- Stripe Webhook: `POST /api/webhooks/stripe`

---

**AUDIT COMPLETE ✅**
