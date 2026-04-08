# Authentication & Onboarding Experience Audit

**Date:** 2026-01-XX  
**Auditor:** Principal Engineer (Forensic Audit Mode)  
**Scope:** Post-signup/sign-in user experience based on feature flags (free, one-time, membership)  
**Objective:** Identify all onboarding/welcome flows and opportunities for consolidation

---

## 1. SYSTEM BOUNDARY & ENTRY POINTS

### Public Routes (Unauthenticated)

| Route | Component | Redirect Behavior | Notes |
|-------|-----------|-------------------|-------|
| `/` | `app/page.tsx` → `LandingPage` | Redirects authenticated users to `/studio` (with referer check) | **Server Component** - Checks auth, conditionally redirects |
| `/auth/sign-up` | `app/auth/sign-up/page.tsx` | Redirects to `/studio` (or `next` param) after auto-confirm | **Client Component** - Auto-confirms email, then redirects |
| `/auth/login` | `app/auth/login/page.tsx` | Redirects to `returnTo` param or `/studio` | **Client Component** |
| `/auth/callback` | `app/auth/callback/route.ts` | Always redirects to `/studio` | **Server Route Handler** - OAuth/email confirmation callback |
| `/auth/confirm` | `app/auth/confirm/route.ts` | Redirects to `next` param (default: `/studio`) | **Server Route Handler** - Email confirmation token handler |

### Protected Routes (Authenticated Required)

| Route | Component | Auth Check | Data Source |
|-------|-----------|------------|-------------|
| `/studio` | `app/studio/page.tsx` → `SselfieApp` | `supabase.auth.getUser()` → redirects to `/auth/login` if no user | **Server Component** - Fetches `neonUser`, `subscription`, passes to client |
| `/feed-planner` | `app/feed-planner/page.tsx` | Same as `/studio` | **Server Component** - Similar auth flow |
| `/blueprint` | `app/blueprint/page-server.tsx` | **UNKNOWN** - Not audited (outside scope) | Guest token system (legacy) |

### Middleware

| File | Location | Function |
|------|----------|----------|
| `middleware.ts` | Root | Calls `updateSession()` from `lib/supabase/middleware.ts` |
| `lib/supabase/middleware.ts` | `lib/supabase/` | Updates Supabase session, **does NOT redirect** (redirect logic in page components) |

### Client-Side Boundaries

| Component | Type | Responsibility |
|-----------|------|----------------|
| `SselfieApp` | Client Component | Main app shell - handles tab navigation, onboarding wizards, state management |
| `OnboardingWizard` | Client Component | Training model onboarding (upload images → train model) |
| `BlueprintWelcomeWizard` | Client Component | Blueprint welcome screen (new feature, Phase 2) |
| `SuccessContent` | Client Component | Post-checkout success page with polling logic |

---

## 2. USER / ENTITY MODELS

### Identity Systems

**Evidence:** THREE identity systems exist

#### System 1: Supabase Auth (`auth.users`)
- **Primary Key:** `id` (UUID)
- **Created:** Via `supabase.auth.signUp()` or `supabaseAdmin.auth.admin.createUser()`
- **Resolved:** Via `supabase.auth.getUser()` (session-based)
- **Location:** Supabase hosted service
- **Fields:** `email`, `user_metadata`, `email_confirm`, `recovery_sent_at`

#### System 2: Neon Users (`users` table)
- **Primary Key:** `id` (TEXT - stores Supabase UUID)
- **Created:** Via `getOrCreateNeonUser(authId, email, displayName)` in `lib/user-sync.ts`
- **Resolved:** Via `getUserByAuthId(authId)` in `lib/user-mapping.ts`
- **Location:** Neon PostgreSQL (`DATABASE_URL`)
- **Fields:** `email`, `display_name`, `onboarding_completed`, `last_login_at`, `stripe_customer_id`

#### System 3: Blueprint Subscribers (`blueprint_subscribers` table)
- **Primary Key:** `id` (SERIAL)
- **Created:** Via `/api/blueprint/subscribe` (guest flow) OR `/api/blueprint/state` POST (auth flow)
- **Resolved:** Via `user_id` (Phase 1) OR `email` + `access_token` (legacy guest)
- **Location:** Neon PostgreSQL
- **Fields:** `user_id` (Phase 1), `email`, `access_token`, `form_data`, `strategy_generated`, `grid_generated`

**Evidence of Duplication:**
- Email stored in BOTH `users.email` and `blueprint_subscribers.email` (when `user_id` exists)
- Identity resolution requires TWO lookups: `auth.users` → `users` → (optionally) `blueprint_subscribers`

**Conflict Resolution:**
- **No explicit conflict resolution** found
- `getOrCreateNeonUser()` creates if missing, but does NOT update if email differs
- Blueprint data can exist for guest email without `user_id`, then orphaned after signup

---

## 3. DATA FLOW & SOURCE OF TRUTH

### Concept: Auth Identity

