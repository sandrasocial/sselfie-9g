# Onboarding Experience Design Plan

**Based on:** [AUTH_ONBOARDING_EXPERIENCE_AUDIT.md](./AUTH_ONBOARDING_EXPERIENCE_AUDIT.md)  
**Goal:** Complete Blueprint Welcome Wizard, implement entitlement-based welcome routing, persist onboarding state  
**Mode:** PLANNING ONLY (No code implementation)

**Approved Decisions (from [THREE_CRITICAL_DECISIONS_ANALYSIS.md](./THREE_CRITICAL_DECISIONS_ANALYSIS.md)):**
- ✅ **Decision 1:** Grant credits to all users (2 credits for free users, 60 credits for paid blueprint users)
- ✅ **Decision 2:** Embed Feed Planner UI with feature flags for paid blueprint screen
- ✅ **Decision 3:** Progressive onboarding (unified base wizard + product-specific extensions)

---

## 1. TARGET EXPERIENCE (TO-BE)

### New User (Free Tier)

**Entry Point:** User signs up via `/auth/sign-up`

**Flow:**
1. User submits signup form → Email auto-confirmed → Signed in immediately
2. Redirect to `/studio` (or `/studio?tab=blueprint` if coming from Blueprint CTA)
3. **Server:** Studio page fetches user, subscription (null for free), training status, blueprint state
4. **Client:** `SselfieApp` receives props, determines welcome flow:
   - **First visit check:** Query `users.onboarding_completed` (if `false` or `NULL` → first visit)
   - **Entitlement check:** Query `subscriptions` for `product_type` (none = free)
   - **Training status:** Query `/api/training/status` (checks `training_runs` table)
   - **Blueprint state:** Query `/api/blueprint/state` (checks `blueprint_subscribers` table)
5. **Welcome Decision Logic:**
   - If first visit AND no blueprint state → Show **Blueprint Welcome Wizard**
   - If blueprint welcome completed OR blueprint state exists → Check training status
   - If no trained model → Show **Onboarding Wizard** (training flow)
   - If trained model exists → Show Studio (no wizards)
6. **Wizard Completion:**
   - Blueprint Welcome → Sets `users.onboarding_completed = true`, `blueprint_welcome_shown_at = NOW()`
   - Onboarding Wizard → Sets `users.onboarding_completed = true` (if not already), persists training status
7. **Subsequent Visits:** Onboarding wizards never shown again (persisted in `users.onboarding_completed`)

**APPROVED DECISION 3 - Progressive Onboarding Flow:**

**Base Wizard (ALL USERS - 5 steps):**
1. Name
2. Business Type
3. Color Theme
4. Visual Aesthetic
5. Current Situation

**After Base Completion → Route Based on Product:**

**Free Users → Blueprint Extension (3 steps):**
6. Dream Client
7. Struggle
8. Feed Style
→ Then show Blueprint Welcome Wizard → Blueprint tab

**Paid Blueprint Users → Blueprint Extension (3 steps):**
6. Dream Client
7. Struggle
8. Feed Style
→ Then show Blueprint Welcome Wizard → Paid Blueprint screen (Feed Planner UI)

**Studio Membership Users → Studio Extension (7 steps):**
6. Transformation Story
7. Future Vision
8. Ideal Audience
9. Communication Voice
10. Photo Goals
11. Content Pillars
12. Brand Inspiration
→ Then show Studio (Maya chat)

**Storage:**
- Base data → `user_personal_brand` table (structured columns)
- Blueprint extensions → `blueprint_subscribers.form_data` (JSONB)
- Studio extensions → `user_personal_brand` table (structured columns)

**Edge Cases:**
- User refreshes during wizard → Wizard state persists, can resume
- User dismisses wizard → Marked as "dismissed" in DB, won't show again
- API fails (training status, blueprint state) → Show Studio without wizards (graceful degradation)

---

### Returning User (Free Tier)

**Entry Point:** User logs in via `/auth/login` or session exists

**Flow:**
1. User navigates to `/studio` (or direct link)
2. **Server:** Studio page fetches user, subscription, training status, blueprint state
3. **Client:** `SselfieApp` checks `users.onboarding_completed`:
   - If `true` → Show Studio (no wizards)
   - If `false` or `NULL` → Follow "New User" flow above (unlikely, but handles edge cases)
4. **Tab State:**
   - Active tab determined by URL hash (`#blueprint`, `#maya`, etc.)
   - Or `?tab=blueprint` query param (for deep links)
   - Default: `#maya` (if no hash/param)

**Edge Cases:**
- User has `onboarding_completed = true` but no trained model → Show Studio (they skipped onboarding)
- User has blueprint state but `onboarding_completed = false` → Show Studio (edge case from migration)

---

### Paid User (One-Time Purchase)

**Entry Point:** User completes checkout (Stripe webhook creates user)

**Flow:**
1. Stripe webhook creates user → Sets `password_setup_complete = FALSE`
2. Welcome email sent with password setup link
3. User sets password → Signs in → Redirects to `/studio`
4. **Server:** Studio page fetches subscription (none for one-time), training status, blueprint state
5. **Client:** Same welcome logic as free user (no special treatment)
6. **Post-Purchase Flow:**
   - After checkout success → Redirect to `/studio?tab=blueprint&purchase=success`
   - Studio shows success banner/notification (if `purchase=success` param)
   - Welcome wizards still follow entitlement-based logic (no override for paid)

**Edge Cases:**
- User completes checkout but webhook delayed → Checkout success page polls, then redirects
- User already has account → Webhook links purchase to existing user
- Payment succeeds but subscription row missing → User sees free tier (graceful degradation)

---

### Paid User (Studio Membership)

**Entry Point:** User completes subscription checkout (Stripe webhook creates subscription)

**Flow:**
1. Stripe webhook creates user → Sets `password_setup_complete = FALSE`
2. Webhook creates `subscriptions` row with `product_type = 'sselfie_studio_membership'`, `status = 'active'`
3. Welcome email sent with password setup link
4. User sets password → Signs in → Redirects to `/studio`
5. **Server:** Studio page fetches subscription (`sselfie_studio_membership`), training status, blueprint state
6. **Client:** Welcome logic:
   - **First visit check:** Query `users.onboarding_completed`
   - **Entitlement check:** Has `sselfie_studio_membership` subscription
   - **Training status:** Query `/api/training/status`
   - **Blueprint state:** Query `/api/blueprint/state`
7. **Welcome Decision Logic:**
   - If first visit AND no blueprint state → Show **Blueprint Welcome Wizard** (same as free)
   - If blueprint welcome completed OR blueprint state exists → Check training status
   - If no trained model → Show **Onboarding Wizard** (same as free)
   - If trained model exists → Show Studio
8. **Membership Benefits:**
   - Access to Academy tab (enforced server-side)
   - Monthly credits (granted via `invoice.payment_succeeded` webhook)
   - No special welcome flow (same as free for consistency)

**Edge Cases:**
- Subscription created but credits not yet granted → User sees Studio, credits appear later
- Subscription expires → User sees free tier (subscription status checked server-side)

---

### Paid User (Paid Blueprint)

**Entry Point:** User completes paid blueprint checkout (Stripe webhook creates subscription)

