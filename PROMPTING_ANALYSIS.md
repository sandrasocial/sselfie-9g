# Prompting Structure Analysis: Current vs. Reference Image Quality

## Executive Summary

This document analyzes the current prompting structure in the SSELFIE codebase and identifies gaps that may be preventing generation of authentic, real-looking images with proper poses, lighting, fashion, and authentic moments.

## Current Prompting Structure

Based on codebase analysis (`lib/maya/flux-prompting-principles.ts` and `app/api/maya/generate-concepts/route.ts`):

### Current Format:
```
[TRIGGER WORD] + [Gender/Ethnicity] + [Outfit with Fabrics] + [Setting] + [Lighting] + [Pose/Action] + [Camera Specs]
```

### Current Requirements:
1. **Length:** 50-80 words (optimal for LoRA activation)
2. **Lighting:** Must use "uneven natural lighting", "mixed color temperatures", "natural window light with shadows"
3. **Camera:** Must include "candid photo" OR "candid moment" + "amateur cellphone photo" OR "cellphone photo" + "shot on iPhone 15 Pro portrait mode"
4. **Banned Words:** No "ultra realistic", "8K", "perfect", "professional photography", etc.

## Identified Issues & Gaps

### 1. POSES - Potential Issues

**Current Approach:**
- Simple poses: "walking toward camera", "sitting with legs crossed", "standing with weight on one leg"
- Avoids: "striking poses", "legs tucked under", "curled up"

**Potential Gaps:**
- ❌ **Too Generic:** Poses may lack specific body language details that make images feel authentic
- ❌ **Missing Micro-Movements:** Real Instagram photos capture subtle moments (adjusting hair, mid-step, reaching for something)
- ❌ **No Hand Placement Details:** Hands are crucial for authenticity - "hand in pocket", "adjusting sunglasses", "holding phone naturally"
- ❌ **Missing Weight Distribution:** "weight on back leg" is good, but could specify "slight lean", "hip popped", "shoulder relaxed"

