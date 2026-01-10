# PR-9 Audit: Studio Integration Readiness
**Model A: Guest Checkout + Token Access Remains Primary**

**Status:** Audit Only (No Implementation)  
**Date:** 2025-01-XX  
**Goal:** Determine minimal approach to represent paid_blueprint entitlement for authenticated users without changing guest flow

---

## 1️⃣ STUDIO NAVIGATION/TAB SYSTEM

### Tab Definition & Rendering

**Location:** `components/sselfie/sselfie-app.tsx`

**Tabs Defined:**
```typescript
const validTabs = [
  "maya",        // Maya Chat (AI stylist)
  "gallery",     // Gallery (all images)
  "feed-planner", // Feed Planner (content calendar)
  "academy",     // Academy (tutorials, courses) - MEMBERSHIP ONLY
  "account",     // Account (settings)
]
```

**Tab Rendering:**
- Lines 770-775: Tabs conditionally rendered based on `activeTab` state
- All tabs are client-side routed (hash-based: `#maya`, `#gallery`, etc.)
- No server-side tab gating (all tabs accessible via URL hash)

### Academy Tab Gating Logic

**Location:** `components/sselfie/sselfie-app.tsx` + `lib/subscription.ts`

**Current Implementation:**
1. **Access Check Function:**
   - File: `lib/subscription.ts` (line 67-78)
   - Function: `hasStudioMembership(userId: string): Promise<boolean>`
   - Logic: Checks `subscriptions` table for `product_type = 'sselfie_studio_membership'` AND `status = 'active'`

2. **Access State:**
   - File: `components/sselfie/access.ts`
   - Function: `getAccessState({ credits, subscriptionStatus })`
   - Returns: `{ isMember, canUseGenerators, showUpgradeUI }`
   - Note: Only checks subscription status, not individual product types

3. **Tab Visibility:**
   - **Current:** Academy tab is ALWAYS visible in navigation (no client-side hiding)
   - **Gating:** Happens INSIDE Academy component when user tries to access content
   - **File:** `components/sselfie/academy-screen.tsx` (likely checks `hasStudioMembership()` internally)

**Finding:** Tab visibility is NOT gated at the navigation level. Access control happens at the content level (inside each tab component).

### Recommended Approach for Blueprint Tab

**Option 1: Content-Level Gating (Same Pattern as Academy)**
- Add "Blueprint" tab to `validTabs` array
- Always show tab in navigation (no hiding)
- Gate access inside Blueprint component using entitlement check
- **Pros:** Consistent with Academy pattern, minimal changes
- **Cons:** Tab visible even if user doesn't have access

**Option 2: Navigation-Level Gating (More Visible)**
- Add "Blueprint" tab to `validTabs` array
- Conditionally render tab based on entitlement check
- **Pros:** Cleaner UX, tab only visible when accessible
- **Cons:** Requires client-side entitlement check on mount

**Recommendation:** **Option 2 (Navigation-Level Gating)** for better UX, but can start with Option 1 for minimal changes.

---

## 2️⃣ ENTITLEMENT MODEL

### Current Subscription System

**Location:** `lib/subscription.ts`

**Key Functions:**
1. `getUserSubscription(userId: string)` - Gets active subscription from `subscriptions` table
2. `hasStudioMembership(userId: string)` - Checks for `sselfie_studio_membership` product type
3. `getUserProductAccess(userId: string)` - Returns product type or null

**Database Table: `subscriptions`**
```sql
Columns:
- user_id (TEXT, FK to users.id)
- product_type (TEXT) - Values: 'sselfie_studio_membership', 'one_time_session', ...
- status (TEXT) - Values: 'active', 'trialing', 'canceled', ...
- created_at, updated_at, etc.
```

**Current Product Types:**
- `sselfie_studio_membership` - Recurring subscription (200 credits/month)
- `one_time_session` - One-time purchase (50 credits) - **NOTE:** Deprecated, no longer tracked in subscriptions table

### One-Time Entitlements

**Finding:** One-time entitlements are **NOT currently tracked** in `subscriptions` table.

**Evidence:**
- `hasOneTimeSession()` function is deprecated (line 85-88 in `lib/subscription.ts`)
- Comment says: "One-time sessions are no longer tracked in subscriptions table"
- One-time purchases are tracked via credits (`user_credits` table) instead

