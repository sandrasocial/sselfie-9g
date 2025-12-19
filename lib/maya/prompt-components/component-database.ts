/**
 * Component Database
 * 
 * Organized storage and retrieval of prompt components extracted from Universal Prompts
 */

import type { PromptComponent, ComponentFilter } from './types'
import { ComponentExtractor } from './component-extractor'
import { UNIVERSAL_PROMPTS_RAW, type RawUniversalPrompt } from './universal-prompts-raw'

export class ComponentDatabase {
  private components: Map<string, PromptComponent> = new Map()
  private byCategory: Map<string, Set<string>> = new Map()
  private byType: Map<string, Set<string>> = new Map()
  private byBrand: Map<string, Set<string>> = new Map()
  private byTag: Map<string, Set<string>> = new Map()
  private initialized: boolean = false
  private extractor: ComponentExtractor

  constructor() {
    this.extractor = new ComponentExtractor()
  }

  /**
   * Add a component to the database
   */
  addComponent(component: PromptComponent): void {
    this.components.set(component.id, component)

    // Index by category
    if (!this.byCategory.has(component.category)) {
      this.byCategory.set(component.category, new Set())
    }
    this.byCategory.get(component.category)!.add(component.id)

    // Index by type
    if (!this.byType.has(component.type)) {
      this.byType.set(component.type, new Set())
    }
    this.byType.get(component.type)!.add(component.id)

    // Index by brand
    if (component.brand) {
      if (!this.byBrand.has(component.brand)) {
        this.byBrand.set(component.brand, new Set())
      }
      this.byBrand.get(component.brand)!.add(component.id)
    }

    // Index by tags
    component.tags.forEach(tag => {
      if (!this.byTag.has(tag)) {
        this.byTag.set(tag, new Set())
      }
      this.byTag.get(tag)!.add(component.id)
    })
  }

  /**
   * Add multiple components at once
   */
  addComponents(components: PromptComponent[]): void {
    components.forEach(component => this.addComponent(component))
  }

  /**
   * Get component by ID
   */
  getComponent(id: string): PromptComponent | undefined {
    return this.components.get(id)
  }

  /**
   * Query components by filters (alias for filter with QueryFilters support)
   */
  query(filters: {
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
  }): PromptComponent[] {
    // Convert QueryFilters to ComponentFilter
    const filter: ComponentFilter = {
      category: filters.category,
      type: filters.type,
      tags: filters.tags,
      excludeIds: filters.exclude,
      brand: filters.brand,
      metadata: {
        ...(filters.poseType && { poseType: filters.poseType as any }),
        ...(filters.locationType && { locationType: filters.locationType as any }),
        ...(filters.lightingType && { lightingType: filters.lightingType as any }),
        ...(filters.framingType && { framing: filters.framingType as any }),
        ...(filters.outfitStyle && { outfitStyle: filters.outfitStyle as any }),
      },
    }
    return this.filter(filter)
  }

