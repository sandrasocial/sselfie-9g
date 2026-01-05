"use client"

import { useState, useEffect } from 'react'
import { ProModeDesign, ButtonLabels, Typography, Colors, BorderRadius, Spacing, UILabels } from '@/lib/maya/pro/design-system'
import ImageGalleryModal from '@/components/sselfie/image-gallery-modal'
import type { GalleryImage } from '@/lib/data/images'
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
 * ImageUploadFlow Component
 * 
 * 4-step wizard for gathering user images in Studio Pro Mode.
 * Step 1: Welcome screen with professional, editorial design.
 * 
 * Design principles:
 * - NO emojis in UI elements
 * - Professional typography (Canela, Hatton, Inter)
 * - Stone palette with warm cream background
 * - Editorial, luxury, creative studio feel
 */

interface ImageLibrary {
  selfies: string[]
  products: string[]
  people: string[]
  vibes: string[]
  intent: string
}

interface ImageUploadFlowProps {
  onComplete?: (library: ImageLibrary) => void
  onCancel?: () => void
  initialLibrary?: ImageLibrary
  showAfterState?: boolean
  editCategory?: 'selfies' | 'products' | 'people' | 'vibes' | null // Category being edited/managed
  onManageCategory?: (category: 'selfies' | 'products' | 'people' | 'vibes') => void
  onStartCreating?: (library: ImageLibrary) => void
}

