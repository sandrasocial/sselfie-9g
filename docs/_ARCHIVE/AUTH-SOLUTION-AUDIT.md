# AUTH CONSISTENCY AUDIT — Studio vs Paid Blueprint

**Date:** 2026-01-09  
**Goal:** Audit auth flows and recommend best solution for consistency  
**Constraint:** DO NOT change /studio login flow or membership auth

---

## A) STUDIO / MEMBERSHIP AUTH (EVIDENCE ONLY)

### A.1: Auth System Used for /studio

#### A.1.1: Where Auth is Enforced

**1. Middleware Level**
- **File:** `/middleware.ts`
- **Lines:** 5-32
- **Evidence:**
```typescript
export async function middleware(request: NextRequest) {
  // ... skip conditions ...
  const response = await updateSession(request)
  // ...
}
```
- **Function:** `updateSession()` from `/lib/supabase/middleware.ts`
- **Purpose:** Updates Supabase session on every request

**2. Page Level (Server Component)**
- **File:** `/app/studio/page.tsx`
- **Lines:** 17-31
- **Evidence:**
```typescript
const supabase = await createServerClient()
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  redirect("/auth/login?returnTo=/studio")
}
```
- **Enforcement:** Server-side redirect if no authenticated user

**3. API Route Level**
- **File:** `/app/api/studio/generate/route.ts`
- **Lines:** 28-36
- **Evidence:**
```typescript
const supabase = await createServerClient()
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

---

#### A.1.2: Functions Used

**Primary Auth Function:**
- **Function:** `supabase.auth.getUser()`
- **Returns:** `{ data: { user: User | null }, error: Error | null }`
- **Source:** Supabase Auth (via `createServerClient()`)

**User Mapping Function:**
- **Function:** `getUserByAuthId(authId: string)`
- **File:** `/lib/user-mapping.ts`
- **Lines:** 159-177
- **Evidence:**
```typescript
export async function getUserByAuthId(authId: string): Promise<NeonUser | null> {
  const db = getSQL()
  const users = await retryWithBackoff(
    () => db`
    SELECT * FROM users 
    WHERE stack_auth_id = ${authId} OR supabase_user_id = ${authId}
    LIMIT 1
  `,
    5,
    2000,
  )
  return users.length > 0 ? (users[0] as NeonUser) : null
}
```
- **Purpose:** Maps Supabase auth ID → Neon database `users.id`

**Helper Function:**
- **Function:** `getAuthenticatedUser()`
- **File:** `/lib/auth-helper.ts`
- **Lines:** 28-117
- **Purpose:** Cached wrapper around `supabase.auth.getUser()` (30s cache)

---

#### A.1.3: Identity Primitive

**Auth Identity:**
- **Type:** Supabase Auth User ID (`user.id`)
- **Format:** UUID string (e.g., `"abc123-def456-..."`)
- **Source:** Supabase Auth service

**Database Identity:**
- **Table:** `users`
- **Column:** `id` (UUID, primary key)
- **Mapping Column:** `supabase_user_id` (stores Supabase auth ID)
- **Alternative:** `stack_auth_id` (legacy Stack Auth support)

**Evidence:**
- **File:** `/lib/user-mapping.ts` lines 159-177
- **File:** `/app/studio/page.tsx` lines 57, 65

**Flow:**
```
Supabase Auth → user.id (auth ID)
       ↓
getUserByAuthId(user.id)
       ↓
users table → users.id (database ID)
       ↓
All Studio features use users.id
```

---

### A.2: Protected Studio Routes/Pages (3 Examples)

#### Example 1: `/app/studio/page.tsx`

**File:** `/app/studio/page.tsx`  
**Lines:** 9-76

**Auth Check:**
```typescript
const supabase = await createServerClient()
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  redirect("/auth/login?returnTo=/studio")
}

