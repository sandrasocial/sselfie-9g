# Pro Photoshoot Testing & Verification Checklist

## Overview
This document provides a comprehensive testing checklist for the Pro Photoshoot feature. Use this to verify all functionality before production release.

---

## Phase 7.1: Unit Tests

### ✅ Context Addon Function
- [ ] `getProPhotoshootContextAddon()` returns correct string
- [ ] Context includes PRO TEMPLATE
- [ ] Context includes Pro Tips
- [ ] Context includes example prompts
- [ ] Context length is reasonable (< 10KB)

**Test Location:** `lib/maya/pro-photoshoot-context.ts`

### ✅ Universal Prompt Retrieval
- [ ] `getUniversalPrompt()` returns exact prompt text
- [ ] Prompt matches analysis document exactly
- [ ] Prompt is used for Grids 2-8
- [ ] Prompt includes all required elements:
  - [ ] 3x3 grid mention
  - [ ] 9 distinct compositions
  - [ ] Facial and body consistency
  - [ ] Camera perspectives listed
  - [ ] Grid layout description
  - [ ] Color grading mention
  - [ ] High-resolution mention
  - [ ] Angle difference requirement

**Test Location:** `lib/maya/pro-photoshoot-prompts.ts`

### ✅ Image Limit Handling (14 images)
- [ ] Handles 3 avatar images + 0 grids = 3 total ✅
- [ ] Handles 5 avatar images + 0 grids = 5 total ✅
- [ ] Handles 3 avatar images + 8 grids = 11 total ✅
- [ ] Handles 5 avatar images + 8 grids = 13 total ✅
- [ ] Handles 5 avatar images + 10 grids = 15 total (exceeds limit)
  - [ ] Keeps all 5 avatars
  - [ ] Removes oldest 1 grid (keeps newest 9)
  - [ ] Final count = 14 images
- [ ] Handles 7 avatar images + 8 grids = 15 total (exceeds limit)
  - [ ] Keeps all 7 avatars
  - [ ] Removes oldest 1 grid (keeps newest 7)
  - [ ] Final count = 14 images
- [ ] Handles 14 avatar images (edge case)
  - [ ] Uses first 14 avatars only
  - [ ] No grids included

**Test Location:** `app/api/maya/pro/photoshoot/generate-grid/route.ts` (lines 119-140)

### ✅ Grid Splitting Logic
- [ ] Splits 3x3 grid into 9 frames correctly
- [ ] Each frame has correct dimensions (width/3, height/3)
- [ ] Frames are numbered 1-9 correctly
- [ ] Frames uploaded to Blob with correct naming
- [ ] Frames saved to `ai_images` table
- [ ] Frames linked to `pro_photoshoot_frames` table

**Test Location:** `app/api/maya/pro/photoshoot/check-grid/route.ts` and `create-carousel/route.ts`

### ✅ Credit Deduction (3 credits per grid)
- [ ] Checks credits before generation
- [ ] Deducts exactly 3 credits per grid
- [ ] Returns 402 if insufficient credits
- [ ] Updates balance correctly
- [ ] Credit transaction recorded in database
- [ ] Transaction type is "image"
- [ ] Transaction description includes "Pro Photoshoot Grid X (4K)"

**Test Location:** `app/api/maya/pro/photoshoot/generate-grid/route.ts` (lines 80-87, 200-210)

---

## Phase 7.2: Integration Tests

### ✅ Full Workflow Test
**Test Flow:** Button → Session → Grid 1 → Grid 2-4 → Carousel

1. **Initial State**
   - [ ] Concept card shows generated image
   - [ ] "Create Pro Photoshoot" button visible (Pro Mode only)
   - [ ] Button has correct styling (purple gradient)

2. **Session Creation**
   - [ ] Click button → Session created
   - [ ] Session ID returned
   - [ ] Session stored in `pro_photoshoot_sessions` table
   - [ ] Avatar images stored in session
   - [ ] Panel appears showing Grid 1 as "generating"

3. **Grid 1 Generation**
   - [ ] Grid 1 starts generating automatically
   - [ ] Maya prompt generated (if enabled)
   - [ ] Prediction ID returned
   - [ ] Grid record created in `pro_photoshoot_grids` table
   - [ ] Polling starts automatically
   - [ ] Grid 1 completes → Shows preview
   - [ ] Grid URL saved to database
   - [ ] 9 frames created and saved

