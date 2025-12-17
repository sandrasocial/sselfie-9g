// Luxury fashion brand prompt templates (Chanel, Dior)
// High-detail editorial prompts for Nano Banana / Studio Pro flows.

import type { PromptTemplate, PromptContext, PromptVariation } from "../types"
import { BRAND_PROFILES } from "./brand-registry"

// ---------- Helper functions (luxury editorial building blocks) ----------

export function generateChanelAccessories(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()
  const parts: string[] = []

  // Core Chanel touchpoints
  parts.push(
    "classic quilted leather Chanel bag with gold chain strap and CC turn-lock clasp treated as a key styling element",
  )
  parts.push(
    "layered pearl details – necklace, earrings or bracelet – adding subtle brightness around the face and neckline",
  )
  parts.push("discreet CC jewelry accents, such as earrings, ring or bracelet")

  if (intent.includes("headband") || intent.includes("hairband")) {
    parts.push("structured beige or black headband with interlaced CC logo visible from the side")
  }

  if (intent.includes("wallet") || intent.includes("card holder")) {
    parts.push("compact quilted wallet placed naturally on the table or in hand, logo visible without dominating the frame")
  }

  if (intent.includes("sunglasses") || intent.includes("street") || intent.includes("rodeo")) {
    parts.push("angular black sunglasses with white Chanel logo on the temples, reinforcing brand presence in a contemporary way")
  }

  if (intent.includes("box") || intent.includes("gift") || intent.includes("shopping bag")) {
    parts.push(
      "black Chanel shopping bag or gift box with white grosgrain ribbon, positioned naturally as part of the scene rather than as an advertisement",
    )
  }

  return `${parts.join("; ")}.`
}

export function generateLuxuryEnvironment(context: PromptContext, brand: "chanel" | "dior" = "chanel"): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (brand === "chanel") {
    if (intent.includes("rodeo") || intent.includes("drive")) {
      return "in front of a Chanel boutique on Rodeo Drive, with the façade and signage softly blurred behind her"
    }
    if (intent.includes("cafe") || intent.includes("café")) {
      return "at a Parisian street café table, framed by façades with Haussmannian balconies and passing scooters in soft blur"
    }
    if (intent.includes("hotel") || intent.includes("room") || intent.includes("suite")) {
      return "inside a five-star Parisian hotel suite, with upholstered headboard, tall French doors and classic moldings suggesting discreet opulence"
    }
    if (intent.includes("fireplace") || intent.includes("interior") || intent.includes("armchair")) {
      return "in an intimate interior by a lit stone fireplace, seated in a textured bouclé armchair surrounded by warm, luxurious details"
    }
    return "in front of a luxury Chanel boutique with marble floors and a softly blurred CHANEL awning above the scene, integrated into a sophisticated urban setting"
  }

  // Dior – romantic, softer environments
  if (intent.includes("garden") || intent.includes("flowers") || intent.includes("blossom")) {
    return "in a romantic Parisian garden with manicured hedges, soft blossoms and wrought-iron details in the background"
  }
  if (intent.includes("balcony") || intent.includes("terrace")) {
    return "on an elegant stone balcony overlooking Parisian rooftops, with draped curtains and soft sky tones behind"
  }
  if (intent.includes("interior") || intent.includes("salon") || intent.includes("atelier")) {
    return "inside an elegant couture salon with tall windows, sheer curtains and classic moldings, softly lit in pastel tones"
  }

  return "in an environment that evokes Dior's romantic universe – either a Parisian garden or an elegant interior with light, airy architecture"
}

export function generateEditorialLighting(context: PromptContext, brand: "chanel" | "dior" = "chanel"): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (brand === "chanel") {
    if (intent.includes("night") || intent.includes("evening") || intent.includes("studio")) {
      return "soft studio flash shaping the face and velvet or tweed textures, creating controlled shine while preserving real skin texture"
    }
    if (intent.includes("fireplace") || intent.includes("firelight") || intent.includes("winter")) {
      return "warm firelight from the side, wrapping fabrics and jewelry in soft golden reflections and casting gentle shadows in the room"
    }
    if (intent.includes("california") || intent.includes("rodeo") || intent.includes("sun")) {
      return "natural California daylight, with clear directional light and defined yet flattering shadows that emphasize structure without harshness"
    }
    if (intent.includes("cafe") || intent.includes("café")) {
      return "midday café light, soft but present, wrapping the face and highlighting glossed lips, pearl details and tweed texture"
    }
    return "balanced natural daylight, softly reflecting on marble and glass, creating diffused shine and depth without distracting glare"
  }

  // Dior – dreamy, romantic light
  if (intent.includes("golden hour") || intent.includes("sunset") || intent.includes("sunrise")) {
    return "golden hour light with soft, elongated shadows, warm highlights on fabrics and hair, and an overall dreamy glow"
  }
  if (intent.includes("overcast") || intent.includes("soft light")) {
    return "bright overcast light, diffused across the scene, removing harsh contrasts and creating gentle transitions in skin and fabric"
  }
  return "soft, diffused lighting that feels like late-afternoon or golden hour, wrapping the subject in a romantic, airy glow"
}

