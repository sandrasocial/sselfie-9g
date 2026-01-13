"use client"

import { useState, useEffect } from "react"
import { Loader2, ArrowRight, Download } from "lucide-react"
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
  const [isDownloading, setIsDownloading] = useState(false)

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
      // But don't show modal yet - wait for image to load first (handled by useEffect above)
      setTimeout(async () => {
        try {
          const response = await fetch("/api/credits/balance")
          if (response.ok) {
            const data = await response.json()
            const totalUsed = data.total_used || 0
            setCreditsUsed(totalUsed)
            // Don't show modal here - let the useEffect handle it when image loads
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

  // Smart upsell modal detection for FREE users only
  // Only show FreeModeUpsellModal if:
  // 1. User is FREE (not paid)
  // 2. User has used 2+ credits
  // 3. User has seen their preview image (image is loaded and visible)
  // 4. User hasn't seen the modal in this session (localStorage check)
  // 5. No other upsell modals are showing (ZeroCreditsUpgradeModal, LowCreditModal)
  useEffect(() => {
    const checkCredits = async () => {
      // Only check if we haven't checked yet
      if (creditsUsed !== null) return
      
      // Check if user has already seen the upsell modal in this session
      const hasSeenUpsell = localStorage.getItem('free_upsell_modal_shown') === 'true'
      if (hasSeenUpsell) {
        // User already saw the modal, don't show again
        return
      }
      
      try {
        // Check if user is free (not paid)
        const accessResponse = await fetch("/api/feed-planner/access")
        if (!accessResponse.ok) return
        
        const accessData = await accessResponse.json()
        const isFreeUser = accessData?.isFree === true
        
        // Only show FreeModeUpsellModal for free users
        if (!isFreeUser) {
          console.log("[Feed Single Placeholder] User is paid, skipping free upsell modal")
          return
        }
        
        const response = await fetch("/api/credits/balance")
        if (response.ok) {
          const data = await response.json()
          const totalUsed = data.total_used || 0
          // Check total_used from user_credits table
          setCreditsUsed(totalUsed)
          
          // Show upsell modal if 2+ credits used
          // BUT only after user has seen their preview image
          if (totalUsed >= 2) {
            // Wait for image to load first, then show modal after delay
            // This ensures user sees their preview before being asked to upgrade
            if (hasImage) {
              // Image is already loaded, wait a bit then show modal
              setTimeout(() => {
                setShowUpsellModal(true)
                localStorage.setItem('free_upsell_modal_shown', 'true')
              }, 5000) // 5 seconds after image loads - gives user time to see preview
            }
            // If image not loaded yet, we'll check again when it loads (see useEffect below)
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

  // Show upsell modal when image loads (if user has used 2+ credits AND is free)
  useEffect(() => {
    // Only show if:
    // 1. User has used 2+ credits
    // 2. Image just loaded (hasImage is true)
    // 3. Modal not already shown in this session
    // 4. Modal not already open
    if (creditsUsed !== null && creditsUsed >= 2 && hasImage && !showUpsellModal) {
      const hasSeenUpsell = localStorage.getItem('free_upsell_modal_shown') === 'true'
      if (!hasSeenUpsell) {
        // Double-check user is free before showing modal
        let timer: NodeJS.Timeout | null = null
        
        fetch("/api/feed-planner/access")
          .then(res => res.json())
          .then(accessData => {
            const isFreeUser = accessData?.isFree === true
            if (isFreeUser) {
              // Wait 5 seconds after image loads to let user see their preview
              timer = setTimeout(() => {
                setShowUpsellModal(true)
                localStorage.setItem('free_upsell_modal_shown', 'true')
              }, 5000) // 5 seconds - best practice: let user see their result first
            }
          })
          .catch(err => {
            console.error("[Feed Single Placeholder] Error checking access:", err)
          })
        
        return () => {
          if (timer) clearTimeout(timer)
        }
      }
    }
  }, [hasImage, creditsUsed, showUpsellModal])

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
          // Show generated image with download button
          <div className="relative group">
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
            {/* Download button - mobile optimized */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
              <Button
                onClick={async () => {
                  if (!post.image_url) return
                  
                  setIsDownloading(true)
                  try {
                    const response = await fetch(post.image_url)
                    if (!response.ok) throw new Error("Failed to fetch image")
                    const blob = await response.blob()
                    
                    // Mobile: Use Share API for camera roll saving (proper image, not file)
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                    if (isMobile && navigator.share) {
                      try {
                        const fileName = `sselfie-preview-${feedId}-${Date.now()}.png`
                        const file = new File([blob], fileName, { type: "image/png" })
                        
                        const shareData: ShareData = {
                          files: [file],
                          title: "SSELFIE Preview",
                        }
                        
                        if (!navigator.canShare || navigator.canShare(shareData)) {
                          await navigator.share(shareData)
                          toast({
                            title: "Saved!",
                            description: "Image saved to your device",
                          })
                          setIsDownloading(false)
                          return
                        }
                      } catch (shareError: any) {
                        // If Share API fails (user cancelled or not supported), fall through to download
                        if (shareError.name === "AbortError") {
                          // User cancelled - that's fine
                          setIsDownloading(false)
                          return
                        }
                        console.log("[Feed Single Placeholder] Share API failed, falling back to download:", shareError?.message)
                      }
                    }
                    
                    // Fallback: Desktop or Share API not available - use download method
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `sselfie-preview-${feedId}-${Date.now()}.png`
                    document.body.appendChild(a)
                    a.click()
                    
                    setTimeout(() => {
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                    }, 100)
                    
                    toast({
                      title: "Download started",
                      description: "Image saved to your device",
                    })
                  } catch (error) {
                    console.error("[Feed Single Placeholder] Error downloading image:", error)
                    toast({
                      title: "Download failed",
                      description: "Please try again",
                      variant: "destructive",
                    })
                  } finally {
                    setIsDownloading(false)
                  }
                }}
                disabled={isDownloading}
                className="bg-stone-900 hover:bg-stone-800 text-white shadow-lg"
                size="sm"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Save to Device
                  </>
                )}
              </Button>
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
                <div className="text-center space-y-3 px-4">
                  <Loader2 className="w-8 h-8 text-stone-600 animate-spin mx-auto" />
                  <div className="text-sm font-medium text-stone-900">Generating your preview feed</div>
                  <div className="text-xs font-light text-stone-600">This takes about 30 seconds...</div>
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