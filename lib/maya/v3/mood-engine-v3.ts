/**
 * Maya 3.0 Mood Engine
 *
 * Creates dynamic mood blocks that define the emotional tone,
 * lighting quality, color palette, and atmosphere of the image.
 */

export interface MoodBlock {
  name: string
  description: string
  lighting: string
  colorPalette: string[]
  atmosphere: string
  energy: string
  texture: string
  keywords: string[]
  tags: string[] // Added tags for concept-engine matching
}

const MOOD_LIBRARY: Record<string, MoodBlock> = {
  "cinematic-luxury": {
    name: "Cinematic Luxury",
    description: "High-end editorial with dramatic lighting and sophisticated atmosphere",
    lighting: "Dramatic directional light with controlled shadows, cinematic contrast",
    colorPalette: ["deep blacks", "warm highlights", "muted golds", "rich browns"],
    atmosphere: "Sophisticated, timeless, aspirational",
    energy: "Confident, powerful, composed",
    texture: "Rich fabrics, smooth surfaces, refined details",
    keywords: ["cinematic lighting", "luxury aesthetic", "dramatic shadows", "editorial composition"],
    tags: ["luxury", "editorial", "dramatic", "cinematic"],
  },

  "nordic-clean": {
    name: "Nordic Clean",
    description: "Minimalist Scandinavian aesthetic with soft natural light",
    lighting: "Soft diffused natural light, even illumination, minimal shadows",
    colorPalette: ["clean whites", "soft grays", "warm beige", "pale wood tones"],
    atmosphere: "Calm, serene, effortlessly elegant",
    energy: "Peaceful, centered, natural",
    texture: "Natural materials, smooth surfaces, organic textures",
    keywords: ["scandinavian aesthetic", "soft natural light", "minimalist", "clean composition"],
    tags: ["nordic", "clean", "minimalist", "natural", "serene"],
  },

  "soft-morning-light": {
    name: "Soft Morning Light",
    description: "Gentle golden hour glow with fresh, optimistic energy",
    lighting: "Warm soft sunlight, gentle shadows, glowing skin tones",
    colorPalette: ["warm golds", "soft peach", "cream", "light caramel"],
    atmosphere: "Fresh, optimistic, inviting",
    energy: "Gentle, warm, approachable",
    texture: "Soft fabrics, natural skin glow, warm materials",
    keywords: ["golden hour glow", "soft sunlight", "warm atmosphere", "fresh energy"],
    tags: ["morning", "soft", "warm", "optimistic", "inviting"],
  },

  "moody-night-energy": {
    name: "Moody Night Energy",
    description: "Urban evening vibe with neon accents and cinematic darkness",
    lighting: "Low-key lighting with dramatic highlights, urban glow",
    colorPalette: ["deep blues", "neon accents", "warm streetlight", "rich blacks"],
    atmosphere: "Urban, edgy, cinematic",
    energy: "Bold, confident, mysterious",
    texture: "Sleek surfaces, city textures, reflective materials",
    keywords: ["moody lighting", "urban night", "cinematic darkness", "neon accents"],
    tags: ["night", "urban", "moody", "cinematic", "edgy"],
  },

  "instagram-glossy": {
    name: "Instagram Glossy",
    description: "High-gloss influencer aesthetic with perfect lighting",
    lighting: "Ring light glow, even beauty lighting, minimal shadows",
    colorPalette: ["bright whites", "pops of color", "clean tones", "glossy finish"],
    atmosphere: "Polished, vibrant, social-media ready",
    energy: "Energetic, confident, engaging",
    texture: "Glossy surfaces, smooth skin, crisp details",
    keywords: ["ring light beauty", "instagram aesthetic", "glossy finish", "vibrant energy"],
    tags: ["instagram", "glossy", "vibrant", "polished", "social-media"],
  },

  "candid-lifestyle": {
    name: "Candid Lifestyle",
    description: "Natural authentic moments with relatable energy",
    lighting: "Natural available light, soft shadows, realistic illumination",
    colorPalette: ["natural tones", "warm neutrals", "authentic colors", "real-world palette"],
    atmosphere: "Authentic, relatable, genuine",
    energy: "Natural, spontaneous, real",
    texture: "Lived-in spaces, natural materials, everyday textures",
    keywords: ["natural lighting", "candid moment", "authentic lifestyle", "relatable energy"],
    tags: ["candid", "lifestyle", "natural", "authentic", "relatable"],
  },

  "power-woman-energy": {
    name: "Power Woman Energy",
    description: "Confident professional with strong presence",
    lighting: "Directional dramatic lighting, defined shadows, powerful contrast",
    colorPalette: ["bold blacks", "crisp whites", "strong accents", "confident tones"],
    atmosphere: "Powerful, commanding, professional",
    energy: "Confident, strong, purposeful",
    texture: "Tailored fabrics, structured materials, sharp details",
    keywords: ["dramatic lighting", "power pose", "confident presence", "professional aesthetic"],
    tags: ["power", "woman", "professional", "dramatic", "strong"],
  },

  "editorial-high-fashion": {
    name: "Editorial High Fashion",
    description: "Magazine-quality fashion photography with artistic composition",
    lighting: "Controlled studio lighting, artistic shadows, fashion-forward",
    colorPalette: ["editorial black", "statement colors", "high contrast", "artistic palette"],
    atmosphere: "Artistic, avant-garde, fashion-forward",
    energy: "Bold, expressive, striking",
    texture: "Designer fabrics, architectural elements, editorial quality",
    keywords: ["editorial lighting", "high fashion", "artistic composition", "magazine quality"],
    tags: ["editorial", "fashion", "high", "artistic", "striking"],
  },

  "romantic-warm": {
    name: "Romantic Warm",
    description: "Soft romantic atmosphere with warm inviting tones",
    lighting: "Soft diffused light, warm glow, gentle illumination",
    colorPalette: ["warm rose", "soft gold", "cream", "gentle peach"],
    atmosphere: "Romantic, intimate, dreamy",
    energy: "Soft, gentle, feminine",
    texture: "Soft fabrics, flowing materials, delicate details",
    keywords: ["soft romantic lighting", "warm glow", "dreamy atmosphere", "gentle energy"],
    tags: ["romantic", "warm", "soft", "dreamy", "intimate"],
  },

  "commercial-beauty-light": {
    name: "Commercial Beauty Light",
    description: "Professional beauty lighting for skin and product photography",
    lighting: "Beauty dish setup, even skin illumination, commercial quality",
    colorPalette: ["neutral skin tones", "clean whites", "soft accents", "professional grade"],
    atmosphere: "Polished, professional, commercial",
    energy: "Confident, refined, commercial-ready",
    texture: "Flawless skin, smooth surfaces, professional finish",
    keywords: ["beauty dish lighting", "commercial quality", "flawless skin", "professional polish"],
    tags: ["commercial", "beauty", "lighting", "professional", "polished"],
  },

  "night-drama-luxury": {
    name: "Night Drama Luxury",
    description: "High-contrast nighttime editorial with deep shadows and dramatic highlights",
    lighting: "Low-key dramatic lighting with strong highlights, deep blacks",
    colorPalette: ["midnight black", "golden highlights", "deep navy", "rich amber"],
    atmosphere: "Mysterious, powerful, nocturnal luxury",
    energy: "Bold, mysterious, confident",
    texture: "Luxe fabrics catching light, dramatic shadows, refined details",
    keywords: ["night photography", "dramatic contrast", "luxury evening", "nocturnal elegance"],
    tags: ["night", "luxury", "dramatic", "editorial", "mystery"],
  },

  "paris-midnight-editorial": {
    name: "Paris Midnight Editorial",
    description: "Parisian night aesthetic with romantic street lighting and urban sophistication",
    lighting: "Warm street lamps, soft city glow, romantic ambient light",
    colorPalette: ["warm amber", "soft golds", "deep charcoal", "romantic rose"],
    atmosphere: "Romantic, sophisticated, Parisian nights",
    energy: "Elegant, mysterious, cosmopolitan",
    texture: "Soft fabrics, urban textures, elegant details",
    keywords: ["parisian nights", "street lighting", "romantic city", "urban elegance"],
    tags: ["paris", "night", "street", "romantic", "luxury", "editorial"],
  },

  "urban-noir-energy": {
    name: "Urban Noir Energy",
    description: "Dark moody urban aesthetic with cinematic film noir vibes",
    lighting: "High-contrast noir lighting, dramatic shadows, selective highlights",
    colorPalette: ["deep blacks", "cool grays", "neon accents", "stark whites"],
    atmosphere: "Edgy, cinematic, urban mystery",
    energy: "Bold, mysterious, powerful",
    texture: "Urban materials, sleek surfaces, cinematic grain",
    keywords: ["noir aesthetic", "urban drama", "cinematic night", "mysterious energy"],
    tags: ["night", "urban", "noir", "dramatic", "edgy", "cinematic"],
  },

  "luxury-hotel-elegance": {
    name: "Luxury Hotel Elegance",
    description: "Five-star hotel aesthetic with sophisticated ambient lighting",
    lighting: "Warm ambient hotel lighting, soft layered illumination",
    colorPalette: ["champagne gold", "warm cream", "rich mahogany", "soft ivory"],
    atmosphere: "Refined, luxurious, sophisticated hospitality",
    energy: "Elegant, composed, affluent",
    texture: "Marble, soft linens, polished surfaces, luxury materials",
    keywords: ["hotel luxury", "refined elegance", "sophisticated lighting", "upscale ambiance"],
    tags: ["hotel", "luxury", "elegant", "sophisticated", "refined"],
  },

  "airport-lounge-wealthy": {
    name: "Airport Lounge Wealthy",
    description: "Jet-setter lifestyle with clean modern airport lounge aesthetics",
    lighting: "Clean even lighting with soft ambient glow, modern illumination",
    colorPalette: ["clean whites", "soft grays", "metallic accents", "warm neutrals"],
    atmosphere: "Cosmopolitan, travel luxury, modern sophistication",
    energy: "Confident, worldly, polished",
    texture: "Modern materials, sleek surfaces, minimalist luxury",
    keywords: ["airport lounge", "travel luxury", "jet setter", "modern elegance"],
    tags: ["airport", "travel", "luxury", "modern", "professional"],
  },

  "street-fashion-power": {
    name: "Street Fashion Power",
    description: "Bold street fashion editorial with confident urban energy",
    lighting: "Natural urban daylight with architectural shadows",
    colorPalette: ["bold blacks", "crisp whites", "statement colors", "urban grays"],
    atmosphere: "Bold, fashion-forward, street culture",
    energy: "Confident, edgy, powerful",
    texture: "Designer streetwear, urban textures, bold fabrics",
    keywords: ["street fashion", "urban editorial", "bold style", "fashion power"],
    tags: ["street", "fashion", "editorial", "urban", "bold", "confident"],
  },

  "mirror-selfie-cinematic": {
    name: "Mirror Selfie Cinematic",
    description: "Elevated mirror selfie with editorial cinematic quality",
    lighting: "Even reflection lighting with subtle dramatic shadows",
    colorPalette: ["clean neutrals", "warm metallics", "soft shadows", "crisp highlights"],
    atmosphere: "Self-assured, editorial quality, modern confidence",
    energy: "Confident, modern, self-possessed",
    texture: "Reflective surfaces, sharp details, polished aesthetic",
    keywords: ["mirror selfie", "editorial quality", "reflection lighting", "modern portrait"],
    tags: ["mirror", "selfie", "editorial", "modern", "confident"],
  },

  "high-rise-rooftop-glow": {
    name: "High-Rise Rooftop Glow",
    description: "Urban rooftop with golden hour or city lights ambiance",
    lighting: "Golden hour glow or soft city lights creating atmospheric illumination",
    colorPalette: ["golden warmth", "urban blues", "soft ambers", "twilight tones"],
    atmosphere: "Aspirational, elevated, urban luxury",
    energy: "Confident, ambitious, cosmopolitan",
    texture: "City textures, architectural details, elevated perspective",
    keywords: ["rooftop photography", "city glow", "urban elevation", "golden hour rooftop"],
    tags: ["rooftop", "urban", "luxury", "golden-hour", "cityscape"],
  },

  "clean-luxury-morning-light": {
    name: "Clean Luxury Morning Light",
    description: "Fresh morning aesthetic with clean luxury and soft natural light",
    lighting: "Soft morning sunlight, clean even illumination, fresh atmosphere",
    colorPalette: ["fresh whites", "warm creams", "soft golds", "clean neutrals"],
    atmosphere: "Fresh, optimistic, refined simplicity",
    energy: "Calm, confident, composed",
    texture: "Clean surfaces, natural materials, refined simplicity",
    keywords: ["morning light", "clean aesthetic", "fresh luxury", "natural illumination"],
    tags: ["morning", "clean", "luxury", "fresh", "natural"],
  },

  "high-fashion-cold-lighting": {
    name: "High Fashion Cold Lighting",
    description: "Editorial fashion with cool-toned professional lighting",
    lighting: "Cool fashion lighting, crisp highlights, professional studio quality",
    colorPalette: ["cool whites", "icy blues", "steel grays", "pure blacks"],
    atmosphere: "High-fashion, avant-garde, editorial excellence",
    energy: "Bold, striking, fashion-forward",
    texture: "Designer fabrics, architectural lines, sharp details",
    keywords: ["high fashion", "cool lighting", "editorial photography", "fashion excellence"],
    tags: ["fashion", "editorial", "cool-tones", "professional", "avant-garde"],
  },

  "warm-cozy-opulence": {
    name: "Warm Cozy Opulence",
    description: "Luxurious comfort with warm inviting atmosphere and rich textures",
    lighting: "Warm ambient glow, soft layered lighting, cozy illumination",
    colorPalette: ["rich caramels", "warm cognac", "soft golds", "cream"],
    atmosphere: "Luxurious comfort, inviting warmth, opulent relaxation",
    energy: "Relaxed, indulgent, warm",
    texture: "Plush fabrics, rich materials, cozy luxury",
    keywords: ["cozy luxury", "warm opulence", "comfortable elegance", "rich textures"],
    tags: ["cozy", "luxury", "warm", "comfortable", "opulent"],
  },

  "gym-editorial-aesthetic": {
    name: "Gym Editorial Aesthetic",
    description: "Fitness lifestyle editorial with clean modern gym lighting",
    lighting: "Clean gym lighting with even illumination and mirror reflections",
    colorPalette: ["clean whites", "bold blacks", "metallic accents", "fresh neutrals"],
    atmosphere: "Active, aspirational fitness, editorial quality",
    energy: "Powerful, strong, determined",
    texture: "Athletic materials, modern equipment, clean surfaces",
    keywords: ["gym photography", "fitness editorial", "athletic aesthetic", "workout lifestyle"],
    tags: ["gym", "fitness", "editorial", "athletic", "modern"],
  },
}

export function getMoodBlock(mood: string): MoodBlock {
  const moodKey = mood.toLowerCase().replace(/\s+/g, "-")
  return MOOD_LIBRARY[moodKey] || MOOD_LIBRARY["cinematic-luxury"]
}

export function getAvailableMoods(): string[] {
  return Object.keys(MOOD_LIBRARY).map((key) =>
    key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  )
}

export function getMoodKeywords(mood: string): string[] {
  const block = getMoodBlock(mood)
  return block.keywords
}

export function scoreMoodWithTags(moodKey: string, conceptTags: string[]): number {
  const block = MOOD_LIBRARY[moodKey]
  if (!block) return 0

  let score = 0
  for (const tag of conceptTags) {
    if (block.tags.includes(tag)) {
      score += 5 // Tag match = +5 points
    }
  }
  return score
}
