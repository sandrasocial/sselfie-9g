// Tech Lifestyle templates – digital products, devices, and tech-enhanced lifestyle
// These are lifestyle (not brand-specific) high-end prompts for Studio Pro / Nano Banana flows.

import type { PromptTemplate, PromptContext } from "../types"

// ---------- Tech Lifestyle Templates ----------

export const TECH_HOME_OFFICE: PromptTemplate = {
  id: "tech_home_office",
  name: "Modern Home Office",
  description:
    "Professional home office portrait with MacBook, tech accessories and productive luxury aesthetic.",
  useCases: [
    "Home office content",
    "Work-from-home imagery",
    "Tech lifestyle campaigns",
    "Professional lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Illuminated brown hair, sleek professional styling, low ponytail or bun. Without altering features. Hyper-realistic.

Scene: woman at modern minimalist desk with MacBook Pro, external monitor, and tech accessories.

**OUTFIT & STYLING:**
Tailored white shirt, fitted blazer draped on chair, gold watch visible. Professional and elegant work aesthetic.

**ACCESSORIES:**
AirPods Pro on desk, iPhone Pro, leather notebook, minimal desk setup.

**POSE & EXPRESSION:**
Typing on laptop, looking at screen, natural working concentration with slight profile.

**LIGHTING:**
Natural window light from side, clean bright office aesthetic.

**ENVIRONMENT:**
Modern home office, white/grey tones, indoor plants, professional but personal.

**CAMERA:**
Camera at 1.5m, 50mm lens, environmental work portrait.

**MOOD:**
Female founder energy, productive luxury, work-from-home elegance – sophisticated professional moment.`.trim()
  },
}

export const TECH_UNBOXING_LUXURY: PromptTemplate = {
  id: "tech_unboxing_luxury",
  name: "Tech Unboxing Luxury",
  description:
    "Luxury tech unboxing portrait with Apple products and minimalist aesthetic.",
  useCases: [
    "Tech unboxing content",
    "Product lifestyle imagery",
    "Tech luxury campaigns",
    "Unboxing editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, natural waves, casual yet polished. Hyper-realistic.

Scene: woman at clean white surface with new MacBook box, iPhone box, and Apple products.

**OUTFIT & STYLING:**
Cream cashmere sweater, minimal jewelry, manicured hands visible. Accessories: Apple Watch, delicate rings, coffee cup nearby.

**POSE & EXPRESSION:**
Hands opening sleek product packaging, looking down at products with excited expression.

**LIGHTING:**
Bright clean lighting, product-focused, editorial tech aesthetic.

**ENVIRONMENT:**
Marble or white wood table, minimalist background, soft shadows.

**CAMERA:**
Camera at 1m, 50mm lens, overhead to eye-level angle.

**MOOD:**
Tech luxury lifestyle, new purchase excitement, minimalist aesthetic – sophisticated unboxing moment.`.trim()
  },
}

