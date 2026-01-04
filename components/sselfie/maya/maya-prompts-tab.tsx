"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Sparkles, Loader2, Settings, X, ChevronLeft, ChevronRight, Search, ArrowUpDown, Heart, Clock, TrendingUp } from "lucide-react"
import Image from "next/image"
import FullscreenImageModal from "../fullscreen-image-modal"

interface PromptItem {
  id: number
  concept_title: string | null
  prompt_text: string
  image_url: string | null
  category: string | null
  guide_title?: string
  guide_description?: string
}

interface GeneratedImage {
  promptId: number
  imageUrl: string | null
  predictionId: string | null
  generationId: string | null
  isGenerating: boolean
  isGenerated: boolean
  error: string | null
  galleryImageId?: string // ID from ai_images table (format: "ai_123")
  isFavorite?: boolean // Favorite status from ai_images table
}

interface MayaPromptsTabProps {
  onSelectPrompt: (prompt: string, title?: string) => void
  sharedImages?: Array<{
    url: string
    id: string
    prompt?: string
    description?: string
    category?: string
  }>
  userId?: string
  creditBalance?: number
  onCreditsUpdate?: (newBalance: number) => void
  proMode?: boolean // 🔴 FIX: Changed from studioProMode to proMode
  imageLibrary?: {
    selfies: string[]
    products: string[]
    people: string[]
    vibes: string[]
    intent: string
  }
  onOpenUploadFlow?: () => void
}

