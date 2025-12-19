/**
 * Composition Builder
 * 
 * Intelligently assembles complete prompts from components
 * Selects appropriate components based on user intent
 * Ensures components work well together
 * Generates titles and descriptions
 */

import type { ConceptComponents, ComposedPrompt, PromptComponent } from './types'
import { ComponentDatabase } from './component-database'
import { DiversityEngine } from './diversity-engine'

interface IntentAnalysis {
  wantsMovement: boolean
  wantsCloseUp: boolean
  wantsFullBody: boolean
  wantsOutdoor: boolean
  wantsIndoor: boolean
  wantsGoldenHour: boolean
  wantsEditorial: boolean
  wantsCasual: boolean
  specificBrand?: string
  specificPose?: string
  specificLocation?: string
}

export class CompositionBuilder {
  private componentDB: ComponentDatabase
  private diversityEngine: DiversityEngine

  constructor(
    componentDB: ComponentDatabase,
    diversityEngine?: DiversityEngine
  ) {
    this.componentDB = componentDB
    this.diversityEngine = diversityEngine || new DiversityEngine()
  }

  /**
   * Compose a complete prompt from components
   */
  composePrompt(params: {
    category: string
    userIntent: string
    brand?: string
    count?: number // Which number concept this is (for diversity)
    previousConcepts?: ConceptComponents[]
  }): ComposedPrompt {
    const excludeIds = this.getExcludedComponentIds(params.previousConcepts)

    // Analyze user intent to guide component selection
    const intent = this.analyzeIntent(params.userIntent)

    // Select pose
    const pose = this.selectPose({
      category: params.category,
      intent,
      excludeIds,
      previousConcepts: params.previousConcepts,
    })

    if (!pose) {
      throw new Error('No suitable pose component found')
    }

    // Select outfit (must be different from previous)
    const outfit = this.selectOutfit({
      category: params.category,
      intent,
      brand: params.brand,
      excludeIds,
      previousConcepts: params.previousConcepts,
    })

    if (!outfit) {
      throw new Error('No suitable outfit component found')
    }

    // Select location (different category if possible)
    const location = this.selectLocation({
      category: params.category,
      intent,
      excludeIds,
      previousConcepts: params.previousConcepts,
      poseType: pose.metadata?.poseType,
    })

    if (!location) {
      throw new Error('No suitable location component found')
    }

    // Select lighting (compatible with location)
    const lighting = this.selectLighting({
      category: params.category,
      intent,
      excludeIds,
      previousConcepts: params.previousConcepts,
      locationType: location.metadata?.locationType,
    })

    if (!lighting) {
      throw new Error('No suitable lighting component found')
    }

    // Select camera specs (appropriate for pose + location)
    const camera = this.selectCamera({
      category: params.category,
      excludeIds,
      poseType: pose.metadata?.poseType,
      locationType: location.metadata?.locationType,
    })

    if (!camera) {
      throw new Error('No suitable camera component found')
    }

    // Select styling (hair + makeup)
    const styling = this.selectStyling({
      category: params.category,
      intent,
      excludeIds,
    })

    // Select brand elements if specified
    const brandElements = params.brand
      ? this.componentDB.query({
          type: 'brand_element',
          tags: [params.brand.toLowerCase()],
        })
      : []

    const components: ConceptComponents = {
      pose,
      outfit,
      location,
      lighting,
      camera,
      styling: styling || undefined,
      brandElements: brandElements.slice(0, 2), // Max 2 brand elements
    }

    // Assemble into final prompt
    return this.assemblePrompt(components, params.category, intent)
  }

  /**
   * Get excluded component IDs from previous concepts
   */
  private getExcludedComponentIds(
    previousConcepts?: ConceptComponents[]
  ): Set<string> {
    const excludeIds = new Set<string>()

    if (!previousConcepts) return excludeIds

    for (const concept of previousConcepts) {
      excludeIds.add(concept.pose.id)
      excludeIds.add(concept.outfit.id)
      excludeIds.add(concept.location.id)
      excludeIds.add(concept.lighting.id)
      excludeIds.add(concept.camera.id)
      if (concept.styling) {
        excludeIds.add(concept.styling.id)
      }
      if (concept.brandElements) {
        concept.brandElements.forEach(el => excludeIds.add(el.id))
      }
    }

    return excludeIds
  }