// Get Neon user
const neonUser = await getUserByAuthId(user.id)
if (!neonUser) {
  redirect("/auth/login?returnTo=/studio")
}
```

**Access Granted:**
- ✅ User authenticated via Supabase
- ✅ User exists in `users` table
- ✅ Passes `neonUser.id` to `<SselfieApp userId={neonUser.id} />`

---

#### Example 2: `/app/api/studio/generate/route.ts`

**File:** `/app/api/studio/generate/route.ts`  
**Lines:** 28-44

**Auth Check:**
```typescript
const supabase = await createServerClient()
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

const [neonUser] = await sql`
  SELECT id FROM users WHERE stack_auth_id = ${user.id}
`

if (!neonUser) {
  return NextResponse.json({ error: "User not found" }, { status: 404 })
}
```

**Access Granted:**
- ✅ Returns 401 if no Supabase user
- ✅ Returns 404 if user not in database
- ✅ Uses `neonUser.id` for credit checks and generation

---

#### Example 3: `/app/api/studio/stats/route.ts`

**File:** `/app/api/studio/stats/route.ts`  
**Lines:** 6-22

**Auth Check:**
```typescript
const supabase = await createServerClient()
const {
  data: { user: authUser },
  error: authError,
} = await supabase.auth.getUser()

if (authError || !authUser) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

const neonUser = await getUserByAuthId(authUser.id)
if (!neonUser) {
  return NextResponse.json({ error: "User not found" }, { status: 404 })
}
```

**Access Granted:**
- ✅ Checks both `authError` and `authUser`
- ✅ Maps to Neon user via `getUserByAuthId()`
- ✅ Uses `neonUser.id` for stats query

---

## B) PAID BLUEPRINT AUTH (EVIDENCE ONLY)

### B.1: `/app/blueprint/paid/page.tsx`

#### B.1.1: How Access Token is Read

**File:** `/app/blueprint/paid/page.tsx`  
**Lines:** 22-24

**Evidence:**
```typescript
const searchParams = useSearchParams()
const accessToken = searchParams.get("access")
```

**Source:** URL query parameter `?access=TOKEN`

**Validation:**
- **Lines:** 280-298
- **Evidence:**
```typescript
if (!accessToken) {
  return (
    <div>Access Required - You need a valid access token...</div>
  )
}
```

---

#### B.1.2: DB Field Mapping

**Table:** `blueprint_subscribers`  
**Column:** `access_token` (VARCHAR(255), UNIQUE, indexed)

**Evidence:**
- **File:** `/scripts/create-blueprint-subscribers-table.sql`
- **Line:** 6 — `access_token VARCHAR(255) NOT NULL UNIQUE`
- **Line:** 48 — `CREATE INDEX ... ON blueprint_subscribers(access_token)`

**Lookup Pattern:**
- **File:** `/app/api/blueprint/get-paid-status/route.ts`
- **Lines:** 27-42
```typescript
const subscriber = await sql`
  SELECT 
    id, email, paid_blueprint_purchased, ...
  FROM blueprint_subscribers
  WHERE access_token = ${accessToken}
  LIMIT 1
`
```

---

### B.2: `/app/api/blueprint/get-paid-status/route.ts`

#### B.2.1: Access Token Read

**File:** `/app/api/blueprint/get-paid-status/route.ts`  
**Lines:** 14-15

**Evidence:**
```typescript
const { searchParams } = new URL(req.url)
const accessToken = searchParams.get("access")
```

**Source:** Query parameter `?access=TOKEN`

---

#### B.2.2: DB Lookup

**Lines:** 27-42
```typescript
const subscriber = await sql`
  SELECT 
    id, email, paid_blueprint_purchased, ...
  FROM blueprint_subscribers
  WHERE access_token = ${accessToken}
  LIMIT 1
`
```

---

#### B.2.3: Invalid Token Handling

**Lines:** 44-50
```typescript
if (subscriber.length === 0) {
  console.log("[v0][paid-blueprint] Invalid access token")
  return NextResponse.json(
    { error: "Invalid access token" },
    { status: 404 },
  )
}
```

**Response:** 404 status code, error message

**UI Behavior:**
- **File:** `/app/blueprint/paid/page.tsx`
- **Lines:** 80-82, 280-298
- Shows "Access Required" error page with "Go to Blueprint" button

---

### B.3: `/app/api/blueprint/generate-paid/route.ts`

#### B.3.1: Access Token Read

**File:** `/app/api/blueprint/generate-paid/route.ts`  
**Lines:** 20, 23-28

**Evidence:**
```typescript
const { accessToken, gridNumber } = await req.json()

