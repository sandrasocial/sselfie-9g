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

// ---------- General Lifestyle/Wellness Templates ----------

export const LIFESTYLE_MINIMALIST_BATHROOM: PromptTemplate = {
  id: "lifestyle_minimalist_bathroom",
  name: "Minimalist Bathroom Scene",
  description:
    "Cozy minimalist bathroom portrait with bathtub, candles and clean aesthetic.",
  useCases: [
    "Wellness lifestyle content",
    "Self-care imagery",
    "Pinterest-style bathroom",
    "Relaxation lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Illuminated brown hair, long, with waves and natural volume. Without altering eye color, features or skin tone. Hyper-realistic.

Modern and minimalist environment with sophisticated bathtub in neutral tones.

**SETTING:**
Elegant white bathtub with clean edges, water with light foam and organized. Light minimalist wood tray over bathtub with open book and discreet tea cup. Lit candle in background bringing cozy atmosphere without excess.

**POSE & EXPRESSION:**
Relaxed yet elegant pose, gently holding bit of foam with natural and spontaneous smile. Expression transmitting tranquility and wellbeing.

**LIGHTING:**
Soft natural light entering through nearby window, creating delicate shadows and realistic skin tones.

**CAMERA:**
Camera positioned at approximately 1 meter distance, using 35mm lens with main focus on face and expression.

**MOOD:**
Cozy yet clean scenario, real skin texture, genuine smile, feminine vibe, light and aesthetic Pinterest style.`.trim()
  },
}

export const LIFESTYLE_OUTDOOR_CAFE: PromptTemplate = {
  id: "lifestyle_outdoor_cafe",
  name: "Outdoor Cafe Scene",
  description:
    "Sunny outdoor cafe portrait with iced coffee and urban background.",
  useCases: [
    "Cafe lifestyle content",
    "Urban lifestyle imagery",
    "Outdoor lifestyle",
    "Coffee moment content",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Illuminated brown hair, long, with waves and natural volume. Without altering eye color, features or skin tone. Hyper-realistic.

Outdoor sunny photo with direct natural light.

**OUTFIT & STYLING:**
Beige pastel knit set with fallen shoulder and slightly visible belly. Relaxed and comfortable lifestyle look.

**POSE & EXPRESSION:**
Model leaning against light wall, holding iced coffee with straw and fabric bag. Relaxed expression with light smile.

**ENVIRONMENT:**
Urban background with windows shining in sun and glass reflections. Medium depth of field with soft bokeh.

**LIGHTING:**
Direct natural sunlight creating highlights on hair and skin, with urban reflections adding depth.

**CAMERA:**
Camera at approximately 1 meter, slightly low angle simulating 50mm lens.

**MOOD:**
Relaxed urban lifestyle moment – casual, sunny and aspirational.`.trim()
  },
}

