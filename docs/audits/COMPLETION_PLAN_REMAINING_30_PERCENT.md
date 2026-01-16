# Dynamic Template System - Completion Plan (Remaining 30%)

**Date:** 2025-01-11  
**Status:** Implementation Plan for Remaining Work  
**Current Completion:** ~70%  
**Target Completion:** 100%

---

## EXECUTIVE SUMMARY

### Remaining Work Breakdown

| Category | Current | Target | Gap | Priority |
|----------|---------|--------|-----|----------|
| **Location Rotation Fix** | ❌ Broken | ✅ Working | Critical Bug | 🔴 **P0** |
| **Athletic Outfits** | 1 per vibe | 3 per vibe | 36 outfits | 🔴 **P0** |
| **Bohemian/Classic/Trendy** | 1-2 per vibe | 3 per vibe | ~72 outfits | 🔴 **P1** |
| **Business/Casual** | 1-4 per vibe | 4 per vibe | ~36 outfits | 🟡 **P2** |
| **Migration Verification** | Unknown | Verified | Status Check | 🔴 **P0** |
| **Feed Creation Integration** | Different | Aligned | Documentation | 🟡 **P2** |
| **Comprehensive Testing** | 30% | 100% | Test Suite | 🟡 **P2** |

### Total Work Estimate

- **Critical Fixes (P0):** 2-3 days
- **High Priority (P1):** 1-2 weeks
- **Medium Priority (P2):** 1 week
- **Total:** ~3-4 weeks to 100% completion

---

## PHASE 1: CRITICAL FIXES (P0) - Week 1

### Task 1.1: Fix Location Rotation Bug

**Priority:** 🔴 **P0 - CRITICAL**

**File:** `lib/feed-planner/dynamic-template-injector.ts`

**Current Issue:**
- Outdoor/indoor locations don't rotate (always use first/second/third)
- Filtering happens after rotation, ignoring rotation index

**Fix Required:**

**Step 1:** Update `buildPlaceholders()` function (Lines 173-202)

**Before:**
```typescript
// ❌ WRONG: Filters full array, then uses first/second/third
const outdoorLocations = locations.filter(l => l.setting === 'outdoor')
const indoorLocations = locations.filter(l => l.setting === 'indoor')

LOCATION_OUTDOOR_1: outdoorLocations[0]  // Always first
LOCATION_INDOOR_1: indoorLocations[0]    // Always first
```

**After:**
```typescript
// ✅ CORRECT: Filter first, then apply rotation
const outdoorLocations = locations.filter(l => l.setting === 'outdoor')
const indoorLocations = locations.filter(l => l.setting === 'indoor')

// Apply rotation to filtered arrays
const outdoorIndex = locationIndex % (outdoorLocations.length || 1)
const indoorIndex = locationIndex % (indoorLocations.length || 1)

LOCATION_OUTDOOR_1: outdoorLocations.length > 0
  ? formatLocationForFrameType(outdoorLocations[outdoorIndex], frameType)
  : formatLocationForFrameType(location1, frameType),

LOCATION_INDOOR_1: indoorLocations.length > 0
  ? formatLocationForFrameType(indoorLocations[indoorIndex], frameType)
  : formatLocationForFrameType(location1, frameType),

LOCATION_INDOOR_2: indoorLocations.length > 1
  ? formatLocationForFrameType(indoorLocations[(indoorIndex + 1) % indoorLocations.length], frameType)
  : formatLocationForFrameType(location2, frameType),

LOCATION_INDOOR_3: indoorLocations.length > 2
  ? formatLocationForFrameType(indoorLocations[(indoorIndex + 2) % indoorLocations.length], frameType)
  : formatLocationForFrameType(location3, frameType),
```

**Step 2:** Test rotation
- Generate feed 1: Verify locations used
- Generate feed 2: Verify different locations used
- Generate feed 3: Verify rotation continues

**Step 3:** Update rotation increment logic (if needed)
- Current: Increments by 3
- Consider: Increment by number of unique placeholders used (5: outdoor_1, indoor_1, indoor_2, indoor_3, architectural_1)

**Estimated Time:** 2-3 hours

**Acceptance Criteria:**
- [ ] Outdoor locations rotate across feeds
- [ ] Indoor locations rotate across feeds
- [ ] Architectural location continues to rotate
- [ ] Fallback logic works when no outdoor/indoor locations exist
- [ ] Test with 3+ consecutive feeds shows variety

---

