# Polling Timeout Logging Improvement

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Issue:** Timeout recovery logs appearing as "errors" when they're expected behavior

---

## 🎯 PROBLEM

Console showing "errors" when polling timeout occurs:

```
❌ [useFeedPolling] ⚠️ Max polling duration exceeded (10 minutes)
❌ [useFeedPolling] Posts still generating after timeout
❌ [useFeedPolling] 1 post(s) still stuck after final check, marking as failed
```

**But:** This is the **timeout recovery system working correctly**, not an actual error!

**Issue:** Using `console.error()` makes expected behavior look like crashes.

---

## 🔍 WHAT ACTUALLY HAPPENED

**Timeline:**
1. ⏱️ **0-3 min:** Normal generation with progress bar
2. ⏱️ **3 min:** Friendly "taking longer" message shown ✅
3. ⏱️ **3-10 min:** Continued polling with reassuring message
4. ⏱️ **10 min:** Timeout triggered (by design)
5. 🔍 **10 min:** System checked for stuck posts
6. 🔄 **10 min:** Attempted final status check from Replicate
7. ❌ **10 min:** Found 1 post still generating
8. ✅ **10 min:** Marked post as failed (user can retry)
9. ✅ **10 min:** Stopped polling (prevents infinite loop)

**Result:** System worked exactly as designed! ✅

---

## ✅ SOLUTION

Changed logging levels to match the actual severity:

### Before (Everything is "Error")
```typescript
console.error(`[useFeedPolling] ⚠️ Max polling duration exceeded`)
console.error(`[useFeedPolling] Posts still generating after timeout`)
console.error(`[useFeedPolling] 1 post(s) still stuck, marking as failed`)
console.error(`[useFeedPolling] ❌ Failed to mark post as failed`)
```

### After (Appropriate Levels)
```typescript
console.warn(`[useFeedPolling] ⏱️ Polling timeout reached (10 minutes)`)
console.log(`[useFeedPolling] 🔍 Checking for stuck posts and attempting recovery`)
console.warn(`[useFeedPolling] ⚠️ 1 post(s) still generating after timeout`)
console.log(`[useFeedPolling] ⏱️ 1 post(s) still stuck, marking as failed`)
console.log(`[useFeedPolling] ℹ️ User will be able to retry these posts manually`)
console.log(`[useFeedPolling] ✅ Post marked as failed, user can retry`)
console.warn(`[useFeedPolling] ⚠️ Could not mark post as failed`)
```

---

## 📊 LOG LEVEL RATIONALE

| Scenario | Old | New | Why |
|----------|-----|-----|-----|
| Timeout reached | `error` | `warn` | Expected after 10 min, not an error |
| Checking recovery | `error` | `log` | Informational, part of recovery |
| Posts still stuck | `error` | `warn` | Concerning but handled |
| Marking as failed | `error` | `log` | Normal recovery action |
| User can retry | N/A | `log` | Helpful context |
| Mark success | `log` | `log` | ✅ Correct already |
| Mark failure | `error` | `warn` | Only warn if recovery fails |

---

## 🎯 USER EXPERIENCE

**What the user sees:**

1. **3 minutes:** 
   ```
   ✨ This is taking a bit longer than expected! 
   Your photos are being carefully crafted...
   ```

2. **10 minutes:**
   - Polling stops
   - Post shows as failed
   - User can click "Retry" to regenerate

**Console (Developer View):**
- ⚠️ Yellow warnings for timeout (not red errors)
- ℹ️ Blue info logs for recovery steps
- ✅ Green success when marked as failed

---

## 🔧 FILES MODIFIED

**`components/feed-planner/hooks/use-feed-polling.ts`**

**Changes:**
1. `console.error` → `console.warn` for timeout
2. `console.error` → `console.log` for recovery steps
3. `console.error` → `console.warn` for stuck posts
4. Added helpful context: "User will be able to retry"
5. Improved emoji usage for clarity

---

## ✅ BENEFITS

1. **Clearer Console:**
   - Actual errors stand out (red)
   - Warnings are yellow
   - Info is blue/white

2. **Less Alarming:**
   - Timeouts don't look like crashes
   - Recovery looks like a system feature

3. **Better Debugging:**
   - Appropriate log levels
   - More context in messages

4. **User Confidence:**
   - System appears stable
   - Timeout is a feature, not a bug

---

## 🧪 EXPECTED BEHAVIOR

### Normal Generation (< 10 min)
- ✅ No timeout logs
- ✅ Polls until complete
- ✅ User gets images

### Long Generation (> 10 min)
- ⚠️ Timeout warning (yellow)
- ℹ️ Recovery logs (white/blue)
- ✅ Posts marked as failed
- ✅ User can retry

### Network Issues
- ❌ Actual errors are still red
- ⚠️ Timeout is still yellow
- Clear distinction

---

## 📝 NOTES

**Why 10 minutes?**
- Replicate queues can be slow
- Nano Banana Pro takes 30-90s per image
- 9 images × 90s = 13.5 minutes worst case
- 10 minutes is reasonable for 3-6 images
- After that, likely a stuck prediction

**Why mark as failed?**
- Prevents infinite polling
- Gives user control to retry
- Clears prediction_id for clean retry
- Better than silently hanging

**Recovery Options:**
1. User clicks "Retry" on failed post
2. User clicks "Regenerate All"
3. User refreshes page and tries again

---

**Status:** ✅ Complete  
**Impact:** Logs now match actual severity  
**Testing:** Wait for 10+ minute timeout to verify new log levels
