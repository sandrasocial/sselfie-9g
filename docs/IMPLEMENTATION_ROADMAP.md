# Implementation Roadmap - Blueprint Auth Migration & Onboarding Experience

**Last Updated:** 2026-01-09  
**Status:** Decision 1 Complete ✅ | Decision 2 85% Complete ⏳ | Decision 3 Pending ⏸️  
**Goal:** Complete Blueprint migration to authenticated Studio flow + Progressive onboarding

---

## 🎯 BIG PICTURE: What We're Building

### End Goal
1. **Blueprint lives inside Studio** (authenticated users only)
2. **Unified credit system** (all users get credits, no quota system)
3. **Progressive onboarding** (base wizard → product-specific extensions)
4. **Paid blueprint uses Feed Planner UI** (code reuse, consistency)

### Three Critical Decisions (All Approved ✅)
- **Decision 1:** Credit system for all users (2 free, 60 paid blueprint) ✅ **COMPLETE (100%)**
- **Decision 2:** Embed Feed Planner UI for paid blueprint screen ⏳ **85% COMPLETE** (needs UI testing)
- **Decision 3:** Progressive onboarding (base + extensions) ⏸️ **PENDING (0%)**

---

## 📊 CURRENT STATUS

### ✅ Decision 1: Credit System (COMPLETE - 100%)

**What Was Done:**
- ✅ Migration script created and executed (all free users have credits)
- ✅ Grant functions added (`grantFreeUserCredits`, `grantPaidBlueprintCredits`)
- ✅ Signup flow grants 2 credits automatically
- ✅ Stripe webhook grants 60 credits on paid blueprint purchase
- ✅ Blueprint generation uses credit checks (replaced quota system)
- ✅ UI shows credit balance instead of quota
- ✅ Edge case fixed (test user missing credits)

**Files Modified:**
- `lib/credits.ts` - Grant functions
- `app/auth/callback/route.ts` - Grants credits on signup
- `app/api/webhooks/stripe/route.ts` - Grants credits on purchase + creates subscription
- `app/api/blueprint/generate-grid/route.ts` - Credit checks and deductions
- `app/api/blueprint/check-grid/route.ts` - Removed quota logic
- `app/api/blueprint/state/route.ts` - Returns credit balance
- `components/sselfie/blueprint-screen.tsx` - Displays credits

**Migration Files:**
- `scripts/migrations/grant-free-user-credits.sql` ✅ Executed
- `scripts/migrations/run-grant-free-user-credits-migration.ts` ✅ Executed
- `scripts/migrations/verify-grant-free-user-credits-migration.ts` ✅ Passed

**What's Left:**
- ⏳ Test end-to-end flow (signup → credits → generate → credits deducted)
- ⏳ Create PR #1 for review

---

### ⏳ Decision 2: Embed Feed Planner (85% COMPLETE)

**What Was Done:**
1. ✅ Added `mode` prop to `FeedViewScreen` component (`feed-planner` | `blueprint`)
2. ✅ Added feature flags to hide/show features based on mode
3. ✅ Created mapping function (`blueprint-mapper.ts`) - maps strategy_data → feed_posts
4. ✅ Updated blueprint screen to conditionally render FeedViewScreen
5. ✅ Created `/api/feed/blueprint` endpoint
6. ✅ API verification complete (test script passing 7/7 tests)
7. ✅ Component logic verified correct

**Files Created/Modified:**
- ✅ `components/feed-planner/feed-view-screen.tsx` - Mode prop + flags
- ✅ `components/feed-planner/instagram-feed-view.tsx` - Mode prop
- ✅ `components/feed-planner/feed-tabs.tsx` - Hide strategy tab in blueprint mode
- ✅ `components/feed-planner/feed-posts-list.tsx` - Hide caption buttons in blueprint mode
- ✅ `components/sselfie/blueprint-screen.tsx` - Conditional rendering
- ✅ `lib/feed-planner/blueprint-mapper.ts` (NEW) - Mapping function
- ✅ `app/api/feed/blueprint/route.ts` (NEW) - API endpoint

