export const BRAND_COLOR_THEME_MAP = {
  "dark-moody": {
    id: "dark-moody",
    name: "Dark & Moody",
    description: "Dramatic blacks and grays with high contrast",
    colors: ["#000000", "#2C2C2C", "#4A4A4A", "#6B6B6B"],
    gradient: "from-black via-stone-800 to-stone-600",
  },
  "minimalist-clean": {
    id: "minimalist-clean",
    name: "Minimalistic & Clean",
    description: "Soft whites, creams, and beiges",
    colors: ["#FFFFFF", "#F5F5F0", "#E8E4DC", "#D4CFC4"],
    gradient: "from-white via-stone-50 to-stone-200",
  },
  "beige-creamy": {
    id: "beige-creamy",
    name: "Beige & Creamy",
    description: "Warm neutrals and earthy tones",
    colors: ["#F5F1E8", "#E8DCC8", "#D4C4A8", "#B8A88A"],
    gradient: "from-stone-100 via-stone-200 to-stone-300",
  },
  "pastel-coastal": {
    id: "pastel-coastal",
    name: "Pastel & Coastal",
    description: "Soft blues, teals, and aqua tones",
    colors: ["#E8F4F8", "#B8E0E8", "#88CCD8", "#5BA8B8"],
    gradient: "from-cyan-50 via-cyan-100 to-cyan-200",
  },
  "warm-terracotta": {
    id: "warm-terracotta",
    name: "Warm & Terracotta",
    description: "Rust, terracotta, and warm earth tones",
    colors: ["#E8D4C8", "#C8A898", "#A88878", "#886858"],
    gradient: "from-orange-100 via-orange-200 to-orange-300",
  },
  "bold-colorful": {
    id: "bold-colorful",
    name: "Bold & Colorful",
    description: "Vibrant colors with high energy",
    colors: ["#FF6B9D", "#FFA07A", "#FFD700", "#98D8C8"],
    gradient: "from-pink-300 via-orange-300 to-yellow-300",
  },
  custom: {
    id: "custom",
    name: "Custom Colors",
    description: "Choose your own brand colors",
    colors: ["#D4C5B9", "#A89B8E", "#8B7E71", "#6E6154"],
    gradient: "from-stone-200 via-stone-300 to-stone-400",
    isCustom: true,
  },
} as const

export type BrandColorThemeId = keyof typeof BRAND_COLOR_THEME_MAP

export const BRAND_COLOR_THEMES = Object.values(BRAND_COLOR_THEME_MAP)

export function getBrandColorThemeColors(theme: string | null | undefined): string[] {
  if (!theme || !(theme in BRAND_COLOR_THEME_MAP)) {
    return []
  }

  return [...BRAND_COLOR_THEME_MAP[theme as BrandColorThemeId].colors]
}

export const CURATED_FEED_STYLE_MAP = {
  "Dark & Moody": {
    name: "Dark & Moody",
    colors: ["#0b0b0f", "#2a2a2f", "#4a4a4f"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "selfie", "detail", "selfie", "flatlay", "selfie"],
  },
  "Beige Aesthetic": {
    name: "Beige Aesthetic",
    colors: ["#d2c2b0", "#b59f8a", "#8c7a67"],
    grid: ["selfie", "flatlay", "selfie", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Light & Minimalistic": {
    name: "Light & Minimalistic",
    colors: ["#f7f7f5", "#e6e6e2", "#d6d6d0"],
    grid: ["selfie", "selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Luxury Future Self": {
    name: "Luxury Future Self",
    colors: ["#1b1b1f", "#5a4d3f", "#c2b6a8"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Casual Bohemian": {
    name: "Casual Bohemian",
    colors: ["#c4a58c", "#9c7f63", "#6e5a45"],
    grid: ["selfie", "flatlay", "selfie", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Athletic & Wellness": {
    name: "Athletic & Wellness",
    colors: ["#dfe6e3", "#9bb1a6", "#6b7a74"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
  "Coastal Aesthetics": {
    name: "Coastal Aesthetics",
    colors: ["#f3e9df", "#c7d7dd", "#a8b9c2"],
    grid: ["selfie", "selfie", "flatlay", "selfie", "detail", "selfie", "selfie", "flatlay", "selfie"],
  },
} as const

export type CuratedFeedStyleName = keyof typeof CURATED_FEED_STYLE_MAP

export const FEED_STARTER_STYLE_MAP = {
  luxury: {
    id: "luxury",
    name: CURATED_FEED_STYLE_MAP["Dark & Moody"].name,
    description: "Dramatic blacks and grays with high contrast",
    colors: CURATED_FEED_STYLE_MAP["Dark & Moody"].colors,
    grid: ["selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie", "selfie"],
  },
  minimal: {
    id: "minimal",
    name: CURATED_FEED_STYLE_MAP["Light & Minimalistic"].name,
    description: "Soft whites, creams, and beiges",
    colors: CURATED_FEED_STYLE_MAP["Light & Minimalistic"].colors,
    grid: ["selfie", "selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie"],
  },
  beige: {
    id: "beige",
    name: CURATED_FEED_STYLE_MAP["Beige Aesthetic"].name,
    description: "Warm neutrals and earthy tones",
    colors: ["#c9b8a8", "#a89384", "#8a7968"],
    grid: ["selfie", "flatlay", "selfie", "selfie", "selfie", "selfie", "selfie", "flatlay", "selfie"],
  },
} as const

export type FeedStarterStyleId = keyof typeof FEED_STARTER_STYLE_MAP

export const STORY_HIGHLIGHT_PALETTES = {
  "Dark & Moody": BRAND_COLOR_THEME_MAP["dark-moody"].colors,
  "Minimalistic & Clean": BRAND_COLOR_THEME_MAP["minimalist-clean"].colors,
  "Bold & Colorful": BRAND_COLOR_THEME_MAP["bold-colorful"].colors,
  "Beige & Creamy": BRAND_COLOR_THEME_MAP["beige-creamy"].colors,
  "Pastel & Coastal": BRAND_COLOR_THEME_MAP["pastel-coastal"].colors,
  Monochrome: ["#0d0c0b", "#4a4a4a", "#a8a49c", "#f0ede8"],
} as const
