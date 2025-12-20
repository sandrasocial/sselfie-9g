/**
 * Maya Pro Mode Design System
 * 
 * Sophisticated, editorial-quality design tokens for Studio Pro Mode.
 * NO emojis in UI elements - professional, clean, minimal.
 * 
 * Typography: Canela (headers), Hatton (subheaders), Inter (body/UI/data)
 * Colors: Stone palette with warm cream background
 * Style: Editorial, luxury, creative studio feel
 */

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const Typography = {
  // Headers - Canela serif (e.g., "Studio Pro Mode")
  headers: {
    fontFamily: 'Canela, serif',
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

  // Subheaders - Hatton serif (e.g., "Morning Ritual Glow")
  subheaders: {
    fontFamily: 'Hatton, serif',
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
    letterSpacing: '0.01em',
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
// COLOR TOKENS (Stone Palette with Warm Cream)
// ============================================================================

export const Colors = {
  // Primary colors
  primary: '#1C1917',        // stone-900 - Primary text, headers
  secondary: '#57534E',       // stone-600 - Secondary text, descriptions
  tertiary: '#78716C',       // stone-500 - Tertiary text
  
  // Background colors
  background: '#F5F1ED',     // warm cream - Main backgrounds
  backgroundAlt: '#FAFAF9',  // stone-50 - Alternate backgrounds
  surface: '#FFFFFF',        // white - Cards, modals
  
  // Accent colors
  accent: '#292524',         // stone-800 - Accents, hover states
  accentLight: '#44403C',    // stone-700 - Light accents
  
  // Border colors
  border: 'rgba(231, 229, 228, 0.6)',  // stone-200/60 - Borders, dividers
  borderLight: 'rgba(231, 229, 228, 0.3)', // stone-200/30 - Subtle borders
  
  // Text colors
  textPrimary: '#1C1917',    // stone-900 - Primary text
  textSecondary: '#57534E',  // stone-600 - Secondary text
  textTertiary: '#78716C',   // stone-500 - Tertiary text
  textMuted: '#A8A29E',      // stone-400 - Muted text
  
  // Interactive colors
  hover: 'rgba(28, 25, 23, 0.05)',  // stone-900/5 - Hover backgrounds
  active: 'rgba(28, 25, 23, 0.1)',  // stone-900/10 - Active states
  
  // Highlights (subtle, editorial)
  highlight: 'rgba(250, 240, 230, 0.5)', // Champagne undertones
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
  card: '12px',         // Cards, concept cards
  cardSm: '8px',        // Small cards
  button: '8px',        // Buttons
  buttonSm: '6px',      // Small buttons
  input: '8px',         // Input fields
  inputSm: '6px',       // Small inputs
  modal: '16px',        // Modals
  image: '8px',         // Image thumbnails
} as const

// ============================================================================
// LAYOUT PRINCIPLES
// ============================================================================

export const Layout = {
  whiteSpace: 'generous',              // Lots of breathing room
  dividers: {
    width: '1px',
    color: 'rgba(231, 229, 228, 0.6)', // stone-200/60
    style: 'solid',
  },
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.05)',  // Barely visible
    modal: '0 4px 12px rgba(0, 0, 0, 0.08)', // Subtle modal shadow
    hover: '0 2px 6px rgba(0, 0, 0, 0.06)',  // Hover state
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
    header: 'font-serif',      // Canela
    subheader: 'font-serif',   // Hatton
    body: 'font-sans',         // Inter
    ui: 'font-sans',           // Inter
    data: 'font-sans',         // Inter
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
export default ProModeDesign
