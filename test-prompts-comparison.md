# 🧪 A/B TEST - BRAND NAMES VS DESCRIPTIONS ONLY

**Date:** January 4, 2026  
**Purpose:** Compare Flux output quality with brand names vs descriptions-only prompts  
**Category:** Workout/Athletic  
**Status:** ⚠️ TEST ONLY - DO NOT USE IN PRODUCTION YET

---

## 📋 TEST SETUP

**Test Scenario:** Workout/Athletic category prompt  
**Model:** Flux (Classic Mode) - Custom trained LoRA  
**Trigger Word:** `[your_trigger_word]` (replace with actual trigger word from your trained model)  
**Category:** workout/athletic  
**Vibe:** athletic  
**Location:** gym  
**Format:** Classic Mode (Flux) - Trigger word first, 30-60 words optimal, natural language

**What We're Testing:**
- Does removing brand names improve Flux output quality?
- Does pure descriptive language perform better than brand names?
- Which version produces more accurate outfit representation?

---

## 🎯 TEST PROMPTS - WORKOUT CATEGORY

### CURRENT (With Brand Names)
**Status:** ✅ Currently in production  
**Outfit Style:** Brand names + descriptions  
**Format:** Classic Mode (Flux) - Trigger word first, 30-60 words

```
[your_trigger_word], woman, brown hair, in Alo Yoga Airlift bralette in black with high support, Alo Yoga Airbrush leggings in matching black with sculpting high waistband, Nike Air Force 1 Low sneakers in triple white leather, Lululemon Everywhere Belt Bag in grey, exercising in modern gym, uneven natural lighting with mixed color temperatures, candid moment, shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic iPhone photo aesthetic
```

**Word Count:** ~65 words (slightly over optimal 30-60, but acceptable)  
**Structure:** Trigger → Subject → Outfit (with brands) → Setting → Lighting → Camera → Texture → Aesthetic

**Key Characteristics:**
- ✅ Starts with trigger word (Classic Mode/Flux format)
- ✅ Includes brand names: "Alo Yoga", "Nike", "Lululemon"
- ✅ Includes descriptive details: "in black with high support", "sculpting high waistband"
- ✅ Format: Trigger → Subject → Outfit (Brand Name + Item Name + Color + Details) → Setting → Lighting → Camera → Texture
- ✅ Follows Flux principles: "shot on iPhone 15 Pro", "natural skin texture with pores visible", "film grain, muted colors", "uneven natural lighting", "candid moment"

---

### VERSION A (No Brand Names)
**Status:** 🧪 TEST VERSION  
**Outfit Style:** Item names + descriptions (brand names removed)  
**Format:** Classic Mode (Flux) - Trigger word first, 30-60 words

```
[your_trigger_word], woman, brown hair, in Airlift bralette in black with high support, Airbrush leggings in matching black with sculpting high waistband, Air Force 1 Low sneakers in triple white leather, Everywhere Belt Bag in grey, exercising in modern gym, uneven natural lighting with mixed color temperatures, candid moment, shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic iPhone photo aesthetic
```

**Word Count:** ~60 words (within optimal 30-60 range)  
**Structure:** Trigger → Subject → Outfit (no brands) → Setting → Lighting → Camera → Texture → Aesthetic

**Key Characteristics:**
- ✅ Starts with trigger word (Classic Mode/Flux format)
- ❌ Brand names removed: "Alo Yoga" → removed, "Nike" → removed, "Lululemon" → removed
- ✅ Item names kept: "Airlift bralette", "Airbrush leggings", "Air Force 1 Low sneakers"
- ✅ Descriptive details kept: "in black with high support", "sculpting high waistband"
- ✅ Format: Trigger → Subject → Outfit (Item Name + Color + Details, no brand) → Setting → Lighting → Camera → Texture
- ✅ Follows Flux principles: "shot on iPhone 15 Pro", "natural skin texture with pores visible", "film grain, muted colors", "uneven natural lighting", "candid moment"

---

### VERSION B (Pure Descriptions)
**Status:** 🧪 TEST VERSION  
**Outfit Style:** Pure descriptive language (no brand names, no item names)  
**Format:** Classic Mode (Flux) - Trigger word first, 30-60 words

```
[your_trigger_word], woman, brown hair, in black performance bralette with high support, black high-waisted athletic leggings with compression fit, white leather low-top athletic sneakers, grey crossbody belt bag, exercising in modern gym, uneven natural lighting with mixed color temperatures, candid moment, shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic iPhone photo aesthetic
```

**Word Count:** ~55 words (within optimal 30-60 range)  
**Structure:** Trigger → Subject → Outfit (pure descriptions) → Setting → Lighting → Camera → Texture → Aesthetic

**Key Characteristics:**
- ✅ Starts with trigger word (Classic Mode/Flux format)
- ❌ Brand names removed: No "Alo Yoga", "Nike", "Lululemon"
- ❌ Item names removed: No "Airlift", "Airbrush", "Air Force 1"
- ✅ Pure descriptions: "black performance bralette", "high-waisted athletic leggings", "low-top athletic sneakers"
- ✅ Format: Trigger → Subject → Outfit (Color + Type + Details, completely generic) → Setting → Lighting → Camera → Texture
- ✅ Follows Flux principles: "shot on iPhone 15 Pro", "natural skin texture with pores visible", "film grain, muted colors", "uneven natural lighting", "candid moment"

---

## 📊 COMPARISON TABLE