export const LIFESTYLE_PRIVATE_JET: PromptTemplate = {
  id: "lifestyle_private_jet",
  name: "Private Jet Interior",
  description:
    "Luxury private jet interior portrait with golden hour lighting and sophisticated atmosphere.",
  useCases: [
    "Luxury travel content",
    "Private jet lifestyle",
    "High-end travel campaigns",
    "Exclusive travel editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Illuminated brown hair, long, with waves and natural volume. Without altering eye color, features or skin tone. Hyper-realistic.

Photo inside private jet interior with golden hour light entering through window.

**OUTFIT & STYLING:**
Sophisticated beige look with front zipper and plush cuffs. Elegant and luxurious travel aesthetic.

**POSE & EXPRESSION:**
Model seated in light leather armchair holding champagne glass with elegant posture. Confident expression with light smile.

**ENVIRONMENT:**
Private jet interior with luxury leather seats, panoramic windows and refined details.

**LIGHTING:**
Golden hour light entering through window, creating golden reflections on face and hair creating cinematographic effect.

**CAMERA:**
Camera at approximately 90cm, 50mm lens. Sharp focus on face, with jet interior softly blurred.

**MOOD:**
Luxury travel editorial – exclusive, sophisticated and aspirational private jet moment.`.trim()
  },
}

export const LIFESTYLE_LUXURY_SUV: PromptTemplate = {
  id: "lifestyle_luxury_suv",
  name: "Luxury SUV Interior",
  description:
    "Fitness lifestyle portrait in luxury SUV with panoramic sunroof and athletic aesthetic.",
  useCases: [
    "Fitness lifestyle content",
    "Luxury car lifestyle",
    "Wellness campaigns",
    "Athletic lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Maintain characteristics of woman in attachment without changing features. Illuminated brown hair, long, with waves and volume pinned in low ponytail passing behind shoulder. Without altering eye color or skin. Hyper-realistic.

Photo taken inside luxury SUV Land Rover style with caramel leather seats and open panoramic sunroof showing sky and natural light.

**OUTFIT & STYLING:**
Fitness look in graphite tone: fitted sports jacket with partially open zipper and matching leggings. Body with athletic proportions and light visible definition in arms, shoulders and abdomen, maintaining natural appearance, healthy and realistic — without exaggerations.

**POSE & EXPRESSION:**
She is seated in driver seat, wearing seatbelt. Right hand holds transparent shaker with clear lid. Confident expression and light closed smile, transmitting sensation of focus, discipline and healthy routine.

**LIGHTING:**
Strong natural light entering through panoramic sunroof behind her, creating soft flare at top of image and shine in hair.

**CAMERA:**
Camera positioned at approximately 60-70 cm from face, at height aligned with eyes, simulating 35mm lens. Framing of frame up above head, car interior slightly blurred.

**MOOD:**
Fitness lifestyle editorial – healthy, disciplined and aspirational wellness moment.`.trim()
  },
}

export const LIFESTYLE_MODERN_STAIRCASE: PromptTemplate = {
  id: "lifestyle_modern_staircase",
  name: "Modern Staircase Portrait",
  description:
    "Sophisticated feminine portrait on modern staircase with LED lighting and minimalist design.",
  useCases: [
    "Modern interior content",
    "Architectural lifestyle",
    "Fashion editorial",
    "Contemporary lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Sharp face. Create sophisticated feminine portrait on modern staircase with curved design and minimalist interior.

Vertical portrait 2:3, 35mm or 50mm f/1.8, fashion editorial style.

**POSE & EXPRESSION:**
Person is seated on one of steps, in elegant and natural posture. One leg bent and other gently extended, transmitting confidence. Gaze directed at camera, with neutral and confident expression.

**OUTFIT & STYLING:**
Short and structured dress with long sleeves in light tone (off-white or beige), with detail on back that highlights design of piece. Accessories: light Prada bag positioned beside on step, minimalist earrings and fine ring. Footwear: elegant sandals with fine straps on ankle in golden tone.

**HAIR & MAKEUP:**
Dark brown hair, loose with light waves and natural volume. Natural, confident, skin with glow finish, peach blush, discreet eyeliner, warm shadows, defined lashes, well-structured eyebrows and subtle highlighter on high points of face.

**ENVIRONMENT:**
Modern environment, white staircase with linear light, clean aesthetic, editorial tone, refined and current.

**LIGHTING:**
Artificial and indirect, with embedded LED lines creating warm and elegant reflections and adding depth to scene.

**CAMERA:**
35mm or 50mm f/1.8, fashion editorial style. Sharp focus on face and outfit.

**MOOD:**
Editorial tone, refined and current – modern minimalist lifestyle with sophisticated aesthetic.`.trim()
  },
}

export const LIFESTYLE_MARBLE_INTERIOR: PromptTemplate = {
  id: "lifestyle_marble_interior",
  name: "Marble Minimalist Interior",
  description:
    "Relaxed minimalist interior portrait with marble finish and clean aesthetic.",
  useCases: [
    "Minimalist lifestyle content",
    "Interior lifestyle imagery",
    "Clean aesthetic campaigns",
    "Contemporary lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Illuminated brown hair, long, with waves and natural volume. Without altering features, eye color or skin tone. Hyper-realistic.

Modern environment with minimalist decoration and light marble finish.

**POSE & EXPRESSION:**
Person is in relaxed position, with light and spontaneous expression, transmitting calm and comfort. Hands gently resting, with natural and elegant posture.

**PROPS:**
Beside, on organized tray, there is open book and light clear cup with warm drink releasing soft steam.

**LIGHTING:**
Soft and natural light entering through large side window, creating warm and realistic tones in lighting.

**CAMERA:**
Photography made with camera positioned at approximately 1 meter distance, using lens equivalent to 35mm, with focus on face and soft background blur.

**MOOD:**
Composition transmits elegance, tranquility and premium clean aesthetic, maintaining neutral tones, minimal visual and sophisticated contemporary style.`.trim()
  },
}

