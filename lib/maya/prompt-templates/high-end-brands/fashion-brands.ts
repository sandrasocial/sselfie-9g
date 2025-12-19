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

// ---------- General Fashion Editorial Templates ----------

export const FASHION_CHAMPAGNE_SATIN_EDITORIAL: PromptTemplate = {
  id: "fashion_champagne_satin_editorial",
  name: "Champagne Satin Dress Editorial",
  description:
    "High-end fashion editorial portrait with satin dress, studio lighting and Vogue campaign aesthetic.",
  useCases: [
    "Fashion editorial content",
    "Luxury fashion campaigns",
    "Vogue-style imagery",
    "High-end fashion portraits",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

Hyper-realistic editorial photo, Hasselblad medium format, 105mm lens for compression.

**OUTFIT & STYLING:**
Woman in satin champagne dress with open back, posed turning slightly away from camera, chin over shoulder, eyes looking back with smoldering gaze. Jewelry: diamond drop earrings.

**HAIR:**
Hair styled in glossy waves flowing over one side.

**LIGHTING:**
Soft golden high-end studio light, gentle highlights tracing back, collarbone, and jawline.

**SKIN:**
Skin highly detailed with natural sheen, golden undertone glow.

**ENVIRONMENT:**
Background elevated beige wall with soft vignette shadows.

**CAMERA:**
Hasselblad medium format, 105mm lens for compression. Sharp focus on face and back.

**MOOD:**
Luxury fashion editorial mood, sensual yet refined Vogue campaign style.`.trim()
  },
}

export const FASHION_CITY_STREET: PromptTemplate = {
  id: "fashion_city_street",
  name: "City Street Confident Pose",
  description:
    "Confident city street portrait with urban background and bold accessories.",
  useCases: [
    "City street fashion content",
    "Urban fashion imagery",
    "Street style campaigns",
    "City lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

**POSE & EXPRESSION:**
Woman poses confidently in middle of busy city street, flanked by yellow taxis. Her posture is erect, hands relaxed in front of body while she looks directly at camera.

**OUTFIT & STYLING:**
Elegant white one-shoulder top, black shorts at knee height, black cat-eye sunglasses, large gold hoop earrings, gold pulse watch and carries small black bag with top handle.

**ENVIRONMENT:**
Busy city street with yellow taxis and urban architecture in background.

**LIGHTING:**
Natural city light creating highlights on outfit and accessories.

**CAMERA:**
50mm or 85mm lens, vertical framing. Sharp focus on subject, with city street softly blurred.

**MOOD:**
Confident urban fashion – bold, sophisticated and street-style editorial.`.trim()
  },
}

export const FASHION_CROSSWALK: PromptTemplate = {
  id: "fashion_crosswalk",
  name: "Pedestrian Crosswalk City Scene",
  description:
    "Elegant crosswalk portrait with autumn leaves and urban atmosphere.",
  useCases: [
    "City crosswalk fashion content",
    "Urban fashion imagery",
    "Autumn fashion campaigns",
    "Street style editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

**POSE & EXPRESSION:**
An elegant woman is in middle of pedestrian crosswalk in busy city street, surrounded by buildings and people in background. One of her hands is raised, pulling her dark hair into ponytail.

**OUTFIT & STYLING:**
Beige mesh sweater with embroidered bear, over white collared shirt, and brown pleated checkered skirt. She completes look with black sunglasses and brown shoulder bag, and is holding coffee cup and magazine.

**ENVIRONMENT:**
Busy city street with buildings and people in background. Orange and yellow autumn leaves are overlaid on upper part of image.

**LIGHTING:**
Natural city light with autumn atmosphere.

**CAMERA:**
50mm or 85mm lens, vertical framing. Sharp focus on subject, with city street softly blurred.

**MOOD:**
Elegant urban fashion – sophisticated, autumn-inspired and street-style editorial.`.trim()
  },
}

export const FASHION_LEATHER_SOFA: PromptTemplate = {
  id: "fashion_leather_sofa",
  name: "Black Leather Sofa Portrait",
  description:
    "Sophisticated portrait on black leather sofa with dramatic makeup and elegant styling.",
  useCases: [
    "Interior fashion content",
    "Studio fashion imagery",
    "Luxury fashion campaigns",
    "Editorial fashion portraits",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Do not change characteristics of person in attachment maintaining their real characteristics.

**POSE & EXPRESSION:**
An elegant woman is seated on black leather sofa, slightly tilted to right. Right leg is visibly crossed over left, and her left arm rests on chin. Expression is sophisticated and confident, with fixed gaze at camera.

**OUTFIT & STYLING:**
Brown suit, with wine/burgundy draped coat over shoulders, without sleeves being worn. Large gold hoop earrings and dramatic makeup with dark wine lipstick.

**HAIR:**
Hair is combed back in elegant bun.

**ENVIRONMENT:**
Background is neutral and illuminated, focusing on woman.

**LIGHTING:**
Neutral studio lighting creating highlights on outfit and dramatic makeup.

**CAMERA:**
50mm or 85mm lens, vertical framing. Sharp focus on face and outfit.

**MOOD:**
Sophisticated and confident – luxury fashion editorial with dramatic elegance.`.trim()
  },
}