### Task 1.2: Verify Migration Status

**Priority:** 🔴 **P0 - CRITICAL**

**File:** `scripts/migrations/create-user-feed-rotation-state.sql`

**Step 1:** Check if table exists

**SQL Query:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'user_feed_rotation_state'
);
```

**Step 2:** If table doesn't exist, run migration

**Command:**
```bash
# Option A: Direct SQL execution
psql $DATABASE_URL -f scripts/migrations/create-user-feed-rotation-state.sql

# Option B: Via TypeScript runner (if exists)
npx tsx scripts/migrations/run-create-user-feed-rotation-state-migration.ts
```

**Step 3:** Verify table structure

**SQL Query:**
```sql
\d user_feed_rotation_state
```

**Step 4:** Verify indexes exist

**SQL Query:**
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'user_feed_rotation_state';
```

**Expected Indexes:**
- `idx_user_feed_rotation_user_id`
- `idx_user_feed_rotation_vibe`
- `idx_user_feed_rotation_fashion_style`
- `idx_user_feed_rotation_composite`

**Step 5:** Test rotation persistence

**Test Script:**
```typescript
// test-rotation-persistence.ts
import { getRotationState, incrementRotationState } from '@/lib/feed-planner/rotation-manager'

const userId = 'test-user'
const vibe = 'luxury_dark_moody'
const style = 'business'

// Get initial state
let state = await getRotationState(userId, vibe, style)
console.log('Initial:', state)

// Increment
await incrementRotationState(userId, vibe, style)

// Get updated state (should be different)
state = await getRotationState(userId, vibe, style)
console.log('After increment:', state)
// Should show: outfit_index=4, location_index=3, accessory_index=2
```

**Estimated Time:** 1-2 hours

**Acceptance Criteria:**
- [ ] Table exists in database
- [ ] All indexes created
- [ ] Rotation state persists across sessions
- [ ] Increment works correctly
- [ ] Test script passes

---

### Task 1.3: Add Athletic Outfits (Phase 1 - Priority Vibes)

**Priority:** 🔴 **P0 - CRITICAL**

**File:** `lib/styling/vibe-libraries.ts`

**Target:** Add 2 more athletic outfits to 6 priority vibes (12 total)

**Priority Vibes:**
1. professional_light_minimalistic
2. professional_beige_aesthetic
3. luxury_light_minimalistic
4. luxury_beige_aesthetic
5. minimal_light_minimalistic
6. minimal_beige_aesthetic

**For Each Vibe:**

**Step 1:** Locate athletic style array

**Step 2:** Add 2 new athletic outfit formulas

**Example (professional_light_minimalistic):**
```typescript
athletic: [
  {
    id: 'prof_light_ath_001',  // Existing
    name: 'Professional Athleisure',
    description: 'White athletic set, cream blazer, nude sneakers',
    pieces: ['white athletic set', 'cream blazer', 'nude designer sneakers'],
    occasion: 'professional athleisure, clean active',
    brands: ['Alo', 'Lululemon', 'The Row']
  },
  {
    id: 'prof_light_ath_002',  // NEW
    name: 'Bright Active Luxe',
    description: 'Cream leggings, white ribbed top, oversized white hoodie, gold watch',
    pieces: ['cream high-waisted leggings', 'white ribbed sports bra', 'oversized white cashmere hoodie', 'nude athletic sneakers', 'gold minimalist watch'],
    occasion: 'post-workout luxury, active lifestyle',
    brands: ['Alo', 'The Row', 'Outdoor Voices']
  },
  {
    id: 'prof_light_ath_003',  // NEW
    name: 'White Athletic Dress',
    description: 'White athletic dress, cream bomber jacket, white sneakers, tan leather gym bag',
    pieces: ['white athletic dress', 'cream bomber jacket', 'white designer sneakers', 'tan leather gym bag'],
    occasion: 'athleisure lifestyle, luxury active',
    brands: ['Alo', 'The Row', 'Lululemon']
  }
]
```

**Guidelines:**
- Match vibe aesthetic (bright/clean for light vibes, warm for beige vibes)
- Use appropriate brands (Alo, Lululemon, The Row for luxury/professional)
- Ensure variety: different silhouettes (set, leggings+top, dress, joggers+jacket)
- Different occasions (gym, post-workout, lifestyle, weekend)

**Estimated Time:** 4-6 hours (2 hours per vibe × 3 vibes, or batch process)

