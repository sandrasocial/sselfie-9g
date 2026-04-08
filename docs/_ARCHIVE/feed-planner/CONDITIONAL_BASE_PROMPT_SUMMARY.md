# Conditional Base Prompt - Complete Audit Summary

**Date:** 2025-01-11  
**Status:** Audit Complete - Ready for Implementation Decision  
**Purpose:** Summary of options for conditional base prompts based on frame type

---

## EXECUTIVE SUMMARY

**Problem:** NanoBanana Pro is getting confused because detail shots (close-ups) and flatlays include the identity base prompt, which makes the model try to generate the user when it should focus on objects/accessories.

**Solution:** Conditionally apply base identity prompt based on frame type and content analysis.

**Key Constraint:** ⚠️ **DO NOT BREAK PREVIEW FEEDS** - They use full template (all 9 scenes) and bypass single scene extraction.

---

## CURRENT STATE

### What's Working
- ✅ Frame type detection (`detectFrameType()`) - accurately identifies flatlay, closeup, fullbody, midshot
- ✅ Preview feeds - use full template, bypass `buildSingleImagePrompt()`
- ✅ Single scene extraction - works for free and paid blueprint users

### What's Broken
- ❌ **ALL** frame types get identity base prompt (even flatlays and object close-ups)
- ❌ NanoBanana Pro tries to generate user in detail shots
- ❌ Confusion between user close-ups vs. object close-ups

---

## SOLUTION OVERVIEW

### Recommended Approach: Frame Type + Close-up User Detection

**Logic:**
1. **Full body / Mid shot** → Always include identity prompt ✅
2. **Flatlay** → Never include identity prompt ❌
3. **Close-up** → Check if user is present, then conditionally include ⚠️

**Implementation:**
- Use existing `detectFrameType()` function
- Add new `hasUserInCloseup()` function for close-up detection
- Conditional base prompt in `buildSingleImagePrompt()`

---

## DETAILED AUDIT DOCUMENTS

### 1. Base Prompt Conditional Audit
**File:** `docs/feed-planner/BASE_PROMPT_CONDITIONAL_AUDIT.md`

**Contents:**
- Current state analysis
- 5 options for conditional base prompts
- Impact analysis
- Testing requirements
- Decision matrix

**Key Finding:** Frame type conditional is simplest and safest approach.

---

### 2. Close-up User Detection Audit
**File:** `docs/feed-planner/CLOSEUP_USER_DETECTION_AUDIT.md`

**Contents:**
- Template analysis of close-up patterns
- Examples of user close-ups vs. object close-ups
- 4 detection options
- Keyword reference
- Edge case handling

**Key Finding:** Keyword-based detection is most reliable for close-ups.

---

## RECOMMENDED IMPLEMENTATION

### Step 1: Create Close-up User Detection Function

**Location:** `lib/feed-planner/build-single-image-prompt.ts`

**Function:**
```typescript
/**
 * Detects if a close-up frame includes the user
 * @param description - Frame description (after placeholder injection)
 * @returns true if user is present, false if object/accessory only
 */
function hasUserInCloseup(description: string): boolean {
  const lower = description.toLowerCase()
  
  // Strong indicators: face, hands, explicit user mentions
  const strongIndicators = [
    'face', 'profile', 'straight-on', 
    'hands', 'hand', 'holding',
    'woman', 'person', 'selfie', 'mirror'
  ]
  
  if (strongIndicators.some(keyword => lower.includes(keyword))) {
    return true
  }
  
  // Context-dependent: skin mentions with body context
  const hasSkinMention = /\b(warm skin|skin tones?)\b/.test(lower)
  const hasBodyContext = /\b(touching|near|visible on|holding|wearing)\b/.test(lower)
  
  if (hasSkinMention && hasBodyContext) {
    return true
  }
  
  // If description mentions outfit pieces being worn, user is present
  const hasWearing = /\b(wearing|in|outfit|blazer|sweater|dress|jacket|shirt|pants|jeans)\b/i.test(description)
  if (hasWearing && !/\b(fabric texture|material detail|texture close-up)\b/i.test(description)) {
    return true
  }
  
  return false
}
```

---

### Step 2: Update Base Prompt Logic

**Location:** `lib/feed-planner/build-single-image-prompt.ts`  
**Function:** `buildSingleImagePrompt()`  
**Line:** ~254

**Change:**
```typescript
// Current:
const promptParts: string[] = [BASE_IDENTITY_PROMPT]

// Proposed:
const promptParts: string[] = []

// Determine if identity prompt is needed
if (frameType === 'fullbody' || frameType === 'midshot') {
  // Always need identity for user photos
  promptParts.push(BASE_IDENTITY_PROMPT)
} else if (frameType === 'flatlay') {
  // Never need identity for flatlays
  // Skip base prompt
} else if (frameType === 'closeup') {
  // Check if close-up includes user
  if (hasUserInCloseup(frame.description)) {
    promptParts.push(BASE_IDENTITY_PROMPT)
  }
  // If no user, skip base prompt
}
```

---

## FRAME TYPE DECISION MATRIX

| Frame Type | User Present? | Needs Identity? | Detection Method |
|------------|--------------|-----------------|------------------|
| `fullbody` | ✅ Always | ✅ YES | Frame type only |
| `midshot` | ✅ Always | ✅ YES | Frame type only |
| `closeup` | ⚠️ Conditional | ⚠️ **IF user present** | Frame type + `hasUserInCloseup()` |
| `flatlay` | ❌ Never | ❌ NO | Frame type only |

