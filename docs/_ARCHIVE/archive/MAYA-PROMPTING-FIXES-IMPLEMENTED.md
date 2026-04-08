# Maya Image Prompting Fixes - Implementation Summary

## Changes Implemented to Restore Authentic iPhone-Quality Aesthetic

### ✅ 1. Strengthened iPhone Emphasis
**Before:** "shot on iPhone 15 Pro" OR focal length (optional)
**After:** 
- iPhone 15 Pro is now the **DEFAULT (95% of prompts)**
- Only use focal length alternatives for specific editorial requests
- Added explicit language: "authentic iPhone photo aesthetic", "Instagram-native aesthetic", "looks like real phone camera photo"

**Files Changed:**
- `lib/maya/flux-prompting-principles.ts` - Camera/Technical Specs section

---

### ✅ 2. Added Natural Skin Texture as Mandatory
**Before:** Not explicitly required
**After:**
- **MANDATORY:** "natural skin texture, pores visible, realistic imperfections"
- Prevents overly smooth, AI-looking skin
- Integrated into camera/technical specs section

**Files Changed:**
- `lib/maya/flux-prompting-principles.ts` - Camera/Technical Specs section
- `app/api/maya/generate-concepts/route.ts` - Post-processing validation

---

### ✅ 3. Integrated Film Aesthetics Earlier
**Before:** Film grain + muted colors at the end (easy to skip)
**After:**
- Integrated into camera/technical specs section
- Must appear right after camera specs, not at the end
- Ensures they're never skipped

**Files Changed:**
- `lib/maya/flux-prompting-principles.ts` - Film Aesthetics section

---

### ✅ 4. Reduced Temperature
**Before:** `temperature: 0.85` (too high, causes inconsistency)
**After:** `temperature: 0.75` (more consistent, structured outputs)

**Files Changed:**
- `app/api/maya/generate-concepts/route.ts` - Line 390

---

### ✅ 5. Clarified Prompt Length
**Before:** 
- Principles said 50-80 words
- Personality said 20-45 words
- **CONFLICT**

**After:**
- Unified to **40-60 words** (optimal balance)
- Shorter = better facial consistency + more authentic iPhone aesthetic
- Updated both files to match

**Files Changed:**
- `lib/maya/flux-prompting-principles.ts` - Optimal length and word budget
- `lib/maya/personality.ts` - Prompt length guidance

---

### ✅ 6. Added Post-Processing Validation
**Before:** No validation - Claude could skip mandatory elements
**After:**
- Automatic removal of banned words
- Automatic addition of missing mandatory elements:
  - iPhone 15 Pro (if missing)
  - Natural skin texture (if missing)
  - Film grain (if missing)
  - Muted colors (if missing)
  - Authentic iPhone language (if missing)

**Files Changed:**
- `app/api/maya/generate-concepts/route.ts` - Post-processing function

---

### ✅ 7. Strengthened Anti-Pattern Enforcement
**Before:** Banned words in anti-patterns section (easy to miss)
**After:**
- Moved to top of avoidances section with 🔴 emoji
- Added to post-processing validation (automatic removal)
- Expanded banned words list:
  - "stunning", "perfect", "beautiful", "high quality", "8K"
  - "ultra realistic", "professional photography", "DSLR"
  - "cinematic", "studio lighting", "professional lighting"

**Files Changed:**
- `lib/maya/flux-prompting-principles.ts` - Critical Avoidances section
- `app/api/maya/generate-concepts/route.ts` - Post-processing validation

---

### ✅ 8. Enhanced Quality Checklist
**Before:** Basic checklist at end
**After:**
- Expanded checklist with all mandatory requirements
- Added verification for iPhone, natural skin texture, film grain, muted colors
- Made it clear that missing ANY item = incomplete prompt = AI-looking results

**Files Changed:**
- `lib/maya/flux-prompting-principles.ts` - Quality Checklist section

---

### ✅ 9. Updated Example Prompts
**Before:** 62-75 word examples (too long)
**After:**
- 48-52 word examples (optimized)
- Always start with "shot on iPhone 15 Pro"
- Include natural skin texture
- Film grain + muted colors integrated
- End with "authentic iPhone photo aesthetic"

**Files Changed:**
- `lib/maya/flux-prompting-principles.ts` - Example prompts section

---

### ✅ 10. Strengthened Generation Instructions
**Before:** Rules listed but not emphasized
**After:**
- Added 🔴 emoji to critical sections
- Made mandatory requirements explicit in generation prompt
- Added warning: "IF ANY MANDATORY REQUIREMENT IS MISSING, THE PROMPT WILL PRODUCE AI-LOOKING RESULTS"

**Files Changed:**
- `app/api/maya/generate-concepts/route.ts` - Critical Rules section

---

## Expected Results

After these changes, Maya's prompts should produce:

1. ✅ **Authentic iPhone-quality images** (not professional/studio-looking)
2. ✅ **Natural skin texture** (pores visible, realistic imperfections)
3. ✅ **Film grain aesthetic** (not overly smooth/plastic)
4. ✅ **Muted, realistic colors** (not oversaturated)
5. ✅ **Shorter, more focused prompts** (40-60 words = better consistency)
6. ✅ **No banned words** (automatically removed)
7. ✅ **All mandatory elements included** (validated automatically)

---

## Testing Recommendations

1. Generate 5-10 new concepts
2. Check that all prompts:
   - Start with "shot on iPhone 15 Pro"
   - Include "natural skin texture" or similar
   - Include film grain descriptor
   - Include muted color descriptor
   - Are 40-60 words
   - Don't contain banned words
3. Compare image quality:
   - Should look like real iPhone photos
   - Natural skin texture visible
   - Film grain present
   - Muted, realistic colors
   - Less "AI-looking" artifacts

---

## Files Modified

1. `lib/maya/flux-prompting-principles.ts` - Core prompting principles
2. `app/api/maya/generate-concepts/route.ts` - Generation logic + validation
3. `lib/maya/personality.ts` - Prompt length guidance

---

## Next Steps (If Needed)

If images still look too AI-generated, consider:
1. Further reducing temperature (0.7 instead of 0.75)
2. Adding more specific iPhone camera characteristics
3. Adjusting LoRA scale settings (if applicable)
4. Testing different aspect ratios