  /**
   * Filter components by criteria
   */
  filter(filter: ComponentFilter): PromptComponent[] {
    let candidateIds: Set<string> | null = null

    // Start with category filter
    if (filter.category) {
      candidateIds = new Set(this.byCategory.get(filter.category) || [])
    }

    // Intersect with type filter
    if (filter.type) {
      const typeIds = this.byType.get(filter.type) || new Set()
      if (candidateIds) {
        candidateIds = new Set([...candidateIds].filter(id => typeIds.has(id)))
      } else {
        candidateIds = new Set(typeIds)
      }
    }

    // Intersect with brand filter
    if (filter.brand) {
      const brandIds = this.byBrand.get(filter.brand) || new Set()
      if (candidateIds) {
        candidateIds = new Set([...candidateIds].filter(id => brandIds.has(id)))
      } else {
        candidateIds = new Set(brandIds)
      }
    }

    // Intersect with tag filter
    if (filter.tags && filter.tags.length > 0) {
      const tagIds = filter.tags
        .map(tag => this.byTag.get(tag) || new Set())
        .reduce((acc, ids) => new Set([...acc].filter(id => ids.has(id))), new Set(this.components.keys()))
      
      if (candidateIds) {
        candidateIds = new Set([...candidateIds].filter(id => tagIds.has(id)))
      } else {
        candidateIds = new Set(tagIds)
      }
    }

    // Exclude specified IDs
    if (filter.excludeIds && filter.excludeIds.length > 0) {
      const excludeSet = new Set(filter.excludeIds)
      if (candidateIds) {
        candidateIds = new Set([...candidateIds].filter(id => !excludeSet.has(id)))
      } else {
        candidateIds = new Set([...this.components.keys()].filter(id => !excludeSet.has(id)))
      }
    }

    // If no filters, return all
    if (!candidateIds) {
      candidateIds = new Set(this.components.keys())
    }

    // Get components and apply metadata filter if specified
    let results = Array.from(candidateIds)
      .map(id => this.components.get(id)!)
      .filter(Boolean)

    // Apply metadata filter
    if (filter.metadata) {
      results = results.filter(component => {
        if (!component.metadata) return false
        
        const metadata = filter.metadata!
        return Object.entries(metadata).every(([key, value]) => {
          return component.metadata?.[key as keyof typeof component.metadata] === value
        })
      })
    }

    return results
  }

  /**
   * Get all components for a category
   */
  getByCategory(category: string): PromptComponent[] {
    return this.filter({ category })
  }

  /**
   * Get all components of a type
   */
  getByType(type: PromptComponent['type']): PromptComponent[] {
    return this.filter({ type })
  }

  /**
   * Get brand-specific elements
   */
  getBrandElements(brand: string): PromptComponent[] {
    return this.filter({ brand, type: 'brand_element' })
  }

