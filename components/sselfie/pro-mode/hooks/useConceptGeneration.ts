/**
 * useConceptGeneration Hook
 * 
 * Concept generation logic for Pro Mode.
 * Integrates with category system, prompt builder, and image linking.
 */

'use client'

import { useState, useCallback } from 'react'
import { type ImageLibrary } from '@/lib/maya/pro/category-system'

const API_BASE = '/api/maya/pro/generate-concepts'

export interface ProModeConcept {
  id: string
  title: string
  description: string
  category: string
  aesthetic?: string
  linkedImages?: string[]
  fullPrompt?: string
  template?: string
  brandReferences?: string[]
  stylingDetails?: string
  technicalSpecs?: string
  // For compatibility with ConceptData
  prompt?: string
  referenceImageUrl?: string
}

interface UseConceptGenerationReturn {
  concepts: ProModeConcept[]
  isLoading: boolean
  error: string | null
  generateConcepts: (userRequest: string, imageLibrary: ImageLibrary, essenceWords?: string) => Promise<void>
  clearConcepts: () => void
}

/**
 * 🔴 REMOVED: Local concept generation functions
 * 
 * All concept generation is now handled by the API using Maya's personality and expertise.
 * This ensures:
 * - Proper image linking (3-5 images per concept)
 * - Dynamic category determination by Maya
 * - Use of Maya's full fashion knowledge
 */

/**
 * useConceptGeneration Hook
 * 
 * Generates concepts using category system and prompt builder.
 * Handles image linking and API integration.
 */
export function useConceptGeneration(): UseConceptGenerationReturn {
  const [concepts, setConcepts] = useState<ProModeConcept[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Generate concepts from user request
   * 
   * 🔴 FIX: Removed local concept generation - API handles everything
   * This ensures Maya's personality and expertise are used, and proper image linking (3-5 images)
   */
  const generateConcepts = useCallback(
    async (userRequest: string, imageLibrary: ImageLibrary, essenceWords?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        // Validate that selfies are available (required)
        if (imageLibrary.selfies.length === 0) {
          throw new Error('At least one selfie is required to generate concepts')
        }

        // 🔴 FIX: Call API directly - let Maya generate concepts using her personality
        console.log('[useConceptGeneration] Calling API to generate concepts with Maya\'s expertise')
        
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userRequest,
            imageLibrary,
            category: null, // Let Maya determine categories dynamically
            essenceWords,
            // Don't send pre-generated concepts - let API do all the work
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }))
          throw new Error(errorData.error || `API returned ${response.status}`)
        }

        const apiData = await response.json()
        
        if (!apiData.concepts || !Array.isArray(apiData.concepts)) {
          throw new Error('API did not return valid concepts array')
        }

        if (apiData.concepts.length === 0) {
          throw new Error('API returned empty concepts array')
        }

        console.log('[useConceptGeneration] API generated', apiData.concepts.length, 'concepts')
        console.log('[useConceptGeneration] First concept category:', apiData.concepts[0]?.category)
        console.log('[useConceptGeneration] First concept linkedImages:', apiData.concepts[0]?.linkedImages?.length || 0)

        // Use API's concepts directly - they have proper image linking and Maya's expertise
        setConcepts(apiData.concepts)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate concepts'
        console.error('[useConceptGeneration] Error generating concepts:', err)
        setError(errorMessage)
        setConcepts([])
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  /**
   * Clear all concepts
   */
  const clearConcepts = useCallback(() => {
    setConcepts([])
    setError(null)
  }, [])

  return {
    concepts,
    isLoading,
    error,
    generateConcepts,
    clearConcepts,
  }
}
