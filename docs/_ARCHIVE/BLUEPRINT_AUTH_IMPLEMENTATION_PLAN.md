# 🚀 Blueprint Auth-First Migration Implementation Plan

**Based on:** [BLUEPRINT_AUTH_AUDIT.md](./BLUEPRINT_AUTH_AUDIT.md)  
**Target:** Move free Brand Blueprint into authenticated Studio flow, eliminate guest token system

---

## 📋 Prerequisites

### Code Analysis Summary

**Current State:**
- `blueprint_subscribers` table: **NO `user_id` column** (email-only identity)
- `subscriptions` table: **HAS `product_type` column** (supports `sselfie_studio_membership`)
- Studio tabs: `maya`, `gallery`, `feed-planner`, `academy`, `account` (no `blueprint` tab yet)
- Auth flow: Sign-up → `/auth/callback` → `/studio` (handled by `app/auth/callback/route.ts`)
- `lib/subscription.ts`: `ProductType` type only includes `"sselfie_studio_membership"` (needs expansion)

**Key Files Identified:**
- `components/sselfie/sselfie-app.tsx` - Studio tab navigation (lines 79-92)
- `app/studio/page.tsx` - Studio server component (auth required)
- `app/auth/sign-up/page.tsx` - Sign-up form (client-side)
- `app/auth/callback/route.ts` - Auth callback handler (server-side)
- `components/checkout/success-content.tsx` - Success page (paid_blueprint polling logic)
- `app/api/webhooks/stripe/route.ts` - Webhook handler (paid_blueprint logic at lines 944-1219)
- `lib/subscription.ts` - Subscription helpers (needs `paid_blueprint` support)

---

## 🎯 Target Architecture

### Identity
- **Supabase Auth users only** (no email-only flows)
- Landing "Try it free" → `/auth/sign-up?next=/studio?tab=blueprint`
- Sign up (name/email/password) → redirect to Studio with Blueprint tab open

### Entitlements (Single Source of Truth)
- Use `subscriptions` table with `product_type`:
  - `free_blueprint` (implicit for all users, or row in subscriptions)
  - `paid_blueprint` (one-time purchase)
  - `sselfie_studio_membership` (subscription)

### Data Model
- Keep `blueprint_subscribers` table but **add `user_id TEXT REFERENCES users(id)`**
- Treat as `blueprint_state`, not guest lead list
- Store blueprint progress/results attached to `user_id`

---

## 📅 Implementation Phases

### Phase 0: Stop the Bleeding (Stabilizer Only)

**Goal:** Fix immediate bugs while migration is in progress.

**Scope:** Minimal changes to prevent user frustration.

#### Changes

**1. Fix Success Page Stuck Loading**
- **File:** `components/checkout/success-content.tsx`
- **Current Issue:** Polls for access token (lines 96-157), shows "PREPARING..." if webhook delayed
- **Fix:** 
  - Remove access token polling for `paid_blueprint`
  - Always show "Continue" button that routes to `/studio?tab=blueprint&purchase=success`
  - Webhook entitlement updates happen server-side (already does)
  - Client just acknowledges purchase → routes to Studio

**2. Fix Grid Re-hydration Bug (Minimal)**
- **File:** `app/blueprint/page-client.tsx`
- **Current Issue:** Grid flashes empty on refresh (hydration timing at lines 199-206)
- **Fix:**
  - Pre-load grid URL in server props if exists
  - Remove client-side fallback hydration that causes flash
  - **DO NOT** add more localStorage complexity

**3. Stop Investing in Guest System**
- **Mark for deprecation:** All localStorage-based resume logic
- **Do not fix:** Guest token edge cases
- **Document:** These will be removed in Phase 4

**Estimated Effort:** 1-2 days  
**Risk:** Low (bug fixes only, no architecture changes)  
**Rollback:** Revert PR if issues

---

### Phase 1: Add Blueprint Tab Inside Studio (Core Consolidation)

**Goal:** Blueprint UI accessible inside Studio for authenticated users.

**Scope:** Add tab + simplified screen, reuse existing blueprint components.

#### Changes

**1. Add `user_id` Column to `blueprint_subscribers`**
- **File:** New migration script
- **Action:** 
  ```sql
  ALTER TABLE blueprint_subscribers 
  ADD COLUMN user_id TEXT REFERENCES users(id);
  
  CREATE INDEX idx_blueprint_subscribers_user_id 
  ON blueprint_subscribers(user_id);
  ```
