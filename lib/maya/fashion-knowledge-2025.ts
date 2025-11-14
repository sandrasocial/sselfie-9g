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
          "real life texture"
        ],
        targetAudience: "Gen Z, Millennials seeking authenticity"
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
          "old money style"
        ],
        brands: ["The Row", "Loro Piana", "Brunello Cucinelli"],
        vibe: "Effortless wealth, understated sophistication"
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
          "maximalist glamour"
        ],
        vibe: "Powerful, dramatic, unapologetically glamorous"
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
          "effortless beauty"
        ],
        vibe: "Fresh, natural, polished simplicity"
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
          "soft lighting"
        ],
        vibe: "Warm, inviting, effortlessly chic"
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
          "European urban architecture background"
        ],
        poses: [
          "looking away over shoulder",
          "profile shot walking",
          "leaning against stone wall",
          "sitting on city steps",
          "hand in pocket mid-stride",
          "adjusting sunglasses naturally"
        ],
        lighting: "overcast natural light, muted tones, crushed blacks, cool temperature",
        locations: [
          "European stone architecture",
          "modern city street minimal background",
          "black architectural walls",
          "outdoor cafe urban setting"
        ],
        vibe: "Effortless European street style, moody and editorial"
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
          "architectural backdrop"
        ],
        vibe: "Understated luxury in urban context, effortless sophistication"
      }
    },

    viral_content_types: {
      get_ready_with_me: {
        format: "Process-driven, storytelling through styling",
        hooks: [
          "getting ready for...",
          "outfit of the day",
          "styling this...",
          "how I style..."
        ],
        engagement: "High - viewers watch entire transformation"
      },
      day_in_life: {
        format: "Candid moments, raw aesthetic, relatable activities",
        hooks: [
          "coffee run",
          "morning routine",
          "work from home fit",
          "running errands",
          "casual weekend"
        ],
        engagement: "High - authenticity resonates"
      },
      outfit_transition: {
        format: "Quick cut from casual to styled",
        hooks: [
          "day to night",
          "casual to elevated",
          "work to weekend"
        ],
        engagement: "Very High - quick, satisfying transformation"
      }
    }
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
      "natural blemishes"
    ],
    for_instagram_aesthetic: [
      "amateur cellphone quality",
      "visible sensor noise",
      "heavy HDR glow",
      "blown-out highlights",
      "crushed shadows",
      "Instagram filter aesthetic",
      "shot on iPhone",
      "natural amateur quality"
    ],
    color_grading_options: [
      "desaturated warm tones",
      "crushed blacks moody",
      "high contrast editorial",
      "soft muted pastels",
      "rich saturated colors",
      "cool teal shadows",
      "golden hour warmth"
    ],
    lighting_styles: [
      "soft overcast lighting",
      "harsh window light",
      "golden hour glow",
      "moody dim interior",
      "bright natural daylight",
      "cinematic rim lighting"
    ]
  }
};

export const GENDER_SPECIFIC_STYLING = {
  woman: {
    current_trends: [
      "oversized blazers",
      "quiet luxury knits",
      "minimal jewelry",
      "natural makeup",
      "slicked back hair",
      "ballet flats",
      "wide leg trousers",
      "cashmere layers"
    ],
    fabric_preferences: [
      "cashmere",
      "silk",
      "linen",
      "soft wool",
      "organic cotton",
      "luxe knits"
    ],
    styling_notes:
      "Effortless elegance, natural hair movement, authentic expression, confident ease",
    makeup_aesthetic:
      "Fresh skin, minimal coverage, natural flush, defined brows, subtle lips"
  },
  man: {
    current_trends: [
      "tailored outerwear",
      "relaxed suiting",
      "minimal accessories",
      "natural grooming",
      "oversized coats",
      "quality basics",
      "leather accessories",
      "smart casual layers"
    ],
    fabric_preferences: [
      "wool blends",
      "cotton",
      "leather",
      "cashmere",
      "technical fabrics",
      "denim"
    ],
    styling_notes:
      "Confident ease, natural posture, genuine presence, relaxed sophistication",
    grooming_aesthetic: "Well-maintained beard or clean shaven, natural hair, subtle grooming"
  }
};

export const SEASONAL_PALETTES_2025 = {
  winter: {
    colors: ["charcoal grey", "cream", "camel", "forest green", "burgundy", "navy"],
    fabrics: ["wool", "cashmere", "leather", "suede", "chunky knits"],
    vibe: "Cozy luxury, rich textures, layered sophistication"
  },
  spring: {
    colors: ["soft pink", "butter yellow", "sage green", "sky blue", "cream", "lavender"],
    fabrics: ["linen", "cotton", "silk", "lightweight knits"],
    vibe: "Fresh, airy, romantic minimalism"
  },
  summer: {
    colors: ["white", "sand", "ocean blue", "coral", "olive", "natural tones"],
    fabrics: ["linen", "cotton", "breathable knits", "lightweight denim"],
    vibe: "Effortless, breezy, coastal elegance"
  },
  fall: {
    colors: ["rust", "chocolate brown", "olive", "burnt orange", "deep burgundy", "camel"],
    fabrics: ["wool", "corduroy", "leather", "suede", "heavy knits"],
    vibe: "Warm, earthy, layered richness"
  }
};

export const LOCATION_AESTHETICS = {
  urban_street: {
    vibe: "Cool, confident, on-the-go energy",
    styling: "Effortless layers, statement outerwear, minimal accessories",
    scenarios: ["coffee run", "walking to work", "city exploring", "street style moment"]
  },
  minimalist_interior: {
    vibe: "Calm, intentional, sophisticated ease",
    styling: "Comfortable luxury, soft knits, neutral tones",
    scenarios: ["working from home", "morning routine", "cozy evening", "slow living"]
  },
  cafe_lifestyle: {
    vibe: "Casual elegance, social ease, approachable luxury",
    styling: "Elevated basics, simple jewelry, natural makeup",
    scenarios: ["coffee date", "laptop working", "friend catch-up", "solo moment"]
  },
  editorial_outdoor: {
    vibe: "Cinematic, intentional, fashion-forward",
    styling: "Statement pieces, bold silhouettes, confident presence",
    scenarios: ["photoshoot aesthetic", "golden hour walk", "architectural backdrop"]
  }
};

export const INSTAGRAM_BEST_PRACTICES = {
  composition: {
    rule_of_thirds: "Subject slightly off-center for dynamic composition",
    negative_space: "Clean backgrounds, minimal distractions",
    leading_lines: "Use architecture, streets, furniture to guide eye to subject"
  },
  storytelling: {
    authenticity: "Real moments, natural expressions, genuine interactions",
    relatability: "Everyday scenarios, accessible styling, real-life situations",
    aspiration: "Elevated aesthetics, luxury touches, dream lifestyle elements"
  },
  engagement_drivers: {
    scroll_stoppers: "Bold colors, unique angles, unexpected moments",
    save_worthy: "Outfit inspiration, styling tips, trend education",
    share_worthy: "Relatable moments, aspirational content, beautiful aesthetics"
  }
};
