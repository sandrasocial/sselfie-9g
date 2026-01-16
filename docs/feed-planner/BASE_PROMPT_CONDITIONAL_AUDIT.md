# Base Prompt Conditional Logic - Options Audit

**Date:** 2025-01-11  
**Status:** Audit Only (No Implementation)  
**Purpose:** Document options for conditional base prompts based on frame type

---

## CURRENT STATE

### Current Implementation

**File:** `lib/feed-planner/build-single-image-prompt.ts`

**Current Behavior:**
- **ALL** frame types get the same base identity prompt:
  ```typescript
  const BASE_IDENTITY_PROMPT = "Use the uploaded photos as strict identity reference. Influencer/pinterest style of a woman maintaining exactly the same physical characteristics (face, body, skin tone, hair) as the reference images."
  ```

- Base prompt is **ALWAYS** added first (line 254):
  ```typescript
  const promptParts: string[] = [BASE_IDENTITY_PROMPT]
  ```

- Applied to **ALL** frame types:
  - ✅ Full body (user photos)
  - ✅ Mid shot (user photos)
  - ✅ Close-up (detail shots - **PROBLEM**)
  - ✅ Flatlay (object shots - **PROBLEM**)

---

## PROBLEM STATEMENT

### Issue

NanoBanana Pro is getting confused because:
1. **Detail shots (close-ups)** include identity base prompt → Model tries to generate user's face/body when it should focus on accessories/objects
2. **Flatlays** include identity base prompt → Model tries to generate user when it should focus on items/surfaces
3. **User photos (selfies, full body, mid shot)** correctly need identity base prompt → These are working correctly

### Current Frame Type Detection

**File:** `lib/feed-planner/build-single-image-prompt.ts` (lines 87-107)

**Detection Logic:**
- `flatlay`: Contains "flatlay", "overhead", "overhead view", "overhead flatlay"
- `closeup`: Contains "close-up", "closeup", "close up", "close-up of", "extreme close"
- `fullbody`: Contains "full-body", "fullbody", "full body"
- `midshot`: Default (everything else)

**Frame Type is Already Detected** ✅
- Function: `detectFrameType(description: string)`
- Used for: Frame description cleaning
- **Available for base prompt logic** ✅

---

## CRITICAL CONSTRAINTS

### ⚠️ DO NOT BREAK

1. **Preview Feeds (layout_type: 'preview')**
   - **Current:** Use full injected template (all 9 scenes in one prompt)
   - **Location:** `app/api/feed/[feedId]/generate-single/route.ts` line 422-424
   - **Must NOT change:** Preview feeds bypass `buildSingleImagePrompt()` entirely
   - **Why:** Preview feeds generate all 9 scenes in a single 9:16 image

2. **Single Scene Extraction (Paid Blueprint)**
   - **Current:** Uses `buildSingleImagePrompt()` to extract individual scenes
   - **Location:** `app/api/feed/[feedId]/generate-single/route.ts` line 465 (free) and 731 (paid)
   - **This is where changes should be made** ✅

---

## OPTIONS FOR CONDITIONAL BASE PROMPTS

### Option 1: Frame Type-Based Conditional (RECOMMENDED)

**Approach:** Use `detectFrameType()` result to conditionally add base prompt

**Implementation Location:**
- `lib/feed-planner/build-single-image-prompt.ts`
- Function: `buildSingleImagePrompt()`
- Line: ~254 (where `BASE_IDENTITY_PROMPT` is currently added)

**Logic:**
```typescript
// Detect frame type (already done at line 246)
const frameType = detectFrameType(frame.description)

// Conditionally add base prompt
const promptParts: string[] = []

// Only add identity prompt for user photos (not flatlays or close-ups)
if (frameType === 'fullbody' || frameType === 'midshot') {
  promptParts.push(BASE_IDENTITY_PROMPT)
} else {
  // For flatlays and close-ups, use alternative base prompt or skip
  // Option 1a: Skip base prompt entirely
  // Option 1b: Use different base prompt for objects/details
}

// Rest of prompt assembly continues...
```

**Pros:**
- ✅ Simple and clear logic
- ✅ Frame type already detected
- ✅ No changes to preview feeds (they bypass this function)
- ✅ Minimal code changes

**Cons:**
- ⚠️ Need to define alternative base prompts for flatlays/close-ups
- ⚠️ Need to ensure frame type detection is accurate

**Frame Type Mapping:**
| Frame Type | Needs Identity? | Base Prompt | Notes |
|------------|----------------|-------------|-------|
| `fullbody` | ✅ YES | Identity prompt | Always user photos |
| `midshot` | ✅ YES | Identity prompt | Always user photos |
| `closeup` | ⚠️ **CONDITIONAL** | Identity prompt IF user present | **Requires detection** - see `CLOSEUP_USER_DETECTION_AUDIT.md` |
| `flatlay` | ❌ NO | Alternative or none | Never user photos |

---

### Option 2: Content-Based Detection

**Approach:** Analyze frame description content to detect if user is present

