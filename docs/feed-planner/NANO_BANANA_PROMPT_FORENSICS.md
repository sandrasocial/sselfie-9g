# Nano Banana Pro Prompt Forensics (January 18, 2026)

## VERDICT: **WRONG BUILDER USED** (Root Cause: A)

Feed Planner is using `buildSingleImagePrompt()` which generates **structured system prompts** with labels like "Scene:", "Composition:", "Critical constraints:", etc.

Nanobanana Pro requires **natural language prompts** without system labels.

A correct builder exists (`buildNanoBananaPrompt()`) but is **NOT being used** by Feed Planner.

---

## 1. REPLICATE CALL LOCATION

**File:** `lib/nano-banana-client.ts`  
**Function:** `generateWithNanoBanana()`  
**Line:** 130

```typescript
const prediction = await replicate.predictions.create({
  model: "google/nano-banana-pro",
  input: replicateInput,  // ← Contains prompt: finalPrompt
})
```

**Prompt variable chain:**
```
input.prompt 
  → finalPrompt (line 75, with identity anchor logic)
  → replicateInput.prompt (line 113)
  → sent to Replicate (line 130)
```

---

## 2. FEED PLANNER CALL CHAIN (Complete Trace)

### Entry Point
**File:** `app/api/feed/[feedId]/generate-single/route.ts`  
**User action:** Click "Generate" on a feed post

### Prompt Flow

```
User clicks Generate
  ↓
Line 568: finalPrompt = authorityResult.prompt
  ↓  
Line 1248: cleanedPrompt = cleanBlueprintPrompt(finalPrompt)
  ↓
Line 1254: generateWithNanoBanana({ prompt: cleanedPrompt, ... })
  ↓
lib/nano-banana-client.ts → Replicate API
```

### Call Chain Detail

1. **Line 556-568:** `generateFeedSinglePromptViaAuthority()` is called
   ```typescript
   const authorityResult = await generateFeedSinglePromptViaAuthority(
     injectedTemplate,
     post.position,
     { userId, feedId, postId, category, mood }
   )
   finalPrompt = authorityResult.prompt  // ← System prompt with labels
   ```

2. **Authority wrapper** (`lib/maya/prompt-authority.ts:1185`):
   ```typescript
   const { buildSingleImagePrompt } = await import('@/lib/feed-planner/build-single-image-prompt')
   const prompt = await buildSingleImagePrompt(templatePrompt, position, brandKit, category, mood)
   return { prompt, metadata }  // ← Returns structured prompt
   ```

3. **Wrong builder used** (`lib/feed-planner/build-single-image-prompt.ts:285-367`):
   ```typescript
   // This builder creates STRUCTURED prompts with system labels
   const promptParts: string[] = []
   
   if (sceneSpec) {
     promptParts.push(`Scene: ${sceneSpec.sceneDNA}`)           // ← SYSTEM LABEL
     promptParts.push(`Composition: ${sceneSpec.composition}`)   // ← SYSTEM LABEL
     promptParts.push(`Location: ${sceneSpec.location}`)         // ← SYSTEM LABEL
     promptParts.push(`Critical constraints: ${...}`)            // ← SYSTEM LABEL
   }
   
   promptParts.push(`Aesthetic direction: ${vibe}`)              // ← SYSTEM LABEL
   promptParts.push(`Camera approach: ${...}`)                   // ← SYSTEM LABEL
   promptParts.push(`Lighting direction: ${...}`)                // ← SYSTEM LABEL
   promptParts.push(`Technical requirements: ${...}`)            // ← SYSTEM LABEL
   promptParts.push(`Color grading: ${colorGrade}`)              // ← SYSTEM LABEL
   promptParts.push(`Restrictions: ${...}`)                      // ← SYSTEM LABEL
   
   return promptParts.join(' ').trim()  // ← Space-joined labels
   ```

4. **Light cleaning** (`lib/feed-planner/build-single-image-prompt.ts:432-444`):
   ```typescript
   export function cleanBlueprintPrompt(prompt: string): string {
     // Only removes {{placeholders}} like {{LOCATION_ARCHITECTURAL_1}}
     // Does NOT remove system labels like "Scene:", "Composition:", etc.
     const cleaned = prompt.replace(/\{\{[^}]+\}\}/g, '')
     return cleaned.replace(/\s{2,}/g, ' ').trim()
   }
   ```
   **Impact:** System labels remain intact and are sent to Nanobanana Pro.

---

