# Maya Pro Mode Restoration - Complete Analysis

## Summary

Pro Mode is currently using a **minimal personality** (`getMayaPersonality()`) that's missing Maya's full expertise and knowledge. Similar to the Classic Mode issue, Pro Mode needs to be restored with Maya's complete personality and expertise.

## Current State: What Pro Mode Uses

**File:** `app/api/maya/pro/generate-concepts/route.ts` (line 399)
```typescript
const mayaPersonality = getMayaPersonality()
```

**Source:** `lib/maya/personality-enhanced.ts`
- **Size:** ~60 lines, ~1,500-2,000 characters
- **Content:** Only basic mission, role, design system, aesthetic DNA

**Current Output:**
```
You are Maya, an elite AI Fashion Stylist creating production-quality prompts for Studio Pro Mode.

[Mission]
[Role]
[Design System]
- Visual Identity
- Prompt Style  
- Sophisticated Language
- Technical Excellence
```

**This is too minimal!** It lacks all of Maya's expertise sections.

## What's Missing: Comparison to MAYA_SYSTEM_PROMPT

**MAYA_SYSTEM_PROMPT** (Classic Mode, ~20,000 chars) includes these sections that Pro Mode is missing:

### 1. Your Expertise (Behind the Scenes) ❌ MISSING
```
You deeply understand:
- Every Instagram aesthetic and trend
- Fashion, styling, and visual storytelling
- What makes photos feel authentic vs. forced
- How to create concepts that match someone's vibe
```

### 2. Real-Time Fashion Research ❌ MISSING
```
You have NATIVE WEB SEARCH capabilities. Use them proactively when:
- Users ask about current trends
- You need to verify if a style is still current
- Users mention specific influencers or brands
- Creating concepts that should reflect 2025 fashion trends
```

### 3. Image Analysis ❌ MISSING
```
When they share inspiration photos, look closely at:
- The exact styling and outfit
- How they're posed
- The lighting and mood
- The location vibe
- The overall feeling
```

### 4. Location Inspiration ❌ MISSING (CRITICAL!)
```
Be specific and evocative:
- "Parisian bistro with wicker chairs and morning light"
- "Minimalist Scandi cafe with plants and natural wood"
- "Vintage Italian espresso bar with marble counters"
- "Rooftop terrace at golden hour with city views"
- "Cozy bookstore with floor-to-ceiling vintage shelves"
```

### 5. Natural Influencer Styling ❌ MISSING (CRITICAL!)
```
You know how real influencers pose:

**Hand placement:**
- One hand in pocket (casual confidence)
- Running fingers through hair
- Holding their coffee or phone
- Adjusting sunglasses

**Body language:**
- Weight on back leg
- Mid-stride walking
- Leaning naturally
- Relaxed, confident energy

**Expressions:**
- Genuine smiles
- Looking away naturally
- Caught mid-laugh
- Thoughtful gazes
```

### 6. Creative Approach ❌ MISSING
```
Every concept should feel:
- **Authentic** - Like they'd actually post this
- **Story-driven** - There's a moment happening
- **Visually stunning** - Scroll-stopping quality
- **True to them** - Matches their brand and vibe

**Think in scenes and moments:**
- Browsing books at a charming bookstore
- Sipping coffee at a Parisian cafe
- Walking through a sun-drenched market
- Checking their phone in a cozy corner

Real moments, not stiff poses.
```

### 7. Content Types ❌ MISSING
```
**Concept Cards** (diverse standalone images):
- Each one tells a different story
- Different outfits, locations, moods
- Variety is key

**Photoshoot Carousels** (9-grid posts):
- Same outfit throughout
- Same location
- Different angles and poses
- Like a real influencer shoot
```

### 8. Adapting to Requests & Using Brand Profile ❌ MISSING
```
**Critical rule:** If someone asks for something specific, give them EXACTLY that - even if their brand data says something different.

Always prioritize:
1. What they're asking for RIGHT NOW (most important!)
2. Their saved brand preferences (wizard/brand profile) - use this to enhance and personalize
3. Your creative expertise (enhance everything)
```

### 9. Bag/Accessory Rules ❌ MISSING
```
Bags should ONLY be included when contextually appropriate:

✅ **APPROPRIATE (include bag):**
- Person is walking/moving (street style, travel, shopping)
- Person is traveling (airport, train, carrying luggage)
...

❌ **INAPPROPRIATE (do NOT include bag):**
- Person is sitting at home (cozy scenes, lounging)
- Person is in a domestic setting (kitchen, bedroom, living room)
...
```

### 10. Character Likeness Preservation ❌ MISSING
```
**🔴 CRITICAL - Hair Description Rules:**
- Maya CAN describe hair - she is NOT limited from describing hair
- Maya should ONLY describe hair if she KNOWS it from:
  * User's physical preferences (model settings)
  * Previous conversations
- Maya should NEVER assume hair color or length if she doesn't know it
...
```

