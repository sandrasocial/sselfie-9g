"use client"

import { useState, useEffect, useRef } from "react"
import { MoreVertical, X, Edit2 } from "lucide-react"
import InstagramPhotoCard from "./instagram-photo-card"
import InstagramReelCard from "./instagram-reel-card"
import InstagramCarouselCard from "./instagram-carousel-card"
import ImageGalleryModal from "./image-gallery-modal"
import type { ConceptData } from "./types"
import type { GalleryImage } from "@/lib/data/images"

interface ConceptCardProps {
  concept: ConceptData
  chatId?: number
  onCreditsUpdate?: (newBalance: number) => void
  studioProMode?: boolean
  baseImages?: string[] // Base images for Studio Pro mode
}

export default function ConceptCard({ concept, chatId, onCreditsUpdate, studioProMode = false, baseImages = [] }: ConceptCardProps) {
  // CLASSIC MODE SAFETY: Normalize studioProMode to ensure it's explicitly boolean
  // This prevents undefined/null from accidentally triggering Pro logic
  // IMPORTANT: Only use isProMode (never raw studioProMode) in conditionals
  const isProMode = studioProMode === true
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoPredictionId, setVideoPredictionId] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  const [isCreatingPhotoshoot, setIsCreatingPhotoshoot] = useState(false)
  const [photoshootGenerations, setPhotoshootGenerations] = useState<any[]>([])
  const [showPhotoshootConfirm, setShowPhotoshootConfirm] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [photoshootError, setPhotoshootError] = useState<string | null>(null)

  // Prompt editing state
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [styleStrength, setStyleStrength] = useState<number | null>(null)
  const [promptAccuracy, setPromptAccuracy] = useState<number | null>(null)
  const [extraLora, setExtraLora] = useState<string | null>(null)
  const [realismStrength, setRealismStrength] = useState<number | null>(null)

  // Image selection state for Studio Pro mode
  // Initialize with baseImages prop if provided, otherwise start with 3 empty slots
  const [selectedImages, setSelectedImages] = useState<Array<string | null>>(() => {
    if (baseImages.length > 0) {
      // Fill up to 3 slots with baseImages, pad with nulls if needed
      const initial = [...baseImages.slice(0, 3)]
      while (initial.length < 3) {
        initial.push(null)
      }
      return initial
    }
    return [null, null, null]
  })
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [loadingGallery, setLoadingGallery] = useState(false)
  const [uploadingBoxIndex, setUploadingBoxIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentBoxIndexRef = useRef<number | null>(null)

  // Update selectedImages when baseImages prop changes
  useEffect(() => {
    if (baseImages.length > 0 && selectedImages.filter(img => img !== null).length === 0) {
      const initial = [...baseImages.slice(0, 3)]
      while (initial.length < 3) {
        initial.push(null)
      }
      setSelectedImages(initial)
    }
  }, [baseImages])

  // Load gallery images on mount (for Studio Pro mode)
  useEffect(() => {
    if (isProMode) {
      loadGalleryImages()
    }
  }, [isProMode])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const loadGalleryImages = async () => {
    setLoadingGallery(true)
    try {
      const response = await fetch('/api/gallery/images', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to load gallery')
      }
      
      const data = await response.json()
      setGalleryImages(data.images || [])
    } catch (error) {
      console.error('[CONCEPT-CARD] Failed to load gallery:', error)
      setGalleryImages([])
    } finally {
      setLoadingGallery(false)
    }
  }

  const handleImageSelect = (boxIndex: number) => {
    currentBoxIndexRef.current = boxIndex
    setShowGalleryModal(true)
  }

  const handleGallerySelect = (imageUrl: string) => {
    if (currentBoxIndexRef.current === null) return
    
    const boxIndex = currentBoxIndexRef.current
    const newImages = [...selectedImages]
    newImages[boxIndex] = imageUrl
    
    // If filling box 3 and 4th box doesn't exist yet, add it
    if (boxIndex === 2 && newImages.length === 3) {
      newImages.push(null) // Add 4th box
    }
    
    setSelectedImages(newImages)
    setShowGalleryModal(false)
    currentBoxIndexRef.current = null
  }

  const handleUploadClick = (boxIndex: number) => {
    currentBoxIndexRef.current = boxIndex
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || currentBoxIndexRef.current === null) return

    const boxIndex = currentBoxIndexRef.current

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setUploadingBoxIndex(boxIndex)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await response.json()
      
      const newImages = [...selectedImages]
      newImages[boxIndex] = url
      
      // If filling box 3 and 4th box doesn't exist yet, add it
      if (boxIndex === 2 && newImages.length === 3) {
        newImages.push(null) // Add 4th box
      }
      
      setSelectedImages(newImages)
    } catch (error) {
      console.error("[CONCEPT-CARD] Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setUploadingBoxIndex(null)
      currentBoxIndexRef.current = null
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImageClear = (boxIndex: number) => {
    const newImages = [...selectedImages]
    newImages[boxIndex] = null
    
    // If clearing box 3 and 4th box exists, remove 4th box
    if (boxIndex === 2 && newImages.length > 3) {
      newImages.pop()
    }
    
    setSelectedImages(newImages)
  }

  // Poll for Classic mode (Flux) generation
  useEffect(() => {
    // Skip polling if Studio Pro mode (handled in handleGenerate)
    // CLASSIC MODE SAFETY: Use isProMode (normalized boolean) instead of raw prop
    if (isProMode || !predictionId || !generationId || isGenerated) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/maya/check-generation?predictionId=${predictionId}&generationId=${generationId}`,
        )
        const data = await response.json()

        console.log("[v0] Generation status:", data.status)

        if (data.status === "succeeded") {
          setGeneratedImageUrl(data.imageUrl)
          setIsGenerated(true)
          setIsGenerating(false)
          clearInterval(pollInterval)
        } else if (data.status === "failed") {
          setError(data.error || "Generation failed")
          setIsGenerating(false)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error("[v0] Error polling generation:", err)
        setError("Failed to check generation status")
        setIsGenerating(false)
        clearInterval(pollInterval)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [predictionId, generationId, isGenerated, isProMode])

  useEffect(() => {
    if (!videoPredictionId || !videoId || videoUrl) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/maya/check-video?predictionId=${videoPredictionId}&videoId=${videoId}`)
        const data = await response.json()

        console.log("[v0] Video generation status:", data.status)

        if (data.status === "succeeded") {
          setVideoUrl(data.videoUrl)
          setIsGeneratingVideo(false)
          clearInterval(pollInterval)
        } else if (data.status === "failed") {
          setVideoError(data.error || "Video generation failed")
          setIsGeneratingVideo(false)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error("[v0] Error polling video generation:", err)
        setVideoError("Failed to check video status")
        setIsGeneratingVideo(false)
        clearInterval(pollInterval)
      }
    }, 5000) // Poll every 5 seconds (videos take longer)

    return () => clearInterval(pollInterval)
  }, [videoPredictionId, videoId, videoUrl])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // If Studio Pro mode is active, use Nano Banana Pro
      // CLASSIC MODE SAFETY: Use isProMode (normalized boolean)
      if (isProMode) {
        // ============================================
        // CONCEPT CARD FLOW (Studio Pro Mode):
        // 1. Maya generates concept with detailed prompt (concept.prompt)
        // 2. User adds reference images via upload/gallery
        // 3. Generate using Maya's prompt + user's images
        // ============================================
        
        // Get base images: prefer images selected in concept card, then prop baseImages, then concept reference image
        const conceptCardImages = selectedImages.filter((img): img is string => img !== null)
        const availableBaseImages = conceptCardImages.length > 0
          ? conceptCardImages
          : (baseImages.length > 0 
              ? baseImages 
              : (concept.referenceImageUrl ? [concept.referenceImageUrl] : []))

        if (availableBaseImages.length === 0) {
          setError("Please select at least one image (upload or from gallery) in Studio Pro mode, or use Classic mode")
          setIsGenerating(false)
          return
        }

        console.log("[CONCEPT-CARD] Using Studio Pro (Nano Banana Pro) with", availableBaseImages.length, "base image(s)")

        // CRITICAL: Concept cards use Maya's generated prompt (concept.prompt) OR user-edited prompt
        // If user edited the prompt, use that; otherwise use Maya's original prompt
        // Mode "brand-scene" ensures proper prompt building with brand context
        const userRequest = editedPrompt || concept.prompt || `${concept.title}: ${concept.description}`
        
        const response = await fetch("/api/maya/generate-studio-pro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mode: "brand-scene", // Concept cards use brand-scene mode (Maya's prompt building)
            userRequest: userRequest, // Maya's generated prompt from concept generation
            inputImages: {
              baseImages: availableBaseImages.map(url => ({ url, type: 'user-photo' })),
              productImages: []
            },
            resolution: "2K",
            aspectRatio: concept.customSettings?.aspectRatio || "1:1"
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to generate Studio Pro image")
        }

        // Poll for completion (same as regular Studio Pro)
        const pollStatus = async () => {
          const maxAttempts = 60
          let attempts = 0

          const checkStatus = async () => {
            try {
              const statusResponse = await fetch(
                `/api/maya/check-studio-pro?predictionId=${data.predictionId}`
              )
              const status = await statusResponse.json()

              if (status.status === 'succeeded') {
                setGeneratedImageUrl(status.output)
                setIsGenerated(true)
                setIsGenerating(false)
                
                // Update credits if callback provided
                if (onCreditsUpdate) {
                  // Credits already deducted, just refresh balance
                  const creditsResponse = await fetch("/api/user/credits")
                  const creditsData = await creditsResponse.json()
                  if (creditsData.balance !== undefined) {
                    onCreditsUpdate(creditsData.balance)
                  }
                }
                return
              }

              if (status.status === 'failed') {
                setError(status.error || "Generation failed")
                setIsGenerating(false)
                return
              }

              // Still processing
              if (attempts < maxAttempts) {
                attempts++
                setTimeout(checkStatus, 5000)
              } else {
                setError("Generation timed out")
                setIsGenerating(false)
              }
            } catch (err) {
              console.error("[STUDIO-PRO] Status check error:", err)
              setError("Failed to check generation status")
              setIsGenerating(false)
            }
          }

          checkStatus()
        }

        setPredictionId(data.predictionId)
        pollStatus()
        return
      }

      // Classic mode: Use Flux with user's LoRA
      const settingsStr = localStorage.getItem("mayaGenerationSettings")
      const parsedSettings = settingsStr ? JSON.parse(settingsStr) : null

      const customSettings = parsedSettings
        ? {
            ...parsedSettings,
            extraLoraScale: parsedSettings.realismStrength ?? 0.2,
          }
        : null

      const finalSettings = customSettings
        ? {
            ...customSettings,
            ...(concept.customSettings || {}),
          }
        : concept.customSettings

      const response = await fetch("/api/maya/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conceptTitle: concept.title,
          conceptDescription: concept.description,
          conceptPrompt: concept.prompt,
          category: concept.category,
          chatId,
          referenceImageUrl: concept.referenceImageUrl,
          customSettings: finalSettings,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      setPredictionId(data.predictionId)
      setGenerationId(data.generationId.toString())
      setUserId(data.userId)
    } catch (err) {
      console.error("[v0] Error generating image:", err)
      setError(err instanceof Error ? err.message : "Failed to generate image")
      setIsGenerating(false)
    }
  }

  const handleFavoriteToggle = async () => {
    if (!generationId) return

    try {
      const response = await fetch("/api/images/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: `ai_${generationId}`,
          isFavorite: !isFavorite,
        }),
      })

      if (!response.ok) throw new Error("Failed to toggle favorite")

      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error("[v0] Error toggling favorite:", error)
    }
  }

  const handleDelete = async () => {
    if (!generationId) return

    try {
      const response = await fetch("/api/images/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: generationId }),
      })

      if (!response.ok) throw new Error("Failed to delete image")

      setGeneratedImageUrl(null)
      setIsGenerated(false)
      setGenerationId(null)
      setPredictionId(null)
    } catch (error) {
      console.error("[v0] Error deleting image:", error)
    }
  }

  const handleAnimate = async () => {
    if (!generatedImageUrl || !generationId) return

    setIsGeneratingVideo(true)
    setVideoError(null)

    try {
      console.log("[v0] Starting video generation from image:", generatedImageUrl)

      console.log("[v0] 🎨 Generating AI motion prompt with vision analysis...")
      const motionResponse = await fetch("/api/maya/generate-motion-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fluxPrompt: concept.prompt,
          description: concept.description,
          category: concept.category,
          imageUrl: generatedImageUrl,
        }),
      })

      const motionData = await motionResponse.json()

      if (!motionResponse.ok) {
        console.warn("[v0] ⚠️ Motion prompt generation failed, using concept description")
      }

      const aiGeneratedMotionPrompt = motionData.motionPrompt || concept.description
      console.log("[v0] ✅ AI-generated motion prompt:", aiGeneratedMotionPrompt)

      const response = await fetch("/api/maya/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: generatedImageUrl,
          imageId: generationId,
          motionPrompt: aiGeneratedMotionPrompt,
          imageDescription: concept.description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video")
      }

      console.log("[v0] Video generation started:", data)

      setVideoPredictionId(data.predictionId)
      setVideoId(data.videoId.toString())
    } catch (err) {
      console.error("[v0] Error generating video:", err)
      setVideoError(err instanceof Error ? err.message : "Failed to generate video")
      setIsGeneratingVideo(false)
    }
  }

  const handleCreatePhotoshoot = async () => {
    if (!generatedImageUrl || !generationId) return

    setIsCreatingPhotoshoot(true)
    setShowPhotoshootConfirm(false)
    setPhotoshootError(null)

    try {
      console.log("[v0] 📸 Creating photoshoot from hero image:", generatedImageUrl)

      const generationResponse = await fetch(`/api/maya/check-generation?generationId=${generationId}`)
      const generationData = await generationResponse.json()

      console.log("[v0] 📸 Original generation data:", {
        seed: generationData.seed,
        prompt: generationData.prompt?.substring(0, 100),
      })

      setPhotoshootGenerations([])

      const response = await fetch("/api/maya/create-photoshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          heroImageUrl: generatedImageUrl,
          heroPrompt: generationData.prompt || concept.prompt,
          heroSeed: generationData.seed,
          conceptTitle: concept.title,
          conceptDescription: concept.description,
          category: concept.category,
          chatId,
          customSettings: {
            styleStrength: styleStrength,
            promptAccuracy: promptAccuracy,
            extraLora: extraLora,
            realismStrength: realismStrength,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create photoshoot")
      }

      console.log("[v0] 📸 Photoshoot created:", {
        photoshootId: data.photoshootId,
        totalImages: data.totalImages,
        creditsDeducted: data.creditsDeducted,
      })

      if (data.predictions && data.predictions.length > 0) {
        console.log("[v0] 📸 Starting prediction polling for", data.predictions.length, "images")

        console.log("[v0] 📸 Initializing photoshootGenerations array with", data.predictions.length, "placeholders")
        setPhotoshootGenerations(
          data.predictions.map((pred: any) => ({
            id: pred.index,
            generationId: pred.predictionId,
            index: pred.index,
            url: null,
            imageUrl: null,
            action: pred.title,
            status: "processing",
            error: null,
          })),
        )

        const pollPromises = data.predictions.map((pred: any) =>
          pollPhotoshootPrediction(pred.predictionId, pred.index, data.userId, concept.description),
        )

        await Promise.all(pollPromises)

        console.log("[v0] 📸 All photoshoot images completed!")
        onCreditsUpdate?.(data.newBalance)
      }

      setIsCreatingPhotoshoot(false)
    } catch (err) {
      console.error("[v0] Error creating photoshoot:", err)
      setPhotoshootError(err instanceof Error ? err.message : "Failed to create photoshoot")
      setIsCreatingPhotoshoot(false)
      setPhotoshootGenerations([])
    }
  }

  const pollPhotoshootPrediction = async (
    predictionId: string,
    index: number,
    userId: string,
    conceptDescription?: string,
  ) => {
    const maxAttempts = 120
    let attempts = 0

    const poll = async () => {
      try {
        const queryParams = new URLSearchParams({
          id: predictionId,
          userId: userId,
        })

        if (conceptDescription) {
          queryParams.append("conceptDescription", conceptDescription)
        }

        const response = await fetch(`/api/maya/check-photoshoot-prediction?${queryParams.toString()}`)
        const data = await response.json()

        if (data.status === "succeeded") {
          console.log("[v0] ✅ Photoshoot prediction succeeded:", predictionId)

          if (data.output && Array.isArray(data.output) && data.output.length > 0) {
            const imageUrl = data.output[0] // First image from output array
            console.log("[v0] 📸 Updating image at index", index, "with URL:", imageUrl)

            setPhotoshootGenerations((prev) => {
              const updated = [...prev]
              if (updated[index]) {
                updated[index] = {
                  ...updated[index],
                  url: imageUrl,
                  imageUrl: imageUrl,
                  status: "ready",
                }
              }
              console.log("[v0] 📸 State updated for index", index, "- url present:", !!updated[index]?.url)
              return updated
            })
          }

          return
        } else if (data.status === "failed") {
          setPhotoshootGenerations((prev) => {
            const updated = [...prev]
            if (updated[index]) {
              updated[index] = {
                ...updated[index],
                status: "failed",
                error: data.error || "Generation failed",
              }
            }
            return updated
          })
          throw new Error(data.error || "Photoshoot generation failed")
        }

        attempts++
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 5000))
          await poll()
        } else {
          throw new Error("Photoshoot generation timed out")
        }
      } catch (err) {
        console.error("[v0] Error polling photoshoot prediction:", err)
        throw err
      }
    }

    await poll()
  }

  const pollPredictions = async (predictions: any[], userId?: string) => {
    console.log(`[v0] 📊 Starting to poll ${predictions.length} predictions`)
    console.log(`[v0] 📊 User ID:`, userId)

    const pollSinglePrediction = async (pred: any) => {
      const maxAttempts = 60
      let attempts = 0

      const predId = pred.predictionId || pred.batches?.[0]?.predictionId
      const predIndex = pred.index !== undefined ? pred.index : pred.batchIndex !== undefined ? pred.batchIndex * 3 : 0

      while (attempts < maxAttempts) {
        try {
          const url = new URL(`/api/maya/check-photoshoot-prediction`, window.location.origin)
          url.searchParams.set("id", predId)
          url.searchParams.set("heroPrompt", encodeURIComponent(concept.prompt || concept.title))
          if (userId) {
            url.searchParams.set("userId", userId)
          }

          const response = await fetch(url.toString(), {
            method: "GET",
          })

          if (!response.ok) {
            const text = await response.text()
            console.error(`[v0] ❌ Failed to check prediction ${predIndex}:`, response.status, text.substring(0, 200))
            await new Promise((resolve) => setTimeout(resolve, 4000))
            attempts++
            continue
          }

          const status = await response.json()

          console.log(`[v0] 📊 Prediction ${predIndex} status:`, status.status)

          if (status.status === "succeeded" && status.output) {
            const imageUrls = Array.isArray(status.output) ? status.output : [status.output]
            console.log(`[v0] ✅ Prediction ${predIndex} complete with ${imageUrls.length} image(s)`)

            imageUrls.forEach((imageUrl: string, idx: number) => {
              const globalIndex = pred.index !== undefined ? pred.index : pred.batchIndex * 3 + idx
              setPhotoshootGenerations((prev) => {
                const updated = [...prev]
                if (updated[globalIndex]) {
                  updated[globalIndex] = {
                    ...updated[globalIndex],
                    url: imageUrl,
                    imageUrl: imageUrl,
                    status: "ready",
                    action: pred.title || pred.actions?.[idx] || `Photo ${globalIndex + 1}`,
                  }
                }
                return updated
              })
            })

            return imageUrls
          } else if (status.status === "failed") {
            console.error(`[v0] ❌ Prediction ${predIndex} failed:`, status.error)
            setPhotoshootGenerations((prev) => {
              const updated = [...prev]
              if (updated[predIndex]) {
                updated[predIndex] = {
                  ...updated[predIndex],
                  status: "failed",
                  error: status.error,
                }
              }
              return updated
            })
            return null
          }

          await new Promise((resolve) => setTimeout(resolve, 4000))
          attempts++
        } catch (err) {
          console.error(`[v0] Error polling prediction ${predIndex}:`, err)
          await new Promise((resolve) => setTimeout(resolve, 4000))
          attempts++
        }
      }

      console.error(`[v0] ❌ Prediction ${predIndex} timed out`)
      return null
    }

    const pollWithDelay = async (pred: any, index: number) => {
      await new Promise((resolve) => setTimeout(resolve, index * 500))
      return pollSinglePrediction(pred)
    }

    const results = await Promise.allSettled(predictions.map((pred: any, index: number) => pollWithDelay(pred, index)))

    const successCount = results.filter((r) => r.status === "fulfilled" && r.value).length
    console.log(`[v0] 🎉 Photoshoot complete: ${successCount}/${predictions.length} images`)

    setIsCreatingPhotoshoot(false)
  }

  const pollBatches = async (batches: any[]) => {
    console.log(`[v0] 📊 [Legacy] Redirecting to new pollPredictions system`)
    await pollPredictions(batches, userId)
  }

  return (
    <div className={`bg-white border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg ${
      isProMode 
        ? 'border-stone-300 bg-gradient-to-br from-stone-50 to-white' 
        : 'border-stone-200'
    }`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 rounded-full p-[2px]">
              <div className="bg-white rounded-full w-full h-full"></div>
            </div>
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
              <span className="text-xs font-bold text-stone-700">S</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-950">sselfie</span>
              {isProMode && (
                <span className="text-[10px] font-medium text-stone-600 px-1.5 py-0.5 bg-stone-200/50 rounded">
                  Studio Pro
                </span>
              )}
            </div>
            <span className="text-xs text-stone-500">{concept.category}</span>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5 text-stone-700" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 z-50 w-48 bg-white border border-stone-200 rounded-lg shadow-lg py-1">
              {isProMode && (
                <button
                  onClick={() => {
                    setShowPromptEditor(true)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>View/Edit Prompt</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-3 space-y-3">
        <div className="space-y-1">
          <p className="text-sm leading-relaxed text-stone-950">
            <span className="font-semibold">sselfie</span> {concept.title}
          </p>
          <p className="text-sm leading-relaxed text-stone-600 line-clamp-2">{concept.description}</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 min-h-[40px] px-3 py-2"
            >
              Try Again
            </button>
          </div>
        )}

        {!isGenerating && !isGenerated && !error && (
          <div className="space-y-3">
            {/* Image selector for Studio Pro mode */}
            {isProMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-extralight tracking-[0.15em] text-stone-700 uppercase">
                    Reference Images
                  </h4>
                  <span className="text-[10px] font-light tracking-[0.1em] text-stone-500 uppercase">
                    {selectedImages.filter(img => img !== null).length} / {selectedImages.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="flex items-center gap-2 shrink-0">
                      <div className="relative aspect-square w-20 sm:w-24 rounded-xl border-2 border-dashed border-stone-300/60 bg-gradient-to-br from-stone-50/80 via-white to-stone-50/40 overflow-hidden group transition-all duration-300 hover:border-stone-400/80">
                        {image ? (
                          <>
                            <img
                              src={image}
                              alt={`Reference ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-stone-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleImageClear(index)
                              }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 bg-stone-950/95 hover:bg-stone-950 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 text-sm font-light shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                              aria-label={`Clear image ${index + 1}`}
                            >
                              ×
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent p-2">
                              <span className="text-[9px] text-white font-light tracking-[0.1em] uppercase">Ref {index + 1}</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                            {uploadingBoxIndex === index ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[9px] font-light tracking-[0.1em] uppercase text-stone-500">Uploading...</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleImageSelect(index)}
                                  className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-stone-400 hover:text-stone-600 transition-all duration-300 text-[9px] font-light tracking-[0.1em] uppercase"
                                >
                                  Gallery
                                </button>
                                <button
                                  onClick={() => handleUploadClick(index)}
                                  className="w-full px-1.5 py-0.5 text-[8px] font-light tracking-[0.1em] uppercase text-stone-500 hover:text-stone-700 hover:bg-stone-100/50 rounded transition-all duration-200"
                                >
                                  Upload
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Plus sign between boxes (except after last box) */}
                      {index < selectedImages.length - 1 && (
                        <span className="text-stone-300/80 text-2xl font-extralight shrink-0 leading-none">+</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={isProMode && selectedImages.filter(img => img !== null).length === 0}
              className={`group relative w-full text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] min-h-[40px] flex items-center justify-center ${
                studioProMode
                  ? selectedImages.filter(img => img !== null).length === 0
                    ? 'bg-stone-400 cursor-not-allowed'
                    : 'bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 hover:from-stone-900 hover:via-stone-950 hover:to-black'
                  : 'bg-gradient-to-br from-stone-600 via-stone-700 to-stone-800 hover:from-stone-700 hover:via-stone-800 hover:to-stone-900'
              }`}
            >
              <span>{studioProMode ? 'Create with Studio Pro' : 'Create Photo'}</span>
            </button>
            <div className="space-y-1">
              {studioProMode && (
                <p className="text-[10px] text-stone-500 text-center leading-relaxed">
                  {selectedImages.filter(img => img !== null).length > 0 
                    ? `Using ${selectedImages.filter(img => img !== null).length} reference image${selectedImages.filter(img => img !== null).length > 1 ? 's' : ''} • 5 credits`
                    : 'Select at least 1 reference image to continue • 5 credits'}
                </p>
              )}
              <p className="text-[10px] text-stone-400 text-center leading-relaxed">
                {studioProMode 
                  ? 'Multi-image composition with character consistency'
                  : 'AI-generated photos may vary in quality and accuracy'}
              </p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-bounce"></div>
              <div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-600 to-orange-500 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <span className="text-xs font-semibold text-stone-700">
              {isProMode ? 'Creating with Studio Pro...' : 'Creating your photo'}
            </span>
          </div>
        )}

        {isGenerated && generatedImageUrl && (
          <div className="space-y-3">
            {photoshootGenerations.length > 0 && photoshootGenerations.every((p) => p.url || p.imageUrl) ? (
              <InstagramCarouselCard
                images={photoshootGenerations.map((gen: any) => ({
                  url: gen.url || gen.imageUrl,
                  id: Number.parseInt(gen.id || gen.generationId),
                  action: gen.action || `Photo ${gen.index + 1}`,
                }))}
                title={concept.title}
                description={concept.description}
                category={concept.category}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={handleDelete}
                isFavorite={isFavorite}
              />
            ) : (
              <InstagramPhotoCard
                concept={concept}
                imageUrl={generatedImageUrl}
                imageId={generationId || ""}
                isFavorite={isFavorite}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={handleDelete}
                onAnimate={!videoUrl && !isGeneratingVideo ? handleAnimate : undefined}
                showAnimateOverlay={false}
                onCreatePhotoshoot={
                  !isCreatingPhotoshoot && photoshootGenerations.length === 0
                    ? () => setShowPhotoshootConfirm(true)
                    : undefined
                }
              />
            )}

            {showPhotoshootConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-6 pt-6 pb-4 border-b border-stone-100">
                    <h3 className="text-lg font-semibold text-stone-950">Create Carousel?</h3>
                  </div>

                  <div className="px-6 py-4 space-y-3">
                    <p className="text-sm text-stone-700 leading-relaxed">
                      We'll create <span className="font-semibold text-stone-950">6-9 photos</span> with the same outfit
                      and vibe, perfect for a carousel post.
                    </p>

                    <div className="bg-stone-50 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                        <span className="text-xs text-stone-600">Same outfit & style</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                        <span className="text-xs text-stone-600">Different poses & angles</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-stone-500"></div>
                        <span className="text-xs text-stone-600">Takes 2-3 minutes</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex flex-col gap-2">
                    <button
                      onClick={handleCreatePhotoshoot}
                      className="w-full bg-gradient-to-br from-stone-600 via-stone-700 to-stone-800 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:from-stone-700 hover:via-stone-800 hover:to-stone-900"
                    >
                      Let's Go
                    </button>
                    <button
                      onClick={() => setShowPhotoshootConfirm(false)}
                      className="w-full bg-stone-100 text-stone-700 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:bg-stone-200 active:scale-[0.98]"
                    >
                      Not Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isCreatingPhotoshoot && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-stone-600 animate-pulse"></div>
                    <div
                      className="w-1 h-1 rounded-full bg-stone-600 animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-1 h-1 rounded-full bg-stone-600 animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                    {photoshootGenerations.length === 0
                      ? "Starting photoshoot creation..."
                      : `Creating Carousel (${photoshootGenerations.filter((p) => p.url || p.imageUrl).length}/${photoshootGenerations.length})`}
                  </span>
                </div>

                {photoshootGenerations.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {photoshootGenerations.map((gen, idx) => (
                      <div key={idx} className="aspect-square bg-stone-100 rounded-lg overflow-hidden relative">
                        {gen.url || gen.imageUrl ? (
                          <img
                            src={gen.url || gen.imageUrl || "/placeholder.svg"}
                            alt={gen.action}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
                            <span className="text-[10px] text-stone-400 font-medium">Generating...</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {photoshootGenerations.length > 0 && (
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-stone-600 to-stone-900 h-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(photoshootGenerations.filter((p) => p.url || p.imageUrl).length / photoshootGenerations.length) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {videoError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{videoError}</p>
                <button onClick={handleAnimate} className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900">
                  Try Again
                </button>
              </div>
            )}

            {videoUrl && videoId && (
              <div className="mt-3">
                <InstagramReelCard videoUrl={videoUrl} motionPrompt={concept.description} />
              </div>
            )}

            {photoshootError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{photoshootError}</p>
                <button
                  onClick={handleCreatePhotoshoot}
                  className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Gallery Modal */}
      {showGalleryModal && (
        <ImageGalleryModal
          images={galleryImages}
          onSelect={handleGallerySelect}
          onClose={() => {
            setShowGalleryModal(false)
            currentBoxIndexRef.current = null
          }}
        />
      )}

      {/* Prompt Editor Modal */}
      {showPromptEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Edit Prompt</h3>
                <p className="text-sm text-stone-500 mt-1">{concept.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowPromptEditor(false)
                  // Reset to original if user closes without saving
                  if (!editedPrompt) {
                    setEditedPrompt(null)
                  }
                }}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Prompt Text
                  </label>
                  <textarea
                    value={editedPrompt ?? concept.prompt ?? `${concept.title}: ${concept.description}`}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="w-full h-64 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent resize-none font-mono text-sm text-stone-900"
                    placeholder="Enter your prompt..."
                  />
                  <p className="text-xs text-stone-500 mt-2">
                    {editedPrompt ? editedPrompt.length : (concept.prompt?.length || 0)} characters
                    {editedPrompt && editedPrompt !== concept.prompt && (
                      <span className="ml-2 text-orange-600">• Modified</span>
                    )}
                  </p>
                </div>

                {concept.prompt && (
                  <div className="pt-4 border-t border-stone-200">
                    <p className="text-xs font-medium text-stone-600 mb-2">Original Maya Prompt:</p>
                    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
                      <p className="text-xs text-stone-600 font-mono leading-relaxed">
                        {concept.prompt}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditedPrompt(concept.prompt)
                      }}
                      className="mt-2 text-xs text-stone-600 hover:text-stone-900 underline"
                    >
                      Restore original
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50">
              <button
                onClick={() => {
                  setShowPromptEditor(false)
                  setEditedPrompt(null)
                }}
                className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPromptEditor(false)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
