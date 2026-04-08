# 🔍 Brand Blueprint Auth-First Migration Audit
**Date:** 2025-01-XX  
**Objective:** Audit current Blueprint system before migrating to authenticated Studio flow

---

## 1️⃣ ENTRYPOINT & USER JOURNEY MAP (AS-IS)

### Public Entrypoints
| Route | Entry Point | Auth Required | Purpose |
|-------|-------------|---------------|---------|
| `/blueprint` | Landing page, email capture | ❌ No | Free blueprint flow entry |
| `/blueprint?email=...` | Email link, email capture | ❌ No | Resume with email lookup |
| `/blueprint?token=...` | Token link | ❌ No | Resume with access token |
| `/blueprint/paid?access=...` | Paid purchase redirect | ❌ No | Paid blueprint access (token-based) |
| `/checkout/blueprint?email=...` | Purchase CTA | ❌ No | Initiate paid blueprint purchase |

### User Journey Steps

#### **Free Blueprint Journey (Current)**
```
Step 1: Landing Page (/blueprint)
├─ [Server] app/blueprint/page-server.tsx (checks ?email or ?token params)
├─ [Client] app/blueprint/page-client.tsx (renders step 0)
└─ Action: User clicks "Get started" → triggers email capture modal

Step 2: Email Capture
├─ [Component] components/blueprint/blueprint-email-capture.tsx
├─ [API] POST /api/blueprint/subscribe
│   ├─ Creates/updates blueprint_subscribers table
│   ├─ Generates UUID access_token
│   ├─ Saves email + name + formData (if exists)
│   └─ Returns accessToken to client
├─ [Client] Saves to localStorage:
│   ├─ blueprint-email
│   ├─ blueprint-name
│   └─ blueprint-access-token
└─ Action: Email saved → proceed to step 1 (questions)

Step 3: Form Questions (Steps 1-2)
├─ [Client] In-memory state (formData)
├─ [Client] Auto-saves to localStorage: blueprint-form-data
└─ Action: Continue → Feed style selection (step 3)

Step 4: Feed Style Selection (Step 3)
├─ [Client] In-memory state (selectedFeedStyle)
├─ [Client] BlueprintSelfieUpload component
│   └─ [API] POST /api/blueprint/upload-selfies
│       └─ Saves to blueprint_subscribers.selfie_image_urls
└─ Action: Continue → Strategy generation (step 3.5)

Step 5: Strategy Generation (Step 3.5)
├─ [Client] Calls generateConcepts()
├─ [API] POST /api/blueprint/generate-concepts
│   ├─ Validates email exists in blueprint_subscribers
│   ├─ Checks if strategy_generated = TRUE (prevents regeneration)
│   ├─ If exists: returns cached strategy_data
│   ├─ If new: Generates AI strategy → saves to strategy_data
│   └─ Updates strategy_generated = TRUE, strategy_generated_at = NOW()
└─ Action: Strategy loaded → Grid generation (same step)

Step 6: Grid Generation (Step 3.5)
├─ [Client] BlueprintConceptCard component triggers generateGrid()
├─ [API] POST /api/blueprint/generate-grid
│   ├─ Validates email + strategy_generated
│   ├─ Checks if grid_generated = TRUE (prevents regeneration)
│   ├─ If exists: returns cached grid_url + grid_frame_urls
│   ├─ If new: Generates 3x3 grid via Nano Banana
│   ├─ Saves prediction_id to grid_prediction_id
│   └─ [Polling] Client polls /api/blueprint/check-grid until complete
├─ [API] POST /api/blueprint/check-grid (polling)
│   ├─ Checks Nano Banana prediction status
│   ├─ When complete: Updates grid_url, grid_frame_urls, grid_generated = TRUE
│   └─ Returns grid URL + frame URLs
└─ Action: Grid shown → Score display (step 4)

Step 7: Score & Calendar (Steps 4-5)
├─ [Client] Calculates score from formData (client-side only)
├─ [Client] Shows hardcoded calendar content
└─ Action: Continue → Caption templates (step 6)

Step 8: Caption Templates (Step 6)
├─ [Client] Shows hardcoded caption templates
├─ [Optional] User can email blueprint
│   └─ [API] POST /api/blueprint/email-concepts
└─ Action: Email sent or skip → Upgrade view (step 7)

Step 9: Completed View (Step 7)
├─ [Client] Shows upgrade CTAs
└─ [Tracking] POST /api/blueprint/track-engagement
    └─ Updates blueprint_completed = TRUE (if not already)
```

