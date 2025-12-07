# Maya Image Prompting Pipeline Audit

## User Report
**Issue:** Maya used to create beautiful, realistic iPhone-quality images. Now images look artificial and AI-generated.

**Request:** Audit the prompting pipeline (NOT settings) to identify what changed.

---

## Current Prompting Architecture

### 1. Prompt Generation Flow

**Entry Point:** `app/api/maya/generate-concepts/route.ts`
- Claude Sonnet 4 generates concept prompts
- Uses `getFluxPromptingPrinciples()` for guidance
- Temperature: `0.85` (line 390)
- Max tokens: `4096`

**Prompt Structure:** The principles file (`lib/maya/flux-prompting-principles.ts`) defines:
- **Target Length:** 50-80 words
- **Mandatory Elements:**
  1. Trigger word + Gender
  2. Outfit with fabrics/textures (8-15 words)
  3. Expression + Pose (5-8 words)
  4. Setting/Environment (5-8 words)
  5. Lighting (8-12 words)
  6. **Camera/Technical Specs (8-12 words)** - MUST include "shot on iPhone 15 Pro" OR focal length
  7. **Film Aesthetics (5-8 words)** - **MANDATORY: film grain + muted colors**
  8. Mood/Atmosphere (3-5 words)

---

## Critical Findings: What Might Be Causing "AI-Looking" Images

### 🔴 ISSUE #1: Prompt Length May Be Too Long

**Current Target:** 50-80 words
**Reality Check:** 
- Example prompts in principles are 62-75 words
- But Maya's personality.ts says:
  - Close-ups: 20-30 words
  - Half body: 25-35 words
  - Full body: 30-40 words
  - Environmental: 35-45 words

**CONFLICT:** The principles say 50-80 words, but personality says 20-45 words. This inconsistency might cause Claude to generate prompts that are either:
- Too short (missing critical elements)
- Too long (overwhelming the model, causing artifacts)

**Impact:** Longer prompts can cause FLUX to over-interpret, leading to artificial-looking results.

---

### 🔴 ISSUE #2: Missing iPhone Emphasis

**Current State:**
- Principles say: "shot on iPhone 15 Pro" OR focal length
- But there's no **emphasis** that iPhone is preferred for authenticity
- No guidance on WHEN to use iPhone vs. focal length

**Problem:** If Claude chooses "35mm lens" instead of "iPhone 15 Pro", the image won't have that iPhone aesthetic.

**What Was Likely Better Before:**
- Probably had stronger emphasis on iPhone
- Maybe had "iPhone 15 Pro" as default, not optional

---

### 🔴 ISSUE #3: Film Grain & Muted Colors May Not Be Enforced Strongly Enough

**Current State:**
- Principles say film grain and muted colors are **MANDATORY**
- But the checklist is at the END of the principles
- No explicit validation in the generation prompt

**Problem:** Claude might skip these if the prompt gets too long or complex.

**What Was Likely Better Before:**
- Probably had these as non-negotiable requirements
- Maybe had them earlier in the prompt structure
- Possibly had stronger language: "CRITICAL" vs "MANDATORY"

---

### 🔴 ISSUE #4: Generic Quality Terms Might Be Slipping In

**Current Banned Words:**
- "stunning", "perfect", "beautiful", "high quality", "8K", "ultra realistic"

**Problem:** 
- These are in the anti-patterns section
- But Claude might still use them if not explicitly reminded
- No validation step to remove them

**What Was Likely Better Before:**
- Probably had these banned more explicitly
- Maybe had a post-processing step to remove them

---

### 🔴 ISSUE #5: Temperature Might Be Too High

**Current:** `temperature: 0.85` (line 390 in generate-concepts/route.ts)

**Problem:**
- 0.85 is quite high (0.7-0.8 is typical for creative tasks)
- Higher temperature = more variation, but also more risk of:
  - Skipping mandatory elements
  - Using banned words
  - Creating overly complex prompts

**What Was Likely Better Before:**
- Probably 0.7-0.75 for more consistent, structured outputs

---

### 🔴 ISSUE #6: No Explicit "Authentic iPhone Photo" Language

**Current State:**
- Principles mention "iPhone 15 Pro" but don't emphasize the AUTHENTICITY aspect
- No language like: "looks like a real iPhone photo", "authentic phone camera quality"