  /**
   * Analyze user intent to guide component selection
   */
  private analyzeIntent(userIntent: string): IntentAnalysis {
    const lower = userIntent.toLowerCase()

    return {
      wantsMovement: /movement|walking|dynamic|action/i.test(lower),
      wantsCloseUp: /close.*up|face|portrait|detail/i.test(lower),
      wantsFullBody: /full.*body|head.*toe|entire/i.test(lower),
      wantsOutdoor: /outdoor|outside|beach|park|terrace/i.test(lower),
      wantsIndoor: /indoor|inside|room|studio/i.test(lower),
      wantsGoldenHour: /golden.*hour|sunset|sunrise|warm.*light/i.test(lower),
      wantsEditorial: /editorial|vogue|fashion|sophisticated/i.test(lower),
      wantsCasual: /casual|relaxed|comfortable|everyday/i.test(lower),
      specificBrand: this.extractBrandMention(lower),
      specificPose: this.extractPoseMention(lower),
      specificLocation: this.extractLocationMention(lower),
    }
  }

  /**
   * Extract brand mention from intent
   */
  private extractBrandMention(text: string): string | undefined {
    const brands = ['alo', 'chanel', 'dior', 'glossier', 'lululemon', 'lulu']
    for (const brand of brands) {
      if (text.includes(brand)) {
        return brand
      }
    }
    return undefined
  }

  /**
   * Extract pose mention from intent
   */
  private extractPoseMention(text: string): string | undefined {
    const poses = ['walking', 'sitting', 'standing', 'kneeling', 'yoga', 'stretching']
    for (const pose of poses) {
      if (text.includes(pose)) {
        return pose
      }
    }
    return undefined
  }

  /**
   * Extract location mention from intent
   */
  private extractLocationMention(text: string): string | undefined {
    const locations = ['cafe', 'beach', 'studio', 'terrace', 'airport', 'home']
    for (const location of locations) {
      if (text.includes(location)) {
        return location
      }
    }
    return undefined
  }

  /**
   * Select appropriate pose component
   */
  private selectPose(params: {
    category: string
    intent: IntentAnalysis
    excludeIds: Set<string>
    previousConcepts?: ConceptComponents[]
  }): PromptComponent | null {
    // Build filters based on intent
    const filters: any = {
      category: params.category,
      type: 'pose',
      exclude: Array.from(params.excludeIds),
    }

    // If user wants specific pose type
    if (params.intent.wantsMovement) {
      filters.poseType = 'movement'
    } else if (params.intent.specificPose) {
      filters.tags = [params.intent.specificPose]
    }

    // Avoid pose types used in previous concepts
    if (params.previousConcepts && params.previousConcepts.length > 0) {
      const usedPoseTypes = params.previousConcepts
        .map(c => c.pose.metadata?.poseType)
        .filter(Boolean)

      // If all main pose types are used, allow repeats but prioritize least-used
      if (usedPoseTypes.length >= 4) {
        // Get all poses and sort by how many times their type has been used
        const allPoses = this.componentDB.query({
          category: params.category,
          type: 'pose',
          exclude: Array.from(params.excludeIds),
        })

        // Count usage of each pose type
        const typeUsage: Record<string, number> = {}
        for (const type of usedPoseTypes) {
          if (type) {
            typeUsage[type] = (typeUsage[type] || 0) + 1
          }
        }

        // Sort poses by their type usage (prefer less-used types)
        const sorted = allPoses.sort((a, b) => {
          const aUsage = typeUsage[a.metadata?.poseType || ''] || 0
          const bUsage = typeUsage[b.metadata?.poseType || ''] || 0
          return aUsage - bUsage
        })

        return sorted[0] || null
      }
    }

    return this.componentDB.getRandomComponent(filters)
  }

  /**
   * Select outfit component
   */
  private selectOutfit(params: {
    category: string
    intent: IntentAnalysis
    brand?: string
    excludeIds: Set<string>
    previousConcepts?: ConceptComponents[]
  }): PromptComponent | null {
    const filters: any = {
      category: params.category,
      type: 'outfit',
      exclude: Array.from(params.excludeIds),
    }

    // Brand-specific outfits if specified
    if (params.brand) {
      filters.tags = [params.brand.toLowerCase()]
    }

    // Style preference
    if (params.intent.wantsEditorial) {
      filters.tags = [...(filters.tags || []), 'editorial', 'sophisticated']
    } else if (params.intent.wantsCasual) {
      filters.tags = [...(filters.tags || []), 'casual', 'relaxed']
    }

    return this.componentDB.getRandomComponent(filters)
  }

