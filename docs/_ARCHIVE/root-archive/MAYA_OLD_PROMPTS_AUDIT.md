# MAYA OLD PROMPTS AUDIT - Root Cause Analysis

**Date:** January 2025  
**Issue:** Maya still using old prompts despite refactoring  
**Status:** 🔴 **ISSUE IDENTIFIED**

---

## EXECUTIVE SUMMARY

**Root Cause:** Feed Planner tab is using the OLD `MAYA_SYSTEM_PROMPT` from `lib/maya/personality.ts` instead of the new unified system.

**Impact:** 
- ✅ Regular chat uses new unified system (working correctly)
- ❌ Feed Planner tab uses old system prompt (still using old prompts)
- ✅ Prompt Builder uses its own system (working correctly)

---

## DETAILED FINDINGS

### ✅ CORRECT USAGE (New Unified System)

**Location:** `app/api/maya/chat/route.ts` - Line 720-726

```typescript
} else {
  // Use unified Maya system with mode-specific adapters
  // Note: getMayaSystemPrompt() includes MAYA_VOICE, MAYA_CORE_INTELLIGENCE,
  // and MAYA_PROMPT_PHILOSOPHY - no direct import needed
  const config = isStudioProMode ? MAYA_PRO_CONFIG : MAYA_CLASSIC_CONFIG
  systemPrompt = getMayaSystemPrompt(config)
}
```

**Status:** ✅ **CORRECT** - Uses new unified system

---

### ❌ INCORRECT USAGE (Old System Prompt)

**Location:** `app/api/maya/chat/route.ts` - Line 686-708

```typescript
} else if (chatType === "feed-planner" || isFeedTab) {
  // ... feed planner setup ...
  
  systemPrompt = getFeedPlannerContextAddon(userSelectedMode) + MAYA_SYSTEM_PROMPT
  //                                                                 ^^^^^^^^^^^^^^^^^^^^
  //                                                                 OLD SYSTEM PROMPT!
}
```

**Problem:** 
- Uses `MAYA_SYSTEM_PROMPT` from `lib/maya/personality.ts` (old system)
- Should use `getMayaSystemPrompt(config)` (new unified system)
- This is why Feed Planner still uses old prompts

**Status:** ❌ **NEEDS FIX**

---

### ✅ CORRECT USAGE (Prompt Builder)

**Location:** `app/api/maya/chat/route.ts` - Line 683-685

```typescript
if (chatType === "prompt_builder") {
  systemPrompt = PROMPT_BUILDER_SYSTEM
  // Uses its own dedicated system prompt (correct)
}
```

**Status:** ✅ **CORRECT** - Has its own system prompt

---

## WHY THIS HAPPENED

**Timeline:**
1. ✅ New unified system created (`core-personality.ts` + `mode-adapters.ts`)
2. ✅ Regular chat updated to use new system
3. ❌ Feed Planner was missed during refactoring
4. ❌ Feed Planner still references old `MAYA_SYSTEM_PROMPT`

**Root Cause:**
- Feed Planner condition was added/modified separately
- Developer forgot to update Feed Planner to use new unified system
- Old import `MAYA_SYSTEM_PROMPT` still exists and is being used

---

## IMPACT ANALYSIS

### What's Affected:

1. **Feed Planner Tab** ❌
   - Uses old 563-line system prompt from `personality.ts`
   - Missing new unified personality components:
     - Missing `MAYA_VOICE` (new voice guidelines)
     - Missing `MAYA_CORE_INTELLIGENCE` (new brand knowledge)
     - Missing `MAYA_PROMPT_PHILOSOPHY` (new prompt philosophy)
   - Still has old prompt generation rules
   - Still has old voice examples

2. **Regular Chat** ✅
   - Uses new unified system correctly
   - Has all new personality components
   - Working as expected

3. **Concept Generation** ✅
   - Uses new unified system correctly
   - Has all new personality components
   - Working as expected

---

## CONVERSATION HISTORY IMPACT

**Question:** Could this be a history issue?

**Answer:** ❌ **NO** - This is NOT a conversation history issue.

**Why:**
1. System prompts are applied **fresh on every request** (line 682-726)
2. Conversation history is added **after** system prompt is set (line 744-766)
3. The issue is the **system prompt itself**, not the conversation history
4. Even with empty conversation history, Feed Planner would still use old prompts

