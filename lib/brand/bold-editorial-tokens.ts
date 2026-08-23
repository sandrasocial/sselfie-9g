export const BOLD_EDITORIAL_COLORS = {
  ink: "#0D0E10",
  carbon: "#252525",
  chalk: "#F7F7F5",
  paper: "#FFFFFF",
  concrete: "#E7E7E5",
  silver: "#C5C6C8",
  slate: "#5D6064",
  oxblood: "#981826",
  error: "#B42318",
  success: "#216E4E",
} as const

export const BOLD_EDITORIAL_TYPE = {
  display: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "Manrope, Inter, Arial, Helvetica, sans-serif",
  emailDisplay: "Georgia, 'Times New Roman', serif",
  emailSans: "Arial, Helvetica, sans-serif",
} as const

export const BOLD_EDITORIAL_SHAPE = {
  radius: {
    square: "0px",
    control: "4px",
    surface: "6px",
    image: "8px",
    pill: "999px",
  },
  rule: "1px",
  touchTarget: "44px",
} as const

export const BOLD_EDITORIAL_CSS_VARS = {
  "--ss-brand-ink": BOLD_EDITORIAL_COLORS.ink,
  "--ss-brand-carbon": BOLD_EDITORIAL_COLORS.carbon,
  "--ss-brand-chalk": BOLD_EDITORIAL_COLORS.chalk,
  "--ss-brand-paper": BOLD_EDITORIAL_COLORS.paper,
  "--ss-brand-concrete": BOLD_EDITORIAL_COLORS.concrete,
  "--ss-brand-silver": BOLD_EDITORIAL_COLORS.silver,
  "--ss-brand-slate": BOLD_EDITORIAL_COLORS.slate,
  "--ss-brand-oxblood": BOLD_EDITORIAL_COLORS.oxblood,
  "--ss-brand-error": BOLD_EDITORIAL_COLORS.error,
  "--ss-brand-success": BOLD_EDITORIAL_COLORS.success,
} as const

export const BOLD_EDITORIAL_GUARDRAILS = {
  method: ["TAKE", "CREATE", "EDIT", "POST"],
  prohibited: [
    "soft pastel brand palettes",
    "beige and gold luxury cues",
    "purple AI gradients",
    "generic floating SaaS cards",
    "decorative florals and sparkles",
    "excessive pills and glassmorphism",
  ],
} as const

export type BoldEditorialColorName = keyof typeof BOLD_EDITORIAL_COLORS