**Current Approach for One-Time Purchases:**
- Credits are granted to `user_credits` table
- No subscription record created
- Access determined by credit balance, not entitlement

### Product Type Check

**Location:** `lib/products.ts` (line 53-82)

**PRICING_PRODUCTS Array:**
```typescript
{
  id: "paid_blueprint",
  name: "Brand Blueprint - Paid",
  displayName: "SSELFIE Brand Blueprint",
  description: "30 custom photos based on your brand strategy",
  priceInCents: 4700, // $47 one-time
  type: "paid_blueprint",
  credits: 0  // Note: No credits granted
}
```

**Finding:** `paid_blueprint` product type already exists in PRICING_PRODUCTS, but:
- `credits: 0` - No credits granted (access is entitlement-based, not credit-based)
- No subscription record created for one-time purchases currently

### Minimal Way to Represent paid_blueprint Entitlement

**Option A: Use `subscriptions` Table (Recommended for Consistency)**
```sql
-- Create subscription record for one-time purchase
INSERT INTO subscriptions (user_id, product_type, status, created_at)
VALUES ('user_id', 'paid_blueprint', 'active', NOW())
```

**Pros:**
- ✅ Uses existing entitlement infrastructure
- ✅ Consistent with other product types
- ✅ Easy to check: `getUserProductAccess()` will return `'paid_blueprint'`
- ✅ Can add expiration date if needed (`expires_at` column)

**Cons:**
- ⚠️ Requires subscription record for one-time purchase (semantic mismatch)
- ⚠️ Need to handle "active" status for one-time purchases (no recurring billing)

**Option B: Use `blueprint_subscribers` Table (Current Approach)**
```sql
-- Already tracks: paid_blueprint_purchased BOOLEAN
SELECT paid_blueprint_purchased FROM blueprint_subscribers WHERE user_id = 'user_id'
```

**Pros:**
- ✅ Already exists and is populated
- ✅ No changes needed to subscriptions table
- ✅ Preserves guest checkout flow (uses email/token, not user_id)

**Cons:**
- ⚠️ Requires linking `blueprint_subscribers.email` to `users.email`
- ⚠️ No centralized entitlement system (scattered across tables)
- ⚠️ Harder to query "what products does this user have?"

**Option C: Hybrid (Recommended Minimal Approach)**
- **Guest users:** Continue using `blueprint_subscribers.paid_blueprint_purchased` (token access)
- **Authenticated users:** Create `subscriptions` record when they sign up (link via email)
- **Access check:** Check both tables (subscriptions first, fallback to blueprint_subscribers)

**Pros:**
- ✅ Preserves guest checkout flow (no breaking changes)
- ✅ Provides centralized entitlement for authenticated users
- ✅ Minimal changes required

**Cons:**
- ⚠️ Two sources of truth (need to sync when user signs up)
- ⚠️ Need migration script to link existing purchases

**Recommendation:** **Option C (Hybrid)** - Best of both worlds, minimal changes, preserves guest flow.

---

## 3️⃣ LINKING STRATEGY

### How to Link blueprint_subscribers.email to users.email

**Current State:**
- `blueprint_subscribers` table has `email` column (required, unique)
- `users` table has `email` column (optional, not unique)
- **No foreign key relationship exists**
- **No `user_id` column in `blueprint_subscribers` table** (verified via schema)

### Linking Approaches

**Option 1: Add `user_id` Foreign Key (Recommended)**
```sql
-- Migration:
ALTER TABLE blueprint_subscribers
ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_blueprint_subscribers_user_id ON blueprint_subscribers(user_id);

-- Migration script (link by email):
UPDATE blueprint_subscribers bs
SET user_id = u.id
FROM users u
WHERE u.email = bs.email
AND bs.user_id IS NULL;
```

**Pros:**
- ✅ Direct relationship (foreign key)
- ✅ Enables JOIN queries for entitlements
- ✅ Can cascade delete or set null (flexible)
- ✅ Index for fast lookups

**Cons:**
- ⚠️ Requires migration (safe: nullable column, no breaking changes)
- ⚠️ Guest users will have `user_id = NULL` (preserves guest flow)

