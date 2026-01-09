# PR-8: User Journey Audit & Fix Plan

**Date:** 2026-01-09  
**Status:** 🔴 Critical Issues Found  
**Scope:** Fix funnel leaks, state logic, and routing - NO new features

---

## PART A — AUDIT FINDINGS

### 🔍 Problem 1: Landing Page Has No Clear Paths

**Current State:**
- **File:** `/app/page.tsx` → renders `/components/sselfie/landing-page-new.tsx`
- **CTAs Found:**
  - Hero: "Try SSELFIE Studio →" → Scrolls to `#membership` (pricing section)
  - Pricing: "Get Started" → `/auth/sign-up`
  - Pricing: "See Inside →" → `/auth/sign-up`
  - Footer: "Join the Studio Today →" → Scrolls to `#membership`

**❌ Missing:**
- No CTA to Free Blueprint (`/blueprint`)
- No CTA to Paid Blueprint (`/paid-blueprint` or `/checkout/blueprint`)
- Homepage acts as Studio membership funnel only

**Evidence:**
```typescript
// components/sselfie/landing-page-new.tsx:206-216
<a href="#membership" onClick={(e) => {
  e.preventDefault()
  trackCTAClick("hero", "Try SSELFIE Studio", "#membership")
  scrollToPricing()
}}>
  Try SSELFIE Studio →
</a>
```

**Impact:** Users who want free blueprint or paid blueprint have no direct path from homepage.

---

### 🔍 Problem 2: Email Capture Happens Mid-Flow (High Drop-Off Risk)

**Current State:**
- **File:** `/app/blueprint/page.tsx`
- **Email Capture Trigger Points:**
  1. **Step 2** (after form questions, before feed style): `showEmailCapture` set to `true` when user tries to generate concepts
  2. **Step 6** (caption templates): Email capture if not already saved

**Code Evidence:**
```typescript
// app/blueprint/page.tsx:380-384
const generateConcepts = async (): Promise<boolean> => {
  if (!savedEmail) {
    setShowEmailCapture(true)  // ❌ Blocks progress
    return false
  }
  // ...
}
```

**What Happens If User Leaves Before Email Capture:**
- Form data saved to `localStorage` only (`blueprint-form-data`)
- **NO email captured** → Lost lead
- User must restart entire flow on return
- No way to resume without email

**Impact:** 
- Users can answer all questions, then abandon when email gate appears
- No email = no way to resume or follow up
- High drop-off at step 2-3 transition

---

### 🔍 Problem 3: No Recognition of Completed Free Blueprint

**Current State:**
- **File:** `/app/blueprint/page.tsx`
- **On Page Load:**
  - Starts at `step = 0` (landing)
  - Only loads saved blueprint IF `savedEmail` exists in state
  - `savedEmail` is client-side state only (not persisted in URL or cookie)

**Code Evidence:**
```typescript
// app/blueprint/page.tsx:102-150
useEffect(() => {
  const loadSavedBlueprint = async () => {
    if (!savedEmail) return  // ❌ Only loads if email already in state
    
    const response = await fetch(`/api/blueprint/get-blueprint?email=${encodeURIComponent(savedEmail)}`)
    // ...
  }
  loadSavedBlueprint()
}, [savedEmail])  // ❌ Depends on client-side state
```

**What Happens When Returning User Visits `/blueprint`:**
1. `savedEmail` is empty (fresh page load)
2. `loadSavedBlueprint()` never runs
3. User sees step 0 (landing) again
4. Must click "Start your blueprint →" again
5. Must re-enter email (even if already in DB)
6. Must re-answer questions (even if form_data exists)

**Database Columns Available (NOT USED):**
- `strategy_generated` (BOOLEAN) - indicates strategy created
- `grid_generated` (BOOLEAN) - indicates grid created
- `blueprint_completed` (BOOLEAN) - exists but not consistently set
- `form_data` (JSONB) - stores all form responses

**Impact:**
- Returning users forced to restart
- No recognition of completion
- No upgrade path shown for completed users
- Frustrating UX

---

### 🔍 Problem 4: No Server-Side State Check on Entry

**Current State:**
- `/app/blueprint/page.tsx` is a **client component** (`"use client"`)
- No server-side check on page load
- No URL params checked (e.g., `?email=...`)
- No cookie/session check
- No database lookup on mount

**Missing Logic:**
- Should check URL params for `?email=...` or `?token=...`
- Should check localStorage for saved email
- Should check database for existing subscriber
- Should route based on completion state

**Impact:**
- Every visit starts fresh
- No resume capability
- No smart routing

---

### 🔍 Problem 5: Paid Blueprint Landing Page Not Connected