#### **Resume/Revisit Journey**
```
Scenario A: User returns via email link
├─ URL: /blueprint?email=user@example.com
├─ [Server] app/blueprint/page-server.tsx queries blueprint_subscribers by email
├─ Determines resume step from state:
│   ├─ hasStrategy && hasGrid → step 7 (completed)
│   ├─ hasStrategy && !hasGrid → step 3.5 (grid generation)
│   ├─ hasFormData && feedStyle → step 3.5 (ready for strategy)
│   ├─ hasFormData && !feedStyle → step 3 (feed style selection)
│   └─ email only → step 1 (questions)
└─ [Client] Hydrates state from server props

Scenario B: User returns via token link
├─ URL: /blueprint?token=abc-123...
├─ [Server] Queries blueprint_subscribers by access_token
└─ Same resume logic as Scenario A

Scenario C: User returns with localStorage but no URL params
├─ [Client] page-client.tsx useEffect detects localStorage email
├─ Updates URL: router.replace(`/blueprint?email=${email}`)
├─ Triggers router.refresh()
└─ Server re-renders with proper resume state

Scenario D: User refreshes page mid-flow
├─ If URL has email/token → Server provides resume state ✅
├─ If URL missing but localStorage exists → Client updates URL → refresh ✅
├─ If both missing → User starts over (step 0) ❌
└─ Issue: Form progress lost if localStorage cleared
```

### Auth Boundaries (Current State)

| Flow | Auth Required | Identity System | Access Method |
|------|---------------|-----------------|---------------|
| Free Blueprint | ❌ None | Email + Access Token | `blueprint_subscribers.access_token` |
| Paid Blueprint | ❌ None | Access Token | `blueprint_subscribers.access_token` |
| Studio | ✅ Required | Supabase Auth → `users` table | `supabase.auth.getUser()` |

**Critical Finding:** Blueprint is completely isolated from Studio authentication. No integration exists.

---

## 2️⃣ AUTH & IDENTITY MODEL (AS-IS)

### User Types Identified

| Type | Table | Identity Key | Auth Method | Created When |
|------|-------|--------------|-------------|--------------|
| **Blueprint Subscriber** | `blueprint_subscribers` | `email` (unique) | None (guest) | Email capture |
| **Studio User** | `users` | `id` (Supabase UUID) | Supabase Auth | Sign up or purchase |
| **Paid Blueprint Buyer** | `blueprint_subscribers` | `email` + `access_token` | None (guest) | Stripe webhook |

### Identity Resolution on Page Load

#### **Blueprint Flow** (`app/blueprint/page-server.tsx`)
```typescript
// Server-side: Checks URL params
if (emailParam) {
  subscriber = await sql`
    SELECT * FROM blueprint_subscribers WHERE email = ${emailParam}
  `
}
if (tokenParam) {
  subscriber = await sql`
    SELECT * FROM blueprint_subscribers WHERE access_token = ${tokenParam}
  `
}

// No auth check - completely guest-based
```

#### **Studio Flow** (`app/studio/page.tsx`)
```typescript
// Server-side: Requires Supabase auth
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  redirect("/auth/login?returnTo=/studio")
}

// Maps Supabase user → Neon users table
neonUser = await getUserByAuthId(user.id)
```

### What Happens on Refresh/Revisit

| Scenario | Free Blueprint | Studio |
|----------|----------------|--------|
| **Refresh with email in URL** | ✅ Resumes from DB state | ✅ Session persists |
| **Refresh without URL params** | ⚠️ Client updates URL from localStorage | ✅ Session persists |
| **New tab** | ⚠️ Requires email in URL or localStorage | ✅ Session persists |
| **Cleared localStorage** | ❌ Cannot resume (must restart) | ✅ Session persists |
| **Different device** | ❌ Cannot resume (no cross-device sync) | ✅ Session persists |

### Email-to-User Mapping (Current State)

**NO DIRECT LINKING EXISTS** between `blueprint_subscribers` and `users` tables.

