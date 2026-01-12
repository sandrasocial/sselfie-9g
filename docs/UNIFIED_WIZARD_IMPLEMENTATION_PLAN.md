# Unified Wizard Implementation Plan

## Overview

Create a single onboarding wizard that combines Brand Profile Wizard and Blueprint Onboarding Wizard, saving to `user_personal_brand` as the single source of truth for all users (free, paid, subscription).

---

## Phase 1: Create Unified Wizard Component

### 1.1 Create New Component Structure

**File:** `components/onboarding/unified-onboarding-wizard.tsx`

**Steps:**
1. Create base component structure
2. Define unified step structure (8-10 steps)
3. Combine fields from both wizards
4. Use brand profile wizard as base (more complete)
5. Add blueprint-specific fields (feed style, content skills)

**Step Structure:**
```typescript
const UNIFIED_STEPS = [
  { id: "intro", title: "Welcome", ... },
  { id: "name", title: "What should I call your brand?", field: "name" },
  { id: "business", title: "What do you do?", field: "businessType", isTextarea: true },
  { id: "audience", title: "Who is your ideal audience?", isAudienceBuilder: true },
  { id: "visual", title: "What's your visual style?", isVisualSelector: true },
  { id: "story", title: "What's your story?", field: "transformationStory", isTextarea: true },
  { id: "content", title: "What will you post about?", isContentBuilder: true },
  { id: "communication", title: "How do you communicate?", isCommunicationSelector: true },
  { id: "selfies", title: "Upload your selfies", isSelfieUpload: true },
  { id: "optional", title: "Optional details", isOptional: true },
]
```

**Dependencies:**
- Reuse components from brand profile wizard (audience builder, content pillars, etc.)
- Reuse selfie upload from blueprint wizard (already simplified)
- Create unified form data structure

**Estimated Time:** 4-6 hours

---

### 1.2 Define Unified Form Data Structure

**Fields to Include:**
```typescript
interface UnifiedWizardData {
  // Core (Required)
  name: string
  businessType: string
  idealAudience: string
  audienceChallenge: string
  audienceTransformation: string
  colorTheme: string
  customColors?: string[]
  visualAesthetic: string[]
  feedStyle?: string // Blueprint-specific
  currentSituation: string
  transformationStory: string
  futureVision: string
  contentPillars: any[]
  photoGoals: string
  communicationVoice: string[]
  signaturePhrases?: string
  selfieImages: string[]
  
  // Optional
  fashionStyle?: string[]
  brandInspiration?: string
  inspirationLinks?: string
  
  // Content Skills (Blueprint-specific, can be part of photoGoals)
  lightingKnowledge?: string
  angleAwareness?: string
  editingStyle?: string
  consistencyLevel?: string
  currentSelfieHabits?: string
}
```

**Estimated Time:** 1 hour

---

### 1.3 Implement Step Components

**Steps to Implement:**
1. **Intro Step** - Welcome message (reuse from brand profile)
2. **Name Step** - Simple text input
3. **Business Step** - Textarea (reuse from brand profile)
4. **Audience Step** - Audience builder (reuse from brand profile)
5. **Visual Step** - Color theme + visual aesthetic + feed style selector
6. **Story Step** - Three textareas (situation, transformation, vision)
7. **Content Step** - Content pillars builder + photo goals (reuse from brand profile)
8. **Communication Step** - Voice selector (reuse from brand profile)
9. **Selfie Step** - Selfie upload (reuse from blueprint, already simplified)
10. **Optional Step** - Fashion style + brand inspiration (optional)

**Reusable Components:**
- `components/onboarding/audience-builder.tsx` (from brand profile)
- `components/onboarding/content-pillar-builder.tsx` (from brand profile)
- `components/onboarding/visual-aesthetic-selector.tsx` (from brand profile)
- `components/onboarding/communication-voice-selector.tsx` (from brand profile)
- `components/blueprint/blueprint-selfie-upload.tsx` (already simplified)

**Estimated Time:** 6-8 hours

---

## Phase 2: Update Storage Logic

### 2.1 Create Unified Save API Endpoint

