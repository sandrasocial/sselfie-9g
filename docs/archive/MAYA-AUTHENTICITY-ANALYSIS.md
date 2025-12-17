# Maya Image Authenticity Analysis - What Changed & How to Restore

## Executive Summary

**The Problem:** Maya's images changed from authentic, iPhone-quality photos to overly produced, plastic-looking images.

**Root Cause:** A major refactoring in commit `51616ab` (Nov 26, 2025) changed the prompting approach from short, casual, "amateur cellphone" style to longer, more professional/technical language.

**Current State:** Recent fixes (commit `6a57936`) have improved things, but the prompts are still longer than the original working version and missing some key "amateur authenticity" language.

---

## What Was Working (Before Nov 26, 2025 - Commit 275188b)

### Key Characteristics:
1. **Short prompts: 28-40 words** (never exceed 45)
   - Close-ups: 20-28 words
   - Half body: 28-38 words
   - Environmental: 35-45 words

2. **Strong iPhone emphasis:**
   - "shot on iPhone 15 Pro" was **MANDATORY** in every prompt
   - Alternative language: "amateur cellphone photo"
   - Goal: "looks like someone's incredibly aesthetic friend took it on their phone"

3. **Natural imperfections emphasized:**
   - "visible sensor noise"
   - "slight motion blur"
   - "natural skin texture"
   - "subtle film grain"

4. **Casual, authentic language:**
   - Avoided anything that sounded "professional" or "studio"
   - Focused on "accidentally perfect" not "professionally posed"
   - Simple, conversational descriptions

5. **Lighting philosophy:**
   - "FLUX defaults to 'studio lighting' which looks FAKE"
   - Required NATURAL, IMPERFECT light
   - Mixed color temperatures, uneven ambient light

---

## What Changed (Nov 26, 2025 - Commit 51616ab)

### The Breaking Changes:

1. **Prompt length DOUBLED:**
   - Changed from 28-40 words → **50-80 words**
   - This made prompts too complex and professional-sounding

2. **iPhone became optional:**
   - Changed from "MANDATORY" → "shot on iPhone 15 Pro OR focal length"
   - This allowed professional camera language to creep in

3. **Removed "amateur cellphone" language:**
   - Lost the key phrase: "amateur cellphone photo"
   - Lost emphasis on "looks like a friend took it"

4. **More professional/technical language:**
   - Added detailed technical specs (aperture, focal length)
   - Made it sound more like a professional photoshoot

5. **Film grain became separate section:**
   - Moved to end of prompt structure
   - Made it easier for Claude to skip

---

## Current State (After Recent Fixes - Commit 6a57936)

### What's Been Fixed:
✅ iPhone 15 Pro is now mandatory again (95% of prompts)
✅ Natural skin texture added as mandatory
✅ Film grain + muted colors integrated into camera section
✅ Prompt length reduced to 40-60 words (better, but still longer than original)
✅ Post-processing validation added
✅ Temperature reduced from 0.85 to 0.75

### What's Still Missing:
❌ Still 40-60 words (vs original 28-40) - prompts are longer than when they worked best
❌ Missing "amateur cellphone photo" alternative language
❌ Missing emphasis on "looks like a friend took it" casual aesthetic
❌ Missing "visible sensor noise" and other phone camera imperfections
❌ More technical/professional tone than the original casual approach

---

## The Core Issue

**The original prompts were SHORTER and MORE CASUAL. They explicitly avoided professional language and emphasized the "amateur cellphone" aesthetic.**

The refactoring made prompts:
- Longer (more words = more complexity = more AI-looking)
- More professional-sounding (technical specs, formal language)
- Less focused on natural imperfections

---

## Recommendations to Restore Authentic iPhone Quality

### 1. **Reduce Prompt Length Further**
   - **Target: 30-45 words** (closer to original 28-40)
   - Shorter = better facial consistency + more authentic
   - Current 40-60 is still too long

### 2. **Add "Amateur Cellphone" Language Back**
   - Add alternative: "amateur cellphone photo" or "looks like real phone camera photo"
   - Emphasize: "looks like someone's aesthetic friend took it"
   - Avoid: professional/studio language

### 3. **Strengthen Natural Imperfections**
   - Add back: "visible sensor noise" (especially for low-light)
   - Emphasize: "slight motion blur" (handheld feel)
   - Include: "natural skin texture, pores visible" (already added ✅)
   - Add: "uneven lighting", "mixed color temperatures"

### 4. **Simplify Technical Specs**
   - Current: "shot on iPhone 15 Pro, portrait mode, f/2.8, shallow depth of field..."
   - Better: "shot on iPhone 15 Pro, natural bokeh, slight motion blur"
   - Less technical = more authentic

### 5. **Add "Casual Moment" Language**
   - Include phrases like:
     - "candid moment"
     - "caught mid-action"
     - "natural, unposed"
     - "looks like a real Instagram photo"