export function generateLuxuryMood(context: PromptContext, brand: "chanel" | "dior" = "chanel"): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (brand === "chanel") {
    if (intent.includes("bold") || intent.includes("attitude") || intent.includes("logo")) {
      return "bold luxury with logo-loaded attitude, dominant fashion energy and unapologetic confidence"
    }
    if (intent.includes("night") || intent.includes("party") || intent.includes("glamour")) {
      return "luxurious evening glamour, sophisticated and elegant, with a sense of silent power"
    }
    if (intent.includes("casual") || intent.includes("street") || intent.includes("iphone")) {
      return "contemporary luxury lifestyle, confident and urban, with spontaneous energy and no staged advertising appearance"
    }
    return "silent confidence and timeless elegance – classic, modern and absolutely Chanel in every detail"
  }

  // Dior Romantic
  if (intent.includes("dream") || intent.includes("romantic") || intent.includes("fairytale")) {
    return "romantic dreamlike elegance, soft glamour and haute couture fantasy made tangible"
  }
  return "soft, feminine confidence – romantic, graceful and gently glamorous without excess"
}

export function generateLuxuryPose(context: PromptContext, brand: "chanel" | "dior" = "chanel"): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (brand === "chanel") {
    if (intent.includes("selfie") || intent.includes("car")) {
      return "Lean slightly toward the camera from the front seat, one hand resting softly on the collarbone, chin gently lifted, lips relaxed with a hint of glossed half-smile, conveying triumphant arrival and silent confidence."
    }
    if (intent.includes("cafe") || intent.includes("café")) {
      return "Sit at the café table with spine tall yet relaxed, one arm resting naturally near a wallet and lipstick, other hand delicately holding an espresso cup, gaze directed just past the camera with serene, self-assured expression."
    }
    if (intent.includes("boutique") || intent.includes("store") || intent.includes("rodeo")) {
      return "Stand just outside the boutique with body in slight rotation, one hand resting partially inside the quilted bag, shoulders relaxed, gaze cast subtly over the shoulder in contemplative manner, lips relaxed and posture elegant."
    }
    return "Natural confident pose – weight slightly shifted to one leg, shoulders open, one hand interacting with bag or jewelry, gaze soft yet focused, expression serene and assured rather than overtly posed."
  }

  // Dior – softer gestures
  if (intent.includes("twirl") || intent.includes("dress") || intent.includes("gown")) {
    return "Light twirl of the dress, one hand gathering a portion of the skirt, head turned slightly toward the light with soft, dreamy expression."
  }
  return "Graceful pose with relaxed shoulders, one hand touching the fabric of the dress or resting on a balcony rail, gaze gentle and introspective, lips relaxed in a soft, romantic expression."
}

// ---------- Chanel Editorial Template ----------

