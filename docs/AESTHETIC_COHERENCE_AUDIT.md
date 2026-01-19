# Aesthetic Coherence System Audit

**Date:** 2026-01-18  
**Objective:** Diagnose why selected combinations like "dark & moody feed + warm vibe + athletic outfit style" produce incoherent, conflicting aesthetics  
**Status:** 🔴 CRITICAL SYSTEM DESIGN FLAW IDENTIFIED

---

## Executive Summary

**ROOT CAUSE CLASSIFICATION:**
- ❌ **C) The system LACKS a coherence layer** (PRIMARY)
- ❌ **D) Style signals are being MIXED without hierarchy** (SECONDARY)

**VERDICT:** This is a **SYSTEM DESIGN PROBLEM**, not a file-tuning problem.

The current architecture additively concatenates style descriptors from FOUR independent sources without ANY coherence validation, conflict resolution, or aesthetic compatibility checking. This creates prompts where contradictory aesthetics (e.g., "dark moody" + "warm airy" + "athletic") are simply stitched together, resulting in incoherent visual outputs.

---

## 1. STYLE SIGNAL SOURCES (Traced End-to-End)

### Input Layer: 4 Independent Style Sources

| Source | Location | Purpose | Actual Effect | Priority |
|--------|----------|---------|---------------|----------|
| **1. feed_style (mood)** | `feed_layouts.feed_style` or `user_personal_brand.settings_preference` | Overall feed mood | Controls lighting descriptors in Blueprint templates ("dark_moody", "light_minimalistic", "beige_aesthetic") | Priority 2 |
| **2. visual_aesthetic (category)** | `feed_layouts.visual_aesthetic` or `user_personal_brand.visual_aesthetic` | Visual category | Controls aesthetic base in Blueprint templates ("luxury", "minimal", "beige", "warm", "edgy", "professional") | Priority 1 |
| **3. fashion_style** | `feed_layouts.fashion_style` or `user_personal_brand.fashion_style` | Outfit style preferences | Mapped to outfit descriptors but NOT validated against category/mood | No hierarchy |
| **4. frame.vibe** | Blueprint templates (`blueprint-photoshoot-templates.ts`) | Scene-specific atmosphere | Hardcoded in template, added to prompt regardless of other signals | No hierarchy |

### Tracing Files:

1. **`lib/feed-planner/generation-helpers.ts`**
   - **`getCategoryAndMood()`**: Resolves category + mood from feed_layouts or personal_brand
   - **`getFashionStyleForPosition()`**: Resolves fashion style independently
   - **NO COHERENCE CHECK**: These functions resolve values independently with zero cross-validation

2. **`lib/maya/blueprint-photoshoot-templates.ts`**
   - **Purpose:** Defines 18 distinct templates (6 categories × 3 moods)
   - **Structure:** Each template has baked-in aesthetic descriptors
   - **Example:** `luxury_dark_moody` → "dark luxury editorial with all black outfits and urban sophistication"
   - **Problem:** Templates are RIGID and assume outfit style will match the template aesthetic

3. **`lib/feed-planner/nano-banana-adapter.ts`**
   - **`buildNaturalLanguageDescription()`**: Stitches together:
     - Frame description (from template)
     - Setting (from template)
     - Category aesthetic wording (lines 156-168)
     - Mood lighting wording (lines 174-185)
     - Template vibe (lines 188-196)
     - Color grading (from template)
   - **Problem:** Additive concatenation with NO conflict detection

4. **`lib/feed-planner/fashion-style-mapper.ts`**
   - **`mapFashionStyleToVibeLibrary()`**: Maps user fashion style to outfit descriptor
   - **Mappings:** casual, business, bohemian, classic, trendy, athletic
   - **Problem:** Mapping is CONTEXT-BLIND — "athletic" is always "athletic" regardless of whether feed is "dark luxury" or "bright minimal"

---

## 2. MIXING BEHAVIOR ANALYSIS

### How Signals Are Combined (Current State)

**ADDITIVE CONCATENATION WITHOUT HIERARCHY:**

```
FINAL PROMPT = 
  Template Scene Description (baked aesthetic) +
  Category Aesthetic Wording (line 164 in adapter) +
  Mood Lighting Wording (line 179 in adapter) +
  Template Vibe (line 191 in adapter) +
  Color Grading (from template) +
  Fashion Style Outfit (resolved separately)
```

**Example of Incoherent Mixing:**