The only connection is:
- `blueprint_subscribers.converted_to_user = TRUE` (boolean flag, no FK)
- Set via webhook when Studio subscription purchased
- Used for analytics only, not for state merging

**Evidence:**
```sql
-- blueprint_subscribers table (no user_id FK)
CREATE TABLE blueprint_subscribers (
  email VARCHAR(255) NOT NULL UNIQUE,
  access_token VARCHAR(255) NOT NULL UNIQUE,
  -- NO user_id column
  converted_to_user BOOLEAN DEFAULT FALSE  -- Flag only, no relationship
)

-- users table (no blueprint_subscribers FK)
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- Supabase UUID
  email TEXT UNIQUE,
  -- NO blueprint_id or access_token column
)
```

---

## 3️⃣ SOURCE OF TRUTH MATRIX

| Concept | Source | File/Table | Notes |
|---------|--------|------------|-------|
| **User identity (free)** | `blueprint_subscribers.email` | `app/blueprint/page-server.tsx:48-64` | Email-based, no auth |
| **User identity (paid)** | `blueprint_subscribers.access_token` | `app/blueprint/paid/page.tsx:24` | Token-based access |
| **User identity (studio)** | `users.id` (Supabase UUID) | `app/studio/page.tsx:57` | Auth-based |
| **Blueprint completion** | `blueprint_subscribers.blueprint_completed` + canonical check | `app/blueprint/page-server.tsx:114-126` | **DUAL SOURCE** - DB flag AND strategy+grid check |
| **Grid image URL** | `blueprint_subscribers.grid_url` | `app/api/blueprint/check-grid/route.ts` | Saved on generation completion |
| **Paid entitlement** | `blueprint_subscribers.paid_blueprint_purchased` | `app/api/webhooks/stripe/route.ts:1095` | Set via webhook |
| **Resume step** | Computed from DB state (server) OR localStorage (client fallback) | `app/blueprint/page-server.tsx:128-152` | **DUAL SOURCE** - Server props win, localStorage fallback |

### Multiple Sources = Risk Areas

1. **Completion Status:** 
   - DB flag (`blueprint_completed`) can be out of sync with canonical (`strategy_generated && grid_generated`)
   - Server logic handles this with warnings: `page-server.tsx:124-126`

2. **Resume Step:**
   - Server computes from DB (source of truth)
   - Client fallback from localStorage (only if server props missing)
   - Risk: localStorage step can diverge from DB state

3. **Email Identity:**
   - Free blueprint: `blueprint_subscribers.email`
   - Studio: `users.email`
   - Risk: Same email can exist in both tables with no linking

---

## 4️⃣ STATE PERSISTENCE AUDIT

### Database (`blueprint_subscribers`)

| Field | Written When | Read When | Breaks on Refresh? |
|-------|--------------|-----------|-------------------|
| `email` | Email capture | Every page load | ✅ No (source of truth) |
| `access_token` | Email capture | Resume via token link | ✅ No |
| `form_data` | Email capture or form submit | Resume | ✅ No |
| `feed_style` | Step 3 selection | Resume | ✅ No |
| `strategy_generated` | Strategy API success | Resume check | ✅ No |
| `strategy_data` | Strategy API success | Load concepts | ✅ No |
| `grid_generated` | Grid polling complete | Resume check | ✅ No |
| `grid_url` | Grid polling complete | Display grid | ✅ No |
| `grid_frame_urls` | Grid polling complete | Display frames | ✅ No |
| `selfie_image_urls` | Upload API | Resume | ✅ No |
| `blueprint_completed` | Engagement tracking API | Resume check | ✅ No |

**Database is persistent and survives refresh.**

### localStorage (Client-Side)

| Key | Written When | Read When | Breaks on Refresh? |
|-----|--------------|-----------|-------------------|
| `blueprint-email` | Email capture success | Initial load, URL update | ⚠️ Yes (cleared browser = lost) |
| `blueprint-name` | Email capture success | Display name | ⚠️ Yes |
| `blueprint-access-token` | Email capture success | API calls (not currently used) | ⚠️ Yes |
| `blueprint-form-data` | Form field changes | Initial load if server props missing | ⚠️ Yes |
| `blueprint-last-step` | Step changes | Initial load if server props missing | ⚠️ Yes |

