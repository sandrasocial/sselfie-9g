/**
 * SSELFIE Design Tokens (Earth Stone)
 *
 * Single in-app source of truth for palette, glass, typography, and utility classes.
 */

export const COLORS = {
  obsidian: "#0d0c0b",
  porcelain: "#f0ede8",
  pearl: "#2e2c29",
  smoke: "#8a8780",
  whisper: "#1c1b19",
} as const

export const GLASS = {
  cardBg: "rgba(175,170,162,0.10)",
  cardBorder: "rgba(195,190,182,0.25)",
  inputBg: "rgba(175,170,162,0.08)",
  inputBorder: "rgba(195,190,182,0.20)",
  blur: "50px",
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
    sm: "0 1px 2px rgb(0 0 0 / 0.2)",
    md: "0 6px 18px rgb(0 0 0 / 0.28)",
    lg: "0 12px 30px rgb(0 0 0 / 0.36)",
    xl: "0 20px 45px rgb(0 0 0 / 0.45)",
    "2xl": "0 30px 60px rgb(0 0 0 / 0.55)",
    inner: "inset 0 1px 0 rgb(240 237 232 / 0.06)",
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
    card: "shadow-[0_12px_30px_rgba(0,0,0,0.30)]",
    cardHover: "hover:shadow-[0_18px_40px_rgba(0,0,0,0.40)]",
    button: "shadow-[0_8px_22px_rgba(0,0,0,0.30)]",
    buttonHover: "hover:shadow-[0_12px_30px_rgba(0,0,0,0.40)]",
    inner: "shadow-inner shadow-black/25",
    container: "shadow-[0_22px_52px_rgba(0,0,0,0.45)]",
  },
  background: {
    primary: "bg-[rgba(175,170,162,0.10)]",
    secondary: "bg-[rgba(175,170,162,0.14)]",
    tertiary: "bg-[rgba(175,170,162,0.18)]",
    overlay: "bg-[rgba(28,27,25,0.96)]",
    glass: "bg-[rgba(175,170,162,0.10)]",
  },
  border: {
    light: "border-[rgba(195,190,182,0.15)]",
    medium: "border-[rgba(195,190,182,0.25)]",
    strong: "border-[rgba(195,190,182,0.35)]",
    stone: "border-[rgba(195,190,182,0.20)]",
  },
  text: {
    primary: "text-[#f0ede8]",
    secondary: "text-[#a8a49c]",
    tertiary: "text-[#8a8780]",
    muted: "text-[rgba(240,237,232,0.55)]",
  },
  typography: {
    heading: {
      h1: "text-4xl sm:text-5xl md:text-6xl font-['Cormorant_Garamond'] font-light tracking-wide",
      h2: "text-2xl sm:text-3xl md:text-4xl font-['Cormorant_Garamond'] font-light tracking-wide",
      h3: "text-xl sm:text-2xl md:text-3xl font-['Cormorant_Garamond'] font-light tracking-wide",
      h4: "text-lg sm:text-xl md:text-2xl font-['Cormorant_Garamond'] font-light tracking-[0.18em] uppercase",
    },
    body: {
      large: "text-base sm:text-lg font-light",
      medium: "text-sm sm:text-base font-light",
      small: "text-xs sm:text-sm font-light",
      tiny: "text-[10px] sm:text-xs font-light",
    },
    label: {
      uppercase: "text-xs tracking-[0.18em] uppercase font-medium",
      normal: "text-sm font-medium",
    },
  },
  blur: {
    sm: "backdrop-blur-[20px]",
    md: "backdrop-blur-[50px]",
    lg: "backdrop-blur-[60px]",
  },
} as const

export const ComponentClasses = {
  card: [
    DesignClasses.background.primary,
    DesignClasses.blur.md,
    DesignClasses.border.medium,
    DesignClasses.radius.lg,
    DesignClasses.spacing.padding.md,
    DesignClasses.shadows.card,
  ].join(" "),
  cardHover: [
    DesignClasses.background.primary,
    DesignClasses.blur.md,
    DesignClasses.border.medium,
    DesignClasses.radius.lg,
    DesignClasses.spacing.padding.md,
    DesignClasses.shadows.card,
    DesignClasses.shadows.cardHover,
    "transition-all duration-300",
  ].join(" "),
  buttonPrimary: [
    "bg-[#c8c4bb]",
    "text-[#0d0c0b]",
    "rounded-full",
    DesignClasses.shadows.button,
    "px-6 sm:px-8",
    "py-3 sm:py-4",
    "text-xs sm:text-sm",
    "font-medium",
    "uppercase",
    "tracking-[0.2em]",
    "hover:bg-[#f0ede8]",
    "transition-colors duration-200",
  ].join(" "),
  container: [
    DesignClasses.background.glass,
    DesignClasses.blur.lg,
    DesignClasses.radius.xl,
    DesignClasses.border.light,
    DesignClasses.shadows.container,
  ].join(" "),
} as const
