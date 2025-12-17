// Seasonal Christmas / Holiday high-end templates
// Cozy luxury + Pinterest editorial aesthetic for November–December campaigns.

import type { PromptTemplate, PromptContext, PromptVariation } from "../types"

// ---------- Seasonal category metadata ----------

export interface SeasonalChristmasCategory {
  id: "SEASONAL_CHRISTMAS"
  label: string
  colorPalette: string[]
  signatureProps: string[]
  outfits: string[]
  settings: string[]
  hair: string[]
  lighting: string[]
  mood: string[]
  timing: {
    peakStart: string
    peakEnd: string
    contentTypes: string[]
    commerceNotes: string
    emotionalHooks: string[]
  }
}

export const SEASONAL_CHRISTMAS_CATEGORY: SeasonalChristmasCategory = {
  id: "SEASONAL_CHRISTMAS",
  label: "Christmas / Holiday Cozy Luxury",
  colorPalette: ["red", "white", "gold", "soft pink", "silver"],
  signatureProps: [
    "hot chocolate with marshmallows",
    "mugs with whipped cream and cinnamon",
    "gift boxes and ribbons",
    "ornaments and transparent baubles",
    "plush blankets and soft pillows",
  ],
  outfits: [
    "candy cane striped pajamas",
    "red knit dresses",
    "satin pajamas and loungewear",
    "velvet athleisure sets",
    "white oversized sweater dresses with long knit socks",
  ],
  settings: [
    "living rooms with fireplaces and garlands",
    "kitchens decorated with red arrangements",
    "marble interiors with decorated white trees",
    "staircases with white marble and golden railings",
    "cozy corners beside Christmas trees",
  ],
  hair: [
    "buns with red velvet bows",
    "loose waves with volume",
    "soft strands framing the face",
  ],
  lighting: [
    "bokeh from Christmas tree lights",
    "warm golden tones",
    "fireplace glow",
    "soft diffused indoor cinematic light",
  ],
  mood: [
    "cozy luxury",
    "Pinterest Christmas editorial",
    "sophisticated feminine",
    "warm, nostalgic and romantic",
  ],
  timing: {
    peakStart: "November 1",
    peakEnd: "December 25",
    contentTypes: [
      "gift guides",
      "holiday entertaining",
      "cozy home moments",
      "party looks and evening portraits",
    ],
    commerceNotes:
      "Align imagery with holiday shopping season – ideal for lookbooks, gift guides, and campaign hero images.",
    emotionalHooks: ["nostalgia", "family", "celebration", "warmth", "comfort"],
  },
}

// ---------- Helper functions for Christmas aesthetics ----------

export function generateChristmasProps(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()
  const parts: string[] = []

  // Hot chocolate is the recurring hero prop
  parts.push(
    "ceramic mug of hot chocolate topped with marshmallows, visible steam and small details like cinnamon or chocolate shavings",
  )

  if (intent.includes("kitchen") || intent.includes("baking")) {
    parts.push(
      "baking tray or marble board with cookies or Christmas treats, placed casually on counter as part of the scene",
    )
  }

  if (intent.includes("sofa") || intent.includes("living room") || intent.includes("pillow")) {
    parts.push("soft neutral or red pillow held close to body, adding cozy, tactile element to the composition")
  }

  if (intent.includes("gift") || intent.includes("present") || intent.includes("box")) {
    parts.push(
      "elegant gift boxes with satin ribbons, stacked or placed around, suggesting wrapping or unwrapping moment",
    )
  }

  if (intent.includes("ornament") || intent.includes("bauble")) {
    parts.push(
      "transparent or metallic ornament delicately held between fingers, catching light like a small gemstone",
    )
  }

  return `${parts.join("; ")}.`
}