**User Selections:**
- feed_style = "luxury" (dark_moody)
- visual_aesthetic = ["edgy"]
- fashion_style = ["athletic"]

**What Gets Generated:**

```
Frame description: "subject wearing {{OUTFIT_FULLBODY_1}}"
  → Outfit injected: "Alo Yoga Airbrush leggings, oversized hoodie, athletic sneakers"
  
Category aesthetic (edgy): "edgy modern aesthetic with bold contemporary style"

Mood lighting (luxury=dark_moody): "dramatic moody lighting with rich depth"

Template vibe: "dark luxury editorial with all black outfits and urban sophistication"

Color grade: "deep blacks, cool grays, concrete tones"
```

**RESULT:** A prompt that says:
- "athletic leggings and oversized hoodie" ← casual gym wear
- "edgy modern aesthetic" ← bold contemporary
- "dramatic moody lighting" ← dark evening
- "luxury editorial" ← high-end sophistication
- "urban sophistication" ← polished city style

**CONFLICT:** Athletic gym wear does NOT belong in "luxury editorial with urban sophistication and dramatic moody lighting." These aesthetics are INCOMPATIBLE.

### Detected Conflicts (Evidence-Based)

| Conflict Type | Example | File Evidence | Impact |
|---------------|---------|---------------|---------|
| **Fashion vs. Category** | "athletic" outfit in "luxury" category | `fashion-style-mapper.ts` line 53 + `blueprint-photoshoot-templates.ts` line 28 | Athletic wear in luxury editorial context = incoherent |
| **Fashion vs. Mood** | "bohemian" outfit in "dark_moody" lighting | `fashion-style-mapper.ts` + `nano-banana-adapter.ts` line 176 | Bohemian (airy, natural) + dark moody = contradictory |
| **Category vs. Mood** | "minimal" category + "beige_aesthetic" mood | Templates hardcode incompatible color palettes | Minimal (pure white/black) + beige (warm neutrals) = color confusion |
| **Frame Vibe vs. Mood** | Template vibe "warm and confident" added to "dark_moody" lighting | `nano-banana-adapter.ts` lines 188-196 | Warm vibe + dark lighting = contradictory atmosphere |

---

## 3. STYLE NORMALIZATION (OR LACK OF IT)

### Current State: NO NORMALIZATION LAYER

**Question:** Does "athletic" adapt differently under "dark luxury" vs "light lifestyle"?

**Answer:** **NO.** "athletic" is treated identically regardless of context.

**Evidence:**

1. **`lib/feed-planner/fashion-style-mapper.ts`** (lines 35-53)
   ```typescript
   const styleMap: Record<string, string> = {
     'casual': 'casual',
     'athletic': 'athletic',  // ← Always maps to 'athletic' - NO context awareness
     'bohemian': 'bohemian',
     // ...
   }
   ```

2. **`lib/feed-planner/generation-helpers.ts`** (`getFashionStyleForPosition()`, lines 417-450)
   - Retrieves fashion style
   - Maps it via `mapFashionStyleToVibeLibrary()`
   - Returns the mapped value
   - **NO CHECKS** against category, mood, or template aesthetic

3. **Blueprint Templates** (`lib/maya/blueprint-photoshoot-templates.ts`)
   - Templates have placeholders like `{{OUTFIT_FULLBODY_1}}`
   - These are filled with outfit descriptors
   - **NO VALIDATION** that the outfit descriptor matches the template aesthetic

**Example of What's Missing:**

```typescript
// CURRENT (NO COHERENCE):
fashionStyle = "athletic"
template = "luxury_dark_moody"
result = "athletic leggings in dark luxury editorial" ← INCOHERENT

// WHAT SHOULD HAPPEN (WITH COHERENCE):
fashionStyle = "athletic"
template = "luxury_dark_moody"
coherentFashion = resolveCoherentFashion("athletic", "luxury", "dark_moody")
// → "elevated athleisure" or "luxury sportswear" or warning to user
result = "luxury athletic wear in dark editorial" ← COHERENT
```

---

## 4. ROOT CAUSE CLASSIFICATION

### Primary Issues:

