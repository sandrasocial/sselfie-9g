/**
 * Maya Pro Mode compatibility tokens.
 *
 * These values inherit the approved SSELFIE Noir Glass direction in
 * docs/SSELFIE_DESIGN_SYSTEM.md. This file is not a separate Maya brand or a
 * second design authority.
 * NO emojis in UI elements - professional, clean, minimal.
 *
 * Typography: Cormorant Garamond (display), Manrope (body/UI/data)
 * Colors: obsidian, graphite, pearl, silver, and restricted pearl light
 * Style: photo-first, high-contrast, editorial, controlled glass
 */

import { SSELFIE_NOIR_GLASS_COLORS } from "@/lib/brand/bold-editorial-tokens"

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const Typography = {
  // Display headers
  headers: {
    fontFamily: "'Cormorant Garamond', serif",
    sizes: {
      xl: "32px", // Main page headers
      lg: "24px", // Section headers
      md: "20px", // Card headers
      sm: "18px", // Small headers
    },
    weights: {
      regular: 400,
      medium: 500,
    },
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },

  // Section subheaders
  subheaders: {
    fontFamily: "'Cormorant Garamond', serif",
    sizes: {
      lg: "18px", // Concept card titles
      md: "16px", // Section subheaders
      sm: "14px", // Small subheaders
    },
    weights: {
      regular: 400,
      medium: 500,
    },
    lineHeight: 1.3,
    letterSpacing: "0.03em",
  },

  // Body text - Manrope (readable, clean)
  body: {
    fontFamily: "Manrope, Inter, sans-serif",
    sizes: {
      lg: "16px", // Large body text
      md: "14px", // Standard body text
      sm: "12px", // Small body text
    },
    weights: {
      light: 300,
      regular: 400,
    },
    lineHeight: 1.6,
    letterSpacing: "0em",
  },

  // UI text - Manrope (clear labels, buttons)
  ui: {
    fontFamily: "Manrope, Inter, sans-serif",
    sizes: {
      md: "14px", // Standard UI text
      sm: "12px", // Small UI text
      xs: "11px", // Extra small UI text
    },
    weights: {
      regular: 400,
      medium: 500,
    },
    lineHeight: 1.5,
    letterSpacing: "0.01em",
  },

  // Data/Numbers - Manrope Medium (counts, statistics)
  data: {
    fontFamily: "Manrope, Inter, sans-serif",
    sizes: {
      md: "14px", // Standard data
      sm: "12px", // Small data
    },
    weights: {
      medium: 500,
      semibold: 600,
    },
    lineHeight: 1.4,
    letterSpacing: "0.02em",
  },
} as const

// ============================================================================
// COLOR TOKENS (SSELFIE Noir Glass)
// ============================================================================

export const Colors = {
  // Primary colors
  primary: SSELFIE_NOIR_GLASS_COLORS.pearl,
  secondary: SSELFIE_NOIR_GLASS_COLORS.silver,
  tertiary: SSELFIE_NOIR_GLASS_COLORS.steel,

  // Background colors
  background: SSELFIE_NOIR_GLASS_COLORS.obsidian,
  backgroundAlt: SSELFIE_NOIR_GLASS_COLORS.graphite,
  surface: "rgba(255,255,255,0.08)",

  // Accent colors: pearl light is restricted to selection and signature moments.
  accent: SSELFIE_NOIR_GLASS_COLORS.pearlNeon,
  accentLight: SSELFIE_NOIR_GLASS_COLORS.pearl,

  // Border colors
  border: "rgba(255,255,255,0.34)",
  borderLight: "rgba(255,255,255,0.18)",

  // Text colors
  textPrimary: SSELFIE_NOIR_GLASS_COLORS.pearl,
  textSecondary: SSELFIE_NOIR_GLASS_COLORS.silver,
  textTertiary: SSELFIE_NOIR_GLASS_COLORS.steel,
  textMuted: "rgba(250,250,249,0.58)",

  // Interactive colors
  hover: "rgba(255,255,255,0.10)",
  active: "rgba(243,230,207,0.18)",

  // Highlights (selection and focus only)
  highlight: "rgba(243,230,207,0.20)",
} as const

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const Spacing = {
  // Section spacing
  section: "24px", // Space between major sections
  sectionLg: "32px", // Large section spacing
  sectionSm: "16px", // Small section spacing

  // Card spacing
  card: "16px", // Padding inside cards
  cardLg: "24px", // Large card padding
  cardSm: "12px", // Small card padding

  // Element spacing
  element: "12px", // Space between elements
  elementLg: "16px", // Large element spacing
  elementSm: "8px", // Small element spacing
  elementXs: "4px", // Extra small element spacing

  // Component spacing
  component: "20px", // Space between components
  componentLg: "28px", // Large component spacing
  componentSm: "12px", // Small component spacing
} as const

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export const BorderRadius = {
  card: "16px", // Restrained product surfaces
  cardSm: "12px", // Small cards
  button: "12px", // Primary controls
  buttonSm: "10px", // Small buttons
  input: "12px", // Input fields
  inputSm: "10px", // Small inputs
  modal: "20px", // Floating glass dialogs
  image: "18px", // Image thumbnails
} as const