**Acceptance Criteria:**
- [ ] Each priority vibe has 3 athletic outfits
- [ ] Outfits match vibe aesthetic
- [ ] Brands are appropriate
- [ ] Variety in silhouettes and occasions
- [ ] No duplicates

---

## PHASE 2: HIGH PRIORITY (P1) - Week 2-3

### Task 2.1: Add Athletic Outfits (Phase 2 - Remaining Vibes)

**Priority:** 🔴 **P1 - HIGH**

**Target:** Add 2 more athletic outfits to remaining 12 vibes (24 total)

**Remaining Vibes:**
7. professional_dark_moody
8. luxury_dark_moody
9. minimal_dark_moody
10. beige_beige_aesthetic
11. beige_light_minimalistic
12. warm_beige_aesthetic
13. beige_dark_moody
14. warm_light_minimalistic
15. warm_dark_moody
16. edgy_light_minimalistic
17. edgy_beige_aesthetic
18. edgy_dark_moody

**Process:** Same as Task 1.3, but for remaining vibes

**Estimated Time:** 8-12 hours (1 hour per vibe)

**Acceptance Criteria:**
- [ ] All 18 vibes have 3 athletic outfits
- [ ] Outfits match each vibe's aesthetic
- [ ] Variety maintained across all vibes

---

### Task 2.2: Add Bohemian Outfits

**Priority:** 🔴 **P1 - HIGH**

**Target:** Add 1-2 more bohemian outfits to each of 18 vibes (~27 total)

**Current State:**
- luxury_dark_moody: 2 outfits (needs 1 more)
- All other 17 vibes: 1 outfit (need 2 more each)

**For Each Vibe:**

**Step 1:** Locate bohemian style array

**Step 2:** Add 1-2 new bohemian outfit formulas

**Example (luxury_light_minimalistic):**
```typescript
bohemian: [
  {
    id: 'lux_light_boh_001',  // Existing
    name: 'White Flowy Maxi',
    description: 'White maxi dress, minimal gold jewelry, sandals',
    pieces: ['white flowy maxi dress', 'minimal gold jewelry', 'nude sandals'],
    occasion: 'gallery, brunch, casual',
    brands: ['Free People', 'Anthropologie', 'The Row']
  },
  {
    id: 'lux_light_boh_002',  // NEW
    name: 'Cream Midi Dress',
    description: 'Cream midi dress with flowy sleeves, layered gold necklaces, white sandals',
    pieces: ['cream midi dress', 'layered gold necklaces', 'white sandals', 'gold cuffs'],
    occasion: 'brunch, casual event, gallery',
    brands: ['Free People', 'Anthropologie', 'The Row']
  },
  {
    id: 'lux_light_boh_003',  // NEW
    name: 'Ivory Layered Look',
    description: 'Ivory kimono cardigan, white slip dress, gold jewelry, beige sandals',
    pieces: ['ivory kimono cardigan', 'white slip dress', 'layered gold jewelry', 'beige sandals'],
    occasion: 'evening casual, creative gathering',
    brands: ['Free People', 'Anthropologie']
  }
]
```

**Guidelines:**
- Match vibe aesthetic (light colors for light vibes, dark for dark vibes, warm for beige/warm vibes)
- Use boho brands (Free People, Anthropologie) + high-end for luxury vibes
- Variety: maxi dress, midi dress, separates, layered look
- Different occasions: gallery, brunch, evening, casual

**Estimated Time:** 12-18 hours (1 hour per vibe)

**Acceptance Criteria:**
- [ ] All 18 vibes have 3 bohemian outfits
- [ ] Outfits match vibe aesthetic
- [ ] Variety in dress styles and occasions

---

### Task 2.3: Add Classic Outfits

**Priority:** 🔴 **P1 - HIGH**

**Target:** Add 1-2 more classic outfits to each of 18 vibes (~27 total)

**Current State:**
- luxury_dark_moody: 2 outfits (needs 1 more)
- All other 17 vibes: 1 outfit (need 2 more each)

**For Each Vibe:**

**Step 1:** Locate classic style array

**Step 2:** Add 1-2 new classic outfit formulas