**Logic:**
```typescript
// Check if frame description mentions user
const hasUser = /(woman|person|selfie|mirror|wearing|in|standing|sitting|walking)/i.test(frame.description)

if (hasUser) {
  promptParts.push(BASE_IDENTITY_PROMPT)
} else {
  // No user mentioned - skip identity prompt
}
```

**Pros:**
- ✅ More flexible (content-based, not just frame type)
- ✅ Handles edge cases where frame type might be misclassified

**Cons:**
- ⚠️ More complex logic
- ⚠️ Risk of false positives/negatives
- ⚠️ Requires testing edge cases

**Example Edge Cases:**
- "Close-up of woman's hand with jewelry" → Has user, but is detail shot
- "Flatlay with coffee and laptop" → No user, correct
- "Mirror selfie" → Has user, correct

---

### Option 3: Alternative Base Prompts for Non-User Shots

**Approach:** Use different base prompts for flatlays and close-ups

**Implementation:**
```typescript
const BASE_IDENTITY_PROMPT = "Use the uploaded photos as strict identity reference..."
const BASE_DETAIL_PROMPT = "High-quality product photography. Focus on material textures, lighting, and composition."
const BASE_FLATLAY_PROMPT = "Professional flatlay photography. Clean composition, balanced arrangement, natural lighting."

const frameType = detectFrameType(frame.description)

let basePrompt: string
if (frameType === 'fullbody' || frameType === 'midshot') {
  basePrompt = BASE_IDENTITY_PROMPT
} else if (frameType === 'closeup') {
  basePrompt = BASE_DETAIL_PROMPT
} else if (frameType === 'flatlay') {
  basePrompt = BASE_FLATLAY_PROMPT
}

const promptParts: string[] = [basePrompt]
```

**Pros:**
- ✅ Provides context for NanoBanana Pro
- ✅ Clear instructions for each frame type
- ✅ Better than no base prompt

**Cons:**
- ⚠️ Need to define appropriate base prompts
- ⚠️ More prompts to maintain
- ⚠️ Need to test with NanoBanana Pro API

---

### Option 4: Skip Base Prompt for Non-User Shots

**Approach:** Simply omit base prompt for flatlays and close-ups

**Implementation:**
```typescript
const promptParts: string[] = []

// Only add base prompt for user photos
if (frameType === 'fullbody' || frameType === 'midshot') {
  promptParts.push(BASE_IDENTITY_PROMPT)
}
// For flatlays and close-ups, start directly with vibe/setting/frame

// Rest of prompt assembly...
if (vibe && vibe.length > 0) {
  promptParts.push(`with ${vibe} aesthetic`)
}
// etc.
```

**Pros:**
- ✅ Simplest approach
- ✅ No need to define alternative prompts
- ✅ Lets frame description speak for itself

**Cons:**
- ⚠️ NanoBanana Pro might benefit from some context
- ⚠️ Need to test if prompts work without base prompt

---

### Option 5: Hybrid Approach (Frame Type + Content Check)

**Approach:** Combine frame type detection with content analysis

**Logic:**
```typescript
const frameType = detectFrameType(frame.description)

// Check if user is mentioned in description
const hasUserMention = /(woman|person|selfie|mirror|wearing|in|standing|sitting|walking)/i.test(frame.description)

// Add identity prompt if:
// 1. Frame type is fullbody/midshot (user photos), OR
// 2. Frame type is closeup/flatlay BUT user is mentioned (edge case)
if (frameType === 'fullbody' || frameType === 'midshot' || hasUserMention) {
  promptParts.push(BASE_IDENTITY_PROMPT)
}
```

**Pros:**
- ✅ Handles edge cases (e.g., "close-up of woman's hand")
- ✅ More robust than frame type alone

**Cons:**
- ⚠️ More complex logic
- ⚠️ Potential for confusion if content check conflicts with frame type

---

## RECOMMENDED APPROACH

### Option 1: Frame Type-Based Conditional + Close-up User Detection

**Why:**
1. Frame type is already detected accurately
2. Clear mapping: fullbody/midshot = user photos, flatlay = non-user
3. Close-ups need special handling (can be user OR object)
4. Minimal code changes
5. Easy to test and verify

**⚠️ IMPORTANT:** Close-ups require additional detection to determine if user is present. See `CLOSEUP_USER_DETECTION_AUDIT.md` for detailed analysis.

**Implementation Points:**
- **File:** `lib/feed-planner/build-single-image-prompt.ts`
- **Function:** `buildSingleImagePrompt()`
- **Line:** ~254 (where `BASE_IDENTITY_PROMPT` is added)
- **Change:** Conditional check based on `frameType`

**Code Change:**
```typescript
// Current (line 254):
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
  // Check if close-up includes user (face, hands, etc.)
  if (hasUserInCloseup(frame.description)) {
    promptParts.push(BASE_IDENTITY_PROMPT)
  }
  // If no user, skip base prompt
}
```

**Note:** `hasUserInCloseup()` function needed - see `CLOSEUP_USER_DETECTION_AUDIT.md` for implementation details.

**Testing Required:**
- Verify frame type detection accuracy
- Test flatlay prompts without identity base
- Test close-up prompts without identity base
- Verify user photo prompts still work with identity base
- Ensure preview feeds are NOT affected

