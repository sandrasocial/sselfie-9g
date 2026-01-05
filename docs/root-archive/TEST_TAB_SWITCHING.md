# Quick Test Guide: Tab Switching Fix

## 🎯 What We Fixed

**Before:** Switching between Photos and Feed tabs made all your messages disappear  
**After:** Each tab keeps its own conversation - switch freely! 🎉

---

## ✅ How to Test (5 minutes)

### Test 1: Basic Tab Switch
1. Open Maya Chat (Photos tab)
2. Send a message: "Hey Maya, create a photo concept"
3. Wait for Maya's response
4. Click the **Feed** tab
5. ✅ **Expected:** Feed tab loads (might be empty if you haven't used it)
6. Click back to **Photos** tab
7. ✅ **Expected:** Your original conversation is back!

**Result:** ❌ FAIL / ✅ PASS

---

### Test 2: Separate Conversations
1. On **Photos** tab, send: "Create a luxury photoshoot"
2. Wait for response
3. Switch to **Feed** tab
4. Send: "Create an Instagram feed layout"
5. Wait for response
6. Switch back to **Photos** tab
7. ✅ **Expected:** Photoshoot conversation is still there
8. Switch back to **Feed** tab
9. ✅ **Expected:** Feed conversation is still there

**Result:** ❌ FAIL / ✅ PASS

---

### Test 3: Fast Switching (No Crashes)
1. Rapidly click between Photos and Feed tabs (5-6 times quickly)
2. ✅ **Expected:** No crashes, no errors, messages load correctly

**Result:** ❌ FAIL / ✅ PASS

---

### Test 4: After Page Refresh
1. Have conversations on both tabs (like Test 2)
2. Refresh the page (F5 or Cmd+R)
3. Switch between tabs
4. ✅ **Expected:** Both conversations are still saved

**Result:** ❌ FAIL / ✅ PASS

---

## 🔍 What to Look For

### ✅ Good Signs:
- Messages stay visible when switching tabs
- Each tab has its own conversation
- No error messages
- Loading indicator shows briefly when switching

### ❌ Bad Signs (Report These!):
- Messages disappear when switching tabs
- Error message in red
- Page crashes
- Messages from one tab appear in the other
- Loading indicator never goes away

---

## 🐛 If You Find a Problem

**Take a Screenshot and Note:**
1. Which test failed?
2. What did you see? (screenshot)
3. What did you expect to see?
4. Any error messages in console? (F12 → Console tab)

**Console Logs to Copy:**
- Look for any red errors
- Look for messages with `[useMayaChat]` prefix

---

## 🎉 Expected Results

All 4 tests should **PASS** ✅

---

## Developer Notes

**Files Changed:** `components/sselfie/maya/hooks/use-maya-chat.ts`  
**Lines Added:** ~50 lines (new useEffect for tab switching)  
**Backup Available:** Yes (timestamped backup in same folder)

**Quick Rollback (if needed):**
```bash
cd components/sselfie/maya/hooks
ls -la use-maya-chat.ts.backup-*  # Find the backup
cp use-maya-chat.ts.backup-XXXXX use-maya-chat.ts  # Restore
```