## 3. SYSTEM LANGUAGE INJECTION POINTS

### Source File: `lib/feed-planner/build-single-image-prompt.ts`

| Line | System Label | Example Output |
|------|-------------|----------------|
| 310 | `Scene:` | `Scene: Professional woman in modern beige minimalist office` |
| 311 | `Composition:` | `Composition: Full body portrait, centered composition` |
| 312 | `Location:` | `Location: Luxurious hotel lobby with floor-to-ceiling windows` |
| 322 | `Critical constraints:` | `Critical constraints: Do not change location. Do not mix scenes.` |
| 330 | `Aesthetic direction:` | `Aesthetic direction: Warm and confident editorial photography` |
| 335 | `Setting:` | `Setting: Urban coffee shop with modern minimalist interior` |
| 343 | `Camera approach:` | `Camera approach: Medium shot, eye-level perspective, centered framing` |
| 344 | `Lighting direction:` | `Lighting direction: Soft natural window light from left side` |
| 348 | `Technical requirements:` | `Technical requirements: Sharp focus throughout, natural realism, zero artifacts...` |
| 352 | `Color grading:` | `Color grading: Warm tones with soft beige highlights` |
| 362 | `Restrictions:` | `Restrictions: Avoid studio backdrops. Exclude artificial props. Maintain natural posture.` |

### Example Final Prompt Sent to Nanobanana Pro

```
Use the uploaded photos as strict identity reference. Scene: Professional woman in modern beige minimalist office with floor-to-ceiling windows and natural light. Composition: Full body portrait, centered composition, professional standing pose. Location: Luxurious hotel lobby with marble walls and geometric patterns. Critical constraints: Do not change location. Do not mix indoor and outdoor. Do not change outfit. Aesthetic direction: Warm and confident editorial photography with soft luxury feel. Setting: Urban coffee shop with modern minimalist interior design. Professional woman in tailored beige blazer and cream turtleneck, standing confidently with coffee in hand - overhead perspective - soft natural lighting with warm color grading and clean beige aesthetic. Camera approach: Medium shot, eye-level perspective, centered framing. Lighting direction: Soft natural window light from left side. Technical requirements: Sharp focus throughout, natural realism, zero artifacts, authentic iPhone photography aesthetic. Color grading: Warm tones with soft beige highlights. Restrictions: Avoid studio backdrops. Exclude artificial props. Maintain natural posture.
```

**Problem:** This is a **technical specification document**, not a natural language prompt.

---

## 4. CORRECT BUILDER EXISTS (NOT USED)

**File:** `lib/maya/nano-banana-prompt-builder.ts`  
**Function:** `buildNanoBananaPrompt()`  
**Purpose:** Studio Pro ONLY (google/nano-banana-pro)

### Nanobanana Prompting Principles (Lines 119-154)

```typescript
export function getNanoBananaPromptingPrinciples(): string {
  return `
## NANO BANANA PRO PRINCIPLES (STUDIO PRO)

**PROMPT LENGTH:**
- Target 100-150 words for optimal detail without losing identity focus
- Clarity and structure matter more than raw length
- Structured multi-clause prompts perform best

**PROMPT STRUCTURE (MANDATORY ORDER):**
Follow this structure exactly:
1. [Identity Anchor] - Always start with identity preservation phrase
2. [Outfit & Brand Details] - Specific clothing, materials, colors, brand names (if applicable)
3. [Setting & Mood] - Location, environment, atmosphere
4. [Style/Technical] - Photographic style, camera specs, lighting

**FORMAT REQUIREMENTS:**
- Use full, natural language sentences
- Avoid comma-separated keyword lists or "tag soup"
- Write like describing to a photographer, not keyword stuffing
- Each clause should be a complete sentence or natural phrase

**IDENTITY PRESERVATION:**
- Always start with the identity preservation anchor: "Use the uploaded photos as strict identity reference"
- This ensures the model uses reference images as the source of truth
- Never place identity anchor in the middle or end of prompt
  `.trim()
}
```

### Key Differences

| Aspect | `buildSingleImagePrompt()` (WRONG) | `buildNanoBananaPrompt()` (CORRECT) |
|--------|----------------------------------|-----------------------------------|
| **Format** | System labels ("Scene:", "Composition:") | Natural language sentences |
| **Length** | Variable (often 250+ words) | 100-150 words optimal |
| **Structure** | Space-joined label blocks | Full sentences, photographer brief |
| **Identity anchor** | Sometimes missing or incorrect placement | Always first: "Use the uploaded photos as strict identity reference" |
| **Use case** | Originally for Flux LoRA (not Nanobanana) | Designed specifically for Nanobanana Pro |
| **Active usage** | Feed Planner (100% of traffic) | Studio Pro mode only |