### 6. **Lighting: Emphasize Imperfection**
   - Current approach is good but could be stronger
   - Add: "uneven ambient light", "mixed color temperatures"
   - Avoid: anything that sounds "perfect" or "studio"

### 7. **Poses: Keep It Simple**
   - Current guidance is good (simple, natural)
   - Continue avoiding: "hand on hip", "model pose", "confident stance"
   - Emphasize: "weight on one leg", "looking away naturally", "casual"

---

## Specific Code Changes Needed

### File: `lib/maya/flux-prompting-principles.ts`

1. **Reduce word targets:**
   ```diff
   - **TOTAL TARGET:** 40-60 words
   + **TOTAL TARGET:** 30-45 words (shorter = more authentic iPhone aesthetic)
   ```

2. **Add amateur cellphone language:**
   ```diff
   **🔴 MANDATORY: iPhone 15 Pro (DEFAULT - Use this 95% of the time)**
   - **ALWAYS START WITH:** "shot on iPhone 15 Pro" (this creates authentic phone camera aesthetic)
   + **ALWAYS START WITH:** "shot on iPhone 15 Pro" OR "amateur cellphone photo" (this creates authentic phone camera aesthetic)
   + **GOAL:** The image should look like someone's incredibly aesthetic friend took it on their phone, NOT like a professional photoshoot
   ```

3. **Add natural imperfections:**
   ```diff
   **ALWAYS INCLUDE:**
   - Camera type: **"shot on iPhone 15 Pro, portrait mode"** (DEFAULT - use this!)
   + - **Natural imperfections (MANDATORY):** "visible sensor noise", "slight motion blur", "uneven lighting"
   - **Natural skin texture (MANDATORY):** "natural skin texture, pores visible, realistic imperfections"
   ```

4. **Simplify technical specs:**
   ```diff
   **EXAMPLES (iPhone-first approach):**
   - "Shot on iPhone 15 Pro, portrait mode, f/2.8, shallow depth of field, natural skin texture with pores visible, visible film grain, muted color palette, authentic iPhone photo aesthetic"
   + "Shot on iPhone 15 Pro, natural bokeh, slight motion blur, natural skin texture with pores visible, visible film grain, muted color palette, looks like a real phone camera photo"
   ```

5. **Add casual moment language:**
   ```diff
   + **CASUAL MOMENT LANGUAGE (RECOMMENDED):**
   + - "candid moment"
   + - "caught mid-action"
   + - "natural, unposed"
   + - "looks like a real Instagram photo"
   + - "amateur cellphone quality"
   ```

### File: `app/api/maya/generate-concepts/route.ts`

1. **Update word budget in generation prompt:**
   ```diff
   - Keep descriptions natural and Instagram-authentic. You intelligently adapt prompt length based on shot type for optimal facial accuracy and authentic iPhone quality:
   - - **Close-ups (face/shoulders):** 40-50 words
   - - **Half body (waist up):** 45-55 words
   - - **Full body shots:** 50-60 words
   + Keep descriptions natural and Instagram-authentic. You intelligently adapt prompt length based on shot type for optimal facial accuracy and authentic iPhone quality:
   + - **Close-ups (face/shoulders):** 25-35 words (shorter = more authentic)
   + - **Half body (waist up):** 30-40 words
   + - **Full body shots:** 35-45 words
   ```

2. **Add amateur cellphone language to post-processing:**
   ```diff
   // Ensure authentic iPhone language is present
   if (!/(authentic\s*iPhone|iPhone\s*photo|Instagram-native|phone\s*camera\s*photo)/i.test(prompt)) {
   -   prompt = `${prompt}, authentic iPhone photo aesthetic`
   +   prompt = `${prompt}, looks like a real phone camera photo`
   }
   ```

---

## Testing Recommendations

After implementing changes:

1. **Generate 10 test concepts** and check:
   - Average word count (should be 30-45, not 40-60)
   - All prompts start with "shot on iPhone 15 Pro" or "amateur cellphone photo"
   - All include natural imperfections (sensor noise, motion blur, uneven lighting)
   - All include "looks like a real phone camera photo" or similar

2. **Compare image quality:**
   - Should look like real iPhone photos
   - Natural skin texture visible
   - Film grain present
   - Muted, realistic colors
   - Slight imperfections (not overly smooth/plastic)
   - Casual, unposed feeling

3. **A/B test:**
   - Generate same concept with old (40-60 words) vs new (30-45 words) prompts
   - Compare authenticity and realism

---

## Summary

**The fix is to go BACK to the original approach:**
- Shorter prompts (30-45 words, not 40-60)
- Stronger "amateur cellphone" language
- More emphasis on natural imperfections
- Less technical/professional language
- More casual, "friend took it" aesthetic

The recent fixes were good, but they didn't go far enough. We need to restore the original shorter, more casual prompting style that created authentic iPhone-quality images.
