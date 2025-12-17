// High-end brand visual registry for Studio Pro / Nano Banana flows
// Central place to describe brand-specific aesthetics and visual guidelines.

export type BrandCategoryKey =
  | "wellness"
  | "luxury"
  | "lifestyle"
  | "fashion"
  | "beauty"
  | "fitness"
  | "tech"
  | "travel_lifestyle"

export interface BrandCategory {
  /** Stable key used in code and analytics */
  key: BrandCategoryKey
  /** Human-readable label shown in UI */
  label: string
  /** Optional longer description of what this category means */
  description?: string
}

export interface BrandAesthetic {
  /** High-level color words or schemes, not hex codes */
  colorPalette: string[]
  /** How the brand tends to set type in visuals */
  typography: string
  /** Emotional tone and brand "feel" words */
  mood: string[]
  /** Typical framing / ratios / how subjects are arranged */
  composition: string
  /** How the light usually looks in photos */
  lighting: string
}

export interface VisualStyleGuide {
  /** Overall photography / content style */
  photoStyle: string
  /** Typical environments and locations */
  settings: string
  /** Camera description at the aesthetic level (not a strict requirement) */
  cameraType?: string
  /** How images tend to be graded / finished */
  postProcessing?: string
  /** Reusable visual motifs that appear often */
  commonElements?: string[]
  /** Things that clearly do NOT look like the brand */
  avoid?: string[]
}

export interface BrandProfile {
  /** Short internal identifier, usually the brand name in uppercase */
  id: string
  /** Display name (e.g. "Alo Yoga") */
  name: string
  /** URL/slug-friendly identifier */
  slug: string
  /** One or more high-level categories this brand belongs to */
  categories: BrandCategoryKey[]
  /** Canonical description of brand color / mood / composition */
  aesthetic: BrandAesthetic
  /** Concrete visual guidance used when building prompts */
  visuals: VisualStyleGuide
}

export type BrandKey = "ALO" | "LULULEMON" | "GLOSSIER" | "CHANEL" | "DIOR" | "FREE_PEOPLE"

export const BRAND_CATEGORIES: Record<BrandCategoryKey, BrandCategory> = {
  wellness: {
    key: "wellness",
    label: "Wellness",
    description: "Mind-body balance, rituals, and holistic routines.",
  },
  luxury: {
    key: "luxury",
    label: "Luxury",
    description: "High-end, premium, heritage and elevated craftsmanship.",
  },
  lifestyle: {
    key: "lifestyle",
    label: "Lifestyle",
    description: "Everyday life moments that express a brand-led way of living.",
  },
  fashion: {
    key: "fashion",
    label: "Fashion",
    description: "Clothing, styling, and editorial outfit storytelling.",
  },
  beauty: {
    key: "beauty",
    label: "Beauty",
    description: 'Skincare, makeup, and "skin-first" aesthetics.',
  },
  fitness: {
    key: "fitness",
    label: "Fitness",
    description: "Performance, movement, and active training moments.",
  },
  tech: {
    key: "tech",
    label: "Tech",
    description: "Digital products, devices, and productized technology.",
  },
  travel_lifestyle: {
    key: "travel_lifestyle",
    label: "Travel & Airport Lifestyle",
    description:
      "Aspirational airport and travel content with quiet luxury, coffee cups and designer luggage.",
  },
}