4. **Grids 2-4 Generation**
   - [ ] Click "Generate 3 More Grids" button
   - [ ] Grids 2, 3, 4 start generating in parallel
   - [ ] All use universal prompt
   - [ ] All include avatar images + previous grids
   - [ ] All complete successfully
   - [ ] All show previews in panel

5. **Carousel Creation**
   - [ ] Hover over Grid 1 → "Create Carousel" button appears
   - [ ] Click button → Carousel creation starts
   - [ ] Loading state shows "Creating..."
   - [ ] Carousel created with 9 frames
   - [ ] `InstagramCarouselCard` displays
   - [ ] Panel hidden when carousel shown
   - [ ] Can swipe through all 9 frames

**Test Files:**
- `components/sselfie/concept-card.tsx`
- `components/sselfie/pro-photoshoot-panel.tsx`
- `app/api/maya/pro/photoshoot/*`

### ✅ Avatar Image Count Tests

**Test Case 1: 3 Avatar Images**
- [ ] Session created with 3 avatars
- [ ] Grid 1 uses 3 avatars
- [ ] Grid 2 uses 3 avatars + Grid 1
- [ ] Grid 3 uses 3 avatars + Grids 1-2
- [ ] All grids generate successfully

**Test Case 2: 5 Avatar Images**
- [ ] Session created with 5 avatars
- [ ] Grid 1 uses 5 avatars
- [ ] Grid 2 uses 5 avatars + Grid 1
- [ ] Grid 3 uses 5 avatars + Grids 1-2
- [ ] All grids generate successfully

**Test Case 3: 7 Avatar Images**
- [ ] Session created with 7 avatars
- [ ] Grid 1 uses 7 avatars
- [ ] Grid 2 uses 7 avatars + Grid 1
- [ ] Grid 3 uses 7 avatars + Grids 1-2
- [ ] Grid 4 uses 7 avatars + Grids 1-3 (total = 11)
- [ ] All grids generate successfully

### ✅ 14 Image Limit Edge Case

**Test Case: 5 Avatars + 10 Grids**
- [ ] Generate Grid 1 (5 avatars) = 5 images ✅
- [ ] Generate Grid 2 (5 avatars + Grid 1) = 6 images ✅
- [ ] Generate Grid 3 (5 avatars + Grids 1-2) = 7 images ✅
- [ ] Generate Grid 4 (5 avatars + Grids 1-3) = 8 images ✅
- [ ] Generate Grid 5 (5 avatars + Grids 1-4) = 9 images ✅
- [ ] Generate Grid 6 (5 avatars + Grids 1-5) = 10 images ✅
- [ ] Generate Grid 7 (5 avatars + Grids 1-6) = 11 images ✅
- [ ] Generate Grid 8 (5 avatars + Grids 1-7) = 12 images ✅
- [ ] Generate Grid 9 (5 avatars + Grids 1-8) = 13 images ✅
- [ ] Generate Grid 10 (5 avatars + Grids 1-9) = 14 images ✅
- [ ] Generate Grid 11 (5 avatars + Grids 1-10) = 15 images ❌
  - [ ] System detects limit exceeded
  - [ ] Removes oldest grid (Grid 1)
  - [ ] Uses: 5 avatars + Grids 2-10 = 14 images ✅
  - [ ] Generation succeeds

**Verification:**
- [ ] Console log shows: "Image input exceeded 14. Removed X oldest grids."
- [ ] All avatars always included
- [ ] Newest grids prioritized

### ✅ Error Handling

**Test Case 1: Failed Generation**
- [ ] Grid generation fails (simulate API error)
- [ ] Grid status updates to "failed"
- [ ] Error message displayed in panel
- [ ] User can retry generation
- [ ] Credits not deducted on failure

**Test Case 2: Network Errors**
- [ ] Simulate network timeout
- [ ] Error message displayed
- [ ] User can retry
- [ ] No partial state left behind

**Test Case 3: Insufficient Credits**
- [ ] User has < 3 credits
- [ ] Click "Generate More Grids"
- [ ] Error: "Insufficient credits"
- [ ] Buy credits modal appears
- [ ] After purchase, generation succeeds

**Test Case 4: Session Not Found**
- [ ] Invalid session ID
- [ ] Error: "Session not found"
- [ ] User can start new session

**Test Case 5: Grid Already Exists**
- [ ] Try to generate Grid 1 twice
- [ ] System detects existing grid
- [ ] Returns existing grid data
- [ ] No duplicate generation