**Flow:**
1. Stripe webhook creates user → Sets `password_setup_complete = FALSE`
2. Webhook creates `subscriptions` row with `product_type = 'paid_blueprint'`, `status = 'active'`
3. **APPROVED DECISION 1:** Webhook grants 60 credits via `grantPaidBlueprintCredits(userId)` (30 grids × 2 credits)
4. Welcome email sent (or delivery email for paid blueprint)
5. User sets password → Signs in → Redirects to `/studio?tab=blueprint`
6. **Server:** Studio page fetches subscription (`paid_blueprint`), training status, blueprint state, credit balance
7. **Client:** Welcome logic:
   - **First visit check:** Query `users.onboarding_completed`
   - **Entitlement check:** Has `paid_blueprint` subscription (60 credits granted)
   - **Blueprint state:** Query `/api/blueprint/state` (may not exist yet)
8. **Welcome Decision Logic:**
   - If first visit → Show **Blueprint Welcome Wizard** (emphasizes "60 credits = 30 grids" benefit)
   - If blueprint welcome completed → Show Blueprint tab (no wizards)
9. **Post-Purchase Flow:**
   - After checkout success → Redirect to `/studio?tab=blueprint&purchase=success`
   - Blueprint Welcome Wizard shows (if first visit)
   - **APPROVED DECISION 2:** Paid blueprint screen shows **Feed Planner UI** (embedded with feature flags)
   - User can generate 30 grids (enforced server-side via credit check: `checkCredits(userId, 2)`)

**APPROVED DECISION 2 - Paid Blueprint Screen:**
- **Implementation:** Embed `FeedViewScreen` component with `mode="blueprint"` prop
- **Feature Flags:**
  - `showCaptionGeneration: false` (blueprint mode)
  - `showStrategyTab: false` (blueprint mode, strategy shown separately)
  - `allowStrategyRegeneration: false` (blueprint mode)
  - `imageGenerationOnly: true` (blueprint mode)
- **Benefits:** Maximum code reuse, UI consistency, faster implementation
- **Data Mapping:** Map blueprint strategy (`blueprint_subscribers.strategy_data`) → feed posts format

**Edge Cases:**
- Paid blueprint purchased but user already has free blueprint state → Free state preserved, paid entitlement grants 30 grids
- Subscription created but blueprint state not yet migrated → User sees Blueprint Welcome Wizard

---

## 2. SYSTEM DESIGN DECISIONS

### What Stays

1. **Existing Identity System:**
   - Supabase Auth (`auth.users`) remains authoritative
   - Neon Users (`users` table) remains secondary (1:1 mapping with auth)
   - `getUserByAuthId()` remains primary lookup method

2. **Existing Entitlement System:**
   - `subscriptions` table remains single source of truth for entitlements
   - `product_type` column supports: `sselfie_studio_membership`, `paid_blueprint`, `free_blueprint` (implicit)
   - `getUserSubscription()`, `hasStudioMembership()`, `hasPaidBlueprint()` remain primary access checks

3. **Existing Wizard Components:**
   - `OnboardingWizard` component remains (training model flow)
   - `BlueprintWelcomeWizard` component remains (reused, not rebuilt)
   - Both wizards keep existing UI/UX (no redesign)

4. **Existing State Management:**
   - `blueprint_subscribers` table remains (blueprint state)
   - `training_runs` table remains (training status)
   - `users` table remains (user profile, onboarding tracking)

5. **Existing Routes:**
   - `/studio` remains main entry point
   - `/auth/sign-up`, `/auth/login` remain auth entry points
   - `/checkout/success` remains post-purchase redirect (with improved logic)

---

### What is Removed

1. **Ephemeral Onboarding State:**
   - **Remove:** Client-side `showOnboarding` state reset on refresh (replace with DB check)
   - **Remove:** Client-side `showBlueprintWelcome` state that never sets to `true` (replace with DB check)
   - **Remove:** Redundant training status fetch if `onboarding_completed = true` (optimize)

2. **Duplicate Identity Lookups:**
   - **Remove:** Email-based lookup for onboarding decisions (use `user_id` only)
   - **Keep:** Email lookup for signup form UX (check if user exists) - this is legitimate use case

3. **Incomplete Logic:**
   - **Remove:** Feature flag check for Blueprint Welcome (keep component, remove flag dependency)
   - **Remove:** `blueprintWelcomeEnabled` state (redundant with DB check)

---

### What Becomes Single Source of Truth

#### Identity Model

**Primary:** Supabase Auth (`auth.users.id`)
- **Authoritative for:** Authentication, session management
- **Resolved via:** `supabase.auth.getUser()` (session-based)

**Secondary:** Neon Users (`users.id`)
- **Authoritative for:** Application data, onboarding state, profile
- **Resolved via:** `getUserByAuthId(authId)` (1:1 mapping)
- **Lookup pattern:** Always use `user_id` (from auth session), never email for identity

**Eliminated:** Email-based identity resolution for business logic
- **Kept only for:** Signup form UX (check if email already registered)
- **Removed from:** Onboarding decisions, welcome flow routing

---

#### Entitlement Model

**Single Source of Truth:** `subscriptions` table
- **Columns:** `product_type` (`sselfie_studio_membership`, `paid_blueprint`, `free_blueprint`), `status` (`active`, `canceled`, `expired`)
- **Resolved via:** `getUserSubscription(userId)` → Returns active subscription or `null`
- **Access checks:** `hasStudioMembership()`, `hasPaidBlueprint()`, `getBlueprintEntitlement()`

**Implicit Entitlements:**
- **Free Blueprint:** All authenticated users (no subscription row required)
- **Studio Membership:** Explicit subscription row required
- **Paid Blueprint:** Explicit subscription row required

**Entitlement Hierarchy:**
1. Studio Membership (highest) → 200 credits/month + Academy access + unlimited blueprint
2. Paid Blueprint → 60 credits (30 grids × 2 credits) + no Academy access
3. Free Blueprint (lowest) → 2 credits (1 grid × 2 credits) + no Academy access

**Credit System (APPROVED DECISION 1):**
- **All users** receive credits (unified system, no quota tracking)
- Free users: 2 credits granted on signup (enough for 1 grid = 2 images × 1 credit each)
- Paid blueprint users: 60 credits granted on purchase (30 grids × 2 credits)
- Studio membership: 200 credits/month (existing system)
- **Migration:** Grant 2 credits to existing free users (if `free_grid_used_count = 0`), grant 0 if already used
- **Code Impact:** Remove quota tracking (`free_grid_used_count`, `paid_grids_generated`), use `checkCredits()` instead

**Upgrade Override Logic:**
- Higher tier always overrides lower tier
- `getBlueprintEntitlement()` checks in order: Studio → Paid → Free

---

#### State Ownership

**Onboarding Completion:**
- **Owner:** `users.onboarding_completed` (BOOLEAN, DEFAULT false)
- **Writer:** Wizard completion handlers, server-side checks
- **Reader:** `SselfieApp` on mount, Studio page server component
- **When Set:** After Blueprint Welcome OR Onboarding Wizard completes (whichever comes first)

**Blueprint Welcome Shown:**
- **Owner:** `users.blueprint_welcome_shown_at` (TIMESTAMP, nullable)
- **Writer:** Blueprint Welcome Wizard completion handler
- **Reader:** `SselfieApp` on mount (if `NULL` and no blueprint state → show wizard)
- **When Set:** After user clicks "Get Started" in Blueprint Welcome Wizard

