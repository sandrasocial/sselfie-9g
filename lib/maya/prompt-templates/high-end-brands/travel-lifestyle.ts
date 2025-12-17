// Travel & Airport Lifestyle templates – "it girl" aspirational travel aesthetic
// These are lifestyle (not brand-specific) high-end prompts for Studio Pro / Nano Banana flows.

import type { PromptTemplate, PromptContext, PromptVariation } from "../types"

// ---------- Travel Lifestyle Category (non-brand-specific) ----------

export interface TravelLifestyleCategory {
  id: "TRAVEL_LIFESTYLE"
  label: string
  colorPalette: string[]
  props: string[]
  settings: string[]
  mood: string[]
  style: string[]
}

export const TRAVEL_LIFESTYLE_CATEGORY: TravelLifestyleCategory = {
  id: "TRAVEL_LIFESTYLE",
  label: "Travel & Airport Lifestyle",
  colorPalette: [
    "beige",
    "cream",
    "white",
    "soft gray",
    "pastel pink",
    "silver",
  ],
  props: [
    "iced lattes and travel coffee cups",
    "over-ear headphones in neutral or blush tones",
    "rigid suitcases in silver, nude, pastel or light green",
    "soft tote or griffin bags stacked on luggage",
    "boarding passes and passports used as accessories",
  ],
  settings: [
    "airport lounges and quiet waiting areas",
    "terminal window seats with runway view",
    "modern airport lobbies with glass skylights",
    "boarding gates with geometric carpets",
  ],
  mood: [
    "quiet luxury",
    "calm travel confidence",
    "aspirational wanderlust",
    "serene pre-boarding moment",
  ],
  style: [
    "it girl travel aesthetic",
    "influencer casual",
    "airport chic",
    "effortless luxury with relatable details",
  ],
}

// ---------- Helper functions for travel aesthetics ----------

export function generateAirportAccessories(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()
  const segments: string[] = []

  segments.push(
    "over-ear headphones in neutral or blush tone (silver, white or soft pink), resting comfortably over hair or around neck",
  )
  segments.push(
    "iced latte or takeaway travel coffee cup in one hand, used as part of the pose, with visible condensation or lid detail",
  )
  segments.push("gold watch and delicate rings catching light when hands move")

  if (intent.includes("sunglasses")) {
    segments.push("optional sunglasses with soft pastel or gradient lenses, either resting on head or held in hand")
  }

  if (intent.includes("passport") || intent.includes("boarding pass")) {
    segments.push(
      "boarding pass and folded passport used as styling elements, held near face or chest, with subtle reflections on paper edges",
    )
  }

  return `${segments.join("; ")}.`
}

export function generateLuggageDetails(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()
  const pieces: string[] = []

  pieces.push(
    "rigid suitcase in quiet-luxury color (silver, pink-blush, light green or graphite), with realistic texture and metallic reflections",
  )
  pieces.push(
    "soft tote or griffin-style bag resting on top of suitcase, with minimalist logo and structured handles",
  )

  if (intent.includes("keychain") || intent.includes("teddy")) {
    pieces.push("teddy bear keychain or small charm hanging naturally from bag handle")
  }

  if (intent.includes("duffel") || intent.includes("weekend")) {
    pieces.push("additional duffel bag positioned behind or to the side, reinforcing practical travel mood")
  }

  return `${pieces.join("; ")}.`
}

export function generateAirportEnvironment(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("lounge")) {
    return "a minimalist airport lounge with comfortable armchairs, low tables and soft neutral tones, framed by tall windows"
  }
  if (intent.includes("gate") || intent.includes("boarding")) {
    return "a boarding gate area with rows of modern seats, geometric carpet and partial view of the boarding corridor"
  }
  if (intent.includes("window") || intent.includes("runway")) {
    return "a terminal window seat with floor-to-ceiling glass overlooking the runway and distant planes in soft blur"
  }
  if (intent.includes("lobby")) {
    return "a modern airport lobby with glass skylights above, polished floor and tall structural columns creating depth"
  }

  return "an airport waiting area with contemporary seating, geometric carpet and large windows letting natural light in"
}

