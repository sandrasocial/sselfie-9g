export const FASHION_TRENDS_2025 = {
  instagram: {
    aesthetics: {
      raw_authentic: {
        name: "Raw & Authentic",
        description: "Amateur cellphone quality, visible grain, authentic moments",
        keywords: [
          "amateur photo",
          "visible sensor noise",
          "heavy HDR glow",
          "blown-out highlights",
          "crushed shadows",
          "authentic moment",
          "unfiltered",
          "real life texture",
        ],
        targetAudience: "Gen Z, Millennials seeking authenticity",
      },
      quiet_luxury: {
        name: "Quiet Luxury",
        description: "Understated elegance, expensive fabrics, minimal branding",
        keywords: [
          "cashmere",
          "silk",
          "tailored",
          "neutral tones",
          "minimal jewelry",
          "expensive fabrics",
          "The Row aesthetic",
          "old money style",
        ],
        brands: ["The Row", "Loro Piana", "Brunello Cucinelli"],
        vibe: "Effortless wealth, understated sophistication",
      },
      mob_wife: {
        name: "Mob Wife Aesthetic",
        description: "Maximalist glamour, fur coats, bold makeup, oversized sunglasses",
        keywords: [
          "fur coat",
          "leather gloves",
          "red lips",
          "oversized sunglasses",
          "gold jewelry",
          "dramatic",
          "bold presence",
          "maximalist glamour",
        ],
        vibe: "Powerful, dramatic, unapologetically glamorous",
      },
      clean_girl: {
        name: "Clean Girl Aesthetic",
        description: "Natural makeup, slicked back hair, minimal jewelry, fresh skin",
        keywords: [
          "dewy skin",
          "slicked back bun",
          "gold hoops",
          "fresh face",
          "minimal makeup",
          "natural glow",
          "effortless beauty",
        ],
        vibe: "Fresh, natural, polished simplicity",
      },
      scandi_minimal: {
        name: "Scandinavian Minimalism",
        description: "Neutral palettes, clean lines, cozy textures, hygge aesthetic",
        keywords: [
          "beige tones",
          "linen",
          "wool",
          "chunky knits",
          "minimal accessories",
          "natural fabrics",
          "hygge vibes",
          "soft lighting",
        ],
        vibe: "Warm, inviting, effortlessly chic",
      },
      urban_luxury: {
        name: "Urban Luxury Street Style",
        description: "Oversized designer pieces, European architecture, moody lighting",
        keywords: [
          "oversized black leather blazer",
          "wide-leg jeans",
          "structured designer bag",
          "oversized rectangular sunglasses",
          "minimal gold jewelry",
          "belted leather coat",
          "European urban architecture background",
        ],
        poses: [
          "looking away over shoulder",
          "profile shot walking",
          "leaning against stone wall",
          "sitting on city steps",
          "hand in pocket mid-stride",
          "adjusting sunglasses naturally",
        ],
        lighting: "overcast natural light, muted tones, crushed blacks, cool temperature",
        locations: [
          "European stone architecture",
          "modern city street minimal background",
          "black architectural walls",
          "outdoor cafe urban setting",
        ],
        vibe: "Effortless European street style, moody and editorial",
      },
      quiet_luxury_street: {
        name: "Quiet Luxury Meets Street",
        description: "The Row aesthetic with urban edge",
        keywords: [
          "oversized beige blazer",
          "tailored neutrals",
          "expensive fabrics",
          "minimal branding",
          "effortless elegance",
          "architectural backdrop",
        ],
        vibe: "Understated luxury in urban context, effortless sophistication",
      },
    },

    viral_content_types: {
      get_ready_with_me: {
        format: "Process-driven, storytelling through styling",
        hooks: ["getting ready for...", "outfit of the day", "styling this...", "how I style..."],
        engagement: "High - viewers watch entire transformation",
      },
      day_in_life: {
        format: "Candid moments, raw aesthetic, relatable activities",
        hooks: ["coffee run", "morning routine", "work from home fit", "running errands", "casual weekend"],
        engagement: "High - authenticity resonates",
      },
      outfit_transition: {
        format: "Quick cut from casual to styled",
        hooks: ["day to night", "casual to elevated", "work to weekend"],
        engagement: "Very High - quick, satisfying transformation",
      },
    },
  },

  flux_prompting_strategies: {
    for_realism: [
      "raw photography",
      "skin texture visible",
      "film grain",
      "natural imperfections",
      "pores visible",
      "authentic lighting",
      "real skin detail",
      "natural blemishes",
    ],
    for_instagram_aesthetic: [
      "amateur cellphone quality",
      "visible sensor noise",
      "heavy HDR glow",
      "blown-out highlights",
      "crushed shadows",
      "Instagram filter aesthetic",
      "shot on iPhone",
      "natural amateur quality",
    ],
    color_grading_options: [
      "desaturated warm tones",
      "crushed blacks moody",
      "high contrast editorial",
      "soft muted pastels",
      "rich saturated colors",
      "cool teal shadows",
      "golden hour warmth",
    ],
    lighting_styles: [
      "soft overcast lighting",
      "harsh window light",
      "golden hour glow",
      "moody dim interior",
      "bright natural daylight",
      "cinematic rim lighting",
    ],
  },
}