**Option 2: Link by Email (No Schema Changes)**
```typescript
// Runtime linking (no migration needed)
const getUserBlueprintAccess = async (userId: string) => {
  const user = await getUserByAuthId(userId)
  if (!user?.email) return false
  
  const subscriber = await sql`
    SELECT paid_blueprint_purchased
    FROM blueprint_subscribers
    WHERE email = ${user.email}
    LIMIT 1
  `
  
  return subscriber[0]?.paid_blueprint_purchased === true
}
```

**Pros:**
- ✅ No migration required
- ✅ Works immediately (no schema changes)

**Cons:**
- ⚠️ Email matching is fragile (case sensitivity, typos, etc.)
- ⚠️ Slower queries (no index on email for this join)
- ⚠️ No referential integrity (can have orphaned records)

**Recommendation:** **Option 1 (Add user_id FK)** - More robust, enables efficient queries, preserves guest flow (nullable column).

### When to Link

**Trigger Points:**
1. **On Sign-Up:** When user creates account with email that exists in `blueprint_subscribers`
2. **On Login:** When user logs in, check if email matches any `blueprint_subscribers` records
3. **On Purchase:** When guest user purchases paid blueprint, prompt for account creation
4. **Manual Migration:** Batch script to link existing records

**Recommended Flow:**
```typescript
// On user sign-up/login
const linkBlueprintSubscriber = async (userId: string, email: string) => {
  await sql`
    UPDATE blueprint_subscribers
    SET user_id = ${userId}
    WHERE email = ${email}
    AND user_id IS NULL  -- Only link if not already linked
  `
  
  // If paid blueprint purchased, create subscription record
  const subscriber = await sql`
    SELECT paid_blueprint_purchased
    FROM blueprint_subscribers
    WHERE email = ${email}
    AND paid_blueprint_purchased = TRUE
    LIMIT 1
  `
  
  if (subscriber.length > 0) {
    // Create subscription record for entitlement
    await sql`
      INSERT INTO subscriptions (user_id, product_type, status, created_at)
      VALUES (${userId}, 'paid_blueprint', 'active', NOW())
      ON CONFLICT DO NOTHING  -- Prevent duplicates
    `
  }
}
```

---

## 4️⃣ MINIMAL APPROACH RECOMMENDATIONS

### Minimal Changes Required

**1. Add `user_id` to `blueprint_subscribers` (Safe, Backward Compatible)**
```sql
ALTER TABLE blueprint_subscribers
ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_blueprint_subscribers_user_id ON blueprint_subscribers(user_id);
```

**2. Create Entitlement Check Function (New, No Breaking Changes)**
```typescript
// lib/subscription.ts
export async function hasPaidBlueprintAccess(userId: string): Promise<boolean> {
  // Check subscriptions table first (authenticated users)
  const subscription = await sql`
    SELECT product_type FROM subscriptions
    WHERE user_id = ${userId}
    AND product_type = 'paid_blueprint'
    AND status = 'active'
    LIMIT 1
  `
  
  if (subscription.length > 0) return true
  
  // Fallback: Check blueprint_subscribers (guest users or not-yet-linked)
  const user = await getUserByAuthId(userId)
  if (!user?.email) return false
  
  const subscriber = await sql`
    SELECT paid_blueprint_purchased
    FROM blueprint_subscribers
    WHERE email = ${user.email}
    AND paid_blueprint_purchased = TRUE
    LIMIT 1
  `
  
  return subscriber.length > 0
}
```

**3. Add Blueprint Tab (Content-Level Gating, Consistent with Academy)**
```typescript
// components/sselfie/sselfie-app.tsx
const validTabs = [
  "maya",
  "gallery",
  "feed-planner",
  "blueprint",  // NEW
  "academy",
  "account",
]

// In render:
{activeTab === "blueprint" && <BlueprintScreen userId={userId} />}
```

**4. Blueprint Component Access Check (Same Pattern as Academy)**
```typescript
// components/sselfie/blueprint-screen.tsx
export default function BlueprintScreen({ userId }: { userId: string }) {
  const [hasAccess, setHasAccess] = useState(false)
  
  useEffect(() => {
    checkAccess()
  }, [])
  
  const checkAccess = async () => {
    const access = await hasPaidBlueprintAccess(userId)
    setHasAccess(access)
  }
  
  if (!hasAccess) {
    return <UpgradePrompt product="paid_blueprint" />
  }
  
  return <BlueprintContent />
}
```