export function generateChristmasOutfits(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("pajama") || intent.includes("pyjama") || intent.includes("stripe")) {
    return "candy cane striped pajamas in red and white, classic Christmas pattern with comfortable yet flattering fit"
  }

  if (intent.includes("athleisure") || intent.includes("velvet")) {
    return "velvet athleisure set – zip hoodie and shorts or joggers in deep red or burgundy, soft texture clearly visible"
  }

  if (intent.includes("evening") || intent.includes("party") || intent.includes("dress")) {
    return "structured red or black satin dress, possibly with lace gloves or statement bow detail, creating elevated holiday evening look"
  }

  if (intent.includes("white") || intent.includes("minimal")) {
    return "white oversized mini sweater dress with long knit socks, cozy minimal look without traditional red"
  }

  return "comfort-luxury Christmas outfit – red knit dress, satin pajamas or velvet loungewear that feels both cozy and elevated"
}

export function generateChristmasSettings(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("living room") || intent.includes("sofa") || intent.includes("fireplace")) {
    return "cozy living room with lit fireplace, garland on mantel and warm yellow fairy lights woven through greenery"
  }

  if (intent.includes("kitchen")) {
    return "modern kitchen decorated for Christmas, with red floral arrangements, candles and subtle festive decor on marble or stone counters"
  }

  if (intent.includes("marble") || intent.includes("luxury") || intent.includes("staircase")) {
    return "luxurious marble interior – either beside a decorated white tree or on a white marble staircase with golden railing"
  }

  if (intent.includes("tree") || intent.includes("christmas tree")) {
    return "space near a decorated Christmas tree – either classic green tree with red bows or large super-illuminated white tree with silver ornaments"
  }

  return "warm interior decorated for Christmas, with combination of fireplace, garlands, tree lights and subtle gift elements"
}

export function generateChristmasLighting(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("bokeh") || intent.includes("tree")) {
    return "soft cinematic lighting with strong bokeh from Christmas tree lights in the background, warm golden tones enveloping the scene"
  }

  if (intent.includes("fireplace") || intent.includes("fire")) {
    return "fireplace glow mixed with soft ambient light, creating warm highlights on skin and knit textures, with gentle shadows and intimate atmosphere"
  }

  if (intent.includes("editorial") || intent.includes("portrait")) {
    return "soft glam studio-style lighting adapted to living room or interior, with warm undertones and smooth falloff around the subject"
  }

  return "soft diffused indoor lighting in warm yellow and golden tones, reinforcing cozy Christmas lifestyle vibe while preserving real skin texture"
}

export function generateChristmasHair(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("bow") || intent.includes("bun")) {
    return "hair pulled into an elegant bun decorated with a large red velvet bow, with two soft strands framing the face"
  }

  if (intent.includes("white bow")) {
    return "hair pulled back neatly with a large white bow, keeping focus on face and sweater dress"
  }

  return "brown hair styled in natural waves with volume, or pulled into a chic bun with a few loose strands for softness"
}

export function generateChristmasMood(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("pinterest") || intent.includes("editorial")) {
    return "Pinterest Christmas editorial – feminine, cinematic and highly shareable, yet still grounded in real textures and warmth"
  }

  if (intent.includes("party") || intent.includes("evening")) {
    return "sophisticated evening mood – strong, feminine and elegant, ideal for party looks and holiday campaigns"
  }

  if (intent.includes("minimal") || intent.includes("white")) {
    return "fresh, clean Christmas mood – modern, airy and slightly Nordic, with emphasis on white, silver and soft light"
  }

  return "cozy luxury holiday feeling – warm, nostalgic and comforting, with just enough polish to feel aspirational"
}

// ---------- Templates ----------