---

## 5. ROOT CAUSE CLASSIFICATION

**Verdict: A) WRONG BUILDER USED**

### Evidence

1. **Feed Planner calls:**
   - `buildSingleImagePrompt()` → structured system labels

2. **Studio Pro calls:**
   - `buildNanoBananaPrompt()` → natural language

3. **Both use same model:**
   - `google/nano-banana-pro` via `lib/nano-banana-client.ts`

4. **Different prompt formats:**
   - Feed Planner: "Scene: X. Composition: Y. Camera approach: Z."
   - Studio Pro: "Create a professional photo of [subject] wearing [outfit] in [setting] with [lighting]."

5. **Impact:**
   - Nanobanana Pro receives technical spec documents instead of natural language
   - Model tries to interpret labels as part of scene description
   - Quality degrades due to prompt format mismatch

---

## 6. COMPARISON: INTENDED vs ACTUAL

### Intended Nanobanana Pro Prompt (from `buildNanoBananaPrompt()`)

```typescript
// Example from Studio Pro brand-scene mode (lines 624-653)
function buildBrandScenePrompt(params) {
  let prompt = userRequest  // Maya's natural language description
  
  // Light cleaning - remove formatting only
  prompt = prompt.replace(/\*\*/g, '')  // Remove ** bold
  prompt = prompt.replace(/^Note:/gm, '') // Remove "Note:" lines
  prompt = prompt.replace(/^CRITICAL:/gm, '') // Remove "CRITICAL:" lines
  prompt = prompt.trim()
  
  // Add multi-image instruction if needed
  if (inputImages.baseImages.length > 1) {
    prompt = `${prompt}\n\nUse the first base image to preserve the person's face and identity.`
  }
  
  return prompt  // ← Natural language, no system labels
}
```

**Example output:**
```
Use the uploaded photos as strict identity reference. Professional woman wearing tailored beige blazer and cream turtleneck, standing confidently in modern minimalist office with floor-to-ceiling windows. Soft natural window light creates warm, editorial atmosphere. Shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic with natural skin texture and muted color palette.
```

### Actual Feed Planner Prompt (from `buildSingleImagePrompt()`)

```typescript
// Current implementation (lines 285-367)
const promptParts: string[] = []

if (sceneSpec) {
  promptParts.push(`Scene: ${sceneSpec.sceneDNA}`)
  promptParts.push(`Composition: ${sceneSpec.composition}`)
  promptParts.push(`Location: ${sceneSpec.location}`)
  promptParts.push(`Critical constraints: ${criticalRules.join(' ')}`)
}

promptParts.push(`Aesthetic direction: ${vibe}`)
promptParts.push(`Camera approach: ${sceneSpec.cameraConstraints}`)
promptParts.push(`Lighting direction: ${sceneSpec.lighting}`)
promptParts.push(`Technical requirements: Sharp focus throughout, natural realism...`)
promptParts.push(`Color grading: ${colorGrade}`)
promptParts.push(`Restrictions: ${negativeRulesText}`)

