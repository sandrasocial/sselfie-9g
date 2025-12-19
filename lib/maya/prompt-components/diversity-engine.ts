/**
 * Diversity Engine
 * 
 * Ensures no two concepts in a batch are too similar
 * Prevents repetition of poses, locations, lighting
 * Enforces minimum diversity thresholds
 */

import type { ConceptComponents, DiversityConstraints, PromptComponent } from './types'

export class DiversityEngine {
  private usedComponentIds: Set<string> = new Set()
  private conceptHistory: ConceptComponents[] = []
  private constraints: DiversityConstraints

  constructor(constraints?: Partial<DiversityConstraints>) {
    this.constraints = {
      minPoseDiversity: constraints?.minPoseDiversity ?? 0.6,
      minLocationDiversity: constraints?.minLocationDiversity ?? 0.5,
      minLightingDiversity: constraints?.minLightingDiversity ?? 0.4,
      maxComponentReuse: constraints?.maxComponentReuse ?? 2,
      enforceOutfitVariation: constraints?.enforceOutfitVariation ?? true,
      enforceFramingVariation: constraints?.enforceFramingVariation ?? true,
    }
  }

  /**
   * Reset for new batch
   */
  reset(): void {
    this.usedComponentIds.clear()
    this.conceptHistory = []
  }

  /**
   * Check if proposed concept meets diversity requirements
   */
  isDiverseEnough(proposed: ConceptComponents): {
    diverse: boolean
    reason?: string
    similarity: number
  } {
    // Check against each existing concept
    for (const existing of this.conceptHistory) {
      const similarity = this.calculateSimilarity(proposed, existing)
      
      if (similarity > 0.7) {
        return {
          diverse: false,
          reason: `Too similar to existing concept (similarity: ${similarity.toFixed(2)})`,
          similarity
        }
      }
    }
    
    // Check component reuse limits
    const reuseCheck = this.checkComponentReuse(proposed)
    if (!reuseCheck.allowed) {
      return {
        diverse: false,
        reason: reuseCheck.reason,
        similarity: 0
      }
    }
    
    return { diverse: true, similarity: 0 }
  }

  /**
   * Calculate similarity score between two concepts (0 = completely different, 1 = identical)
   */
  private calculateSimilarity(a: ConceptComponents, b: ConceptComponents): number {
    let score = 0
    
    // Pose similarity (weight: 0.3)
    if (this.getPoseCategory(a.pose) === this.getPoseCategory(b.pose)) {
      score += 0.3
    }
    
    // Location similarity (weight: 0.25)
    if (this.getLocationCategory(a.location) === this.getLocationCategory(b.location)) {
      score += 0.25
    }
    
    // Lighting similarity (weight: 0.2)
    if (this.getLightingCategory(a.lighting) === this.getLightingCategory(b.lighting)) {
      score += 0.2
    }
    
    // Outfit similarity (weight: 0.15)
    if (this.getOutfitStyle(a.outfit) === this.getOutfitStyle(b.outfit)) {
      score += 0.15
    }
    
    // Camera/framing similarity (weight: 0.1)
    if (this.getFramingType(a.camera) === this.getFramingType(b.camera)) {
      score += 0.1
    }
    
    return score
  }

  /**
   * Extract pose category for comparison
   */
  private getPoseCategory(pose: PromptComponent): string {
    // Map to high-level categories
    const text = pose.promptText.toLowerCase()
    
    if (text.includes('standing') || text.includes('stands')) return 'standing'
    if (text.includes('sitting') || text.includes('seated')) return 'sitting'
    if (text.includes('kneeling') || text.includes('kneels')) return 'kneeling'
    if (text.includes('walking') || text.includes('moving')) return 'movement'
    if (text.includes('lying') || text.includes('laying')) return 'lying'
    if (text.includes('yoga') || text.includes('asana')) return 'yoga'
    
    return 'other'
  }

  /**
   * Extract location category
   */
  private getLocationCategory(location: PromptComponent): string {
    const text = location.promptText.toLowerCase()
    
    if (text.includes('outdoor') || text.includes('beach') || text.includes('terrace')) return 'outdoor'
    if (text.includes('indoor') || text.includes('room') || text.includes('studio')) return 'indoor'
    if (text.includes('cafe') || text.includes('restaurant')) return 'dining'
    if (text.includes('airport') || text.includes('terminal')) return 'travel'
    if (text.includes('gym') || text.includes('studio') || text.includes('pilates')) return 'fitness'
    
    return 'other'
  }