export const CHRISTMAS_COZY_LUXURY: PromptTemplate = {
  id: "christmas_cozy_luxury",
  name: "Christmas Cozy Luxury Living",
  description:
    "Cozy Christmas living room / kitchen / marble setting with warm lights and comfort-luxury styling.",
  useCases: [
    "Living room holiday content",
    "Kitchen hot chocolate moments",
    "Luxury marble Christmas campaigns",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const setting = generateChristmasSettings(context)
    const outfit = generateChristmasOutfits(context)
    const props = generateChristmasProps(context)
    const lighting = generateChristmasLighting(context)
    const hair = generateChristmasHair(context)
    const mood = generateChristmasMood(context)

    return `Cozy Christmas ${setting} with warm yellow and golden lights.

Woman maintaining exact characteristics from Image 1 (skin tone, body proportions, hair and facial identity), without copying the original photo.

**OUTFIT:**
${outfit}, styled in a comfort-luxury aesthetic that feels relaxed but visually elevated for the holidays.

**ACTIVITY & PROPS:**
${props}
Gesture should feel natural – hands wrapped around the mug or resting on a soft pillow or marble surface – never stiff or overly posed.

**SETTING DETAILS:**
${setting}, with red arrangements, warm lights and discreet gift elements integrated into the scene. Details like garland on fireplace, white or green decorated tree, or marble surfaces with candles subtly reinforce the festive atmosphere.

**HAIR & STYLING:**
${hair}
Hair texture, shine and volume should feel real, catching warm reflections from the room lighting.

**EXPRESSION:**
Sweet and natural expression with light smile or soft, serene look. Relaxed posture conveying comfortable elegance – as if enjoying a quiet holiday moment at home.

**LIGHTING:**
${lighting}
Light reinforces cozy luxury aesthetic and Christmas lifestyle feeling, with visible skin texture, knit details and gentle glow.

**CAMERA:**
35–50mm lens feel for enough environment context while keeping face and upper body sharp and realistic. Composition can be seated on sofa, beside kitchen counter or near marble details, always prioritizing warmth, texture and authenticity.`.trim()
  },
}

export const CHRISTMAS_PINTEREST_EDITORIAL: PromptTemplate = {
  id: "christmas_pinterest_editorial",
  name: "Christmas Pinterest Editorial Pajamas",
  description:
    "Pinterest-style Christmas editorial with candy cane pajamas, hot chocolate and bokeh tree lights.",
  useCases: [
    "Holiday campaign hero images",
    "Pinterest Christmas content",
    "Cozy pajama editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const lighting = generateChristmasLighting({ ...context, userIntent: `${context.userIntent} bokeh tree` })
    const mood = generateChristmasMood({ ...context, userIntent: `${context.userIntent} pinterest editorial` })

    return `Cozy Christmas setting with illuminated tree and red bows in the background.

Model maintains only the natural physical characteristics from Image 1 (glowing skin, body proportions, hair and facial identity), without copying pose or exact setting.

**SIGNATURE OUTFIT:**
Candy cane striped pajamas in red and white, classic Christmas aesthetic. Fit is comfortable yet flattering, with soft fabric clearly visible.

**HAIR STYLING:**
Hair pulled into chic and sophisticated bun decorated with a large red velvet bow. Two soft strands frame the face naturally, adding softness and romance.

**MAKEUP & EXPRESSION:**
Light glow clean girl style with soft glam finish – luminous skin, subtle highlight on cheekbones and nose, nude or soft pink lips. Elegant closed smile, calm and feminine expression with direct but gentle gaze to camera. Real skin texture with visible pores, no artificial smoothing.

**BACKGROUND:**
Christmas tree with bokeh lights, red bows and silver or metallic ornaments, creating a soft, magical blur behind the model. Background remains softly out of focus but clearly festive.

**LIGHTING:**
${lighting}
Atmosphere feels ${mood}, as if captured for a curated Pinterest board or holiday campaign.

**CAMERA:**
35mm lens for full scene or 50–85mm for more focused portrait, always with sharp focus on face and realistic texture. Framing centers the mug and face, using the hot chocolate cup close to the face as part of the composition, creating an iconic Pinterest Christmas editorial look.`.trim()
  },
}