export const FASHION_YSL_STUDIO: PromptTemplate = {
  id: "fashion_ysl_studio",
  name: "YSL-Inspired Studio Portrait",
  description:
    "Glamorous studio portrait with YSL-inspired styling and dramatic makeup.",
  useCases: [
    "Studio fashion content",
    "Luxury brand imagery",
    "Editorial fashion campaigns",
    "High-fashion portraits",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Do not change characteristics of attached person.

**POSE & EXPRESSION:**
Woman with illuminated brown hair pulled back in high elegant ponytail, with hair falling over right shoulder, hair is medium length and she is holding with one hand end of hair. She is seated on ground, legs crossed relaxed way, with hands on knees or on legs. Woman is looking to right side of photo, with serious and confident expression.

**OUTFIT & STYLING:**
Black sleeveless body, with white shirt collar underneath, and black tie with gold logo (similar to YSL). She also wears long black gloves that reach elbows and wide light wash jeans pants.

**MAKEUP:**
Glamorous makeup, with winged eyeliner and nude lipstick.

**ENVIRONMENT:**
Background is simple studio, light gray or pale blue color, uniformly illuminated.

**LIGHTING:**
Uniform studio lighting creating even highlights.

**CAMERA:**
50mm or 85mm lens, vertical framing. Sharp focus on face and styling.

**MOOD:**
Serious and confident – YSL-inspired luxury fashion editorial with glamorous aesthetic.`.trim()
  },
}

export const FASHION_FUR_COAT: PromptTemplate = {
  id: "fashion_fur_coat",
  name: "Fur Coat Classic Elegance",
  description:
    "Elegant portrait with fur coat, satin dress and classic Mediterranean setting.",
  useCases: [
    "Luxury fashion content",
    "Classic elegance imagery",
    "High-end fashion campaigns",
    "Editorial fashion portraits",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Do not change characteristics of woman in attachment.

**POSE & EXPRESSION:**
Feminine model, probably between 20 and 30 years old, with illuminated brown hair and wavy with volume falling over one shoulder. She is looking directly at camera with serious or seductive expression, and her lips are slightly open. Her pose is elegant and confident, with body slightly turned to side, highlighting her silhouette.

**OUTFIT & STYLING:**
Dark brown or similar fur coat, which is sliding down her shoulders, revealing upper part of her back and bare shoulder. Underneath, she has brown or bronze satin dress, which fits her figure and has high thigh slit. Simple gold earrings and makeup that highlights her eyes and lips.

**ENVIRONMENT:**
She is standing in hallway or arcade with light stone pillars in background, which appear to be classic or Mediterranean style. In background, can see garden or patio with statues and foliage, suggesting luxurious and well-kept outdoor scenario or in grand property.

**LIGHTING:**
Natural and soft, creating some shadows, but keeping model well illuminated.

**CAMERA:**
50mm or 85mm lens, vertical framing. Sharp focus on face and outfit.

**MOOD:**
Elegant and confident – luxury fashion editorial with classic Mediterranean elegance.`.trim()
  },
}