export const TECH_COFFEE_SHOP_WORK: PromptTemplate = {
  id: "tech_coffee_shop_work",
  name: "Coffee Shop Laptop Work",
  description:
    "Digital nomad portrait in upscale café with MacBook and productive atmosphere.",
  useCases: [
    "Coffee shop work content",
    "Digital nomad imagery",
    "Remote work campaigns",
    "Productive lifestyle editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, effortless bun with loose pieces. Hyper-realistic.

Scene: woman in upscale café working on MacBook Air, coffee and croissant beside laptop.

**OUTFIT & STYLING:**
Oversized camel sweater, gold layered necklaces, casual elegant. Accessories: AirPods in ears, latte in ceramic cup, phone charging via cable.

**POSE & EXPRESSION:**
Typing, slight smile, natural working moment, looking at screen.

**LIGHTING:**
Warm café lighting mixed with natural window light, cozy atmosphere.

**ENVIRONMENT:**
Modern coffee shop with plants, exposed brick or clean walls, other patrons blurred.

**CAMERA:**
Camera at 1.2m, 35mm lens, environmental portrait showing café ambiance.

**MOOD:**
Digital nomad luxury, productive lifestyle, effortless professional – sophisticated café work moment.`.trim()
  },
}

export const TECH_PODCAST_STUDIO: PromptTemplate = {
  id: "tech_podcast_studio",
  name: "Studio Podcast Recording",
  description:
    "Professional podcast studio portrait with microphone, headphones and media presence.",
  useCases: [
    "Podcast content",
    "Media production imagery",
    "Thought leader campaigns",
    "Professional media editorial",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, professional waves, polished styling. Hyper-realistic.

Scene: woman in podcast studio with professional microphone, headphones, laptop, and recording equipment.

**OUTFIT & STYLING:**
Structured blazer in neutral tone, simple gold jewelry, professional yet approachable.

**ACCESSORIES:**
Sony or Shure podcast mic on boom arm, closed-back headphones around neck, water bottle.

**POSE & EXPRESSION:**
Seated at recording table, hands gesturing naturally as if speaking, engaged expression.

**LIGHTING:**
Professional studio lighting, ring light creating catch light in eyes, warm tones.

**ENVIRONMENT:**
Modern podcast setup, acoustic panels, plants, branded backdrop or clean wall.

**CAMERA:**
Camera at 1.5m, 50mm lens, studio portrait composition.

**MOOD:**
Female entrepreneur, thought leader aesthetic, professional media presence – sophisticated podcast moment.`.trim()
  },
}

export const TECH_SMART_HOME: PromptTemplate = {
  id: "tech_smart_home",
  name: "Smart Home Control",
  description:
    "Modern smart home portrait with iPad, ambient lighting and seamless tech integration.",
  useCases: [
    "Smart home content",
    "Home automation imagery",
    "Tech lifestyle campaigns",
    "Future luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, casual luxe styling, natural texture. Hyper-realistic.

Scene: woman in modern home using iPad or smart home control panel, ambient lighting adjusting around her.

**OUTFIT & STYLING:**
Silk pajama set or luxe loungewear in neutral tone, barefoot or slippers. Accessories: Apple Watch, minimal rings, showing smart home interface on device.

**POSE & EXPRESSION:**
Standing or seated, holding tablet naturally, looking at screen with relaxed expression.

**LIGHTING:**
Smart lighting transitioning colors subtly, warm ambient home lighting.

**ENVIRONMENT:**
Modern smart home, visible tech integrations (smart speakers, automated blinds, ambient lights).

**CAMERA:**
Camera at 1.5m, 50mm lens, lifestyle tech moment.

**MOOD:**
Future luxury living, seamless tech lifestyle, effortless home automation – sophisticated smart home moment.`.trim()
  },
}

export const TECH_VIRTUAL_MEETING: PromptTemplate = {
  id: "tech_virtual_meeting",
  name: "Virtual Meeting Professional",
  description:
    "Professional video call setup with ring light, curated background and remote work aesthetic.",
  useCases: [
    "Remote work content",
    "Video call imagery",
    "Virtual meeting campaigns",
    "Professional remote lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, professional polished styling, camera-ready. Hyper-realistic.

Scene: woman at desk on video call, ring light visible, MacBook at perfect angle, curated background.

**OUTFIT & STYLING:**
Blazer or structured top (business on top), professional makeup, gold earrings. Accessories: AirPods Pro or wireless headphones, coffee mug, notebook, desk lamp.

**POSE & EXPRESSION:**
Speaking to camera/laptop, professional posture, engaged expression, hands visible gesturing.

**LIGHTING:**
Ring light creating perfect face lighting, additional desk lamp, professional home office glow.

**ENVIRONMENT:**
Zoom-ready background with bookshelf, art, plants, curated professional aesthetic.

**CAMERA:**
Camera at 1.2m, matching webcam height, 50mm lens, authentic meeting setup.

**MOOD:**
Remote work professionalism, virtual leadership, polished work-from-home – sophisticated virtual meeting moment.`.trim()
  },
}