if (!accessToken || typeof accessToken !== "string") {
  return NextResponse.json(
    { error: "Access token is required" },
    { status: 400 }
  )
}
```

**Source:** Request body JSON

---

#### B.3.2: DB Lookup

**Lines:** 40-53
```typescript
const subscriber = await sql`
  SELECT 
    id, email, paid_blueprint_purchased, ...
  FROM blueprint_subscribers
  WHERE access_token = ${accessToken}
  LIMIT 1
`
```

---

#### B.3.3: Generation Guards

**Guard 1: Must Have Purchased**
- **Lines:** 66-76
```typescript
if (!data.paid_blueprint_purchased) {
  return NextResponse.json(
    { 
      error: "Paid blueprint not purchased. Please purchase first.",
      requiresAction: "purchase"
    },
    { status: 403 },
  )
}
```

**Guard 2: Must Have Selfies**
- **Lines:** 78-92
```typescript
const selfieUrls = Array.isArray(data.selfie_image_urls) ? data.selfie_image_urls : []
const validSelfieUrls = selfieUrls.filter((url: any) => 
  typeof url === "string" && url.startsWith("http")
)

if (validSelfieUrls.length === 0) {
  return NextResponse.json(
    { error: "Selfie images are required. Please upload 1-3 selfies first." },
    { status: 400 },
  )
}
```

**Guard 3: Must Have Form Data**
- **Lines:** 100-103
```typescript
const formData = data.form_data || {}
const category = (formData.vibe || "professional") as BlueprintCategory
const mood = (data.feed_style || formData.feed_style || "minimal") as BlueprintMood
```

---

#### B.3.4: Invalid Token Handling

**Lines:** 55-61
```typescript
if (subscriber.length === 0) {
  console.log("[v0][paid-blueprint] Invalid access token")
  return NextResponse.json(
    { error: "Invalid access token" },
    { status: 404 },
  )
}
```

**Response:** 404 status code

---

### B.4: `/app/api/blueprint/check-paid-grid/route.ts`

#### B.4.1: Access Token Read

**File:** `/app/api/blueprint/check-paid-grid/route.ts`  
**Lines:** 23-26

**Evidence:**
```typescript
const { searchParams } = new URL(req.url)
const predictionId = searchParams.get("predictionId")
const gridNumberStr = searchParams.get("gridNumber")
const accessToken = searchParams.get("access")
```

**Source:** Query parameter `?access=TOKEN`

---

#### B.4.2: DB Lookup & Validation

**Lines:** 60-77
```typescript
const subscriber = await sql`
  SELECT 
    id, email, paid_blueprint_purchased, paid_blueprint_photo_urls
  FROM blueprint_subscribers
  WHERE access_token = ${accessToken}
  LIMIT 1
`

if (subscriber.length === 0) {
  return NextResponse.json(
    { error: "Invalid access token" },
    { status: 404 }
  )
}
```

---

#### B.4.3: Invalid Token Handling

**Response:** 404 status code, error message

---

## C) INCONSISTENCY / RISK FINDINGS (NO ASSUMPTIONS)

### C.1: Can Logged-In Studio User Access Paid Blueprint Without Token?

**Answer:** ❌ **NO**

**Evidence:**
- **File:** `/app/blueprint/paid/page.tsx`
- **Lines:** 22-24, 280-298
- **Code:**
```typescript
const accessToken = searchParams.get("access")

