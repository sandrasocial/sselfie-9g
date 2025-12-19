// Selfie Lifestyle templates – authentic selfie moments with luxury aesthetic
// These are lifestyle (not brand-specific) high-end prompts for Studio Pro / Nano Banana flows.

import type { PromptTemplate, PromptContext } from "../types"

// ---------- Selfie Lifestyle Templates ----------

export const SELFIE_GOLDEN_HOUR_WINDOW: PromptTemplate = {
  id: "selfie_golden_hour_window",
  name: "Golden Hour Window Selfie",
  description:
    "Authentic golden hour window selfie with natural lighting and relatable luxury aesthetic.",
  useCases: [
    "Window selfie content",
    "Golden hour imagery",
    "Natural selfie campaigns",
    "Authentic lifestyle selfies",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain exactly same person from reference image. Format: portrait 2:3, selfie angle.

Hair: illuminated brown, natural loose waves, effortless styling. Without altering features. Hyper-realistic.

Scene: woman taking phone selfie near large window with golden hour light streaming in.

**OUTFIT & STYLING:**
Off-shoulder cream sweater or oversized button-up shirt. Accessories: delicate gold necklaces, natural glowing makeup, phone visible in hand.

**POSE & EXPRESSION:**
Arm extended holding phone, natural smile or soft serious expression, head slightly tilted.

**LIGHTING:**
Golden side lighting from window, natural glow on skin, warm sunset tones.

**ENVIRONMENT:**
Minimal background, light curtain, clean wall, domestic luxury.

**CAMERA:**
iPhone Pro perspective, 1.5-2 feet from face, slight high angle, front-facing camera aesthetic.

**MOOD:**
Authentic selfie moment, natural beauty, relatable luxury – genuine golden hour selfie.`.trim()
  },
}

export const SELFIE_MIRROR_OUTFIT: PromptTemplate = {
  id: "selfie_mirror_outfit",
  name: "Mirror Outfit Selfie",
  description:
    "Full-body mirror selfie showing outfit with confident styling and aesthetic room background.",
  useCases: [
    "Outfit selfie content",
    "Mirror selfie imagery",
    "Getting ready campaigns",
    "Outfit check lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, mirror selfie angle.

Hair: illuminated brown, styled waves or sleek look, outfit-ready. Hyper-realistic.

Scene: woman taking full-body mirror selfie in bedroom or dressing area.

**OUTFIT & STYLING:**
Chic coordinated set - matching loungewear or going-out outfit in neutral tones. Accessories: stacked gold jewelry, designer bag visible, heels or designer sneakers.

**POSE & EXPRESSION:**
Standing confidently, one hand holding phone, slight hip tilt, natural pose checking outfit.

**LIGHTING:**
Bedroom lighting or natural window light, ring light creating even illumination.

**ENVIRONMENT:**
Clean mirror, minimal background, bed or closet partially visible, aesthetic room.

**CAMERA:**
iPhone selfie perspective through mirror, showing full outfit, phone covering face partially or at side.

**MOOD:**
Getting ready content, outfit check, confident self-documentation – sophisticated mirror selfie.`.trim()
  },
}