| Source | Location | When Written | When Read |
|--------|----------|--------------|-----------|
| **Primary:** Supabase `auth.users` | Supabase hosted | Signup, admin create | Every protected route (`supabase.auth.getUser()`) |
| **Secondary:** Neon `users` | Neon DB | After auth user created (`syncUserWithNeon()`) | Studio page load (`getUserByAuthId()`) |

**Issue:** **TWO sources** - Supabase is authoritative, but Neon is queried for application logic.

### Concept: Access / Entitlement

| Source | Location | When Written | When Read |
|--------|----------|--------------|-----------|
| **Primary:** `subscriptions` table | Neon DB | Stripe webhook (`checkout.session.completed`, `customer.subscription.created`) | `getUserSubscription()`, `hasStudioMembership()`, `hasPaidBlueprint()` |
| **Columns:** `product_type` (`sselfie_studio_membership`, `paid_blueprint`, `free_blueprint`), `status` (`active`, `canceled`, `expired`) | | | |
| **Secondary (Implicit):** All authenticated users | N/A | N/A | `hasFreeBlueprintAccess()` always returns `true` |

**Issue:** **No explicit `free_blueprint` subscription row** - entitlement is implicit (return `true` in code).

**Evidence:**
```typescript:139:143:lib/subscription.ts
export async function hasFreeBlueprintAccess(userId: string): Promise<boolean> {
  // Free blueprint is implicit for all authenticated users
  // No subscription required
  return true
}
```

### Concept: Generated Assets

| Source | Location | When Written | When Read |
|--------|----------|--------------|-----------|
| **Training Models:** `training_runs` table | Neon DB | Via `/api/training/start` | `/api/training/status` |
| **Blueprint Grid:** `blueprint_subscribers.grid_url` | Neon DB | Via `/api/blueprint/check-grid` (after Nano Banana completes) | `/api/blueprint/state` GET |
| **Generated Images:** `generated_images` table | Neon DB | Via `/api/maya/create-photoshoot` | Gallery screen, Maya chat |

**Issue:** **Blueprint grid stored in `blueprint_subscribers`, not normalized table.**

### Concept: Progress / State

| Source | Location | When Written | When Read |
|--------|----------|--------------|-----------|
| **Onboarding Completion:** `users.onboarding_completed` | Neon DB | **NEVER FOUND** - Column exists but no write logic found | **NEVER FOUND** - Not read in codebase |
| **Training Model Status:** `training_runs.training_status` | Neon DB | Via training API | `useEffect` in `SselfieApp` calls `/api/training/status` |
| **Blueprint State:** `blueprint_subscribers.*` | Neon DB | `/api/blueprint/state` POST | `/api/blueprint/state` GET |
| **Blueprint Welcome Shown:** **NOT PERSISTED** | N/A | **NEVER** - `showBlueprintWelcome` state only in memory | `useState(false)` in `SselfieApp` |

**Issue:** **Blueprint welcome wizard state is ephemeral** - no database persistence, wizard can show repeatedly.

### Concept: Payments

| Source | Location | When Written | When Read |
|--------|----------|--------------|-----------|
| **Stripe Subscriptions:** `subscriptions` table | Neon DB | Stripe webhook (`checkout.session.completed`) | `getUserSubscription()` |
| **Stripe Customer ID:** `users.stripe_customer_id` OR `subscriptions.stripe_customer_id` | Neon DB | Stripe webhook OR checkout session creation | Checkout session creation |
| **Credits:** `credits` table | Neon DB | Stripe webhook (`invoice.payment_succeeded`) | `/api/user/credits` |

**Issue:** **Customer ID stored in TWO places** - `users` (for one-time) and `subscriptions` (for recurring).

---

## 4. STATE & PERSISTENCE LAYERS

### Database (Neon PostgreSQL)

**What is Written:**
- User records (`users` table) - on signup/callback
- Subscription records (`subscriptions` table) - on Stripe webhook
- Blueprint state (`blueprint_subscribers` table) - on blueprint actions
- Training runs (`training_runs` table) - on model training
- Generated images (`generated_images` table) - on AI generation

**When Written:**
- **Signup:** `app/auth/callback/route.ts:36` calls `syncUserWithNeon()` → creates/updates `users` row
- **Checkout:** Stripe webhook `app/api/webhooks/stripe/route.ts` → creates `subscriptions` row
- **Blueprint:** `/api/blueprint/state` POST → upserts `blueprint_subscribers`

**When Read:**
- **Studio Load:** `app/studio/page.tsx:57` calls `getUserByAuthId()` → reads `users`
- **Entitlement Check:** `lib/subscription.ts` queries `subscriptions` table
- **Blueprint State:** `/api/blueprint/state` GET → reads `blueprint_subscribers`

**What Breaks on Refresh:**
- ✅ User identity persists (session cookie)
- ✅ Entitlements persist (database)
- ✅ Blueprint state persists (database)
- ❌ **Onboarding wizard state LOST** - `showOnboarding` reset to `false`, re-fetches training status
- ❌ **Blueprint welcome wizard state LOST** - `showBlueprintWelcome` always `false` (never set to `true` in code)