if (!accessToken) {
  return <div>Access Required...</div>
}
```

**API Routes:**
- **File:** `/app/api/blueprint/get-paid-status/route.ts`
- **Lines:** 17-22
- **Code:**
```typescript
if (!accessToken || typeof accessToken !== "string") {
  return NextResponse.json(
    { error: "Access token is required" }, 
    { status: 400 }
  )
}
```

**Finding:** No check for logged-in user. Token is required.

**Risk:** Logged-in Studio user who purchased paid blueprint cannot access it without email link.

---

### C.2: Can Paid Blueprint Buyer Access /studio Without Login?

**Answer:** ❌ **NO** (Confirmed)

**Evidence:**
- **File:** `/app/studio/page.tsx`
- **Lines:** 25-31
- **Code:**
```typescript
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  redirect("/auth/login?returnTo=/studio")
}
```

**Finding:** Studio requires Supabase auth. No token-based access.

**Risk:** Paid blueprint buyer cannot access Studio features without creating account.

---

### C.3: Shared Stripe Webhook Behaviors

#### C.3.1: Email Matching

**File:** `/app/api/webhooks/stripe/route.ts`  
**Lines:** 130, 1023-1047

**Evidence:**
```typescript
const customerEmail = session.customer_details?.email || session.customer_email

