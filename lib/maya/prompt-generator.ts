/**
 * Intelligent Prompt Generator for NanoBanana Pro
 * Analyzes workbench context and generates optimized prompts
 */

// Template system removed - this file is deprecated
// All template imports removed as part of Phase 5 consolidation
// TODO: This file should be refactored or removed if not actively used

// Placeholder types for backward compatibility
type PromptTemplate = any
type PromptContext = any
type ImageReference = any

const CAROUSEL_TEMPLATES: Record<string, PromptTemplate> = {}
const UGC_TEMPLATES: Record<string, PromptTemplate> = {}
const PRODUCT_MOCKUP_TEMPLATES: Record<string, PromptTemplate> = {}
const BRAND_PARTNERSHIP_TEMPLATES: Record<string, PromptTemplate> = {}
const REEL_COVER_TEMPLATES: Record<string, PromptTemplate> = {}

// BrandProfile type definition (replaces deleted prompt-templates/types import)
export interface BrandProfile {
  brandName?: string
  brandValues?: string[]
  targetAudience?: string
  aesthetic?: string
  colorPalette?: string[]
  [key: string]: any // Allow additional properties
}

export interface WorkbenchContext {
  images: WorkbenchImage[]
  userIntent: string // From Maya chat analysis
  contentType: ContentType
  previousPrompts?: string[] // For learning
  userPreferences?: UserPreferences
  brandProfile?: BrandProfile // User's brand context
}

export interface WorkbenchImage {
  id: string
  type: 'user_lora' | 'gallery' | 'product' | 'inspiration'
  url: string
  analysis?: ImageAnalysis // From vision model
  position: number // 0-3 (which box)
}

export interface ImageAnalysis {
  description: string
  dominantColors: string[]
  style: string
  mood: string
  containsPerson: boolean
  containsProduct: boolean
  suggestedUse: string
}

export interface UserPreferences {
  style?: string
  colorPalette?: string[]
  mood?: string
  brandAesthetic?: string
}

export type ContentType = 
  | 'carousel_cover'
  | 'carousel_content'
  | 'carousel_infographic'
  | 'ugc_morning_routine'
  | 'ugc_coffee_shop'
  | 'ugc_unboxing'
  | 'product_lifestyle'
  | 'product_flatlay'
  | 'product_on_person'
  | 'brand_skincare'
  | 'brand_fashion'
  | 'brand_tech'
  | 'reel_educational'
  | 'reel_transformation'
  | 'reel_lifestyle'
  | 'reel_tutorial'
  | 'custom'

export type NanoBananaCapability = 
  | 'text_rendering'
  | 'real_time_data'
  | 'multi_image_composition'
  | 'professional_controls'
  | 'educational_excellence'
  | 'character_consistency'
  | 'multilingual'

export interface PromptSuggestion {
  id: string
  templateId: string
  name: string
  description: string
  prompt: string
  variation: string
  nanoBananaCapabilities: NanoBananaCapability[]
  useCases: string[]
  confidence: number
}

/**
 * Main intelligence engine: Analyzes context and generates prompt suggestions
 */
export class PromptGenerator {
  
  /**
   * Analyzes workbench context and returns prompt suggestions
   */
  async generatePromptSuggestions(context: WorkbenchContext): Promise<PromptSuggestion[]> {
    
    // Step 1: Analyze images to understand what user has
    const imageAnalysis = await this.analyzeWorkbenchImages(context.images)
    
    // Step 2: Determine content type from user intent + images
    const contentTypes = this.determineContentTypes(context.userIntent, imageAnalysis)
    
    // Step 3: Select appropriate templates
    const templates = this.selectTemplates(contentTypes, imageAnalysis)
    
    // Step 4: Generate prompts from templates
    const suggestions = await this.generateFromTemplates(templates, {
      ...context,
      imageAnalysis
    })
    
    // Step 5: Rank suggestions by relevance and NanoBanana Pro capability match
    const rankedSuggestions = this.rankSuggestions(suggestions, context)
    
    return rankedSuggestions
  }
  
  /**
   * Analyzes workbench images using vision model
   */
  private async analyzeWorkbenchImages(images: WorkbenchImage[]): Promise<Map<number, ImageAnalysis>> {
    const analyses = new Map<number, ImageAnalysis>()
    
    for (const image of images) {
      if (image.analysis) {
        analyses.set(image.position, image.analysis)
        continue
      }
      
      // Call vision model to analyze image
      const analysis = await this.visionAnalyze(image.url)
      analyses.set(image.position, analysis)
    }
    
    return analyses
  }
  
