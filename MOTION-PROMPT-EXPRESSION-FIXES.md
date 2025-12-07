# Motion Prompt Expression Fixes - Implementation Summary

## Changes Implemented to Minimize Expressions and Avoid Smiling

### ✅ 1. Updated Motion Principles to Emphasize Minimal Expressions
**Before:** General micro-movements including facial expressions
**After:**
- **🔴 MINIMAL EXPRESSIONS:** Keep facial expressions neutral, subtle, or minimal
- **🔴 NO SMILING:** Never include smiling, laughing, or grinning - these make videos look fake
- Focus on body movements (hands, shoulders, head turns, weight shifts) - NOT facial expressions
- Avoid lips/mouth movements entirely

**Files Changed:**
- `app/api/maya/generate-motion-prompt/route.ts` - Subject Motion Principles section

---

### ✅ 2. Updated Image Analysis to De-Emphasize Expressions
**Before:** "Head & Gaze: Position? Direction? Expression?"
**After:**
- "Head & Gaze: Position? Direction? **Keep expression minimal/neutral - NO smiling or dramatic expressions**"
- "Energy Level: Express through body, NOT face"
- "Interaction Opportunities: Hands/body, NOT facial reactions"
- "Mood & Atmosphere: Express through body language, NOT facial expression"
- "Motion Constraints: Focus on body movements, NOT facial expressions"

**Files Changed:**
- `app/api/maya/generate-motion-prompt/route.ts` - Enhanced Image Analysis section

---

### ✅ 3. Added Expression Rules Section
**New Section Added:**
- **Facial expression:** Keep neutral, minimal, or completely omit
- **Eyes:** Subtle glances, gentle blinks, looking away naturally - NOT dramatic eye movements
- **Mouth/Lips:** NEVER mention - no smiling, no lip movements, no mouth expressions
- **Face:** Neutral, relaxed, contemplative - NOT expressive, NOT animated
- **Focus on body:** Hands, shoulders, head turns, weight shifts - NOT facial expressions

**Files Changed:**
- `app/api/maya/generate-motion-prompt/route.ts` - Added to all generation paths

---

### ✅ 4. Updated Avoid Section
**Before:** General avoidances
**After:**
- **🔴 CRITICAL:** SMILING, LAUGHING, GRINNING - These always look fake and AI-generated
- **Any facial expressions** - Keep face neutral, minimal, or omit entirely
- **Micro-expressions** - Too subtle to animate well, looks fake
- **Lip/mouth movements** - Never mention these
- **Dramatic eye movements** - Keep eyes subtle (gentle glances, blinks only)
- **Expressive faces** - Neutral is more authentic

**Files Changed:**
- `app/api/maya/generate-motion-prompt/route.ts` - Avoid section in all prompts

---

### ✅ 5. Updated Motion Types to Exclude Expressions
**Before:** "Physiological: breathing, micro-expressions, weight shifts, muscle relaxations"
**After:**
- "Physiological: breathing, subtle weight shifts, muscle relaxations - **AVOID micro-expressions (they look fake)**"
- "Sensory: subtle reactions to warmth, cold, texture, sound, visual interest - **NO facial reactions, just body/head movements**"

**Files Changed:**
- `app/api/maya/generate-motion-prompt/route.ts` - Motion Types section

---

### ✅ 6. Added Post-Processing to Remove Expression Words
**New Feature:**
- Automatically removes expression-related words from generated prompts:
  - "smiling", "smile", "laughing", "laugh", "grinning", "grin"
  - "micro-expression", "micro-expressions", "facial expression", "facial expressions"
  - "expressive", "animated face", "face lights up", "eyes light up"
  - "lip movements", "mouth movements", "lips part", "mouth opens"
- Applied to all generation paths (with image, without image, alternatives)

**Files Changed:**
- `app/api/maya/generate-motion-prompt/route.ts` - Post-processing function

---

### ✅ 7. Updated Body Parts List
**Before:** "eyes, head, fingers, hands, shoulders, lips, chest, hair, neck"
**After:**
- "eyes (subtle glances only), head, fingers, hands, shoulders, chest, hair, neck - **AVOID lips/mouth**"

**Files Changed:**
- `app/api/maya/generate-motion-prompt/route.ts` - Subject Motion Principles

---

### ✅ 8. Reduced Motion Intensity Emphasis
**Before:** "Vary motion intensity: subtle (10-20%), moderate (30-50%), or dynamic (60-80%)"
**After:**
- "Motion intensity: Keep it subtle (10-20%) or moderate (30-50%) - avoid dynamic (60-80%) which looks fake"

**Files Changed:**
- `app/api/maya/generate-motion-prompt/route.ts` - Subject Motion Principles

---

## Expected Results

After these changes, Maya's motion prompts should produce:

1. ✅ **Minimal facial expressions** (neutral, relaxed, contemplative)
2. ✅ **No smiling** (automatically removed if generated)
3. ✅ **Focus on body movements** (hands, shoulders, head turns, weight shifts)
4. ✅ **Subtle eye movements** (gentle glances, blinks only - not dramatic)
5. ✅ **No lip/mouth movements** (completely avoided)
6. ✅ **More authentic videos** (less AI-looking, more natural)

---

## Key Changes Summary

### What Was Removed:
- ❌ Smiling, laughing, grinning
- ❌ Micro-expressions
- ❌ Facial expressions
- ❌ Lip/mouth movements
- ❌ Dramatic eye movements
- ❌ Expressive faces

### What Was Emphasized:
- ✅ Neutral, minimal facial expressions
- ✅ Body movements (hands, shoulders, head, weight shifts)
- ✅ Subtle eye movements (glances, blinks)
- ✅ Natural, unforced motion
- ✅ Authentic, Instagram-native aesthetic

---

## Files Modified

1. `app/api/maya/generate-motion-prompt/route.ts` - All motion prompt generation paths

---

## Testing Recommendations

1. Generate 5-10 new videos
2. Check that motion prompts:
   - Don't contain "smiling", "smile", "laughing", etc.
   - Don't contain "facial expression", "micro-expression"
   - Focus on body movements (hands, shoulders, head, weight shifts)
   - Keep facial expressions minimal/neutral
3. Compare video quality:
   - Should look more natural and authentic
   - Less "AI-looking" facial animations
   - More focus on body language and subtle movements
   - Neutral expressions that feel real