export const LIFESTYLE_LUXURY_SHOPPING: PromptTemplate = {
  id: "lifestyle_luxury_shopping",
  name: "Luxury Shopping Scene",
  description:
    "Luxury shopping moment with designer bags and gift wrapping creating aspirational atmosphere.",
  useCases: [
    "Shopping lifestyle content",
    "Luxury lifestyle imagery",
    "Retail campaigns",
    "Aspirational lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain original characteristics of person. Illuminated brown hair, long, with waves and volume.

Vertical photo with natural light coming from right.

**POSE & EXPRESSION:**
Woman seated on carpet with crossed legs. Holds black shoe with one hand raised at face height while other hand rests on ground. Neutral expression looking directly at camera.

**OUTFIT & STYLING:**
Loose brown sweatshirt and white shorts. Casual luxury aesthetic.

**ENVIRONMENT:**
Various luxury brand shopping bags like Chanel, Hermes etc, open boxes and gift wrapping paper around creating recent shopping atmosphere.

**LIGHTING:**
Natural light coming from right, creating soft highlights and realistic shadows.

**CAMERA:**
Vertical framing, sharp focus on face and shopping elements.

**MOOD:**
Luxury shopping lifestyle – aspirational, casual and sophisticated moment.`.trim()
  },
}

export const LIFESTYLE_MAGAZINE_READING: PromptTemplate = {
  id: "lifestyle_magazine_reading",
  name: "Magazine Reading Scene",
  description:
    "Elegant magazine reading moment with organized beauty products and sophisticated atmosphere.",
  useCases: [
    "Reading lifestyle content",
    "Beauty lifestyle imagery",
    "Relaxation campaigns",
    "Sophisticated lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain original characteristics of person. Illuminated brown hair, long, with waves and volume.

Vertical photo in illuminated and elegant environment.

**POSE & EXPRESSION:**
Woman seated reading magazine with relaxed posture, confident expression with direct gaze.

**OUTFIT & STYLING:**
Soft pink top, brown mini skirt and metallic belt. Elegant and sophisticated look.

**ENVIRONMENT:**
Background with organized bench, aligned nail polishes and lighting with shiny highlights.

**LIGHTING:**
Illuminated and elegant environment with soft highlights on products and face.

**CAMERA:**
Vertical framing, sharp focus on face and magazine.

**MOOD:**
Sophisticated lifestyle moment – elegant, organized and aspirational.`.trim()
  },
}