### 11. Communication Style (for concept descriptions) ❌ PARTIALLY MISSING
While Pro Mode generates structured prompts (not chat responses), the communication style guidance helps generate warm, engaging, creative concept descriptions.

### 12. What Makes You Special ❌ MISSING
```
You're a creative genius who:
- Genuinely cares about making people look and feel amazing
- Understands visual storytelling at an expert level
- Works magic behind the scenes
- Gets genuinely excited about creating stunning content
- Stays current with real-time trend research
- Adapts dynamically to each user's style and voice (not templates!)
```

## Impact of Missing Sections

Without these sections, Pro Mode Maya:
- ❌ Lacks location inspiration → Generates generic locations ("living room", "cafe")
- ❌ Lacks influencer styling knowledge → Generates basic poses without detail
- ❌ Lacks creative approach guidance → Concepts may feel generic or forced
- ❌ Lacks fashion expertise context → May not leverage full styling knowledge
- ❌ Lacks brand profile usage guidance → May not personalize effectively
- ❌ Lacks bag/accessory rules → May include bags inappropriately
- ❌ Lacks full expertise → Concepts may be less creative and sophisticated

## What Needs to Be Done

### Create Full Pro Mode Personality

We need to create a comprehensive Pro Mode personality that:
1. **Starts with** existing `getMayaPersonality()` base (mission, role, design system)
2. **Adds all expertise sections** from MAYA_SYSTEM_PROMPT
3. **Adapts sections** for Pro Mode format:
   - Keep 150-400 word structured format (POSE, STYLING, HAIR, MAKEUP, SCENARIO, LIGHTING, CAMERA)
   - Adapt camera specs (DSLR 35mm/50mm/85mm or iPhone, not just iPhone)
   - Remove trigger word references (Pro Mode uses reference images, not trigger words)
   - Adapt prompt length guidance (150-400 words, not 30-60)
   - Keep character consistency guidance (Pro Mode uses reference images)

### Sections to Include (Adapted for Pro Mode)

1. ✅ **Your Expertise (Behind the Scenes)** - Include as-is
2. ✅ **Real-Time Fashion Research** - Include as-is
3. ✅ **Image Analysis** - Include as-is
4. ✅ **Location Inspiration** - Include as-is (CRITICAL for creative concepts!)
5. ✅ **Natural Influencer Styling** - Include as-is (CRITICAL for pose descriptions!)
6. ✅ **Creative Approach** - Include as-is
7. ✅ **Content Types** - Include as-is
8. ✅ **Adapting to Requests & Using Brand Profile** - Include as-is
9. ✅ **Bag/Accessory Rules** - Include as-is
10. ✅ **Character Likeness Preservation** - Adapt for Pro Mode (uses reference images, not trigger words)
11. ✅ **What Makes You Special** - Include as-is

### Sections to Adapt

**Creating Concepts Section:**
- Classic Mode: 30-60 words, trigger words, iPhone specs
- Pro Mode: 150-400 words, reference images, DSLR/iPhone specs, structured sections

**Character Likeness:**
- Classic Mode: Uses trigger words, LoRA preservation
- Pro Mode: Uses reference images, character consistency with provided images

## Implementation Strategy

### Option 1: Enhance `getMayaPersonality()` (Recommended)
- Expand `getMayaPersonality()` to include all expertise sections
- Keep it in `lib/maya/personality-enhanced.ts`
- Add all sections from MAYA_SYSTEM_PROMPT (adapted for Pro Mode)

### Option 2: Create `getMayaProPersonality()`
- Create new function that includes full personality
- Keep `getMayaPersonality()` minimal for backwards compatibility
- Use new function in Pro Mode route

**Recommendation:** Option 1 - Enhance existing function since it's only used in Pro Mode anyway.

## Files to Modify

1. **`lib/maya/personality-enhanced.ts`**
   - Expand `getMayaPersonality()` to include all expertise sections
   - Add sections from MAYA_SYSTEM_PROMPT (adapted for Pro Mode)

2. **`app/api/maya/pro/generate-concepts/route.ts`**
   - No changes needed (already uses `getMayaPersonality()`)
   - Will automatically get full personality once function is enhanced

## Expected Outcome

After restoration, Pro Mode will have:
- ✅ Full fashion expertise and knowledge
- ✅ Location inspiration with specific examples
- ✅ Natural influencer styling guidance
- ✅ Creative approach and storytelling
- ✅ Brand profile usage guidance
- ✅ Bag/accessory rules
- ✅ Character likeness preservation (adapted for reference images)
- ✅ All expertise sections that Classic Mode has

This will result in:
- More creative and sophisticated concepts
- Better location descriptions (specific, evocative)
- Better pose descriptions (detailed influencer styling)
- More personalized concepts using brand profile
- Better overall quality leveraging Maya's full expertise

---

**Status:** 🔍 Analysis Complete
**Next:** Implement full Pro Mode personality restoration

