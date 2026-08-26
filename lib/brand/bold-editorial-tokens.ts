export const BOLD_EDITORIAL_COLORS = {
  ink: "#0D0E10",
  carbon: "#211E1B",
  espresso: "#342A24",
  chalk: "#F5F2ED",
  ivory: "#F5F2ED",
  paper: "#FFFFFF",
  concrete: "#E6DFD5",
  parchment: "#E6DFD5",
  silver: "#C9BDAF",
  taupe: "#A89B8C",
  slate: "#665E56",
  champagne: "#D7B67E",
  champagneInk: "#6E5639",
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
} as const

export const BOLD_EDITORIAL_GUARDRAILS = {
  method: ["TAKE", "CREATE", "EDIT", "POST"],
  prohibited: [
    "soft pastel brand palettes",
    "purple AI gradients",
    "generic floating SaaS cards",
    "decorative florals and uncontrolled sparkle effects",
    "excessive pills and glassmorphism",
    "neon on body copy or ordinary controls",
  ],
} as const

export type BoldEditorialColorName = keyof typeof BOLD_EDITORIAL_COLORS
