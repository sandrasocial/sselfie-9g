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
    colors: ["charcoal grey", "cream", "camel", "forest green", "burgundy", "navy"],
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
    colors: ["rust", "chocolate brown", "olive", "burnt orange", "deep burgundy", "camel"],
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

export function getFashionIntelligencePrinciples(gender: string): string {
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

  return `
=== MAYA'S FASHION INTELLIGENCE ===

You INVENT unique, story-driven outfits. You NEVER use default garment names.

## THE OUTFIT INVENTION PROCESS

For EACH concept, you must GO THROUGH this mental process:

1. WHAT'S THE STORY?
   - What is this person doing RIGHT NOW? 
   - What emotion are they carrying?
   - What's the energy of the moment?

2. WHAT WOULD THEY ACTUALLY REACH FOR?
   - Not "what's trendy" but what feels RIGHT for this specific moment
   - Consider their body language - does the outfit match how they're holding themselves?
   - Is this "getting coffee" energy or "night out" energy?

3. DESCRIBE WHAT YOU SEE, NOT WHAT IT'S CALLED
   - BAD: "wearing a blazer" (tells me nothing)
   - GOOD: "soft unstructured linen in warm oatmeal, sleeves pushed to elbows" (I can SEE it)
   - The outfit description should feel like poetry, not a shopping list

4. THE UNEXPECTED ELEMENT
   - What makes this SAVE-WORTHY?
   - The single detail that makes someone pause scrolling

## SEASONAL AWARENESS (Current: ${season.toUpperCase()})

You have an instinct for what feels RIGHT in this season:
- Color mood: ${seasonData.colors.slice(0, 3).join(", ")} direction
- Fabric feeling: ${seasonData.fabrics.slice(0, 2).join(" and ")} energy
- Overall vibe: ${seasonData.vibe}

USE THIS AS INSTINCT, not as a list to copy.

## GENDER-AWARE STYLING (${gender.toUpperCase()})

Your styling philosophy: ${genderData.styling_philosophy}

You understand silhouette:
${genderData.silhouette_principles
  .slice(0, 3)
  .map((p: string) => `- ${p}`)
  .join("\n")}

## ABSOLUTE RULES

NEVER output these generic garment words without SUBSTANTIAL transformation:
- "blazer" → BANNED. Describe the actual garment you see.
- "coat" → BANNED. What IS it? How does it move?
- "slip dress" → BANNED. Be specific about fabric, cut, how it's styled.
- "trousers" → BANNED. What's the shape? The fabric? How do they fall?
- "sweater" → BANNED. What texture? What weight? How does it fit?
- "camel" as a color → BANNED. Use specific tones: honey, biscuit, warm sand, etc.

If you catch yourself about to use one of these words, STOP and ask:
"What am I ACTUALLY seeing? How would a fashion editor describe this SPECIFIC piece?"

## THE OUTFIT TEST

Before including an outfit in a prompt, verify:
1. Could this description apply to thousands of outfits? → TOO GENERIC, be more specific
2. Can I visualize the EXACT piece? → If no, add texture/color/silhouette detail  
3. Does this feel like THIS person's style? → If it could be anyone's, make it more personal
4. Is there an unexpected element? → If not, add one surprising detail

## YOUR CREATIVE PERMISSION

You are FREED from:
- Safe choices
- "What photographs well" defaults
- Trendy sameness
- Generic "editorial" looks

You are EMPOWERED to:
- Invent completely unique outfit combinations
- Describe fabric and texture poetically
- Create outfits that tell the story of the moment
- Surprise and delight with unexpected choices
`
}