export const CHANEL_EDITORIAL: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.CHANEL } = {
  id: "chanel_editorial",
  name: "Chanel - Luxury Editorial Portrait",
  brandProfile: BRAND_PROFILES.CHANEL,
  description:
    "High-fashion editorial portrait for Chanel, with precise styling, environment and lighting worthy of a luxury campaign.",
  useCases: [
    "Luxury fashion campaigns",
    "Editorial portraits",
    "High-end Instagram content",
    "Boutique storytelling",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const environment = generateLuxuryEnvironment(context, "chanel")
    const accessories = generateChanelAccessories(context)
    const lighting = generateEditorialLighting(context, "chanel")
    const mood = generateLuxuryMood(context, "chanel")
    const pose = generateLuxuryPose(context, "chanel")

    return `Maintain rigorously the characteristics of the woman in Image 1 (face, body, skin tone, hair, and visual identity). Do not copy the attached photo.

Fashion editorial portrait captured ${environment}.

**OUTFIT & STYLING:**
Structured Chanel tweed blazer in warm neutral or black-and-cream palette with classic golden buttons, combined with a fine silk blouse in a light tone and tailored shorts or skirt, creating a refined and timeless contrast between textures. Fabrics include bouclé tweed with subtle frayed finish, silk that falls softly, and precise tailoring that defines the silhouette without exaggeration. Styling is balanced and faithful to contemporary French fashion aesthetic: nothing feels costume-like, everything reads as effortlessly luxurious.

**HAIR & ACCESSORIES:**
Polished hair held in a low sleek bun or chignon, reinforcing the clean sophistication of the look. ${accessories} Details should feel layered and intentional rather than overloaded, always reinforcing Chanel codes with restraint.

**POSE & EXPRESSION:**
${pose}
Expression remains serene and assured – no exaggerated smile – with relaxed lips and subtle eye focus, projecting silent confidence and timeless elegance.

**ENVIRONMENT:**
Marble floors or refined stone surfaces appear in the background, with architectural lines and boutique details providing depth without visual noise. Background is softly blurred yet still recognizable as a luxury environment connected to the Chanel universe, framing the subject rather than competing with her.

**LIGHTING:**
${lighting} Light should gently sculpt tweed, silk and jewelry, maintaining real skin texture (pores, natural highlights) and avoiding plastic or over-retouched appearance.

**TECHNICAL:**
Camera feel of a 50mm lens in vertical 2:3 framing, medium to full-body composition with editorial crop that leaves breathing room around the silhouette. Subtle long-lens compression and carefully controlled focus separate subject from background while preserving architectural depth.

**AESTHETIC:**
Luxury urban editorial inspired by the Chanel universe — classic, modern and absolutely timeless, with multiple Chanel touchpoints (blazer buttons, iconic bag, jewelry) visible in the same frame, and an overall mood of ${mood}, without staged advertising appearance.`.trim()
  },
  variations: [
    {
      name: "CHANEL_NIGHT_GLAMOUR",
      moodAdjustment:
        "Luxurious evening glamour for cocktail party or night event, sophisticated and discreetly dramatic.",
      lightingAdjustment:
        "Studio flash or controlled artificial light at night, with soft reflections on velvet, pearls and jewelry, against a dark, slightly textured background.",
      styleKeywords:
        "black velvet blouse, long double-strand pearl necklace, CC embroidery near the neck, red lipstick, long defined lashes, snowy night scene with twinkling lights outside.",
    },
    {
      name: "CHANEL_BOLD_ATTITUDE",
      moodAdjustment:
        "Bold luxury, logo-loaded and attitude-driven, conveying absolute confidence and dominant fashion energy.",
      lightingAdjustment:
        "Direct flash against neutral background, high contrast with sharp contours and reflective surfaces, preserving real skin texture.",
      styleKeywords:
        "black leather jacket falling off shoulders, beige Chanel headband with visible logo, dramatic black sunglasses, layered gold chokers, CC pendant and multiple bold rings.",
    },
    {
      name: "CHANEL_BOUTIQUE_EDITORIAL",
      environmentFocus:
        "Exterior of a luxury Chanel boutique with softly blurred awning, polished marble floors and refined architecture in the background.",
      actionChange:
        "Medium-body framing outside the store, one hand resting discreetly inside the quilted bag, body in slight rotation with contemplative gaze over the shoulder.",
    },
    {
      name: "CHANEL_LIFESTYLE_CASUAL",
      environmentFocus:
        "Spontaneous lifestyle scenes: Rodeo Drive street shot, Parisian café table or luxury SUV interior captured in iPhone style.",
      moodAdjustment:
        "Contemporary luxury lifestyle, urban naturalness, confident yet spontaneous, without staged advertising appearance.",
      styleKeywords:
        "cropped blazer with golden buttons, headband logo, sunglasses, iced latte, wallet on café table, or layered jewelry visible in car selfie.",
    },
    {
      name: "CHANEL_INTERIOR_LUXURY",
      environmentFocus:
        "Five-star Parisian hotel room or intimate fireplace setting with bouclé armchair and Chanel gift box or shopping bag as part of the scene.",
      lightingAdjustment:
        "Warm firelight or late-afternoon window light, creating cozy yet elegant atmosphere with soft shadows on fabrics and skin.",
      styleKeywords:
        "cream cashmere turtleneck, satin mini skirt or knit sweater with bare legs, Chanel gift box with white grosgrain ribbon opened naturally on lap.",
    },
  ] satisfies PromptVariation[],
}