| Issue | Type | File(s) | Severity |
|-------|------|---------|----------|
| **No Coherence Resolver** | ❌ MISSING SYSTEM COMPONENT | None (doesn't exist) | 🔴 CRITICAL |
| **Additive Style Mixing** | ❌ LEGACY ADDITIVE DESIGN | `nano-banana-adapter.ts` lines 130-240 | 🔴 CRITICAL |
| **Context-Blind Fashion Mapping** | ❌ MISSING MAPPING RULES | `fashion-style-mapper.ts` | 🔥 HIGH |
| **Template Rigidity** | ❌ BAD FILE CONTENT | `blueprint-photoshoot-templates.ts` | ⚠️ MEDIUM |
| **No Style Signal Hierarchy** | ❌ STYLE SIGNAL COLLISION | `generation-helpers.ts` + `nano-banana-adapter.ts` | 🔥 HIGH |

### Classification by Root Cause:

1. **❌ NO COHERENCE HIERARCHY** (CRITICAL)
   - No system validates that fashion_style is compatible with category + mood
   - No system resolves conflicts when signals contradict
   - No precedence rules (e.g., "category > fashion_style" or "mood > vibe")

2. **❌ STYLE SIGNAL COLLISION** (HIGH)
   - 4 independent style sources with no coordination
   - Additive concatenation assumes all signals are compatible
   - No gating: user can select ANY combination even if nonsensical

3. **❌ MISSING MAPPING RULES** (HIGH)
   - Fashion styles are not adapted to category context
   - "Athletic" should mean different things in "luxury" vs "minimal" vs "warm"
   - No outfit-to-aesthetic compatibility matrix

4. **❌ LEGACY ADDITIVE DESIGN** (MEDIUM)
   - System was designed to ADD descriptors, not RESOLVE conflicts
   - Each layer assumes others will "just work"
   - No defensive programming against incompatible combinations

5. **❌ BAD FILE CONTENT** (LOW)
   - Blueprint templates are well-written but RIGID
   - They assume outfits will match the baked-in aesthetic
   - Templates need to be MORE FLEXIBLE or outfit injection needs to be COHERENCE-AWARE

---

## 5. ANSWER THE CORE QUESTION

### Do we need to tune files one by one?

**NO.**

### Do we need a higher-level coherence system?

**YES.**

---

## 6. RECOMMENDATION

### Recommended Solution: Add Coherence Resolver Layer

**Approach:** Introduce a **Style Coherence Resolver** that sits BETWEEN user selections and prompt construction.

### Coherence Resolver Responsibilities:

1. **Validate Compatibility**
   - Check if fashion_style is compatible with category + mood
   - Flag incompatible combinations (e.g., "athletic" + "luxury dark_moody")

2. **Resolve Conflicts**
   - When conflicts exist, apply precedence rules:
     - **Priority 1:** Category (visual_aesthetic)
     - **Priority 2:** Mood (feed_style)
     - **Priority 3:** Fashion style (adapted to fit category/mood)
     - **Priority 4:** Template vibe (only if compatible)

3. **Adapt Fashion Styles**
   - Transform fashion styles to fit the aesthetic context:
     - "athletic" + "luxury" → "elevated athleisure" (luxury fabrics, tailored fit)
     - "athletic" + "minimal" → "minimal sportswear" (clean lines, monochrome)
     - "athletic" + "warm" → "cozy activewear" (warm tones, relaxed fit)
     - "bohemian" + "dark_moody" → "dark bohemian" (black lace, deep burgundy)

4. **Gate Nonsensical Combinations**
   - Warn users if selections are incompatible
   - Suggest alternative combinations
   - Or auto-resolve to nearest coherent combination

### Minimal Conceptual Diagram:

```
USER SELECTIONS
├─ feed_style (mood): "luxury" (dark_moody)
├─ visual_aesthetic (category): ["edgy"]
└─ fashion_style: ["athletic"]
         ↓
    [NEW LAYER]
 COHERENCE RESOLVER
├─ Validate: "athletic" + "edgy" + "dark_moody" = INCOMPATIBLE
├─ Adapt Fashion: "athletic" → "elevated athletic" (black leather, structured)
├─ Resolve Hierarchy: Category "edgy" > Mood "dark" > Fashion "elevated athletic"
└─ Output: Coherent style parameters
         ↓
PROMPT CONSTRUCTION
├─ Template: edgy_dark_moody
├─ Category Aesthetic: "edgy modern aesthetic"
├─ Mood Lighting: "dramatic moody lighting"
├─ Outfit: "black leather jacket, structured athletic pants" ← ADAPTED
└─ Vibe: "bold contemporary with dark sophistication" ← UNIFIED
         ↓
   FINAL PROMPT
"Subject in black structured leather jacket and tailored athletic pants,
edgy modern aesthetic with bold contemporary style, dramatic moody lighting
with rich depth, shot on iPhone, natural shadows"
         ↓
  ✅ COHERENT OUTPUT
```

### Alternative (Simpler) Approach: Reduce Degrees of Freedom

If a full coherence resolver is too complex:

1. **Limit Combinations**
   - Only allow fashion_style options that are compatible with selected category
   - Example: If category = "luxury", only show: "business", "classic", "trendy"
   - Hide "athletic", "bohemian", "casual" for luxury

2. **Pre-Validate in UI**
   - Feed Style Picker shows only coherent combinations
   - Grayed-out incompatible options

3. **Merge Fashion into Category**
   - Instead of separate fashion_style, have:
     - "luxury-athletic" as a single category
     - "minimal-bohemian" as a single category
   - Reduces combinatorial explosion

---

## 7. DETAILED CONFLICT EXAMPLES

### Example 1: "Dark Moody + Warm Vibe + Athletic"

**User Selections:**
- Mood: "luxury" (dark_moody)
- Category: "warm"
- Fashion: "athletic"

**What Happens (Current):**

```
Template: warm_dark_moody
"warm moody with rust, burgundy, and chocolate brown tones and evening richness.
Warm Italian lighting fills intimate spaces with romantic atmosphere."

Category aesthetic: "warm inviting aesthetic with cozy atmosphere"

Mood lighting: "dramatic moody lighting with rich depth"

Fashion style: "Alo Yoga leggings, oversized hoodie"

Frame vibe: "warm and confident atmosphere"
```

**Result:** A romantic Italian evening aesthetic with... gym clothes. ❌

**What Should Happen (With Coherence):**

```
COHERENCE RESOLVER DETECTS:
- "athletic" incompatible with "romantic Italian evening"
- Adapt: "athletic" → "cozy loungewear" (fits warm + evening)

Output: "oversized cashmere hoodie, relaxed knit pants, cozy slippers"
→ Still comfortable, but fits "warm evening richness" ✅
```

### Example 2: "Minimal + Beige Mood + Bohemian"

**User Selections:**
- Category: "minimal"
- Mood: "beige"
- Fashion: "bohemian"

**What Happens (Current):**

```
Template: minimal_beige_aesthetic
"beige minimal with neutral beige and sand tones and understated elegance.
Soft Nordic light fills beige interiors with quiet sophistication."

Category aesthetic: "clean minimalist aesthetic with uncluttered composition"

Mood lighting: "soft golden hour lighting with warm glow"

Fashion style: "flowing bohemian maxi dress, layered necklaces, fringe bag"

Frame vibe: "minimal, modern aesthetic"
```

**Result:** Bohemian layering and accessories clash with "uncluttered minimal" and "quiet sophistication." ❌

**What Should Happen (With Coherence):**

```
COHERENCE RESOLVER DETECTS:
- "bohemian" (layered, eclectic) incompatible with "minimal" (clean, simple)
- Adapt: "bohemian" → "minimal bohemian" (ONE flowing element, NO layering)

Output: "single beige linen dress, minimal jewelry, clean lines"
→ Bohemian FABRIC (linen, natural) but minimal STYLING ✅
```

### Example 3: "Luxury + Light Minimal + Casual"

**User Selections:**
- Category: "luxury"
- Mood: "minimal" (light_minimalistic)
- Fashion: "casual"

**What Happens (Current):**

```
Template: luxury_light_minimalistic
"bright luxury minimalist with white and cream tailored pieces and airy elegance.
Bright natural daylight fills clean white interiors with sophisticated simplicity."

Category aesthetic: "luxurious high-end aesthetic with polished sophistication"

Mood lighting: "bright airy lighting with high-key feel"

Fashion style: "denim jeans, cotton t-shirt, sneakers"

Frame vibe: "minimal, modern aesthetic"
```

**Result:** Casual denim and sneakers in "luxury minimalist with airy elegance"? ❌

**What Should Happen (With Coherence):**

```
COHERENCE RESOLVER DETECTS:
- "casual" (denim, cotton tee) incompatible with "luxury high-end"
- Adapt: "casual" → "elevated casual" (luxury fabrics, tailored fit)

Output: "cream cashmere sweater, tailored ivory trousers, minimal white sneakers"
→ Still casual SILHOUETTE but luxury MATERIALS + minimal palette ✅
```

---

## 8. CURRENT ARCHITECTURE (Evidence-Based)

### Data Flow (No Coherence):

```
┌─────────────────────────────────────────────────┐
│ USER SELECTIONS (UI)                            │
├─────────────────────────────────────────────────┤
│ - feed_style: "luxury"                          │
│ - visual_aesthetic: ["edgy"]                    │
│ - fashion_style: ["athletic"]                   │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ STORAGE (DB)                                    │
├─────────────────────────────────────────────────┤
│ feed_layouts.feed_style = "luxury"              │
│ feed_layouts.visual_aesthetic = ["edgy"]        │
│ feed_layouts.fashion_style = ["athletic"]       │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ RESOLUTION (generation-helpers.ts)              │
├─────────────────────────────────────────────────┤
│ getCategoryAndMood() → category="edgy", mood="luxury" │
│ getFashionStyleForPosition() → fashion="athletic"     │
│ ❌ NO COHERENCE CHECK                            │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ TEMPLATE SELECTION (blueprint-photoshoot-templates.ts) │
├─────────────────────────────────────────────────┤
│ Template: edgy_dark_moody                       │
│ Baked aesthetic: "urban grit, street style"    │
│ Outfit placeholder: {{OUTFIT_FULLBODY_1}}       │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ OUTFIT INJECTION (fashion-style-mapper.ts)      │
├─────────────────────────────────────────────────┤
│ "athletic" → "Alo Yoga leggings, oversized hoodie" │
│ ❌ NO VALIDATION against template aesthetic      │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ PROMPT CONSTRUCTION (nano-banana-adapter.ts)    │
├─────────────────────────────────────────────────┤
│ ADDITIVE CONCATENATION:                         │
│ - Template scene + outfit                       │
│ - Category aesthetic wording                    │
│ - Mood lighting wording                         │
│ - Template vibe                                 │
│ ❌ NO CONFLICT RESOLUTION                        │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ FINAL PROMPT (Replicate)                        │
├─────────────────────────────────────────────────┤
│ "Subject in Alo Yoga leggings and hoodie,       │
│  edgy modern aesthetic with bold style,         │
│  urban grit with street edge,                   │
│  dramatic moody lighting"                       │
│                                                 │
│ ❌ INCOHERENT: Athletic gym wear in edgy urban   │
│    street style with dramatic moody lighting    │
└─────────────────────────────────────────────────┘
```

---

## 9. PROPOSED ARCHITECTURE (With Coherence)

### Data Flow (With Coherence Layer):

```
┌─────────────────────────────────────────────────┐
│ USER SELECTIONS (UI)                            │
├─────────────────────────────────────────────────┤
│ - feed_style: "luxury"                          │
│ - visual_aesthetic: ["edgy"]                    │
│ - fashion_style: ["athletic"]                   │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ ✅ NEW: COHERENCE VALIDATOR (UI-level)          │
├─────────────────────────────────────────────────┤
│ Check: "athletic" + "edgy" + "dark_moody"       │
│ → Warn user: "Athletic may not fit edgy mood"   │
│ → Suggest: "Try 'street style' or 'casual'"     │
│ OR                                              │
│ → Auto-adapt: "athletic" → "street athletic"    │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ STORAGE (DB)                                    │
├─────────────────────────────────────────────────┤
│ feed_layouts.feed_style = "luxury"              │
│ feed_layouts.visual_aesthetic = ["edgy"]        │
│ feed_layouts.fashion_style = ["street_athletic"] ← adapted │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ RESOLUTION (generation-helpers.ts)              │
├─────────────────────────────────────────────────┤
│ getCategoryAndMood() → category="edgy", mood="luxury" │
│ getFashionStyleForPosition() → fashion="street_athletic" │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ ✅ NEW: COHERENCE RESOLVER (Server-side)        │
├─────────────────────────────────────────────────┤
│ Input: category="edgy", mood="luxury", fashion="street_athletic" │
│                                                 │
│ 1. Validate compatibility matrix               │
│    → "street_athletic" + "edgy" = COMPATIBLE ✅  │
│                                                 │
│ 2. Resolve hierarchy:                          │
│    Priority 1: Category "edgy"                  │
│    Priority 2: Mood "luxury" (dark_moody)       │
│    Priority 3: Fashion "street_athletic"        │
│                                                 │
│ 3. Adapt outfit to aesthetic:                  │
│    "street_athletic" + "edgy" + "dark"          │
│    → "black leather bomber, structured joggers,  │
│       high-top sneakers"                        │
│    (NOT gym leggings)                           │
│                                                 │
│ 4. Unify descriptors:                          │
│    Remove contradictory vibes                   │
│    Merge compatible descriptors                 │
│                                                 │
│ Output: Coherent style parameters               │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ TEMPLATE SELECTION                              │
├─────────────────────────────────────────────────┤
│ Template: edgy_dark_moody                       │
│ Use coherent outfit descriptor                  │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ PROMPT CONSTRUCTION (nano-banana-adapter.ts)    │
├─────────────────────────────────────────────────┤
│ Use resolved coherent parameters                │
│ ✅ NO CONFLICTS                                  │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ FINAL PROMPT (Replicate)                        │
├─────────────────────────────────────────────────┤
│ "Subject in black leather bomber jacket,        │
│  structured black joggers, high-top sneakers,   │
│  edgy modern aesthetic with bold street style,  │
│  urban grit with dramatic moody lighting"       │
│                                                 │
│ ✅ COHERENT: Street athletic wear fits edgy      │
│    urban aesthetic with dark moody lighting     │
└─────────────────────────────────────────────────┘
```

---

## 10. COMPATIBILITY MATRIX (Proposed)

### Fashion Style × Category Compatibility

| Fashion Style | Luxury | Minimal | Beige | Warm | Edgy | Professional |
|---------------|--------|---------|-------|------|------|--------------|
| **Athletic** | ⚠️ Adapt → Elevated Athletic | ✅ Minimal Athletic | ⚠️ Adapt → Cozy Active | ⚠️ Adapt → Warm Active | ⚠️ Adapt → Street Athletic | ❌ Incompatible |
| **Bohemian** | ❌ Incompatible | ⚠️ Adapt → Minimal Boho | ✅ Natural Boho | ✅ Warm Boho | ⚠️ Adapt → Dark Boho | ❌ Incompatible |
| **Casual** | ⚠️ Adapt → Elevated Casual | ✅ Minimal Casual | ✅ Beige Casual | ✅ Warm Casual | ✅ Street Casual | ⚠️ Adapt → Smart Casual |
| **Business** | ✅ Luxury Business | ⚠️ Adapt → Minimal Professional | ⚠️ Adapt → Soft Professional | ⚠️ Adapt → Warm Professional | ❌ Incompatible | ✅ Professional |
| **Classic** | ✅ Timeless Luxury | ✅ Minimal Classic | ✅ Neutral Classic | ✅ Warm Classic | ⚠️ Adapt → Modern Classic | ✅ Professional Classic |
| **Trendy** | ✅ Luxury Trendy | ✅ Modern Trendy | ⚠️ Adapt → Soft Trendy | ✅ Warm Trendy | ✅ Edgy Trendy | ⚠️ Adapt → Contemporary |

**Legend:**
- ✅ Compatible - use as-is
- ⚠️ Requires adaptation - transform to fit aesthetic
- ❌ Incompatible - warn user or block combination

---

## 11. IMPLEMENTATION PRIORITY

### Phase 1: Quick Wins (No Architecture Change)

1. **Add UI warnings** for obviously incompatible combinations
2. **Gray out incompatible fashion styles** based on selected category
3. **Document known good combinations** for users

### Phase 2: Server-Side Coherence (Recommended)

1. **Build compatibility matrix** (as above)
2. **Create coherence resolver function** that adapts fashion styles to fit category/mood
3. **Integrate resolver** into `generation-helpers.ts` before prompt construction
4. **Add logging** to track resolved vs. original styles

### Phase 3: Full Coherence System (Future)

1. **Refactor templates** to be more flexible (accept adapted outfit descriptors)
2. **Build aesthetic compatibility engine** that understands semantic relationships
3. **Add ML-based coherence scoring** to validate prompts before generation
4. **A/B test** coherent vs. non-coherent generations

---

## CONCLUSION

**Do we need to tune files one by one?** → **NO**

**Do we need a higher-level coherence system?** → **YES**

**Root Cause:** The system lacks ANY mechanism to validate, adapt, or resolve conflicts between 4 independent style signal sources. This is a **fundamental architectural gap**, not a content problem.

**Recommended Path Forward:**
1. Implement server-side coherence resolver (Phase 2)
2. Add UI-level compatibility hints (Phase 1)
3. Build out full coherence engine over time (Phase 3)

**Expected Impact:**
- **80%+ reduction** in incoherent aesthetic combinations
- **Improved user satisfaction** with generated images
- **Clearer user guidance** on compatible style selections
- **Reduced support tickets** about "bad outputs"

---

**Status:** 🔴 DIAGNOSTIC COMPLETE - READY FOR DESIGN PHASE
