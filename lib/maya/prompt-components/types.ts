/**
 * Prompt Component System Types
 * 
 * Core types for the Universal Prompts composition engine
 */

export type ComponentType = 
  | 'pose' 
  | 'outfit' 
  | 'location' 
  | 'lighting' 
  | 'camera' 
  | 'styling' 
  | 'brand_element'
  | 'hair'
  | 'makeup'
  | 'aesthetic'

export interface PromptComponent {
  id: string
  category: string
  type: ComponentType
  description: string
  promptText: string
  tags: string[]
  usageCount?: number // Track to avoid overuse
  brand?: string // Optional brand association
  metadata?: {
    poseType?: 'standing' | 'sitting' | 'kneeling' | 'walking' | 'yoga' | 'editorial' | 'casual' | 'dynamic'
    framing?: 'close-up' | 'medium' | 'full-body' | 'three-quarter'
    lightingType?: 'natural' | 'studio' | 'golden-hour' | 'ambient' | 'firelight' | 'window-light'
    locationType?: 'indoor' | 'outdoor' | 'studio' | 'transitional'
    outfitStyle?: 'casual' | 'athletic' | 'luxury' | 'editorial' | 'minimal'
  }
}

export interface ConceptComponents {
  pose: PromptComponent
  outfit: PromptComponent
  location: PromptComponent
  lighting: PromptComponent
  camera: PromptComponent
  styling?: PromptComponent
  brandElements?: PromptComponent[]
  hair?: PromptComponent
  makeup?: PromptComponent
  aesthetic?: PromptComponent
}

export interface RawPrompt {
  id: string
  title: string
  fullPrompt: string
  category: string
  brand?: string
}

export interface ComposedPrompt {
  prompt: string
  components: ConceptComponents
  title: string
  description: string
  category: string
  metadata?: {
    wordCount: number
    diversityScore: number
    brandElements?: string[]
  }
}

export interface SelectedComponents {
  pose: PromptComponent
  outfit: PromptComponent
  location: PromptComponent
  lighting: PromptComponent
  camera: PromptComponent
  brandElements: PromptComponent[]
  styling?: PromptComponent
  hair?: PromptComponent
  makeup?: PromptComponent
  aesthetic?: PromptComponent
}

export interface DiversityConstraints {
  minPoseDiversity: number // 0-1, how different poses must be
  minLocationDiversity: number // 0-1, how different locations must be
  minLightingDiversity: number // 0-1, how different lighting must be
  maxComponentReuse: number // Max times same component can appear in batch
  enforceOutfitVariation: boolean
  enforceFramingVariation: boolean
}

export interface QueryFilters {
  category?: string
  type?: ComponentType
  tags?: string[]
  exclude?: string[] // Component IDs to exclude
  poseType?: string
  locationType?: string
  lightingType?: string
  framingType?: string
  outfitStyle?: string
  brand?: string
}

export interface ComponentFilter {
  category?: string
  type?: ComponentType
  tags?: string[]
  brand?: string
  excludeIds?: string[]
  metadata?: Partial<PromptComponent['metadata']>
}
