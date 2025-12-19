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

    return `Model maintains only the natural physical characteristics from Image 1 (face, body, skin tone, hair and visual identity), without copying the original photo. Do not copy pose, setting or identical items.

Model kneeling or interacting near a decorated silver or white Christmas tree, holding a transparent ornament or delicate decorative element.

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

// ---------- Additional Christmas/Holiday Templates ----------

export const CHRISTMAS_MORNING_COZY: PromptTemplate = {
  id: "christmas_morning_cozy",
  name: "Christmas Morning Cozy",
  description:
    "Peaceful Christmas morning portrait with tree, morning light and cozy sweater aesthetic.",
  useCases: [
    "Christmas morning content",
    "Holiday lifestyle imagery",
    "Cozy Christmas campaigns",
    "Morning holiday lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Illuminated brown hair, long, with soft waves and natural volume. Without altering eye color, features or skin tone. Hyper-realistic.

Scene: woman seated on floor beside decorated Christmas tree with warm golden lights, morning light streaming through window.

**OUTFIT & STYLING:**
Cream cable knit oversized sweater + matching lounge pants. Accessories: delicate gold jewelry, holding white ceramic mug with steam.

**POSE & EXPRESSION:**
Legs crossed, leaning against couch, natural relaxed expression with soft smile.

**LIGHTING:**
Soft natural morning light + warm Christmas tree lights creating golden glow.

**ENVIRONMENT:**
Modern living room, wrapped presents in background, cozy minimalist aesthetic.

**CAMERA:**
Camera at approximately 1.5m, 50mm lens, focus on face.

**MOOD:**
Peaceful luxury, Christmas morning elegance – cozy and sophisticated holiday moment.`.trim()
  },
}

export const CHRISTMAS_HOLIDAY_SHOPPING: PromptTemplate = {
  id: "christmas_holiday_shopping",
  name: "Holiday Shopping Elegance",
  description:
    "Sophisticated holiday shopping portrait with snowy city street and luxury bags.",
  useCases: [
    "Holiday shopping content",
    "Winter street style imagery",
    "Christmas shopping campaigns",
    "Luxury holiday lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain exactly same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, polished waves with volume, soft shine. Without altering features, skin tone. Hyper-realistic.

Scene: woman standing on snowy city street with holiday window displays and lights in background.

**OUTFIT & STYLING:**
Camel wool coat, black turtleneck, straight black pants, black leather boots. Accessories: luxury shopping bags (red, gold, white), beige leather gloves, gold watch.

**POSE & EXPRESSION:**
Standing confidently, bags in one hand, looking over shoulder at camera with elegant smile.

**LIGHTING:**
Warm street lighting mixed with cold winter daylight, bokeh from holiday lights.

**ENVIRONMENT:**
Luxury shopping district, decorated storefronts, light snow falling.

**CAMERA:**
Camera at 1.8m distance, 85mm lens, American shot.

**MOOD:**
Sophisticated holiday shopping, old money winter elegance – luxury winter street style.`.trim()
  },
}

export const CHRISTMAS_ELEGANT_DINNER: PromptTemplate = {
  id: "christmas_elegant_dinner",
  name: "Elegant Holiday Dinner",
  description:
    "Luxury holiday dinner portrait with fine china, candles and sophisticated atmosphere.",
  useCases: [
    "Holiday dinner content",
    "Entertaining lifestyle imagery",
    "Christmas dinner campaigns",
    "Luxury holiday entertaining",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Illuminated brown hair, elegant updo with loose romantic pieces. Without altering features or skin tone. Hyper-realistic.

Scene: woman seated at elegant dinner table with gold candlesticks, evergreen centerpiece, and fine china.

**OUTFIT & STYLING:**
Emerald green silk slip dress with delicate straps, elegant draping. Accessories: gold statement earrings, layered delicate necklaces, champagne glass in hand.

**POSE & EXPRESSION:**
Seated gracefully, one arm resting on table, looking at camera with sophisticated expression.

**LIGHTING:**
Warm candlelight creating soft glow on face, ambient room lighting.

**ENVIRONMENT:**
Elegant dining room, Christmas tree softly lit in background.

**CAMERA:**
Camera at 1.2m distance, 50mm lens, upper body shot.

**MOOD:**
Luxury holiday entertaining, timeless sophistication – elegant dinner moment.`.trim()
  },
}