export function generateTravelLighting(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("golden hour") || intent.includes("sunset")) {
    return "brilliant golden sunlight entering through terminal glass, creating soft halo along jawline and hair, with diffused reflections on windows and metallic luggage"
  }
  if (intent.includes("morning")) {
    return "soft morning daylight filtered through tall terminal windows, evenly illuminating face, knit textures and luggage details"
  }
  if (intent.includes("night") || intent.includes("blue light")) {
    return "cooler terminal light from overhead fixtures mixed with faint blue daylight, creating subtle reflections on glass and polished floor"
  }

  return "soft, diffused terminal daylight passing through large windows, preserving real skin texture, subtle shine on hair and natural reflections on coffee cup and luggage"
}

export function generateTravelMood(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("quiet luxury") || intent.includes("quiet")) {
    return "quiet luxury travel moment – discreet opulence, subtle branding and calm, composed energy"
  }
  if (intent.includes("wanderlust") || intent.includes("adventure")) {
    return "wanderlust and anticipation – sense of movement toward next destination with light, excited energy"
  }
  if (intent.includes("editorial") || intent.includes("vogue")) {
    return "high-fashion travel editorial – cinematic presence, strong composition and magazine-level finish"
  }

  return "calm, warm, aspirational travel lifestyle – influencer-style moment that feels spontaneous but carefully planned"
}

// ---------- Templates ----------

export const AIRPORT_IT_GIRL: PromptTemplate = {
  id: "airport_it_girl",
  name: "Airport It Girl Lounge Moment",
  description:
    "Ultra-realistic airport lounge or waiting-area portrait in it girl influencer aesthetic.",
  useCases: [
    "Airport lounge selfies",
    "Travel lifestyle content",
    "Quiet luxury airport posts",
    "Pre-boarding coffee moments",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const env = generateAirportEnvironment(context)
    const accessories = generateAirportAccessories(context)
    const luggage = generateLuggageDetails(context)
    const lighting = generateTravelLighting(context)
    const mood = generateTravelMood(context)

    return `Maintain the characteristics of the woman in Image 1 (face, body, skin tone, hair and visual identity). Do not copy the attached photo.

Ultra-realistic 2:3 portrait in it girl influencer style.

The woman is seated in ${env}, maintaining exact characteristics from Image 1.

**OUTFIT & STYLING:**
Neutral comfort-luxury palette in beige, cream, white and soft gray tones. Oversized sweatshirt or cropped sweater in a soft knit, combined with wide-leg pants, joggers or relaxed jeans. Clean white sneakers or soft moccasins complete the look, reinforcing cozy but elevated travel style.

**ACCESSORIES:**
${accessories}

**LUGGAGE:**
${luggage}

**HAIR & STYLING:**
Long voluminous waves or messy clip bun with loose strands framing the face, in natural brown tones with realistic shine. Styling looks intentional but relaxed, as if readied for a long-haul flight while preserving fashion-forward presence.

**SETTING:**
${env}, with terminal windows, modern seating and geometric carpet patterns subtly visible. Background shows blurred terminal elements, faint silhouettes of travelers and glass reflections, creating real airport depth without visual clutter.

**LIGHTING:**
${lighting}

**CAMERA:**
Handheld composition with 35mm f/1.8 lens or iPhone-style 24mm equivalent at arm distance or slightly in front, sharp focus on face with gentle background blur. Angle slightly below eye line for flattering perspective.

**MOOD:**
${mood}
Travel lifestyle aesthetic that feels spontaneous but carefully composed — the aspirational "airport it girl" moment before boarding.`.trim()
  },
}