**Example (luxury_light_minimalistic):**
```typescript
classic: [
  {
    id: 'lux_light_cla_001',  // Existing
    name: 'Timeless White',
    description: 'Classic white blazer, cream blouse, white trousers, pumps',
    pieces: ['classic white blazer', 'cream silk blouse', 'white tailored trousers', 'nude pumps'],
    occasion: 'timeless elegance, refined setting',
    brands: ['The Row', 'Toteme', 'Khaite']
  },
  {
    id: 'lux_light_cla_002',  // NEW
    name: 'Cream Coat Classic',
    description: 'Cream wool coat, white sweater, beige trousers, tan boots',
    pieces: ['cream wool coat', 'white cashmere sweater', 'beige trousers', 'tan leather boots'],
    occasion: 'classic elegance, refined setting',
    brands: ['The Row', 'Toteme']
  },
  {
    id: 'lux_light_cla_003',  // NEW
    name: 'Sophisticated Suit',
    description: 'Ivory suit, cream blouse, nude heels, gold jewelry',
    pieces: ['ivory tailored suit', 'cream silk blouse', 'nude heels', 'gold jewelry'],
    occasion: 'professional, timeless elegance',
    brands: ['The Row', 'Toteme', 'Khaite']
  }
]
```

**Guidelines:**
- Match vibe aesthetic (clean lines for minimal, sophisticated for luxury)
- Use classic brands (The Row, Toteme, Khaite for luxury; COS, Arket for minimal)
- Variety: suit, coat+sweater, blazer+trousers, timeless separates
- Different occasions: office, event, travel, timeless daily

**Estimated Time:** 12-18 hours (1 hour per vibe)

**Acceptance Criteria:**
- [ ] All 18 vibes have 3 classic outfits
- [ ] Outfits match vibe aesthetic
- [ ] Variety in coat/blazer styles and occasions

---

### Task 2.4: Add Trendy Outfits

**Priority:** 🔴 **P1 - HIGH**

**Target:** Add 1-2 more trendy outfits to each of 18 vibes (~18 total)

**Current State:**
- luxury_dark_moody: 2 outfits (needs 1 more)
- All other 17 vibes: 1 outfit (need 2 more each)

**For Each Vibe:**

**Step 1:** Locate trendy style array

**Step 2:** Add 1-2 new trendy outfit formulas

**Example (luxury_light_minimalistic):**
```typescript
trendy: [
  {
    id: 'lux_light_tre_001',  // Existing
    name: 'Modern Minimal',
    description: 'Oversized white blazer, cream bodysuit, white trousers, platform boots',
    pieces: ['oversized white blazer', 'cream bodysuit', 'white wide-leg trousers', 'white platform boots'],
    occasion: 'trendy event, fashion-forward setting',
    brands: ['The Row', 'Khaite', 'Toteme']
  },
  {
    id: 'lux_light_tre_002',  // NEW
    name: 'Cropped Statement',
    description: 'Cropped white jacket, high-waisted cream trousers, white sneakers',
    pieces: ['cropped white jacket', 'high-waisted cream trousers', 'white designer sneakers', 'minimal gold jewelry'],
    occasion: 'trendy casual, modern setting',
    brands: ['The Row', 'Khaite']
  },
  {
    id: 'lux_light_tre_003',  // NEW
    name: 'Oversized Chic',
    description: 'Oversized cream coat, white tee, white jeans, nude boots',
    pieces: ['oversized cream coat', 'white ribbed tank', 'white straight-leg jeans', 'nude ankle boots'],
    occasion: 'trendy day out, modern casual',
    brands: ['The Row', 'Toteme', 'Celine']
  }
]
```

**Guidelines:**
- Match vibe aesthetic (modern, fashion-forward)
- Use trendy brands (The Row, Khaite, Acne Studios for luxury/edgy; Toteme, COS for minimal)
- Variety: oversized pieces, cropped items, statement pieces, modern silhouettes
- Different occasions: night out, fashion-forward, statement, modern casual

**Estimated Time:** 10-15 hours (1 hour per vibe)

**Acceptance Criteria:**
- [ ] All 18 vibes have 3 trendy outfits
- [ ] Outfits match vibe aesthetic
- [ ] Variety in trendy silhouettes and occasions

---

## PHASE 3: MEDIUM PRIORITY (P2) - Week 4

### Task 3.1: Complete Business & Casual Outfits

**Priority:** 🟡 **P2 - MEDIUM**

**Target:** Add 1-3 more business/casual outfits to vibes with <4

**Business Style:**
- Target: 4 outfits per vibe
- Current: 1-4 outfits (varies)
- Gap: ~18 outfits needed

**Casual Style:**
- Target: 4 outfits per vibe
- Current: 1-4 outfits (varies)
- Gap: ~18 outfits needed