- **Note:** Existing rows will have `NULL` (migrated in Phase 4)

**2. Add `blueprint` Tab to Studio**
- **File:** `components/sselfie/sselfie-app.tsx`
- **Current:** Tabs at lines 79-92: `maya`, `gallery`, `feed-planner`, `academy`, `account`
- **Change:** 
  - Add `"blueprint"` to `validTabs` array
  - Add tab navigation button in tab bar (check existing pattern)
  - Add tab content rendering (check existing switch/conditional pattern)

**3. Create `BlueprintScreen` Component**
- **File:** `components/sselfie/blueprint-screen.tsx` (new file)
- **Pattern:** Similar to `studio-screen.tsx`, `maya-chat-screen.tsx`
- **Requirements:**
  - Accept `userId` prop (from `SselfieApp`)
  - Reuse step flow UI from `app/blueprint/page-client.tsx` (copy/modify)
  - Read/write using `user_id`, not `email/token`
  - **DO NOT** use localStorage for resume (use server-side state only)

**4. Create Blueprint State APIs (User-ID Based)**
- **File:** `app/api/blueprint/state/route.ts` (new file)
- **Endpoints:**
  - `GET /api/blueprint/state` - Get blueprint state by `user_id` (from auth session)
  - `POST /api/blueprint/state` - Save blueprint state by `user_id`
- **Logic:**
  - Query `blueprint_subscribers WHERE user_id = ${userId}`
  - Return same structure as `/api/blueprint/get-blueprint` but filtered by `user_id`
  - **Auth required:** Check Supabase session, extract `user_id` from `users` table

**5. Update Blueprint Client Components (Phase 1 Only)**
- **Files:** 
  - `components/sselfie/blueprint-screen.tsx` (new)
  - Modify `app/blueprint/page-client.tsx` step logic (extract to shared component)
- **Changes:**
  - Replace email-based API calls with `user_id`-based calls
  - Remove localStorage dependency
  - Remove URL param parsing (`?email=`, `?token=`)
  - Use `/api/blueprint/state` endpoints

**6. Update Studio Server Component**
- **File:** `app/studio/page.tsx`
- **Change:** Pass `userId` to `SselfieApp` (already does at line 100)
- **Note:** No changes needed if `userId` already passed

**Estimated Effort:** 3-5 days  
**Risk:** Medium (new tab + API endpoints)  
**Testing:** 
- Sign up → Studio opens with Blueprint tab visible
- Start free blueprint → progress saves to `blueprint_subscribers.user_id`
- Refresh → state persists (server-side)
- Different device → state persists (auth-based)

---

### Phase 2: Entitlements + Limits in One Place

**Goal:** Server-side entitlement checks for free/paid blueprint.

**Scope:** Add entitlement logic, store usage counters.

#### Changes

**1. Update Subscription Types**
- **File:** `lib/subscription.ts`
- **Change:**
  ```typescript
  export type ProductType = "sselfie_studio_membership" | "paid_blueprint" | "free_blueprint"
  ```
- **Add helper:**
  ```typescript
  export async function hasPaidBlueprint(userId: string): Promise<boolean>
  export async function hasFreeBlueprintAccess(userId: string): Promise<boolean>
  export async function getBlueprintEntitlement(userId: string): Promise<{
    type: "free" | "paid" | "studio"
    freeGridUsed: boolean
    paidGridsRemaining: number | null
  }>
  ```

**2. Add Usage Tracking to `blueprint_subscribers`**
- **File:** New migration script
- **Action:**
  ```sql
  ALTER TABLE blueprint_subscribers
  ADD COLUMN free_grid_used_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN free_grid_used_count INTEGER DEFAULT 0,
  ADD COLUMN paid_grids_generated INTEGER DEFAULT 0;
  ```

**3. Update Grid Generation Endpoints with Entitlement Checks**
- **Files:**
  - `app/api/blueprint/generate-grid/route.ts` (free grid)
  - `app/api/blueprint/generate-paid/route.ts` (paid grids)
