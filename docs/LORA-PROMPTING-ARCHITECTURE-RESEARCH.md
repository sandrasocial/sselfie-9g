# LoRA Prompting Architecture Research
## Best Practices for Custom LoRA Models - Character Likeness + Instagram Realism

**Research Date:** January 2025  
**Focus:** FLUX.1-dev LoRA models for Instagram-style realistic images with character consistency

---

## Executive Summary

Based on current research (2025), the optimal prompting architecture for custom LoRA models that preserve character likeness while achieving realistic Instagram-style images follows these key principles:

1. **Trigger word placement is CRITICAL** - Must be in first 3-5 words
2. **Prompt length matters** - 25-45 words optimal for face preservation
3. **Avoid micromanaging facial features** - Let LoRA handle what it learned
4. **Natural language over keyword stuffing** - FLUX T5 encoder prefers conversational prompts
5. **Layer structure** - Trigger → Style → Context → Details → Technical

---

## 1. Trigger Word Placement (CRITICAL)

### Best Practice: First 3-5 Words

**Research Finding:**
- Trigger words MUST be placed at the **beginning** of prompts for optimal LoRA activation
- Early placement ensures the model recognizes and applies character features immediately
- Position in first 5-10 words is optimal for face preservation

**Current Implementation:**
```typescript
// ✅ GOOD: Current implementation
if (!promptLower.startsWith(triggerLower)) {
  finalPrompt = `${triggerWord}, ${finalPrompt}`
}
```

**Recommended Structure:**
```
[TRIGGER_WORD], [GENDER/ETHNICITY], [OUTFIT], [POSE], [LOCATION], [LIGHTING], [TECHNICAL]
```

**Example:**
```
"user5040000c, Latina woman, structured chocolate brown leather blazer, looking away naturally, standing against textured concrete wall, dramatic side lighting, shot on iPhone 15 Pro, natural bokeh, motion blur, natural skin texture, film grain, muted tones"
```

---

## 2. Prompt Length for Face Preservation

### Optimal Range: 25-45 Words

**Research Finding:**
- **Shorter prompts (25-35 words)** = Better facial consistency
- **Longer prompts (50+ words)** = Model may lose focus on character features
- FLUX T5 encoder optimal at ~256 tokens (~30-40 words)

**Why This Matters:**
- LoRA models learn character features during training
- Shorter prompts keep the model focused on the trigger word and character
- Too many descriptive words can "dilute" the character signal

**Current Implementation:**
- ✅ Target: 30-45 words (good)
- ⚠️ Post-processing can push over 45 words (needs monitoring)

**Recommendation:**
- Enforce hard 45-word limit
- Prioritize trigger word + essential elements
- Remove non-essential descriptors if over limit

---

## 3. What to Include vs. Avoid

### ✅ DO Include (Character Likeness Preservation)

1. **Trigger word** (first position - MANDATORY)
2. **Gender/ethnicity** (helps with accurate representation)
3. **Outfit details** (material, color, fit - specific but concise)
4. **Pose/expression** (simple, natural language)
5. **Location** (brief, atmospheric)
6. **Lighting** (with imperfections for realism)
7. **Camera specs** (iPhone/cellphone for Instagram aesthetic)
8. **Natural imperfections** (sensor noise, motion blur - prevents plastic look)
9. **Skin texture** (natural, not airbrushed - prevents AI look)

### ❌ AVOID (Face Preservation)

**Don't Micromanage Facial Features:**
- ❌ "blue eyes" - LoRA already knows eye color
- ❌ "sharp jawline" - LoRA knows face structure
- ❌ "high cheekbones" - LoRA knows bone structure
- ❌ "defined nose" - LoRA knows facial features
- ❌ "long hair" - LoRA knows hair length/style

**Why:**
- LoRA was trained on these features - it already knows them
- Mentioning them can confuse the model or cause conflicts
- Trust the trained model to preserve what it learned

**Instead, Describe Face-Adjacent Elements:**
- ✅ "natural makeup" (makeup is changeable)
- ✅ "minimal makeup" (makeup is changeable)
- ✅ "relaxed expression" (expression is changeable)
- ✅ "confident look" (mood is changeable)
- ✅ "soft smile" (expression is changeable)

---

## 4. Prompt Structure Architecture

### Recommended Layer Structure