return promptParts.join(' ').trim()  // ← System labels, not natural language
```

**Example output:**
```
Use the uploaded photos as strict identity reference. Scene: Professional woman in modern beige minimalist office with floor-to-ceiling windows and natural light. Composition: Full body portrait, centered composition, professional standing pose. Location: Luxurious hotel lobby with marble walls and geometric patterns. Critical constraints: Do not change location. Do not mix indoor and outdoor. Aesthetic direction: Warm and confident editorial photography. Setting: Urban coffee shop with modern minimalist interior. Professional woman in tailored beige blazer and cream turtleneck, standing confidently - overhead perspective - soft natural lighting. Camera approach: Medium shot, eye-level perspective. Lighting direction: Soft natural window light from left side. Technical requirements: Sharp focus throughout, natural realism, zero artifacts. Color grading: Warm tones with soft beige highlights. Restrictions: Avoid studio backdrops. Exclude artificial props.
```

### Key Differences

| Element | Intended (Natural Language) | Actual (System Labels) |
|---------|---------------------------|----------------------|
| **Format** | Flowing sentences | Label: Value pairs |
| **Length** | 100-150 words | 250+ words |
| **Readability** | "Like describing to a photographer" | "Like a technical spec sheet" |
| **Labels** | None | 11+ system labels |
| **Redundancy** | Minimal | High (multiple location/setting descriptions) |
| **Nanobanana compatibility** | ✅ Optimized | ❌ Degraded |

---

## 7. MINIMAL FIX RECOMMENDATION

### Option 1: Replace Builder (Recommended)

**Change:** Use `buildNanoBananaPrompt()` instead of `buildSingleImagePrompt()` in Feed Planner flow.

**Files to modify:**
1. `lib/maya/prompt-authority.ts` (line 1185)
2. `app/api/feed/[feedId]/generate-single/route.ts` (use Authority wrapper with correct builder)

**Benefits:**
- Natural language prompts optimized for Nanobanana Pro
- Proper identity anchor format
- 100-150 word target (not 250+)
- No system labels
- Matches Studio Pro quality

**Risks:**
- Requires adapting Feed Planner data (sceneSpec, brandKit) to `buildNanoBananaPrompt()` input format
- May need new adapter layer between Feed Planner and Nanobanana builder

---

### Option 2: Convert System Labels to Natural Language (Interim)

**Change:** Add a conversion function that transforms system labels into natural language.

**Location:** After `buildSingleImagePrompt()` call, before `cleanBlueprintPrompt()`.

**Implementation:**
```typescript
function convertToNaturalLanguage(structuredPrompt: string): string {
  let natural = structuredPrompt
  
  // Remove all system labels and merge into flowing sentences
  natural = natural.replace(/Scene:\s*/gi, '')
  natural = natural.replace(/Composition:\s*/gi, '')
  natural = natural.replace(/Location:\s*/gi, '')
  natural = natural.replace(/Critical constraints:\s*/gi, '')
  natural = natural.replace(/Aesthetic direction:\s*/gi, '')
  natural = natural.replace(/Setting:\s*/gi, '')
  natural = natural.replace(/Camera approach:\s*/gi, '')
  natural = natural.replace(/Lighting direction:\s*/gi, '')
  natural = natural.replace(/Technical requirements:\s*/gi, '')
  natural = natural.replace(/Color grading:\s*/gi, '')
  natural = natural.replace(/Restrictions:\s*/gi, '')
  
  // Clean up spacing and redundancy
  natural = natural.replace(/\s{2,}/g, ' ')
  natural = natural.trim()
  
  return natural
}
```

**Benefits:**
- Quick fix without architectural changes
- No data model changes needed
- Preserves existing Feed Planner logic

**Risks:**
- Still verbose (doesn't reduce to 100-150 words)
- Redundancy remains (multiple location/setting descriptions)
- Not as clean as using the correct builder

---

## 8. NEXT STEPS (DO NOT IMPLEMENT YET)

1. **Decide on fix strategy:**
   - Option 1 (replace builder) for best quality
   - Option 2 (label removal) for quick fix

2. **If Option 1 (recommended):**
   - Create adapter layer: `FeedPlannerData → buildNanoBananaPrompt() input format`
   - Update Authority wrapper to route Feed Planner to Nanobanana builder
   - Test with 5-10 feed posts to verify quality improvement

3. **If Option 2 (interim):**
   - Add `convertToNaturalLanguage()` function
   - Insert after `buildSingleImagePrompt()` call
   - Test output format before/after

4. **Quality validation:**
   - Generate 10 images with old prompts
   - Generate 10 images with new prompts
   - Compare: identity preservation, scene accuracy, aesthetic quality

---

## SUMMARY

| Finding | Value |
|---------|-------|
| **Root Cause** | Wrong builder used (A) |
| **Contamination Source** | `lib/feed-planner/build-single-image-prompt.ts` lines 310-362 |
| **System Labels Injected** | 11+ labels (Scene, Composition, Location, etc.) |
| **Correct Builder** | `lib/maya/nano-banana-prompt-builder.ts` (exists but not used) |
| **Active Usage** | Feed Planner: 100% traffic using wrong builder |
| **Impact** | Nanobanana Pro receives technical specs instead of natural language |
| **Fix** | Use `buildNanoBananaPrompt()` or strip system labels |
| **Status** | **NO CHANGES MADE** - awaiting decision on fix strategy |

---

**Generated:** January 18, 2026  
**Author:** Cursor AI (forensics audit)  
**Status:** Evidence-based analysis complete, no refactoring performed