export const CHRISTMAS_WINTER_WHITE: PromptTemplate = {
  id: "christmas_winter_white",
  name: "Winter White Elegance",
  description:
    "Clean white Christmas portrait with silver ornaments and Scandinavian aesthetic.",
  useCases: [
    "White Christmas content",
    "Scandinavian holiday imagery",
    "Minimalist Christmas campaigns",
    "Clean holiday lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, long loose waves with natural shine. Hyper-realistic.

Scene: woman standing in front of decorated white Christmas tree with silver and crystal ornaments.

**OUTFIT & STYLING:**
Ivory cashmere sweater dress, knee-length, soft texture, paired with nude heels. Accessories: silver jewelry, holding small wrapped gift box with white ribbon.

**POSE & EXPRESSION:**
Standing with slight hip tilt, one hand holding gift, other hand relaxed at side, serene expression.

**LIGHTING:**
Soft diffused lighting from tree and room, creating ethereal white-on-white aesthetic.

**ENVIRONMENT:**
Minimalist modern space, all-white décor, crystal ornaments catching light.

**CAMERA:**
Camera at 1.5m, 50mm lens, full body composition.

**MOOD:**
Clean luxury, Scandinavian Christmas aesthetic – minimalist and sophisticated.`.trim()
  },
}

export const CHRISTMAS_FIRESIDE_READING: PromptTemplate = {
  id: "christmas_fireside_reading",
  name: "Fireside Christmas Reading",
  description:
    "Intimate fireside portrait with book, fireplace and cozy holiday atmosphere.",
  useCases: [
    "Fireside lifestyle content",
    "Reading holiday imagery",
    "Cozy Christmas campaigns",
    "Intimate holiday lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Illuminated brown hair, natural waves, cozy styling. Without altering features. Hyper-realistic.

Scene: woman curled up in armchair beside fireplace, Christmas tree in corner of frame.

**OUTFIT & STYLING:**
Burgundy cashmere sweater, cream wool pants, fuzzy socks. Accessories: reading glasses resting in hair, book in lap, tea cup on side table.

**POSE & EXPRESSION:**
Legs tucked under, relaxed into chair, natural contemplative expression.

**LIGHTING:**
Warm firelight from side, soft ambient room lighting, Christmas lights in background.

**ENVIRONMENT:**
Cozy home library or living room, stockings hung, wrapped presents visible.

**CAMERA:**
Camera at 1.2m, 35mm lens, environmental portrait.

**MOOD:**
Intimate holiday luxury, quiet moment – cozy and peaceful fireside scene.`.trim()
  },
}

export const CHRISTMAS_HOLIDAY_BAKING: PromptTemplate = {
  id: "christmas_holiday_baking",
  name: "Holiday Baking Scene",
  description:
    "Luxury kitchen baking portrait with marble counters and holiday decorations.",
  useCases: [
    "Holiday baking content",
    "Kitchen lifestyle imagery",
    "Christmas baking campaigns",
    "Domestic luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, pulled back in casual elegant bun with loose pieces. Hyper-realistic.

Scene: woman in beautiful kitchen with marble counters, Christmas décor, flour dusted on counter.

**OUTFIT & STYLING:**
White linen apron over cream ribbed sweater. Accessories: gold jewelry, holding wooden spoon, mixing bowl visible.

**POSE & EXPRESSION:**
Leaning against counter, looking at camera with genuine warm smile, flour on hands.

**LIGHTING:**
Natural window light plus warm kitchen pendants, cozy domestic atmosphere.

**ENVIRONMENT:**
Luxury kitchen with greenery garland, copper cookware, holiday decorations.

**CAMERA:**
Camera at 1m, 50mm lens, waist-up composition.

**MOOD:**
Domestic elegance, lifestyle luxury, holiday traditions – sophisticated baking moment.`.trim()
  },
}

export const CHRISTMAS_NYE_ELEGANCE: PromptTemplate = {
  id: "christmas_nye_elegance",
  name: "Champagne New Year's Eve",
  description:
    "Glamorous New Year's Eve portrait with sequined dress and celebration atmosphere.",
  useCases: [
    "New Year's Eve content",
    "NYE celebration imagery",
    "Holiday party campaigns",
    "Glamorous evening lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, glamorous waves, polished styling. Hyper-realistic.

Scene: woman at elegant celebration, NYE décor with gold and black balloons in background.

**OUTFIT & STYLING:**
Sequined gold mini dress with structured shoulders, sophisticated cut. Accessories: gold strappy heels, statement earrings, champagne flute in hand.

**POSE & EXPRESSION:**
Standing with slight turn, champagne raised slightly, confident celebratory expression.

**LIGHTING:**
Dramatic lighting with golden highlights, bokeh from party lights and decorations.

**ENVIRONMENT:**
Upscale party venue or penthouse, city lights visible through windows.

**CAMERA:**
Camera at 1.5m, 85mm lens, portrait composition.

**MOOD:**
New Year's elegance, celebration luxury, glamorous evening – sophisticated NYE moment.`.trim()
  },
}