### ✅ Credit Deduction & Balance Updates

**Test Case 1: Single Grid**
- [ ] Initial balance: 100 credits
- [ ] Generate Grid 1
- [ ] Balance: 97 credits (100 - 3)
- [ ] Transaction recorded:
  - [ ] Type: "image"
  - [ ] Amount: -3
  - [ ] Description: "Pro Photoshoot Grid 1 (4K)"
  - [ ] User ID correct

**Test Case 2: Multiple Grids**
- [ ] Initial balance: 50 credits
- [ ] Generate Grids 1-3 (3 grids)
- [ ] Balance: 41 credits (50 - 9)
- [ ] 3 transactions recorded
- [ ] All transactions correct

**Test Case 3: Insufficient Credits**
- [ ] Initial balance: 2 credits
- [ ] Try to generate Grid 1
- [ ] Error: "Insufficient credits"
- [ ] Balance unchanged: 2 credits
- [ ] No transaction recorded

### ✅ Carousel Creation & Polling

**Test Case 1: Create Carousel from Grid 1**
- [ ] Grid 1 completed
- [ ] Click "Create Carousel"
- [ ] API called: `/api/maya/pro/photoshoot/create-carousel`
- [ ] Grid downloaded
- [ ] Grid split into 9 frames
- [ ] Frames uploaded to Blob
- [ ] Frames saved to `ai_images` table
- [ ] Frames linked in `pro_photoshoot_frames` table
- [ ] Carousel displays immediately (no polling needed)
- [ ] All 9 frames visible

**Test Case 2: Reuse Existing Frames**
- [ ] Carousel already created for Grid 1
- [ ] Click "Create Carousel" again
- [ ] System detects existing frames
- [ ] Reuses existing frames (no re-splitting)
- [ ] Carousel displays immediately

**Test Case 3: Carousel Display**
- [ ] Carousel shows all 9 frames
- [ ] Can swipe left/right
- [ ] Slide indicators show current frame
- [ ] Can view full screen
- [ ] Can favorite carousel
- [ ] Can delete carousel (returns to panel)

---

## Phase 7.3: User Acceptance Testing

### ✅ Pro Mode Only
- [ ] Classic Mode: Button NOT visible
- [ ] Pro Mode: Button visible
- [ ] Button only appears after image generation
- [ ] Button styling matches Pro Mode aesthetic

**Test Location:** `components/sselfie/instagram-photo-card.tsx`

### ✅ Concept Card Integration
- [ ] Button appears in concept card after generation
- [ ] Button uses same avatar images from concept card
- [ ] No need to re-select images
- [ ] Works with different concept types:
  - [ ] Fashion concepts
  - [ ] Lifestyle concepts
  - [ ] Travel concepts
  - [ ] Professional concepts

**Test Location:** `components/sselfie/concept-card.tsx`

### ✅ Max 3 Grids at Once
- [ ] Can generate 1 grid at a time
- [ ] Can generate 2 grids at a time
- [ ] Can generate 3 grids at a time
- [ ] Cannot generate 4+ grids at once
- [ ] Button shows correct count: "Generate X More Grids"
- [ ] All grids generate in parallel
- [ ] Progress updates independently for each grid

**Test Location:** `components/sselfie/concept-card.tsx` (generateGrids function)

### ✅ Generate All 8 Grids
- [ ] Generate Grid 1 → Success
- [ ] Generate Grids 2-4 → Success (3 at once)
- [ ] Generate Grids 5-7 → Success (3 at once)
- [ ] Generate Grid 8 → Success
- [ ] All 8 grids show in panel
- [ ] All grids have previews
- [ ] Total: 72 frames created (8 grids × 9 frames)

**Verification:**
- [ ] Check `pro_photoshoot_grids` table: 8 rows
- [ ] Check `pro_photoshoot_frames` table: 72 rows (if carousels created)
- [ ] Check `ai_images` table: 72+ images (grids + frames)

### ✅ Carousel Creation from Different Grids
- [ ] Create carousel from Grid 1 → Success
- [ ] Delete carousel → Panel reappears
- [ ] Create carousel from Grid 3 → Success
- [ ] Create carousel from Grid 8 → Success
- [ ] Each carousel has correct frames
- [ ] No conflicts between carousels

