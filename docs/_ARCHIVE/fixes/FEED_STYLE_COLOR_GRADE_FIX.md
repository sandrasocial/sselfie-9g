# Feed Style Color Grade Fix — User's Visual Aesthetic in Prompts

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Issue:** Prompt said "Warm aesthetic" when user selected "EDGY" (Dark & Moody)

---

## 🎯 PROBLEM

User selects "**EDGY**" (Dark & Moody) in the feed style picker, but the generated prompt says:

```
"Warm aesthetic across all frames."
```

**This is completely wrong!** 

EDGY should produce:
- High contrast blacks and grays
- Editorial studio quality
- Deep shadows and bright highlights

NOT warm beige tones.

---

## 🔍 ROOT CAUSE

**File:** `lib/feed-planner/prompt-shaper.ts` (Lines 180-192)

The prompt was using a hardcoded `aestheticMap` with only 3 values:

```typescript
const aestheticMap: Record<string, string> = {
  'minimal': 'minimal',
  'luxury': 'luxury',
  'beige': 'warm',  // ❌ Defaulting everything to 'warm'
}
const aesthetic = aestheticMap[scene.category] || 'cohesive'

parts.push(
  `${aesthetic.charAt(0).toUpperCase() + aesthetic.slice(1)} aesthetic across all frames.`
)
```