export const FASHION_BEAUTY_CLOSEUP: PromptTemplate = {
  id: "fashion_beauty_closeup",
  name: "Glamorous Beauty Close-up",
  description:
    "High-quality beauty portrait with glamorous makeup and holographic jacket.",
  useCases: [
    "Beauty fashion content",
    "Editorial beauty imagery",
    "Makeup campaigns",
    "Beauty editorial portraits",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `High-quality feminine portrait, ultra-realistic, preserving 100% original face of woman from provided photo.

**HAIR & MAKEUP:**
She has illuminated and natural skin, glamorous makeup with earthy tones, subtle eyeliner and silver glitter applied on temples and cheekbones of face, creating sophisticated shine. Hair is illuminated brown, long, wavy and pinned in high ponytail with volume, with some loose highlights at front framing face.

**OUTFIT & ACCESSORIES:**
She wears gold flower-shaped earrings and black jacket with holographic shine and slightly reflective texture.

**POSE & EXPRESSION:**
Expression is confident and soft, with gaze lightly turned to side.

**ENVIRONMENT:**
Background is neutral and clean, professional studio lighting, soft diffused light and controlled reflections.

**CAMERA:**
85mm, f/2.0, soft side light, sharp focus on face. 8K quality.

**MOOD:**
Editorial beauty photography style, realistic, with detailed skin and hair texture – sophisticated and glamorous.`.trim()
  },
}

export const FASHION_EUROPEAN_STREET: PromptTemplate = {
  id: "fashion_european_street",
  name: "European Street Elegant Walk",
  description:
    "Elegant European street portrait with blazer dress and luxury accessories.",
  useCases: [
    "European street fashion content",
    "Urban fashion imagery",
    "Luxury fashion campaigns",
    "Street style editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

**HAIR:**
Illuminated brown with loose waves, without short bangs.

**SCENE:**
Elegant European street.

**OUTFIT & STYLING:**
Brown blazer worn as dress + black over-the-knee boots + black gloves + beige LV scarf.

**POSE & EXPRESSION:**
Walking with bag in hand. Confident and elegant expression.

**LIGHTING:**
Soft neutral lighting creating sophisticated atmosphere.

**CAMERA:**
~2.4 m, full body. 50mm or 85mm lens.

**MOOD:**
Elegant European fashion – sophisticated, luxury and street-style editorial.`.trim()
  },
}

export const FASHION_LONDON_CHRISTMAS: PromptTemplate = {
  id: "fashion_london_christmas",
  name: "London Street Christmas Lights",
  description:
    "London street portrait with red telephone booth and Christmas lights.",
  useCases: [
    "London fashion content",
    "Christmas fashion imagery",
    "Winter fashion campaigns",
    "Holiday street style",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

**HAIR:**
Illuminated brown, defined and shiny waves, without short bangs.

**SCENE:**
London street with red telephone booth and Christmas lights in background.

**OUTFIT & STYLING:**
Wine sweater with bear + white shirt + checkered mini skirt + black tights + black boots.

**POSE & EXPRESSION:**
Stopped beside booth, light smile. Relaxed and cheerful expression.

**LIGHTING:**
Soft neutral winter lighting with Christmas lights creating atmosphere.

**CAMERA:**
~2 m, full body. 50mm or 85mm lens.

**MOOD:**
London winter fashion – festive, cozy and street-style editorial.`.trim()
  },
}

export const FASHION_EUROPEAN_DOOR: PromptTemplate = {
  id: "fashion_european_door",
  name: "European Wooden Door Autumn",
  description:
    "Autumn European street portrait with wooden door and sophisticated styling.",
  useCases: [
    "European street fashion content",
    "Autumn fashion imagery",
    "Urban fashion campaigns",
    "Street style editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

**HAIR:**
Illuminated brown, voluminous loose waves (without short bangs).

**SCENE:**
Street with European wooden door in background.

**OUTFIT & STYLING:**
Brown blazer + brown sweater + brown mini skirt + beige tights + brown moccasin. Accessories: oversized dark sunglasses + brown bag + takeaway coffee.

**POSE & EXPRESSION:**
Bent leg, relaxed confident expression. Natural and sophisticated pose.

**LIGHTING:**
Soft external, autumn chic mood creating warm highlights.

**CAMERA:**
~1.8 m, mid-body to full body. 50mm or 85mm lens.

**MOOD:**
Autumn chic – sophisticated European fashion with warm, cozy atmosphere.`.trim()
  },
}

export const FASHION_BRANDS = {
  REFORMATION_FEMININE,
  EVERLANE_MINIMAL,
  ARITZIA_ELEVATED,
  FASHION_CHAMPAGNE_SATIN_EDITORIAL,
  FASHION_CITY_STREET,
  FASHION_CROSSWALK,
  FASHION_LEATHER_SOFA,
  FASHION_YSL_STUDIO,
  FASHION_FUR_COAT,
  FASHION_BEAUTY_CLOSEUP,
  FASHION_EUROPEAN_STREET,
  FASHION_LONDON_CHRISTMAS,
  FASHION_EUROPEAN_DOOR,
} satisfies Record<string, PromptTemplate>
