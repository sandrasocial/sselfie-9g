/**
 * Component Extractor
 * 
 * Extracts components from Universal Prompts text
 * 
 * This is a helper utility to parse Universal Prompts and extract
 * structured components. In production, components should be pre-extracted
 * and stored in the database.
 */

import type { PromptComponent, RawPrompt } from './types'

export interface ExtractedComponents {
  pose?: PromptComponent
  outfit?: PromptComponent
  location?: PromptComponent
  lighting?: PromptComponent
  camera?: PromptComponent
  styling?: PromptComponent
  brandElements?: PromptComponent[]
  hair?: PromptComponent
  makeup?: PromptComponent
  aesthetic?: PromptComponent
}

/**
 * Component Extractor Class
 * 
 * Main class for extracting components from Universal Prompts
 */
export class ComponentExtractor {
  /**
   * Extract all components from a raw prompt
   */
  extractComponents(rawPrompt: RawPrompt): ExtractedComponents {
    const text = rawPrompt.fullPrompt
    const category = rawPrompt.category
    const brand = rawPrompt.brand

    const components: ExtractedComponents = {}

    // Extract pose (look for action verbs and body positions)
    const pose = this.extractPose(text, category, brand)
    if (pose) components.pose = pose

    // Extract outfit (look for "wearing", "wears", clothing items)
    const outfit = this.extractOutfit(text, category, brand)
    if (outfit) components.outfit = outfit

    // Extract location (environment descriptions)
    const location = this.extractLocation(text, category)
    if (location) components.location = location

    // Extract lighting (lighting descriptions, time of day)
    const lighting = this.extractLighting(text, category)
    if (lighting) components.lighting = lighting

    // Extract camera (lens, aperture, distance, angle specs)
    const camera = this.extractCamera(text, category)
    if (camera) components.camera = camera

    // Extract styling (hair, makeup)
    const styling = this.extractStyling(text, category)
    if (styling) components.styling = styling

    // Extract brand elements (logos, products, brand mentions)
    if (brand) {
      const brandElements = this.extractBrandElements(text, category, brand)
      if (brandElements.length > 0) {
        components.brandElements = brandElements
      }
    }

    return components
  }

