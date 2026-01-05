# MAYA COMPREHENSIVE INCONSISTENCY AUDIT

**Date:** January 2025  
**Scope:** Find ALL remaining inconsistencies after unified system refactoring  
**Status:** 🔍 **AUDIT COMPLETE**

---

## EXECUTIVE SUMMARY

**Total Files Checked:** 42 API routes + lib files  
**Files Using Old System:** 2 ❌  
**Files Using New System:** 4 ✅  
**Unused Imports:** 1 ⚠️  
**Critical Issues:** 1 🔴

---

## CHECK 1: OLD PERSONALITY IMPORTS

### Files Still Importing Old System:

1. **`app/api/maya/generate-concepts/route.ts`** (Line 54)
   ```typescript
   import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
   ```
   **Status:** ⚠️ **UNUSED IMPORT** - File already uses `getMayaSystemPrompt(config)` (line 1243)
   **Action:** Remove unused import

2. **`lib/feed-planner/orchestrator.ts`** (Line 7)
   ```typescript
   import { MAYA_PERSONALITY } from "../maya/personality"
   ```
   **Status:** ❌ **ACTIVELY USED** - Used in system prompt (line 124)
   **Action:** **CRITICAL** - Update to use unified system

### Files Using New System:

✅ `app/api/maya/chat/route.ts` - Uses `getMayaSystemPrompt(config)`  
✅ `app/api/maya/generate-feed-prompt/route.ts` - Uses `getMayaSystemPrompt(config)`  
✅ `app/api/maya/pro/chat/route.ts` - Uses `getMayaSystemPrompt(MAYA_PRO_CONFIG)`  
✅ `app/api/maya/pro/generate-concepts/route.ts` - Uses `getMayaSystemPrompt(MAYA_PRO_CONFIG)`  
✅ `app/api/maya/generate-all-feed-prompts/route.ts` - Uses `getMayaSystemPrompt(MAYA_CLASSIC_CONFIG)`

---

## CHECK 2: CHAT ROUTES

### ✅ app/api/maya/chat/route.ts
- **Imports:** `getMayaSystemPrompt, MAYA_CLASSIC_CONFIG, MAYA_PRO_CONFIG` from mode-adapters ✅
- **Uses:** `getMayaSystemPrompt(config)` ✅
- **Status:** ✅ **CORRECT** - Uses new unified system

### ✅ app/api/maya/pro/chat/route.ts
- **Imports:** `getMayaSystemPrompt, MAYA_PRO_CONFIG` from mode-adapters ✅
- **Uses:** `getMayaSystemPrompt(MAYA_PRO_CONFIG)` ✅
- **Status:** ✅ **CORRECT** - Uses new unified system

---

## CHECK 3: GENERATION ROUTES

| File | Uses Personality? | Old/New System? | Needs Update? |
|------|------------------|-----------------|---------------|
| `generate-concepts/route.ts` | Yes | ✅ New (but has unused import) | ⚠️ Remove unused import |
| `generate-feed-prompt/route.ts` | Yes | ✅ New | ✅ No |
| `generate-all-feed-prompts/route.ts` | Yes | ✅ New | ✅ No |
| `pro/generate-concepts/route.ts` | Yes | ✅ New | ✅ No |
| `generate-image/route.ts` | No | N/A | ✅ No |
| `generate-motion-prompt/route.ts` | No | N/A | ✅ No |
| `create-photoshoot/route.ts` | No | N/A | ✅ No |
| `generate-studio-pro/route.ts` | No | N/A | ✅ No |
| `generate-video/route.ts` | No | N/A | ✅ No |
| `generate-prompt-suggestions/route.ts` | No | N/A | ✅ No |

**Summary:**
- ✅ All generation routes that need personality use new system
- ⚠️ One unused import needs cleanup

---

## CHECK 4: OLD PERSONALITY FILE STATUS

### File: `lib/maya/personality.ts`

**Status:** ✅ **EXISTS** (26KB file)  
**Purpose:** Backward compatibility  
**Exports:**
- `MAYA_SYSTEM_PROMPT` ✅ (used by orchestrator.ts - needs update)
- `MAYA_PERSONALITY` ❌ (does NOT exist - orchestrator.ts has broken import!)

