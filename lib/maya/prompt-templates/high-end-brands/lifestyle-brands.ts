// Lifestyle brand prompt templates (Glossier, Free People)
// Focused on relatable, authentic aesthetics for Studio Pro / Nano Banana flows.

import type { PromptTemplate, PromptContext, PromptVariation } from "../types"
import { BRAND_PROFILES } from "./brand-registry"

// ---------- Glossier: Clean Girl / Skin-First ----------

export const GLOSSIER_CLEAN_GIRL: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.GLOSSIER } = {
  id: "glossier_clean_girl",
  name: "Glossier - Clean Girl Moment",
  brandProfile: BRAND_PROFILES.GLOSSIER,
  description:
    "Natural beauty moment in Glossier aesthetic – fresh, dewy, intimate and skin-first.",
  useCases: [
    "Skin-first beauty content",
    "Everyday makeup looks",
    "Natural selfie-style portraits",
    "Minimal lifestyle beauty posts",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical 4:5 photo in natural beauty moment style, Glossier aesthetic.

Woman with fresh, minimal styling, maintaining exact characteristics from Image 1 (natural beauty, skin texture, hair, identity).

**MOMENT & EXPRESSION:**
Authentic beauty moment – relaxed, confident-casual expression or soft natural smile.
Real, relatable moment – not posed or overly styled.

**BEAUTY & STYLING:**
Minimal makeup with emphasis on glowing skin. Dewy, fresh-faced look with subtle highlight on cheekbones and nose.
Hair in natural texture, effortlessly styled – loose waves, low bun or just-woke-up perfection that still feels intentional.
Outfit: casual, minimal and comfortable – oversized knit sweater, simple white tee or soft loungewear in neutral tones.

**SETTING:**
Bright, naturally lit space with clean white or minimal background.
Could be bathroom mirror, bedroom corner or bright indoor window area.
Environment feels intimate and personal, like a private everyday moment.

**LIGHTING:**
Natural bright window light, soft and diffused, highlighting natural glow.
No harsh shadows – overall clean, bright and fresh illumination that flatters real skin.

**COMPOSITION:**
Close-up to medium shot, focusing on face, expression and skin texture.
Vertical 4:5 Instagram format, intimate framing that feels like a selfie but slightly more composed.
Background kept simple so attention stays on face and subtle styling details.

**AESTHETIC:**
Natural beauty, effortless, authentic, "skin first" philosophy.
Image should look like a beautifully composed selfie, not a heavy editorial photoshoot.
Fresh, dewy, glowing and real – small imperfections and pore texture are part of the charm.

**TECHNICAL:**
Natural smartphone-style photo quality with gentle softness.
Soft focus where appropriate, natural imperfections welcome.
Real skin texture clearly visible (no airbrushing or plastic finish).
Authentic color grading – subtle, not overly filtered, with gentle warm tones and clean whites.`.trim()
  },
  variations: [
    {
      name: "BATHROOM_MIRROR_SELFIE",
      environmentFocus:
        "Bright white bathroom with large mirror and soft tiles in the background, minimal objects visible around the sink.",
      styleKeywords:
        "towel wrapped on hair, simple white tank top, visible skincare products on counter in soft blur.",
    },
    {
      name: "BEDROOM_WINDOW_LIGHT",
      environmentFocus:
        "Bedroom corner near a large window with soft curtains, bed linens in white or soft neutrals, plants or books in background.",
      lightingAdjustment:
        "Soft side light from the window, creating gentle highlight and subtle shadow for depth without harsh contrast.",
    },
    {
      name: "DESK_WORK_BREAK",
      environmentFocus:
        "Small desk or vanity setup with laptop closed or notebook, coffee cup and a few beauty products in frame.",
      moodAdjustment:
        "Quiet moment of self-care during workday – calm, present and gently energized.",
    },
  ] satisfies PromptVariation[],
}

// ---------- Free People: Romantic Bohemian Lifestyle ----------

export const FREE_PEOPLE_BOHEMIAN: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.FREE_PEOPLE } = {
  id: "free_people_bohemian",
  name: "Free People - Bohemian Lifestyle",
  brandProfile: BRAND_PROFILES.FREE_PEOPLE,
  description:
    "Romantic bohemian lifestyle scene for Free People – sun-worn, free-spirited and textured.",
  useCases: [
    "Boho lifestyle content",
    "Festival outfits",
    "Travel storytelling",
    "Romantic everyday looks",
  ],
  requiredImages: {
    min: 1,
    max: 3,
    types: ["user_lora", "inspiration", "gallery"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical 4:5 lifestyle photo in romantic bohemian Free People aesthetic.

Woman maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair and identity), without copying the original photo.

**MOMENT & EXPRESSION:**
Spontaneous, free-spirited moment – walking through an open field, turning slightly toward the camera, or pausing mid-laugh with hair catching the breeze.
Expression is relaxed and warm – soft smile, thoughtful gaze or playful half-smile – never overly posed or stiff.

**OUTFIT & STYLING:**
Layered bohemian outfit with flowing dress or skirt, textured knits or embroidered blouse, and visible movement in fabric.
Accessories include layered jewelry, stacked rings, and possibly a hat or scarf, all styled in an effortless, collected way.
Color palette in warm earth tones, sun-faded neutrals, soft terracotta or muted floral prints that feel nostalgic and lived-in.

**SETTING:**
Outdoor setting that suggests freedom and travel – open field, desert road, beach cliff or sunlit hillside – OR cozy vintage-inspired interior with layered blankets, plants and textiles.
Background includes natural elements (grass, rocks, wildflowers, sky) or layered textiles and furniture with character, always slightly softened in focus.

**LIGHTING:**
Natural, sun-kissed light, ideally at golden hour or late afternoon.
Soft flares and gentle backlight outlining hair and dress, with warm highlights and forgiving shadows that preserve fabric and skin texture.

**COMPOSITION:**
Vertical 4:5 framing with loose, storytelling composition – subject slightly off-center, plenty of negative space for sky, landscape or room details.
Camera angle at chest or hip height, feeling like a friend capturing the moment rather than a rigid photoshoot.

**AESTHETIC:**
Romantic bohemian lifestyle – free-spirited, dreamy and feminine, with visible movement in hair and fabric.
Image should feel like a page from a travel journal or festival memory, not a polished studio campaign.
Subtle grain and slightly faded blacks add nostalgic, film-inspired feeling.

**TECHNICAL:**
Natural smartphone or lifestyle camera quality with light grain and soft focus transitions.
Depth of field shallow enough to separate subject from background while still showing context.
Warm grading with gentle saturation, preserving natural skin tones and the warmth of golden light.`.trim()
  },
  variations: [
    {
      name: "FIELD_SUNSET_WALK",
      environmentFocus:
        "Wide open field or tall grass at sunset, with sun low on the horizon and sky gradients in warm tones.",
      actionChange:
        "Slow walk with dress catching the breeze, one hand gathering fabric, other hand lightly brushing grass or hair.",
    },
    {
      name: "DESERT_ROAD_TRIP",
      environmentFocus:
        "Two-lane desert road or overlook with mountains in distance, vintage car or backpack optionally included in soft focus.",
      moodAdjustment:
        "Sense of adventure and wanderlust – ready to leave, pause or arrive, with wind and sun shaping the scene.",
    },
    {
      name: "COZY_INTERIOR_DAY",
      environmentFocus:
        "Eclectic apartment corner with layered blankets, pillows, plants and warm-toned decor, light streaming through window.",
      actionChange:
        "Sitting cross-legged on bed or floor, adjusting jewelry, reading or holding a mug, with easy, unhurried posture.",
    },
  ] satisfies PromptVariation[],
}

export const LIFESTYLE_BRANDS = {
  GLOSSIER_CLEAN_GIRL,
  FREE_PEOPLE_BOHEMIAN,
} satisfies Record<string, PromptTemplate>
