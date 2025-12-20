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
 * ImageLibraryModal Component
 * 
 * Sophisticated library management modal for Studio Pro Mode.
 * Displays images organized by category with management options.
 * 
 * Design principles:
 * - NO emojis in UI elements
 * - Professional typography (Hatton, Inter)
 * - Stone palette colors
 * - Editorial, luxury design
 */

interface ImageLibrary {
  selfies: string[]
  products: string[]
  people: string[]
  vibes: string[]
  intent: string
}

interface ImageLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  library: ImageLibrary
  onManageCategory?: (category: 'selfies' | 'products' | 'people' | 'vibes') => void
  onStartFresh?: () => void
  onEditIntent?: () => void
}

export default function ImageLibraryModal({
  isOpen,
  onClose,
  library,
  onManageCategory,
  onStartFresh,
  onEditIntent,
}: ImageLibraryModalProps) {
  const [showStartFreshConfirm, setShowStartFreshConfirm] = useState(false)

  const getTotalImageCount = () => {
    return library.selfies.length + library.products.length + library.people.length + library.vibes.length
  }

  const handleStartFresh = () => {
    setShowStartFreshConfirm(true)
  }

  const confirmStartFresh = () => {
    if (onStartFresh) {
      onStartFresh()
    }
    setShowStartFreshConfirm(false)
    onClose()
  }

  const cancelStartFresh = () => {
    setShowStartFreshConfirm(false)
  }

  // Helper component for category section
  const CategorySection = ({
    title,
    images,
    labelFn,
    category,
  }: {
    title: string
    images: string[]
    labelFn: (count: number) => string
    category: 'selfies' | 'products' | 'people' | 'vibes'
  }) => {
    if (images.length === 0) return null

    return (
      <div className="space-y-4">
        {/* Category header with count and manage button */}
        <div className="flex items-center justify-between">
          <p
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.md,
              fontWeight: Typography.ui.weights.medium,
              color: Colors.textPrimary,
            }}
          >
            {labelFn(images.length)}
          </p>
          {onManageCategory && (
            <button
              onClick={() => onManageCategory(category)}
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.medium,
                color: Colors.primary,
                backgroundColor: 'transparent',
                border: `1px solid ${Colors.border}`,
                padding: '6px 16px',
                borderRadius: BorderRadius.buttonSm,
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
              className="hover:opacity-90"
            >
              {ButtonLabels.manage}
            </button>
          )}
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((imageUrl, index) => (
            <div
              key={`${category}-${index}`}
              className="aspect-square rounded-lg overflow-hidden border bg-stone-50"
              style={{
                borderRadius: BorderRadius.image,
                borderColor: Colors.border,
              }}
            >
              <img
                src={imageUrl}
                alt={`${title} ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: Colors.surface,
            borderColor: Colors.border,
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: Typography.headers.fontFamily,
                fontSize: Typography.headers.sizes.lg,
                fontWeight: Typography.headers.weights.medium,
                color: Colors.textPrimary,
                marginBottom: Spacing.element,
              }}
            >
              Image Library
            </DialogTitle>
            <p
              style={{
                fontFamily: Typography.body.fontFamily,
                fontSize: Typography.body.sizes.sm,
                fontWeight: Typography.body.weights.regular,
                color: Colors.textSecondary,
                lineHeight: Typography.body.lineHeight,
              }}
            >
              {UILabels.library(getTotalImageCount())}
            </p>
          </DialogHeader>

          <div className="space-y-8">
            {/* Selfies */}
            {library.selfies.length > 0 && (
              <CategorySection
                title="Selfies"
                images={library.selfies}
                labelFn={UILabels.selfies}
                category="selfies"
              />
            )}

            {/* Products */}
            {library.products.length > 0 && (
              <>
                {library.selfies.length > 0 && (
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: Colors.border,
                      width: '100%',
                    }}
                  />
                )}
                <CategorySection
                  title="Products"
                  images={library.products}
                  labelFn={UILabels.products}
                  category="products"
                />
              </>
            )}

            {/* People */}
            {library.people.length > 0 && (
              <>
                {(library.selfies.length > 0 || library.products.length > 0) && (
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: Colors.border,
                      width: '100%',
                    }}
                  />
                )}
                <CategorySection
                  title="People"
                  images={library.people}
                  labelFn={UILabels.people}
                  category="people"
                />
              </>
            )}

            {/* Vibes */}
            {library.vibes.length > 0 && (
              <>
                {(library.selfies.length > 0 ||
                  library.products.length > 0 ||
                  library.people.length > 0) && (
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: Colors.border,
                      width: '100%',
                    }}
                  />
                )}
                <CategorySection
                  title="Vibes & Inspiration"
                  images={library.vibes}
                  labelFn={UILabels.vibes}
                  category="vibes"
                />
              </>
            )}

            {/* Empty state */}
            {getTotalImageCount() === 0 && (
              <div className="text-center py-12">
                <p
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.md,
                    fontWeight: Typography.body.weights.light,
                    color: Colors.textTertiary,
                    fontStyle: 'italic',
                  }}
                >
                  {UILabels.libraryEmpty}
                </p>
              </div>
            )}

            {/* Current Intent */}
            {library.intent && (
              <div className="space-y-3 pt-4 border-t" style={{ borderColor: Colors.border }}>
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
                  {UILabels.currentIntent}
                </p>
                <p
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.md,
                    fontWeight: Typography.body.weights.regular,
                    color: Colors.textSecondary,
                    lineHeight: Typography.body.lineHeight,
                  }}
                >
                  {library.intent}
                </p>
                {onEditIntent && (
                  <button
                    onClick={onEditIntent}
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.sm,
                      fontWeight: Typography.ui.weights.medium,
                      color: Colors.primary,
                      backgroundColor: 'transparent',
                      border: `1px solid ${Colors.border}`,
                      padding: '6px 16px',
                      borderRadius: BorderRadius.buttonSm,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      alignSelf: 'flex-start',
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
                    {ButtonLabels.editIntent}
                  </button>
                )}
              </div>
            )}

            {/* Start Fresh Project */}
            {onStartFresh && (
              <div className="pt-4 border-t" style={{ borderColor: Colors.border }}>
                <button
                  onClick={handleStartFresh}
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textSecondary,
                    backgroundColor: 'transparent',
                    border: `1px solid ${Colors.border}`,
                    padding: '8px 20px',
                    borderRadius: BorderRadius.button,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = Colors.hover
                    e.currentTarget.style.borderColor = Colors.textSecondary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = Colors.border
                  }}
                  className="hover:opacity-90"
                >
                  {ButtonLabels.startFresh}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Fresh Confirmation Dialog */}
      <Dialog open={showStartFreshConfirm} onOpenChange={setShowStartFreshConfirm}>
        <DialogContent
          className="max-w-md"
          style={{
            backgroundColor: Colors.surface,
            borderColor: Colors.border,
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: Typography.headers.fontFamily,
                fontSize: Typography.headers.sizes.md,
                fontWeight: Typography.headers.weights.medium,
                color: Colors.textPrimary,
              }}
            >
              Start Fresh Project
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p
              style={{
                fontFamily: Typography.body.fontFamily,
                fontSize: Typography.body.sizes.md,
                fontWeight: Typography.body.weights.regular,
                color: Colors.textSecondary,
                lineHeight: Typography.body.lineHeight,
              }}
            >
              Are you sure you want to start a fresh project? This will clear your current image library and intent.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={cancelStartFresh}
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
                {ButtonLabels.cancel}
              </button>

              <button
                onClick={confirmStartFresh}
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
                {ButtonLabels.confirm}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