export const CHRISTMAS_WINTER_OUTDOOR: PromptTemplate = {
  id: "christmas_winter_outdoor",
  name: "Winter Outdoor Portrait",
  description:
    "Winter outdoor portrait with snow, evergreen trees and holiday lights.",
  useCases: [
    "Winter outdoor content",
    "Snowy holiday imagery",
    "Outdoor Christmas campaigns",
    "Winter lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, loose under beige knit beanie, natural waves. Hyper-realistic.

Scene: woman outdoors in winter setting with snow-covered evergreen trees and holiday lights.

**OUTFIT & STYLING:**
Long cream wool coat, cream cable knit scarf, leather gloves. Accessories: holding to-go coffee cup, small shopping bag with ribbon handles.

**POSE & EXPRESSION:**
Walking toward camera, natural movement, genuine smile, rosy cheeks from cold.

**LIGHTING:**
Golden hour winter light, soft glow on face, twinkling lights in background.

**ENVIRONMENT:**
Snowy town square or park, decorated lamp posts, festive atmosphere.

**CAMERA:**
Camera at 1.8m, 85mm lens, upper body shot.

**MOOD:**
Winter luxury lifestyle, holiday joy, outdoor elegance – festive winter moment.`.trim()
  },
}

export const CHRISTMAS_GIFT_WRAPPING: PromptTemplate = {
  id: "christmas_gift_wrapping",
  name: "Gift Wrapping Elegance",
  description:
    "Sophisticated gift wrapping scene with luxury supplies and organized aesthetic.",
  useCases: [
    "Gift wrapping content",
    "Holiday preparation imagery",
    "Christmas preparation campaigns",
    "Domestic luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, natural waves, casual elegant styling. Hyper-realistic.

Scene: woman seated at table surrounded by luxury gift wrapping supplies, ribbon, and wrapped boxes.

**OUTFIT & STYLING:**
Soft grey cashmere sweater, delicate gold necklaces layered. Accessories: scissors in hand, rolls of silk ribbon, designer shopping bags nearby.

**POSE & EXPRESSION:**
Focused on wrapping gift, natural concentration, looking down at work with slight smile.

**LIGHTING:**
Soft natural light from window, warm ambient light, clean bright aesthetic.

**ENVIRONMENT:**
White marble or wood table, organized wrapping station, minimalist elegant.

**CAMERA:**
Camera at 1m, 50mm lens, overhead angle slightly tilted.

**MOOD:**
Thoughtful luxury, preparation ritual, domestic sophistication – elegant gift wrapping moment.`.trim()
  },
}

