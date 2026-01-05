"use client"

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography, Colors, BorderRadius, Spacing, UILabels, ButtonLabels } from '@/lib/maya/pro/design-system'
import { X } from 'lucide-react'

/**
 * Optimize image URL for thumbnails (reduces bandwidth by 80-90%)
 * Only optimizes Vercel Blob Storage URLs - other URLs pass through unchanged
 */
function getOptimizedImageUrl(url: string, width?: number, quality?: number): string {
  if (!url) return "/placeholder.svg"

  if (url.includes("blob.vercel-storage.com") || url.includes("public.blob.vercel-storage.com")) {
    const params = new URLSearchParams()
    if (width) params.append("width", width.toString())
    if (quality) params.append("quality", quality.toString())
    return `${url}?${params.toString()}`
  }

  return url
}

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

  // Memoize library to prevent unnecessary re-renders and blinking
  const memoizedLibrary = useMemo(() => library, [
    library.selfies.join(','),
    library.products.join(','),
    library.people.join(','),
    library.vibes.join(','),
    library.intent,
  ])

  const getTotalImageCount = () => {
    return memoizedLibrary.selfies.length + memoizedLibrary.products.length + memoizedLibrary.people.length + memoizedLibrary.vibes.length
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
              className="touch-manipulation active:scale-95"
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                fontWeight: Typography.ui.weights.medium,
                color: Colors.primary,
                backgroundColor: 'transparent',
                border: `1px solid ${Colors.border}`,
                padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
                minHeight: '36px',
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
            >
              {ButtonLabels.manage}
            </button>
          )}
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {images.map((imageUrl, index) => (
            <div
              key={`${category}-${imageUrl}`}
              className="aspect-square rounded-lg overflow-hidden border bg-stone-50"
              style={{
                borderRadius: BorderRadius.image,
                borderColor: Colors.border,
              }}
            >
              <img
                src={getOptimizedImageUrl(imageUrl, 300, 70)}
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
          className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4"
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
            {memoizedLibrary.selfies.length > 0 && (
              <CategorySection
                title="Selfies"
                images={memoizedLibrary.selfies}
                labelFn={UILabels.selfies}
                category="selfies"
              />
            )}

            {/* Products */}
            {memoizedLibrary.products.length > 0 && (
              <>
                {memoizedLibrary.selfies.length > 0 && (
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
                  images={memoizedLibrary.products}
                  labelFn={UILabels.products}
                  category="products"
                />
              </>
            )}

            {/* People */}
            {memoizedLibrary.people.length > 0 && (
              <>
                {(memoizedLibrary.selfies.length > 0 || memoizedLibrary.products.length > 0) && (
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
                  images={memoizedLibrary.people}
                  labelFn={UILabels.people}
                  category="people"
                />
              </>
            )}

            {/* Vibes */}
            {memoizedLibrary.vibes.length > 0 && (
              <>
                {(memoizedLibrary.selfies.length > 0 ||
                  memoizedLibrary.products.length > 0 ||
                  memoizedLibrary.people.length > 0) && (
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
                  images={memoizedLibrary.vibes}
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
            {memoizedLibrary.intent && (
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
                  {memoizedLibrary.intent}
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

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                onClick={cancelStartFresh}
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
                {ButtonLabels.cancel}
              </button>

              <button
                onClick={confirmStartFresh}
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
                {ButtonLabels.confirm}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