---

## IMPACT ANALYSIS

### Files That Would Change

1. **`lib/feed-planner/build-single-image-prompt.ts`**
   - Function: `buildSingleImagePrompt()`
   - Change: Conditional base prompt addition
   - Risk: **LOW** (only affects single scene extraction)

2. **No changes to:**
   - Preview feed generation (bypasses this function)
   - Template injection (happens before this function)
   - Frame type detection (already working)

### Affected Flows

**✅ Would Change:**
- Free user single scene extraction (line 465)
- Paid blueprint single scene extraction (line 731)

**✅ Would NOT Change:**
- Preview feed generation (uses full template, bypasses `buildSingleImagePrompt()`)
- Template injection (happens before extraction)
- Frame type detection (already working)

---

## TESTING REQUIREMENTS

### Test Scenarios

1. **Full Body Frame (Position 3)**
   - Frame type: `fullbody`
   - Expected: Base identity prompt included
   - Verify: Prompt starts with identity prompt

2. **Mid Shot Frame (Position 1, 5, 9)**
   - Frame type: `midshot`
   - Expected: Base identity prompt included
   - Verify: Prompt starts with identity prompt

3. **Close-up Frame (Position 4, 6)**
   - Frame type: `closeup`
   - Expected: Base identity prompt **NOT** included
   - Verify: Prompt starts with vibe/setting/frame (no identity prompt)

4. **Flatlay Frame (Position 2, 7, 8)**
   - Frame type: `flatlay`
   - Expected: Base identity prompt **NOT** included
   - Verify: Prompt starts with vibe/setting/frame (no identity prompt)

5. **Preview Feed (All 9 Scenes)**
   - Layout type: `preview`
   - Expected: **NO CHANGE** (bypasses `buildSingleImagePrompt()`)
   - Verify: Still uses full template with all 9 scenes

---

## ALTERNATIVE BASE PROMPTS (If Option 3)

### For Close-ups (Detail Shots)

**Option 3a: Product Photography Focus**
```
"High-quality product photography. Focus on material textures, lighting details, and sharp focus. Professional composition with natural lighting."
```

**Option 3b: Detail Photography Focus**
```
"Professional detail photography. Emphasis on texture, material quality, and composition. Natural lighting with depth of field."
```

**Option 3c: Minimal Base**
```
"Professional photography with focus on detail and composition."
```

### For Flatlays

**Option 3a: Flatlay Photography Focus**
```
"Professional flatlay photography. Clean composition, balanced arrangement, natural lighting. Overhead view with aesthetic styling."
```

**Option 3b: Lifestyle Photography Focus**
```
"Lifestyle flatlay photography. Curated arrangement, natural lighting, clean background. Overhead composition with visual balance."
```

**Option 3c: Minimal Base**
```
"Professional flatlay photography with clean composition and natural lighting."
```

---

## DECISION MATRIX

| Option | Complexity | Risk | Maintenance | Recommended |
|--------|-----------|------|-------------|-------------|
| **Option 1: Frame Type Conditional** | Low | Low | Low | ✅ **YES** |
| Option 2: Content-Based | Medium | Medium | Medium | ⚠️ Maybe |
| Option 3: Alternative Prompts | Medium | Medium | Medium | ⚠️ Maybe |
| Option 4: Skip Base Prompt | Low | Low | Low | ✅ **YES** |
| Option 5: Hybrid | High | Medium | High | ❌ No |

**Recommendation:** **Option 1** (Frame Type Conditional) or **Option 4** (Skip Base Prompt)

**Reasoning:**
- Simplest implementation
- Lowest risk
- Easy to test
- Clear logic
- No impact on preview feeds

---

## IMPLEMENTATION CHECKLIST (When Ready)

- [ ] Choose option (recommended: Option 1 or 4)
- [ ] Update `buildSingleImagePrompt()` function
- [ ] Add conditional logic based on `frameType`
- [ ] Test all 4 frame types (fullbody, midshot, closeup, flatlay)
- [ ] Verify preview feeds still work (no changes expected)
- [ ] Test with actual NanoBanana Pro API
- [ ] Verify prompts generate correctly for each frame type
- [ ] Document changes

---

## QUESTIONS TO RESOLVE

1. **Should flatlays have NO base prompt, or an alternative base prompt?**
   - Option 4: No base prompt (simplest)
   - Option 3: Alternative base prompt (more context for NanoBanana)
   - **Recommendation:** Start with no base prompt, test, add alternative if needed

2. **How to detect if close-ups include the user?** ✅ **RESOLVED**
   - See `CLOSEUP_USER_DETECTION_AUDIT.md` for detailed analysis
   - **Recommendation:** Keyword-based detection (Option 1)
   - Check for: face, hands, woman, person, selfie, mirror, etc.

3. **Should we test with NanoBanana Pro API first to see what works best?**
   - Test flatlay without base prompt
   - Test close-up without base prompt (object only)
   - Test close-up with base prompt (user present)
   - Compare results

---

**Document Created:** 2025-01-11  
**Status:** Audit Complete - Ready for Decision  
**Next Step:** Choose option and implement (when approved)
