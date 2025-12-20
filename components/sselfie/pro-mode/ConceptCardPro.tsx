"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography, Colors, BorderRadius, Spacing, UILabels, ButtonLabels } from '@/lib/maya/pro/design-system'
import { X } from 'lucide-react'
import InstagramPhotoCard from '../instagram-photo-card'

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
  }
  onGenerate?: () => Promise<{ predictionId?: string; generationId?: string } | void>
  onViewPrompt?: () => void
  onEditPrompt?: () => void
  isGenerating?: boolean
  onImageGenerated?: () => void
}

export default function ConceptCardPro({
  concept,
  onGenerate,
  onViewPrompt,
  onEditPrompt,
  isGenerating = false,
  onImageGenerated,
}: ConceptCardProProps) {
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [isGeneratingState, setIsGeneratingState] = useState(false)

  // Restore polling state from localStorage on mount (survives remounts)
  useEffect(() => {
    const storageKey = `pro-generation-${concept.id}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const { predictionId: savedPredictionId, generationId: savedGenerationId, isGenerated: savedIsGenerated, generatedImageUrl: savedImageUrl } = JSON.parse(saved)
        if (savedPredictionId && savedGenerationId && !savedIsGenerated) {
          // Only restore if generation is still in progress
          console.log('[ConceptCardPro] 🔄 Restoring polling state from localStorage:', { savedPredictionId, savedGenerationId })
          setPredictionId(savedPredictionId)
          setGenerationId(savedGenerationId)
          setIsGeneratingState(true)
        } else if (savedIsGenerated && savedImageUrl) {
          // Restore completed generation
          console.log('[ConceptCardPro] ✅ Restoring completed generation from localStorage')
          setIsGenerated(true)
          setGeneratedImageUrl(savedImageUrl)
        }
      } catch (err) {
        console.error('[ConceptCardPro] ❌ Error restoring state from localStorage:', err)
      }
    }
  }, [concept.id])

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    const storageKey = `pro-generation-${concept.id}`
    if (predictionId && generationId) {
      localStorage.setItem(storageKey, JSON.stringify({
        predictionId,
        generationId,
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
      // Clear if no active generation
      localStorage.removeItem(storageKey)
    }
  }, [predictionId, generationId, isGenerated, generatedImageUrl, concept.id])

  const handleViewPrompt = () => {
    setShowPromptModal(true)
    if (onViewPrompt) {
      onViewPrompt()
    }
  }

  const handleGenerate = async () => {
    console.log('[ConceptCardPro] 🎬 Generate button clicked')
    if (!onGenerate) {
      console.error('[ConceptCardPro] ❌ No onGenerate callback provided')
      return
    }
    
    setIsGeneratingState(true)
    setError(null)
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
        console.log('[ConceptCardPro] 📝 Set predictionId:', result.predictionId)
      }
      if (result?.generationId) {
        setGenerationId(result.generationId)
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

  // Poll for generation status (matches Classic Mode exactly)
  useEffect(() => {
    // Match Classic Mode: requires predictionId (generationId is optional - check-generation can create fallback)
    // Skip if already generated
    if (!predictionId || isGenerated) {
      if (!predictionId) console.log('[ConceptCardPro] ⏸️ Polling skipped: no predictionId')
      if (isGenerated) console.log('[ConceptCardPro] ⏸️ Polling skipped: already generated')
      return
    }
    
    // Log if generationId is missing but continue polling (check-generation endpoint can handle it)
    if (!generationId) {
      console.warn('[ConceptCardPro] ⚠️ Polling without generationId - check-generation endpoint will create fallback record if needed')
    }

    console.log('[ConceptCardPro] 🔄 Starting polling with:', { predictionId, generationId })

    const pollInterval = setInterval(async () => {
      try {
        console.log('[ConceptCardPro] 🔍 Polling check-generation API for:', predictionId)
        const response = await fetch(
          `/api/maya/pro/check-generation?predictionId=${predictionId}`,
          { credentials: 'include' }
        )
        
        if (!response.ok) {
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
        })

        if (data.status === 'succeeded') {
          // Match Classic Mode: check for imageUrl and set it
          if (data.imageUrl) {
            console.log('[ConceptCardPro] ✅✅✅ Generation succeeded! Setting image URL:', data.imageUrl.substring(0, 100))
            setGeneratedImageUrl(data.imageUrl)
            setIsGenerated(true)
            setIsGeneratingState(false)
            clearInterval(pollInterval)
            console.log('[ConceptCardPro] ✅ Polling stopped, image should be displayed')
            
            // Clear localStorage since generation is complete
            const storageKey = `pro-generation-${concept.id}`
            localStorage.removeItem(storageKey)
            
            if (onImageGenerated) {
              onImageGenerated()
            }
          } else {
            console.warn('[ConceptCardPro] ⚠️ Generation succeeded but no imageUrl in response, data:', JSON.stringify(data).substring(0, 200))
            // Continue polling if imageUrl is missing
          }
        } else if (data.status === 'failed') {
          console.error('[ConceptCardPro] ❌ Generation failed:', data.error)
          setError(data.error || 'Generation failed')
          setIsGeneratingState(false)
          clearInterval(pollInterval)
          
          // Clear localStorage on failure
          const storageKey = `pro-generation-${concept.id}`
          localStorage.removeItem(storageKey)
        } else {
          // Still processing
          console.log('[ConceptCardPro] ⏳ Still processing, status:', data.status)
        }
      } catch (err) {
        console.error('[ConceptCardPro] ❌ Error polling generation:', err)
        // Don't stop polling on network errors, just log them
      }
    }, 3000) // Poll every 3 seconds (matches Classic Mode)

    console.log('[ConceptCardPro] ✅ Polling interval started')

    return () => {
      console.log('[ConceptCardPro] 🛑 Polling interval cleared')
      clearInterval(pollInterval)
    }
  }, [predictionId, isGenerated, onImageGenerated]) // generationId removed from dependencies since it's optional

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
        className="bg-white rounded-xl p-6 space-y-4 border"
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
            fontSize: Typography.subheaders.sizes.lg,
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
            fontSize: Typography.body.sizes.md,
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
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* View Prompt button */}
          <button
            onClick={handleViewPrompt}
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.sm,
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.01em',
              color: Colors.primary,
              backgroundColor: 'transparent',
              padding: '10px 20px',
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
            className="hover:opacity-90"
          >
            {ButtonLabels.viewPrompt}
          </button>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isGeneratingState}
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.sm,
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.01em',
              color: Colors.surface,
              backgroundColor: (isGenerating || isGeneratingState) ? Colors.border : Colors.primary,
              padding: '10px 20px',
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
            className="hover:opacity-90"
          >
            {(isGenerating || isGeneratingState) ? 'Generating...' : ButtonLabels.generate}
          </button>
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
            <InstagramPhotoCard
              concept={{
                title: concept.title,
                description: concept.description,
                category: concept.category || '',
                prompt: concept.fullPrompt || concept.prompt || '',
              }}
              imageUrl={generatedImageUrl}
              imageId={generationId || ''}
              isFavorite={false}
              onFavoriteToggle={async () => {
                // TODO: Implement favorite toggle
                console.log('[ConceptCardPro] Favorite toggle not yet implemented')
              }}
              onDelete={async () => {
                // Reset state when image is deleted
                setGeneratedImageUrl(null)
                setIsGenerated(false)
                setGenerationId(null)
                setPredictionId(null)
              }}
            />
          </div>
        )}
      </div>

      {/* View Prompt Modal */}
      <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
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
            {concept.fullPrompt ? (
              <div className="space-y-3">
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
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: Colors.backgroundAlt,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: BorderRadius.cardSm,
                  }}
                >
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
                    {concept.fullPrompt}
                  </p>
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
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t" style={{ borderColor: Colors.border }}>
              {onEditPrompt && (
                <button
                  onClick={() => {
                    if (onEditPrompt) {
                      onEditPrompt()
                    }
                    setShowPromptModal(false)
                  }}
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    letterSpacing: '0.01em',
                    color: Colors.primary,
                    backgroundColor: 'transparent',
                    padding: '10px 20px',
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
                  className="hover:opacity-90"
                >
                  Edit Prompt
                </button>
              )}
              <button
                onClick={() => setShowPromptModal(false)}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  fontWeight: Typography.ui.weights.medium,
                  letterSpacing: '0.01em',
                  color: Colors.surface,
                  backgroundColor: Colors.primary,
                  padding: '10px 20px',
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
                className="hover:opacity-90"
              >
                {ButtonLabels.close}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