export default function ImageUploadFlow({
  onComplete,
  onCancel,
  initialLibrary,
  showAfterState = false,
  editCategory = null,
  onManageCategory,
  onStartCreating,
}: ImageUploadFlowProps) {
  // If editCategory is specified, start at the appropriate step
  const getInitialStep = () => {
    if (editCategory === 'selfies') return 2
    if (editCategory && ['products', 'people', 'vibes'].includes(editCategory)) return 3
    return 1
  }
  
  const [currentStep, setCurrentStep] = useState<number>(getInitialStep())
  const [library, setLibrary] = useState<ImageLibrary>(
    initialLibrary || {
      selfies: [],
      products: [],
      people: [],
      vibes: [],
      intent: '',
    }
  )
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [galleryCategory, setGalleryCategory] = useState<'selfies' | 'products' | 'people' | 'vibes' | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Helper function to remove an image from a category
  const handleRemoveImage = (category: 'selfies' | 'products' | 'people' | 'vibes', imageUrl: string) => {
    setLibrary((prev) => {
      const currentImages = prev[category] || []
      return {
        ...prev,
        [category]: currentImages.filter((url) => url !== imageUrl),
      }
    })
  }

  // Helper component to display image thumbnails with remove buttons
  const ImageThumbnailsGrid = ({ 
    images, 
    category 
  }: { 
    images: string[]
    category: 'selfies' | 'products' | 'people' | 'vibes'
  }) => {
    if (images.length === 0) return null

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-4">
        {images.map((imageUrl, index) => (
          <div
            key={`${imageUrl}-${index}`}
            className="relative aspect-square bg-stone-200/30 rounded-lg border border-stone-300/30 overflow-hidden group"
          >
            <img
              src={getOptimizedImageUrl(imageUrl || "/placeholder.svg", 300, 70)}
              alt={`${category} ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              onClick={() => handleRemoveImage(category, imageUrl)}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label={`Remove ${category} image`}
              style={{
                fontFamily: Typography.ui.fontFamily,
              }}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    )
  }

  // Gallery images are now fetched directly by ImageGalleryModal with pagination support

  const handleBeginSetup = () => {
    setCurrentStep(2)
  }

  const handleChooseFromGallery = () => {
    // For step 2, we're selecting selfies
    setGalleryCategory('selfies')
    setShowGalleryModal(true)
  }

  const handleGalleryImageSelect = (imageUrlOrUrls: string | string[]) => {
    if (!galleryCategory) return
    
    const imageUrls = Array.isArray(imageUrlOrUrls) ? imageUrlOrUrls : [imageUrlOrUrls]
    
    setLibrary((prev) => {
      const currentImages = prev[galleryCategory] || []
      const newImages = [...currentImages]
      
      // Add new images, avoiding duplicates
      imageUrls.forEach((url) => {
        if (!newImages.includes(url)) {
          newImages.push(url)
        }
      })
      
      return {
        ...prev,
        [galleryCategory]: newImages,
      }
    })
    
    setShowGalleryModal(false)
    setGalleryCategory(null)
  }

  const handleUploadNew = () => {
    // Create file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) return

      setIsUploading(true)
      setUploadError(null)

      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          const data = await response.json()
          return data.url
        })

        const uploadedUrls = await Promise.all(uploadPromises)

        // Add uploaded images to selfies category
        setLibrary((prev) => {
          const currentSelfies = prev.selfies || []
          const newSelfies = [...currentSelfies, ...uploadedUrls]
          // Remove duplicates
          const updatedLibrary = {
            ...prev,
            selfies: [...new Set(newSelfies)],
          }
          // Clear validation error when selfies are added
          if (updatedLibrary.selfies.length > 0) {
            setValidationError(null)
          }
          return updatedLibrary
        })
      } catch (error) {
        console.error('[ImageUploadFlow] Error uploading images:', error)
        setUploadError(error instanceof Error ? error.message : 'Failed to upload images')
      } finally {
        setIsUploading(false)
      }
    }
    input.click()
  }

  const handleContinueFromStep2 = () => {
    // Validate that selfies are required
    if (library.selfies.length === 0) {
      // 🔴 FIX: Show validation error when selfies are required but missing
      setValidationError('Selfies are required to continue. Please add at least one selfie image.')
      // Clear error after 5 seconds
      setTimeout(() => setValidationError(null), 5000)
      return
    }
    // Clear any previous validation errors when validation passes
    setValidationError(null)
    setCurrentStep(3)
  }

  const handleChooseFromGalleryForCategory = (category: 'products' | 'people' | 'vibes') => {
    setGalleryCategory(category)
    setShowGalleryModal(true)
  }

  const handleUploadNewForCategory = (category: 'products' | 'people' | 'vibes') => {
    // Create file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) return

      setIsUploading(true)
      setUploadError(null)

      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          const data = await response.json()
          return data.url
        })

        const uploadedUrls = await Promise.all(uploadPromises)

        // Add uploaded images to specified category
        setLibrary((prev) => {
          const currentImages = prev[category] || []
          const newImages = [...currentImages, ...uploadedUrls]
          // Remove duplicates
          return {
            ...prev,
            [category]: [...new Set(newImages)],
          }
        })
      } catch (error) {
        console.error(`[ImageUploadFlow] Error uploading images for ${category}:`, error)
        setUploadError(error instanceof Error ? error.message : 'Failed to upload images')
      } finally {
        setIsUploading(false)
      }
    }
    input.click()
  }

  const handleContinueFromStep3 = () => {
    // Step 3 is optional, so we can always continue
    setCurrentStep(4)
  }

  const handleIntentChange = (value: string) => {
    setLibrary((prev) => ({
      ...prev,
      intent: value,
    }))
    // Clear validation error when intent is entered
    if (value.trim().length > 0) {
      setValidationError(null)
    }
  }

  const handleComplete = () => {
    // Validate intent is provided
    if (!library.intent.trim()) {
      // 🔴 FIX: Show validation error when intent is missing
      setValidationError('Please describe your creative intent to continue. This helps Maya understand your goals.')
      // Clear error after 5 seconds
      setTimeout(() => setValidationError(null), 5000)
      return
    }
    // Clear any previous validation errors when validation passes
    setValidationError(null)
    // Call onComplete callback with the library
    if (onComplete) {
      onComplete(library)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleManageCategory = (category: 'selfies' | 'products' | 'people' | 'vibes') => {
    if (onManageCategory) {
      onManageCategory(category)
    } else {
      // Fallback: Open gallery modal for this category
      setGalleryCategory(category)
      setShowGalleryModal(true)
    }
  }

  const handleStartCreating = async () => {
    if (onStartCreating) {
      // Pass the current library state to the callback
      onStartCreating(library)
    } else if (onComplete) {
      // If no onStartCreating callback, use onComplete to trigger concept generation
      // This ensures the library is saved and concept generation is triggered
      onComplete(library)
    } else {
      console.log('Start creating - no callbacks available')
    }
  }

  // Helper to get total image count
  const getTotalImageCount = () => {
    return library.selfies.length + library.products.length + library.people.length + library.vibes.length
  }

  // Helper component for category section in after state
  const CategorySectionAfter = ({
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
          <button
            onClick={() => handleManageCategory(category)}
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
        </div>

        {/* Image thumbnails grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((imageUrl, index) => (
            <div
              key={`${category}-${index}`}
              className="aspect-square rounded-lg overflow-hidden border border-stone-200/60 bg-stone-50"
            >
              <img
                src={getOptimizedImageUrl(imageUrl, 300, 70)}
                alt={`${title} ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Fallback to placeholder on error
                  e.currentTarget.src = '/placeholder.svg'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ============================================================================
  // AFTER STATE: SHOW LIBRARY WITH IMAGES
  // ============================================================================

  if (showAfterState && getTotalImageCount() > 0) {
    return (
      <div className="flex flex-col min-h-[600px] px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <div className="max-w-[900px] w-full mx-auto space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h2
              style={{
                fontFamily: Typography.headers.fontFamily,
                fontSize: Typography.headers.sizes.lg,
                fontWeight: Typography.headers.weights.medium,
                color: Colors.textPrimary,
                lineHeight: Typography.headers.lineHeight,
                letterSpacing: Typography.headers.letterSpacing,
              }}
            >
              Your Image Library
            </h2>
            <p
              style={{
                fontFamily: Typography.body.fontFamily,
                fontSize: Typography.body.sizes.md,
                fontWeight: Typography.body.weights.regular,
                color: Colors.textSecondary,
                lineHeight: Typography.body.lineHeight,
              }}
            >
              {UILabels.library(getTotalImageCount())}
            </p>
          </div>

          {/* Dividing line */}
          <div
            style={{
              height: '1px',
              backgroundColor: Colors.border,
              width: '100%',
            }}
          />

          {/* Category sections */}
          <div className="space-y-8">
            {/* Selfies */}
            {library.selfies.length > 0 && (
              <CategorySectionAfter
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
                <CategorySectionAfter
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
                <CategorySectionAfter
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
                <CategorySectionAfter
                  title="Vibes & Inspiration"
                  images={library.vibes}
                  labelFn={UILabels.vibes}
                  category="vibes"
                />
              </>
            )}
          </div>

          {/* Current Intent */}
          {library.intent && (
            <div className="space-y-4 pt-4">
              <div
                style={{
                  height: '1px',
                  backgroundColor: Colors.border,
                  width: '100%',
                }}
              />
              <div className="space-y-2">
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
              </div>
            </div>
          )}

          {/* Start Creating button */}
          <div className="pt-6">
          <button
            onClick={handleStartCreating}
            className="touch-manipulation active:scale-95 w-full sm:w-auto"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.5px',
              color: Colors.surface,
              backgroundColor: Colors.primary,
              padding: 'clamp(12px, 3vw, 14px) clamp(24px, 6vw, 32px)',
              minHeight: '44px',
              borderRadius: BorderRadius.button,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = Colors.accent
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = Colors.primary
            }}
          >
            {ButtonLabels.startCreating}
          </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // STEP 1: WELCOME SCREEN
  // ============================================================================

  if (currentStep === 1) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[600px] px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-[600px] w-full space-y-6 sm:space-y-8 text-center">
          {/* Main Header: "Studio Pro Mode" */}
          <h1
            style={{
              fontFamily: Typography.headers.fontFamily,
              fontSize: 'clamp(24px, 6vw, 32px)',
              fontWeight: Typography.headers.weights.medium,
              color: Colors.textPrimary,
              lineHeight: Typography.headers.lineHeight,
              letterSpacing: Typography.headers.letterSpacing,
            }}
          >
            Studio Pro Mode
          </h1>

          {/* Subheader: "Let's gather your images to begin" */}
          <h2
            style={{
              fontFamily: Typography.subheaders.fontFamily,
              fontSize: 'clamp(18px, 4.5vw, 22px)',
              fontWeight: Typography.subheaders.weights.regular,
              color: Colors.accentLight,
              lineHeight: Typography.subheaders.lineHeight,
              letterSpacing: Typography.subheaders.letterSpacing,
            }}
          >
            Let's gather your images to begin
          </h2>

          {/* Body Text: Explaining the process */}
          <p
            style={{
              fontFamily: Typography.body.fontFamily,
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: Typography.body.weights.light,
              color: Colors.textSecondary,
              lineHeight: Typography.body.lineHeight,
              letterSpacing: Typography.body.letterSpacing,
              maxWidth: '500px',
              margin: '0 auto',
              padding: '0 clamp(16px, 4vw, 24px)',
            }}
          >
            We'll help you organize your images into categories: selfies for your face and features, 
            products for brand partnerships, people for lifestyle moments, and vibes for aesthetic inspiration. 
            This library will power your creative projects in Studio Pro Mode.
          </p>

          {/* Begin Setup Button */}
          <div className="pt-4">
            <button
              onClick={handleBeginSetup}
              className="touch-manipulation active:scale-95 w-full sm:w-auto"
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: Typography.ui.weights.medium,
                letterSpacing: '0.5px',
                color: Colors.surface,
                backgroundColor: Colors.primary,
                padding: 'clamp(12px, 3vw, 14px) clamp(24px, 6vw, 32px)',
                minHeight: '44px',
                borderRadius: BorderRadius.button,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = Colors.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = Colors.primary
              }}
            >
              {ButtonLabels.beginSetup}
            </button>
          </div>

          {/* Optional: Cancel button */}
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.regular,
                color: Colors.textSecondary,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 16px',
                marginTop: Spacing.element,
              }}
              className="hover:opacity-70"
            >
              {ButtonLabels.cancel}
            </button>
          )}
        </div>
      </div>
      
      {/* Gallery Modal */}
      {showGalleryModal && (
        <ImageGalleryModal
          fetchImages={true}
          onSelect={handleGalleryImageSelect}
          onClose={() => {
            setShowGalleryModal(false)
            setGalleryCategory(null)
          }}
          multiple={true}
        />
      )}
      </>
    )
  }

  // ============================================================================
  // STEP 2: SELFIES (REQUIRED) - or editing selfies
  // ============================================================================

  if (currentStep === 2 && (!editCategory || editCategory === 'selfies')) {
    return (
      <>
        <div className="flex flex-col min-h-[600px] px-6 py-12">
        <div className="max-w-[700px] w-full mx-auto space-y-8">
          {/* Back button */}
          <button
            onClick={() => {
              if (editCategory === 'selfies') {
                // When editing, back should cancel/close
                if (onCancel) {
                  onCancel()
                }
              } else {
                handleBack()
              }
            }}
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.sm,
              fontWeight: Typography.ui.weights.regular,
              color: Colors.textSecondary,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              alignSelf: 'flex-start',
            }}
            className="hover:opacity-70"
          >
            ← Back
          </button>

          {/* Header: "Selfies" */}
          <div className="space-y-2">
            <h2
              style={{
                fontFamily: Typography.headers.fontFamily,
                fontSize: Typography.headers.sizes.lg,
                fontWeight: Typography.headers.weights.medium,
                color: Colors.textPrimary,
                lineHeight: Typography.headers.lineHeight,
                letterSpacing: Typography.headers.letterSpacing,
              }}
            >
              Selfies
            </h2>

            {/* Required label */}
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.xs,
                  fontWeight: Typography.ui.weights.medium,
                  color: Colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {UILabels.required}
              </span>
            </div>
          </div>

          {/* Dividing line */}
          <div
            style={{
              height: '1px',
              backgroundColor: Colors.border,
              width: '100%',
            }}
          />

          {/* Description */}
          <p
            style={{
              fontFamily: Typography.body.fontFamily,
              fontSize: Typography.body.sizes.md,
              fontWeight: Typography.body.weights.regular,
              color: Colors.textSecondary,
              lineHeight: Typography.body.lineHeight,
              letterSpacing: Typography.body.letterSpacing,
            }}
          >
            Photos for face and features
          </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Choose from Gallery button */}
          <button
            onClick={handleChooseFromGallery}
            className="touch-manipulation active:scale-95"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.01em',
              color: Colors.primary,
              backgroundColor: 'transparent',
              padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)',
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
            {ButtonLabels.chooseFromGallery}
          </button>

          {/* Upload New button */}
          <button
            onClick={handleUploadNew}
            disabled={isUploading}
            className="touch-manipulation active:scale-95 disabled:active:scale-100"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.01em',
              color: Colors.surface,
              backgroundColor: isUploading ? Colors.border : Colors.primary,
              padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)',
              minHeight: '44px',
              borderRadius: BorderRadius.button,
              border: 'none',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
              opacity: isUploading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isUploading) {
                e.currentTarget.style.backgroundColor = Colors.accent
              }
            }}
            onMouseLeave={(e) => {
              if (!isUploading) {
                e.currentTarget.style.backgroundColor = Colors.primary
              }
            }}
          >
            {isUploading ? 'Uploading...' : ButtonLabels.uploadNew}
          </button>
        </div>

          {/* Error display */}
          {uploadError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: `1px solid rgba(239, 68, 68, 0.3)`,
                borderRadius: BorderRadius.button,
                marginTop: Spacing.element,
              }}
            >
              <p
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  fontWeight: Typography.ui.weights.regular,
                  color: '#DC2626',
                }}
              >
                {uploadError}
              </p>
            </div>
          )}

          {/* 🔴 FIX: Validation error display for missing selfies */}
          {validationError && currentStep === 2 && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: `1px solid rgba(239, 68, 68, 0.3)`,
                borderRadius: BorderRadius.button,
                marginTop: Spacing.element,
              }}
            >
              <p
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  fontWeight: Typography.ui.weights.medium,
                  color: '#DC2626',
                  lineHeight: Typography.body.lineHeight,
                }}
              >
                {validationError}
              </p>
            </div>
          )}

          {/* Selected images preview (if any) */}
          {library.selfies.length > 0 && (
            <div className="space-y-4 pt-4">
              <div
                style={{
                  height: '1px',
                  backgroundColor: Colors.border,
                  width: '100%',
                }}
              />
              <div className="space-y-2">
                <p
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  {UILabels.selfies(library.selfies.length)}
                </p>
                <ImageThumbnailsGrid images={library.selfies} category="selfies" />
              </div>
            </div>
          )}

          {/* Continue/Save button */}
          <div className="pt-6">
            <button
              onClick={() => {
                if (editCategory === 'selfies') {
                  // When editing, save and close
                  if (onComplete) {
                    onComplete(library)
                  }
                  if (onCancel) {
                    onCancel()
                  }
                } else {
                  // Normal flow, continue to next step
                  handleContinueFromStep2()
                }
              }}
              disabled={library.selfies.length === 0 && editCategory !== 'selfies'}
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.md,
                fontWeight: Typography.ui.weights.medium,
                letterSpacing: '0.5px',
                color: Colors.surface,
                backgroundColor: (library.selfies.length > 0 || editCategory === 'selfies') ? Colors.primary : Colors.border,
                padding: '12px 32px',
                borderRadius: BorderRadius.button,
                border: 'none',
                cursor: (library.selfies.length > 0 || editCategory === 'selfies') ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: (library.selfies.length > 0 || editCategory === 'selfies') ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (library.selfies.length > 0 || editCategory === 'selfies') {
                  e.currentTarget.style.backgroundColor = Colors.accent
                }
              }}
              onMouseLeave={(e) => {
                if (library.selfies.length > 0 || editCategory === 'selfies') {
                  e.currentTarget.style.backgroundColor = Colors.primary
                }
              }}
              className="hover:opacity-90"
            >
              {editCategory === 'selfies' ? 'Done' : ButtonLabels.continue}
            </button>
          </div>
        </div>
      </div>
      
      {/* Gallery Modal */}
      {showGalleryModal && (
        <ImageGalleryModal
          fetchImages={true}
          onSelect={handleGalleryImageSelect}
          onClose={() => {
            setShowGalleryModal(false)
            setGalleryCategory(null)
          }}
          multiple={true}
        />
      )}
      </>
    )
  }

  // ============================================================================
  // STEP 3: PRODUCTS, PEOPLE, VIBES (OPTIONAL) - or editing one of these categories
  // ============================================================================

  if (currentStep === 3 && (!editCategory || ['products', 'people', 'vibes'].includes(editCategory))) {
    // Helper component for optional category section
    const OptionalCategorySection = ({
      title,
      description,
      count,
      labelFn,
      onChooseFromGallery,
      onUploadNew,
      images,
      category,
    }: {
      title: string
      description: string
      count: number
      labelFn: (count: number) => string
      onChooseFromGallery: () => void
      onUploadNew: () => void
      images: string[]
      category: 'products' | 'people' | 'vibes'
    }) => (
      <div className="space-y-6">
        {/* Section Header */}
        <div className="space-y-2">
          <h3
            style={{
              fontFamily: Typography.headers.fontFamily,
              fontSize: Typography.headers.sizes.md,
              fontWeight: Typography.headers.weights.medium,
              color: Colors.textPrimary,
              lineHeight: Typography.headers.lineHeight,
              letterSpacing: Typography.headers.letterSpacing,
            }}
          >
            {title}
          </h3>

          {/* Optional label */}
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.xs,
                fontWeight: Typography.ui.weights.medium,
                color: Colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {UILabels.optional}
            </span>
          </div>
        </div>

        {/* Dividing line */}
        <div
          style={{
            height: '1px',
            backgroundColor: Colors.border,
            width: '100%',
          }}
        />

        {/* Description */}
        <p
          style={{
            fontFamily: Typography.body.fontFamily,
            fontSize: Typography.body.sizes.md,
            fontWeight: Typography.body.weights.regular,
            color: Colors.textSecondary,
            lineHeight: Typography.body.lineHeight,
            letterSpacing: Typography.body.letterSpacing,
          }}
        >
          {description}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Choose from Gallery button */}
          <button
            onClick={onChooseFromGallery}
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.md,
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.01em',
              color: Colors.primary,
              backgroundColor: 'transparent',
              padding: '12px 24px',
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
            {ButtonLabels.chooseFromGallery}
          </button>

          {/* Upload New button */}
          <button
            onClick={onUploadNew}
            disabled={isUploading}
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.md,
              fontWeight: Typography.ui.weights.medium,
              letterSpacing: '0.01em',
              color: Colors.surface,
              backgroundColor: isUploading ? Colors.border : Colors.primary,
              padding: '12px 24px',
              borderRadius: BorderRadius.button,
              border: 'none',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
              opacity: isUploading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isUploading) {
                e.currentTarget.style.backgroundColor = Colors.accent
              }
            }}
            onMouseLeave={(e) => {
              if (!isUploading) {
                e.currentTarget.style.backgroundColor = Colors.primary
              }
            }}
            className="hover:opacity-90"
          >
            {isUploading ? 'Uploading...' : ButtonLabels.uploadNew}
          </button>
        </div>

        {/* Error display for this category */}
        {uploadError && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid rgba(239, 68, 68, 0.3)`,
              borderRadius: BorderRadius.button,
              marginTop: Spacing.element,
            }}
          >
            <p
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.regular,
                color: '#DC2626',
              }}
            >
              {uploadError}
            </p>
            <button
              onClick={() => setUploadError(null)}
              style={{
                marginTop: '8px',
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.xs,
                color: '#DC2626',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Selected images preview (if any) */}
        {count > 0 && (
          <div className="space-y-2 pt-2">
            <p
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.medium,
                color: Colors.textPrimary,
              }}
            >
              {labelFn(count)}
            </p>
            <ImageThumbnailsGrid images={images} category={category} />
          </div>
        )}
      </div>
    )

    // Determine which category sections to show
    const categoryMap = {
      products: {
        title: 'Products',
        description: 'Brand products, packaging, or items for partnership content',
        count: library.products.length,
        labelFn: UILabels.products,
        images: library.products,
        category: 'products' as const,
      },
      people: {
        title: 'People',
        description: 'Lifestyle moments, group photos, or people in your content',
        count: library.people.length,
        labelFn: UILabels.people,
        images: library.people,
        category: 'people' as const,
      },
      vibes: {
        title: 'Vibes & Inspiration',
        description: 'Aesthetic references, mood boards, or style inspiration',
        count: library.vibes.length,
        labelFn: UILabels.vibes,
        images: library.vibes,
        category: 'vibes' as const,
      },
    }

    // If editing a specific category, only show that one
    const categoriesToShow = editCategory && ['products', 'people', 'vibes'].includes(editCategory)
      ? [categoryMap[editCategory]]
      : [categoryMap.products, categoryMap.people, categoryMap.vibes]

    return (
      <>
        <div className="flex flex-col min-h-[600px] px-6 py-12">
          <div className="max-w-[700px] w-full mx-auto space-y-12">
          {/* Back button */}
          <button
            onClick={() => {
              if (editCategory) {
                // When editing, back should cancel/close
                if (onCancel) {
                  onCancel()
                }
              } else {
                handleBack()
              }
            }}
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.sm,
              fontWeight: Typography.ui.weights.regular,
              color: Colors.textSecondary,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              alignSelf: 'flex-start',
            }}
            className="hover:opacity-70"
          >
            ← Back
          </button>

          {/* Category Sections */}
          {categoriesToShow.map((catConfig, index) => (
            <div key={catConfig.category}>
              {index > 0 && (
                <div
                  style={{
                    height: '1px',
                    backgroundColor: Colors.border,
                    width: '100%',
                    marginBottom: '3rem',
                  }}
                />
              )}
              <OptionalCategorySection
                title={catConfig.title}
                description={catConfig.description}
                count={catConfig.count}
                labelFn={catConfig.labelFn}
                onChooseFromGallery={() => handleChooseFromGalleryForCategory(catConfig.category)}
                onUploadNew={() => handleUploadNewForCategory(catConfig.category)}
                images={catConfig.images}
                category={catConfig.category}
              />
            </div>
          ))}

          {/* Continue/Done button */}
          <div className="pt-6">
            <button
              onClick={() => {
                if (editCategory && ['products', 'people', 'vibes'].includes(editCategory)) {
                  // When editing, save and close
                  if (onComplete) {
                    onComplete(library)
                  }
                  if (onCancel) {
                    onCancel()
                  }
                } else {
                  // Normal flow, continue to next step
                  handleContinueFromStep3()
                }
              }}
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.md,
                fontWeight: Typography.ui.weights.medium,
                letterSpacing: '0.5px',
                color: Colors.surface,
                backgroundColor: Colors.primary,
                padding: '12px 32px',
                borderRadius: BorderRadius.button,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = Colors.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = Colors.primary
              }}
              className="hover:opacity-90"
            >
              {editCategory && ['products', 'people', 'vibes'].includes(editCategory) ? 'Done' : ButtonLabels.continue}
            </button>
          </div>
          </div>
        </div>
        
        {/* Gallery Modal */}
        {showGalleryModal && (
          <ImageGalleryModal
            fetchImages={true}
            onSelect={handleGalleryImageSelect}
            onClose={() => {
              setShowGalleryModal(false)
              setGalleryCategory(null)
            }}
          />
        )}
      </>
    )
  }

  // ============================================================================
  // STEP 4: INTENT DESCRIPTION
  // ============================================================================

  if (currentStep === 4) {
    return (
      <>
        <div className="flex flex-col min-h-[600px] px-6 py-12">
        <div className="max-w-[700px] w-full mx-auto space-y-8">
          {/* Back button */}
          <button
            onClick={handleBack}
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.sm,
              fontWeight: Typography.ui.weights.regular,
              color: Colors.textSecondary,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              alignSelf: 'flex-start',
            }}
            className="hover:opacity-70"
          >
            ← Back
          </button>

          {/* Header: "What would you like to create with these images?" */}
          <div className="space-y-2">
            <h2
              style={{
                fontFamily: Typography.headers.fontFamily,
                fontSize: Typography.headers.sizes.lg,
                fontWeight: Typography.headers.weights.medium,
                color: Colors.textPrimary,
                lineHeight: Typography.headers.lineHeight,
                letterSpacing: Typography.headers.letterSpacing,
              }}
            >
              What would you like to create with these images?
            </h2>
          </div>

          {/* Dividing line */}
          <div
            style={{
              height: '1px',
              backgroundColor: Colors.border,
              width: '100%',
            }}
          />

          {/* Intent input */}
          <div className="space-y-2">
            <label
              htmlFor="intent-input"
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.medium,
                color: Colors.textPrimary,
              }}
            >
              Describe your creative intent
            </label>
            <textarea
              id="intent-input"
              value={library.intent}
              onChange={(e) => handleIntentChange(e.target.value)}
              placeholder="e.g., Create lifestyle content for my wellness brand, featuring morning routines and product showcases"
              rows={6}
              style={{
                fontFamily: Typography.body.fontFamily,
                fontSize: Typography.body.sizes.md,
                fontWeight: Typography.body.weights.regular,
                color: Colors.textPrimary,
                backgroundColor: Colors.surface,
                border: `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.input,
                padding: '12px 16px',
                width: '100%',
                resize: 'vertical',
                lineHeight: Typography.body.lineHeight,
                letterSpacing: Typography.body.letterSpacing,
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = Colors.primary
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = Colors.border
              }}
              className="focus:outline-none"
            />
            <p
              style={{
                fontFamily: Typography.body.fontFamily,
                fontSize: Typography.body.sizes.sm,
                fontWeight: Typography.body.weights.light,
                color: Colors.textTertiary,
                lineHeight: Typography.body.lineHeight,
              }}
            >
              This helps Maya understand your creative goals and generate relevant concepts.
            </p>
          </div>

          {/* Library summary (if images are selected) */}
          {(library.selfies.length > 0 ||
            library.products.length > 0 ||
            library.people.length > 0 ||
            library.vibes.length > 0) && (
            <div className="space-y-4 pt-4">
              <div
                style={{
                  height: '1px',
                  backgroundColor: Colors.border,
                  width: '100%',
                }}
              />
              <div className="space-y-2">
                <p
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.textPrimary,
                  }}
                >
                  Your Library
                </p>
                <div className="flex flex-wrap gap-4">
                  {library.selfies.length > 0 && (
                    <span
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.sm,
                        fontWeight: Typography.ui.weights.regular,
                        color: Colors.textSecondary,
                      }}
                    >
                      {UILabels.selfies(library.selfies.length)}
                    </span>
                  )}
                  {library.products.length > 0 && (
                    <span
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.sm,
                        fontWeight: Typography.ui.weights.regular,
                        color: Colors.textSecondary,
                      }}
                    >
                      {UILabels.products(library.products.length)}
                    </span>
                  )}
                  {library.people.length > 0 && (
                    <span
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.sm,
                        fontWeight: Typography.ui.weights.regular,
                        color: Colors.textSecondary,
                      }}
                    >
                      {UILabels.people(library.people.length)}
                    </span>
                  )}
                  {library.vibes.length > 0 && (
                    <span
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.sm,
                        fontWeight: Typography.ui.weights.regular,
                        color: Colors.textSecondary,
                      }}
                    >
                      {UILabels.vibes(library.vibes.length)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 🔴 FIX: Validation error display for missing intent */}
          {validationError && currentStep === 4 && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: `1px solid rgba(239, 68, 68, 0.3)`,
                borderRadius: BorderRadius.button,
                marginTop: Spacing.element,
              }}
            >
              <p
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  fontWeight: Typography.ui.weights.medium,
                  color: '#DC2626',
                  lineHeight: Typography.body.lineHeight,
                }}
              >
                {validationError}
              </p>
            </div>
          )}

          {/* Complete button */}
          <div className="pt-6">
            <button
              onClick={handleComplete}
              disabled={!library.intent.trim()}
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.md,
                fontWeight: Typography.ui.weights.medium,
                letterSpacing: '0.5px',
                color: Colors.surface,
                backgroundColor: library.intent.trim() ? Colors.primary : Colors.border,
                padding: '12px 32px',
                borderRadius: BorderRadius.button,
                border: 'none',
                cursor: library.intent.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: library.intent.trim() ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (library.intent.trim()) {
                  e.currentTarget.style.backgroundColor = Colors.accent
                }
              }}
              onMouseLeave={(e) => {
                if (library.intent.trim()) {
                  e.currentTarget.style.backgroundColor = Colors.primary
                }
              }}
              className="hover:opacity-90"
            >
              {ButtonLabels.startCreating}
            </button>
          </div>
        </div>
      </div>
      
      {/* Gallery Modal */}
      {showGalleryModal && (
        <ImageGalleryModal
          fetchImages={true}
          onSelect={handleGalleryImageSelect}
          onClose={() => {
            setShowGalleryModal(false)
            setGalleryCategory(null)
          }}
          multiple={true}
        />
      )}
      </>
    )
  }

  // Fallback (should not reach here)
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12">
        <p style={{ color: Colors.textSecondary }}>
          Step {currentStep} - Unknown step
        </p>
      </div>
      
      {/* Gallery Modal - available in all steps */}
      {showGalleryModal && (
        <ImageGalleryModal
          fetchImages={true}
          onSelect={handleGalleryImageSelect}
          onClose={() => {
            setShowGalleryModal(false)
            setGalleryCategory(null)
          }}
          multiple={true}
        />
      )}
    </>
  )
}