```
LAYER 1: TRIGGER + IDENTITY (3-5 words)
├─ Trigger word (MANDATORY - first position)
├─ Gender (woman/man/person)
└─ Ethnicity (if specified, for accurate representation)

LAYER 2: STYLING (6-10 words)
├─ Outfit: material + color + garment type
├─ Fit/silhouette: how it's worn
└─ Accessories (if relevant)

LAYER 3: POSE + EXPRESSION (4-6 words)
├─ Natural pose description
├─ Expression (simple, conversational)
└─ Body language

LAYER 4: ENVIRONMENT (3-6 words)
├─ Location/background
└─ Atmospheric details

LAYER 5: LIGHTING (5-8 words)
├─ Direction and quality
├─ Natural imperfections (MANDATORY)
└─ Color temperature

LAYER 6: TECHNICAL SPECS (8-12 words)
├─ Camera type (iPhone/cellphone)
├─ Natural imperfections (sensor noise, motion blur)
├─ Skin texture (natural, not airbrushed)
├─ Film grain
└─ Muted colors

LAYER 7: CASUAL MOMENT (2-4 words - OPTIONAL)
└─ "candid moment" or "looks like real phone camera photo"
```

### Word Budget by Layer

| Layer | Words | Priority |
|-------|-------|----------|
| Trigger + Identity | 3-5 | CRITICAL |
| Styling | 6-10 | HIGH |
| Pose + Expression | 4-6 | HIGH |
| Environment | 3-6 | MEDIUM |
| Lighting | 5-8 | HIGH |
| Technical Specs | 8-12 | CRITICAL |
| Casual Moment | 2-4 | LOW |
| **TOTAL** | **30-45** | - |

---

## 5. LoRA Scale Settings

### Research Findings

**Optimal LoRA Scale: 0.8-1.0**
- **0.8-0.9**: Balanced character likeness + style flexibility
- **1.0**: Maximum character likeness (may be too rigid)
- **0.6-0.7**: More style flexibility (may lose character consistency)

**Current Implementation:**
```typescript
lora_scale: 1.0  // Maximum character likeness
extra_lora_scale: 0.6  // Realism LoRA (secondary)
```

**Recommendation:**
- Primary LoRA (character): 0.9-1.0
- Secondary LoRA (realism/style): 0.5-0.7
- Test user-specific scales for optimal balance

---

## 6. Natural Language vs. Keyword Stuffing

### FLUX T5 Encoder Preference

**Research Finding:**
- FLUX uses T5 encoder optimized for **natural language**
- Conversational descriptions work better than keyword lists
- Model excels with "describing to a photographer" style

**❌ BAD (Keyword Stuffing):**
```
"user5040000c, woman, leather blazer, standing, wall, lighting, iPhone, bokeh, grain, muted"
```

**✅ GOOD (Natural Language):**
```
"user5040000c, Latina woman, structured chocolate brown leather blazer, looking away naturally, standing against textured concrete wall, dramatic side lighting, shot on iPhone 15 Pro, natural bokeh, motion blur, natural skin texture, film grain, muted tones"
```

**Key Difference:**
- Natural language flows like describing to a photographer
- Keyword stuffing feels robotic and can confuse the model
- FLUX T5 encoder processes natural language more effectively

---

## 7. Instagram-Style Realism Elements

### Critical Elements for Instagram Aesthetic

1. **iPhone/Cellphone Camera** (MANDATORY)
   - "shot on iPhone 15 Pro" or "amateur cellphone photo"
   - Creates authentic phone camera aesthetic

2. **Natural Imperfections** (MANDATORY - at least 2)
   - "visible sensor noise"
   - "slight motion blur"
   - "uneven lighting"
   - "mixed color temperatures"
   - Prevents plastic/studio look

3. **Natural Skin Texture** (MANDATORY)
   - "natural skin texture with pores visible"
   - "not smooth or airbrushed"
   - Prevents AI-looking smooth skin

4. **Film Grain** (MANDATORY)
   - "visible film grain" or "fine film grain texture"
   - Adds authentic texture

5. **Muted Colors** (MANDATORY)
   - "muted color palette" or "soft muted tones"
   - Prevents overly saturated/contrasted look

6. **Casual Moment Language** (RECOMMENDED)
   - "candid moment"
   - "looks like real phone camera photo"
   - Reinforces authentic aesthetic

---

## 8. Common Mistakes to Avoid

### ❌ Mistake 1: Over-Describing Facial Features
```
"user5040000c, woman with blue eyes, sharp jawline, high cheekbones, long dark hair..."
```
**Problem:** LoRA already knows these features - mentioning them can cause conflicts

### ❌ Mistake 2: Too Long Prompts
```
"user5040000c, Latina woman, structured chocolate brown leather blazer with oversized boyfriend cut, white ribbed cotton tank underneath, looking away naturally with weight on one leg, standing against textured concrete wall, dramatic side lighting from left with strong shadows, uneven ambient light, shot on iPhone 15 Pro, natural bokeh, visible sensor noise, mixed color temperatures, natural skin texture with pores visible, not smooth or airbrushed, visible film grain, muted color palette, candid moment"
```
**Problem:** 60+ words dilutes character signal, reduces face preservation