- **Changes:**
  - Remove email-based validation
  - Add auth check: `getUserByAuthId()` from session
  - Add entitlement check: `getBlueprintEntitlement(userId)`
  - **Free grid:** Check `free_grid_used_count < 1`, increment on success
  - **Paid grids:** Check `paid_blueprint` subscription + `paid_grids_generated < 30`
  - Return 403 if quota exceeded

**4. Update Blueprint State API with Entitlement Info**
- **File:** `app/api/blueprint/state/route.ts`
- **Change:** Include entitlement info in response:
  ```typescript
  {
    state: { ...blueprint state... },
    entitlement: {
      type: "free" | "paid" | "studio",
      freeGridUsed: boolean,
      paidGridsRemaining: number | null
    }
  }
  ```

**5. Update Client Components with Entitlement UI**
- **File:** `components/sselfie/blueprint-screen.tsx`
- **Changes:**
  - Show upsell if `free_grid_used === true` and `entitlement.type === "free"`
  - Show paid grid generator if `entitlement.type === "paid"` or `"studio"`
  - Hide/disable generate buttons based on entitlement

**Estimated Effort:** 3-4 days  
**Risk:** Medium (entitlement logic must be correct)  
**Testing:**
- Free user: Can generate 1 grid, then sees upsell
- Paid user: Can generate 30 grids
- Studio user: Can generate unlimited (or same as paid)
- Refresh: Entitlement persists

---

### Phase 3: Checkout becomes "Login-First"

**Goal:** Paid blueprint purchase attached to authenticated user.

**Scope:** Update checkout flow, webhook, success redirect.

#### Changes

**1. Update Blueprint Checkout Page**
- **File:** `app/checkout/blueprint/page.tsx`
- **Current:** Public page, no auth required
- **Change:**
  - Add auth check: `redirect("/auth/login?returnTo=/checkout/blueprint")` if not authenticated
  - Get `userId` from auth session
  - Pass `user_id` in Stripe metadata: `session.metadata.user_id = userId`

**2. Update Stripe Webhook for `paid_blueprint`**
- **File:** `app/api/webhooks/stripe/route.ts` (lines 944-1219)
- **Current:** Creates/updates `blueprint_subscribers` by email, sets `paid_blueprint_purchased = TRUE`
- **Change:**
  - Use `user_id` from session metadata instead of email lookup
  - Upsert `subscriptions` table: `product_type = 'paid_blueprint'` (one-time)
  - Link `blueprint_subscribers` to `user_id` (update or create)
  - **Remove:** Email-based `blueprint_subscribers` lookup

**3. Update Success Page Redirect**
- **File:** `components/checkout/success-content.tsx`
- **Current:** Polls for access token (lines 96-157), redirects to `/blueprint/paid?access=...`
- **Change:**
  - Remove access token polling
  - Always redirect to `/studio?tab=blueprint&purchase=success`
  - Client acknowledges purchase → routes to Studio
  - Server-side entitlement check (webhook) enables paid features

**4. Update Studio with Purchase Success Message**
- **File:** `components/sselfie/blueprint-screen.tsx`
- **Change:** 
  - Check URL param: `?purchase=success`
  - Show success message: "Your paid blueprint is ready! Generate 30 grids below."
  - Auto-dismiss after 5 seconds

**5. Update Subscription Helpers**
- **File:** `lib/subscription.ts`
- **Add:**
  ```typescript
  export async function hasPaidBlueprint(userId: string): Promise<boolean> {
    const subscription = await getUserSubscription(userId)
    return subscription?.product_type === "paid_blueprint" && subscription?.status === "active"
  }
  ```

**Estimated Effort:** 2-3 days  
**Risk:** Medium (webhook changes are critical)  
**Testing:**
- Login → Checkout → Purchase → Redirect to Studio (no polling)
- Webhook creates `subscriptions` row with `product_type = 'paid_blueprint'`
- Studio shows paid blueprint features immediately (or after webhook processes)

---

### Phase 4: Deprecate Guest System Safely

**Goal:** Keep old links working, but everything converges into Studio.

**Scope:** Migration logic, deprecation warnings, eventual removal.

#### Changes

**1. Keep `/blueprint` as Marketing Page**
- **File:** `app/blueprint/page.tsx`
- **Change:**
  - Remove actual blueprint flow (move to Studio)
  - Show marketing content: "Try it free" → `/auth/sign-up?next=/studio?tab=blueprint`
  - Show "Get 30 photos" → `/auth/sign-up?next=/checkout/blueprint`
  - **Keep route:** For SEO/backlinks

