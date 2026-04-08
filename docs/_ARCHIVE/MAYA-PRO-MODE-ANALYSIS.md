# Maya Pro Mode Analysis - What Needs to be Fixed

## Current State Analysis

### What Pro Mode Currently Uses

**File:** `app/api/maya/pro/generate-concepts/route.ts` (line 399)
- Uses: `getMayaPersonality()` from `lib/maya/personality-enhanced.ts`
- Size: ~60 lines, ~1,500-2,000 characters
- Content: Basic mission, role, design system, aesthetic DNA only

**Current `getMayaPersonality()` Output:**
```
You are Maya, an elite AI Fashion Stylist creating production-quality prompts for Studio Pro Mode.

[Mission]
[Role]
[Design System]
[Visual Identity]
[Prompt Style]
[Technical Excellence]
```

### What Pro Mode is Missing (Compared to Classic Mode's MAYA_SYSTEM_PROMPT)

**MAYA_SYSTEM_PROMPT** (Classic Mode) includes:
1. ✅ **Communication Style** - Warm, confident, empowering, emoji usage
2. ✅ **Your Expertise** - Deep understanding of Instagram aesthetics, fashion, styling, visual storytelling
3. ✅ **Real-Time Fashion Research** - Web search capabilities, trend awareness
4. ✅ **Image Analysis** - How to analyze inspiration photos
5. ✅ **Location Inspiration** - Specific, evocative location examples ("Parisian bistro with wicker chairs", "Minimalist Scandi cafe")
6. ✅ **Natural Influencer Styling** - Hand placement, body language, expressions (detailed examples)
7. ✅ **Creative Approach** - Authentic, story-driven, visually stunning concepts
8. ✅ **Content Types** - Concept cards vs photoshoot carousels
9. ✅ **Adapting to Requests** - How to prioritize user requests vs brand profile
10. ✅ **Brand Profile Usage** - How to use wizard/brand profile data
11. ✅ **Video Creation** - How to handle video requests
12. ✅ **Response Checklist** - Comprehensive checklist before responding
13. ✅ **What Makes You Special** - Full description of Maya's capabilities
14. ✅ **Helping Beyond Concepts** - Captions, brainstorming, strategy, just talking
15. ✅ **Bag/Accessory Rules** - Contextual appropriateness
16. ✅ **Character Likeness Preservation** - Hair description rules, user preferences

**Pro Mode currently has:** Basic mission/role/design system only

## The Problem

Pro Mode is using a **minimal personality** that lacks Maya's:
- Full fashion expertise and knowledge
- Creative approach and storytelling guidance
- Location inspiration examples
- Natural influencer styling knowledge
- Brand knowledge and trend awareness
- Communication style guidance
- Comprehensive expertise sections

This results in Pro Mode generating concepts that may:
- Lack creative depth and fashion expertise
- Miss location inspiration and evocative settings
- Not leverage Maya's full styling knowledge
- Generate generic or less creative concepts

## What Needs to Be Fixed

### Option 1: Create Pro Mode Full Personality
Create a new `getMayaProPersonality()` that includes all expertise from MAYA_SYSTEM_PROMPT but adapted for Pro Mode:
- Keep Pro Mode format (150-400 words, structured sections)
- Add all expertise sections from MAYA_SYSTEM_PROMPT
- Adapt sections where needed (e.g., camera specs are DSLR/iPhone, not just iPhone)
- Include location inspiration, styling knowledge, etc.

### Option 2: Enhance getMayaPersonality()
Expand the existing `getMayaPersonality()` to include all expertise sections, creating a full personality for Pro Mode.

### Recommendation: Option 1
Create `getMayaProPersonality()` that:
1. Starts with existing `getMayaPersonality()` base (mission, role, design system)
2. Adds all expertise sections from MAYA_SYSTEM_PROMPT (adapted for Pro Mode)
3. Maintains Pro Mode specific format (150-400 words, structured sections)
4. Adapts camera specs, prompt structure, etc. for Pro Mode

## Key Differences: Pro Mode vs Classic Mode

| Aspect | Classic Mode | Pro Mode |
|--------|-------------|----------|
| **Prompt Length** | 30-60 words | 150-400 words |
| **Format** | Natural language | Structured sections (POSE, STYLING, HAIR, etc.) |
| **Camera** | iPhone 15 Pro portrait mode | DSLR (35mm, 50mm, 85mm) or iPhone |
| **Trigger Words** | Yes (required first word) | No (uses reference images) |
| **Model** | Flux/LoRA | Nano Banana Pro |
| **Personality Source** | MAYA_SYSTEM_PROMPT (full) | getMayaPersonality() (minimal) ❌ |

## Sections That Should Be Added to Pro Mode

From MAYA_SYSTEM_PROMPT, these should be included (adapted for Pro Mode):

1. **Your Expertise (Behind the Scenes)**
   - Deep understanding of Instagram aesthetics and trends
   - Fashion, styling, and visual storytelling
   - What makes photos feel authentic vs. forced
   - How to create concepts that match someone's vibe

2. **Real-Time Fashion Research**
   - Web search capabilities
   - When to search for trends
   - Staying current and relevant

3. **Image Analysis**
   - How to analyze inspiration photos
   - What to look for (styling, pose, lighting, location, feeling)

4. **Location Inspiration**
   - Specific, evocative examples
   - "Parisian bistro with wicker chairs and morning light"
   - "Minimalist Scandi cafe with plants and natural wood"
   - "Rooftop terrace at golden hour with city views"

5. **Natural Influencer Styling**
   - Hand placement examples
   - Body language guidance
   - Expressions guidance
   - Detailed, actionable knowledge

6. **Creative Approach**
   - Every concept should feel authentic, story-driven, visually stunning, true to them
   - Think in scenes and moments
   - Real moments, not stiff poses

7. **Content Types**
   - Concept Cards (diverse standalone images)
   - Photoshoot Carousels (9-grid posts)

8. **Adapting to Requests & Using Brand Profile**
   - Critical rule: Prioritize user's current request
   - How to use brand profile/wizard data
   - When to enhance vs. when to follow exactly

9. **Bag/Accessory Rules**
   - When bags are appropriate vs. inappropriate
   - Contextual rules

10. **Character Likeness Preservation**
    - Hair description rules
    - User preferences handling

11. **Communication Style** (for concept descriptions)
    - Though this is mainly for chat, it helps with generating warm, engaging concept descriptions

## Implementation Plan

1. **Create `getMayaProPersonality()` function** in `lib/maya/personality-enhanced.ts` or new file
2. **Include all expertise sections** from MAYA_SYSTEM_PROMPT
3. **Adapt for Pro Mode format:**
   - Keep structured section format (POSE, STYLING, HAIR, MAKEUP, SCENARIO, LIGHTING, CAMERA)
   - Adapt camera specs for Pro Mode (DSLR/iPhone, not just iPhone)
   - Keep 150-400 word prompt guidance
   - Remove trigger word references (Pro Mode doesn't use them)
4. **Update Pro Mode route** to use `getMayaProPersonality()` instead of `getMayaPersonality()`
5. **Test** to ensure Pro Mode concepts are more creative and leverage full Maya expertise

---

**Status:** 🔍 Analysis Complete - Ready for Implementation
**Next Step:** Create full Pro Mode personality with all expertise sections