// Update blueprint_subscribers by email
await sql`
  UPDATE blueprint_subscribers
  SET 
    paid_blueprint_purchased = TRUE,
    paid_blueprint_purchased_at = NOW(),
    paid_blueprint_stripe_payment_id = ${paymentIntentId || null},
    converted_to_user = TRUE,
    converted_at = NOW(),
    updated_at = NOW()
  WHERE email = ${customerEmail}
`
```

**Finding:** Webhook matches by email, not by user ID or token.

**Risk:** If same email used for Studio membership and paid blueprint, both get updated, but no linking occurs.

---

#### C.3.2: converted_to_user Flag

**File:** `/scripts/create-blueprint-subscribers-table.sql`  
**Lines:** 27-28

**Evidence:**
```sql
converted_to_user BOOLEAN DEFAULT FALSE,
converted_at TIMESTAMP WITH TIME ZONE,
```

**Usage:**
- **File:** `/app/api/webhooks/stripe/route.ts`
- **Lines:** 1034, 300-306, 1888-1894
- **Code:**
```typescript
// Set converted_to_user = TRUE when ANY purchase happens
converted_to_user = TRUE,
converted_at = NOW(),
```

**Finding:** Flag exists but does NOT link to `users` table. No `user_id` column in `blueprint_subscribers`.

**Risk:** Cannot query "which Studio users have paid blueprint" or vice versa.

---

#### C.3.3: No Direct Linking

**Evidence:**
- **File:** `/scripts/create-blueprint-subscribers-table.sql`
- **Finding:** No `user_id` column, no `stripe_customer_id` column
- **Only Link:** Email address (string match)

**Risk:** 
- Email mismatch (typo, different emails) = no linking
- No programmatic way to link accounts
- Cannot show "Your Paid Blueprint" in Studio dashboard

---

### C.4: Additional Risks

#### Risk 1: Token Sharing
- **Issue:** Access token in URL can be shared/bookmarked
- **Evidence:** Token stored in URL query parameter
- **Impact:** Anyone with token can access paid blueprint

#### Risk 2: No Token Expiration
- **Issue:** Tokens never expire
- **Evidence:** No `expires_at` column in `blueprint_subscribers`
- **Impact:** Permanent access if token leaked

#### Risk 3: Email Mismatch
- **Issue:** User signs up for Studio with different email than blueprint
- **Evidence:** No cross-table linking
- **Impact:** Cannot automatically link accounts

#### Risk 4: Duplicate Purchases
- **Issue:** Same email can purchase paid blueprint multiple times
- **Evidence:** `email` is UNIQUE in `blueprint_subscribers`, but Stripe allows multiple payments
- **Impact:** Second purchase might fail or create confusion

---

## D) BEST SOLUTION OPTIONS (KEEP /STUDIO UNCHANGED)

### Option 1: Keep Paid Blueprint Token-Only (Recommended)

**Description:** Maintain current token-based access, add security mitigations.

**Pros:**
- ✅ No changes to /studio auth (meets constraint)
- ✅ Simple, works today
- ✅ Email-link access is user-friendly
- ✅ No database schema changes needed
- ✅ Backward compatible

**Cons:**
- ❌ Logged-in Studio users still need email link
- ❌ Token sharing risk (mitigated below)
- ❌ No unified account view

**Mitigations to Add:**

1. **Token Entropy Check**
   - **Location:** `/app/api/blueprint/get-paid-status/route.ts` (and other routes)
   - **Check:** Ensure token is UUID format (36 chars, 4 hyphens)
   - **Code:**
   ```typescript
   const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
   if (!UUID_REGEX.test(accessToken)) {
     return NextResponse.json({ error: "Invalid token format" }, { status: 400 })
   }
   ```

2. **Optional Token Rotation**
   - **New Endpoint:** `POST /api/blueprint/rotate-token?access=OLD_TOKEN`
   - **Action:** Generate new token, invalidate old
   - **DB Change:** None (just UPDATE access_token)
   - **Use Case:** User suspects token leaked

3. **Rate Limiting on Token**
   - **Location:** Add to all paid blueprint API routes
   - **Limit:** 100 requests/hour per token
   - **Implementation:** Use existing `rateLimit()` helper

**New/Changed Endpoints:**
- `POST /api/blueprint/rotate-token` (optional)

**DB Changes:**
- None required

**Security Implications:**
- ✅ Token format validation prevents basic attacks
- ✅ Rate limiting prevents brute force
- ⚠️ Token still shareable (by design)
- ⚠️ No expiration (acceptable for one-time product)

**Migration/Rollout:**
- ✅ No migration needed
- ✅ Feature flag: `ENABLE_BLUEPRINT_TOKEN_VALIDATION`
- ✅ Backward compatible (existing tokens still work)

---

### Option 2: Dual Access (Token OR Logged-In User)

**Description:** If logged in, check if email matches blueprint subscriber. Allow access without token.

**Pros:**
- ✅ Convenience for logged-in Studio users
- ✅ No /studio auth changes (only adds check)
- ✅ Falls back to token if not logged in
- ✅ Better UX

**Cons:**
- ⚠️ Email matching risk (typos, different emails)
- ⚠️ More complex logic
- ⚠️ Need to handle edge cases

**Implementation:**

**1. Identity Matching Strategy**

**Option A: Email Match (Recommended)**
- **Evidence:** Both systems use email
- **Match:** `users.email === blueprint_subscribers.email`
- **Reliability:** High (email is primary identifier)

**Option B: Stripe Customer ID Match**
- **Evidence:** Need to check if `users` table has `stripe_customer_id`
- **Match:** `users.stripe_customer_id === blueprint_subscribers.paid_blueprint_stripe_payment_id`
- **Reliability:** Medium (not all users have Stripe ID)

**Option C: Combined (Email OR Stripe ID)**
- **Match:** Email OR Stripe Customer ID
- **Reliability:** Highest

**2. Modified Routes**

**File:** `/app/blueprint/paid/page.tsx`  
**Change:** Lines 22-24, 69-120

**New Logic:**
```typescript
const searchParams = useSearchParams()
const accessToken = searchParams.get("access")

// Try logged-in user first
let subscriber = null
if (!accessToken) {
  // Check if user is logged in
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const neonUser = await getUserByAuthId(user.id)
    if (neonUser?.email) {
      // Lookup by email
      subscriber = await sql`
        SELECT * FROM blueprint_subscribers
        WHERE email = ${neonUser.email}
        AND paid_blueprint_purchased = TRUE
        LIMIT 1
      `
    }
  }
} else {
  // Fallback to token lookup (existing logic)
  subscriber = await sql`
    SELECT * FROM blueprint_subscribers
    WHERE access_token = ${accessToken}
    LIMIT 1
  `
}
```

**File:** `/app/api/blueprint/get-paid-status/route.ts`  
**Change:** Lines 12-50

**New Logic:**
```typescript
const accessToken = searchParams.get("access")
let subscriber = null