**2. Handle Old Email/Token Links**
- **File:** `app/blueprint/page.tsx` (or create redirect handler)
- **Current:** Queries `blueprint_subscribers` by `email` or `token`
- **Change:**
  - Check if user is authenticated
  - If **not authenticated:**
    - Show "Log in to continue" → `/auth/login?returnTo=/blueprint?email=...`
  - If **authenticated:**
    - Attempt to migrate: Match `blueprint_subscribers.email` to `users.email`
    - If match found: Update `blueprint_subscribers.user_id = userId`
    - Redirect to `/studio?tab=blueprint`
    - Show message: "We've migrated your blueprint to your account!"

**3. Migration Script for Existing Users**
- **File:** New script: `scripts/migrate-blueprint-subscribers-to-users.ts`
- **Action:**
  - For each `blueprint_subscribers` row:
    - Match `email` to `users.email`
    - Update `user_id = users.id` if match found
    - Log unmigrated rows (for manual review)
  - Run after Phase 1 (after `user_id` column added)

**4. Deprecation Warnings**
- **Files:** All email/token-based endpoints
- **Action:**
  - Add deprecation logs: `console.warn("[DEPRECATED] Using email-based blueprint access")`
  - Return deprecation header: `X-Deprecated: true`
  - Document removal date in code comments

**5. Update Landing Page CTA**
- **File:** `app/page.tsx` (or wherever landing page is)
- **Change:** "Try it free" → `/auth/sign-up?next=/studio?tab=blueprint`

**6. Remove localStorage Dependencies (Final Cleanup)**
- **Files:** 
  - `app/blueprint/page-client.tsx` (if still used)
  - `components/sselfie/blueprint-screen.tsx`
- **Action:** Remove all `localStorage.getItem/setItem` for blueprint state
- **Keep:** localStorage for UX smoothing only (e.g., draft form inputs)

**Estimated Effort:** 2-3 days  
**Risk:** Low (backward compatibility maintained)  
**Testing:**
- Old email link → Login prompt → Auto-migration → Studio
- Old token link → Login prompt → Auto-migration → Studio
- Marketing page → Sign up → Studio with Blueprint tab
- No data loss during migration

---

## 🔄 Migration Strategy

### Data Migration

**Existing `blueprint_subscribers` rows:**
1. **Phase 1:** Add `user_id` column (NULL for existing rows)
2. **Phase 4:** Match by email → Update `user_id`
3. **Unmatched rows:** Keep for analytics, no migration (orphaned guest data)

**Existing `subscriptions` rows:**
- No changes needed (already supports `product_type`)

### Backward Compatibility

**Phase 1-3:** Guest system still works (parallel paths)
**Phase 4:** Guest system deprecated but functional (migration prompts)

### Rollback Plan

Each phase can be rolled back independently:
- **Phase 0:** Revert PR (bug fixes only)
- **Phase 1:** Remove tab, keep old `/blueprint` route
- **Phase 2:** Revert entitlement checks, allow unlimited free
- **Phase 3:** Revert webhook changes, use email-based system
- **Phase 4:** Keep guest system active

---

## ✅ Success Criteria

### Phase 0 Complete
- [ ] Success page no longer stuck loading
- [ ] Grid no longer flashes empty on refresh (or minimal flash acceptable)
- [ ] No new localStorage complexity added

### Phase 1 Complete
- [ ] `blueprint_subscribers` has `user_id` column
- [ ] Studio has "Blueprint" tab
- [ ] Blueprint flow works inside Studio (auth-required)
- [ ] State persists across refresh (server-side)
- [ ] State persists across devices (auth-based)

### Phase 2 Complete
- [ ] Free users limited to 1 grid
- [ ] Paid users can generate 30 grids
- [ ] Studio users have blueprint access (determine limit)
- [ ] Entitlement checks enforced server-side
- [ ] Usage counters persist correctly

### Phase 3 Complete
- [ ] Checkout requires login
- [ ] Webhook creates `subscriptions` row with `product_type = 'paid_blueprint'`
- [ ] Success page redirects to Studio (no polling)
- [ ] Paid features available immediately in Studio

