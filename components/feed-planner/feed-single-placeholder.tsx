"use client"

import { useState } from "react"
import { ImageIcon, Loader2, Wand2, ArrowRight } from "lucide-react"
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
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-[300px]">
        {/* Single 9:16 placeholder */}
        <div
          className={`aspect-[9/16] bg-white border-2 ${
            hasImage ? "border-stone-200" : "border-dashed border-stone-300"
          } rounded-xl flex flex-col items-center justify-center p-6 ${
            !hasImage ? "cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition-colors" : ""
          } relative overflow-hidden`}
          onClick={!hasImage ? onAddImage : undefined}
        >
          {hasImage ? (
            // Show generated image
            <img
              src={post.image_url}
              alt="Generated post"
              className="w-full h-full object-cover"
            />
          ) : (
            // Show placeholder
            <>
              <ImageIcon className="w-12 h-12 text-stone-300 mb-4" strokeWidth={1.5} />
              <div className="text-sm font-light text-stone-500 text-center space-y-2">
                <div className="font-medium text-stone-700">Upload a selfie</div>
                <div className="text-xs">Click to add your reference image</div>
              </div>
            </>
          )}

          {/* Phase 5.3.3: Generation button (show when no image) */}
          {!hasImage && !isGenerating && (
            <div className="absolute bottom-4 left-0 right-0 px-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateImage()
                }}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white"
                size="sm"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Image
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 text-stone-600 animate-spin mx-auto" />
                <div className="text-sm font-light text-stone-600">Generating...</div>
              </div>
            </div>
          )}
        </div>

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