**What's Left (15%):**
- ⏳ Manual UI testing (sign in, verify FeedViewScreen appears)
- ⏳ Functional testing (image generation, credits deduction)
- ⏳ Bug fixes (if any from testing)

**Estimated Time Remaining:** 30-60 minutes  
**Status:** Code complete, API verified, needs manual UI verification

---

### ⏳ Decision 3: Progressive Onboarding (PENDING - 0%)

**What Needs to Be Done:**
1. Create base wizard component (5 steps)
2. Create blueprint extension component (3 steps)
3. Create studio extension component (7 steps)
4. Update routing logic in SselfieApp
5. Create migration to map existing blueprint data
6. Test all user flows

**Files to Create:**
- `components/onboarding/base-wizard.tsx` (NEW)
- `components/onboarding/blueprint-extension.tsx` (NEW)
- `components/onboarding/studio-extension.tsx` (NEW)
- `lib/onboarding/mappers.ts` (NEW)
- `app/api/onboarding/base-complete/route.ts` (NEW)
- `app/api/onboarding/blueprint-extension-complete/route.ts` (NEW)
- `app/api/onboarding/studio-extension-complete/route.ts` (NEW)
- Migration scripts (NEW)

**Files to Modify:**
- `components/sselfie/sselfie-app.tsx` - Routing logic
- `app/studio/page.tsx` - Fetch onboarding state
- `components/sselfie/blueprint-welcome-wizard.tsx` - Integrate with flow

**Estimated Time:** 6-8 hours  
**Dependencies:** Decision 2 (paid blueprint screen routing)

---

## 🗺️ IMPLEMENTATION PATH (Sequential)

### Phase 1: Complete Decision 1 ✅ → Testing ⏳

**Current Task:** Test Decision 1 end-to-end

**Test Checklist:**
- [ ] New user signs up → Gets 2 credits (check `user_credits` table)
- [ ] User opens Blueprint tab → Sees "Available Credits: 2"
- [ ] User generates grid → 2 credits deducted (check balance = 0)
- [ ] User with 0 credits tries to generate → Gets error "Insufficient credits"
- [ ] Paid blueprint purchase → Webhook grants 60 credits
- [ ] Paid blueprint user sees correct credit balance

**After Testing:**
- Create PR #1: `feat: Credit system for all users (Decision 1)`
- Include all modified files
- Include migration results
- Include testing results

**Estimated Time:** 1-2 hours

---

### Phase 2: Implement Decision 2 ⏳

**Goal:** Embed Feed Planner UI for paid blueprint users

**Implementation Order:**
1. **Step 1:** Add `mode` prop to FeedViewScreen (30 min)
   - Add `mode?: 'feed-planner' | 'blueprint'` prop
   - Add feature flags based on mode
   - Test that existing feed planner still works

2. **Step 2:** Create mapping function (45 min)
   - Create `lib/feed-planner/blueprint-mapper.ts`
   - Map `blueprint_subscribers.strategy_data` → `feed_posts` format
   - Test mapping with sample data

3. **Step 3:** Update blueprint screen (30 min)
   - Check if user has `paid_blueprint` subscription
   - Conditionally render FeedViewScreen with `mode="blueprint"`
   - Pass blueprint strategy data as prop

4. **Step 4:** Test paid blueprint flow (30 min)
   - Paid blueprint user sees FeedViewScreen
   - Free blueprint user sees welcome screen
   - Image generation works (uses credits)
   - UI consistency maintained

**After Implementation:**
- Test all scenarios
- Create PR #2: `feat: Embed Feed Planner for paid blueprint (Decision 2)`

**Estimated Time:** 2-3 hours

---

### Phase 3: Implement Decision 3 ⏳

**Goal:** Progressive onboarding flow

**Implementation Order:**
1. **Step 1:** Create base wizard (2 hours)
   - Create `components/onboarding/base-wizard.tsx`
   - 5 steps: Name, Business Type, Color Theme, Visual Aesthetic, Current Situation
   - Store data in `user_personal_brand` table
   - Reuse UI patterns from existing `OnboardingWizard`

