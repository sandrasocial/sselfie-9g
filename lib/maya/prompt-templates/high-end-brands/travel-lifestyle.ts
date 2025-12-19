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
    "champagne glasses and rooftop dining elements",
    "yacht deck elements and warm boat lighting",
    "beach accessories like flowers and tropical elements",
    "water and ocean elements for destination scenes",
    "Italian gelato in artisan cups",
    "cappuccino with art in milk foam",
    "Venetian gondolas and canal reflections",
    "traditional Thai flowers (orchids, frangipani, jasmine)",
    "rope swings over turquoise waters",
    "traditional Thai wooden boats",
    "infinity pool edges with panoramic views",
  ],
  settings: [
    "airport lounges and quiet waiting areas",
    "terminal window seats with runway view",
    "modern airport lobbies with glass skylights",
    "boarding gates with geometric carpets",
    "luxury yacht decks with warm boat lighting",
    "rooftop restaurants with city skyline views",
    "marina settings with iconic landmarks",
    "tropical beaches where water meets sand",
    "water scenes with skyscraper skylines",
    "Venice canals with gondolas and historic bridges",
    "Venetian cafes with marble tables and historic walls",
    "Venice hotel rooms with elegant interiors",
    "Piazza San Marco with historic basilica",
    "Venice museums with artwork and cultural atmosphere",
    "Thailand golden temples with Thai architecture",
    "elephant sanctuaries with tropical nature",
    "Phi Phi islands with turquoise waters and rock formations",
    "Koh Samui rope swings over crystalline sea",
    "infinity pools with panoramic tropical mountain views",
    "traditional Thai boats in turquoise waters",
  ],
  mood: [
    "quiet luxury",
    "calm travel confidence",
    "aspirational wanderlust",
    "serene pre-boarding moment",
    "cinematic destination elegance",
    "luxury resort lifestyle",
    "tropical luxury",
    "sophisticated urban travel",
    "Venetian historic charm",
    "European cultural sophistication",
    "spiritual temple atmosphere",
    "ethical sanctuary connection",
    "tropical island paradise",
    "exclusive resort exclusivity",
  ],
  style: [
    "it girl travel aesthetic",
    "influencer casual",
    "airport chic",
    "effortless luxury with relatable details",
    "luxury destination editorial",
    "resort campaign aesthetic",
    "fashion destination imagery",
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

// ---------- Luxury Destination Travel Templates ----------

export const LUXURY_DESTINATION_WATER: PromptTemplate = {
  id: "luxury_destination_water",
  name: "Luxury Destination Water Scene",
  description:
    "Cinematic water/skyline portrait with luxury travel aesthetic, perfect for destination campaigns.",
  useCases: [
    "Luxury destination content",
    "Water/skyline portraits",
    "Resort campaign imagery",
    "Travel editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

Portrait 2:3 format. Model in water up to waist, skyscraper skyline in background.

**POSE & EXPRESSION:**
One hand gently lifting water, soft and seductive expression. Body positioned naturally in water, conveying elegance and confidence.

**OUTFIT & STYLING:**
Black minimalist bikini with fine gold bracelets. Fitness and athletic body visible, styled for luxury resort aesthetic.

**HAIR:**
Hair pulled back, natural wet appearance with realistic texture and shine from water.

**LIGHTING:**
Golden late afternoon light creating warm highlights on skin and water, with dramatic skyline silhouette in background.

**CAMERA:**
Camera at 1.8m, 50mm lens, super sharp face focus, soft blurred background (bokeh) emphasizing skyline depth.

**MOOD:**
Cinematic and elegant – luxury destination travel aesthetic with editorial quality.`.trim()
  },
}

export const LUXURY_DESTINATION_YACHT: PromptTemplate = {
  id: "luxury_destination_yacht",
  name: "Luxury Yacht Scene",
  description:
    "Elegant yacht deck portrait with warm boat lighting and luxury travel atmosphere.",
  useCases: [
    "Yacht lifestyle content",
    "Luxury travel campaigns",
    "New Year editorial",
    "Resort destination imagery",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const intent = (context.userIntent || "").toLowerCase()
    const isCloseUp = intent.includes("close") || intent.includes("close-up") || intent.includes("portrait")
    const framing = isCloseUp
      ? "Elegant close-up on rear deck of illuminated yacht at night. Framing of face and upper body"
      : "Photo on rear deck of yacht at night, captured in medium body framing"

    return `Maintain characteristics of woman in attachment, tanned skin, long wavy hair, warm glowing skin, athletic proportional body. Face always sharp.

${framing}, showing light blue off-shoulder blouse with light flowing sleeves or elegant flowing outfit.

**LIGHTING:**
Warm lighting from boat highlighting natural shine of skin and hair. Background with softly blurred amber yacht lights creating depth and luxury atmosphere.

**HAIR & STYLING:**
Long wavy hair with natural movement, catching warm boat lights. Makeup: sophisticated light glow, emphasizing warm skin tone.

**POSE & EXPRESSION:**
Elegant and confident pose, expression serene and sophisticated, looking toward camera or slightly past it with calm confidence.

**CAMERA:**
${isCloseUp ? "85mm lens" : "85mm lens or 50mm for medium body"}, New Year 2026 editorial style. Face extremely sharp and illuminated, outfit fully visible in image.

**MOOD:**
Elegant New Year aesthetic – luxury yacht lifestyle, cinematic and sophisticated, aspirational travel moment.`.trim()
  },
}

export const LUXURY_DESTINATION_BEACH: PromptTemplate = {
  id: "luxury_destination_beach",
  name: "Luxury Beach Scene",
  description:
    "Tropical luxury beach portrait with fashion magazine aesthetic.",
  useCases: [
    "Beach destination content",
    "Resort lifestyle imagery",
    "Tropical travel campaigns",
    "Fashion beach editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

Portrait 2:3 format. Model seated where water meets sand, soft waves touching body.

**OUTFIT & ACCESSORIES:**
Red bikini with white flower behind ear, creating tropical luxury aesthetic. Minimal jewelry or delicate pieces that catch light.

**POSE & EXPRESSION:**
Straight posture, one hand on ground, other resting on knee. Expression soft and confident, conveying relaxed elegance.

**HAIR:**
Lightly damp hair, illuminated by sun, with natural texture and realistic wet appearance from ocean water.

**LIGHTING:**
Natural sunlight creating highlights on wet hair and skin, with soft shadows and warm tones. Background shows ocean and sky with natural depth.

**CAMERA:**
Camera at 2m, 85mm lens, American shot (mid-body framing). Sharp focus on face and upper body, with soft background blur.

**MOOD:**
Tropical luxury + fashion magazine aesthetic – aspirational beach destination moment with editorial quality.`.trim()
  },
}

export const LUXURY_DESTINATION_ROOFTOP: PromptTemplate = {
  id: "luxury_destination_rooftop",
  name: "Luxury Rooftop Restaurant",
  description:
    "Elegant rooftop restaurant portrait with city skyline and warm lighting.",
  useCases: [
    "Rooftop dining content",
    "City destination imagery",
    "Luxury travel campaigns",
    "Evening destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person. Format 2:3. Clear face focus.

Setting: rooftop restaurant with view of illuminated city skyline (e.g., Burj Khalifa or iconic city landmarks).

**OUTFIT & STYLING:**
Champagne satin dress with gold jewelry, creating elegant evening destination look. Hair styled in wavy loose waves, catching warm restaurant lighting.

**POSE & EXPRESSION:**
Seated holding glass, looking at camera with soft expression. Posture elegant and relaxed, conveying intimate luxury moment.

**LIGHTING:**
Warm indirect lighting from restaurant combined with city reflection creating soft, cinematic atmosphere. Light highlights jewelry and dress fabric.

**CAMERA:**
50mm lens or 85mm for portrait, vertical 2:3 framing. Sharp focus on face, with city skyline softly blurred in background.

**MOOD:**
Elegant, intimate, cinematographic – luxury destination dining experience with sophisticated atmosphere.`.trim()
  },
}

export const LUXURY_DESTINATION_MARINA: PromptTemplate = {
  id: "luxury_destination_marina",
  name: "Luxury Marina/Destination Scene",
  description:
    "Sophisticated urban destination portrait with marina skyline and elegant tailoring.",
  useCases: [
    "Marina destination content",
    "Urban travel imagery",
    "Luxury city campaigns",
    "Destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

Portrait 2:3 format. Scene in luxury marina or urban destination during late afternoon.

**OUTFIT & STYLING:**
White well-structured tailoring set: blazer + high-waisted straight pants. Minimalist nude top underneath, large dark sunglasses "fashion editor" style. Clean, sophisticated destination look.

**POSE & EXPRESSION:**
Model standing on wooden deck or urban setting, body slightly to side, hand in pants pocket. Expression confident and elegant, conveying sophisticated travel aesthetic.

**HAIR & MAKEUP:**
Smooth polished hair behind ears, sophisticated light glow makeup emphasizing natural skin texture and warm destination lighting.

**SETTING:**
Marina skyline or iconic urban destination in background, with architectural lines and water creating depth. Soft golden light from late afternoon sun.

**CAMERA:**
Camera at 2m, 50mm lens, American shot (mid-body framing). Sharp focus on face and outfit, with destination skyline softly blurred.

**MOOD:**
Sophisticated destination travel – luxury marina or urban setting with editorial quality and aspirational lifestyle aesthetic.`.trim()
  },
}

export const LUXURY_DESTINATION_SIDE_PROFILE: PromptTemplate = {
  id: "luxury_destination_side_profile",
  name: "Luxury Destination Side Profile",
  description:
    "Elegant side profile portrait with iconic destination backdrop and sophisticated styling.",
  useCases: [
    "Destination editorial",
    "Luxury travel campaigns",
    "Iconic landmark content",
    "Fashion destination imagery",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

Portrait 2:3 format. Absolute face focus. Face 100% sharp and detailed, without blur. Shallow depth of field: background slightly blurred (soft bokeh).

**POSE & EXPRESSION:**
Model from side, body turning to look over shoulder, confident elegant expression. Posture sophisticated and graceful.

**OUTFIT & STYLING:**
Long black dress fitted to body, satin fabric, high side slit. Elegant and timeless destination look.

**HAIR:**
Loose hair with polished waves, subtle movement with wind, catching natural light beautifully.

**SETTING:**
Iconic destination landmark in background (e.g., Burj Al Arab, clear sky), with architectural lines creating sophisticated depth.

**LIGHTING:**
Strong natural light illuminating golden skin, creating highlights on hair and dress fabric. Soft bokeh in background.

**CAMERA:**
Camera at 2.3m, 85mm lens, American shot (mid-body framing). Absolute focus on face with perfect sharpness.

**MOOD:**
Cinematic and elegant – luxury destination portrait with iconic backdrop and sophisticated fashion aesthetic.`.trim()
  },
}

// ---------- Venice Destination Templates ----------

export const VENICE_HOTEL_ROOM: PromptTemplate = {
  id: "venice_hotel_room",
  name: "Venice Hotel Room",
  description:
    "Elegant hotel room portrait in Venice with warm lighting and luxury atmosphere.",
  useCases: [
    "Venice destination content",
    "Hotel room lifestyle",
    "Luxury travel campaigns",
    "European destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain the same person from reference image. Format: portrait 2:3. Athletic and toned body.

Illuminated brown hair pinned in a bun with some loose waves. Sharp face, glow skin, soft and confident expression.

Scene: model seated on a king bed in elegant environment.

**OUTFIT & STYLING:**
White satin dress slip dress style. One hand resting on mattress and other lightly on chest, displaying accessories (ring and watch). Elegant and sophisticated look.

**ENVIRONMENT:**
Room with warm lighting, lamp access in background, light velvet headboard. Venetian luxury hotel atmosphere with refined details.

**LIGHTING:**
Soft and warm editorial luxury style, creating gentle highlights on satin fabric and skin.

**CAMERA:**
Approximate distance 1.4m — 50mm lens f/1.4 with focus on face and slight background blur.

**MOOD:**
Luxury travel editorial – elegant Venetian hotel moment with sophisticated atmosphere.`.trim()
  },
}

export const VENICE_CANAL_GONDOLA: PromptTemplate = {
  id: "venice_canal_gondola",
  name: "Venice Gondola Canal Scene",
  description:
    "Cinematic gondola scene in Venice canals with historic architecture and golden lighting.",
  useCases: [
    "Venice destination content",
    "Canal lifestyle imagery",
    "European travel campaigns",
    "Historic destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Maintain same face, original features and elegant closed smile. Vertical format 2:3, cinematographic style, 8K quality.

Scene: woman seated in gondola in Venice canal. In background, historic buildings, water reflections and stone bridge. Sun low creating golden reflections.

Athletic body, proportional and naturally defined.

**OUTFIT & STYLING:**
Italian style red bandana, round dark sunglasses, cream satin top with ruffles and long satin skirt combining. Fine gold accessories. Elegant posture, hands resting with naturalness, confident expression.

**HAIR:**
Hair styled with Italian aesthetic, catching golden light beautifully.

**LIGHTING:**
Golden lighting creating shine on face, hair and accessories. Water reflections adding depth and atmosphere.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face, with historic Venice architecture softly blurred in background.

**MOOD:**
Cinematic Venice destination – luxury travel editorial with historic charm and golden hour atmosphere. Without text in image. Without visible tattoos. Realistic skin with natural texture, without plastic effect.`.trim()
  },
}

export const VENICE_CAFE: PromptTemplate = {
  id: "venice_cafe",
  name: "Classic Venetian Cafe",
  description:
    "Lifestyle editorial portrait in classic Venetian cafe with marble tables and historic atmosphere.",
  useCases: [
    "Venice cafe content",
    "European lifestyle imagery",
    "Historic destination campaigns",
    "Cafe lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: maintain same face. Vertical format 2:3, hyper realistic 8K, lifestyle editorial style.

Scene: woman seated in classic Venetian cafe, small table with marble top. She holds a cappuccino cup with art in the milk.

Elegant posture, soft closed smile. Athletic body, proportional and defined.

**OUTFIT & STYLING:**
Red bandana, cream satin top and long satin skirt. Delicate gold accessories. Italian-inspired sophisticated look.

**ENVIRONMENT:**
In background: antique lamps, classic armchairs, historic walls texture. Authentic Venetian cafe atmosphere.

**LIGHTING:**
Warm ambient lighting from cafe, creating cozy and elegant atmosphere with natural highlights.

**CAMERA:**
50mm lens, vertical 2:3 framing. Sharp focus on face and hands, with cafe environment softly blurred.

**MOOD:**
Luxury travel editorial – classic Venetian cafe moment with historic charm and sophisticated atmosphere. Without text. Without tattoos.`.trim()
  },
}

export const VENICE_BRIDGE: PromptTemplate = {
  id: "venice_bridge",
  name: "Venice Historic Bridge",
  description:
    "Elegant portrait on historic Venetian bridge with canal backdrop and golden hour lighting.",
  useCases: [
    "Venice bridge content",
    "Historic destination imagery",
    "European travel campaigns",
    "Golden hour destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: original face, without altering features. Vertical photo 2:3, hyper realistic 8K.

Scene: woman seated on a historic stone bridge in Venice, with canal in background and passing gondolas.

Athletic body, elegant, relaxed posture.

**OUTFIT & STYLING:**
Red bandana, round dark sunglasses, cream satin top with ruffle, long satin skirt. Italian-inspired elegant look.

**HAIR:**
Hair wavy with light wind, catching golden light naturally.

**LIGHTING:**
Golden sunset light creating reflections in water and shine on face. Warm, cinematic atmosphere.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face, with canal and gondolas softly blurred.

**MOOD:**
Luxury travel editorial – historic Venice bridge moment with golden hour atmosphere and cinematic quality. Without text in image. Without visible tattoos.`.trim()
  },
}

export const VENICE_MUSEUM: PromptTemplate = {
  id: "venice_museum",
  name: "Venice Museum Cultural Scene",
  description:
    "Sophisticated museum portrait in Venice with artwork and cultural atmosphere.",
  useCases: [
    "Cultural destination content",
    "Museum lifestyle imagery",
    "European travel campaigns",
    "Cultural destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Maintain same face, features and proportions original. Sharp face, hyper realistic, natural expression with elegant closed smile.

Vertical format 2:3, 8K quality, travel editorial style.

Scene: woman inside elegant museum in Venice. She is in profile, looking at large artwork hanging on wall.

Arms relaxed beside body, elegant and natural posture. Athletic body, proportional and naturally defined.

**OUTFIT & STYLING:**
Red bandana tied on head, long hair with soft waves and natural volume. Cream satin sleeveless top and long satin skirt combining, creating sophisticated silhouette. Structured bag hanging on shoulder. Gold accessories: watch, delicate bracelets and fine rings.

**ENVIRONMENT:**
Antique wood floor, wall with classic moldings and artistic painting. In background, large arched windows with view to Venice and canals.

**LIGHTING:**
Soft natural light entering through windows, creating shine on hair, skin and satin fabric. Soft shadows, serene aesthetic, cultural and sophisticated.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face and profile, with museum environment softly blurred.

**MOOD:**
Cultural and sophisticated – luxury travel editorial with Venetian art and architecture. Without text in image. Without visible tattoos. Tanned skin with real texture, without plastic effect.`.trim()
  },
}

export const VENICE_PIAZZA: PromptTemplate = {
  id: "venice_piazza",
  name: "Venice Piazza San Marco",
  description:
    "Luxury travel editorial portrait in Piazza San Marco with historic basilica backdrop.",
  useCases: [
    "Venice piazza content",
    "Historic destination imagery",
    "European travel campaigns",
    "Public space destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Maintain same face and original features. Sharp face, hyper realistic, soft expression with elegant closed smile.

Vertical format 2:3, 8K quality.

Scene: woman walking through Piazza San Marco in Venice, holding artisan Italian gelato with two scoops.

Athletic body, proportional and naturally defined.

**OUTFIT & STYLING:**
Italian style red bandana, cream satin top, long satin skirt combining. Discrete gold accessories. Elegant and comfortable destination look.

**ENVIRONMENT:**
In background: historic basilica, pigeons, golden afternoon light. Authentic Venetian piazza atmosphere.

**LIGHTING:**
Golden afternoon light creating warm highlights on face and outfit, with historic architecture in background.

**CAMERA:**
50mm lens, vertical 2:3 framing. Sharp focus on face and gelato, with piazza softly blurred.

**MOOD:**
Luxury travel editorial, warm colors and romantic atmosphere – authentic Venetian moment. Without text in image. Without visible tattoos.`.trim()
  },
}

// ---------- Thailand Destination Templates ----------

export const THAILAND_TEMPLE: PromptTemplate = {
  id: "thailand_temple",
  name: "Thailand Golden Temple",
  description:
    "Spiritual and cinematic portrait at golden temple in Thailand with cultural authenticity.",
  useCases: [
    "Thailand destination content",
    "Temple lifestyle imagery",
    "Asian travel campaigns",
    "Cultural destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Portrait 2:3, ultra realistic in 8K. Woman walking in front of golden temple in Chiang Mai, Thailand. Athletic body, sharp face with same features from reference.

**POSE & EXPRESSION:**
Walking slowly with elegant posture, lightly holding sleeve or dress fabric to create movement. Serene and confident expression, gaze to side.

**OUTFIT & STYLING:**
Long white dress, champagne or soft gold, fluid and luxurious fabric. Delicate gold bracelets, refined earring. Minimalist fashion sunglasses. Elegant and respectful destination look.

**HAIR & MAKEUP:**
Illuminated brown hair with long waves. Light glow makeup emphasizing natural skin texture.

**ENVIRONMENT:**
Golden temples illuminated by sun, Thai architectural details, vibrant blue sky, spiritual and cinematographic atmosphere.

**LIGHTING:**
Natural sunlight creating highlights on temple gold and dress fabric, with vibrant sky adding depth.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face, with temple architecture softly blurred.

**MOOD:**
Spiritual and cinematographic – luxury travel editorial with cultural authenticity and golden temple atmosphere.`.trim()
  },
}

export const THAILAND_ELEPHANT: PromptTemplate = {
  id: "thailand_elephant",
  name: "Thailand Elephant Sanctuary",
  description:
    "Ethical elephant sanctuary portrait with cultural flowers and respectful interaction.",
  useCases: [
    "Thailand sanctuary content",
    "Ethical travel imagery",
    "Asian travel campaigns",
    "Cultural destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Vertical portrait 2:3, hyper-realistic in 8K. Woman in ethical elephant sanctuary in Chiang Mai, Thailand (without riding, without chains — only respectful and natural interaction).

Sharp face, maintaining exactly same features from sent image. Athletic body with natural proportions.

**OUTFIT & STYLING:**
Luxurious long dress editorial style, in champagne tone, cream or soft gold, with fluid fabric and fine finishing. Light fabric, with elegant wind movement. Sophisticated delicate gold jewelry, minimalist and refined. Fine nude sandals or bare feet to maintain natural luxury style.

**MAIN ACCESSORY:**
Woman holds small arrangement of traditional Thai flowers, like white orchids or lilies, frangipani (plumeria) flowers and Thai jasmine. Arrangement is delicate, elegant and culturally authentic — with subtle gold ribbons.

**POSE & EXPRESSION:**
Woman stopped beside elephant, elegant and confident posture. One hand gently holding floral arrangement at waist height, while other touches elephant with affection and respect. Serene expression, feminine and light, closed sophisticated smile.

**HAIR & BEAUTY:**
Illuminated brown hair with voluminous waves and natural movement. Tanned skin with subtle shine. Light makeup, sophisticated and sunkissed.

**ENVIRONMENT:**
Tropical nature, with tall trees, golden light filtering through vegetation, calm atmosphere and almost spiritual. Grass, mountains in background and natural elephant skin texture extremely realistic.

**LIGHTING:**
Golden light filtering through tropical vegetation, creating highlights on flowers, hair and skin.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face and interaction, with nature softly blurred.

**MOOD:**
Fashion editorial with cultural sensibility, luxury travel, human connection and nature in harmony – ethical and respectful destination moment.`.trim()
  },
}

export const THAILAND_BOAT: PromptTemplate = {
  id: "thailand_boat",
  name: "Thailand Boat Turquoise Waters",
  description:
    "Luxury boat scene in turquoise waters with tropical cliffs and cinematic lighting.",
  useCases: [
    "Thailand boat content",
    "Tropical destination imagery",
    "Asian travel campaigns",
    "Boat lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

Portrait 2:3 format. Woman with back turned, wearing flowing pink dress and white hat, seated in wooden boat.

**POSE & EXPRESSION:**
She is turning head to look over shoulder to camera, with hair waving in wind. Expression serene and confident.

**OUTFIT & STYLING:**
Flowing pink dress with elegant movement, white hat creating sophisticated tropical look. Minimal jewelry catching light.

**ENVIRONMENT:**
Boat is in clear turquoise blue waters, surrounded by imposing green and lush cliffs. Sunlight is behind mountains, creating soft and warm shine.

**LIGHTING:**
Sunlight creating backlight on hair and dress, with turquoise water reflecting light beautifully.

**CAMERA:**
Camera positioned right behind her, slightly above, capturing scene from back-lateral perspective, focusing on woman and stunning landscape. 50mm or 85mm lens.

**MOOD:**
Luxury travel, calm and natural beauty – cinematic tropical destination moment with turquoise waters and dramatic cliffs.`.trim()
  },
}

export const THAILAND_INFINITY_POOL: PromptTemplate = {
  id: "thailand_infinity_pool",
  name: "Thailand Infinity Pool",
  description:
    "Luxury infinity pool portrait with panoramic tropical mountain view and resort aesthetic.",
  useCases: [
    "Thailand resort content",
    "Infinity pool lifestyle imagery",
    "Luxury resort campaigns",
    "Tropical destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical portrait 2:3, 8K cinematographic. Woman at edge of infinity pool with panoramic view of tropical mountains and turquoise sea. Athletic body, sharp face, same features from reference.

**POSE & EXPRESSION:**
Standing or seated at edge with elegance, crossed legs or one extended, hand gently resting on parapet. Confident and calm expression, gaze to horizon.

**OUTFIT & STYLING:**
Sophisticated metallic gold or minimalist white bikini. Transparent fluid optional kimono. Fashion sunglasses. Resort luxury aesthetic.

**HAIR & MAKEUP:**
Illuminated brown hair with loose waves. Tanned skin with shine. Light sunkissed makeup.

**ENVIRONMENT:**
Five star hotel, exclusive atmosphere, infinity pool edge with panoramic tropical view. Mountains and turquoise sea creating depth.

**LIGHTING:**
Natural sunlight creating highlights on water, skin and hair, with tropical atmosphere.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face, with infinity pool and mountains softly blurred.

**MOOD:**
Editorial vibration "luxury lifestyle" – exclusive tropical resort moment with cinematic quality.`.trim()
  },
}

export const THAILAND_ISLANDS: PromptTemplate = {
  id: "thailand_islands",
  name: "Thailand Islands (Phi Phi/Koh Samui)",
  description:
    "Luxury island destination portrait with traditional boats, rope swings and tropical paradise aesthetic.",
  useCases: [
    "Thailand islands content",
    "Phi Phi/Koh Samui imagery",
    "Tropical island campaigns",
    "Island destination editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const intent = (context.userIntent || "").toLowerCase()
    const isRopeSwing = intent.includes("rope") || intent.includes("swing") || intent.includes("koh samui")
    
    if (isRopeSwing) {
      return `Reference image: photo sent. Vertical portrait 2:3, ultra realistic in 8K. Woman elegantly seated in rope swing suspended by thick nautical ropes, installed over crystalline turquoise sea in Koh Samui, Thailand. Athletic body and natural proportions. Sharp face, maintaining exactly same features from person in sent image.

**POSE & EXPRESSION:**
Straight column, elegant and feminine posture. Both hands gently holding swing ropes. Chin lightly elevated, confident expression and soft with closed smile. Legs lightly crossed at ankle tip, transmitting elegance.

**OUTFIT & STYLING:**
White or beige sand fluid dress with light and breezy fabric to wind, with delicate slit. Large straw hat glam resort style. Nude nails, clean girl millionaire vibe.

**HAIR & MAKEUP:**
Illuminated brown hair with waves and volume, illuminated by golden sun. Light makeup with tanned effect sunkissed.

**ENVIRONMENT:**
Transparent sea with vibrant green and blue tones, palm trees in background, clear sky with few clouds. Sun reflections creating shines in water.

**LIGHTING:**
Golden sunlight creating highlights on hair, dress and water, with tropical atmosphere.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face, with rope swing and sea softly blurred.

**MOOD:**
Luxury travel editorial atmosphere, summer premium lifestyle aesthetic, sensation of exclusive tropical paradise.`.trim()
    }
    
    return `Reference image: photo sent. Portrait 2:3, ultra-realistic in 8K. Luxury travel editorial style magazine. Woman seated with elegant posture on tip of traditional Thai wooden boat, in Phi Phi islands, Thailand. Crystalline turquoise sea and tall rock formations with tropical vegetation in background.

Sharp face, maintaining exactly same features from person in reference image. Athletic body, proportional and natural proportions.

**POSE & EXPRESSION:**
Elegant pose: elongated and erect trunk, shoulders lightly back, one leg crossed in front of other in natural and feminine way, one hand gently resting on knee and other resting on wood with delicacy. Chin lightly elevated, confident expression with subtle closed smile.

**OUTFIT & STYLING:**
Sophisticated bikini orange burnt tone or coral with structured editorial style design. European fashion style sunglasses. Illuminated brown hair with loose waves falling over shoulders, light movement by wind.

**HAIR & MAKEUP:**
Aesthetic: tanned skin with natural glow, light makeup with sunkissed effect, natural shine on water bands creating brightness bands.

**ENVIRONMENT:**
Crystalline turquoise sea, tall rock formations with tropical vegetation, traditional Thai wooden boat. Vibrant tropical tones, cinematographic contrast between wood, water and outfit.

**LIGHTING:**
Natural sunlight creating highlights on water, skin and hair, with tropical atmosphere.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face, with boat and tropical landscape softly blurred.

**MOOD:**
Sensation of luxury, sophistication, premium summer and exclusive travel – cinematic tropical island destination moment.`.trim()
  },
}

export const TRAVEL_LIFESTYLE_BRANDS = {
  AIRPORT_IT_GIRL,
  AIRPORT_EDITORIAL_WALK,
  AIRPORT_GOLDEN_HOUR,
  AIRPORT_FLOOR_SELFIE,
  AIRPORT_VOGUE_EDITORIAL,
  LUXURY_DESTINATION_WATER,
  LUXURY_DESTINATION_YACHT,
  LUXURY_DESTINATION_BEACH,
  LUXURY_DESTINATION_ROOFTOP,
  LUXURY_DESTINATION_MARINA,
  LUXURY_DESTINATION_SIDE_PROFILE,
  VENICE_HOTEL_ROOM,
  VENICE_CANAL_GONDOLA,
  VENICE_CAFE,
  VENICE_BRIDGE,
  VENICE_MUSEUM,
  VENICE_PIAZZA,
  THAILAND_TEMPLE,
  THAILAND_ELEPHANT,
  THAILAND_BOAT,
  THAILAND_INFINITY_POOL,
  THAILAND_ISLANDS,
} satisfies Record<string, PromptTemplate>