export const LIFESTYLE_OUTDOOR_WALKING: PromptTemplate = {
  id: "lifestyle_outdoor_walking",
  name: "Outdoor Walking Scene",
  description:
    "Fun outdoor walking moment with ice cream and pastel park setting.",
  useCases: [
    "Outdoor lifestyle content",
    "Park lifestyle imagery",
    "Casual lifestyle campaigns",
    "Fun lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain original characteristics of person. Illuminated brown hair, long, with waves and volume.

Full body outdoor vertical photo.

**POSE & EXPRESSION:**
Woman walking while holding ice cream, with closed smile. Relaxed and fun expression.

**OUTFIT & STYLING:**
Light pink corset, white short skirt and white sneakers. Small pink bag crossed on shoulder. Playful and feminine look.

**ENVIRONMENT:**
Setting with pastel themed park, illuminated signs, fun and relaxed atmosphere.

**LIGHTING:**
Natural outdoor light creating soft highlights and cheerful atmosphere.

**CAMERA:**
Full body framing, vertical composition.

**MOOD:**
Fun and relaxed atmosphere – playful, casual and aspirational lifestyle moment.`.trim()
  },
}

export const LIFESTYLE_MODERN_KITCHEN: PromptTemplate = {
  id: "lifestyle_modern_kitchen",
  name: "Modern Kitchen Scene",
  description:
    "Clean modern kitchen portrait with minimalist elements and organized aesthetic.",
  useCases: [
    "Kitchen lifestyle content",
    "Home lifestyle imagery",
    "Minimalist campaigns",
    "Contemporary lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain original characteristics of person. Illuminated brown hair, long, with waves and volume.

Vertical photo in illuminated and elegant environment.

**POSE & EXPRESSION:**
Woman from side, with one hand resting on counter and other holding pink glass with lid and straw near mouth. Soft expression, looking directly at camera.

**OUTFIT & STYLING:**
Fitted white long sleeve top and light pink shorts. Clean and minimal look.

**ENVIRONMENT:**
White kitchen, organized, with minimalist elements and decorative dry plants in background.

**LIGHTING:**
Illuminated and elegant environment with soft highlights.

**CAMERA:**
Vertical framing, sharp focus on face and hands.

**MOOD:**
Clean modern lifestyle – organized, minimalist and sophisticated.`.trim()
  },
}

export const LIFESTYLE_MIRROR_SELFIE: PromptTemplate = {
  id: "lifestyle_mirror_selfie",
  name: "Mirror Selfie",
  description:
    "Elegant mirror selfie with voluminous coat and minimalist hallway background.",
  useCases: [
    "Selfie lifestyle content",
    "Mirror outfit imagery",
    "Casual lifestyle campaigns",
    "Everyday lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical selfie in mirror, soft internal lighting.

Woman with illuminated brown hair, long, with volume and soft waves. Standing holding phone with one hand.

**OUTFIT & STYLING:**
Voluminous beige coat, white top and white shorts. Small bag with animal print. Elegant and comfortable look.

**ENVIRONMENT:**
Minimalist background with light hallway and dry plants.

**LIGHTING:**
Soft internal lighting creating gentle highlights.

**CAMERA:**
Mirror selfie framing, vertical composition.

**MOOD:**
Neutral and elegant expression – casual, sophisticated and relatable lifestyle moment.`.trim()
  },
}

export const LIFESTYLE_BALCONY_SUNSET: PromptTemplate = {
  id: "lifestyle_balcony_sunset",
  name: "Modern Balcony Sunset",
  description:
    "Elegant balcony portrait at sunset with city backdrop and warm lighting.",
  useCases: [
    "Balcony lifestyle content",
    "Sunset lifestyle imagery",
    "City lifestyle campaigns",
    "Evening lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical photo 2:3, 50mm camera, sharp face focus. Outdoor scene at modern balcony at sunset, city in background with soft and blurred light.

Illuminated brown hair with waves and volume.

**POSE & EXPRESSION:**
Woman standing with elegant posture, one leg slightly forward. Holds drink glass with right hand. Light expression with soft smile.

**OUTFIT & STYLING:**
Short sleeveless white dress, feather belt. Small metallic shoulder bag. Elegant and sophisticated look.

**ENVIRONMENT:**
Modern balcony with pendant lamps in background creating cozy atmosphere. City skyline softly blurred.

**LIGHTING:**
Warm side light illuminating face and hair. Sunset creating golden highlights.

**CAMERA:**
50mm camera, sharp face focus. Vertical 2:3 framing.

**MOOD:**
Cozy and elegant – sophisticated evening lifestyle moment with warm sunset atmosphere.`.trim()
  },
}