### localStorage

**What is Written:**
- Maya chat IDs: `mayaChatId_{chatType}` (e.g., `mayaChatId_main`, `mayaChatId_feed-planner`)
- Feed Planner Pro Mode: `mayaProMode`
- Image library: `mayaImageLibrary`
- Generated images: `mayaPromptsGeneratedImages`
- Concept photoshoot IDs: `photoshoot_{conceptTitle}`

**When Written:**
- Chat ID saved when chat created (`components/sselfie/maya/hooks/use-maya-chat.ts:95`)
- Pro mode toggled (`components/sselfie/sselfie-app.tsx:118-121`)

**When Read:**
- On component mount (useEffect hooks)
- When tab switched (hash change)

**What Breaks on Refresh:**
- ✅ Chat IDs persist (localStorage)
- ✅ Pro mode persists (localStorage)
- ❌ **Blueprint state NOT in localStorage** - relies on database only

### URL Parameters

**What is Written:**
- `?welcome=true` - Passed to Studio (unused in current code)
- `?showCheckout=true` - Passed to Studio (read but not actively used)
- `?tab=blueprint` - Used for initial tab selection (`SselfieApp` reads `window.location.search`)
- `?next=/studio?tab=blueprint` - Used in signup redirect

**When Written:**
- Signup redirect: `app/auth/sign-up/page.tsx:146` redirects to `nextParam`
- Checkout success: `components/checkout/success-content.tsx` redirects with query params

**When Read:**
- `app/studio/page.tsx:15` reads `searchParams` (server-side)
- `components/sselfie/sselfie-app.tsx:276-303` reads hash for tab navigation (client-side)

**What Breaks on Refresh:**
- ✅ Query params persist (URL)
- ❌ Hash-based tab navigation breaks if user types URL without hash

### Cookies / Sessions

**What is Written:**
- Supabase session cookies (`sb-access-token`, `sb-refresh-token`)
- Set by Supabase client library in middleware

**When Written:**
- On `supabase.auth.signInWithPassword()` or `exchangeCodeForSession()`

**When Read:**
- Every request via middleware (`lib/supabase/middleware.ts:42-48`)

**What Breaks on Refresh:**
- ✅ Session persists (cookies)
- ❌ Session expiry can cause silent failures (redirects to login, but no user feedback)

### In-Memory State

**What is Written:**
- `showOnboarding` state (React useState)
- `showBlueprintWelcome` state (React useState) - **NEVER SET TO TRUE**
- `hasTrainedModel` state (fetched from API)
- Credit balance (fetched from API)
- Active tab (React useState + hash sync)

**When Written:**
- On component mount (`useEffect` hooks)
- On user interaction (tab click, wizard complete)

**When Read:**
- On render (conditional rendering of wizards)

**What Breaks on Refresh:**
- ❌ **All in-memory state LOST** - requires re-fetch from API
- ❌ **Wizard visibility resets** - onboarding shown again if `hasTrainedModel` is false

---

## 5. BUSINESS LOGIC EXECUTION PATH

### Path: "First-Time User Signs Up (Free)"

**Trigger:** User fills signup form at `/auth/sign-up`

**Execution:**
1. **Client:** `app/auth/sign-up/page.tsx:106` → `supabase.auth.signUp()`
2. **Client:** `app/auth/sign-up/page.tsx:123` → POST `/api/auth/auto-confirm` (auto-confirms email)
3. **Client:** `app/auth/sign-up/page.tsx:138` → `supabase.auth.signInWithPassword()` (signs in immediately)
4. **Client:** `app/auth/sign-up/page.tsx:148` → `router.push("/studio")` (or `next` param)
5. **Server:** `app/studio/page.tsx:25-30` → `supabase.auth.getUser()` (verifies session)
6. **Server:** `app/studio/page.tsx:57` → `getUserByAuthId(user.id)` (fetches Neon user)
7. **Server:** `app/studio/page.tsx:65` → `getOrCreateNeonUser()` (creates if missing)
8. **Server:** `app/studio/page.tsx:78` → `getUserSubscription(userId)` (fetches subscription - returns `null` for free users)
9. **Server:** `app/studio/page.tsx:99` → Renders `<SselfieApp>` with props
10. **Client:** `components/sselfie/sselfie-app.tsx:341-369` → `useEffect` fetches `/api/training/status`
11. **Client:** `components/sselfie/sselfie-app.tsx:351` → If `!hasModel`, sets `setShowOnboarding(true)`
12. **Client:** `components/sselfie/sselfie-app.tsx:874` → Renders `<OnboardingWizard isOpen={showOnboarding && !hasTrainedModel}>`
13. **Client:** `components/sselfie/sselfie-app.tsx:887` → Renders `<BlueprintWelcomeWizard isOpen={showBlueprintWelcome && blueprintWelcomeEnabled}>` - **BUT `showBlueprintWelcome` is `false` (never set to `true`)**