**File:** `app/api/onboarding/unified-onboarding-complete/route.ts`

**Purpose:** Single endpoint that saves all wizard data to `user_personal_brand`

**Logic:**
1. Authenticate user
2. Parse unified wizard data
3. Map all fields to `user_personal_brand` columns
4. Save/update `user_personal_brand` record
5. Mark `is_completed = true`
6. Set `onboarding_completed = true` in `users` table
7. Return success

**Field Mapping:**
```typescript
// Direct mappings
name → user_personal_brand.name
businessType → user_personal_brand.business_type
idealAudience → user_personal_brand.ideal_audience
audienceChallenge → user_personal_brand.audience_challenge
audienceTransformation → user_personal_brand.audience_transformation
colorTheme → user_personal_brand.color_theme
customColors → user_personal_brand.color_palette (JSONB)
visualAesthetic → user_personal_brand.visual_aesthetic (JSONB array)
feedStyle → user_personal_brand.settings_preference (add to array)
currentSituation → user_personal_brand.current_situation
transformationStory → user_personal_brand.transformation_story
futureVision → user_personal_brand.future_vision
contentPillars → user_personal_brand.content_pillars (JSONB)
photoGoals → user_personal_brand.photo_goals
communicationVoice → user_personal_brand.communication_voice (JSONB array)
signaturePhrases → user_personal_brand.signature_phrases
fashionStyle → user_personal_brand.fashion_style (JSONB array)
brandInspiration → user_personal_brand.brand_inspiration
inspirationLinks → user_personal_brand.inspiration_links

// Selfie images already saved to user_avatar_images (no action needed)
```

**Estimated Time:** 3-4 hours

---

### 2.2 Update Blueprint Completion Endpoint

**File:** `app/api/onboarding/blueprint-onboarding-complete/route.ts`

**Changes:**
1. Remove dual storage logic
2. Remove `blueprint_subscribers.form_data` saving
3. Keep only `blueprint_subscribers` record creation (for purchase tracking)
4. Redirect to unified wizard completion endpoint
5. Or: Deprecate this endpoint entirely (if unified wizard replaces it)

**Decision:** Deprecate this endpoint, use unified endpoint instead

**Estimated Time:** 1-2 hours

---

### 2.3 Update Brand Profile Save Endpoint

**File:** `app/api/profile/personal-brand/route.ts`

**Changes:**
1. Verify it saves to `user_personal_brand` correctly
2. Ensure all unified wizard fields are supported
3. Add any missing field mappings
4. Keep backward compatibility for existing brand profile wizard

**Estimated Time:** 1-2 hours

---

## Phase 3: Update Entry Points

### 3.1 Update Free User Flow

**File:** `app/feed-planner/feed-planner-client.tsx`

**Changes:**
1. Replace `BlueprintOnboardingWizard` with `UnifiedOnboardingWizard`
2. Update completion handler
3. Ensure wizard shows for free users without onboarding

**Logic:**
```typescript
// Show unified wizard if:
// - Free user
// - onboarding_completed = false
// - No user_personal_brand record OR is_completed = false
```

**Estimated Time:** 2 hours

---

### 3.2 Update Paid Blueprint User Flow

**File:** `app/feed-planner/feed-planner-client.tsx`

**Changes:**
1. Show unified wizard for paid users without onboarding
2. Skip free example step (they already purchased)
3. Same completion logic as free users

**Logic:**
```typescript
// Show unified wizard if:
// - Paid blueprint user
// - onboarding_completed = false
// - No user_personal_brand record OR is_completed = false
```

**Estimated Time:** 1 hour

---

### 3.3 Update Member/Subscription Flow

**File:** `components/sselfie/sselfie-app.tsx`

**Changes:**
1. Replace `BrandProfileWizard` with `UnifiedOnboardingWizard`
2. Update completion handler
3. Ensure wizard shows for members without onboarding

**Logic:**
```typescript
// Show unified wizard if:
// - Member/subscription user
// - onboarding_completed = false
// - No user_personal_brand record OR is_completed = false
```

**Estimated Time:** 2 hours

---

### 3.4 Update Account Section

