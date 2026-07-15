"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import type { FeedPost } from "@/components/feed-planner/feed-preview-types"
import { randomFeedPlannerIdempotencyKey, stableFeedPlannerIdempotencyKey } from "@/lib/feed-planner/idempotency"
import {
  createFeedFromStrategyHandler,
  type CreateFeedOptions,
  type FeedStrategy,
} from "@/lib/maya/feed-generation-handler"

/**
 * Hook for managing all feed actions (generate, regenerate, enhance, etc.)
 */
export function useFeedActions(
  feedId: number,
  posts: any[],
  feedData: any,
  onUpdate: () => void | Promise<void>,
  onNavigateToMaya?: () => void,
) {
  const [expandedCaptions, setExpandedCaptions] = useState<Set<number>>(new Set())
  const [copiedCaptions, setCopiedCaptions] = useState<Set<number>>(new Set())
  const [enhancingCaptions, setEnhancingCaptions] = useState<Set<number>>(new Set())
  const [isGeneratingBio, setIsGeneratingBio] = useState(false)
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false)

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
        await onUpdate()
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
        await onUpdate()
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

  // Helper function to navigate to Maya Chat for image generation
  const navigateToMayaChat = () => {
    if (onNavigateToMaya) return onNavigateToMaya()
    if (typeof window !== "undefined") window.location.assign("/app?view=create")
  }

  const handleDownloadBundle = async () => {
    if (!feedData || !feedId) return
    
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

  return {
    // State
    expandedCaptions,
    copiedCaptions,
    enhancingCaptions,
    isGeneratingBio,
    isDownloadingBundle,
    // Actions
    toggleCaption,
    copyCaptionToClipboard,
    handleGenerateBio,
    handleEnhanceCaption,
    navigateToMayaChat,
    handleDownloadBundle,
  }
}

interface UseFeedActionsParams {
  feedId: number | null
  isSaved: boolean
  strategy?: FeedStrategy
  onViewFullFeed?: () => void
  onSave?: (feedId: number) => void
  proMode: boolean
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  isSaving: boolean
  setIsSaving: (value: boolean) => void
  setIsGenerating: (value: boolean) => void
  setSavedFeedId: (id: number) => void
  setFeedStatus: (status: string) => void
  setPostsData: (posts: FeedPost[]) => void
  setDisplayTitle: (title: string) => void
  setDisplayDescription: (description: string) => void
  displayTitle: string
  displayDescription: string
  mutateFeed: () => void
  markJustSaved: () => void
}

