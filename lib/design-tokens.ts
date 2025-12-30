/**
 * SSELFIE Design Tokens
 * 
 * Centralized design system constants for consistent styling across the app.
 * These tokens define spacing, colors, typography, shadows, and other visual properties.
 * 
 * Usage:
 *   import { DesignTokens } from '@/lib/design-tokens'
 *   className={`${DesignTokens.spacing.md} ${DesignTokens.colors.background.primary}`}
 */

export const DesignTokens = {
  /**
   * Spacing Scale (4px base unit)
   * Used for padding, margin, gap, and space-y values
   */
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },

  /**
   * Border Radius
   * Standardized rounded corners for consistent visual language
   */
  radius: {
    sm: '0.5rem',    // rounded-lg
    md: '0.75rem',   // rounded-xl
    lg: '1rem',      // rounded-2xl
    xl: '1.5rem',    // rounded-3xl
    '2xl': '2rem',   // rounded-4xl
    full: '9999px',  // rounded-full
  },

  /**
   * Shadow Definitions
   * Standardized shadow patterns for depth and hierarchy
   */
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    stone: {
      sm: '0 1px 2px 0 rgb(10 10 10 / 0.05)',
      md: '0 4px 6px -1px rgb(10 10 10 / 0.1)',
      lg: '0 10px 15px -3px rgb(10 10 10 / 0.1)',
      xl: '0 20px 25px -5px rgb(10 10 10 / 0.1)',
    },
  },
} as const

/**
 * Tailwind Class Mappings
 * 
 * These are the actual Tailwind classes to use in components.
 * The tokens above are for reference/documentation.
 */
export const DesignClasses = {
  /**
   * Spacing Classes
   * Use these Tailwind classes directly in components
   */
  spacing: {
    // Padding
    padding: {
      xs: 'p-2',           // 8px
      sm: 'p-3',          // 12px
      md: 'p-4 sm:p-6',   // 16px/24px
      lg: 'p-6 sm:p-8',   // 24px/32px
      xl: 'p-8 sm:p-12',  // 32px/48px
    },
    // Horizontal Padding (for containers)
    paddingX: {
      sm: 'px-3 sm:px-4 md:px-6',  // 12px/16px/24px
      md: 'px-4 sm:px-6 md:px-8',  // 16px/24px/32px
      lg: 'px-6 sm:px-8 md:px-12', // 24px/32px/48px
    },
    // Gap
    gap: {
      xs: 'gap-2',         // 8px
      sm: 'gap-3',         // 12px
      md: 'gap-3 sm:gap-4', // 12px/16px
      lg: 'gap-4 sm:gap-6', // 16px/24px
    },
    // Margin Bottom
    marginBottom: {
      sm: 'mb-3 sm:mb-4',  // 12px/16px
      md: 'mb-4 sm:mb-6',  // 16px/24px
      lg: 'mb-6 sm:mb-8',  // 24px/32px
    },
    // Space Y
    spaceY: {
      sm: 'space-y-3 sm:space-y-4', // 12px/16px
      md: 'space-y-4 sm:space-y-6', // 16px/24px
      lg: 'space-y-6 sm:space-y-8',  // 24px/32px
    },
  },

  /**
   * Border Radius Classes
   */
  radius: {
    sm: 'rounded-lg',                    // 0.5rem - buttons, small cards
    md: 'rounded-xl',                    // 0.75rem - medium cards
    lg: 'rounded-2xl sm:rounded-3xl',    // 1rem/1.5rem - main cards
    xl: 'rounded-3xl sm:rounded-4xl',    // 1.5rem/2rem - containers
    full: 'rounded-full',                 // circles
  },

  /**
   * Shadow Classes
   */
  shadows: {
    // Cards
    card: 'shadow-xl shadow-stone-900/5',
    cardHover: 'hover:shadow-2xl hover:shadow-stone-900/10',
    // Buttons
    button: 'shadow-lg shadow-stone-900/20',
    buttonHover: 'hover:shadow-xl hover:shadow-stone-900/30',
    // Inner
    inner: 'shadow-inner shadow-stone-900/5',
    // Container
    container: 'shadow-2xl shadow-stone-900/10',
  },

  /**
   * Background Colors
   */
  background: {
    primary: 'bg-white/50',      // Main cards
    secondary: 'bg-white/60',    // Secondary cards
    tertiary: 'bg-white/70',     // Tertiary elements
    overlay: 'bg-white/95',      // Overlays, dropdowns
    glass: 'bg-white/30',        // Glass effect base
  },

  /**
   * Border Colors
   */
  border: {
    light: 'border-white/40',    // Subtle borders
    medium: 'border-white/60',   // Standard borders
    strong: 'border-white/80',   // Strong borders
    stone: 'border-stone-200/40', // Stone borders
  },

  /**
   * Text Colors
   */
  text: {
    primary: 'text-stone-950',   // Main text
    secondary: 'text-stone-600',  // Secondary text
    tertiary: 'text-stone-500',   // Tertiary text
    muted: 'text-stone-400',      // Muted text
  },

  /**
   * Typography Classes
   */
  typography: {
    heading: {
      h1: 'text-4xl sm:text-5xl md:text-6xl font-serif font-extralight tracking-[0.5em] uppercase',
      h2: 'text-2xl sm:text-3xl md:text-4xl font-serif font-extralight tracking-[0.3em] uppercase',
      h3: 'text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] uppercase',
      h4: 'text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] uppercase',
    },
    body: {
      large: 'text-base sm:text-lg font-light',
      medium: 'text-sm sm:text-base font-light',
      small: 'text-xs sm:text-sm font-light',
      tiny: 'text-[10px] sm:text-xs font-light',
    },
    label: {
      uppercase: 'text-xs tracking-[0.15em] uppercase font-light',
      normal: 'text-sm font-medium',
    },
  },

  /**
   * Backdrop Blur Classes
   */
  blur: {
    sm: 'backdrop-blur-xl',   // 24px - subtle effects
    md: 'backdrop-blur-2xl',  // 40px - cards
    lg: 'backdrop-blur-3xl',  // 64px - main containers
  },
} as const

