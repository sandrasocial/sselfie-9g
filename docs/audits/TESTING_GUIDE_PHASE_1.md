# Phase 1 Testing Guide - Maya Chat Stabilization
**Date:** 2025-01-27  
**Status:** Ready for Testing ✅

## What Was Fixed

### Critical Issues Resolved:
1. ✅ **Blank Screen on Load** - Fixed loading indicators showing correctly
2. ✅ **Blank Screen on Tab Switch** - Messages now preserved during tab transitions
3. ✅ **Stuck Loading States** - Added 10-second timeout to prevent infinite loading
4. ✅ **Incorrect Empty State** - Welcome screen only shows when appropriate
5. ✅ **Concept Cards Duplication** - Fixed duplicate cards on page refresh

---

## How to Test (Simple Steps)

### Test 1: Open Maya Chat
**What to do:**
1. Open the app
2. Click on "Maya" or navigate to Maya chat

**Expected result:**
- ✅ You should see a loading indicator ("Loading chat...")
- ✅ After loading, you should see your chat messages (or welcome screen if new user)
- ✅ NO blank screen

**If broken:**
- If you see a blank screen for more than 10 seconds, refresh the page
- If still broken, report: "Blank screen on initial load"

---

### Test 2: Switch Between Tabs
**What to do:**
1. Start on **Photos** tab
2. Click on **Feed** tab
3. Click on **Videos** tab
4. Click on **Prompts** tab
5. Click on **Training** tab
6. Go back to **Photos** tab

**Expected result:**
- ✅ Each tab switch should show a loading indicator briefly
- ✅ Messages should appear after loading
- ✅ NO blank screen during tab switches
- ✅ Each tab should show its own chat/content

**If broken:**
- If any tab shows blank screen, report: "Blank screen on [TAB NAME] tab"
- If loading takes more than 10 seconds, report: "Stuck loading on [TAB NAME] tab"

---

### Test 3: Page Refresh
**What to do:**
1. Be on **Photos** tab with some messages
2. Refresh the page (F5 or Cmd+R)

**Expected result:**
- ✅ Should show loading indicator
- ✅ Should load your chat messages
- ✅ Concept cards should appear ONCE (not duplicated)
- ✅ NO blank screen

**If broken:**
- If concept cards appear twice, report: "Duplicate concept cards on refresh"
- If blank screen, report: "Blank screen after refresh"

---

### Test 4: Create New Chat
**What to do:**
1. Click the chat history button (or new chat button)
2. Click "New Chat"

**Expected result:**
- ✅ Should create a new empty chat
- ✅ Should show welcome screen (if you're a new user)
- ✅ Should allow you to start typing

**If broken:**
- If blank screen appears, report: "Blank screen when creating new chat"

---

### Test 5: Select Chat from History
**What to do:**
1. Open chat history
2. Click on an existing chat

**Expected result:**
- ✅ Should show loading indicator
- ✅ Should load that chat's messages
- ✅ Should display all messages correctly
- ✅ NO blank screen

**If broken:**
- If blank screen, report: "Blank screen when selecting chat from history"

---

## Quick Test Checklist

Copy this and check off as you test:

```
✅ Test 1: Open Maya Chat
   [ ] Loading indicator shows
   [ ] Messages appear (or welcome screen)
   [ ] No blank screen

✅ Test 2: Switch Between Tabs
   [ ] Photos tab works
   [ ] Feed tab works
   [ ] Videos tab works
   [ ] Prompts tab works
   [ ] Training tab works
   [ ] No blank screens during switches

✅ Test 3: Page Refresh
   [ ] Photos tab loads after refresh
   [ ] Feed tab loads after refresh
   [ ] No duplicate concept cards
   [ ] No blank screen

✅ Test 4: Create New Chat
   [ ] New chat creates successfully
   [ ] Welcome screen shows (if new user)
   [ ] Can start typing

✅ Test 5: Select Chat from History
   [ ] Chat loads correctly
   [ ] Messages display
   [ ] No blank screen
```

---

## What to Report

If something is broken, please tell me:

1. **Which test failed** (Test 1, 2, 3, 4, or 5)
2. **What you saw** (blank screen, stuck loading, error message, etc.)
3. **What tab you were on** (Photos, Feed, Videos, Prompts, Training)
4. **What you were doing** (switching tabs, refreshing, creating chat, etc.)

Example:
> "Test 2 failed - Feed tab shows blank screen when switching from Photos tab"

---

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Open Maya Chat | Loading indicator → Messages appear |
| Switch Tabs | Brief loading → New tab content appears |
| Refresh Page | Loading indicator → Messages reload (no duplicates) |
| Create New Chat | Empty chat with welcome screen (if new user) |
| Select Chat | Loading indicator → Selected chat messages appear |

---

## Notes

- **Training tab** doesn't use chat system, so it may behave differently (that's normal)
- **Loading timeout** is 10 seconds - if loading takes longer, it will reset automatically
- **Concept cards** should only appear once, even after page refresh
- **Feed cards** should only appear once, even after page refresh

---

**Status:** All fixes are deployed. Please test and report any issues!

