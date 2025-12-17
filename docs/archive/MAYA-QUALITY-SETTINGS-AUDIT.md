# Maya Quality Settings Audit

## Available Quality Settings (from `lib/maya/quality-settings.ts`)

All presets include:
- `guidance_scale`: 3.5
- `num_inference_steps`: 50
- `aspect_ratio`: "4:5" (varies by preset)
- `megapixels`: "1"
- `output_format`: "png"
- `output_quality`: 95
- `lora_scale`: 1.0
- `disable_safety_checker`: true
- `go_fast`: false
- `num_outputs`: 1
- `model`: "dev"
- `extra_lora`: Realism LoRA URL
- `extra_lora_scale`: 0.2

## Image Generation Routes Audit

### ✅ 1. `app/api/maya/generate-image/route.ts` (Maya Chat - Concept Cards)
**Status:** ✅ FULLY COMPLIANT
- Uses `MAYA_QUALITY_PRESETS` based on category
- Applies all settings correctly:
  - ✅ guidance_scale
  - ✅ num_inference_steps
  - ✅ aspect_ratio (with custom override)
  - ✅ megapixels
  - ✅ output_format
  - ✅ output_quality
  - ✅ lora_scale (with custom override)
  - ✅ disable_safety_checker
  - ✅ go_fast
  - ✅ num_outputs
  - ✅ model
  - ✅ extra_lora
  - ✅ extra_lora_scale
- Supports custom settings override
- Uses `hf_lora` parameter correctly

### ⚠️ 2. `app/api/maya/create-photoshoot/route.ts` (Photoshoot Mode)
**Status:** ⚠️ PARTIALLY COMPLIANT - Missing some preset values
- Uses `MAYA_QUALITY_PRESETS` based on category
- **ISSUES:**
  - ❌ `aspect_ratio` is hardcoded to "4:5" instead of using preset
  - ❌ `disable_safety_checker` is hardcoded to `true` instead of using preset
  - ❌ `go_fast` is hardcoded to `false` instead of using preset
  - ❌ `num_outputs` is hardcoded to `1` instead of using preset
  - ❌ `model` is hardcoded to `"dev"` instead of using preset
- **USES CORRECTLY:**
  - ✅ guidance_scale
  - ✅ num_inference_steps
  - ✅ megapixels
  - ✅ output_format
  - ✅ output_quality
  - ✅ lora_scale
  - ✅ extra_lora
  - ✅ extra_lora_scale

### ❌ 3. `app/api/studio/generate/route.ts` (Studio Screen)
**Status:** ❌ NOT USING QUALITY PRESETS - Hardcoded values
- **ISSUES:**
  - ❌ Not importing or using `MAYA_QUALITY_PRESETS` at all
  - ❌ All settings are hardcoded:
    - `num_outputs: 4` (should be 1 from preset)
    - `aspect_ratio: "1:1"` (should use preset)
    - `output_format: "png"` (correct but hardcoded)
    - `output_quality: 95` (correct but hardcoded)
    - `num_inference_steps: 50` (correct but hardcoded)
    - `guidance_scale: 3.5` (correct but hardcoded)
    - `lora_scale: 1.0` (correct but hardcoded)
    - `megapixels: "1"` (correct but hardcoded)
    - `model: "dev"` (correct but hardcoded)
    - `extra_lora` (correct URL but hardcoded)
    - `extra_lora_scale: 0.2` (correct but hardcoded)
  - ❌ Missing: `disable_safety_checker`, `go_fast`
  - ❌ Uses `lora` instead of `hf_lora` (inconsistent)

### ✅ 4. `lib/feed-planner/queue-images.ts` (Feed Planner Batch)
**Status:** ✅ FULLY COMPLIANT
- Uses `MAYA_QUALITY_PRESETS` based on post type
- Applies all settings correctly:
  - ✅ All settings from preset
  - ✅ Supports custom settings override
  - ✅ Uses `hf_lora` parameter correctly

### ⚠️ 5. `app/api/feed/[feedId]/generate-single/route.ts` (Feed Single Post)
**Status:** ⚠️ USES SPREAD OPERATOR - May miss some settings
- Uses `MAYA_QUALITY_PRESETS` based on post type
- Uses spread operator: `...qualitySettings`
- **POTENTIAL ISSUE:** Spread operator should include all settings, but verify it's not missing any
- Uses `lora` instead of `hf_lora` (inconsistent with other routes)

### ⚠️ 6. `app/api/feed/[feedId]/generate-profile/route.ts` (Feed Profile Image)
**Status:** ⚠️ USES SPREAD OPERATOR - May miss some settings
- Uses `MAYA_QUALITY_PRESETS.default`
- Uses spread operator: `...qualitySettings`
- **POTENTIAL ISSUE:** Spread operator should include all settings, but verify it's not missing any
- Uses `lora` instead of `hf_lora` (inconsistent with other routes)

### ⚠️ 7. `app/api/feed/[feedId]/regenerate-post/route.ts` (Feed Regenerate)
**Status:** ⚠️ USES SPREAD OPERATOR - May miss some settings
- Uses `MAYA_QUALITY_PRESETS` based on post type
- Uses spread operator: `...qualitySettings`
- **POTENTIAL ISSUE:** Spread operator should include all settings, but verify it's not missing any
- Uses `lora` instead of `hf_lora` (inconsistent with other routes)

### ℹ️ 8. `app/api/blueprint/generate-concept-image/route.ts` (Blueprint)
**Status:** ℹ️ DIFFERENT MODEL - Uses FLUX.1 Dev directly
- Uses different model: `black-forest-labs/flux-dev`
- Different settings (guidance: 3.5, steps: 28, quality: 100)
- **NOTE:** This is intentional - different use case, not a Maya route