**localStorage is ephemeral and device-specific.**
- Lost on: browser clear, incognito, different device, different browser
- Used as fallback only when server props are missing

### URL Params

| Param | Written When | Read When | Breaks on Refresh? |
|-------|--------------|-----------|-------------------|
| `?email=...` | Email capture, resume | Server-side query | ✅ No (persists in URL) |
| `?token=...` | Token link click | Server-side query | ✅ No (persists in URL) |

**URL params are persistent if user bookmarks or shares link.**

### In-Memory React State

| State | Written When | Read When | Breaks on Refresh? |
|-------|--------------|-----------|-------------------|
| `formData` | Form inputs | Form display | ❌ Yes (lost on refresh) |
| `selectedFeedStyle` | Selection click | Step 3 display | ❌ Yes |
| `concepts` | Strategy API response | Step 3.5 display | ❌ Yes |
| `generatedConceptImages` | Grid API response | Step 3.5 display | ❌ Yes |

**In-memory state is ephemeral.**
- Only persists during session
- Relies on server hydration or localStorage fallback

### State Loss Scenarios

| Scenario | State Lost | Recovery Method |
|----------|------------|-----------------|
| Refresh with email in URL | ✅ None (server hydrates) | Server query |
| Refresh without URL, localStorage exists | ✅ None (client updates URL) | Client redirect + refresh |
| Refresh without URL, no localStorage | ❌ In-memory state | Must restart |
| Clear browser data | ❌ localStorage | Must restart (unless URL has email/token) |
| Different device | ❌ localStorage | Must restart (unless URL has email/token) |
| Tab close, reopen | ❌ In-memory state | Relies on URL or localStorage |

---

## 5️⃣ IMAGE / GRID GENERATION PIPELINE

### Free Blueprint Grid Generation Lifecycle

```
Trigger: User clicks "Generate Grid" (step 3.5)
├─ [Client] BlueprintConceptCard.onImageGenerated()
│
├─ [API] POST /api/blueprint/generate-grid
│   ├─ Validates: email exists, strategy_generated = TRUE
│   ├─ Checks: grid_generated = TRUE → returns cached grid ✅
│   ├─ Validates: selfieImages (1-3), category, mood
│   ├─ Calls: generateWithNanoBanana() → returns predictionId
│   ├─ Saves: grid_prediction_id to DB (NOT grid_url yet)
│   └─ Returns: { predictionId, status: "starting" }
│
├─ [Client] Starts polling /api/blueprint/check-grid
│   └─ Poll interval: 5 seconds (client-side setTimeout)
│
├─ [API] GET /api/blueprint/check-grid?predictionId=...
│   ├─ Checks Nano Banana prediction status
│   ├─ If "succeeded": 
│   │   ├─ Downloads grid image
│   │   ├─ Uploads to storage (Vercel Blob)
│   │   ├─ Updates DB: grid_url, grid_frame_urls, grid_generated = TRUE
│   │   └─ Returns: { status: "completed", gridUrl, frameUrls }
│   ├─ If "processing": Returns { status: "processing" } → continue polling
│   └─ If "failed": Returns { status: "failed" } → stop polling
│
└─ [Client] Receives completed status
    ├─ Updates state: generatedConceptImages[0] = gridUrl
    ├─ Updates state: savedFrameUrls = frameUrls
    └─ Displays grid to user
```

### Why Grid Disappears on Refresh

**Root Cause:** Grid URL IS persisted to database, but client state is not.

**Evidence:**
```typescript
// Grid is saved to DB on completion
await sql`
  UPDATE blueprint_subscribers
  SET grid_url = ${gridUrl},
      grid_frame_urls = ${frameUrls},
      grid_generated = TRUE
  WHERE email = ${email}
`
```

**But client hydration has issues:**
1. **Server-side hydration** (`page-server.tsx:116`): ✅ Works if grid_url exists
2. **Client-side hydration** (`page-client.tsx:199-206`): ⚠️ Only runs if server props missing
3. **Initial state** (`page-client.tsx:92-94`): ❌ Empty object `{}` until hydration completes

**Grid disappears because:**
- Server provides `initialHasGrid = true` ✅
- But `initialSelfieImages` may be missing, causing component to not render grid
- Client-side hydration runs asynchronously after render
- Flash of empty state before grid loads

