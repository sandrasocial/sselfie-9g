"use client"

import { useState, useEffect } from "react"

interface EditReuseWorkflowProps {
  initialBaseImage?: string
  onClose?: () => void
  onComplete?: () => void
}

type ImageSource = 'upload' | 'gallery' | 'avatar'
type EditGoal = 'remove-object' | 'change-outfit' | 'improve-lighting' | 'turn-into-reel-cover' | 'turn-into-carousel-slide'

export default function EditReuseWorkflow({ initialBaseImage, onClose, onComplete }: EditReuseWorkflowProps) {
  const [imageSource, setImageSource] = useState<ImageSource>('upload')
  const [baseImageUrl, setBaseImageUrl] = useState<string>(initialBaseImage || '')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string>('')
  const [selectedAvatarImage, setSelectedAvatarImage] = useState<string>('')
  const [goal, setGoal] = useState<EditGoal | ''>('')
  const [editInstruction, setEditInstruction] = useState('')
  const [textOverlay, setTextOverlay] = useState({
    title: '',
    placement: 'top' as 'top' | 'center' | 'bottom',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<string[]>([])

  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [avatarImages, setAvatarImages] = useState<any[]>([])

  useEffect(() => {
    loadGalleryImages()
    loadAvatarImages()
  }, [])

  useEffect(() => {
    // Update baseImageUrl when source changes
    if (imageSource === 'gallery' && selectedGalleryImage) {
      setBaseImageUrl(selectedGalleryImage)
    } else if (imageSource === 'avatar' && selectedAvatarImage) {
      setBaseImageUrl(selectedAvatarImage)
    } else if (imageSource === 'upload' && uploadedFile) {
      setBaseImageUrl(URL.createObjectURL(uploadedFile))
    } else if (initialBaseImage) {
      setBaseImageUrl(initialBaseImage)
      setImageSource('gallery')
      setSelectedGalleryImage(initialBaseImage)
    }
  }, [imageSource, selectedGalleryImage, selectedAvatarImage, uploadedFile, initialBaseImage])

  const loadGalleryImages = async () => {
    try {
      // TODO: Load from pro_generations API
      const response = await fetch('/api/studio-pro/generations?limit=30', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setGalleryImages(data.generations || [])
      }
    } catch (error) {
      console.error('Failed to load gallery images:', error)
    }
  }

  const loadAvatarImages = async () => {
    try {
      const response = await fetch('/api/studio-pro/avatar', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAvatarImages(data.images || [])
      }
    } catch (error) {
      console.error('Failed to load avatar images:', error)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      setImageSource('upload')
      setError(null)
    }
  }

  const handleGenerate = async () => {
    if (!baseImageUrl) {
      setError('Please select a base image')
      return
    }

    if (!goal) {
      setError('Please select a goal')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResults([])

    try {
      // Upload file if needed
      let finalImageUrl = baseImageUrl
      if (uploadedFile && imageSource === 'upload') {
        const formData = new FormData()
        formData.append('file', uploadedFile)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to upload image')
        }

        const uploadData = await uploadResponse.json()
        finalImageUrl = uploadData.url
      }

      // Determine workflow type and mode
      let workflowType = 'edit-image'
      let mode = 'edit-image'
      let reuseGoal: string | undefined

      if (goal === 'turn-into-reel-cover' || goal === 'turn-into-carousel-slide') {
        workflowType = 'reuse-adapt'
        mode = 'reuse-adapt'
        reuseGoal = goal === 'turn-into-reel-cover' ? 'reel-cover' : 'carousel-slide'
      } else if (goal === 'remove-object') {
        mode = 'remove-object'
      } else if (goal === 'change-outfit') {
        mode = 'change-outfit'
      } else {
        mode = 'edit-image'
      }

      // Build request payload
      const payload: any = {
        baseImageUrl: finalImageUrl,
        goal,
        editInstruction: editInstruction || undefined,
        workflowType,
        mode,
        reuseGoal,
      }

      // Add text overlay if needed
      if ((goal === 'turn-into-reel-cover' || goal === 'turn-into-carousel-slide') && textOverlay.title) {
        payload.textOverlay = {
          title: textOverlay.title,
          placement: textOverlay.placement,
        }
      }

      const response = await fetch('/api/studio-pro/generate/edit-reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Generation failed')
      }

      const data = await response.json()
      setResults(data.imageUrls || [data.imageUrl].filter(Boolean))

      // Notify parent of completion
      if (onComplete) {
        setTimeout(() => {
          onComplete()
        }, 2000)
      }

      // Refresh gallery after a short delay
      setTimeout(() => {
        loadGalleryImages()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Failed to generate')
    } finally {
      setIsGenerating(false)
    }
  }

  const showTextOverlay = goal === 'turn-into-reel-cover' || goal === 'turn-into-carousel-slide'

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-stone-50 to-white p-6 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Edit / Reuse & Adapt
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed tracking-wide">
              Transform existing images by editing, removing objects, changing outfits, or adapting for different formats.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Base Image Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
            Base Image *
          </label>

          {/* Source selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setImageSource('upload')}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                imageSource === 'upload'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-700 hover:border-stone-300'
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setImageSource('gallery')}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                imageSource === 'gallery'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-700 hover:border-stone-300'
              }`}
            >
              Pro Gallery
            </button>
            <button
              onClick={() => setImageSource('avatar')}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                imageSource === 'avatar'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-700 hover:border-stone-300'
              }`}
            >
              Avatar
            </button>
          </div>

          {/* Upload input */}
          {imageSource === 'upload' && (
            <label className="block w-full p-6 border-2 border-dashed border-stone-300/60 rounded-xl bg-white/40 backdrop-blur-xl cursor-pointer hover:border-stone-400 hover:bg-white/60 transition-all">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="text-center">
                {baseImageUrl ? (
                  <img src={baseImageUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg mb-2" />
                ) : (
                  <>
                    <div className="w-10 h-10 mx-auto mb-2 border-2 border-stone-400 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-sm text-stone-600">Click to upload image</span>
                  </>
                )}
              </div>
            </label>
          )}

          {/* Gallery selector */}
          {imageSource === 'gallery' && (
            <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 border border-stone-200/60 rounded-xl bg-white/80 backdrop-blur-xl">
              {galleryImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedGalleryImage(img.image_url || img.url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedGalleryImage === (img.image_url || img.url)
                      ? 'border-stone-900'
                      : 'border-stone-200/60 hover:border-stone-300'
                  }`}
                >
                  <img
                    src={img.image_url || img.url}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Avatar selector */}
          {imageSource === 'avatar' && (
            <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 border border-stone-200/60 rounded-xl bg-white/80 backdrop-blur-xl">
              {avatarImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAvatarImage(img.image_url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedAvatarImage === img.image_url
                      ? 'border-stone-900'
                      : 'border-stone-200/60 hover:border-stone-300'
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Preview */}
          {baseImageUrl && imageSource !== 'upload' && (
            <div className="mt-4">
              <img src={baseImageUrl} alt="Selected" className="max-h-64 mx-auto rounded-lg border border-stone-200/60" />
            </div>
          )}
        </div>

        {/* Goal Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
            What would you like to do? *
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as EditGoal)}
            className="w-full px-4 py-2.5 border border-stone-300/60 rounded-xl bg-white/80 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-stone-900/50 focus:border-stone-900 transition-all"
          >
            <option value="">Select a goal</option>
            <option value="remove-object">Remove object</option>
            <option value="change-outfit">Change outfit</option>
            <option value="improve-lighting">Improve lighting</option>
            <option value="turn-into-reel-cover">Turn into Reel Cover</option>
            <option value="turn-into-carousel-slide">Turn into Carousel Slide</option>
          </select>
        </div>

        {/* Edit Instruction */}
        {goal && goal !== 'turn-into-reel-cover' && goal !== 'turn-into-carousel-slide' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
              What exactly should change? (optional)
            </label>
            <textarea
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              placeholder="Describe the specific changes you want..."
              rows={3}
              className="w-full px-4 py-2.5 border border-stone-300/60 rounded-xl bg-white/80 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-stone-900/50 focus:border-stone-900 transition-all resize-none"
            />
          </div>
        )}

        {/* Text Overlay (for Reel Cover / Carousel) */}
        {showTextOverlay && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
                Title Text (optional)
              </label>
              <input
                type="text"
                value={textOverlay.title}
                onChange={(e) => setTextOverlay(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter title text"
                className="w-full px-4 py-2.5 border border-stone-300/60 rounded-xl bg-white/80 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-stone-900/50 focus:border-stone-900 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2 tracking-wide">
                Text Placement
              </label>
              <select
                value={textOverlay.placement}
                onChange={(e) => setTextOverlay(prev => ({ ...prev, placement: e.target.value as 'top' | 'center' | 'bottom' }))}
                className="w-full px-4 py-2.5 border border-stone-300/60 rounded-xl bg-white/80 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-stone-900/50 focus:border-stone-900 transition-all"
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-xl border border-red-200/60 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!baseImageUrl || !goal || isGenerating}
          className={`
            w-full py-3 px-6 rounded-xl font-semibold transition-all text-sm mb-6
            ${baseImageUrl && goal && !isGenerating
              ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }
          `}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-stone-950 mb-4 tracking-wide">Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {results.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200/60 bg-white/80 backdrop-blur-xl">
                  <img src={url} alt={`Result ${index + 1}`} className="w-full h-full object-cover" />
                  <a
                    href={url}
                    download
                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-stone-900 text-white text-xs rounded-lg hover:bg-stone-800 transition-colors"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


