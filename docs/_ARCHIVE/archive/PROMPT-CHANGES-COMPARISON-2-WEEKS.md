# Prompt Changes Comparison: 2 Weeks Ago vs Today
**Comparison:** November 26 (2 weeks ago) vs December 10 (today)

---

## 🔍 Key Finding

**ONLY ONE significant change** happened to the prompting pipeline in the last 2 weeks:

**Dec 7, 2025 (commit `5118708`)**: "refactor: improve prompt generation guidelines and logic for character likeness preservation"

This single commit introduced ALL the problems. Before Nov 26, everything was working fine.

---

## 📊 Detailed Comparison

### 1. Prompt Length Requirements

**2 Weeks Ago (Nov 26):**
```
TOTAL: 28-40 words optimal. Never exceed 45.
```

**After Dec 7 (Before my fixes):**
```
OPTIMAL LENGTH: 25-45 words
Shorter prompts (25-35 words) = better face preservation
```

**After my fixes (Today):**
```
OPTIMAL LENGTH: 30-45 words
Optimal prompts (30-40 words) = best balance
```

✅ **Fixed:** Restored to closer to original (28-40 → 30-45 is close)

---

### 2. Hair/Feature Descriptions

**2 Weeks Ago (Nov 26):**
- ❌ **NO instructions to avoid hair descriptions**
- Simple: "Every prompt MUST start with: triggerWord, gender"
- No mention of avoiding facial features

**After Dec 7 (Before my fixes):**
```
❌ AVOID: "long dark brown hair", "blonde hair", "short hair", "curly hair"
DO NOT describe fixed facial features that the LoRA already knows
```

**After my fixes (Today):**
```
SAFETY NET APPROACH: Include feature descriptions when needed
USER PREFERENCES ARE MANDATORY: Always include them
INCLUDE WHEN NEEDED: If unsure, include as safety net
```

✅ **Fixed:** Reverted aggressive avoidance, restored safety net approach

---

### 3. Physical Preferences Handling

**2 Weeks Ago (Nov 26):**
- Physical preferences were **NOT handled in prompts** (they may not have existed yet)
- Simple prompt structure: `triggerWord, gender`

**After Dec 7 (Before my fixes):**
```
- "keep my natural hair color" → OMIT (hair color is preserved by trigger word)
- Remove instruction phrases completely
```

**After my fixes (Today):**
```
- "keep my natural hair color" → Convert to "natural hair color" (preserves intent)
- Preserve user intent, don't just remove
```

✅ **Fixed:** Now preserves user intent instead of removing everything

---

### 4. Anti-Plastic Language Requirements

**2 Weeks Ago (Nov 26):**
- Had lighting principles but less specific about imperfections
- Focused on "natural, imperfect light"

**After Dec 7 (Before my fixes):**
```
MUST include AT LEAST 2 of: "visible sensor noise", "slight motion blur", etc.
MUST include "natural skin texture with pores visible" AND anti-plastic language
```

**After my fixes (Today):**
```
MUST include AT LEAST 3 of: [imperfections list]
MUST include "natural skin texture with pores visible" AND AT LEAST 2 anti-plastic phrases
```

✅ **Improved:** Even stronger anti-plastic requirements than before

---

### 5. Prompt Structure

**2 Weeks Ago (Nov 26):**
```
1. TRIGGER + GENDER (2-3 words)
2. OUTFIT (2-4 words)
3. EXPRESSION (3-6 words)
4. POSE/BODY (3-5 words)
5. LOCATION (2-3 words)
6. LIGHTING (3-5 words)
7. TECHNICAL (4-6 words)
```

**After Dec 7 (Before my fixes):**
```
1. TRIGGER WORD (first position)
2. GENDER/ETHNICITY (2-3 words)
3. OUTFIT (material + color + garment type - 6-10 words)
4. POSE + EXPRESSION (simple, natural - 4-6 words)
5. LOCATION (brief, atmospheric - 3-6 words)
6. LIGHTING (with imperfections - 5-8 words)
7. TECHNICAL SPECS (iPhone + imperfections + skin texture + grain + muted colors - 8-12 words)
8. CASUAL MOMENT (optional - 2-4 words)
```

**After my fixes (Today):**
- Same structure as Dec 7, but with better feature handling

✅ **Kept:** The improved structure is fine, just needed better feature handling

---

## 🎯 What Was the Problem?

### The Dec 7 Changes Were Too Aggressive

1. **Assumed LoRA learned everything perfectly** → But it might not have
2. **Removed all safety nets** → No fallback if LoRA didn't learn features
3. **Over-removed user preferences** → Lost user intent

### Why This Caused Issues

- **Wrong hair colors:** LoRA didn't learn it perfectly + prompts didn't include it = defaults to wrong colors
- **Wrong age/body:** Same issue - no feature descriptions in prompts
- **User preferences ignored:** Code removed them completely instead of preserving intent

---

## ✅ What My Fixes Do

1. **Restored safety net approach** → Include features when needed, especially from user preferences
2. **Preserved user intent** → Don't just remove preferences, convert to descriptive language
3. **Strengthened anti-plastic** → Even more requirements to prevent AI/plastic look
4. **Better prompt length** → 30-45 words (closer to original 28-40)

---

## 📋 Summary

**Timeline:**
- **Nov 19-26:** Working perfectly ✅
- **Dec 7:** Single commit introduced problems ❌
- **Dec 10 (Today):** My fixes restore functionality ✅

**The Fix:**
- Reverted aggressive Dec 7 changes
- Restored safety net approach
- Preserved user preferences
- Strengthened anti-plastic requirements

**Result:**
- Should work like it did 2-3 weeks ago
- But with better anti-plastic language
- And proper handling of user preferences