if (!accessToken) {
  // Try logged-in user
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const neonUser = await getUserByAuthId(user.id)
    if (neonUser?.email) {
      subscriber = await sql`
        SELECT * FROM blueprint_subscribers
        WHERE email = ${neonUser.email}
        AND paid_blueprint_purchased = TRUE
        LIMIT 1
      `
    }
  }
  
  if (!subscriber) {
    return NextResponse.json(
      { error: "Access token required or login required" },
      { status: 401 }
    )
  }
} else {
  // Existing token lookup
  subscriber = await sql`
    SELECT * FROM blueprint_subscribers
    WHERE access_token = ${accessToken}
    LIMIT 1
  `
}
```

**3. Edge Cases**

**Case 1: Email Mismatch**
- **Scenario:** User signed up Studio with `user@email.com`, blueprint with `user+blueprint@email.com`
- **Handling:** Token still required (no match found)
- **User Action:** Use email link

**Case 2: Multiple Blueprints**
- **Scenario:** User purchased paid blueprint twice (different emails)
- **Handling:** Return first match, or show selection UI
- **Recommendation:** Return most recent purchase

**Case 3: Not Logged In + No Token**
- **Scenario:** User visits `/blueprint/paid` without token or login
- **Handling:** Show "Access Required" page (existing behavior)

**New/Changed Endpoints:**
- None (modify existing)

**DB Changes:**
- None required (email matching uses existing columns)

**Security Implications:**
- ✅ Email matching is secure (same email = same person)
- ⚠️ Email typos prevent matching (falls back to token)
- ⚠️ Different emails = no match (by design)
- ✅ No token sharing if logged in (uses session)

**Migration/Rollout:**
- ✅ Feature flag: `ENABLE_BLUEPRINT_DUAL_ACCESS`
- ✅ Backward compatible (token still works)
- ✅ Gradual rollout: Enable for logged-in users first

---

### Option 3: Linking Step (Optional Bridge)

**Description:** If logged in, show "Link this blueprint to my Studio account" button. Creates explicit link.

**Pros:**
- ✅ Explicit user consent
- ✅ Handles email mismatches
- ✅ Creates permanent link
- ✅ No /studio auth changes

**Cons:**
- ⚠️ Requires user action
- ⚠️ Needs database schema change
- ⚠️ More complex implementation

**Implementation:**

**1. Database Schema Change**

**New Column:**
```sql
ALTER TABLE blueprint_subscribers
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
```

**Index:**
```sql
CREATE INDEX idx_blueprint_subscribers_user_id 
ON blueprint_subscribers(user_id) 
WHERE user_id IS NOT NULL;
```

**2. Linking Endpoint**

**New Endpoint:** `POST /api/blueprint/link-to-account`

**Request:**
```json
{
  "accessToken": "abc123...",
  "confirm": true
}
```

**Logic:**
```typescript
// Verify token
const subscriber = await sql`
  SELECT * FROM blueprint_subscribers
  WHERE access_token = ${accessToken}
  LIMIT 1
`

// Get logged-in user
const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: "Must be logged in" }, { status: 401 })
}

const neonUser = await getUserByAuthId(user.id)

// Link
await sql`
  UPDATE blueprint_subscribers
  SET user_id = ${neonUser.id},
      updated_at = NOW()
  WHERE access_token = ${accessToken}
`
```

**3. UI Changes**

**File:** `/app/blueprint/paid/page.tsx`  
**Add:** Check if logged in, show "Link to Studio Account" button if not linked

**New Logic:**
```typescript
// Check if user is logged in
const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()

