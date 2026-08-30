/**
 * SSELFIE Design Tokens
 *
 * Compatibility primitives aligned to docs/SSELFIE_DESIGN_SYSTEM.md.
 *
 * SSELFIE Noir Glass is the only current visual direction. New visible work
 * should prefer the --ss-brand-* semantic CSS variables. These class bundles
 * remain for older Suite surfaces and must not be treated as a second design
 * system. Glass is limited to navigation, Maya controls, dialogs, result
 * overlays, and floating actions.
 */

import { SSELFIE_NOIR_GLASS_COLORS } from "@/lib/brand/bold-editorial-tokens"

const cardClass = [
  "stone-panel",
  "rounded-2xl",
  "sm:rounded-3xl",
  "p-4",
  "sm:p-6",
  "text-[color:var(--app-text-primary)]",
].join(" ")

const buttonPrimaryClass = [
  "bg-[color:var(--app-btn-primary-bg)]",
  "text-[color:var(--app-btn-primary-text)]",
  "rounded-lg",
  "border",
  "border-[color:var(--app-btn-primary-bg)]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-2px_0_rgba(0,0,0,0.35),0_8px_24px_rgba(10,10,10,0.18)]",
  "px-6",
  "sm:px-8",
  "py-3",
  "sm:py-4",
  "text-xs",
  "font-medium",
  "uppercase",
  "tracking-[0.12em]",
  "transition-colors",
  "duration-200",
  "hover:bg-[color:var(--stone-dark)]",
  "active:bg-[color:var(--color-obsidian)]",
].join(" ")

const containerClass = ["stone-shell-panel", "rounded-3xl", "sm:rounded-4xl"].join(" ")

export const COLORS = {
  obsidian: SSELFIE_NOIR_GLASS_COLORS.obsidian,
  graphite: SSELFIE_NOIR_GLASS_COLORS.graphite,
  surface: SSELFIE_NOIR_GLASS_COLORS.pearl,
  elevated: SSELFIE_NOIR_GLASS_COLORS.paper,
  porcelain: SSELFIE_NOIR_GLASS_COLORS.paper,
  pearl: SSELFIE_NOIR_GLASS_COLORS.pearl,
  coolMist: SSELFIE_NOIR_GLASS_COLORS.coolMist,
  whisper: SSELFIE_NOIR_GLASS_COLORS.silver,
  accent: SSELFIE_NOIR_GLASS_COLORS.pearlNeon,
  smoke: SSELFIE_NOIR_GLASS_COLORS.slate,
  stoneDark: SSELFIE_NOIR_GLASS_COLORS.graphite,
  stoneSoft: SSELFIE_NOIR_GLASS_COLORS.silver,
} as const

/** Restricted-material values; not a general-purpose card recipe. */
export const GLASS = {
  cardBg: "rgba(255,255,255,0.68)",
  cardBgStrong: "rgba(250,250,249,0.92)",
  cardBgSoft: "rgba(9,9,11,0.035)",
  overlayBg: "rgba(9,9,11,0.92)",
  cardBorder: "#D7D7DC",
  cardBorderSubtle: "rgba(9,9,11,0.10)",
  cardBorderStrong: "rgba(9,9,11,0.18)",
  blur: "28px",
  blurHeavy: "42px",
  radius: "16px",
} as const

export const TYPOGRAPHY = {
  display: {
    family: "'Cormorant Garamond', serif",
    weights: {
      light: 300,
      regular: 400,
    },
  },
  body: {
    family: "'Manrope', Inter, system-ui, -apple-system, sans-serif",
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
    },
  },
} as const

export const DesignTokens = {
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 8px 24px -12px rgb(10 10 10 / 0.16)",
    lg: "0 18px 48px -24px rgb(10 10 10 / 0.18)",
    xl: "0 24px 70px rgb(10 10 10 / 0.10)",
    "2xl": "0 36px 96px rgb(10 10 10 / 0.12)",
    inner: "inset 0 1px 0 rgb(255 255 255 / 0.72)",
  },
} as const