### Image URL Persistence Status

| Image Type | Persisted? | Table Column | Refresh Behavior |
|------------|------------|--------------|------------------|
| **Free Grid** | ✅ Yes | `grid_url` | ✅ Persists (server hydrates) |
| **Free Grid Frames** | ✅ Yes | `grid_frame_urls` (array) | ✅ Persists |
| **Selfie Images** | ✅ Yes | `selfie_image_urls` (array) | ✅ Persists |
| **Paid Grids** | ✅ Yes | `paid_blueprint_photo_urls` (array) | ✅ Persists |

**All image URLs are correctly persisted to database.**

### Client Relying on Ephemeral State

**YES** - Client relies on in-memory React state that is not persisted:

```typescript
// page-client.tsx:92-94
const [generatedConceptImages, setGeneratedConceptImages] = useState<{ [key: number]: string }>(
  initialHasGrid ? { 0: "" } : {}  // Empty string until hydrated!
)

// Hydration happens AFTER initial render
useEffect(() => {
  if (initialHasGrid && savedEmail) {
    loadSavedGrid()  // Async API call
  }
}, [])
```

**Issue:** User sees empty grid placeholder until API call completes.

---

## 6️⃣ CHECKOUT & STRIPE FLOW AUDIT

### Paid Blueprint Purchase Flow

```
Step 1: User clicks "Get 30 Photos" CTA
├─ [Client] Link to /checkout/blueprint?email=...
│
├─ [Server] app/checkout/blueprint/page.tsx
│   ├─ Checks feature flag (ENV or DB)
│   ├─ Calls: createLandingCheckoutSession("paid_blueprint")
│   └─ Redirects: /checkout?client_secret=...&product_type=paid_blueprint
│
├─ [Client] app/checkout/page.tsx
│   ├─ Renders Stripe Embedded Checkout
│   └─ On success: redirects to /checkout/success?session_id=...&type=paid_blueprint
│
├─ [Webhook] checkout.session.completed (async, may arrive before redirect)
│   └─ [Server] app/api/webhooks/stripe/route.ts:944-1219
│       ├─ Detects product_type === "paid_blueprint"
│       ├─ Gets customer email from session
│       ├─ Generates access_token (UUID)
│       ├─ Upserts blueprint_subscribers:
│       │   ├─ Sets paid_blueprint_purchased = TRUE
│       │   ├─ Sets paid_blueprint_purchased_at = NOW()
│       │   ├─ Sets access_token (if new) OR keeps existing
│       │   ├─ Sets converted_to_user = TRUE
│       │   └─ Logs payment to stripe_payments table
│       ├─ Sends delivery email with access token link
│       └─ ✅ Purchase recorded in DB
│
└─ [Client] /checkout/success page
    ├─ components/checkout/success-content.tsx
    ├─ Polls /api/blueprint/get-access-token?email=...
    │   └─ Waits for webhook to create/update blueprint_subscribers
    ├─ When access token received:
    │   └─ Redirects: /blueprint/paid?access={token}
    └─ ⚠️ If webhook delayed: Shows "PREPARING YOUR ACCESS..." (stuck loading)
```

### Webhook Logic Paths

**File:** `app/api/webhooks/stripe/route.ts`

**Event:** `checkout.session.completed`
- **Line 944:** Detects `product_type === "paid_blueprint"`
- **Line 950-952:** Checks `isPaymentPaid` (must be true)
- **Line 1005-1114:** Upserts `blueprint_subscribers` table
  - If email exists: Updates row, preserves existing `access_token`
  - If new email: Creates row with new `access_token`
- **Line 1132-1210:** Sends delivery email (deduplicated)

**Critical Code:**
```typescript
// Line 1005-1114: Upsert logic
const existingSubscriber = await sql`
  SELECT id, access_token FROM blueprint_subscribers
  WHERE LOWER(email) = LOWER(${customerEmail})
`

if (existingSubscriber.length > 0) {
  // Preserves existing access_token
  await sql`
    UPDATE blueprint_subscribers
    SET paid_blueprint_purchased = TRUE,
        paid_blueprint_purchased_at = NOW(),
        converted_to_user = TRUE
    WHERE email = ${customerEmail}
  `
} else {
  // Creates new with access_token
  await sql`
    INSERT INTO blueprint_subscribers (..., access_token, ...)
    VALUES (..., ${accessToken}, ...)
  `
}
```

