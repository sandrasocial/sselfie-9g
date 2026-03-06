/**
 * Maya Pro Mode Design System
 * 
 * Earth Stone design tokens for Studio Pro Mode.
 * NO emojis in UI elements - professional, clean, minimal.
 *
 * Typography: Cormorant Garamond (display), Inter (body/UI/data)
 * Colors: dark stone glass palette
 * Style: editorial, quiet luxury, atmospheric
 */

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const Typography = {
  // Display headers
  headers: {
    fontFamily: "'Cormorant Garamond', serif",
    sizes: {
      xl: '32px',   // Main page headers
      lg: '24px',   // Section headers
      md: '20px',   // Card headers
      sm: '18px',   // Small headers
    },
    weights: {
      regular: 400,
      medium: 500,
    },
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },

  // Section subheaders
  subheaders: {
    fontFamily: "'Cormorant Garamond', serif",
    sizes: {
      lg: '18px',   // Concept card titles
      md: '16px',   // Section subheaders
      sm: '14px',   // Small subheaders
    },
    weights: {
      regular: 400,
      medium: 500,
    },
    lineHeight: 1.3,
    letterSpacing: '0.03em',
  },

  // Body text - Inter Light (readable, clean)
  body: {
    fontFamily: 'Inter, sans-serif',
    sizes: {
      lg: '16px',   // Large body text
      md: '14px',   // Standard body text
      sm: '12px',   // Small body text
    },
    weights: {
      light: 300,    // Inter Light
      regular: 400,  // Inter Regular
    },
    lineHeight: 1.6,
    letterSpacing: '0em',
  },

  // UI text - Inter Regular (clear labels, buttons)
  ui: {
    fontFamily: 'Inter, sans-serif',
    sizes: {
      md: '14px',   // Standard UI text
      sm: '12px',   // Small UI text
      xs: '11px',   // Extra small UI text
    },
    weights: {
      regular: 400,  // Inter Regular
      medium: 500,  // Inter Medium
    },
    lineHeight: 1.5,
    letterSpacing: '0.01em',
  },

  // Data/Numbers - Inter Medium (counts, statistics)
  data: {
    fontFamily: 'Inter, sans-serif',
    sizes: {
      md: '14px',   // Standard data
      sm: '12px',   // Small data
    },
    weights: {
      medium: 500,  // Inter Medium
      semibold: 600, // Inter SemiBold
    },
    lineHeight: 1.4,
    letterSpacing: '0.02em',
  },
} as const

// ============================================================================
// COLOR TOKENS (Earth Stone Dark Glass)
// ============================================================================

export const Colors = {
  // Primary colors
  primary: '#f0ede8',         // stone white - Primary text, headers
  secondary: '#a8a49c',       // limestone accent
  tertiary: '#8a8780',        // secondary text

  // Background colors
  background: '#0d0c0b',      // deepest stone
  backgroundAlt: '#1c1b19',   // dark granite
  surface: 'rgba(175,170,162,0.10)', // standard glass card

  // Accent colors
  accent: '#a8a49c',
  accentLight: '#c8c4bb',

  // Border colors
  border: 'rgba(195,190,182,0.25)',
  borderLight: 'rgba(195,190,182,0.15)',

  // Text colors
  textPrimary: '#f0ede8',
  textSecondary: '#a8a49c',
  textTertiary: '#8a8780',
  textMuted: 'rgba(240,237,232,0.55)',

  // Interactive colors
  hover: 'rgba(175,170,162,0.12)',
  active: 'rgba(175,170,162,0.20)',

  // Highlights (subtle, editorial)
  highlight: 'rgba(200,196,187,0.16)',
} as const

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const Spacing = {
  // Section spacing
  section: '24px',      // Space between major sections
  sectionLg: '32px',    // Large section spacing
  sectionSm: '16px',    // Small section spacing
  
  // Card spacing
  card: '16px',         // Padding inside cards
  cardLg: '24px',      // Large card padding
  cardSm: '12px',      // Small card padding
  
  // Element spacing
  element: '12px',      // Space between elements
  elementLg: '16px',    // Large element spacing
  elementSm: '8px',     // Small element spacing
  elementXs: '4px',     // Extra small element spacing
  
  // Component spacing
  component: '20px',    // Space between components
  componentLg: '28px',  // Large component spacing
  componentSm: '12px',  // Small component spacing
} as const

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export const BorderRadius = {
  card: '20px',         // Cards, concept cards
  cardSm: '12px',       // Small cards
  button: '9999px',     // Buttons
  buttonSm: '10px',     // Small buttons
  input: '12px',        // Input fields
  inputSm: '10px',      // Small inputs
  modal: '24px',        // Modals
  image: '10px',        // Image thumbnails
} as const

