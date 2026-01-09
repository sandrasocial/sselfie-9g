# PR-5: Paid Blueprint UI - Manual Test Plan

**Date:** 2026-01-09  
**Feature:** Paid Blueprint UI Wiring  
**Route:** `/blueprint/paid?access=TOKEN`

---

## Prerequisites

1. **Dev server running**: `pnpm dev`
2. **Test subscriber with paid access**:
   - Email: `test-pr4-staging@sselfie.app`
   - Access Token: (from database)
   - Get token: `SELECT access_token FROM blueprint_subscribers WHERE email = 'test-pr4-staging@sselfie.app' ORDER BY created_at DESC LIMIT 1`

---

## Test 1: Initial Load with 0/30 Grids

**Steps:**
1. Reset test subscriber:
   ```sql
   UPDATE blueprint_subscribers
   SET paid_blueprint_photo_urls = '[]'::jsonb,
       paid_blueprint_generated = FALSE
   WHERE email = 'test-pr4-staging@sselfie.app';
   ```

2. Navigate to: `http://localhost:3000/blueprint/paid?access=TOKEN`

**Expected Results:**
- ✅ Page loads without errors
- ✅ Header shows "Your Paid Blueprint"
- ✅ Progress bar shows "0/30 Grids (0%)"
- ✅ Progress bar is empty (0% width)
- ✅ Button says "Generate My Photos"
- ✅ Grid gallery shows 30 empty grid cards
- ✅ Each card shows "Clock" icon and "Not Started" text
- ✅ Each card shows "Grid 1" through "Grid 30"

---

## Test 2: Generate First Grid

**Steps:**
1. Click "Generate My Photos" button

**Expected Results:**
- ✅ Button becomes disabled with opacity-50
- ✅ Grid 1 card shows spinning loader
- ✅ Grid 1 card shows "Generating..." text
- ✅ After ~45 seconds, Grid 1 shows completed image
- ✅ Grid 1 shows green checkmark icon
- ✅ Grid 1 shows "Download" button
- ✅ Progress updates to "1/30 Grids (3%)"
- ✅ Progress bar fills to 3%
- ✅ Grid 2 automatically starts generating

---

## Test 3: Mid-Generation Page Refresh

**Steps:**
1. Let Grid 2 start generating (spinner visible)
2. Refresh the page (F5 or Cmd+R)
3. Wait for page to reload

**Expected Results:**
- ✅ Page loads with Grid 1 still completed
- ✅ Grid 2 resumes polling (spinner visible)
- ✅ Grid 2 completes after remaining time
- ✅ localStorage preserves prediction ID
- ✅ No duplicate generation requests
- ✅ Progress bar shows correct count

---

## Test 4: Download Grid

**Steps:**
1. Wait for Grid 1 to complete
2. Click "Download" button on Grid 1

**Expected Results:**
- ✅ Opens grid image in new tab
- ✅ Image URL starts with vercel-storage.com
- ✅ Image is a 3x3 grid PNG
- ✅ Image loads correctly

---

## Test 5: Navigate Away and Return

**Steps:**
1. Let 2-3 grids complete
2. Navigate to `/blueprint` (free blueprint page)
3. Click browser back button
4. Return to `/blueprint/paid?access=TOKEN`

**Expected Results:**
- ✅ Page loads with correct progress
- ✅ Completed grids still show images
- ✅ Progress bar shows correct count
- ✅ "Continue" button available
- ✅ Can continue generating remaining grids

---

## Test 6: Button State Changes

**Initial State (0 grids):**
- ✅ Button says "Generate My Photos"

**After 1+ grids:**
- ✅ Button says "Continue"

**During Generation:**
- ✅ Button is disabled
- ✅ Button has reduced opacity

**At 30/30 grids:**
- ✅ Button is disabled
- ✅ Progress shows "30/30 Grids (100%)"

---

## Test 7: Simulate Failure (Advanced)

**Steps:**
1. Open browser DevTools → Application → Local Storage
2. Find key: `paid_blueprint_predictions_v1:TOKEN`
3. Edit JSON to add invalid predictionId:
   ```json
   {
     "5": {
       "predictionId": "invalid-id-12345",
       "status": "processing"
     }
   }
   ```
4. Refresh page

**Expected Results:**
- ✅ Grid 5 shows "Failed" status
- ✅ Grid 5 shows red X icon
- ✅ Grid 5 shows "Retry" button
- ✅ Other grids unaffected
- ✅ Error message shown at top
- ✅ Generation loop stops at Grid 5
- ✅ Clicking "Retry" restarts Grid 5

---

## Test 8: Clear Local Progress (Dev Only)

**Prerequisites:** `NODE_ENV=development`

**Steps:**
1. Let 2-3 grids complete
2. Click "Clear Local Progress" button
3. Observe results

**Expected Results:**
- ✅ localStorage cleared for this access token
- ✅ Page reloads status from server
- ✅ Completed grids still show (from server)
- ✅ In-progress predictions cleared
- ✅ Console shows: `[Paid Blueprint] Cleared local progress`

---

## Test 9: Multiple Grids Sequential

**Steps:**
1. Click "Generate My Photos"
2. Observe Grid 1, 2, 3 generating

