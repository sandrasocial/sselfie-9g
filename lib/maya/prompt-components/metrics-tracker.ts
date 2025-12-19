/**
 * Metrics Tracker
 * 
 * Tracks composition system performance metrics:
 * - Diversity metrics (similarity scores, repetition rates)
 * - Quality metrics (prompt length, detail level, technical specs)
 * - User experience metrics (approval rate, regeneration requests)
 */

import type { ConceptComponents, ComposedPrompt } from './types'

export interface DiversityMetrics {
  similarityScore: number // Average similarity between concepts in batch
  poseRepetitionRate: number // % of concepts with same pose type
  locationRepetitionRate: number // % of concepts with same location type
  uniqueComponentsUsed: number // Number of unique components in batch
  totalComponentsAvailable: number // Total components available
  componentReuseRate: number // uniqueComponentsUsed / totalComponentsAvailable
}

export interface QualityMetrics {
  averagePromptLength: number // Average words per prompt
  hasTechnicalSpecs: boolean // Camera specs present
  hasLightingDetails: boolean // Lighting details present
  hasBrandIntegration: boolean // Brand elements present
  detailLevel: 'generic' | 'moderate' | 'specific' // Detail level assessment
}

export interface BatchMetrics {
  batchId: string
  timestamp: string
  category: string
  conceptCount: number
  diversity: DiversityMetrics
  quality: QualityMetrics
  concepts: Array<{
    id: string
    title: string
    promptLength: number
    diversityScore: number
  }>
}

export interface UserExperienceMetrics {
  conceptApprovalRate: number // % of concepts user generates from
  regenerationRequests: number // Count of "different" requests
  timeToFirstGeneration: number // Seconds from concept display to first generation
  userSatisfactionScore?: number // 1-5 rating (if collected)
}

export class MetricsTracker {
  private batches: Map<string, BatchMetrics> = new Map()
  private userExperience: Map<string, UserExperienceMetrics> = new Map()

  /**
   * Track a batch of generated concepts
   */
  trackBatch(
    batchId: string,
    category: string,
    concepts: ComposedPrompt[],
    allComponents: ConceptComponents[]
  ): BatchMetrics {
    const diversity = this.calculateDiversityMetrics(concepts.map(c => c.components))
    const quality = this.calculateQualityMetrics(concepts)

    const metrics: BatchMetrics = {
      batchId,
      timestamp: new Date().toISOString(),
      category,
      conceptCount: concepts.length,
      diversity,
      quality,
      concepts: concepts.map(c => ({
        id: c.components.pose.id,
        title: c.title,
        promptLength: c.prompt.split(' ').length,
        diversityScore: 0, // Would be calculated by diversity engine
      })),
    }

    this.batches.set(batchId, metrics)
    return metrics
  }