**What Reference Image Likely Has:**
- ✅ Specific, natural body language (not just "standing" but HOW they're standing)
- ✅ Hands doing something natural (not awkwardly placed)
- ✅ Mid-action moments (not static poses)
- ✅ Natural asymmetry (not perfectly balanced)

**Recommendations:**
- Add more specific pose descriptors: "walking with one hand in pocket, other holding coffee cup"
- Include micro-movements: "adjusting hair with one hand", "reaching for phone"
- Specify body language: "slight lean against wall", "hip popped, weight on back leg"
- Capture moments: "mid-step", "turning to look", "caught mid-laugh"

### 2. LIGHTING - Potential Issues

**Current Approach:**
- Uses: "uneven natural lighting", "mixed color temperatures", "overcast daylight, soft shadows"
- Avoids: "soft afternoon sunlight", "warm golden hour", "perfect lighting"

**Potential Gaps:**
- ❌ **Too Clinical:** "Uneven natural lighting" is correct but may lack the warmth/character of real photos
- ❌ **Missing Direction:** Real photos have light coming from specific directions (window left, overhead, etc.)
- ❌ **No Time-of-Day Context:** "Overcast daylight" doesn't specify morning/afternoon/evening mood
- ❌ **Missing Shadow Details:** Real photos have specific shadow patterns (soft under eyes, defined jawline, etc.)

**What Reference Image Likely Has:**
- ✅ Specific light direction (window light from left, overhead ambient, etc.)
- ✅ Time-of-day mood (morning softness, afternoon warmth, evening coolness)
- ✅ Natural shadow patterns that define features
- ✅ Mixed sources (window + overhead + phone screen glow)

**Recommendations:**
- Add light direction: "natural window light from left side", "overhead ambient with window fill"
- Include time context: "morning window light", "afternoon daylight", "evening ambient"
- Specify shadow patterns: "soft shadows under eyes", "natural jawline definition from side light"
- Describe mixed sources: "window light with phone screen glow", "overhead ambient with natural window fill"

### 3. FASHION - Potential Issues

**Current Approach:**
- Detailed fabrics: "butter-soft chocolate leather", "chunky cable-knit cashmere"
- Fit descriptions: "oversized boyfriend cut", "high-waisted straight-leg"
- How worn: "sleeves pushed to elbows", "draped over shoulders"

**Potential Gaps:**
- ❌ **May Be Too Detailed:** 8-12 words for outfit might be competing with other elements
- ❌ **Missing "How It Moves":** Real clothes have movement - "fabric draping naturally", "slight breeze catching fabric"
- ❌ **No Wrinkles/Texture:** Real clothes have natural wrinkles, fabric texture visible
- ❌ **Missing Accessories Placement:** "chunky gold hoops" is good, but where/how are they positioned?

**What Reference Image Likely Has:**
- ✅ Natural fabric movement and drape
- ✅ Visible texture and natural wrinkles
- ✅ Accessories positioned naturally (not perfectly placed)
- ✅ Clothes that look lived-in, not brand new

**Recommendations:**
- Add movement: "fabric draping naturally", "slight breeze catching edge of blazer"
- Include texture: "visible fabric texture", "natural wrinkles from movement"
- Specify accessory placement: "gold hoops catching light", "watch visible on wrist"
- Add lived-in quality: "naturally worn", "comfortable fit", "relaxed drape"

### 4. AUTHENTICITY - Potential Issues

**Current Approach:**
- Requires: "candid photo" OR "candid moment"
- Requires: "amateur cellphone photo" OR "cellphone photo"
- Avoids professional terms

**Potential Gaps:**
- ❌ **Keywords May Not Be Enough:** Just saying "candid" doesn't make it candid - need to describe the MOMENT
- ❌ **Missing Imperfections:** Real photos have slight blur, imperfect focus, natural grain
- ❌ **No Context Clues:** Real photos show context (other people, environment, activity)
- ❌ **Too Clean:** Real phone photos have slight distortion, natural bokeh, imperfect framing

**What Reference Image Likely Has:**
- ✅ Captured moment (not posed) - someone doing something real
- ✅ Natural imperfections (slight motion blur, imperfect focus)
- ✅ Environmental context (other people, activity happening)
- ✅ Phone camera characteristics (natural distortion, authentic bokeh)

**Recommendations:**
- Describe the moment: "caught mid-conversation", "unaware of camera", "natural interaction"
- Add imperfections: "slight motion blur from movement", "natural focus falloff", "authentic phone camera grain"
- Include context: "other people in background", "activity happening around", "environmental context visible"
- Specify phone characteristics: "natural lens distortion", "authentic portrait mode bokeh", "slight chromatic aberration"

### 5. LOOKING LIKE REAL IMAGES - Potential Issues

**Current Approach:**
- Uses "amateur cellphone photo" to prevent professional look
- Avoids quality enhancement words
- Basic iPhone specs

**Potential Gaps:**
- ❌ **May Still Sound Too Professional:** Even with "amateur", the detailed descriptions might sound like a pro photographer
- ❌ **Missing Phone Camera Characteristics:** Real phone photos have specific qualities (depth map artifacts, HDR processing, etc.)
- ❌ **No Processing Clues:** Real phone photos show phone processing (slight oversaturation, auto-HDR, etc.)
- ❌ **Too Perfect Composition:** Real phone photos are often slightly off-center, imperfect framing

**What Reference Image Likely Has:**
- ✅ Phone camera processing visible (HDR, auto-enhancement)
- ✅ Natural composition (not rule-of-thirds perfect)
- ✅ Depth map artifacts (portrait mode edge detection)
- ✅ Phone camera color science (slight oversaturation, natural skin tones)

**Recommendations:**
- Add phone processing: "iPhone auto-HDR processing", "natural portrait mode edge detection", "phone camera color science"
- Include composition: "slightly off-center framing", "natural phone camera composition", "imperfect but authentic framing"
- Specify phone characteristics: "depth map artifacts visible", "natural portrait mode bokeh", "phone camera lens distortion"
- Add color science: "iPhone color processing", "natural skin tone rendering", "slight oversaturation typical of phone cameras"

### 6. AUTHENTIC MOMENTS - Potential Issues

**Current Approach:**
- Natural poses and actions
- Simple descriptions

**Potential Gaps:**
- ❌ **Too Static:** Even "walking" might be too posed - need mid-action
- ❌ **Missing Story:** Real moments tell a story - what are they doing and why?
- ❌ **No Interaction:** Real moments involve interaction (with environment, objects, people)
- ❌ **Too Perfect:** Real moments are imperfect - things are slightly messy, not perfectly arranged

**What Reference Image Likely Has:**
- ✅ Story being told (coffee run, waiting for someone, checking phone)
- ✅ Interaction with environment (touching wall, holding something, interacting with space)
- ✅ Mid-action (not before or after, but DURING)
- ✅ Slight imperfection (hair slightly messy, clothes not perfectly arranged)

**Recommendations:**
- Tell a story: "mid-conversation with friend", "waiting for coffee order", "checking phone while walking"
- Add interaction: "hand resting on table", "leaning against brick wall", "holding door open"
- Capture mid-action: "mid-step on sidewalk", "turning to respond", "reaching for something"
- Include imperfection: "hair slightly tousled from wind", "jacket slightly askew", "natural movement wrinkles"

## Recommended Prompt Structure Updates

### Enhanced Format:
```
[TRIGGER WORD] + [Gender/Ethnicity] + [Outfit with Movement/Texture] + [Setting with Context] + [Specific Light Direction/Time] + [Story-Driven Pose with Hands] + [Moment Description] + [Phone Camera Characteristics] + [Authenticity Imperfections]
```

### Example Enhanced Prompt:
```
user_trigger, woman in oversized brown leather blazer with relaxed fit, fabric draping naturally with visible texture, cream cashmere turtleneck underneath, high-waisted straight-leg jeans with natural movement wrinkles, chunky gold hoops catching light, walking through SoHo mid-step with one hand in pocket, other hand holding iced coffee cup, caught mid-conversation with friend, natural window light from left side creating soft shadows under eyes, afternoon daylight with mixed color temperatures, slight motion blur from movement, candid moment unaware of camera, amateur cellphone photo with natural portrait mode bokeh, iPhone auto-HDR processing visible, shot on iPhone 15 Pro portrait mode, shallow depth of field with natural edge detection artifacts, authentic phone camera grain
```

**Word Count:** ~85 words (slightly over, but captures more authenticity)

### Key Additions:
1. **Movement in outfit:** "fabric draping naturally", "natural movement wrinkles"
2. **Specific light direction:** "window light from left side"
3. **Time context:** "afternoon daylight"
4. **Shadow details:** "soft shadows under eyes"
5. **Hand placement:** "one hand in pocket, other hand holding"
6. **Story moment:** "caught mid-conversation with friend"
7. **Phone processing:** "iPhone auto-HDR processing visible"
8. **Imperfections:** "slight motion blur", "natural edge detection artifacts"

## Implementation Recommendations

### Priority 1: Add to Prompting Principles
1. **Light Direction:** Always specify where light comes from
2. **Time Context:** Include morning/afternoon/evening mood
3. **Hand Placement:** Always describe what hands are doing
4. **Story Moment:** Describe what's happening, not just pose

### Priority 2: Update Post-Processing
1. **Add Imperfections:** Ensure prompts include natural phone camera characteristics
2. **Movement Descriptors:** Add fabric movement and natural wrinkles
3. **Context Clues:** Include environmental context and interaction

### Priority 3: Update Examples
1. **Reference Examples:** Update example prompts to include all new elements
2. **Quality Checklist:** Add new requirements to verification checklist

## Testing Recommendations

1. **A/B Test:** Generate images with current vs. enhanced prompts
2. **Compare:** Side-by-side comparison with reference image
3. **Iterate:** Adjust based on results, focusing on:
   - Pose naturalness
   - Lighting authenticity
   - Fashion realism
   - Overall "real photo" feel

## Conclusion

The current prompting structure is solid but may be missing:
- **Specificity** in poses (hands, micro-movements)
- **Direction** in lighting (where it comes from, time of day)
- **Movement** in fashion (how fabric moves, natural wrinkles)
- **Story** in moments (what's happening, why)
- **Phone characteristics** (processing, imperfections, artifacts)

Adding these elements should bring generated images closer to the reference image quality.