**Expected Results:**
- ✅ Only ONE grid generates at a time
- ✅ Grid 2 waits for Grid 1 to complete
- ✅ Grid 3 waits for Grid 2 to complete
- ✅ No concurrent API calls
- ✅ Progress updates after each grid
- ✅ Smooth sequential flow

---

## Test 10: Invalid/Missing Access Token

**Steps:**
1. Navigate to: `http://localhost:3000/blueprint/paid` (no token)
2. Navigate to: `http://localhost:3000/blueprint/paid?access=invalid`

**Expected Results for No Token:**
- ✅ Shows "Access Required" error page
- ✅ Shows red X icon
- ✅ Shows "Go to Blueprint" button
- ✅ Button links to `/blueprint`

**Expected Results for Invalid Token:**
- ✅ Shows loading spinner initially
- ✅ Then shows error message
- ✅ "Go to Blueprint" button available

---

## Test 11: Not Paid User

**Steps:**
1. Create test subscriber without purchase:
   ```sql
   UPDATE blueprint_subscribers
   SET paid_blueprint_purchased = FALSE
   WHERE email = 'test-pr4-staging@sselfie.app';
   ```
2. Navigate to: `http://localhost:3000/blueprint/paid?access=TOKEN`

**Expected Results:**
- ✅ Shows "Purchase Required" page
- ✅ Shows amber warning icon
- ✅ Explains purchase needed
- ✅ "Go to Blueprint" button available

---

## Test 12: All 30 Grids Completed

**Steps:**
1. Let all 30 grids complete (or simulate with database)
2. Refresh page

**Expected Results:**
- ✅ Progress shows "30/30 Grids (100%)"
- ✅ Progress bar completely filled (green/dark)
- ✅ "Generate My Photos" button disabled
- ✅ All 30 cards show images
- ✅ All 30 cards have "Download" buttons
- ✅ All 30 cards have green checkmarks
- ✅ No grids show "Not Started" or "Generating"

---

## Test 13: Mobile Responsiveness

**Steps:**
1. Open DevTools → Toggle device toolbar
2. Test on various screen sizes:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1280px+)

**Expected Results:**
- ✅ Layout adapts to screen size
- ✅ Grid gallery responsive:
  - 2 columns on mobile
  - 3 columns on small tablets
  - 4 columns on medium screens
  - 5 columns on large screens
- ✅ Header stacks properly
- ✅ Buttons remain accessible
- ✅ Text readable at all sizes
- ✅ No horizontal scroll
- ✅ Touch targets adequately sized (min 44px)

---

## Test 14: Browser Compatibility

Test in:
- ✅ Chrome
- ✅ Safari
- ✅ Firefox
- ✅ Edge

**Expected Results:**
- ✅ Page loads in all browsers
- ✅ Images render correctly
- ✅ Animations smooth
- ✅ localStorage works
- ✅ Polling works
- ✅ No console errors

---

## Test 15: Performance & UX

**Steps:**
1. Open Network tab in DevTools
2. Generate 3 grids
3. Observe behavior

**Expected Results:**
- ✅ No unnecessary API calls
- ✅ Polling only active grids
- ✅ No memory leaks (check with Memory profiler)
- ✅ Images lazy load
- ✅ Smooth transitions
- ✅ Fast initial page load (<2s)
- ✅ Responsive UI (no freezing during generation)

---

## Edge Cases to Test

### Edge Case 1: Rapid Clicking
- Click "Generate" button multiple times rapidly
- **Expected:** Only one generation starts, button disabled

### Edge Case 2: Network Offline
- Go offline mid-generation
- **Expected:** Polling fails gracefully, shows error, can retry when back online

### Edge Case 3: Very Long Generation
- Simulate slow generation (>2 minutes)
- **Expected:** UI remains responsive, user can navigate away and return

### Edge Case 4: Browser Back/Forward
- Navigate away, use browser back
- **Expected:** Page state preserved, resume works

---

## Success Criteria

**Must Pass ALL Tests:**
- [ ] Test 1: Initial load
- [ ] Test 2: First grid generation
- [ ] Test 3: Mid-generation refresh
- [ ] Test 4: Download works
- [ ] Test 5: Navigate away/return
- [ ] Test 6: Button states correct
- [ ] Test 7: Failure handling
- [ ] Test 9: Sequential generation
- [ ] Test 10: Invalid token handling
- [ ] Test 11: Non-paid user handling
- [ ] Test 13: Mobile responsive

**Nice to Have:**
- [ ] Test 8: Clear local progress
- [ ] Test 12: All 30 complete
- [ ] Test 14: Browser compatibility
- [ ] Test 15: Performance

---

## Post-Testing Checklist

- [ ] All tests passed
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Mobile works perfectly
- [ ] localStorage reliable
- [ ] Polling efficient
- [ ] Error handling robust
- [ ] UX smooth and intuitive

---

## Known Limitations

1. **Sequential Only**: Grids generate one at a time (by design)
2. **No Server Prediction Storage**: Predictions only in localStorage
3. **5-Second Polling**: Could be optimized with WebSockets (future)
4. **No Batch Download**: Download grids individually (future feature)

---

## Next Steps After Testing

1. Document any bugs found
2. Create tickets for failed tests
3. Get Sandra's approval on UX
4. Plan production deployment
5. Create user documentation
6. Set up monitoring/analytics

---

**End of Test Plan**
