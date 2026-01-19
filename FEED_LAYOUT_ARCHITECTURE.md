# Feed Layout Architecture — Complete Scene Breakdown

**Date:** 2026-01-19  
**Version:** Current (Post Position 5 Fix)

---

## 📐 FEED LAYOUT: 3×3 GRID (9 POSITIONS)

```
┌─────────────┬─────────────┬─────────────┐
│  Position 1 │  Position 2 │  Position 3 │
│  Top-Left   │ Top-Center  │  Top-Right  │
│  PORTRAIT   │   FLATLAY   │  PORTRAIT   │
│  (Opener)   │  (Objects)  │  (Dynamic)  │
└─────────────┴─────────────┴─────────────┘
┌─────────────┬─────────────┬─────────────┐
│  Position 4 │  Position 5 │  Position 6 │
│ Middle-Left │Middle-Center│Middle-Right │
│ DETAIL SHOT │  SIGN/TEXT  │ TEXTURE     │
│ (Hands)     │  (Brand)    │ (Fabric)    │
└─────────────┴─────────────┴─────────────┘
┌─────────────┬─────────────┬─────────────┐
│  Position 7 │  Position 8 │  Position 9 │
│ Bottom-Left │Bottom-Center│Bottom-Right │
│  PORTRAIT   │   FLATLAY   │  PORTRAIT   │
│ (Activity)  │ (Overhead)  │  (Closer)   │
└─────────────┴─────────────┴─────────────┘
```

---

## 🎨 SCENE TYPES & CONTENT DISTRIBUTION

### Content Type Breakdown
- **4 Portraits** (Positions 1, 3, 7, 9) - Person is main focus
- **1 Sign/Text** (Position 5) - Brand statement, NO person
- **2 Object Flatlays** (Positions 2, 8) - Objects only, NO person
- **1 Detail Close-Up** (Position 4) - Hands/cropped person
- **1 Texture Shot** (Position 6) - Fabric/material close-up, NO person

**Diversity Strategy:** Mix of person + non-person content creates visual rhythm

---

## 📍 POSITION-BY-POSITION BREAKDOWN

### **Position 1: Portrait Opener (Top-Left)**
**Content Type:** Full-body portrait  
**Framing:** `full_body`  
**Purpose:** Strong hook, establishes brand presence  
**Person:** ✅ Visible (main focus)  
**Identity Anchor:** ✅ Yes

**Example Prompt:**
```
Position 1 (Top-Left): athletic outfit, standing in modern gym, 
full-body angle, natural window light with soft shadows.
```

**Scene Builder:** `buildPortraitBlockPreview()` (preview) or `buildPortraitBlock()` (single)

---

### **Position 2: Object Flatlay (Top-Center)**
**Content Type:** Object-only flatlay  
**Framing:** `flatlay`  
**Purpose:** Breathing room, lifestyle context  
**Person:** ❌ NOT visible (objects only)  
**Identity Anchor:** ✅ Yes (but mentions objects, not person)

**Fashion-Specific Objects:**
- **Athletic:** Smoothie bowl, yoga mat, water bottle
- **Luxury:** Designer handbag, jewelry, sunglasses
- **Bohemian:** Woven hat, layered necklaces, vintage journal
- **Default:** Coffee cup, book, small plant

**Example Prompt:**
```
Position 2 (Top-Center): Overhead flatlay of smoothie_bowl, yoga_mat, 
natural light, clean aesthetic.
```

**Scene Builder:** `buildObjectFlatlayBlockPreview()` (preview)

---

### **Position 3: Dynamic Portrait (Top-Right)**
**Content Type:** Full-body portrait  
**Framing:** `full_body`  
**Purpose:** Dynamic variety, different location/pose  
**Person:** ✅ Visible (main focus)  
**Identity Anchor:** ✅ Yes

**Example Prompt:**
```
Position 3 (Top-Right): athletic outfit, standing in wellness studio, 
full-body angle, natural window light with soft shadows.
```

**Scene Builder:** `buildPortraitBlockPreview()` (preview) or `buildPortraitBlock()` (single)

