# Sandra's Image Quality Diagnosis Report
**Email:** sandra.r.m.pereira@gmail.com  
**User ID:** 5040000c-5ce6-4114-8319-6ec1a632f749  
**Date:** December 14, 2025

## ✅ What's Working Correctly:

1. **User Model:**
   - ✅ Training Status: `completed`
   - ✅ Trigger Word: `user5040000c`
   - ✅ LoRA Scale: `1.00` (optimal)
   - ✅ LoRA URL: Present and valid
   - ✅ Replicate Version ID: Valid

2. **Physical Preferences:**
   - ✅ Set correctly: "Always keep my natural features, body figure, dont change the face, keep my natural hair color and eye color. create more authentic and iPhone quality photos. Use film grain."

3. **Recent Prompts (Last 10 images):**
   - ✅ NO banned plastic words found
   - ✅ All have authenticity keywords (candid, amateur, cellphone, film grain, muted colors, natural skin texture, pores visible, uneven lighting)
   - ✅ All have iPhone specs
   - ✅ Trigger word is being used correctly

## ⚠️ Issues Found:

### 1. **CRITICAL BUG: Super-Realism LoRA Causing Plastic Look** ⚠️ **FIXED**
**Location:** `app/api/maya/generate-image/route.ts`

**Problem:**
The "Super-Realism LoRA" was being applied at scale 0.2 to ALL images, even when prompts explicitly requested "authentic iPhone photo aesthetic" and "amateur cellphone aesthetic". This LoRA is designed to make images look "super realistic" which actually makes them look more AI-generated and plastic, especially when combined with prompts that emphasize authenticity.

**Evidence from Sandra's Prompt:**
```json
{
  "extra_lora": "https://huggingface.co/strangerzonehf/Flux-Super-Realism-LoRA/resolve/main/super-realism.safetensors",
  "extra_lora_scale": 0.2,
  "prompt": "...authentic iPhone camera quality, amateur cellphone aesthetic"
}
```

The prompt says "authentic" and "amateur" but the Super-Realism LoRA pushes toward "super realistic" - these are conflicting goals!

**Fix Applied:**
- Now detects when prompt contains authentic iPhone aesthetic keywords
- Automatically disables Super-Realism LoRA (sets scale to 0) for authentic photos
- Keywords detected: "authentic iPhone", "amateur cellphone", "raw iPhone", "candid photo", "film grain", "muted colors"

**Impact:** This should significantly improve image quality for users who want authentic iPhone photos instead of polished/plastic-looking images.

### 2. **CRITICAL BUG: User's LoRA Scale Not Used** ⚠️ **FIXED**
**Location:** `app/api/maya/generate-image/route.ts` line 147

**Problem:**
```typescript
lora_scale: customSettings?.styleStrength ?? presetSettings.lora_scale,
```

The code fetches `userLoraScale` from the database (line 111) but **NEVER USES IT**. Instead, it uses:
- `styleStrength` from user settings (defaults to 1.0)
- OR `presetSettings.lora_scale` (also 1.0)

**Impact:** While Sandra's LoRA scale is 1.00 (same as default), this bug means:
- If a user's LoRA scale in DB is different from 1.0, it's ignored
- User settings can override the database value incorrectly

**Fix Needed:**
```typescript
lora_scale: userLoraScale ?? customSettings?.styleStrength ?? presetSettings.lora_scale,
```

### 2. **Physical Preferences Text May Need Cleaning**
Sandra's physical preferences contain:
- "Always keep my natural features" (instruction phrase)
- "dont change the face" (instruction phrase)
- "keep my natural hair color" (instruction phrase)
- "create more authentic and iPhone quality photos. Use film grain." (good guidance)

**Current Behavior:** The prompt generation should convert these instruction phrases to descriptive language, but the text "create more authentic and iPhone quality photos. Use film grain." might be getting included as-is in prompts, which could cause issues.

**Recommendation:** Ensure physical preferences are properly cleaned before being used in prompts.

## 💡 Recommendations:

1. **✅ FIXED: Super-Realism LoRA Disabled for Authentic Photos**
   - The Super-Realism LoRA is now automatically disabled when prompts indicate authentic iPhone aesthetic
   - This should resolve the plastic/fake look issue

2. **✅ FIXED: LoRA Scale Bug:**
   - Now uses `userLoraScale` from database as primary source
   - Only falls back to settings/preset if database value is null

2. **Enable Enhanced Authenticity Toggle:**
   - Sandra should enable the "Enhanced Authenticity" toggle in Classic mode settings
   - This will inject stronger muted colors, iPhone quality, and film grain

3. **Check Physical Preferences Conversion:**
   - Verify that instruction phrases are being properly converted to descriptive language
   - The text "create more authentic..." should be guidance for Maya, not part of the prompt

4. **Verify Trigger Word Usage:**
   - Confirm trigger word `user5040000c` is always first in prompts
   - Check if trigger word is being properly recognized by the model

5. **Check Image Generation Settings:**
   - Verify `styleStrength` setting isn't too low (should be 1.0 for optimal likeness)
   - Check if `realismStrength` (extra LoRA scale) is appropriate

## 🔍 Next Steps:

1. ✅ **FIXED:** Super-Realism LoRA now disabled for authentic photos
2. ✅ **FIXED:** LoRA scale now uses database value
3. **Test:** Generate new images and verify they look more authentic (less plastic)
4. **Monitor:** Check if image quality improves after these fixes
5. **Optional:** Enable Enhanced Authenticity toggle in Classic mode for even stronger authentic aesthetic