---

## TESTING SCENARIOS

### Must Test

1. **Full Body (Position 3)**
   - Frame type: `fullbody`
   - Expected: Identity prompt included ✅
   - Verify: Prompt starts with identity prompt

2. **Mid Shot (Position 1, 5, 9)**
   - Frame type: `midshot`
   - Expected: Identity prompt included ✅
   - Verify: Prompt starts with identity prompt

3. **Close-up WITH User (Position 4 - face/hands)**
   - Frame type: `closeup`
   - Description: Contains "face", "hands", or "woman"
   - Expected: Identity prompt included ✅
   - Verify: Prompt starts with identity prompt

4. **Close-up WITHOUT User (Position 6 - fabric texture)**
   - Frame type: `closeup`
   - Description: "fabric texture - extreme close-up"
   - Expected: Identity prompt **NOT** included ❌
   - Verify: Prompt starts with vibe/setting/frame

5. **Flatlay (Position 2, 7, 8)**
   - Frame type: `flatlay`
   - Expected: Identity prompt **NOT** included ❌
   - Verify: Prompt starts with vibe/setting/frame

6. **Preview Feed (All 9 Scenes)**
   - Layout type: `preview`
   - Expected: **NO CHANGE** ✅
   - Verify: Still uses full template with all 9 scenes

---

## SAFETY GUARANTEES

### ✅ What Won't Break

1. **Preview Feeds**
   - Location: `app/api/feed/[feedId]/generate-single/route.ts` line 422-424
   - Current: Uses full injected template (bypasses `buildSingleImagePrompt()`)
   - After change: **Still bypasses** `buildSingleImagePrompt()` → **NO IMPACT** ✅

2. **Template Injection**
   - Happens before `buildSingleImagePrompt()`
   - No changes needed ✅

3. **Frame Type Detection**
   - Already working correctly
   - No changes needed ✅

### ⚠️ What Will Change

1. **Free User Single Scene Extraction**
   - Location: `app/api/feed/[feedId]/generate-single/route.ts` line 465
   - Change: Base prompt conditional based on frame type
   - Impact: Flatlays and object close-ups won't have identity prompt

2. **Paid Blueprint Single Scene Extraction**
   - Location: `app/api/feed/[feedId]/generate-single/route.ts` line 731
   - Change: Base prompt conditional based on frame type
   - Impact: Flatlays and object close-ups won't have identity prompt

---

## IMPLEMENTATION CHECKLIST

- [ ] Review audit documents
- [ ] Choose detection approach (recommended: Keyword-based)
- [ ] Create `hasUserInCloseup()` function
- [ ] Update `buildSingleImagePrompt()` conditional logic
- [ ] Test all frame types (fullbody, midshot, closeup with/without user, flatlay)
- [ ] Verify preview feeds still work (no changes expected)
- [ ] Test with actual NanoBanana Pro API
- [ ] Verify prompts generate correctly
- [ ] Document changes

---

## KEY FINDINGS

### From Template Analysis

**Close-ups WITH User:**
- Face: "Close-up face profile", "Close-up face straight-on"
- Hands: "Close-up hands holding", "hand touching collarbone"
- Keywords: `face`, `hands`, `hand`, `holding`, `woman`, `person`, `selfie`, `mirror`

**Close-ups WITHOUT User:**
- Objects: "Close-up of {{ACCESSORY_CLOSEUP_1}}"
- Textures: "fabric texture - extreme close-up", "material detail"
- Keywords: `fabric texture`, `material detail`, `texture close-up`, `extreme close-up` + object

**Edge Cases:**
- `"Close-up accessory - warm skin tones"` → No user (skin tones about lighting)
- `"Close-up hands holding accessory"` → User present (hands = user)

---

## RECOMMENDATIONS

### Primary Recommendation

**Option: Frame Type Conditional + Close-up User Detection**

**Why:**
1. Handles all frame types correctly
2. Simple keyword-based detection for close-ups
3. Minimal code changes
4. No impact on preview feeds
5. Easy to test and verify

**Implementation:**
- Add `hasUserInCloseup()` function
- Update `buildSingleImagePrompt()` with conditional logic
- Test all scenarios

### Alternative (If Keyword Detection Fails)

**Option: Pattern-Based Detection**
- More flexible regex patterns
- Better context handling
- Slightly more complex

---

## NEXT STEPS

1. **Review audit documents:**
   - `BASE_PROMPT_CONDITIONAL_AUDIT.md`
   - `CLOSEUP_USER_DETECTION_AUDIT.md`

2. **Make decision:**
   - Approve keyword-based detection?
   - Or prefer pattern-based?

3. **Implement:**
   - Create detection function
   - Update base prompt logic
   - Test thoroughly

4. **Verify:**
   - All frame types work correctly
   - Preview feeds unaffected
   - NanoBanana Pro generates correctly

---

**Document Created:** 2025-01-11  
**Status:** Audit Complete - Ready for Implementation  
**Related Documents:**
- `BASE_PROMPT_CONDITIONAL_AUDIT.md` - Base prompt options
- `CLOSEUP_USER_DETECTION_AUDIT.md` - Close-up user detection
