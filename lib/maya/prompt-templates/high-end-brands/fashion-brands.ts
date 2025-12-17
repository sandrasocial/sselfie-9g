// Contemporary fashion brand prompt templates (Reformation, Everlane, Aritzia)
// Designed for Studio Pro / Nano Banana high-end brand workflows.

import type { PromptTemplate, PromptContext, PromptVariation } from "../types"
import { BRAND_PROFILES } from "./brand-registry"

// ---------- Reformation: Feminine, Sustainable, Vintage-Inspired ----------

export const REFORMATION_FEMININE: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.REFORMATION } = {
  id: "reformation_feminine",
  name: "Reformation - Feminine Vintage Dress",
  brandProfile: BRAND_PROFILES.REFORMATION,
  description:
    "Sustainable, feminine and vintage-inspired Reformation look – sunlit dress, city or vacation storytelling.",
  useCases: [
    "Summer dress campaigns",
    "Date-night outfits",
    "Vacation content",
    "Everyday feminine looks",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical 4:5 fashion photo in Reformation aesthetic – feminine, sustainable and slightly vintage-inspired.

Woman maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair and identity), without copying the original photo.

**MOMENT & EXPRESSION:**
Natural, cinematic moment – walking slowly along a sunlit street, pausing on a city corner or balcony, or standing near an open doorway with warm breeze moving the dress.
Expression is soft and self-assured – relaxed gaze, small smile or calm, thoughtful look – never over-posed or dramatic.

**OUTFIT & STYLING:**
Reformation-style dress with flattering, body-skimming cut: midi or mini length with subtle vintage details – sweetheart or square neckline, delicate straps, small slit or wrap detail. Print or fabric feels considered and sustainable: soft florals, polka dots, or sun-faded solid in muted tones (sage, cream, soft red, navy). Accessories stay simple and conscious – delicate jewelry, small shoulder bag, low heels or sandals.

**SETTING:**
Urban or vacation setting that feels real and lived-in – tree-lined sidewalk, European-style street, small café façade, balcony with plants, or sunlit stairwell. Background elements (windows, plants, signage) appear in soft focus, adding context without crowding the frame.

**LIGHTING:**
Natural daylight, preferably golden hour or late afternoon, with soft directional light creating gentle highlights on hair and dress. Shadows are present but flattering, preserving real fabric texture and skin detail.

**COMPOSITION:**
Vertical 4:5 framing with subject slightly off-center, leaving breathing room for architecture, plants or sky. Camera at chest or hip height, feeling like a friend or partner taking the photo, not a studio shoot.

**AESTHETIC:**
Sustainable, feminine and modern – a look that feels ready for real life and social posts, with subtle vintage references and effortless styling.
Image should read as an aspirational but achievable outfit photo, not a heavy editorial campaign.

**TECHNICAL:**
Natural smartphone or lifestyle camera feel with crisp focus on the subject and softly blurred background. Light grain acceptable; color grading is soft and warm with gentle contrast, keeping skin tones natural and the dress fabric true-to-life.`.trim()
  },
  variations: [
    {
      name: "CITY_STOOP_SUN",
      environmentFocus:
        "Brownstone steps or narrow city sidewalk with potted plants, dappled sunlight and warm-toned façades.",
      actionChange:
        "Sitting or standing on steps, one hand resting on railing or bag strap, dress falling naturally with visible movement.",
    },
    {
      name: "VACATION_BALCONY",
      environmentFocus:
        "Small balcony with wrought-iron railing, terracotta pots and distant rooftops or sea in soft blur.",
      moodAdjustment:
        "Slow vacation morning or golden-hour evening – relaxed, romantic and sun-warmed.",
    },
    {
      name: "CAFÉ_CORNER_LOOKBACK",
      environmentFocus:
        "Corner café or small restaurant exterior with simple signage and chairs, soft street activity blurred behind.",
      actionChange:
        "Walking past then glancing back over shoulder, hem of dress moving lightly with the step.",
    },
  ] satisfies PromptVariation[],
}

// ---------- Everlane: Minimal, Quality Basics, Radical Transparency ----------

export const EVERLANE_MINIMAL: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.EVERLANE } = {
  id: "everlane_minimal",
  name: "Everlane - Minimal Everyday Basics",
  brandProfile: BRAND_PROFILES.EVERLANE,
  description:
    "Minimal, honest everyday look in Everlane aesthetic – clean lines, quality basics and quiet confidence.",
  useCases: [
    "Capsule wardrobe content",
    "Work-from-anywhere outfits",
    "Street style minimalism",
    "Product-focused outfit shots",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "gallery"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical 4:5 photo in Everlane aesthetic – minimal, high-quality basics with understated sophistication.

Person maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair and identity), without copying the original photo.

**MOMENT & EXPRESSION:**
Calm, everyday moment – standing on a clean sidewalk, leaning lightly against a neutral wall, or seated at a simple table with coffee.
Expression is relaxed and grounded – soft focus, small half-smile or neutral, confident gaze – no exaggerated posing.

**OUTFIT & STYLING:**
Everlane-style outfit built from quality basics: structured blazer or trench, clean crewneck or button-up shirt, straight-leg denim or tailored trousers, simple leather shoes or sneakers. Palette in refined neutrals – black, white, camel, navy, gray – with minimal branding and emphasis on fit and fabric. Accessories remain functional and subtle – leather tote, watch, delicate jewelry.

**SETTING:**
Simple, real-world environment – quiet city sidewalk, minimalist café interior, bright hallway or office lobby with clean lines and natural materials (concrete, wood, glass). Background elements (benches, plants, windows) are present but intentionally uncluttered.

**LIGHTING:**
Natural or soft artificial light that feels honest and unfiltered, avoiding dramatic shadows or stylized effects. Light should reveal fabric texture and true color, keeping the scene clear and easy to read.

**COMPOSITION:**
Vertical 4:5 framing, medium or full-body shot with straightforward, slightly documentary composition. Camera at eye or chest level, parallel to the subject, with enough negative space to feel airy and modern.

**AESTHETIC:**
Radically simple and transparent – focus on how the clothes look and fall in real life. The image should feel like a candid, high-quality lookbook photo: approachable, functional and quietly aspirational.

**TECHNICAL:**
Clean, sharp image with natural color rendering and minimal post-processing. No heavy filters or stylized effects; small grain acceptable. Depth of field moderate – subject clearly separated from background, but environment details still legible.`.trim()
  },
  variations: [
    {
      name: "NEUTRAL_WALL_LOOK",
      environmentFocus:
        "Plain or lightly textured wall in soft neutral tone, subtle architectural details like ledges or vents.",
      actionChange:
        "Standing slightly angled to the camera, one hand in pocket or holding tote strap, gaze relaxed toward the lens.",
    },
    {
      name: "CAFÉ_WORK_SESSION",
      environmentFocus:
        "Minimal café interior with wooden table, simple chairs and large window light.",
      moodAdjustment:
        "Quiet productivity and ease – laptop closed or notebook nearby, coffee cup within reach.",
    },
    {
      name: "HALLWAY_TRANSIT",
      environmentFocus:
        "Bright hallway or office corridor with clean floor and linear perspective, occasional plant or bench.",
      actionChange:
        "Mid-step walk through frame, coat or blazer moving subtly, expression neutral and composed.",
    },
  ] satisfies PromptVariation[],
}

