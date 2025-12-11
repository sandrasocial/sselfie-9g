# Comprehensive Prompt Pipeline Changes Since 2 Weeks Ago
**Date:** December 10, 2025  
**Comparison Period:** November 26 (2 weeks ago) vs December 10 (today)

---

## Summary

I found **ONE major change** that affected prompting since 2 weeks ago:

**Dec 7, 2025 (commit `5118708`)**: "refactor: improve prompt generation guidelines and logic for character likeness preservation"

This single commit introduced ALL the problematic changes. Before Nov 26, the code was working well.

---

## Changes Between Nov 26 and Dec 7

### 1. **Added Aggressive Hair/Feature Avoidance** ❌

**Before (Nov 26):** No specific instruction to avoid describing hair/features

**After (Dec 7):** Added aggressive avoidance instructions:
```
- DO NOT describe fixed facial features that the LoRA already knows (hair color/style/length)
- ❌ AVOID: "long dark brown hair", "blonde hair", "short hair", "curly hair"
```

**Impact:** This is the MAIN issue causing wrong hair colors

---

### 2. **Changed Physical Preferences Handling** ❌

**Before (Nov 26):** Physical preferences were handled more simply

**After (Dec 7):** Added complex logic that:
- Removes "keep my natural hair color" completely
- Converts instructions to descriptive language, but removes too much
- Assumes LoRA learned everything perfectly

**Impact:** User's custom model instructions are being removed

---

### 3. **Reduced Prompt Length** ⚠️

**Before (Nov 26):** Optimal length was 30-45 words

**After (Dec 7):** Changed to 25-45 words (reduced minimum from 30 to 25)

**Impact:** Prompts may be too short, missing important details

**Note:** This was already partially reverted in my fixes

---

### 4. **Added Thematic Consistency** ✅

**After (Dec 7):** Added requirement for concepts to be thematically consistent

**Impact:** Positive change, helps with concept coherence

---

### 5. **Added More Detailed Requirements** ⚠️

**After (Dec 7):** Added many more mandatory requirements (10+ items)

**Impact:** More complex prompts, but may be causing issues if not all followed

---

## Key Finding

The **ONLY significant prompting change** since 2 weeks ago was the Dec 7 commit (`5118708`), which introduced:

1. **Aggressive hair/feature avoidance** ← Main problem
2. **Over-aggressive physical preferences removal** ← Secondary problem
3. **Reduced minimum prompt length** ← Minor issue

---

## What My Fixes Address

✅ **Fixed #1:** Reverted aggressive hair/feature avoidance → Now uses safety net approach  
✅ **Fixed #2:** Improved physical preferences handling → Preserves user intent  
✅ **Fixed #3:** Restored optimal prompt length to 30-45 words  

---

## Files That Changed (Dec 7)

1. `app/api/maya/generate-concepts/route.ts` - Added 101 lines (mostly the avoidance logic)
2. `lib/maya/flux-prompt-optimization.ts` - Updated (44 lines changed)
3. `lib/maya/flux-prompting-principles.ts` - Added 32 lines (avoidance section)
4. `lib/maya/personality.ts` - Updated (8 lines changed)

**Total:** 168 insertions, 17 deletions

---

## Conclusion

The Dec 7 commit (`5118708`) was the **only significant change** to prompting since 2 weeks ago, and it introduced all the problematic behavior:

1. Wrong hair colors (aggressive avoidance)
2. Wrong age/body type (feature avoidance)
3. User preferences being ignored (over-aggressive removal)

My fixes have addressed all of these issues.
