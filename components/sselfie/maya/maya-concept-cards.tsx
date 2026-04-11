"use client"

import type React from "react"
import ConceptCard from "../concept-card"
import ConceptCardPro from "../pro-mode/ConceptCardPro"

interface Concept {
  id?: string
  title?: string
  label?: string
  description?: string
  prompt?: string
  fullPrompt?: string
  category?: string
  aesthetic?: string
  linkedImages?: string[]
}

const STUDIO_PRO_ASPECT_RATIOS = new Set(["1:1", "4:5", "9:16", "16:9", "4:3", "3:4"])

/** Aspect ratio from Adjust panel (props) or localStorage; validates for Nano Banana / Replicate. */
function resolveStudioProAspectRatio(generationSettings?: { aspectRatio?: string }): string {
  const fromProps = generationSettings?.aspectRatio
  if (typeof fromProps === "string" && STUDIO_PRO_ASPECT_RATIOS.has(fromProps)) {
    return fromProps
  }
  if (typeof window !== "undefined") {
    try {
      const parsed = JSON.parse(localStorage.getItem("mayaGenerationSettings") || "{}")
      const ar = parsed?.aspectRatio
      if (typeof ar === "string" && STUDIO_PRO_ASPECT_RATIOS.has(ar)) {
        return ar
      }
    } catch {
      /* ignore */
    }
  }
  return "1:1"
}

interface MayaConceptCardsProps {
  // Message data
  messageId: string
  concepts: Concept[]
  
  // Mode
  studioProMode: boolean
  
  // Classic Mode props
  chatId?: number
  uploadedImages: Array<{ url: string; type: 'base' | 'product' }>
  onCreditsUpdate?: (newBalance: number) => void
  onTrainingRequired?: () => void
  
  // Pro Mode props
  messages?: any[] // Messages array to get latest concept data
  onPromptUpdate?: (messageId: string, conceptId: string, newFullPrompt: string) => void
  onImageGenerated?: () => void
  
  // Admin props
  isAdmin?: boolean
  selectedGuideId?: number | null
  selectedGuideCategory?: string | null
  onSaveToGuide?: (concept: Concept, imageUrl?: string) => void
  
  // User data
  userId?: string
  user?: any
  userHasTrainedModel?: boolean

  // Generation settings (Classic mode)
  generationSettings?: {
    styleStrength: number
    promptAccuracy: number
    aspectRatio: string
    realismStrength: number
  }
  enhancedAuthenticity?: boolean
}

/**
 * Maya Concept Cards Component
 * 
 * Renders concept cards from a tool-generateConcepts message part.
 * Handles both Classic Mode (ConceptCard) and Pro Mode (ConceptCardPro).
 */
