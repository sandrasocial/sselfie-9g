"use client"

import { useState, useEffect } from "react"
import InstagramPhotoCard from "./instagram-photo-card"
import { Dialog, DialogContent } from "@/components/ui/dialog"

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

export default function FeedPostCard({ post, feedId, onGenerated }: FeedPostCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(!!post.image_url)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(post.image_url)
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(post.prediction_id)
  const [postId, setPostId] = useState<string>(post.id.toString())
  const [showFullPreview, setShowFullPreview] = useState(false)

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

  const conceptData = {
    title: post.post_type,
    description: post.caption, // Full caption with hashtags
    category: post.post_type,
    prompt: post.prompt,
  }

  if (!isGenerating && !isGenerated && !error) {
    return (
      <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-stone-100 to-stone-200 rounded-sm">
        <span className="text-xs font-bold text-stone-950 mb-2 text-center">{post.post_type}</span>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 bg-stone-950 text-white text-xs font-semibold rounded-full transition-all hover:bg-stone-800 hover:scale-105"
        >
          Generate
        </button>
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
        <button
          onClick={() => setShowFullPreview(true)}
          className="aspect-square w-full h-full overflow-hidden bg-stone-100 hover:opacity-90 transition-opacity"
        >
          <img
            src={generatedImageUrl || "/placeholder.svg"}
            alt={post.post_type}
            className="w-full h-full object-cover object-top"
          />
        </button>

        <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none">
            <InstagramPhotoCard
              concept={conceptData}
              imageUrl={generatedImageUrl}
              imageId={postId}
              isFavorite={false}
              onFavoriteToggle={() => {}}
              onDelete={() => {}}
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return null
}
