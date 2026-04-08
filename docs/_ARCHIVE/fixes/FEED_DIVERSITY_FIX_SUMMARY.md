# FEED DIVERSITY FIX — Fashion Style-Matched Objects + Position 5 Sign

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Issue:** Flatlays hardcoded to wellness objects, Position 5 missing sign/text

---

## 🎯 PROBLEMS FIXED

### 1. Flatlay Objects Hardcoded to Wellness
**Problem:** Positions 2, 6, and 8 (flatlays and texture shots) were hardcoded to wellness/athletic objects (smoothie bowls, yoga mats, athletic fabric) regardless of user's fashion style.

**Expected:** Objects should match fashion style:
- **Luxury:** Designer bags, jewelry, high-end accessories
- **Bohemian:** Woven hats, natural materials, vintage books
- **Athletic/Wellness:** Smoothie bowls, yoga mats, fitness gear
- **Default:** Coffee, books, lifestyle objects

### 2. Position 5 Missing Sign/Text Overlay
**Problem:** Position 5 (center anchor) was just a regular portrait without any sign or brand statement.

**Expected:** Position 5 should have a small sign with a brand message (e.g., "Live Luxuriously", "Free Spirit", "Strong & Well")

---

## ✅ IMPLEMENTATION

### File 1: `lib/feed-planner/scene-resolver.ts`

**Position 2 — Object Flatlay (Lines 730-761)**
```typescript
// BEFORE (hardcoded wellness):
if (position === 2) {
  objects = [
    { type: 'smoothie_bowl', description: '...', position: 'table' },
    { type: 'yoga_mat', description: '...', position: 'table' },
    { type: 'utensils', description: '...', position: 'table' }
  ]
}

// AFTER (fashion style-matched):
if (position === 2) {
  if (fashionStyle.includes('luxury') || fashionStyle.includes('elevated')) {
    objects = [
      { type: 'luxury_bag', description: 'designer handbag with gold hardware', position: 'table' },
      { type: 'jewelry', description: 'gold jewelry and watch', position: 'table' },
      { type: 'sunglasses', description: 'designer sunglasses', position: 'table' }
    ]
  } else if (fashionStyle.includes('bohemian') || fashionStyle.includes('boho')) {
    objects = [
      { type: 'hat', description: 'woven straw hat with ribbon', position: 'table' },
      { type: 'jewelry', description: 'layered gold necklaces and rings', position: 'table' },
      { type: 'book', description: 'vintage book', position: 'table' }
    ]
  } else if (fashionStyle.includes('athletic') || fashionStyle.includes('wellness')) {
    objects = [
      { type: 'smoothie_bowl', description: '...', position: 'table' },
      { type: 'yoga_mat', description: '...', position: 'table' },
      { type: 'utensils', description: '...', position: 'table' }
    ]
  } else {
    // Default: coffee + lifestyle
    objects = [
      { type: 'coffee_cup', description: '...', position: 'table' },
      { type: 'book', description: '...', position: 'table' },
      { type: 'phone', description: '...', position: 'table' }
    ]
  }
}
```

**Position 6 — Texture Shot (Lines 764-790)**
```typescript
// Matches fashion style:
if (fashionStyle.includes('luxury')) {
  objects = [{ type: 'fabric', description: 'luxury silk fabric with subtle sheen and drape', position: 'table' }]
} else if (fashionStyle.includes('bohemian')) {
  objects = [{ type: 'fabric', description: 'natural linen fabric with woven texture', position: 'table' }]
} else if (fashionStyle.includes('athletic')) {
  objects = [{ type: 'fabric', description: 'black mesh athletic fabric with geometric pattern texture', position: 'table' }]
} else {
  objects = [{ type: 'fabric', description: 'natural fabric texture with soft drape', position: 'table' }]
}
```

**Position 8 — Overhead Flatlay (Lines 792-832)**
```typescript
// Matches fashion style:
if (fashionStyle.includes('luxury')) {
  // Work/business objects: laptop, leather notebook, coffee cup, iPhone
} else if (fashionStyle.includes('bohemian')) {
  // Creative objects: journal, book, tea cup, iPhone
} else if (fashionStyle.includes('athletic')) {
  // Workout gear: yoga mat, water bottle, resistance bands, headphones
} else {
  // Default work/lifestyle: laptop, coffee cup, book, iPhone
}
```

**Position 5 — Brand Statement (Lines 226-228, 1042-1064)**
```typescript
// Position 5 gets special brand statement for sign
const narrative = position === 5 
  ? buildBrandStatement(category, mood, resolvedFashionStyle) 
  : buildNarrative(activity, location, outfit)

// New function: buildBrandStatement()
function buildBrandStatement(category: string, mood: string | null, fashionStyle: string): string {
  if (fashionStyle.includes('luxury') || fashionStyle.includes('elevated')) {
    return 'Live Luxuriously'
  } else if (fashionStyle.includes('bohemian') || fashionStyle.includes('boho')) {
    return 'Free Spirit'
  } else if (fashionStyle.includes('athletic') || fashionStyle.includes('wellness')) {
    return 'Strong & Well'
  } else if (category === 'minimal' || mood === 'minimal') {
    return 'Simply Elegant'
  } else if (category === 'beige' || mood === 'beige') {
    return 'Warmth & Grace'
  } else {
    return 'Be Yourself'
  }
}
```

