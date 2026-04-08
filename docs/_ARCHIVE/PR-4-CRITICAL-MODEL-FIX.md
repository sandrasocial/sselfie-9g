# 🚨 PR-4 CRITICAL MODEL ERROR - Must Fix Before Deploy

**Date:** January 9, 2026  
**Issue:** Paid blueprint using completely wrong model  
**Severity:** CRITICAL - Blocks deployment

---

## ❌ **WHAT'S WRONG**

### Current PAID Blueprint (PR-4) - INCORRECT ❌

```typescript
// Using FLUX model (WRONG!)
const prediction = await replicate.predictions.create({
  model: "black-forest-labs/flux-dev",  // ❌ WRONG MODEL
  input: {
    prompt: variedPrompt,                // ❌ Generic prompt
    aspect_ratio: "1:1",
    num_outputs: 1,
    guidance: 3.5,
    num_inference_steps: 28,
    output_format: "png",
    output_quality: 100,
  },
})
```

**Problems:**
1. ❌ Wrong model (FLUX instead of Nano Banana Pro)
2. ❌ No user selfies included
3. ❌ Generic prompt variations instead of templates
4. ❌ Wrong parameters (guidance, num_inference_steps don't exist in Nano Banana)

---

### FREE Blueprint - CORRECT ✅

```typescript
// Using Nano Banana Pro (CORRECT!)
const result = await generateWithNanoBanana({
  prompt,                                    // ✅ From template system
  image_input: validImageUrls,              // ✅ User's selfies
  aspect_ratio: "1:1",
  resolution: "2K",                          // ✅ Nano Banana parameter
  output_format: "png",
  safety_filter_level: "block_only_high",   // ✅ Nano Banana parameter
})
```

**How it works:**
1. ✅ Uses `google/nano-banana-pro` model
2. ✅ Includes user's uploaded selfies (up to 3 images)
3. ✅ Uses sophisticated template system (`getBlueprintPhotoshootPrompt`)
4. ✅ Creates 3x3 grid with 9 frames of same person
5. ✅ Maintains facial/body consistency using reference images

---

## ✅ **WHAT NEEDS TO CHANGE**

### Required Changes to `/app/api/blueprint/generate-paid/route.ts`

**1. Import Nano Banana Client**
```typescript
// REPLACE THIS:
import { getReplicateClient } from "@/lib/replicate-client"

// WITH THIS:
import { generateWithNanoBanana, checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { getBlueprintPhotoshootPrompt } from "@/lib/maya/blueprint-photoshoot-templates"
```

**2. Get User's Selfies from Database**
```typescript
// Add to initial SELECT:
const subscriber = await sql`
  SELECT 
    id,
    email,
    paid_blueprint_purchased,
    paid_blueprint_generated,
    paid_blueprint_photo_urls,
    strategy_data,
    selfie_image_urls,      // ← ADD THIS
    form_data               // ← ADD THIS (contains category/mood)
  FROM blueprint_subscribers
  WHERE access_token = ${accessToken}
`
```

**3. Validate Selfies Exist**
```typescript
// Check user has uploaded selfies
const selfieUrls = data.selfie_image_urls || []
if (!Array.isArray(selfieUrls) || selfieUrls.length === 0) {
  return NextResponse.json(
    { error: "Please upload your selfies in the free blueprint first." },
    { status: 400 }
  )
}
```

**4. Get Category & Mood from form_data**
```typescript
const formData = data.form_data || {}
const category = formData.vibe || 'professional'  // From form
const mood = formData.selectedFeedStyle || 'minimal'  // From form

// Get template prompt
const templatePrompt = getBlueprintPhotoshootPrompt(category, mood)
```

**5. Replace FLUX Generation with Nano Banana**
```typescript
// REPLACE THIS:
const prediction = await replicate.predictions.create({
  model: "black-forest-labs/flux-dev",
  input: { prompt: variedPrompt, ... }
})

// WITH THIS:
const result = await generateWithNanoBanana({
  prompt: templatePrompt,                    // Template prompt
  image_input: selfieUrls,                   // User's selfies
  aspect_ratio: "1:1",
  resolution: "2K",                          // Paid tier gets 2K
  output_format: "png",
  safety_filter_level: "block_only_high",
})
```

**6. Replace Polling Logic**
```typescript
// REPLACE waitForPrediction() function with:
async function waitForNanoBananaPrediction(predictionId: string, photoNumber: number): Promise<string | null> {
  const maxAttempts = 60
  const delayMs = 5000
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await checkNanoBananaPrediction(predictionId)
    
    if (status.status === "succeeded" && status.output) {
      console.log("[v0][paid-blueprint] Photo", photoNumber, "completed")
      return status.output
    } else if (status.status === "failed") {
      console.error("[v0][paid-blueprint] Photo", photoNumber, "failed:", status.error)
      return null
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  return null
}
```

**7. Remove Generic Prompt Variations**
```typescript
// REMOVE varyPrompt() function entirely
// Nano Banana Pro creates varied angles automatically from template
```

---

## 📊 **COMPARISON**

| Feature | Current (WRONG) | Should Be (CORRECT) |
|---------|----------------|---------------------|
| Model | `flux-dev` ❌ | `nano-banana-pro` ✅ |
| User Selfies | None ❌ | 1-3 images ✅ |
| Prompts | Generic variations ❌ | Template system ✅ |
| Parameters | guidance, steps ❌ | resolution, safety_filter ✅ |
| Output | Single image ❌ | 3x3 grid (9 frames) ✅ |
| Consistency | No reference ❌ | Uses selfies for consistency ✅ |

---

## 🎯 **WHAT PAID BLUEPRINT SHOULD DO**

The paid blueprint should generate **30 grids** (not 30 individual photos):

1. **Each grid** = 3x3 layout with 9 frames of the user
2. **Uses user's selfies** for facial/body consistency  
3. **Uses same template system** as free blueprint
4. **30 different variations** using the same template prompt
5. **Nano Banana Pro** automatically creates varied angles

**Total output:** 30 grids × 9 frames each = 270 individual frames (but delivered as 30 grid images)

---

## 💰 **COST IMPLICATIONS**

### Current (WRONG)
- FLUX: $0.03 per image
- 30 images = $0.90

### Correct (Nano Banana Pro)
- Nano Banana Pro: $0.02 per generation (per API docs)
- 30 grids = $0.60

**Better margin!** ($47 price - $0.60 cost = $46.40 profit vs $46.10)

---

## 🚨 **DEPLOYMENT BLOCKER**

**Status:** 🔴 **DO NOT DEPLOY PR-4 AS-IS**

**Why:**
1. Using wrong model entirely
2. Not using user's selfies
3. Won't match free blueprint aesthetic
4. User will get generic AI photos instead of their personalized grids

**Users expect:** 30 professional grids with THEIR face  
**Current PR-4 gives:** 30 generic stock-photo-style images

---

## ✅ **ACTION ITEMS**

### Immediate (Before Any Deployment)

1. **Rewrite `/app/api/blueprint/generate-paid/route.ts`**
   - Switch to Nano Banana Pro
   - Add selfie_image_urls requirement
   - Use template system
   - Update polling logic

2. **Update Tests**
   - Test script needs to upload selfies first
   - Verify grids are generated (not single images)
   - Check facial consistency

3. **Update Documentation**
   - All PR-4 docs mention wrong model
   - Update cost calculations
   - Update technical specs

### After Fix

4. **Re-run all tests** with correct model
5. **Verify output matches free blueprint** aesthetic
6. **Deploy to staging** for visual QA

---

## 📋 **SANDRA'S QUESTION ANSWERED**

**Q:** "The FREE blueprint does NOT have black-forest-labs/flux-dev. We refactored to pro. Nanobanana pro and the prompting templates."

**A:** You are 100% correct. I made a critical error by:
1. Not checking yesterday's refactor
2. Comparing against old FLUX code
3. Building paid blueprint with wrong model

**Current PR-4 status:** ❌ **Blocked - must fix before deploy**

**What needs to happen:** Complete rewrite of generation logic to match free blueprint's Nano Banana Pro approach

---

## 🔧 **FIX TIMELINE**

**Estimated time:** 1-2 hours to:
1. Rewrite generate-paid API
2. Update all documentation
3. Re-run tests
4. Visual QA with real output

**Risk level:** Medium (significant rewrite but clear path)

---

**Discovered:** January 9, 2026  
**Status:** Critical - Blocks Deployment  
**Next Step:** Rewrite `/app/api/blueprint/generate-paid/route.ts` to use Nano Banana Pro