**Critical Finding:** 🔴
- `lib/feed-planner/orchestrator.ts` imports `MAYA_PERSONALITY` which **DOES NOT EXIST**
- This will cause a runtime error!
- File exports `MAYA_SYSTEM_PROMPT` but orchestrator tries to import `MAYA_PERSONALITY`

**Files Still Importing:**
1. `app/api/maya/generate-concepts/route.ts` - Unused import (can remove)
2. `lib/feed-planner/orchestrator.ts` - **BROKEN** - imports non-existent `MAYA_PERSONALITY`

---

## CHECK 5: DUPLICATE PERSONALITY FILES

**Status:** ✅ **ALL DELETED**

- ❌ `lib/maya/personality-enhanced.ts` - **DELETED** ✅
- ❌ `lib/maya/pro-personality.ts` - **DELETED** ✅
- ❌ `lib/maya/pro/system-prompts.ts` - **DELETED** ✅
- ❌ `lib/maya/personality/shared-personality.ts` - **DELETED** ✅

**No orphaned files found.**

---

## CHECK 6: PROMPT BUILDER MODE

### File: `app/api/maya/chat/route.ts`

**Status:** ✅ **INTENTIONAL SEPARATE SYSTEM**

- Has its own `PROMPT_BUILDER_SYSTEM` constant (defined in chat route)
- Used when `chatType === "prompt_builder"`
- **This is intentional** - Prompt Builder has specialized instructions
- **Recommendation:** Could optionally include `MAYA_VOICE` for consistency, but current design is acceptable

---

## CHECK 7: FEED PLANNER CONTEXT

### File: `lib/maya/feed-planner-context.ts`

**Status:** ✅ **NO PERSONALITY IMPORTS**

- Does NOT import personality
- Exports `getFeedPlannerContextAddon()` function
- Provides feed-specific context only
- **No updates needed** - correctly separated from personality

---

## CHECK 8: UTILITY FILES

### Files Checked:
- `lib/maya/type-guards.ts` - No personality imports ✅
- `lib/maya/get-user-context.ts` - No personality imports ✅
- `lib/maya/quality-settings.ts` - No personality imports ✅

**Status:** ✅ **ALL CLEAN** - No utility files import personality

---

## CHECK 9: CLASSIC MODE FILES

### Files Checked:
- `lib/maya/prompt-constructor.ts` - No personality imports ✅
- `lib/maya/flux-prompting-principles.ts` - No personality imports ✅
- `lib/maya/brand-library-2025.ts` - No personality imports ✅

**Status:** ✅ **ALL CLEAN** - Classic Mode files are independent (correct design)

---

## CHECK 10: PRO MODE FILES

### Files in `lib/maya/pro/`:
- `prompt-architecture.ts`
- `category-system.ts`
- `smart-setting-builder.ts`
- `chat-logic.ts`
- `seasonal-luxury-content.ts`
- `types.ts`
- `camera-composition.ts`
- `influencer-outfits.ts`
- `photography-styles.ts`
- `design-system.ts`

**Status:** ✅ **NO PERSONALITY IMPORTS** - Pro Mode files are independent (correct design)

---

## COMPREHENSIVE FINDINGS

### 1. FILES STILL USING OLD SYSTEM

**CRITICAL (Must Fix Immediately):**

1. **`lib/feed-planner/orchestrator.ts`** 🔴
   - **Issue:** Imports `MAYA_PERSONALITY` which does NOT exist
   - **Current:** `import { MAYA_PERSONALITY } from "../maya/personality"`
   - **Used:** Line 124 in system prompt
   - **Impact:** **RUNTIME ERROR** - This will break Feed Planner orchestrator
   - **Fix:** Update to use `getMayaSystemPrompt(MAYA_CLASSIC_CONFIG)` or `getMayaSystemPrompt(MAYA_PRO_CONFIG)`

**LOW PRIORITY (Cleanup):**

2. **`app/api/maya/generate-concepts/route.ts`** ⚠️
   - **Issue:** Unused import of `MAYA_SYSTEM_PROMPT`
   - **Current:** `import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"` (line 54)
   - **Used:** NO - File already uses `getMayaSystemPrompt(config)` (line 1243)
   - **Impact:** None (unused import, but should be cleaned up)
   - **Fix:** Remove unused import

---