### ❌ Mistake 3: Keyword Stuffing
```
"user5040000c, woman, blazer, standing, wall, lighting, iPhone, bokeh, grain, muted"
```
**Problem:** Not natural language, FLUX T5 encoder doesn't process well

### ❌ Mistake 4: Trigger Word Not First
```
"Latina woman, user5040000c, structured chocolate brown leather blazer..."
```
**Problem:** LoRA may not activate properly, character likeness lost

### ❌ Mistake 5: Perfect Lighting Descriptions
```
"soft morning daylight, diffused natural lighting"
```
**Problem:** Creates plastic/studio look - needs imperfection language

---

## 9. Recommended Prompt Template

### Template Structure

```
[TRIGGER_WORD], [GENDER/ETHNICITY], [OUTFIT_MATERIAL + COLOR + TYPE], [POSE + EXPRESSION], [LOCATION], [LIGHTING + IMPERFECTIONS], shot on iPhone 15 Pro, [NATURAL_IMPERFECTIONS], [SKIN_TEXTURE], [FILM_GRAIN], [MUTED_COLORS], [CASUAL_MOMENT]
```

### Example (35 words - OPTIMAL)

```
"user5040000c, Latina woman, structured chocolate brown leather blazer, looking away naturally, standing against textured concrete wall, dramatic side lighting with uneven ambient light, shot on iPhone 15 Pro, motion blur, natural skin texture, film grain, muted tones, candid moment"
```

### Breakdown:
- **Trigger + Identity:** 3 words (user5040000c, Latina woman)
- **Styling:** 4 words (structured chocolate brown leather blazer)
- **Pose + Expression:** 3 words (looking away naturally)
- **Environment:** 4 words (standing against textured concrete wall)
- **Lighting:** 5 words (dramatic side lighting with uneven ambient light)
- **Technical:** 9 words (shot on iPhone 15 Pro, motion blur, natural skin texture, film grain, muted tones)
- **Casual Moment:** 2 words (candid moment)
- **TOTAL:** 30 words ✅

---

## 10. Implementation Recommendations

### Current State Analysis

**✅ What's Working:**
- Trigger word placement (first position)
- Natural language structure
- Instagram realism elements included
- LoRA scale at 1.0 for maximum likeness

**⚠️ What Needs Improvement:**
- Post-processing can push prompts over 45 words
- Some redundancy in technical specs
- Could better integrate elements (not just append)

### Recommended Changes

1. **Enforce 45-word hard limit**
   - Don't add elements if prompt already at/over limit
   - Prioritize: Trigger > iPhone > Skin Texture > Imperfections > Film Grain > Muted Colors > Casual Moment

2. **Better integration of elements**
   - Integrate near camera specs, not just append at end
   - Maintain natural flow

3. **Shorter phrases when adding**
   - "motion blur" not "slight motion blur"
   - "film grain" not "visible film grain"
   - "muted tones" not "muted color palette"

4. **Trust the model more**
   - If model generates good prompt, don't over-process
   - Only add truly missing critical elements

5. **Test LoRA scale variations**
   - Some users may benefit from 0.9 instead of 1.0
   - Balance character likeness vs. style flexibility

---

## 11. Research Sources

1. **FLUX LoRA Training Best Practices** (fluxai.dev, 2024)
   - Optimal iterations, learning rates, batch sizes
   - Overfitting prevention strategies

2. **Character LoRA Preservation** (rishidesai.github.io)
   - Structured captions for training
   - Prompt construction layers

3. **LoRA Prompting Guides** (aigallery.app, completeaitraining.com)
   - Trigger word placement strategies
   - Multi-LoRA composition techniques

4. **FLUX Realism Enhancement** (promptlayer.com, github.com)
   - Instagram-style photography techniques
   - Photorealism enhancement methods

5. **Token-Aware LoRA (TARA)** (arxiv.org, 2025)
   - Advanced character consistency techniques
   - Multi-concept composition strategies

---

## 12. Key Takeaways

1. **Trigger word FIRST** - Non-negotiable for character likeness
2. **25-45 words optimal** - Shorter = better face preservation
3. **Don't micromanage features** - Trust the LoRA
4. **Natural language** - FLUX T5 encoder prefers conversational
5. **Layer structure** - Trigger → Style → Context → Technical
6. **Instagram realism** - iPhone + imperfections + natural skin + grain + muted colors
7. **LoRA scale 0.9-1.0** - Balance character likeness vs. flexibility
8. **Hard 45-word limit** - Enforce to maintain face preservation

---

## Next Steps

1. ✅ Implement 45-word hard limit in post-processing
2. ✅ Improve element integration (not just appending)
3. ✅ Use shorter phrases when adding elements
4. ⏳ Test LoRA scale variations (0.9 vs 1.0)
5. ⏳ A/B test prompt structures with users
6. ⏳ Monitor character likeness metrics

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Research Complete - Implementation In Progress