**File:** `components/sselfie/personal-brand-section.tsx`

**Changes:**
1. Replace `BrandProfileWizard` with `UnifiedOnboardingWizard`
2. Pre-fill existing data from `user_personal_brand`
3. Allow editing all fields
4. Update save logic to use unified endpoint

**Estimated Time:** 2-3 hours

---

## Phase 4: Data Migration

### 4.1 Create Migration Script

**File:** `scripts/migrations/migrate-blueprint-to-unified-wizard.ts`

**Purpose:** Migrate existing blueprint users' data to `user_personal_brand`

**Logic:**
1. Find all users with `blueprint_subscribers.form_data` but incomplete `user_personal_brand`
2. Extract data from `blueprint_subscribers.form_data` (JSONB)
3. Map fields to `user_personal_brand`:
   - `business` → `business_type`
   - `dreamClient` → `target_audience` (or `ideal_audience`)
   - `vibe` → `brand_vibe` + `visual_aesthetic`
   - `feedStyle` → `settings_preference`
   - Combine content skills → `photo_goals`
4. Create/update `user_personal_brand` record
5. Mark migration complete

**Estimated Time:** 3-4 hours

---

### 4.2 Create Migration Verification Script

**File:** `scripts/migrations/verify-unified-wizard-migration.ts`

**Purpose:** Verify migration completed successfully

**Checks:**
1. All blueprint users have `user_personal_brand` records
2. All required fields are populated
3. Data integrity checks
4. Report any missing/incomplete data

**Estimated Time:** 1-2 hours

---

## Phase 5: Update Maya Context

### 5.1 Verify Maya Context Function

**File:** `lib/maya/get-user-context.ts`

**Changes:**
1. Verify all unified wizard fields are included
2. Ensure feed style is included in settings_preference
3. Test with unified wizard data
4. Add any missing field mappings

**Estimated Time:** 1-2 hours

---

### 5.2 Update Feed Planner Context

**File:** `lib/feed-planner/orchestrator.ts`

**Changes:**
1. Verify it reads from `user_personal_brand` correctly
2. Ensure feed style is used from `settings_preference`
3. Test with unified wizard data

**Estimated Time:** 1 hour

---

## Phase 6: Testing

### 6.1 Unit Tests

**Tests to Create:**
1. Unified wizard component rendering
2. Form data validation
3. Step navigation
4. Save API endpoint
5. Field mapping logic

**Estimated Time:** 4-6 hours

---

### 6.2 Integration Tests

**Tests to Create:**
1. Free user flow (wizard → feed planner)
2. Paid user flow (wizard → feed planner)
3. Member flow (wizard → Maya chat)
4. Account section editing
5. Maya context generation

**Estimated Time:** 4-6 hours

---

### 6.3 E2E Tests

**Scenarios:**
1. New free user completes unified wizard
2. New paid user completes unified wizard
3. New member completes unified wizard
4. Existing user edits wizard in account section
5. Maya uses unified wizard context correctly
6. Feed planner uses unified wizard context correctly

**Estimated Time:** 4-6 hours

---

## Phase 7: Cleanup

### 7.1 Remove Old Components

**Files to Remove:**
- `components/onboarding/blueprint-onboarding-wizard.tsx` (replaced by unified)
- Keep `components/sselfie/brand-profile-wizard.tsx` temporarily (for backward compatibility)

**Decision:** Keep brand profile wizard for now, mark as deprecated, remove later

**Estimated Time:** 1 hour

---

### 7.2 Remove Dual Storage Logic

**Files to Update:**
- `app/api/onboarding/blueprint-onboarding-complete/route.ts` (remove form_data saving)
- Any other files that save to `blueprint_subscribers.form_data`

**Estimated Time:** 2-3 hours

---

### 7.3 Update Documentation

**Files to Update:**
- `docs/WIZARD_UNIFICATION_AUDIT.md` (mark as implemented)
- `docs/FEED_PLANNER_CONSOLIDATION_IMPLEMENTATION_PLAN.md` (update wizard references)
- Create `docs/UNIFIED_WIZARD_GUIDE.md` (user guide)