export const SELFIE_CAR_LUXE: PromptTemplate = {
  id: "selfie_car_luxe",
  name: "Car Selfie Luxe",
  description:
    "Luxury car selfie in driver's seat with casual chic styling and on-the-go aesthetic.",
  useCases: [
    "Car selfie content",
    "Travel selfie imagery",
    "On-the-go campaigns",
    "Casual luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3, car selfie angle.

Hair: illuminated brown, polished styling, sunglasses pushed up or worn. Hyper-realistic.

Scene: woman taking selfie in driver's seat of luxury car.

**OUTFIT & STYLING:**
Casual chic - leather jacket, simple top, or athleisure. Accessories: designer sunglasses, coffee cup in holder, designer bag on passenger seat.

**POSE & EXPRESSION:**
One hand on steering wheel, other holding phone, confident expression or soft smile.

**LIGHTING:**
Natural daylight through car windows, even lighting on face.

**ENVIRONMENT:**
Luxury car interior (leather seats, clean dashboard), outdoor scenery through windshield.

**CAMERA:**
iPhone front camera, arm's length, slight high angle, car interior visible.

**MOOD:**
On-the-go lifestyle, casual luxury, relatable moment – authentic car selfie.`.trim()
  },
}

export const SELFIE_BATHROOM_GLAM: PromptTemplate = {
  id: "selfie_bathroom_glam",
  name: "Bathroom Mirror Glam Selfie",
  description:
    "Elegant bathroom mirror selfie post-glam or pre-event with luxury bathroom aesthetic.",
  useCases: [
    "Bathroom selfie content",
    "Getting ready imagery",
    "Beauty selfie campaigns",
    "Luxury self-care lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, bathroom mirror selfie.

Hair: illuminated brown, freshly styled, glamorous finish. Hyper-realistic.

Scene: woman taking selfie in elegant bathroom mirror, post-glam or pre-event.

**OUTFIT & STYLING:**
Elegant dress or robe, getting-ready moment, luxe pajamas or towel. Accessories: jewelry being added/checked, makeup visible on counter, beauty products.

**POSE & EXPRESSION:**
Angled to show outfit/look, phone partially covering face or held at side, checking appearance.

**LIGHTING:**
Bathroom vanity lighting creating bright even illumination, possibly ring light.

**ENVIRONMENT:**
Luxury bathroom, marble counters, organized beauty products, candles.

**CAMERA:**
iPhone through mirror, upper body visible, professional at-home lighting.

**MOOD:**
Getting ready elegance, beauty moment, luxury self-care – sophisticated bathroom selfie.`.trim()
  },
}

export const SELFIE_COFFEE_SHOP: PromptTemplate = {
  id: "selfie_coffee_shop",
  name: "Coffee Shop Casual Selfie",
  description:
    "Casual coffee shop selfie with latte and laptop showing work-life balance aesthetic.",
  useCases: [
    "Coffee shop selfie content",
    "Café lifestyle imagery",
    "Work-life balance campaigns",
    "Casual productivity lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3, forward-facing selfie.

Hair: illuminated brown, casual day styling, natural texture. Hyper-realistic.

Scene: woman taking selfie at coffee shop table, latte and laptop in frame.

**OUTFIT & STYLING:**
Cozy sweater or casual button-up, minimal makeup look, effortless style. Accessories: coffee cup, laptop partially visible, AirPods case on table.

**POSE & EXPRESSION:**
Natural smile, holding phone in one hand, other hand near coffee or laptop, relaxed expression.

**LIGHTING:**
Café window light creating soft glow, warm ambient café lighting.

**ENVIRONMENT:**
Coffee shop background softly blurred, plants, people, aesthetic café interior.

**CAMERA:**
iPhone front camera, 2 feet distance, eye level to slightly above.

**MOOD:**
Work-life balance, casual productivity, relatable luxury lifestyle – authentic café selfie.`.trim()
  },
}

export const SELFIE_BED_MORNING: PromptTemplate = {
  id: "selfie_bed_morning",
  name: "Bed Selfie Morning Routine",
  description:
    "Intimate morning bed selfie with white sheets and authentic waking up moment.",
  useCases: [
    "Morning selfie content",
    "Bed lifestyle imagery",
    "Morning routine campaigns",
    "Intimate self-care lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, lying down selfie angle.

Hair: illuminated brown, naturally messy or loosely styled, morning texture. Hyper-realistic.

Scene: woman taking selfie lying in bed, white sheets, morning light.

**OUTFIT & STYLING:**
Silk pajama set or oversized tee, minimal no-makeup makeup look. Accessories: coffee mug on nightstand, book, minimal jewelry.

**POSE & EXPRESSION:**
Lying back on pillows, arm extended holding phone, natural morning smile or peaceful expression.

**LIGHTING:**
Soft morning window light creating gentle glow, bright white sheets reflecting light.

**ENVIRONMENT:**
Luxury bedding, white sheets, minimal nightstand styling, plants or art visible.

**CAMERA:**
iPhone held above face, slight angle, 1-2 feet distance, soft morning perspective.

**MOOD:**
Morning luxury, authentic waking up moment, intimate self-care – genuine morning selfie.`.trim()
  },
}