**Current State:**
- **File:** `/app/paid-blueprint/page.tsx` (gated by feature flag)
- **File:** `/components/paid-blueprint/paid-blueprint-landing.tsx`
- **Routes to:** `/checkout/blueprint?email=...`
- **Checkout requires:** Email param (redirects to `/blueprint` if missing)

**Issues:**
- No link from homepage
- No link from free blueprint landing (step 0)
- Only accessible via direct URL or CTAs in steps 3.5 and 4
- CTAs only show if `savedEmail` exists (mid-flow)

**Impact:**
- Paid blueprint feels hidden
- Users who want to buy immediately have no path
- Must complete free flow first to see paid option

---

## PART B — PROPOSED FIXED FUNNEL

### 🎯 1. Landing Page (Homepage) - New Behavior

**File:** `/components/sselfie/landing-page-new.tsx`

**Required Changes:**
- Add **two clear CTAs** in hero section:
  - **CTA A:** "Try it free" → `/blueprint` (Free Blueprint)
  - **CTA B:** "Get 30 Photos" → `/paid-blueprint` (Paid Blueprint landing)

**Exact Routes:**
- Free: `/blueprint` (no params needed)
- Paid: `/paid-blueprint` (gated, feature flag checked)

**Email Handling:**
- Free: Email captured in blueprint flow (see below)
- Paid: Email captured on paid landing page, passed to checkout

---

### 🎯 2. Free Blueprint Entry Logic

**File:** `/app/blueprint/page.tsx`

**New Behavior:**

#### A. Server-Side Check (Add Server Component Wrapper)

Create `/app/blueprint/page-server.tsx` (server component) that:
1. Checks URL params: `?email=...` or `?token=...`
2. If email/token found:
   - Query database for subscriber
   - Check completion state:
     - `strategy_generated = TRUE` AND `grid_generated = TRUE` → Route to upgrade/results view
     - `strategy_generated = TRUE` AND `grid_generated = FALSE` → Resume at grid generation
     - `form_data` exists but no strategy → Resume at strategy generation
     - Email exists but no form_data → Resume at form questions
3. Pass state to client component

#### B. Client Component Entry Points

**State 1: No Email (New User)**
- Show step 0 (landing)
- **Email capture upfront** (before questions)
- After email capture → Step 1 (form questions)

**State 2: Email Exists, No Form Data**
- Skip email capture
- Start at Step 1 (form questions)
- Pre-fill any saved partial data

**State 3: Form Data Exists, No Strategy**
- Skip email capture
- Skip form questions
- Start at Step 3 (feed style) or Step 3.5 (strategy generation)

**State 4: Strategy Exists, No Grid**
- Skip email capture
- Skip form questions
- Skip strategy generation
- Start at Step 3.5 (grid generation)

**State 5: Grid Exists (Complete)**
- Show results/resume view
- Show upgrade CTA prominently
- Option to regenerate or view calendar

**State 6: Paid Purchased**
- Route to `/blueprint/paid?access={token}`

---

### 🎯 3. Email Capture Location

**Proposed:** **Upfront (Step 0.5) OR Inline (Step 1)**

**Option A: Upfront (Recommended)**
- Add email capture modal/overlay on step 0
- User must enter email before starting questions
- Benefits:
  - Captures email early (no loss if abandoned)
  - Enables resume on return
  - Can pre-fill form if returning user

**Option B: Inline Step 1**
- Email capture as first question in form
- Still early but feels more natural
- Benefits:
  - Less friction (no modal)
  - Part of natural flow

**Recommendation:** **Option A (Upfront)** - Better for conversion and resume capability

---

### 🎯 4. Completion Recognition Logic

**Definition of "Free Blueprint Completed":**
- `strategy_generated = TRUE` AND `grid_generated = TRUE`
- OR `blueprint_completed = TRUE` (if consistently set)

**Check Logic:**
```typescript
// Server-side check
const subscriber = await sql`
  SELECT 
    email,
    strategy_generated,
    grid_generated,
    blueprint_completed,
    form_data,
    paid_blueprint_purchased
  FROM blueprint_subscribers
  WHERE email = ${email} OR access_token = ${token}
`

if (subscriber.paid_blueprint_purchased) {
  redirect(`/blueprint/paid?access=${subscriber.access_token}`)
} else if (subscriber.strategy_generated && subscriber.grid_generated) {
  // Show results/upgrade view
} else if (subscriber.strategy_generated) {
  // Resume at grid generation
} else if (subscriber.form_data) {
  // Resume at strategy generation
} else {
  // New user flow
}
```

**Routing When Detected:**
- **Complete + Not Paid:** Show upgrade CTA, allow viewing results
- **Complete + Paid:** Route to paid blueprint page
- **Partial:** Resume at appropriate step
- **New:** Start from beginning