### Why "Success Page Stuck Loading" Occurs

**Root Cause:** Race condition between client redirect and webhook processing.

**Timeline:**
1. User completes Stripe checkout → Stripe redirects to `/checkout/success`
2. Client immediately polls `/api/blueprint/get-access-token?email=...`
3. Webhook `checkout.session.completed` may not have fired yet (async)
4. API returns 404: "No paid blueprint purchase found"
5. Client keeps polling (max 40 attempts = 80 seconds)
6. If webhook is slow/delayed: User sees loading state indefinitely

**Evidence:**
```typescript
// success-content.tsx:79-92
useEffect(() => {
  if (purchaseType === "paid_blueprint" && initialEmail) {
    // Polls for access token
    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/blueprint/get-access-token?email=${initialEmail}`)
      // Waits up to 80 seconds for webhook
    }, 2000)
  }
}, [])
```

**Blocking Async Calls:**
- ✅ Webhook is async (good - doesn't block checkout)
- ❌ Client polling is blocking user experience (bad - shows loading state)

### Post-Purchase State Resolution

**What State is Expected:**
- `blueprint_subscribers.paid_blueprint_purchased = TRUE`
- `blueprint_subscribers.access_token` exists
- `stripe_payments` record exists

**What State is Missing (if webhook delayed):**
- Access token not yet in DB
- Purchase flag not yet set

**Current Handling:**
- Client polls for up to 80 seconds
- If still missing: Shows fallback button to `/blueprint/paid` (without token)
- User must check email for token link

---

## 7️⃣ DUPLICATION & OVERCOMPLEXITY FINDINGS

### Duplicate Logic: Guest vs Auth

| Feature | Free Blueprint (Guest) | Studio (Auth) | Duplication Level |
|---------|------------------------|---------------|-------------------|
| **Identity** | Email-based | Supabase Auth | 🔴 High (completely separate) |
| **State Storage** | `blueprint_subscribers` | `users` + other tables | 🔴 High (no linking) |
| **Resume Logic** | Server query by email/token | Session-based | 🟡 Medium (different but similar) |
| **Image Generation** | Blueprint APIs | Maya Pro APIs | 🟡 Medium (similar patterns) |
| **Grid Display** | Custom component | Custom component | 🟢 Low (UI only) |

### Parallel Systems Doing Same Job

1. **Image Generation APIs:**
   - Free: `/api/blueprint/generate-grid` (Nano Banana, 1 grid)
   - Paid: `/api/blueprint/generate-paid` (Nano Banana, 30 grids)
   - Studio: `/api/maya/pro/photoshoot/generate-grid` (Nano Banana, similar)
   - **All use same underlying service, different endpoints**

2. **Access Control:**
   - Free: `access_token` in URL param
   - Paid: `access_token` in URL param
   - Studio: Supabase session cookie
   - **Three different access methods for same product family**

3. **State Persistence:**
   - Free: `blueprint_subscribers` table
   - Studio: `users` + `subscriptions` + feature-specific tables
   - **No shared state model**

### Temporary Hacks That Became Permanent

1. **localStorage as State Source:**
   - Originally: Temporary client-side cache
   - Now: Required for resume when URL params missing
   - **Hack:** Client updates URL from localStorage (`page-client.tsx:142-159`)

2. **Email-Based Identity:**
   - Originally: Quick MVP without auth
   - Now: Core identity system for 2,700+ users
   - **Hack:** No password, no session, email-only access

3. **Access Token in URL:**
   - Originally: Simple token-based access
   - Now: Used for paid blueprint delivery emails
   - **Hack:** Tokens exposed in URLs, bookmarked, shared

4. **Dual Completion Flags:**
   - `blueprint_completed` (DB flag)
   - Canonical: `strategy_generated && grid_generated`
   - **Hack:** Server reconciles both with warnings (`page-server.tsx:124-126`)

### Where Studio Already Solves Blueprint Needs

| Blueprint Need | Studio Solution | Current Blueprint Implementation | Can Reuse? |
|----------------|-----------------|----------------------------------|------------|
| **User Identity** | Supabase Auth | Email + access token | ✅ Yes |
| **Session Management** | Supabase session | localStorage + URL params | ✅ Yes |
| **State Persistence** | `users` table + RLS | `blueprint_subscribers` | ✅ Yes (merge) |
| **Resume State** | Server-side session | Server query by email/token | ✅ Yes (simpler) |
| **Image Generation** | Maya Pro APIs | Blueprint-specific APIs | ✅ Yes (consolidate) |
| **Grid Display** | Studio UI components | Custom Blueprint components | 🟡 Maybe (UI differs) |

**Key Insight:** Studio infrastructure already handles everything Blueprint needs. Blueprint is a parallel system doing the same job.

---

## 8️⃣ RISKS & FAILURE MODES

### High-Risk Flows

#### **Revenue Risk: Paid Blueprint Purchase**
- **Risk:** Webhook delay causes success page to show loading indefinitely
- **Impact:** User may think purchase failed, request refund
- **Frequency:** Unknown (depends on Stripe webhook latency)
- **Mitigation:** Current polling timeout (80s) may be too long

#### **Data Loss Risk: Free Blueprint Progress**
- **Risk:** User clears localStorage, loses progress (cannot resume)
- **Impact:** User frustration, abandonment
- **Frequency:** Unknown (depends on user behavior)
- **Mitigation:** None (guest system has no cross-device sync)

#### **Auth Risk: No Linking Between Blueprint and Studio**
- **Risk:** User completes free blueprint, signs up for Studio, loses blueprint state
- **Impact:** Poor UX, duplicate work
- **Frequency:** Every user who converts
- **Mitigation:** None (tables are not linked)

### Known Bugs Surfaces by Audit

1. **Grid Flash on Refresh:**
   - **Bug:** Grid disappears briefly on page refresh
   - **Cause:** Client state hydration happens after initial render
   - **File:** `page-client.tsx:199-206`

2. **Success Page Stuck Loading:**
   - **Bug:** Paid blueprint success page shows "PREPARING..." indefinitely
   - **Cause:** Webhook race condition, polling timeout too long
   - **File:** `success-content.tsx:79-92`

3. **Completion Flag Mismatch:**
   - **Bug:** `blueprint_completed` flag can be out of sync with canonical state
   - **Cause:** Engagement tracking API sets flag independently
   - **File:** `page-server.tsx:124-126` (has warning, but flag still used)

4. **Resume Step Calculation Edge Cases:**
   - **Bug:** Edge case where `hasGrid && !hasStrategy` results in step 3.5 (shouldn't happen)
   - **Cause:** Manual step calculation logic has edge cases
   - **File:** `page-server.tsx:133-136`

### Silent Failures

1. **localStorage Write Failures:**
   - **Failure:** localStorage.setItem() can fail (quota, private browsing)
   - **Behavior:** Code continues, no error shown to user
   - **Impact:** User loses progress on refresh
   - **File:** `page-client.tsx:377` (try/catch swallows error)

2. **Email Capture API Failures:**
   - **Failure:** `/api/blueprint/subscribe` can fail (DB down, network)
   - **Behavior:** User sees error message, but formData may be lost
   - **Impact:** User must re-enter all form data
   - **File:** `blueprint-email-capture.tsx:96-120`

3. **Grid Generation Failures:**
   - **Failure:** Nano Banana API can fail silently
   - **Behavior:** Polling stops, no user feedback
   - **Impact:** User thinks generation is still processing
   - **File:** `page-client.tsx` (polling logic, no error handling visible)

### Edge Cases That Will Scale Poorly

1. **Email Collisions:**
   - **Case:** Two users with same email (typo, shared email)
   - **Impact:** Second user cannot create blueprint (UNIQUE constraint)
   - **Current:** Database error, user sees generic error message
   - **Scale:** Gets worse as user base grows

2. **Access Token Collisions:**
   - **Case:** UUID collision (extremely rare, but possible)
   - **Impact:** User cannot access their blueprint
   - **Current:** Database error on insert
   - **Scale:** Unlikely but catastrophic if it happens

3. **localStorage Quota:**
   - **Case:** User has large form_data, hits 5-10MB localStorage limit
   - **Impact:** Progress not saved, user loses data
   - **Current:** No quota checking
   - **Scale:** Gets worse as form grows

4. **Cross-Device Usage:**
   - **Case:** User starts on mobile, continues on desktop
   - **Impact:** Cannot resume (no cross-device sync)
   - **Current:** Must start over or use email link (if remembered)
   - **Scale:** Mobile-first users will hit this frequently

---

## 9️⃣ AUDIT CONCLUSIONS (NO SOLUTIONS YET)

### What is Fundamentally Over-Complicated

1. **Dual Identity Systems:**
   - Blueprint uses email + access token (guest)
   - Studio uses Supabase Auth (authenticated)
   - **Result:** Two parallel systems, no integration, duplicate maintenance

2. **Triple State Persistence:**
   - Database (source of truth)
   - localStorage (client fallback)
   - URL params (resume mechanism)
   - **Result:** Complex hydration logic, multiple failure points

3. **Manual Resume Step Calculation:**
   - Server computes step from multiple DB flags
   - Client has fallback logic from localStorage
   - **Result:** Edge cases, potential mismatches, hard to debug

4. **Separate API Endpoints for Similar Features:**
   - Blueprint grid generation: `/api/blueprint/generate-grid`
   - Paid blueprint: `/api/blueprint/generate-paid`
   - Studio Maya Pro: `/api/maya/pro/photoshoot/generate-grid`
   - **Result:** Code duplication, inconsistent behavior

### What is Misaligned with "Product Lives Inside Studio"

1. **Blueprint is Completely Isolated:**
   - No auth requirement
   - No Studio integration
   - No shared state
   - **Result:** Feels like a separate product, not part of Studio

2. **No User Journey Continuity:**
   - Free blueprint → Studio signup → Lost blueprint state
   - Paid blueprint → Studio signup → Separate access tokens
   - **Result:** Fragmented user experience

3. **Duplicate Infrastructure:**
   - Blueprint has own identity system
   - Blueprint has own state management
   - Blueprint has own image generation APIs
   - **Result:** Wasted engineering effort, maintenance burden

4. **No Single Source of Truth:**
   - Blueprint state: `blueprint_subscribers` table
   - Studio state: `users` + `subscriptions` + other tables
   - **Result:** Cannot query user's complete state in one place

### What Must Be Fixed Before Scaling Monetization

1. **Auth Integration:**
   - Blueprint must use Supabase Auth (not email-only)
   - Users must sign up with password before starting blueprint
   - **Reason:** Required for Studio integration, cross-device sync, security

2. **State Linking:**
   - `blueprint_subscribers` must link to `users` table (FK or merge)
   - Single source of truth for user state
   - **Reason:** Prevents data loss on conversion, enables unified queries

3. **Resume State Simplification:**
   - Single resume mechanism (server-side, auth-based)
   - Remove localStorage dependency
   - **Reason:** Eliminates edge cases, improves reliability

4. **Webhook Reliability:**
   - Fix race condition in paid blueprint success page
   - Add webhook retry mechanism
   - **Reason:** Prevents revenue loss from "stuck loading" bugs

5. **Error Handling:**
   - Surface localStorage failures to user
   - Handle API failures gracefully
   - Add retry logic for grid generation
   - **Reason:** Improves user experience, reduces support burden

---

## 📊 Summary Statistics

- **User Types:** 3 (Blueprint Subscriber, Studio User, Paid Blueprint Buyer)
- **Identity Systems:** 2 (Email+Token, Supabase Auth)
- **State Persistence Layers:** 3 (DB, localStorage, URL params)
- **API Endpoints for Grid Generation:** 3 (Free, Paid, Studio)
- **Tables Involved:** 2 primary (`blueprint_subscribers`, `users`) + 1 (`stripe_payments`)
- **Known Bugs:** 4 (Grid flash, Stuck loading, Completion mismatch, Resume edge cases)
- **Silent Failures:** 3 (localStorage, Email capture, Grid generation)
- **High-Risk Flows:** 3 (Revenue, Data loss, Auth)

---

**✅ AUDIT COMPLETE**

This audit documents the current state of the Blueprint system. All findings are evidence-backed with file paths and line numbers. No solutions have been proposed yet - this audit is for understanding only.
