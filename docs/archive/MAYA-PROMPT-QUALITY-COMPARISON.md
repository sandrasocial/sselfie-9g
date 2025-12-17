# Maya Prompt Quality Comparison: Commit 76ecdd9 vs Current

## 🔴 CRITICAL CHANGES THAT DEGRADED QUALITY

### 1. **Prompt Length Reduced (MAJOR ISSUE)**
- **Before (76ecdd9):** 50-80 words optimal
- **Current:** 30-45 words optimal
- **Impact:** Prompts are now TOO SHORT, missing critical details that made images high quality

### 2. **Temperature Lowered (REDUCES CREATIVITY)**
- **Before (76ecdd9):** `temperature: 0.85` (more creative, varied outputs)
- **Current:** `temperature: 0.75` (more conservative, less creative)
- **Impact:** Less creative and varied concept generation

### 3. **Over-Complicated Mandatory Requirements**
- **Before:** Simple, clear principles
- **Current:** 10+ mandatory requirements with complex rules
- **Impact:** Model gets overwhelmed, misses important elements

### 4. **Aggressive Post-Processing**
- **Before:** No post-processing
- **Current:** Removes words, trims prompts, removes "hair descriptions"
- **Impact:** Important details get stripped out, prompts become generic

### 5. **iPhone-First Approach (Too Restrictive)**
- **Before:** Flexible camera specs (iPhone OR focal length)
- **Current:** "iPhone 15 Pro MANDATORY 95% of prompts"
- **Impact:** Less variety, all images look the same

### 6. **Too Many Anti-Plastic Requirements**
- **Before:** Natural skin texture mentioned
- **Current:** "MUST include natural skin texture with pores visible AND AT LEAST 2 anti-plastic phrases"
- **Impact:** Prompts become cluttered with repetitive anti-plastic language

## 📊 SPECIFIC CODE CHANGES

### `lib/maya/flux-prompting-principles.ts`
- Changed optimal length from **50-80 words → 30-45 words**
- Added excessive mandatory requirements
- Changed from flexible camera specs to iPhone-only
- Added complex character feature guidance

### `app/api/maya/generate-concepts/route.ts`
- **Temperature:** 0.85 → 0.75 (less creative)
- Added 200+ lines of post-processing code
- Removes hair descriptions automatically
- Trims prompts if over 45 words
- Removes "banned words" aggressively

## ✅ WHAT WAS WORKING IN 76ecdd9

1. **Longer prompts (50-80 words)** = More detail, better quality
2. **Higher temperature (0.85)** = More creative, varied concepts
3. **Flexible camera specs** = More variety in image styles
4. **No aggressive post-processing** = Prompts kept their full detail
5. **Simpler requirements** = Model could focus on quality

## 🎯 RECOMMENDATION

**REVERT to commit 76ecdd9 approach:**
1. Restore 50-80 word optimal length
2. Restore temperature 0.85
3. Remove aggressive post-processing
4. Simplify mandatory requirements
5. Allow flexible camera specs (not just iPhone)

The current system is over-engineered and too restrictive, causing quality degradation.
