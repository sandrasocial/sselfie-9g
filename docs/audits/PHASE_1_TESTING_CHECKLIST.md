# Phase 1 Testing Checklist - Maya Chat Stabilization

## ✅ Code Verification Complete

All Phase 1 fixes have been verified in the codebase:

1. ✅ **`processedConceptMessagesRef`** - Implemented in `maya-chat-screen.tsx` (line 253)
2. ✅ **Loading indicators** - Added to Photos, Feed, Videos, Prompts tabs (lines 2786, 3105, 3135, 3173)
3. ✅ **Tab switch fix** - Messages no longer cleared immediately (line 756 in `use-maya-chat.ts`)
4. ✅ **Loading timeout** - `LOAD_TIMEOUT` (10s) implemented (line 715 in `use-maya-chat.ts`)
5. ✅ **Empty state fix** - `hasLoadedChatRef` check added to `isEmpty` condition

---

## 🧪 Manual Testing Checklist

### Prerequisites
- ✅ Dev server running (`npm run dev`)
- ✅ User logged in (authenticated)
- ✅ Navigate to `/maya`

### Test 1: Photos Tab - Initial Load
**Expected:** Should show loading indicator, then chat content or welcome screen

**Steps:**
1. Navigate to `/maya`
2. Ensure "Photos" tab is active (default)
3. **Observe:**
   - [ ] Loading indicator appears briefly (if chat exists)
   - [ ] Chat messages load (if chat history exists)
   - [ ] OR welcome screen appears (if no chat history)
   - [ ] NO blank screen
   - [ ] NO stuck loading indicator

**Pass Criteria:**
- ✅ Loading indicator appears and disappears
- ✅ Content loads within 10 seconds
- ✅ No blank screen

---

### Test 2: Photos Tab - Page Refresh
**Expected:** Concept cards should NOT duplicate on refresh

**Steps:**
1. In Photos tab, send a message that generates concept cards
2. Wait for concept cards to appear
3. Refresh the page (F5 or Cmd+R)
4. **Observe:**
   - [ ] Concept cards appear once (not duplicated)
   - [ ] Chat messages load correctly
   - [ ] No duplicate concept cards

**Pass Criteria:**
- ✅ Concept cards appear exactly once
- ✅ No duplication on refresh

---

### Test 3: Tab Switch - Photos → Feed
**Expected:** Smooth transition with loading indicator, no blank screen

**Steps:**
1. In Photos tab, ensure you have messages/concept cards visible
2. Click "Feed" tab
3. **Observe:**
   - [ ] Loading indicator appears
   - [ ] Photos tab content remains visible during transition
   - [ ] Feed tab content loads (or welcome screen if no feed chats)
   - [ ] NO blank screen during transition
   - [ ] Transition completes within 10 seconds

**Pass Criteria:**
- ✅ No blank screen during tab switch
- ✅ Loading indicator appears
- ✅ Content loads successfully

---

### Test 4: Tab Switch - Feed → Photos
**Expected:** Same as Test 3, but in reverse direction

**Steps:**
1. In Feed tab, ensure you have messages/feed cards visible
2. Click "Photos" tab
3. **Observe:**
   - [ ] Loading indicator appears
   - [ ] Feed tab content remains visible during transition
   - [ ] Photos tab content loads
   - [ ] NO blank screen during transition

**Pass Criteria:**
- ✅ No blank screen during tab switch
- ✅ Loading indicator appears
- ✅ Content loads successfully

---

### Test 5: All Tabs - Initial Load
**Expected:** Each tab should load correctly when clicked

**Steps:**
1. Navigate to `/maya`
2. Click each tab in order:
   - Photos
   - Videos
   - Prompts
   - Training
   - Feed
3. **Observe for each tab:**
   - [ ] Loading indicator appears (if loading)
   - [ ] Content loads or welcome screen appears
   - [ ] NO blank screen
   - [ ] NO stuck loading indicator

**Pass Criteria:**
- ✅ All 5 tabs load successfully
- ✅ No blank screens
- ✅ Loading indicators appear when needed