export const LIFESTYLE_BED_SCENE: PromptTemplate = {
  id: "lifestyle_bed_scene",
  name: "Natural Light Bed Scene",
  description:
    "Cozy bed scene with natural light, robe and relaxed morning atmosphere.",
  useCases: [
    "Bedroom lifestyle content",
    "Morning lifestyle imagery",
    "Cozy lifestyle campaigns",
    "Relaxation lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Vertical photo, soft natural light from left side.

Woman with illuminated brown hair, long, with volume and soft waves.

**POSE & EXPRESSION:**
Seated on bed with one leg bent and other extended. Holds mug with two hands near lips. Fun expression, looking at camera.

**OUTFIT & STYLING:**
Pink robe and is over blanket with animal print. Cozy and comfortable look.

**ENVIRONMENT:**
Environment with lit candle and neutral details. Bedroom with soft, welcoming atmosphere.

**LIGHTING:**
Soft natural light from left side, creating gentle highlights and cozy shadows.

**CAMERA:**
Vertical framing, sharp focus on face and hands.

**MOOD:**
Fun and cozy – relaxed morning lifestyle moment with warm, welcoming atmosphere.`.trim()
  },
}

export const LIFESTYLE_ELEGANT_BATHROOM: PromptTemplate = {
  id: "lifestyle_elegant_bathroom",
  name: "Elegant Bathroom with Window",
  description:
    "Sophisticated bathroom portrait with frosted window, bathtub and wellness atmosphere.",
  useCases: [
    "Bathroom lifestyle content",
    "Wellness lifestyle imagery",
    "Self-care campaigns",
    "Pinterest editorial style",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Maintain characteristics of woman in attachment without changing features. Illuminated brown hair, long, with waves and natural volume. Without altering eye color or skin. Hyper-realistic.

Elegant bathroom with walls in neutral tone and large frosted glass window with visible drops and soft golden light entering from outside.

**SETTING:**
Classic style white bathtub with light and organized foam. Wooden tray resting on bathtub containing: open book, lit amber candle and light clear cup with warm drink releasing soft steam.

**POSE & EXPRESSION:**
She is reclined with relaxed posture, holding foam in hands raised in front of face. Harmonious expression with light and natural closed smile, transmitting tranquility and sensation of wellbeing.

**LIGHTING:**
Warm natural light is main source, creating soft reflections and welcoming tones.

**CAMERA:**
Camera positioned at approximately 1.5 m distance, on side, slightly above bathtub edge, simulating 35mm lens. Framing showing from chest to upper part of bathtub, background and surrounding elements with light cinematographic blur.

**MOOD:**
Clean aesthetic, modern and cozy — Pinterest editorial photo style. Wellness and tranquility atmosphere.`.trim()
  },
}

// ---------- Luxury Lifestyle Templates ----------

export const LUXURY_PRIVATE_JET_STAIRCASE: PromptTemplate = {
  id: "luxury_private_jet_staircase",
  name: "Private Jet Staircase",
  description:
    "Ultra-luxury private jet staircase portrait with designer accessories and golden hour lighting.",
  useCases: [
    "Ultra-luxury travel content",
    "Private jet lifestyle",
    "High-end travel campaigns",
    "Exclusive luxury editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain exactly same features of woman from reference image, without altering facial structure, without softening or thinning excessively.

Portrait 2:3 format. General aesthetic: hyper-realistic, international luxury editorial.

Scene: woman descending staircase of private jet during golden hour, golden light coming from behind creating silky halo in hair.

**HAIR & SKIN:**
Hair: illuminated brown, long with light waves and glamorous volume, soft shine reflecting sunset. Skin: natural glow with real texture, without plastic effect.

**MAKEUP:**
Striking eyes with depth, fuller mouth with elegant finish, soft and illuminated contour.

**OUTFIT & STYLING:**
Chic white off set — high-waisted tailoring pants + structured corset with subtle cutouts and silky finish; blazer lightly resting on shoulders for power and elegance effect.

**ACCESSORIES:**
Structured Hermès Birkin bag in caramel leather. Travel suitcase Louis Vuitton Monogram (Horizon or Keepall model) beside, with shiny golden hardware. Aviator style gold sunglasses held in right hand. Jewelry: fine gold watch + delicate bracelet.

**POSE & EXPRESSION:**
Body turned slightly to right, descending steps with impeccable posture, chin elevated, confident expression.

**LIGHTING:**
Warm sun flare from behind, illuminating hair waves, discreet shine on skin.

**ENVIRONMENT:**
Private runway, jet with open door in background, high-class travel atmosphere.

**CAMERA:**
Camera angle: slightly low upward to transmit authority and presence. Camera distance: American shot (from knees upward). 50mm or 85mm lens.

**MOOD:**
Silent wealth, powerful elegance, international life – ultra-luxury travel editorial.`.trim()
  },
}

export const LUXURY_G_WAGON: PromptTemplate = {
  id: "luxury_g_wagon",
  name: "G-Wagon Interior",
  description:
    "Luxury G-Wagon interior portrait with elegant styling and sophisticated atmosphere.",
  useCases: [
    "Luxury car lifestyle content",
    "High-end automotive imagery",
    "Luxury lifestyle campaigns",
    "Exclusive lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Maintain the woman's characteristics from attachment without changing features. Without altering hair color, eyes, skin color. Hyper-realistic.

Vertical portrait 2:3. Camera at ~1.8m, 85mm lens.

**ENVIRONMENT:**
Gray G-Wagon with wine interior.

**POSE & EXPRESSION:**
Character seated in open door, legs extended outward, holding structured red bag on lap. Elegant and confident expression, direct gaze.

**OUTFIT & STYLING:**
Short black dress long sleeve, black heels, loose wavy hair. Sophisticated and elegant look.

**LIGHTING:**
Soft lighting + warm car internal lighting creating highlights on outfit and accessories.

**CAMERA:**
85mm lens, ~1.8m distance. Sharp focus on face and outfit.

**MOOD:**
Luxury automotive lifestyle – sophisticated, elegant and exclusive.`.trim()
  },
}