export const TECH_TRAVEL_SETUP: PromptTemplate = {
  id: "tech_travel_setup",
  name: "Tech Travel Setup",
  description:
    "Luxury travel tech setup with laptop, noise-canceling headphones and mobile productivity.",
  useCases: [
    "Travel work content",
    "Mobile productivity imagery",
    "Tech travel campaigns",
    "Jet-set professional lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, travel-sleek styling, practical yet elegant. Hyper-realistic.

Scene: woman in airport lounge or first-class airline seat with tech setup - laptop, noise-canceling headphones, devices.

**OUTFIT & STYLING:**
Cashmere travel set, smart casual blazer, comfortable but polished.

**ACCESSORIES:**
Bose or Sony noise-canceling headphones, portable charger, tech organizer pouch, passport.

**POSE & EXPRESSION:**
Working on laptop balanced on tray table or lap desk, focused productive expression.

**LIGHTING:**
Airplane window light or lounge ambient lighting, clean natural look.

**ENVIRONMENT:**
Premium travel setting, showing tech organization, luxury travel lifestyle.

**CAMERA:**
Camera at 1.5m, 50mm lens, travel work environment.

**MOOD:**
Jet-set professional, mobile productivity, travel luxury – sophisticated travel work moment.`.trim()
  },
}

export const TECH_CONTENT_CREATION: PromptTemplate = {
  id: "tech_content_creation",
  name: "Photography Content Creation",
  description:
    "Behind-the-scenes content creation setup with iPhone, ring light and creator aesthetic.",
  useCases: [
    "Content creation content",
    "Creator lifestyle imagery",
    "Influencer behind-scenes campaigns",
    "Tech-savvy entrepreneur lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, pulled back practically, creator mode. Hyper-realistic.

Scene: woman using iPhone Pro on tripod with ring light, creating content, behind-the-scenes setup visible.

**OUTFIT & STYLING:**
Elevated casual - ribbed tank, high-waisted jeans, layered necklaces.

**ACCESSORIES:**
Phone on tripod, ring light, LED panel lights, wireless remote in hand.

**POSE & EXPRESSION:**
Adjusting equipment, checking phone screen, natural creator moment, focused expression.

**LIGHTING:**
Content creation lighting - ring light, softbox, or LED panels creating professional glow.

**ENVIRONMENT:**
Clean shooting space, white backdrop or aesthetic wall, organized creator setup.

**CAMERA:**
Camera at 1.2m, 35mm lens, showing content creation environment.

**MOOD:**
Content creator lifestyle, influencer behind-scenes, tech-savvy entrepreneur – sophisticated creator moment.`.trim()
  },
}

export const TECH_E_COMMERCE: PromptTemplate = {
  id: "tech_e_commerce",
  name: "E-commerce Fulfillment",
  description:
    "E-commerce fulfillment portrait with iPad, shipping supplies and hands-on CEO aesthetic.",
  useCases: [
    "E-commerce content",
    "Business operations imagery",
    "Female founder campaigns",
    "Hands-on CEO lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, practical ponytail or bun, business owner mode. Hyper-realistic.

Scene: woman at clean packing station with iPad for order management, shipping supplies, product packaging.

**OUTFIT & STYLING:**
Casual elegant - white button-up or branded sweater, minimal jewelry, professional casual.

**ACCESSORIES:**
iPad with Square or Shopify interface visible, label printer, packaging materials.

**POSE & EXPRESSION:**
Packing orders, scanning barcode, or managing iPad, natural working concentration.

**LIGHTING:**
Bright clean lighting, professional product photography aesthetic.

**ENVIRONMENT:**
Organized fulfillment space, white shelving, product boxes, branded packaging materials.

**CAMERA:**
Camera at 1.5m, 50mm lens, business operation environment.

**MOOD:**
Female founder operations, hands-on CEO, e-commerce entrepreneur – sophisticated business moment.`.trim()
  },
}

export const TECH_FLAT_LAY: PromptTemplate = {
  id: "tech_flat_lay",
  name: "Luxury Tech Accessories Flat Lay",
  description:
    "Curated tech accessories flat lay with luxury products and minimalist aesthetic.",
  useCases: [
    "Tech flat lay content",
    "Product lifestyle imagery",
    "Luxury tech campaigns",
    "Curated digital lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, sleek styling, framing face in overhead shot. Hyper-realistic.

Scene: woman leaning over marble surface with curated tech accessories arranged aesthetically.

**OUTFIT & STYLING:**
Cream sweater or structured blouse, visible from shoulders up.

**ACCESSORIES ARRANGED:**
MacBook in leather sleeve, iPhone Pro, AirPods case, Apple Watch, portable charger, designer cardholder, sunglasses, coffee.

**POSE & EXPRESSION:**
Hands arranging items or reaching for device, looking down at collection, contemplative styling.

**LIGHTING:**
Bright clean overhead lighting, no harsh shadows, editorial product aesthetic.

**ENVIRONMENT:**
Marble or white surface, minimal props, luxury lifestyle branding.

**CAMERA:**
Camera at 1m, overhead angle looking down, 35mm lens.

**MOOD:**
Curated digital lifestyle, luxury tech aesthetic, aspirational product collection – sophisticated flat lay moment.`.trim()
  },
}