if (user && !subscriber.user_id) {
  // Show "Link to Studio Account" button
}
```

**4. Modified Access Logic**

**File:** `/app/blueprint/paid/page.tsx`  
**Change:** Allow access if `user_id` matches logged-in user

**New Logic:**
```typescript
if (!accessToken) {
  // Check if logged in and linked
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const neonUser = await getUserByAuthId(user.id)
    if (neonUser) {
      subscriber = await sql`
        SELECT * FROM blueprint_subscribers
        WHERE user_id = ${neonUser.id}
        AND paid_blueprint_purchased = TRUE
        LIMIT 1
      `
    }
  }
}
```

**New/Changed Endpoints:**
- `POST /api/blueprint/link-to-account` (new)
- `GET /api/blueprint/get-paid-status` (modified)
- `POST /api/blueprint/generate-paid` (modified)
- `GET /api/blueprint/check-paid-grid` (modified)

**DB Changes:**
- ✅ Add `user_id` column to `blueprint_subscribers`
- ✅ Add index on `user_id`
- ✅ Migration script needed

**Security Implications:**
- ✅ Explicit linking prevents accidental matches
- ✅ User controls when to link
- ✅ Handles email mismatches gracefully
- ✅ Permanent link (can't unlink easily - add unlink endpoint if needed)

**Migration/Rollout:**
- ⚠️ Requires database migration
- ✅ Feature flag: `ENABLE_BLUEPRINT_LINKING`
- ✅ Backward compatible (existing tokens still work)
- ✅ Gradual rollout: Enable linking UI, then auto-access

---

## E) RECOMMENDATION

### Recommended: Option 2 (Dual Access) with Option 1 Mitigations

**Rationale:**
1. **Best UX:** Logged-in Studio users get seamless access
2. **No Schema Changes:** Uses existing email matching
3. **Backward Compatible:** Token access still works
4. **Low Risk:** Falls back to token if no match
5. **Meets Constraint:** No /studio auth changes

**Implementation Priority:**
1. **Phase 1:** Add Option 1 mitigations (token validation, rate limiting)
2. **Phase 2:** Add Option 2 dual access (email matching)
3. **Phase 3 (Optional):** Add Option 3 linking for explicit control

**Why Not Option 1 Alone:**
- Poor UX for logged-in Studio users
- Forces users to find email link even when logged in

**Why Not Option 3 Alone:**
- Requires database migration
- Requires user action (friction)
- More complex

**Why Option 2 + Option 1:**
- Best of both worlds
- No migration needed
- Seamless for logged-in users
- Secure with mitigations

---

## F) MISSING EVIDENCE

### Searched But Not Found:

1. **Direct Linking Between Tables:**
   - ❌ No `user_id` column in `blueprint_subscribers`
   - ❌ No `blueprint_subscriber_id` column in `users`
   - ✅ Only link: Email address (string match)

2. **Stripe Customer ID in Users Table:**
   - ❓ Need to verify if `users` table has `stripe_customer_id` column
   - **Searched:** `grep stripe_customer_id app/studio` — No matches
   - **Conclusion:** Likely not used for Studio users

3. **Existing Linking Mechanisms:**
   - ❌ No API endpoint to link accounts
   - ❌ No UI to link accounts
   - ✅ `converted_to_user` flag exists but doesn't create link

---

## G) SUMMARY

### Current State:
- ✅ Studio: Supabase auth → `users.id`
- ✅ Paid Blueprint: Token → `blueprint_subscribers.access_token`
- ❌ No linking between systems
- ❌ Logged-in users cannot access paid blueprint without token
- ❌ Paid blueprint buyers cannot access Studio without login

### Recommended Solution:
**Option 2 (Dual Access) + Option 1 (Mitigations)**

**Changes Required:**
- Modify 4 API routes to check logged-in user if no token
- Add token validation (UUID format check)
- Add rate limiting
- No database changes
- No /studio auth changes

**Timeline:**
- Phase 1 (Mitigations): 1-2 days
- Phase 2 (Dual Access): 2-3 days
- Total: ~1 week

**Risk Level:** Low (backward compatible, feature-flagable)

---

**End of Audit**
