/**
 * Maya 3.0 Lighting Engine
 *
 * Professional lighting patterns based on cinematography
 * and photography principles.
 */

export interface LightingBlock {
  name: string
  description: string
  angle: string
  softness: string
  shadows: string
  texture: string
  skinTreatment: string
  keywords: string[]
  tags: string[] // Added tags for concept-engine matching
}

const LIGHTING_LIBRARY: Record<string, LightingBlock> = {
  rembrandt: {
    name: "Rembrandt Lighting",
    description: "Classic portrait lighting with dramatic triangle under eye",
    angle: "45 degrees from subject, slightly above eye level",
    softness: "Medium soft, defined but not harsh",
    shadows: "Characteristic triangle on cheek, defined nose shadow",
    texture: "Reveals skin texture while flattering, dimensional",
    skinTreatment: "Natural skin tones with dimensional modeling",
    keywords: ["rembrandt triangle", "45-degree key light", "dramatic portrait", "classic lighting"],
    tags: ["dramatic", "classic", "portrait", "dimensional"],
  },

  "golden-hour": {
    name: "Golden Hour",
    description: "Warm natural sunlight during magic hour",
    angle: "Low angle sun, backlight or side-light preferred",
    softness: "Soft and warm, naturally diffused",
    shadows: "Long soft shadows, warm glow",
    texture: "Warm skin glow, golden atmosphere",
    skinTreatment: "Warm glowing skin, sun-kissed appearance",
    keywords: ["golden hour glow", "warm sunlight", "magic hour", "natural backlight"],
    tags: ["warm", "natural", "magic-hour", "backlight"],
  },

  "window-natural": {
    name: "Window-Side Natural",
    description: "Soft directional light from large window",
    angle: "Side-angle window light, wrapping around subject",
    softness: "Very soft, naturally diffused through window",
    shadows: "Gentle falloff, soft shadows on opposite side",
    texture: "Natural skin texture, soft and flattering",
    skinTreatment: "Authentic skin tones with gentle modeling",
    keywords: ["window light", "natural diffusion", "soft directional", "indoor natural"],
    tags: ["natural", "window", "soft", "directional", "indoor"],
  },

  "overcast-diffused": {
    name: "Overcast Diffused",
    description: "Even soft light from cloudy sky acting as giant softbox",
    angle: "Omnidirectional soft light from above",
    softness: "Ultra soft, no harsh shadows",
    shadows: "Minimal shadows, even illumination",
    texture: "Even skin texture without hot spots",
    skinTreatment: "Flattering even skin tones, no harsh contrast",
    keywords: ["overcast diffusion", "even lighting", "soft omnidirectional", "cloudy sky"],
    tags: ["overcast", "diffused", "even", "omnidirectional", "cloudy"],
  },

  "beauty-dish": {
    name: "Beauty Dish Glow",
    description: "Professional beauty lighting for commercial work",
    angle: "Directly in front and above, angled down",
    softness: "Controlled soft with subtle edge",
    shadows: "Minimal shadows, wrapped light around features",
    texture: "Smooth skin appearance with slight dimension",
    skinTreatment: "Flawless skin presentation, commercial beauty standard",
    keywords: ["beauty dish", "commercial lighting", "wrapped light", "beauty standard"],
    tags: ["beauty", "dish", "commercial", "wrapped", "standard"],
  },

  "cinematic-edge": {
    name: "Cinematic Edge Light",
    description: "Dramatic rim lighting for dimensional separation",
    angle: "Backlight or three-quarter backlight creating edge",
    softness: "Hard to medium, creating defined edge",
    shadows: "Deep shadows on front with bright rim",
    texture: "Dimensional separation from background",
    skinTreatment: "Dramatic contour with glowing edge highlight",
    keywords: ["rim light", "edge lighting", "cinematic separation", "backlight glow"],
    tags: ["cinematic", "edge", "backlight", "separation", "glow"],
  },

  "boutique-warm": {
    name: "Boutique Store Warm Tones",
    description: "Warm retail lighting creating luxury shopping atmosphere",
    angle: "Multiple soft sources creating even warm glow",
    softness: "Soft and inviting, retail-quality",
    shadows: "Minimal shadows, warm even coverage",
    texture: "Warm luxury atmosphere, inviting environment",
    skinTreatment: "Warm flattering tones, retail-ready",
    keywords: ["boutique lighting", "warm retail", "luxury shopping", "soft multiple sources"],
    tags: ["boutique", "warm", "retail", "luxury", "shopping"],
  },

  "soft-dusk": {
    name: "Soft Dusk Lighting",
    description: "Gentle evening light with blue hour atmosphere",
    angle: "Ambient soft light from twilight sky",
    softness: "Ultra soft ambient glow",
    shadows: "Very soft shadows, dreamy quality",
    texture: "Soft romantic atmosphere, gentle illumination",
    skinTreatment: "Soft glowing skin with blue-hour tones",
    keywords: ["dusk lighting", "blue hour", "twilight glow", "soft evening"],
    tags: ["soft", "dusk", "blue-hour", "twilight", "evening"],
  },

  "neon-rim-light": {
    name: "Neon Rim Light",
    description: "Colorful neon edge lighting creating dramatic rim effects",
    angle: "Backlight or side-angle neon source creating colored rim",
    softness: "Hard neon edge with vibrant color saturation",
    shadows: "Deep shadows with bright neon highlights on edges",
    texture: "Dramatic color separation, neon glow on skin and surfaces",
    skinTreatment: "Colored rim on skin, dramatic highlight with neon tint",
    keywords: ["neon lighting", "rim light", "colored edge", "nightclub aesthetic"],
    tags: ["neon", "night", "dramatic", "colorful", "nightclub"],
  },

  "metal-reflection-glow": {
    name: "Metal Reflection Glow",
    description: "Metallic surface reflections creating unique lighting patterns",
    angle: "Reflected light from metal surfaces, indirect illumination",
    softness: "Medium soft with metallic quality and subtle sheen",
    shadows: "Soft shadows with metallic bounce light",
    texture: "Metallic sheen, reflective quality, subtle glow",
    skinTreatment: "Cool-toned skin with metallic bounce, modern aesthetic",
    keywords: ["metal reflection", "bounce light", "metallic glow", "modern lighting"],
    tags: ["metal", "reflection", "modern", "cool-tones"],
  },

  "elevator-panel-light": {
    name: "Elevator Panel Light",
    description: "Overhead elevator lighting with panel diffusion",
    angle: "Overhead panel creating downward even illumination",
    softness: "Medium soft from ceiling panel diffusion",
    shadows: "Minimal shadows, even coverage from above",
    texture: "Clean even illumination with slight top-down gradient",
    skinTreatment: "Even skin tones with subtle dimensional shading",
    keywords: ["elevator lighting", "panel diffusion", "overhead illumination", "even light"],
    tags: ["elevator", "panel", "overhead", "even", "interior"],
  },

  "hotel-vanity-soft": {
    name: "Hotel Vanity Soft Light",
    description: "Flattering bathroom vanity lighting with soft even illumination",
    angle: "Front-facing vanity lights creating wraparound illumination",
    softness: "Very soft with even coverage, beauty-style flattering",
    shadows: "Minimal shadows, flattering even coverage",
    texture: "Smooth flawless appearance, beauty lighting quality",
    skinTreatment: "Flawless skin rendering, even tones, beauty-standard illumination",
    keywords: ["vanity lighting", "bathroom mirror", "beauty light", "flattering illumination"],
    tags: ["vanity", "hotel", "beauty", "soft", "flattering"],
  },

  "city-light-bounce": {
    name: "City Light Bounce",
    description: "Urban nighttime ambient glow from city lights",
    angle: "Omnidirectional ambient bounce from urban light sources",
    softness: "Soft ambient glow with urban light quality",
    shadows: "Soft diffused shadows, ambient urban atmosphere",
    texture: "Urban night glow, atmospheric city lighting",
    skinTreatment: "Warm-cool balance from mixed urban light sources",
    keywords: ["city lights", "urban glow", "ambient bounce", "night atmosphere"],
    tags: ["city", "urban", "night", "ambient", "atmospheric"],
  },

  "golden-hour-soft-editorial": {
    name: "Golden Hour Soft Editorial",
    description: "Magazine-quality golden hour with perfect skin rendering",
    angle: "Low-angle golden sunlight, editorial positioning",
    softness: "Soft diffused golden light, magazine quality",
    shadows: "Long soft shadows with warm golden glow",
    texture: "Editorial quality with golden atmospheric haze",
    skinTreatment: "Glowing skin with golden warmth, editorial perfection",
    keywords: ["golden hour editorial", "magazine quality", "soft sunlight", "warm glow"],
    tags: ["golden-hour", "editorial", "warm", "soft", "magazine"],
  },

  "cinematic-low-key-night": {
    name: "Cinematic Low-Key Night",
    description: "Film noir style low-key lighting with dramatic contrast",
    angle: "Single dramatic key light creating high contrast",
    softness: "Hard directional light with deep shadow falloff",
    shadows: "Deep blacks with selective highlights, cinematic drama",
    texture: "Film noir quality, dramatic texture revelation",
    skinTreatment: "Dramatic skin modeling with deep shadows and bright highlights",
    keywords: ["low-key lighting", "cinematic drama", "noir style", "high contrast"],
    tags: ["cinematic", "low-key", "night", "dramatic", "noir"],
  },

  "harsh-fashion-flash": {
    name: "Harsh Fashion Flash",
    description: "Direct flash creating high-fashion editorial look",
    angle: "Direct on-camera or near-camera flash",
    softness: "Hard direct flash creating editorial aesthetic",
    shadows: "Minimal shadows, flat fashion-editorial quality",
    texture: "Sharp details, fashion-forward hard light aesthetic",
    skinTreatment: "High-fashion skin rendering with editorial flash quality",
    keywords: ["fashion flash", "direct flash", "editorial aesthetic", "hard light"],
    tags: ["fashion", "flash", "editorial", "hard", "high-fashion"],
  },

  "diffused-mirror-glow": {
    name: "Diffused Mirror Glow",
    description: "Soft reflected light from mirrors creating even glow",
    angle: "Reflected light from mirror surfaces, wraparound quality",
    softness: "Very soft from multiple mirror reflections",
    shadows: "Minimal shadows, soft wraparound illumination",
    texture: "Even smooth quality from diffused mirror bounce",
    skinTreatment: "Soft flattering skin with even mirror reflection",
    keywords: ["mirror light", "reflected glow", "soft bounce", "even illumination"],
    tags: ["mirror", "reflection", "soft", "even", "flattering"],
  },

  "lux-apartment-ambient": {
    name: "Lux Apartment Ambient Light",
    description: "Layered ambient lighting from luxury apartment fixtures",
    angle: "Multiple soft sources creating layered ambient glow",
    softness: "Very soft from layered ambient sources",
    shadows: "Soft gentle shadows, luxury interior quality",
    texture: "Warm inviting atmosphere, luxury living quality",
    skinTreatment: "Flattering warm skin tones, comfortable elegance",
    keywords: ["apartment lighting", "layered ambient", "luxury interior", "warm atmosphere"],
    tags: ["apartment", "luxury", "ambient", "warm", "interior"],
  },

  "paris-street-lamp": {
    name: "Paris Street Lamp Glow",
    description: "Romantic Parisian street lighting with warm ambient glow",
    angle: "Overhead street lamp creating warm downward glow",
    softness: "Soft warm glow from street lamp diffusion",
    shadows: "Romantic soft shadows with warm street light",
    texture: "Parisian night atmosphere, romantic street quality",
    skinTreatment: "Warm romantic skin tones with street lamp glow",
    keywords: ["street lamp", "parisian lighting", "romantic glow", "night street"],
    tags: ["paris", "street", "night", "romantic", "warm"],
  },

  "rooftop-twilight-glow": {
    name: "Rooftop Twilight Glow",
    description: "Blue hour rooftop lighting with city glow backdrop",
    angle: "Twilight sky creating soft ambient overhead glow",
    softness: "Ultra soft from twilight sky diffusion",
    shadows: "Very soft shadows, blue hour atmospheric quality",
    texture: "Twilight atmosphere, urban rooftop ambiance",
    skinTreatment: "Cool-warm balance from twilight and city lights",
    keywords: ["twilight lighting", "blue hour", "rooftop glow", "city backdrop"],
    tags: ["twilight", "blue-hour", "rooftop", "urban", "atmospheric"],
  },
}

export function getLightingBlock(style: string): LightingBlock {
  const styleKey = style.toLowerCase().replace(/\s+/g, "-")
  return LIGHTING_LIBRARY[styleKey] || LIGHTING_LIBRARY["window-natural"]
}

export function getAvailableLightingStyles(): string[] {
  return Object.keys(LIGHTING_LIBRARY).map((key) =>
    key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  )
}

export function getLightingKeywords(style: string): string[] {
  const block = getLightingBlock(style)
  return block.keywords
}

export function scoreLightingWithTags(lightingKey: string, conceptTags: string[]): number {
  const block = LIGHTING_LIBRARY[lightingKey]
  if (!block) return 0

  let score = 0
  for (const tag of conceptTags) {
    if (block.tags.includes(tag)) {
      score += 5 // Tag match = +5 points
    }
  }
  return score
}