  /**
   * Select location component (compatible with pose)
   */
  private selectLocation(params: {
    category: string
    intent: IntentAnalysis
    excludeIds: Set<string>
    previousConcepts?: ConceptComponents[]
    poseType?: string
  }): PromptComponent | null {
    const filters: any = {
      category: params.category,
      type: 'location',
      exclude: Array.from(params.excludeIds),
    }

    // User preference for indoor/outdoor
    if (params.intent.wantsOutdoor) {
      filters.locationType = 'outdoor'
    } else if (params.intent.wantsIndoor) {
      filters.locationType = 'indoor'
    } else if (params.intent.specificLocation) {
      filters.tags = [params.intent.specificLocation]
    }

    // Avoid location categories used recently
    if (params.previousConcepts && params.previousConcepts.length > 0) {
      const usedLocationTypes = params.previousConcepts
        .map(c => c.location.metadata?.locationType)
        .filter(Boolean)

      // If location type would repeat, try to find different one
      const candidates = this.componentDB.query({
        category: params.category,
        type: 'location',
        exclude: Array.from(params.excludeIds),
        locationType: filters.locationType,
      })
      const differentType = candidates.find(
        c => !usedLocationTypes.includes(c.metadata?.locationType)
      )

      if (differentType) return differentType
    }

    return this.componentDB.getRandomComponent(filters)
  }

  /**
   * Select lighting component (compatible with location)
   */
  private selectLighting(params: {
    category: string
    intent: IntentAnalysis
    excludeIds: Set<string>
    previousConcepts?: ConceptComponents[]
    locationType?: string
  }): PromptComponent | null {
    const filters: any = {
      category: params.category,
      type: 'lighting',
      exclude: Array.from(params.excludeIds),
    }

    // Prefer golden hour if requested
    if (params.intent.wantsGoldenHour) {
      filters.lightingType = 'golden-hour'
    }

    // Match lighting to location type
    if (params.locationType === 'outdoor') {
      filters.lightingType = 'natural'
    } else if (params.locationType === 'studio') {
      filters.lightingType = 'studio'
    }

    return this.componentDB.getRandomComponent(filters)
  }

  /**
   * Select camera specs (appropriate for framing)
   */
  private selectCamera(params: {
    category: string
    excludeIds: Set<string>
    poseType?: string
    locationType?: string
  }): PromptComponent | null {
    const filters: any = {
      category: params.category,
      type: 'camera',
      exclude: Array.from(params.excludeIds),
    }

    // Match framing to pose type
    if (params.poseType === 'yoga' || params.poseType === 'complex') {
      filters.framingType = 'full-body'
    }

    return this.componentDB.getRandomComponent(filters)
  }

  /**
   * Select styling component
   */
  private selectStyling(params: {
    category: string
    intent: IntentAnalysis
    excludeIds: Set<string>
  }): PromptComponent | null {
    const filters: any = {
      category: params.category,
      type: 'styling',
      exclude: Array.from(params.excludeIds),
    }

    return this.componentDB.getRandomComponent(filters)
  }

  /**
   * Assemble components into cohesive prompt
   */
  private assemblePrompt(
    components: ConceptComponents,
    category: string,
    intent: IntentAnalysis
  ): ComposedPrompt {
    const sections: string[] = []

    // 1. Character consistency (always first)
    sections.push(
      'Woman maintaining exactly the characteristics of the person in the attachment (face, visual identity), without copying the photo.'
    )

    // 2. Outfit + Pose (combined naturally)
    sections.push(`${components.outfit.promptText}, ${components.pose.promptText}`)

    // 3. Styling (hair + makeup)
    if (components.styling) {
      sections.push(components.styling.promptText)
    } else {
      // Default styling
      sections.push('Hair loose with volume and waves. Natural glam makeup.')
    }

    // 4. Location/Environment
    sections.push(components.location.promptText)

    // 5. Lighting
    sections.push(components.lighting.promptText)

    // 6. Brand elements (if any)
    if (components.brandElements && components.brandElements.length > 0) {
      sections.push(components.brandElements.map(e => e.promptText).join('. '))
    }

    // 7. Camera specs
    sections.push(components.camera.promptText)

    // 8. Aesthetic/mood (derived from components)
    const aesthetic = this.deriveAesthetic(components, category)
    if (aesthetic) {
      sections.push(aesthetic)
    }

    // Join sections with proper punctuation
    const fullPrompt = sections
      .map(s => s.trim())
      .join('. ')
      .replace(/\.\./g, '.') // Remove double periods
      .replace(/\. ,/g, ',') // Fix punctuation
      .trim()

    return {
      prompt: fullPrompt,
      components,
      title: this.generateTitle(components),
      description: this.generateDescription(components, intent),
      category,
      metadata: {
        wordCount: fullPrompt.split(' ').length,
        diversityScore: this.diversityEngine.getDiversityScore(components),
        brandElements: components.brandElements?.map(e => e.id),
      },
    }
  }

