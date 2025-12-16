/**
 * Core types for prompt template system
 */

export interface ImageReference {
  url: string
  type: 'user_lora' | 'gallery' | 'product' | 'inspiration'
  description?: string
}

export type NanoBananaCapability = 
  | 'text_rendering'
  | 'multi_image'
  | 'real_time_data'
  | 'transformations'
  | 'educational'

export interface BrandProfile {
  primaryColor?: string      // e.g., "#1A2332"
  secondaryColor?: string    // e.g., "#C9A96E"
  accentColor?: string       // e.g., "#E8DFD0"
  backgroundColor?: string   // e.g., "#FFFFFF"
  fontStyle?: 'modern' | 'elegant' | 'bold' | 'minimal'
  brandName?: string
  tagline?: string
  aestheticStyle?: 'luxury' | 'minimalist' | 'bold' | 'organic' | 'corporate'
}

export interface PromptContext {
  userImages: ImageReference[]
  contentType: string
  userIntent: string
  selectedCapabilities?: NanoBananaCapability[]
  slideNumber?: number
  brandAesthetic?: string
  colorPalette?: string[]
  brandProfile?: BrandProfile  // NEW: User's brand context
  totalSlides?: number
}

export interface PromptVariation {
  name: string
  moodAdjustment?: string
  lightingAdjustment?: string
  styleKeywords?: string
  environmentFocus?: string
  actionChange?: string
  layout?: string
  style?: string
  timing?: string
  expression?: string
  gesture?: string
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  useCases: string[]
  requiredImages: {
    min: number
    max: number
    types: ('user_lora' | 'gallery' | 'product' | 'inspiration')[]
  }
  promptStructure: (context: PromptContext) => string
  variations?: PromptVariation[]
}