export const AIRPORT_EDITORIAL_WALK: PromptTemplate = {
  id: "airport_editorial_walk",
  name: "Airport Editorial Walk",
  description:
    "Cinematic airport lobby walk with confident movement and it girl travel styling.",
  useCases: [
    "Airport outfit reels",
    "Lobby walk transitions",
    "Travel editorial content",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const env = "a modern airport lobby with glass skylights above, polished floor and blurred passengers creating depth"
    const lighting =
      "soft natural midday light filtered through glass panels, with subtle flare at the edges of the frame and a touch of fill flash freezing her expression"

    return `Maintain the characteristics of the woman in Image 1 (face, body, skin tone, hair and visual identity). Do not copy the attached photo.

Vertical 2:3 portrait in cinematic style showing a woman walking confidently through ${env}.

**MOTION CAPTURE:**
Mid-step, pulling a silver or neutral rigid suitcase with one hand and holding a coffee cup in the other. Long brown hair in natural waves moves with her stride, blazer hem and pant leg showing slight motion blur for realism.

**LOOK IT GIRL TRAVEL:**
Minimalist black or beige cropped blazer with defined shoulders, paired with high-waisted cream or beige pants with elegant, elongated fit. On feet, clean white sneakers or camel moccasins. At the neck, a delicate golden collar or minimal chain that catches light subtly.

**LIGHTING:**
${lighting}
Light creates gentle highlights on hair and face, preserving natural skin texture and adding realistic shine without overexposure.

**ENVIRONMENTAL DEPTH:**
Blurred passengers and occasional silhouettes in the background reinforce the sense of movement. Floor reflections follow the direction of her step, and glass skylights above form clean architectural lines that lead the eye.

**CAMERA:**
50mm lens at f/2.8, handheld with slight spontaneous tilt. Composition keeps her in central or slightly off-center position from head to mid-calf, with suitcase fully visible.

**EXPRESSION:**
Subtle smirk with firm forward gaze. Confident, upright posture of someone already ready for the next destination, projecting calm power and ease.`.trim()
  },
}

export const AIRPORT_GOLDEN_HOUR: PromptTemplate = {
  id: "airport_golden_hour",
  name: "Airport Terminal Golden Hour",
  description:
    "Golden-hour terminal window portrait with travel documents and soft backlight.",
  useCases: [
    "Golden hour travel portraits",
    "Boarding pass content",
    "Romantic airport scenes",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const lighting = generateTravelLighting({ ...context, userIntent: `${context.userIntent} golden hour` })

    return `Maintain the characteristics of the woman in Image 1 (face, body, skin tone, hair and visual identity). Do not copy the attached photo.

Ultra-realistic editorial portrait of a woman standing in front of an airport terminal window during golden hour, with sunlight reflecting softly through the glass behind her.

**TRAVEL PROPS AS ACCESSORIES:**
Boarding pass and folded passport held close to her face, catching the light as deliberate styling elements. Beige coat thrown lightly over shoulders, with a white ribbed tank or simple neutral top underneath. Delicate golden jewelry – thin chains, small earrings, subtle ring – shining softly without overpowering the look.

**LIGHTING:**
${lighting}
Loose hair strands or polished layers shine in backlight, with realistic glow along jawline and cheekbones. Diffused reflections dance on glass panels and the edges of passport and boarding pass.

**TECHNICAL:**
85mm lens at f/2.2 for soft, creamy bokeh behind her, impeccable realism with visible skin texture and no artificial smoothing. Natural depth of field keeps face and hands in perfect focus while background terminal details fall away gently.

**EXPRESSION:**
Calm, carefree, lips slightly parted with confidence – gaze either toward the camera or just past it, suggesting anticipation for the journey ahead.

Overall aesthetic: cinematic travel still that could belong in an international campaign, blending editorial quality with real, relatable travel details.`.trim()
  },
}