export const GENDER_SPECIFIC_STYLING = {
  woman: {
    silhouette_principles: [
      "structured shoulders create power",
      "oversized proportions need one fitted element",
      "high waist elongates visually",
      "monochrome creates editorial impact",
      "texture contrast adds visual interest",
    ],
    fabric_instincts: [
      "quality over quantity",
      "natural fibers photograph better",
      "texture catches light interestingly",
    ],
    styling_philosophy:
      "Effortless elegance emerges from confidence, not specific garments. Natural hair movement, authentic expression, the ease of not trying too hard.",
    what_to_avoid:
      "Don't default to 'blazer' or 'slip dress' - ask what THIS person, in THIS moment, would actually reach for",
  },
  man: {
    silhouette_principles: [
      "relaxed fit reads modern",
      "layering creates depth",
      "one statement piece anchors the look",
      "proportion play between oversized and fitted",
      "texture adds sophistication to basics",
    ],
    fabric_instincts: [
      "weight matters for drape",
      "quality basics beat trendy pieces",
      "leather and wool signal intention",
    ],
    styling_philosophy:
      "Confident ease, natural posture, genuine presence. The best menswear looks unplanned but considered.",
    what_to_avoid: "Don't default to 'blazer' or 'coat' - ask what makes this person's style THEIRS",
  },
}

export const SEASONAL_PALETTES_2025 = {
  winter: {
    colors: ["charcoal grey", "cream", "black", "forest green", "burgundy", "navy"],
    fabrics: ["wool", "cashmere", "leather", "suede", "chunky knits"],
    vibe: "Cozy luxury, rich textures, layered sophistication",
  },
  spring: {
    colors: ["soft pink", "butter yellow", "sage green", "sky blue", "cream", "lavender"],
    fabrics: ["linen", "cotton", "silk", "lightweight knits"],
    vibe: "Fresh, airy, romantic minimalism",
  },
  summer: {
    colors: ["white", "sand", "ocean blue", "coral", "olive", "natural tones"],
    fabrics: ["linen", "cotton", "breathable knits", "lightweight denim"],
    vibe: "Effortless, breezy, coastal elegance",
  },
  fall: {
    colors: ["rust", "chocolate brown", "olive", "burnt orange", "deep burgundy", "warm grey"],
    fabrics: ["wool", "corduroy", "leather", "suede", "heavy knits"],
    vibe: "Warm, earthy, layered richness",
  },
}

export const LOCATION_AESTHETICS = {
  urban_street: {
    vibe: "Cool, confident, on-the-go energy",
    styling: "Effortless layers, statement outerwear, minimal accessories",
    scenarios: ["coffee run", "walking to work", "city exploring", "street style moment"],
  },
  minimalist_interior: {
    vibe: "Calm, intentional, sophisticated ease",
    styling: "Comfortable luxury, soft knits, neutral tones",
    scenarios: ["working from home", "morning routine", "cozy evening", "slow living"],
  },
  cafe_lifestyle: {
    vibe: "Casual elegance, social ease, approachable luxury",
    styling: "Elevated basics, simple jewelry, natural makeup",
    scenarios: ["coffee date", "laptop working", "friend catch-up", "solo moment"],
  },
  editorial_outdoor: {
    vibe: "Cinematic, intentional, fashion-forward",
    styling: "Statement pieces, bold silhouettes, confident presence",
    scenarios: ["photoshoot aesthetic", "golden hour walk", "architectural backdrop"],
  },
}

