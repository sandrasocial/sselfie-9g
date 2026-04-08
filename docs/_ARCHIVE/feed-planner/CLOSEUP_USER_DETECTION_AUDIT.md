# Close-up User Detection - Options Audit

**Date:** 2025-01-11  
**Status:** Audit Only (No Implementation)  
**Purpose:** Document how to detect if a close-up includes the user vs. is just an object/accessory detail shot

---

## PROBLEM STATEMENT

Close-ups can be:
1. **User close-ups** (face, hands, body parts) → **NEED** identity base prompt
2. **Object/accessory close-ups** (jewelry, fabric, products) → **DO NOT NEED** identity base prompt

Current frame type detection only identifies `closeup` but doesn't distinguish between these two cases.

---

## TEMPLATE ANALYSIS

### Close-ups WITH User (Need Identity Prompt)

**Examples from templates:**

1. **Face close-ups:**
   - `"Close-up face profile - {{OUTFIT_MIDSHOT_1}}, {{ACCESSORY_CLOSEUP_1}} visible on hand near face, sharp shadows"`
   - `"Close-up face straight-on - {{OUTFIT_MIDSHOT_1}}, {{STYLING_NOTES}}, soft natural light, serene expression"`

2. **Hand/body part close-ups:**
   - `"Close-up hands holding beige cup - {{OUTFIT_MIDSHOT_1}}, {{STYLING_NOTES}}, warm skin, soft focus"`
   - `"Close-up {{ACCESSORY_CLOSEUP_1}} - hand touching collarbone, soft shadow"` (accessory but hand is visible)

**Keywords indicating user presence:**
- `"face"`, `"profile"`, `"straight-on"` (face shots)
- `"hands"`, `"hand"`, `"holding"` (hand shots)
- `"skin"`, `"skin tones"`, `"warm skin"` (body parts)
- `"woman"`, `"person"` (explicit user mention)
- `"selfie"`, `"mirror"` (user present)

---

### Close-ups WITHOUT User (No Identity Prompt)

**Examples from templates:**