### ✅ Credit Costs (3 credits per grid)
- [ ] Grid 1: 3 credits deducted
- [ ] Grid 2: 3 credits deducted
- [ ] Grid 3: 3 credits deducted
- [ ] Total for 3 grids: 9 credits
- [ ] Total for 8 grids: 24 credits
- [ ] Credit cost displayed in panel: "3 credits per grid"

**Verification:**
- [ ] Check credit balance before/after
- [ ] Check `credit_transactions` table
- [ ] All transactions have correct amounts

### ✅ 4K Resolution Output
- [ ] Grid 1 generated in 4K
- [ ] Grid 2 generated in 4K
- [ ] All grids generated in 4K
- [ ] Check image dimensions:
  - [ ] Grid images are high resolution (4096×4096 or similar)
  - [ ] Frame images are high resolution (1365×1365 or similar)
- [ ] Image quality is high (no pixelation)

**Verification:**
- [ ] Check `pro_photoshoot_grids.grid_url` → Download and verify dimensions
- [ ] Check `pro_photoshoot_frames.frame_url` → Download and verify dimensions
- [ ] Check API calls to Nano Banana Pro → `resolution: "4K"`

### ✅ Style Consistency Across Grids
- [ ] Grid 1: Custom style (outfit/location/colorgrade)
- [ ] Grid 2: Same style maintained (via previous grid reference)
- [ ] Grid 3: Same style maintained
- [ ] Grid 4: Same style maintained
- [ ] All grids show consistent:
  - [ ] Outfit
  - [ ] Location/environment
  - [ ] Color grading
  - [ ] Lighting
- [ ] Facial consistency maintained across all grids
- [ ] Only camera angles change (not styling)

**Verification:**
- [ ] Visual inspection of all grids
- [ ] Check that previous grids are included in `image_input`
- [ ] Check that avatar images are always first in `image_input`

---

## Database Verification

### ✅ Tables Created
- [ ] `pro_photoshoot_sessions` table exists
- [ ] `pro_photoshoot_grids` table exists
- [ ] `pro_photoshoot_frames` table exists
- [ ] All indexes created
- [ ] All foreign keys set up correctly

**SQL Check:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'pro_photoshoot_sessions',
  'pro_photoshoot_grids',
  'pro_photoshoot_frames'
);
```

### ✅ Data Integrity
- [ ] Sessions linked to correct users
- [ ] Grids linked to correct sessions
- [ ] Frames linked to correct grids
- [ ] No orphaned records
- [ ] All required fields populated

**SQL Check:**
```sql
-- Check for orphaned grids
SELECT g.id 
FROM pro_photoshoot_grids g
LEFT JOIN pro_photoshoot_sessions s ON g.session_id = s.id
WHERE s.id IS NULL;

