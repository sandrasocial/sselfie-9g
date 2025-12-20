"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography, Colors, BorderRadius, Spacing, UILabels, ButtonLabels } from '@/lib/maya/pro/design-system'
import { X } from 'lucide-react'

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
  onGenerate?: () => void
  onViewPrompt?: () => void
  onEditPrompt?: () => void
}

export default function ConceptCardPro({
  concept,
  onGenerate,
  onViewPrompt,
  onEditPrompt,
}: ConceptCardProProps) {
  const [showPromptModal, setShowPromptModal] = useState(false)

  const handleViewPrompt = () => {
    setShowPromptModal(true)
    if (onViewPrompt) {
      onViewPrompt()
    }
  }

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate()
    }
  }

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
            {ButtonLabels.generate}
          </button>
        </div>
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