export default function MayaPromptsTab({ 
  onSelectPrompt, 
  sharedImages = [],
  userId,
  creditBalance,
  onCreditsUpdate,
  proMode = false, // 🔴 FIX: Changed from studioProMode to proMode
  imageLibrary: externalImageLibrary,
  onOpenUploadFlow,
}: MayaPromptsTabProps) {
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Search and sorting state
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alphabetical" | "category">("newest")
  
  // Local image library state (only used if external library not provided)
  const [localImageLibrary, setLocalImageLibrary] = useState<{
    selfies: string[]
    products: string[]
    people: string[]
    vibes: string[]
    intent: string
  }>({
    selfies: [],
    products: [],
    people: [],
    vibes: [],
    intent: "",
  })

  // Use external image library if provided (from Maya screen), otherwise use local
  const imageLibrary = externalImageLibrary || localImageLibrary

  // Generated images per prompt (user-specific, stored in component state)
  const [generatedImages, setGeneratedImages] = useState<Map<number, GeneratedImage>>(new Map())
  
  // Image preview modal state
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  // Fullscreen modal state (for generated images with save/download/favorite)
  const [fullscreenImage, setFullscreenImage] = useState<{
    imageUrl: string
    imageId: string
    title: string
    isFavorite: boolean
    predictionId?: string
  } | null>(null)
  const [imageFavorites, setImageFavorites] = useState<Set<string>>(new Set()) // Image favorites (for fullscreen modal)
  const [promptFavorites, setPromptFavorites] = useState<Set<number>>(new Set()) // Prompt favorites
  const [recentlyUsedPrompts, setRecentlyUsedPrompts] = useState<number[]>([]) // Recently used prompt IDs
  const [promptUsageCounts, setPromptUsageCounts] = useState<Map<number, number>>(new Map()) // Usage counts
  
  // Get all images for preview
  const getAllImages = () => {
    return [
      ...imageLibrary.selfies,
      ...imageLibrary.products,
      ...imageLibrary.people,
      ...imageLibrary.vibes,
    ]
  }
  
  // Handle thumbnail click (for header thumbnails)
  const handleThumbnailClick = (index: number) => {
    setPreviewImageIndex(index)
    setPreviewImageUrl(null) // Clear single image URL when using index
    setIsPreviewOpen(true)
  }
  
  // Handle generated image click (for prompt card images)
  const handleGeneratedImageClick = async (imageUrl: string, predictionId?: string, promptTitle?: string) => {
    // Look up image info from gallery
    let imageId = `prompt_${Date.now()}` // Fallback ID
    let isFavorite = false
    
    try {
      const lookupUrl = predictionId 
        ? `/api/images/lookup?predictionId=${encodeURIComponent(predictionId)}`
        : `/api/images/lookup?url=${encodeURIComponent(imageUrl)}`
      
      const response = await fetch(lookupUrl)
      const data = await response.json()
      
      if (data.image) {
        imageId = data.image.id
        isFavorite = data.image.isFavorite
      }
    } catch (error) {
      console.error("[MayaPromptsTab] Error looking up image:", error)
    }
    
    setFullscreenImage({
      imageUrl,
      imageId,
      title: promptTitle || "Generated Image",
      isFavorite,
      predictionId,
    })
  }
  
  // Toggle favorite for generated image
  const toggleFavorite = async (imageId: string, currentFavoriteState: boolean) => {
    const newFavoriteState = !currentFavoriteState
    
    // Update local state
    const newFavorites = new Set(imageFavorites)
    if (newFavoriteState) {
      newFavorites.add(imageId)
    } else {
      newFavorites.delete(imageId)
    }
    setImageFavorites(newFavorites)
    
    // Update fullscreen image state
    if (fullscreenImage) {
      setFullscreenImage({
        ...fullscreenImage,
        isFavorite: newFavoriteState,
      })
    }
    
    // Update in database
    try {
      const response = await fetch("/api/images/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, isFavorite: newFavoriteState }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to update favorite")
      }
      
      // Also update the generatedImages map if we have the predictionId
      if (fullscreenImage?.predictionId) {
        setGeneratedImages((prev) => {
          const newMap = new Map(prev)
          for (const [promptId, genImage] of newMap.entries()) {
            if (genImage.predictionId === fullscreenImage.predictionId) {
              newMap.set(promptId, {
                ...genImage,
                galleryImageId: imageId,
                isFavorite: newFavoriteState,
              })
            }
          }
          return newMap
        })
      }
    } catch (error) {
      console.error("[MayaPromptsTab] Error toggling favorite:", error)
      // Revert local state on error
      const revertedFavorites = new Set(imageFavorites)
      if (currentFavoriteState) {
        revertedFavorites.add(imageId)
      } else {
        revertedFavorites.delete(imageId)
      }
      setImageFavorites(revertedFavorites)
      if (fullscreenImage) {
        setFullscreenImage({
          ...fullscreenImage,
          isFavorite: currentFavoriteState,
        })
      }
    }
  }
  
  // Delete image (if it exists in gallery)
  const deleteImage = async (imageId: string) => {
    try {
      const response = await fetch("/api/images/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete image")
      }
      
      // Close modal and remove from generated images
      setFullscreenImage(null)
      
      // Remove from generatedImages map
      if (fullscreenImage?.predictionId) {
        setGeneratedImages((prev) => {
          const newMap = new Map(prev)
          for (const [promptId, genImage] of newMap.entries()) {
            if (genImage.predictionId === fullscreenImage.predictionId) {
              newMap.delete(promptId)
            }
          }
          return newMap
        })
      }
    } catch (error) {
      console.error("[MayaPromptsTab] Error deleting image:", error)
    }
  }
  
  // Handle navigation in preview
  const handlePrevImage = () => {
    const allImages = getAllImages()
    if (previewImageIndex !== null && previewImageIndex > 0) {
      setPreviewImageIndex(previewImageIndex - 1)
    }
  }
  
  const handleNextImage = () => {
    const allImages = getAllImages()
    if (previewImageIndex !== null && previewImageIndex < allImages.length - 1) {
      setPreviewImageIndex(previewImageIndex + 1)
    }
  }
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isPreviewOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPreviewOpen(false)
      } else if (e.key === 'ArrowLeft') {
        const allImages = getAllImages()
        if (previewImageIndex !== null && previewImageIndex > 0) {
          setPreviewImageIndex(previewImageIndex - 1)
        }
      } else if (e.key === 'ArrowRight') {
        const allImages = getAllImages()
        if (previewImageIndex !== null && previewImageIndex < allImages.length - 1) {
          setPreviewImageIndex(previewImageIndex + 1)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPreviewOpen, previewImageIndex])

  // Render preview modal
  const renderPreviewModal = () => {
    if (!isPreviewOpen) return null
    
    // If previewImageUrl is set, show single image (from prompt card generated image)
    if (previewImageUrl) {
      return (
        <div
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => {
            setIsPreviewOpen(false)
            setPreviewImageUrl(null)
          }}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => {
              setIsPreviewOpen(false)
              setPreviewImageUrl(null)
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
          </button>
          
          {/* Image Container */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImageUrl || "/placeholder.svg"}
              alt="Generated image preview"
              className="max-w-full max-h-full object-contain"
              loading="eager"
            />
          </div>
        </div>
      )
    }
    
    // Otherwise, show image from library with navigation (from header thumbnails)
    if (previewImageIndex === null) return null
    
    const allImages = getAllImages()
    if (previewImageIndex < 0 || previewImageIndex >= allImages.length) return null
    const currentImage = allImages[previewImageIndex]
    if (!currentImage) return null
    
    const canGoPrev = previewImageIndex > 0
    const canGoNext = previewImageIndex < allImages.length - 1
    
    return (
      <div
        key={`preview-${previewImageIndex}`}
        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
        onClick={() => setIsPreviewOpen(false)}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsPreviewOpen(false)}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl"
          aria-label="Close preview"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
        </button>
        
        {/* Navigation Buttons */}
        {allImages.length > 1 && (
          <>
            {canGoPrev && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewImageIndex(previewImageIndex - 1)
                }}
                className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
              </button>
            )}
            {canGoNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewImageIndex(previewImageIndex + 1)
                }}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
              </button>
            )}
          </>
        )}
        
        {/* Image Counter */}
        {allImages.length > 1 && (
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl text-white text-xs font-medium">
            {previewImageIndex + 1} / {allImages.length}
          </div>
        )}
        
        {/* Image Container */}
        <div
          className="relative w-full h-full flex items-center justify-center p-4 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={currentImage || "/placeholder.svg"}
            alt={`Preview ${previewImageIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            loading="eager"
          />
        </div>
      </div>
    )
  }

  // Load image library from localStorage on mount (only if not provided externally)
  useEffect(() => {
    if (!externalImageLibrary && typeof window !== "undefined") {
      const saved = localStorage.getItem("mayaImageLibrary")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setLocalImageLibrary(parsed)
        } catch (err) {
          console.error("[MayaPromptsTab] Error loading image library:", err)
        }
      }
    }
  }, [externalImageLibrary])

  // Load generated images from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mayaPromptsGeneratedImages")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const map = new Map<number, GeneratedImage>()
          Object.entries(parsed).forEach(([key, value]) => {
            map.set(Number(key), value as GeneratedImage)
          })
          setGeneratedImages(map)
        } catch (err) {
          console.error("[MayaPromptsTab] Error loading generated images:", err)
        }
      }
      
      // Load prompt favorites
      const savedFavorites = localStorage.getItem("mayaPromptFavorites")
      if (savedFavorites) {
        try {
          const parsed = JSON.parse(savedFavorites)
          setPromptFavorites(new Set(parsed))
        } catch (err) {
          console.error("[MayaPromptsTab] Error loading prompt favorites:", err)
        }
      }
      
      // Load recently used prompts
      const savedRecent = localStorage.getItem("mayaRecentlyUsedPrompts")
      if (savedRecent) {
        try {
          const parsed = JSON.parse(savedRecent)
          setRecentlyUsedPrompts(parsed)
        } catch (err) {
          console.error("[MayaPromptsTab] Error loading recently used prompts:", err)
        }
      }
      
      // Load usage counts
      const savedCounts = localStorage.getItem("mayaPromptUsageCounts")
      if (savedCounts) {
        try {
          const parsed = JSON.parse(savedCounts)
          setPromptUsageCounts(new Map(Object.entries(parsed).map(([k, v]) => [Number(k), v as number])))
        } catch (err) {
          console.error("[MayaPromptsTab] Error loading usage counts:", err)
        }
      }
    }
  }, [])

  // Save generated images to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && generatedImages.size > 0) {
      const obj = Object.fromEntries(generatedImages)
      localStorage.setItem("mayaPromptsGeneratedImages", JSON.stringify(obj))
    }
  }, [generatedImages])

  // Save prompt favorites to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mayaPromptFavorites", JSON.stringify(Array.from(promptFavorites)))
    }
  }, [promptFavorites])

  // Save recently used prompts to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && recentlyUsedPrompts.length > 0) {
      localStorage.setItem("mayaRecentlyUsedPrompts", JSON.stringify(recentlyUsedPrompts))
    }
  }, [recentlyUsedPrompts])

  // Save usage counts to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && promptUsageCounts.size > 0) {
      const obj = Object.fromEntries(promptUsageCounts)
      localStorage.setItem("mayaPromptUsageCounts", JSON.stringify(obj))
    }
  }, [promptUsageCounts])

  useEffect(() => {
    fetchPrompts()
  }, [selectedCategory])

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter and sort prompts
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = prompts

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    // Apply search filter (using debounced query)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (p) =>
          p.concept_title?.toLowerCase().includes(query) ||
          p.prompt_text?.toLowerCase().includes(query) ||
          p.guide_description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    const sorted = [...filtered]
    switch (sortBy) {
      case "newest":
        // Assuming prompts are already sorted by newest from API (sort_order ASC)
        // Keep as-is
        break
      case "oldest":
        sorted.reverse()
        break
      case "alphabetical":
        sorted.sort((a, b) => {
          const titleA = (a.concept_title || "").toLowerCase()
          const titleB = (b.concept_title || "").toLowerCase()
          return titleA.localeCompare(titleB)
        })
        break
      case "category":
        sorted.sort((a, b) => {
          const catA = (a.category || "").toLowerCase()
          const catB = (b.category || "").toLowerCase()
          if (catA === catB) {
            // If same category, sort by title
            const titleA = (a.concept_title || "").toLowerCase()
            const titleB = (b.concept_title || "").toLowerCase()
            return titleA.localeCompare(titleB)
          }
          return catA.localeCompare(catB)
        })
        break
    }

    return sorted
  }, [prompts, selectedCategory, debouncedSearchQuery, sortBy])

  // Poll for image generation status (different endpoints for Classic vs Pro)
  useEffect(() => {
    const pollIntervals: Map<number, NodeJS.Timeout> = new Map()

    generatedImages.forEach((genImage, promptId) => {
      // For Pro mode: only need predictionId
      // For Classic mode: need both predictionId and generationId
      const canPoll = proMode
        ? (genImage.isGenerating && genImage.predictionId && !genImage.isGenerated)
        : (genImage.isGenerating && genImage.predictionId && genImage.generationId && !genImage.isGenerated)
      
      if (canPoll) {
        const interval = setInterval(async () => {
          try {
            // Use different polling endpoint based on mode
            // 🔴 FIX: Pro Mode uses /api/maya/pro/check-generation (not deleted /api/maya/check-studio-pro)
            const pollingUrl = proMode
              ? `/api/maya/pro/check-generation?predictionId=${genImage.predictionId}`
              : `/api/maya/check-generation?predictionId=${genImage.predictionId}&generationId=${genImage.generationId}`
            
            const response = await fetch(pollingUrl)
            const data = await response.json()

            if (data.status === "succeeded" || data.success === true) {
              const imageUrl = data.imageUrl || (Array.isArray(data.output) ? data.output[0] : data.output)
              
              // Look up image info from gallery after generation completes
              let galleryImageId: string | undefined
              let isFavorite = false
              try {
                const lookupUrl = genImage.predictionId
                  ? `/api/images/lookup?predictionId=${encodeURIComponent(genImage.predictionId)}`
                  : `/api/images/lookup?url=${encodeURIComponent(imageUrl)}`
                
                const lookupResponse = await fetch(lookupUrl)
                const lookupData = await lookupResponse.json()
                
                if (lookupData.image) {
                  galleryImageId = lookupData.image.id
                  isFavorite = lookupData.image.isFavorite
                }
              } catch (error) {
                console.error("[MayaPromptsTab] Error looking up image after generation:", error)
              }
              
              setGeneratedImages((prev) => {
                const newMap = new Map(prev)
                const updated = { 
                  ...genImage, 
                  imageUrl, 
                  isGenerated: true, 
                  isGenerating: false,
                  galleryImageId,
                  isFavorite,
                }
                newMap.set(promptId, updated)
                return newMap
              })
              clearInterval(interval)
              pollIntervals.delete(promptId)
            } else if (data.status === "failed" || data.success === false) {
              setGeneratedImages((prev) => {
                const newMap = new Map(prev)
                const updated = { ...genImage, error: data.error || "Generation failed", isGenerating: false }
                newMap.set(promptId, updated)
                return newMap
              })
              clearInterval(interval)
              pollIntervals.delete(promptId)
            }
          } catch (err) {
            console.error("[MayaPromptsTab] Error polling generation:", err)
            setGeneratedImages((prev) => {
              const newMap = new Map(prev)
              const updated = { ...genImage, error: "Failed to check generation status", isGenerating: false }
              newMap.set(promptId, updated)
              return newMap
            })
            clearInterval(interval)
            pollIntervals.delete(promptId)
          }
        }, proMode ? 5000 : 3000) // Poll every 5s for Pro, 3s for Classic

        pollIntervals.set(promptId, interval)
      }
    })

    return () => {
      pollIntervals.forEach((interval) => clearInterval(interval))
    }
  }, [generatedImages, proMode])

  const fetchPrompts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const categoryParam = selectedCategory === "all" ? "" : `?category=${selectedCategory}`
      const response = await fetch(`/api/prompt-guides/items${categoryParam}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch prompts")
      }

      setPrompts(data.items || [])
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error("[MayaPromptsTab] Error fetching prompts:", err)
      setError(err instanceof Error ? err.message : "Failed to load prompts")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptClick = (prompt: PromptItem) => {
    setSelectedPrompt(prompt)
    // Track usage
    trackPromptUsage(prompt.id)
  }

  // Track prompt usage for analytics
  const trackPromptUsage = (promptId: number) => {
    // Update usage count
    setPromptUsageCounts((prev) => {
      const newMap = new Map(prev)
      const currentCount = newMap.get(promptId) || 0
      newMap.set(promptId, currentCount + 1)
      return newMap
    })

    // Update recently used (keep last 10)
    setRecentlyUsedPrompts((prev) => {
      const filtered = prev.filter((id) => id !== promptId)
      return [promptId, ...filtered].slice(0, 10)
    })
  }

  // Toggle prompt favorite
  const togglePromptFavorite = (promptId: number) => {
    setPromptFavorites((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(promptId)) {
        newSet.delete(promptId)
      } else {
        newSet.add(promptId)
      }
      return newSet
    })
  }

  const handleGenerate = async (prompt: PromptItem, isRegenerate: boolean = false) => {
    // Check if already generating
    const existingGen = generatedImages.get(prompt.id)
    if (existingGen?.isGenerating) {
      return
    }

    // Set generating state
    setGeneratedImages((prev) => {
      const newMap = new Map(prev)
      newMap.set(prompt.id, {
        promptId: prompt.id,
        imageUrl: isRegenerate ? null : existingGen?.imageUrl || null,
        predictionId: null,
        generationId: null,
        isGenerating: true,
        isGenerated: false,
        error: null,
      })
      return newMap
    })

    try {
      let response: Response
      let data: any

      if (proMode) {
        // PRO MODE: Use Nano Banana Pro with image library
        // Check if we have at least selfies (required for Pro mode)
        if (imageLibrary.selfies.length === 0) {
          setGeneratedImages((prev) => {
            const newMap = new Map(prev)
            newMap.set(prompt.id, {
              promptId: prompt.id,
              imageUrl: existingGen?.imageUrl || null,
              predictionId: null,
              generationId: null,
              isGenerating: false,
              isGenerated: false,
              error: "Please upload images first. At least one selfie is required in Pro mode.",
            })
            return newMap
          })
          return
        }

        // 🔴 FIX: Use Pro Mode API endpoint instead of deleted Studio Pro endpoint
        response = await fetch("/api/maya/pro/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fullPrompt: prompt.prompt_text, // Use the prompt text as full prompt
            conceptTitle: prompt.concept_title || "Prompt Generation",
            conceptDescription: prompt.guide_description || "",
            category: prompt.category || "concept",
            linkedImages: imageLibrary.selfies.slice(0, 5), // Use up to 5 selfies
            resolution: "2K",
            aspectRatio: "1:1"
          }),
        })

        const text = await response.text()
        try {
          data = JSON.parse(text)
        } catch (jsonError) {
          console.error("[MayaPromptsTab] Failed to parse Pro Mode response:", jsonError)
          throw new Error("Invalid response from server. Please try again.")
        }
      } else {
        // CLASSIC MODE: Use custom Flux model
        // Get Enhanced Authenticity toggle from localStorage
        const enhancedAuthenticity = typeof window !== "undefined" 
          ? localStorage.getItem('mayaEnhancedAuthenticity') === 'true'
          : false

        response = await fetch("/api/maya/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            conceptTitle: prompt.concept_title || "Prompt Generation",
            conceptDescription: prompt.guide_description || "",
            conceptPrompt: prompt.prompt_text,
            category: prompt.category || "portrait",
            chatId: null, // No chat ID for prompt tab generation
            referenceImageUrl: imageLibrary.selfies.length > 0 ? imageLibrary.selfies[0] : null,
            enhancedAuthenticity,
          }),
        })

        data = await response.json()
      }

      if (!response.ok) {
        if (response.status === 402) {
          // Insufficient credits
          setGeneratedImages((prev) => {
            const newMap = new Map(prev)
            newMap.set(prompt.id, {
              promptId: prompt.id,
              imageUrl: existingGen?.imageUrl || null,
              predictionId: null,
              generationId: null,
              isGenerating: false,
              isGenerated: false,
              error: data.message || data.error || "Insufficient credits",
            })
            return newMap
          })
          return
        }
        throw new Error(data.error || data.details || "Failed to generate image")
      }

      // Update with prediction ID and generation ID
      // Pro Mode returns predictionId (generationId may be null), Classic returns both predictionId and generationId
      setGeneratedImages((prev) => {
        const newMap = new Map(prev)
        newMap.set(prompt.id, {
          promptId: prompt.id,
          imageUrl: existingGen?.imageUrl || null, // Keep existing image if regenerating
          predictionId: data.predictionId,
          generationId: proMode ? null : (data.generationId?.toString() || null), // Classic mode only
          isGenerating: true,
          isGenerated: false,
          error: null,
        })
        return newMap
      })

      // Update credits if callback provided
      if (onCreditsUpdate && data.newBalance !== undefined) {
        onCreditsUpdate(data.newBalance)
      }
    } catch (err) {
      console.error("[MayaPromptsTab] Error generating image:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to generate image"
      setGeneratedImages((prev) => {
        const newMap = new Map(prev)
        newMap.set(prompt.id, {
          promptId: prompt.id,
          imageUrl: existingGen?.imageUrl || null,
          predictionId: null,
          generationId: null,
          isGenerating: false,
          isGenerated: false,
          error: errorMessage,
        })
        return newMap
      })
    }
  }

  const handleGenerateFromPreview = () => {
    if (selectedPrompt) {
      // Track usage
      trackPromptUsage(selectedPrompt.id)
      // Switch to Photos tab and send the prompt
      onSelectPrompt(selectedPrompt.prompt_text, selectedPrompt.concept_title || undefined)
      // Reset selection after sending
      setSelectedPrompt(null)
    }
  }

  const handleOpenUploadFlow = () => {
    if (onOpenUploadFlow) {
      // Use parent's upload flow modal
      onOpenUploadFlow()
    } else {
      // Fallback: This shouldn't happen, but handle gracefully
      console.warn("[MayaPromptsTab] onOpenUploadFlow not provided")
    }
  }

  // Get available images for concept preview (up to 3)
  const previewImages = sharedImages.slice(0, 3)

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-950 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-light text-stone-500">Loading prompts...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-24">
            <p className="text-sm font-light text-stone-500 mb-4">{error}</p>
            <button
              onClick={fetchPrompts}
              className="px-4 py-2 bg-stone-950 text-white text-xs tracking-[0.1em] uppercase font-light rounded-lg hover:bg-stone-800 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
          {/* Section Header with Upload Button */}
          <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2
                className="text-xs sm:text-sm md:text-[13px] font-serif font-light tracking-[0.25em] uppercase text-stone-950 mb-3 sm:mb-4"
                style={{ letterSpacing: "0.25em" }}
              >
                Sandra's Favourites
              </h2>
              <p className="text-sm sm:text-base md:text-[14px] text-stone-600 font-normal leading-relaxed max-w-[600px]">
                Proven prompts for effortless, polished photos that feel confident and very you
              </p>
            </div>
            
            {/* Upload/Manage Button with Thumbnails */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {(() => {
                const allImages = [
                  ...imageLibrary.selfies,
                  ...imageLibrary.products,
                  ...imageLibrary.people,
                  ...imageLibrary.vibes,
                ]
                const hasImages = allImages.length > 0
                const displayImages = allImages.slice(0, 4) // Show up to 4 thumbnails
                const remainingCount = allImages.length - 4

                return (
                  <>
                    {hasImages && (
                      <div className="flex items-center gap-2 mb-2">
                        {displayImages.map((imageUrl, index) => (
                          <div
                            key={`${imageUrl}-${index}`}
                            className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-stone-200/60 overflow-hidden bg-stone-100"
                          >
                            <img
                              src={imageUrl || "/placeholder.svg"}
                              alt={`Image ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {index === 3 && remainingCount > 0 && (
                              <div className="absolute inset-0 bg-stone-950/60 flex items-center justify-center">
                                <span className="text-[10px] sm:text-xs font-medium text-white">
                                  +{remainingCount}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={handleOpenUploadFlow}
                      className={`px-4 py-2 text-xs tracking-[0.1em] uppercase font-light rounded-lg transition-all touch-manipulation active:scale-95 shrink-0 flex items-center gap-2 ${
                        hasImages
                          ? "bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200/60"
                          : "bg-stone-950 text-white hover:bg-stone-800"
                      }`}
                    >
                      {hasImages ? (
                        <>
                          <Settings size={14} />
                          <span>Manage</span>
                        </>
                      ) : (
                        <span>Upload Images</span>
                      )}
                    </button>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-stone-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none pl-4 pr-10 py-3 text-sm bg-white border border-stone-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-transparent transition-all cursor-pointer min-w-[160px]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="category">By Category</option>
              </select>
              <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" strokeWidth={2} />
            </div>
          </div>

          {/* Category Filter */}
          <div
            className="flex gap-3 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "x proximity",
              scrollPadding: "16px",
            }}
          >
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 sm:px-6 py-3 sm:py-3 rounded-full text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase whitespace-nowrap transition-all touch-manipulation active:scale-95 min-h-[44px] flex items-center scroll-snap-align-start ${
                selectedCategory === "all"
                  ? "bg-stone-950 text-white border border-stone-950 shadow-[0_2px_12px_rgba(28,25,23,0.15)]"
                  : "bg-white/60 border border-stone-200/60 text-stone-600 hover:bg-stone-50/80 hover:border-stone-300/80"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 sm:px-6 py-3 sm:py-3 rounded-full text-[10px] sm:text-[11px] font-medium tracking-[0.08em] uppercase whitespace-nowrap transition-all touch-manipulation active:scale-95 min-h-[44px] flex items-center scroll-snap-align-start ${
                  selectedCategory === category
                    ? "bg-stone-950 text-white border border-stone-950 shadow-[0_2px_12px_rgba(28,25,23,0.15)]"
                    : "bg-white/60 border border-stone-200/60 text-stone-600 hover:bg-stone-50/80 hover:border-stone-300/80"
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Recently Used Section */}
          {recentlyUsedPrompts.length > 0 && searchQuery === "" && selectedCategory === "all" && (
            <div className="mb-8 sm:mb-12">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <Clock size={18} className="text-stone-600" strokeWidth={1.5} />
                <h3 className="text-sm sm:text-base font-serif font-light tracking-[0.15em] uppercase text-stone-950">
                  Recently Used
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {recentlyUsedPrompts
                  .map((id) => prompts.find((p) => p.id === id))
                  .filter((p): p is PromptItem => p !== undefined)
                  .slice(0, 6)
                  .map((prompt) => {
                    const genImage = generatedImages.get(prompt.id)
                    const hasGeneratedImage = genImage?.isGenerated && genImage?.imageUrl
                    const isGenerating = genImage?.isGenerating || false
                    const displayImage = hasGeneratedImage ? genImage.imageUrl : prompt.image_url

                    return (
                      <div
                        key={`recent-${prompt.id}`}
                        className="group bg-white border border-stone-200/40 rounded-[20px] overflow-hidden transition-all duration-300 hover:border-stone-300/30 hover:shadow-[0_12px_40px_rgba(28,25,23,0.06)] hover:-translate-y-1"
                      >
                        <div className="w-full aspect-[3/4] relative bg-gradient-to-br from-stone-100 via-stone-200/50 to-stone-300/50">
                          {displayImage ? (
                            <Image
                              src={displayImage}
                              alt={prompt.concept_title || "Prompt preview"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              loading="lazy"
                              quality={85}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-stone-400 font-medium">
                                Preview
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 sm:p-5">
                          <h3 className="text-base sm:text-lg font-serif font-light tracking-[0.02em] text-stone-950 mb-2 leading-snug">
                            {prompt.concept_title || "Untitled Concept"}
                          </h3>
                          <button
                            onClick={() => handlePromptClick(prompt)}
                            className="w-full px-3 py-2 bg-stone-950 text-white text-[10px] tracking-[0.08em] uppercase font-medium rounded-lg hover:bg-stone-800 transition-all touch-manipulation active:scale-95"
                          >
                            Use Again
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Favorites Section */}
          {promptFavorites.size > 0 && searchQuery === "" && selectedCategory === "all" && (
            <div className="mb-8 sm:mb-12">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <Heart size={18} className="text-red-500 fill-current" strokeWidth={1.5} />
                <h3 className="text-sm sm:text-base font-serif font-light tracking-[0.15em] uppercase text-stone-950">
                  Favorites
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from(promptFavorites)
                  .map((id) => prompts.find((p) => p.id === id))
                  .filter((p): p is PromptItem => p !== undefined)
                  .map((prompt) => {
                    const genImage = generatedImages.get(prompt.id)
                    const hasGeneratedImage = genImage?.isGenerated && genImage?.imageUrl
                    const isGenerating = genImage?.isGenerating || false
                    const displayImage = hasGeneratedImage ? genImage.imageUrl : prompt.image_url

                    return (
                      <div
                        key={`favorite-${prompt.id}`}
                        className="group bg-white border border-stone-200/40 rounded-[20px] overflow-hidden transition-all duration-300 hover:border-stone-300/30 hover:shadow-[0_12px_40px_rgba(28,25,23,0.06)] hover:-translate-y-1"
                      >
                        <div className="w-full aspect-[3/4] relative bg-gradient-to-br from-stone-100 via-stone-200/50 to-stone-300/50">
                          {displayImage ? (
                            <Image
                              src={displayImage}
                              alt={prompt.concept_title || "Prompt preview"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              loading="lazy"
                              quality={85}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-stone-400 font-medium">
                                Preview
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 sm:p-5">
                          <h3 className="text-base sm:text-lg font-serif font-light tracking-[0.02em] text-stone-950 mb-2 leading-snug">
                            {prompt.concept_title || "Untitled Concept"}
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePromptClick(prompt)}
                              className="flex-1 px-3 py-2 bg-stone-950 text-white text-[10px] tracking-[0.08em] uppercase font-medium rounded-lg hover:bg-stone-800 transition-all touch-manipulation active:scale-95"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => togglePromptFavorite(prompt.id)}
                              className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all touch-manipulation active:scale-95"
                              aria-label="Remove from favorites"
                            >
                              <Heart size={16} className="fill-current" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Most Used Prompts Section (Analytics) */}
          {promptUsageCounts.size > 0 && searchQuery === "" && selectedCategory === "all" && (
            <div className="mb-8 sm:mb-12">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <TrendingUp size={18} className="text-stone-600" strokeWidth={1.5} />
                <h3 className="text-sm sm:text-base font-serif font-light tracking-[0.15em] uppercase text-stone-950">
                  Most Used
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from(promptUsageCounts.entries())
                  .sort((a, b) => b[1] - a[1]) // Sort by usage count descending
                  .slice(0, 6) // Show top 6
                  .map(([promptId, count]) => {
                    const prompt = prompts.find((p) => p.id === promptId)
                    if (!prompt) return null

                    const genImage = generatedImages.get(prompt.id)
                    const hasGeneratedImage = genImage?.isGenerated && genImage?.imageUrl
                    const displayImage = hasGeneratedImage ? genImage.imageUrl : prompt.image_url

                    return (
                      <div
                        key={`most-used-${prompt.id}`}
                        className="group bg-white border border-stone-200/40 rounded-[20px] overflow-hidden transition-all duration-300 hover:border-stone-300/30 hover:shadow-[0_12px_40px_rgba(28,25,23,0.06)] hover:-translate-y-1"
                      >
                        <div className="w-full aspect-[3/4] relative bg-gradient-to-br from-stone-100 via-stone-200/50 to-stone-300/50">
                          {displayImage ? (
                            <Image
                              src={displayImage}
                              alt={prompt.concept_title || "Prompt preview"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              loading="lazy"
                              quality={85}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-stone-400 font-medium">
                                Preview
                              </span>
                            </div>
                          )}
                          {/* Usage count badge */}
                          <div className="absolute top-2 right-2 px-2 py-1 bg-stone-950/80 backdrop-blur-sm rounded-full flex items-center gap-1">
                            <TrendingUp size={12} className="text-white" strokeWidth={2} />
                            <span className="text-[10px] text-white font-medium">{count}</span>
                          </div>
                        </div>
                        <div className="p-4 sm:p-5">
                          <h3 className="text-base sm:text-lg font-serif font-light tracking-[0.02em] text-stone-950 mb-2 leading-snug">
                            {prompt.concept_title || "Untitled Concept"}
                          </h3>
                          <p className="text-[10px] text-stone-500 mb-3">Used {count} time{count !== 1 ? "s" : ""}</p>
                          <button
                            onClick={() => handlePromptClick(prompt)}
                            className="w-full px-3 py-2 bg-stone-950 text-white text-[10px] tracking-[0.08em] uppercase font-medium rounded-lg hover:bg-stone-800 transition-all touch-manipulation active:scale-95"
                          >
                            Use
                          </button>
                        </div>
                      </div>
                    )
                  })
                  .filter(Boolean)}
              </div>
            </div>
          )}

          {/* Prompts Grid */}
          {filteredAndSortedPrompts.length === 0 ? (
            <div className="text-center py-24">
              <Sparkles size={48} className="mx-auto mb-4 text-stone-400" strokeWidth={1.5} />
              <h3 className="text-lg font-serif font-light tracking-[0.2em] uppercase text-stone-950 mb-2">
                No Prompts Available
              </h3>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                Check back soon for new prompt collections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
              {filteredAndSortedPrompts.map((prompt) => {
                const genImage = generatedImages.get(prompt.id)
                const hasGeneratedImage = genImage?.isGenerated && genImage?.imageUrl
                const isGenerating = genImage?.isGenerating || false
                const displayImage = hasGeneratedImage ? genImage.imageUrl : prompt.image_url

                return (
                  <div
                    key={prompt.id}
                    className={`group bg-white border rounded-[20px] overflow-hidden transition-all duration-300 ${
                      selectedPrompt?.id === prompt.id
                        ? "border-stone-950 shadow-[0_12px_40px_rgba(28,25,23,0.06)] -translate-y-1"
                        : "border-stone-200/40 hover:border-stone-300/30 hover:shadow-[0_12px_40px_rgba(28,25,23,0.06)] hover:-translate-y-1"
                    }`}
                  >
                    {/* Prompt Image - Show generated image if available, otherwise original */}
                    <div className="w-full aspect-[3/4] relative bg-gradient-to-br from-stone-100 via-stone-200/50 to-stone-300/50">
                      {displayImage ? (
                        hasGeneratedImage && genImage?.imageUrl ? (
                          <button
                            onClick={() => handleGeneratedImageClick(
                              genImage.imageUrl!,
                              genImage.predictionId || undefined,
                              prompt.concept_title || undefined
                            )}
                            className="w-full h-full relative cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2"
                            aria-label="View generated image in fullscreen"
                          >
                            <Image
                              src={displayImage}
                              alt={prompt.concept_title || "Prompt preview"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              loading="lazy"
                              quality={85}
                            />
                            {/* Show original as small thumbnail if generated image exists */}
                            {prompt.image_url && (
                              <div className="absolute bottom-2 right-2 w-16 h-16 rounded-lg border-2 border-white shadow-lg overflow-hidden pointer-events-none">
                                <Image
                                  src={prompt.image_url}
                                  alt="Original"
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  quality={75}
                                />
                              </div>
                            )}
                            {/* Loading overlay */}
                            {isGenerating && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 pointer-events-none">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                              </div>
                            )}
                          </button>
                        ) : (
                          <div className="w-full h-full relative">
                            <Image
                              src={displayImage}
                              alt={prompt.concept_title || "Prompt preview"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              loading="lazy"
                              quality={85}
                            />
                            {/* Loading overlay */}
                            {isGenerating && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-stone-400 font-medium">
                            Preview
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Prompt Info */}
                    <div className="p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-serif font-light tracking-[0.02em] text-stone-950 mb-2 sm:mb-3 leading-snug">
                        {prompt.concept_title || "Untitled Concept"}
                      </h3>
                      {prompt.category && (
                        <p className="text-[9px] sm:text-[10px] tracking-[0.15em] uppercase text-stone-400 font-medium mb-3">
                          {prompt.category.charAt(0).toUpperCase() + prompt.category.slice(1)}
                        </p>
                      )}

                      {/* Generate/Regenerate Buttons */}
                      <div className="flex gap-2 mt-3">
                        {!hasGeneratedImage ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerate(prompt, false)
                            }}
                            disabled={isGenerating}
                            className="flex-1 px-3 py-2 bg-stone-950 text-white text-[10px] tracking-[0.08em] uppercase font-medium rounded-lg hover:bg-stone-800 transition-all touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              "Generate"
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerate(prompt, true)
                            }}
                            disabled={isGenerating}
                            className="flex-1 px-3 py-2 bg-stone-600 text-white text-[10px] tracking-[0.08em] uppercase font-medium rounded-lg hover:bg-stone-700 transition-all touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              "Regenerate"
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePromptClick(prompt)
                          }}
                          className="px-3 py-2 border border-stone-300 text-stone-700 text-[10px] tracking-[0.08em] uppercase font-medium rounded-lg hover:bg-stone-50 transition-all touch-manipulation active:scale-95"
                        >
                          Use
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePromptFavorite(prompt.id)
                          }}
                          className={`p-2 rounded-lg transition-all touch-manipulation active:scale-95 ${
                            promptFavorites.has(prompt.id)
                              ? "text-red-500 bg-red-50 hover:bg-red-100"
                              : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                          }`}
                          aria-label={promptFavorites.has(prompt.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart
                            size={16}
                            className={promptFavorites.has(prompt.id) ? "fill-current" : ""}
                            strokeWidth={2}
                          />
                        </button>
                      </div>

                      {/* Error message */}
                      {genImage?.error && (
                        <p className="text-[10px] text-red-600 mt-2">{genImage.error}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Concept Preview (appears when prompt is selected) */}
          {selectedPrompt && (
            <div className="bg-white border border-stone-200/40 rounded-[24px] p-6 sm:p-8 mt-8 sm:mt-12 shadow-[0_8px_32px_rgba(28,25,23,0.04)]">
              <div className="mb-6 sm:mb-8">
                <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-stone-950 mb-2 leading-snug">
                  {selectedPrompt.concept_title || "Untitled Concept"}
                </h3>
                {selectedPrompt.guide_description && (
                  <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                    {selectedPrompt.guide_description}
                  </p>
                )}
              </div>

              {/* Image Slots */}
              <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8 justify-center flex-wrap">
                {[0, 1, 2].map((index) => {
                  const image = previewImages[index]
                  return (
                    <div
                      key={index}
                      className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center transition-all ${
                        image
                          ? "border-2 border-stone-200 bg-gradient-to-br from-stone-100 via-stone-200/50 to-stone-300/50 shadow-inner"
                          : "border-2 border-dashed border-stone-300/60 bg-stone-50/60 hover:border-stone-400/60 hover:bg-stone-100/80"
                      }`}
                    >
                      {image ? (
                        <Image
                          src={image.url}
                          alt={image.description || `Preview ${index + 1}`}
                          width={88}
                          height={88}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <span className="text-[10px] text-stone-400">+</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateFromPreview}
                className="w-full py-4 sm:py-[18px] bg-stone-950 text-white rounded-2xl text-xs sm:text-[12px] font-semibold tracking-[0.12em] uppercase transition-all touch-manipulation active:scale-95 hover:bg-stone-800 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(28,25,23,0.2)]"
              >
                Generate Photo
              </button>
              {previewImages.length > 0 && (
                <p className="text-[10px] sm:text-[11px] text-stone-400 mt-3 text-center tracking-[0.02em]">
                  Using {previewImages.length} image{previewImages.length !== 1 ? "s" : ""} from your gallery
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Fullscreen Image Preview Modal (for header thumbnails) */}
      {renderPreviewModal()}
      
      {/* Fullscreen Image Modal with Save/Download/Favorite (for generated images) */}
      {fullscreenImage && (
        <FullscreenImageModal
          imageUrl={fullscreenImage.imageUrl}
          imageId={fullscreenImage.imageId}
          title={fullscreenImage.title}
          isOpen={!!fullscreenImage}
          onClose={() => setFullscreenImage(null)}
          isFavorite={fullscreenImage.isFavorite || imageFavorites.has(fullscreenImage.imageId)}
          onFavoriteToggle={async () => {
            await toggleFavorite(
              fullscreenImage.imageId,
              fullscreenImage.isFavorite || imageFavorites.has(fullscreenImage.imageId)
            )
          }}
          onDelete={fullscreenImage.imageId.startsWith("ai_") ? async () => {
            await deleteImage(fullscreenImage.imageId)
          } : undefined}
        />
      )}
    </>
  )
}