  /**
   * Get random component matching filter
   */
  getRandom(filter: ComponentFilter): PromptComponent | null {
    const candidates = this.filter(filter)
    if (candidates.length === 0) return null
    
    // Prefer components with lower usage count
    const sorted = candidates.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0))
    
    // Pick from top 30% (less used components)
    const topPercent = Math.max(1, Math.floor(sorted.length * 0.3))
    const selectionPool = sorted.slice(0, topPercent)
    
    return selectionPool[Math.floor(Math.random() * selectionPool.length)]
  }

  /**
   * Get random component matching query filters (alias for getRandom with QueryFilters)
   */
  getRandomComponent(filters: {
    category?: string
    type?: ComponentType
    tags?: string[]
    exclude?: string[]
    poseType?: string
    locationType?: string
    lightingType?: string
    framingType?: string
    outfitStyle?: string
    brand?: string
  }): PromptComponent | null {
    const filter: ComponentFilter = {
      category: filters.category,
      type: filters.type,
      tags: filters.tags,
      excludeIds: filters.exclude,
      brand: filters.brand,
      metadata: {
        ...(filters.poseType && { poseType: filters.poseType as any }),
        ...(filters.locationType && { locationType: filters.locationType as any }),
        ...(filters.lightingType && { lightingType: filters.lightingType as any }),
        ...(filters.framingType && { framing: filters.framingType as any }),
        ...(filters.outfitStyle && { outfitStyle: filters.outfitStyle as any }),
      },
    }
    return this.getRandom(filter)
  }

  /**
   * Increment usage count for a component
   */
  incrementUsage(id: string): void {
    const component = this.components.get(id)
    if (component) {
      component.usageCount = (component.usageCount || 0) + 1
    }
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.byCategory.keys())
  }

  /**
   * Get component count
   */
  getCount(): number {
    return this.components.size
  }

  /**
   * Initialize database from Universal Prompts
   * Extracts components from all raw prompts and adds them to database
   */
  initializeFromUniversalPrompts(): void {
    if (this.initialized) {
      console.log('[ComponentDatabase] Already initialized, skipping')
      return
    }

    console.log('[ComponentDatabase] Initializing from Universal Prompts...')

    let totalExtracted = 0

    // Extract from all categories
    for (const [category, prompts] of Object.entries(UNIVERSAL_PROMPTS_RAW)) {
      if (prompts.length === 0) {
        console.log(`[ComponentDatabase] Skipping empty category: ${category}`)
        continue
      }

      console.log(`[ComponentDatabase] Processing ${prompts.length} prompts for category: ${category}`)

      for (const rawPrompt of prompts) {
        try {
          // Determine brand from category or prompt content
          const brand = this.detectBrand(category, rawPrompt.fullPrompt)

          const extracted = this.extractor.extractComponents({
            id: rawPrompt.id,
            title: rawPrompt.title,
            fullPrompt: rawPrompt.fullPrompt,
            category,
            brand,
          })

          // Add all extracted components
          if (extracted.pose) {
            this.addComponent(extracted.pose)
            totalExtracted++
          }
          if (extracted.outfit) {
            this.addComponent(extracted.outfit)
            totalExtracted++
          }
          if (extracted.location) {
            this.addComponent(extracted.location)
            totalExtracted++
          }
          if (extracted.lighting) {
            this.addComponent(extracted.lighting)
            totalExtracted++
          }
          if (extracted.camera) {
            this.addComponent(extracted.camera)
            totalExtracted++
          }
          if (extracted.styling) {
            this.addComponent(extracted.styling)
            totalExtracted++
          }
          if (extracted.brandElements) {
            extracted.brandElements.forEach(el => {
              this.addComponent(el)
              totalExtracted++
            })
          }
        } catch (error) {
          console.error(`[ComponentDatabase] Error extracting from prompt ${rawPrompt.id}:`, error)
        }
      }
    }

    this.initialized = true
    console.log(`[ComponentDatabase] Initialization complete. Extracted ${totalExtracted} components from ${this.getTotalPromptCount()} prompts`)
  }

  /**
   * Detect brand from category or prompt content
   */
  private detectBrand(category: string, promptText: string): string | undefined {
    const lower = promptText.toLowerCase()
    const categoryLower = category.toLowerCase()

    // Brand detection from category
    if (categoryLower.includes('alo')) return 'ALO'
    if (categoryLower.includes('chanel')) return 'CHANEL'
    if (categoryLower.includes('dior')) return 'DIOR'
    if (categoryLower.includes('glossier')) return 'GLOSSIER'
    if (categoryLower.includes('lululemon') || categoryLower.includes('lulu')) return 'LULULEMON'

    // Brand detection from prompt content
    if (lower.includes('alo ') || lower.includes(' alo')) return 'ALO'
    if (lower.includes('chanel') || lower.includes('cc logo')) return 'CHANEL'
    if (lower.includes('dior')) return 'DIOR'
    if (lower.includes('glossier')) return 'GLOSSIER'
    if (lower.includes('lululemon') || lower.includes('lulu')) return 'LULULEMON'

    return undefined
  }

  /**
   * Get total prompt count across all categories
   */
  private getTotalPromptCount(): number {
    return Object.values(UNIVERSAL_PROMPTS_RAW).reduce((sum, prompts) => sum + prompts.length, 0)
  }

  /**
   * Clear all components (for testing/reset)
   */
  clear(): void {
    this.components.clear()
    this.byCategory.clear()
    this.byType.clear()
    this.byBrand.clear()
    this.byTag.clear()
    this.initialized = false
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// Singleton instance
let globalDatabase: ComponentDatabase | null = null

export function getComponentDatabase(): ComponentDatabase {
  if (!globalDatabase) {
    globalDatabase = new ComponentDatabase()
    // Auto-initialize on first access
    globalDatabase.initializeFromUniversalPrompts()
  }
  return globalDatabase
}

/**
 * Initialize database explicitly (useful for testing or manual initialization)
 */
export function initializeComponentDatabase(): ComponentDatabase {
  const db = getComponentDatabase()
  if (!db.isInitialized()) {
    db.initializeFromUniversalPrompts()
  }
  return db
}