export const AIRPORT_FLOOR_SELFIE: PromptTemplate = {
  id: "airport_floor_selfie",
  name: "Airport Floor Selfie",
  description:
    "Ultra-realistic handheld floor selfie near boarding gate, cozy travel comfort aesthetic.",
  useCases: [
    "Pre-boarding selfies",
    "Cozy travel outfit posts",
    "Boarding gate content",
  ],
  requiredImages: {
    min: 1,
    max: 1,
    types: ["user_lora"],
  },
  promptStructure: (context: PromptContext): string => {
    const accessories = generateAirportAccessories({ ...context, userIntent: `${context.userIntent} floor selfie` })
    const luggage = generateLuggageDetails({ ...context, userIntent: `${context.userIntent} duffel keychain` })

    return `Maintain the characteristics of the woman in Image 1 (face, body, skin tone, hair and visual identity). Do not copy the attached photo.

Ultra-realistic handheld selfie of a stylish woman seated casually on the airport floor near the boarding gate.

**CASUAL COMFORT AESTHETIC:**
Oversized sweatshirt in light gray, beige or cream with relaxed sleeves, combined with sweatpants in deep forest green or matching neutral tone. Clean white sneakers grounded on the patterned carpet. ${accessories}

**SELFIE SPECIFICS:**
Phone held lightly up in front of face at comfortable arm distance, classic travel selfie angle. iPhone-style framing with 24mm equivalent feel, slight wide-angle perspective that includes face, upper body and part of the floor. Sharp focus on face, with background and floor pattern slightly softened.

**ENVIRONMENT DETAIL:**
Carpet with geometric blue and green pattern adding depth and realism. ${luggage} Small travel details – gate signage, metal seat legs or distant passengers – appear in soft blur.

**LIGHTING:**
Soft diffused terminal light filtered through wide windows, creating natural shine on skin, honest shadows on fabric and authentic texture in hair.

**MOOD:**
Cozy wanderlust and clean influencer aesthetic – calm, confident moment before boarding, captured in a way that feels effortless and real.`.trim()
  },
}

export const AIRPORT_VOGUE_EDITORIAL: PromptTemplate = {
  id: "airport_vogue_editorial",
  name: "Airport Vogue Editorial",
  description:
    "Seated airport lobby portrait in ultra-realistic Vogue-style aesthetic.",
  useCases: [
    "High-fashion airport content",
    "Editorial travel portraits",
    "Magazine-level Instagram posts",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const mood = generateTravelMood({ ...context, userIntent: `${context.userIntent} vogue editorial` })

    return `Maintain the characteristics of the woman in Image 1 (face, body, skin tone, hair and visual identity). Do not copy the attached photo.

Vertical 2:3 portrait in ultra-realistic Vogue aesthetic. The woman is seated in airport lobby, facing the camera with confident, editorial expression.

**COMPOSITION AS FASHION:**
Legs elegantly crossed, with one foot resting lightly on a rigid suitcase that becomes part of the fashion composition. To the side, a backpack or second bag completes a minimalist, balanced frame. Body posture is tall and grounded, shoulders relaxed yet strong.

**VOGUE QUALITY MARKERS:**
Camera positioned about 1.5 meters away, slightly below eye line to convey presence and elegance. Face in absolute sharpness with natural skin texture, soft shine and realistic contour. Small reflections on glass panels and floor contribute to international magazine finish.

**CAMERA:**
50mm lens at f/2.2, absolute focus on face with soft, controlled bokeh around her and the luggage. Lines of benches, windows and ceiling architecture subtly converge, adding depth without overwhelming the subject.

**ENVIRONMENT:**
Modern airport lobby with wide windows, blurred terminal activity and clean architectural lines that frame her like a set. Suitcase and bag colors complement her outfit and the neutral palette of the space.

**MOOD:**
${mood}
A moment that feels ready for the cover of a travel or fashion magazine – luxurious but grounded in a real, in-between-trips pause.`.trim()
  },
}

export const TRAVEL_LIFESTYLE_BRANDS = {
  AIRPORT_IT_GIRL,
  AIRPORT_EDITORIAL_WALK,
  AIRPORT_GOLDEN_HOUR,
  AIRPORT_FLOOR_SELFIE,
  AIRPORT_VOGUE_EDITORIAL,
} satisfies Record<string, PromptTemplate>