**Evidence:**
- System prompt is built fresh each request (no caching)
- Conversation history is appended separately (doesn't override system prompt)
- The problem is which system prompt is selected, not what's in history

---

## FILES INVOLVED

### Files Using OLD System Prompt:

1. **`app/api/maya/chat/route.ts`** (Line 2, 708)
   - Imports: `import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"`
   - Uses: `systemPrompt = getFeedPlannerContextAddon(userSelectedMode) + MAYA_SYSTEM_PROMPT`

### Files Using NEW Unified System:

1. **`app/api/maya/chat/route.ts`** (Line 3, 725)
   - Imports: `import { getMayaSystemPrompt, MAYA_CLASSIC_CONFIG, MAYA_PRO_CONFIG } from "@/lib/maya/mode-adapters"`
   - Uses: `systemPrompt = getMayaSystemPrompt(config)`

2. **`app/api/maya/generate-concepts/route.ts`** (Line 45, 1243)
   - Uses: `getMayaSystemPrompt(config)`

3. **`app/api/maya/generate-feed-prompt/route.ts`** (Line 6, 174)
   - Uses: `getMayaSystemPrompt(config)`

---

## THE FIX

### Required Change:

**File:** `app/api/maya/chat/route.ts`

**Current Code (Line 686-708):**
```typescript
} else if (chatType === "feed-planner" || isFeedTab) {
  const { getFeedPlannerContextAddon } = await import("@/lib/maya/feed-planner-context")
  
  let userSelectedMode: "pro" | "classic" | null = null
  if (studioProHeader === "true") {
    userSelectedMode = "pro"
  } else if (studioProHeader === "false") {
    userSelectedMode = "classic"
  } else {
    userSelectedMode = null
  }
  
  systemPrompt = getFeedPlannerContextAddon(userSelectedMode) + MAYA_SYSTEM_PROMPT
  //                                                                 ^^^^^^^^^^^^^^^^^^^^
  //                                                                 OLD - NEEDS FIX
}
```

**Fixed Code:**
```typescript
} else if (chatType === "feed-planner" || isFeedTab) {
  const { getFeedPlannerContextAddon } = await import("@/lib/maya/feed-planner-context")
  
  // Determine mode for unified system
  let userSelectedMode: "pro" | "classic" | null = null
  if (studioProHeader === "true") {
    userSelectedMode = "pro"
  } else if (studioProHeader === "false") {
    userSelectedMode = "classic"
  } else {
    userSelectedMode = null
  }
  
  // Use new unified system instead of old MAYA_SYSTEM_PROMPT
  const config = userSelectedMode === "pro" ? MAYA_PRO_CONFIG : MAYA_CLASSIC_CONFIG
  const unifiedSystemPrompt = getMayaSystemPrompt(config)
  
  // Combine feed planner context with unified system
  systemPrompt = getFeedPlannerContextAddon(userSelectedMode) + unifiedSystemPrompt
}
```

### Also Remove Old Import:

**Line 2:**
```typescript
// REMOVE THIS:
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"

// KEEP THIS:
import { getMayaSystemPrompt, MAYA_CLASSIC_CONFIG, MAYA_PRO_CONFIG } from "@/lib/maya/mode-adapters"
```

---

## VERIFICATION CHECKLIST

After fix, verify:

- [ ] Feed Planner uses `getMayaSystemPrompt(config)` instead of `MAYA_SYSTEM_PROMPT`
- [ ] Old import `MAYA_SYSTEM_PROMPT` removed from chat route
- [ ] Feed Planner gets new unified personality components
- [ ] Mode switching works correctly in Feed Planner
- [ ] No TypeScript errors
- [ ] Feed Planner responses match new personality

---

## SUMMARY

**Issue:** Feed Planner tab using old system prompt  
**Root Cause:** Missed during refactoring - still references `MAYA_SYSTEM_PROMPT`  
**Fix:** Update Feed Planner to use `getMayaSystemPrompt(config)`  
**Impact:** Feed Planner will get new unified personality after fix  
**History Issue?** ❌ No - system prompts are fresh each request

---

**Ready for implementation?** ✅