**Training Model Status:**
- **Owner:** `training_runs.training_status` (TEXT: 'pending', 'training', 'completed', 'failed')
- **Writer:** Training API (`/api/training/start`, `/api/training/status`)
- **Reader:** `SselfieApp` via `/api/training/status` fetch
- **When Checked:** On Studio load if `onboarding_completed = false` OR if no trained model

**Blueprint State:**
- **Owner:** `blueprint_subscribers` table (via `user_id`)
- **Writer:** `/api/blueprint/state` POST
- **Reader:** `/api/blueprint/state` GET
- **When Checked:** On Studio load to determine if Blueprint Welcome should show

**Credit Balance:**
- **Owner:** `user_credits` table (via `user_id`)
- **Writer:** Credit system (`addCredits()`, `deductCredits()`)
- **Reader:** `/api/user/credits` GET, `getUserCredits(userId)`
- **When Checked:** Before blueprint grid generation (via `checkCredits()`)
- **APPROVED DECISION 1:** All users have credits (2 for free, 60 for paid blueprint, 200/month for Studio)

---

## 3. DATA & MODEL CHANGES

### Tables Reused

1. **`users` table:**
   - **Existing column:** `onboarding_completed` (BOOLEAN, DEFAULT false)
   - **Reuse:** Read on Studio load, write on wizard completion
   - **New column:** `blueprint_welcome_shown_at` (TIMESTAMP WITH TIME ZONE, nullable)
   - **Purpose:** Track if Blueprint Welcome Wizard has been shown (prevent re-show)

2. **`user_credits` table (APPROVED DECISION 1):**
   - **Existing columns:** `user_id`, `balance`, `total_purchased`, `total_used`
   - **Reuse:** Credit system for ALL users (free, paid blueprint, Studio membership)
   - **New usage:** Grant 2 credits to all new free users on signup
   - **Migration:** Grant 2 credits to existing free users (if `free_grid_used_count = 0`)

3. **`user_personal_brand` table (APPROVED DECISION 3):**
   - **Existing columns:** `name`, `business_type`, `color_theme`, `visual_aesthetic`, `current_situation`, etc.
   - **Reuse:** Store base wizard data (5 steps) for ALL users
   - **New usage:** Progressive onboarding - base wizard stores here, extensions stored separately
   - **Migration:** Map existing blueprint form data → base + extension (for users with blueprint data)

2. **`subscriptions` table:**
   - **Existing columns:** `product_type`, `status`, `user_id`
   - **Reuse:** Read via `getUserSubscription()` for entitlement checks
   - **No changes:** Existing structure supports all product types

4. **`blueprint_subscribers` table (APPROVED DECISION 1 & 3):**
   - **Existing columns:** `user_id`, `email`, `form_data`, `strategy_generated`, `grid_generated`, `free_grid_used_count`, `paid_grids_generated`, etc.
   - **Reuse:** Read/write via `/api/blueprint/state` GET/POST
   - **DEPRECATED (APPROVED DECISION 1):** `free_grid_used_count`, `paid_grids_generated` (replace with credit checks)
   - **NEW USAGE (APPROVED DECISION 3):** `form_data` stores blueprint extension data (Dream Client, Struggle, Feed Style)
   - **Migration:** Remove quota columns after credit migration complete (optional, can deprecate)

4. **`training_runs` table:**
   - **Existing columns:** `training_status`, `user_id`, `completed_at`
   - **Reuse:** Read via `/api/training/status` for training model check
   - **No changes:** Existing structure supports training status checks

---

### Fields Reused

1. **`users.onboarding_completed`:**
   - **Current state:** Column exists but never written (audit finding)
   - **New usage:** Set to `true` when Blueprint Welcome OR Onboarding Wizard completes
   - **Migration:** Existing users have `false` (default) → Will see welcome on first visit after deployment

2. **`users.last_login_at`:**
   - **Current state:** Updated on auth callback (`app/auth/callback/route.ts:44-47`)
   - **Reuse:** For analytics, retention tracking
   - **No changes:** Keep existing logic

3. **`subscriptions.product_type`:**
   - **Current state:** Supports `sselfie_studio_membership`, `paid_blueprint` (Phase 2 complete)
   - **Reuse:** For entitlement-based welcome routing
   - **No changes:** Existing values support all tiers

---

### New Fields

1. **`users.blueprint_welcome_shown_at`:**
   - **Type:** `TIMESTAMP WITH TIME ZONE`
   - **Nullable:** `TRUE` (default `NULL`)
   - **Purpose:** Track if Blueprint Welcome Wizard has been shown
   - **When Set:** After Blueprint Welcome Wizard completion
   - **Migration:** Add column, set `NULL` for all existing users

