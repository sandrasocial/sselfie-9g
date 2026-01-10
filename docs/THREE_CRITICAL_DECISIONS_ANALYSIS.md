# Three Critical Decisions Analysis

**Date:** 2026-01-XX  
**Objective:** Analyze three key architectural decisions before implementation plan approval  
**Based on:** Current codebase audit and user requirements

---

## Decision 1: Credit System for Free & Blueprint Users

### Current State

**Free Users:**
- NO credits system
- Blueprint uses quota-based tracking (`free_grid_used_count`, `free_grid_used_at`)
- One free grid generation allowed (tracked in `blueprint_subscribers`)
- No credit checks or deductions for free blueprint

**Paid Users:**
- Credit system (`user_credits` table, `credit_transactions` table)
- Studio Membership: 200 credits/month (`SUBSCRIPTION_CREDITS.sselfie_studio_membership`)
- One-Time Session: 50 credits (`SUBSCRIPTION_CREDITS.one_time_session`)
- Credit costs: Training (20), Image (1), Animation (3)

**Evidence:**
- `lib/credits.ts`: Credit system fully implemented with `checkCredits()`, `deductCredits()`, `addCredits()`
- `app/api/blueprint/generate-grid/route.ts`: Uses quota tracking, NOT credits
- `app/api/feed-planner/create-strategy/route.ts`: Uses credit system (`checkCredits()`, `deductCredits()`)
- `app/api/maya/generate-image/route.ts`: Uses credit system

### Option A: Keep As Is (Quota-Based for Free)

**How it works:**
- Free blueprint: `free_grid_used_count` in `blueprint_subscribers`
- Paid blueprint: `paid_grids_generated` in `blueprint_subscribers`
- Studio/Membership: Credit system

**Pros:**
- ✅ Simple for free users (no concept of credits needed)
- ✅ No credit initialization required for free users
- ✅ Faster checks (direct DB column vs credit balance lookup)
- ✅ Clear separation: Free = quota, Paid = credits
- ✅ Less cognitive load for free users