// ---------- Dior Romantic Template ----------

export const DIOR_ROMANTIC: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.DIOR } = {
  id: "dior_romantic",
  name: "Dior - Romantic Couture Scene",
  brandProfile: BRAND_PROFILES.DIOR,
  description:
    "Romantic haute couture-inspired scene for Dior, with soft lighting, flowing fabrics and dreamlike atmosphere.",
  useCases: [
    "Romantic fashion content",
    "Haute couture campaigns",
    "Editorial dream sequences",
    "Luxury garden portraits",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const environment = generateLuxuryEnvironment(context, "dior")
    const lighting = generateEditorialLighting(context, "dior")
    const mood = generateLuxuryMood(context, "dior")
    const pose = generateLuxuryPose(context, "dior")

    return `Maintain exactly the characteristics of the woman in Image 1 (face, body, skin tone, hair and visual identity). Do not copy the attached photo.

Romantic haute couture portrait captured ${environment}, evoking the cinematic universe of Dior.

**OUTFIT & FABRICS:**
Flowing couture dress or coordinated skirt-and-top silhouette in soft pastels – blush pink, ivory, dove gray or muted lilac – with delicate embroidery, tulle or chiffon that moves gently with the breeze. The waist is defined but comfortable, with refined pleats and subtle draping that frame the body without exaggeration. Fabrics should feel luxurious and tactile: silk organza, fine tulle, lace panels or satin ribbons that catch the light in a gentle, dreamy way.

**HAIR, MAKEUP & ACCESSORIES:**
Hair styled in soft waves or a relaxed low bun, with loose strands framing the face naturally. Makeup emphasizes luminous skin, rosy cheeks and soft lip color, avoiding heavy contouring. Accessories remain delicate – thin bracelets, small earrings or a single statement ring – always supporting the romantic narrative without overwhelming the silhouette.

**POSE & EXPRESSION:**
${pose}
Expression is gentle and contemplative, as if caught in a quiet moment between movements – eyes slightly softened, mouth relaxed, conveying ${mood}.

**ENVIRONMENT & DEPTH:**
Surroundings suggest refined elegance without stealing focus: blurred garden foliage, sculpted stone balustrades, classic moldings or sheer curtains moving softly in the background. Depth is created through layers of foreground and background elements, but the frame remains clean and readable.

**LIGHTING:**
${lighting} Highlights on fabric folds and hair strands should feel natural and airy, with no harsh contrast or clinical sharpness.

**TECHNICAL & COMPOSITION:**
Camera feel of a 50mm or slightly longer lens in vertical 2:3 composition, framed from mid-thigh to just above the head or as a graceful three-quarter portrait. Focus is precise on the eyes and upper face, with soft fall-off into dress and environment.

**AESTHETIC:**
Dior-inspired romantic femininity – soft glamour, refined and dreamlike – as if it were a frame from a modern couture campaign, balancing fantasy and authenticity.`.trim()
  },
  variations: [
    {
      name: "GARDEN_GOLDEN_HOUR",
      environmentFocus:
        "Romantic garden at golden hour with soft blossoms, stone pathways and filtered sunlight through leaves.",
      lightingAdjustment:
        "Warm golden hour light with gentle flares and elongated shadows, enhancing the pastel color palette.",
    },
    {
      name: "INTERIOR_SALON",
      environmentFocus:
        "Elegant interior salon with tall windows, sheer curtains and classic moldings, echoing couture showrooms.",
      moodAdjustment:
        "Quiet, introspective moment before or after an event, calm but emotionally rich.",
    },
    {
      name: "BALCONY_EVENING_BREEZE",
      environmentFocus:
        "Stone balcony overlooking Parisian rooftops at blue hour, with subtle city lights appearing in the distance.",
      lightingAdjustment:
        "Soft, cool-toned evening light mixing with warm interior spill, creating nuanced tonal contrast on fabrics and skin.",
    },
  ] satisfies PromptVariation[],
}

export const LUXURY_BRANDS = {
  CHANEL_EDITORIAL,
  DIOR_ROMANTIC,
} satisfies Record<string, PromptTemplate>