1. **Accessory-only close-ups:**
   - `"Close-up of {{ACCESSORY_CLOSEUP_1}} - minimal styling, soft focus"`
   - `"Close-up {{ACCESSORY_CLOSEUP_1}} - warm skin tones, soft focus, golden light"` (mentions skin but it's about accessory lighting)

2. **Fabric/texture close-ups:**
   - `"{{OUTFIT_MIDSHOT_1}} fabric texture - extreme close-up, luxurious material detail"`
   - `"{{OUTFIT_MIDSHOT_1}} texture - extreme close-up, ribbed knit detail, high contrast lighting"`
   - `"{{OUTFIT_MIDSHOT_1}} texture close-up - luxury bag detail, buttery soft material, warm lighting"`

**Keywords indicating NO user:**
- `"fabric texture"`, `"material detail"`, `"texture"` (object focus)
- `"extreme close-up"` + object description (usually objects)
- `"Close-up of {{ACCESSORY_CLOSEUP_1}}"` without body part mention (accessory only)
- `"luxury bag detail"`, `"ribbed knit detail"` (product focus)

---

## DETECTION OPTIONS

### Option 1: Keyword-Based Detection (RECOMMENDED)

**Approach:** Check for user presence keywords in frame description

**Logic:**
```typescript
function hasUserInCloseup(description: string): boolean {
  const lower = description.toLowerCase()
  
  // Strong indicators of user presence
  const userKeywords = [
    'face', 'profile', 'straight-on', 'hands', 'hand', 'holding',
    'woman', 'person', 'selfie', 'mirror', 'skin tones', 'warm skin',
    'touching collarbone', 'near face', 'visible on hand'
  ]
  
  // Check if any user keyword is present
  return userKeywords.some(keyword => lower.includes(keyword))
}
```

**Pros:**
- ✅ Simple and clear
- ✅ Based on actual template patterns
- ✅ Easy to test and verify

**Cons:**
- ⚠️ Need to maintain keyword list
- ⚠️ Edge cases might need refinement

**Edge Cases to Handle:**
- `"Close-up {{ACCESSORY_CLOSEUP_1}} - warm skin tones"` → Mentions "skin tones" but it's about accessory lighting, not user
- `"Close-up {{ACCESSORY_CLOSEUP_1}} - hand touching collarbone"` → Mentions "hand" so user is present

**Refinement:**
- Check if "skin tones" is in context of accessory vs. user
- Check if "hand" is mentioned as part of the scene vs. just lighting description

---

### Option 2: Pattern-Based Detection

**Approach:** Use regex patterns to detect user presence patterns

**Logic:**
```typescript
function hasUserInCloseup(description: string): boolean {
  const lower = description.toLowerCase()
  
  // Pattern 1: Face mentions
  if (/\b(face|profile|straight-on|portrait)\b/.test(lower)) {
    return true
  }
  
  // Pattern 2: Hand/body part mentions with action
  if (/\b(hands?|holding|touching|near face|visible on hand)\b/.test(lower)) {
    return true
  }
  
  // Pattern 3: Explicit user mentions
  if (/\b(woman|person|selfie|mirror)\b/.test(lower)) {
    return true
  }
  
  // Pattern 4: Skin mentions in context of body (not just lighting)
  // "warm skin" or "skin tones" when NOT about accessory lighting
  if (/\b(warm skin|skin tones?)\b/.test(lower) && 
      !/\b(accessory|jewelry|bag|fabric|material)\b/.test(lower)) {
    return true
  }
  
  return false
}
```

**Pros:**
- ✅ More flexible than simple keyword list
- ✅ Handles context better

**Cons:**
- ⚠️ More complex
- ⚠️ Requires careful pattern design

---

### Option 3: Template Placeholder Analysis

**Approach:** Check which placeholders are used in the close-up

**Logic:**
```typescript
function hasUserInCloseup(description: string): boolean {
  // If description contains outfit placeholders, user is likely present
  // If description only contains accessory placeholders, user might not be present
  
  const hasOutfit = /\{\{OUTFIT_/.test(description)
  const hasAccessory = /\{\{ACCESSORY_CLOSEUP_/.test(description)
  
  // If outfit is mentioned, user is wearing it (user present)
  if (hasOutfit) {
    return true
  }
  
  // If only accessory, check for body part mentions
  if (hasAccessory && !hasOutfit) {
    return /\b(face|hands?|hand|holding|touching|skin|woman|person)\b/i.test(description)
  }
  
  return false
}
```

**Pros:**
- ✅ Uses template structure
- ✅ Logical (outfit = user wearing it)

**Cons:**
- ⚠️ Only works before placeholder injection
- ⚠️ After injection, placeholders are replaced with actual content
- ⚠️ Need to check at different stages

**Note:** This would need to be checked BEFORE placeholder injection, or we'd need to analyze the injected content.

---

### Option 4: Hybrid Approach (Frame Type + Content Analysis)

**Approach:** Combine frame type detection with content analysis

**Logic:**
```typescript
function shouldIncludeIdentityPrompt(frameType: string, description: string): boolean {
  // Full body and mid shot always need identity
  if (frameType === 'fullbody' || frameType === 'midshot') {
    return true
  }
  
  // Flatlays never need identity
  if (frameType === 'flatlay') {
    return false
  }
  
  // Close-ups: check if user is present
  if (frameType === 'closeup') {
    return hasUserInCloseup(description)
  }
  
  return false
}
```

**Pros:**
- ✅ Handles all frame types
- ✅ Most comprehensive
- ✅ Clear logic flow

**Cons:**
- ⚠️ Most complex
- ⚠️ Requires careful testing

---

## RECOMMENDED APPROACH

### Option 1: Keyword-Based Detection (Simplest)

**Why:**
1. Based on actual template patterns
2. Simple to implement and maintain
3. Easy to test
4. Can be refined with edge cases

**Implementation:**
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
  
  // Context-dependent: skin mentions
  // "warm skin" or "skin tones" when it's about the person, not accessory lighting
  const hasSkinMention = /\b(warm skin|skin tones?)\b/.test(lower)
  const hasBodyContext = /\b(touching|near|visible on|holding|wearing)\b/.test(lower)
  
  if (hasSkinMention && hasBodyContext) {
    return true
  }
  
  // If description mentions outfit pieces being worn, user is present
  // (after injection, this would be actual outfit descriptions)
  const hasWearing = /\b(wearing|in|outfit|blazer|sweater|dress|jacket|shirt|pants|jeans)\b/i.test(description)
  if (hasWearing && !/\b(fabric texture|material detail|texture close-up)\b/i.test(description)) {
    return true
  }
  
  return false
}
```

**Edge Case Handling:**
- `"Close-up {{ACCESSORY_CLOSEUP_1}} - warm skin tones"` → No body context, likely accessory lighting → `false`
- `"Close-up hands holding beige cup"` → Has "hands" → `true`
- `"Close-up face profile"` → Has "face" → `true`
- `"fabric texture - extreme close-up"` → No user keywords → `false`

---

## INTEGRATION WITH BASE PROMPT LOGIC

### Updated Conditional Logic

```typescript
// In buildSingleImagePrompt() function

