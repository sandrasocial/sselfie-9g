"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
      
      // Credits are deducted immediately when generation starts
      // The useEffect will re-check credits when generation completes (when image_url is set)
      
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

  // Check if post has an image (use stable memoized values)
  const hasImage = useMemo(() => !!post?.image_url, [post?.image_url])
  const imageUrl = useMemo(() => post?.image_url || null, [post?.image_url])
  const postId = useMemo(() => post?.id || null, [post?.id])
  const generationStatus = useMemo(() => post?.generation_status || null, [post?.generation_status])
  const predictionId = useMemo(() => post?.prediction_id || null, [post?.prediction_id])

  // Smart upsell modal detection for FREE users only
  // Show FreeModeUpsellModal AFTER image generation completes:
  // 1. User is FREE (not paid)
  // 2. User has used 2+ credits
  // 3. Image generation is COMPLETE (hasImage is true AND isPostGenerating is false)
  // 4. User hasn't seen the modal in this session (localStorage check)
  // 5. Wait 10 seconds after generation completes before showing modal
  
  // Check credits when component mounts (initial check)
  useEffect(() => {
    const checkCredits = async () => {
      if (creditsUsed !== null) return // Already checked
      
      try {
        const response = await fetch("/api/credits/balance")
        if (response.ok) {
          const data = await response.json()
          const totalUsed = data.total_used || 0
          setCreditsUsed(totalUsed)
          console.log("[Feed Single Placeholder] Initial credits check - Credits used:", totalUsed)
        }
      } catch (error) {
        console.error("[Feed Single Placeholder] Error checking credits:", error)
        setCreditsUsed(0)
      }
    }
    
    checkCredits()
  }, [])

  // Re-check credits when generation completes (credits are deducted when generation starts)
  // This ensures we have the latest total_used after the generation API deducts credits
  // Use a ref to track if we've already checked credits for this completion
  const creditsCheckedForCompletionRef = useRef(false)
  
  useEffect(() => {
    const generationComplete = hasImage && !isPostGenerating
    
    if (!generationComplete) {
      // Reset the ref when generation starts again
      creditsCheckedForCompletionRef.current = false
      return
    }
    
    // Only check credits once when generation completes
    if (creditsCheckedForCompletionRef.current) return
    creditsCheckedForCompletionRef.current = true
    
    // Re-check credits when image completes (in case user just used their 2nd credit)
    const checkCreditsAfterCompletion = async () => {
      try {
        const response = await fetch("/api/credits/balance")
        if (response.ok) {
          const data = await response.json()
          const totalUsed = data.total_used || 0
          console.log("[Feed Single Placeholder] ✅ Re-checking credits after generation completes - Credits used:", totalUsed)
          setCreditsUsed(totalUsed)
        }
      } catch (error) {
        console.error("[Feed Single Placeholder] Error re-checking credits:", error)
      }
    }
    
    // Small delay to ensure credits are updated in DB
    const timer = setTimeout(() => {
      checkCreditsAfterCompletion()
    }, 2000) // 2 second delay to ensure DB is updated after progress endpoint runs
    
    return () => clearTimeout(timer)
  }, [hasImage, isPostGenerating])

  // Show upsell modal AUTOMATICALLY after generation completes (image loaded AND not generating)
  // Modal shows when user has 0 credits OR has used 2+ credits
  // Timing: First time 10 seconds after generation, then every 5 minutes
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recurringTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasShownFirstModalRef = useRef(false)
  
  // Function to check conditions and show modal
  const checkAndShowModal = async (isFirstTime: boolean) => {
    try {
      // Check current credit balance
      const creditsResponse = await fetch("/api/credits/balance")
      if (!creditsResponse.ok) return false
      
      const creditsData = await creditsResponse.json()
      const currentBalance = creditsData.balance || 0
      const totalUsed = creditsData.total_used || 0
      
      // Only show if user has 0 credits OR has used 2+ credits
      if (currentBalance > 0 && totalUsed < 2) {
        console.log("[Feed Single Placeholder] User has credits, skipping automatic modal")
        return false
      }
      
      // Double-check user is free before showing modal
      const accessResponse = await fetch("/api/feed-planner/access")
      if (!accessResponse.ok) return false
      
      const accessData = await accessResponse.json()
      const isFreeUser = accessData?.isFree === true
      
      if (!isFreeUser) {
        console.log("[Feed Single Placeholder] User is paid, skipping free upsell modal")
        return false
      }
      
      // Don't show if modal is already open
      if (showUpsellModal) {
        return false
      }
      
      console.log("[Feed Single Placeholder] ✅ All conditions met - showing upsell modal", isFirstTime ? "(first time)" : "(recurring)")
      console.log("[Feed Single Placeholder] Credits balance:", currentBalance, "Credits used:", totalUsed)
      
      setShowUpsellModal(true)
      hasShownFirstModalRef.current = true
      return true
    } catch (err) {
      console.error("[Feed Single Placeholder] Error checking for automatic modal:", err)
      return false
    }
  }
  
  // First time modal trigger (10 seconds after generation completes)
  useEffect(() => {
    // Clear any existing timer when conditions change
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current)
      modalTimerRef.current = null
    }
    
    // Only show if:
    // 1. Image generation is COMPLETE (hasImage AND NOT isPostGenerating)
    // 2. Modal not already open
    // 3. First modal hasn't been shown yet
    const generationComplete = hasImage && !isPostGenerating
    const shouldShowFirstModal = generationComplete && !showUpsellModal && !hasShownFirstModalRef.current
    
    console.log("[Feed Single Placeholder] First modal check:", {
      generationComplete,
      creditsUsed,
      hasImage,
      isPostGenerating,
      shouldShowFirstModal,
      showUpsellModal,
      hasShownFirst: hasShownFirstModalRef.current,
    })
    
    if (!shouldShowFirstModal) return
    
    // Wait 10 seconds after generation completes, then check and show modal
    modalTimerRef.current = setTimeout(() => {
      checkAndShowModal(true).then((shown) => {
        if (shown) {
          // After first modal is shown, set up recurring timer (5 minutes)
          recurringTimerRef.current = setInterval(() => {
            checkAndShowModal(false)
          }, 5 * 60 * 1000) // 5 minutes = 300,000ms
          console.log("[Feed Single Placeholder] ✅ Recurring timer set for every 5 minutes")
        }
      })
    }, 10000) // 10 seconds after generation completes
    
    return () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
        modalTimerRef.current = null
      }
    }
  }, [imageUrl, isPostGenerating, showUpsellModal, hasImage])
  
  // Clean up recurring timer when component unmounts or modal is manually closed
  useEffect(() => {
    return () => {
      if (recurringTimerRef.current) {
        clearInterval(recurringTimerRef.current)
        recurringTimerRef.current = null
      }
    }
  }, [])
  
  // Reset first modal flag when generation starts again (new image being generated)
  useEffect(() => {
    if (isPostGenerating && hasShownFirstModalRef.current) {
      // Reset flag when new generation starts
      hasShownFirstModalRef.current = false
      // Clear recurring timer - will be set up again when new image completes
      if (recurringTimerRef.current) {
        clearInterval(recurringTimerRef.current)
        recurringTimerRef.current = null
      }
    }
  }, [isPostGenerating])

  // Debug logging
  useEffect(() => {
    console.log("[Feed Single Placeholder] Post state:", {
      postId,
      hasImage,
      imageUrl,
      generationStatus,
      predictionId,
      isPostGenerating,
      isGenerating,
      creditsUsed,
      showUpsellModal,
      generationComplete: hasImage && !isPostGenerating,
    })
  }, [postId, imageUrl, generationStatus, predictionId, isPostGenerating, isGenerating, creditsUsed, showUpsellModal, hasImage])

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
          
          {/* "Continue Creating" button - shows embedded checkout modal (BuyBlueprintModal) */}
          {/* Does NOT trigger upsell modal (modal shows automatically after generation) */}
          <Button
            onClick={() => {
              // Always show the embedded checkout modal with 30 photos card
              setShowBlueprintModal(true)
            }}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            size="default"
          >
            Continue Creating
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
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