  /**
   * Derive aesthetic from components
   */
  private deriveAesthetic(
    components: ConceptComponents,
    category: string
  ): string {
    // Extract aesthetic keywords from components
    const keywords: string[] = []

    // From category
    if (category.includes('luxury')) keywords.push('luxury', 'sophisticated')
    if (category.includes('workout')) keywords.push('active', 'wellness')
    if (category.includes('editorial')) keywords.push('editorial', 'fashion')

    // From lighting
    if (components.lighting.promptText.includes('golden hour')) {
      keywords.push('warm', 'cinematic')
    }
    if (components.lighting.promptText.includes('studio')) {
      keywords.push('professional', 'clean')
    }

    // From location
    if (components.location.promptText.includes('minimal')) {
      keywords.push('minimalist', 'clean')
    }

    // Compose aesthetic description
    if (keywords.length >= 2) {
      return `${keywords[0]} and ${keywords[1]} aesthetic`
    } else if (keywords.length === 1) {
      return `${keywords[0]} aesthetic`
    }

    return ''
  }

  /**
   * Generate title from components
   */
  private generateTitle(components: ConceptComponents): string {
    // Extract keywords
    const poseKeyword = this.extractKeyword(components.pose.description)
    const locationKeyword = this.extractKeyword(components.location.description)

    // Examples:
    // "Movement Shot" (from pose)
    // "Tennis Court Scene" (from location)
    // "Beach Editorial" (location + aesthetic)
    // "Yoga Terrace" (pose + location)

    if (locationKeyword && poseKeyword) {
      return `${locationKeyword} ${poseKeyword}`
    } else if (poseKeyword) {
      return poseKeyword
    } else if (locationKeyword) {
      return `${locationKeyword} Scene`
    }

    return 'Lifestyle Shot'
  }

  /**
   * Generate description from components
   */
  private generateDescription(
    components: ConceptComponents,
    intent: IntentAnalysis
  ): string {
    // Create natural language description
    const parts: string[] = []

    // Pose description (simplified)
    const poseAction = this.extractAction(components.pose.promptText)
    if (poseAction) {
      parts.push(poseAction)
    }

    // Location (simplified)
    const locationSummary = this.simplifyLocation(components.location.promptText)
    if (locationSummary) {
      parts.push(`at ${locationSummary}`)
    }

    // Mood from lighting
    if (components.lighting.promptText.includes('golden hour')) {
      parts.push('in golden hour light')
    } else if (components.lighting.promptText.includes('soft')) {
      parts.push('with soft, natural lighting')
    }

    // Join naturally
    let description = parts.join(' ')

    // Capitalize first letter
    description = description.charAt(0).toUpperCase() + description.slice(1)

    return description
  }

  // Helper methods for extracting keywords and simplifying text
  private extractKeyword(text: string): string {
    // Extract main keyword from description
    const words = text.toLowerCase().split(' ')
    // Look for meaningful nouns
    const meaningful = words.filter(
      w => w.length > 4 && !['woman', 'photo', 'image'].includes(w)
    )
    return meaningful[0] || ''
  }

  private extractAction(text: string): string {
    // Extract action verb + object
    const match = text.match(
      /(walks|standing|sitting|kneeling|holding|adjusting|wearing)[\s\w]+/i
    )
    return match ? match[0] : ''
  }

  private simplifyLocation(text: string): string {
    // Simplify location to 2-4 words
    if (text.includes('terrace')) return 'modern terrace'
    if (text.includes('cafe') || text.includes('café')) return 'cozy café'
    if (text.includes('beach')) return 'beach'
    if (text.includes('studio')) return 'studio'
    if (text.includes('airport')) return 'airport'

    return 'location'
  }
}