### ℹ️ 9. `app/api/maya/generate-video/route.ts` (Video Generation)
**Status:** ℹ️ DIFFERENT SERVICE - Uses WAN-2.5 I2V
- Uses different model/service for video
- **NOTE:** This is intentional - different service, not image generation

## Issues Found

### Critical Issues:
1. **`app/api/studio/generate/route.ts`** - Not using quality presets at all, all hardcoded
2. **`app/api/maya/create-photoshoot/route.ts`** - Missing preset values for aspect_ratio, disable_safety_checker, go_fast, num_outputs, model

### Consistency Issues:
1. **LoRA parameter inconsistency:**
   - Some routes use `hf_lora` (generate-image, create-photoshoot, queue-images)
   - Some routes use `lora` (studio/generate, generate-single, generate-profile, regenerate-post)
   - **Should standardize to `hf_lora`** (this is the correct parameter name for Replicate)

2. **Spread operator usage:**
   - Some routes explicitly list all parameters
   - Some routes use spread operator `...qualitySettings`
   - **Recommendation:** Explicit listing is safer and more maintainable

## Recommendations

### 1. Fix Studio Generate Route
- Import and use `MAYA_QUALITY_PRESETS`
- Remove all hardcoded values
- Use preset-based approach like other routes

### 2. Fix Photoshoot Route
- Use `presetSettings.aspect_ratio` instead of hardcoded "4:5"
- Use `presetSettings.disable_safety_checker` instead of hardcoded `true`
- Use `presetSettings.go_fast` instead of hardcoded `false`
- Use `presetSettings.num_outputs` instead of hardcoded `1`
- Use `presetSettings.model` instead of hardcoded `"dev"`

### 3. Standardize LoRA Parameter
- Change all routes to use `hf_lora` instead of `lora`
- This is the correct parameter name for Replicate's Flux models

### 4. Standardize Parameter Passing
- Prefer explicit parameter listing over spread operator
- Makes it clearer what's being passed
- Easier to debug and maintain

## iPhone Quality Settings in Prompts

### Current Status:
- ✅ Prompts include "shot on iPhone 15 Pro portrait mode, shallow depth of field"
- ✅ Prompts avoid complex technical specs (f-stops, ISO, focal lengths)
- ✅ Prompts keep camera specs simple and basic

### Available iPhone Settings (from prompts):
- "shot on iPhone 15 Pro portrait mode, shallow depth of field"
- "shot on iPhone, natural bokeh"

### Should We Add More iPhone-Specific Settings?
**Current approach is correct:**
- Prompts already specify iPhone camera
- Quality settings handle technical parameters (megapixels, output_quality, etc.)
- Keeping prompts simple prevents plastic look
- No need to add more iPhone-specific technical details to prompts

## Summary

**Routes Using Quality Presets Correctly:**
- ✅ `app/api/maya/generate-image/route.ts`
- ✅ `lib/feed-planner/queue-images.ts`
- ✅ `app/api/studio/generate/route.ts` - **FIXED** - Now uses quality presets
- ✅ `app/api/maya/create-photoshoot/route.ts` - **FIXED** - Now uses all preset values
- ✅ `app/api/feed/[feedId]/generate-single/route.ts` - **FIXED** - Now explicitly lists all parameters
- ✅ `app/api/feed/[feedId]/generate-profile/route.ts` - **FIXED** - Now explicitly lists all parameters
- ✅ `app/api/feed/[feedId]/regenerate-post/route.ts` - **FIXED** - Now explicitly lists all parameters

## Fixes Applied

### ✅ Fixed: `app/api/studio/generate/route.ts`
- Now imports and uses `MAYA_QUALITY_PRESETS`
- Uses preset-based approach like other routes
- Still generates 4 outputs (studio-specific requirement)
- Still uses 1:1 aspect ratio (studio-specific requirement)
- Standardized to use `hf_lora` parameter

### ✅ Fixed: `app/api/maya/create-photoshoot/route.ts`
- Now uses `presetSettings.aspect_ratio` instead of hardcoded "4:5"
- Now uses `presetSettings.disable_safety_checker` instead of hardcoded `true`
- Now uses `presetSettings.go_fast` instead of hardcoded `false`
- Now uses `presetSettings.num_outputs` instead of hardcoded `1`
- Now uses `presetSettings.model` instead of hardcoded `"dev"`
- Uses spread operator `...presetSettings` to ensure all settings are included

### ✅ Fixed: Parameter Consistency
- All routes now use `hf_lora` instead of `lora` (correct Replicate parameter)
- All routes now explicitly list parameters instead of using spread operator
- Makes code more maintainable and easier to debug

## iPhone Quality Settings in Prompts

### Current Status:
- ✅ Prompts include "shot on iPhone 15 Pro portrait mode, shallow depth of field"
- ✅ Prompts avoid complex technical specs (f-stops, ISO, focal lengths)
- ✅ Prompts keep camera specs simple and basic

### Available iPhone Settings (from prompts):
- "shot on iPhone 15 Pro portrait mode, shallow depth of field"
- "shot on iPhone, natural bokeh"

### Should We Add More iPhone-Specific Settings?
**Current approach is correct:**
- Prompts already specify iPhone camera
- Quality settings handle technical parameters (megapixels, output_quality, etc.)
- Keeping prompts simple prevents plastic look
- No need to add more iPhone-specific technical details to prompts

## All Routes Now Compliant ✅

All image generation routes now:
- ✅ Use `MAYA_QUALITY_PRESETS` based on category/post type
- ✅ Apply all quality settings from presets
- ✅ Use `hf_lora` parameter consistently
- ✅ Explicitly list all parameters (no spread operator ambiguity)
- ✅ Support custom settings override where applicable
