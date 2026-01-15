# Feed Planner: Prompting Pipeline Analysis

## 🔍 Problem Identified

**User Report:**
> "Images are being created in Replicate but Maya's prompting pipeline is not being used at all. Maya is sending the captions to Replicate for image generation."

## ❌ Root Cause

### The Issue

**Maya's Strategy Format:**
- Maya generates strategy with posts containing:
  - `description`: Visual description (e.g., "woman sitting on steps writing in journal")
  - `purpose`: Strategic reasoning
  - `type`: Post type (portrait, object, etc.)
  - **NO `prompt` field** - Maya doesn't generate FLUX prompts in the strategy!

**What Happens in `create-from-strategy/route.ts`:**

```typescript
// Line 214
let finalPrompt = post.prompt || post.description || ''

// Line 216
if (!finalPrompt || finalPrompt.length < 50) {
  // Only generates FLUX prompt if finalPrompt is empty or < 50 chars
  if (generationMode === 'classic') {
    const visualComposition = await generateVisualComposition({...})
    finalPrompt = visualComposition.fluxPrompt
  }
}
```

**The Problem:**
1. `post.prompt` doesn't exist (Maya doesn't send it)
2. Falls back to `post.description` (Maya's visual description)
3. If `post.description` is > 50 chars, it **skips FLUX prompt generation**
4. Uses Maya's description directly as the "prompt" (which is NOT a FLUX prompt!)

**Then in `queue-images.ts`:**

```typescript
// Line 222
let finalPrompt = post.prompt || ""
```

- Uses `post.prompt` from database
- But `post.prompt` was set to `post.description` in `create-from-strategy`
- This description is sent directly to Replicate as the prompt
- **Maya's prompting pipeline is completely bypassed!**

---

## 📊 Flow Comparison

### ✅ CORRECT Flow (What Should Happen)

```
Maya Strategy → description: "woman writing in journal"
                ↓
create-from-strategy → ALWAYS generates FLUX prompt
                ↓
generateVisualComposition() → Creates proper FLUX prompt
                ↓
FLUX Prompt: "user123, woman, sitting on stone steps, writing in journal, 
               natural lighting, autumn leaves, authentic moment, 
               iPhone photo aesthetic, film grain..."
                ↓
Stored in database as post.prompt
                ↓
queue-images.ts → Uses FLUX prompt from database
                ↓
Replicate → Generates image with proper prompt
```

### ❌ CURRENT Flow (What's Actually Happening)

```
Maya Strategy → description: "woman writing in journal"
                ↓
create-from-strategy → Checks if description > 50 chars
                ↓
SKIPS prompt generation (because description exists)
                ↓
Uses description directly: "woman writing in journal"
                ↓
Stored in database as post.prompt
                ↓
queue-images.ts → Uses description as "prompt"
                ↓
Replicate → Generates image with WRONG prompt (description, not FLUX prompt)
```

---

## 🔧 The Fix

### Problem 1: Condition Check is Wrong (Affects BOTH Classic AND Pro Mode)

**Current Code:**
```typescript
let finalPrompt = post.prompt || post.description || ''

if (!finalPrompt || finalPrompt.length < 50) {
  if (generationMode === 'pro') {
    // Generate Nano Banana Pro prompt
  } else {
    // Generate FLUX prompt
  }
}
```

**Issue:** If `post.description` exists and is > 50 chars, it skips prompt generation for BOTH Classic AND Pro Mode.

**Fix:** Always generate prompts for BOTH modes. The description is visual direction (input), not the final prompt (output).

### Problem 2: Description vs Prompt Confusion (Affects BOTH Modes)

**Current Code:**
```typescript
finalPrompt = post.description || `Instagram post ${post.position}`
```

**Issue:** Uses description as prompt, which is wrong for both Classic and Pro Mode.

**Fix:** 
- **Classic Mode:** Always call `generateVisualComposition`, using `post.description` as `visualDirection` input
- **Pro Mode:** Always call `buildNanoBananaPrompt`, using `post.description` as `userRequest` input
- Both functions generate proper prompts - don't use description directly

---

## 🎯 Required Changes

### Change 1: Always Generate Prompts for BOTH Classic AND Pro Mode

**File:** `app/api/feed-planner/create-from-strategy/route.ts`

**Current (WRONG):**
```typescript
let finalPrompt = post.prompt || post.description || ''

if (!finalPrompt || finalPrompt.length < 50) {
  if (generationMode === 'pro') {
    // Generate Nano Banana Pro prompt
  } else {
    // Generate FLUX prompt
  }
}
```

**Issue:** If `post.description` is > 50 chars, BOTH modes skip prompt generation and use description directly.

**Fixed (CORRECT):**
```typescript
let finalPrompt = ''

if (generationMode === 'pro') {
  // ALWAYS generate Nano Banana Pro prompt for Pro Mode
  // Use post.description as userRequest (visual direction input)
  const { optimizedPrompt } = await buildNanoBananaPrompt({
    userId: neonUser.id.toString(),
    mode: (proModeType || 'workbench') as any,
    userRequest: post.description || post.purpose || `Feed post ${post.position}`, // ← Input
    // ... other params
  })
  finalPrompt = optimizedPrompt // ← Output: proper Nano Banana prompt
} else {
  // ALWAYS generate FLUX prompt for Classic Mode
  // Use post.description as visualDirection (not as the prompt itself)
  const visualComposition = await generateVisualComposition({
    postPosition: post.position,
    shotType: post.type || 'portrait',
    purpose: post.purpose || 'general',
    visualDirection: post.description || `Post ${post.position}`, // ← Input: visual direction
    brandVibe: brandProfile?.brand_vibe || 'authentic',
    authUserId: authUser.id,
    triggerWord: triggerWord || undefined,
  })
  finalPrompt = visualComposition.fluxPrompt // ← Output: proper FLUX prompt
}
```

### Change 2: Remove Fallback to Description (BOTH Modes)

**Current (WRONG):**
```typescript
catch (promptError) {
  // Fallback to description
  finalPrompt = post.description || `Instagram post ${post.position}`
}
```

**Fixed (CORRECT):**
```typescript
catch (promptError) {
  // Don't fallback to description - throw error to surface the issue
  throw new Error(`Failed to generate ${generationMode} Mode prompt: ${promptError.message}`)
}
```

**Why:** Description is NOT a valid prompt. If prompt generation fails, we need to know about it, not silently use the wrong input.

---

## 📝 Key Insights

1. **Maya's `description` is NOT a prompt (for either mode)**
   - It's a visual direction/description
   - Example: "woman writing in journal"
   - This needs to be converted to a proper prompt by the prompting pipeline

2. **Classic Mode: FLUX prompts are generated by `generateVisualComposition`**
   - This function uses Maya's prompting pipeline
   - It includes trigger words, fashion intelligence, lighting, etc.
   - Example output: "user123, woman, sitting on stone steps, writing in journal, natural lighting, autumn leaves, authentic moment, iPhone photo aesthetic..."

3. **Pro Mode: Nano Banana prompts are generated by `buildNanoBananaPrompt`**
   - This function uses Maya's Pro Mode prompting pipeline
   - It includes brand kit, workflow optimization, text elements, etc.
   - Example output: Optimized prompt for Nano Banana Pro workflow

4. **The condition `if (!finalPrompt || finalPrompt.length < 50)` is wrong**
   - It assumes if description exists, we don't need to generate a prompt
   - But description ≠ prompt (for BOTH modes)
   - We should ALWAYS generate prompts for BOTH Classic AND Pro Mode

5. **Both modes were affected by the same bug**
   - If description > 50 chars, both modes skipped prompt generation
   - Both modes would use description directly as prompt (WRONG)

---

## 🔍 Verification

After fix, verify:
1. ✅ `generateVisualComposition` is called for ALL Classic Mode posts
2. ✅ `buildNanoBananaPrompt` is called for ALL Pro Mode posts
3. ✅ Generated prompts (FLUX or Nano Banana) are stored in database (not descriptions)
4. ✅ `queue-images.ts` uses the proper prompts from database
5. ✅ Images are generated with proper prompts (not descriptions)
6. ✅ No fallback to description - errors are thrown if prompt generation fails

---

## 📊 Impact

**Before Fix:**
- **Classic Mode:** Images generated with descriptions like "woman writing in journal"
- **Pro Mode:** Images generated with descriptions (not proper Nano Banana prompts)
- Poor image quality (descriptions are too simple)
- Maya's prompting pipeline completely bypassed for BOTH modes
- **Classic Mode:** No trigger words, no fashion intelligence, no proper FLUX formatting
- **Pro Mode:** No brand kit integration, no workflow optimization, no proper Nano Banana formatting

**After Fix:**
- **Classic Mode:** Images generated with proper FLUX prompts
- **Pro Mode:** Images generated with proper Nano Banana prompts
- High-quality images (proper prompting pipeline for both modes)
- **Classic Mode:** Trigger words included, fashion intelligence applied, proper FLUX formatting
- **Pro Mode:** Brand kit integrated, workflow optimized, proper Nano Banana formatting

