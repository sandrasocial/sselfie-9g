# Maya Black & White / Visible Pores Analysis

**Date:** January 2025  
**Issue:** Maya is adding "black and white" and "visible pores" to prompts when not requested

---

## 🔍 EXECUTIVE SUMMARY

**Problem:** Maya is automatically adding:
1. **"black and white" / "monochrome"** to prompts
2. **"visible pores" / "natural skin texture with pores visible"** to prompts

**Root Causes Found:**
- Mandatory requirements in Flux prompting principles
- Template system defaults
- Conditional logic that's too aggressive
- Category-specific tags

---

## 📊 DETAILED FINDINGS

### 1. BLACK & WHITE / MONOCHROME ISSUES

#### 🔴 **CRITICAL SOURCE #1: Flux Prompting Principles**
**File:** `/lib/maya/flux-prompting-principles.ts`

**Issue:** No mandatory B&W requirement, but examples and principles mention it

**Lines 235-237:**
```typescript
1. **Camera Specs:** "shot on iPhone 15 Pro" OR specific focal length
2. **Natural Skin Texture:** "natural skin texture with pores visible"
3. **Film Grain + Muted Colors:** "film grain, muted colors"
4. **Uneven Lighting:** "uneven lighting with mixed color temperatures"
```

**Status:** ✅ No B&W requirement here - GOOD

---

#### 🔴 **CRITICAL SOURCE #2: Studio Pro System Prompt**
**File:** `/lib/maya/studio-pro-system-prompt.ts`

**Issue:** Default monochrome color palette

**Line 250:**
```typescript
- Default: Monochrome (black #1A1A1A, white #FFFFFF, gray #8E8E8E)
```

**Line 562:**
```typescript
Color Palette: [Use user's brand colors OR default: Warm monochrome - cream (#F5F0E8), beige (#D4C5B0), soft black (#1A1A1A), coffee brown accents (#8B7355)]
```

**Line 1164:**
```typescript
Color Palette: Warm monochrome - cream (#F5F0E8), beige (#D4C5B0), soft black text (#1A1A1A), coffee brown accents (#8B7355), NO bright colors
```

**Impact:** Studio Pro mode defaults to monochrome, which might leak into prompts

---

#### 🔴 **CRITICAL SOURCE #3: Wellness Brands Template**
**File:** `/lib/maya/prompt-templates/high-end-brands/wellness-brands.ts`

**Issue:** Monochrome detection that might add B&W

**Lines 30-32:**
```typescript
if (intent.includes("monochrome") || intent.includes("neutral")) {
  return "Monochromatic Alo Yoga set in soft neutral tones..."
}
```

**Lines 82-84:**
```typescript
if (intent.includes("black") || intent.includes("monochrome")) {
  return "Black-on-black performance outfit..."
}
```

**Impact:** If user mentions "neutral" or "black", template might generate monochrome descriptions

---

#### 🔴 **CRITICAL SOURCE #4: ALO Workout Category**
**File:** `/lib/maya/prompt-components/categories/alo-workout.ts`

**Issue:** Component tagged with "monochrome"

**Line 118:**
```typescript
tags: ['casual', 'monochrome', 'athleisure', 'alo'],
```

**Impact:** Component database has monochrome tag, which might influence composition

---

#### 🔴 **CRITICAL SOURCE #5: Generate Concepts Route - B&W Detection Logic**
**File:** `/app/api/maya/generate-concepts/route.ts`

**Issue:** Complex B&W detection and addition logic

**Lines 1604-1605:**
```typescript
- **IF reference image is BLACK & WHITE or MONOCHROME OR user requests B&W:** 
  MUST include "black and white" or "monochrome" - DO NOT add "muted colors"
```

**Lines 2538-2549:**
```typescript
// Detect if reference image or user request is B&W/monochrome
const wantsBAndW = /black.?and.?white|monochrome|b&w|grayscale|black and white/i.test(styleContext)
```