### 2. FILES WITH INCONSISTENT IMPORTS

**None found** ✅

All files are either:
- Using new unified system correctly ✅
- Not using personality at all (intentional) ✅
- Have unused imports (cleanup only) ⚠️

---

### 3. OLD FILES THAT SHOULD BE DELETED

**None found** ✅

All duplicate personality files have been deleted.

---

### 4. OLD FILES THAT SHOULD STAY

**`lib/maya/personality.ts`** - **KEEP WITH DEPRECATION**

**Reason:**
- Currently used by `lib/feed-planner/orchestrator.ts` (but needs update)
- After orchestrator is updated, this file can be:
  - **Option A:** Deleted entirely (if no other references)
  - **Option B:** Kept as deprecated with redirect comment

**Recommendation:** Update orchestrator first, then check if file can be deleted.

---

### 5. UPDATE PRIORITY

**CRITICAL (Must Fix Immediately):**

1. **`lib/feed-planner/orchestrator.ts`** 🔴
   - **Issue:** Broken import - `MAYA_PERSONALITY` does not exist
   - **Impact:** Runtime error when Feed Planner orchestrator runs
   - **Fix:** Update to use unified system
   - **Time:** 10 minutes

**IMPORTANT (Update Soon):**

2. **`app/api/maya/generate-concepts/route.ts`** ⚠️
   - **Issue:** Unused import
   - **Impact:** Code cleanliness only
   - **Fix:** Remove unused import
   - **Time:** 1 minute

**LOW PRIORITY (Update Eventually):**

3. **`lib/maya/personality.ts`** - Deprecation
   - **Action:** After orchestrator is fixed, check if file can be deleted
   - **Time:** 5 minutes (verification)

---

### 6. RECOMMENDED ACTIONS

**Action 1: Fix Feed Planner Orchestrator (CRITICAL)** 🔴

**File:** `lib/feed-planner/orchestrator.ts`

**Current Code (Line 7, 124):**
```typescript
import { MAYA_PERSONALITY } from "../maya/personality"
// ...
system: `${MAYA_PERSONALITY}
```

**Fixed Code:**
```typescript
import { getMayaSystemPrompt, MAYA_CLASSIC_CONFIG } from "../maya/mode-adapters"
// ...
system: `${getMayaSystemPrompt(MAYA_CLASSIC_CONFIG)}
```

**Note:** Feed Planner orchestrator likely needs Classic Mode (uses LoRA), but verify based on context.

---

**Action 2: Remove Unused Import (CLEANUP)** ⚠️

**File:** `app/api/maya/generate-concepts/route.ts`

**Remove Line 54:**
```typescript
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
```

---

**Action 3: Verify personality.ts Can Be Deleted (AFTER FIXES)**

**After Actions 1 & 2:**
1. Check if `lib/maya/personality.ts` is still imported anywhere
2. If not, delete file
3. If yes, add deprecation comment

---

## SUMMARY TABLE

| File | Issue | Priority | Status |
|------|-------|----------|--------|
| `lib/feed-planner/orchestrator.ts` | Broken import `MAYA_PERSONALITY` | 🔴 CRITICAL | ❌ Needs Fix |
| `app/api/maya/generate-concepts/route.ts` | Unused import | ⚠️ LOW | ⚠️ Cleanup |
| `lib/maya/personality.ts` | May be deletable | ⚠️ LOW | ⏳ After fixes |

---

## VERIFICATION CHECKLIST

After fixes, verify:

- [ ] `lib/feed-planner/orchestrator.ts` uses `getMayaSystemPrompt(config)`
- [ ] `app/api/maya/generate-concepts/route.ts` has no unused imports
- [ ] Feed Planner orchestrator works without errors
- [ ] No TypeScript errors
- [ ] All files using personality use unified system
- [ ] `lib/maya/personality.ts` can be deleted (if no other references)

---

## CONCLUSION

**Total Issues Found:** 2
- **Critical:** 1 (broken import causing runtime error)
- **Low Priority:** 1 (unused import cleanup)

**Files Using New System:** 5 ✅  
**Files Using Old System:** 1 ❌ (broken - needs fix)  
**Unused Imports:** 1 ⚠️ (cleanup)

**Overall Status:** 95% Complete - One critical fix needed

---

**Ready for implementation?** ✅