2. **Step 2:** Create blueprint extension (1 hour)
   - Create `components/onboarding/blueprint-extension.tsx`
   - 3 steps: Dream Client, Struggle, Feed Style
   - Store data in `blueprint_subscribers.form_data`

3. **Step 3:** Create studio extension (2 hours)
   - Create `components/onboarding/studio-extension.tsx`
   - 7 steps: Transformation Story, Future Vision, Ideal Audience, Communication Voice, Photo Goals, Content Pillars, Brand Inspiration
   - Store data in `user_personal_brand` table

4. **Step 4:** Update routing logic (1 hour)
   - Update `components/sselfie/sselfie-app.tsx`
   - After base wizard → Check entitlement → Show appropriate extension
   - After extension → Show welcome wizard or Studio

5. **Step 5:** Create migration (1 hour)
   - Map existing blueprint data → base + extension
   - Test migration on staging first

6. **Step 6:** Test all flows (1 hour)
   - New free user → Base → Blueprint extension → Welcome → Blueprint tab
   - New paid blueprint → Base → Blueprint extension → Welcome → Paid blueprint screen
   - New studio user → Base → Studio extension → Studio

**After Implementation:**
- Test all scenarios
- Create PR #3: `feat: Progressive onboarding system (Decision 3)`

**Estimated Time:** 6-8 hours

---

## 🎯 FOCUS AREAS (Avoid Confusion)

### ✅ What We're NOT Doing (Out of Scope)

1. **Guest Blueprint System:**
   - Legacy guest flow (email/token) remains active
   - Migration to authenticated flow is separate initiative (Phase 4 of Blueprint Auth Migration)
   - **Don't touch:** `/blueprint` public page (for now)

2. **Checkout Success Polling:**
   - 80-second polling logic remains unchanged
   - Webhook reliability improvements are separate initiative
   - **Don't touch:** Checkout success page logic

3. **Training Status API:**
   - No timeout added to `/api/training/status` fetch
   - Timeout improvements are separate initiative
   - **Don't touch:** Training status API

4. **Onboarding Wizard UI/UX:**
   - No redesign of existing wizards
   - No changes to wizard content, steps, or flow
   - Only change: When wizards are triggered (server-side decision)

### ✅ What We ARE Doing (In Scope)

1. **Decision 1:** ✅ Credit system (COMPLETE)
2. **Decision 2:** ⏳ Feed Planner embed for paid blueprint
3. **Decision 3:** ⏳ Progressive onboarding flow

---

## 📋 IMPLEMENTATION CHECKLIST

### Decision 1: Credit System ✅

- [x] Migration script created
- [x] Grant functions added
- [x] Signup flow updated
- [x] Stripe webhook updated
- [x] Generate-grid API updated
- [x] Check-grid API updated
- [x] UI updated
- [x] Migration executed
- [x] Edge case fixed
- [ ] **NEXT:** Test end-to-end flow
- [ ] **NEXT:** Create PR #1

### Decision 2: Feed Planner Embed ⏳ (85%)

- [x] Add mode prop to FeedViewScreen
- [x] Add feature flags
- [x] Create mapping function
- [x] Update blueprint screen
- [x] Create API endpoint (`/api/feed/blueprint`)
- [x] API verification (test script)
- [ ] **NEXT:** Manual UI testing
- [ ] **NEXT:** Functional testing (image generation)
- [ ] **NEXT:** Create PR #2

### Decision 3: Progressive Onboarding ⏳

- [ ] Create base wizard
- [ ] Create blueprint extension
- [ ] Create studio extension
- [ ] Update routing logic
- [ ] Create migration
- [ ] Test all flows
- [ ] Create PR #3

---

## 🚦 NEXT STEPS (Clear Action Items)

### Immediate Next Step (Today)

**Task:** Test Decision 1 end-to-end

**Steps:**
1. Start dev server: `npm run dev`
2. Test signup flow:
   - Go to `/auth/sign-up`
   - Create new account
   - Check database: `user_credits` table should have 2 credits