---

### **Position 4: Detail Close-Up (Middle-Left)**
**Content Type:** Hands/detail shot  
**Framing:** `close_up`  
**Purpose:** Intimacy, personal touch  
**Person:** ⚠️ Partially visible (hands/cropped)  
**Identity Anchor:** ✅ Yes (but cropped)

**Example Prompt:**
```
Position 4 (Middle-Left): Close-up of hands holding tea, athletic 
outfit visible, soft window light.
```

**Scene Builder:** `buildDetailCloseUpBlockPreview()` (preview)

---

### **Position 5: Sign/Text (Middle-Center) ⭐ CENTER ANCHOR**
**Content Type:** Street sign or wall sign close-up  
**Framing:** `close_up`  
**Purpose:** Brand statement, focal point  
**Person:** ❌ NOT visible (sign only)  
**Identity Anchor:** ❌ NO (this is NOT a portrait)

**Brand Statement by Style:**
- Athletic → "Strong & Well"
- Luxury → "Live Luxuriously"
- Bohemian → "Free Spirit"
- Minimal → "Simply Elegant"
- Beige/Warm → "Warmth & Grace"

**Example Prompt (Preview):**
```
Position 5 (Middle-Center): Close-up of a vintage street sign 
displaying "Strong & Well" in bold typography, urban background 
softly blurred, natural daylight, modern editorial lifestyle 
photography.
```

**Example Prompt (Single Scene):**
```
An eye-level shot of a wall-mounted sign displaying "Strong & Well" 
in bold, modern typography. The sign is positioned at eye level in 
urban street corner, creating an authentic lifestyle aesthetic. 
Natural daylight with soft shadows. The background is softly blurred 
with natural bokeh, keeping focus on the crisp lettering of the sign. 
Shot on iPhone 15 Pro with shallow depth of field.
```

**Scene Builder:** `buildSignTextBlockPreview()` (preview) or `buildSignTextBlock()` (single)

**🔴 SPECIAL HANDLING:**
- Highest priority routing (always position 5)
- NO identity anchor
- NO person reference
- Environmental/lifestyle context only

---

### **Position 6: Texture Shot (Middle-Right)**
**Content Type:** Fabric/material close-up  
**Framing:** `close_up`  
**Purpose:** Quality/craftsmanship focus  
**Person:** ❌ NOT visible (fabric only)  
**Identity Anchor:** ✅ Yes (but describes fabric)

**Example Prompt:**
```
Position 6 (Middle-Right): Macro close-up of athletic mesh texture, 
natural lighting.
```

**Scene Builder:** `buildTextureShotBlockPreview()` (preview)

---

### **Position 7: Activity Portrait (Bottom-Left)**
**Content Type:** Full-body portrait  
**Framing:** `full_body`  
**Purpose:** Lifestyle activity, dynamic  
**Person:** ✅ Visible (main focus)  
**Identity Anchor:** ✅ Yes

**Example Prompt:**
```
Position 7 (Bottom-Left): athletic outfit, sitting in yoga studio, 
full-body angle, natural window light with soft shadows.
```

**Scene Builder:** `buildPortraitBlockPreview()` (preview) or `buildPortraitBlock()` (single)

---

### **Position 8: Overhead Flatlay (Bottom-Center)**
**Content Type:** Overhead flatlay with arms  
**Framing:** `flatlay`  
**Purpose:** Different perspective, lifestyle props  
**Person:** ⚠️ Partially visible (arms only)  
**Identity Anchor:** ✅ Yes (mentions hands/arms)

**Fashion-Specific Objects:**
- **Athletic:** Yoga mat, water bottle, resistance bands
- **Luxury:** Luxury items, elegant accessories
- **Bohemian:** Journal, book, bohemian objects
- **Default:** Lifestyle items arranged overhead

**Example Prompt:**
```
Position 8 (Bottom-Center): Overhead flatlay of yoga_mat, water_bottle, 
natural light, clean aesthetic.
```

**Scene Builder:** `buildOverheadFlatlayBlockPreview()` (preview)

---