**Problem:** FLUX might generate technically correct iPhone specs but still create "professional" looking images.

**What Was Likely Better Before:**
- Probably had explicit language about "authentic iPhone photo aesthetic"
- Maybe had "amateur cellphone quality" or "Instagram-native aesthetic"

---

### 🔴 ISSUE #7: Missing "Natural Skin Texture" Emphasis

**Current State:**
- Principles mention "natural texture" in camera specs
- But not emphasized as critical for authenticity

**Problem:** Without explicit skin texture language, FLUX might create overly smooth, AI-looking skin.

**What Was Likely Better Before:**
- Probably had "natural skin texture", "pores visible", "realistic skin" as mandatory
- Maybe had this in the film aesthetics section

---

### 🔴 ISSUE #8: Prompt Order Might Not Be Optimal

**Current Order:**
1. Trigger + Gender
2. Outfit
3. Expression + Pose
4. Setting
5. Lighting
6. Camera/Technical
7. Film Aesthetics
8. Mood

**Problem:** Film aesthetics (grain + muted colors) are at the END. FLUX might prioritize earlier elements and de-emphasize these.

**What Was Likely Better Before:**
- Probably had film aesthetics earlier (maybe after camera specs, before mood)
- Or had them integrated into camera specs section

---

## Comparison: What "iPhone Quality" Actually Means

### Real iPhone Photos Have:
1. **Slight grain/noise** (especially in low light)
2. **Muted, realistic colors** (not oversaturated)
3. **Natural skin texture** (pores, imperfections visible)
4. **Shallow depth of field** (portrait mode)
5. **Slight motion blur** (handheld feel)
6. **Realistic lighting** (not studio-perfect)
7. **Authentic moments** (not posed)

### Current Prompting Might Be Missing:
- ✅ Has: film grain (mandatory)
- ✅ Has: muted colors (mandatory)
- ✅ Has: iPhone 15 Pro (optional)
- ❌ Missing: "natural skin texture" emphasis
- ❌ Missing: "handheld feel" or "slight motion blur"
- ❌ Missing: "authentic moment" vs "posed photo"
- ❌ Missing: "Instagram-native aesthetic"

---

## Recommendations (For Future Implementation)

### 1. **Strengthen iPhone Emphasis**
   - Make "shot on iPhone 15 Pro" the DEFAULT, not optional
   - Add: "authentic iPhone photo aesthetic"
   - Add: "looks like a real phone camera photo"

### 2. **Move Film Aesthetics Earlier**
   - Place film grain + muted colors right after camera specs
   - Make them part of the camera section, not separate

### 3. **Add Natural Skin Texture as Mandatory**
   - Add to camera/technical specs section
   - Language: "natural skin texture, pores visible, realistic imperfections"

### 4. **Reduce Temperature**
   - Change from 0.85 to 0.75 for more consistent outputs
   - Ensures mandatory elements are always included

### 5. **Add Post-Processing Validation**
   - Check prompts for banned words
   - Verify film grain + muted colors are present
   - Verify iPhone or focal length is present

### 6. **Clarify Prompt Length**
   - Resolve conflict between principles (50-80 words) and personality (20-45 words)
   - Recommend: 40-60 words for optimal balance

### 7. **Add "Authentic Moment" Language**
   - Emphasize "candid moment" vs "posed photo"
   - Add "Instagram-native aesthetic"
   - Add "handheld feel, slight motion blur"

### 8. **Strengthen Anti-Pattern Enforcement**
   - Move banned words to the TOP of the principles
   - Add explicit reminder in the generation prompt
   - Make it a hard requirement, not just a suggestion

---

## Key Question: What Changed?

**Most Likely Culprits:**
1. **Temperature increased** (from 0.7-0.75 to 0.85) → less consistent outputs
2. **Prompt length increased** (from 20-45 to 50-80 words) → more complexity, more artifacts
3. **iPhone emphasis weakened** (from default to optional) → less authentic aesthetic
4. **Film aesthetics de-emphasized** (moved to end, not integrated) → easier to skip
5. **Natural skin texture not emphasized** → overly smooth, AI-looking skin

**The Fix:** Strengthen the "authentic iPhone photo" requirements and make them non-negotiable, not optional suggestions.