**Lines 2662-2695:**
```typescript
const userWantsMonochrome = /monochrome|black.?and.?white|b&w|grayscale/i.test(styleContext)
const hasBAndW = /black.?and.?white|monochrome|b&w|grayscale/i.test(enhanced)

// 🔴 CRITICAL: Only add B&W if explicitly requested by user OR clearly shown in reference images
const userExplicitlyWantsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white)\b/i.test(userRequest || "")
const imageAnalysisShowsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white|no\s+color|colorless)\b/i.test(imageAnalysisText || "")

if (userExplicitlyWantsBAndW || imageAnalysisShowsBAndW) {
  // Only add B&W if user explicitly requested it OR reference image clearly shows B&W
  if (!hasBAndW) {
    enhanced += ", black and white"
  }
}
```

**Lines 2963-2990:**
```typescript
// 🔴 CRITICAL: Only add B&W if explicitly requested by user OR clearly shown in reference images
const userExplicitlyWantsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white)\b/i.test(userRequest || "")
const imageAnalysisShowsBAndW = /(?:black\s+and\s+white|monochrome|b&w|grayscale|black\s+white|no\s+color|colorless)\b/i.test(imageAnalysis || "")

if (userExplicitlyWantsBAndW || imageAnalysisShowsBAndW) {
  if (!hasBAndWInPrompt) {
    prompt += ", black and white"
  }
}
```

**Impact:** Multiple places where B&W can be added based on detection (might be too aggressive)

**Removal Logic (Lines 2364-2393):**
```typescript
// 🔴🔴🔴 CRITICAL: Remove "black and white" unless explicitly requested
if (!userExplicitlyWantsBAndW && hasBAndWInPrompt && !(isFromGuidePrompt && guidePromptHasBAndW)) {
  // Remove B&W variations
  prompt = prompt.replace(/black\s+and\s+white,?\s*/gi, "")
  prompt = prompt.replace(/monochrome,?\s*/gi, "")
  // ... more removal patterns
}
```

**Status:** Has removal logic, but addition logic might be too aggressive

---

#### 🔴 **CRITICAL SOURCE #6: Nano Banana Prompt Builder**
**File:** `/lib/maya/nano-banana-prompt-builder.ts`

**Issue:** B&W removal logic (good), but might not catch all cases

**Lines 117-134:**
```typescript
// 3. Check if user explicitly requested black and white
const explicitlyRequestedBw = 
  userRequestLower.includes('black and white') ||
  userRequestLower.includes('black & white') ||
  userRequestLower.includes('b&w') ||
  userRequestLower.includes('monochrome') ||
  userRequestLower.includes('grayscale')

// 4. Remove "black and white" unless explicitly requested
if (!explicitlyRequestedBw) {
  cleaned = cleaned.replace(/\bblack\s+and\s+white\b/gi, '')
  cleaned = cleaned.replace(/\bmonochrome\b/gi, '')
  // ... more removal
}
```

**Status:** ✅ Has removal logic - GOOD

---

### 2. VISIBLE PORES / SKIN TEXTURE ISSUES

#### 🔴 **CRITICAL SOURCE #1: Flux Prompting Principles - MANDATORY**
**File:** `/lib/maya/flux-prompting-principles.ts`

**Issue:** MANDATORY requirement for "natural skin texture with pores visible"

**Lines 230-237:**
```typescript
### MANDATORY REQUIREMENTS (EVERY PROMPT MUST HAVE):

**🔴 CRITICAL - ALL PROMPTS MUST INCLUDE:**

1. **Camera Specs:** "shot on iPhone 15 Pro" OR specific focal length
2. **Natural Skin Texture:** "natural skin texture with pores visible" (use positive descriptions only - no "not" phrases)
3. **Film Grain + Muted Colors:** "film grain, muted colors"
4. **Uneven Lighting:** "uneven lighting with mixed color temperatures"
```

**Line 235:**
```typescript
2. **Natural Skin Texture:** "natural skin texture with pores visible"
```

**Line 324:**
```typescript
✅ **Natural skin texture:** MUST include "natural skin texture with pores visible" (positive description only - no negative phrases)?
```

**Lines 337-343 (Examples):**
```typescript
"user_trigger, woman, brown hair, in oversized brown leather blazer..., natural skin texture with pores visible, film grain, muted colors..."
```

