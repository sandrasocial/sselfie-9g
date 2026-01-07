"use client"

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography, Colors, BorderRadius, Spacing, UILabels, ButtonLabels } from '@/lib/maya/pro/design-system'
import { X, Save, Bookmark } from 'lucide-react'
import InstagramPhotoCard from '../instagram-photo-card'
import ProPhotoshootPanel from '../pro-photoshoot-panel'
import InstagramCarouselCard from '../instagram-carousel-card'
import { useToast } from '@/hooks/use-toast'

/**
 * ConceptCardPro Component
 * 
 * Editorial quality concept card for Studio Pro Mode.
 * Displays concept details with sophisticated styling.
 * 
 * Design principles:
 * - NO emojis in UI elements
 * - Professional typography (Hatton, Inter)
 * - Stone palette colors
 * - Editorial, luxury design
 */

interface ConceptCardProProps {
  concept: {
    id: string
    title: string
    description: string
    category?: string
    aesthetic?: string
    linkedImages?: string[]
    fullPrompt?: string
    template?: string
    brandReferences?: string[]
    stylingDetails?: string
    technicalSpecs?: string
    generatedImageUrl?: string // Image URL from JSONB (for persistence)
    predictionId?: string // Prediction ID for Pro Mode (for persistence)
  }
  onGenerate?: () => Promise<{ predictionId?: string; generationId?: string } | void>
  onViewPrompt?: () => void
  onEditPrompt?: () => void
  onPromptUpdate?: (conceptId: string, newFullPrompt: string) => void
  isGenerating?: boolean
  onImageGenerated?: () => void
  isAdmin?: boolean // Admin mode - enables save to guide functionality
  selectedGuideId?: number | null // Selected guide ID for saving
  onSaveToGuide?: (concept: any, imageUrl?: string) => void // Save handler from parent
  messageId?: string // Message ID for updating JSONB when image is generated
}