  /**
   * Uses Claude vision to analyze image
   */
  private async visionAnalyze(imageUrl: string): Promise<ImageAnalysis> {
    try {
      const response = await fetch('/api/maya/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl })
      })
      
      if (!response.ok) {
        throw new Error(`Vision analysis failed: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      // Fallback analysis if vision API fails
      console.warn('Vision analysis failed, using fallback:', error)
      return {
        description: 'Image analysis unavailable',
        dominantColors: [],
        style: 'unknown',
        mood: 'neutral',
        containsPerson: false,
        containsProduct: false,
        suggestedUse: 'general'
      }
    }
  }
  
  /**
   * Determines possible content types based on intent and images
   */
  private determineContentTypes(userIntent: string, imageAnalysis: Map<number, ImageAnalysis>): ContentType[] {
    const types: ContentType[] = []
    
    const intent = userIntent.toLowerCase()
    const hasUserPhoto = Array.from(imageAnalysis.values()).some(a => a.containsPerson)
    const hasProduct = Array.from(imageAnalysis.values()).some(a => a.containsProduct)
    
    // Carousel content
    if (intent.includes('carousel') || intent.includes('slides') || intent.includes('educational')) {
      types.push('carousel_cover', 'carousel_content')
      if (intent.includes('infographic') || intent.includes('stats') || intent.includes('data')) {
        types.push('carousel_infographic')
      }
    }
    
    // UGC content
    if (intent.includes('ugc') || intent.includes('authentic') || intent.includes('relatable')) {
      if (intent.includes('morning')) types.push('ugc_morning_routine')
      if (intent.includes('coffee') || intent.includes('work')) types.push('ugc_coffee_shop')
      if (intent.includes('unbox')) types.push('ugc_unboxing')
    }
    
    // Product content
    if (hasProduct || intent.includes('product')) {
      types.push('product_lifestyle', 'product_flatlay')
      if (hasUserPhoto) types.push('product_on_person')
    }
    
    // Brand partnership
    if (intent.includes('brand') || intent.includes('partnership') || intent.includes('sponsored')) {
      if (intent.includes('skincare') || intent.includes('beauty')) types.push('brand_skincare')
      if (intent.includes('fashion') || intent.includes('outfit')) types.push('brand_fashion')
      if (intent.includes('tech') || intent.includes('gadget')) types.push('brand_tech')
    }
    
    // Reel covers
    if (intent.includes('reel') || intent.includes('cover') || intent.includes('video')) {
      if (intent.includes('tutorial') || intent.includes('how')) types.push('reel_tutorial')
      if (intent.includes('transformation') || intent.includes('before')) types.push('reel_transformation')
      if (intent.includes('day in') || intent.includes('vlog')) types.push('reel_lifestyle')
      if (intent.includes('tip') || intent.includes('educational')) types.push('reel_educational')
    }
    
    // If no specific type detected, infer from images
    if (types.length === 0) {
      if (hasUserPhoto && hasProduct) types.push('product_lifestyle')
      else if (hasUserPhoto) types.push('ugc_coffee_shop')
      else if (hasProduct) types.push('product_flatlay')
    }
    
    return types
  }
  
  /**
   * Selects appropriate templates for content types
   */
  private selectTemplates(contentTypes: ContentType[], imageAnalysis: Map<number, ImageAnalysis>): PromptTemplate[] {
    const templates: PromptTemplate[] = []
    
    const allTemplates = {
      ...CAROUSEL_TEMPLATES,
      ...UGC_TEMPLATES,
      ...PRODUCT_MOCKUP_TEMPLATES,
      ...BRAND_PARTNERSHIP_TEMPLATES,
      ...REEL_COVER_TEMPLATES
    }
    
    for (const type of contentTypes) {
      // Find templates matching this content type
      const matchingTemplates = Object.values(allTemplates).filter(template => {
        // Match template ID to content type
        const typePrefix = type.toLowerCase().split('_')[0]
        const templateId = template.id.toLowerCase()
        return templateId.includes(typePrefix) || templateId === type.toLowerCase()
      })
      
      templates.push(...matchingTemplates)
    }
    
    // Remove duplicates
    const uniqueTemplates = Array.from(new Map(templates.map(t => [t.id, t])).values())
    
    return uniqueTemplates
  }
  
  /**
   * Generates actual prompts from templates
   */
  private async generateFromTemplates(
    templates: PromptTemplate[],
    context: WorkbenchContext & { imageAnalysis: Map<number, ImageAnalysis> }
  ): Promise<PromptSuggestion[]> {
    const suggestions: PromptSuggestion[] = []
    
    for (const template of templates) {
      // Check if we have required images
      const hasRequiredImages = this.checkRequiredImages(template, context.images)
      if (!hasRequiredImages) continue
      
      // Build prompt context for template
      const promptContext = this.buildPromptContext(template, context)
      
      // Generate main prompt
      const mainPrompt = template.promptStructure(promptContext)
      
      suggestions.push({
        id: `${template.id}_main`,
        templateId: template.id,
        name: template.name,
        description: template.description,
        prompt: mainPrompt,
        variation: 'main',
        nanoBananaCapabilities: this.extractCapabilities(mainPrompt, template),
        useCases: template.useCases,
        confidence: this.calculateConfidence(template, context)
      })
      
      // Generate variations
      for (const variation of template.variations || []) {
        const variedPrompt = this.applyVariation(mainPrompt, variation)
        suggestions.push({
          id: `${template.id}_${variation.name.toLowerCase().replace(/\s+/g, '_')}`,
          templateId: template.id,
          name: `${template.name} - ${variation.name}`,
          description: variation.styleKeywords || variation.moodAdjustment || template.description,
          prompt: variedPrompt,
          variation: variation.name,
          nanoBananaCapabilities: this.extractCapabilities(variedPrompt, template),
          useCases: template.useCases,
          confidence: this.calculateConfidence(template, context) * 0.9 // Slightly lower for variations
        })
      }
    }
    
    return suggestions
  }
  
  /**
   * Ranks suggestions by relevance and quality
   */
  private rankSuggestions(
    suggestions: PromptSuggestion[],
    context: WorkbenchContext
  ): PromptSuggestion[] {
    return suggestions.sort((a, b) => {
      // Primary: Confidence score
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence
      }
      
      // Secondary: Number of NanoBanana Pro capabilities used
      if (b.nanoBananaCapabilities.length !== a.nanoBananaCapabilities.length) {
        return b.nanoBananaCapabilities.length - a.nanoBananaCapabilities.length
      }
      
      // Tertiary: Main variations before alternate variations
      if (a.variation === 'main' && b.variation !== 'main') return -1
      if (b.variation === 'main' && a.variation !== 'main') return 1
      
      return 0
    })
  }
  
  /**
   * Extracts NanoBanana Pro capabilities being leveraged
   */
  private extractCapabilities(prompt: string, template: PromptTemplate): NanoBananaCapability[] {
    const capabilities: NanoBananaCapability[] = []
    const promptLower = prompt.toLowerCase()
    
    // Text rendering
    if (promptLower.includes('text') || 
        promptLower.includes('headline') ||
        promptLower.includes('typography') ||
        promptLower.includes('text overlay')) {
      capabilities.push('text_rendering')
    }
    
    // Multi-image composition
    if ((promptLower.includes('image 1') && promptLower.includes('image 2')) ||
        promptLower.includes('reference image') ||
        promptLower.includes('multiple images')) {
      capabilities.push('multi_image_composition')
    }
    
    // Character consistency
    if (promptLower.includes('exact') || 
        promptLower.includes('identical') ||
        promptLower.includes('consistency') ||
        promptLower.includes('same person') ||
        promptLower.includes('character lock')) {
      capabilities.push('character_consistency')
    }
    
    // Real-time data
    if (promptLower.includes('google search') ||
        promptLower.includes('current data') ||
        promptLower.includes('2025 data')) {
      capabilities.push('real_time_data')
    }
    
    // Professional creative controls
    if ((promptLower.includes('lighting') && promptLower.includes('f/')) ||
        promptLower.includes('camera angle') ||
        promptLower.includes('85mm lens') ||
        promptLower.includes('depth of field')) {
      capabilities.push('professional_controls')
    }
    
    // Educational/infographic
    if (template.id.includes('infographic') || 
        promptLower.includes('diagram') ||
        promptLower.includes('educational') ||
        promptLower.includes('data visualization')) {
      capabilities.push('educational_excellence')
    }
    
    return capabilities
  }
  
  /**
   * Checks if required images are available for template
   */
  private checkRequiredImages(template: PromptTemplate, images: WorkbenchImage[]): boolean {
    const required = template.requiredImages
    
    // Check image count
    if (images.length < required.min) {
      return false
    }
    if (images.length > required.max) {
      return false
    }
    
    // Check image types
    const availableTypes = images.map(img => img.type)
    const hasRequiredTypes = required.types.some(type => availableTypes.includes(type))
    
    return hasRequiredTypes
  }
  
  /**
   * Builds prompt context from workbench context
   */
  private buildPromptContext(
    template: PromptTemplate,
    context: WorkbenchContext & { imageAnalysis: Map<number, ImageAnalysis> }
  ): PromptContext {
    // Convert WorkbenchImage[] to ImageReference[]
    const userImages: ImageReference[] = context.images.map(img => ({
      url: img.url,
      type: img.type,
      description: context.imageAnalysis.get(img.position)?.description
    }))
    
    // Extract color palette from image analysis
    const colorPalette = context.userPreferences?.colorPalette || 
      Array.from(context.imageAnalysis.values())
        .flatMap(analysis => analysis.dominantColors)
        .filter((color, index, self) => self.indexOf(color) === index)
        .slice(0, 5)
    
    // Determine brand aesthetic
    const brandAesthetic = context.userPreferences?.brandAesthetic ||
      Array.from(context.imageAnalysis.values())
        .map(analysis => analysis.style)
        .find(style => style && style !== 'unknown') ||
      undefined
    
    return {
      userImages,
      contentType: context.contentType,
      userIntent: context.userIntent,
      selectedCapabilities: [],
      colorPalette,
      brandAesthetic,
      brandProfile: context.brandProfile // Pass brand profile to templates
    }
  }
  
  /**
   * Applies variation to base prompt
   */
  private applyVariation(prompt: string, variation: any): string {
    let variedPrompt = prompt
    
    // Apply mood adjustment
    if (variation.moodAdjustment) {
      // Find style section and enhance it
      variedPrompt = variedPrompt.replace(
        /(\*\*Style:\*\*[^\n]*)/i,
        `$1, ${variation.moodAdjustment}`
      )
    }
    
    // Apply lighting adjustment
    if (variation.lightingAdjustment) {
      variedPrompt = variedPrompt.replace(
        /(\*\*Lighting:\*\*[^\n]*)/i,
        `**Lighting:** ${variation.lightingAdjustment}`
      )
    }
    
    // Apply style keywords
    if (variation.styleKeywords) {
      variedPrompt = variedPrompt.replace(
        /(\*\*Style:\*\*[^\n]*)/i,
        `$1, ${variation.styleKeywords}`
      )
    }
    
    // Apply environment focus
    if (variation.environmentFocus) {
      variedPrompt = variedPrompt.replace(
        /(\*\*Environment:\*\*[^\n]*)/i,
        `**Environment:** ${variation.environmentFocus}`
      )
    }
    
    // Apply action change
    if (variation.actionChange) {
      variedPrompt = variedPrompt.replace(
        /(\*\*Action:\*\*[^\n]*)/i,
        `**Action:** ${variation.actionChange}`
      )
    }
    
    // Apply layout for infographics
    if (variation.layout) {
      variedPrompt = variedPrompt.replace(
        /(\*\*Layout:\*\*[^\n]*)/i,
        `**Layout:** ${variation.layout}`
      )
    }
    
    // Apply timing
    if (variation.timing) {
      variedPrompt = variedPrompt.replace(
        /(\*\*Scene Type:\*\*[^\n]*)/i,
        `**Scene Type:** ${variation.timing}`
      )
    }
    
    // Apply expression
    if (variation.expression) {
      variedPrompt = variedPrompt.replace(
        /(\*\*Expression[^\n]*:\*\*[^\n]*)/i,
        `**Expression:** ${variation.expression}`
      )
    }
    
    // Apply gesture
    if (variation.gesture) {
      variedPrompt = variedPrompt.replace(
        /(\*\*Gesture[^\n]*:\*\*[^\n]*)/i,
        `**Gesture:** ${variation.gesture}`
      )
    }
    
    return variedPrompt
  }
  
  /**
   * Calculates confidence score for template match
   */
  private calculateConfidence(template: PromptTemplate, context: WorkbenchContext): number {
    let confidence = 0.5 // Base confidence
    
    const intent = context.userIntent.toLowerCase()
    const templateId = template.id.toLowerCase()
    const templateName = template.name.toLowerCase()
    
    // Check if template ID matches content type
    if (context.contentType !== 'custom') {
      const contentTypeMatch = templateId.includes(context.contentType.split('_')[0])
      if (contentTypeMatch) confidence += 0.2
    }
    
    // Check if user intent keywords match template
    const intentWords = intent.split(/\s+/)
    const templateWords = `${templateId} ${templateName} ${template.description.toLowerCase()}`.split(/\s+/)
    
    const matchingWords = intentWords.filter(word => 
      templateWords.some(tWord => tWord.includes(word) || word.includes(tWord))
    )
    
    if (matchingWords.length > 0) {
      confidence += Math.min(0.2, matchingWords.length * 0.05)
    }
    
    // Check if use cases match
    const useCaseMatch = template.useCases.some(useCase => 
      intent.includes(useCase.toLowerCase())
    )
    if (useCaseMatch) confidence += 0.1
    
    // Ensure confidence is between 0 and 1
    return Math.min(1, Math.max(0, confidence))
  }
}

































