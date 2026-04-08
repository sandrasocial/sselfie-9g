# Tab Switch Debugging Guide

## Current Status
- ✅ Rollback complete - removed broken fix
- ⚠️ Need to understand actual behavior

## What to Test

### Test 1: Photos → Feed → Photos

1. **Open browser console** (F12 → Console tab)
2. **Go to Maya Chat** (should be on Photos tab by default)
3. **Send a message**: "Create a photo concept"
4. **Wait for Maya's response**
5. **Switch to Feed tab**
6. **Switch back to Photos tab**

**Expected behavior (BEFORE my fix):**
- ✅ Photos messages should be preserved

**What to look for in console:**
```
[useMayaChat] ChatType changed from maya to feed-planner
[useMayaChat] 🔍 TAB SWITCH: Messages before clear: { totalMessages: X, ... }
[useMayaChat] 🔍 TAB SWITCH: Messages cleared, will reload from DB
[useMayaChat] Loading chat from URL: /api/maya/load-chat?chatType=feed-planner
```

---

### Test 2: Feed → Photos → Feed

1. **Refresh the page** (to start clean)
2. **Go to Maya Chat → Feed tab**
3. **Send a message**: "Create a feed layout"
4. **Wait for Maya's response**
5. **Switch to Photos tab**
6. **Switch back to Feed tab**

**Expected behavior (BEFORE my fix):**
- ❌ Feed messages should be lost

**What to look for in console:**
Same logs as above but with chatType changes reversed

---

## Questions to Answer

1. **Are messages actually lost or just not displayed?**
   - Check: Do you see loading indicator when switching?
   - Check: Are there any errors in console?

2. **Is the chat being loaded from database?**
   - Check: Do you see "Loading chat from URL" log?
   - Check: Do you see "Chat loaded successfully" log?

3. **Is the chatId correct?**
   - Check: Do you see "Found saved chatId in localStorage" log?
   - Check: What's the chatId for each tab?

4. **Timing issue?**
   - Check: Does waiting a few seconds help?
   - Check: Are messages loaded but then cleared again?

---

## Copy Console Logs

Please copy ALL console logs from the test and paste them here:

**Test 1 (Photos → Feed → Photos):**
```
[Paste console logs here]
```

**Test 2 (Feed → Photos → Feed):**
```
[Paste console logs here]
```

---

## Additional Info Needed

1. **Before my fix, which direction worked?**
   - [ ] Photos → Feed: Messages preserved?
   - [ ] Feed → Photos: Messages preserved?
   - [ ] Both directions lost messages?
   - [ ] Neither direction lost messages?

2. **What exactly was lost?**
   - [ ] Messages from the tab you switched FROM
   - [ ] Messages from the tab you switched TO
   - [ ] All messages from both tabs

3. **After my fix (rolled back now), what's the current behavior?**
   - Test and confirm current state

---

## What I'm Looking For

I need to understand:
1. Is the problem with LOADING the chat or PRESERVING the messages?
2. Is there a race condition between useChat reset and loadChat?
3. Does the chatSessionId change cause useChat to clear before loadChat finishes?

The key issue is that `chatSessionId` includes `currentChatType`, so when you switch tabs:
- chatSessionId changes
- useChat resets its internal state (clears messages)
- useEffect should reload the chat
- But something goes wrong with the reload

I need to see the timing of these events in the logs.