  /**
   * Calculate diversity metrics for a batch
   */
  private calculateDiversityMetrics(concepts: ConceptComponents[]): DiversityMetrics {
    if (concepts.length === 0) {
      return {
        similarityScore: 0,
        poseRepetitionRate: 0,
        locationRepetitionRate: 0,
        uniqueComponentsUsed: 0,
        totalComponentsAvailable: 0,
        componentReuseRate: 0,
      }
    }

    // Calculate similarity scores between all pairs
    const similarityScores: number[] = []
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const similarity = this.calculateSimilarity(concepts[i], concepts[j])
        similarityScores.push(similarity)
      }
    }

    const avgSimilarity = similarityScores.length > 0
      ? similarityScores.reduce((sum, score) => sum + score, 0) / similarityScores.length
      : 0

    // Calculate pose repetition
    const poseTypes = concepts.map(c => c.pose.metadata?.poseType || 'unknown')
    const poseTypeCounts = poseTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const maxPoseCount = Math.max(...Object.values(poseTypeCounts))
    const poseRepetitionRate = (maxPoseCount / concepts.length) * 100

    // Calculate location repetition
    const locationTypes = concepts.map(c => c.location.metadata?.locationType || 'unknown')
    const locationTypeCounts = locationTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const maxLocationCount = Math.max(...Object.values(locationTypeCounts))
    const locationRepetitionRate = (maxLocationCount / concepts.length) * 100

    // Calculate unique components used
    const allComponentIds = new Set<string>()
    concepts.forEach(c => {
      allComponentIds.add(c.pose.id)
      allComponentIds.add(c.outfit.id)
      allComponentIds.add(c.location.id)
      allComponentIds.add(c.lighting.id)
      allComponentIds.add(c.camera.id)
      if (c.styling) allComponentIds.add(c.styling.id)
      if (c.brandElements) {
        c.brandElements.forEach(el => allComponentIds.add(el.id))
      }
    })

    // Estimate total components available (would come from database)
    const totalComponentsAvailable = concepts.length * 6 // Rough estimate

    return {
      similarityScore: avgSimilarity,
      poseRepetitionRate,
      locationRepetitionRate,
      uniqueComponentsUsed: allComponentIds.size,
      totalComponentsAvailable,
      componentReuseRate: allComponentIds.size / totalComponentsAvailable,
    }
  }

  /**
   * Calculate similarity between two concepts (simplified version)
   */
  private calculateSimilarity(a: ConceptComponents, b: ConceptComponents): number {
    let score = 0

    // Same pose type
    if (a.pose.metadata?.poseType === b.pose.metadata?.poseType) {
      score += 0.3
    }

    // Same location type
    if (a.location.metadata?.locationType === b.location.metadata?.locationType) {
      score += 0.25
    }

    // Same lighting type
    if (a.lighting.metadata?.lightingType === b.lighting.metadata?.lightingType) {
      score += 0.2
    }

    // Same outfit style
    if (a.outfit.metadata?.outfitStyle === b.outfit.metadata?.outfitStyle) {
      score += 0.15
    }

    // Same framing
    if (a.camera.metadata?.framing === b.camera.metadata?.framing) {
      score += 0.1
    }

    return score
  }

  /**
   * Calculate quality metrics for a batch
   */
  private calculateQualityMetrics(concepts: ComposedPrompt[]): QualityMetrics {
    if (concepts.length === 0) {
      return {
        averagePromptLength: 0,
        hasTechnicalSpecs: false,
        hasLightingDetails: false,
        hasBrandIntegration: false,
        detailLevel: 'generic',
      }
    }

    const promptLengths = concepts.map(c => c.prompt.split(' ').length)
    const averagePromptLength = promptLengths.reduce((sum, len) => sum + len, 0) / promptLengths.length

    // Check for technical specs (camera, lens, aperture)
    const hasTechnicalSpecs = concepts.some(c =>
      /(?:lens|aperture|f\/|mm|distance|framing|shot on)/i.test(c.prompt)
    )

    // Check for lighting details
    const hasLightingDetails = concepts.some(c =>
      /(?:lighting|light|illumination|golden hour|natural light|studio flash)/i.test(c.prompt)
    )

    // Check for brand integration
    const hasBrandIntegration = concepts.some(c =>
      c.components.brandElements && c.components.brandElements.length > 0
    )

    // Assess detail level
    let detailLevel: 'generic' | 'moderate' | 'specific' = 'generic'
    if (averagePromptLength >= 150 && hasTechnicalSpecs && hasLightingDetails) {
      detailLevel = 'specific'
    } else if (averagePromptLength >= 100 && (hasTechnicalSpecs || hasLightingDetails)) {
      detailLevel = 'moderate'
    }

    return {
      averagePromptLength,
      hasTechnicalSpecs,
      hasLightingDetails,
      hasBrandIntegration,
      detailLevel,
    }
  }

  /**
   * Track user experience metrics
   */
  trackUserExperience(
    batchId: string,
    metrics: Partial<UserExperienceMetrics>
  ): void {
    const existing = this.userExperience.get(batchId) || {
      conceptApprovalRate: 0,
      regenerationRequests: 0,
      timeToFirstGeneration: 0,
    }

    this.userExperience.set(batchId, {
      ...existing,
      ...metrics,
    })
  }

  /**
   * Get batch metrics
   */
  getBatchMetrics(batchId: string): BatchMetrics | undefined {
    return this.batches.get(batchId)
  }

  /**
   * Get all batch metrics
   */
  getAllBatchMetrics(): BatchMetrics[] {
    return Array.from(this.batches.values())
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): {
    diversity: {
      avgSimilarityScore: number
      avgPoseRepetitionRate: number
      avgLocationRepetitionRate: number
      avgComponentReuseRate: number
    }
    quality: {
      avgPromptLength: number
      technicalSpecsRate: number
      lightingDetailsRate: number
      brandIntegrationRate: number
      detailLevelDistribution: Record<string, number>
    }
    userExperience: {
      avgApprovalRate: number
      totalRegenerationRequests: number
      avgTimeToFirstGeneration: number
    }
  } {
    const batches = Array.from(this.batches.values())
    const userExp = Array.from(this.userExperience.values())

    if (batches.length === 0) {
      return {
        diversity: {
          avgSimilarityScore: 0,
          avgPoseRepetitionRate: 0,
          avgLocationRepetitionRate: 0,
          avgComponentReuseRate: 0,
        },
        quality: {
          avgPromptLength: 0,
          technicalSpecsRate: 0,
          lightingDetailsRate: 0,
          brandIntegrationRate: 0,
          detailLevelDistribution: {},
        },
        userExperience: {
          avgApprovalRate: 0,
          totalRegenerationRequests: 0,
          avgTimeToFirstGeneration: 0,
        },
      }
    }

    // Diversity metrics
    const avgSimilarityScore =
      batches.reduce((sum, b) => sum + b.diversity.similarityScore, 0) / batches.length
    const avgPoseRepetitionRate =
      batches.reduce((sum, b) => sum + b.diversity.poseRepetitionRate, 0) / batches.length
    const avgLocationRepetitionRate =
      batches.reduce((sum, b) => sum + b.diversity.locationRepetitionRate, 0) / batches.length
    const avgComponentReuseRate =
      batches.reduce((sum, b) => sum + b.diversity.componentReuseRate, 0) / batches.length

    // Quality metrics
    const avgPromptLength =
      batches.reduce((sum, b) => sum + b.quality.averagePromptLength, 0) / batches.length
    const technicalSpecsRate =
      (batches.filter(b => b.quality.hasTechnicalSpecs).length / batches.length) * 100
    const lightingDetailsRate =
      (batches.filter(b => b.quality.hasLightingDetails).length / batches.length) * 100
    const brandIntegrationRate =
      (batches.filter(b => b.quality.hasBrandIntegration).length / batches.length) * 100

    const detailLevelDistribution = batches.reduce((acc, b) => {
      acc[b.quality.detailLevel] = (acc[b.quality.detailLevel] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // User experience metrics
    const avgApprovalRate =
      userExp.length > 0
        ? userExp.reduce((sum, ue) => sum + ue.conceptApprovalRate, 0) / userExp.length
        : 0
    const totalRegenerationRequests = userExp.reduce(
      (sum, ue) => sum + ue.regenerationRequests,
      0
    )
    const avgTimeToFirstGeneration =
      userExp.length > 0
        ? userExp.reduce((sum, ue) => sum + ue.timeToFirstGeneration, 0) / userExp.length
        : 0

    return {
      diversity: {
        avgSimilarityScore,
        avgPoseRepetitionRate,
        avgLocationRepetitionRate,
        avgComponentReuseRate,
      },
      quality: {
        avgPromptLength,
        technicalSpecsRate,
        lightingDetailsRate,
        brandIntegrationRate,
        detailLevelDistribution,
      },
      userExperience: {
        avgApprovalRate,
        totalRegenerationRequests,
        avgTimeToFirstGeneration,
      },
    }
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.batches.clear()
    this.userExperience.clear()
  }
}

// Singleton instance
let globalMetricsTracker: MetricsTracker | null = null

export function getMetricsTracker(): MetricsTracker {
  if (!globalMetricsTracker) {
    globalMetricsTracker = new MetricsTracker()
  }
  return globalMetricsTracker
}