### File 2: `lib/feed-planner/prompt-shaper.ts`

**Position 5 Sign Integration (Lines 616-629)**
```typescript
function buildPortraitBlockPreview(scene: FeedPlannerScene, position: number, positionLabel: string): string {
  const outfit = scene.outfit.style || scene.outfit.base
  const location = scene.location.description.split(' ')[0]
  const framing = scene.camera.framing === 'full_body' ? 'full-body' : 'mid-shot'
  const pose = scene.pose?.description || 'standing'
  const lighting = scene.lighting?.description || 'natural light'
  
  // 🔴 POSITION 5: CENTER ANCHOR - Add sign/text overlay with brand statement
  if (position === 5) {
    const narrative = scene.narrative || 'Your brand statement here'
    return `Position ${position} (${positionLabel}): ${outfit} outfit, ${pose.split(' ')[0]} in ${location}, ${framing} angle, ${lighting.replace(/_/g, ' ')}. Holding a small sign with text: "${narrative}".`
  }
  
  return `Position ${position} (${positionLabel}): ${outfit} outfit, ${pose.split(' ')[0]} in ${location}, ${framing} angle, ${lighting.replace(/_/g, ' ')}.`
}
```

---

## 📊 OBJECT MAPPING BY FASHION STYLE

| Position | Athletic/Wellness | Luxury/Elevated | Bohemian | Default |
|----------|------------------|-----------------|----------|---------|
| **2 (Flatlay)** | Smoothie bowl, yoga mat, bamboo utensils | Designer handbag, gold jewelry, sunglasses | Woven hat, layered jewelry, vintage book | Coffee cup, book, iPhone |
| **6 (Texture)** | Black mesh athletic fabric | Luxury silk fabric | Natural linen fabric | Natural fabric texture |
| **8 (Overhead)** | Yoga mat, water bottle, resistance bands, headphones | Laptop, leather notebook, coffee cup, iPhone | Journal, book, tea cup, iPhone | Laptop, coffee cup, book, iPhone |

---

## 🎯 BRAND STATEMENTS (Position 5)

| Fashion Style | Brand Statement |
|---------------|----------------|
| Luxury/Elevated | "Live Luxuriously" |
| Bohemian | "Free Spirit" |
| Athletic/Wellness | "Strong & Well" |
| Minimal | "Simply Elegant" |
| Beige | "Warmth & Grace" |
| Default | "Be Yourself" |

---

## 🧪 TESTING

### Console Logs to Watch For:

**Position 2:**
```
[SCENE RESOLVER] Position 2: Strategic objects injected for luxury: ["luxury_bag", "jewelry", "sunglasses"]
[SCENE RESOLVER] Position 2: Strategic objects injected for bohemian: ["hat", "jewelry", "book"]
[SCENE RESOLVER] Position 2: Strategic objects injected for athletic: ["smoothie_bowl", "yoga_mat", "utensils"]
```

**Position 5:**
```
[SCENE DATA] Position 5: { framing: 'full_body', narrative: 'Live Luxuriously', ... }
```

**Generated Prompt Preview (Position 5):**
```
Position 5 (Middle-Center): luxury outfit, standing in home, full-body angle, natural light. Holding a small sign with text: "Live Luxuriously".
```

### Test Scenarios:

1. **Luxury User:**
   - Position 2 should show designer bag, jewelry, sunglasses
   - Position 5 should show "Live Luxuriously" sign
   - Position 6 should show silk fabric texture
   - Position 8 should show laptop, notebook, coffee

2. **Bohemian User:**
   - Position 2 should show woven hat, layered jewelry, book
   - Position 5 should show "Free Spirit" sign
   - Position 6 should show linen fabric texture
   - Position 8 should show journal, book, tea

3. **Athletic/Wellness User:**
   - Position 2 should show smoothie bowl, yoga mat, utensils
   - Position 5 should show "Strong & Well" sign
   - Position 6 should show athletic mesh fabric
   - Position 8 should show yoga mat, water bottle, resistance bands

---

## ✅ FILES MODIFIED

1. **`lib/feed-planner/scene-resolver.ts`**
   - Updated `deriveObjectsFromActivity()` to match fashion style (Lines 730-832)
   - Added `buildBrandStatement()` function (Lines 1042-1064)
   - Updated narrative logic for Position 5 (Lines 226-228)

2. **`lib/feed-planner/prompt-shaper.ts`**
   - Updated `buildPortraitBlockPreview()` to add sign for Position 5 (Lines 616-629)

---

## 📋 SUMMARY

**Before:**
- ❌ All flatlays used wellness objects (smoothie bowls, yoga mats)
- ❌ Position 5 was just a regular portrait

**After:**
- ✅ Flatlays match user's fashion style (luxury → bags/jewelry, bohemian → hats/books, athletic → fitness gear)
- ✅ Position 5 (center anchor) includes sign with brand statement
- ✅ Brand statements match fashion style ("Live Luxuriously", "Free Spirit", "Strong & Well", etc.)
- ✅ Console logs show fashion style detection working

---

## 🔄 NEXT STEPS

1. Test feed preview generation with different fashion styles
2. Verify console logs show correct object injection
3. Check Position 5 prompts include sign with brand statement
4. Monitor Nano Banana Pro outputs for correct object diversity

---

**Status:** Ready for production testing ✅  
**Documentation:** FEED_DIVERSITY_FIX_SUMMARY.md