**Impact:** ⚠️ **THIS IS THE PRIMARY SOURCE** - Flux principles make it MANDATORY for all prompts

---

#### 🔴 **CRITICAL SOURCE #2: Personality System Prompt**
**File:** `/lib/maya/personality.ts`

**Issue:** Mentions "Real skin texture with pores visible" as automatic inclusion

**Lines 265-269:**
```typescript
**You automatically include:**
- Natural iPhone photography feel
- Real skin texture with pores visible
- Authentic moments
- Film-like quality with muted colors
```

**Line 272:**
```typescript
- ✅ "natural skin texture with pores visible"
```

**Impact:** Personality prompt tells Maya to automatically include skin texture

---

#### 🔴 **CRITICAL SOURCE #3: Generate Concepts Route - Conditional Logic**
**File:** `/app/api/maya/generate-concepts/route.ts`

**Issue:** Conditional logic that might be too permissive

**Line 1477:**
```typescript
${shouldIncludeSkinTexture(userRequest, detectedGuidePrompt, templateExamples) 
  ? `- Natural, authentic skin texture is required - avoid anything that sounds plastic/smooth/airbrushed. Include natural skin texture with pores visible.` 
  : `- Skin texture: Only include if specified in user prompt, guide prompt, or templates - do not add automatically.`}
```

**Lines 1589-1602:**
```typescript
4. **Natural Skin Texture (only if in user prompt, guide prompt, or templates):** 
   ${
     shouldIncludeSkinTexture(userRequest, detectedGuidePrompt, templateExamples)
       ? studioProMode
         ? `- Nano Banana Pro: Include natural, realistic skin texture
   - "Natural skin texture", "realistic appearance", "authentic look"`
         : `- Include "natural skin texture with pores visible, not smooth or airbrushed, not plastic-looking, realistic texture"
   - Include natural imperfection phrases: "visible pores", "natural skin texture", "subtle imperfections", "not airbrushed", "not plastic-looking", "realistic texture", "organic skin texture"`
       : `- Skip: Skin texture not found in user prompt, guide prompt, or templates - do not add skin texture requirements`
   }
```

**Impact:** Conditional, but `shouldIncludeSkinTexture()` function might return true too often

**Function Definition (Lines 27-38 in `/lib/maya/prompt-builders/guide-prompt-handler.ts`):**
```typescript
export function shouldIncludeSkinTexture(
  userRequest?: string,
  guidePrompt?: string,
  templateExamples?: string[]
): boolean {
  const userHasSkinTexture = userRequest && /(?:natural\s+skin\s+texture|visible\s+pores|skin\s+texture|pores)/i.test(userRequest)
  const guideHasSkinTexture = guidePrompt && /(?:natural\s+skin\s+texture|visible\s+pores|skin\s+texture|pores)/i.test(guidePrompt)
  const templatesHaveSkinTexture = templateExamples && templateExamples.some(template => 
    /(?:natural\s+skin\s+texture|visible\s+pores|skin\s+texture|pores)/i.test(template)
  )
  return !!(userHasSkinTexture || guideHasSkinTexture || templatesHaveSkinTexture)
}
```

**Problem:** ⚠️ **THIS IS THE ISSUE!**
- If ANY template example contains skin texture keywords, it returns `true`
- Most templates likely include "natural skin texture" or "pores"
- This means skin texture is almost always added, even when user doesn't request it

**Impact:** Function is too permissive - templates trigger it even when user doesn't want skin texture

---

#### 🔴 **CRITICAL SOURCE #4: Flux Prompt Optimization**
**File:** `/lib/maya/flux-prompt-optimization.ts`

**Issue:** Default skin texture pattern

**Lines 288-296:**
```typescript
SKIN_TEXTURE: {
  patterns: [
    /natural\s+skin\s+texture/gi,
    /pores\s+visible/gi,
    /visible\s+pores/gi,
    /realistic\s+texture/gi,
    /organic\s+skin\s+texture/gi,
  ],
  default: "natural skin texture with pores visible",
},
```

**Impact:** Has default value that might be added if missing

---

#### 🔴 **CRITICAL SOURCE #5: Guide Prompt Handler**
**File:** `/lib/maya/prompt-builders/guide-prompt-handler.ts`

