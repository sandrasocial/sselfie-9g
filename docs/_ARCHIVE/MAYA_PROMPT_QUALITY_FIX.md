# Maya Prompt Quality Degradation - Fix Applied

## Date: January 2025
## Status: ✅ FIXED

---

## 🔴 ROOT CAUSE IDENTIFIED

**Problem:** Maya's prompt quality degraded significantly after blueprint funnel implementation. Users reported poor prompting results in both Pro Mode and Classic Mode.

**Root Cause:** The feed planner context (880+ lines) was **leaking into regular Maya chat**, overwhelming Maya's core personality and causing degraded prompt quality.

### The Bug

**Location:** `app/api/maya/chat/route.ts:685`

**Before (BROKEN):**
```typescript
} else if (chatType === "feed-planner" || isFeedTab) {
  // Feed planner context loaded even if chatType is not "feed-planner"
  systemPrompt = getFeedPlannerContextAddon(userSelectedMode) + unifiedSystemPrompt
}
```

**Issue:**
- If `isFeedTab` header was set to "feed" during regular Maya chat, the massive feed planner context (880 lines) would load
- Feed planner context was PREPENDED (came before Maya's core personality)
- This 3.2x larger context was overwhelming Maya's core intelligence

---

## ✅ FIXES APPLIED

### Fix 1: Strict Context Loading Condition

**Changed:**
```typescript
// BEFORE: chatType === "feed-planner" || isFeedTab
// AFTER: chatType === "feed-planner" && isFeedTab
```

**Result:** Feed planner context now ONLY loads when BOTH conditions are true:
- `chatType === "feed-planner"` AND
- `isFeedTab === true`

This prevents feed planner context from leaking into regular Maya chat.

### Fix 2: Context Order (Append Instead of Prepend)

**Changed:**
```typescript
// BEFORE: feedContext + unifiedSystem (feed context comes FIRST)
// AFTER: unifiedSystem + feedContext (Maya's core personality comes FIRST)
```

**Result:** Maya's core personality now comes FIRST, and feed planner context ADDS to it rather than overriding it.

### Fix 3: Enhanced Logging

**Added comprehensive logging to track:**
- When feed planner context is loaded vs regular Maya chat
- System prompt length and context type
- Warnings when `isFeedTab` is set but `chatType` is not "feed-planner"

---

## 📊 IMPACT ANALYSIS

### Before Fix

**Regular Maya Chat:**
- System prompt: ~390-395 lines (Maya's core personality)
- **BUT:** If `isFeedTab` header was set, feed planner context (880 lines) would leak in
- **Total:** Up to 1,275 lines (3.2x larger than intended)
- **Result:** Maya's core personality overwhelmed by feed planner rules

**Feed Planner Chat:**
- System prompt: 1,275 lines (feed context + unified system)
- Feed context came FIRST, potentially overriding Maya's personality

### After Fix

**Regular Maya Chat:**
- System prompt: ~390-395 lines (Maya's core personality ONLY)
- Feed planner context: NOT loaded (strict condition prevents leakage)
- **Result:** Maya's core personality intact and focused

**Feed Planner Chat:**
- System prompt: 1,275 lines (Maya's core personality FIRST, then feed context)
- Feed context ADDS to Maya's expertise, doesn't replace it
- **Result:** Maya maintains her personality while adding feed planning expertise

---

## 🧪 TESTING RECOMMENDATIONS

### Test 1: Regular Maya Chat (Classic Mode)
1. Open Maya chat (NOT feed planner)
2. Send: "Create some street style concepts"
3. **Verify:**
   - ✅ System prompt does NOT include feed planner context
   - ✅ Generated prompts are 30-60 words
   - ✅ Prompts start with trigger word
   - ✅ Maya's personality is warm and focused
   - ✅ Logs show: `contextType: "regular-maya-only"`

### Test 2: Regular Maya Chat (Pro Mode)
1. Toggle to Pro Mode
2. Send: "Create some street style concepts"
3. **Verify:**
   - ✅ System prompt does NOT include feed planner context
   - ✅ Generated prompts are 150-200 words
   - ✅ Prompts start with identity preservation phrase
   - ✅ Logs show: `contextType: "regular-maya-only"`

### Test 3: Feed Planner Chat
1. Open feed planner tab
2. Send: "Create a feed in Clean & Minimalistic style"
3. **Verify:**
   - ✅ System prompt DOES include feed planner context
   - ✅ Logs show: `contextType: "feed-planner"` and `contextOrder: "unified-system-first-then-feed-context"`
   - ✅ Response includes feed strategy JSON
   - ✅ Aesthetic-specific instructions are followed

---

## 📝 FILES MODIFIED

1. **`app/api/maya/chat/route.ts`**
   - Fixed feed planner context loading condition (line 685)
   - Changed context order (append instead of prepend)
   - Added comprehensive logging

---

## 🎯 EXPECTED RESULTS

### Immediate Improvements

1. **Maya's Core Personality Restored**
   - Regular chat no longer overwhelmed by feed planner rules
   - Maya's voice, expertise, and prompt philosophy intact

2. **Better Prompt Quality**
   - Classic Mode: Concise, focused prompts (30-60 words)
   - Pro Mode: Detailed, editorial prompts (150-200 words)
   - Prompts match user requests accurately

3. **No Context Leakage**
   - Feed planner context only loads in feed planner
   - Regular chat uses Maya's core personality only

### Long-term Benefits

1. **Maintainable Architecture**
   - Clear separation between regular chat and feed planner
   - Easy to debug context loading issues

2. **Better Logging**
   - Track exactly which context is loaded
   - Identify any future context leakage issues

---

## 🔍 MONITORING

**Watch for these log messages:**

**Regular Maya Chat (GOOD):**
```
[Maya Chat] ✅ Regular Maya Chat Mode (NO Feed Planner Context)
  contextType: "regular-maya-only"
  systemPromptLength: ~390-395
```

**Feed Planner Chat (GOOD):**
```
[Maya Chat] ✅✅✅ FEED PLANNER AESTHETIC EXPERTISE LOADED ✅✅✅
  contextType: "feed-planner"
  contextOrder: "unified-system-first-then-feed-context"
  systemPromptLength: ~1,275
```

**Potential Issue (WATCH):**
```
[Maya Chat] ✅ Regular Maya Chat Mode (NO Feed Planner Context)
  warning: "⚠️ isFeedTab=true but chatType is not feed-planner - feed context correctly NOT loaded"
```

If you see the warning above, it means the frontend is sending `x-active-tab: feed` header in regular chat, but the fix correctly prevents context leakage.

---

## ✅ VERIFICATION CHECKLIST

- [x] Feed planner context loading condition fixed (requires BOTH chatType AND isFeedTab)
- [x] Context order fixed (Maya's core personality comes first)
- [x] Enhanced logging added
- [x] No linting errors
- [ ] Test regular Maya chat (Classic Mode)
- [ ] Test regular Maya chat (Pro Mode)
- [ ] Test feed planner chat
- [ ] Monitor logs for context loading

---

## 📚 RELATED DOCUMENTS

- `docs/MAYA-PROMPTING-AUDIT-2025.md` - Original audit identifying the issue
- `lib/maya/feed-planner-context.ts` - Feed planner context (880 lines)
- `lib/maya/core-personality.ts` - Maya's core personality
- `lib/maya/mode-adapters.ts` - Mode-specific adapters

---

**Fix Completed:** January 2025  
**Next Steps:** Test in development, monitor logs, gather user feedback