**Process:** Same as previous tasks, focus on vibes with <4 outfits

**Estimated Time:** 10-15 hours

**Acceptance Criteria:**
- [ ] All vibes have 4 business outfits (or close)
- [ ] All vibes have 4 casual outfits (or close)
- [ ] Consistent coverage across all vibes

---

### Task 3.2: Document Feed Creation Approach

**Priority:** 🟡 **P2 - MEDIUM**

**File:** `docs/feed-planner/FEED_CREATION_APPROACH.md` (new)

**Content:**
1. Current implementation (on-demand generation)
2. Why it differs from guide (rationale)
3. Benefits of current approach
4. Trade-offs vs guide approach
5. Future considerations

**Estimated Time:** 1-2 hours

**Acceptance Criteria:**
- [ ] Document created explaining current approach
- [ ] Rationale clearly stated
- [ ] Benefits and trade-offs documented

---

### Task 3.3: Execute Comprehensive Testing

**Priority:** 🟡 **P2 - MEDIUM**

**File:** `scripts/test-dynamic-template-system.ts` (new)

**Test Scenarios:**

**Test 1: First-Time User**
- New user signs up
- Completes onboarding (selects fashion style)
- Creates feed via Maya
- Generates 9 images
- Verify: All prompts high-quality, no placeholders, diverse content

**Test 2: Returning User (Same Vibe)**
- Same user creates another feed
- Same vibe + same style
- Verify: Different outfits/locations than first feed
- Verify: Rotation state incremented

**Test 3: Returning User (5+ Feeds)**
- User creates 5 feeds in a row
- Verify: Rotation wraps around correctly
- Verify: After using all outfits, cycles back
- Verify: Quality remains consistent

**Test 4: Different Fashion Styles**
- User with casual style creates feed
- User with trendy style creates feed
- Verify: Each gets appropriate outfits
- Verify: Rotation states are independent

**Test 5: Error Handling**
- Test with missing vibe library
- Test with invalid fashion style
- Test with database connection failure
- Verify: Graceful error handling

**Quality Metrics:**
- Concept diversity score (target: 8.5/10+)
- No placeholder artifacts
- Performance < 5s generation time
- Database rotation state updates correctly

**Estimated Time:** 4-6 hours

**Acceptance Criteria:**
- [ ] All test scenarios pass
- [ ] Diversity score ≥ 8.5/10
- [ ] No placeholder artifacts
- [ ] Performance acceptable
- [ ] Error handling works gracefully
- [ ] Test results documented

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes (Week 1)

- [ ] **Task 1.1:** Fix location rotation bug
  - [ ] Update `buildPlaceholders()` function
  - [ ] Test rotation with 3+ feeds
  - [ ] Verify outdoor locations rotate
  - [ ] Verify indoor locations rotate
  - [ ] Update rotation increment if needed

- [ ] **Task 1.2:** Verify migration status
  - [ ] Check if table exists
  - [ ] Run migration if needed
  - [ ] Verify table structure
  - [ ] Verify indexes
  - [ ] Test rotation persistence

- [ ] **Task 1.3:** Add athletic outfits (6 priority vibes)
  - [ ] professional_light_minimalistic (2 outfits)
  - [ ] professional_beige_aesthetic (2 outfits)
  - [ ] luxury_light_minimalistic (2 outfits)
  - [ ] luxury_beige_aesthetic (2 outfits)
  - [ ] minimal_light_minimalistic (2 outfits)
  - [ ] minimal_beige_aesthetic (2 outfits)

### Phase 2: High Priority (Week 2-3)

- [ ] **Task 2.1:** Add athletic outfits (12 remaining vibes)
  - [ ] professional_dark_moody (2 outfits)
  - [ ] luxury_dark_moody (2 outfits)
  - [ ] minimal_dark_moody (2 outfits)
  - [ ] beige_beige_aesthetic (2 outfits)
  - [ ] beige_light_minimalistic (2 outfits)
  - [ ] warm_beige_aesthetic (2 outfits)
  - [ ] beige_dark_moody (2 outfits)
  - [ ] warm_light_minimalistic (2 outfits)
  - [ ] warm_dark_moody (2 outfits)
  - [ ] edgy_light_minimalistic (2 outfits)
  - [ ] edgy_beige_aesthetic (2 outfits)
  - [ ] edgy_dark_moody (2 outfits)

- [ ] **Task 2.2:** Add bohemian outfits (18 vibes)
  - [ ] luxury_dark_moody (1 outfit)
  - [ ] All other 17 vibes (2 outfits each)