export const CHRISTMAS_ELEGANT_EVENING: PromptTemplate = {
  id: "christmas_elegant_evening",
  name: "Christmas Elegant Evening Portrait",
  description:
    "Sophisticated Christmas evening portrait with formal styling, tree bokeh and cinematic lighting.",
  useCases: [
    "Holiday party campaigns",
    "Evening lookbooks",
    "Luxury Christmas portraits",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const lighting = generateChristmasLighting({ ...context, userIntent: `${context.userIntent} evening editorial` })
    const mood = generateChristmasMood({ ...context, userIntent: `${context.userIntent} evening party` })

    return `Sophisticated Christmas portrait setting, inspired by luxury holiday campaigns.

Model maintains exactly the natural characteristics from Image 1 (face, body, skin tone, hair), without copying the reference pose.

**FORMAL STYLING:**
Options include structured black satin dress with long lace gloves; couture mini red dress with structured bow; or long red dress with high slit and elegant neckline. Feet in high heels for standing or staircase poses. Shiny long drop earrings or delicate golden jewelry frame the face and neck.

**POSE & EXPRESSION:**
Seated or crouched with elegant posture beside a tree or marble surface; or standing straight on marble staircase with golden railing, one hand resting naturally on the railing. Expression strong and feminine or sophisticated and serene, with direct gaze toward the camera.

**BACKGROUND:**
Christmas tree in bokeh with warm lights; or illuminated white tree with presents; or white marble staircase with golden railing and subtle festive decor. Background remains slightly blurred, emphasizing subject while preserving context.

**HAIR:**
Brown hair in loose waves with polished finish, or pulled into elegant updo, always styled to complement neckline and jewelry.

**LIGHTING:**
${lighting}
Soft glam look with elevated production value – cinematic but still warm and inviting.

**CAMERA:**
50mm lens with distance around 80cm for more intimate framing, or about 1.8m for full-body marble staircase composition. Indoor editorial style, with clean, luxurious rendering worthy of a holiday fashion magazine.`.trim()
  },
}

export const CHRISTMAS_WHITE_MINIMAL: PromptTemplate = {
  id: "christmas_white_minimal",
  name: "Christmas White Minimal Tree Moment",
  description:
    "Modern white-and-silver Christmas aesthetic with minimal, fresh styling and soft editorial light.",
  useCases: [
    "White Christmas campaigns",
    "Minimal holiday content",
    "Clean winter lifestyle posts",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const lighting = generateChristmasLighting({ ...context, userIntent: `${context.userIntent} minimal white` })
    const mood = generateChristmasMood({ ...context, userIntent: `${context.userIntent} minimal white` })

    return `Model kneeling or interacting near a decorated silver or white Christmas tree, holding a transparent ornament or delicate decorative element.

**FRESH AESTHETIC:**
White oversized mini sweater dress paired with long knit socks, emphasizing soft texture and cozy warmth. Hair pulled back with large white bow, focusing attention on face and clean neckline. Overall look stays away from traditional red-and-green palette, leaning into modern, airy Christmas styling.

**SETTING:**
Silver and white decorated tree with minimal, elegant ornaments. Subtle metallic or glass decorations, minimal clutter on floor or around tree, emphasizing negative space and contemporary design.

**MOOD:**
${mood}
Atmosphere feels intimate yet editorial – like a still from a modern holiday campaign shot in a curated apartment.

**LIGHTING:**
${lighting}
Light should create gentle highlights along ornament and sweater texture, with soft falloff into background and no harsh contrasts.

**CAMERA:**
35–50mm lens feel, framing from knees to just above the head or as a three-quarter portrait. Soft focus transitions with dreamy quality, but eyes and ornament remain crisply defined. Overall image reads as fresh, clean approach to Christmas content, perfect for modern Pinterest-style boards and social feeds.`.trim()
  },
}

export const SEASONAL_CHRISTMAS = {
  CATEGORY: SEASONAL_CHRISTMAS_CATEGORY,
  CHRISTMAS_COZY_LUXURY,
  CHRISTMAS_PINTEREST_EDITORIAL,
  CHRISTMAS_ELEGANT_EVENING,
  CHRISTMAS_WHITE_MINIMAL,
} satisfies Record<string, unknown>