---

## PART C — DATA MODEL GAPS

### ✅ Existing Columns (Sufficient)

**`blueprint_subscribers` table has:**
- `email` (UNIQUE) ✅
- `access_token` (UNIQUE) ✅
- `form_data` (JSONB) ✅
- `strategy_generated` (BOOLEAN) ✅
- `grid_generated` (BOOLEAN) ✅
- `blueprint_completed` (BOOLEAN) ✅ (exists but not consistently used)
- `paid_blueprint_purchased` (BOOLEAN) ✅

### ⚠️ Missing/Inconsistent Usage

1. **`blueprint_completed` flag:**
   - Exists in schema
   - Set via `/api/blueprint/track-engagement` (event: `blueprint_completed`)
   - **NOT checked on page load**
   - **NOT used for routing**

2. **Step tracking:**
   - No column for `current_step` or `last_completed_step`
   - Must infer from `strategy_generated` + `grid_generated`
   - **Gap:** Can't distinguish "completed form but not strategy" vs "completed strategy but not grid"

### 📋 Proposed Minimal Schema Changes

**Option 1: Use Existing Columns (Recommended)**
- Use `strategy_generated` + `grid_generated` to infer state
- Set `blueprint_completed = TRUE` when both are true
- **No migration needed**

**Option 2: Add Step Tracking (If Needed)**
```sql
ALTER TABLE blueprint_subscribers
  ADD COLUMN IF NOT EXISTS last_completed_step INTEGER DEFAULT 0;
```
- **Migration:** Optional, only if Option 1 insufficient

**Recommendation:** **Option 1** - Use existing columns, add logic to set `blueprint_completed` consistently.

---

## PART D — PR-8 IMPLEMENTATION PLAN

### 🎯 Scope: Fix Funnel Logic Only

**What IS being changed:**
1. Homepage: Add Free + Paid CTAs
2. Free Blueprint: Add server-side state check on entry
3. Free Blueprint: Move email capture upfront (or inline step 1)
4. Free Blueprint: Add resume logic based on completion state
5. Free Blueprint: Route completed users to upgrade view

**What is NOT being changed:**
- ❌ No UI redesign
- ❌ No new features
- ❌ No new database tables
- ❌ No changes to paid blueprint generation logic
- ❌ No changes to email sequences

**What is deferred:**
- Step-by-step progress tracking (can use existing columns)
- Advanced resume with partial form data (can add later)
- A/B testing different email capture positions (can optimize later)

---

### 📁 Files to Modify/Create

#### 1. Homepage - Add CTAs
**File:** `/components/sselfie/landing-page-new.tsx`
- **Change:** Add two CTAs in hero section
- **Lines:** ~205-220 (hero CTA area)
- **Add:**
  - "Try it free" → `/blueprint`
  - "Get 30 Photos" → `/paid-blueprint` (if feature enabled)

#### 2. Free Blueprint - Server Wrapper
**File:** `/app/blueprint/page-server.tsx` (NEW)
- **Purpose:** Server component that checks state before rendering
- **Logic:**
  - Check URL params (`?email=...`, `?token=...`)
  - Query database for subscriber
  - Determine completion state
  - Pass props to client component

#### 3. Free Blueprint - Client Component Updates
**File:** `/app/blueprint/page.tsx`
- **Changes:**
  - Accept props from server component (email, completion state, resume step)
  - Move email capture to step 0.5 (upfront) OR inline step 1
  - Add resume logic based on props
  - Show upgrade view if completed

#### 4. Free Blueprint - Email Capture Component
**File:** `/components/blueprint/blueprint-email-capture.tsx`
- **Changes:** None (reuse existing)
- **Usage:** Call earlier in flow (step 0.5 or step 1)

#### 5. API Route - Check State
**File:** `/app/api/blueprint/check-state/route.ts` (NEW - Optional)
- **Purpose:** Server-side endpoint to check subscriber state
- **Returns:** Completion flags, resume step, routing recommendation
- **Alternative:** Can be done in server component directly

---

### 🔧 Implementation Steps (Ordered)

#### **Step 1: Add Homepage CTAs**
- Add "Try it free" button → `/blueprint`
- Add "Get 30 Photos" button → `/paid-blueprint` (gated)
- Test both paths work

#### **Step 2: Create Server Wrapper for Free Blueprint**
- Create `/app/blueprint/page-server.tsx`
- Check URL params for email/token
- Query database for subscriber
- Determine state (new/partial/complete/paid)
- Pass props to client component

#### **Step 3: Move Email Capture Upfront**
- Add email capture at step 0.5 (before questions)
- OR make it first question in step 1
- Remove email capture from step 2/6
- Test email is captured before questions

