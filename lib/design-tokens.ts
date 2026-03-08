/**
 * SSELFIE Design Tokens
 *
 * Dark glass design primitives aligned to the current app chrome.
 */

const cardClass = [
  "bg-[color:var(--glass-bg)]",
  "backdrop-blur-[50px]",
  "border",
  "border-[color:var(--glass-border)]",
  "rounded-2xl",
  "sm:rounded-3xl",
  "p-4",
  "sm:p-6",
  "text-[color:var(--color-porcelain)]",
  "shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
].join(" ")

const buttonPrimaryClass = [
  "bg-[color:var(--color-whisper)]",
  "text-[color:var(--color-obsidian)]",
  "rounded-full",
  "border",
  "border-[color:var(--glass-border)]",
  "shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
  "px-6",
  "sm:px-8",
  "py-3",
  "sm:py-4",
  "text-xs",
  "font-medium",
  "uppercase",
  "tracking-[0.15em]",
  "transition-all",
  "duration-200",
  "hover:bg-[color:var(--color-porcelain)]",
  "hover:scale-[1.02]",
  "active:scale-[0.98]",
].join(" ")

const containerClass = [
  "bg-[color:var(--app-bg-glass)]",
  "backdrop-blur-[70px]",
  "border",
  "border-[color:var(--glass-border-subtle)]",
  "rounded-3xl",
  "sm:rounded-4xl",
  "shadow-[0_30px_120px_rgba(0,0,0,0.32)]",
].join(" ")

export const COLORS = {
  obsidian: "#0d0c0b",
  surface: "#1c1b19",
  elevated: "#2e2c29",
  porcelain: "#f0ede8",
  whisper: "#c8c4bb",
  accent: "#a8a49c",
  smoke: "#8a8780",
} as const

export const GLASS = {
  cardBg: "rgba(175,170,162,0.10)",
  cardBgStrong: "rgba(175,170,162,0.18)",
  cardBgSoft: "rgba(175,170,162,0.08)",
  overlayBg: "rgba(28,27,25,0.96)",
  cardBorder: "rgba(195,190,182,0.25)",
  cardBorderSubtle: "rgba(195,190,182,0.15)",
  cardBorderStrong: "rgba(195,190,182,0.40)",
  blur: "50px",
  blurHeavy: "70px",
  radius: "20px",
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
    family: "'Inter', system-ui, -apple-system, sans-serif",
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
    xl: "1.5rem",
    "2xl": "2rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.12)",
    lg: "0 10px 20px -6px rgb(0 0 0 / 0.18)",
    xl: "0 24px 80px rgb(0 0 0 / 0.28)",
    "2xl": "0 36px 120px rgb(0 0 0 / 0.32)",
    inner: "inset 0 1px 0 rgb(255 255 255 / 0.04)",
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
    card: "shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
    cardHover: "hover:shadow-[0_28px_96px_rgba(0,0,0,0.34)]",
    button: "shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
    buttonHover: "hover:shadow-[0_16px_40px_rgba(0,0,0,0.24)]",
    inner: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    container: "shadow-[0_30px_120px_rgba(0,0,0,0.32)]",
  },

  background: {
    primary: "bg-[color:var(--glass-bg)]",
    secondary: "bg-[color:var(--glass-bg-mid)]",
    tertiary: "bg-[color:var(--glass-input-bg)]",
    overlay: "bg-[rgba(28,27,25,0.96)]",
    glass: "bg-[color:var(--app-bg-glass)]",
  },

  border: {
    light: "border-[color:var(--glass-border-subtle)]",
    medium: "border-[color:var(--glass-border)]",
    strong: "border-[rgba(195,190,182,0.40)]",
    stone: "border-[color:var(--glass-divider)]",
  },

  text: {
    primary: "text-[color:var(--color-porcelain)]",
    secondary: "text-[color:var(--color-whisper)]",
    tertiary: "text-[color:var(--color-smoke)]",
    muted: "text-[color:var(--text-accent)]",
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