---

### Test 6: Loading Timeout
**Expected:** If loading takes >10 seconds, state should reset

**Steps:**
1. Open browser DevTools → Network tab
2. Throttle network to "Slow 3G" (simulates slow connection)
3. Navigate to `/maya`
4. Switch between tabs
5. **Observe:**
   - [ ] Loading indicator appears
   - [ ] If loading takes >10 seconds, state resets (allows retry)
   - [ ] No permanent stuck loading state

**Pass Criteria:**
- ✅ Loading timeout works (10 seconds)
- ✅ State resets after timeout
- ✅ User can retry loading

---

### Test 7: Empty State Display
**Expected:** Welcome screen only shows when appropriate

**Steps:**
1. Navigate to `/maya` (new user with no chat history)
2. **Observe:**
   - [ ] Welcome screen appears (if no chat history)
   - [ ] Welcome screen does NOT appear during initial load
   - [ ] Welcome screen appears only after loading completes

**Pass Criteria:**
- ✅ Welcome screen appears at correct time
- ✅ Not shown during loading
- ✅ Not shown if chat history exists

---

### Test 8: Feed Tab - Feed Cards
**Expected:** Feed cards should NOT duplicate on refresh

**Steps:**
1. In Feed tab, send a message that generates feed strategy
2. Wait for feed cards to appear
3. Refresh the page (F5 or Cmd+R)
4. **Observe:**
   - [ ] Feed cards appear once (not duplicated)
   - [ ] Chat messages load correctly

**Pass Criteria:**
- ✅ Feed cards appear exactly once
- ✅ No duplication on refresh

---

## 🐛 Known Issues

### Runtime Error (HMR)
- **Issue:** `buy-credits-modal.tsx` has an HMR (Hot Module Reload) error
- **Impact:** May cause page to show error screen initially
- **Workaround:** Refresh page or restart dev server
- **Status:** Non-blocking for Maya chat functionality

---

## 📊 Test Results Template

```
Test 1: Photos Tab - Initial Load
- Status: [ ] PASS [ ] FAIL
- Notes: 

Test 2: Photos Tab - Page Refresh
- Status: [ ] PASS [ ] FAIL
- Notes: 

Test 3: Tab Switch - Photos → Feed
- Status: [ ] PASS [ ] FAIL
- Notes: 

Test 4: Tab Switch - Feed → Photos
- Status: [ ] PASS [ ] FAIL
- Notes: 

Test 5: All Tabs - Initial Load
- Photos: [ ] PASS [ ] FAIL
- Videos: [ ] PASS [ ] FAIL
- Prompts: [ ] PASS [ ] FAIL
- Training: [ ] PASS [ ] FAIL
- Feed: [ ] PASS [ ] FAIL
- Notes: 

Test 6: Loading Timeout
- Status: [ ] PASS [ ] FAIL
- Notes: 

Test 7: Empty State Display
- Status: [ ] PASS [ ] FAIL
- Notes: 

Test 8: Feed Tab - Feed Cards
- Status: [ ] PASS [ ] FAIL
- Notes: 
```

---

## ✅ Next Steps After Testing

1. **If all tests pass:** Proceed to Phase 2 (Schema & Database Consistency)
2. **If any test fails:** Document the failure and we'll fix it before proceeding
3. **Report results:** Share test results so we can address any issues

---

## 🔍 Debugging Tips

If you encounter issues:

1. **Check browser console** (F12 → Console tab)
   - Look for errors or warnings
   - Check for `[useMayaChat]` or `[v0]` log messages

2. **Check Network tab** (F12 → Network tab)
   - Look for failed API requests
   - Check `/api/maya/load-chat` responses

3. **Check localStorage** (F12 → Application → Local Storage)
   - Look for `mayaCurrentChatId_*` keys
   - Verify chat IDs are correct

4. **Clear cache and retry:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Clear localStorage and retry

---

## 📝 Notes

- All Phase 1 fixes are verified in code
- Testing should focus on user experience and visual behavior
- Report any unexpected behavior or errors