**Cons:**
- ❌ Two systems to maintain (quota + credits)
- ❌ Inconsistent experience (quota vs credits)
- ❌ Free → Paid upgrade requires understanding credits
- ❌ Harder to upsell (free users don't see credit value)

### Option B: Grant Credits to All Users

**How it would work:**
- Free users: 2 credits on signup (enough for 1 free grid = 2 images × 1 credit)
- Paid blueprint users: 60 credits (30 grids × 2 credits = 60 credits)
- Studio/Membership: Existing credit system (200/month, 50 one-time)

**Pros:**
- ✅ Single unified system (credits everywhere)
- ✅ Consistent experience (all users understand credits)
- ✅ Easier upsell (free users see "2 credits" → "Get more!")
- ✅ Simpler codebase (remove quota tracking code)
- ✅ Better analytics (unified credit usage tracking)
- ✅ Flexible (can adjust free credits later)

**Cons:**
- ❌ More complexity for free users (must understand credits)
- ❌ Credit initialization overhead (create `user_credits` row for every user)
- ❌ Migration needed (existing free users need credits granted)
- ❌ Potential for confusion ("I only have 2 credits?")

### Recommendation: **Option B (Grant Credits to All Users)**

**Reasoning:**
1. **Simplest long-term:** One system instead of two
2. **Better funnel:** Free users see value of credits → easier upsell
3. **Consistency:** All users understand the same model
4. **Code reduction:** Remove quota tracking (`free_grid_used_count`, `paid_grids_generated`)
5. **Scalability:** Easy to adjust free credits (e.g., 2 → 5 for promotions)

**Implementation:**
- Grant 2 credits to all new free users on signup
- Grant 60 credits to paid blueprint purchasers
- Migrate existing free users: Grant 2 credits if `free_grid_used_count = 0`, grant 0 if already used
- Update blueprint generation: Use `checkCredits()` instead of quota checks
- Remove quota columns after migration (optional, can deprecate)

---

## Decision 2: Paid Blueprint Screen Design

### Current State

**Feed Planner:**
- Full UI with tabs: Grid, Posts, Strategy
- Generates: Strategy + Captions + Images
- Uses: Credit system, brand profile (`user_personal_brand`)
- Location: `/feed-planner?feedId=123`
- Components: `FeedViewScreen`, `InstagramFeedView`, `FeedPostCard`, `FeedGrid`
- Features: Image generation per post, caption editing, strategy viewing, drag-and-drop reordering

**Blueprint (Free):**
- Simple linear flow: Form → Strategy → Grid Generation
- Generates: Strategy (concept) → Single 3x3 grid image (split into 9 frames)
- Uses: Quota tracking, form data (`blueprint_subscribers.form_data`)
- Location: `/blueprint?email=...&token=...`
- Components: `BrandBlueprintPageClient`, `BlueprintConceptCard`, `BlueprintSelfieUpload`

**Evidence:**
- `components/feed-planner/feed-view-screen.tsx`: Full feed planner UI
- `components/feed-planner/instagram-feed-view.tsx`: Grid view with tabs
- `app/blueprint/page-client.tsx`: Simple linear blueprint flow
- `app/api/feed-planner/create-strategy/route.ts`: Generates strategy + captions + images
- `app/api/blueprint/generate-grid/route.ts`: Generates single 3x3 grid image

### Option A: Embed Feed Planner with Feature Flag

**How it would work:**
- Use existing `FeedViewScreen` component
- Feature flag: `isBlueprintMode` (disable caption generation, strategy regeneration)
- Reuse: Grid UI, image generation, post cards
- Customize: Use blueprint strategy data, store in `feed_posts` table
- Image generation: Same as feed planner (per-post generation)

**Pros:**
- ✅ Maximum code reuse (same UI, same logic)
- ✅ UI consistency (same design across free/paid blueprint)
- ✅ Easier maintenance (one codebase for feed UI)
- ✅ Feature parity (paid blueprint gets all feed planner features)
- ✅ Faster implementation (reuse existing components)

**Cons:**
- ❌ Over-engineering (feed planner has features not needed for blueprint)
- ❌ Potential confusion (tabs for "Strategy" when strategy already exists)
- ❌ Feature flag complexity (need to disable features properly)
- ❌ Data model mismatch (blueprint strategy format vs feed strategy format)

### Option B: Create Minimal Blueprint-Specific Screen

**How it would work:**
- New component: `BlueprintPaidScreen`
- Reuse: `FeedGrid`, `FeedPostCard` (UI components only)
- Custom: Blueprint-specific flow (show strategy, generate images per post)
- Simplified: No caption generation, no strategy regeneration, no tabs
- Storage: Use existing `blueprint_subscribers` for strategy, generate images on-demand

**Pros:**
- ✅ Purpose-built (only features needed for paid blueprint)
- ✅ Simpler UX (no unnecessary features)
- ✅ Clear mental model (blueprint = strategy + images, not full feed planner)
- ✅ Less confusion (no "Strategy" tab when strategy is already shown)

**Cons:**
- ❌ Code duplication (must recreate grid UI, post cards)
- ❌ Maintenance burden (two codebases for similar features)
- ❌ Inconsistent UI (risk of design drift)

### Recommendation: **Option A (Embed Feed Planner with Feature Flag)**

**Reasoning:**
1. **Maximum reuse:** Feed Planner UI is already built and tested
2. **UI consistency:** Same design language across all feeds
3. **Future-proof:** Paid blueprint users get feed planner features automatically
4. **Simpler maintenance:** One codebase instead of two
5. **Faster implementation:** Reuse components with feature flags

**Implementation:**
- Add `mode?: 'feed-planner' | 'blueprint'` prop to `FeedViewScreen`
- Feature flags:
  - `showCaptionGeneration: false` (blueprint mode)
  - `showStrategyTab: false` (blueprint mode, strategy shown separately)
  - `allowStrategyRegeneration: false` (blueprint mode)
- Map blueprint strategy → feed posts format
- Store images in `feed_posts` table (reuse existing schema)
- Use blueprint strategy data from `blueprint_subscribers.strategy_data`

**Feature Flag Example:**
```typescript
<FeedViewScreen
  feedId={feedId}
  mode="blueprint"
  blueprintStrategy={blueprintStrategy}
  blueprintConfig={{
    showCaptionGeneration: false,
    showStrategyTab: false,
    allowStrategyRegeneration: false,
    imageGenerationOnly: true
  }}
/>
```

---

## Decision 3: Onboarding Wizard Unification

### Current State

**Brand Profile Wizard (Paid Users):**
- 12 steps: Name, Business Type, Color Theme, Visual Aesthetic, Current Situation, Transformation Story, Future Vision, Ideal Audience, Communication Voice, Photo Goals, Content Pillars, Brand Inspiration
- Stores: `user_personal_brand` table (structured columns)
- Purpose: Provides context for Maya AI chat
- Location: `components/sselfie/brand-profile-wizard.tsx`
- Used by: Paid users in Studio (via `PersonalBrandSection`)

**Blueprint Form (Free Users):**
- ~8 questions: Business, Dream Client, Struggle, Feed Style, Post Frequency, Selfie Skills, Lighting Knowledge, Angle Awareness
- Stores: `blueprint_subscribers.form_data` (JSONB)
- Purpose: Generates blueprint strategy
- Location: `app/blueprint/page-client.tsx`
- Used by: Free blueprint users

**Overlap:**
- Both collect: Business type, target audience (dream client vs ideal audience), current situation (struggle)
- Both purpose: Gather context for AI generation
- Both stored: Different tables/structures

**Evidence:**
- `components/sselfie/brand-profile-wizard.tsx`: 12-step wizard
- `lib/maya/get-user-context.ts`: Uses `user_personal_brand` for Maya context
- `app/blueprint/page-client.tsx`: Form questions
- `app/api/blueprint/generate-concepts/route.ts`: Uses `blueprint_subscribers.form_data`
- `app/api/feed-planner/create-strategy/route.ts`: Requires `user_personal_brand` (line 75-85)

### Option A: Unified Onboarding Wizard for All Users

**How it would work:**
- Single wizard: All users complete brand profile wizard first
- Location: First screen after signup (before Studio access)
- Storage: `user_personal_brand` table (single source of truth)
- Routing: After completion, route to appropriate screen:
  - Free users → Blueprint welcome screen
  - Paid blueprint → Paid blueprint screen
  - Studio membership → Studio (Maya chat)
- Migration: Map blueprint form data → brand profile fields

**Pros:**
- ✅ Single source of truth (`user_personal_brand` everywhere)
- ✅ Consistent context gathering (all users get same questions)
- ✅ Better AI context (Maya gets full context for all users)
- ✅ Simpler codebase (one onboarding flow)
- ✅ Future-proof (new features automatically get context)

**Cons:**
- ❌ Longer onboarding (12 steps vs 8 questions)
- ❌ Higher drop-off risk (more questions = more abandonment)
- ❌ Some questions irrelevant for free users (e.g., content pillars, brand inspiration)
- ❌ UX friction (free users must complete full wizard before blueprint)

### Option B: Keep Separate, Sync Data

**How it would work:**
- Brand Profile Wizard: Paid users (Studio access)
- Blueprint Form: Free users (Blueprint access)
- Sync: When free user upgrades → Map blueprint form data → brand profile
- Storage: Both tables exist, sync on upgrade

**Pros:**
- ✅ Faster onboarding for free users (shorter form)
- ✅ Lower drop-off (fewer questions)
- ✅ Purpose-specific (each form collects what's needed)
- ✅ Better UX (free users don't see irrelevant questions)

**Cons:**
- ❌ Two systems to maintain
- ❌ Data duplication (same info in two places)
- ❌ Sync complexity (must map on upgrade)
- ❌ Context gaps (Maya doesn't have full context for free users)

### Option C: Progressive Onboarding (Unified Base + Extensions)

**How it would work:**
- Base wizard (5 steps): Name, Business Type, Color Theme, Visual Aesthetic, Current Situation
  - ALL users complete this first
- Extension A (Blueprint): Dream Client, Struggle, Feed Style (blueprint-specific)
- Extension B (Studio): Transformation Story, Future Vision, Ideal Audience, Communication Voice, Photo Goals, Content Pillars, Brand Inspiration (studio-specific)
- Storage: `user_personal_brand` (base) + `blueprint_subscribers.form_data` (blueprint extensions)
- Routing: After base → route based on product (blueprint vs studio)

**Pros:**
- ✅ Best of both worlds (shared base + product-specific)
- ✅ Faster for free users (5 steps vs 12)
- ✅ Single source for core data (`user_personal_brand`)
- ✅ Flexible (can add extensions later)
- ✅ Better context (Maya gets base context for all users)

**Cons:**
- ❌ More complex (base + extensions)
- ❌ Still some duplication (blueprint extensions in `form_data`)
- ❌ Routing complexity (must determine which extension to show)

### Recommendation: **Option C (Progressive Onboarding)**

**Reasoning:**
1. **Balanced:** Fast onboarding for free users (5 steps) + full context for paid users
2. **Single source:** Core data in `user_personal_brand` (used by Maya)
3. **Flexible:** Extensions allow product-specific questions
4. **Future-proof:** Easy to add new extensions for new products
5. **Better AI context:** Maya gets base context for all users, full context for paid users

**Implementation:**
- Extract base wizard: 5 core steps (Name, Business Type, Color Theme, Visual Aesthetic, Current Situation)
- Store base in `user_personal_brand` (structured columns)
- Blueprint extension: 3 additional questions (Dream Client, Struggle, Feed Style)
- Store blueprint extensions in `blueprint_subscribers.form_data` (JSONB)
- After base completion:
  - Free users → Blueprint extension → Blueprint welcome screen
  - Paid blueprint → Blueprint extension → Paid blueprint screen
  - Studio membership → Studio extension → Studio (Maya chat)
- Migration: Map existing blueprint form data → base + extension

**Wizard Structure:**
```
Base Wizard (ALL USERS - 5 steps):
  1. Name
  2. Business Type
  3. Color Theme
  4. Visual Aesthetic
  5. Current Situation

Blueprint Extension (BLUEPRINT USERS - 3 steps):
  6. Dream Client
  7. Struggle
  8. Feed Style

Studio Extension (STUDIO USERS - 7 steps):
  6. Transformation Story
  7. Future Vision
  8. Ideal Audience
  9. Communication Voice
  10. Photo Goals
  11. Content Pillars
  12. Brand Inspiration
```

---

## Summary Table

| Decision | Option | Recommendation | Reasoning |
|----------|--------|----------------|-----------|
| **Credit System** | A: Keep Quota | ❌ | Two systems to maintain |
| | **B: Grant Credits** | ✅ **RECOMMENDED** | Single system, better funnel, easier upsell |
| **Blueprint Screen** | A: Embed Feed Planner | ✅ **RECOMMENDED** | Maximum reuse, UI consistency, faster implementation |
| | B: Create New Screen | ❌ | Code duplication, maintenance burden |
| **Onboarding** | A: Unified Wizard | ❌ | Too long for free users, higher drop-off |
| | B: Keep Separate | ❌ | Two systems, data duplication |
| | **C: Progressive** | ✅ **RECOMMENDED** | Balanced, single source for core data, flexible |

---

## Next Steps

1. **Confirm decisions:** Review recommendations with Sandra
2. **Update implementation plan:** Incorporate approved decisions into `ONBOARDING_EXPERIENCE_DESIGN_PLAN.md`
3. **Phase implementation:** Plan migration strategy for each decision
4. **Test scenarios:** Document test cases for each decision

---

**Notes:**
- All recommendations prioritize: Simplification, code reuse, consistency
- Decisions assume: All users eventually need context for AI (Maya)
- Future consideration: Blueprint may merge into Studio as a feature, not separate product