**Problems:**
1. ❌ Not reading `scene.visualAesthetic` (user's actual selection)
2. ❌ Only 3 mappings (minimal, luxury, beige)
3. ❌ No mapping for EDGY → always fell back to generic text
4. ❌ No color palette descriptions (just single words like "warm")

---

## ✅ SOLUTION

**File:** `lib/feed-planner/prompt-shaper.ts`

### 1. Created `getColorGradeDescription()` Function

Maps user's feed style selection to full color palette descriptions matching `feed-prompt-expert.ts`:

```typescript
function getColorGradeDescription(
  visualAesthetic: string | null | undefined,
  category: string
): string {
  const aestheticLower = (visualAesthetic || category || '').toLowerCase().trim()
  
  // EDGY / DARK & MOODY
  if (aestheticLower.includes('edgy') || aestheticLower.includes('dark') || aestheticLower.includes('moody')) {
    return 'High contrast with deep blacks and bright highlights, editorial studio quality with clean modern shadows, pure black and charcoal gray tones.'
  }
  
  // MINIMAL / CLEAN
  if (aestheticLower.includes('minimal') || aestheticLower.includes('clean')) {
    return 'Extremely bright high-key photography, soft diffused light with airy ethereal quality, pure white and soft off-white tones.'
  }
  
  // BEIGE / WARM
  if (aestheticLower.includes('beige') || aestheticLower.includes('warm')) {
    return 'Warm natural light with golden hour quality, soft diffused warmth with cozy atmosphere, soft beige and warm cream tones.'
  }
  
  // LUXURY / PROFESSIONAL
  if (aestheticLower.includes('luxury') || aestheticLower.includes('professional')) {
    return 'Abundant natural window light with soft diffused quality, sophisticated neutral tones, greige and soft gray palette.'
  }
  
  // PASTEL / ROMANTIC
  if (aestheticLower.includes('pastel') || aestheticLower.includes('romantic')) {
    return 'Soft diffused gentle light with ethereal dreamy quality, dusty rose and powder blue tones, feminine Nordic elegance.'
  }
  
  // Default fallback
  return 'Natural balanced lighting with cohesive neutral tones, soft even color palette.'
}
```

### 2. Updated Preview Prompt to Use Color Grade

**Before:**
```typescript
parts.push(
  `${aesthetic} aesthetic across all frames. Maintain facial consistency from reference images.`
)
```

**After:**
```typescript
const firstScene = allScenes && allScenes.length > 0 ? allScenes[0] : scene
const colorGrade = getColorGradeDescription(firstScene?.visualAesthetic, firstScene?.category)

parts.push(
  `${colorGrade} Maintain facial consistency from reference images.`
)
```

---

## 📊 FEED STYLE → COLOR GRADE MAPPING

| User Selects | Color Grade Description |
|--------------|------------------------|
| **EDGY** (Dark & Moody) | High contrast with deep blacks and bright highlights, editorial studio quality with clean modern shadows, pure black and charcoal gray tones. |
| **MINIMAL** (Clean & Minimalistic) | Extremely bright high-key photography, soft diffused light with airy ethereal quality, pure white and soft off-white tones. |
| **WARM** (Warm & Cozy) | Warm natural light with golden hour quality, soft diffused warmth with cozy atmosphere, soft beige and warm cream tones. |
| **BEIGE AESTHETIC** | Warm natural light with golden hour quality, soft diffused warmth with cozy atmosphere, soft beige and warm cream tones. |
| **LUXURY** / **PROFESSIONAL** | Abundant natural window light with soft diffused quality, sophisticated neutral tones, greige and soft gray palette. |
| **PASTEL** / **ROMANTIC** | Soft diffused gentle light with ethereal dreamy quality, dusty rose and powder blue tones, feminine Nordic elegance. |
| **Default** | Natural balanced lighting with cohesive neutral tones, soft even color palette. |

---

## 🧪 TESTING

**Test with EDGY selection:**

**Before:**
```
"Warm aesthetic across all frames. Maintain facial consistency from reference images."
```

**After:**
```
"High contrast with deep blacks and bright highlights, editorial studio quality with clean modern shadows, pure black and charcoal gray tones. Maintain facial consistency from reference images."
```

**Test with MINIMAL selection:**

**Before:**
```
"Minimal aesthetic across all frames. Maintain facial consistency from reference images."
```

**After:**
```
"Extremely bright high-key photography, soft diffused light with airy ethereal quality, pure white and soft off-white tones. Maintain facial consistency from reference images."
```

---

## 🔧 WHERE COLOR GRADE COMES FROM

### Data Flow:

```
User selects "EDGY" in Feed Style Picker
  ↓
Saved to feed_layouts.visual_aesthetic (or user_personal_brand.visual_aesthetic)
  ↓
getCategoryAndMood() in generation-helpers.ts
  ↓
Passed to resolveFeedPlannerScene() as visualAesthetic
  ↓
Added to FeedPlannerScene object
  ↓
getColorGradeDescription(scene.visualAesthetic, scene.category)
  ↓
Returns full color palette description
  ↓
Added to final prompt
```

---

## ✅ VERIFICATION

Check the console logs when generating:

```
[PROMPT-SHAPER] Preview prompt generated: XXX words (target: 300-450, optimized for Nano Banana Pro)
```

Check the actual prompt sent to Replicate - should now include:

- **EDGY:** "High contrast with deep blacks and bright highlights..."
- **MINIMAL:** "Extremely bright high-key photography..."
- **WARM/BEIGE:** "Warm natural light with golden hour quality..."

---

## 📁 FILES MODIFIED

1. **`lib/feed-planner/prompt-shaper.ts`**
   - Added `getColorGradeDescription()` function (Lines 104-150)
   - Updated `buildPreviewMultiPrompt()` to use color grade (Lines 223-228)

---

## ✅ BENEFITS

1. **Accurate color grading:** Prompts now reflect user's actual aesthetic choice
2. **Detailed descriptions:** Full color palette specs instead of single words
3. **Consistent with design system:** Matches `MAYA_SIGNATURE_PALETTES` definitions
4. **Nano Banana Pro optimized:** Detailed color guidance improves generation quality
5. **All feed styles supported:** EDGY, MINIMAL, WARM, BEIGE, LUXURY, PROFESSIONAL, PASTEL

---

**Status:** ✅ Complete - No linter errors (only console warnings which are intentional)  
**Documentation:** FEED_STYLE_COLOR_GRADE_FIX.md  
**Testing:** Generate feed with EDGY, MINIMAL, and WARM selections to verify color grade in prompts