| Element | Current (Brand Names) | Version A (No Brands) | Version B (Pure Descriptions) |
|---------|----------------------|----------------------|------------------------------|
| **Format** | ✅ Classic Mode (Flux) | ✅ Classic Mode (Flux) | ✅ Classic Mode (Flux) |
| **Starts With** | ✅ Trigger word | ✅ Trigger word | ✅ Trigger word |
| **Word Count** | ~65 words | ~60 words | ~55 words |
| **Brand Names** | ✅ Alo Yoga, Nike, Lululemon | ❌ Removed | ❌ Removed |
| **Item Names** | ✅ Airlift, Airbrush, Air Force 1 | ✅ Kept | ❌ Removed |
| **Descriptive Details** | ✅ "in black with high support" | ✅ "in black with high support" | ✅ "black performance bralette with high support" |
| **Flux Requirements** | ✅ All present | ✅ All present | ✅ All present |
| **Specificity** | 🔴 High (brand + item + details) | 🟡 Medium (item + details) | 🟢 Low (generic descriptions) |
| **Flux Recognition** | ❓ Unknown (may recognize brands) | ❓ Unknown (may recognize items) | ❓ Unknown (pure descriptions) |

---

## 🧪 TESTING INSTRUCTIONS

### Step 1: Prepare Test Environment
1. Use the same base image/reference photo for all 3 tests
2. Use the same trigger word (replace `[your_trigger_word]` in all prompts)
3. Use the same Flux model version
4. Use the same generation settings (guidance scale, steps, etc.)

### Step 2: Generate Images
1. **Test Current Prompt:**
   - Copy "CURRENT (With Brand Names)" prompt
   - Replace `[your_trigger_word]` with actual trigger word
   - Generate 1 image
   - Save as: `test-current-brand-names.png`

2. **Test Version A:**
   - Copy "VERSION A (No Brand Names)" prompt
   - Replace `[your_trigger_word]` with actual trigger word
   - Generate 1 image
   - Save as: `test-version-a-no-brands.png`

3. **Test Version B:**
   - Copy "VERSION B (Pure Descriptions)" prompt
   - Replace `[your_trigger_word]` with actual trigger word
   - Generate 1 image
   - Save as: `test-version-b-pure-descriptions.png`

### Step 3: Compare Results

**Evaluate each image on:**

1. **Outfit Accuracy:**
   - Does the outfit match the description?
   - Are the colors correct? (black bralette, black leggings, white sneakers)
   - Are the details visible? (high support, sculpting waistband)

2. **Image Quality:**
   - Is the image hyper-realistic?
   - Are fabrics and textures rendered correctly?
   - Is the lighting natural?

3. **Consistency:**
   - Does the person look consistent across all 3 images?
   - Are facial features preserved?
   - Is body type consistent?

4. **Brand Recognition (if applicable):**
   - Does Current version show recognizable brand details?
   - Do Version A/B versions still capture the aesthetic without brand names?

### Step 4: Document Results

**Create a comparison document with:**

```
TEST RESULTS - [Date]

CURRENT (Brand Names):
- Outfit Accuracy: [1-10]
- Image Quality: [1-10]
- Consistency: [1-10]
- Notes: [observations]

VERSION A (No Brands):
- Outfit Accuracy: [1-10]
- Image Quality: [1-10]
- Consistency: [1-10]
- Notes: [observations]

VERSION B (Pure Descriptions):
- Outfit Accuracy: [1-10]
- Image Quality: [1-10]
- Consistency: [1-10]
- Notes: [observations]

WINNER: [Current / Version A / Version B]
REASON: [explanation]
```

---

## 🎯 EXPECTED OUTCOMES

### Hypothesis 1: Current (Brand Names) Wins
**If:** Flux recognizes brand names and produces better results  
**Then:** Keep current format (brand names + descriptions)  
**Action:** No changes needed

### Hypothesis 2: Version A (No Brands) Wins
**If:** Removing brand names improves quality without losing specificity  
**Then:** Extract item names from brand-library, remove brand names  
**Action:** Modify `getDetailedDescription()` to return item name only

### Hypothesis 3: Version B (Pure Descriptions) Wins
**If:** Pure descriptive language produces best results  
**Then:** Rewrite outfit descriptions to be completely generic  
**Action:** Create new description-only format in brand-library

---

## ⚠️ IMPORTANT NOTES

1. **DO NOT change production code** until test results are analyzed
2. **Test with multiple images** (at least 3-5 per version) for statistical significance
3. **Test with different categories** (casual, luxury, travel) to see if results vary
4. **Document everything** - screenshots, scores, observations
5. **Get user feedback** - ask real users which images look best

---

## 📝 ADDITIONAL TEST VARIATIONS

### Test 2: Casual Category
Use the same 3-version approach for casual category:
- Current: "Levi's 501 baggy straight-leg jeans in light vintage wash, Adidas Gazelle sneakers in burgundy suede"
- Version A: "501 baggy straight-leg jeans in light vintage wash, Gazelle sneakers in burgundy suede"
- Version B: "Light vintage wash baggy straight-leg jeans, burgundy suede low-top sneakers"

### Test 3: Luxury Category
Use the same 3-version approach for luxury category:
- Current: "The Row Oversized coat in beige, Bottega Veneta Jodie bag in butter-soft caramel leather"
- Version A: "Oversized coat in beige, Jodie bag in butter-soft caramel leather"
- Version B: "Beige oversized wool coat, caramel leather crossbody bag with intrecciato weave"

---

## ✅ NEXT STEPS AFTER TESTING

1. **Analyze Results:** Compare all 3 versions objectively
2. **Make Decision:** Choose winning version based on data
3. **Plan Implementation:** If change needed, update MASTER_CLEANUP_PLAN.md
4. **Implement Safely:** Use feature flags, test in staging first
5. **Monitor:** Track image quality metrics after deployment

---

**TEST FILE COMPLETE** ✅  
**Ready for A/B testing** 🧪  
**DO NOT deploy to production until test results are analyzed** ⚠️