### Phase 4 Complete
- [ ] `/blueprint` is marketing page only
- [ ] Old email/token links prompt login + auto-migrate
- [ ] All existing users migrated (or documented exceptions)
- [ ] localStorage removed (or minimal UX-only usage)
- [ ] Guest system fully deprecated

---

## 📊 Files to Modify

### Phase 0
- `components/checkout/success-content.tsx`
- `app/blueprint/page-client.tsx`

### Phase 1
- `scripts/migrations/add-user-id-to-blueprint-subscribers.sql` (new)
- `components/sselfie/sselfie-app.tsx`
- `components/sselfie/blueprint-screen.tsx` (new)
- `app/api/blueprint/state/route.ts` (new)
- `app/studio/page.tsx` (verify only)

### Phase 2
- `lib/subscription.ts`
- `scripts/migrations/add-usage-tracking-to-blueprint.sql` (new)
- `app/api/blueprint/generate-grid/route.ts`
- `app/api/blueprint/generate-paid/route.ts`
- `app/api/blueprint/state/route.ts`
- `components/sselfie/blueprint-screen.tsx`

### Phase 3
- `app/checkout/blueprint/page.tsx`
- `app/api/webhooks/stripe/route.ts`
- `components/checkout/success-content.tsx`
- `components/sselfie/blueprint-screen.tsx`
- `lib/subscription.ts`

### Phase 4
- `app/blueprint/page.tsx` (or create redirect handler)
- `scripts/migrate-blueprint-subscribers-to-users.ts` (new)
- `components/sselfie/blueprint-screen.tsx` (remove localStorage)
- `app/page.tsx` (update CTA if needed)

---

## ⚠️ Critical Dependencies

### Must Understand Before Starting

1. **Subscriptions Table Schema**
   - Verify `product_type` column supports `paid_blueprint` (check `scripts/add-product-type-column.sql`)
   - Verify `user_id` is `TEXT` (matches `users.id` type)

2. **Auth Session Handling**
   - Verify how `user_id` is extracted from Supabase session (check `lib/user-mapping.ts`)
   - Verify `getUserByAuthId()` exists and works correctly

3. **Studio Tab Navigation**
   - Verify how tabs are rendered (check `components/sselfie/sselfie-app.tsx` lines 450-700)
   - Understand tab switching logic

4. **Stripe Webhook Flow**
   - Verify `checkout.session.completed` event handler (lines 944-1219)
   - Understand how metadata is passed (check `session.metadata` usage)

### Questions to Answer Before Implementation

1. **Free Blueprint Entitlement:**
   - Should `free_blueprint` be implicit (all users) or row in `subscriptions`?
   - **Decision needed:** Implicit vs explicit entitlement

2. **Studio Membership Entitlement:**
   - Should Studio users get unlimited blueprint grids or same as paid (30)?
   - **Decision needed:** Studio blueprint limits

3. **Migration of Existing Data:**
   - What if email matches multiple users? (email not unique in `users` table)
   - What if user has multiple `blueprint_subscribers` rows?
   - **Decision needed:** Migration conflict resolution

---

## 🚨 Risks & Mitigations

### High Risk: Webhook Changes (Phase 3)
- **Risk:** Paid blueprint purchases not recorded if webhook fails
- **Mitigation:** Test webhook thoroughly, add logging, monitor Stripe dashboard

### Medium Risk: Data Migration (Phase 4)
- **Risk:** Existing users lose blueprint state during migration
- **Mitigation:** Run migration script in dry-run mode first, backup `blueprint_subscribers` table

### Medium Risk: Entitlement Logic (Phase 2)
- **Risk:** Users bypass limits if checks are wrong
- **Mitigation:** Server-side checks only (never trust client), test all paths

### Low Risk: Tab Addition (Phase 1)
- **Risk:** Tab not visible or not working
- **Mitigation:** Follow existing tab patterns, test navigation

---

## 📝 Notes

- **Do NOT assume logic:** Analyze actual code before proposing changes
- **Reference audit document:** [BLUEPRINT_AUTH_AUDIT.md](./BLUEPRINT_AUTH_AUDIT.md) for current state
- **Stop and ask:** If unsure about any code path or database schema
- **Test each phase:** Before moving to next phase
- **Document decisions:** In code comments or this doc

---

**Status:** Ready for Phase 0 implementation  
**Last Updated:** 2025-01-XX