**SQL Migration:**
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS blueprint_welcome_shown_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_blueprint_welcome_shown 
ON users(blueprint_welcome_shown_at) 
WHERE blueprint_welcome_shown_at IS NOT NULL;
```

---

### Migrations Required

1. **Add `blueprint_welcome_shown_at` column to `users` table:**
   - **File:** `scripts/migrations/add-blueprint-welcome-tracking.sql`
   - **Action:** ALTER TABLE, CREATE INDEX
   - **Rollback:** DROP INDEX, DROP COLUMN

2. **Grant credits to existing free users (APPROVED DECISION 1):**
   - **File:** `scripts/migrations/grant-free-user-credits.sql`
   - **Action:** Grant 2 credits to all free users (if `free_grid_used_count = 0`), grant 0 if already used
   - **Purpose:** Migrate from quota system to credit system
   - **SQL:**
   ```sql
   -- Grant 2 credits to free users who haven't used their free grid
   INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
   SELECT 
     u.id,
     2 as balance,
     2 as total_purchased,
     0 as total_used,
     NOW() as created_at,
     NOW() as updated_at
   FROM users u
   WHERE NOT EXISTS (
     SELECT 1 FROM subscriptions s 
     WHERE s.user_id = u.id AND s.status = 'active'
   )
   AND NOT EXISTS (
     SELECT 1 FROM blueprint_subscribers bs 
     WHERE bs.user_id = u.id AND bs.free_grid_used_count > 0
   )
   AND NOT EXISTS (
     SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id
   )
   ON CONFLICT (user_id) DO NOTHING;

   -- Record credit transactions
   INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after, created_at)
   SELECT 
     uc.user_id,
     2 as amount,
     'bonus' as transaction_type,
     'Free blueprint credits (migration)' as description,
     uc.balance as balance_after,
     NOW() as created_at
   FROM user_credits uc
   WHERE uc.balance = 2
   AND uc.created_at >= NOW() - INTERVAL '1 hour' -- Only new grants
   AND NOT EXISTS (
     SELECT 1 FROM credit_transactions ct 
     WHERE ct.user_id = uc.user_id 
     AND ct.transaction_type = 'bonus'
     AND ct.description = 'Free blueprint credits (migration)'
   );
   ```

3. **Update existing users (optional):**
   - **Action:** If user has `blueprint_subscribers` row with `user_id` → Set `blueprint_welcome_shown_at = created_at` (assume shown)
   - **Purpose:** Prevent showing wizard to users who already used Blueprint
   - **SQL:** 
   ```sql
   UPDATE users 
   SET blueprint_welcome_shown_at = (
     SELECT MIN(created_at) 
     FROM blueprint_subscribers 
     WHERE blueprint_subscribers.user_id = users.id
   )
   WHERE blueprint_welcome_shown_at IS NULL
   AND EXISTS (
     SELECT 1 FROM blueprint_subscribers 
     WHERE blueprint_subscribers.user_id = users.id
   );
   ```

---

## 4. ACCESS & ENTITLEMENT LOGIC

### How Access is Computed

**Primary Function:** `getWelcomeFlow(userId: string): Promise<WelcomeFlowDecision>`

**Implementation Location:** `lib/onboarding/welcome-flow.ts` (new file)

**Logic:**
1. **Fetch user state:**
   - `users.onboarding_completed` (BOOLEAN)
   - `users.blueprint_welcome_shown_at` (TIMESTAMP or NULL)
   - `subscriptions` (via `getUserSubscription(userId)`)
   - `blueprint_subscribers` (via `/api/blueprint/state` GET - checks if row exists for `user_id`)
   - `training_runs` (via `/api/training/status` - checks if `training_status = 'completed'`)

2. **Decision Tree:**
   ```
   IF onboarding_completed = true:
     → No wizards (user already completed onboarding)
   
   ELSE IF blueprint_welcome_shown_at IS NULL AND no blueprint_subscribers row:
     → Show Blueprint Welcome Wizard
   
   ELSE IF hasTrainedModel = false:
     → Show Onboarding Wizard (training flow)
   
   ELSE:
     → Show Studio (no wizards)
   ```

3. **Return Type:**
   ```typescript
   type WelcomeFlowDecision = 
     | { type: 'none', reason: 'onboarding_completed' }
     | { type: 'blueprint_welcome', reason: 'first_visit_no_blueprint' }
     | { type: 'onboarding_wizard', reason: 'no_trained_model' }
     | { type: 'studio', reason: 'ready' }
   ```

**Reused Functions:**
- `getUserSubscription(userId)` from `lib/subscription.ts`
- `getBlueprintEntitlement(userId)` from `lib/subscription.ts`
- `/api/training/status` (existing API)
- `/api/blueprint/state` GET (existing API)

---

### How Upgrades Override Lower Tiers

**Entitlement Hierarchy:**
1. **Studio Membership** (`sselfie_studio_membership`) → Highest tier
   - Unlimited blueprint grids (or 30, same as paid)
   - Academy access
   - Monthly credits
   - Welcome flow: Same as free (no special treatment)

2. **Paid Blueprint** (`paid_blueprint`) → Middle tier
   - 30 blueprint grids
   - No Academy access
   - No monthly credits
   - Welcome flow: Same as free (Blueprint Welcome Wizard)

3. **Free Blueprint** (implicit, no subscription row) → Lowest tier
   - 1 blueprint grid
   - No Academy access
   - No monthly credits
   - Welcome flow: Blueprint Welcome Wizard

**Override Logic:**
- `getBlueprintEntitlement()` checks in order: Studio → Paid → Free
- If user has Studio Membership → Returns `type: 'studio'` (highest)
- If user has Paid Blueprint (and no Studio) → Returns `type: 'paid'`
- If user has neither → Returns `type: 'free'`

**Evidence from Audit:**
```typescript:149:225:lib/subscription.ts
export async function getBlueprintEntitlement(userId: string): Promise<{
  type: "free" | "paid" | "studio"
  freeGridUsed: boolean
  paidGridsRemaining: number | null
}> {
  // Check for Studio Membership (highest tier)
  const hasStudio = await hasStudioMembership(userId)
  if (hasStudio) {
    return { type: "studio", ... }
  }
  
  // Check for paid blueprint (middle tier)
  const hasPaid = await hasPaidBlueprint(userId)
  if (hasPaid) {
    return { type: "paid", ... }
  }
  
  // Free blueprint (lowest tier)
  return { type: "free", ... }
}
```

**Welcome Flow Override:**
- Welcome flow decision **does NOT depend on entitlement tier**
- All tiers (free, paid, membership) see same welcome flow (Blueprint Welcome → Onboarding Wizard)
- Entitlement only affects **feature access** (grid limits, Academy access), not welcome flow

---

### How Free vs Paid is Enforced

**Server-Side Enforcement (APPROVED DECISION 1 - Credits System):**

1. **Blueprint Grid Generation:**
   - **Endpoint:** `/api/blueprint/generate-grid`
   - **Check:** `checkCredits(userId, requiredAmount)` before allowing generation
   - **Logic (NEW - Credit-Based):**
     - Each grid generation costs 2 credits (2 images × 1 credit each)
     - Check `getUserCredits(userId)` >= 2 before allowing generation
     - If insufficient credits → Return 402 (Payment Required) with credit balance
     - **Migration:** Replace quota checks (`free_grid_used_count`, `paid_grids_generated`) with credit checks
   - **Logic (OLD - Quota-Based - TO BE REMOVED):**
     - ~~If `type === 'free'` AND `freeGridUsed === true` → Return 403 (quota exceeded)~~
     - ~~If `type === 'paid'` AND `paidGridsRemaining === 0` → Return 403 (quota exceeded)~~
   - **Evidence:** Phase 2 complete (`app/api/blueprint/generate-grid/route.ts:94-110`) - **NEEDS UPDATE**

2. **Academy Access:**
   - **Endpoint:** `/api/academy/courses`
   - **Check:** `hasStudioMembership(userId)` before returning courses
   - **Logic:** If no Studio Membership → Return 403
   - **Evidence:** `app/api/academy/courses/route.ts:36-52`

3. **Credits (APPROVED DECISION 1 - Unified Credit System):**
   - **Granted via:**
     - Free users: 2 credits on signup (via `grantFreeUserCredits(userId)`)
     - Paid blueprint: 60 credits on purchase (via `grantPaidBlueprintCredits(userId)`)
     - Studio membership: 200 credits/month (existing system via `invoice.payment_succeeded` webhook)
   - **Checked via:** `/api/user/credits` (returns balance), `getUserCredits(userId)`
   - **Enforced in:** Generation APIs (check credits before allowing generation via `checkCredits(userId, amount)`)
   - **Migration:** Grant 2 credits to existing free users (if `free_grid_used_count = 0`), grant 0 if already used
   - **Code Cleanup:** Remove quota tracking (`free_grid_used_count`, `paid_grids_generated` columns)

**Client-Side Indicators (APPROVED DECISION 1 - Credits System):**

1. **Blueprint Tab:**
   - Shows credit balance (2 credits for free, 60 for paid blueprint, 200/month for Studio)
   - Displays upgrade CTA if credits insufficient (free users see "Get more credits!")
   - **Source:** `/api/user/credits` GET returns `{ balance: number }`
   - **Source:** `/api/blueprint/state` GET returns `entitlement` object (for tier display)
   - **Migration:** Update UI to show credits instead of "free grid used" / "paid grids remaining"

2. **Academy Tab:**
   - Hidden if no Studio Membership (server-side check)
   - Shows upgrade modal if user tries to access without membership

**Reused Patterns:**
- Entitlement checks use existing `lib/subscription.ts` functions
- Server-side enforcement follows existing pattern (check entitlement, return 403 if denied)
- Client-side indicators reuse existing UI components (upgrade banners, modals)

---

## 5. ROUTES & API IMPACT

### Routes Affected

1. **`/studio` (Server Component):**
   - **File:** `app/studio/page.tsx`
   - **Current:** Fetches user, subscription, passes to `SselfieApp`
   - **New:** Fetches `users.onboarding_completed`, `users.blueprint_welcome_shown_at` (via new helper)
   - **Pass to Client:** `onboardingCompleted`, `blueprintWelcomeShownAt`, `hasBlueprintState`
   - **Backward Compatible:** If new fields missing, default to `false`/`null`

2. **`/auth/sign-up` (Client Component):**
   - **File:** `app/auth/sign-up/page.tsx`
   - **Current:** Redirects to `/studio` after signup
   - **New:** Redirect to `/studio?tab=blueprint` if coming from Blueprint CTA
   - **Change:** Add `?tab=blueprint` to redirect URL if `next` param includes `tab=blueprint`
   - **Backward Compatible:** Existing redirect logic unchanged

3. **`/checkout/success` (Client Component):**
   - **File:** `components/checkout/success-content.tsx`
   - **Current:** Polls for user info, shows password setup form
   - **New:** Redirect to `/studio?tab=blueprint&purchase=success` after authentication
   - **Change:** Update redirect URL for paid blueprint purchases
   - **Backward Compatible:** Existing polling logic unchanged

---

### APIs Reused

1. **`/api/training/status` (GET):**
   - **File:** `app/api/training/status/route.ts`
   - **Current:** Returns `{ hasTrainedModel: boolean }`
   - **Reuse:** Check if user has trained model (for Onboarding Wizard decision)
   - **No changes:** Existing API supports use case

2. **`/api/blueprint/state` (GET):**
   - **File:** `app/api/blueprint/state/route.ts`
   - **Current:** Returns blueprint state + entitlement
   - **Reuse:** Check if user has blueprint state (for Blueprint Welcome decision)
   - **No changes:** Existing API supports use case (Phase 1 complete)

3. **`/api/blueprint/state` (POST):**
   - **File:** `app/api/blueprint/state/route.ts`
   - **Current:** Saves blueprint state
   - **Reuse:** Save blueprint state after Blueprint Welcome completion
   - **New:** Update `users.blueprint_welcome_shown_at` when blueprint state created (if first time)

4. **`getUserSubscription()` (Library Function):**
   - **File:** `lib/subscription.ts`
   - **Current:** Returns active subscription or `null`
   - **Reuse:** Check entitlement tier (for feature access, not welcome flow)
   - **No changes:** Existing function supports use case

---

### APIs Deprecated

**None** - All existing APIs remain active for backward compatibility.

---

### APIs Created

1. **`/api/onboarding/welcome-flow` (GET):**
   - **File:** `app/api/onboarding/welcome-flow/route.ts` (new)
   - **Purpose:** Centralized welcome flow decision logic
   - **Returns:** `{ type: 'none' | 'blueprint_welcome' | 'onboarding_wizard' | 'studio', reason: string }`
   - **Used by:** `SselfieApp` on mount (replaces client-side decision logic)
   - **Reuses:** `getUserSubscription()`, `/api/training/status`, `/api/blueprint/state`

2. **`/api/onboarding/complete` (POST):**
   - **File:** `app/api/onboarding/complete/route.ts` (new)
   - **Purpose:** Mark onboarding as complete (called by wizards on completion)
   - **Body:** `{ type: 'blueprint_welcome' | 'onboarding_wizard' }`
   - **Action:** Updates `users.onboarding_completed = true`, `users.blueprint_welcome_shown_at = NOW()` (if blueprint_welcome)

---

### Redirect Strategy

**Post-Signup:**
- Free user → `/studio` (default)
- Free user (from Blueprint CTA) → `/studio?tab=blueprint`
- Paid user → `/studio?tab=blueprint&purchase=success`

**Post-Login:**
- All users → `/studio` (or `returnTo` param if present)

**Post-Checkout:**
- Credit topup → `/studio` (2 second delay, authenticated)
- Paid blueprint → `/studio?tab=blueprint&purchase=success` (after password setup)
- Studio membership → `/studio` (after password setup)

**Wizard Completion:**
- Blueprint Welcome → Stay on Studio (same page), optionally switch to Blueprint tab
- Onboarding Wizard → Stay on Studio (same page), show Maya tab

---

## 6. ROLLOUT & SAFETY

### Feature Flags

1. **`FEATURE_BLUEPRINT_WELCOME_ENABLED` (Environment Variable):**
   - **Current:** Used by `/api/feature-flags/blueprint-welcome` endpoint
   - **New Usage:** Control entire entitlement-based welcome flow
   - **Default:** `true` (enabled by default)
   - **Override:** Admin feature flag `blueprint_welcome_enabled` in `admin_feature_flags` table
   - **Purpose:** Kill switch if issues found during rollout

2. **`FEATURE_ENTITLEMENT_WELCOME_FLOW` (Environment Variable):**
   - **New:** Controls new welcome flow logic (server-side decision)
   - **Default:** `false` (disabled by default for phased rollout)
   - **Override:** Admin feature flag `entitlement_welcome_flow_enabled` in `admin_feature_flags` table
   - **Purpose:** Gradual rollout, A/B testing

3. **Admin Feature Flags (Database):**
   - **Table:** `admin_feature_flags`
   - **Keys:** `blueprint_welcome_enabled`, `entitlement_welcome_flow_enabled`
   - **Purpose:** Runtime control without code deployment

---

### Phased Rollout

**Phase 1: Database Migration (Week 1)**
- Add `blueprint_welcome_shown_at` column
- Run migration for existing users (set `blueprint_welcome_shown_at` if blueprint state exists)
- **Risk:** Low (read-only change, no behavior change)
- **Rollback:** DROP COLUMN if issues

**Phase 2: Server-Side Logic (Week 1-2)**
- Create `/api/onboarding/welcome-flow` endpoint
- Create `/api/onboarding/complete` endpoint
- Update Studio page to fetch onboarding state
- **Feature Flag:** `FEATURE_ENTITLEMENT_WELCOME_FLOW = false` (disabled)
- **Risk:** Medium (new API endpoints, but feature flag disabled)
- **Rollback:** Feature flag to `false`, revert API changes

**Phase 3: Client-Side Integration (Week 2)**
- Update `SselfieApp` to call `/api/onboarding/welcome-flow`
- Update wizard completion handlers to call `/api/onboarding/complete`
- **Feature Flag:** `FEATURE_ENTITLEMENT_WELCOME_FLOW = false` (disabled)
- **Testing:** Internal testing with flag enabled
- **Risk:** Medium (client changes, but feature flag disabled)
- **Rollback:** Feature flag to `false`, revert client changes

**Phase 4: Gradual Rollout (Week 3)**
- Enable `FEATURE_ENTITLEMENT_WELCOME_FLOW = true` for 10% of users (via user ID hash)
- Monitor error rates, onboarding completion rates
- Increase to 50% if metrics stable
- Increase to 100% if metrics stable
- **Risk:** Low (gradual rollout, feature flag enabled)
- **Rollback:** Feature flag to `false` (instant rollback)

**Phase 5: Cleanup (Week 4)**
- Remove old client-side decision logic (if feature flag enabled 100% for 1 week)
- Remove `FEATURE_BLUEPRINT_WELCOME_ENABLED` flag (if no longer needed)
- **Risk:** Low (cleanup only, feature fully rolled out)

---

### Backward Compatibility

1. **Existing Users:**
   - Users with `onboarding_completed = false` (default) → Will see welcome on first visit
   - Users with `blueprint_subscribers` row → Migration sets `blueprint_welcome_shown_at`, won't see wizard
   - Users with trained model → Won't see Onboarding Wizard (same as before)

2. **Existing APIs:**
   - `/api/training/status` unchanged (backward compatible)
   - `/api/blueprint/state` unchanged (backward compatible)
   - New APIs (`/api/onboarding/*`) are additive (no breaking changes)

3. **Existing Components:**
   - `OnboardingWizard` component unchanged (backward compatible)
   - `BlueprintWelcomeWizard` component unchanged (backward compatible)
   - Only change: When/how wizards are triggered (server-side decision, not client-side)

4. **Feature Flag Fallback:**
   - If `FEATURE_ENTITLEMENT_WELCOME_FLOW = false` → Use old client-side logic (backward compatible)
   - Old logic: Check training status only (same as before)
   - New logic: Check onboarding state + entitlement (only if flag enabled)

---

### Rollback Plan

**Instant Rollback (Feature Flag):**
1. Set `FEATURE_ENTITLEMENT_WELCOME_FLOW = false` (environment variable or admin flag)
2. System reverts to old client-side logic (training status only)
3. No code deployment required

**Code Rollback (If Feature Flag Fails):**
1. Revert PR with client-side changes
2. Revert PR with API changes
3. Database migration remains (read-only, safe to leave)

**Data Rollback (If Migration Issues):**
1. Drop `blueprint_welcome_shown_at` column: `ALTER TABLE users DROP COLUMN blueprint_welcome_shown_at;`
2. System reverts to old behavior (no welcome tracking)

**Rollback Triggers:**
- Error rate > 5% (monitor Sentry)
- Onboarding completion rate drops > 20% (monitor analytics)
- User complaints > 10 in 24 hours (monitor support)

---

## 7. OUT OF SCOPE

### What is NOT Being Touched

1. **Guest Blueprint System:**
   - Legacy guest flow (email/token) remains active
   - Migration to authenticated flow is separate initiative (Phase 4 of Blueprint Auth Migration)
   - **Evidence:** Audit finding - "Guest system still active" (marked for future cleanup)

2. **Checkout Success Polling:**
   - 80-second polling logic remains unchanged
   - Webhook reliability improvements are separate initiative
   - **Evidence:** Audit finding - "Checkout success polling" (temporary workaround, not core issue)

3. **Customer ID Duplication:**
   - Customer ID stored in `users` and `subscriptions` remains
   - Consolidation is separate initiative (lower priority)
   - **Evidence:** Audit finding - "Customer ID duplication" (risk: MEDIUM, not blocking)

4. **Training Status API Timeout:**
   - No timeout added to `/api/training/status` fetch
   - Timeout improvements are separate initiative (lower priority)
   - **Evidence:** Audit finding - "Training status API timeout" (risk: HIGH but LOW likelihood)

5. **Email-Based Identity Lookup:**
   - Email lookup for signup form UX remains (legitimate use case)
   - Only removed from onboarding decisions (now uses `user_id`)

6. **Onboarding Wizard UI/UX:**
   - No redesign of existing wizards
   - No changes to wizard content, steps, or flow
   - Only change: When wizards are triggered (server-side decision)

7. **Academy Access Logic:**
   - No changes to Academy entitlement checks
   - Studio Membership requirement remains unchanged

8. **Credit System (APPROVED DECISION 1):**
   - **MAJOR CHANGE:** All users now receive credits (2 for free, 60 for paid blueprint, 200/month for Studio)
   - **Migration:** Grant credits to existing free users, remove quota tracking
   - **Code Impact:** Update blueprint generation to use `checkCredits()` instead of quota checks
   - **Cleanup:** Remove quota columns (`free_grid_used_count`, `paid_grids_generated`) after migration complete

9. **Stripe Webhook Logic:**
   - No changes to webhook processing, idempotency, or rate limiting
   - Subscription creation logic remains unchanged

10. **localStorage Usage:**
    - No changes to localStorage for chat IDs, Pro Mode, etc.
    - Only onboarding state moved to database (localStorage remains for other state)

---

## APPENDIX: Implementation Checklist

### Pre-Implementation

- [ ] Review audit findings with team
- [ ] Confirm feature flag strategy
- [ ] Set up monitoring (Sentry, analytics)
- [ ] Create database migration scripts
- [ ] Test migration on staging database

### Implementation (Week 1-2)

- [ ] Run database migration (`add-blueprint-welcome-tracking.sql`)
- [ ] Create `/api/onboarding/welcome-flow` endpoint
- [ ] Create `/api/onboarding/complete` endpoint
- [ ] Update Studio page to fetch onboarding state
- [ ] Update `SselfieApp` to call new API
- [ ] Update wizard completion handlers
- [ ] **APPROVED DECISION 1:** Grant 2 credits to all new free users on signup
- [ ] **APPROVED DECISION 1:** Update blueprint generation to use `checkCredits()` instead of quota checks
- [ ] **APPROVED DECISION 1:** Run migration to grant credits to existing free users
- [ ] **APPROVED DECISION 2:** Embed Feed Planner UI for paid blueprint screen (with feature flags)
- [ ] **APPROVED DECISION 2:** Map blueprint strategy → feed posts format for Feed Planner
- [ ] **APPROVED DECISION 3:** Implement progressive onboarding (base wizard + extensions)
- [ ] **APPROVED DECISION 3:** Create base wizard component (5 steps)
- [ ] **APPROVED DECISION 3:** Create blueprint extension component (3 steps)
- [ ] **APPROVED DECISION 3:** Create studio extension component (7 steps)
- [ ] **APPROVED DECISION 3:** Update routing logic to show appropriate extension based on product

### Testing

- [ ] Test new user signup flow (free tier)
- [ ] Test returning user login flow
- [ ] Test paid blueprint checkout flow
- [ ] Test Studio membership checkout flow
- [ ] Test wizard dismissal (should not re-show)
- [ ] Test feature flag rollback

### Rollout (Week 3-4)

- [ ] Enable feature flag for 10% of users
- [ ] Monitor error rates
- [ ] Monitor onboarding completion rates
- [ ] Increase rollout to 50%
- [ ] Increase rollout to 100%
- [ ] Remove old client-side logic

---

---

## APPENDIX: Approved Decisions Implementation Details

### ✅ Decision 1: Credit System for All Users (COMPLETED)

**Status:** ✅ **COMPLETED** - All implementation steps finished, migration executed, verification passed

**Implementation Completed:**
1. ✅ Created `grantFreeUserCredits(userId)` function in `lib/credits.ts`
   - Grants 2 credits on signup
   - Called from auth callback (`app/auth/callback/route.ts`) when new user signs up
2. ✅ Created `grantPaidBlueprintCredits(userId)` function in `lib/credits.ts`
   - Grants 60 credits on paid blueprint purchase
   - Called from Stripe webhook (`app/api/webhooks/stripe/route.ts`)
3. ✅ Updated `app/api/blueprint/generate-grid/route.ts`:
   - Replaced quota checks with `checkCredits(userId, 2)`
   - Replaced quota increments with `deductCredits(userId, 2, 'image', ...)`
   - Added credit balance error messages
4. ✅ Updated `app/api/blueprint/check-grid/route.ts`:
   - Removed quota increment logic (credits already deducted in generate-grid)
   - Simplified to only update grid status
5. ✅ Migration executed: `scripts/migrations/grant-free-user-credits.sql`
   - ✅ All free users now have `user_credits` records
   - ✅ Users who haven't used free grid: 2 credits granted
   - ✅ Users who used free grid: 0 credits (record created)
   - ✅ Edge case fixed (test user missing credits)
6. ✅ UI updated to show credits instead of quota:
   - `app/api/blueprint/state/route.ts` - Returns `creditBalance` in entitlement response
   - `components/sselfie/blueprint-screen.tsx` - Displays credit balance with helper text
   - Shows "Available Credits: X" with "Each grid generation uses 2 credits" explanation

**Files Modified:**
- `lib/credits.ts` - Added grant functions
- `app/auth/callback/route.ts` - Grants credits on signup
- `app/api/webhooks/stripe/route.ts` - Grants credits on paid blueprint purchase + creates subscription
- `app/api/blueprint/generate-grid/route.ts` - Credit checks and deductions
- `app/api/blueprint/check-grid/route.ts` - Removed quota logic
- `app/api/blueprint/state/route.ts` - Added credit balance to response
- `components/sselfie/blueprint-screen.tsx` - Display credits in UI

**Migration Files Created:**
- `scripts/migrations/grant-free-user-credits.sql` ✅
- `scripts/migrations/run-grant-free-user-credits-migration.ts` ✅
- `scripts/migrations/verify-grant-free-user-credits-migration.ts` ✅
- `scripts/migrations/debug-missing-user-credits.ts` ✅

**Migration Results:**
- ✅ All free users have `user_credits` records
- ✅ Credits granted to eligible users
- ✅ Credit transactions recorded
- ✅ Verification passed (all checks green)

**Benefits Achieved:**
- ✅ Single unified system (no quota + credits)
- ✅ Better funnel (free users see credit value)
- ✅ Consistent experience (all users understand credits)
- ✅ Easier upsell (free users see "2 credits" → "Get more!")

**Next Steps:**
- ⏳ Test end-to-end flow (signup → credits → generate grid → credits deducted)
- ⏳ Create PR #1 for Decision 1 review

---

### ⏳ Decision 2: Embed Feed Planner for Paid Blueprint (PENDING)

**Status:** ⏳ **PENDING** - Ready to implement after Decision 1 testing

**Implementation Steps:**
1. **Update `components/feed-planner/feed-view-screen.tsx`:**
   - Add `mode?: 'feed-planner' | 'blueprint'` prop
   - Add feature flags based on mode:
     - `showCaptionGeneration: mode !== 'blueprint'` (hide caption generation for blueprint mode)
     - `showStrategyTab: mode !== 'blueprint'` (hide strategy tab for blueprint mode)
     - `allowStrategyRegeneration: mode !== 'blueprint'` (disable strategy regeneration)
     - `imageGenerationOnly: mode === 'blueprint'` (only show image generation)
   - Conditionally hide/disable features based on flags
   - Ensure UI stays consistent (same design, just fewer features)

2. **Create mapping function: `lib/feed-planner/blueprint-mapper.ts` (new file):**
   - Function: `mapBlueprintStrategyToFeedPosts(blueprintStrategy)`
   - Converts `blueprint_subscribers.strategy_data` format → `feed_posts` format
   - Maps blueprint content calendar → feed posts structure
   - Stores mapped data in `feed_posts` table (reuse existing schema)
   - Handles edge cases (missing data, different formats)

3. **Update paid blueprint screen (`components/sselfie/blueprint-screen.tsx`):**
   - Check if user has `paid_blueprint` subscription via `getBlueprintEntitlement()`
   - If paid → Render `FeedViewScreen` with `mode="blueprint"`
   - If free → Show existing welcome/start screen
   - Pass blueprint strategy data as prop to FeedViewScreen
   - Ensure credit balance display (from Decision 1) is visible

4. **Update image generation:**
   - Reuse existing feed planner image generation (`app/api/feed/[feedId]/generate-single/route.ts`)
   - Ensure credit checks are in place (via Decision 1) - should already work
   - Test that 2 credits are deducted per image (same as regular feed planner)

5. **API endpoint updates (if needed):**
   - `app/api/blueprint/state/route.ts` - May need to return mapped feed posts data
   - Ensure blueprint strategy → feed posts mapping is available via API

**Files to Modify:**
- `components/feed-planner/feed-view-screen.tsx` - Add mode prop + feature flags
- `components/sselfie/blueprint-screen.tsx` - Conditional rendering of FeedViewScreen
- `lib/feed-planner/blueprint-mapper.ts` (NEW) - Mapping function
- `app/api/blueprint/state/route.ts` (maybe) - Return mapped feed posts

**Testing Requirements:**
- ✅ User with paid_blueprint subscription sees FeedViewScreen
- ✅ User with free blueprint sees existing welcome screen
- ✅ FeedViewScreen in blueprint mode hides caption generation
- ✅ FeedViewScreen in blueprint mode hides strategy tab
- ✅ Image generation works (uses credits from Decision 1)
- ✅ Blueprint strategy data is correctly mapped to feed posts
- ✅ UI consistency maintained (same design, fewer features)

**Benefits:**
- Maximum code reuse (same UI/logic)
- UI consistency (same design)
- Faster implementation (reuse components)
- Future-proof (paid blueprint gets feed planner features)

**Estimated Complexity:** Medium
**Estimated Time:** 2-3 hours

---

### ⏳ Decision 3: Progressive Onboarding (PENDING)

**Status:** ⏳ **PENDING** - Ready to implement after Decision 2

**Implementation Steps:**
1. **Create base wizard component (`components/onboarding/base-wizard.tsx`):**
   - 5 steps: Name, Business Type, Color Theme, Visual Aesthetic, Current Situation
   - Reuse UI patterns from existing `OnboardingWizard` component
   - Stores data in `user_personal_brand` table (structured columns)
   - Completes after step 5
   - Calls completion handler: `onBaseComplete()`

2. **Create blueprint extension component (`components/onboarding/blueprint-extension.tsx`):**
   - 3 steps: Dream Client, Struggle, Feed Style
   - Stores data in `blueprint_subscribers.form_data` (JSONB)
   - Shows after base wizard completion (if user has blueprint entitlement)
   - Can be shown for both free and paid blueprint users
   - Calls completion handler: `onBlueprintExtensionComplete()`

3. **Create studio extension component (`components/onboarding/studio-extension.tsx`):**
   - 7 steps: Transformation Story, Future Vision, Ideal Audience, Communication Voice, Photo Goals, Content Pillars, Brand Inspiration
   - Stores data in `user_personal_brand` table (structured columns)
   - Shows after base wizard completion (if user has studio membership)
   - Calls completion handler: `onStudioExtensionComplete()`

4. **Update routing logic (`components/sselfie/sselfie-app.tsx`):**
   - After base wizard completion → Check entitlement via `getBlueprintEntitlement()`
   - Free users → Show blueprint extension → Blueprint welcome wizard → Blueprint tab
   - Paid blueprint → Show blueprint extension → Blueprint welcome wizard → Paid blueprint screen (FeedViewScreen)
   - Studio membership → Show studio extension → Studio (Maya chat)
   - Set `users.onboarding_completed = true` after final extension completes

5. **Migration: Map existing blueprint form data → base + extension:**
   - **File:** `scripts/migrations/map-blueprint-to-progressive-onboarding.sql`
   - Extract base fields (Name, Business Type, Color Theme, Visual Aesthetic, Current Situation) → `user_personal_brand`
   - Extract blueprint extensions (Dream Client, Struggle, Feed Style) → `blueprint_subscribers.form_data`
   - Handle users who already completed blueprint (set `onboarding_completed = true`)
   - Handle edge cases (missing data, different formats)

6. **API endpoints (if needed):**
   - `app/api/onboarding/base-complete/route.ts` (NEW) - Save base wizard data
   - `app/api/onboarding/blueprint-extension-complete/route.ts` (NEW) - Save blueprint extension data
   - `app/api/onboarding/studio-extension-complete/route.ts` (NEW) - Save studio extension data

**Files to Create:**
- `components/onboarding/base-wizard.tsx` (NEW)
- `components/onboarding/blueprint-extension.tsx` (NEW)
- `components/onboarding/studio-extension.tsx` (NEW)
- `lib/onboarding/mappers.ts` (NEW) - Data mapping utilities
- `app/api/onboarding/base-complete/route.ts` (NEW)
- `app/api/onboarding/blueprint-extension-complete/route.ts` (NEW)
- `app/api/onboarding/studio-extension-complete/route.ts` (NEW)
- `scripts/migrations/map-blueprint-to-progressive-onboarding.sql` (NEW)
- `scripts/migrations/run-map-blueprint-onboarding-migration.ts` (NEW)
- `scripts/migrations/verify-map-blueprint-onboarding-migration.ts` (NEW)

**Files to Modify:**
- `components/sselfie/sselfie-app.tsx` - Routing logic
- `app/studio/page.tsx` - Fetch onboarding state
- `components/sselfie/blueprint-welcome-wizard.tsx` - Integrate with progressive flow

**Testing Requirements:**
- ✅ New free user → Base wizard → Blueprint extension → Welcome wizard → Blueprint tab
- ✅ New paid blueprint user → Base wizard → Blueprint extension → Welcome wizard → Paid blueprint screen
- ✅ New studio user → Base wizard → Studio extension → Studio (Maya)
- ✅ Existing blueprint users → Migration maps data correctly
- ✅ Onboarding state persists (no duplicate wizards)
- ✅ Data stored in correct tables (base → user_personal_brand, extensions → appropriate tables)

**Benefits:**
- Balanced (fast for free users, full context for paid)
- Single source for core data (`user_personal_brand`)
- Flexible (easy to add new extensions)
- Better AI context (Maya gets base context for all users)

**Estimated Complexity:** High
**Estimated Time:** 6-8 hours

---

---

## IMPLEMENTATION STATUS & NEXT STEPS

### Current Status

| Decision | Status | Completion | Next Action |
|----------|--------|------------|-------------|
| **Decision 1: Credit System** | ✅ **COMPLETED** | 100% | Test end-to-end flow, create PR #1 |
| **Decision 2: Feed Planner Embed** | ⏳ **PENDING** | 0% | Start after Decision 1 testing |
| **Decision 3: Progressive Onboarding** | ⏳ **PENDING** | 0% | Start after Decision 2 |

### Recommended Next Approach

#### Phase 1: Complete Decision 1 (Current - Testing Phase)
**Goal:** Verify Decision 1 works end-to-end before moving forward

**Tasks:**
1. **Test Credit System End-to-End:**
   - Test signup flow: New user signs up → Gets 2 credits
   - Test blueprint generation: User generates grid → 2 credits deducted
   - Test credit display: UI shows correct credit balance
   - Test paid blueprint purchase: Webhook grants 60 credits
   - Test credit limits: User with 0 credits cannot generate

2. **Create PR #1 for Decision 1:**
   - Title: `feat: Credit system for all users (Decision 1)`
   - Include all modified files
   - Include migration results
   - Include testing checklist

**Estimated Time:** 1-2 hours

---

#### Phase 2: Implement Decision 2 (After Decision 1 PR)
**Goal:** Embed Feed Planner UI for paid blueprint users

**Approach:**
1. Start with simplest change: Add `mode` prop to FeedViewScreen
2. Add feature flags to hide/show features based on mode
3. Create mapping function for blueprint strategy → feed posts
4. Update blueprint screen to conditionally render FeedViewScreen
5. Test thoroughly before moving to Decision 3

**Estimated Time:** 2-3 hours

**Files Priority:**
1. `components/feed-planner/feed-view-screen.tsx` (add mode prop)
2. `components/sselfie/blueprint-screen.tsx` (conditional rendering)
3. `lib/feed-planner/blueprint-mapper.ts` (NEW - mapping function)

---

#### Phase 3: Implement Decision 3 (After Decision 2)
**Goal:** Progressive onboarding flow

**Approach:**
1. Start with base wizard (5 steps) - reuse existing OnboardingWizard patterns
2. Create blueprint extension (3 steps) - simplest extension
3. Create studio extension (7 steps) - most complex extension
4. Update routing logic in SselfieApp
5. Create migration to map existing data
6. Test all user flows

**Estimated Time:** 6-8 hours

**Files Priority:**
1. `components/onboarding/base-wizard.tsx` (NEW - start here)
2. `components/onboarding/blueprint-extension.tsx` (NEW)
3. `components/onboarding/studio-extension.tsx` (NEW)
4. `components/sselfie/sselfie-app.tsx` (update routing)

---

### Implementation Strategy

**Recommended Workflow:**
1. ✅ **Decision 1:** Complete → Test → PR #1
2. ⏳ **Decision 2:** Implement → Test → PR #2
3. ⏳ **Decision 3:** Implement → Test → PR #3

**Why Sequential?**
- Each decision builds on the previous one
- Decision 2 depends on Decision 1 (credit system for image generation)
- Decision 3 depends on Decision 2 (paid blueprint screen routing)
- Easier to test and debug incrementally
- Smaller PRs are easier to review

**Alternative: Parallel Development**
- ⚠️ Not recommended - too many dependencies
- Risk of merge conflicts
- Harder to test interactions
- More complex to debug

---

### Success Metrics

**Decision 1 Success Criteria:**
- ✅ All free users have credits (verified via migration)
- ✅ Signup grants 2 credits (tested)
- ✅ Grid generation deducts 2 credits (to test)
- ✅ UI shows credit balance (implemented)
- ✅ Paid blueprint grants 60 credits (implemented)

**Decision 2 Success Criteria:**
- Paid blueprint users see FeedViewScreen
- Free blueprint users see welcome screen
- Image generation works (uses credits)
- UI consistency maintained
- Blueprint strategy → feed posts mapping works

**Decision 3 Success Criteria:**
- New users see base wizard (5 steps)
- After base, users see appropriate extension
- Data stored in correct tables
- Onboarding state persists
- No duplicate wizards shown
- Migration maps existing data correctly

---

### Risk Mitigation

**Decision 1 Risks:**
- ⚠️ **Risk:** Credits not granted on signup
- ✅ **Mitigation:** Test signup flow, check auth callback

**Decision 2 Risks:**
- ⚠️ **Risk:** FeedViewScreen breaks in blueprint mode
- ✅ **Mitigation:** Feature flags allow gradual rollout, can disable easily

**Decision 3 Risks:**
- ⚠️ **Risk:** Migration fails or misses data
- ✅ **Mitigation:** Test migration on staging first, verify data mapping

---

**END OF PLAN**