- [ ] **Task 2.3:** Add classic outfits (18 vibes)
  - [ ] luxury_dark_moody (1 outfit)
  - [ ] All other 17 vibes (2 outfits each)

- [ ] **Task 2.4:** Add trendy outfits (18 vibes)
  - [ ] luxury_dark_moody (1 outfit)
  - [ ] All other 17 vibes (2 outfits each)

### Phase 3: Medium Priority (Week 4)

- [ ] **Task 3.1:** Complete business & casual outfits
  - [ ] Add business outfits to vibes with <4
  - [ ] Add casual outfits to vibes with <4

- [ ] **Task 3.2:** Document feed creation approach
  - [ ] Create documentation file
  - [ ] Explain current implementation
  - [ ] Document rationale

- [ ] **Task 3.3:** Execute comprehensive testing
  - [ ] Create test script
  - [ ] Run all test scenarios
  - [ ] Document results
  - [ ] Fix any issues found

---

## SUCCESS METRICS

### Completion Criteria

**Phase 1 Complete When:**
- [ ] Location rotation works correctly
- [ ] Migration verified and working
- [ ] 6 priority vibes have 3 athletic outfits each

**Phase 2 Complete When:**
- [ ] All 18 vibes have 3 athletic outfits
- [ ] All 18 vibes have 3 bohemian outfits
- [ ] All 18 vibes have 3 classic outfits
- [ ] All 18 vibes have 3 trendy outfits

**Phase 3 Complete When:**
- [ ] All vibes have 4 business outfits (or close)
- [ ] All vibes have 4 casual outfits (or close)
- [ ] Feed creation approach documented
- [ ] Comprehensive testing complete

**100% Complete When:**
- [ ] All phases complete
- [ ] All tests pass
- [ ] No placeholder artifacts
- [ ] Rotation works for all content types
- [ ] Diversity scores ≥ 8.5/10
- [ ] Performance acceptable

---

## RISK MITIGATION

### Potential Issues

1. **Location Rotation Fix:**
   - Risk: Breaking existing functionality
   - Mitigation: Test thoroughly before deploying
   - Rollback: Keep old code commented for quick revert

2. **Outfit Content Quality:**
   - Risk: Inconsistent quality across vibes
   - Mitigation: Use style guidelines, review each batch
   - Quality Check: Verify each outfit matches vibe aesthetic

3. **Migration Execution:**
   - Risk: Database downtime or errors
   - Mitigation: Test on staging first, backup before migration
   - Rollback: Keep backup, test rollback procedure

4. **Testing Coverage:**
   - Risk: Missing edge cases
   - Mitigation: Test with real user scenarios, document edge cases
   - Coverage: Test all 18 vibes, all 6 styles

---

## TIMELINE

### Week 1: Critical Fixes
- **Day 1-2:** Fix location rotation + verify migration
- **Day 3-5:** Add athletic outfits (6 priority vibes)

### Week 2-3: High Priority
- **Week 2:** Add athletic outfits (remaining 12 vibes) + start bohemian
- **Week 3:** Complete bohemian, classic, trendy outfits

### Week 4: Medium Priority
- **Day 1-2:** Complete business & casual outfits
- **Day 3:** Document feed creation approach
- **Day 4-5:** Execute comprehensive testing

**Total:** 3-4 weeks to 100% completion

---

## RESOURCES NEEDED

### Files to Modify:
- `lib/feed-planner/dynamic-template-injector.ts` (location rotation fix)
- `lib/styling/vibe-libraries.ts` (outfit additions)
- `docs/feed-planner/FEED_CREATION_APPROACH.md` (new documentation)
- `scripts/test-dynamic-template-system.ts` (new test script)

### Database:
- Migration verification
- Rotation state testing

### Testing:
- Test user accounts
- Test feeds across all vibes
- Performance monitoring

---

## NEXT STEPS

1. **Immediate:** Start with Task 1.1 (Fix location rotation) - highest impact
2. **Parallel:** Task 1.2 (Verify migration) can run in parallel
3. **Sequential:** Task 1.3 (Athletic outfits) after rotation fix verified
4. **Batch:** Process outfit additions in batches (3-4 vibes at a time)
5. **Test:** Test after each phase before moving to next

---

**Plan Created:** 2025-01-11  
**Target Completion:** 2025-02-08 (4 weeks)  
**Status:** Ready to begin Phase 1