const getSafeDescription = (desc: string | null | undefined): string => {
  if (!desc) return ""
  if (/^#{1,3}\s/m.test(desc) && desc.length > 500) return ""
  return desc
}

export function useFeedPreviewActions(params: UseFeedActionsParams) {
  const router = useRouter()

  const handleViewFullFeed = () => {
    if (!params.feedId) return
    if (params.onViewFullFeed) {
      params.onViewFullFeed()
      return
    }
    router.push(`/feed-planner?feedId=${params.feedId}`)
  }

  const handleSaveToPlanner = async () => {
    if (!params.feedId) {
      toast({ title: "Error", description: "Feed must be saved first", variant: "destructive" })
      return
    }

    params.setIsSaving(true)
    try {
      const response = await fetch(`/api/feed-planner/save-to-planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedId: params.feedId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save feed to planner")
      }

      params.setFeedStatus("saved")
      toast({ title: "Saved to Planner", description: "Your feed has been added to Feed Planner." })
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "An error occurred while saving",
        variant: "destructive",
      })
    } finally {
      params.setIsSaving(false)
    }
  }

  const handleSaveFeed = async () => {
    if (!params.strategy) {
      toast({ title: "Error", description: "No feed strategy to save", variant: "destructive" })
      return
    }

    params.setIsSaving(true)
    try {
      const createIdempotencyKey = stableFeedPlannerIdempotencyKey("feed-create", {
        saveToPlanner: true,
        strategy: params.strategy,
        mode: params.proMode ? "pro" : "classic",
      })
      const options: CreateFeedOptions = {
        userModePreference: params.proMode ? "pro" : "classic",
        customSettings: {
          styleStrength: params.styleStrength,
          promptAccuracy: params.promptAccuracy,
          aspectRatio: params.aspectRatio,
          realismStrength: params.realismStrength,
        },
        idempotencyKey: createIdempotencyKey,
      }

      const result = await createFeedFromStrategyHandler(params.strategy, {
        ...options,
        saveToPlanner: true,
      })

      if (!result?.success || !result.feedId) {
        throw new Error("Failed to save feed")
      }

      const newFeedId = Number(result.feedId)
      params.markJustSaved()
      params.setSavedFeedId(newFeedId)
      params.setFeedStatus("saved")
      params.onSave?.(newFeedId)
      if (result.idempotentReplay) {
        toast({
          title: "Feed already created",
          description: result.message || "Reopened your existing feed from this request.",
        })
      } else {
        toast({ title: "Feed saved", description: "Your feed has been saved to Feed Planner." })
      }
    } catch (error) {
      toast({
        title: "Failed to save feed",
        description: error instanceof Error ? error.message : "An error occurred while saving",
        variant: "destructive",
      })
    } finally {
      params.setIsSaving(false)
    }
  }

  const refreshFeedData = async (feedIdToUse: number) => {
    const feedResponse = await fetch(`/api/feed/${feedIdToUse}`)
    if (!feedResponse.ok) return
    const feedData = await feedResponse.json()
    if (Array.isArray(feedData.posts)) {
      params.setPostsData(feedData.posts)
      const refreshedTitle =
        feedData.title ||
        feedData.brand_name ||
        feedData.feed?.title ||
        feedData.feed?.brand_name ||
        feedData.feed?.gridPattern
      if (refreshedTitle && refreshedTitle !== params.displayTitle) {
        params.setDisplayTitle(refreshedTitle)
      }

      const refreshedDescription =
        feedData.description || feedData.feed?.description || feedData.feed?.gridPattern || feedData.feed?.overall_vibe
      const safeDescription = getSafeDescription(refreshedDescription)
      if (safeDescription !== params.displayDescription) {
        params.setDisplayDescription(safeDescription)
      }
    }
  }

  const handleGenerateFeedWithId = async (feedIdToUse: number, queueIdempotencyKey?: string) => {
    params.setIsGenerating(true)
    params.setIsSaving(false)

    try {
      const response = await fetch(`/api/feed-planner/queue-all-images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": queueIdempotencyKey || randomFeedPlannerIdempotencyKey(`feed-queue-${feedIdToUse}`),
        },
        credentials: "include",
        body: JSON.stringify({ feedLayoutId: feedIdToUse }),
      })

      if (!response.ok) {
        if (response.status === 409) {
          const conflictData = await response.json().catch(() => ({}))
          toast({
            title: "Already processing",
            description: conflictData.error || "This feed is already generating. We kept the current run.",
          })
          params.setIsGenerating(false)
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || "Failed to generate feed images")
      }

      const data = await response.json()
      if (data.queuedCount === 0 && data.failedCount > 0) {
        toast({
          title: "Generation failed",
          description: data.message || `Failed to queue ${data.failedCount} post(s).`,
          variant: "destructive",
        })
        params.setIsGenerating(false)
        return
      }

      if (data.queuedCount > 0) {
        toast({
          title: "Generating feed images",
          description: `Started generating ${data.queuedCount} of ${data.totalPosts} images.`,
        })
      }

      if (!params.feedId || params.feedId !== feedIdToUse) {
        params.setSavedFeedId(feedIdToUse)
        params.onSave?.(feedIdToUse)
      }

      await refreshFeedData(feedIdToUse)
      params.mutateFeed()
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      params.setIsGenerating(false)
    }
  }

  const handleGenerateImages = async () => {
    try {
      if (!params.isSaved || !params.feedId) {
        if (!params.strategy) {
          throw new Error("No feed strategy available")
        }

        params.setIsSaving(true)
        const createIdempotencyKey = stableFeedPlannerIdempotencyKey("feed-create", {
          saveToPlanner: false,
          strategy: params.strategy,
          mode: params.proMode ? "pro" : "classic",
        })
        const queueIdempotencyKey = randomFeedPlannerIdempotencyKey("feed-queue")
        const saveResponse = await fetch("/api/feed-planner/create-from-strategy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": createIdempotencyKey,
          },
          credentials: "include",
          body: JSON.stringify({
            strategy: params.strategy,
            userModePreference: params.proMode ? "pro" : "classic",
            customSettings: {
              styleStrength: params.styleStrength,
              promptAccuracy: params.promptAccuracy,
              aspectRatio: params.aspectRatio,
              realismStrength: params.realismStrength,
            },
            saveToPlanner: false,
            idempotencyKey: createIdempotencyKey,
          }),
        })

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to save feed")
        }

        const saveData = await saveResponse.json()
        const newFeedId = Number(saveData.feedLayoutId)
        params.markJustSaved()
        params.setSavedFeedId(newFeedId)
        params.onSave?.(newFeedId)
        if (saveData.idempotentReplay) {
          toast({
            title: "Feed already created",
            description: saveData.message || "Reopened your existing feed from this request.",
          })
        }
        await handleGenerateFeedWithId(newFeedId, queueIdempotencyKey)
        return
      }

      await handleGenerateFeedWithId(params.feedId, randomFeedPlannerIdempotencyKey(`feed-queue-${params.feedId}`))
    } catch (error) {
      params.setIsGenerating(false)
      params.setIsSaving(false)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleRefreshPosts = async () => {
    if (!params.feedId) return
    try {
      await refreshFeedData(params.feedId)
      params.mutateFeed()
    } catch {
      // noop
    }
  }

  return {
    handleViewFullFeed,
    handleSaveToPlanner,
    handleSaveFeed,
    handleGenerateFeedWithId,
    handleGenerateImages,
    handleRefreshPosts,
  }
}