**Issue:** Skin texture extraction and preservation

**Lines 392-406:**
```typescript
cameraText = cameraText.replace(/,\s*with\s+visible\s+pores/gi, "")
cameraText = cameraText.replace(/with\s+visible\s+pores/gi, "")

// Extract skin texture separately (if present)
let skinTextureText = ""
if (/natural\s+skin\s+texture/i.test(workingPrompt)) {
  const skinMatch = workingPrompt.match(/natural\s+skin\s+texture[^,.]*(?:,|\.|$)/gi)
  if (skinMatch && skinMatch.length > 0) {
    skinTextureText = skinMatch[skinMatch.length - 1].trim().replace(/[.,]$/, "").trim()
  }
} else if (/with\s+visible\s+pores/i.test(workingPrompt)) {
  skinTextureText = "natural skin texture with visible pores"
}
```

**Impact:** Preserves skin texture from guide prompts, but might add it if detected

---

## 🎯 ROOT CAUSE ANALYSIS

### Black & White Issues:

1. **Studio Pro Defaults:** Studio Pro mode defaults to monochrome color palettes
2. **Template Detection:** Wellness brands template detects "neutral" or "black" and generates monochrome descriptions
3. **Component Tags:** ALO workout components tagged with "monochrome"
4. **Aggressive Detection:** B&W detection logic might be too sensitive (detects "no color" or "colorless" in image analysis)

### Visible Pores Issues:

1. **MANDATORY in Flux Principles:** ⚠️ **PRIMARY ISSUE** - Flux prompting principles make it MANDATORY
2. **Personality Auto-Include:** Personality system says to "automatically include" skin texture
3. **Conditional Logic Too Permissive:** `shouldIncludeSkinTexture()` might return true too often
4. **Default Values:** Flux prompt optimization has default skin texture value

---

## 🔧 RECOMMENDED FIXES

### For Black & White:

1. **Remove Studio Pro Monochrome Default:**
   - Change default color palette in `/lib/maya/studio-pro-system-prompt.ts`
   - Only use monochrome if user explicitly requests it

2. **Fix Template Detection:**
   - In `/lib/maya/prompt-templates/high-end-brands/wellness-brands.ts`
   - Don't generate "monochrome" descriptions unless user explicitly requests monochrome

3. **Remove Component Tags:**
   - Remove "monochrome" tag from ALO workout components
   - Or make it conditional

4. **Tighten B&W Detection:**
   - In `/app/api/maya/generate-concepts/route.ts`
   - Only add B&W if user explicitly requests it (remove image analysis detection)

### For Visible Pores:

1. **Make Skin Texture Optional in Flux Principles:**
   - Change from MANDATORY to CONDITIONAL in `/lib/maya/flux-prompting-principles.ts`
   - Only include if user requests it or it's in templates

2. **Remove Auto-Include from Personality:**
   - In `/lib/maya/personality.ts`
   - Remove "Real skin texture with pores visible" from automatic inclusions

3. **Fix shouldIncludeSkinTexture() Function:**
   - **CURRENT ISSUE:** Function returns `true` if ANY template has skin texture
   - **FIX:** Only return `true` if:
     * User explicitly requests it in their prompt, OR
     * Guide prompt explicitly includes it, OR
     * User explicitly requests it (not just if templates have it)
   - **RECOMMENDATION:** Remove template check, or make it optional/weighted

4. **Remove Default Value:**
   - In `/lib/maya/flux-prompt-optimization.ts`
   - Remove default skin texture value

---

## 📝 NEXT STEPS

1. ✅ **Check `shouldIncludeSkinTexture()` function** - **FOUND:** Function is too permissive (templates trigger it)
2. **Review all template files** - Check if templates are adding skin texture (likely yes)
3. **Test removal logic** - Verify B&W removal is working correctly
4. **Update Flux principles** - Make skin texture optional instead of mandatory
5. **Update personality** - Remove auto-include for skin texture
6. **Fix shouldIncludeSkinTexture()** - Only return true if user/guide explicitly requests it (not templates)

---

**Analysis Complete**  
**Status:** Ready for fixes