export const LUXURY_PRIVATE_LOUNGE: PromptTemplate = {
  id: "luxury_private_lounge",
  name: "Private Lounge",
  description:
    "Modern private lounge portrait with luxury accessories and high-standard traveler aesthetic.",
  useCases: [
    "Luxury lounge content",
    "Private lounge lifestyle",
    "High-end travel campaigns",
    "Exclusive lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same face. Format 2:3.

Illuminated brown hair, soft waves. Sharp face.

Setting: modern private lounge, marble + beige furniture.

**OUTFIT & STYLING:**
White blazer + straight pants + nude heels + Hermès Birkin bag beside. Sophisticated and elegant look.

**POSE & EXPRESSION:**
Seated, leaning elbow on table, holding passport and boarding card. Confident and elegant expression.

**LIGHTING:**
Warm ambient lighting + soft natural touch creating sophisticated atmosphere.

**CAMERA:**
50mm or 85mm lens, vertical 2:3 framing. Sharp focus on face and accessories.

**MOOD:**
High-standard traveler, global lifestyle – luxury private lounge moment with sophisticated atmosphere.`.trim()
  },
}

export const LUXURY_HOTEL_LOBBY: PromptTemplate = {
  id: "luxury_hotel_lobby",
  name: "Luxury Hotel Lobby",
  description:
    "Ultra-luxury hotel lobby portrait with designer accessories and cinematographic lighting.",
  useCases: [
    "Luxury hotel content",
    "Hotel lobby lifestyle",
    "High-end travel campaigns",
    "Exclusive luxury editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain exactly same woman from reference, 100% faithful features.

Vertical format 2:3.

**HAIR & SKIN:**
Hair: illuminated brown with polished waves and soft shine. Warm skin, illuminated, silky finish.

**MAKEUP:**
Natural elegant makeup (soft contour + warm nude lipstick).

**SETTING:**
Luxury hotel lobby (golden tones, cream marble, tall white floral arrangements).

**OUTFIT & STYLING:**
Beige Burberry Trench coat slightly open, revealing silk blouse underneath.

**ACCESSORIES:**
Large "Old Money" style sunglasses resting on head. Cartier Love Bracelet. Cartier Tank Louis Watch. Louis Vuitton Capucines mini bag beside coffee.

**POSE & EXPRESSION:**
Holding latte coffee cup, calm and powerful expression, impeccable posture.

**LIGHTING:**
Warm, soft and cinematographic, reflecting on marble.

**CAMERA:**
85mm lens, distance ~1.2m, absolute focus on face.

**MOOD:**
Ultra-luxury hotel lobby – sophisticated, powerful and exclusive lifestyle moment.`.trim()
  },
}