export default function ConceptCardPro({
  concept,
  onGenerate,
  onViewPrompt,
  onEditPrompt,
  onPromptUpdate,
  isGenerating = false,
  onImageGenerated,
  isAdmin = false,
  selectedGuideId = null,
  onSaveToGuide,
  messageId,
}: ConceptCardProProps) {
  const { toast } = useToast()
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState(concept.fullPrompt || '')

  // Sync editedPrompt with concept.fullPrompt when concept changes (but not when editing)
  useEffect(() => {
    if (!isEditingPrompt) {
      setEditedPrompt(concept.fullPrompt || '')
    }
  }, [concept.fullPrompt, isEditingPrompt])
  const [isGenerated, setIsGenerated] = useState(false)
  // CRITICAL FIX: Initialize generatedImageUrl from concept prop (for persistence on page refresh)
  // This allows images loaded from database to be displayed immediately
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    (concept as any).generatedImageUrl || null
  )
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [isGeneratingState, setIsGeneratingState] = useState(false)
  const [isFavoriteState, setIsFavoriteState] = useState(false)
  
  // Pro Photoshoot state
  const [isCreatingProPhotoshoot, setIsCreatingProPhotoshoot] = useState(false)
  const [proPhotoshootSessionId, setProPhotoshootSessionId] = useState<number | null>(null)
  const [proPhotoshootError, setProPhotoshootError] = useState<string | null>(null)
  const [proPhotoshootGrids, setProPhotoshootGrids] = useState<Array<{
    id?: number
    gridNumber: number
    status: "pending" | "generating" | "completed" | "failed"
    gridUrl?: string
    predictionId?: string
  }>>([])
  const [isGeneratingGrids, setIsGeneratingGrids] = useState(false)
  const [proPhotoshootOriginalImageId, setProPhotoshootOriginalImageId] = useState<number | null>(null)
  const [proPhotoshootCarousel, setProPhotoshootCarousel] = useState<{
    gridId: number
    gridNumber: number
    frames: string[]
    galleryImageIds: number[]
  } | null>(null)
  const [isCreatingCarousel, setIsCreatingCarousel] = useState(false)
  const [creatingCarouselForGridId, setCreatingCarouselForGridId] = useState<number | null>(null)
  
  // Use refs to persist values across remounts and avoid stale closures
  const predictionIdRef = useRef<string | null>(null)
  const generationIdRef = useRef<string | null>(null)
  // Store polling interval ref outside effect to persist across remounts
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Sync refs with state
  useEffect(() => {
    predictionIdRef.current = predictionId
  }, [predictionId])
  
  useEffect(() => {
    generationIdRef.current = generationId
  }, [generationId])

  // Debug: Log state changes
  useEffect(() => {
    console.log('[ConceptCardPro] 🔍 State changed:', {
      isGenerated,
      hasGeneratedImageUrl: !!generatedImageUrl,
      generatedImageUrl: generatedImageUrl?.substring(0, 100) || 'null',
      predictionId,
      generationId,
      isGeneratingState,
    })
  }, [isGenerated, generatedImageUrl, predictionId, generationId, isGeneratingState])

  // CRITICAL FIX: Update generatedImageUrl when concept prop changes (for persistence on page refresh)
  // This ensures images loaded from database are displayed immediately
  useEffect(() => {
    const conceptImageUrl = (concept as any).generatedImageUrl
    if (conceptImageUrl && conceptImageUrl !== generatedImageUrl) {
      console.log('[ConceptCardPro] ✅ Restoring generatedImageUrl from concept prop:', conceptImageUrl)
      setGeneratedImageUrl(conceptImageUrl)
      setIsGenerated(true)
      // Clear localStorage if we have a fresh image from database (avoids stale cache)
      const storageKey = `pro-generation-${concept.id}`
      localStorage.removeItem(storageKey)
    }
  }, [concept, generatedImageUrl, concept.id])

  // Restore polling state from localStorage on mount (survives remounts)
  // This MUST run first before polling starts
  useEffect(() => {
    const storageKey = `pro-generation-${concept.id}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const { predictionId: savedPredictionId, generationId: savedGenerationId, isGenerated: savedIsGenerated, generatedImageUrl: savedImageUrl } = JSON.parse(saved)
        
        // PRIORITY: If generation is complete, restore that first and exit
        if (savedIsGenerated && savedImageUrl) {
          // Restore completed generation - BOTH must be present
          // Verify the image URL is valid BEFORE setting state
          if (!savedImageUrl || typeof savedImageUrl !== 'string' || savedImageUrl.length === 0) {
            console.warn('[ConceptCardPro] ⚠️ Invalid imageUrl in localStorage, clearing state')
            localStorage.removeItem(storageKey)
            setIsGenerated(false)
            setGeneratedImageUrl(null)
          } else {
            // Image URL is valid, restore state and STOP - don't start polling
            console.log('[ConceptCardPro] ✅ Restoring completed generation from localStorage:', { 
              hasImageUrl: !!savedImageUrl, 
              imageUrlPreview: savedImageUrl?.substring(0, 100),
              imageUrlLength: savedImageUrl?.length 
            })
            setIsGenerated(true)
            setGeneratedImageUrl(savedImageUrl)
            // Clear any polling refs - generation is done
            predictionIdRef.current = null
            generationIdRef.current = null
            setIsGeneratingState(false)
            // Don't restore predictionId/generationId - generation is complete
            return // Exit early - don't restore polling state
          }
        } else if (savedIsGenerated && !savedImageUrl) {
          // If isGenerated is true but no imageUrl, something went wrong - reset state
          console.warn('[ConceptCardPro] ⚠️ Found isGenerated=true but no imageUrl in localStorage, resetting state')
          localStorage.removeItem(storageKey)
          setIsGenerated(false)
        }
        
        // Only restore polling state if generation is NOT complete
        if (savedPredictionId && savedGenerationId && !savedIsGenerated) {
          // Only restore if generation is still in progress
          console.log('[ConceptCardPro] 🔄 Restoring polling state from localStorage:', { savedPredictionId, savedGenerationId })
          // CRITICAL: Set refs FIRST (they persist across remounts)
          predictionIdRef.current = savedPredictionId
          generationIdRef.current = savedGenerationId
          // Then set state (triggers re-render and polling effect)
          setPredictionId(savedPredictionId)
          setGenerationId(savedGenerationId)
          setIsGeneratingState(true)
        }
      } catch (err) {
        console.error('[ConceptCardPro] ❌ Error restoring state from localStorage:', err)
      }
    }
  }, [concept.id]) // Only run on mount/concept change

  // Persist state to localStorage whenever it changes
  // CRITICAL: Use refs for localStorage updates to ensure we're saving the latest values
  useEffect(() => {
    const storageKey = `pro-generation-${concept.id}`
    // Always check refs first, then fall back to state
    const currentPredictionId = predictionIdRef.current || predictionId
    const currentGenerationId = generationIdRef.current || generationId
    
    if (currentPredictionId && currentGenerationId) {
      localStorage.setItem(storageKey, JSON.stringify({
        predictionId: currentPredictionId,
        generationId: currentGenerationId,
        isGenerated,
        generatedImageUrl,
      }))
    } else if (isGenerated && generatedImageUrl) {
      // Keep completed state
      localStorage.setItem(storageKey, JSON.stringify({
        predictionId: null,
        generationId: null,
        isGenerated: true,
        generatedImageUrl,
      }))
    } else {
      // Only clear if truly no active generation (don't clear during remounts)
      // Keep existing localStorage entry if refs have values but state hasn't updated yet
      const saved = localStorage.getItem(storageKey)
      if (!saved || (!currentPredictionId && !isGenerated)) {
        localStorage.removeItem(storageKey)
      }
    }
  }, [predictionId, generationId, isGenerated, generatedImageUrl, concept.id])

  const handleViewPrompt = () => {
    setShowPromptModal(true)
    setEditedPrompt(concept.fullPrompt || '')
    setIsEditingPrompt(false)
    if (onViewPrompt) {
      onViewPrompt()
    }
  }

  const handleStartEdit = () => {
    setIsEditingPrompt(true)
    setEditedPrompt(concept.fullPrompt || '')
  }

  const handleCancelEdit = () => {
    setIsEditingPrompt(false)
    setEditedPrompt(concept.fullPrompt || '')
  }

  const handleSavePrompt = () => {
    if (onPromptUpdate && editedPrompt.trim() !== (concept.fullPrompt || '')) {
      onPromptUpdate(concept.id, editedPrompt.trim())
    }
    setIsEditingPrompt(false)
  }

  const [isSavingToGuide, setIsSavingToGuide] = useState(false)

  const handleSaveToGuide = async () => {
    if (!onSaveToGuide) {
      console.warn("[ConceptCardPro] onSaveToGuide handler not provided")
      toast({
        title: "Error",
        description: "Save to guide functionality is not available",
        variant: "destructive",
      })
      return
    }

    if (!selectedGuideId) {
      toast({
        title: "No guide selected",
        description: "Please select a guide from the dropdown at the top of the page",
        variant: "destructive",
      })
      return
    }

    setIsSavingToGuide(true)
    try {
      // Call parent handler - it should show success/error/duplicate toast
      await onSaveToGuide(concept, generatedImageUrl || undefined)
      // Parent's handler will show appropriate toast (success, duplicate, or error)
      // No need to show duplicate toast here as parent handles it
    } catch (error) {
      console.error("[ConceptCardPro] Error saving to guide:", error)
      // Only show error toast if parent didn't handle it (shouldn't happen, but backup)
      const errorMessage = error instanceof Error ? error.message : "Could not save prompt to guide. Please try again."
      // Don't show error toast if it's a duplicate (parent already handled it)
      if (!errorMessage.includes("already exists") && !errorMessage.includes("Already saved")) {
        toast({
          title: "Failed to save",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsSavingToGuide(false)
    }
  }

  const handleGenerate = async () => {
    console.log('[ConceptCardPro] 🎬 Generate button clicked')
    if (!onGenerate) {
      console.error('[ConceptCardPro] ❌ No onGenerate callback provided')
      return
    }
    
    // CRITICAL FIX: Reset all generation state when generating again
    // This ensures the old image is cleared and polling starts fresh
    console.log('[ConceptCardPro] 🔄 Resetting state for new generation...')
    setIsGenerated(false)
    setGeneratedImageUrl(null)
    setError(null)
    setIsGeneratingState(true)
    
    // Clear any existing polling intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    
    // Clear previous prediction/generation IDs (will be set by new generation)
    setPredictionId(null)
    setGenerationId(null)
    predictionIdRef.current = null
    generationIdRef.current = null
    
    // Clear localStorage entry for this concept to start fresh
    const storageKey = `pro-generation-${concept.id}`
    localStorage.removeItem(storageKey)
    
    console.log('[ConceptCardPro] 📤 Calling onGenerate callback...')
    
    try {
      const result = await onGenerate()
      console.log('[ConceptCardPro] ✅ onGenerate completed, result:', {
        hasPredictionId: !!result?.predictionId,
        hasGenerationId: !!result?.generationId,
        predictionId: result?.predictionId,
        generationId: result?.generationId,
      })
      
      if (result?.predictionId) {
        setPredictionId(result.predictionId)
        predictionIdRef.current = result.predictionId
        console.log('[ConceptCardPro] 📝 Set predictionId:', result.predictionId)
      }
      if (result?.generationId) {
        setGenerationId(result.generationId)
        generationIdRef.current = result.generationId
        console.log('[ConceptCardPro] 📝 Set generationId:', result.generationId)
      }
      
      // If no IDs returned, something went wrong
      if (!result?.predictionId && !result?.generationId) {
        console.warn('[ConceptCardPro] ⚠️ No predictionId or generationId returned from onGenerate')
        setError('Generation started but no tracking IDs were returned. Please try again.')
        setIsGeneratingState(false)
      }
    } catch (err) {
      console.error('[ConceptCardPro] ❌ Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate image')
      setIsGeneratingState(false)
    }
  }

  // Pro Photoshoot handlers
  const handleCreateProPhotoshoot = async () => {
    if (!generatedImageUrl) {
      console.error("[ProPhotoshoot] Missing generatedImageUrl")
      return
    }

    setIsCreatingProPhotoshoot(true)
    setProPhotoshootError(null)

    try {
      // Get avatar images from concept.linkedImages
      const avatarImages = concept.linkedImages || []
      
      if (avatarImages.length === 0) {
        throw new Error("Avatar images are required for Pro Photoshoot. Please link images to this concept first.")
      }

      // Get originalImageId - look up ai_images by prediction_id or image_url
      let originalImageId: number | null = null

      // Try to get image ID from prediction_id (most reliable)
      if (predictionId) {
        try {
          const lookupResponse = await fetch(`/api/maya/pro/photoshoot/lookup-image?predictionId=${predictionId}`)
          if (lookupResponse.ok) {
            const lookupData = await lookupResponse.json()
            originalImageId = lookupData.imageId
          }
        } catch (lookupError) {
          console.warn("[ProPhotoshoot] Could not lookup by predictionId:", lookupError)
        }
      }

      // Fallback: Try by image URL
      if (!originalImageId && generatedImageUrl) {
        try {
          const lookupResponse = await fetch(`/api/maya/pro/photoshoot/lookup-image?imageUrl=${encodeURIComponent(generatedImageUrl)}`)
          if (lookupResponse.ok) {
            const lookupData = await lookupResponse.json()
            originalImageId = lookupData.imageId
          }
        } catch (lookupError) {
          console.warn("[ProPhotoshoot] Could not lookup by imageUrl:", lookupError)
        }
      }

      if (!originalImageId) {
        throw new Error("Could not find image ID. The image may not be saved to gallery yet.")
      }

      // Start Pro Photoshoot session
      const sessionResponse = await fetch("/api/maya/pro/photoshoot/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          originalImageId,
          totalGrids: 8,
          avatarImages,
        }),
      })

      const sessionData = await sessionResponse.json()

      if (!sessionResponse.ok) {
        throw new Error(sessionData.error || "Failed to start Pro Photoshoot session")
      }

      console.log("[ProPhotoshoot] ✅ Session started:", sessionData.sessionId)
      setProPhotoshootSessionId(sessionData.sessionId)
      setProPhotoshootOriginalImageId(originalImageId)

      // Get Maya-generated prompt for Grid 1
      let mayaGeneratedPrompt: string | null = null
      try {
        console.log("[ProPhotoshoot] 🎨 Asking Maya to generate prompt for Grid 1...")
        
        const mayaPromptResponse = await fetch("/api/maya/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-chat-type": "pro-photoshoot",
            "x-pro-photoshoot": "true",
            "x-studio-pro-mode": "true",
          },
          credentials: "include",
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Create a prompt for a 3x3 Pro Photoshoot grid based on this concept: "${concept.description || concept.title}". 

Concept details:
- Title: ${concept.title}
- Description: ${concept.description || "No description"}
- Category: ${concept.category || "General"}
- Outfit/Style: ${concept.description || concept.title}

Focus on the outfit, location, and color grade. Output only the full ready-to-use prompt for Nano Banana Pro. Do not include any explanations or additional text - just the prompt.`,
              },
            ],
          }),
        })

        const mayaPromptData = await mayaPromptResponse.json()
        
        if (mayaPromptResponse.ok && mayaPromptData.response) {
          mayaGeneratedPrompt = mayaPromptData.response.trim()
          console.log("[ProPhotoshoot] ✅ Maya generated prompt for Grid 1:", mayaGeneratedPrompt.substring(0, 100) + "...")
        } else {
          console.warn("[ProPhotoshoot] ⚠️ Maya prompt generation failed, will use fallback:", mayaPromptData.error)
        }
      } catch (mayaError) {
        console.error("[ProPhotoshoot] ❌ Error getting prompt from Maya:", mayaError)
      }

      // Auto-generate Grid 1
      const gridResponse = await fetch("/api/maya/pro/photoshoot/generate-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          originalImageId,
          gridNumber: 1,
          sessionId: sessionData.sessionId,
          avatarImages,
          customPromptData: {
            mayaGeneratedPrompt: mayaGeneratedPrompt || undefined,
            outfit: concept.description || concept.title,
            location: concept.category || "modern setting",
            colorGrade: "natural tones",
          },
        }),
      })

      const gridData = await gridResponse.json()

      if (!gridResponse.ok) {
        throw new Error(gridData.error || "Failed to generate Grid 1")
      }

      console.log("[ProPhotoshoot] ✅ Grid 1 generation started:", gridData.predictionId)

      // Initialize grid state
      setProPhotoshootGrids([
        {
          id: gridData.gridId,
          gridNumber: 1,
          status: "generating",
          predictionId: gridData.predictionId,
        },
      ])

      // Start polling for Grid 1 completion
      pollGridStatus(gridData.gridId, gridData.predictionId, 1)

    } catch (err) {
      console.error("[ProPhotoshoot] ❌ Error creating Pro Photoshoot:", err)
      setProPhotoshootError(err instanceof Error ? err.message : "Failed to create Pro Photoshoot")
    } finally {
      setIsCreatingProPhotoshoot(false)
    }
  }

  // Poll grid status until completion
  const pollGridStatus = async (gridId: number, predictionId: string, gridNumber: number) => {
    const maxAttempts = 120
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/maya/pro/photoshoot/check-grid?predictionId=${predictionId}&gridId=${gridId}`
        )
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to check grid status")
        }

        if (data.status === "completed") {
          console.log(`[ProPhotoshoot] ✅ Grid ${gridNumber} completed`)
          
          setProPhotoshootGrids((prev) =>
            prev.map((g) =>
              g.gridNumber === gridNumber
                ? {
                    ...g,
                    status: "completed" as const,
                    gridUrl: data.gridUrl,
                  }
                : g
            )
          )

          return
        } else if (data.status === "failed") {
          console.error(`[ProPhotoshoot] ❌ Grid ${gridNumber} failed`)
          
          setProPhotoshootGrids((prev) =>
            prev.map((g) =>
              g.gridNumber === gridNumber
                ? {
                    ...g,
                    status: "failed" as const,
                  }
                : g
            )
          )

          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          console.error(`[ProPhotoshoot] ⏱️ Grid ${gridNumber} polling timed out`)
          setProPhotoshootGrids((prev) =>
            prev.map((g) =>
              g.gridNumber === gridNumber
                ? {
                    ...g,
                    status: "failed" as const,
                  }
                : g
            )
          )
        }
      } catch (err) {
        console.error(`[ProPhotoshoot] ❌ Error polling grid ${gridNumber}:`, err)
        setProPhotoshootGrids((prev) =>
          prev.map((g) =>
            g.gridNumber === gridNumber
              ? {
                  ...g,
                  status: "failed" as const,
                }
              : g
          )
        )
      }
    }

    poll()
  }

  // Generate a single grid
  const generateGrid = async (gridNumber: number, avatarImages: string[], sessionId: number) => {
    try {
      if (!proPhotoshootOriginalImageId) {
        throw new Error("Original image ID not found. Please restart Pro Photoshoot.")
      }

      const response = await fetch("/api/maya/pro/photoshoot/generate-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          originalImageId: proPhotoshootOriginalImageId,
          gridNumber,
          sessionId,
          avatarImages,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate grid")
      }

      setProPhotoshootGrids((prev) => [
        ...prev,
        {
          id: data.gridId,
          gridNumber,
          status: "generating" as const,
          predictionId: data.predictionId,
        },
      ])

      pollGridStatus(data.gridId, data.predictionId, gridNumber)

      return data
    } catch (error) {
      console.error(`[ProPhotoshoot] ❌ Error generating grid ${gridNumber}:`, error)
      throw error
    }
  }

  // Generate multiple grids (max 3 at once)
  const generateGrids = async (count: number) => {
    if (!proPhotoshootSessionId) {
      throw new Error("No active Pro Photoshoot session")
    }

    setIsGeneratingGrids(true)

    try {
      const avatarImages = concept.linkedImages || []
      if (avatarImages.length === 0) {
        throw new Error("Avatar images required")
      }

      const gridsToGenerate = Math.min(count, 3)
      const nextGridNumber = proPhotoshootGrids.length + 1

      const promises = Array.from({ length: gridsToGenerate }, (_, i) =>
        generateGrid(nextGridNumber + i, avatarImages, proPhotoshootSessionId)
      )

      await Promise.all(promises)
    } catch (error) {
      console.error("[ProPhotoshoot] ❌ Error generating grids:", error)
      setProPhotoshootError(error instanceof Error ? error.message : "Failed to generate grids")
    } finally {
      setIsGeneratingGrids(false)
    }
  }

  // Create carousel from grid
  const handleCreateCarousel = async (gridId: number, gridNumber: number) => {
    setIsCreatingCarousel(true)
    setCreatingCarouselForGridId(gridId)

    try {
      const response = await fetch("/api/maya/pro/photoshoot/create-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gridId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create carousel")
      }

      console.log(`[ProPhotoshoot] ✅ Carousel created for Grid ${gridNumber}:`, data.framesCount, "frames")

      setProPhotoshootCarousel({
        gridId: data.gridId,
        gridNumber: data.gridNumber || gridNumber,
        frames: data.frames || [],
        galleryImageIds: data.galleryImageIds || [],
      })
    } catch (error) {
      console.error("[ProPhotoshoot] ❌ Error creating carousel:", error)
      setProPhotoshootError(error instanceof Error ? error.message : "Failed to create carousel")
    } finally {
      setIsCreatingCarousel(false)
      setCreatingCarouselForGridId(null)
    }
  }

  const handleFavoriteToggle = async () => {
    if (!generationId) {
      console.warn('[ConceptCardPro] Cannot toggle favorite: no generationId')
      return
    }

    const newFavoriteState = !isFavoriteState
    console.log('[ConceptCardPro] Toggling favorite:', {
      generationId,
      currentState: isFavoriteState,
      newState: newFavoriteState,
      imageId: `ai_${generationId}`
    })

    try {
      const response = await fetch("/api/images/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: `ai_${generationId}`,
          isFavorite: newFavoriteState,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('[ConceptCardPro] API error response:', errorText)
        throw new Error("Failed to toggle favorite")
      }

      console.log('[ConceptCardPro] ✅ Favorite toggle API call succeeded')
      setIsFavoriteState(newFavoriteState)
    } catch (error) {
      console.error("[ConceptCardPro] Error toggling favorite:", error)
    }
  }

  // Poll for generation status (matches Classic Mode exactly)
  useEffect(() => {
    // Match Classic Mode: Skip if already generated OR missing required IDs
    // Pro Mode only needs predictionId (not generationId like Classic Mode)
    if (isGenerated || !predictionId) {
      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    console.log('[ConceptCardPro] 🔄 Starting polling with:', {
      predictionId,
      generationId,
      isGenerated,
      hasImageUrl: !!generatedImageUrl
    })

    // Match Classic Mode: Use closure values (predictionId captured when interval is created)
    // Capture values in closure to prevent stale closures
    const pollPredictionId = predictionId
    const pollConceptId = concept.id
    const pollOnImageGenerated = onImageGenerated
    
    // Store interval reference so poll function can clear it
    let pollIntervalRef: NodeJS.Timeout | null = null
    let pollAttempts = 0
    const MAX_POLL_ATTEMPTS = 120 // 10 minutes max (120 * 5 seconds)
    
    // Poll function that can be called immediately or via interval
    const poll = async () => {
      pollAttempts++
      
      // Stop polling after max attempts
      if (pollAttempts > MAX_POLL_ATTEMPTS) {
        console.error('[ConceptCardPro] ❌ Max polling attempts reached, stopping')
        setError('Generation is taking longer than expected. Please try again.')
        setIsGeneratingState(false)
        if (pollIntervalRef) {
          clearInterval(pollIntervalRef)
          pollIntervalRef = null
        }
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        return
      }
      try {
        console.log('[ConceptCardPro] 🔍 Polling check-generation API for:', pollPredictionId)
        const response = await fetch(
          `/api/maya/pro/check-generation?predictionId=${pollPredictionId}`,
          { credentials: 'include' }
        )
        
        if (!response.ok) {
          // Handle 499 (Client Closed Request) gracefully - continue polling
          if (response.status === 499) {
            console.warn('[ConceptCardPro] ⚠️ Client closed request (499), continuing to poll...')
            return // Continue polling - this is a timeout/connection issue, not a failure
          }
          console.error('[ConceptCardPro] ❌ Polling response not OK:', response.status, response.statusText)
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('[ConceptCardPro] Error response:', errorText.substring(0, 200))
          return // Continue polling on error
        }

        const data = await response.json()
        console.log('[ConceptCardPro] 📊 Polling response:', {
          status: data.status,
          hasImageUrl: !!data.imageUrl,
          imageUrlPreview: data.imageUrl ? data.imageUrl.substring(0, 100) : 'none',
          error: data.error || null,
          fullResponse: JSON.stringify(data).substring(0, 300),
        })

        if (data.status === 'succeeded') {
          // Match Classic Mode: check for imageUrl and set it
          if (data.imageUrl) {
            console.log('[ConceptCardPro] ✅✅✅ Generation succeeded! Setting image URL:', {
              fullUrl: data.imageUrl,
              urlLength: data.imageUrl.length,
              urlPreview: data.imageUrl.substring(0, 100),
              conceptId: pollConceptId,
            })
            
            // Match Classic Mode: Set state and clear interval
            setGeneratedImageUrl(data.imageUrl)
            setIsGenerated(true)
            setIsGeneratingState(false)
            // Reset favorite state when new image is generated
            setIsFavoriteState(false)
            if (pollIntervalRef) {
              clearInterval(pollIntervalRef)
              pollIntervalRef = null
            }
            
            console.log('[ConceptCardPro] ✅✅✅ Generation succeeded! Image URL set, polling stopped.')
            
            // CRITICAL FIX: Save generatedImageUrl and predictionId to JSONB for persistence
            // This ensures images persist on page refresh
            if (messageId && pollPredictionId) {
              try {
                console.log('[ConceptCardPro] 💾 Attempting to save to JSONB:', {
                  messageId,
                  conceptId: pollConceptId,
                  predictionId: pollPredictionId,
                  hasImageUrl: !!data.imageUrl,
                })
                
                // CRITICAL: Use pollConceptId to ensure ID matches what's in JSONB
                const updatedConcept = {
                  ...concept,
                  id: pollConceptId, // Ensure ID matches (might be different from concept.id if concept was updated)
                  generatedImageUrl: data.imageUrl,
                  predictionId: pollPredictionId,
                }
                
                const response = await fetch('/api/maya/update-message', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    messageId: messageId,
                    content: '', // Preserve existing content (API will handle this)
                    conceptCards: [updatedConcept], // API will merge with existing concepts
                  }),
                })
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                  throw new Error(`Failed to save: ${response.status} - ${errorData.error || 'Unknown error'}`)
                }
                
                const result = await response.json()
                console.log('[ConceptCardPro] ✅ Saved image to JSONB:', {
                  messageId,
                  conceptId: pollConceptId,
                  imageUrl: data.imageUrl.substring(0, 50),
                  success: result.success,
                })
              } catch (jsonbError: any) {
                console.error('[ConceptCardPro] ❌ Error saving to JSONB:', {
                  messageId,
                  conceptId: pollConceptId,
                  error: jsonbError?.message || jsonbError,
                  stack: jsonbError?.stack,
                })
                // Don't fail - image still shows in UI, just won't persist on refresh
              }
            } else {
              console.warn('[ConceptCardPro] ⚠️ Cannot save to JSONB - missing required data:', {
                hasMessageId: !!messageId,
                hasPredictionId: !!pollPredictionId,
                messageId,
                predictionId: pollPredictionId,
              })
            }
            
            // NOTE: localStorage removed - JSONB is now the source of truth
            // Images persist permanently in database JSONB, no need for localStorage backup
            
            if (pollOnImageGenerated) {
              pollOnImageGenerated()
            }
          } else {
            console.warn('[ConceptCardPro] ⚠️ Generation succeeded but no imageUrl in response', {
              status: data.status,
              fullResponse: JSON.stringify(data).substring(0, 300),
            })
            // Continue polling if imageUrl is missing - might be a race condition
          }
        } else if (data.status === 'failed') {
          // Match Classic Mode: Set error and clear interval
          console.error('[ConceptCardPro] ❌ Generation failed:', data.error)
          setError(data.error || 'Generation failed')
          setIsGeneratingState(false)
          if (pollIntervalRef) {
            clearInterval(pollIntervalRef)
            pollIntervalRef = null
          }
          
          // Clear localStorage on failure
          const storageKey = `pro-generation-${pollConceptId}`
          localStorage.removeItem(storageKey)
        } else {
          // Still processing
          console.log('[ConceptCardPro] ⏳ Still processing, status:', data.status)
        }
      } catch (err: any) {
        // Handle network errors and 499 errors gracefully - continue polling
        const errorMessage = err?.message || String(err)
        if (errorMessage.includes('499') || errorMessage.includes('Client Closed Request') || errorMessage.includes('fetch')) {
          console.warn('[ConceptCardPro] ⚠️ Network/timeout error during polling, continuing...', errorMessage)
          return // Continue polling - don't stop on network errors
        }
        // Match Classic Mode: Set error and stop polling on catch for other errors
        console.error('[ConceptCardPro] ❌ Error polling generation:', err)
        setError('Failed to check generation status')
        setIsGeneratingState(false)
        if (pollIntervalRef) {
          clearInterval(pollIntervalRef)
          pollIntervalRef = null
        }
      }
    }
    
    // Create interval FIRST so pollIntervalRef is available if poll completes immediately
    pollIntervalRef = setInterval(poll, 3000)
    
    // Then start polling immediately (don't wait 3 seconds for first poll)
    // pollIntervalRef is now set, so if generation completes during this call,
    // the interval can be properly cleared
    poll()

    console.log('[ConceptCardPro] ✅ Polling interval started (immediate first poll + interval)')

    // Match Classic Mode: Cleanup function
    return () => {
      console.log('[ConceptCardPro] 🛑 Polling interval cleared (cleanup)', {
        predictionId: pollPredictionId,
        conceptId: pollConceptId
      })
      if (pollIntervalRef) {
        clearInterval(pollIntervalRef)
        pollIntervalRef = null
      }
    }
    // Match Classic Mode: Keep dependency array consistent size
    // Note: onImageGenerated and concept.id are captured in closure, not used from deps
    // But we include them so effect restarts if they change (which shouldn't happen often)
  }, [predictionId, generationId, isGenerated])

  // Image thumbnails component
  const ImageThumbnailsGrid = ({ images }: { images: string[] }) => {
    if (!images || images.length === 0) return null
    
    return (
      <div className="grid grid-cols-3 gap-2 mt-2">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className="aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
            style={{
              borderColor: Colors.border,
              borderRadius: BorderRadius.image || '8px',
            }}
            onClick={() => {
              // TODO: Open full-size modal
              window.open(imageUrl, '_blank')
            }}
          >
            <img
              src={imageUrl}
              alt={`Linked image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg'
              }}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div
        className="bg-white rounded-xl p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 border"
        style={{
          borderRadius: BorderRadius.card,
          borderColor: Colors.border,
          backgroundColor: Colors.surface,
        }}
      >
        {/* Title */}
        <h3
          style={{
            fontFamily: Typography.subheaders.fontFamily,
            fontSize: 'clamp(18px, 4vw, 22px)',
            fontWeight: Typography.subheaders.weights.regular,
            color: Colors.textPrimary,
            lineHeight: Typography.subheaders.lineHeight,
            letterSpacing: Typography.subheaders.letterSpacing,
          }}
        >
          {concept.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontFamily: Typography.body.fontFamily,
            fontSize: 'clamp(14px, 3vw, 16px)',
            fontWeight: Typography.body.weights.light,
            color: Colors.textSecondary,
            lineHeight: Typography.body.lineHeight,
            letterSpacing: Typography.body.letterSpacing,
          }}
        >
          {concept.description}
        </p>

        {/* Dividing line */}
        <div
          style={{
            height: '1px',
            backgroundColor: Colors.border,
            width: '100%',
          }}
        />

        {/* Images Linked */}
        {concept.linkedImages && concept.linkedImages.length > 0 && (
          <div className="space-y-2">
            <p
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.medium,
                color: Colors.textPrimary,
              }}
            >
              {UILabels.imagesLinked(concept.linkedImages.length)}
            </p>
            <ImageThumbnailsGrid images={concept.linkedImages} />
          </div>
        )}

        {/* Category */}
        {concept.category && (
          <div className="space-y-1">
            <p
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.xs,
                fontWeight: Typography.ui.weights.medium,
                color: Colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {UILabels.category(concept.category)}
            </p>
          </div>
        )}

        {/* Aesthetic */}
        {concept.aesthetic && (
          <div className="space-y-1">
            <p
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.xs,
                fontWeight: Typography.ui.weights.medium,
                color: Colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {UILabels.aesthetic(concept.aesthetic)}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
          {/* View Prompt button */}
          <button
            onClick={handleViewPrompt}
            className="touch-manipulation active:scale-95"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: 'clamp(13px, 3vw, 14px)',
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.01em',
              color: Colors.primary,
              backgroundColor: 'transparent',
              padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
              minHeight: '44px',
              borderRadius: BorderRadius.button,
              border: `1px solid ${Colors.border}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = Colors.hover
              e.currentTarget.style.borderColor = Colors.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = Colors.border
            }}
          >
            {ButtonLabels.viewPrompt}
          </button>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isGeneratingState}
            className="touch-manipulation active:scale-95 disabled:active:scale-100"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: 'clamp(13px, 3vw, 14px)',
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.01em',
              color: Colors.surface,
              backgroundColor: (isGenerating || isGeneratingState) ? Colors.border : Colors.primary,
              padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
              minHeight: '44px',
              borderRadius: BorderRadius.button,
              border: 'none',
              cursor: (isGenerating || isGeneratingState) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
              opacity: (isGenerating || isGeneratingState) ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isGenerating && !isGeneratingState) {
                e.currentTarget.style.backgroundColor = Colors.accent
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating && !isGeneratingState) {
                e.currentTarget.style.backgroundColor = Colors.primary
              }
            }}
          >
            {(isGenerating || isGeneratingState) ? 'Generating...' : ButtonLabels.generate}
          </button>

          {/* Save to Guide button (admin only) */}
          {isAdmin && (
            <button
              onClick={handleSaveToGuide}
              disabled={!selectedGuideId || isSavingToGuide}
              className="touch-manipulation active:scale-95 disabled:active:scale-100"
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: 'clamp(13px, 3vw, 14px)',
                fontWeight: Typography.ui.weights.medium,
                letterSpacing: '0.01em',
                color: Colors.surface,
                backgroundColor: (!selectedGuideId || isSavingToGuide) ? Colors.border : Colors.primary,
                padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                minHeight: '44px',
                borderRadius: BorderRadius.button,
                border: 'none',
                cursor: (!selectedGuideId || isSavingToGuide) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                flex: 1,
                opacity: (!selectedGuideId || isSavingToGuide) ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (selectedGuideId && !isSavingToGuide) {
                  e.currentTarget.style.backgroundColor = Colors.accent
                }
              }}
              onMouseLeave={(e) => {
                if (selectedGuideId && !isSavingToGuide) {
                  e.currentTarget.style.backgroundColor = Colors.primary
                }
              }}
              title={!selectedGuideId ? "Select a guide first" : "Save this prompt to your guide"}
            >
              <Save size={16} />
              <span>{isSavingToGuide ? "Saving..." : generatedImageUrl ? "Save with Image" : "Save Prompt"}</span>
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <p
              style={{
                color: Colors.error || '#dc2626',
                fontSize: Typography.body.sizes.sm,
                textAlign: 'center',
              }}
            >
              {error}
            </p>
            <button
              onClick={handleGenerate}
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.medium,
                color: Colors.surface,
                backgroundColor: Colors.primary,
                padding: '8px 16px',
                borderRadius: BorderRadius.button,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Generating indicator - matches Classic Mode exactly */}
        {(isGenerating || isGeneratingState) && !isGenerated && !error && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-stone-900 animate-pulse"></div>
              <div
                className="w-2 h-2 rounded-full bg-stone-700 animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-stone-500 animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <span className="text-xs font-light text-stone-700 tracking-wide">
              Creating with Studio Pro...
            </span>
          </div>
        )}

        {/* Generated image preview */}
        {isGenerated && generatedImageUrl && (
          <div className="mt-4">
            {(() => {
              console.log('[ConceptCardPro] 🖼️ Rendering image preview:', { 
                isGenerated, 
                hasImageUrl: !!generatedImageUrl, 
                imageUrl: generatedImageUrl,
                imageUrlLength: generatedImageUrl?.length,
                imageUrlPreview: generatedImageUrl?.substring(0, 100),
                generationId: generationId?.toString() || ''
              })
              return null
            })()}
            <InstagramPhotoCard
              concept={{
                title: concept.title,
                description: concept.description,
                category: concept.category || '',
                prompt: concept.fullPrompt || concept.prompt || '',
              }}
              imageUrl={generatedImageUrl}
              imageId={generationId || ''}
              isFavorite={isFavoriteState}
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={async () => {
                // Reset state when image is deleted
                setGeneratedImageUrl(null)
                setIsGenerated(false)
                setGenerationId(null)
                setPredictionId(null)
                setIsFavoriteState(false)
              }}
              onCreateProPhotoshoot={
                !isCreatingProPhotoshoot && generatedImageUrl && (concept.linkedImages?.length || 0) > 0
                  ? handleCreateProPhotoshoot
                  : undefined
              }
              studioProMode={true}
              isCreatingProPhotoshoot={isCreatingProPhotoshoot}
            />
          </div>
        )}

        {/* Pro Photoshoot Panel */}
        {proPhotoshootSessionId && !proPhotoshootCarousel && (
          <div className="mt-4">
            {proPhotoshootError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{proPhotoshootError}</p>
              </div>
            )}
            <ProPhotoshootPanel
              sessionId={proPhotoshootSessionId}
              grids={proPhotoshootGrids}
              onGenerateMore={generateGrids}
              onCreateCarousel={handleCreateCarousel}
              maxGrids={8}
              isGenerating={isGeneratingGrids}
              creditCost={3}
              creatingCarouselForGridId={creatingCarouselForGridId}
            />
          </div>
        )}

        {/* Pro Photoshoot Carousel */}
        {proPhotoshootCarousel && (
          <div className="mt-4">
            <InstagramCarouselCard
              images={proPhotoshootCarousel.frames.map((url, i) => ({
                url,
                id: proPhotoshootCarousel.galleryImageIds[i] || i,
                action: `Frame ${i + 1}`,
              }))}
              title={concept.title}
              description={`Pro Photoshoot Grid ${proPhotoshootCarousel.gridNumber} - ${proPhotoshootCarousel.frames.length} frames`}
              category={concept.category || ''}
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={() => {
                setProPhotoshootCarousel(null)
              }}
              isFavorite={isFavoriteState}
            />
          </div>
        )}
        
        {/* Debug: Show state if image should be displayed but isn't */}
        {isGenerated && !generatedImageUrl && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              ⚠️ Debug: isGenerated=true but generatedImageUrl is missing. Polling should continue...
            </p>
          </div>
        )}
      </div>

      {/* View Prompt Modal */}
      <Dialog open={showPromptModal} onOpenChange={(open) => {
        setShowPromptModal(open)
        if (!open) {
          // Reset editing state when modal closes
          setIsEditingPrompt(false)
          setEditedPrompt(concept.fullPrompt || '')
        }
      }}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4"
          style={{
            backgroundColor: Colors.surface,
            borderColor: Colors.border,
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: Typography.subheaders.fontFamily,
                fontSize: Typography.subheaders.sizes.lg,
                fontWeight: Typography.subheaders.weights.regular,
                color: Colors.textPrimary,
                marginBottom: Spacing.element,
              }}
            >
              {concept.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Category and Aesthetic */}
            {(concept.category || concept.aesthetic) && (
              <div className="space-y-3">
                {concept.category && (
                  <div>
                    <p
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.medium,
                        color: Colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '4px',
                      }}
                    >
                      {UILabels.category(concept.category)}
                    </p>
                  </div>
                )}
                {concept.aesthetic && (
                  <div>
                    <p
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.medium,
                        color: Colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '4px',
                      }}
                    >
                      {UILabels.aesthetic(concept.aesthetic)}
                    </p>
                  </div>
                )}
                {concept.template && (
                  <div>
                    <p
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.medium,
                        color: Colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '4px',
                      }}
                    >
                      Template • {concept.template}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Brand References */}
            {concept.brandReferences && concept.brandReferences.length > 0 && (
              <div className="space-y-2">
                <p
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.xs,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Brand References
                </p>
                <p
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.sm,
                    fontWeight: Typography.body.weights.regular,
                    color: Colors.textPrimary,
                    lineHeight: Typography.body.lineHeight,
                  }}
                >
                  {concept.brandReferences.join(' • ')}
                </p>
              </div>
            )}

            {/* Dividing line */}
            <div
              style={{
                height: '1px',
                backgroundColor: Colors.border,
                width: '100%',
              }}
            />

            {/* Full Prompt */}
            {concept.fullPrompt || editedPrompt ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.sm,
                      fontWeight: Typography.ui.weights.medium,
                      color: Colors.textPrimary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Full Prompt
                  </p>
                  {!isEditingPrompt && (
                    <button
                      onClick={handleStartEdit}
                      className="touch-manipulation active:scale-95"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.medium,
                        color: Colors.primary,
                        backgroundColor: 'transparent',
                        padding: '6px 12px',
                        borderRadius: BorderRadius.buttonSm,
                        border: `1px solid ${Colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = Colors.hover
                        e.currentTarget.style.borderColor = Colors.primary
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = Colors.border
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: Colors.backgroundAlt,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: BorderRadius.cardSm,
                  }}
                >
                  {isEditingPrompt ? (
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full resize-none"
                      style={{
                        fontFamily: Typography.body.fontFamily,
                        fontSize: Typography.body.sizes.md,
                        fontWeight: Typography.body.weights.regular,
                        color: Colors.textPrimary,
                        lineHeight: Typography.body.lineHeight,
                        letterSpacing: Typography.body.letterSpacing,
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        minHeight: '200px',
                        wordBreak: 'break-word',
                      }}
                      rows={12}
                    />
                  ) : (
                    <p
                      style={{
                        fontFamily: Typography.body.fontFamily,
                        fontSize: Typography.body.sizes.md,
                        fontWeight: Typography.body.weights.regular,
                        color: Colors.textPrimary,
                        lineHeight: Typography.body.lineHeight,
                        letterSpacing: Typography.body.letterSpacing,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {concept.fullPrompt || editedPrompt}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontFamily: Typography.body.fontFamily,
                  fontSize: Typography.body.sizes.sm,
                  fontWeight: Typography.body.weights.light,
                  color: Colors.textTertiary,
                  fontStyle: 'italic',
                }}
              >
                Full prompt not available
              </p>
            )}

            {/* Styling Details */}
            {concept.stylingDetails && (
              <div className="space-y-3">
                <p
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.xs,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Styling Details
                </p>
                <p
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.sm,
                    fontWeight: Typography.body.weights.regular,
                    color: Colors.textPrimary,
                    lineHeight: Typography.body.lineHeight,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {concept.stylingDetails}
                </p>
              </div>
            )}

            {/* Technical Photography Specifications */}
            {concept.technicalSpecs && (
              <div className="space-y-3">
                <p
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.xs,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Technical Specifications
                </p>
                <div
                  className="p-3 rounded"
                  style={{
                    backgroundColor: Colors.backgroundAlt,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: BorderRadius.cardSm,
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'monospace',
                      fontSize: Typography.body.sizes.sm,
                      fontWeight: Typography.body.weights.regular,
                      color: Colors.textPrimary,
                      lineHeight: Typography.body.lineHeight,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {concept.technicalSpecs}
                  </p>
                </div>
              </div>
            )}

            {/* Linked Images */}
            {concept.linkedImages && concept.linkedImages.length > 0 && (
              <div className="space-y-3">
                <p
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  {UILabels.imagesLinked(concept.linkedImages.length)}
                </p>
                <ImageThumbnailsGrid images={concept.linkedImages} />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t" style={{ borderColor: Colors.border }}>
              {isEditingPrompt ? (
                <>
                  <button
                    onClick={handleSavePrompt}
                    className="touch-manipulation active:scale-95"
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: 'clamp(13px, 3vw, 14px)',
                      fontWeight: Typography.ui.weights.medium,
                      letterSpacing: '0.01em',
                      color: Colors.surface,
                      backgroundColor: Colors.primary,
                      padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                      minHeight: '44px',
                      borderRadius: BorderRadius.button,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flex: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = Colors.accent
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = Colors.primary
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="touch-manipulation active:scale-95"
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: 'clamp(13px, 3vw, 14px)',
                      fontWeight: Typography.ui.weights.medium,
                      letterSpacing: '0.01em',
                      color: Colors.textPrimary,
                      backgroundColor: 'transparent',
                      padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                      minHeight: '44px',
                      borderRadius: BorderRadius.button,
                      border: `1px solid ${Colors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flex: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = Colors.hover
                      e.currentTarget.style.borderColor = Colors.textPrimary
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.borderColor = Colors.border
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="touch-manipulation active:scale-95"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: 'clamp(13px, 3vw, 14px)',
                    fontWeight: Typography.ui.weights.medium,
                    letterSpacing: '0.01em',
                    color: Colors.surface,
                    backgroundColor: Colors.primary,
                    padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                    minHeight: '44px',
                    borderRadius: BorderRadius.button,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = Colors.accent
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = Colors.primary
                  }}
                >
                  {ButtonLabels.close}
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
