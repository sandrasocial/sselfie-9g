/**
 * SSELFIE Noir Glass is the current approved system.
 *
 * The file name and BOLD_EDITORIAL_* exports remain only so existing imports do
 * not break. New visual work must use the SSELFIE_NOIR_GLASS_* exports below
 * and follow docs/SSELFIE_DESIGN_SYSTEM.md.
 */
export const SSELFIE_NOIR_GLASS_COLORS = {
  obsidian: "#09090B",
  graphite: "#18181B",
  pearl: "#FAFAF9",
  paper: "#FFFFFF",
  concrete: "#E7E7EA",
  coolMist: "#F0F0F2",
  silver: "#D7D7DC",
  steel: "#A3A3A9",
  slate: "#5E5E66",
  pearlNeon: "#F3E6CF",
  warmGrey: "#5F5B56",
  error: "#B42318",
  success: "#216E4E",
} as const

export const SSELFIE_NOIR_GLASS_TYPE = {
  display: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "Manrope, Inter, Arial, Helvetica, sans-serif",
  signature: "Allura, 'Segoe Script', cursive",
  emailDisplay: "Georgia, 'Times New Roman', serif",
  emailSans: "Arial, Helvetica, sans-serif",
} as const

export const SSELFIE_NOIR_GLASS_SHAPE = {
  radius: {
    square: "0px",
    control: "12px",
    surface: "16px",
    image: "18px",
    pill: "999px",
  },
  rule: "1px",
  touchTarget: "44px",
} as const

export const SSELFIE_NOIR_GLASS_CSS_VARS = {
  "--ss-brand-obsidian": SSELFIE_NOIR_GLASS_COLORS.obsidian,
  "--ss-brand-graphite": SSELFIE_NOIR_GLASS_COLORS.graphite,
  "--ss-brand-pearl": SSELFIE_NOIR_GLASS_COLORS.pearl,
  "--ss-brand-paper": SSELFIE_NOIR_GLASS_COLORS.paper,
  "--ss-brand-concrete": SSELFIE_NOIR_GLASS_COLORS.concrete,
  "--ss-brand-cool-mist": SSELFIE_NOIR_GLASS_COLORS.coolMist,
  "--ss-brand-silver": SSELFIE_NOIR_GLASS_COLORS.silver,
  "--ss-brand-steel": SSELFIE_NOIR_GLASS_COLORS.steel,
  "--ss-brand-slate": SSELFIE_NOIR_GLASS_COLORS.slate,
  "--ss-brand-pearl-neon": SSELFIE_NOIR_GLASS_COLORS.pearlNeon,
  "--ss-brand-warm-grey": SSELFIE_NOIR_GLASS_COLORS.warmGrey,
  "--ss-brand-error": SSELFIE_NOIR_GLASS_COLORS.error,
  "--ss-brand-success": SSELFIE_NOIR_GLASS_COLORS.success,
  "--ss-brand-glass-light": "rgba(255, 255, 255, 0.68)",
  "--ss-brand-glass-dark": "rgba(9, 9, 11, 0.92)",
  "--ss-brand-glass-edge": "rgba(255, 255, 255, 0.34)",
  "--ss-brand-glass-blur": "28px",
} as const

export const SSELFIE_NOIR_GLASS_GUARDRAILS = {
  method: ["TAKE", "CREATE", "EDIT", "POST"],
  prohibited: [
    "soft pastel brand palettes",
    "purple AI gradients",
    "generic floating SaaS cards",
    "decorative florals and uncontrolled sparkle effects",
    "glassmorphism on ordinary content cards",
    "brown or cream default surfaces",
    "neon on body copy or ordinary controls",
  ],
} as const

/** @deprecated Compatibility aliases. Do not use these names in new visual work. */
export const BOLD_EDITORIAL_COLORS = {
  ink: SSELFIE_NOIR_GLASS_COLORS.obsidian,
  carbon: SSELFIE_NOIR_GLASS_COLORS.graphite,
  espresso: SSELFIE_NOIR_GLASS_COLORS.obsidian,
  chalk: SSELFIE_NOIR_GLASS_COLORS.pearl,
  ivory: SSELFIE_NOIR_GLASS_COLORS.pearl,
  paper: SSELFIE_NOIR_GLASS_COLORS.paper,
  concrete: SSELFIE_NOIR_GLASS_COLORS.concrete,
  parchment: SSELFIE_NOIR_GLASS_COLORS.coolMist,
  silver: SSELFIE_NOIR_GLASS_COLORS.silver,
  taupe: SSELFIE_NOIR_GLASS_COLORS.steel,
  slate: SSELFIE_NOIR_GLASS_COLORS.slate,
  champagne: SSELFIE_NOIR_GLASS_COLORS.pearlNeon,
  champagneInk: SSELFIE_NOIR_GLASS_COLORS.warmGrey,
  error: SSELFIE_NOIR_GLASS_COLORS.error,
  success: SSELFIE_NOIR_GLASS_COLORS.success,
} as const

/** @deprecated Use SSELFIE_NOIR_GLASS_TYPE. */
export const BOLD_EDITORIAL_TYPE = SSELFIE_NOIR_GLASS_TYPE
/** @deprecated Use SSELFIE_NOIR_GLASS_SHAPE. */
export const BOLD_EDITORIAL_SHAPE = SSELFIE_NOIR_GLASS_SHAPE
/** @deprecated Use SSELFIE_NOIR_GLASS_CSS_VARS. */
export const BOLD_EDITORIAL_CSS_VARS = {
  ...SSELFIE_NOIR_GLASS_CSS_VARS,
  "--ss-brand-ink": SSELFIE_NOIR_GLASS_COLORS.obsidian,
  "--ss-brand-carbon": SSELFIE_NOIR_GLASS_COLORS.graphite,
  "--ss-brand-espresso": SSELFIE_NOIR_GLASS_COLORS.obsidian,
  "--ss-brand-chalk": SSELFIE_NOIR_GLASS_COLORS.pearl,
  "--ss-brand-ivory": SSELFIE_NOIR_GLASS_COLORS.pearl,
  "--ss-brand-parchment": SSELFIE_NOIR_GLASS_COLORS.coolMist,
  "--ss-brand-taupe": SSELFIE_NOIR_GLASS_COLORS.steel,
  "--ss-brand-champagne": SSELFIE_NOIR_GLASS_COLORS.pearlNeon,
  "--ss-brand-champagne-ink": SSELFIE_NOIR_GLASS_COLORS.warmGrey,
} as const
/** @deprecated Use SSELFIE_NOIR_GLASS_GUARDRAILS. */
export const BOLD_EDITORIAL_GUARDRAILS = SSELFIE_NOIR_GLASS_GUARDRAILS

export type SselfieNoirGlassColorName = keyof typeof SSELFIE_NOIR_GLASS_COLORS
/** @deprecated Use SselfieNoirGlassColorName. */
export type BoldEditorialColorName = keyof typeof BOLD_EDITORIAL_COLORS