export const SELFIE_ELEVATOR_MIRROR: PromptTemplate = {
  id: "selfie_elevator_mirror",
  name: "Elevator Mirror Selfie",
  description:
    "Full-length elevator mirror selfie with going-out outfit and luxury elevator aesthetic.",
  useCases: [
    "Elevator selfie content",
    "Going-out imagery",
    "Outfit check campaigns",
    "On-the-go luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3, elevator mirror selfie.

Hair: illuminated brown, polished styling, going-out hair. Hyper-realistic.

Scene: woman taking full-length selfie in elevator mirror.

**OUTFIT & STYLING:**
Going-out outfit - dress and heels, or chic tailored suit, designer bag. Accessories: statement jewelry, designer handbag, sunglasses, phone case visible.

**POSE & EXPRESSION:**
Standing checking outfit, phone covering face or held at side, confident stance.

**LIGHTING:**
Elevator lighting creating even illumination, possibly slight overhead lighting.

**ENVIRONMENT:**
Luxury elevator interior, brass details, marble or wood paneling, button panel visible.

**CAMERA:**
iPhone through mirror, full body visible, hotel or building elevator aesthetic.

**MOOD:**
Confident outfit moment, elevator content, on-the-go luxury – sophisticated elevator selfie.`.trim()
  },
}

export const SELFIE_TRYING_ROOM: PromptTemplate = {
  id: "selfie_trying_room",
  name: "Trying Room Selfie",
  description:
    "Boutique dressing room mirror selfie showing outfit being tried on with shopping moment aesthetic.",
  useCases: [
    "Shopping selfie content",
    "Dressing room imagery",
    "Fashion try-on campaigns",
    "Shopping lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, dressing room mirror selfie.

Hair: illuminated brown, shopping day styling, practical yet styled. Hyper-realistic.

Scene: woman taking mirror selfie in upscale boutique dressing room, trying on outfit.

**OUTFIT & STYLING:**
New outfit being tried - dress, jeans and top combination, or coordinated set, tags possibly visible. Accessories: personal bag and items on dressing room chair/bench.

**POSE & EXPRESSION:**
Showing outfit from front, slight turn, checking fit, phone partially obscuring face.

**LIGHTING:**
Dressing room lighting, bright even illumination for trying on clothes.

**ENVIRONMENT:**
Upscale boutique fitting room, hooks, mirror, clothing items, curtain partially visible.

**CAMERA:**
iPhone through mirror, showing outfit being tried, shopping moment.

**MOOD:**
Shopping content, outfit try-on, fashion decision moment – authentic dressing room selfie.`.trim()
  },
}

export const SELFIE_GYM_POST_WORKOUT: PromptTemplate = {
  id: "selfie_gym_post_workout",
  name: "Gym Selfie Post-Workout",
  description:
    "Post-workout gym mirror selfie with athleisure and confident fitness achievement aesthetic.",
  useCases: [
    "Gym selfie content",
    "Fitness imagery",
    "Workout achievement campaigns",
    "Active lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3, gym mirror selfie.

Hair: illuminated brown, high ponytail or bun, athletic styling. Hyper-realistic.

Scene: woman taking mirror selfie in gym, post-workout glow.

**OUTFIT & STYLING:**
Matching athleisure set - sports bra and leggings in neutral or bold color. Accessories: Apple Watch, water bottle, gym bag visible, minimal jewelry.

**POSE & EXPRESSION:**
Arm holding phone, other arm flexed or relaxed at side, confident post-workout expression.

**LIGHTING:**
Bright gym lighting, creating energetic athletic aesthetic.

**ENVIRONMENT:**
Clean modern gym, equipment in background, mirrors, motivational setting.

**CAMERA:**
iPhone through gym mirror, upper body and workout visible, gym equipment in background.

**MOOD:**
Fitness achievement, workout dedication, strong confidence – authentic gym selfie.`.trim()
  },
}

export const SELFIE_HOTEL_ROOM: PromptTemplate = {
  id: "selfie_hotel_room",
  name: "Hotel Room Selfie",
  description:
    "Luxury hotel room selfie post-arrival with travel casual styling and vacation aesthetic.",
  useCases: [
    "Hotel selfie content",
    "Travel lifestyle imagery",
    "Vacation arrival campaigns",
    "Travel luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, hotel room selfie.

Hair: illuminated brown, relaxed vacation styling, natural waves. Hyper-realistic.

Scene: woman taking selfie in luxury hotel room, robe or casual outfit, post-arrival.

**OUTFIT & STYLING:**
Hotel robe or travel casual wear, comfortable luxury. Accessories: minimal jewelry, possibly room key card, coffee cup, travel essentials visible.

**POSE & EXPRESSION:**
Seated on bed or standing near window, phone in hand, relaxed travel expression.

**LIGHTING:**
Natural hotel window light or warm hotel room lighting.

**ENVIRONMENT:**
Luxury hotel interior, crisp white bedding, city view or elegant room décor.

**CAMERA:**
iPhone selfie, showing partial room behind, travel moment.

**MOOD:**
Travel luxury, arrival moment, vacation begins content – authentic hotel selfie.`.trim()
  },
}