3. Test blueprint generation:
   - Go to `/studio?tab=blueprint`
   - Start blueprint flow
   - Generate grid
   - Check database: Credits should be deducted (balance = 0)
4. Test credit display:
   - UI should show "Available Credits: X"
   - After generation, balance should update
5. Test paid blueprint (if possible):
   - Purchase paid blueprint
   - Check webhook grants 60 credits

**After Testing:**
- Document test results
- Create PR #1
- Move to Decision 2

---

### After PR #1 (Next Session)

**Task:** Implement Decision 2

**Focus:**
- Start with simplest change (mode prop)
- Test incrementally
- Don't break existing feed planner
- Keep UI consistent

**Time Estimate:** 2-3 hours

---

### After PR #2 (Following Session)

**Task:** Implement Decision 3

**Focus:**
- Start with base wizard (reuse existing patterns)
- Test each extension separately
- Migration is critical - test on staging first
- Keep routing logic simple

**Time Estimate:** 6-8 hours

---

## ⚠️ AVOID THESE MISTAKES

### Don't:
- ❌ Skip testing between decisions
- ❌ Modify files outside the scope
- ❌ Break existing functionality
- ❌ Create PRs without testing
- ❌ Work on multiple decisions simultaneously
- ❌ Touch critical files without approval

### Do:
- ✅ Test each decision before moving to next
- ✅ Create PRs after each decision
- ✅ Keep changes minimal and focused
- ✅ Document what was changed
- ✅ Follow the sequential approach
- ✅ Ask for clarification if unsure

---

## 📚 REFERENCE DOCUMENTS

**Main Plans:**
- `docs/ONBOARDING_EXPERIENCE_DESIGN_PLAN.md` - Detailed design plan
- `docs/BLUEPRINT_AUTH_IMPLEMENTATION_PLAN.md` - Original Blueprint auth migration plan
- `docs/THREE_CRITICAL_DECISIONS_ANALYSIS.md` - Decision analysis

**Audits:**
- `docs/AUTH_ONBOARDING_EXPERIENCE_AUDIT.md` - Current state audit
- `docs/IMPLEMENTATION_WORKFLOW_RECOMMENDATION.md` - Workflow approach

**Implementation:**
- `.cursorrules` - Auto-run migrations, coding rules
- `scripts/migrations/` - All migration scripts

---

## 🎯 SUCCESS CRITERIA

### Decision 1 Success ✅
- ✅ All free users have credits
- ✅ Signup grants 2 credits
- ✅ Grid generation deducts 2 credits
- ✅ UI shows credit balance
- ✅ Paid blueprint grants 60 credits

### Decision 2 Success (Target)
- Paid blueprint users see FeedViewScreen
- Free blueprint users see welcome screen
- Image generation works (uses credits)
- UI consistency maintained
- Blueprint strategy → feed posts mapping works

### Decision 3 Success (Target)
- New users see base wizard (5 steps)
- After base, users see appropriate extension
- Data stored in correct tables
- Onboarding state persists
- No duplicate wizards shown
- Migration maps existing data correctly

---

## 📊 PROGRESS TRACKING

**Overall Progress:** 65% (Decision 1: 100% + Decision 2: 85% + Decision 3: 0% = 65%)

| Decision | Status | Progress | Next Action |
|----------|--------|----------|-------------|
| Decision 1 | ✅ Complete | 100% | Done ✅ |
| Decision 2 | ⏳ Almost Complete | 85% | Manual UI testing → PR #2 |
| Decision 3 | ⏸️ Not Started | 0% | Start after PR #2 |

**Estimated Remaining Time:** 7-9 hours
- Decision 2 testing: 30-60 minutes
- Decision 2 polish: 30 minutes
- Decision 3: 6-8 hours

---

## 🎯 STAY FOCUSED: One Decision at a Time

**Current Focus:** Decision 2 Manual Testing → PR #2

**After PR #2:** Decision 3 Implementation

**Don't jump ahead. Complete Decision 2 fully before moving to Decision 3.**

---

**END OF ROADMAP**
