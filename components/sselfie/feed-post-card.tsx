"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ImageIcon, Upload, RefreshCw } from "lucide-react"
import InstagramPhotoCard from "./instagram-photo-card"
import ImageGalleryModal from "./image-gallery-modal"
import SchedulePostModal from "./schedule-post-modal"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import useSWR from "swr"

interface FeedPost {
  id: number
  position: number
  post_type: string
  prompt: string
  caption: string
  image_url: string | null
  generation_status: string
  prediction_id: string | null
}

interface FeedPostCardProps {
  post: FeedPost
  feedId: string
  onGenerated?: () => void
  generatingPostId?: number | null
  onGeneratingChange?: (postId: number | null) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FeedPostCard({
  post,
  feedId,
  onGenerated,
  generatingPostId,
  onGeneratingChange,
}: FeedPostCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(!!post.image_url)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(post.image_url)
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(post.prediction_id)
  const [postId, setPostId] = useState<string>(post.id.toString())
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [caption, setCaption] = useState(post.caption)

  const { data: galleryData } = useSWR("/api/images", fetcher)
  const galleryImages = galleryData?.images || []

  useEffect(() => {
    console.log("[v0] Caption prop changed, updating local state:", post.caption)
    setCaption(post.caption)
  }, [post.caption])

  useEffect(() => {
    console.log("[v0] FeedPostCard polling useEffect triggered", { predictionId, postId, isGenerated })

    if (!predictionId || !postId || isGenerated) {
      console.log("[v0] Polling conditions not met, skipping")
      return
    }

    console.log("[v0] Starting polling for post", postId, "with prediction", predictionId)

    const staggerDelay = Math.random() * 2000
    const staggerTimeout = setTimeout(() => {
      const pollInterval = setInterval(async () => {
        try {
          console.log("[v0] Polling post generation status...")
          const response = await fetch(`/api/feed/${feedId}/check-post?predictionId=${predictionId}&postId=${postId}`)

          if (!response.ok) {
            if (response.status === 429) {
              console.log("[v0] Rate limit hit, will retry on next poll...")
              return
            }
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()

          console.log("[v0] Post generation status:", data.status)

          if (data.status === "succeeded") {
            console.log("[v0] Post generation succeeded! Image URL:", data.imageUrl)
            setGeneratedImageUrl(data.imageUrl)
            setIsGenerated(true)
            setIsGenerating(false)
            if (onGeneratingChange) {
              onGeneratingChange(null)
            }
            clearInterval(pollInterval)
            onGenerated?.()
          } else if (data.status === "failed") {
            console.log("[v0] Post generation failed:", data.error)
            setError(data.error || "Generation failed")
            setIsGenerating(false)
            if (onGeneratingChange) {
              onGeneratingChange(null)
            }
            clearInterval(pollInterval)
          }
        } catch (err) {
          console.error("[v0] Error polling generation:", err)
        }
      }, 5000)

      return () => {
        console.log("[v0] Cleaning up polling interval")
        clearInterval(pollInterval)
      }
    }, staggerDelay)

    return () => {
      clearTimeout(staggerTimeout)
    }
  }, [predictionId, postId, isGenerated, feedId, onGeneratingChange])

  const handleGenerate = async () => {
    if (generatingPostId !== null && generatingPostId !== post.id) {
      console.log("[v0] Another card is generating, please wait")
      return
    }

    console.log("[v0] [FEED POST] Starting generation:", {
      postId: post.id,
      feedId,
      hasPrompt: !!post.prompt,
      promptLength: post.prompt?.length || 0,
    })

    setIsGenerating(true)
    setError(null)
    if (onGeneratingChange) {
      onGeneratingChange(post.id)
    }

    try {
      console.log("[v0] [FEED POST] Calling generate-single API...")

      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      })

      console.log("[v0] [FEED POST] API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] [FEED POST] API error:", errorData)
        throw new Error(errorData.error || errorData.details || "Failed to generate image")
      }

      const data = await response.json()
      console.log("[v0] [FEED POST] Generation started with prediction ID:", data.predictionId)

      setPredictionId(data.predictionId)
    } catch (err) {
      console.error("[v0] [FEED POST] Error generating image:", err)
      setError(err instanceof Error ? err.message : "Failed to generate image")
      setIsGenerating(false)
      if (onGeneratingChange) {
        onGeneratingChange(null)
      }
    }
  }

  const handleReplaceFromGallery = async (imageUrl: string) => {
    setIsReplacing(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/replace-post-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          imageUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to replace image")
      }

      setGeneratedImageUrl(imageUrl)
      setIsGenerated(true)
      onGenerated?.()
    } catch (err) {
      console.error("[v0] Error replacing image:", err)
      setError(err instanceof Error ? err.message : "Failed to replace image")
    } finally {
      setIsReplacing(false)
    }
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsReplacing(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await uploadResponse.json()

      const replaceResponse = await fetch(`/api/feed/${feedId}/replace-post-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          imageUrl: url,
        }),
      })

      if (!replaceResponse.ok) {
        throw new Error("Failed to replace image")
      }

      setGeneratedImageUrl(url)
      setIsGenerated(true)
      onGenerated?.()
    } catch (err) {
      console.error("[v0] Error uploading image:", err)
      setError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setIsReplacing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRegenerate = async () => {
    setIsGenerated(false)
    setGeneratedImageUrl(null)
    setPredictionId(null)
    await handleGenerate()
  }

  const handleCaptionUpdate = async (newCaption: string) => {
    try {
      const response = await fetch(`/api/feed/${feedId}/update-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          caption: newCaption,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update caption")
      }

      setCaption(newCaption)
      onGenerated?.()
    } catch (err) {
      console.error("[v0] Error updating caption:", err)
      alert("Failed to update caption. Please try again.")
    }
  }

  const conceptData = {
    title: post.post_type,
    description: caption,
    category: post.post_type,
    prompt: post.prompt,
  }

  const fileInput = (
    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
  )

  const galleryModal = showGalleryModal && (
    <ImageGalleryModal
      images={galleryImages}
      onSelect={handleReplaceFromGallery}
      onClose={() => setShowGalleryModal(false)}
    />
  )

  const fullPreviewDialog = showFullPreview && (
    <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none">
        <InstagramPhotoCard
          concept={conceptData}
          imageUrl={generatedImageUrl}
          imageId={postId}
          isFavorite={false}
          onFavoriteToggle={() => {}}
          onDelete={() => {}}
          onCaptionUpdate={handleCaptionUpdate}
        />
        <div className="mt-4 px-4 pb-4">
          <button
            onClick={() => {
              setShowFullPreview(false)
              setShowScheduleModal(true)
            }}
            className="w-full px-6 py-3 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium tracking-wider uppercase rounded-lg transition-all"
          >
            Add to Calendar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )

  const scheduleModal = showScheduleModal && (
    <SchedulePostModal
      post={{
        id: post.id,
        feedId: Number.parseInt(feedId),
        postType: post.post_type as "photo" | "reel" | "carousel",
        imageUrl: generatedImageUrl,
        caption: caption,
        scheduledAt: null,
        scheduledTime: "9:00 AM",
        contentPillar: null,
        status: "draft",
        position: post.position,
        prompt: post.prompt,
      }}
      onClose={() => setShowScheduleModal(false)}
      onScheduled={() => {
        setShowScheduleModal(false)
      }}
    />
  )

  return (
    <>
      {fileInput}
      {galleryModal}
      {fullPreviewDialog}
      {scheduleModal}
      {!isGenerating && !isGenerated && !error && (
        <div className="aspect-square flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-gradient-to-br from-stone-100 to-stone-200 rounded-sm gap-2 sm:gap-3 relative">
          {generatingPostId !== null && generatingPostId !== post.id && (
            <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center space-y-1 px-2">
                <div className="w-6 h-6 mx-auto border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-[9px] sm:text-[10px] text-white/90 font-medium">Generating...</p>
              </div>
            </div>
          )}

          <span className="text-[10px] sm:text-xs font-bold text-stone-950 text-center leading-tight">
            {post.post_type}
          </span>

          <div className="flex flex-col gap-1.5 sm:gap-2 w-full px-1 sm:px-2">
            <button
              onClick={handleGenerate}
              disabled={generatingPostId !== null && generatingPostId !== post.id}
              className="w-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-stone-950 text-white text-[10px] sm:text-xs font-semibold rounded-full transition-all hover:bg-stone-800 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate
            </button>

            <button
              onClick={() => setShowGalleryModal(true)}
              disabled={generatingPostId !== null && generatingPostId !== post.id}
              className="w-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white text-stone-950 text-[10px] sm:text-xs font-semibold rounded-full transition-all hover:bg-stone-100 hover:scale-105 border border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose from Gallery
            </button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="aspect-square flex flex-col items-center justify-center bg-stone-950/5">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10">
            <div className="absolute inset-0 rounded-full bg-stone-200/20 animate-ping"></div>
            <div className="relative w-full h-full rounded-full bg-stone-950 animate-spin border-4 border-transparent border-t-white"></div>
          </div>
          <span className="text-[10px] sm:text-xs text-stone-600 mt-2 sm:mt-3">Creating...</span>
        </div>
      )}

      {error && (
        <div className="aspect-square flex flex-col items-center justify-center p-2 sm:p-3 bg-red-50">
          <span className="text-[10px] sm:text-xs text-red-600 mb-2 text-center leading-tight">{error}</span>
          <button
            onClick={handleGenerate}
            className="text-[10px] sm:text-xs font-semibold text-red-700 hover:text-red-900 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {isGenerated && generatedImageUrl && (
        <div className="aspect-square w-full h-full relative group overflow-hidden bg-stone-100">
          <img
            src={generatedImageUrl || "/placeholder.svg"}
            alt={post.post_type}
            className="w-full h-full object-cover object-top"
          />

          <div
            onClick={() => setShowFullPreview(true)}
            className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowGalleryModal(true)
                }}
                disabled={isReplacing}
                className="p-2 sm:p-3 bg-white/90 backdrop-blur-xl rounded-full hover:bg-white transition-all hover:scale-110 disabled:opacity-50 relative z-10"
                title="Replace from Gallery"
              >
                <ImageIcon size={14} className="text-stone-950 sm:w-4 sm:h-4" strokeWidth={2} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                disabled={isReplacing}
                className="p-2 sm:p-3 bg-white/90 backdrop-blur-xl rounded-full hover:bg-white transition-all hover:scale-110 disabled:opacity-50 relative z-10"
                title="Upload Image"
              >
                <Upload size={14} className="text-stone-950 sm:w-4 sm:h-4" strokeWidth={2} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRegenerate()
                }}
                disabled={isReplacing}
                className="p-2 sm:p-3 bg-white/90 backdrop-blur-xl rounded-full hover:bg-white transition-all hover:scale-110 disabled:opacity-50 relative z-10"
                title="Regenerate"
              >
                <RefreshCw size={14} className="text-stone-950 sm:w-4 sm:h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
