"use client"

import { useState } from "react"
import { Loader2, ArrowRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface FeedSinglePlaceholderProps {
  feedId: number
  post: any | null // The single post for free users
  onAddImage?: () => void // Open gallery selector (upload + gallery) for free users
  onGenerateImage?: () => void // Callback to refresh feed data after generation
}

/**
 * Phase 5.3: Single Placeholder Component for Free Users
 * 
 * Shows one 9:16 placeholder instead of full 3x3 grid
 * Used when access.placeholderType === "single"
 * Phase 5.3.3: Added generation button for free users
 */
export default function FeedSinglePlaceholder({ 
  feedId, 
  post, 
  onAddImage, 
  onGenerateImage 
}: FeedSinglePlaceholderProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  // Phase 5.3.3: Handle image generation for free users
  const handleGenerateImage = async () => {
    if (!post?.id) {
      toast({
        title: "Error",
        description: "Post not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate" }))
        throw new Error(errorData.error || "Failed to generate")
      }

      toast({
        title: "Generating photo",
        description: "This takes about 30 seconds",
      })

      // Call refresh callback if provided
      if (onGenerateImage) {
        await onGenerateImage()
      }
    } catch (error) {
      console.error("[Feed Single Placeholder] Generate error:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Check if post has an image
  const hasImage = post?.image_url

  return (
    <div className="px-4 md:px-8 py-12">
      <div className="w-full">
        {/* 3x3 Grid Mockup Placeholder - matches header width */}
        {hasImage ? (
          // Show generated image in grid layout
          <div className="grid grid-cols-3 gap-[2px] md:gap-1">
            <div className="aspect-square bg-white relative overflow-hidden rounded-sm">
              <img
                src={post.image_url}
                alt="Generated post"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Empty grid cells */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-stone-100"></div>
            ))}
          </div>
        ) : (
          // Show 3x3 grid lines mockup
          <div className="relative">
            {/* Grid container with border - matches FeedGrid styling */}
            <div className="grid grid-cols-3 gap-[2px] md:gap-1 border border-stone-300 rounded-lg p-[2px] md:p-1 bg-stone-100">
              {/* Grid lines visualization - 9 empty cells */}
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-white"
                />
              ))}
            </div>

            {/* Generation button overlay */}
            {!isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                <div className="text-center space-y-4 px-4">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleGenerateImage()
                    }}
                    className="bg-stone-900 hover:bg-stone-800 text-white"
                    size="default"
                  >
                    Generate Image
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isGenerating && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-stone-600 animate-spin mx-auto" />
                  <div className="text-sm font-light text-stone-600">Generating...</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Helper text and Upsell CTA */}
        <div className="mt-6 text-center space-y-4">
          <div>
            <p className="text-xs text-stone-500 font-light">
              This is a preview of your feed grid
            </p>
            <p className="text-xs text-stone-400 font-light mt-1">
              Get the full Feed Planner + 30 Photos, Captions & Strategy
            </p>
          </div>
          
          {/* Phase 9: Upsell CTA Button */}
          <Link href="/checkout/blueprint">
            <Button
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              size="default"
            >
              Unlock Full Feed Planner
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}