const frameType = detectFrameType(frame.description)

// Determine if identity prompt is needed
let needsIdentityPrompt = false

if (frameType === 'fullbody' || frameType === 'midshot') {
  // Always need identity for user photos
  needsIdentityPrompt = true
} else if (frameType === 'flatlay') {
  // Never need identity for flatlays
  needsIdentityPrompt = false
} else if (frameType === 'closeup') {
  // Check if close-up includes user
  needsIdentityPrompt = hasUserInCloseup(frame.description)
}

// Build prompt parts
const promptParts: string[] = []

if (needsIdentityPrompt) {
  promptParts.push(BASE_IDENTITY_PROMPT)
}
// Rest of prompt assembly...
```

---

## TESTING REQUIREMENTS

### Test Cases

**Close-ups WITH User (Should get identity prompt):**
1. `"Close-up face profile - outfit, accessory visible on hand near face"`
2. `"Close-up face straight-on - outfit, soft natural light"`
3. `"Close-up hands holding beige cup - outfit, warm skin"`
4. `"Close-up accessory - hand touching collarbone"` (hand visible)

**Close-ups WITHOUT User (Should NOT get identity prompt):**
1. `"Close-up of accessory - minimal styling, soft focus"`
2. `"Outfit fabric texture - extreme close-up, luxurious material detail"`
3. `"Outfit texture - close-up, ribbed knit detail"`
4. `"Close-up accessory - warm skin tones, soft focus"` (skin tones about lighting, not user)

**Edge Cases:**
1. `"Close-up accessory - warm skin tones"` → Should be `false` (lighting description)
2. `"Close-up hands holding accessory"` → Should be `true` (hands = user)
3. `"Close-up of woman's hand with jewelry"` → Should be `true` (woman = user)

---

## KEYWORD REFERENCE

### Strong Indicators (User Present)
- `face`, `profile`, `straight-on`
- `hands`, `hand`, `holding`
- `woman`, `person`
- `selfie`, `mirror`
- `touching collarbone`, `near face`, `visible on hand`

### Context-Dependent (Need Analysis)
- `skin`, `skin tones`, `warm skin` → Check context (body part vs. lighting)
- `wearing`, `in`, `outfit` → Check if it's about fabric texture or person wearing

### Strong Indicators (No User)
- `fabric texture`, `material detail`, `texture close-up`
- `extreme close-up` + object description
- `luxury bag detail`, `ribbed knit detail` (product focus)

---

## DECISION MATRIX

| Approach | Complexity | Accuracy | Maintainability | Recommended |
|----------|-----------|----------|-----------------|-------------|
| **Option 1: Keyword-Based** | Low | High | High | ✅ **YES** |
| Option 2: Pattern-Based | Medium | High | Medium | ⚠️ Maybe |
| Option 3: Placeholder Analysis | Medium | Medium | Low | ❌ No |
| Option 4: Hybrid | High | Very High | Medium | ⚠️ Maybe |

**Recommendation:** **Option 1** (Keyword-Based Detection)

**Reasoning:**
- Simple to implement
- Based on actual template patterns
- Easy to test and refine
- Can handle edge cases with context checks

---

## IMPLEMENTATION CHECKLIST (When Ready)

- [ ] Create `hasUserInCloseup()` function
- [ ] Test with all close-up examples from templates
- [ ] Handle edge cases (skin tones, hand mentions)
- [ ] Integrate with `buildSingleImagePrompt()`
- [ ] Update conditional base prompt logic
- [ ] Test all 4 frame types
- [ ] Verify preview feeds still work
- [ ] Test with actual NanoBanana Pro API

---

## QUESTIONS TO RESOLVE

1. **Should we check before or after placeholder injection?**
   - Before: Can use placeholder analysis
   - After: Can use actual content (more accurate)
   - **Recommendation:** After injection (more accurate, uses actual content)

2. **How to handle ambiguous cases?**
   - Example: `"Close-up accessory - warm skin tones"`
   - Default to `false` (no identity) if ambiguous?
   - Or default to `true` (safer for user photos)?

3. **Should we log when detection is uncertain?**
   - Add logging for edge cases
   - Help refine detection over time

---

**Document Created:** 2025-01-11  
**Status:** Audit Complete - Ready for Decision  
**Next Step:** Choose detection approach and implement (when approved)