**Database Writes:**
- `users` table: Row created/updated (via `syncUserWithNeon()` in callback, or `getOrCreateNeonUser()` in Studio)
- `users.onboarding_completed`: **NOT SET** (column exists, but no write logic found)
- `blueprint_subscribers`: **NOT CREATED** (only created when user starts blueprint)

**Client Hydration:**
- Training status fetched from `/api/training/status` (checks `training_runs` table)
- Credit balance fetched from `/api/user/credits`
- Blueprint state **NOT FETCHED** on initial load (only when Blueprint tab opened)

**Re-render Behavior:**
- Onboarding wizard shows if `hasTrainedModel === false`
- Blueprint welcome wizard **NEVER SHOWS** (logic incomplete - `showBlueprintWelcome` never set to `true`)

---

### Path: "Paid User Completes Checkout (One-Time Session)"

**Trigger:** Stripe checkout completes, webhook fires

**Execution:**
1. **Stripe:** Sends `checkout.session.completed` webhook
2. **Server:** `app/api/webhooks/stripe/route.ts:23` → Receives webhook
3. **Server:** `app/api/webhooks/stripe/route.ts:463` → Checks `source === "landing_page"` AND `productType !== "paid_blueprint"`
4. **Server:** `app/api/webhooks/stripe/route.ts:478-485` → Checks if user exists in Supabase auth
5. **Server:** `app/api/webhooks/stripe/route.ts:489-497` → Creates Supabase auth user (if missing) with `email_confirm: true`
6. **Server:** `app/api/webhooks/stripe/route.ts:531` → Creates Neon user via `getOrCreateNeonUser()`
7. **Server:** `app/api/webhooks/stripe/route.ts:535-540` → Sets `password_setup_complete = FALSE` in `users` table
8. **Server:** `app/api/webhooks/stripe/route.ts:517-523` → Generates password reset link
9. **Server:** `app/api/webhooks/stripe/route.ts:580-586` → Sends welcome email with password setup link
10. **Client:** User clicks email link → Redirects to `/auth/setup-password`
11. **Client:** User sets password → Signs in → Redirects to `/studio`