export const BRAND_PROFILES: Record<BrandKey, BrandProfile> = {
  ALO: {
    id: "ALO",
    name: "Alo Yoga",
    slug: "alo-yoga",
    categories: ["wellness", "fitness", "lifestyle"],
    aesthetic: {
      colorPalette: [
        "neutral tones",
        "soft beiges",
        "warm whites",
        "earth tones",
        "muted blacks",
      ],
      typography: "Clean sans-serif, minimalist, high contrast",
      mood: [
        "aspirational wellness",
        "authentic",
        "premium",
        "relatable",
      ],
      composition:
        "Full-body or three-quarter framing in 2:3 vertical, natural movement with balanced, breathable compositions.",
      lighting:
        "Natural, soft, golden-hour-influenced light with diffused, balanced highlights and gentle shadows.",
    },
    visuals: {
      photoStyle: "UGC influencer style with professional polish",
      settings:
        "Outdoor wellness spaces, modern minimalist interiors, bright yoga studios, clean architectural backdrops.",
      cameraType:
        "High-end phone camera aesthetic (inspired by iPhone 15 Pro) with natural bokeh and candid moments.",
      postProcessing:
        "Soft contrast, subtle grain, warm-neutral grading that preserves real skin texture.",
      commonElements: [
        "elevated athletic wear clearly visible",
        "subtle but readable logo placement",
        "yoga mats, blocks, straps, and wellness props",
        "clean, minimal backgrounds with negative space",
        "visible natural movement (flows, stretches, transitions)",
      ],
      avoid: [
        "overly airbrushed skin",
        "harsh, unflattering shadows",
        "cluttered or messy backgrounds",
        "stiff, forced or overly posed body language",
      ],
    },
  },

  LULULEMON: {
    id: "LULULEMON",
    name: "Lululemon",
    slug: "lululemon",
    categories: ["wellness", "fitness", "lifestyle"],
    aesthetic: {
      colorPalette: [
        "bold accent colors",
        "deep blacks",
        "crisp whites",
        "jewel tones",
      ],
      typography: "Modern, confident sans-serif with strong hierarchy",
      mood: ["empowered", "strong", "active lifestyle", "performance-driven"],
      composition:
        "Dynamic action shots and lifestyle frames, often off-center with plenty of negative space for text or branding.",
      lighting:
        "Bright, energetic lighting with clear definition on muscles and movement; mix of natural daylight and clean artificial light.",
    },
    visuals: {
      photoStyle: "Performance meets lifestyle, authentic athlete moments",
      settings:
        "Urban environments, fitness studios, training spaces, outdoor running routes and community workout settings.",
      cameraType:
        "Crisp, high-clarity look that feels like a blend of professional camera and modern phone photography.",
      postProcessing:
        "High clarity with controlled contrast, true-to-life colors and a slightly cool, performance-forward finish.",
      commonElements: [
        "technical athletic wear in motion",
        "visible logos on tights, bras, and outerwear",
        "sweat, exertion, and in-the-moment effort",
        "small groups or partner training moments",
      ],
      avoid: [
        "overly posed gym selfies",
        "soft, dreamy filters that reduce performance feel",
        "cluttered equipment setups with no clear subject",
      ],
    },
  },

  GLOSSIER: {
    id: "GLOSSIER",
    name: "Glossier",
    slug: "glossier",
    categories: ["beauty", "lifestyle"],
    aesthetic: {
      colorPalette: [
        "millennial pink",
        "cloud white",
        "soft creams",
        "minimal earth tones",
      ],
      typography: "Soft, minimal sans-serif with gentle weight and generous spacing",
      mood: ["effortless beauty", "skin-first", "minimal", "clean", "intimate"],
      composition:
        "Tight crops and intimate framing, close-ups of faces, hands, and product textures with plenty of soft negative space.",
      lighting:
        "Bright, diffused natural light that feels like soft window light; gentle highlights on skin and product texture.",
    },
    visuals: {
      photoStyle: "Natural beauty moments with dewy skin and authentic selfies",
      settings:
        "Bright naturally lit bathrooms, vanities, bedrooms, and simple everyday spaces with uncluttered surfaces.",
      cameraType:
        "Soft, phone-forward selfie aesthetic with clean, modern color and minimal distortion.",
      postProcessing:
        "Low-contrast, slightly warm grading that keeps skin texture honest while emphasizing glow.",
      commonElements: [
        "close-up faces with visible pores and dewy finish",
        "hands interacting with product (swatches, application)",
        "soft bathroom tiles, mirrors, and minimal countertop styling",
        "subtle pink accents and cloud-like whites",
      ],
      avoid: [
        "heavy glamour retouching or overly sharp detail",
        "busy backgrounds with too many objects",
        "dark, moody lighting that hides skin texture",
      ],
    },
  },

  CHANEL: {
    id: "CHANEL",
    name: "Chanel",
    slug: "chanel",
    categories: ["luxury", "fashion"],
    aesthetic: {
      colorPalette: [
        "black",
        "white",
        "gold",
        "navy",
        "iconic tweed patterns",
      ],
      typography: "Timeless, refined typography with classic proportions and restrained use of serif and sans-serif mixes",
      mood: [
        "timeless elegance",
        "French sophistication",
        "classic luxury",
        "couture-level refinement",
      ],
      composition:
        "High-fashion editorial framing: intentional negative space, strong leading lines, and poised poses that feel composed but not stiff.",
      lighting:
        "Controlled, often studio-quality lighting with sculpted highlights and soft, luxurious shadows.",
    },
    visuals: {
      photoStyle: "High fashion editorial with sophisticated poses and timeless styling",
      settings:
        "Elegant interiors, Parisian streets, runway-adjacent environments, and luxury architectural spaces.",
      cameraType:
        "Polished, editorial camera aesthetic reminiscent of high-end fashion campaigns.",
      postProcessing:
        "Refined contrast, rich blacks, clean whites, and subtle color grading that emphasizes gold, navy, and tweed textures.",
      commonElements: [
        "structured tailoring, tweed, and signature quilting",
        "pearls, chains, and classic Chanel accessories",
        "grand staircases, ornate moldings, and Parisian facades",
        "poised expressions and confident, composed body language",
      ],
      avoid: [
        "overly casual, everyday snapshots",
        "busy street clutter that dilutes luxury feel",
        "cheap-looking props or environments",
      ],
    },
  },

  DIOR: {
    id: "DIOR",
    name: "Dior",
    slug: "dior",
    categories: ["luxury", "fashion"],
    aesthetic: {
      colorPalette: [
        "soft pastels",
        "blush pink",
        "ivory",
        "dove gray",
        "midnight navy",
      ],
      typography:
        "Romantic, refined typography with light serif accents and elegant proportions",
      mood: [
        "romantic femininity",
        "soft glamour",
        "haute couture dreams",
        "delicate sophistication",
      ],
      composition:
        "Graceful editorial framing with flowing lines, negative space, and gently off-center subjects.",
      lighting:
        "Soft, diffused lighting that feels like golden hour or bright overcast, wrapping silhouettes in a dreamy glow.",
    },
    visuals: {
      photoStyle:
        "Haute couture editorial with romantic, dreamy atmosphere and flowing fabrics",
      settings:
        "Parisian gardens, classic terraces, elegant interiors with moldings and drapery, and couture runway-adjacent spaces.",
      cameraType:
        "Polished fashion camera aesthetic with gentle compression and soft focus transitions.",
      postProcessing:
        "Subtle pastel grading, airy highlights, and delicate contrast that preserves fabric and skin nuance.",
      commonElements: [
        "flowing dresses and couture silhouettes",
        "delicate embroidery, lace, and tulle",
        "arched windows, balconies, and romantic garden details",
        "soft gestures and introspective expressions",
      ],
      avoid: [
        "harsh, clinical lighting",
        "heavy, saturated color palettes that break the romantic mood",
        "overly casual props that dilute couture feeling",
      ],
    },
  },

  FREE_PEOPLE: {
    id: "FREE_PEOPLE",
    name: "Free People",
    slug: "free-people",
    categories: ["lifestyle", "fashion"],
    aesthetic: {
      colorPalette: [
        "warm earth tones",
        "sun-faded neutrals",
        "soft terracotta",
        "muted florals",
      ],
      typography:
        "Relaxed, bohemian typography style with hand-drawn and serif influences",
      mood: [
        "romantic bohemian",
        "free-spirited",
        "travel-inspired",
        "effortlessly feminine",
      ],
      composition:
        "Loose, storytelling frames with flowing lines, layered textures and off-center subjects.",
      lighting:
        "Natural, sun-kissed lighting with lens flares, backlight and soft shadows that feel like golden hour or late afternoon.",
    },
    visuals: {
      photoStyle:
        "Bohemian lifestyle editorials with movement, layered outfits and a sense of wanderlust.",
      settings:
        "Open fields, desert roads, beach cliffs, vintage-inspired interiors and eclectic apartments filled with textiles and plants.",
      cameraType:
        "Natural-feeling lifestyle camera aesthetic with a mix of wide and medium shots and subtle film-inspired softness.",
      postProcessing:
        "Warm grading, light grain and slightly faded blacks for a nostalgic, sun-worn feel.",
      commonElements: [
        "flowing dresses and skirts",
        "layered jewelry and stacked rings",
        "cowboy boots, sandals or bare feet",
        "blankets, knits and layered textiles",
        "wind in hair or fabric for visible movement",
      ],
      avoid: [
        "minimal, clinical environments",
        "overly polished corporate styling",
        "cold color palettes that break the bohemian mood",
      ],
    },
  },
}

export const ALL_BRAND_KEYS: BrandKey[] = Object.keys(BRAND_PROFILES) as BrandKey[]
