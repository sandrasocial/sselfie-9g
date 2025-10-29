"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ImageIcon, Upload, RefreshCw } from "lucide-react"
import InstagramPhotoCard from "./instagram-photo-card"
import ImageGalleryModal from "./image-gallery-modal"
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
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FeedPostCard({ post, feedId, onGenerated }: FeedPostCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(!!post.image_url)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(post.image_url)
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(post.prediction_id)
  const [postId, setPostId] = useState<string>(post.id.toString())
  const [showFullPreview, setShowFullPreview] = useState(false)
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

    const pollInterval = setInterval(async () => {
      try {
        console.log("[v0] Polling post generation status...")
        const response = await fetch(`/api/feed/${feedId}/check-post?predictionId=${predictionId}&postId=${postId}`)
        const data = await response.json()

        console.log("[v0] Post generation status:", data.status)

        if (data.status === "succeeded") {
          console.log("[v0] Post generation succeeded! Image URL:", data.imageUrl)
          setGeneratedImageUrl(data.imageUrl)
          setIsGenerated(true)
          setIsGenerating(false)
          clearInterval(pollInterval)
          onGenerated?.()
        } else if (data.status === "failed") {
          console.log("[v0] Post generation failed:", data.error)
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

    return () => {
      console.log("[v0] Cleaning up polling interval")
      clearInterval(pollInterval)
    }
  }, [predictionId, postId, isGenerated, feedId]) // Removed onGenerated from dependencies

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      console.log("[v0] Generating post with ID:", post.id)

      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      console.log("[v0] Generation started with prediction ID:", data.predictionId)
      setPredictionId(data.predictionId)
      // postId is already set from initial state
    } catch (err) {
      console.error("[v0] Error generating image:", err)
      setError(err instanceof Error ? err.message : "Failed to generate image")
      setIsGenerating(false)
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
      onGenerated?.() // Refresh feed data
    } catch (err) {
      console.error("[v0] Error updating caption:", err)
      alert("Failed to update caption. Please try again.")
    }
  }

  const conceptData = {
    title: post.post_type,
    description: caption, // Use local caption state instead of post.caption
    category: post.post_type,
    prompt: post.prompt,
  }

  if (!isGenerating && !isGenerated && !error) {
    return (
      <div className="aspect-square flex flex-col items-center justify-center p-4 bg-gradient-to-br from-stone-100 to-stone-200 rounded-sm gap-3">
        <span className="text-xs font-bold text-stone-950 text-center">{post.post_type}</span>

        <div className="flex flex-col gap-2 w-full px-2">
          <button
            onClick={handleGenerate}
            className="w-full px-4 py-2 bg-stone-950 text-white text-xs font-semibold rounded-full transition-all hover:bg-stone-800 hover:scale-105"
          >
            Generate
          </button>

          <button
            onClick={() => setShowGalleryModal(true)}
            className="w-full px-4 py-2 bg-white text-stone-950 text-xs font-semibold rounded-full transition-all hover:bg-stone-100 hover:scale-105 border border-stone-300"
          >
            Choose from Gallery
          </button>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="aspect-square flex flex-col items-center justify-center bg-stone-950/5">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full bg-stone-200/20 animate-ping"></div>
          <div className="relative w-10 h-10 rounded-full bg-stone-950 animate-spin border-4 border-transparent border-t-white"></div>
        </div>
        <span className="text-xs text-stone-600 mt-3">Creating...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="aspect-square flex flex-col items-center justify-center p-3 bg-red-50">
        <span className="text-xs text-red-600 mb-2 text-center">{error}</span>
        <button onClick={handleGenerate} className="text-xs font-semibold text-red-700 hover:text-red-900 underline">
          Try Again
        </button>
      </div>
    )
  }

  if (isGenerated && generatedImageUrl) {
    return (
      <>
        <div className="aspect-square w-full h-full relative group overflow-hidden bg-stone-100">
          <img
            src={generatedImageUrl || "/placeholder.svg"}
            alt={post.post_type}
            className="w-full h-full object-cover object-top"
          />

          {/* Hover overlay with actions - clicking overlay opens preview */}
          <div
            onClick={() => setShowFullPreview(true)}
            className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {/* Replace from Gallery */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowGalleryModal(true)
                }}
                disabled={isReplacing}
                className="p-3 bg-white/90 backdrop-blur-xl rounded-full hover:bg-white transition-all hover:scale-110 disabled:opacity-50 relative z-10"
                title="Replace from Gallery"
              >
                <ImageIcon size={16} className="text-stone-950" strokeWidth={2} />
              </button>

              {/* Upload Own Image */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                disabled={isReplacing}
                className="p-3 bg-white/90 backdrop-blur-xl rounded-full hover:bg-white transition-all hover:scale-110 disabled:opacity-50 relative z-10"
                title="Upload Image"
              >
                <Upload size={16} className="text-stone-950" strokeWidth={2} />
              </button>

              {/* Regenerate */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRegenerate()
                }}
                disabled={isReplacing}
                className="p-3 bg-white/90 backdrop-blur-xl rounded-full hover:bg-white transition-all hover:scale-110 disabled:opacity-50 relative z-10"
                title="Regenerate"
              >
                <RefreshCw size={16} className="text-stone-950" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Hidden file input for upload */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />

        {/* Gallery Modal */}
        {showGalleryModal && (
          <ImageGalleryModal
            images={galleryImages}
            onSelect={handleReplaceFromGallery}
            onClose={() => setShowGalleryModal(false)}
          />
        )}

        {/* Full Preview Dialog */}
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
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return null
}