### What NOT to Change

**Preserve Guest Flow:**
- ✅ Keep `/blueprint` route public (guest access)
- ✅ Keep `/blueprint/paid?access=TOKEN` route (token-based access)
- ✅ Keep `blueprint_subscribers` table structure (email-based)
- ✅ Keep email capture flow unchanged
- ✅ Keep checkout flow unchanged (guest checkout supported)

**No Breaking Changes:**
- ❌ Don't require authentication for `/blueprint` route
- ❌ Don't require `user_id` in `blueprint_subscribers` (nullable is fine)
- ❌ Don't change token-based access for guest users
- ❌ Don't change existing API endpoints (backward compatible)

---

## 5️⃣ PHASED PLAN (Preserves Guest Token Access)

### Phase 1: Foundation (Week 1) - No Breaking Changes

**Goal:** Add infrastructure without changing guest flow

1. **Add `user_id` column to `blueprint_subscribers`**
   ```sql
   ALTER TABLE blueprint_subscribers
   ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
   
   CREATE INDEX idx_blueprint_subscribers_user_id ON blueprint_subscribers(user_id);
   ```
   - **Risk:** Low (nullable column, no breaking changes)
   - **Guest Impact:** None (guest records will have `user_id = NULL`)

2. **Create `hasPaidBlueprintAccess()` function**
   - File: `lib/subscription.ts`
   - Checks both `subscriptions` and `blueprint_subscribers` tables
   - **Risk:** Low (new function, no existing code depends on it)

3. **Link existing purchases (optional migration)**
   ```sql
   -- Link by email (one-time migration)
   UPDATE blueprint_subscribers bs
   SET user_id = u.id
   FROM users u
   WHERE u.email = bs.email
   AND bs.paid_blueprint_purchased = TRUE
   AND bs.user_id IS NULL;
   ```
   - **Risk:** Low (idempotent, can run multiple times)
   - **Guest Impact:** None (only links authenticated users)

### Phase 2: Subscription Records (Week 2) - Authenticated Users Only

**Goal:** Create subscription records for authenticated users (preserve guest flow)

1. **Link on Sign-Up/Login**
   - Update `lib/auth-helper.ts` or user creation flow
   - When user signs up/logs in, check if email exists in `blueprint_subscribers`
   - If `paid_blueprint_purchased = TRUE`, create `subscriptions` record
   - Link `user_id` in `blueprint_subscribers` table
   - **Risk:** Low (only affects authenticated users, guest flow unchanged)