### **Position 9: Closing Portrait (Bottom-Right)**
**Content Type:** Full-body portrait  
**Framing:** `full_body`  
**Purpose:** Personal, accessible closer  
**Person:** ✅ Visible (main focus)  
**Identity Anchor:** ✅ Yes

**Example Prompt:**
```
Position 9 (Bottom-Right): athletic outfit, sitting in home, 
full-body angle, artificial warm light with soft shadows.
```

**Scene Builder:** `buildPortraitBlockPreview()` (preview) or `buildPortraitBlock()` (single)

---

## 🏗️ HOW SCENES ARE BUILT

### **Step 1: Scene Resolution** (`lib/feed-planner/scene-resolver.ts`)

Each position goes through a multi-step pipeline:

```typescript
1. Derive Activity (e.g., "gym_session", "coffee_shop", "morning_routine")
   ↓
2. Derive Location (e.g., "modern gym", "cozy cafe", "home")
   ↓
3. Derive Outfit (fashion style + category)
   ↓
4. Derive Lighting (based on location + mood)
   ↓
5. Derive Objects (strategic injection for positions 2, 4, 6, 8)
   ↓
6. Derive Camera Framing (STRATEGIC by position)
   ↓
7. Derive Pose (based on activity + position)
   ↓
8. Build Narrative (position 5 gets brand statement)
   ↓
9. Return FeedPlannerScene object
```

**Strategic Framing Assignment:**
```typescript
const strategicFraming: Record<number, FeedPlannerScene['camera']['framing']> = {
  1: 'full_body',    // Portrait opener
  2: 'flatlay',      // Object flatlay
  3: 'full_body',    // Portrait
  4: 'close_up',     // Detail close-up
  5: 'close_up',     // Sign/Text (NEW!)
  6: 'close_up',     // Texture shot
  7: 'full_body',    // Portrait
  8: 'flatlay',      // Overhead flatlay
  9: 'full_body',    // Portrait closer
}
```

---

### **Step 2: Prompt Building** (`lib/feed-planner/prompt-shaper.ts`)

#### **A. Preview Mode (9 scenes in 1 prompt)**

Function: `buildPreviewMultiPrompt()`

**Prompt Structure:**
```
[IDENTITY ANCHOR - 25 words]
"A professional 3x3 photo grid featuring the person from the reference images..."

[GRID LAYOUT - 10 words]
"The grid contains 9 distinct scenes arranged in 3 rows and 3 columns..."

[9 SCENE BLOCKS - 20-35 words each]
Position 1 (Top-Left): [scene description]
Position 2 (Top-Center): [scene description]
...
Position 9 (Bottom-Right): [scene description]

[TECHNICAL SPECS - 45 words]
"Professional DSLR, 35-85mm focal length, f/2.0-2.8 depth of field..."

[COLOR GRADE & COHESION - 25 words]
"Color-graded for cohesion... [aesthetic] across all frames..."
```

**Routing Logic:**
```typescript
function buildSceneExecutionBlock(scene, position) {
  // Position 5: ALWAYS sign/text (highest priority)
  if (position === 5) {
    return buildSignTextBlockPreview(scene, position, positionLabel)
  }
  
  // Object flatlay (position 2)
  if (isFlatlay && hasWellnessObjects) {
    return buildObjectFlatlayBlockPreview(...)
  }
  
  // Texture shot (position 6)
  if (isCloseUp && hasFabric) {
    return buildTextureShotBlockPreview(...)
  }
  
  // Detail close-up (position 4)
  if (isCloseUp && hasHandObjects) {
    return buildDetailCloseUpBlockPreview(...)
  }
  
  // Overhead flatlay (position 8)
  if (isFlatlay && hasGearObjects) {
    return buildOverheadFlatlayBlockPreview(...)
  }
  
  // Default: Portrait
  return buildPortraitBlockPreview(...)
}
```

---

#### **B. Single Scene Mode (1 scene per prompt)**

Function: `buildSingleScenePrompt()`