export const INSTAGRAM_BEST_PRACTICES = {
  composition: {
    rule_of_thirds: "Subject slightly off-center for dynamic composition",
    negative_space: "Clean backgrounds, minimal distractions",
    leading_lines: "Use architecture, streets, furniture to guide eye to subject",
  },
  storytelling: {
    authenticity: "Real moments, natural expressions, genuine interactions",
    relatability: "Everyday scenarios, accessible styling, real-life situations",
    aspiration: "Elevated aesthetics, luxury touches, dream lifestyle elements",
  },
  engagement_drivers: {
    scroll_stoppers: "Bold colors, unique angles, unexpected moments",
    save_worthy: "Outfit inspiration, styling tips, trend education",
    share_worthy: "Relatable moments, aspirational content, beautiful aesthetics",
  },
}

/**
 * Fashion Intelligence Principles (2026)
 * 
 * REFERENCE MATERIAL ONLY - Used as guidance in system prompts
 * Maya (Claude Sonnet 4) uses these principles to inform her fashion choices,
 * but generates diverse, context-appropriate concepts naturally.
 * 
 * NOT used for random selection - these are principles and trends, not limited arrays.
 */
export function getFashionIntelligencePrinciples(gender: string, ethnicity?: string | null): string {
  const currentMonth = new Date().getMonth()
  const season =
    currentMonth >= 2 && currentMonth <= 4
      ? "spring"
      : currentMonth >= 5 && currentMonth <= 7
        ? "summer"
        : currentMonth >= 8 && currentMonth <= 10
          ? "fall"
          : "winter"

  const seasonData = SEASONAL_PALETTES_2025[season as keyof typeof SEASONAL_PALETTES_2025]
  const genderData =
    GENDER_SPECIFIC_STYLING[gender as keyof typeof GENDER_SPECIFIC_STYLING] || GENDER_SPECIFIC_STYLING.woman

  const ethnicityGuidance =
    ethnicity && ethnicity !== "Other"
      ? `
=== CRITICAL REPRESENTATION GUIDANCE ===

**USER ETHNICITY: ${ethnicity}**

EVERY SINGLE FLUX PROMPT YOU CREATE MUST:
1. Start with the trigger word
2. IMMEDIATELY follow with: "${ethnicity} ${gender}"
3. This ensures accurate skin tone, facial features, and authentic representation

**EXAMPLE FORMAT:**
"[trigger_word], ${ethnicity} ${gender} in [rest of prompt]"

**WHY THIS MATTERS:**
Without explicit ethnicity descriptors, AI models default to what they've seen most in training data, which can lighten skin tones or misrepresent features. This is NON-NEGOTIABLE for accurate, respectful representation.

**YOUR RESPONSIBILITY:**
Every person deserves to see themselves authentically represented in generated images. Always include ethnicity after the trigger word.

===
`
      : ""

  return `
=== MAYA'S FASHION INTELLIGENCE: SCANDINAVIAN/NORDIC AESTHETIC FOCUS ===

${ethnicityGuidance}

**YOUR DEFAULT AESTHETIC BASE: SCANDINAVIAN MINIMALISM**

Unless the user EXPLICITLY requests something different, ALL concepts follow this aesthetic:

### MANDATORY SCANDINAVIAN PRINCIPLES:

**COLOR PALETTE (NON-NEGOTIABLE):**
- **PRIMARY NEUTRALS:** Black, white, cream, beige, warm grey, chocolate brown
- **OCCASIONAL ACCENTS:** Burgundy, forest green, navy blue (use sparingly, 1-2 concepts max)
- **BANNED COLORS:** Yellow, bright green, orange, neon colors, pastels (unless specifically requested)
- **PHILOSOPHY:** "Nordic restraint - let the person shine, not the colors"

**FABRIC & TEXTURE:**
- Natural materials: cashmere, wool, linen, cotton, leather
- Cozy textures: chunky knits, soft cashmere, brushed wool
- Quality over flashy: expensive-feeling fabrics, never synthetic-looking

**SILHOUETTE PHILOSOPHY:**
- Clean lines, relaxed fits
- Oversized but intentional (not sloppy)
- Minimal accessories - one statement piece max
- Effortless elegance, never overdone

**SETTINGS & LIFESTYLE:**
- Minimalist interiors with natural light
- Cozy cafes with Nordic design
- Urban architecture with clean lines
- Natural outdoor settings

You are an elite fashion intelligence agent with DYNAMIC expertise in ALL Instagram aesthetics. Your knowledge extends far beyond any fixed list - you understand:
- **SCANDINAVIAN MINIMALISM (YOUR DEFAULT BASE)**
- Quiet Luxury, Mob Wife, Clean Girl, Old Money, Coastal Grandmother
- Dark Academia, Cottage Core, Barbiecore, Y2K Revival
- Parisian Chic, Italian Sophistication
- Street Style, Athleisure Elevated, Lounge Luxury
- And DOZENS of emerging micro-aesthetics

**CRITICAL CREATIVE RULE:** 
Scandinavian minimalism is your FOUNDATION. When users request other aesthetics, you BLEND them with Nordic sensibility:
- "Mob Wife" → Scandinavian Mob Wife (fur coat in beige/cream, gold jewelry, but restrained)
- "Street Style" → Nordic Street Style (black leather, clean lines, minimal accessories)
- "Cozy" → Peak Scandi (chunky knits, warm neutrals, natural settings)

## OUTFIT COMPONENT UNDERSTANDING (NO TEMPLATES)

You understand these component categories and DYNAMICALLY combine them based on story context:

### ESSENTIAL PIECES (Component Knowledge Only)
**Blazers/Jackets:** Oversized cuts (boyfriend, double-breasted, hourglass), structured leather (black, chocolate brown, cream), tailored wool, trenches, moto jackets, bombers (leather, satin, nylon - in neutral tones), denim jackets, shackets

**Tops:** Ribbed tanks (fitted, in cream/white/black), cashmere turtlenecks/crewnecks (neutral tones), oversized knits (chunky, cable-knit, fuzzy - natural colors), silk slip camis (cream, black, white), sheer mesh (black/nude only), fitted crops, button-downs (oversized or fitted, white/cream/beige)

**Bottoms:** High-waisted leather (straight-leg, wide-leg - black/chocolate brown), low-rise barrel jeans, straight-leg denim (blue or black), wide-leg trousers (tailored, cream, black, grey, beige), leggings (black, brown, cream), midi/mini skirts (leather, denim, knit - neutrals only)

## SEASONAL INSTINCT (Current: ${season.toUpperCase()})

You have instinct for what feels RIGHT this season while STAYING TRUE to Nordic color palette:
- Color mood: ${seasonData.colors
    .filter((c: string) => !c.includes("yellow") && !c.includes("pink") && !c.includes("lavender"))
    .slice(0, 3)
    .join(", ")} direction (filtered for Nordic palette)
- Fabric feeling: ${seasonData.fabrics.slice(0, 2).join(" and ")} energy  
- Overall vibe: ${seasonData.vibe} with Scandinavian restraint

USE AS INSTINCT, not as a copy list.

## GENDER-AWARE STYLING (${gender.toUpperCase()})

Philosophy: ${genderData.styling_philosophy}

Silhouette understanding:
${genderData.silhouette_principles
  .slice(0, 3)
  .map((p: string) => `- ${p}`)
  .join("\n")}

## COLOR PALETTE: SCANDINAVIAN NATURAL TONES (MANDATORY)

**YOUR DEFAULT PALETTE:**
- **Core Neutrals (80% of outfits):** Black, white, cream, beige, warm grey, chocolate brown
- **Occasional Accents (20% of outfits, 1-2 concepts):** Burgundy, forest green, navy blue
- **NEVER USE unless explicitly requested:** Yellow, bright green, orange, hot pink, neon colors, pastels

**HOW TO USE COLORS:**
- Monochrome looks: All cream, all black, all grey (very Scandi)
- Neutral + texture: Black leather + chunky cream knit
- Subtle accent: Beige outfit + burgundy accessories
- Natural tones: Chocolate brown + cream + black

**WHY THESE COLORS:**
Nordic aesthetics = restraint, nature, timelessness. Bright colors distract from the person and feel "try-hard". Natural tones photograph beautifully, feel luxurious, and create save-worthy content.

**IF USER REQUESTS OTHER COLORS:** Only then deviate (e.g., "I want red" → deep burgundy/wine, not bright red)

## FLUX-SPECIFIC OUTFIT DESCRIPTION RULES

**ALWAYS INCLUDE:**
- Fabric/texture description: "butter-soft chocolate leather" "chunky cable-knit" "ribbed cotton"
- Fit/silhouette: "oversized boyfriend cut" "high-waisted straight-leg" "fitted cropped"
- Color specificity: "warm honey beige" not "beige", "deep chocolate brown" not "brown"

**SCANDINAVIAN CHECK (before finalizing any outfit):**
✓ Colors are primarily neutrals (black, white, cream, beige, grey, brown)?
✓ Maximum ONE accent color (burgundy/forest green/navy) if used?
✓ Fabrics feel natural and quality?
✓ Silhouette is clean and intentional?
✓ Minimal accessories (not overdone)?
✓ Overall vibe is "effortless Nordic elegance"?

If any check fails and user hasn't requested otherwise → REVISE to be more Scandinavian.

## 🔴 CRITICAL: BRAND DATABASE - ALWAYS USE SPECIFIC BRAND NAMES

**TOP 20 MOST-USED BRANDS (MANDATORY IN PROMPTS):**

**Athletic/Athleisure:**
- **Alo Yoga** - Athletic wear (Airlift bralette, Airbrush leggings, Accolade sweatshirt, Cropped hoodie, Tennis skirt, Matching sets)
- **Lululemon** - Align leggings, Everywhere Belt Bag, Scuba Oversized hoodie, Define jacket, Wunder Train tights, Align joggers
- **Nike** - Air Force 1 Low sneakers (triple white leather), athletic wear
- **Adidas** - Gazelle sneakers, Samba sneakers
- **New Balance** - 550 sneakers, 327 sneakers

**Denim/Casual:**
- **Levi's** - 501 straight-leg jeans, Ribcage jeans (wide leg, baggy, 90's style)
- **Agolde** - Denim (premium denim brand)
- **Zara** - Basics (affordable fast fashion)
- **COS** - Minimalist basics (Scandinavian minimalism)
- **Everlane** - Cashmere, basics (sustainable basics)
- **Reformation** - Dresses (sustainable fashion)
- **Toteme** - Scandi style (Nordic minimalist brand)

**Luxury Accents (Use 1-2 per outfit max):**
- **Bottega Veneta** - Jodie bag (butter-soft caramel leather), Arco tote, Loop Camera bag, Cassette crossbody
- **The Row** - Coats, bags (quiet luxury)
- **Cartier** - Love bracelet (yellow gold), Tank watch, Juste un Clou bracelet
- **Chanel** - Quilted bags (golden hardware), Tweed pieces
- **Hermès** - Birkin bag, Constance bag, Belt, Scarf (luxury travel only)

**Accessories/Footwear:**
- **UGG** - Tasman slippers (chestnut with shearling lining), boots
- **Common Projects** - White sneakers (Achilles Low)
- **New Era** - Baseball caps
- **Ray-Ban** - Sunglasses

**Basics/Bodysuits:**
- **Skims / Khy** - Bodysuits, basics (shapewear and basics)

**BRAND USAGE RULES:**
1. **ALWAYS brand:** Alo Yoga, Lululemon, Adidas Gazelle, Nike AF1, New Balance 550, Levi's 501, UGG slippers, Bottega bags
2. **SOMETIMES brand:** Outerwear, basic tops, accessories (based on category)
3. **USUALLY DON'T brand:** Generic "white sneakers" (unless Common Projects), basic jewelry (unless Cartier)
4. **MAX 1-2 luxury pieces per outfit** (usually just the bag)
5. **Athletic brands for athletic categories** (workout, gym, athletic)
6. **Casual brands for casual categories** (casual, coffee-run, street-style)
7. **Luxury brands for luxury categories** (luxury, travel, airport - use sparingly)

**CRITICAL:** Every prompt MUST include at least ONE brand name from the list above. Missing brand names is a validation error.
`
}
