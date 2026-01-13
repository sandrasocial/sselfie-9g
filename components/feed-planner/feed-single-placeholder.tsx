"use client"

import { useState, useEffect } from "react"
import { Loader2, ArrowRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import BuyBlueprintModal from "@/components/sselfie/buy-blueprint-modal"
import FreeModeUpsellModal from "./free-mode-upsell-modal"

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
  const [showBlueprintModal, setShowBlueprintModal] = useState(false)
  const [showUpsellModal, setShowUpsellModal] = useState(false)
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null)

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

      // Call refresh callback if provided to trigger polling
      if (onGenerateImage) {
        await onGenerateImage()
      }
      
      // Check credits again after generation (in case user just used their 2nd credit)
      // This will trigger the upsell modal if they've now used 2+ credits
      setTimeout(async () => {
        try {
          const response = await fetch("/api/credits/balance")
          if (response.ok) {
            const data = await response.json()
            const totalUsed = data.total_used || 0
            setCreditsUsed(totalUsed)
            
            // Show upsell modal if 2+ credits used (after generation completes)
            if (totalUsed >= 2 && !showUpsellModal) {
              setTimeout(() => {
                setShowUpsellModal(true)
              }, 2000) // Wait a bit after generation starts
            }
          }
        } catch (error) {
          console.error("[Feed Single Placeholder] Error checking credits after generation:", error)
        }
      }, 3000) // Check 3 seconds after generation starts
      
      // DON'T set isGenerating to false here - let the polling detect when image is ready
      // The component will check post.generation_status and post.prediction_id to show loading
    } catch (error) {
      console.error("[Feed Single Placeholder] Generate error:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      setIsGenerating(false) // Only set to false on error
    }
  }

  // Determine if post is currently generating based on post data (from polling)
  // This ensures loading state persists even after API call completes
  const isPostGenerating = post?.generation_status === "generating" || 
                           (post?.prediction_id && !post?.image_url) ||
                           isGenerating

  // Reset local isGenerating state when post completes (has image_url)
  useEffect(() => {
    if (post?.image_url && isGenerating) {
      setIsGenerating(false)
    }
  }, [post?.image_url, isGenerating])

  // Check if post has an image
  const hasImage = post?.image_url

  // Check user's credit usage for upsell modal (only check once on mount)
  useEffect(() => {
    const checkCredits = async () => {
      // Only check if we haven't checked yet
      if (creditsUsed !== null) return
      
      try {
        const response = await fetch("/api/credits/balance")
        if (response.ok) {
          const data = await response.json()
          const totalUsed = data.total_used || 0
          // Check total_used from user_credits table
          setCreditsUsed(totalUsed)
          
          // Show upsell modal if 2+ credits used (only show once)
          if (totalUsed >= 2) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
              setShowUpsellModal(true)
            }, 1000)
          }
        }
      } catch (error) {
        console.error("[Feed Single Placeholder] Error checking credits:", error)
        // Set to 0 on error to prevent infinite retries
        setCreditsUsed(0)
      }
    }
    
    checkCredits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Debug logging
  useEffect(() => {
    console.log("[Feed Single Placeholder] Post state:", {
      postId: post?.id,
      hasImage: !!hasImage,
      imageUrl: post?.image_url,
      generationStatus: post?.generation_status,
      predictionId: post?.prediction_id,
      isPostGenerating,
      isGenerating,
      creditsUsed,
    })
  }, [post, hasImage, isPostGenerating, isGenerating, creditsUsed])

  return (
    <div className="px-4 md:px-8 py-12">
      <div className="w-full max-w-md mx-auto">
        {/* Single Image Placeholder - ONE placeholder for ONE image */}
        {hasImage ? (
          // Show generated image
          <div className="relative">
            <div className="aspect-[9/16] bg-white border border-stone-200 rounded-lg overflow-hidden">
              <img
                src={post.image_url}
                alt="Generated post"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("[Feed Single Placeholder] Image load error:", post.image_url)
                  console.error("[Feed Single Placeholder] Error event:", e)
                }}
                onLoad={() => {
                  console.log("[Feed Single Placeholder] ✅ Image loaded successfully:", post.image_url)
                }}
              />
            </div>
          </div>
        ) : (
          // Show single placeholder
          <div className="relative">
            <div className="aspect-[9/16] bg-white border-2 border-dashed border-stone-300 rounded-lg"></div>

            {/* Generation button overlay - only show if NOT generating */}
            {!isPostGenerating && (
              <div className="absolute inset-0 flex items-center justify-center">
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

            {/* Loading state - show when generating (from API call OR from post data) */}
            {isPostGenerating && (
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
          
          {/* Conditional: Show upsell modal trigger if credits used >= 2, otherwise show generic button */}
          {creditsUsed !== null && creditsUsed >= 2 ? (
            <Button
              onClick={() => setShowUpsellModal(true)}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              size="default"
            >
              Continue Creating
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => setShowBlueprintModal(true)}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              size="default"
            >
              Unlock Full Feed Planner
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Embedded checkout modal (for users with < 2 credits) */}
      <BuyBlueprintModal
        open={showBlueprintModal}
        onOpenChange={setShowBlueprintModal}
        feedId={feedId}
      />

      {/* Credit-based upsell modal (for users with 2+ credits used) */}
      <FreeModeUpsellModal
        open={showUpsellModal}
        onOpenChange={setShowUpsellModal}
        feedId={feedId}
      />
    </div>
  )
}