export const LUXURY_HOTEL_SUITE: PromptTemplate = {
  id: "luxury_hotel_suite",
  name: "Hotel Suite Window",
  description:
    "Elegant hotel suite portrait with window, champagne and silent luxury aesthetic.",
  useCases: [
    "Luxury hotel content",
    "Hotel suite lifestyle",
    "High-end travel campaigns",
    "Exclusive luxury editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: same woman, identical features, serene and confident expression.

Hyper-realistic. Camera: 35-50mm lens, medium framing (from waist to top of head).

**POSE & EXPRESSION:**
Face position: 3/4, looking lightly to side. Standing, beside large window with translucent curtains, holding champagne glass by stem.

**OUTFIT & STYLING:**
Sea foam silk dress with soft drape. Jewelry: medium gold hoops + sculptural bracelet + bold rings.

**ENVIRONMENT:**
5-star hotel suite with cream walls, tall curtains and white floral arrangement.

**LIGHTING:**
Golden light entering laterally, creating highlights on dress and jewelry.

**CAMERA:**
35-50mm lens, medium framing. Sharp focus on face and hands.

**MOOD:**
Silent luxury and untouchable – ultra-luxury hotel suite moment with sophisticated elegance.`.trim()
  },
}

export const LUXURY_HERMES_BOUTIQUE: PromptTemplate = {
  id: "luxury_hermes_boutique",
  name: "Hermès Boutique Shopping",
  description:
    "Ultra-luxury Hermès boutique portrait with designer pieces and exclusive atmosphere.",
  useCases: [
    "Luxury shopping content",
    "Hermès boutique lifestyle",
    "High-end retail campaigns",
    "Exclusive luxury editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same woman from reference image (her features), without altering eye format, nose, mouth, cheekbones of face or skin color.

Format: vertical portrait 2:3, hyper-realistic.

**HAIR:**
Illuminated brown, long, soft waves with natural shine, light volume at root.

**SETTING:**
Hermès boutique interior, warm lighting, bag shelves in background.

**OUTFIT & STYLING:**
Exactly same Hermès cropped sweater in light beige knit, short modeling, round collar, short sleeve, with Hermès logo embroidered in black on front part (same size, same font and same positioning). Pants: light beige tailoring, front pleats, elegant fit.

**ACCESSORIES:**
Watch: bracelet and classic gold box. Small gold earrings. Orange Hermès shopping bag.

**POSE & EXPRESSION:**
Holding cell phone with one hand at chest height, other hand holding orange Hermès shopping bag. Expression: neutral elegant, without exaggerated smile.

**LIGHTING:**
Warm diffused light, skin with natural glow.

**CAMERA:**
50mm, focus on face and knit texture.

**MOOD:**
Silent luxury, sophisticated exclusivity atmosphere – ultra-luxury Hermès boutique moment.`.trim()
  },
}

