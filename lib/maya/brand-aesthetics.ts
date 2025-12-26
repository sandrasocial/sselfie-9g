/**
 * Brand Aesthetic Guide
 * 
 * Simple aesthetic descriptions for luxury brands.
 * These are REFERENCE ONLY - Maya uses them as inspiration, not rigid templates.
 */

export interface BrandAesthetic {
  name: string
  vibe: string
  style: string
  colors: string
  setting: string
}

export const BRAND_AESTHETICS: Record<string, BrandAesthetic> = {
  "alo yoga": {
    name: "Alo Yoga",
    vibe: "Premium athleisure, wellness lifestyle, aspirational yet accessible",
    style: "Natural movement, soft lighting, authentic moments, influencer-quality UGC",
    colors: "Neutral tones (beige, cream, white, earth tones), soft pastels",
    setting: "Outdoor wellness spaces, yoga studios, minimalist interiors, natural settings"
  },
  
  "the row": {
    name: "The Row",
    vibe: "Quiet luxury, understated wealth, sophisticated elegance",
    style: "Tailored silhouettes, expensive fabrics, minimal branding, editorial quality",
    colors: "Neutral palette (black, cream, camel, navy, grey), monochromatic looks",
    setting: "Architectural spaces, urban minimalist, clean backgrounds, European aesthetic"
  },
  
  "lululemon": {
    name: "Lululemon",
    vibe: "Active lifestyle, mindful movement, community-focused wellness",
    style: "Dynamic movement, natural outdoor lighting, authentic fitness moments",
    colors: "Vibrant yet sophisticated (jewel tones, earth tones, neutrals)",
    setting: "Urban outdoor, fitness studios, parks, active lifestyle environments"
  },
  
  "glossier": {
    name: "Glossier",
    vibe: "Clean girl aesthetic, effortless beauty, natural glow",
    style: "Dewy skin, minimal makeup, soft natural lighting, relatable moments",
    colors: "Soft pastels (pink, peach, white), neutral tones, clean whites",
    setting: "Minimal interiors, bathroom mirrors, natural light spaces, everyday settings"
  },
  
  "toteme": {
    name: "Toteme",
    vibe: "Scandinavian minimalism, modern elegance, timeless sophistication",
    style: "Clean lines, quality fabrics, effortless layering, editorial aesthetic",
    colors: "Neutral earth tones, black, white, camel, grey, navy",
    setting: "Minimalist architecture, European streets, clean modern interiors"
  },
  
  "khaite": {
    name: "Khaite",
    vibe: "New York sophistication, modern luxury, confident femininity",
    style: "Bold silhouettes, luxe fabrics, contemporary elegance, editorial edge",
    colors: "Rich neutrals (camel, chocolate, black, cream), jewel tones",
    setting: "Urban architecture, modern spaces, city streets, sophisticated environments"
  }
}

/**
 * Get brand aesthetic by name (case-insensitive)
 */
export function getBrandAesthetic(brandName: string): BrandAesthetic | null {
  const normalized = brandName.toLowerCase().trim()
  return BRAND_AESTHETICS[normalized] || null
}

/**
 * Get aesthetic description as text guidance for Maya
 */
export function getBrandAestheticGuidance(brandName: string): string | null {
  const aesthetic = getBrandAesthetic(brandName)
  if (!aesthetic) return null
  
  return `${aesthetic.name} aesthetic: ${aesthetic.vibe}. Style: ${aesthetic.style}. Colors: ${aesthetic.colors}. Settings: ${aesthetic.setting}.`
}

