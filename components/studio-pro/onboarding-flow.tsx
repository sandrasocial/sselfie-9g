"use client"

import { useState, useCallback, useEffect } from "react"

interface OnboardingFlowProps {
  entrySelection: 'just-me' | 'me-product' | 'editing' | 'full-brand'
  onComplete: () => void
}

type OnboardingStep = 'avatar' | 'brand-assets' | 'brand-kit' | 'complete'

export default function OnboardingFlow({ entrySelection, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('avatar')
  const [avatarImages, setAvatarImages] = useState<Array<{ id?: number; url: string; file?: File; fromGallery?: boolean }>>([])
  const [brandAssets, setBrandAssets] = useState<Array<{ id?: number; url: string; file?: File; type: string; fromGallery?: boolean }>>([])
  const [brandKit, setBrandKit] = useState({
    name: '',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    accentColor: '#999999',
    fontStyle: '',
    brandTone: '',
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarSource, setAvatarSource] = useState<'upload' | 'gallery'>('upload')
  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [loadingGallery, setLoadingGallery] = useState(false)
  const [showGalleryModal, setShowGalleryModal] = useState(false)

  // Determine required steps based on entry selection
  const requiredSteps: OnboardingStep[] = ['avatar'] // Always required
  if (entrySelection === 'me-product' || entrySelection === 'full-brand') {
    requiredSteps.push('brand-assets')
  }
  if (entrySelection === 'full-brand') {
    requiredSteps.push('brand-kit')
  }

  // Load gallery images
  const loadGalleryImages = useCallback(async () => {
    setLoadingGallery(true)
    try {
      const response = await fetch('/api/gallery/images', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setGalleryImages(data.images || [])
      }
    } catch (error) {
      console.error('Failed to load gallery images:', error)
    } finally {
      setLoadingGallery(false)
    }
  }, [])

  // Load gallery when switching to gallery mode
  useEffect(() => {
    if (avatarSource === 'gallery' && galleryImages.length === 0) {
      loadGalleryImages()
    }
  }, [avatarSource, galleryImages.length, loadGalleryImages])

  const handleAvatarUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newFiles = Array.from(files).slice(0, 8 - avatarImages.length)
    
    // Create preview URLs
    const newImages = newFiles.map(file => ({
      url: URL.createObjectURL(file),
      file,
      fromGallery: false,
    }))

    setAvatarImages(prev => [...prev, ...newImages])
    setError(null)
  }, [avatarImages.length])

  const handleGalleryImageSelect = useCallback((image: any) => {
    if (avatarImages.length >= 8) {
      setError('Maximum 8 photos allowed')
      return
    }

    // Check if already selected
    const alreadySelected = avatarImages.some(img => img.url === image.image_url)
    if (alreadySelected) {
      setError('This image is already selected')
      return
    }

    setAvatarImages(prev => [...prev, {
      url: image.image_url,
      fromGallery: true,
      id: image.id,
    }])
    setShowGalleryModal(false)
    setError(null)
  }, [avatarImages])

  const handleBrandAssetUpload = useCallback(async (files: FileList | null, assetType: string) => {
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    const newAssets = newFiles.map(file => ({
      url: URL.createObjectURL(file),
      file,
      type: assetType,
    }))

    setBrandAssets(prev => [...prev, ...newAssets])
    setError(null)
  }, [])

  const removeAvatarImage = (index: number) => {
    setAvatarImages(prev => {
      const updated = [...prev]
      updated.splice(index, 1)
      return updated
    })
  }

  const removeBrandAsset = (index: number) => {
    setBrandAssets(prev => {
      const updated = [...prev]
      updated.splice(index, 1)
      return updated
    })
  }

  const handleNext = async () => {
    if (currentStep === 'avatar') {
      if (avatarImages.length < 3) {
        setError('Please upload at least 3 photos of yourself')
        return
      }
      if (avatarImages.length > 8) {
        setError('Maximum 8 photos allowed')
        return
      }

      // Upload avatar images
      setUploading(true)
      setError(null)

      try {
        // Separate gallery images (just URLs) from uploaded files
        const uploadedFiles = avatarImages.filter(img => img.file)
        const galleryImageUrls = avatarImages.filter(img => img.fromGallery).map(img => img.url)

        // Upload files if any
        if (uploadedFiles.length > 0) {
          const formData = new FormData()
          uploadedFiles.forEach((img) => {
            if (img.file) {
              formData.append('files', img.file)
            }
          })
          formData.append('imageType', 'casual')

          const uploadResponse = await fetch('/api/studio-pro/avatar', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })

          if (!uploadResponse.ok) {
            const data = await uploadResponse.json()
            throw new Error(data.error || 'Failed to upload avatar images')
          }
        }

        // Add gallery images by URL (if any)
        if (galleryImageUrls.length > 0) {
          for (const imageUrl of galleryImageUrls) {
            try {
              const galleryResponse = await fetch('/api/studio-pro/avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imageUrl,
                  imageType: 'casual',
                }),
                credentials: 'include',
              })

              if (!galleryResponse.ok) {
                const data = await galleryResponse.json().catch(() => ({ error: 'Failed to add gallery image' }))
                throw new Error(data.error || 'Failed to add gallery image')
              }
            } catch (err: any) {
              console.error('Error adding gallery image:', err)
              // Continue with other images even if one fails
            }
          }
        }

        const nextStepIndex = requiredSteps.indexOf(currentStep) + 1
        if (nextStepIndex < requiredSteps.length) {
          setCurrentStep(requiredSteps[nextStepIndex])
        } else {
          await completeOnboarding()
        }
      } catch (err: any) {
        setError(err.message || 'Failed to upload images')
      } finally {
        setUploading(false)
      }
    } else if (currentStep === 'brand-assets') {
      // Upload brand assets
      setUploading(true)
      setError(null)

      try {
        const productAssets = brandAssets.filter(a => a.type === 'product')
        if (productAssets.length > 0) {
          const formData = new FormData()
          productAssets.forEach(asset => {
            if (asset.file) {
              formData.append('files', asset.file)
            }
          })
          formData.append('assetType', 'product')

          const response = await fetch('/api/studio-pro/brand-assets', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to upload brand assets')
          }
        }

        const nextStepIndex = requiredSteps.indexOf(currentStep) + 1
        if (nextStepIndex < requiredSteps.length) {
          setCurrentStep(requiredSteps[nextStepIndex])
        } else {
          await completeOnboarding()
        }
      } catch (err: any) {
        setError(err.message || 'Failed to upload brand assets')
      } finally {
        setUploading(false)
      }
    } else if (currentStep === 'brand-kit') {
      if (!brandKit.name) {
        setError('Please enter a brand kit name')
        return
      }

      setUploading(true)
      setError(null)

      try {
        const response = await fetch('/api/studio-pro/brand-kits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: brandKit.name,
            primaryColor: brandKit.primaryColor,
            secondaryColor: brandKit.secondaryColor,
            accentColor: brandKit.accentColor,
            fontStyle: brandKit.fontStyle,
            brandTone: brandKit.brandTone,
            isDefault: true,
          }),
          credentials: 'include',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create brand kit')
        }

        await completeOnboarding()
      } catch (err: any) {
        setError(err.message || 'Failed to create brand kit')
      } finally {
        setUploading(false)
      }
    }
  }

  const completeOnboarding = async () => {
    setUploading(true)
    try {
      const response = await fetch('/api/studio-pro/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlockPro: true }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      setCurrentStep('complete')
      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding')
    } finally {
      setUploading(false)
    }
  }

  const handleBack = () => {
    const currentIndex = requiredSteps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(requiredSteps[currentIndex - 1])
    }
  }

  const canProceed = () => {
    if (currentStep === 'avatar') {
      return avatarImages.length >= 3 && avatarImages.length <= 8
    }
    if (currentStep === 'brand-assets') {
      return true // Optional step
    }
    if (currentStep === 'brand-kit') {
      return brandKit.name.length > 0
    }
    return false
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-stone-50 to-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-2xl w-full mx-auto">
        {/* Progress indicator */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            {requiredSteps.map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`
                  flex-1 h-0.5 rounded-full
                  ${index <= requiredSteps.indexOf(currentStep)
                    ? 'bg-stone-900'
                    : 'bg-stone-200/60'
                  }
                `} />
                {index < requiredSteps.length - 1 && (
                  <div className={`
                    w-1 h-1 rounded-full mx-1
                    ${index < requiredSteps.indexOf(currentStep)
                      ? 'bg-stone-900'
                      : 'bg-stone-200/60'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="text-xs text-stone-500 text-center tracking-wide">
            Step {requiredSteps.indexOf(currentStep) + 1} of {requiredSteps.length}
          </div>
        </div>

        {/* Avatar Setup */}
        {currentStep === 'avatar' && (
          <div>
            <h2 className="text-lg font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Upload your avatar photos
            </h2>
            <p className="text-sm text-stone-600 mb-6 leading-relaxed tracking-wide">
              Upload 3–8 photos of yourself. This lets me keep your face, vibe, and style consistent across everything we create.
            </p>

            {/* Source Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAvatarSource('upload')}
                className={`px-4 py-2 rounded-xl text-sm transition-all ${
                  avatarSource === 'upload'
                    ? 'bg-stone-900 text-white'
                    : 'bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-700 hover:border-stone-300'
                }`}
              >
                Upload Photos
              </button>
              <button
                onClick={() => {
                  setAvatarSource('gallery')
                  if (galleryImages.length === 0) {
                    loadGalleryImages()
                  }
                }}
                className={`px-4 py-2 rounded-xl text-sm transition-all ${
                  avatarSource === 'gallery'
                    ? 'bg-stone-900 text-white'
                    : 'bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-700 hover:border-stone-300'
                }`}
              >
                Choose from Gallery
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {avatarImages.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200/60 bg-white/80 backdrop-blur-xl">
                  <img src={img.url} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeAvatarImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-stone-900/80 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-stone-900 transition-colors"
                    aria-label="Remove image"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {avatarImages.length < 8 && avatarSource === 'upload' && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-stone-300/60 bg-white/40 backdrop-blur-xl flex items-center justify-center cursor-pointer hover:border-stone-400 hover:bg-white/60 transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleAvatarUpload(e.target.files)}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-stone-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-xs text-stone-500">Add</span>
                  </div>
                </label>
              )}
              {avatarImages.length < 8 && avatarSource === 'gallery' && (
                <button
                  onClick={() => setShowGalleryModal(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-stone-300/60 bg-white/40 backdrop-blur-xl flex items-center justify-center cursor-pointer hover:border-stone-400 hover:bg-white/60 transition-all"
                >
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-stone-400 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs text-stone-500">Choose</span>
                  </div>
                </button>
              )}
            </div>

            <p className="text-xs text-stone-500 mb-6 tracking-wide">
              {avatarImages.length} / 8 photos uploaded
              {avatarImages.length < 3 && ' (minimum 3 required)'}
            </p>
          </div>
        )}

        {/* Brand Assets */}
        {currentStep === 'brand-assets' && (
          <div>
            <h2 className="text-lg font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Upload brand assets (optional)
            </h2>
            <p className="text-sm text-stone-600 mb-6 leading-relaxed tracking-wide">
              Add product photos, logos, or packaging. You can skip this and add them later.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
                  Product Photos
                </label>
                <label className="block w-full p-6 border-2 border-dashed border-stone-300/60 rounded-xl bg-white/40 backdrop-blur-xl cursor-pointer hover:border-stone-400 hover:bg-white/60 transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleBrandAssetUpload(e.target.files, 'product')}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto mb-2 border-2 border-stone-400 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-sm text-stone-600">Upload product photos</span>
                  </div>
                </label>
              </div>
            </div>

            {brandAssets.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                {brandAssets.map((asset, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200/60 bg-white/80 backdrop-blur-xl">
                    <img src={asset.url} alt={`Asset ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeBrandAsset(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-stone-900/80 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-stone-900 transition-colors"
                      aria-label="Remove asset"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Brand Kit */}
        {currentStep === 'brand-kit' && (
          <div>
            <h2 className="text-lg font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Create your brand kit (optional)
            </h2>
            <p className="text-sm text-stone-600 mb-6 leading-relaxed tracking-wide">
              Set your brand colors and style. I'll use these to maintain consistency in all your assets.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
                  Brand Kit Name *
                </label>
                <input
                  type="text"
                  value={brandKit.name}
                  onChange={(e) => setBrandKit(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Brand"
                  className="w-full px-4 py-2.5 border border-stone-300/60 rounded-xl bg-white/80 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-stone-900/50 focus:border-stone-900 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={brandKit.primaryColor}
                    onChange={(e) => setBrandKit(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-full h-12 rounded-xl border border-stone-300/60 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    value={brandKit.secondaryColor}
                    onChange={(e) => setBrandKit(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-full h-12 rounded-xl border border-stone-300/60 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={brandKit.accentColor}
                    onChange={(e) => setBrandKit(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-full h-12 rounded-xl border border-stone-300/60 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
                  Brand Tone
                </label>
                <select
                  value={brandKit.brandTone}
                  onChange={(e) => setBrandKit(prev => ({ ...prev, brandTone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-300/60 rounded-xl bg-white/80 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-stone-900/50 focus:border-stone-900 transition-all"
                >
                  <option value="">Select tone</option>
                  <option value="bold">Bold</option>
                  <option value="soft">Soft</option>
                  <option value="minimalist">Minimalist</option>
                  <option value="luxury">Luxury</option>
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Complete */}
        {currentStep === 'complete' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              You're all set!
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed tracking-wide">
              Your Pro workspace is ready. Let's create something amazing.
            </p>
          </div>
        )}


        {/* Gallery Modal */}
        {showGalleryModal && (
          <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setShowGalleryModal(false)}>
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-6 border-b border-stone-200/60">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm sm:text-base font-semibold text-stone-950">Choose from Gallery</h3>
                  <button
                    onClick={() => setShowGalleryModal(false)}
                    className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {loadingGallery ? (
                  <div className="text-center py-12">
                    <div className="text-stone-600 text-sm">Loading gallery...</div>
                  </div>
                ) : galleryImages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-stone-600">No images in your gallery yet.</p>
                    <p className="text-xs text-stone-500 mt-2">Upload some images first, then come back here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {galleryImages.map((image) => {
                      const isSelected = avatarImages.some(img => img.url === image.image_url)
                      return (
                        <button
                          key={image.id}
                          onClick={() => !isSelected && handleGalleryImageSelect(image)}
                          disabled={isSelected}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-stone-900 opacity-50 cursor-not-allowed'
                              : 'border-stone-200/60 hover:border-stone-900 cursor-pointer'
                          }`}
                        >
                          <img
                            src={image.image_url}
                            alt={image.prompt || 'Gallery image'}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
                              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Fixed Navigation Footer - Always Visible */}
      {currentStep !== 'complete' && (
        <div className="flex-shrink-0 border-t border-stone-200/60 bg-white/80 backdrop-blur-xl p-4 sm:p-6">
          <div className="max-w-2xl w-full mx-auto">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 sm:p-4 bg-red-50/80 backdrop-blur-xl border border-red-200/60 rounded-xl text-red-700 text-xs sm:text-sm">
                {error}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleBack}
                disabled={requiredSteps.indexOf(currentStep) === 0 || uploading}
                className={`
                  flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-xs sm:text-sm
                  ${requiredSteps.indexOf(currentStep) === 0 || uploading
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    : 'bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-700 hover:border-stone-300'
                  }
                `}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed() || uploading}
                className={`
                  flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-xs sm:text-sm
                  ${canProceed() && !uploading
                    ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }
                `}
              >
                {uploading ? 'Uploading...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