**Prompt Structure:**
```
[IDENTITY ANCHOR - 25-35 words]
"A portrait photograph of the person from the reference images..."

[OUTFIT DETAILS - 40-60 words]
"The person is wearing [detailed outfit description]..."

[SETTING & ENVIRONMENT - 30-50 words]
"The setting is [location with environmental details]..."

[COMPOSITION & MOOD - 40-60 words]
"The composition features [pose, mood, energy]..."

[TECHNICAL SPECIFICATIONS - 50-70 words]
"Professional DSLR... natural skin texture... color-graded..."

[CRITICAL REMINDER - 10-15 words]
"Maintain exact facial identity and body proportions from reference images."
```

**Position 5 Exception:**
```typescript
function buildSingleScenePrompt(scene) {
  // Position 5: Route to sign/text builder (NO identity anchor)
  if (scene.position === 5) {
    return buildSignTextBlock(scene, scene.position, getPositionLabel(scene.position))
  }
  
  // All other positions: Standard portrait/flatlay/detail structure
  const parts = []
  parts.push([IDENTITY ANCHOR])
  parts.push([OUTFIT DETAILS])
  parts.push([SETTING])
  parts.push([COMPOSITION])
  parts.push([TECHNICAL])
  parts.push([REMINDER])
  return parts.join(' ')
}
```

---

## 🎯 SCENE BUILDER FUNCTIONS

### Preview Mode (Concise - 20-35 words each)
- `buildObjectFlatlayBlockPreview()` — Position 2
- `buildDetailCloseUpBlockPreview()` — Position 4
- **`buildSignTextBlockPreview()` — Position 5** ⭐ NEW
- `buildTextureShotBlockPreview()` — Position 6
- `buildOverheadFlatlayBlockPreview()` — Position 8
- `buildPortraitBlockPreview()` — Positions 1, 3, 7, 9

### Single Scene Mode (Detailed - 150-250 words)
- **`buildSignTextBlock()` — Position 5** ⭐ NEW
- `buildSingleScenePrompt()` — All other positions

---

## 🔑 KEY PRINCIPLES

### 1. **Strategic Diversity**
- Mix of person + non-person content
- Visual rhythm: Portrait → Flatlay → Portrait → Detail → Sign → Texture...
- Prevents "9 identical portraits" problem

### 2. **Position-Based Intent**
- Each position has a specific strategic role
- Position 5 is the CENTER ANCHOR (brand statement)
- Positions 2, 8 are "breathing room" (flatlays)
- Positions 4, 6 add intimacy/quality details

### 3. **Fashion-Aware Objects**
- Objects match the selected fashion style
- Athletic gets smoothie bowls, yoga mats
- Luxury gets designer bags, jewelry
- Bohemian gets vintage items, journals

### 4. **Aesthetic Consistency**
- All 9 scenes use the same color grade
- Lighting style is cohesive
- Visual aesthetic flows across the grid

---

## 📊 DATA FLOW SUMMARY

```
User Input (Fashion Style, Aesthetic, Location Preferences)
  ↓
Scene Resolver (9 FeedPlannerScene objects created)
  ↓
Prompt Builder (1 preview prompt OR 9 single scene prompts)
  ↓
Routing Logic (Each position → specific scene builder)
  ↓
Final Prompt (Sent to Replicate/Nano Banana Pro)
  ↓
Generated Image(s)
```

---

## 🔍 POSITION 5 SPECIAL CASE

**Why is Position 5 different?**
- It's the CENTER of the 3×3 grid (most prominent position)
- Acts as the visual anchor and brand statement
- Should NOT compete with portraits (different content type)
- Sign/text adds variety and breaks up portrait monotony
- Creates an "editorial lifestyle" aesthetic

**What makes it unique in the code?**
- Only position without identity anchor (no person reference)
- Highest priority routing (checked first)
- Uses brand statement from `scene.narrative`
- Completely different prompt structure
- No outfit, pose, or facial details

---

**Status:** ✅ Complete Feed Layout Documentation  
**Related Files:**
- `lib/feed-planner/scene-resolver.ts` — Scene creation
- `lib/feed-planner/prompt-shaper.ts` — Prompt generation