**Database Writes:**
- `users` table: Row created (if new user)
- `users.password_setup_complete`: Set to `FALSE`
- `subscriptions` table: **NOT CREATED** (one-time purchases don't create subscription rows)
- Credits: Granted via `grantOneTimeSessionCredits()` (separate webhook handler)

**Client Hydration:**
- User redirected to Studio after password setup
- **No special welcome flow** - user sees Studio with onboarding wizard if no trained model

---

### Path: "Studio Membership User Completes Checkout"

**Trigger:** Stripe subscription checkout completes, webhook fires

**Execution:**
1. **Stripe:** Sends `checkout.session.completed` webhook with `productType === "sselfie_studio_membership"`
2. **Server:** `app/api/webhooks/stripe/route.ts:1270-1320` → Handles subscription checkout
3. **Server:** `app/api/webhooks/stripe/route.ts:1325-1332` → Creates Supabase auth user (if missing)
4. **Server:** `app/api/webhooks/stripe/route.ts:1366` → Creates Neon user
5. **Server:** `app/api/webhooks/stripe/route.ts:1370-1374` → Sets `password_setup_complete = FALSE`
6. **Server:** `app/api/webhooks/stripe/route.ts:1307-1317` → Creates `subscriptions` row with `product_type = 'sselfie_studio_membership'`, `status = 'active'`
7. **Server:** `app/api/webhooks/stripe/route.ts:1437-1443` → Sends welcome email
8. **Server:** **Separate webhook** `invoice.payment_succeeded` grants credits (not in checkout flow)
9. **Client:** User sets password → Signs in → Redirects to `/studio`

**Database Writes:**
- `users` table: Row created
- `subscriptions` table: Row created with `product_type = 'sselfie_studio_membership'`
- Credits: Granted later via `invoice.payment_succeeded` webhook

**Client Hydration:**
- User sees Studio
- **No special welcome flow** for membership users - same onboarding wizard as free users

---

### Path: "User Accesses Studio for First Time"

**Trigger:** User navigates to `/studio` (after signup or login)

**Execution:**
1. **Server:** `app/studio/page.tsx:25-30` → Verifies auth session
2. **Server:** `app/studio/page.tsx:57` → Fetches Neon user
3. **Server:** `app/studio/page.tsx:78` → Fetches subscription (may be `null`)
4. **Server:** `app/studio/page.tsx:99` → Renders `<SselfieApp>` with `subscriptionStatus` prop
5. **Client:** `components/sselfie/sselfie-app.tsx:341-369` → Fetches `/api/training/status`
6. **Client:** `components/sselfie/sselfie-app.tsx:347` → Sets `hasTrainedModel` state
7. **Client:** `components/sselfie/sselfie-app.tsx:351` → If `!hasModel`, sets `showOnboarding = true`
8. **Client:** `components/sselfie/sselfie-app.tsx:874` → Renders onboarding wizard
9. **Client:** `components/sselfie/sselfie-app.tsx:887` → Renders blueprint welcome wizard (but `showBlueprintWelcome` is `false`)

**Missing Logic:**
- **Blueprint welcome wizard never triggered** - `showBlueprintWelcome` initialized to `false`, no logic sets it to `true`
- **No entitlement-based welcome flow** - Free, paid, and membership users all see same onboarding wizard (based on training status only)

---

## 6. ASYNC & SIDE-EFFECT ANALYSIS

### Background Jobs

| Job | Trigger | Frequency | Timeout | Fallback |
|-----|---------|-----------|---------|----------|
| **Training Model** | User uploads images | On-demand | **UNKNOWN** - No timeout found | Manual retry required |
| **Grid Generation** | User triggers blueprint grid | On-demand | Polling in `/api/blueprint/check-grid` | Manual retry required |
| **Email Sending** | Webhook, signup, etc. | On-demand | **NO TIMEOUT** - Can hang indefinitely | Email fails silently (logged but not surfaced) |

### Webhooks

| Webhook | Endpoint | Processing | Idempotency | Timeout |
|---------|----------|------------|-------------|---------|
| **Stripe `checkout.session.completed`** | `app/api/webhooks/stripe/route.ts:23` | Synchronous (blocks response) | ✅ Idempotency table (`webhook_events`) | **NO TIMEOUT** - Can hang on slow DB/user creation |
| **Stripe `invoice.payment_succeeded`** | Same endpoint | Synchronous | ✅ Idempotency table | **NO TIMEOUT** |
| **Rate Limiting** | `checkWebhookRateLimit()` | Applied per customer ID | ✅ Prevents duplicate processing | N/A |

**Evidence:**
```typescript:73:93:app/api/webhooks/stripe/route.ts
    // Check if event has already been processed
    const eventId = event.id
    const existing = await sql`
      SELECT id FROM webhook_events WHERE stripe_event_id = ${eventId}
    `

    if (existing.length > 0) {
      console.log(`[v0] ⚠️ Duplicate event detected: ${eventId} - skipping processing`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Record event as processed
    await sql`
      INSERT INTO webhook_events (stripe_event_id, processed_at)
      VALUES (${eventId}, NOW())
    `
```

### Polling

| Poll | Location | Interval | Max Attempts | Timeout |
|------|----------|----------|--------------|---------|
| **Checkout Success User Info** | `components/checkout/success-content.tsx:39-71` | 2000ms | 40 attempts (80 seconds) | ✅ Max attempts reached → shows default state |
| **Paid Blueprint Access Token** | `components/checkout/success-content.tsx:98-150` | 2000ms | **UNKNOWN** - No max attempts found | ❌ Can poll indefinitely |
| **Grid Generation Status** | `/api/blueprint/check-grid` | Called manually (no auto-poll) | N/A | ❌ No timeout |

**Evidence:**
```typescript:34:71:components/checkout/success-content.tsx
      let attempts = 0
      const MAX_ATTEMPTS = 40 // Increased to 80 seconds total

      console.log("[v0] Starting user info polling for email:", initialEmail)

      const pollInterval = setInterval(async () => {
        attempts++
        console.log(`[v0] Polling attempt ${attempts}/${MAX_ATTEMPTS}`)

        try {
          const response = await fetch(`/api/user-by-email?email=${encodeURIComponent(initialEmail)}`)

          if (!response.ok) {
            console.error(`[v0] API returned ${response.status}`)
            throw new Error(`API returned ${response.status}`)
          }

          const data = await response.json()
          console.log("[v0] Poll response:", data)

          if (data.userInfo) {
            console.log("[v0] User info found, setting state:", data.userInfo)
            setUserInfo(data.userInfo)
            clearInterval(pollInterval)
          } else if (attempts >= MAX_ATTEMPTS) {
            console.log("[v0] Max attempts reached, showing default state")
            setUserInfo({ email: initialEmail, hasAccount: false })
            clearInterval(pollInterval)
          }
```

### Loading / Blocking States

| Operation | Location | Blocks UI | User Feedback |
|-----------|----------|-----------|---------------|
| **Training Status Fetch** | `components/sselfie/sselfie-app.tsx:342-369` | ❌ Non-blocking (shows loading screen) | ✅ Loading spinner |
| **Credit Fetch** | `components/sselfie/sselfie-app.tsx:306-329` | ❌ Non-blocking | ✅ `isLoadingCredits` state |
| **Blueprint State Fetch** | `components/sselfie/blueprint-screen.tsx:26-34` | ❌ Non-blocking | ✅ Loading message |
| **Webhook Processing** | `app/api/webhooks/stripe/route.ts` | ✅ **BLOCKS WEBHOOK RESPONSE** | ❌ No user feedback (async) |

### What Waits on What

| Waiter | Waits For | Timeout | Fallback |
|--------|-----------|---------|----------|
| **Checkout Success Page** | Webhook to create user → `/api/user-by-email` returns user | 80 seconds (40 attempts) | Shows "create account" form |
| **Studio Page** | Training status API → `/api/training/status` | **NO TIMEOUT** - If API hangs, page hangs | Shows loading screen indefinitely |
| **Blueprint Welcome** | **NEVER TRIGGERED** - No wait logic found | N/A | N/A |

### What Can Hang Indefinitely

1. **Training Status API** - If `/api/training/status` hangs, Studio page shows loading spinner forever
2. **Webhook Processing** - If Stripe webhook hangs (slow DB, network), Stripe retries, but user sees no feedback
3. **Blueprint Access Token Polling** - `paidBlueprintLoading` can poll indefinitely (no max attempts)

---

## 7. DUPLICATION & COMPLEXITY FINDINGS

### Parallel Systems Solving Same Problem

#### 1. **User Identity Resolution (DUPLICATE)**

**System A:** Supabase Auth → Neon Users (via `getUserByAuthId()`)
- **Used in:** Studio page, most API routes
- **Flow:** `auth.users.id` → `users.id` (1:1 mapping)

**System B:** Email-based lookup (via `/api/user-by-email`)
- **Used in:** Checkout success page, signup form
- **Flow:** Email → `users.email` lookup

**Evidence:**
```typescript:35:39:app/auth/sign-up/page.tsx
        const response = await fetch(`/api/user-by-email?email=${encodeURIComponent(email)}`)
        if (response.ok) {
          const data = await response.json()
          // userInfo.hasAccount means user exists in users table
          setUserExists(!!data.userInfo?.hasAccount)
```

**Risk:** Email can change, causing mismatches. Auth ID is authoritative, but email lookup is used for UX.

---

#### 2. **Welcome/Onboarding Flows (DUPLICATE)**

**System A:** Onboarding Wizard (Training Model Focus)
- **Trigger:** `!hasTrainedModel` (fetched from `/api/training/status`)
- **Shown for:** All users (free, paid, membership) without trained model
- **Purpose:** Upload selfies, train AI model

**System B:** Blueprint Welcome Wizard (Blueprint Focus)
- **Trigger:** **NEVER TRIGGERED** - `showBlueprintWelcome` always `false`
- **Intended for:** New users accessing Blueprint feature
- **Purpose:** Introduce Blueprint benefits

**Evidence:**
```typescript:110:111:components/sselfie/sselfie-app.tsx
  const [showBlueprintWelcome, setShowBlueprintWelcome] = useState(false)
  const [blueprintWelcomeEnabled, setBlueprintWelcomeEnabled] = useState(true)
```

**Issue:** **Two separate welcome flows, but Blueprint Welcome never shown.** Logic incomplete.

---

#### 3. **Checkout Success Pages (DUPLICATE)**

**System A:** Guest Checkout Success (`/checkout/success`)
- **Used for:** Landing page purchases (one-time, credit topups)
- **Flow:** Polls `/api/user-by-email` → Shows password setup form → Redirects to Studio

**System B:** Authenticated Checkout Success (same route, different logic)
- **Used for:** In-app purchases (credit topups when already logged in)
- **Flow:** Checks auth → Auto-redirects to Studio (2 second delay)

**Evidence:**
```typescript:79:94:components/checkout/success-content.tsx
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)

      if (purchaseType === "credit_topup" && user) {
        setTimeout(() => {
          router.push("/studio")
        }, 2000)
      }
    }
    checkAuth()
  }, [purchaseType, router])
```

**Issue:** **Same component handles two different flows** - guest vs authenticated - causing complexity.

---

#### 4. **Customer ID Storage (DUPLICATE)**

**Location A:** `users.stripe_customer_id`
- **Written:** Checkout session creation for one-time purchases (`app/actions/stripe.ts:139-143`)
- **Read:** Checkout session creation (fallback if not in subscriptions)

**Location B:** `subscriptions.stripe_customer_id`
- **Written:** Stripe webhook (`app/api/webhooks/stripe/route.ts:1312`)
- **Read:** Checkout session creation (primary source)

**Evidence:**
```typescript:110:149:app/actions/stripe.ts
  // Check subscriptions table first (for existing subscriptions)
  const existingSubscription = await sql`
    SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${user.id} LIMIT 1
  `

  if (existingSubscription[0]?.stripe_customer_id) {
    customerId = existingSubscription[0].stripe_customer_id
  } else {
    // Check users table for existing customer ID (for one-time purchases)
    const existingUser = await sql`
      SELECT stripe_customer_id FROM users WHERE id = ${user.id} AND stripe_customer_id IS NOT NULL LIMIT 1
    `
    
    if (existingUser[0]?.stripe_customer_id) {
      customerId = existingUser[0].stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id
      
      // Save to users table immediately for one-time purchases
      // (Subscriptions will save it via webhook to subscriptions table)
      if (!isSubscription) {
        try {
          await sql`
            UPDATE users 
            SET stripe_customer_id = ${customerId}
            WHERE id = ${user.id}
          `
        } catch (error) {
          console.error("[v0] Error saving customer ID to users table:", error)
          // Non-critical - webhook will save it
        }
      }
    }
  }
```

**Issue:** **Two sources of truth** - requires fallback logic, can get out of sync.

---

### Temporary Flows That Became Permanent

**Finding:** **Checkout success polling logic** was likely a temporary workaround for webhook delay, but is now permanent.

**Evidence:**
```typescript:27:77:components/checkout/success-content.tsx
  useEffect(() => {
    // Skip userInfo polling for paid_blueprint - we only need access token
    if (purchaseType === "paid_blueprint") {
      return
    }

    if (initialEmail) {
      let attempts = 0
      const MAX_ATTEMPTS = 40 // Increased to 80 seconds total

      console.log("[v0] Starting user info polling for email:", initialEmail)

      const pollInterval = setInterval(async () => {
        attempts++
        console.log(`[v0] Polling attempt ${attempts}/${MAX_ATTEMPTS}`)

        try {
          const response = await fetch(`/api/user-by-email?email=${encodeURIComponent(initialEmail)}`)

          if (!response.ok) {
            console.error(`[v0] API returned ${response.status}`)
            throw new Error(`API returned ${response.status}`)
          }

          const data = await response.json()
          console.log("[v0] Poll response:", data)

          if (data.userInfo) {
            console.log("[v0] User info found, setting state:", data.userInfo)
            setUserInfo(data.userInfo)
            clearInterval(pollInterval)
          } else if (attempts >= MAX_ATTEMPTS) {
            console.log("[v0] Max attempts reached, showing default state")
            setUserInfo({ email: initialEmail, hasAccount: false })
            clearInterval(pollInterval)
          }
        } catch (err) {
          console.error("[v0] Polling error:", err)
          if (attempts >= MAX_ATTEMPTS) {
            console.log("[v0] Max attempts reached after error, showing default state")
            setUserInfo({ email: initialEmail, hasAccount: false })
            clearInterval(pollInterval)
          }
        }
      }, 2000) // Poll every 2 seconds

      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [initialEmail, purchaseType])
```

**Issue:** **80-second polling** indicates webhook delay problem. Should be fixed at webhook level, not client polling.

---

### Features Rebuilt Instead of Reused

**Finding:** **Blueprint Welcome Wizard** was built separately from Onboarding Wizard, but shares same UI patterns (modal, animation, design tokens).

**Evidence:**
- `components/sselfie/onboarding-wizard.tsx` - 761 lines, complex state management
- `components/sselfie/blueprint-welcome-wizard.tsx` - 114 lines, simple welcome screen
- Both use `framer-motion`, `DesignClasses`, `ComponentClasses` (shared design system)

**Issue:** **Could be unified** - Both are welcome screens, but serve different purposes. However, they have different completion logic (training vs. blueprint start).

---

### Guest vs Authenticated Duplication

**Finding:** **Blueprint system has TWO parallel flows** - guest (email/token) and authenticated (user_id).

**Evidence:**
- Guest flow: `/api/blueprint/subscribe` → creates `blueprint_subscribers` with `email` + `access_token`
- Auth flow: `/api/blueprint/state` POST → creates/updates `blueprint_subscribers` with `user_id`
- Generation APIs: Check `user_id` first, fallback to `email` for backward compatibility

**Issue:** **Legacy guest system still active** - Phase 1 migration added `user_id` support, but guest flow not deprecated.

---

## 8. FAILURE MODES & RISK ASSESSMENT

### Data Loss Scenarios

| Scenario | Severity | Likelihood | Evidence |
|----------|----------|------------|----------|
| **Blueprint state lost on guest → auth migration** | HIGH | MEDIUM | Guest blueprint data has `email` but no `user_id`. After signup, if email doesn't match exactly, blueprint data orphaned. No migration logic found. |
| **Training status fetch fails → onboarding shown repeatedly** | MEDIUM | LOW | If `/api/training/status` fails, `hasTrainedModel` defaults to `false`, onboarding shown again. No persistence of "onboarding dismissed" state. |
| **Blueprint welcome never shown (logic incomplete)** | LOW | HIGH | `showBlueprintWelcome` never set to `true`, wizard never displays. Low impact (feature incomplete, not broken). |

### Revenue-Impacting Failures

| Scenario | Severity | Likelihood | Evidence |
|----------|----------|------------|----------|
| **Webhook hangs → subscription not created → user charged but no access** | HIGH | LOW | Webhook has idempotency, but if processing hangs, Stripe retries. User charged, but subscription row may not exist until retry succeeds. |
| **Checkout success page polling fails → user can't complete account setup** | MEDIUM | MEDIUM | If `/api/user-by-email` fails for 80 seconds, user sees "create account" form. If they already have account, confused state. |
| **Customer ID mismatch → duplicate Stripe customers created** | MEDIUM | LOW | Customer ID stored in two places. If out of sync, new customer created for same user, causing billing confusion. |

### User Lock-Out Paths

| Scenario | Severity | Likelihood | Evidence |
|----------|----------|------------|----------|
| **Training status API hangs → Studio page never loads** | HIGH | LOW | No timeout on `/api/training/status` fetch. If API hangs, page shows loading spinner indefinitely. |
| **Auth session expires → silent redirect to login → no feedback** | MEDIUM | MEDIUM | Middleware redirects to login, but no user message explaining why. User may think app is broken. |
| **Blueprint welcome logic incomplete → feature appears broken** | LOW | HIGH | Wizard exists but never shown. User may expect welcome screen but doesn't see it. |

### Scaling Risks

| Scenario | Severity | Likelihood | Evidence |
|----------|----------|------------|----------|
| **Webhook processing blocks → Stripe retries → duplicate processing** | HIGH | MEDIUM | Webhook processing is synchronous. If slow (DB load, network), Stripe retries. Idempotency table prevents duplicates, but retries increase load. |
| **Checkout success polling → 40 requests per user → API load** | MEDIUM | HIGH | Every checkout success page polls `/api/user-by-email` up to 40 times. High traffic = high API load. |
| **localStorage usage → browser quota exceeded** | LOW | LOW | localStorage used for chat IDs, images, etc. Large image data could exceed quota, but risk is low. |

---

## 9. AUDIT SUMMARY (NO SOLUTIONS)

### What is Fragile

1. **Blueprint Welcome Wizard Logic** - Component exists, feature flag exists, but **never triggered**. `showBlueprintWelcome` state initialized to `false`, no logic sets it to `true`. This is a **half-implemented feature** (Phase 2 incomplete).

2. **Checkout Success Polling** - **80-second polling** with 40 attempts indicates fundamental webhook delay problem. Temporary workaround became permanent. High API load risk.

3. **Onboarding State Persistence** - `showOnboarding` state is ephemeral. If training status API fails or is slow, wizard shows repeatedly. No "dismissed" state persisted.

4. **Customer ID Duplication** - Stored in two places (`users` and `subscriptions`), requiring fallback logic. Can get out of sync, causing duplicate Stripe customers.

5. **Training Status API Timeout** - No timeout on `/api/training/status` fetch. If API hangs, Studio page shows loading spinner indefinitely.

### What is Over-Engineered

1. **Multiple Welcome Flows** - Two separate welcome wizards (Onboarding Wizard for training, Blueprint Welcome Wizard for blueprint) serve similar purpose but have different triggers. Could be unified with entitlement-based routing.

2. **Checkout Success Component Complexity** - Single component handles guest and authenticated flows, with complex polling logic. Could be split into separate components or simplified with better webhook reliability.

3. **Identity Resolution Duplication** - Two systems (auth ID lookup and email lookup) solve same problem. Email lookup used for UX (checking if user exists), but auth ID is authoritative.

### What Blocks Velocity

1. **Incomplete Blueprint Welcome Logic** - Phase 2 feature partially implemented. Wizard component exists but never shown. Blocks consistent onboarding experience for blueprint users.

2. **No Entitlement-Based Welcome Routing** - Free, paid, and membership users all see same onboarding wizard (based on training status only). No differentiation based on `product_type` in `subscriptions` table.

3. **Guest System Still Active** - Blueprint guest flow (email/token) still works alongside authenticated flow (user_id). Duplicate logic, maintenance burden, migration incomplete.

4. **Webhook Reliability Dependency** - Checkout success page relies on webhook creating user before it can proceed. Polling is workaround, but indicates webhook reliability issue that should be fixed at source.

5. **No Centralized Onboarding State** - `onboarding_completed` column exists in `users` table but never written. Onboarding state is determined by training status API, not persisted. Makes it hard to track user progress across sessions.

---

## APPENDIX: Evidence Citations

### Key Files Referenced

- `app/studio/page.tsx` (Lines 9-109) - Studio entry point, auth check, user fetch
- `components/sselfie/sselfie-app.tsx` (Lines 74-899) - Main app shell, wizard rendering
- `components/sselfie/onboarding-wizard.tsx` (Lines 1-761) - Training model onboarding
- `components/sselfie/blueprint-welcome-wizard.tsx` (Lines 1-114) - Blueprint welcome (incomplete)
- `app/api/webhooks/stripe/route.ts` (Lines 23-2236) - Stripe webhook handler
- `components/checkout/success-content.tsx` (Lines 15-698) - Checkout success with polling
- `lib/subscription.ts` (Lines 1-244) - Entitlement checking logic
- `app/auth/sign-up/page.tsx` (Lines 1-294) - Signup flow with auto-confirm
- `app/auth/callback/route.ts` (Lines 1-146) - OAuth/email callback handler

---

**END OF AUDIT**
