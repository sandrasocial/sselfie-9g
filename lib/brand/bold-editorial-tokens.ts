export const BOLD_EDITORIAL_COLORS = {
  ink: "#09090B",
  carbon: "#18181B",
  espresso: "#09090B",
  chalk: "#FAFAF9",
  ivory: "#FAFAF9",
  paper: "#FFFFFF",
  concrete: "#E7E7EA",
  parchment: "#F0F0F2",
  silver: "#D7D7DC",
  taupe: "#A3A3A9",
  slate: "#5E5E66",
  champagne: "#F3E6CF",
  champagneInk: "#5F5B56",
  error: "#B42318",
  success: "#216E4E",
} as const

export const BOLD_EDITORIAL_TYPE = {
  display: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "Manrope, Inter, Arial, Helvetica, sans-serif",
  signature: "Allura, 'Segoe Script', cursive",
  emailDisplay: "Georgia, 'Times New Roman', serif",
  emailSans: "Arial, Helvetica, sans-serif",
} as const

export const BOLD_EDITORIAL_SHAPE = {
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

export const BOLD_EDITORIAL_CSS_VARS = {
  "--ss-brand-ink": BOLD_EDITORIAL_COLORS.ink,
  "--ss-brand-carbon": BOLD_EDITORIAL_COLORS.carbon,
  "--ss-brand-espresso": BOLD_EDITORIAL_COLORS.espresso,
  "--ss-brand-chalk": BOLD_EDITORIAL_COLORS.chalk,
  "--ss-brand-ivory": BOLD_EDITORIAL_COLORS.ivory,
  "--ss-brand-paper": BOLD_EDITORIAL_COLORS.paper,
  "--ss-brand-concrete": BOLD_EDITORIAL_COLORS.concrete,
  "--ss-brand-parchment": BOLD_EDITORIAL_COLORS.parchment,
  "--ss-brand-silver": BOLD_EDITORIAL_COLORS.silver,
  "--ss-brand-taupe": BOLD_EDITORIAL_COLORS.taupe,
  "--ss-brand-slate": BOLD_EDITORIAL_COLORS.slate,
  "--ss-brand-champagne": BOLD_EDITORIAL_COLORS.champagne,
  "--ss-brand-champagne-ink": BOLD_EDITORIAL_COLORS.champagneInk,
  "--ss-brand-error": BOLD_EDITORIAL_COLORS.error,
  "--ss-brand-success": BOLD_EDITORIAL_COLORS.success,
  "--ss-brand-glass-light": "rgba(255, 255, 255, 0.68)",
  "--ss-brand-glass-dark": "rgba(9, 9, 11, 0.92)",
  "--ss-brand-glass-edge": "rgba(255, 255, 255, 0.34)",
  "--ss-brand-glass-blur": "28px",
} as const

export const BOLD_EDITORIAL_GUARDRAILS = {
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

export type BoldEditorialColorName = keyof typeof BOLD_EDITORIAL_COLORS