export default function MayaConceptCards({
  messageId,
  concepts,
  studioProMode,
  chatId,
  uploadedImages,
  onCreditsUpdate,
  onTrainingRequired,
  messages = [],
  onPromptUpdate,
  onImageGenerated,
  isAdmin = false,
  selectedGuideId = null,
  selectedGuideCategory = null,
  onSaveToGuide,
  userId,
  user,
  userHasTrainedModel = true,
  generationSettings,
  enhancedAuthenticity,
}: MayaConceptCardsProps) {
  if (!concepts || concepts.length === 0) {
    return null
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-1 rounded-full bg-[#a8a49c]"></div>
        <span className="text-xs tracking-[0.15em] uppercase font-light text-[#8a8780]">
          Photo Ideas
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {concepts.map((concept, conceptIndex) => {
          // Pro Mode: Use ConceptCardPro
          if (studioProMode) {
            // Use linkedImages from concept (already linked by API with up to 5 images)
            const conceptLinkedImages = concept.linkedImages && Array.isArray(concept.linkedImages) && concept.linkedImages.length > 0
              ? concept.linkedImages
              : [] // If no linkedImages from API, use empty array (user needs to add images)

            // Use stable key based on concept.id and message.id to preserve component state across re-renders
            const conceptId = concept.id || `concept-${messageId}-${conceptIndex}`
            const stableKey = `pro-concept-${messageId}-${conceptId}`

            return (
              <ConceptCardPro
                key={stableKey}
                concept={{
                  id: conceptId,
                  title: concept.title || concept.label || 'Untitled Concept',
                  description: concept.description || concept.prompt || '',
                  category: concept.category,
                  aesthetic: concept.aesthetic,
                  linkedImages: conceptLinkedImages,
                  fullPrompt: concept.fullPrompt || concept.prompt,
                  generatedImageUrl: (concept as any).generatedImageUrl, // From JSONB
                  predictionId: (concept as any).predictionId, // From JSONB
                }}
                messageId={messageId}
                chatId={chatId}
                isAdmin={isAdmin}
                selectedGuideId={selectedGuideId}
                onSaveToGuide={onSaveToGuide}
                onPromptUpdate={onPromptUpdate ? (updatedConceptId, newFullPrompt) => {
                  onPromptUpdate(messageId, updatedConceptId, newFullPrompt)
                } : undefined}
                onGenerate={async () => {
                  // Get the current concept from messages to ensure we use the latest prompt (including edits)
                  const currentMessage = messages.find((m: any) => m.id === messageId)
                  const currentConceptPart = currentMessage?.parts?.find((p: any) => 
                    p && p.type === 'tool-generateConcepts' && (p as any).output?.concepts
                  ) as any
                  const currentConcepts = currentConceptPart?.output?.concepts || []
                  const currentConcept = currentConcepts.find((c: any) => {
                    const cId = c.id || `concept-${messageId}-${conceptIndex}`
                    return cId === conceptId
                  }) || concept

                  const promptToUse = currentConcept.fullPrompt || currentConcept.prompt || concept.fullPrompt || concept.prompt

                  console.log('[Pro Mode] 🎬 onGenerate called for concept:', currentConcept.title || concept.title)
                  
                  if (!promptToUse) {
                    console.error('[Pro Mode] ❌ Concept missing prompt')
                    throw new Error('Concept missing prompt')
                  }

                  const conceptLinkedImages = concept.linkedImages && Array.isArray(concept.linkedImages) && concept.linkedImages.length > 0
                    ? concept.linkedImages
                    : []

                  const aspectRatio = resolveStudioProAspectRatio(generationSettings)

                  console.log('[Pro Mode] 📤 Calling /api/maya/pro/generate-image with:', {
                    conceptTitle: currentConcept.title || concept.title,
                    promptLength: promptToUse.length,
                    linkedImagesCount: conceptLinkedImages?.length || 0,
                    aspectRatio,
                  })

                  try {
                    const response = await fetch('/api/maya/pro/generate-image', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        fullPrompt: promptToUse,
                        conceptTitle: concept.title || concept.label,
                        conceptDescription: concept.description,
                        category: concept.category || 'concept',
                        linkedImages: conceptLinkedImages,
                        resolution: '2K',
                        aspectRatio,
                      }),
                    })

                    console.log('[Pro Mode] 📥 Response status:', response.status, response.ok)

                    const data = await response.json()
                    console.log('[Pro Mode] 📥 Response data:', {
                      success: data.success,
                      status: data.status,
                      hasPredictionId: !!data.predictionId,
                      hasGenerationId: !!data.generationId,
                      hasImageUrl: !!data.imageUrl,
                    })

                    if (!response.ok) {
                      console.error('[Pro Mode] ❌ Generation failed:', data.error)
                      throw new Error(data.error || 'Generation failed')
                    }

                    // Return predictionId and generationId so ConceptCardPro can poll
                    if (data.status === 'succeeded' && data.imageUrl) {
                      // Already completed - trigger callback
                      console.log('[Pro Mode] ✅ Generation completed immediately, imageUrl:', data.imageUrl.substring(0, 100))
                      if (onImageGenerated) {
                        onImageGenerated()
                      }
                      return { predictionId: data.predictionId, generationId: data.generationId }
                    } else if (data.predictionId) {
                      // Return IDs for polling in ConceptCardPro
                      console.log('[Pro Mode] ⏳ Generation in progress, returning IDs for polling')
                      return { predictionId: data.predictionId, generationId: data.generationId }
                    } else {
                      console.warn('[Pro Mode] ⚠️ No predictionId in response')
                      throw new Error('No predictionId returned from API')
                    }
                  } catch (error) {
                    console.error('[Pro Mode] ❌ Generation error:', error)
                    throw error
                  }
                }}
                onImageGenerated={onImageGenerated}
                onViewPrompt={() => {
                  // View prompt modal is handled by ConceptCardPro component
                  console.log('[Pro Mode] View prompt:', concept.fullPrompt || concept.prompt)
                }}
              />
            )
          }
          
          // Classic Mode: Use ConceptCard
          const allBaseImages = uploadedImages.filter(img => img.type === 'base').map(img => img.url)
          const conceptId = concept.id || `concept-${messageId}-${conceptIndex}`
          
          return (
            <ConceptCard 
              key={conceptId}
              concept={{ ...(concept as any), id: conceptId }} 
              chatId={chatId}
              messageId={messageId}
              onCreditsUpdate={onCreditsUpdate}
              onTrainingRequired={onTrainingRequired}
              studioProMode={false}
              userHasTrainedModel={userHasTrainedModel}
              baseImages={allBaseImages}
              selfies={[]}
              products={[]}
              styleRefs={[]}
              generationSettings={generationSettings}
              enhancedAuthenticity={enhancedAuthenticity}
              isAdmin={isAdmin}
              selectedGuideId={selectedGuideId}
              adminUserId={user?.id?.toString()}
              onSaveToGuide={onSaveToGuide}
            />
          )
        })}
      </div>
    </div>
  )
}