/**
 * Component-Specific Class Combinations
 * 
 * Pre-composed class strings for common component patterns
 */
export const ComponentClasses = {
  /**
   * Card Component
   */
  card: [
    DesignClasses.background.primary,
    DesignClasses.blur.lg,
    DesignClasses.border.medium,
    DesignClasses.radius.lg,
    DesignClasses.spacing.padding.md,
    DesignClasses.shadows.card,
  ].join(' '),

  /**
   * Card with Hover Effect
   */
  cardHover: [
    DesignClasses.background.primary,
    DesignClasses.blur.lg,
    DesignClasses.border.medium,
    DesignClasses.radius.lg,
    DesignClasses.spacing.padding.md,
    DesignClasses.shadows.card,
    DesignClasses.shadows.cardHover,
    'transition-all duration-500',
  ].join(' '),

  /**
   * Button Primary
   */
  buttonPrimary: [
    'bg-stone-950',
    'text-stone-50',
    DesignClasses.radius.lg.split(' ')[0], // Use first radius value
    DesignClasses.shadows.button,
    'px-6 sm:px-8',
    'py-3 sm:py-4',
    'text-sm',
    'font-medium',
    'uppercase',
    'tracking-wider',
    'hover:bg-stone-800',
    'transition-all',
    'duration-200',
    'hover:scale-105',
    'active:scale-95',
  ].join(' '),

  /**
   * Container (Main App)
   */
  container: [
    DesignClasses.background.glass,
    DesignClasses.blur.lg,
    DesignClasses.radius.xl,
    DesignClasses.border.light,
    DesignClasses.shadows.container,
  ].join(' '),
} as const