// ============================================================================
// LAYOUT PRINCIPLES
// ============================================================================

export const Layout = {
  whiteSpace: "generous", // Lots of breathing room
  dividers: {
    width: "1px",
    color: "rgba(255,255,255,0.24)",
    style: "solid",
  },
  shadows: {
    card: "0 12px 30px rgba(0, 0, 0, 0.30)",
    modal: "0 20px 48px rgba(0, 0, 0, 0.45)",
    hover: "0 16px 40px rgba(0, 0, 0, 0.40)",
  },
  borders: "only when necessary", // Minimal borders
  maxWidth: {
    content: "1200px", // Max content width
    card: "400px", // Max card width
  },
} as const

// ============================================================================
// UI LABELS (NO EMOJIS - Professional format)
// ============================================================================

/**
 * UI Labels for displaying counts and information.
 * Format: "Category • Count" (e.g., "Selfies • 3")
 * NO emojis - clean, professional, editorial.
 */
export const UILabels = {
  // Image library labels
  selfies: (count: number) => `Selfies • ${count}`,
  products: (count: number) => `Products • ${count}`,
  people: (count: number) => `People • ${count}`,
  vibes: (count: number) => `Vibes • ${count}`,

  // Library summary
  library: (total: number) => `Library • ${total} ${total === 1 ? "image" : "images"}`,
  libraryEmpty: "Library • No images",

  // Concept card labels
  imagesLinked: (count: number) => `Images Linked • ${count}`,
  category: (name: string) => `Category • ${name}`,
  aesthetic: (name: string) => `Aesthetic • ${name}`,

  // Session labels
  conceptsGenerated: (count: number) => `Concepts • ${count}`,
  imagesGenerated: (count: number) => `Images • ${count}`,

  // Status labels
  required: "Required",
  optional: "Optional",
  currentIntent: "Current Intent",

  // Empty states
  noImages: "No images",
  noConcepts: "No concepts yet",
  noLibrary: "Library empty",
} as const

// ============================================================================
// BUTTON LABELS (NO EMOJIS - Professional text)
// ============================================================================

/**
 * Button labels for all Pro Mode actions.
 * NO emojis - clean, professional, action-oriented.
 */
export const ButtonLabels = {
  // Setup flow
  beginSetup: "Begin Setup",
  continue: "Continue",
  next: "Next",
  back: "Back",
  skip: "Skip",

  // Image management
  addImages: "Add Images",
  chooseFromGallery: "Choose from Gallery",
  uploadNew: "Upload New",
  manage: "Manage",
  remove: "Remove",
  clear: "Clear",

  // Creation actions
  generate: "Generate",
  startCreating: "Start Creating",
  createConcepts: "Create Concepts",
  viewPrompt: "View Prompt",
  generateImage: "Generate Image",

  // Library actions
  startFresh: "Start Fresh Project",
  updateLibrary: "Update Library",
  saveLibrary: "Save Library",

  // Navigation
  close: "Close",
  cancel: "Cancel",
  confirm: "Confirm",
  done: "Done",

  // Modals
  openLibrary: "Open Library",
  editIntent: "Edit Intent",
} as const

// ============================================================================
// MAIN DESIGN SYSTEM EXPORT
// ============================================================================

export const ProModeDesign = {
  typography: Typography,
  colors: Colors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  layout: Layout,
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get typography class names for Tailwind CSS
 * (For use with custom font loading)
 */
export function getTypographyClasses(
  variant: "header" | "subheader" | "body" | "ui" | "data",
  size: string
) {
  const base = {
    header: "font-serif",
    subheader: "font-serif",
    body: "font-sans",
    ui: "font-sans",
    data: "font-sans",
  }[variant]

  return `${base} text-${size}`
}

/**
 * Get color class names for Tailwind CSS
 */
export function getColorClasses(type: "text" | "bg" | "border", color: string) {
  // Map to Tailwind classes if using Tailwind
  // Otherwise return inline styles
  return `${type}-[${color}]`
}

// Export all for convenience