// ============================================================================
// LAYOUT PRINCIPLES
// ============================================================================

export const Layout = {
  whiteSpace: 'generous',              // Lots of breathing room
  dividers: {
    width: '1px',
    color: 'rgba(195,190,182,0.25)',
    style: 'solid',
  },
  shadows: {
    card: '0 12px 30px rgba(0, 0, 0, 0.30)',
    modal: '0 20px 48px rgba(0, 0, 0, 0.45)',
    hover: '0 16px 40px rgba(0, 0, 0, 0.40)',
  },
  borders: 'only when necessary',      // Minimal borders
  maxWidth: {
    content: '1200px',  // Max content width
    card: '400px',      // Max card width
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
  library: (total: number) => `Library • ${total} ${total === 1 ? 'image' : 'images'}`,
  libraryEmpty: 'Library • No images',
  
  // Concept card labels
  imagesLinked: (count: number) => `Images Linked • ${count}`,
  category: (name: string) => `Category • ${name}`,
  aesthetic: (name: string) => `Aesthetic • ${name}`,
  
  // Session labels
  conceptsGenerated: (count: number) => `Concepts • ${count}`,
  imagesGenerated: (count: number) => `Images • ${count}`,
  
  // Status labels
  required: 'Required',
  optional: 'Optional',
  currentIntent: 'Current Intent',
  
  // Empty states
  noImages: 'No images',
  noConcepts: 'No concepts yet',
  noLibrary: 'Library empty',
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
  beginSetup: 'Begin Setup',
  continue: 'Continue',
  next: 'Next',
  back: 'Back',
  skip: 'Skip',
  
  // Image management
  addImages: 'Add Images',
  chooseFromGallery: 'Choose from Gallery',
  uploadNew: 'Upload New',
  manage: 'Manage',
  remove: 'Remove',
  clear: 'Clear',
  
  // Creation actions
  generate: 'Generate',
  startCreating: 'Start Creating',
  createConcepts: 'Create Concepts',
  viewPrompt: 'View Prompt',
  generateImage: 'Generate Image',
  
  // Library actions
  startFresh: 'Start Fresh Project',
  updateLibrary: 'Update Library',
  saveLibrary: 'Save Library',
  
  // Navigation
  close: 'Close',
  cancel: 'Cancel',
  confirm: 'Confirm',
  done: 'Done',
  
  // Modals
  openLibrary: 'Open Library',
  editIntent: 'Edit Intent',
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
export function getTypographyClasses(variant: 'header' | 'subheader' | 'body' | 'ui' | 'data', size: string) {
  const base = {
    header: 'font-serif',
    subheader: 'font-serif',
    body: 'font-sans',
    ui: 'font-sans',
    data: 'font-sans',
  }[variant]
  
  return `${base} text-${size}`
}

/**
 * Get color class names for Tailwind CSS
 */
export function getColorClasses(type: 'text' | 'bg' | 'border', color: string) {
  // Map to Tailwind classes if using Tailwind
  // Otherwise return inline styles
  return `${type}-[${color}]`
}

// Export all for convenience