export const CHRISTMAS_TRAVEL_READY: PromptTemplate = {
  id: "christmas_travel_ready",
  name: "Christmas Travel Ready",
  description:
    "Luxury holiday travel portrait with designer luggage and airport terminal.",
  useCases: [
    "Holiday travel content",
    "Christmas travel imagery",
    "Luxury travel campaigns",
    "Holiday jet-set lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, polished low bun or sleek ponytail. Hyper-realistic.

Scene: woman in airport or private terminal with Christmas decorations, luggage beside her.

**OUTFIT & STYLING:**
Camel wool coat, white turtleneck, tailored trousers, ankle boots. Accessories: Louis Vuitton luggage, passport in hand, designer handbag, aviator sunglasses.

**POSE & EXPRESSION:**
Standing beside luggage, confident travel pose, looking at camera with excited expression.

**LIGHTING:**
Bright airport lighting, natural window light, clean professional look.

**ENVIRONMENT:**
Modern terminal with holiday décor, decorated tree in background.

**CAMERA:**
Camera at 1.5m, 50mm lens, full body shot.

**MOOD:**
Luxury holiday travel, jet-set lifestyle, sophisticated wanderlust – elegant travel moment.`.trim()
  },
}

export const CHRISTMAS_VELVET_ELEGANCE: PromptTemplate = {
  id: "christmas_velvet_elegance",
  name: "Velvet Holiday Elegance",
  description:
    "Old money Christmas portrait with velvet, fireplace and timeless elegance.",
  useCases: [
    "Luxury Christmas content",
    "Old money holiday imagery",
    "Traditional Christmas campaigns",
    "Timeless holiday lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, Hollywood waves, glamorous volume. Hyper-realistic.

Scene: woman on velvet emerald green sofa with Christmas tree and fireplace in background.

**OUTFIT & STYLING:**
Deep burgundy velvet blazer, black silk camisole, tailored black pants. Accessories: gold jewelry, holding crystal wine glass, designer heels.

**POSE & EXPRESSION:**
Seated elegantly, legs crossed, one arm on sofa back, sophisticated evening expression.

**LIGHTING:**
Warm firelight mixed with Christmas tree lights, creating luxurious ambiance.

**ENVIRONMENT:**
Traditional luxury living room, rich textures, classic holiday décor.

**CAMERA:**
Camera at 1.2m, 85mm lens, seated portrait.

**MOOD:**
Old money Christmas, timeless elegance, intimate luxury – sophisticated evening moment.`.trim()
  },
}

export const CHRISTMAS_SNOW_DAY: PromptTemplate = {
  id: "christmas_snow_day",
  name: "Snow Day Luxury",
  description:
    "Peaceful snow day portrait with window, hot chocolate and cozy aesthetic.",
  useCases: [
    "Snow day content",
    "Winter cozy imagery",
    "Holiday cozy campaigns",
    "Peaceful winter lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, natural loose waves. Hyper-realistic.

Scene: woman by large window with snow falling outside, holding hot chocolate with marshmallows.

**OUTFIT & STYLING:**
Oversized cream chunky knit cardigan, white thermal top, soft lounge pants. Accessories: fuzzy slippers, cozy blanket draped over shoulders, minimalist jewelry.

**POSE & EXPRESSION:**
Standing by window, looking outside, profile to 3/4 angle, peaceful contemplative expression.

**LIGHTING:**
Soft diffused natural light from snowy day, bright clean aesthetic.

**ENVIRONMENT:**
Modern minimalist home, window seat, simple elegant holiday touches.

**CAMERA:**
Camera at 1m, 50mm lens, window light portrait.

**MOOD:**
Quiet luxury, peaceful winter day, cozy sophistication – serene snow day moment.`.trim()
  },
}

export const SEASONAL_CHRISTMAS = {
  CATEGORY: SEASONAL_CHRISTMAS_CATEGORY,
  CHRISTMAS_COZY_LUXURY,
  CHRISTMAS_PINTEREST_EDITORIAL,
  CHRISTMAS_ELEGANT_EVENING,
  CHRISTMAS_WHITE_MINIMAL,
  CHRISTMAS_MORNING_COZY,
  CHRISTMAS_HOLIDAY_SHOPPING,
  CHRISTMAS_ELEGANT_DINNER,
  CHRISTMAS_WINTER_WHITE,
  CHRISTMAS_FIRESIDE_READING,
  CHRISTMAS_HOLIDAY_BAKING,
  CHRISTMAS_NYE_ELEGANCE,
  CHRISTMAS_WINTER_OUTDOOR,
  CHRISTMAS_GIFT_WRAPPING,
  CHRISTMAS_TRAVEL_READY,
  CHRISTMAS_VELVET_ELEGANCE,
  CHRISTMAS_SNOW_DAY,
} satisfies Record<string, unknown>