export const SELFIE_SUNSET_BEACH: PromptTemplate = {
  id: "selfie_sunset_beach",
  name: "Sunset Beach Selfie",
  description:
    "Golden hour beach selfie with ocean backdrop and carefree vacation aesthetic.",
  useCases: [
    "Beach selfie content",
    "Vacation imagery",
    "Travel selfie campaigns",
    "Carefree luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3, outdoor beach selfie.

Hair: illuminated brown, natural beachy waves, windswept texture. Hyper-realistic.

Scene: woman taking selfie on beach at sunset, ocean and golden sky in background.

**OUTFIT & STYLING:**
Casual beach outfit - white linen shirt, bikini top, or sundress. Accessories: minimal jewelry, sunglasses on head, sun-kissed glowing skin.

**POSE & EXPRESSION:**
Arm extended holding phone, other hand in hair or relaxed, natural happy expression, wind in hair.

**LIGHTING:**
Golden hour sunset creating warm glow, backlit creating halo effect.

**ENVIRONMENT:**
Beach background, ocean, sunset sky, soft sand.

**CAMERA:**
iPhone front camera, arm extended, golden hour perspective, slight high angle.

**MOOD:**
Vacation bliss, travel content, carefree luxury – authentic beach selfie.`.trim()
  },
}

export const SELFIE_CITY_ROOFTOP: PromptTemplate = {
  id: "selfie_city_rooftop",
  name: "City Rooftop Selfie",
  description:
    "Evening rooftop selfie with city skyline and going-out aesthetic.",
  useCases: [
    "Rooftop selfie content",
    "City nightlife imagery",
    "Evening social campaigns",
    "Urban luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, rooftop selfie.

Hair: illuminated brown, styled for evening out, polished waves. Hyper-realistic.

Scene: woman taking selfie on rooftop bar/terrace, city skyline and lights in background.

**OUTFIT & STYLING:**
Evening casual - nice top or dress, going-out look. Accessories: cocktail in other hand or on table, jewelry, evening makeup.

**POSE & EXPRESSION:**
Arm extended with phone, slight angle showing city view, happy confident evening expression.

**LIGHTING:**
Twilight or evening lighting, city lights creating bokeh, ambient rooftop lighting.

**ENVIRONMENT:**
Rooftop setting, city skyline, blurred people in background, urban luxury.

**CAMERA:**
iPhone front camera, holding at arm's length, evening light, city behind.

**MOOD:**
City nightlife, social moment, elevated lifestyle – sophisticated rooftop selfie.`.trim()
  },
}

export const SELFIES = {
  SELFIE_GOLDEN_HOUR_WINDOW,
  SELFIE_MIRROR_OUTFIT,
  SELFIE_CAR_LUXE,
  SELFIE_BATHROOM_GLAM,
  SELFIE_COFFEE_SHOP,
  SELFIE_BED_MORNING,
  SELFIE_ELEVATOR_MIRROR,
  SELFIE_TRYING_ROOM,
  SELFIE_GYM_POST_WORKOUT,
  SELFIE_HOTEL_ROOM,
  SELFIE_SUNSET_BEACH,
  SELFIE_CITY_ROOFTOP,
} satisfies Record<string, PromptTemplate>