export const TECH_FITNESS_TRACKING: PromptTemplate = {
  id: "tech_fitness_tracking",
  name: "Smart Watch Fitness Tracking",
  description:
    "Tech-enhanced fitness portrait with Apple Watch and workout completion moment.",
  useCases: [
    "Fitness tech content",
    "Active lifestyle imagery",
    "Tech wellness campaigns",
    "Quantified wellness lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, athletic styling, high ponytail. Hyper-realistic.

Scene: woman checking Apple Watch Ultra after workout, iPhone showing fitness stats on screen.

**OUTFIT & STYLING:**
High-end athleisure - Lululemon or Alo set, sports bra and leggings in neutral tones.

**ACCESSORIES:**
Apple Watch Ultra prominent on wrist, AirPods Pro, water bottle, yoga mat visible.

**POSE & EXPRESSION:**
Standing, lifting wrist to view watch, other hand holding phone showing workout completion.

**LIGHTING:**
Bright natural gym or home lighting, clean energetic aesthetic.

**ENVIRONMENT:**
Modern fitness space or home gym, minimal equipment, bright airy space.

**CAMERA:**
Camera at 1.2m, 50mm lens, active lifestyle moment.

**MOOD:**
Tech-enhanced fitness, quantified wellness, active luxury lifestyle – sophisticated fitness moment.`.trim()
  },
}

export const TECH_DIGITAL_PLANNING: PromptTemplate = {
  id: "tech_digital_planning",
  name: "Digital Planning & Organization",
  description:
    "Digital planning portrait with iPad, Apple Pencil and organized productivity aesthetic.",
  useCases: [
    "Digital planning content",
    "Productivity lifestyle imagery",
    "Organization campaigns",
    "Mindful planning lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, professional casual styling. Hyper-realistic.

Scene: woman at desk using iPad with Apple Pencil, digital planning app open (Notion, GoodNotes, or calendar).

**OUTFIT & STYLING:**
Cozy cardigan or soft sweater, gold jewelry, comfortable work-from-home luxe.

**ACCESSORIES:**
Apple Pencil in hand, iPad in Leather folio case, coffee, minimal desk setup.

**POSE & EXPRESSION:**
Writing on iPad screen with pencil, concentrated planning expression, natural working posture.

**LIGHTING:**
Desk lamp plus natural window light, warm productive atmosphere.

**ENVIRONMENT:**
Organized desk space, planner visible on screen, monthly calendar or task list interface.

**CAMERA:**
Camera at 1m, 50mm lens, planning moment capture.

**MOOD:**
Organized luxury lifestyle, digital productivity, mindful planning – sophisticated planning moment.`.trim()
  },
}

export const TECH_BRANDS = {
  TECH_HOME_OFFICE,
  TECH_UNBOXING_LUXURY,
  TECH_COFFEE_SHOP_WORK,
  TECH_PODCAST_STUDIO,
  TECH_SMART_HOME,
  TECH_VIRTUAL_MEETING,
  TECH_TRAVEL_SETUP,
  TECH_CONTENT_CREATION,
  TECH_E_COMMERCE,
  TECH_FLAT_LAY,
  TECH_FITNESS_TRACKING,
  TECH_DIGITAL_PLANNING,
} satisfies Record<string, PromptTemplate>