2. **Link on Purchase (Guest → User)**
   - After guest checkout completes, prompt: "Create account to save your purchase?"
   - If user creates account, link `user_id` and create `subscriptions` record
   - **Risk:** Low (opt-in, doesn't break guest flow)

### Phase 3: Studio Integration (Week 3) - Add Blueprint Tab

**Goal:** Add Blueprint tab to Studio (gated, doesn't affect guest flow)

1. **Add Blueprint Tab to Navigation**
   - File: `components/sselfie/sselfie-app.tsx`
   - Add "blueprint" to `validTabs` array
   - Add conditional rendering: `{activeTab === "blueprint" && <BlueprintScreen />}`
   - **Risk:** Low (new tab, existing tabs unchanged)

2. **Create Blueprint Screen Component**
   - File: `components/sselfie/blueprint-screen.tsx` (NEW)
   - Uses `hasPaidBlueprintAccess()` to gate access
   - Shows upgrade prompt if no access
   - **Risk:** Low (new component, no existing code depends on it)

3. **Migrate Blueprint Features to Studio Tab**
   - Reuse existing `/api/blueprint/*` endpoints
   - Reuse existing components (`BlueprintConceptCard`, etc.)
   - **Risk:** Medium (requires careful component extraction)

### Phase 4: Dual Access (Week 4) - Keep Both Flows Active

**Goal:** Support both guest token access AND Studio tab access (parallel running)

1. **Update Access Check Logic**
   - `hasPaidBlueprintAccess()` checks:
     1. `subscriptions` table (authenticated Studio users)
     2. `blueprint_subscribers` table (guest users via email)
   - **Risk:** Low (both flows continue working)

2. **Update Blueprint Routes**
   - `/blueprint/paid?access=TOKEN` - Continue working (guest flow)
   - `/studio#blueprint` - New Studio tab access (authenticated flow)
   - **Risk:** Low (both routes supported)

### Phase 5: Migration & Cleanup (Week 5) - Optional

**Goal:** Encourage Studio sign-up, but keep guest flow as fallback

1. **Add "Join Studio" CTA to guest blueprint results**
   - Show upgrade prompt: "Get full Studio access + save your purchase"
   - Link `user_id` when user signs up
   - **Risk:** Low (opt-in, guest flow preserved)

2. **Monitor & Optimize**
   - Track conversion: guest → Studio sign-up
   - Track usage: Studio tab vs guest routes
   - **Risk:** Low (analytics only)

---

## 6️⃣ RISK ASSESSMENT

### Low Risk Changes ✅
- Adding `user_id` column (nullable, backward compatible)
- Creating `hasPaidBlueprintAccess()` function (new, no dependencies)
- Adding Blueprint tab to Studio (new, doesn't affect existing tabs)
- Linking on sign-up/login (only affects authenticated users)

### Medium Risk Changes ⚠️
- Migrating blueprint features to Studio tab (requires component extraction)
- Updating access check logic (both flows must continue working)

### High Risk Changes ❌
- Requiring authentication for `/blueprint` route (BREAKS guest flow)
- Removing token-based access (BREAKS guest flow)
- Changing `blueprint_subscribers` table structure (BREAKS guest flow)

**Recommendation:** Start with Phase 1-2 (low risk), then Phase 3-4 (medium risk), skip Phase 5 unless needed.

---

## 7️⃣ FILES TO MODIFY (When Implementing)

### Database Migration
- `migrations/add-user-id-to-blueprint-subscribers.sql` (NEW)

### Library Functions
- `lib/subscription.ts` - Add `hasPaidBlueprintAccess()`
- `lib/auth-helper.ts` - Add linking logic on sign-up/login

### Components
- `components/sselfie/sselfie-app.tsx` - Add Blueprint tab
- `components/sselfie/blueprint-screen.tsx` (NEW) - Blueprint tab content
- `components/sselfie/access.ts` - Update access state (if needed)

### API Routes (Optional - Reuse Existing)
- `/api/blueprint/*` - Continue using existing endpoints
- No changes needed (already work for both guest and authenticated users)

---

## 8️⃣ SUCCESS CRITERIA

### Guest Flow Preserved ✅
- Guest users can still access `/blueprint` without authentication
- Guest users can still purchase paid blueprint via `/checkout/blueprint`
- Guest users can still access `/blueprint/paid?access=TOKEN`
- Token-based access continues working

### Authenticated Users Enhanced ✅
- Authenticated users can access Blueprint via Studio tab (`/studio#blueprint`)
- Authenticated users' purchases are linked to their account
- Entitlement check works for both guest and authenticated users
- No duplicate purchases needed (purchase once, access via both flows)

### Minimal Changes ✅
- Guest flow unchanged (no breaking changes)
- Existing routes continue working
- New functionality added, not replacing old functionality
- Backward compatible throughout

---

## ✅ RECOMMENDED APPROACH

**Use Hybrid Model (Option C):**
1. ✅ Keep guest checkout + token access (no changes)
2. ✅ Add `user_id` to `blueprint_subscribers` (nullable, backward compatible)
3. ✅ Create subscription records for authenticated users (when they sign up)
4. ✅ Access check: Check both `subscriptions` (authenticated) and `blueprint_subscribers` (guest)
5. ✅ Add Blueprint tab to Studio (content-level gating, same pattern as Academy)

**Implementation Order:**
1. Phase 1: Database migration + entitlement check function (Week 1)
2. Phase 2: Linking on sign-up/login (Week 2)
3. Phase 3: Add Blueprint tab to Studio (Week 3)
4. Phase 4: Test both flows in parallel (Week 4)
5. Phase 5: Optional optimization (Week 5)

**Key Principle:** **Preserve guest flow, enhance authenticated flow** - No breaking changes.

---

**Status:** Ready for Implementation (When Approved)  
**Next Steps:** Review this audit, approve approach, begin Phase 1 implementation