-- Check for orphaned frames
SELECT f.id 
FROM pro_photoshoot_frames f
LEFT JOIN pro_photoshoot_grids g ON f.grid_id = g.id
WHERE g.id IS NULL;
```

---

## API Endpoint Verification

### ✅ POST `/api/maya/pro/photoshoot/start-session`
- [ ] Creates session successfully
- [ ] Returns session ID
- [ ] Stores avatar images
- [ ] Validates original image ID
- [ ] Requires admin access (if flag enabled)
- [ ] Handles existing session (resumes)

### ✅ POST `/api/maya/pro/photoshoot/generate-grid`
- [ ] Generates grid successfully
- [ ] Uses correct prompt (Grid 1 vs 2-8)
- [ ] Includes avatar images in `image_input`
- [ ] Includes previous grids in `image_input`
- [ ] Handles 14 image limit correctly
- [ ] Uses 4K resolution
- [ ] Deducts 3 credits
- [ ] Returns prediction ID
- [ ] Creates grid record in database

### ✅ GET `/api/maya/pro/photoshoot/check-grid`
- [ ] Polls prediction status
- [ ] Downloads grid when complete
- [ ] Uploads grid to Blob
- [ ] Splits grid into 9 frames
- [ ] Uploads frames to Blob
- [ ] Saves frames to `ai_images` table
- [ ] Links frames in `pro_photoshoot_frames` table
- [ ] Updates grid status to "completed"
- [ ] Returns grid URL and frame URLs

### ✅ POST `/api/maya/pro/photoshoot/create-carousel`
- [ ] Creates carousel successfully
- [ ] Reuses existing frames if available
- [ ] Splits grid if frames don't exist
- [ ] Saves frames to gallery
- [ ] Returns frame URLs and gallery IDs
- [ ] Handles errors gracefully

### ✅ GET `/api/maya/pro/photoshoot/lookup-image`
- [ ] Finds image by prediction ID
- [ ] Finds image by image URL
- [ ] Returns correct image ID
- [ ] Requires admin access (if flag enabled)
- [ ] Handles not found gracefully

---

## UI/UX Verification

### ✅ Panel Display
- [ ] Panel appears after session creation
- [ ] Shows 8 grid slots
- [ ] Grids display in correct order (1-8)
- [ ] Status indicators work (pending/generating/completed/failed)
- [ ] Progress counter updates: "X/8 grids"
- [ ] Credit cost displayed: "3 credits per grid"
- [ ] "Generate More Grids" button works
- [ ] Button disabled when generating
- [ ] Button disabled when all grids complete

### ✅ Grid Previews
- [ ] Completed grids show preview images
- [ ] Hover overlay works
- [ ] "Create Carousel" button appears on hover
- [ ] Grid number badge visible
- [ ] Generating grids show spinner
- [ ] Failed grids show error icon
- [ ] Pending grids show placeholder

### ✅ Carousel Display
- [ ] Carousel appears when created
- [ ] Panel hidden when carousel shown
- [ ] All 9 frames visible
- [ ] Swipe navigation works
- [ ] Slide indicators work
- [ ] Full-screen view works
- [ ] Favorite toggle works
- [ ] Delete button works (returns to panel)

### ✅ Error Messages
- [ ] Error messages display clearly
- [ ] Error messages are user-friendly
- [ ] Errors don't break UI
- [ ] User can retry after error
- [ ] Network errors handled gracefully

---

## Performance Verification

### ✅ Generation Speed
- [ ] Grid 1 generates in reasonable time (< 2 minutes)
- [ ] Grids 2-8 generate in reasonable time (< 2 minutes each)
- [ ] Parallel generation (3 grids) doesn't slow down
- [ ] Carousel creation is fast (< 10 seconds)

### ✅ Polling Efficiency
- [ ] Polling doesn't spam API
- [ ] Polling stops when complete
- [ ] Polling handles timeouts correctly
- [ ] Multiple grids poll independently

### ✅ Database Performance
- [ ] Queries are fast (< 100ms)
- [ ] Indexes are used correctly
- [ ] No N+1 query problems
- [ ] Bulk operations are efficient

---

## Security Verification

### ✅ Admin Access Control
- [ ] Feature flag works correctly
- [ ] Non-admin users can't access (if flag enabled)
- [ ] API routes check admin status
- [ ] UI hides button for non-admins

### ✅ Data Validation
- [ ] Avatar images validated (URLs, accessible)
- [ ] Grid numbers validated (1-8)
- [ ] Session IDs validated
- [ ] User IDs validated
- [ ] SQL injection prevented

### ✅ Credit Security
- [ ] Credits checked before generation
- [ ] Credits deducted atomically
- [ ] No double deduction
- [ ] Transaction records are accurate

---

## Browser Compatibility

### ✅ Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### ✅ Mobile Browsers
- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Responsive design works
- [ ] Touch interactions work

---

## Final Checklist

### ✅ Pre-Production
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All UAT tests pass
- [ ] Database migrations applied
- [ ] Feature flag configured
- [ ] Environment variables set
- [ ] Documentation updated
- [ ] No console errors
- [ ] No linting errors
- [ ] No TypeScript errors

### ✅ Production Readiness
- [ ] Feature flag can be toggled
- [ ] Rollback plan documented
- [ ] Monitoring in place
- [ ] Error tracking configured
- [ ] Credit costs verified
- [ ] 4K resolution confirmed
- [ ] All edge cases handled

---

## Test Results Template

**Date:** _______________
**Tester:** _______________
**Environment:** _______________

### Summary
- Total Tests: ___
- Passed: ___
- Failed: ___
- Skipped: ___

### Critical Issues
1. _______________
2. _______________

### Minor Issues
1. _______________
2. _______________

### Notes
_______________

---

## Quick Test Script

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to Maya Studio (Pro Mode)
# 3. Generate a concept card
# 4. Click "Create Pro Photoshoot"
# 5. Verify Grid 1 generates
# 6. Click "Generate 3 More Grids"
# 7. Verify Grids 2-4 generate
# 8. Create carousel from Grid 1
# 9. Verify carousel displays
# 10. Check database for records
```

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Status:** Ready for Testing