**Estimated Time:** 2-3 hours

---

## Implementation Order

### Week 1: Foundation
1. ✅ Phase 1.1: Create unified wizard component structure
2. ✅ Phase 1.2: Define unified form data structure
3. ✅ Phase 1.3: Implement step components (steps 1-5)

### Week 2: Core Functionality
4. ✅ Phase 1.3: Implement step components (steps 6-10)
5. ✅ Phase 2.1: Create unified save API endpoint
6. ✅ Phase 2.2: Update blueprint completion endpoint
7. ✅ Phase 2.3: Update brand profile save endpoint

### Week 3: Integration
8. ✅ Phase 3.1: Update free user flow
9. ✅ Phase 3.2: Update paid blueprint user flow
10. ✅ Phase 3.3: Update member/subscription flow
11. ✅ Phase 3.4: Update account section

### Week 4: Migration & Testing
12. ✅ Phase 4.1: Create migration script
13. ✅ Phase 4.2: Create migration verification script
14. ✅ Phase 5.1: Verify Maya context function
15. ✅ Phase 5.2: Update feed planner context
16. ✅ Phase 6.1-6.3: Testing (unit, integration, E2E)

### Week 5: Cleanup & Launch
17. ✅ Phase 7.1: Remove old components
18. ✅ Phase 7.2: Remove dual storage logic
19. ✅ Phase 7.3: Update documentation
20. ✅ Final testing and bug fixes
21. ✅ Deploy to production

---

## Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Create backup before migration
- Run migration in staging first
- Verify all data migrated correctly
- Keep `blueprint_subscribers.form_data` as backup (don't delete immediately)

### Risk 2: Breaking Existing Users
**Mitigation:**
- Keep old wizards temporarily (deprecated, not removed)
- Gradual rollout (feature flag)
- Monitor for errors
- Quick rollback plan

### Risk 3: Incomplete Field Mapping
**Mitigation:**
- Comprehensive field mapping table
- Test with real user data
- Verify Maya context includes all fields
- Add missing fields if needed

### Risk 4: Performance Issues
**Mitigation:**
- Optimize API queries
- Add caching where appropriate
- Test with large datasets
- Monitor performance metrics

---

## Success Criteria

### Functional
- ✅ All users (free, paid, subscription) use unified wizard
- ✅ All wizard data saves to `user_personal_brand` only
- ✅ Maya has complete context from unified wizard
- ✅ Feed planner uses unified wizard context
- ✅ Account section allows editing unified wizard
- ✅ No data loss during migration

### Technical
- ✅ Single source of truth (`user_personal_brand`)
- ✅ No dual storage
- ✅ Clean, maintainable code
- ✅ All tests passing
- ✅ No breaking changes for existing users

### User Experience
- ✅ Consistent onboarding experience
- ✅ No duplicate questions
- ✅ Can edit wizard later
- ✅ Progressive disclosure (core → optional)
- ✅ Clear, friendly language

---

## Dependencies

### External
- None

### Internal
- `user_personal_brand` table (already exists)
- `user_avatar_images` table (already exists)
- Maya context system (already exists)
- Feed planner orchestrator (already exists)

---

## Estimated Total Time

**Development:** 40-50 hours
**Testing:** 12-18 hours
**Migration:** 4-6 hours
**Documentation:** 2-3 hours
**Total:** 58-77 hours (~2-3 weeks)

---

## Next Steps

1. **Review this plan** with team
2. **Approve approach** and timeline
3. **Start Phase 1.1** - Create unified wizard component structure
4. **Set up feature flag** for gradual rollout
5. **Create migration scripts** early (test in staging)

---

## Questions to Resolve

1. **Should we keep `blueprint_subscribers.form_data` as backup?**
   - Recommendation: Keep for 30 days, then remove

2. **Feature flag approach?**
   - Recommendation: Gradual rollout (10% → 50% → 100%)

3. **Backward compatibility?**
   - Recommendation: Keep old wizards deprecated for 1 month, then remove

4. **Migration timing?**
   - Recommendation: Run migration after unified wizard is live for 1 week