export const DesignClasses = {
  spacing: {
    padding: {
      xs: "p-2",
      sm: "p-3",
      md: "p-4 sm:p-6",
      lg: "p-6 sm:p-8",
      xl: "p-8 sm:p-12",
    },
    paddingX: {
      sm: "px-3 sm:px-4 md:px-6",
      md: "px-4 sm:px-6 md:px-8",
      lg: "px-6 sm:px-8 md:px-12",
    },
    gap: {
      xs: "gap-2",
      sm: "gap-3",
      md: "gap-3 sm:gap-4",
      lg: "gap-4 sm:gap-6",
    },
    marginBottom: {
      sm: "mb-3 sm:mb-4",
      md: "mb-4 sm:mb-6",
      lg: "mb-6 sm:mb-8",
    },
    spaceY: {
      sm: "space-y-3 sm:space-y-4",
      md: "space-y-4 sm:space-y-6",
      lg: "space-y-6 sm:space-y-8",
    },
  },

  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl sm:rounded-3xl",
    xl: "rounded-3xl sm:rounded-4xl",
    full: "rounded-full",
  },

  shadows: {
    card: "shadow-[0_24px_70px_rgba(10,10,10,0.10)]",
    cardHover: "hover:shadow-[0_28px_84px_rgba(10,10,10,0.14)]",
    button: "shadow-[0_10px_28px_rgba(10,10,10,0.14)]",
    buttonHover: "hover:shadow-[0_14px_34px_rgba(10,10,10,0.18)]",
    inner: "shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
    container: "shadow-[0_30px_90px_rgba(10,10,10,0.12)]",
  },

  background: {
    primary: "bg-[color:var(--app-bg)]",
    secondary: "bg-[color:var(--app-surface)]",
    tertiary: "bg-[color:var(--app-input-bg)]",
    overlay: "bg-[rgba(10,10,10,0.96)]",
    glass: "bg-[color:var(--app-bg-glass)]",
  },

  border: {
    light: "border-[color:var(--app-glass-border)]",
    medium: "border-[color:var(--app-border)]",
    strong: "border-[rgba(10,10,10,0.18)]",
    stone: "border-[color:var(--color-whisper)]",
  },

  text: {
    primary: "text-[color:var(--app-text-primary)]",
    secondary: "text-[color:var(--app-text-secondary)]",
    tertiary: "text-[color:var(--app-text-muted)]",
    muted: "text-[color:var(--app-text-muted)]",
  },

  typography: {
    heading: {
      small: "text-lg sm:text-xl font-serif font-light tracking-[0.15em] uppercase",
      medium: "text-2xl sm:text-3xl font-serif font-light tracking-[0.18em] uppercase",
      h1: "text-4xl sm:text-5xl md:text-6xl font-serif font-light tracking-[0.5em] uppercase",
      h2: "text-2xl sm:text-3xl md:text-4xl font-serif font-light tracking-[0.3em] uppercase",
      h3: "text-xl sm:text-2xl md:text-3xl font-serif font-light tracking-[0.2em] uppercase",
      h4: "text-lg sm:text-xl md:text-2xl font-serif font-light tracking-[0.15em] uppercase",
    },
    body: {
      large: "text-base sm:text-lg font-light",
      medium: "text-sm sm:text-base font-light",
      small: "text-xs sm:text-sm font-light",
      tiny: "text-[10px] sm:text-xs font-light",
      xsmall: "text-[11px] font-light",
    },
    label: {
      uppercase: "text-xs tracking-[0.15em] uppercase font-medium",
      normal: "text-sm font-medium",
      small: "text-[10px] tracking-[0.18em] uppercase font-medium",
      button: "text-xs tracking-[0.15em] uppercase font-medium",
    },
  },

  blur: {
    sm: "backdrop-blur-[20px]",
    md: "backdrop-blur-[50px]",
    lg: "backdrop-blur-[70px]",
  },

  card: cardClass,
  buttonPrimary: buttonPrimaryClass,
  container: containerClass,
} as const

export const ComponentClasses = {
  card: cardClass,
  cardHover: [cardClass, DesignClasses.shadows.cardHover, "transition-all duration-500"].join(" "),
  buttonPrimary: buttonPrimaryClass,
  container: containerClass,
} as const