export const LUXURY_HERMES_BAG: PromptTemplate = {
  id: "luxury_hermes_bag",
  name: "Hermès Boutique Shopping Bag",
  description:
    "Elegant Hermès boutique portrait focusing on bag and refined styling.",
  useCases: [
    "Luxury shopping content",
    "Hermès boutique lifestyle",
    "High-end retail campaigns",
    "Exclusive luxury editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain delicate and harmonious aesthetic style, without copying real identity.

Format: vertical portrait 2:3, hyper-realistic.

**HAIR:**
Illuminated brown, polished waves with subtle shine.

**SETTING:**
Hermès boutique, minimalist shelves in background.

**OUTFIT & STYLING:**
Same Hermès cropped sweater in light beige knit with logo embroidered in black + light beige tailoring pants.

**ACCESSORIES:**
Gold watch + small gold earrings. Hermès bag in hand.

**POSE & EXPRESSION:**
Standing straightening Hermès bag strap in hand, gaze lightly downward. Expression: calm and confident, without smile.

**LIGHTING:**
Store warm lighting, skin with natural glow.

**CAMERA:**
50mm, focus on face and knit texture.

**MOOD:**
Silent luxury and refined – sophisticated Hermès boutique moment with exclusive atmosphere.`.trim()
  },
}

export const LUXURY_MORNING_CAFE: PromptTemplate = {
  id: "luxury_morning_cafe",
  name: "Morning Café Scene",
  description:
    "Sophisticated morning café portrait with high city view and contemplative atmosphere.",
  useCases: [
    "Luxury café content",
    "Morning lifestyle imagery",
    "High-end lifestyle campaigns",
    "Exclusive lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain true features and original proportions.

Format: vertical portrait 2:3.

**HAIR & MAKEUP:**
Hair: soft waves, polished, natural shine. Makeup: illuminated skin, nude pink lips.

**SETTING:**
Morning café at table with high city view.

**OUTFIT & STYLING:**
White masculine shirt lightly open at collar. Accessories: gold watch + minimalist ring.

**POSE & EXPRESSION:**
Holding cup while looking through window. Expression: contemplative, effortless powerful.

**LIGHTING:**
Soft morning light creating gentle highlights.

**CAMERA:**
50mm, focus on face and hand with cup.

**MOOD:**
"She works, she travels, she lives well" – sophisticated morning café moment with powerful elegance.`.trim()
  },
}

export const LUXURY_CAR_SHOPPING: PromptTemplate = {
  id: "luxury_car_shopping",
  name: "Car Shopping Scene",
  description:
    "Luxury car shopping scene with Chanel bags and glamorous styling.",
  useCases: [
    "Luxury shopping content",
    "Car lifestyle imagery",
    "High-end lifestyle campaigns",
    "Exclusive luxury editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Create medium shot picture of woman unchanged her face. She has wavy brown hair, sitting elegantly on car, on second line passenger seat.

**OUTFIT & STYLING:**
She wearing ivory suit, black belt, with soft brown blazer. Her makeup so stunning eyeliner, eyelashes, blush, contour, and lips (glamour looks). She wearing gold earring and simple little gold chain, and silver watch.

**ENVIRONMENT:**
Around her are lot of fancy shopping bag from "Chanel" (black paper bag, with white "Chanel", also big boxes from "Chanel" (black boxes with white ribbon). On her classic fancy car. Background is park with waterfalls.

**POSE & EXPRESSION:**
She's looking confidently to camera with slightly smile on her face.

**LIGHTING:**
Light comes from window in front of her. The light sunbathing her face and all stuff make contrast light, but look so clear and bright.

**CAMERA:**
Medium shot framing, sharp focus on face and shopping elements.

**MOOD:**
Luxury car shopping lifestyle – glamorous, confident and exclusive moment.`.trim()
  },
}

export const LIFESTYLE_BRANDS = {
  GLOSSIER_CLEAN_GIRL,
  FREE_PEOPLE_BOHEMIAN,
  LIFESTYLE_MINIMALIST_BATHROOM,
  LIFESTYLE_OUTDOOR_CAFE,
  LIFESTYLE_PRIVATE_JET,
  LIFESTYLE_LUXURY_SUV,
  LIFESTYLE_MODERN_STAIRCASE,
  LIFESTYLE_MARBLE_INTERIOR,
  LIFESTYLE_LUXURY_SHOPPING,
  LIFESTYLE_MAGAZINE_READING,
  LIFESTYLE_OUTDOOR_WALKING,
  LIFESTYLE_MODERN_KITCHEN,
  LIFESTYLE_MIRROR_SELFIE,
  LIFESTYLE_BALCONY_SUNSET,
  LIFESTYLE_BED_SCENE,
  LIFESTYLE_ELEGANT_BATHROOM,
  LUXURY_PRIVATE_JET_STAIRCASE,
  LUXURY_G_WAGON,
  LUXURY_PRIVATE_LOUNGE,
  LUXURY_HOTEL_LOBBY,
  LUXURY_HOTEL_SUITE,
  LUXURY_HERMES_BOUTIQUE,
  LUXURY_HERMES_BAG,
  LUXURY_MORNING_CAFE,
  LUXURY_CAR_SHOPPING,
} satisfies Record<string, PromptTemplate>
