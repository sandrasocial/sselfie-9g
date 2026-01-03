"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type React from "react"
import {
  Grid3x3,
  LayoutGrid,
  List,
  Loader2,
  ChevronLeft,
  MessageCircle,
  Heart,
  Bookmark,
  Send,
  MoreHorizontal,
  X,
  Copy,
  Check,
  Sparkles,
  ImageIcon,
} from "lucide-react"
import Image from "next/image"
import useSWR from "swr"
import { toast } from "@/hooks/use-toast"
import { FeedPostGallerySelector } from "./feed-post-gallery-selector"
import { FeedProfileGallerySelector } from "./feed-profile-gallery-selector"
import FeedPostCard from "./feed-post-card"
import ReactMarkdown from "react-markdown"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  
  // If the response has an error and is not a 200 status, throw to let SWR handle it
  if (!res.ok && data.error) {
    // Return the error data so SWR can handle it properly
    return data
  }
  
  // Validate response structure
  if (data && !data.feed && !data.error && !data.exists) {
    console.warn("[v0] Fetcher: Unexpected response structure:", {
      url,
      dataKeys: Object.keys(data),
      status: res.status,
    })
  }
  
  return data
}

interface InstagramFeedViewProps {
  feedId: number
  onBack?: () => void
}

export default function InstagramFeedView({ feedId, onBack }: InstagramFeedViewProps) {
  // Declare refs and functions BEFORE useSWR (they're used in the onSuccess callback)
  const hasShownConfettiRef = useRef(false)
  
  const triggerConfetti = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const colors = ["#292524", "#57534e", "#78716c"] // stone colors only

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const confettiInterval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(confettiInterval)
        return
      }

      const particleCount = 3

      // Create confetti particles
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div")
        particle.style.position = "fixed"
        particle.style.width = "8px"
        particle.style.height = "8px"
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
        particle.style.left = Math.random() * window.innerWidth + "px"
        particle.style.top = "-10px"
        particle.style.zIndex = "9999"
        particle.style.pointerEvents = "none"
        particle.style.borderRadius = "2px"
        particle.style.transition = "transform 3s linear, opacity 3s linear"
        
        document.body.appendChild(particle)

        requestAnimationFrame(() => {
          particle.style.transform = `translateY(${window.innerHeight + 100}px) rotate(${randomInRange(-180, 180)}deg)`
          particle.style.opacity = "0"
        })

        setTimeout(() => {
          particle.remove()
        }, duration)
      }
    }, 50)

    setTimeout(() => {
      clearInterval(confettiInterval)
    }, duration)
  }

  // Use SWR for data fetching with intelligent polling
  // Track last update time to continue polling for a grace period after updates
  const lastUpdateRef = useRef<number>(Date.now())
  
  const { data: feedData, error: feedError, mutate, isLoading: isFeedLoading, isValidating } = useSWR(
    feedId ? `/api/feed/${feedId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Poll if:
        // 1. Posts are generating images (prediction_id but no image_url)
        // 2. Feed is processing prompts/captions (status: processing/queueing/generating)
        const hasGeneratingPosts = data?.posts?.some(
          (p: any) => p.prediction_id && !p.image_url
        )
        const isProcessing = data?.feed?.status === 'processing' || 
                            data?.feed?.status === 'queueing' ||
                            data?.feed?.status === 'generating'
        
        // Continue polling if generating or processing
        if (hasGeneratingPosts || isProcessing) {
          lastUpdateRef.current = Date.now()
          return 3000 // Poll every 3s (faster for better UX)
        }
        
        // Grace period: Continue polling for 15s after last update
        // This ensures UI catches database updates even if timing is slightly off
        const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
        const shouldContinuePolling = timeSinceLastUpdate < 15000
        
        return shouldContinuePolling ? 3000 : 0
      },
      refreshWhenHidden: false, // Stop when tab hidden
      revalidateOnFocus: true, // Refresh when tab becomes visible
      onSuccess: (data) => {
        // Update last update time when data changes
        if (data?.posts) {
          const hasNewImages = data.posts.some((p: any) => p.image_url)
          if (hasNewImages) {
            lastUpdateRef.current = Date.now()
          }
        }
        
        // Check if all posts complete - trigger confetti
        // Note: Confetti is also triggered in useEffect below, but we check ref here to avoid double-trigger
        const allComplete = data?.posts?.every((p: any) => p.image_url)
        if (allComplete && !hasShownConfettiRef.current) {
          // Don't trigger here - let the useEffect handle it to avoid double confetti
          // The useEffect (lines 251-266) will handle the confetti animation
        }
      },
    }
  )
  console.log("[v0] ==================== INSTAGRAM FEED VIEW RENDERED ====================")
  console.log("[v0] feedData:", feedData ? "exists" : "null")
  console.log("[v0] feedData structure:", feedData ? Object.keys(feedData) : "null")
  console.log("[v0] feedData.posts count:", feedData?.posts?.length || 0)
  console.log("[v0] feedData.feed:", feedData?.feed ? "exists" : "undefined")
  console.log("[v0] feedData.feed.id:", feedData?.feed?.id)
  console.log("[v0] feedData.error:", feedData?.error)

  const [activeTab, setActiveTab] = useState<"grid" | "posts" | "strategy">("grid")
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [expandedCaptions, setExpandedCaptions] = useState<Set<number>>(new Set())
  const [regeneratingPost, setRegeneratingPost] = useState<number | null>(null)
  const [showGallery, setShowGallery] = useState<number | null>(null)
  const [showProfileGallery, setShowProfileGallery] = useState(false)

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const hasOpenModal = !!selectedPost || !!showGallery || showProfileGallery
    
    if (hasOpenModal) {
      // Save original overflow style
      const originalOverflow = document.body.style.overflow
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      // Cleanup: restore original overflow on unmount or when modal closes
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [selectedPost, showGallery, showProfileGallery])

  const [showConfetti, setShowConfetti] = useState(false)
  const [generatingRemaining, setGeneratingRemaining] = useState(false)
  const [copiedCaptions, setCopiedCaptions] = useState<Set<number>>(new Set())
  const [enhancingCaptions, setEnhancingCaptions] = useState<Set<number>>(new Set())
  const [isGeneratingBio, setIsGeneratingBio] = useState(false)
  
  // Drag-and-drop state for reordering posts
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [reorderedPosts, setReorderedPosts] = useState<any[]>([])
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  // Derived state from feedData (single source of truth)
  // SIMPLIFIED: A post is complete if it has an image_url (regardless of generation_status)
  // This fixes the issue where images are ready but status isn't updated to 'completed'
  const postStatuses = useMemo(() => {
    if (!feedData?.posts) return []
    
    return feedData.posts.map((post: any) => ({
      id: post.id,
      position: post.position,
      status: post.generation_status,
      hasImage: !!post.image_url,
      // Simplified: isGenerating = has prediction_id but no image_url yet
      isGenerating: !!post.prediction_id && !post.image_url,
      // Simplified: isComplete = has image_url (regardless of status - images are ready to preview)
      isComplete: !!post.image_url,
      imageUrl: post.image_url,
      predictionId: post.prediction_id,
    }))
  }, [feedData])

  // Memoize posts to prevent unnecessary re-renders
  // NOTE: This hook MUST be called before any early returns to comply with Rules of Hooks
  const posts = useMemo(() => {
    return feedData?.posts ? [...feedData.posts].sort((a: any, b: any) => a.position - b.position) : []
  }, [feedData?.posts])

  // ALL HOOKS MUST BE DECLARED BEFORE EARLY RETURNS (Rules of Hooks)
  // Track previous posts to detect actual changes
  const prevPostsRef = useRef<string>('')
  const postsKey = posts.map((p: any) => `${p.id}-${p.position}`).join(',')

  // Download bundle state
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false)

  // Initialize reorderedPosts when posts change (only if not currently dragging)
  // CRITICAL: reorderedPosts must always be in sync with posts for drag handlers to work correctly
  useEffect(() => {
    // Only update if posts actually changed (by comparing IDs and positions)
    if (draggedIndex === null && posts.length > 0 && prevPostsRef.current !== postsKey) {
      prevPostsRef.current = postsKey
      setReorderedPosts(posts)
    }
  }, [posts, draggedIndex, postsKey])

  // Confetti trigger when all posts are complete (single trigger point to avoid duplicate)
  const readyPosts = postStatuses.filter(p => p.isComplete).length
  useEffect(() => {
    const totalPosts = 9
    if (readyPosts === totalPosts && !hasShownConfettiRef.current) {
      // Set ref immediately to prevent duplicate triggers (from SWR onSuccess or multiple renders)
      hasShownConfettiRef.current = true
      
      console.log("[v0] 🎉 All posts complete! Revealing feed with confetti")
      setTimeout(() => {
        setShowConfetti(true)
        triggerConfetti()
      }, 500)
      
      // Clear confetti after 3 seconds
      setTimeout(() => {
        setShowConfetti(false)
      }, 3500)
    }
  }, [readyPosts])

  // Log post status for debugging (optional - can be removed in production)
  useEffect(() => {
    if (!feedData?.posts) return
    
    const postsWithoutPrediction = feedData.posts.filter(
      (p: any) => !p.prediction_id && p.generation_status !== "completed" && !p.image_url,
    )
    
    if (postsWithoutPrediction.length > 0) {
      const feedCreatedRecently = feedData.feed?.created_at 
        ? (Date.now() - new Date(feedData.feed.created_at).getTime()) < 120000 // 2 minutes
        : false
      
      if (feedCreatedRecently) {
        console.log(`[v0] ⏳ Feed was just created - queue-all-images is processing ${postsWithoutPrediction.length} posts in background. SWR will poll for updates...`)
      } else {
        console.log(`[v0] ⚠️ Found ${postsWithoutPrediction.length} posts without prediction_id. If this persists, use the "Generate All" button.`)
      }
    }
  }, [feedData])

  const generatingPosts = postStatuses.filter(p => p.isGenerating)

  // Handle error responses
  if (feedData?.error) {
    return (
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-light text-stone-900">Feed Not Found</h2>
          <p className="text-sm text-stone-600">{feedData.error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-stone-500 hover:text-stone-900 underline"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    )
  }

  // Handle loading state
  if (isFeedLoading && !feedData) {
    return (
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400 mx-auto" />
          <p className="text-sm text-stone-600">Loading feed data...</p>
        </div>
      </div>
    )
  }

  // Handle error responses (check both feedData.error and feedError from SWR)
  if (feedError || feedData?.error) {
    return (
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-light text-stone-900">Feed Not Found</h2>
          <p className="text-sm text-stone-600">{feedData?.error || feedError?.message || "Unable to load feed data"}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-stone-500 hover:text-stone-900 underline mt-4"
            >
              Go back and create a new feed
            </button>
          )}
        </div>
      </div>
    )
  }

  // Handle missing feed data or missing feed object
  if (!feedData || !feedData.feed) {
    console.error("[v0] Feed data exists but feed object is missing:", {
      hasFeedData: !!feedData,
      feedDataKeys: feedData ? Object.keys(feedData) : [],
      feedDataError: feedData?.error,
      feedDataFeed: feedData?.feed,
      feedDataExists: feedData?.exists,
      feedId,
      feedError: feedError,
      isFeedLoading,
    })
    
    // If we have an error in the response, show that
    if (feedData?.error) {
      return (
        <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-light text-stone-900">Feed Not Found</h2>
            <p className="text-sm text-stone-600">{feedData.error}</p>
            {onBack && (
              <button
                onClick={onBack}
                className="text-sm text-stone-500 hover:text-stone-900 underline mt-4"
              >
                Go back
              </button>
            )}
          </div>
        </div>
      )
    }
    
    // If feedData exists but doesn't have feed, it's a structure issue
    return (
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-light text-stone-900">Invalid Feed Data</h2>
          <p className="text-sm text-stone-600">The feed data structure is invalid. Please try creating a new feed.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-stone-500 hover:text-stone-900 underline mt-4"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    )
  }

  // All hooks must be declared before this point (Rules of Hooks)
  // The 'posts' useMemo has been moved above the early returns
  
  const totalPosts = 9
  
  // Get processing progress from feed data (if available)
  const processingProgress = feedData?.feed?.processingProgress || 0
  const processingStage = feedData?.feed?.processingStage
  const isProcessing = feedData?.feed?.status === 'processing' || feedData?.feed?.status === 'queueing'
  
  // Calculate image generation progress
  const imageProgress = Math.round((readyPosts / totalPosts) * 100)
  const isFeedComplete = readyPosts === totalPosts
  
  // Overall progress (combines processing + image generation)
  const overallProgress = isProcessing 
    ? Math.min(processingProgress, 90) // Processing is 0-90%, images are 90-100%
    : imageProgress
  
  // Progress message based on stage
  const getProgressMessage = () => {
    if (isProcessing && processingStage) {
      switch (processingStage) {
        case 'generating_prompts':
          return 'Generating prompts...'
        case 'generating_captions':
          return 'Writing captions...'
        case 'queueing_images':
          return 'Queueing images...'
        default:
          return 'Processing...'
      }
    }
    if (readyPosts < totalPosts) {
      return `Generating images... (${readyPosts}/${totalPosts})`
    }
    return 'Complete!'
  }

  // Ensure reorderedPosts is always initialized (use posts as fallback for rendering if empty)
  const displayPosts = reorderedPosts.length > 0 ? reorderedPosts : posts

  // Drag-and-drop handlers for reordering posts
  const handleDragStart = (index: number) => {
    // Only allow dragging if post is complete
    // Use displayPosts to ensure we're working with the same array that's rendered
    const post = displayPosts[index]
    if (!post?.image_url || post.generation_status !== 'completed') {
      return
    }
    // Ensure reorderedPosts is initialized if it was empty
    if (reorderedPosts.length === 0) {
      setReorderedPosts(displayPosts)
    }
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      const newPosts = [...reorderedPosts]
      const [draggedPost] = newPosts.splice(draggedIndex, 1)
      newPosts.splice(index, 0, draggedPost)
      setReorderedPosts(newPosts)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return
    
    const originalIndex = draggedIndex
    setDraggedIndex(null)
    
    // Check if order actually changed
    const orderChanged = reorderedPosts.some((post, index) => {
      const originalPost = posts[index]
      return !originalPost || post.id !== originalPost.id
    })
    
    if (!orderChanged) {
      // Order didn't change, revert to original
      setReorderedPosts(posts)
      return
    }
    
    // Save new order to database
    try {
      setIsSavingOrder(true)
      const response = await fetch(`/api/feed/${feedId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postOrders: reorderedPosts.map((post, index) => ({
            postId: post.id,
            newPosition: index + 1, // 1-9
          })),
        }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save order' }))
        throw new Error(error.error || 'Failed to save order')
      }
      
      toast({
        title: "Feed reordered",
        description: "Your feed layout has been updated",
      })
      
      // Refresh feed data to get updated positions
      await mutate()
    } catch (error) {
      console.error("[v0] Reorder error:", error)
      toast({
        title: "Failed to save order",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      // Revert to original order
      setReorderedPosts(posts)
    } finally {
      setIsSavingOrder(false)
    }
  }

  // Download bundle handler
  const handleDownloadBundle = async () => {
    if (!feedData || !isFeedComplete) return
    
    try {
      setIsDownloadingBundle(true)
      const response = await fetch(`/api/feed/${feedId}/download-bundle`)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Download failed' }))
        throw new Error(error.error || 'Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `instagram-feed-${feedId}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Download started",
        description: "Your feed bundle is downloading",
      })
    } catch (error) {
      console.error("[v0] Download bundle error:", error)
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingBundle(false)
    }
  }

  const toggleCaption = (postId: number) => {
    const newExpanded = new Set(expandedCaptions)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
    }
    setExpandedCaptions(newExpanded)
  }

  const copyCaptionToClipboard = async (caption: string, postId: number) => {
    try {
      await navigator.clipboard.writeText(caption)
      const newCopied = new Set(copiedCaptions)
      newCopied.add(postId)
      setCopiedCaptions(newCopied)
      setTimeout(() => {
        const updated = new Set(copiedCaptions)
        updated.delete(postId)
        setCopiedCaptions(updated)
      }, 2000)
      toast({
        title: "Copied!",
        description: "Caption copied to clipboard",
      })
    } catch (error) {
      console.error("[v0] Failed to copy caption:", error)
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleGenerateBio = async () => {
    if (!feedData?.feed?.id) {
      toast({
        title: "Error",
        description: "Feed ID is missing. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingBio(true)

    try {
      const response = await fetch(`/api/feed/${feedData.feed.id}/generate-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!response.ok) {
        let errorData: any = {}
        let errorMessage = "Failed to generate bio"
        
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const errorText = await response.text()
            if (errorText && errorText.trim().length > 0) {
              try {
                errorData = JSON.parse(errorText)
                errorMessage = errorData.error || errorMessage
              } catch {
                errorMessage = errorText.substring(0, 200) || errorMessage
              }
            }
          }
        } catch (parseError) {
          console.error(`[v0] Error parsing response:`, parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`
        }
        
        console.error(`[v0] ❌ Failed to generate bio:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          feedId: feedData?.feed?.id
        })
        
        throw new Error(errorMessage)
      }

      let data
      try {
        const responseText = await response.text()
        if (!responseText || responseText.trim().length === 0) {
          throw new Error("Empty response from server")
        }
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[v0] Failed to parse response:`, parseError)
        throw new Error("Invalid response from server. Please try again.")
      }

      if (data.bio) {
        // Refresh feed data to show updated bio
        await mutate(`/api/feed/${feedData.feed.id}`)
        toast({
          title: feedData.bio?.bio_text ? "Bio regenerated!" : "Bio generated!",
          description: "Your Instagram bio has been created based on your brand profile.",
        })
      } else {
        throw new Error("No bio returned")
      }
    } catch (error) {
      console.error("[v0] Generate bio error:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingBio(false)
    }
  }

  const handleEnhanceCaption = async (postId: number, currentCaption: string) => {
    if (!feedData?.feed?.id) {
      toast({
        title: "Error",
        description: "Feed ID is missing. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    const newEnhancing = new Set(enhancingCaptions)
    newEnhancing.add(postId)
    setEnhancingCaptions(newEnhancing)

    try {
      const response = await fetch(`/api/feed/${feedData.feed.id}/enhance-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId, currentCaption }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to enhance caption")
      }

      const data = await response.json()
      
      if (data.enhancedCaption) {
        // Refresh feed data to show updated caption
        await mutate(`/api/feed/${feedData.feed.id}`)
        toast({
          title: "Caption enhanced!",
          description: "Maya has improved your caption. You can edit it further if needed.",
        })
      } else {
        throw new Error("No enhanced caption returned")
      }
    } catch (error) {
      console.error("[v0] Enhance caption error:", error)
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      const updated = new Set(enhancingCaptions)
      updated.delete(postId)
      setEnhancingCaptions(updated)
    }
  }

  const handleGenerateSingle = async (postId: number) => {
    try {
      setGeneratingPosts((prev) => new Set(prev).add(postId))

      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        let errorData = {}
        let errorMessage = "Failed to generate"
        try {
          const errorText = await response.text()
          if (errorText) {
            errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorData.details || errorMessage
          }
        } catch (parseError) {
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            message: "Failed to parse error response"
          }
        }
        console.error(`[v0] ❌ Failed to generate post ${postId}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          feedId: feedId
        })
        throw new Error(errorMessage)
      }

      let data
      try {
        data = await response.json()
        console.log("[v0] ✅ Generated post:", postId, "prediction ID:", data.predictionId)
      } catch (parseError) {
        console.error(`[v0] ⚠️ Success response but failed to parse JSON for post ${postId}:`, parseError)
        throw new Error("Failed to parse response")
      }

      toast({
        title: "Creating your photo",
        description: "This takes about 30 seconds",
      })

      // Refresh feed data after a short delay to pick up prediction_id
      // Then refresh again after longer delay to catch completed images
      setTimeout(() => {
        mutate(`/api/feed/${feedId}`)
      }, 1000)
      
      // Additional refresh after 5 seconds to catch early completions
      setTimeout(() => {
        mutate(`/api/feed/${feedId}`)
      }, 5000)
    } catch (error: any) {
      setGeneratingPosts((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })

      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleGenerateRemaining = async () => {
    const postsWithoutPrediction = posts.filter(
      (p: any) => !p.prediction_id && p.generation_status !== "completed" && !p.image_url,
    )

    if (postsWithoutPrediction.length === 0) {
      toast({
        title: "All posts are generating",
        description: "No remaining posts to generate",
      })
      return
    }

    setGeneratingRemaining(true)
    toast({
      title: `Generating ${postsWithoutPrediction.length} remaining images`,
      description: "This may take a few minutes",
    })

    try {
      // Use queue-all-images API (same as create-strategy does)
      console.log(`[v0] Queueing ${postsWithoutPrediction.length} remaining images via queue-all-images API`)
      const response = await fetch(`/api/feed-planner/queue-all-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedLayoutId: feedId }),
      })

      if (!response.ok) {
        let errorData = {}
        try {
          const errorText = await response.text()
          if (errorText) {
            errorData = JSON.parse(errorText)
          }
        } catch (parseError) {
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            message: "Failed to parse error response"
          }
        }
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to queue images`)
      }

      const data = await response.json()
      console.log(`[v0] ✅ Successfully queued ${data.queuedCount || postsWithoutPrediction.length} images`)

      // Refresh feed data after a short delay
      setTimeout(() => {
        mutate(`/api/feed/${feedId}`)
        setGeneratingRemaining(false)
        toast({
          title: "Generation started",
          description: `Started generating ${data.queuedCount || postsWithoutPrediction.length} images`,
        })
      }, 2000)
    } catch (error: any) {
      setGeneratingRemaining(false)
      console.error(`[v0] ❌ Error queueing images:`, error)
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleRegeneratePost = async (postId: number) => {
    if (!feedId) {
      toast({
        title: "Error",
        description: "Feed ID not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Regenerate this photo? This will use 1 credit.")) {
      return
    }

    setRegeneratingPost(postId)

    try {
      if (!feedId) {
        throw new Error("Feed ID is missing. Please refresh the page.")
      }
      
      console.log(`[v0] Regenerating post ${postId} in feed ${feedId}`)
      const url = `/api/feed/${feedId}/generate-single`
      console.log(`[v0] Making request to:`, url)
      
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ postId }),
      })

      console.log(`[v0] Regenerate response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        let errorData: any = {}
        let errorMessage = `Failed to regenerate (HTTP ${response.status})`
        
        // Try to get error details from response
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json()
            errorMessage = errorData.error || errorData.details || errorMessage
          } else {
            const errorText = await response.text()
            if (errorText && errorText.trim().length > 0) {
              try {
                errorData = JSON.parse(errorText)
                errorMessage = errorData.error || errorData.details || errorMessage
              } catch {
                errorMessage = errorText.substring(0, 200) || errorMessage
              }
            }
          }
        } catch (parseError) {
          console.error(`[v0] Error parsing response:`, parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`
        }
        
        console.error(`[v0] ❌ Failed to regenerate post ${postId}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          feedId: feedId,
          hasErrorData: Object.keys(errorData).length > 0
        })
        
        // Provide user-friendly error messages based on status code
        if (response.status === 401) {
          // Check if the error response suggests a refresh is needed
          if (errorData?.requiresRefresh || errorData?.shouldRetry) {
            errorMessage = "Your session has expired. Please refresh the page and try again."
          } else {
            errorMessage = errorData?.details || "Authentication failed. Please refresh the page and try again."
          }
        } else if (response.status === 402) {
          errorMessage = "Insufficient credits. Please purchase more credits to regenerate."
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again."
        } else if (response.status === 404) {
          errorMessage = "Post or feed not found. Please refresh the page."
        } else if (response.status === 400) {
          errorMessage = errorData?.details || "Invalid request. Please check your input and try again."
        }
        
        // Show toast with error
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        
        throw new Error(errorMessage)
      }

      let data
      try {
        const responseText = await response.text()
        if (!responseText || responseText.trim().length === 0) {
          throw new Error("Empty response from server")
        }
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[v0] Failed to parse response:`, parseError)
        throw new Error("Invalid response from server. Please try again.")
      }
      
      console.log(`[v0] ✅ Successfully queued regeneration for post ${postId}, prediction ID:`, data.predictionId)

      if (!data.predictionId) {
        throw new Error("No prediction ID returned. Please try again.")
      }

      // Add to generating posts set so polling picks it up
      setGeneratingPosts((prev) => new Set(prev).add(postId))
      
      // Track when this regeneration started (for timeout detection)
      setPostStartTimes((prev) => {
        const updated = new Map(prev)
        updated.set(postId, Date.now())
        return updated
      })
      
      // Remove from completed posts so polling will check it again
      setCompletedPosts((prev) => {
        const updated = new Set(prev)
        updated.delete(postId)
        return updated
      })

      toast({
        title: "Regenerating photo",
        description: "Creating a new variation in the same category. This takes about 30 seconds.",
      })

      // Refresh feed data to show generating status
      await mutate(`/api/feed/${feedId}`)
      
      // Force polling to restart if it's not active
      if (!isPollingActiveRef.current && pollIntervalRef.current === null) {
        console.log("[v0] Restarting polling for regenerated post:", postId)
        // The useEffect will pick this up and restart polling
      }
    } catch (error) {
      console.error(`[v0] Error regenerating post ${postId}:`, error)
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setRegeneratingPost(null)
    }
  }

  if (!feedId || !isFeedComplete) {
    return (
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen relative overflow-hidden">
        {/* Blurred Instagram Feed Preview */}
        <div className="filter blur-lg pointer-events-none opacity-50">
          <div className="bg-white border-b border-stone-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="w-24 h-6 bg-stone-200 rounded"></div>
              <div className="flex items-center gap-1">
                <div className="w-16 h-5 bg-stone-200 rounded"></div>
              </div>
              <div className="w-6 h-6 bg-stone-200 rounded-full"></div>
            </div>

            <div className="px-8 pb-4">
              <div className="flex items-start gap-12">
                <div className="w-32 h-32 rounded-full bg-stone-200"></div>
                <div className="flex-1 space-y-4">
                  <div className="flex gap-8">
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                  </div>
                  <div className="w-full h-16 bg-stone-200 rounded"></div>
                </div>
              </div>
            </div>

            <div className="flex border-t border-stone-200">
              <div className="flex-1 h-12 bg-stone-100"></div>
              <div className="flex-1 h-12 bg-stone-50"></div>
              <div className="flex-1 h-12 bg-stone-50"></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 p-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>

        {/* Loading Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center px-8 max-w-md">
            <div className="mb-12 relative w-40 h-40 mx-auto">
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-40 h-40 rounded-full border-2 border-transparent border-t-stone-950 animate-spin"
                  style={{ animationDuration: "2s" }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-32 h-32 rounded-full border-2 border-transparent border-b-stone-400 animate-spin"
                  style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 flex items-center justify-center">
                  <img src="/icon-192.png" alt="SSELFIE Logo" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-stone-950 text-2xl font-serif font-extralight tracking-[0.3em] uppercase">
                {feedId ? "Maya is creating your photos" : "Loading your feed"}
              </h2>

              {feedId && (
                <>
                  <div className="space-y-4 w-full max-w-sm mx-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-light text-stone-600">Progress</span>
                      <span className="text-sm font-medium text-stone-900">
                        {readyPosts} of {totalPosts} complete
                      </span>
                    </div>

                    <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-stone-900 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>

          <div className="flex items-center gap-2 justify-center">
            <Loader2 size={14} className="animate-spin text-stone-600" />
            <p className="text-xs font-light text-stone-500">
              {getProgressMessage()}
            </p>
            {isValidating && (
              <span className="text-xs text-stone-400 ml-2">(checking...)</span>
            )}
          </div>
          {readyPosts < totalPosts && (
            <button
              onClick={handleGenerateRemaining}
              disabled={generatingRemaining}
              className="mt-4 px-4 py-2 bg-stone-900 text-white text-xs font-light rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingRemaining ? "Generating..." : `Generate Remaining ${totalPosts - readyPosts} Images`}
            </button>
          )}
        </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen">
      <div className="bg-white border-b border-stone-200">
        <div className="flex items-center justify-between px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-stone-50 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-stone-900" strokeWidth={2} />
            </button>
          )}
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold text-stone-900">sselfie</span>
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <button className="p-2 -mr-2 hover:bg-stone-50 rounded-full transition-colors">
            <MoreHorizontal size={24} className="text-stone-900" strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 md:px-8 pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:gap-12 mb-4">
            <button
              onClick={() => feedData?.feed?.id && setShowProfileGallery(true)}
              className="relative group w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[3px] mb-4 md:mb-0 flex-shrink-0 transition-opacity hover:opacity-90"
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden relative">
                {feedData?.feed?.profile_image_url ? (
                  <>
                    <Image
                      src={feedData.feed.profile_image_url}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 80px, 128px"
                      style={{ borderRadius: '50%' }}
                    />
                  </>
                ) : (
                  <span className="text-2xl md:text-4xl font-bold text-stone-900 relative z-10">S</span>
                )}
              </div>
              <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 rounded-full transition-all flex items-center justify-center pointer-events-none">
                <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Change
                </span>
              </div>
            </button>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">9</div>
                  <div className="text-xs md:text-sm text-stone-500">posts</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">1.2K</div>
                  <div className="text-xs md:text-sm text-stone-500">followers</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">342</div>
                  <div className="text-xs md:text-sm text-stone-500">following</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-900">SSELFIE Studio</div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-stone-900 whitespace-pre-wrap flex-1">
                    {feedData.bio?.bio_text || "Your Instagram feed strategy created by Maya"}
                  </div>
                  <button
                    onClick={handleGenerateBio}
                    disabled={isGeneratingBio || !feedData?.feed?.id}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title={feedData.bio?.bio_text ? "Regenerate bio" : "Generate bio"}
                  >
                    {isGeneratingBio ? (
                      <Loader2 size={18} className="text-stone-600 animate-spin" />
                    ) : (
                      <Sparkles size={18} className="text-stone-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                  Following
                </button>
                <button className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-t border-stone-200">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "grid" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <Grid3x3 size={20} strokeWidth={activeTab === "grid" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Grid</span>
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "posts" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <LayoutGrid size={20} strokeWidth={activeTab === "posts" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Posts</span>
          </button>
          <button
            onClick={() => setActiveTab("strategy")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "strategy" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <List size={20} strokeWidth={activeTab === "strategy" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Strategy</span>
          </button>
        </div>
      </div>

      {/* Success Banner when feed is complete */}
      {isFeedComplete && readyPosts === totalPosts && (
        <div className="mx-4 mt-4 mb-4 bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm">✓</span>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-medium text-stone-900">Your feed is complete! 🎉</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                All 9 images have been generated. You can now download them, edit captions, or regenerate individual posts if needed.
              </p>
              <button
                onClick={handleDownloadBundle}
                disabled={isDownloadingBundle}
                className="mt-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloadingBundle ? "Preparing download..." : `Download All (${totalPosts} images + captions + strategy)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-20">
        {activeTab === "grid" && (
          <div className="grid grid-cols-3 gap-[2px] md:gap-1">
            {displayPosts.map((post: any, index: number) => {
              const postStatus = postStatuses.find(p => p.id === post.id)
              const isGenerating = postStatus?.isGenerating || post.generation_status === "generating"
              const isRegenerating = regeneratingPost === post.id
              // SIMPLIFIED: A post is complete if it has an image_url (regardless of status)
              const isComplete = !!post.image_url
              const isDragging = draggedIndex === index

              return (
                <div
                  key={post.id}
                  draggable={isComplete && !isSavingOrder}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`aspect-square bg-stone-100 relative transition-all duration-200 ${
                    isDragging ? 'opacity-50 scale-95' : ''
                  } ${
                    isComplete && !isSavingOrder ? 'cursor-move hover:opacity-90' : 'cursor-pointer'
                  }`}
                >
                  {post.image_url && !isRegenerating && !isGenerating ? (
                    <Image
                      src={post.image_url || "/placeholder.svg"}
                      alt={`Post ${post.position}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 311px"
                      onClick={() => setSelectedPost(post)}
                    />
                  ) : isRegenerating || isGenerating ? (
                    <div className="absolute inset-0 bg-stone-50 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                      <div className="text-[10px] font-light text-stone-500 text-center">
                        {isRegenerating ? "Regenerating..." : "Creating"}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 bg-white flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-stone-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateSingle(post.id)
                      }}
                    >
                      <ImageIcon className="w-10 h-10 text-stone-300 mb-2" strokeWidth={1.5} />
                      <div className="text-[10px] font-light text-stone-500 text-center">Click to generate</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "posts" && (
          <div className="space-y-6 md:space-y-8">
            {/* Create Captions Button - Show if no captions exist */}
            {posts.length > 0 && posts.every((p: any) => !p.caption || p.caption.trim() === "") && (
              <div className="flex justify-center pb-4">
                <button
                  onClick={() => {
                    // Navigate to Maya Feed tab with "Create captions" prompt
                    window.location.href = "/studio#maya/feed"
                    // Small delay to ensure tab is loaded, then trigger prompt
                    setTimeout(() => {
                      // The prompt will be sent via quick prompt click or user can type it
                    }, 500)
                  }}
                  className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
                >
                  <span>Create Captions</span>
                </button>
              </div>
            )}
            {posts.map((post: any) => {
              const isExpanded = expandedCaptions.has(post.id)
              const caption = post.caption || ""
              const shouldTruncate = caption.length > 150
              const displayCaption = isExpanded || !shouldTruncate ? caption : caption.substring(0, 150) + "..."

              return (
                <div key={post.id} className="border-b border-stone-100 pb-6">
                  <div className="flex items-center justify-between px-4 md:px-0 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="text-xs font-bold text-stone-900">S</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">sselfie</p>
                        <p className="text-xs text-stone-500">{post.content_pillar || `Post ${post.position}`}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                      <MoreHorizontal size={20} className="text-stone-900" />
                    </button>
                  </div>

                  <div className="aspect-square bg-stone-100 relative">
                    {post.image_url ? (
                      <Image
                        src={post.image_url || "/placeholder.svg"}
                        alt={`Post ${post.position}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 935px"
                      />
                    ) : post.generation_status === "generating" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-stone-400" strokeWidth={1.5} />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <button
                          onClick={() => handleGenerateSingle(post.id)}
                          className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
                        >
                          Generate Photo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="px-4 md:px-0 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button className="hover:opacity-60 transition-opacity">
                          <Heart size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                        <button className="hover:opacity-60 transition-opacity">
                          <MessageCircle size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                        <button className="hover:opacity-60 transition-opacity">
                          <Send size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                      </div>
                      <button className="hover:opacity-60 transition-opacity">
                        <Bookmark size={24} className="text-stone-900" strokeWidth={2} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm flex-1 min-w-0">
                          <span className="font-semibold text-stone-900">sselfie</span>{" "}
                          <span className="text-stone-900 whitespace-pre-wrap break-words">{displayCaption}</span>
                          {shouldTruncate && (
                            <button
                              onClick={() => toggleCaption(post.id)}
                              className="text-stone-500 ml-1 hover:text-stone-700 transition-colors"
                            >
                              {isExpanded ? "less" : "more"}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <button
                            onClick={() => copyCaptionToClipboard(post.caption, post.id)}
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300"
                            title="Copy caption"
                          >
                            {copiedCaptions.has(post.id) ? (
                              <Check size={18} className="text-green-600" />
                            ) : (
                              <Copy size={18} className="text-stone-600" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEnhanceCaption(post.id, post.caption)}
                            disabled={enhancingCaptions.has(post.id)}
                            className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Enhance with Maya"
                          >
                            {enhancingCaptions.has(post.id) ? (
                              <Loader2 size={18} className="text-stone-600 animate-spin" />
                            ) : (
                              <Sparkles size={18} className="text-stone-600" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "strategy" && (
          <div className="p-4 md:p-8">
            {/* Create Strategy Button - Show if no strategy exists */}
            {!feedData.feed?.description && (
              <div className="flex justify-center pb-6">
                <button
                  onClick={() => {
                    // Navigate to Maya Feed tab with "Create strategy" prompt
                    window.location.href = "/studio#maya/feed"
                    // Small delay to ensure tab is loaded, then trigger prompt
                    setTimeout(() => {
                      // The prompt will be sent via quick prompt click or user can type it
                    }, 500)
                  }}
                  className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
                >
                  <span>Create Strategy</span>
                </button>
              </div>
            )}
            {/* Full Strategy Document */}
            <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
              {feedData.feed?.description ? (
                <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-light prose-headings:text-stone-900 prose-headings:tracking-wide prose-h1:text-2xl prose-h1:mb-4 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:text-stone-700 prose-p:leading-relaxed prose-p:mb-4 prose-strong:text-stone-900 prose-strong:font-medium prose-ul:text-stone-700 prose-ol:text-stone-700 prose-li:text-stone-700 prose-li:leading-relaxed prose-li:mb-2 prose-code:text-stone-600 prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-blockquote:border-l-4 prose-blockquote:border-stone-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-stone-600">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-2xl font-serif font-light text-stone-900 mb-4 mt-8 first:mt-0 tracking-wide" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-serif font-light text-stone-900 mb-4 mt-8 tracking-wide" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-serif font-light text-stone-900 mb-3 mt-6 tracking-wide" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-sm font-light text-stone-700 leading-relaxed mb-4" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-medium text-stone-900" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-2 ml-4 mb-4 text-stone-700" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside space-y-2 ml-4 mb-4 text-stone-700" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-sm font-light text-stone-700 leading-relaxed" {...props} />
                      ),
                      code: ({ node, ...props }) => (
                        <code className="text-xs bg-stone-100 text-stone-600 px-1 py-0.5 rounded" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-600 my-4" {...props} />
                      ),
                    }}
                  >
                    {feedData.feed.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-sm font-light text-stone-600 leading-relaxed">
                  Strategy document is being generated...
                </div>
              )}
            </div>

            {/* Posting Strategy */}
            {feedData.strategy?.posting_schedule && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">When To Post</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {feedData.strategy.posting_schedule.optimalTimes?.map((time: any, idx: number) => (
                    <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-2">
                      <div className="text-sm font-medium text-stone-900">{time.day}</div>
                      <div className="text-lg font-semibold text-stone-900">{time.time}</div>
                      <div className="text-xs text-stone-600">{time.reason}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="text-xs text-stone-500 mb-2">Posting Frequency</div>
                  <div className="text-sm text-stone-700">{feedData.strategy.posting_schedule.frequency}</div>
                </div>
              </div>
            )}

            {/* Content Strategy */}
            {feedData.strategy?.content_pillars && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Content Mix Strategy
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(feedData.strategy.content_pillars).map(([key, value]: any) => (
                    <div key={key} className="bg-stone-50 rounded-xl p-4 space-y-2">
                      <div className="text-sm font-medium text-stone-900 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="text-xs text-stone-600 leading-relaxed">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story Strategy */}
            {feedData.strategy?.caption_templates && Array.isArray(feedData.strategy.caption_templates) && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Story Sequences For Each Post
                </div>
                {feedData.strategy.caption_templates.slice(0, 9).map((story: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-stone-900">Post {story.postNumber || idx + 1}</div>
                      <div className="text-xs text-stone-500">{story.storyTiming}</div>
                    </div>
                    <div className="text-xs text-stone-600">{story.storyPurpose}</div>
                    <div className="space-y-1.5">
                      {story.storySequence?.map((seq: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-semibold text-stone-600">{i + 1}</span>
                          </div>
                          <div className="text-xs text-stone-700 leading-relaxed">{seq}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reel Strategy */}
            {feedData.strategy?.content_format_mix?.reels && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Reel Recommendations
                </div>
                {feedData.strategy.content_format_mix.reels.map((reel: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="text-sm font-medium text-stone-900">Post {reel.postNumber} → Reel</div>
                    <div className="text-xs text-stone-600 leading-relaxed">{reel.reelConcept}</div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-stone-500 uppercase tracking-wider">Hook</div>
                      <div className="text-xs text-stone-700 font-medium">{reel.hookSuggestion}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-stone-500 uppercase tracking-wider">Trending Audio</div>
                      <div className="text-xs text-stone-700">{reel.audioRecommendation}</div>
                    </div>
                    <div className="text-[10px] text-stone-500">{reel.coverPhotoTips}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Carousel Strategy */}
            {feedData.strategy?.content_format_mix?.carousels && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Carousel Ideas</div>
                {feedData.strategy.content_format_mix.carousels.map((carousel: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="text-sm font-medium text-stone-900">Post {carousel.postNumber} → Carousel</div>
                    <div className="text-xs text-stone-600 leading-relaxed">{carousel.carouselIdea}</div>
                    <div className="space-y-1.5">
                      {carousel.slideBreakdown?.map((slide: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-semibold text-stone-600">{i + 1}</span>
                          </div>
                          <div className="text-xs text-stone-700">{slide}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Growth Tactics */}
            {feedData.strategy?.growth_tactics && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Growth Tactics</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(feedData.strategy.growth_tactics).map(([key, tactics]: any) => (
                    <div key={key} className="bg-stone-50 rounded-xl p-4 space-y-3">
                      <div className="text-sm font-medium text-stone-900 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="space-y-1.5">
                        {tactics.map((tactic: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0 mt-1.5" />
                            <div className="text-xs text-stone-600 leading-relaxed">{tactic}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtag Strategy */}
            {feedData.strategy?.hashtag_strategy && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Hashtag Strategy</div>
                <div className="bg-stone-50 rounded-xl p-4 space-y-4">
                  <div>
                    <div className="text-xs text-stone-500 mb-2">Main Hashtags (Use on every post)</div>
                    <div className="flex flex-wrap gap-2">
                      {feedData.strategy.hashtag_strategy.mainHashtags?.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-2">Rotating Hashtags (Vary by post)</div>
                    <div className="flex flex-wrap gap-2">
                      {feedData.strategy.hashtag_strategy.rotatingHashtags?.map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-stone-600 pt-2 border-t border-stone-200">
                    💡 {feedData.strategy.hashtag_strategy.hashtagPlacement}
                  </div>
                </div>
              </div>
            )}

            {/* Trending Strategy */}
            {feedData.strategy?.content_format_mix?.trends && (
              <div className="bg-stone-50 rounded-xl p-6 space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Trend Strategy</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-stone-500 mb-1">When to Use Trends</div>
                    <div className="text-sm text-stone-700 leading-relaxed">
                      {feedData.strategy.content_format_mix.trends.whenToUseTrends}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-1">Trending Audio</div>
                    <div className="text-sm text-stone-700">
                      {feedData.strategy.content_format_mix.trends.trendingAudio?.join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-1">Brand Alignment</div>
                    <div className="text-sm text-stone-700 leading-relaxed">
                      {feedData.strategy.content_format_mix.trends.personalBrandAlignment}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Pattern (existing) */}
            <div className="bg-stone-50 rounded-xl p-4 space-y-3">
              <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Grid Pattern</div>
              <div className="text-sm font-light text-stone-700">{feedData.feed.layout_type || "Balanced Mix"}</div>
              <div className="text-sm font-light text-stone-600 leading-relaxed">
                {feedData.feed.visual_rhythm || "Dynamic flow with varied composition"}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative w-full max-w-[470px] my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute -top-12 right-0 z-10 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors"
            >
              <X size={20} className="text-white" />
            </button>

            {/* Action buttons - shown when image exists */}
            {selectedPost.image_url && (
              <div className="absolute -top-12 left-0 z-10 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRegeneratePost(selectedPost.id)
                  }}
                  disabled={regeneratingPost === selectedPost.id}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regeneratingPost === selectedPost.id ? "Regenerating..." : "Regenerate"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowGallery(selectedPost.id)
                    setSelectedPost(null)
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Choose from Gallery
                </button>
              </div>
            )}

            {/* Use FeedPostCard component for full Instagram post mockup */}
            <FeedPostCard
              post={selectedPost}
              feedId={feedId}
              onGenerate={() => {
                mutate()
                setSelectedPost(null)
              }}
            />
          </div>
        </div>
      )}

      {showGallery && feedData?.feed?.id && (
        <FeedPostGallerySelector
          postId={showGallery}
          feedId={feedData.feed.id}
          onClose={() => {
            setShowGallery(null)
            // Refresh feed data to show updated image
            mutate(`/api/feed/${feedData.feed.id}`)
          }}
          onImageSelected={() => {
            // Refresh feed data to show updated image
            mutate(`/api/feed/${feedData.feed.id}`)
            toast({
              title: "Image updated",
              description: "The post image has been updated from your gallery.",
            })
          }}
        />
      )}

      {showProfileGallery && feedData?.feed?.id && (
        <FeedProfileGallerySelector
          feedId={feedData.feed.id}
          onClose={() => setShowProfileGallery(false)}
          onImageSelected={async () => {
            await mutate(`/api/feed/${feedData.feed.id}`)
            toast({
              title: "Profile image updated",
              description: "Your profile image has been updated successfully.",
            })
          }}
        />
      )}
    </div>
  )
}