// ---------- Aritzia: Elevated Everyday, Sophisticated Casual ----------

export const ARITZIA_ELEVATED: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.ARITZIA } = {
  id: "aritzia_elevated",
  name: "Aritzia - Elevated Everyday",
  brandProfile: BRAND_PROFILES.ARITZIA,
  description:
    "Elevated everyday outfit in Aritzia aesthetic – sophisticated casual with contemporary silhouettes.",
  useCases: [
    "Office-to-dinner looks",
    "City style content",
    "Modern capsule wardrobe",
    "Mirror outfit photos",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical 4:5 photo in Aritzia aesthetic – elevated everyday style with clean, contemporary lines.

Woman maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair and identity), without copying the original photo.

**MOMENT & EXPRESSION:**
Sophisticated casual moment – stepping out of an apartment building, standing near a large window, or taking a mirror outfit photo in a minimalist hallway.
Expression is confident but relaxed – slight smile or composed neutral look, conveying ease and self-assurance.

**OUTFIT & STYLING:**
Aritzia-style outfit mixing tailored and soft pieces: structured blazer or trench over fitted knit top, high-waisted trousers or midi skirt, or matching set in refined neutral or tonal palette. Fabrics feel premium and drapey – wool blends, satin, structured cotton with smooth finish. Accessories include refined shoulder bag, minimal jewelry and polished boots or heels.

**SETTING:**
Urban, design-forward environment – apartment entryway with clean architecture, city sidewalk near glass storefronts, or bright interior with large windows and neutral decor. Background remains modern and uncluttered, with subtle signs of city life in soft focus.

**LIGHTING:**
Soft natural or mixed natural/artificial light that flatters skin and fabric drape. Light may come from large windows, open doorway or soft overhead fixtures, avoiding harsh contrast while still creating gentle shadow.

**COMPOSITION:**
Vertical 4:5 framing with medium or full-body composition, leaving negative space for architecture and environment. Camera at eye or chest height for street-style angle, or slightly lower for mirror shot, ensuring outfit proportions read clearly.

**AESTHETIC:**
Elevated, wearable and contemporary – the kind of look that transitions from office to dinner. Image should feel like a premium fashion Instagram post or lookbook still, refined but still rooted in real life.

**TECHNICAL:**
Clean, sharp image with subtle depth of field and minimal noise. Color grading leans toward soft neutrals with slightly warm or cool tint depending on environment, preserving texture in fabrics and natural skin finish.`.trim()
  },
  variations: [
    {
      name: "LOBBY_GLASS_DOORS",
      environmentFocus:
        "Modern building lobby with glass doors, marble or polished floor and minimal furniture.",
      actionChange:
        "Walking toward or away from doors, coat moving slightly, bag in hand, head turned gently toward or away from camera.",
    },
    {
      name: "WINDOW_LIGHT_CORNER",
      environmentFocus:
        "Apartment or studio corner with large window, bench or chair and simple art or mirror.",
      moodAdjustment:
        "Quiet pre- or post-work moment, calm and composed.",
    },
    {
      name: "MIRROR_OUTFIT_CHECK",
      environmentFocus:
        "Full-length mirror in hallway or bedroom with neutral decor and clean floor.",
      actionChange:
        "Taking a mirror outfit photo with phone slightly visible, body angled to show silhouette, expression soft and confident.",
    },
  ] satisfies PromptVariation[],
}

export const FASHION_BRANDS = {
  REFORMATION_FEMININE,
  EVERLANE_MINIMAL,
  ARITZIA_ELEVATED,
} satisfies Record<string, PromptTemplate>