#### **Step 4: Add Resume Logic**
- Client component checks props from server
- Skip steps based on completion state
- Pre-fill form data if exists
- Test resume works for returning users

#### **Step 5: Add Completion Recognition**
- Check `strategy_generated` + `grid_generated`
- Route completed users to upgrade view
- Show upgrade CTA prominently
- Test completed users see upgrade, not restart

#### **Step 6: Set `blueprint_completed` Flag Consistently**
- Update `/api/blueprint/generate-grid/route.ts` to set flag when grid completes
- Update `/api/blueprint/track-engagement/route.ts` if needed
- Test flag is set correctly

---

### ✅ Acceptance Criteria

1. **Homepage:**
   - ✅ Two CTAs visible: "Try it free" and "Get 30 Photos"
   - ✅ Both routes work correctly
   - ✅ Paid CTA only shows if feature enabled

2. **Free Blueprint Entry:**
   - ✅ New user: Email captured upfront, then questions
   - ✅ Returning user (no completion): Resumes at appropriate step
   - ✅ Returning user (complete): Shows upgrade view, not restart
   - ✅ Paid user: Routes to paid blueprint page

3. **Email Capture:**
   - ✅ Happens before questions (or as first question)
   - ✅ Email saved to database immediately
   - ✅ No loss if user abandons after email capture

4. **Resume Logic:**
   - ✅ Form data pre-filled if exists
   - ✅ Strategy not regenerated if exists
   - ✅ Grid not regenerated if exists
   - ✅ Appropriate step shown based on state

5. **Completion Recognition:**
   - ✅ Completed users see upgrade CTA
   - ✅ Completed users can view results
   - ✅ Completed users not forced to restart

---

### 🧪 Test Plan

#### Test 1: New User Flow
1. Visit `/blueprint` (no params)
2. Should see step 0 (landing)
3. Click "Start your blueprint"
4. **Expected:** Email capture appears (step 0.5 or step 1)
5. Enter email
6. **Expected:** Proceeds to questions (step 1)

#### Test 2: Returning User (Partial)
1. Complete email + form questions (abandon before strategy)
2. Return to `/blueprint?email={email}`
3. **Expected:** Resumes at strategy generation (step 3.5), not restart

#### Test 3: Returning User (Complete)
1. Complete full free blueprint (strategy + grid)
2. Return to `/blueprint?email={email}`
3. **Expected:** Shows upgrade view with CTA, not restart

#### Test 4: Paid User
1. Purchase paid blueprint
2. Visit `/blueprint?email={email}`
3. **Expected:** Routes to `/blueprint/paid?access={token}`

#### Test 5: Homepage CTAs
1. Visit homepage (`/`)
2. **Expected:** See "Try it free" and "Get 30 Photos" buttons
3. Click "Try it free" → Should go to `/blueprint`
4. Click "Get 30 Photos" → Should go to `/paid-blueprint` (if enabled)

#### Test 6: Email Capture Timing
1. Start free blueprint
2. **Expected:** Email captured before or as first question
3. Abandon after email capture
4. Return to `/blueprint?email={email}`
5. **Expected:** Resumes appropriately, no email capture again

---

### 📊 Success Metrics

**Before Fix:**
- Email capture rate: Unknown (mid-flow)
- Returning user completion: Low (forced restart)
- Paid conversion from free: Unknown (hidden path)

**After Fix:**
- Email capture rate: Should increase (upfront)
- Returning user completion: Should increase (resume works)
- Paid conversion: Should increase (clear path + upgrade view)

---

## SUMMARY

### 🔴 Critical Issues Found:
1. Homepage has no paths to free/paid blueprint
2. Email capture happens mid-flow (high drop-off)
3. No recognition of completed free blueprint
4. No server-side state check on entry
5. Paid blueprint landing not connected to homepage

### ✅ Proposed Solutions:
1. Add two CTAs to homepage (free + paid)
2. Move email capture upfront (step 0.5 or step 1)
3. Add server-side state check on `/blueprint` entry
4. Implement resume logic based on completion state
5. Route completed users to upgrade view

### 📋 Files to Touch:
1. `/components/sselfie/landing-page-new.tsx` (add CTAs)
2. `/app/blueprint/page-server.tsx` (NEW - server wrapper)
3. `/app/blueprint/page.tsx` (add resume logic, move email capture)
4. `/app/api/blueprint/generate-grid/route.ts` (set `blueprint_completed` flag)

### 🚫 What's NOT Changing:
- No UI redesign
- No new features
- No new database tables
- No changes to paid blueprint generation
- No changes to email sequences

---

**Next Step:** Review and approve this plan before implementation.