  /**
   * Extract lighting category
   */
  private getLightingCategory(lighting: PromptComponent): string {
    const text = lighting.promptText.toLowerCase()
    
    if (text.includes('golden hour') || text.includes('sunset')) return 'golden-hour'
    if (text.includes('studio') || text.includes('flash')) return 'studio'
    if (text.includes('natural') && text.includes('soft')) return 'natural-soft'
    if (text.includes('natural') && text.includes('direct')) return 'natural-direct'
    if (text.includes('window')) return 'window'
    if (text.includes('firelight') || text.includes('warm')) return 'warm'
    
    return 'other'
  }

  /**
   * Extract framing type from camera component
   */
  private getFramingType(camera: PromptComponent): string {
    const text = camera.promptText.toLowerCase()
    
    if (text.includes('close-up') || text.includes('bust')) return 'close-up'
    if (text.includes('full body') || text.includes('feet to head')) return 'full-body'
    if (text.includes('three-quarter')) return 'three-quarter'
    if (text.includes('medium') || text.includes('waist')) return 'medium'
    
    return 'other'
  }

  /**
   * Extract outfit style
   */
  private getOutfitStyle(outfit: PromptComponent): string {
    const text = outfit.promptText.toLowerCase()
    const tags = outfit.tags.map(t => t.toLowerCase())
    
    if (tags.includes('athletic') || tags.includes('athleisure') || text.includes('athletic') || text.includes('sport')) {
      return 'athletic'
    }
    if (tags.includes('luxury') || tags.includes('editorial') || text.includes('luxury') || text.includes('editorial')) {
      return 'luxury'
    }
    if (tags.includes('casual') || text.includes('casual')) {
      return 'casual'
    }
    if (tags.includes('minimal') || text.includes('minimal')) {
      return 'minimal'
    }
    
    return 'other'
  }

  /**
   * Check if components are being reused too much
   */
  private checkComponentReuse(proposed: ConceptComponents): {
    allowed: boolean
    reason?: string
  } {
    // Count how many times each component has been used
    const allComponents = [
      proposed.pose.id,
      proposed.outfit.id,
      proposed.location.id,
      proposed.lighting.id,
      proposed.camera.id
    ]
    
    for (const componentId of allComponents) {
      const usageCount = this.countComponentUsage(componentId)
      if (usageCount >= this.constraints.maxComponentReuse) {
        return {
          allowed: false,
          reason: `Component ${componentId} used too many times (${usageCount}/${this.constraints.maxComponentReuse})`
        }
      }
    }
    
    return { allowed: true }
  }

  /**
   * Count how many times a component has been used
   */
  private countComponentUsage(componentId: string): number {
    let count = 0
    for (const concept of this.conceptHistory) {
      if (
        concept.pose.id === componentId ||
        concept.outfit.id === componentId ||
        concept.location.id === componentId ||
        concept.lighting.id === componentId ||
        concept.camera.id === componentId
      ) {
        count++
      }
    }
    return count
  }

  /**
   * Add concept to history (after it's been approved)
   */
  addToHistory(concept: ConceptComponents): void {
    this.conceptHistory.push(concept)
    // Mark components as used
    this.usedComponentIds.add(concept.pose.id)
    this.usedComponentIds.add(concept.outfit.id)
    this.usedComponentIds.add(concept.location.id)
    this.usedComponentIds.add(concept.lighting.id)
    this.usedComponentIds.add(concept.camera.id)
    
    if (concept.styling) {
      this.usedComponentIds.add(concept.styling.id)
    }
    if (concept.brandElements) {
      concept.brandElements.forEach(el => this.usedComponentIds.add(el.id))
    }
  }

  /**
   * Record a concept as used (alias for addToHistory for backward compatibility)
   */
  recordConcept(concept: ConceptComponents): void {
    this.addToHistory(concept)
  }

  /**
   * Get used component IDs (to exclude from selection)
   */
  getUsedComponentIds(): string[] {
    return Array.from(this.usedComponentIds)
  }

  /**
   * Check if component has been used
   */
  isComponentUsed(componentId: string): boolean {
    return this.usedComponentIds.has(componentId)
  }

  /**
   * Get diversity score for a concept (0-1, higher = more diverse)
   */
  getDiversityScore(concept: ConceptComponents): number {
    if (this.conceptHistory.length === 0) {
      return 1.0 // First concept is always diverse
    }

    let minSimilarity = 1.0
    for (const existing of this.conceptHistory) {
      const similarity = this.calculateSimilarity(concept, existing)
      minSimilarity = Math.min(minSimilarity, 1 - similarity)
    }

    return minSimilarity
  }

  /**
   * Get current constraints
   */
  getConstraints(): DiversityConstraints {
    return { ...this.constraints }
  }

  /**
   * Get concept history count
   */
  getHistoryCount(): number {
    return this.conceptHistory.length
  }
}