  /**
   * Extract pose from prompt text
   */
  private extractPose(
    text: string,
    category: string,
    brand?: string
  ): PromptComponent | null {
    const lower = text.toLowerCase()

    // Enhanced pose patterns with better context extraction
    const posePatterns = [
      {
        pattern: /(?:walks?|walking|moving|strides?)[\s\S]{10,150}?(?:\.|,|$)/gi,
        type: 'walking' as const,
        tags: ['movement', 'dynamic', 'casual'],
      },
      {
        pattern: /(?:sits?|sitting|seated|lounging)[\s\S]{10,150}?(?:\.|,|$)/gi,
        type: 'sitting' as const,
        tags: ['sitting', 'casual', 'relaxed'],
      },
      {
        pattern: /(?:stands?|standing)[\s\S]{10,150}?(?:\.|,|$)/gi,
        type: 'standing' as const,
        tags: ['standing'],
      },
      {
        pattern: /(?:kneeling|kneels?|on knees)[\s\S]{10,150}?(?:\.|,|$)/gi,
        type: 'kneeling' as const,
        tags: ['kneeling', 'yoga', 'wellness'],
      },
      {
        pattern: /(?:yoga|vrksasana|tree pose|asana|yoga pose)[\s\S]{10,150}?(?:\.|,|$)/gi,
        type: 'yoga' as const,
        tags: ['yoga', 'wellness', 'fitness'],
      },
      {
        pattern: /(?:editorial|fashion|sophisticated|complex).*?(?:pose|position|stance)[\s\S]{10,150}?(?:\.|,|$)/gi,
        type: 'editorial' as const,
        tags: ['editorial', 'fashion', 'luxury'],
      },
      {
        pattern: /(?:holding|grasping|adjusting|touching)[\s\S]{10,150}?(?:\.|,|$)/gi,
        type: 'dynamic' as const,
        tags: ['dynamic', 'action', 'movement'],
      },
      {
        pattern: /(?:stretching|reaching|arms raised|extending)[\s\S]{10,150}?(?:\.|,|$)/gi,
        type: 'dynamic' as const,
        tags: ['stretching', 'fitness', 'dynamic'],
      },
    ]

    for (const { pattern, type, tags } of posePatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match.index !== undefined) {
          const sentence = this.extractSentence(text, match.index)
          if (sentence.length > 20) {
            // Only use if we got a substantial sentence
            return {
              id: `${category}-pose-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category,
              type: 'pose',
              description: this.createDescription(sentence, 'pose'),
              promptText: sentence.trim(),
              tags: [...tags, category, ...(brand ? [brand.toLowerCase()] : [])],
              brand,
              metadata: {
                poseType: type,
              },
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Extract outfit from prompt text
   */
  private extractOutfit(
    text: string,
    category: string,
    brand?: string
  ): PromptComponent | null {
    const lower = text.toLowerCase()

    // Enhanced outfit patterns
    const outfitPatterns = [
      /(?:wearing|wears?|outfit|dressed in|clad in)[\s\S]{20,200}?(?:\.|,|$)/gi,
      /(?:[a-z]+ (?:jacket|blazer|dress|sweater|top|shirt|pants|jeans|leggings|outfit|set|ensemble))[\s\S]{10,150}?(?:\.|,|$)/gi,
      /(?:monochromatic|nude-toned|elegant|sport|athletic|luxury).*?(?:outfit|set|ensemble|clothing)[\s\S]{10,100}?(?:\.|,|$)/gi,
    ]

    for (const pattern of outfitPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match.index !== undefined) {
          const outfitText = match[0].trim()
          if (outfitText.length > 15) {
            const tags: string[] = []
            let style: PromptComponent['metadata']['outfitStyle'] = 'casual'

            if (lower.includes('athletic') || lower.includes('sport') || lower.includes('athleisure') || lower.includes('workout')) {
              tags.push('athletic', 'sport', 'fitness')
              style = 'athletic'
            }
            if (lower.includes('luxury') || lower.includes('editorial') || lower.includes('high-end') || lower.includes('premium')) {
              tags.push('luxury', 'editorial', 'premium')
              style = 'luxury'
            }
            if (lower.includes('minimal') || lower.includes('minimalist') || lower.includes('clean')) {
              tags.push('minimal', 'clean', 'simple')
              style = 'minimal'
            }
            if (lower.includes('casual') || lower.includes('relaxed') || lower.includes('everyday')) {
              tags.push('casual', 'relaxed')
            }

            return {
              id: `${category}-outfit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category,
              type: 'outfit',
              description: this.createDescription(outfitText, 'outfit'),
              promptText: outfitText.trim(),
              tags: [...tags, category, ...(brand ? [brand.toLowerCase()] : [])],
              brand,
              metadata: {
                outfitStyle: style,
              },
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Extract location from prompt text
   */
  private extractLocation(
    text: string,
    category: string
  ): PromptComponent | null {
    const lower = text.toLowerCase()

    // Enhanced location patterns
    const locationPatterns = [
      /(?:in|at|on) (?:a|an|the) ([^,\.\n]{10,150}?)(?:,|\.|$)/gi,
      /(?:terrace|beach|studio|cafe|bistro|room|interior|outdoor|indoor|hotel|apartment|space|location)[\s\S]{10,150}?(?:\.|,|$)/gi,
      /(?:white|modern|minimalist|luxury|cozy|elegant).*?(?:terrace|space|room|studio|cafe|location)[\s\S]{10,150}?(?:\.|,|$)/gi,
    ]

    for (const pattern of locationPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match.index !== undefined) {
          const locationText = match[0].trim()
          if (locationText.length > 10) {
            const tags: string[] = []
            let locationType: PromptComponent['metadata']['locationType'] = 'indoor'

            if (lower.includes('outdoor') || lower.includes('beach') || lower.includes('terrace') || lower.includes('park') || lower.includes('street')) {
              tags.push('outdoor')
              locationType = 'outdoor'
            }
            if (lower.includes('studio') || lower.includes('photography studio')) {
              tags.push('studio')
              locationType = 'studio'
            }
            if (lower.includes('indoor') || lower.includes('room') || lower.includes('cafe') || lower.includes('interior') || lower.includes('apartment') || lower.includes('hotel')) {
              tags.push('indoor')
              locationType = 'indoor'
            }
            if (lower.includes('airport') || lower.includes('terminal') || lower.includes('doorway') || lower.includes('transition')) {
              tags.push('transitional')
              locationType = 'transitional'
            }

            return {
              id: `${category}-location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category,
              type: 'location',
              description: this.createDescription(locationText, 'location'),
              promptText: locationText.trim(),
              tags: [...tags, category],
              metadata: {
                locationType,
              },
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Extract lighting from prompt text
   */
  private extractLighting(
    text: string,
    category: string
  ): PromptComponent | null {
    const lower = text.toLowerCase()

    // Enhanced lighting patterns
    const lightingPatterns = [
      /(?:lighting|light|illumination|lit)[\s\S]{10,150}?(?:\.|,|$)/gi,
      /(?:golden hour|studio flash|natural light|window light|firelight|ambient|daylight|sunset|sunrise)[\s\S]{10,150}?(?:\.|,|$)/gi,
      /(?:soft|warm|cool|diffused|controlled|balanced).*?(?:light|lighting|illumination)[\s\S]{10,150}?(?:\.|,|$)/gi,
    ]

    for (const pattern of lightingPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match.index !== undefined) {
          const lightingText = match[0].trim()
          if (lightingText.length > 10) {
            const tags: string[] = []
            let lightingType: PromptComponent['metadata']['lightingType'] = 'natural'

            if (lower.includes('golden hour') || lower.includes('golden-hour')) {
              tags.push('golden-hour', 'natural', 'warm')
              lightingType = 'golden-hour'
            }
            if (lower.includes('studio') || lower.includes('flash') || lower.includes('studio lighting')) {
              tags.push('studio', 'professional', 'controlled')
              lightingType = 'studio'
            }
            if (lower.includes('firelight') || lower.includes('fire light')) {
              tags.push('firelight', 'warm', 'ambient')
              lightingType = 'firelight'
            }
            if (lower.includes('ambient') || lower.includes('mixed sources')) {
              tags.push('ambient', 'mixed')
              lightingType = 'ambient'
            }
            if (lower.includes('natural') || lower.includes('window light') || lower.includes('daylight')) {
              tags.push('natural', 'daylight')
              lightingType = 'natural'
            }

            return {
              id: `${category}-lighting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category,
              type: 'lighting',
              description: this.createDescription(lightingText, 'lighting'),
              promptText: lightingText.trim(),
              tags: [...tags, category],
              metadata: {
                lightingType,
              },
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Extract camera specs from prompt text
   */
  private extractCamera(
    text: string,
    category: string
  ): PromptComponent | null {
    const lower = text.toLowerCase()

    // Enhanced camera patterns
    const cameraPatterns = [
      /(?:lens|aperture|distance|framing|shot|mm|f\/|f-stop)[\s\S]{10,150}?(?:\.|,|$)/gi,
      /(?:close-up|medium|full body|three-quarter|bust|waist|portrait|vertical|horizontal)[\s\S]{10,150}?(?:\.|,|$)/gi,
      /(?:35mm|50mm|85mm|24mm|f\/2\.8|f\/2|f\/4|f\/5\.6)[\s\S]{10,150}?(?:\.|,|$)/gi,
      /(?:distance|height|angle|straight|below|above)[\s\S]{10,150}?(?:\.|,|$)/gi,
    ]

    for (const pattern of cameraPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match.index !== undefined) {
          const cameraText = match[0].trim()
          if (cameraText.length > 10) {
            const tags: string[] = []
            let framing: PromptComponent['metadata']['framing'] = 'medium'

            if (lower.includes('close-up') || lower.includes('bust') || lower.includes('face only')) {
              tags.push('close-up', 'portrait')
              framing = 'close-up'
            }
            if (lower.includes('full body') || lower.includes('feet to head') || lower.includes('full-body')) {
              tags.push('full-body', 'wide')
              framing = 'full-body'
            }
            if (lower.includes('three-quarter') || lower.includes('three quarter')) {
              tags.push('three-quarter')
              framing = 'three-quarter'
            }
            if (lower.includes('medium') || lower.includes('waist') || lower.includes('mid-shot')) {
              tags.push('medium', 'mid-shot')
              framing = 'medium'
            }
            if (lower.includes('editorial') || lower.includes('professional')) {
              tags.push('editorial', 'professional')
            }

            return {
              id: `${category}-camera-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category,
              type: 'camera',
              description: this.createDescription(cameraText, 'camera'),
              promptText: cameraText.trim(),
              tags: [...tags, category],
              metadata: {
                framing,
              },
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Extract styling (hair, makeup) from prompt text
   */
  private extractStyling(
    text: string,
    category: string
  ): PromptComponent | null {
    const lower = text.toLowerCase()

    // Look for hair and makeup descriptions
    const stylingPatterns = [
      /(?:hair|hairstyle|makeup|make-up|styling)[\s\S]{10,100}?(?:\.|,|$)/gi,
      /(?:loose|wavy|straight|curly|updo|chignon|bun).*?(?:hair|hairstyle)[\s\S]{5,80}?(?:\.|,|$)/gi,
      /(?:natural|glam|minimal|dewy|matte).*?(?:makeup|make-up)[\s\S]{5,80}?(?:\.|,|$)/gi,
    ]

    for (const pattern of stylingPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match.index !== undefined) {
          const stylingText = match[0].trim()
          if (stylingText.length > 10) {
            const tags: string[] = []
            if (lower.includes('hair')) tags.push('hair')
            if (lower.includes('makeup') || lower.includes('make-up')) tags.push('makeup')

            return {
              id: `${category}-styling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category,
              type: 'styling',
              description: this.createDescription(stylingText, 'styling'),
              promptText: stylingText.trim(),
              tags: [...tags, category],
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Extract brand elements from prompt text
   */
  private extractBrandElements(
    text: string,
    category: string,
    brand: string
  ): PromptComponent[] {
    const lower = text.toLowerCase()
    const brandLower = brand.toLowerCase()
    const elements: PromptComponent[] = []

    // Look for brand mentions, logos, products
    const brandPatterns = [
      new RegExp(`(${brand}[^,\.\n]{5,100}?)(?:,|\\.|$)`, 'gi'),
      /(?:logo|brand|product|item).*?(?:visible|shown|present)[\s\S]{5,80}?(?:\.|,|$)/gi,
    ]

    for (const pattern of brandPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match.index !== undefined) {
          const brandText = match[0].trim()
          if (brandText.length > 5 && (lower.includes(brandLower) || lower.includes('logo'))) {
            elements.push({
              id: `${category}-brand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category,
              type: 'brand_element',
              description: `${brand} brand element`,
              promptText: brandText.trim(),
              tags: ['brand', brandLower, 'logo'],
              brand,
            })
          }
        }
      }
    }

    return elements
  }

  /**
   * Create human-readable description from extracted text
   */
  private createDescription(text: string, type: string): string {
    // Clean up the text and create a concise description
    let desc = text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Limit length
    if (desc.length > 100) {
      desc = desc.substring(0, 97) + '...'
    }

    // Capitalize first letter
    desc = desc.charAt(0).toUpperCase() + desc.slice(1)

    return desc
  }

  /**
   * Extract sentence containing a match
   */
  private extractSentence(text: string, index: number): string {
    // Find sentence boundaries (periods, newlines, or end of text)
    const start = Math.max(0, text.lastIndexOf('.', index))
    const end = text.indexOf('.', index)
    
    if (end === -1) {
      // No period found, try newline
      const newlineEnd = text.indexOf('\n', index)
      if (newlineEnd !== -1) {
        return text.substring(start + 1, newlineEnd).trim()
      }
      return text.substring(start + 1).trim()
    }
    
    return text.substring(start + 1, end).trim()
  }
}

/**
 * Convenience function for extracting components
 */
export function extractComponentsFromPrompt(
  promptText: string,
  category: string,
  brand?: string
): ExtractedComponents {
  const extractor = new ComponentExtractor()
  return extractor.extractComponents({
    id: `${category}-${Date.now()}`,
    title: '',
    fullPrompt: promptText,
    category,
    brand,
  })
}
